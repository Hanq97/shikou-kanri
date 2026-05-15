'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Gemini Enricher - Semantic enrichment using Google Gemini Pro
 *
 * WHY: Add business context and domain knowledge to code AST
 * HOW: Use Gemini Pro to analyze code and infer:
 *   - Domain concepts (Customer, Order, Payment, etc.)
 *   - Business rules and validations
 *   - Design patterns in use
 *   - Relationships to requirements (if available)
 *
 * Features:
 * - Lazy initialization of Gemini SDK
 * - Rate limiting and retry logic
 * - Cost tracking
 * - Caching support
 *
 * @module gemini-enricher
 */

// Default configuration — model read from external-apis.json (single source of truth)
const DEFAULT_CONFIG = {
  model: null,  // Resolved at runtime from external-apis.json or env (no hardcoded default)
  maxTokens: 2048,
  temperature: 0.3,  // Lower for more consistent output
  rateLimitRpm: 60,  // Requests per minute
  retryAttempts: 3,
  retryDelayMs: 1000,
};

// Enrichment prompts
const PROMPTS = {
  DOMAIN_ANALYSIS: `Analyze this code and extract domain concepts.

CODE:
{code}

Respond in JSON format:
{
  "domainConcepts": [
    { "name": "string", "type": "entity|service|valueObject|aggregate", "confidence": 0.0-1.0 }
  ],
  "businessRules": [
    { "name": "string", "description": "string", "location": "method/class name" }
  ],
  "patterns": [
    { "name": "string", "type": "creational|structural|behavioral", "confidence": 0.0-1.0 }
  ]
}`,

  RELATIONSHIP_INFERENCE: `Given this code and domain context, infer relationships to business requirements.

CODE:
{code}

DOMAIN CONTEXT:
{context}

Respond in JSON format:
{
  "implementsRequirements": [
    { "code": "class/method name", "requirement": "FR/NFR ID or description", "confidence": 0.0-1.0 }
  ],
  "belongsToDomain": [
    { "code": "class/method name", "domain": "domain concept", "confidence": 0.0-1.0 }
  ]
}`,

  CODE_SUMMARY: `Summarize this code in one sentence, focusing on its business purpose.

CODE:
{code}

Respond with a single sentence summary.`,
};

/**
 * GeminiEnricher class
 */
