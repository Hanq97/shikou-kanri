/**
 * Enhanced Planning System - Multi-Model PLAN
 *
 * Generates three planning options for every request:
 * 1. Claude Systematic - Sequential, milestone-based
 * 2. Gemini Optimized - Parallel, resource-optimized
 * 3. Hybrid Balanced - Mix of parallel/sequential
 *
 * Includes complexity analysis for model selection:
 * - gemini-3-pro for complexity < 7
 * - gemini-3-deep-thinking for complexity >= 7
 *
 * Version: 1.0.0
 * Author: EPS Framework Team
 * Date: 2025-12-20
 */

const fs = require("fs").promises;
const path = require("path");
const ExpertRouter = require('../mcp/mcp-expert-router.js');
const ConfidenceEngineV2 = require("../confidence/confidence-engine-v2.js");
const { ParallelExecutor } = require("./parallel-engine.js");
const { DependencyGraph } = require("./dependency-graph.js");
const { PatternExtractor } = require("../pattern/pattern-extractor.js");
const { PatternReuseEngine } = require("../pattern/pattern-reuse-engine.js");

class EnhancedPlanSystem {
  constructor(config = {}) {
    this.config = {
      // Model configuration
      models: {
        claude: {
          name: "claude-3-opus",
          strengths: ["systematic", "predictable", "milestone-based"],
          approach: "sequential",
        },
        gemini: {
          pro: {
            name: "gemini-3-pro",
            threshold: 7,
            strengths: ["fast", "efficient", "parallel"],
            approach: "optimized",
          },
          deepThinking: {
            name: "gemini-3-deep-thinking",
            threshold: 7,
            strengths: ["complex-analysis", "deep-reasoning", "optimization"],
            approach: "advanced",
          },
        },
      },

      // Planning parameters
      planning: {
        alwaysThreeOptions: true,
        complexityAnalysis: true,
        resourceOptimization: true,
        riskAssessment: true,
        timelineEstimation: true,
      },

      // Complexity factors
      complexityFactors: {
        distributed: 2,
        blockchain: 3,
        algorithm: 2,
        "real-time": 2,
        consensus: 3,
        microservices: 2,
        "machine-learning": 3,
        security: 2,
        scalability: 2,
        integration: 1,
      },

      // Output configuration
      output: {
        format: "structured",
        includeGanttChart: true,
        includeResourceAllocation: true,
        includeRiskMatrix: true,
        saveToMemoryBank: true,
      },

      ...config,
    };

    // Planning state
    this.state = {
      currentProject: null,
      complexity: null,
      selectedModel: null,
      plans: [],
      evaluation: null,
      selectedPlan: null,
    };

    // Metrics tracking
    this.metrics = {
      totalPlans: 0,
      planDistribution: {
        claude: 0,
        gemini: 0,
        hybrid: 0,
      },
      averageComplexity: 0,
      modelUsage: {
        "gemini-3-pro": 0,
        "gemini-3-deep-thinking": 0,
      },
      executionTime: [],
    };

    // Plan v2.5: Initialize Expert Router with stack-aware KB
    this.variantContext = this._loadVariantContext();
    this.expertRouter = new ExpertRouter(this.variantContext);

    // Week 2 Day 3: Initialize Confidence Engine V2
    this.confidenceEngine = new ConfidenceEngineV2();

    // Week 6: Initialize Pattern Extraction and Reuse Engines
    this.patternExtractor = new PatternExtractor({
      minFrequency: 3,
      minConfidence: 0.9,
    });

    this.patternReuseEngine = new PatternReuseEngine({
      minRelevanceScore: 0.3,
      kbPath: path.join(__dirname, "../knowledge-base"),
    });

    // Plan v2.5: Week 0 metrics tracking
    this.week0Metrics = {
      total_consultations: 0,
      kb_hits: 0,
      agent_hits: 0,
      mcp_hits: 0,
      total_tokens: 0,
      avg_confidence: 0,
    };

    // Week 6: Pattern reuse metrics tracking
    this.patternMetrics = {
      patterns_matched: 0,
      patterns_reused: 0,
      avg_relevance_score: 0,
      confidence_improvement: 0,
      time_saved_ms: 0,
    };
  }

  /**
   * Load variant context synchronously from stacks.json and project-config.json
   * @returns {Object|null} - Variant context with kb_path and patterns, or null
   */
  _loadVariantContext() {
    try {
      const { getTechStack } = require("../state/project-config.js");
      const { getStackResolver } = require("../state/stack-resolver.js");
      const ts = getTechStack();
      const resolver = getStackResolver();

      // Iterate sourceRoots → merge variant context from all roots
      const merged = { kb_path: {}, patterns: {} };
      const stackIds = [];

      for (const root of ts.sourceRoots) {
        const stackId = root.stackKey || root.stack;
        const variant = resolver.getVariant(stackId, root.variant);
        if (!variant) continue;

        stackIds.push(`${stackId}/${root.variant}`);
        if (variant.kb_path) Object.assign(merged.kb_path, variant.kb_path);
        if (variant.patterns) Object.assign(merged.patterns, variant.patterns);
      }

      if (stackIds.length === 0) return null;

      // Use resolveSpecialists() to include generic (Variant=ALL) specialists
      const allSpecialists = resolver.resolveSpecialists();

      console.log(`[EnhancedPlan] Stacks detected: ${stackIds.join(", ")}`);
      console.log(`[EnhancedPlan] Specialists resolved: ${allSpecialists.length} (config + generic scan)`);
      return {
        stackId: ts.sourceRoots[0]?.stack,
        variantId: ts.sourceRoots[0]?.variant,
        kb_path: merged.kb_path,
        patterns: merged.patterns,
        specialists: allSpecialists,
      };
    } catch (err) {
      console.warn(
        `[EnhancedPlan] Could not load stack config: ${err.message}`,
      );
      return null;
    }
  }

