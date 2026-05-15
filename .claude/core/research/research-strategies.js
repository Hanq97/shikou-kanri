#!/usr/bin/env node

/**
 * Research Strategies
 * 研究戦略
 * Chiến Lược Nghiên Cứu
 *
 * Purpose: Define model-specific research strategies
 *
 * Strategies:
 * - ClaudeSystematicStrategy: Comprehensive, risk-aware, regulatory focus
 * - GeminiCreativeStrategy: Innovative, pattern-recognition, optimization focus
 *
 * Tech Stack Aware:
 * - STACK_DEFINED: Focus on project's tech stack (C#, Java, etc.)
 * - STACK_SELECTION: Compare all available tech stacks
 *
 * @version 3.9.0
 * @date 2026-01-04
 */

const { getTechStackContext } = require('../state/tech-stack-context');

/**
 * Base Research Strategy
 * Abstract class defining common interface
 */
class BaseResearchStrategy {
  constructor(name, description, characteristics) {
    this.name = name;
    this.description = description;
    this.characteristics = characteristics;
    this.techStackContext = null;
  }

  /**
   * Load tech stack context
   */
  async loadTechStackContext() {
    if (!this.techStackContext) {
      this.techStackContext = await getTechStackContext();
    }
    return this.techStackContext;
  }

  /**
   * Enhance query with tech stack context
   */
  async enhanceQuery(query) {
    const ctx = await this.loadTechStackContext();
    return ctx.enhanceQuery(query);
  }

  /**
   * Get tech stack specific search terms
   */
  async getSearchTerms() {
    const ctx = await this.loadTechStackContext();
    if (ctx.mode === 'STACK_DEFINED' && ctx.searchKeywords) {
      return {
        include: [
          ...ctx.searchKeywords.backend,
          ...ctx.searchKeywords.patterns,
          ...ctx.searchKeywords.libraries
        ],
        exclude: ctx.searchKeywords.exclude
      };
    }
    return { include: [], exclude: [] };
  }

  /**
   * Execute research
   * @abstract
   * @param {string} query - Research query
   * @param {string} researchFocus - RESEARCH_SRS | RESEARCH_BD | RESEARCH_DD
   * @param {Object} context - Research context
   * @returns {Promise<Array>} Evidence pieces
   */
  async research(query, researchFocus, context) {
    throw new Error('research() must be implemented by subclass');
  }

  /**
   * Get strategy metadata
   */
  getMetadata() {
    return {
      name: this.name,
      description: this.description,
      characteristics: this.characteristics
    };
  }
}

/**
 * Claude Systematic Strategy
 * Comprehensive, risk-aware, compliance-focused research
 */
class ClaudeSystematicStrategy extends BaseResearchStrategy {
  constructor() {
    super(
      'Claude Systematic Strategy',
      'Methodical, comprehensive research with focus on reliability and compliance',
      {
        approach: 'systematic',
        temperature: 0.3,
        focus: [
          'Official documentation',
          'Regulatory compliance',
          'Error handling',
          'Security considerations',
          'Production-proven patterns'
        ],
        strengths: [
          'Risk awareness',
          'Regulatory compliance',
          'Comprehensive coverage',
          'Conservative recommendations'
        ],
        useCases: [
          'Business requirements (RESEARCH_SRS)',
          'Security-critical features',
          'Compliance-heavy domains (banking, insurance)',
          'Production systems'
        ]
      }
    );
  }

  /**
   * Execute Claude systematic research
   */
  async research(query, researchFocus, context = {}) {
    console.log(`\n🔍 Claude Systematic Research: "${query}"`);

    // Generate systematic search queries
    const searchQueries = this._generateSearchQueries(query, researchFocus);

    // Mock evidence (in real implementation, would use WebSearch/WebFetch)
    const evidence = searchQueries.map((sq, index) => this._createMockEvidence(sq, index, researchFocus));

    console.log(`  ✅ Found ${evidence.length} pieces`);
    return evidence;
  }