class GeminiEnricher {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._genAI = null;
    this._model = null;
    this._lastRequestTime = 0;
    this._requestCount = 0;
    this._totalTokensUsed = 0;
    this._cache = null;  // Set via setCache()
  }

  /**
   * Initialize Gemini SDK (lazy)
   */
  async initialize() {
    if (this._genAI) return;

    const { apiKey, model } = await this._resolveConfig();
    if (!apiKey) {
      throw new Error('Gemini API key not found. Set GEMINI_API_KEY env var or configure in external-apis.json');
    }
    if (!model) {
      throw new Error('Gemini model not configured. Set gemini.model in external-apis.json');
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    this._genAI = new GoogleGenerativeAI(apiKey);
    this._model = this._genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      },
    });
  }

  /**
   * Resolve API key and model from environment or config file.
   * Single source of truth: external-apis.json (E1 fix).
   */
  async _resolveConfig() {
    let apiKey = process.env.GEMINI_API_KEY || null;
    let model = this.config.model || process.env.GEMINI_MODEL || null;

    // Read from external-apis.json (single source of truth)
    const configPath = path.join(process.cwd(), 'config/external-apis.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!apiKey) {
          apiKey = config.GEMINI_API_KEY || config.gemini?.apiKey || null;
        }
        if (!model) {
          model = config.gemini?.model || null;
        }
      } catch (e) {
        console.warn('[GeminiEnricher] Error reading external-apis.json:', e.message);
      }
    }

    return { apiKey, model };
  }

  /**
   * @deprecated Use _resolveConfig() instead. Kept for backward compatibility.
   */
  async _getApiKey() {
    const { apiKey } = await this._resolveConfig();
    return apiKey;
  }

  /**
   * Set cache instance for enrichment caching
   */
  setCache(cache) {
    this._cache = cache;
  }

  /**
   * Enrich a single AST with domain analysis
   *
   * @param {UnifiedAST} ast - AST to enrich
   * @returns {object} Enrichment data
   */
  async enrichAST(ast) {
    await this.initialize();

    // Check cache first
    const cacheKey = this._getCacheKey(ast);
    if (this._cache) {
      const cached = await this._cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build code summary for enrichment
    const codeSummary = this._buildCodeSummary(ast);

    // Get domain analysis
    const enrichment = await this._analyzeWithRetry(PROMPTS.DOMAIN_ANALYSIS, {
      code: codeSummary,
    });

    // Parse and validate response
    const result = this._parseEnrichmentResponse(enrichment);

    // Add metadata
    result.filePath = ast.filePath;
    result.language = ast.language;
    result.enrichedAt = new Date().toISOString();

    // Cache result
    if (this._cache) {
      await this._cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Enrich with relationship inference (requires context)
   *
   * @param {UnifiedAST} ast - AST to enrich
   * @param {object} context - Domain context (from RAG or previous enrichment)
   * @returns {object} Relationship data
   */
  async enrichRelationships(ast, context = {}) {
    await this.initialize();

    const codeSummary = this._buildCodeSummary(ast);

    const enrichment = await this._analyzeWithRetry(PROMPTS.RELATIONSHIP_INFERENCE, {
      code: codeSummary,
      context: JSON.stringify(context, null, 2),
    });

    return this._parseEnrichmentResponse(enrichment);
  }

  /**
   * Get a brief summary of the code's business purpose
   *
   * @param {UnifiedAST} ast - AST to summarize
   * @returns {string} Summary
   */
  async summarize(ast) {
    await this.initialize();

    const codeSummary = this._buildCodeSummary(ast);

    const response = await this._analyzeWithRetry(PROMPTS.CODE_SUMMARY, {
      code: codeSummary,
    });

    return response.trim();
  }

  /**
   * Build code summary for LLM prompt (reduce token usage)
   */
  _buildCodeSummary(ast) {
    const lines = [];

    // File info
    lines.push(`File: ${ast.filePath}`);
    lines.push(`Language: ${ast.language}`);
    if (ast.packageName) {
      lines.push(`Package: ${ast.packageName}`);
    }

    // Classes
    for (const cls of ast.classes) {
      const markers = cls.markers.map(m => `@${m.name}`).join(' ');
      lines.push(`\n${markers ? markers + ' ' : ''}${cls.kind} ${cls.name}${cls.extends ? ' extends ' + cls.extends : ''}`);

      // Fields (top 5)
      const fields = cls.fields.slice(0, 5);
      for (const field of fields) {
        lines.push(`  ${field.visibility || ''} ${field.type || ''} ${field.name}`);
      }

      // Methods (top 10)
      const methods = cls.methods.slice(0, 10);
      for (const method of methods) {
        const mMarkers = method.markers.map(m => `@${m.name}`).join(' ');
        const params = method.parameters.map(p => `${p.type || ''} ${p.name}`).join(', ');
        lines.push(`  ${mMarkers ? mMarkers + ' ' : ''}${method.visibility || ''} ${method.returnType || 'void'} ${method.name}(${params})`);
      }
    }

    // Top-level functions
    for (const fn of ast.functions.slice(0, 10)) {
      const params = fn.parameters.map(p => `${p.type || ''} ${p.name}`).join(', ');
      lines.push(`\nfunction ${fn.name}(${params}): ${fn.returnType || 'void'}`);
    }

    // Framework info
    if (ast.framework && ast.framework.name) {
      lines.push(`\nFramework: ${ast.framework.name}`);
      if (ast.framework.components?.length) {
        lines.push(`Components: ${ast.framework.components.map(c => c.name).join(', ')}`);
      }
      if (ast.framework.routes?.length) {
        lines.push(`Routes: ${ast.framework.routes.map(r => `${r.method || 'GET'} ${r.path}`).join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Call Gemini API with rate limiting and retry
   */
  async _analyzeWithRetry(promptTemplate, variables) {
    await this._rateLimit();

    const prompt = this._fillPrompt(promptTemplate, variables);

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const result = await this._model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Track token usage (estimate)
        this._totalTokensUsed += this._estimateTokens(prompt) + this._estimateTokens(text);

        return text;
      } catch (error) {
        console.warn(`[GeminiEnricher] Attempt ${attempt + 1} failed:`, error.message);

        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this._sleep(delay);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Rate limiting
   */
  async _rateLimit() {
    const now = Date.now();
    const elapsed = now - this._lastRequestTime;
    const minInterval = 60000 / this.config.rateLimitRpm;

    if (elapsed < minInterval) {
      await this._sleep(minInterval - elapsed);
    }

    this._lastRequestTime = Date.now();
    this._requestCount++;
  }

  /**
   * Fill prompt template with variables
   */
  _fillPrompt(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Parse enrichment response (JSON)
   */
  _parseEnrichmentResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('[GeminiEnricher] Failed to parse JSON response:', e.message);
    }

    // Return default structure if parsing fails
    return {
      domainConcepts: [],
      businessRules: [],
      patterns: [],
      parseError: true,
    };
  }

  /**
   * Generate cache key for AST
   */
  _getCacheKey(ast) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      filePath: ast.filePath,
      classes: ast.classes.map(c => c.name),
      functions: ast.functions.map(f => f.name),
      linesOfCode: ast.meta.linesOfCode,
    });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Estimate token count (rough approximation)
   */
  _estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      requestCount: this._requestCount,
      totalTokensUsed: this._totalTokensUsed,
      estimatedCost: this._totalTokensUsed * 0.000001,  // Very rough estimate
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this._requestCount = 0;
    this._totalTokensUsed = 0;
  }
}

/**
 * Singleton instance
 */
let instance = null;

/**
 * Get or create singleton instance
 */
function getInstance(config = {}) {
  if (!instance) {
    instance = new GeminiEnricher(config);
  }
  return instance;
}

module.exports = {
  GeminiEnricher,
  getInstance,
  PROMPTS,
  DEFAULT_CONFIG,
};