  /**
   * Main planning method - Always generates 3 plans
   *
   * @param {string} project - Project name
   * @param {object} requirements - Requirements object
   * @param {Array<string>} personas - Week 12: Persona names (optional)
   */
  async createPlan(project, requirements = {}, personas = []) {
    const startTime = Date.now();

    console.log("📋 Starting Enhanced Planning Process");
    console.log(`🎯 Project: ${project}`);

    // Week 12: Display persona information
    if (personas.length > 0) {
      console.log(`🎭 Personas: ${personas.join(", ")}`);
      const PersonaManager = require('../mcp/persona-manager.js');
      const pm = new PersonaManager();
      const modifiers = pm.getConfidenceModifiers(personas);
      console.log(
        `   Confidence Adjustments: KB +${modifiers.kb}%, Agent +${modifiers.agent}%, Plan +${modifiers.plan}%`,
      );
      console.log(`   Plan Threshold: ${90 + modifiers.plan}% (default: 90%)`);
    }

    try {
      // 1. Analyze complexity
      this.state.currentProject = project;
      this.state.complexity = await this.analyzeComplexity(
        project,
        requirements,
      );

      console.log(`📊 Complexity Score: ${this.state.complexity.score}`);
      console.log(`🤖 Selected Model: ${this.state.complexity.selectedModel}`);

      // 1.5. [Week 6] Match and reuse relevant patterns
      console.log("\n🔍 [Week 6] Matching relevant patterns from history...");
      const patternStartTime = Date.now();

      const patternRequest = {
        feature: project,
        techStack: requirements.techStack || [],
        category: requirements.category || "backend",
        keywords: requirements.keywords || [],
      };

      const relevantPatterns =
        await this.patternReuseEngine.matchPatterns(patternRequest);

      if (relevantPatterns.length > 0) {
        console.log(
          `✅ [Week 6] Found ${relevantPatterns.length} relevant patterns`,
        );
        console.log(
          `📊 [Week 6] Top pattern: "${relevantPatterns[0].pattern}" (relevance: ${(relevantPatterns[0].relevanceScore * 100).toFixed(1)}%)`,
        );

        this.patternMetrics.patterns_matched = relevantPatterns.length;
        this.patternMetrics.patterns_reused = relevantPatterns.filter(
          (p) => p.relevanceScore >= 0.5,
        ).length;
        this.patternMetrics.avg_relevance_score =
          relevantPatterns.reduce((sum, p) => sum + p.relevanceScore, 0) /
          relevantPatterns.length;

        // Inject patterns into requirements for plan generation
        requirements._patterns = relevantPatterns;
      } else {
        console.log(
          `ℹ️  [Week 6] No relevant patterns found, generating from scratch`,
        );
      }

      const patternMatchTime = Date.now() - patternStartTime;
      console.log(
        `⏱️ [Week 6] Pattern matching completed in ${patternMatchTime}ms`,
      );

      // 2. Generate three plans in parallel
      const [claudePlan, geminiPlan, hybridPlan] = await Promise.all([
        this.generateClaudePlan(project, requirements),
        this.generateGeminiPlan(project, requirements),
        this.generateHybridPlan(project, requirements),
      ]);

      // 3. Optimize plans
      const optimizedPlans = await this.optimizePlans(
        [claudePlan, geminiPlan, hybridPlan],
        requirements,
      );

      // 4. [Plan v2.5] Generate detailed steps with Expert Router (Week 12: with personas)
      console.log("\n🚀 [Plan v2.5] Enriching plans with detailed steps...");
      for (const plan of optimizedPlans) {
        await this.generateDetailedSteps(plan, requirements, personas);
      }

      // 5. [Plan v2.5] Validate all plans
      console.log("\n✅ [Plan v2.5] Validating plans...");
      for (const plan of optimizedPlans) {
        plan.validation = await this.validatePlan(plan);
      }

      // 6. [Plan v2.5] Calculate confidence for all plans (Week 12: with persona adjustments)
      console.log("\n📊 [Plan v2.5] Calculating confidence scores...");
      for (const plan of optimizedPlans) {
        plan.confidence = await this.calculateConfidence(plan, personas);
      }

      // 7. Create risk assessment
      const riskAssessment = await this.assessRisks(optimizedPlans);

      // 8. Generate resource allocation
      const resourceAllocation = await this.allocateResources(optimizedPlans);

      // 9. Create evaluation matrix
      const evaluation = await this.evaluatePlans(optimizedPlans);

      // 10. Package results
      const result = {
        project,
        timestamp: new Date().toISOString(),
        complexity: this.state.complexity,
        plans: optimizedPlans,
        riskAssessment,
        resourceAllocation,
        evaluation,
        recommendation: this.generateRecommendation(evaluation),
        executionTime: Date.now() - startTime,
        // Plan v2.5 metrics
        week0Metrics: {
          total_consultations: this.week0Metrics.total_consultations,
          kb_hits: this.week0Metrics.kb_hits,
          agent_hits: this.week0Metrics.agent_hits,
          mcp_hits: this.week0Metrics.mcp_hits,
          total_tokens: this.week0Metrics.total_tokens,
          avg_confidence: this.week0Metrics.avg_confidence,
          hit_rates: {
            kb:
              Math.round(
                (this.week0Metrics.kb_hits /
                  this.week0Metrics.total_consultations) *
                  100,
              ) || 0,
            agent:
              Math.round(
                (this.week0Metrics.agent_hits /
                  this.week0Metrics.total_consultations) *
                  100,
              ) || 0,
            mcp:
              Math.round(
                (this.week0Metrics.mcp_hits /
                  this.week0Metrics.total_consultations) *
                  100,
              ) || 0,
          },
        },
        // Week 6 pattern metrics
        patternMetrics: {
          patterns_matched: this.patternMetrics.patterns_matched,
          patterns_reused: this.patternMetrics.patterns_reused,
          avg_relevance_score: this.patternMetrics.avg_relevance_score,
          confidence_improvement: this.patternMetrics.confidence_improvement,
          time_saved_ms: this.patternMetrics.time_saved_ms,
          reuse_rate:
            this.patternMetrics.patterns_matched > 0
              ? Math.round(
                  (this.patternMetrics.patterns_reused /
                    this.patternMetrics.patterns_matched) *
                    100,
                )
              : 0,
        },
      };

      // 11. [Week 6] Extract patterns from successful plans
      console.log("\n🎓 [Week 6] Extracting patterns from successful plans...");
      const extractStartTime = Date.now();

      for (const plan of optimizedPlans) {
        // Only extract from plans with ≥90% confidence
        if (plan.confidence && plan.confidence.confidence >= 90) {
          try {
            await this.patternExtractor.extractFromPlan({
              planId: plan.id,
              project: project,
              requirements: requirements,
              plan: plan,
              confidence: plan.confidence.confidence,
              success: true, // Assume successful if confidence >= 90%
            });

            console.log(
              `✅ [Week 6] Extracted patterns from ${plan.id} (confidence: ${plan.confidence.confidence}%)`,
            );
          } catch (error) {
            console.warn(
              `⚠️  [Week 6] Failed to extract patterns from ${plan.id}:`,
              error.message,
            );
          }
        }
      }

      const extractTime = Date.now() - extractStartTime;
      console.log(
        `⏱️ [Week 6] Pattern extraction completed in ${extractTime}ms`,
      );

      // 12. Save to memory bank
      if (this.config.output.saveToMemoryBank) {
        await this.saveToMemoryBank(result);
      }

      // Update metrics
      this.updateMetrics(result);

      console.log("\n✅ Planning process complete");
      console.log(`⏱️ Execution time: ${result.executionTime}ms`);
      console.log(
        `📊 [Plan v2.5] Expert Router consultations: ${result.week0Metrics.total_consultations}`,
      );
      console.log(
        `💰 [Plan v2.5] Total tokens used: ${result.week0Metrics.total_tokens}`,
      );
      console.log(
        `🎯 [Plan v2.5] Hit rates - KB: ${result.week0Metrics.hit_rates.kb}%, Agent: ${result.week0Metrics.hit_rates.agent}%, MCP: ${result.week0Metrics.hit_rates.mcp}%`,
      );

      // Week 6 pattern metrics
      if (result.patternMetrics.patterns_matched > 0) {
        console.log(`\n🎓 [Week 6] Pattern Reuse Metrics:`);
        console.log(
          `   Patterns matched: ${result.patternMetrics.patterns_matched}`,
        );
        console.log(
          `   Patterns reused: ${result.patternMetrics.patterns_reused}`,
        );
        console.log(`   Reuse rate: ${result.patternMetrics.reuse_rate}%`);
        console.log(
          `   Avg relevance score: ${(result.patternMetrics.avg_relevance_score * 100).toFixed(1)}%`,
        );
      }

      return result;
    } catch (error) {
      console.error("❌ Planning process failed:", error);
      throw error;
    }
  }

  /**
   * Analyze project complexity
   */
  async analyzeComplexity(project, requirements) {
    console.log("🔍 Analyzing project complexity...");

    let score = 0;
    const factors = [];

    // Check each complexity factor
    const projectText =
      `${project} ${JSON.stringify(requirements)}`.toLowerCase();

    for (const [factor, weight] of Object.entries(
      this.config.complexityFactors,
    )) {
      if (projectText.includes(factor)) {
        score += weight;
        factors.push({ factor, weight });
      }
    }

    // Additional complexity from requirements
    if (requirements.scale === "large") score += 2;
    if (requirements.scale === "enterprise") score += 3;
    if (requirements.timeline === "urgent") score += 2;
    if (requirements.team && requirements.team > 10) score += 2;
    if (
      requirements.integrations &&
      Array.isArray(requirements.integrations) &&
      requirements.integrations.length > 3
    )
      score += 2;

    // Select appropriate Gemini model
    const selectedModel =
      score >= this.config.models.gemini.deepThinking.threshold
        ? "gemini-3-deep-thinking"
        : "gemini-3-pro";

    return {
      score,
      level: score < 5 ? "simple" : score < 10 ? "moderate" : "complex",
      factors,
      selectedModel,
      rationale: `Complexity score ${score} requires ${selectedModel} for optimal planning`,
    };
  }