  /**
   * Generate systematic search queries
   * @private
   */
  _generateSearchQueries(query, researchFocus) {
    const queries = [];

    if (researchFocus === 'RESEARCH_SRS') {
      queries.push(`${query} official requirements specification`);
      queries.push(`${query} regulatory compliance guidelines`);
      queries.push(`${query} business requirements best practices`);
      queries.push(`${query} SBV regulations`);
    } else if (researchFocus === 'RESEARCH_BD') {
      queries.push(`${query} official documentation architecture`);
      queries.push(`${query} security best practices`);
      queries.push(`${query} error handling patterns`);
      queries.push(`${query} production case studies Netflix`);
    } else if (researchFocus === 'RESEARCH_DD') {
      queries.push(`${query} API specifications official docs`);
      queries.push(`${query} security implementation patterns`);
      queries.push(`${query} testing strategies best practices`);
      queries.push(`${query} production examples`);
    }

    return queries.slice(0, 4); // Limit to 4 queries
  }

  /**
   * Create mock evidence (placeholder for real implementation)
   * @private
   */
  _createMockEvidence(searchQuery, index, researchFocus) {
    return {
      id: `claude-evidence-${Date.now()}-${index}`,
      title: `${searchQuery} - Systematic Analysis`,
      content: `This is systematic evidence from Claude focusing on reliability, compliance, and best practices for: ${searchQuery}. Includes error handling, security considerations, and regulatory requirements.`,
      source: {
        url: `https://official-docs.example.com/claude/${index}`,
        type: 'official',
        authority: 85 + Math.floor(Math.random() * 10),
        publicationDate: '2024-06-01'
      },
      quality: {
        overall: 82 + Math.floor(Math.random() * 8),
        sourceAuthority: 85 + Math.floor(Math.random() * 10),
        recency: 85 + Math.floor(Math.random() * 10),
        relevance: 80 + Math.floor(Math.random() * 10),
        depth: 75 + Math.floor(Math.random() * 15),
        accuracy: 85 + Math.floor(Math.random() * 10)
      },
      metadata: {
        researchPhase: researchFocus,
        researchMode: 'claude-systematic',
        createdAt: new Date().toISOString(),
        tags: ['official', 'compliance', 'security', 'systematic'],
        strategy: 'Claude Systematic'
      }
    };
  }
}

/**
 * Gemini Creative Strategy
 * Innovative, pattern-recognition, optimization-focused research
 */
class GeminiCreativeStrategy extends BaseResearchStrategy {
  constructor() {
    super(
      'Gemini Creative Strategy',
      'Creative, innovative research with focus on performance and emerging patterns',
      {
        approach: 'creative',
        temperature: 0.8,
        focus: [
          'Innovative patterns',
          'Performance optimization',
          'Scalability approaches',
          'Emerging technologies',
          'OSS implementations'
        ],
        strengths: [
          'Pattern recognition',
          'Innovation discovery',
          'Performance optimization',
          'Emerging tech awareness'
        ],
        useCases: [
          'Architecture patterns (RESEARCH_BD)',
          'Performance optimization',
          'Scalability solutions',
          'Modern tech stacks'
        ]
      }
    );
  }

  /**
   * Execute Gemini creative research
   */
  async research(query, researchFocus, context = {}) {
    console.log(`\n💡 Gemini Creative Research: "${query}"`);

    // Generate creative search queries
    const searchQueries = this._generateSearchQueries(query, researchFocus);

    // Mock evidence (in real implementation, would use WebSearch/WebFetch)
    const evidence = searchQueries.map((sq, index) => this._createMockEvidence(sq, index, researchFocus));

    console.log(`  ✅ Found ${evidence.length} pieces`);
    return evidence;
  }

