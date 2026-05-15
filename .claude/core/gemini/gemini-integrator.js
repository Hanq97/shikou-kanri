"use strict";

/**
 * Gemini SDK Integration for EPS Framework INNOVATE phase.
 * Uses @google/generative-ai SDK directly for text generation.
 * Loads project context from project-config.json via getTechStack().
 * Version: 2.0.0
 */

const fs = require("fs");
const path = require("path");

class GeminiIntegrator {
  constructor() {
    this.apiKey = null;
    this.isAvailable = false;
    this._genAI = null;
    this._model = null;
    this._projectConfig = null;
  }

  /**
   * Initialize with API key and load stack config.
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      this.apiKey = this._loadApiKey();
      if (!this.apiKey) {
        console.log("[GeminiIntegrator] No API key found, Gemini unavailable");
        this.isAvailable = false;
        return false;
      }

      const { GoogleGenerativeAI } = require("@google/generative-ai");
      this._genAI = new GoogleGenerativeAI(this.apiKey);
      this._geminiConfig = this._loadGeminiConfig();
      const modelName = this._geminiConfig?.model || "gemini-2.5-pro";
      this._model = this._genAI.getGenerativeModel({ model: modelName });
      this._projectConfig = this._loadProjectConfig();
      this.isAvailable = true;
      return true;
    } catch (error) {
      console.warn(`[GeminiIntegrator] Init failed: ${error.message}`);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Load API key from config files or environment.
   * @private
   * @returns {string|null}
   */
  _loadApiKey() {
    if (process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }

    const configPaths = [
      path.resolve(__dirname, "..", "..", "config", "external-apis.json"),
      path.resolve(__dirname, "..", "..", "..", "config", "external-apis.json"),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          if (config.GEMINI_API_KEY) return config.GEMINI_API_KEY;
          if (config.mcpServers?.gemini?.env?.GEMINI_API_KEY) {
            return config.mcpServers.gemini.env.GEMINI_API_KEY;
          }
        } catch (e) {
          /* continue */
        }
      }
    }

    return null;
  }

  /**
   * Load Gemini config from external-apis.json.
   * @private
   * @returns {object|null}
   */
  _loadGeminiConfig() {
    const configPaths = [
      path.resolve(__dirname, "..", "..", "config", "external-apis.json"),
      path.resolve(__dirname, "..", "..", "..", "config", "external-apis.json"),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          if (config.gemini) return config.gemini;
        } catch (e) {
          /* continue */
        }
      }
    }

    return null;
  }

  /**
   * Load project config from project-config.json for domain/project name.
   * @private
   * @returns {object|null}
   */
  _loadProjectConfig() {
    const configPaths = [
      path.resolve(__dirname, "..", "..", "config", "project-config.json"),
      path.resolve(__dirname, "..", "..", "..", "config", "project-config.json"),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          return JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch (e) {
          /* continue */
        }
      }
    }
    return null;
  }

  /**
   * Get project tech stack description from loaded config.
   * @private
   * @returns {{name: string, backend: string, frontend: string, database: string}}
   */
  _getProjectStack() {
    try {
      const { getTechStack } = require("../state/project-config.js");
      const ts = getTechStack();
      if (ts.sourceRoots.length > 0) {
        const parts = [];
        for (const root of ts.sourceRoots) {
          parts.push(`${root.language} ${root.framework}`);
        }
        const infra = ts.infrastructure;
        return {
          name: parts.join(" + ") + (infra.database ? ` + ${infra.database}` : ""),
          backend: ts.sourceRoots.filter(r => (r.label || r.type) === "backend").map(r => `${r.language} ${r.framework} (${r.variant})`).join(", ") || "Unknown",
          frontend: ts.sourceRoots.filter(r => (r.label || r.type) === "frontend").map(r => `${r.framework} ${r.patterns?.uiLibrary || ""}`).join(", ") || "Unknown",
          database: infra.database || "Unknown",
        };
      }
    } catch (e) {
      // getTechStack not available
    }
    return {
      name: "Unknown Stack",
      backend: "Unknown",
      frontend: "Unknown",
      database: "Unknown",
    };
  }

  /**
   * Parse evidence text to extract sections marked with [TAG] prefix.
   * Case-insensitive matching. Returns empty array if no tags found.
   * @param {string} text - Full evidence content
   * @param {string} tag - Tag name: "CONSTRAINT", "REJECTED", "APPROVED"
   * @returns {Array<{tag: string, content: string, source: string}>}
   */
  extractTaggedSections(text, tag) {
    if (!text || !tag) return [];

    const pattern = new RegExp(
      "\\[" +
        tag +
        "\\]\\s*(.+?)(?=\\[(?:CONSTRAINT|REJECTED|APPROVED)\\]|\\n\\n|$)",
      "gis",
    );

    const results = [];
    for (const match of text.matchAll(pattern)) {
      const content = match[1].trim();
      if (content) {
        const sourceMatch = content.match(/(?:Section|Evidence)\s+([\d.]+)/i);
        results.push({
          tag: tag.toUpperCase(),
          content,
          source: sourceMatch ? sourceMatch[0] : "unknown",
        });
      }
    }
    return results;
  }

  /**
   * Detect project domain based on taskType, featureName, and project config.
   * 4-tier: explicit infrastructure → keyword inference → project-config → generic.
   * @private
   * @param {object} context - { taskType, featureName, projectName }
   * @returns {{ domain: string, projectName: string, suppressPersonas: boolean }}
   */
  _detectProjectContext(context) {
    const taskType = context.taskType || "";
    const featureName = context.featureName || "";

    // Tier 1: Explicit infrastructure taskType
    if (taskType === "infrastructure") {
      return {
        domain: "Developer Tooling / Workflow Engine",
        projectName: featureName || "EPS Framework",
        suppressPersonas: true,
      };
    }

    // Tier 2: Infer infrastructure from featureName keywords
    const infraKeywords = [
      "RAG", "HIPPORAG", "SCAN", "INDEXER", "MIGRATION", "ADAPTER",
      "FRAMEWORK", "STORAGE", "MCP", "BRIDGE", "PIPELINE", "EPS",
      "DB-LAYER", "DOC-INDEXING", "SPECIALIST", "CMD-", "WORKFLOW-ENGINE",
    ];
    const upperFeature = featureName.toUpperCase();
    const isInfraByKeyword = infraKeywords.some((kw) => upperFeature.includes(kw));
    if (isInfraByKeyword) {
      return {
        domain: "Developer Tooling / Workflow Engine",
        projectName: featureName || "EPS Framework",
        suppressPersonas: true,
      };
    }

    // Tier 3: Application feature — read from project-config.json
    const projDomain = this._projectConfig?.domain || null;
    const projName = this._projectConfig?.name || null;

    if (projDomain) {
      return {
        domain: projDomain || "Software Project",
        projectName: context.projectName || projName || featureName || "Project",
        suppressPersonas: false,
      };
    }

    // Tier 4: Fallback — no config at all
    return {
      domain: "Software Project",
      projectName: context.projectName || featureName || "Unknown Project",
      suppressPersonas: false,
    };
  }

  /**
   * Generate innovation options using Gemini SDK.
   * @param {string} evidence - Evidence content
   * @param {string} type - 'INNOVATE_SRS'|'INNOVATE_BD'|'INNOVATE_DD'
   * @param {object} [context] - Project and conversation context
   * @returns {Promise<{source: string, type: string, options: Array, raw: string}>}
   */
  async generateOptions(evidence, type, context = {}) {
    if (!this.isAvailable) {
      throw new Error("Gemini is not available");
    }

    const prompt = this.buildPrompt(evidence, type, context);

    try {
      const result = await this._model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this._geminiConfig?.temperature || 0.7,
          maxOutputTokens: this._geminiConfig?.maxOutputTokens || 8000,
        },
      });

      const text = result.response.text();
      const options = this.extractOptions(text, type);

      return {
        source: "gemini",
        type,
        timestamp: new Date().toISOString(),
        options,
        raw: text,
      };
    } catch (error) {
      console.error(
        `[GeminiIntegrator] generateOptions error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Build enhanced prompt for Gemini with constraints at TOP, dynamic domain context,
   * full evidence content, and domain-aware type-specific instructions.
   * @param {string} evidence - Evidence content
   * @param {string} type - 'INNOVATE_SRS'|'INNOVATE_BD'|'INNOVATE_DD'
   * @param {object} [context] - Project and conversation context
   * @param {string} [context.projectName]
   * @param {string} [context.architecture]
   * @param {string} [context.taskType] - 'new'|'enhancement'|'bugfix'|'infrastructure'
   * @param {string} [context.userPreferences]
   * @param {string} [context.constraints]
   * @param {string} [context.featureName]
   */
  buildPrompt(evidence, type, context = {}) {
    // Step 1: Extract constraints from evidence
    const constraintEntries = this.extractTaggedSections(
      evidence,
      "CONSTRAINT",
    );
    const rejectedEntries = this.extractTaggedSections(evidence, "REJECTED");

    // Step 2: Detect project context (3-tier fallback)
    const projectCtx = this._detectProjectContext(context);

    // Step 3: Get tech stack (for app features only)
    const stack = this._getProjectStack();

    // Step 4: Build constraints section (TOP of prompt — BR-017)
    let constraintsBlock = "";
    if (constraintEntries.length > 0 || rejectedEntries.length > 0) {
      constraintsBlock = "\n=== CONSTRAINTS (MUST RESPECT) ===\n";
      if (constraintEntries.length > 0) {
        constraintsBlock += "Established Constraints:\n";
        for (const entry of constraintEntries) {
          constraintsBlock += `- [CONSTRAINT] ${entry.content}\n`;
        }
      }
      if (rejectedEntries.length > 0) {
        constraintsBlock += "\nRejected Approaches (DO NOT propose these):\n";
        for (const entry of rejectedEntries) {
          constraintsBlock += `- [REJECTED] ${entry.content}\n`;
        }
      }
      constraintsBlock += "\nIMPORTANT: Respect the above constraints. ";
      constraintsBlock +=
        "Do NOT propose approaches that have been [REJECTED].\n";
      constraintsBlock += "=== END CONSTRAINTS ===\n";
    }

    // Step 5: Build domain context section (dynamic — FR-INNO-006)
    let domainBlock = "\nProject Context:\n";
    domainBlock += `- Project: ${projectCtx.projectName}\n`;
    domainBlock += `- Domain: ${projectCtx.domain}\n`;

    if (!projectCtx.suppressPersonas) {
      domainBlock += `- Stack: ${stack.name}\n`;
      domainBlock += `- Backend: ${stack.backend}\n`;
      domainBlock += `- Frontend: ${stack.frontend}\n`;
      domainBlock += `- Database: ${stack.database}\n`;
      domainBlock += `- Architecture: ${context.architecture || "Clean Architecture with DDD"}\n`;
    }

    if (context.featureName) {
      domainBlock += `- Feature: ${context.featureName}\n`;
    }
    if (context.taskType) {
      domainBlock += `- Task Type: ${context.taskType}\n`;
    }

    // Step 6: Include any additional context from caller
    let additionalBlock = "";
    if (context.userPreferences) {
      additionalBlock += `\nUser Preferences & Feedback:\n${context.userPreferences}\n`;
    }
    if (context.constraints) {
      additionalBlock += `\nAdditional Architectural Constraints:\n${context.constraints}\n`;
    }

    // Step 6.5: Build task header block (FR-GCF-003)
    let taskHeaderBlock = "";
    if (context.taskSummary) {
      taskHeaderBlock = `\n=== TASK: ${context.featureName || "Unknown"} | Type: ${context.taskType || "unknown"} ===\n`;
      taskHeaderBlock += `${context.taskSummary}\n`;
      taskHeaderBlock += "=== END TASK ===\n";
    } else if (context.featureName) {
      taskHeaderBlock = `\n=== TASK: ${context.featureName}`;
      if (context.taskType) taskHeaderBlock += ` | Type: ${context.taskType}`;
      if (projectCtx.domain)
        taskHeaderBlock += ` | Domain: ${projectCtx.domain}`;
      taskHeaderBlock += " ===\n";
    }

    // Step 7: Build base prompt (constraints TOP → domain → task header → additional → evidence)
    const basePrompt =
      `\nYou are analyzing the following evidence for a ${type} design phase.\nPlease generate 3 innovative alternative approaches.\n` +
      constraintsBlock +
      domainBlock +
      taskHeaderBlock +
      additionalBlock +
      `\nEvidence:\n${evidence}\n`;

    // Step 8: Build domain-aware type-specific instructions
    let typePrompts;

    if (projectCtx.suppressPersonas) {
      // Infrastructure type prompts (FR-INNO-008, BR-020, BR-021)
      typePrompts = {
        INNOVATE_SRS:
          `\nGenerate 3 alternative approaches for this ${projectCtx.domain} feature:\n` +
          "1. Focus on developer experience and workflow efficiency\n" +
          "2. Consider maintainability and extensibility of the tooling\n" +
          "3. Evaluate integration with existing framework components\n" +
          "4. Address reliability and backward compatibility\n\n" +
          "For each alternative provide:\n" +
          "- Approach name\n- Key design decisions\n- How it fits the existing framework\n" +
          "- Benefits and trade-offs\n- Risk assessment\n",

        INNOVATE_BD:
          `\nGenerate 3 architecture alternatives for this ${projectCtx.domain} enhancement:\n` +
          "1. Challenge conventional approaches while respecting existing patterns\n" +
          "2. Focus on code maintainability and developer experience\n" +
          "3. Consider backward compatibility and migration path\n" +
          "4. Evaluate complexity vs value trade-offs\n\n" +
          "For each alternative provide:\n" +
          "- Architecture pattern name\n- Key components and interactions\n" +
          "- How it integrates with existing codebase\n- Benefits and trade-offs\n- Risk assessment\n",

        INNOVATE_DD:
          `\nGenerate 3 implementation alternatives for this ${projectCtx.domain} feature:\n` +
          "1. Propose different implementation strategies\n" +
          "2. Consider code organization and file structure\n" +
          "3. Evaluate testing strategies for the changes\n" +
          "4. Address error handling and edge cases\n\n" +
          "For each alternative provide:\n" +
          "- Implementation approach name\n- Code organization strategy\n" +
          "- Error handling approach\n- Testing strategy\n- Complexity assessment\n",
      };
    } else {
      // Application type prompts — domain-aware (reads from project-config.json)
      typePrompts = {
        INNOVATE_SRS:
          `\nGenerate 3 business-focused requirement alternatives for this ${projectCtx.domain} project:\n` +
          `1. Reimagine ${projectCtx.domain} user workflows\n` +
          "2. Introduce innovative features that differentiate the product\n" +
          "3. Consider different user personas and their needs\n" +
          "4. Address compliance, security, and trust-building\n\n" +
          "For each alternative provide:\n" +
          "- Business approach name\n- Key differentiators\n" +
          "- User value proposition for each persona\n" +
          "- Compliance strategy\n- Implementation complexity assessment\n",

        INNOVATE_BD:
          `\nGenerate 3 innovative Basic Design architecture alternatives for this ${projectCtx.domain} project:\n` +
          "1. Challenge conventional approaches while respecting the technology stack\n" +
          `2. Leverage emerging patterns suitable for ${projectCtx.domain}\n` +
          "3. Focus on scalability, security, and maintainability\n" +
          "4. Consider edge cases specific to this domain\n\n" +
          "For each alternative provide:\n" +
          "- Architecture pattern name\n- Key components and their interactions\n" +
          "- How it leverages the existing tech stack\n- Innovative aspects specific to this domain\n" +
          "- Benefits and trade-offs\n- Risk assessment (technical + business)\n",

        INNOVATE_DD:
          `\nGenerate 3 creative Detail Design implementation alternatives for this ${projectCtx.domain} project:\n` +
          "1. Propose different API design patterns suitable for the domain\n" +
          "2. Explore state management strategies for the data model\n" +
          "3. Consider performance optimizations for key operations\n" +
          "4. Address security patterns for sensitive data\n\n" +
          "For each alternative provide:\n" +
          "- Implementation approach name\n- API design strategy\n" +
          "- State management approach\n- Performance characteristics\n" +
          "- Security considerations\n- Testing strategy\n",
      };
    }

    return basePrompt + (typePrompts[type] || typePrompts["INNOVATE_BD"]);
  }

  /**
   * Analyze Claude options from Gemini perspective.
   * @param {Array} claudeOptions
   * @returns {Promise<object|null>}
   */
  async analyzeClaudeOptions(claudeOptions) {
    if (!this.isAvailable) return null;

    const prompt = `
Analyze the following options and provide:
1. Alternative perspectives on each option
2. Potential blind spots or missed opportunities
3. Creative enhancements or modifications
4. Risk factors that might have been overlooked

Options:
${JSON.stringify(claudeOptions, null, 2)}

Provide your analysis in a structured format with clear sections.
`;

    try {
      const result = await this._model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
      });

      const text = result.response.text();
      return {
        source: "gemini-analysis",
        timestamp: new Date().toISOString(),
        analysis: text,
        insights: this.extractInsights(text),
      };
    } catch (error) {
      console.error(
        `[GeminiIntegrator] analyzeClaudeOptions error: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * @deprecated Replaced by synthesis pipeline in innovate/srs.md and innovate/dd.md.
   * Kept for backward compatibility. Do not call from new code.
   * Create hybrid solutions combining Claude and Gemini options.
   * @param {Array} claudeOptions
   * @param {Array} geminiOptions
   * @param {object} crossAnalysis
   * @returns {Array}
   */
  createHybridSolutions(claudeOptions, geminiOptions, crossAnalysis) {
    const hybrids = [];

    const bestTechnical = this.findBestByScore(claudeOptions, "technical");
    const bestInnovation = this.findBestByScore(geminiOptions, "innovation");

    if (bestTechnical && bestInnovation) {
      hybrids.push({
        id: "hybrid-1",
        name: "Technical Excellence + Innovation",
        description: `Combines ${bestTechnical.name} with innovative aspects of ${bestInnovation.name}`,
        components: { claude: bestTechnical, gemini: bestInnovation },
        source: "hybrid",
        scores: this.mergeScores(bestTechnical.scores, bestInnovation.scores),
      });
    }

    const lowRisk = this.findBestByScore(claudeOptions, "risk", true);
    const highFeasibility = this.findBestByScore(geminiOptions, "feasibility");

    if (lowRisk && highFeasibility) {
      hybrids.push({
        id: "hybrid-2",
        name: "Safe & Feasible",
        description: `Merges low-risk approach of ${lowRisk.name} with feasibility of ${highFeasibility.name}`,
        components: { claude: lowRisk, gemini: highFeasibility },
        source: "hybrid",
        scores: this.mergeScores(lowRisk.scores, highFeasibility.scores),
      });
    }

    if (crossAnalysis?.insights?.enhancements?.length > 0) {
      hybrids.push({
        id: "hybrid-3",
        name: "AI-Optimized Blend",
        description:
          "Combination suggested by cross-analysis of both AI models",
        analysis: crossAnalysis.insights.enhancements[0],
        source: "hybrid-ai",
        scores: { technical: 8, innovation: 8, risk: 5, feasibility: 7 },
      });
    }

    return hybrids;
  }

  /**
   * Extract structured options from generated text.
   * @param {string} text
   * @param {string} type
   * @returns {Array}
   */
  extractOptions(text, type) {
    const options = [];

    const patterns = [
      /(?:Alternative|Option|Approach)\s*(\d+)[:\s]*(.*?)(?=(?:Alternative|Option|Approach)\s*\d+|$)/gis,
      /(\d+)\.\s*([^:\n]+):\s*([\s\S]*?)(?=\d+\.\s|$)/g,
    ];

    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length >= 2) {
        matches.slice(0, 3).forEach((match, index) => {
          options.push({
            id: `gemini-${index + 1}`,
            name: match[2]?.trim() || `Option ${index + 1}`,
            description: match[3]?.trim() || match[0].trim(),
            source: "gemini",
            scores: this.calculateScores(match[0]),
          });
        });
        break;
      }
    }

    if (options.length === 0) {
      const sections = text.split(/\n\n+/).filter((s) => s.trim());
      sections.slice(0, 3).forEach((section, index) => {
        options.push({
          id: `gemini-${index + 1}`,
          name: `Gemini Alternative ${index + 1}`,
          description: section.trim(),
          source: "gemini",
          scores: this.calculateScores(section),
        });
      });
    }

    return options;
  }

  /**
   * Calculate heuristic scores based on keyword presence.
   * @param {string} text
   * @returns {{technical: number, innovation: number, risk: number, feasibility: number}}
   */
  calculateScores(text) {
    const scores = { technical: 0, innovation: 0, risk: 0, feasibility: 0 };
    const lower = text.toLowerCase();

    const keywords = {
      technical: [
        "architecture",
        "pattern",
        "design",
        "implementation",
        "performance",
        "scalability",
      ],
      innovation: [
        "innovative",
        "creative",
        "novel",
        "emerging",
        "modern",
        "cutting-edge",
      ],
      risk: [
        "risk",
        "challenge",
        "complexity",
        "difficult",
        "concern",
        "issue",
      ],
      feasibility: [
        "simple",
        "straightforward",
        "proven",
        "established",
        "reliable",
        "stable",
      ],
    };

    for (const [criterion, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (lower.includes(word)) scores[criterion]++;
      }
      scores[criterion] = Math.min(10, scores[criterion] * 2);
    }

    return scores;
  }

  /**
   * Extract key insights from analysis text.
   * @param {string} text
   * @returns {{alternatives: Array, blindSpots: Array, enhancements: Array, risks: Array}}
   */
  extractInsights(text) {
    const insights = {
      alternatives: [],
      blindSpots: [],
      enhancements: [],
      risks: [],
    };
    const sections = text.split(/\n(?=[A-Z#])/);

    for (const section of sections) {
      const lower = section.toLowerCase();
      if (lower.includes("alternative") || lower.includes("perspective")) {
        insights.alternatives.push(section.trim());
      } else if (lower.includes("blind") || lower.includes("miss")) {
        insights.blindSpots.push(section.trim());
      } else if (lower.includes("enhance") || lower.includes("improve")) {
        insights.enhancements.push(section.trim());
      } else if (lower.includes("risk") || lower.includes("concern")) {
        insights.risks.push(section.trim());
      }
    }

    return insights;
  }

  /**
   * Find best option by score criteria.
   * @param {Array} options
   * @param {string} criteria
   * @param {boolean} [lowerIsBetter=false]
   * @returns {object|null}
   */
  findBestByScore(options, criteria, lowerIsBetter = false) {
    if (!options || options.length === 0) return null;
    return options.reduce((best, current) => {
      const cs = current.scores?.[criteria] || 0;
      const bs = best?.scores?.[criteria] || 0;
      return lowerIsBetter
        ? cs < bs
          ? current
          : best
        : cs > bs
          ? current
          : best;
    }, options[0]);
  }

  /**
   * Merge scores with weighted averaging.
   * @param {object} scores1
   * @param {object} scores2
   * @returns {object}
   */
  mergeScores(scores1, scores2) {
    const weights = {
      technical: [0.7, 0.3],
      innovation: [0.3, 0.7],
      risk: [0.5, 0.5],
      feasibility: [0.5, 0.5],
    };
    const merged = {};
    for (const [criterion, [w1, w2]] of Object.entries(weights)) {
      merged[criterion] =
        Math.round(
          ((scores1?.[criterion] || 0) * w1 +
            (scores2?.[criterion] || 0) * w2) *
            10,
        ) / 10;
    }
    return merged;
  }
}

module.exports = GeminiIntegrator;