  /**
   * Generate Claude plan - Systematic and sequential
   */
  async generateClaudePlan(project, requirements) {
    console.log("📘 Generating Claude Systematic Plan...");

    const plan = {
      id: "plan-claude",
      model: "claude",
      approach: "Systematic & Sequential",
      title: `${project} - Systematic Approach`,
      description: "",
      phases: [],
      timeline: {},
      resources: {},
      milestones: [],
      risks: [],
      score: 0,
    };

    // Claude's systematic approach
    plan.description = `A systematic, milestone-based approach to ${project} with clear phases and predictable timeline.`;

    // Generate phases (sequential)
    plan.phases = [
      {
        id: "phase-1",
        name: "Requirements & Design",
        duration: "2 weeks",
        tasks: [
          { name: "Gather requirements", duration: "3 days" },
          { name: "Technical design", duration: "4 days" },
          { name: "Review & approval", duration: "3 days" },
        ],
        dependencies: [],
      },
      {
        id: "phase-2",
        name: "Core Development",
        duration: "4 weeks",
        tasks: [
          { name: "Backend implementation", duration: "10 days" },
          { name: "Frontend implementation", duration: "8 days" },
          { name: "Integration", duration: "2 days" },
        ],
        dependencies: ["phase-1"],
      },
      {
        id: "phase-3",
        name: "Testing & Validation",
        duration: "2 weeks",
        tasks: [
          { name: "Unit testing", duration: "3 days" },
          { name: "Integration testing", duration: "4 days" },
          { name: "User acceptance testing", duration: "3 days" },
        ],
        dependencies: ["phase-2"],
      },
      {
        id: "phase-4",
        name: "Deployment & Launch",
        duration: "1 week",
        tasks: [
          { name: "Production setup", duration: "2 days" },
          { name: "Deployment", duration: "1 day" },
          { name: "Monitoring & support", duration: "2 days" },
        ],
        dependencies: ["phase-3"],
      },
    ];

    // Calculate timeline
    plan.timeline = this.calculateTimeline(plan.phases, "sequential");

    // Define milestones
    plan.milestones = [
      {
        name: "Design Approval",
        date: "Week 2",
        deliverable: "Technical specifications",
      },
      {
        name: "MVP Complete",
        date: "Week 6",
        deliverable: "Working prototype",
      },
      { name: "Testing Complete", date: "Week 8", deliverable: "Test reports" },
      { name: "Go Live", date: "Week 9", deliverable: "Production system" },
    ];

    // Resource requirements
    plan.resources = {
      team: {
        "project-manager": 0.5,
        "backend-developer": 2,
        "frontend-developer": 2,
        "qa-engineer": 1,
        "devops-engineer": 0.5,
      },
      total: 6,
      cost: this.estimateCost(plan),
    };

    // Risk assessment
    plan.risks = [
      {
        type: "timeline",
        probability: "low",
        impact: "medium",
        mitigation: "Buffer time included",
      },
      {
        type: "scope-creep",
        probability: "medium",
        impact: "high",
        mitigation: "Clear requirements phase",
      },
      {
        type: "technical",
        probability: "low",
        impact: "low",
        mitigation: "Proven technology stack",
      },
    ];

    // Calculate score
    plan.score = this.calculatePlanScore(plan, requirements);

    return plan;
  }

  /**
   * Generate Gemini plan - Optimized and parallel
   */
  async generateGeminiPlan(requirements, complexityScore) {
    // Determine model based on complexity score
    const selectedModel =
      complexityScore >= 7 ? "gemini-3-deep-thinking" : "gemini-3-pro";
    console.log(`🎨 Generating Gemini Optimized Plan (${selectedModel})...`);

    const plan = {
      id: "plan-gemini",
      model: "gemini",
      approach: "Optimized & Parallel",
      title: `${requirements.feature || "Project"} - Optimized Approach`,
      description: "",
      phases: [],
      timeline: {},
      resources: {},
      milestones: [],
      risks: [],
      score: 0,
    };

    // Call appropriate Gemini model
    const geminiAnalysis = await this.callGeminiModel(
      requirements.feature || "Project",
      requirements,
      selectedModel,
    );

    plan.description =
      geminiAnalysis.description ||
      `An optimized, parallel-execution approach to ${requirements.feature || "project"} leveraging resource efficiency and speed.`;

    // Generate phases (parallel where possible)
    plan.phases = [
      {
        id: "phase-1",
        name: "Rapid Planning",
        duration: "1 week",
        tasks: [
          { name: "Requirements sprint", duration: "2 days" },
          { name: "Rapid prototyping", duration: "2 days", parallel: true },
          { name: "Architecture design", duration: "2 days", parallel: true },
        ],
        dependencies: [],
      },
      {
        id: "phase-2a",
        name: "Backend Development",
        duration: "3 weeks",
        tasks: [
          { name: "API development", duration: "10 days" },
          { name: "Database setup", duration: "3 days", parallel: true },
          { name: "Service integration", duration: "2 days" },
        ],
        dependencies: ["phase-1"],
        parallel: true,
      },
      {
        id: "phase-2b",
        name: "Frontend Development",
        duration: "3 weeks",
        tasks: [
          { name: "UI implementation", duration: "8 days" },
          { name: "State management", duration: "3 days" },
          { name: "API integration", duration: "4 days" },
        ],
        dependencies: ["phase-1"],
        parallel: true,
      },
      {
        id: "phase-3",
        name: "Integration & Testing",
        duration: "1.5 weeks",
        tasks: [
          { name: "Integration", duration: "2 days" },
          { name: "Automated testing", duration: "3 days", parallel: true },
          { name: "Performance optimization", duration: "2.5 days" },
        ],
        dependencies: ["phase-2a", "phase-2b"],
      },
      {
        id: "phase-4",
        name: "Rapid Deployment",
        duration: "0.5 week",
        tasks: [
          { name: "CI/CD setup", duration: "1 day" },
          { name: "Rolling deployment", duration: "1 day" },
          { name: "Monitoring", duration: "0.5 day" },
        ],
        dependencies: ["phase-3"],
      },
    ];

    // Calculate timeline (parallel execution)
    plan.timeline = this.calculateTimeline(plan.phases, "parallel");

    // Define milestones
    plan.milestones = [
      {
        name: "Prototype Ready",
        date: "Week 1",
        deliverable: "Working prototype",
      },
      {
        name: "Features Complete",
        date: "Week 4",
        deliverable: "Feature-complete build",
      },
      { name: "Beta Release", date: "Week 5.5", deliverable: "Beta version" },
      { name: "Production", date: "Week 6", deliverable: "Live system" },
    ];

    // Resource requirements (optimized)
    plan.resources = {
      team: {
        "project-manager": 0.3,
        "full-stack-developer": 3,
        "qa-automation-engineer": 1,
        "devops-engineer": 1,
      },
      total: 5.3,
      cost: this.estimateCost(plan) * 0.8, // 20% cost reduction
    };

    // Risk assessment
    plan.risks = [
      {
        type: "coordination",
        probability: "medium",
        impact: "medium",
        mitigation: "Daily standups",
      },
      {
        type: "quality",
        probability: "medium",
        impact: "medium",
        mitigation: "Automated testing",
      },
      {
        type: "complexity",
        probability: "high",
        impact: "low",
        mitigation: "Experienced team",
      },
    ];

    // Calculate score
    plan.score = this.calculatePlanScore(plan, requirements);

    return plan;
  }