  /**
   * Generate creative search queries
   * @private
   */
  _generateSearchQueries(query, researchFocus) {
    const queries = [];

    if (researchFocus === 'RESEARCH_SRS') {
      queries.push(`${query} innovative approaches 2024`);
      queries.push(`${query} modern requirements patterns`);
      queries.push(`${query} emerging trends`);
      queries.push(`${query} GitHub examples`);
    } else if (researchFocus === 'RESEARCH_BD') {
      queries.push(`${query} innovative architecture patterns`);
      queries.push(`${query} high-performance scalability`);
      queries.push(`${query} event-driven patterns`);
      queries.push(`${query} QCon conference talks 2024`);
    } else if (researchFocus === 'RESEARCH_DD') {
      queries.push(`${query} modern implementation patterns`);
      queries.push(`${query} performance optimization techniques`);
      queries.push(`${query} GitHub repositories examples`);
      queries.push(`${query} scalable solutions`);
    }

    return queries.slice(0, 4); // Limit to 4 queries
  }

  /**
   * Create mock evidence (placeholder for real implementation)
   * @private
   */
  _createMockEvidence(searchQuery, index, researchFocus) {
    return {
      id: `gemini-evidence-${Date.now()}-${index}`,
      title: `${searchQuery} - Creative Analysis`,
      content: `This is creative evidence from Gemini focusing on innovation, performance, and modern patterns for: ${searchQuery}. Includes optimization techniques, scalability patterns, and emerging technologies.`,
      source: {
        url: `https://innovative-tech.example.com/gemini/${index}`,
        type: 'oss',
        authority: 70 + Math.floor(Math.random() * 15),
        publicationDate: '2024-09-01'
      },
      quality: {
        overall: 78 + Math.floor(Math.random() * 10),
        sourceAuthority: 70 + Math.floor(Math.random() * 15),
        recency: 90 + Math.floor(Math.random() * 10),
        relevance: 75 + Math.floor(Math.random() * 15),
        depth: 70 + Math.floor(Math.random() * 15),
        accuracy: 75 + Math.floor(Math.random() * 15)
      },
      metadata: {
        researchPhase: researchFocus,
        researchMode: 'gemini-creative',
        createdAt: new Date().toISOString(),
        tags: ['innovative', 'performance', 'scalability', 'creative'],
        strategy: 'Gemini Creative'
      }
    };
  }
}

/**
 * Strategy Selector
 * Select appropriate strategies based on research focus
 */
class StrategySelector {
  /**
   * Select strategies for research
   *
   * @param {string} researchFocus - RESEARCH_SRS | RESEARCH_BD | RESEARCH_DD
   * @returns {Object} { claude, gemini, weights }
   */
  static selectStrategies(researchFocus) {
    const claude = new ClaudeSystematicStrategy();
    const gemini = new GeminiCreativeStrategy();

    let weights = { claude: 0.5, gemini: 0.5 };

    // Adjust weights based on research focus
    if (researchFocus === 'RESEARCH_SRS') {
      // Business requirements → More Claude (compliance)
      weights = { claude: 0.6, gemini: 0.4 };
    } else if (researchFocus === 'RESEARCH_BD') {
      // Architecture → Balanced (proven + innovative)
      weights = { claude: 0.5, gemini: 0.5 };
    } else if (researchFocus === 'RESEARCH_DD') {
      // Detail design → More Gemini (implementation patterns)
      weights = { claude: 0.4, gemini: 0.6 };
    }

    return {
      claude,
      gemini,
      weights,
      description: this._getStrategyDescription(researchFocus, weights)
    };
  }

  /**
   * Get strategy description
   * @private
   */
  static _getStrategyDescription(researchFocus, weights) {
    const descriptions = {
      'RESEARCH_SRS': `Business requirements focus: Claude ${weights.claude * 100}% (compliance) + Gemini ${weights.gemini * 100}% (innovation)`,
      'RESEARCH_BD': `Architecture focus: Balanced Claude ${weights.claude * 100}% + Gemini ${weights.gemini * 100}%`,
      'RESEARCH_DD': `Detail design focus: Claude ${weights.claude * 100}% + Gemini ${weights.gemini * 100}% (implementation)`
    };

    return descriptions[researchFocus] || `Balanced strategy: Claude ${weights.claude * 100}% + Gemini ${weights.gemini * 100}%`;
  }
}

module.exports = {
  BaseResearchStrategy,
  ClaudeSystematicStrategy,
  GeminiCreativeStrategy,
  StrategySelector
};