  /**
   * Generate Hybrid plan - Balanced approach
   */
  async generateHybridPlan(project, requirements) {
    console.log("🔄 Generating Hybrid Balanced Plan...");

    const plan = {
      id: "plan-hybrid",
      model: "hybrid",
      approach: "Balanced & Flexible",
      title: `${project} - Hybrid Approach`,
      description: "",
      phases: [],
      timeline: {},
      resources: {},
      milestones: [],
      risks: [],
      score: 0,
    };

    plan.description = `A balanced approach to ${project} combining systematic planning with parallel execution for optimal results.`;

    // Generate phases (mix of sequential and parallel)
    plan.phases = [
      {
        id: "phase-1",
        name: "Strategic Planning",
        duration: "1.5 weeks",
        tasks: [
          { name: "Requirements analysis", duration: "3 days" },
          { name: "Design sprint", duration: "2 days", parallel: true },
          { name: "Technical planning", duration: "2.5 days" },
        ],
        dependencies: [],
      },
      {
        id: "phase-2",
        name: "Core Development",
        duration: "3.5 weeks",
        tasks: [
          { name: "Backend core", duration: "7 days" },
          { name: "Frontend foundation", duration: "5 days", startDelay: 2 },
          { name: "API development", duration: "5 days", parallel: true },
        ],
        dependencies: ["phase-1"],
      },
      {
        id: "phase-3a",
        name: "Feature Development",
        duration: "2 weeks",
        tasks: [
          { name: "Advanced features", duration: "7 days" },
          { name: "Integration points", duration: "3 days" },
        ],
        dependencies: ["phase-2"],
        parallel: true,
      },
      {
        id: "phase-3b",
        name: "Quality Assurance",
        duration: "2 weeks",
        tasks: [
          { name: "Test automation", duration: "4 days" },
          { name: "Manual testing", duration: "3 days", parallel: true },
          { name: "Performance testing", duration: "3 days" },
        ],
        dependencies: ["phase-2"],
        parallel: true,
      },
      {
        id: "phase-4",
        name: "Deployment & Optimization",
        duration: "1 week",
        tasks: [
          { name: "Staging deployment", duration: "2 days" },
          { name: "Performance tuning", duration: "2 days" },
          { name: "Production release", duration: "1 day" },
        ],
        dependencies: ["phase-3a", "phase-3b"],
      },
    ];

    // Calculate timeline (hybrid execution)
    plan.timeline = this.calculateTimeline(plan.phases, "hybrid");

    // Define milestones
    plan.milestones = [
      {
        name: "Planning Complete",
        date: "Week 1.5",
        deliverable: "Project plan",
      },
      { name: "Core Ready", date: "Week 5", deliverable: "Core functionality" },
      { name: "Feature Complete", date: "Week 7", deliverable: "All features" },
      {
        name: "Launch Ready",
        date: "Week 8",
        deliverable: "Production system",
      },
    ];

    // Resource requirements (balanced)
    plan.resources = {
      team: {
        "project-manager": 0.4,
        "backend-developer": 2,
        "frontend-developer": 1.5,
        "full-stack-developer": 1,
        "qa-engineer": 1,
        "devops-engineer": 0.6,
      },
      total: 6.5,
      cost: this.estimateCost(plan) * 0.9, // 10% optimization
    };

    // Risk assessment
    plan.risks = [
      {
        type: "balance",
        probability: "low",
        impact: "low",
        mitigation: "Flexible approach",
      },
      {
        type: "dependencies",
        probability: "medium",
        impact: "medium",
        mitigation: "Clear tracking",
      },
      {
        type: "resources",
        probability: "low",
        impact: "medium",
        mitigation: "Cross-functional team",
      },
    ];

    // Calculate score
    plan.score = this.calculatePlanScore(plan, requirements);

    return plan;
  }

  /**
   * Call Gemini model (MCP removed, SDK used via GeminiIntegrator)
   */
  async callGeminiModel(project, requirements, modelName) {
    console.log(
      "ℹ️ Using Gemini simulation (MCP removed, SDK used via GeminiIntegrator)",
    );
    return this.simulateGeminiPlan(project, requirements, modelName);
  }

  /**
   * Create prompt for gemini-3-deep-thinking
   */
  createDeepThinkingPrompt(project, requirements) {
    return `
      Perform deep analysis and create an optimized plan for: ${project}

      Requirements:
      ${JSON.stringify(requirements, null, 2)}

      Complexity factors identified: ${this.state.complexity.factors.map((f) => f.factor).join(", ")}

      Apply deep reasoning to:
      1. Identify optimal execution strategy
      2. Find parallel execution opportunities
      3. Optimize resource allocation
      4. Minimize timeline while maintaining quality
      5. Identify and mitigate complex risks

      Return a comprehensive plan with innovative optimizations.
    `;
  }

  /**
   * Create prompt for gemini-3-pro
   */
  createProPrompt(project, requirements) {
    return `
      Create an efficient plan for: ${project}

      Requirements:
      ${JSON.stringify(requirements, null, 2)}

      Focus on:
      1. Fast execution
      2. Resource efficiency
      3. Parallel tasks
      4. Quick wins

      Return an optimized plan.
    `;
  }

  /**
   * Simulate Gemini plan when MCP not available
   */
  simulateGeminiPlan(project, requirements, modelName) {
    const isDeepThinking = modelName === "gemini-3-deep-thinking";

    return {
      description: isDeepThinking
        ? `Deep analysis and optimization for ${project} with advanced reasoning`
        : `Efficient and fast execution plan for ${project}`,
      optimizations: isDeepThinking
        ? ["Advanced parallelization", "Resource pooling", "Dynamic scaling"]
        : ["Quick iterations", "Rapid prototyping", "Agile execution"],
      insights: isDeepThinking
        ? [
            "Complex dependency analysis reveals optimization opportunities",
            "Resource allocation can be improved by 30%",
            "Risk mitigation through redundancy",
          ]
        : [
            "Fast execution through parallel tasks",
            "MVP approach for quick validation",
          ],
    };
  }

  /**
   * Calculate timeline based on execution strategy
   */
  calculateTimeline(phases, strategy) {
    let totalWeeks = 0;
    const timeline = {
      strategy,
      phases: [],
      criticalPath: [],
      totalDuration: 0,
    };

    if (strategy === "sequential") {
      // Sequential: phases run one after another
      phases.forEach((phase) => {
        const duration = this.parseDuration(phase.duration);
        timeline.phases.push({
          id: phase.id,
          start: totalWeeks,
          end: totalWeeks + duration,
        });
        totalWeeks += duration;
        timeline.criticalPath.push(phase.id);
      });
    } else if (strategy === "parallel") {
      // Parallel: phases can run simultaneously
      const phaseMap = new Map();

      phases.forEach((phase) => {
        const duration = this.parseDuration(phase.duration);
        const deps = phase.dependencies || [];

        let startWeek = 0;
        deps.forEach((dep) => {
          const depPhase = phaseMap.get(dep);
          if (depPhase) {
            startWeek = Math.max(startWeek, depPhase.end);
          }
        });

        const phaseInfo = {
          id: phase.id,
          start: startWeek,
          end: startWeek + duration,
          parallel: phase.parallel,
        };

        phaseMap.set(phase.id, phaseInfo);
        timeline.phases.push(phaseInfo);
        totalWeeks = Math.max(totalWeeks, phaseInfo.end);
      });

      // Find critical path
      timeline.criticalPath = this.findCriticalPath(phases);
    } else {
      // Hybrid: mix of sequential and parallel
      const phaseMap = new Map();

      phases.forEach((phase) => {
        const duration = this.parseDuration(phase.duration);
        const deps = phase.dependencies || [];

        let startWeek = 0;
        if (deps.length > 0) {
          deps.forEach((dep) => {
            const depPhase = phaseMap.get(dep);
            if (depPhase) {
              startWeek = Math.max(startWeek, depPhase.end);
            }
          });
        } else if (!phase.parallel) {
          // Non-parallel phases without deps start after previous
          const prevPhases = Array.from(phaseMap.values());
          if (prevPhases.length > 0) {
            startWeek = Math.max(...prevPhases.map((p) => p.end));
          }
        }

        const phaseInfo = {
          id: phase.id,
          start: startWeek,
          end: startWeek + duration,
          parallel: phase.parallel,
        };

        phaseMap.set(phase.id, phaseInfo);
        timeline.phases.push(phaseInfo);
        totalWeeks = Math.max(totalWeeks, phaseInfo.end);
      });

      timeline.criticalPath = this.findCriticalPath(phases);
    }

    timeline.totalDuration = totalWeeks;
    return timeline;
  }

  /**
   * Parse duration string to weeks
   */
  parseDuration(duration) {
    // Handle if duration is already a number (weeks)
    if (typeof duration === "number") {
      return duration;
    }

    // Convert to string if needed
    const durationStr = String(duration);

    const match = durationStr.match(/(\d+(?:\.\d+)?)\s*(week|day)/i);
    if (!match) return 1;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === "day" || unit === "days") {
      return value / 5; // 5 working days per week
    }

    return value;
  }

  /**
   * Find critical path in project
   */
  findCriticalPath(phases) {
    // Simple critical path: longest sequence of dependencies
    const path = [];
    const visited = new Set();

    // Find phases with no dependencies (start nodes)
    const startPhases = phases.filter(
      (p) => !p.dependencies || p.dependencies.length === 0,
    );

    startPhases.forEach((start) => {
      const currentPath = this.traversePath(start, phases, visited);
      if (currentPath.length > path.length) {
        path.splice(0, path.length, ...currentPath);
      }
    });

    return path;
  }

  /**
   * Traverse dependency path
   */
  traversePath(phase, allPhases, visited) {
    if (visited.has(phase.id)) return [];

    visited.add(phase.id);
    const path = [phase.id];

    // Find phases that depend on this one
    const dependents = allPhases.filter(
      (p) => p.dependencies && p.dependencies.includes(phase.id),
    );

    let longestSubPath = [];
    dependents.forEach((dep) => {
      const subPath = this.traversePath(dep, allPhases, visited);
      if (subPath.length > longestSubPath.length) {
        longestSubPath = subPath;
      }
    });

    return path.concat(longestSubPath);
  }

  /**
   * Estimate cost for a plan
   */
  estimateCost(plan) {
    const hourlyRates = {
      "project-manager": 100,
      "backend-developer": 85,
      "frontend-developer": 80,
      "full-stack-developer": 90,
      "qa-engineer": 70,
      "qa-automation-engineer": 75,
      "devops-engineer": 95,
    };

    let totalCost = 0;
    const weeks = this.parseDuration(plan.timeline.totalDuration || "8 weeks");

    Object.entries(plan.resources.team || {}).forEach(([role, fte]) => {
      const rate = hourlyRates[role] || 80;
      const hoursPerWeek = 40;
      totalCost += rate * hoursPerWeek * weeks * fte;
    });

    return Math.round(totalCost);
  }

  /**
   * Calculate plan score
   */
  calculatePlanScore(plan, requirements) {
    let score = 50; // Base score

    // Speed bonus
    const duration = plan.timeline.totalDuration || 8;
    if (duration < 6) score += 15;
    else if (duration < 8) score += 10;
    else if (duration > 10) score -= 10;

    // Cost efficiency
    const cost = plan.resources.cost || 100000;
    if (cost < 80000) score += 10;
    else if (cost < 100000) score += 5;
    else if (cost > 120000) score -= 5;

    // Risk factor
    const highRisks = plan.risks.filter((r) => r.impact === "high").length;
    score -= highRisks * 5;

    // Model-specific bonuses
    if (plan.model === "claude") score += 10; // Reliability bonus
    if (plan.model === "gemini") score += 8; // Speed bonus
    if (plan.model === "hybrid") score += 12; // Balance bonus

    // Requirements alignment
    if (requirements && requirements.priority) {
      if (requirements.priority === "speed" && plan.model === "gemini")
        score += 10;
      if (requirements.priority === "quality" && plan.model === "claude")
        score += 10;
      if (requirements.priority === "balanced" && plan.model === "hybrid")
        score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Optimize plans based on requirements
   */
  async optimizePlans(plans, requirements) {
    console.log("🔧 Optimizing plans...");

    const optimized = [];

    for (const plan of plans) {
      const optimizedPlan = { ...plan };

      // Optimize based on priority
      if (requirements.priority === "speed") {
        optimizedPlan.timeline.totalDuration *= 0.9;
        optimizedPlan.resources.cost *= 1.1;
      } else if (requirements.priority === "cost") {
        optimizedPlan.resources.cost *= 0.85;
        optimizedPlan.timeline.totalDuration *= 1.1;
      } else if (requirements.priority === "quality") {
        optimizedPlan.timeline.totalDuration *= 1.1;
        optimizedPlan.resources.team["qa-engineer"] =
          (optimizedPlan.resources.team["qa-engineer"] || 1) * 1.5;
      }

      // Add optimization notes
      optimizedPlan.optimizations = [
        `Optimized for ${requirements.priority || "balance"}`,
        `Adjusted timeline by ${Math.round((optimizedPlan.timeline.totalDuration / plan.timeline.totalDuration - 1) * 100)}%`,
        `Cost impact: ${Math.round((optimizedPlan.resources.cost / plan.resources.cost - 1) * 100)}%`,
      ];

      optimized.push(optimizedPlan);
    }

    return optimized;
  }

  /**
   * Assess risks for all plans
   */
  async assessRisks(plans) {
    const assessment = {
      summary: {},
      comparison: [],
      recommendations: [],
    };

    plans.forEach((plan) => {
      const riskScore = plan.risks.reduce((total, risk) => {
        const probability =
          { low: 1, medium: 2, high: 3 }[risk.probability] || 1;
        const impact = { low: 1, medium: 2, high: 3 }[risk.impact] || 1;
        return total + probability * impact;
      }, 0);

      assessment.summary[plan.id] = {
        totalRisks: plan.risks.length,
        riskScore,
        highRisks: plan.risks.filter((r) => r.impact === "high").length,
        mitigation: plan.risks.every((r) => r.mitigation),
      };
    });

    // Compare risks
    assessment.comparison = Object.entries(assessment.summary)
      .sort((a, b) => a[1].riskScore - b[1].riskScore)
      .map(([id, summary]) => ({
        planId: id,
        riskLevel:
          summary.riskScore < 10
            ? "low"
            : summary.riskScore < 20
              ? "medium"
              : "high",
        ...summary,
      }));

    // Recommendations
    assessment.recommendations = [
      "Consider hybrid approach for balanced risk profile",
      "Ensure all high-impact risks have mitigation strategies",
      "Regular risk review meetings recommended",
    ];

    return assessment;
  }

  /**
   * Allocate resources across plans
   */
  async allocateResources(plans) {
    const allocation = {
      teamComparison: {},
      costComparison: {},
      efficiency: {},
      recommendations: [],
    };

    plans.forEach((plan) => {
      allocation.teamComparison[plan.id] = {
        totalFTE: plan.resources.total,
        team: plan.resources.team,
        cost: plan.resources.cost,
      };

      allocation.efficiency[plan.id] = {
        costPerWeek: plan.resources.cost / plan.timeline.totalDuration,
        fteUtilization: (plan.resources.total / 10) * 100, // Assume 10 FTE available
        parallelization:
          plan.phases.filter((p) => p.parallel).length / plan.phases.length,
      };
    });

    // Cost comparison
    const costs = plans.map((p) => p.resources.cost);
    allocation.costComparison = {
      minimum: Math.min(...costs),
      maximum: Math.max(...costs),
      average: costs.reduce((a, b) => a + b, 0) / costs.length,
      variance: Math.max(...costs) - Math.min(...costs),
    };

    // Recommendations
    allocation.recommendations = [
      "Gemini plan offers best cost efficiency",
      "Claude plan provides most predictable resource allocation",
      "Hybrid plan balances resource utilization",
    ];

    return allocation;
  }

  /**
   * Evaluate plans and create comparison matrix
   */
  async evaluatePlans(plans) {
    const criteria = [
      { name: "Speed", weight: 0.25 },
      { name: "Cost", weight: 0.2 },
      { name: "Quality", weight: 0.2 },
      { name: "Risk", weight: 0.15 },
      { name: "Flexibility", weight: 0.1 },
      { name: "Resource Efficiency", weight: 0.1 },
    ];

    const evaluation = {
      criteria,
      scores: {},
      ranking: [],
    };

    // Score each plan
    plans.forEach((plan) => {
      evaluation.scores[plan.id] = {};

      criteria.forEach((criterion) => {
        const score = this.evaluateCriterion(plan, criterion.name);
        evaluation.scores[plan.id][criterion.name] = {
          raw: score,
          weighted: score * criterion.weight,
        };
      });

      // Calculate total
      evaluation.scores[plan.id].total = Object.values(
        evaluation.scores[plan.id],
      )
        .filter((s) => typeof s === "object")
        .reduce((sum, s) => sum + s.weighted, 0);
    });

    // Create ranking
    evaluation.ranking = Object.entries(evaluation.scores)
      .map(([id, scores]) => ({
        planId: id,
        totalScore: scores.total,
        strengths: this.identifyStrengths(id, scores),
        weaknesses: this.identifyWeaknesses(id, scores),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    return evaluation;
  }

  /**
   * Evaluate a single criterion
   */
  evaluateCriterion(plan, criterion) {
    const scores = {
      Speed: {
        "plan-claude": 6,
        "plan-gemini": 9,
        "plan-hybrid": 7,
      },
      Cost: {
        "plan-claude": 6,
        "plan-gemini": 8,
        "plan-hybrid": 7,
      },
      Quality: {
        "plan-claude": 9,
        "plan-gemini": 7,
        "plan-hybrid": 8,
      },
      Risk: {
        "plan-claude": 8,
        "plan-gemini": 6,
        "plan-hybrid": 7,
      },
      Flexibility: {
        "plan-claude": 5,
        "plan-gemini": 8,
        "plan-hybrid": 9,
      },
      "Resource Efficiency": {
        "plan-claude": 6,
        "plan-gemini": 9,
        "plan-hybrid": 8,
      },
    };

    return scores[criterion]?.[plan.id] || 5;
  }

  /**
   * Identify plan strengths
   */
  identifyStrengths(planId, scores) {
    const strengths = [];
    Object.entries(scores).forEach(([criterion, score]) => {
      if (typeof score === "object" && score.raw >= 8) {
        strengths.push(criterion);
      }
    });
    return strengths;
  }

  /**
   * Identify plan weaknesses
   */
  identifyWeaknesses(planId, scores) {
    const weaknesses = [];
    Object.entries(scores).forEach(([criterion, score]) => {
      if (typeof score === "object" && score.raw <= 6) {
        weaknesses.push(criterion);
      }
    });
    return weaknesses;
  }

  /**
   * Generate recommendation based on evaluation
   */
  generateRecommendation(evaluation) {
    const topPlan = evaluation.ranking[0];

    const recommendations = {
      "plan-claude":
        "Recommended for projects requiring high quality and predictability",
      "plan-gemini":
        "Recommended for time-critical projects with experienced teams",
      "plan-hybrid":
        "Recommended for balanced projects needing both speed and quality",
    };

    return {
      recommended: topPlan.planId,
      score: topPlan.totalScore,
      rationale:
        recommendations[topPlan.planId] || "Based on evaluation criteria",
      strengths: topPlan.strengths,
      considerations: `Consider ${topPlan.planId} for optimal results based on your priorities`,
    };
  }

  /**
   * Save results to memory bank
   */
  async saveToMemoryBank(result) {
    const memoryPath = path.join(
      process.cwd(),
      ".claude",
      "memory-bank",
      "plans",
      `${Date.now()}-${result.project.replace(/\s+/g, "-")}.json`,
    );

    await fs.mkdir(path.dirname(memoryPath), { recursive: true });
    await fs.writeFile(memoryPath, JSON.stringify(result, null, 2));

    console.log(`💾 Saved to memory bank: ${path.basename(memoryPath)}`);
  }

  /**
   * Update metrics
   */
  updateMetrics(result) {
    this.metrics.totalPlans++;
    this.metrics.executionTime.push(result.executionTime);

    // Update complexity average
    const prevTotal =
      this.metrics.averageComplexity * (this.metrics.totalPlans - 1);
    this.metrics.averageComplexity =
      (prevTotal + result.complexity.score) / this.metrics.totalPlans;

    // Update model usage
    if (result.complexity.selectedModel) {
      this.metrics.modelUsage[result.complexity.selectedModel]++;
    }

    // Track selected plan (would be actual selection in production)
    if (result.recommendation.recommended) {
      const planModel = result.recommendation.recommended.replace("plan-", "");
      this.metrics.planDistribution[planModel]++;
    }
  }

  /**
   * Generate planning report
   */
  generateReport() {
    return {
      totalPlans: this.metrics.totalPlans,
      planDistribution: this.metrics.planDistribution,
      averageComplexity: this.metrics.averageComplexity.toFixed(1),
      modelUsage: this.metrics.modelUsage,
      averageExecutionTime:
        this.metrics.executionTime.length > 0
          ? this.metrics.executionTime.reduce((a, b) => a + b, 0) /
            this.metrics.executionTime.length
          : 0,
      currentState: {
        project: this.state.currentProject,
        complexity: this.state.complexity?.score,
        selectedModel: this.state.selectedModel,
      },
    };
  }

  // ========================================
  // PLAN V2.5 METHODS (Week 1 Integration)
  // ========================================

  /**
   * Generate detailed implementation steps from high-level phases
   * Uses Expert Router for context enrichment
   *
   * @param {object} plan - Plan with phases
   * @param {object} requirements - Requirements object
   * @param {Array<string>} personas - Week 12: Persona names (optional)
   * @returns {object} - Plan with detailed steps array
   */
  async generateDetailedSteps(plan, requirements, personas = []) {
    console.log(`[Plan v2.5] Generating detailed steps for ${plan.id}...`);
    if (personas.length > 0) {
      console.log(`[Plan v2.5] Applying personas: ${personas.join(", ")}`);
    }

    const detailedSteps = [];

    // Extract all tasks from all phases
    const allTasks = [];
    plan.phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        allTasks.push({
          description: task.name,
          phase: phase.name,
          duration: task.duration,
          category: this.detectCategory(task.name, requirements),
          complexity: this.detectComplexity(task.name, requirements),
        });
      });
    });

    // Consult Expert Router for each task (Week 12: with personas)
    for (const task of allTasks) {
      try {
        const expertResult = await this.expertRouter.consultExpert(
          task.description,
          task.category,
          task.complexity,
          personas, // Week 12: Pass personas to Expert Router
        );

        // Create enriched step
        const step = {
          description: task.description,
          phase: task.phase,
          duration: task.duration,
          category: task.category,
          complexity: task.complexity,
          context: {
            source: expertResult.source,
            recommendation: expertResult.recommendation,
            do: expertResult.do || [],
            dont: expertResult.dont || [],
            confidence: expertResult.confidence,
            tokens: expertResult.tokens,
          },
        };

        detailedSteps.push(step);

        // Update metrics
        this.week0Metrics.total_consultations++;
        this.week0Metrics.total_tokens += expertResult.tokens;

        if (expertResult.source === "KB") {
          this.week0Metrics.kb_hits++;
        } else if (expertResult.source.includes("Agent")) {
          this.week0Metrics.agent_hits++;
        } else if (expertResult.source === "MCP") {
          this.week0Metrics.mcp_hits++;
        }

        console.log(
          `  ✅ Step enriched: ${task.description.substring(0, 50)}... (${expertResult.source}, ${expertResult.tokens} tokens)`,
        );
      } catch (error) {
        console.error(
          `  ❌ Expert consultation failed for "${task.description}": ${error.message}`,
        );

        // Fallback: step without context
        detailedSteps.push({
          description: task.description,
          phase: task.phase,
          duration: task.duration,
          category: task.category,
          complexity: task.complexity,
          context: null,
        });
      }
    }

    // Add detailed steps to plan
    plan.detailedSteps = detailedSteps;

    // Calculate token summary
    plan.tokenSummary = {
      total: this.week0Metrics.total_tokens,
      average_per_step: Math.round(
        this.week0Metrics.total_tokens / detailedSteps.length,
      ),
      kb_hits: this.week0Metrics.kb_hits,
      agent_hits: this.week0Metrics.agent_hits,
      mcp_hits: this.week0Metrics.mcp_hits,
    };

    console.log(
      `[Plan v2.5] Generated ${detailedSteps.length} detailed steps (${plan.tokenSummary.total} tokens)`,
    );

    return plan;
  }

  /**
   * Detect category from task name
   */
  detectCategory(taskName, requirements) {
    const taskLower = taskName.toLowerCase();

    if (
      taskLower.includes("backend") ||
      taskLower.includes("api") ||
      taskLower.includes("service")
    ) {
      return "backend";
    }
    if (
      taskLower.includes("frontend") ||
      taskLower.includes("ui") ||
      taskLower.includes("component")
    ) {
      return "frontend";
    }
    if (
      taskLower.includes("database") ||
      taskLower.includes("schema") ||
      taskLower.includes("table")
    ) {
      return "database";
    }

    // Default: infer from requirements
    if (requirements.category) {
      return requirements.category;
    }

    return "backend"; // Default fallback
  }

  /**
   * Detect complexity from task name and requirements
   */
  detectComplexity(taskName, requirements) {
    const taskLower = taskName.toLowerCase();

    // High complexity keywords
    const highKeywords = [
      "distributed",
      "authentication",
      "security",
      "optimization",
      "algorithm",
    ];
    if (highKeywords.some((kw) => taskLower.includes(kw))) {
      return "high";
    }

    // Low complexity keywords
    const lowKeywords = ["create", "add", "simple", "basic", "setup"];
    if (lowKeywords.some((kw) => taskLower.includes(kw))) {
      return "low";
    }

    // Default: medium
    return "medium";
  }

  /**
   * Validate plan using Agent-05 (Validation Checklist)
   *
   * @param {object} plan - Plan to validate
   * @returns {object} - Validation results
   */
  async validatePlan(plan) {
    console.log(`[Plan v2.5] Validating plan ${plan.id}...`);

    try {
      const validationResults = {
        passed: true,
        validations: {
          language: { passed: true },
          evidence: { passed: true },
          architecture: { passed: true },
          consistency: { passed: true },
        },
        errors: [],
        warnings: [],
        score: 100,
      };

      // Validation 1: Check for steps
      if (!plan.detailedSteps || plan.detailedSteps.length === 0) {
        validationResults.passed = false;
        validationResults.errors.push("Plan has no detailed steps");
        validationResults.score -= 50;
      }

      // Validation 2: Check step context
      const stepsWithoutContext = plan.detailedSteps.filter(
        (s) => !s.context || !s.context.recommendation,
      );
      if (stepsWithoutContext.length > 0) {
        const ratio =
          (stepsWithoutContext.length / plan.detailedSteps.length) * 100;
        if (ratio > 20) {
          // More than 20% missing context
          validationResults.passed = false;
          validationResults.errors.push(
            `${stepsWithoutContext.length} steps (${Math.round(ratio)}%) missing context`,
          );
          validationResults.score -= 25;
        } else {
          validationResults.warnings.push(
            `${stepsWithoutContext.length} steps missing context`,
          );
          validationResults.score -= 10;
        }
      }

      // Validation 3: Check consistency (no duplicate descriptions)
      const descriptions = new Set();
      const duplicates = [];
      plan.detailedSteps.forEach((step) => {
        if (descriptions.has(step.description)) {
          duplicates.push(step.description);
        }
        descriptions.add(step.description);
      });

      if (duplicates.length > 0) {
        validationResults.warnings.push(
          `${duplicates.length} duplicate step descriptions`,
        );
        validationResults.score -= 5;
      }

      // Validation 4: Reasonable step count
      if (plan.detailedSteps.length < 3) {
        validationResults.passed = false;
        validationResults.errors.push("Plan has too few steps (<3)");
        validationResults.score -= 25;
      }

      if (plan.detailedSteps.length > 50) {
        validationResults.warnings.push(
          "Plan has many steps (>50), consider breaking into sub-plans",
        );
        validationResults.score -= 5;
      }

      validationResults.validations.consistency.passed =
        validationResults.errors.length === 0;

      console.log(
        `[Plan v2.5] Validation ${validationResults.passed ? "PASSED" : "FAILED"} (score: ${validationResults.score}%)`,
      );

      return validationResults;
    } catch (error) {
      console.error(`[Plan v2.5] Validation failed: ${error.message}`);

      return {
        passed: false,
        validations: {},
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        score: 0,
      };
    }
  }

  /**
   * Calculate 7-factor confidence for plan using Confidence Engine V2 (Week 2 Day 3)
   * Upgraded from 5-factor V1 to 7-factor V2
   *
   * @param {object} plan - Plan to evaluate
   * @param {Array<string>} personas - Week 12: Persona names (optional, was contextArray in V1)
   * @returns {object} - Confidence result with 7 factors
   */
  async calculateConfidence(plan, personas = []) {
    console.log(
      `[Plan v2.5] Calculating confidence for ${plan.id} using Confidence Engine V2...`,
    );

    // Week 12: Get persona confidence modifiers
    let personaModifier = 0;
    if (personas.length > 0) {
      const PersonaManager = require('../mcp/persona-manager.js');
      const pm = new PersonaManager();
      const modifiers = pm.getConfidenceModifiers(personas);
      personaModifier = modifiers.plan;
      console.log(
        `[Plan v2.5] Persona modifier: +${personaModifier}% (personas: ${personas.join(", ")})`,
      );
    }

    try {
      // Build evidence array from step contexts
      const evidence = [];
      for (const step of plan.detailedSteps || []) {
        if (step.context && step.context.source) {
          evidence.push({
            source:
              step.context.source === "MCP"
                ? "official-mcp-docs"
                : step.context.source === "Agent"
                  ? "github-best-practices"
                  : "local-kb",
            quality:
              step.context.confidence >= 85
                ? "high"
                : step.context.confidence >= 70
                  ? "medium"
                  : "low",
            relevance: step.context.recommendation ? "high" : "medium",
            references: step.requirements || [],
          });
        }
      }

      // Prepare context for Confidence Engine V2
      const context = {
        plan: plan,
        evidence: evidence,
        requirements: plan.requirements || [],
        // Note: design, historyManager, knowledgeBase are optional in V2
      };

      // Use Confidence Engine V2 for 7-factor calculation
      const confidenceResult = await this.confidenceEngine.calculate(context);

      // Week 12: Adjust threshold based on personas
      const adjustedThreshold = confidenceResult.threshold + personaModifier;
      const adjustedPassed = confidenceResult.overall >= adjustedThreshold;

      if (personaModifier > 0) {
        console.log(
          `[Plan v2.5] Threshold adjusted: ${confidenceResult.threshold}% → ${adjustedThreshold}% (persona +${personaModifier}%)`,
        );
        console.log(
          `[Plan v2.5] Pass status: ${adjustedPassed ? "PASS" : "FAIL"} (was: ${confidenceResult.passed ? "PASS" : "FAIL"})`,
        );
      }

      // Log V2 results with enhanced breakdown
      console.log(
        `[Plan v2.5] V2 Confidence: ${confidenceResult.overall}% (${confidenceResult.passed ? "PASS" : "FAIL"})`,
      );
      console.log(`[Plan v2.5] V2 Risk: ${confidenceResult.risk}`);
      console.log(`[Plan v2.5] V2 Factors:`);
      console.log(`  - Evidence: ${confidenceResult.factors.evidence}%`);
      console.log(`  - Consistency: ${confidenceResult.factors.consistency}%`);
      console.log(`  - Complexity: ${confidenceResult.factors.complexity}%`);
      console.log(
        `  - Expert Confidence: ${confidenceResult.factors.expert_confidence}%`,
      );
      console.log(
        `  - Context Depth: ${confidenceResult.factors.context_depth}%`,
      );
      console.log(
        `  - Pattern Match: ${confidenceResult.factors.pattern_match}%`,
      );
      console.log(
        `  - Historical Data: ${confidenceResult.factors.historical_data}%`,
      );

      if (confidenceResult.recommendations.length > 0) {
        console.log(
          `[Plan v2.5] V2 Recommendations (${confidenceResult.recommendations.length}):`,
        );
        confidenceResult.recommendations.forEach((rec, idx) => {
          console.log(
            `  ${idx + 1}. [${rec.priority}] ${rec.title}: ${rec.action} (Impact: ${rec.impact})`,
          );
        });
      }

      // Maintain backward compatibility: Map V2 result to V1 format (Week 12: with persona adjustments)
      return {
        confidence: confidenceResult.overall,
        passed: personaModifier > 0 ? adjustedPassed : confidenceResult.passed, // Week 12: Use adjusted pass status
        threshold:
          personaModifier > 0 ? adjustedThreshold : confidenceResult.threshold, // Week 12: Use adjusted threshold
        baseThreshold: confidenceResult.threshold, // Week 12: Keep original threshold for reference
        personaModifier: personaModifier, // Week 12: Track persona modifier
        personas: personas, // Week 12: Track which personas were used
        risk: confidenceResult.risk,
        breakdown: {
          // V1 format (for backward compatibility)
          base_score:
            Math.round(
              ((confidenceResult.factors.evidence +
                confidenceResult.factors.consistency +
                confidenceResult.factors.complexity) /
                3) *
                100,
            ) / 100,
          expert_confidence: confidenceResult.factors.expert_confidence,
          pattern_match: confidenceResult.factors.pattern_match,
          // V2 additions
          context_depth: confidenceResult.factors.context_depth,
          historical_data: confidenceResult.factors.historical_data,
        },
        factors: confidenceResult.factors,
        weights: confidenceResult.weights,
        contributions: confidenceResult.contributions,
        recommendations: confidenceResult.recommendations,
        timestamp: confidenceResult.timestamp,
        version: "2.0", // Mark as V2 calculation
      };
    } catch (error) {
      console.error(
        `[Plan v2.5] Confidence V2 calculation failed: ${error.message}`,
      );
      console.error(error.stack);

      return {
        confidence: 0,
        passed: false,
        threshold: 90,
        risk: "CRITICAL",
        breakdown: {},
        factors: {},
        recommendations: [
          {
            priority: "HIGH",
            title: "Calculation Error",
            action: error.message,
            impact: "N/A",
          },
        ],
        version: "2.0",
        error: true,
      };
    }
  }

  /**
   * Analyze plan for parallelization opportunities
   * Week 3: Safe Parallelization
   */
  analyzeParallelization(plan) {
    if (!plan.detailedSteps || plan.detailedSteps.length === 0) {
      return {
        canParallelize: false,
        reason: "No detailed steps found",
        metrics: {},
      };
    }

    // For now, use simple mock analysis
    // Will be enhanced once steps have reads/writes metadata
    const stepCount = plan.detailedSteps.length;

    if (stepCount < 4) {
      return {
        canParallelize: false,
        reason: "Too few steps (minimum 4 required for parallelization)",
        stepCount: stepCount,
        metrics: {},
      };
    }

    // Mock parallelization potential (will be accurate once reads/writes added)
    return {
      canParallelize: true,
      stepCount: stepCount,
      estimatedLevels: Math.ceil(stepCount / 2), // Mock estimate
      parallelizationRate: "40-60%", // Mock range
      metrics: {
        sequential_time: stepCount * 5, // 5 min per step
        parallel_time: Math.ceil(stepCount / 2) * 5, // Mock parallel time
        time_saved: (stepCount - Math.ceil(stepCount / 2)) * 5,
        speedup: (stepCount / Math.ceil(stepCount / 2)).toFixed(2) + "x",
      },
    };
  }

  /**
   * Execute plan with optional parallelization
   * Week 3: Parallel Execution Engine
   */
  async executePlan(plan, options = {}) {
    const useParallel = options.parallel !== false; // Default: true

    console.log(
      `\n🚀 Starting plan execution (${useParallel ? "parallel" : "sequential"} mode)...`,
    );

    // Check if parallelization is viable
    const analysis = this.analyzeParallelization(plan);

    if (useParallel && analysis.canParallelize) {
      console.log(`✅ Parallel execution enabled:`);
      console.log(`   - Steps: ${analysis.stepCount}`);
      console.log(`   - Estimated levels: ${analysis.estimatedLevels}`);
      console.log(`   - Estimated speedup: ${analysis.metrics.speedup}`);

      try {
        // Use parallel executor
        const executor = new ParallelExecutor(plan, {
          maxConcurrency: options.maxConcurrency || 4,
          validateBeforeExecution: true,
          fallbackToSequential: true,
          onProgress: (progress) => {
            if (options.verbose) {
              console.log(
                `   Progress: ${progress.percentage}% (${progress.completed}/${progress.total})`,
              );
            }
          },
        });

        const result = await executor.execute();

        console.log(`\n✅ Execution complete (${result.execution_time_s}s)`);
        console.log(`   - Mode: ${result.mode || "parallel"}`);
        console.log(
          `   - Completed: ${result.completed}/${result.total_steps}`,
        );
        console.log(`   - Failed: ${result.failed}`);

        if (result.parallelization_metrics) {
          console.log(
            `   - Levels: ${result.parallelization_metrics.total_levels}`,
          );
          console.log(
            `   - Speedup: ${result.parallelization_metrics.speedup}x`,
          );
          console.log(
            `   - Parallelization: ${result.parallelization_metrics.parallelization_rate}%`,
          );
        }

        return result;
      } catch (error) {
        console.error(`❌ Parallel execution failed: ${error.message}`);
        console.log(`⚠️  Falling back to sequential execution...`);
        // Fall through to sequential execution
      }
    } else {
      if (!analysis.canParallelize) {
        console.log(`ℹ️  Sequential execution selected: ${analysis.reason}`);
      }
    }

    // Sequential execution (fallback or default)
    return await this.executeSequential(plan, options);
  }

  /**
   * Execute plan sequentially (traditional mode)
   */
  async executeSequential(plan, options = {}) {
    console.log(`\n📋 Sequential execution starting...`);

    const startTime = Date.now();
    const results = [];

    if (!plan.detailedSteps || plan.detailedSteps.length === 0) {
      return {
        success: false,
        mode: "sequential",
        error: "No detailed steps to execute",
        completed: 0,
        failed: 0,
        results: [],
      };
    }

    for (let i = 0; i < plan.detailedSteps.length; i++) {
      const step = plan.detailedSteps[i];

      if (options.verbose) {
        console.log(
          `   [${i + 1}/${plan.detailedSteps.length}] ${step.description}`,
        );
      }

      try {
        // Mock execution (in real implementation, this would execute actual step)
        await this.executeStep(step);

        results.push({
          stepId: `step-${i + 1}`,
          description: step.description,
          success: true,
          duration: step.duration || "5 min",
        });
      } catch (error) {
        results.push({
          stepId: `step-${i + 1}`,
          description: step.description,
          success: false,
          error: error.message,
        });

        // Stop on first error in sequential mode
        break;
      }
    }

    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;

    const completed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `\n✅ Sequential execution complete (${executionTime.toFixed(2)}s)`,
    );
    console.log(`   - Completed: ${completed}/${plan.detailedSteps.length}`);
    console.log(`   - Failed: ${failed}`);

    return {
      success: failed === 0,
      mode: "sequential",
      total_steps: plan.detailedSteps.length,
      completed: completed,
      failed: failed,
      execution_time_ms: endTime - startTime,
      execution_time_s: executionTime.toFixed(2),
      results: results,
    };
  }

  /**
   * Execute single step (mock implementation)
   * In real implementation, this would call actual step execution logic
   */
  async executeStep(step) {
    // Mock execution delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Mock success (in real implementation, would execute actual step logic)
    return {
      success: true,
      output: `Executed: ${step.description}`,
    };
  }
}

// Export
module.exports = EnhancedPlanSystem;
