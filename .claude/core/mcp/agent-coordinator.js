const fs = require('fs');
const path = require('path');
const ExpertRouter = require('./mcp-expert-router.js');
const PersonaManager = require('./persona-manager.js');

/**
 * AgentCoordinator - Autonomous Multi-Agent Coordination System
 *
 * Purpose: Automatically select and coordinate multiple agents for complex tasks
 *
 * Features:
 * - Task complexity analysis (LOW/MEDIUM/HIGH)
 * - Automatic agent selection (1-6 agents based on complexity)
 * - Multi-agent parallel consultation
 * - Conflict detection and resolution
 * - Quality-based synthesis
 * - Persona integration for priority boosting
 *
 * Version: 1.0.0
 * Week: 13 Day 2
 * Date: 2025-12-27
 */
class AgentCoordinator {
    constructor(options = {}) {
        // Integrate with existing systems
        this.expertRouter = new ExpertRouter();
        this.personaManager = new PersonaManager();
        this.sessionMemory = null; // Will be added in Day 4

        // Configuration with defaults
        this.config = {
            // Complexity thresholds
            lowComplexityMax: 40,          // 0-40 = LOW
            mediumComplexityMax: 70,       // 41-70 = MEDIUM
            // 71-100 = HIGH

            // Agent count by complexity
            lowAgentCount: 1,              // LOW → single agent
            mediumAgentCount: 3,           // MEDIUM → 2-3 agents
            highAgentCount: 5,             // HIGH → 4-6 agents

            // Selection criteria
            minRelevanceScore: 30,         // Minimum 30% keyword match
            diversityThreshold: 0.5,       // Avoid 50%+ similar agents

            // Execution settings
            parallelTimeout: 60000,        // 60s max per agent
            fallbackToSingle: true,        // Fallback if all fail

            // Synthesis settings
            consensusThreshold: 1.0,       // 100% agreement
            majorityThreshold: 0.67,       // 67% agreement

            ...options
        };

        // Statistics tracking
        this.stats = {
            total_coordinations: 0,
            single_agent_decisions: 0,
            multi_agent_decisions: 0,
            consensus_rate: 0.0,
            conflict_rate: 0.0,
            avg_agents_per_task: 0.0,
            avg_confidence: 0.0,
            avg_quality: 0.0,
            avg_tokens: 0,
            complexity_distribution: { low: 0, medium: 0, high: 0 },
            agent_combinations: {},
            persona_combinations: {}
        };

        console.log('[AgentCoordinator] Initialized with ExpertRouter and PersonaManager');
        console.log('[AgentCoordinator] Configuration:', JSON.stringify(this.config, null, 2));
    }

    /**
     * Main coordination entry point
     *
     * @param {string} stepDescription - Task description
     * @param {string} category - backend/frontend/database/security/testing/performance/quality/devops
     * @param {string|null} complexity - Explicit complexity (or null for auto-detection)
     * @param {Array<string>} personas - Persona names (e.g., ['security', 'testing'])
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Coordination result
     */
    async coordinate(stepDescription, category, complexity = null, personas = [], options = {}) {
        this.stats.total_coordinations++;

        console.log(`\n[AgentCoordinator] ═══════════════════════════════════════════════`);
        console.log(`[AgentCoordinator] Coordination Request #${this.stats.total_coordinations}`);
        console.log(`[AgentCoordinator] Description: ${stepDescription}`);
        console.log(`[AgentCoordinator] Category: ${category}`);
        console.log(`[AgentCoordinator] Personas: ${personas.length > 0 ? personas.join(', ') : 'none'}`);

        // Step 1: Analyze task complexity (if not provided)
        const complexityResult = complexity ?
            { level: complexity, score: this._complexityToScore(complexity), auto: false } :
            this.analyzeTaskComplexity(stepDescription, personas);

        console.log(`[AgentCoordinator] Complexity: ${complexityResult.level.toUpperCase()} (score: ${complexityResult.score}, auto: ${complexityResult.auto})`);
        if (complexityResult.breakdown) {
            console.log(`[AgentCoordinator] Breakdown: ${JSON.stringify(complexityResult.breakdown)}`);
        }

        // Step 2: Decide coordination strategy
        const strategy = this._decideStrategy(complexityResult.level, personas, options);

        console.log(`[AgentCoordinator] Strategy: ${strategy.type}, agents: ${strategy.agentCount}`);

        // Step 3: Route to appropriate coordination method
        let result;
        if (strategy.type === 'single-agent') {
            result = await this._coordinateSingleAgent(stepDescription, category, complexityResult.level, personas);
        } else {
            result = await this._coordinateMultiAgent(stepDescription, category, complexityResult.level, personas, strategy.agentCount);
        }

        // Update statistics
        this._updateStats(result, complexityResult, personas);

        console.log(`[AgentCoordinator] Result: confidence=${result.confidence}%, quality=${result.quality || 'N/A'}, tokens=${result.tokens}`);
        console.log(`[AgentCoordinator] ═══════════════════════════════════════════════\n`);

        return result;
    }

    /**
     * Analyze task complexity using 4-factor algorithm
     *
     * Factors:
     * 1. Keyword Diversity (0-40 points) - Number of domains involved
     * 2. Ambiguity Level (0-25 points) - Specific vs vague language
     * 3. Task Size (0-25 points) - Number of action words
     * 4. Persona Count (0-10 points) - Multiple personas = complex
     *
     * Total: 0-100 → LOW (0-40), MEDIUM (41-70), HIGH (71-100)
     *
     * @param {string} stepDescription - Task description
     * @param {Array<string>} personas - Persona names
     * @returns {object} - { level, score, auto, breakdown }
     */
    analyzeTaskComplexity(stepDescription, personas = []) {
        const lowerDesc = stepDescription.toLowerCase();
        let score = 0;
        const breakdown = {};

        // Factor 1: Keyword Diversity (0-40 points)
        const domainKeywords = this._getDomainKeywords();
        const matchedDomains = new Set();

        Object.entries(domainKeywords).forEach(([domain, keywords]) => {
            if (keywords.some(kw => lowerDesc.includes(kw.toLowerCase()))) {
                matchedDomains.add(domain);
            }
        });

        const diversityScore = Math.min(matchedDomains.size * 10, 40);
        score += diversityScore;
        breakdown.diversity = diversityScore;
        breakdown.domains = Array.from(matchedDomains);

        // Factor 2: Ambiguity Level (0-25 points)
        const specificIndicators = [
            /\b[A-Z][a-zA-Z]+(?:DTO|Service|Controller|Repository|Entity)\b/g, // Class names
            /\bimpl(?:ement)?s?\b/gi,
            /\bcreate\s+\w+\s+(?:with|using)\b/gi,
            /\b(?:add|update|delete|get)\s+\w+\b/gi
        ];
        const vagueIndicators = [
            /\b(?:design|architect|plan|improve|optimize|enhance)\b/gi,
            /\b(?:system|feature|functionality|capability)\b/gi,
            /\b(?:should|could|might|maybe)\b/gi
        ];

        const specificCount = specificIndicators.reduce((sum, regex) =>
            sum + (stepDescription.match(regex) || []).length, 0);
        const vagueCount = vagueIndicators.reduce((sum, regex) =>
            sum + (lowerDesc.match(regex) || []).length, 0);

        let ambiguityScore = specificCount > vagueCount * 2 ? 5 :   // Very specific
                            specificCount > vagueCount ? 10 :        // Moderately specific
                            vagueCount > 0 ? 20 :                   // Has vague indicators
                            15;                                      // Neutral
        score += ambiguityScore;
        breakdown.ambiguity = ambiguityScore;
        breakdown.specificCount = specificCount;
        breakdown.vagueCount = vagueCount;

        // Factor 3: Task Size (0-25 points)
        const actionWords = lowerDesc.match(/\b(?:create|implement|design|add|update|delete|refactor|optimize|test|deploy|configure|setup|build|write|read|validate|verify|check)\b/gi) || [];
        const conjunctions = lowerDesc.match(/\b(?:and|with|then|after|before|also|additionally)\b/gi) || [];
        const taskSizeIndicators = actionWords.length + conjunctions.length;

        let taskSizeScore = taskSizeIndicators <= 1 ? 5 :       // Small task (1 action)
                           taskSizeIndicators <= 3 ? 15 :       // Medium task (2-3 actions)
                           25;                                  // Large task (4+ actions)
        score += taskSizeScore;
        breakdown.taskSize = taskSizeScore;
        breakdown.actionWords = actionWords.length;
        breakdown.conjunctions = conjunctions.length;

        // Factor 4: Persona Count (0-10 points)
        const personaScore = personas.length === 0 ? 0 :
                            personas.length === 1 ? 0 :
                            personas.length === 2 ? 5 : 10;
        score += personaScore;
        breakdown.personas = personaScore;

        // Determine complexity level
        const level = score <= this.config.lowComplexityMax ? 'low' :
                     score <= this.config.mediumComplexityMax ? 'medium' : 'high';

        return {
            level,
            score,
            auto: true,
            breakdown
        };
    }

    /**
     * Extract domain keywords from task description
     *
     * @param {string} stepDescription - Task description
     * @returns {object} - { backend: [...], frontend: [...], ... }
     */
    extractKeywords(stepDescription) {
        const lowerDesc = stepDescription.toLowerCase();
        const domainKeywords = this._getDomainKeywords();
        const extracted = {};

        Object.entries(domainKeywords).forEach(([domain, keywords]) => {
            const matched = keywords.filter(kw => lowerDesc.includes(kw.toLowerCase()));
            if (matched.length > 0) {
                extracted[domain] = matched;
            }
        });

        return extracted;
    }

    /**
     * Select top N agents based on relevance and diversity
     *
     * @param {string} stepDescription - Task description
     * @param {string} category - Primary category
     * @param {number} N - Number of agents to select
     * @param {Array<string>} personas - Persona names
     * @returns {Array<object>} - Selected agents with scores
     */
    async selectAgents(stepDescription, category, N, personas = []) {
        console.log(`\n[AgentCoordinator] Agent Selection: N=${N}, category=${category}`);

        // Get all available agents from ExpertRouter
        const allAgents = this.expertRouter.listAgents();

        // Get persona-boosted agents
        const boostedAgents = personas.length > 0 ?
            this.personaManager.getBoostedAgents(personas) : [];

        console.log(`[AgentCoordinator] Available agents: ${allAgents.length}`);
        console.log(`[AgentCoordinator] Boosted agents: ${boostedAgents.join(', ') || 'none'}`);

        // Extract keywords from task
        const extractedKeywords = this.extractKeywords(stepDescription);
        console.log(`[AgentCoordinator] Extracted keywords: ${JSON.stringify(extractedKeywords)}`);

        // Score each agent
        const scoredAgents = allAgents.map(agent => {
            const relevance = this._scoreAgentRelevance(agent, stepDescription, category, boostedAgents, extractedKeywords);
            return {
                ...agent,
                relevance: relevance.total,
                relevanceBreakdown: relevance.breakdown
            };
        });

        // Sort by relevance (descending)
        scoredAgents.sort((a, b) => b.relevance - a.relevance);

        // Filter by minimum threshold
        const qualifiedAgents = scoredAgents.filter(agent =>
            agent.relevance >= this.config.minRelevanceScore);

        console.log(`[AgentCoordinator] Qualified agents (≥${this.config.minRelevanceScore}%): ${qualifiedAgents.length}`);

        if (qualifiedAgents.length === 0) {
            console.log(`[AgentCoordinator] WARNING: No agents meet threshold, using top ${N} regardless`);
            return scoredAgents.slice(0, N);
        }

        // Select top N with diversity
        const selected = this._selectTopNWithDiversity(qualifiedAgents, N);

        console.log(`[AgentCoordinator] Selected agents:`);
        selected.forEach((agent, i) => {
            console.log(`  ${i + 1}. ${agent.name} (${agent.relevance}%) - ${agent.category}/${agent.subcategory}`);
            console.log(`     Breakdown: ${JSON.stringify(agent.relevanceBreakdown)}`);
        });

        return selected;
    }

    /**
     * Get statistics
     * @returns {object} - Current statistics
     */
    getStats() {
        return { ...this.stats };
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Convert complexity string to numeric score
     * @private
     */
    _complexityToScore(complexity) {
        const mapping = { low: 20, medium: 55, high: 85 };
        return mapping[complexity.toLowerCase()] || 55;
    }

    /**
     * Decide coordination strategy based on complexity
     * @private
     */
    _decideStrategy(complexityLevel, personas = [], options = {}) {
        // User override
        if (options.forceMultiAgent) {
            return {
                type: 'multi-agent',
                agentCount: options.agentCount || this.config.highAgentCount
            };
        }

        if (options.forceSingleAgent) {
            return {
                type: 'single-agent',
                agentCount: 1
            };
        }

        // Automatic decision based on complexity
        if (complexityLevel === 'low') {
            return {
                type: 'single-agent',
                agentCount: this.config.lowAgentCount
            };
        } else if (complexityLevel === 'medium') {
            // Medium complexity → default to single agent unless multiple personas
            if (personas.length >= 2) {
                return {
                    type: 'multi-agent',
                    agentCount: this.config.mediumAgentCount
                };
            }
            return {
                type: 'single-agent',
                agentCount: this.config.lowAgentCount
            };
        } else {
            // HIGH complexity → multi-agent
            return {
                type: 'multi-agent',
                agentCount: this.config.highAgentCount
            };
        }
    }

    /**
     * Coordinate using single agent (delegate to ExpertRouter)
     * @private
     */
    async _coordinateSingleAgent(stepDescription, category, complexity, personas) {
        this.stats.single_agent_decisions++;

        console.log(`[AgentCoordinator] Delegating to ExpertRouter (single agent)`);

        const result = await this.expertRouter.consultExpert(
            stepDescription,
            category,
            complexity,
            personas
        );

        return {
            ...result,
            coordination: {
                strategy: 'single-agent',
                agentCount: 1,
                complexity: complexity
            }
        };
    }

    /**
     * Coordinate using multiple agents
     * @private
     */
    async _coordinateMultiAgent(stepDescription, category, complexity, personas, agentCount) {
        this.stats.multi_agent_decisions++;

        console.log(`[AgentCoordinator] Multi-agent coordination (N=${agentCount})`);

        // Step 1: Select agents
        const selectedAgents = await this.selectAgents(stepDescription, category, agentCount, personas);

        if (selectedAgents.length === 0) {
            console.log(`[AgentCoordinator] ERROR: No agents selected, falling back to single agent`);
            return await this._coordinateSingleAgent(stepDescription, category, complexity, personas);
        }

        // Step 2: Consult agents in parallel
        const recommendations = await this._consultAgentsParallel(selectedAgents, stepDescription, category, complexity);

        // Step 3: Validate recommendations (detect conflicts)
        const validationResult = this._validateRecommendations(recommendations);

        console.log(`[AgentCoordinator] Validation: consensus=${validationResult.consensus.length}, majority=${validationResult.majority.length}, conflicts=${validationResult.conflicts.length}`);

        // Step 4: Synthesize final recommendation
        const synthesized = this._synthesize(validationResult, personas, recommendations);

        return {
            recommendation: synthesized.recommendation,
            confidence: synthesized.confidence,
            quality: synthesized.quality,
            tokens: synthesized.tokens,
            coordination: {
                strategy: 'multi-agent',
                agentCount: selectedAgents.length,
                complexity: complexity,
                agents: selectedAgents.map(a => a.name),
                validation: {
                    consensusCount: validationResult.consensus.length,
                    majorityCount: validationResult.majority.length,
                    conflictCount: validationResult.conflicts.length
                },
                synthesisSource: synthesized.synthesisSource
            }
        };
    }

    /**
     * Consult multiple agents in parallel
     * @private
     */
    async _consultAgentsParallel(agents, stepDescription, category, complexity) {
        console.log(`\n[AgentCoordinator] Consulting ${agents.length} agents in parallel...`);

        const consultations = agents.map(agent =>
            this._executeWithTimeout(
                () => this.expertRouter.consultExpert(stepDescription, category, complexity, []),
                this.config.parallelTimeout,
                agent.name
            )
        );

        const results = await Promise.allSettled(consultations);

        const recommendations = [];
        results.forEach((result, index) => {
            const agent = agents[index];

            if (result.status === 'fulfilled' && result.value) {
                recommendations.push({
                    agent: agent.name,
                    recommendation: result.value.recommendation || '',
                    confidence: result.value.confidence || 0,
                    tokens: result.value.tokens || 0,
                    category: agent.category,
                    subcategory: agent.subcategory
                });
                console.log(`  ✓ ${agent.name}: ${result.value.confidence || 0}% confidence, ${result.value.tokens || 0} tokens`);
            } else {
                console.log(`  ✗ ${agent.name}: FAILED - ${result.reason?.message || 'Unknown error'}`);
            }
        });

        console.log(`[AgentCoordinator] Successful consultations: ${recommendations.length}/${agents.length}`);

        return recommendations;
    }

    /**
     * Execute function with timeout
     * @private
     */
    async _executeWithTimeout(fn, timeout, label) {
        return Promise.race([
            fn(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
            )
        ]);
    }

    /**
     * Validate recommendations and detect conflicts
     * @private
     */
    _validateRecommendations(recommendations) {
        const consensus = [];
        const majority = [];
        const conflicts = [];

        if (recommendations.length === 0) {
            return { consensus, majority, conflicts };
        }

        // Simple similarity check (Jaccard similarity on keywords)
        const allKeywords = recommendations.map(r => this._extractRecommendationKeywords(r.recommendation));

        // Check for consensus (all agents agree on similar recommendations)
        const firstKeywords = allKeywords[0];
        let allSimilar = true;

        for (let i = 1; i < allKeywords.length; i++) {
            const similarity = this._calculateJaccardSimilarity(firstKeywords, allKeywords[i]);
            if (similarity < 0.6) {
                allSimilar = false;
                break;
            }
        }

        if (allSimilar && recommendations.length > 1) {
            // Consensus
            consensus.push({
                recommendation: recommendations[0],
                confidence: Math.round(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length)
            });
        } else if (recommendations.length >= 3) {
            // Check for majority (≥67% agreement)
            const groups = this._groupSimilarRecommendations(recommendations, allKeywords, 0.6);
            const majorityThreshold = Math.ceil(recommendations.length * this.config.majorityThreshold);

            for (const group of groups) {
                if (group.length >= majorityThreshold) {
                    majority.push({
                        recommendation: group[0],
                        confidence: Math.round(group.reduce((sum, r) => sum + r.confidence, 0) / group.length),
                        count: group.length
                    });
                }
            }
        }

        // Detect contradictory recommendations
        const contradictions = this._detectContradictoryRecommendations(recommendations);
        conflicts.push(...contradictions);

        return { consensus, majority, conflicts };
    }

    /**
     * Synthesize final recommendation from validation result
     * @private
     */
    _synthesize(validationResult, personas, allRecommendations) {
        let baseRecommendation = '';
        let baseConfidence = 0;
        let qualityScore = 0;
        let synthesisSource = '';
        let totalTokens = allRecommendations.reduce((sum, r) => sum + r.tokens, 0);

        // Priority 1: Consensus (100% agreement)
        if (validationResult.consensus.length > 0) {
            const consensus = validationResult.consensus[0];
            baseRecommendation = consensus.recommendation.recommendation;
            baseConfidence = consensus.confidence;
            synthesisSource = 'consensus';

            qualityScore += 40; // Consensus: 40 points
            qualityScore += Math.round(consensus.confidence * 0.3); // Confidence: 0-30
            qualityScore += 10; // No conflict: 10 points
        }
        // Priority 2: Majority (≥67% agreement)
        else if (validationResult.majority.length > 0) {
            const majority = validationResult.majority[0];
            baseRecommendation = majority.recommendation.recommendation;
            baseConfidence = majority.confidence;
            synthesisSource = 'majority';

            qualityScore += 30; // Majority: 30 points
            qualityScore += Math.round(majority.confidence * 0.3); // Confidence: 0-30
            qualityScore += 5; // Partial conflict: 5 points
        }
        // Priority 3: Conflict resolution
        else if (validationResult.conflicts.length > 0 && allRecommendations.length > 0) {
            // Use highest confidence recommendation
            const sorted = [...allRecommendations].sort((a, b) => b.confidence - a.confidence);
            baseRecommendation = sorted[0].recommendation;
            baseConfidence = sorted[0].confidence;
            synthesisSource = 'quality-weighted';

            qualityScore += 10; // Conflict: 10 points
            qualityScore += Math.round(sorted[0].confidence * 0.3); // Confidence: 0-30
        }
        // Fallback: Single recommendation or empty
        else if (allRecommendations.length > 0) {
            baseRecommendation = allRecommendations[0].recommendation;
            baseConfidence = allRecommendations[0].confidence;
            synthesisSource = 'single';

            qualityScore += 20; // Single: 20 points
            qualityScore += Math.round(allRecommendations[0].confidence * 0.3);
        }

        // Apply persona modifiers to confidence
        let adjustedConfidence = baseConfidence;
        if (personas.length > 0) {
            const personaModifiers = this.personaManager.getConfidenceModifiers(personas);
            adjustedConfidence = Math.min(baseConfidence + (personaModifiers.plan || 0), 100);
            qualityScore += 10; // Persona alignment: 10 points
        }

        return {
            recommendation: baseRecommendation,
            confidence: adjustedConfidence,
            quality: qualityScore,
            tokens: totalTokens,
            synthesisSource
        };
    }

    /**
     * Score agent relevance using 4-component algorithm
     * @private
     */
    _scoreAgentRelevance(agent, stepDescription, category, boostedAgents, extractedKeywords) {
        const lowerDesc = stepDescription.toLowerCase();
        const breakdown = {
            keywordMatch: 0,
            categoryAlignment: 0,
            personaBoosting: 0,
            expertiseLevel: 0
        };

        // Component 1: Keyword Match (0-50)
        const agentKeywords = agent.keywords ? agent.keywords.toLowerCase().split(/,\s*/) : [];
        let matchCount = 0;

        for (const kw of agentKeywords) {
            if (lowerDesc.includes(kw)) {
                matchCount++;
                continue;
            }

            // Check against extracted domain keywords
            for (const domainKeywords of Object.values(extractedKeywords)) {
                if (domainKeywords.some(dk => dk.toLowerCase().includes(kw) || kw.includes(dk.toLowerCase()))) {
                    matchCount++;
                    break;
                }
            }
        }

        breakdown.keywordMatch = agentKeywords.length > 0 ?
            Math.round((matchCount / agentKeywords.length) * 50) : 0;

        // Component 2: Category Alignment (0-20)
        if (agent.category === category) {
            breakdown.categoryAlignment = 20; // Exact match
        } else if (this._isCategoryRelated(agent.category, category)) {
            breakdown.categoryAlignment = 10; // Related
        }

        // Component 3: Persona Boosting (0-20)
        if (boostedAgents.includes(agent.name)) {
            breakdown.personaBoosting = 20;
        }

        // Component 4: Expertise Level (0-10)
        if (agent.expertise === 'specialist') {
            breakdown.expertiseLevel = 10;
        } else if (agent.expertise === 'generalist') {
            breakdown.expertiseLevel = 5;
        }

        const total = breakdown.keywordMatch + breakdown.categoryAlignment +
                     breakdown.personaBoosting + breakdown.expertiseLevel;

        return { total, breakdown };
    }

    /**
     * Select top N agents with diversity
     * @private
     */
    _selectTopNWithDiversity(agents, N) {
        const selected = [];
        const usedSubcategories = new Set();
        const usedCategories = new Map();

        // Pass 1: Select with diversity constraints
        for (const agent of agents) {
            if (selected.length >= N) break;

            // Avoid duplicate subcategories
            if (usedSubcategories.has(agent.subcategory)) {
                continue;
            }

            // Limit agents per category (max 50%)
            const categoryCount = usedCategories.get(agent.category) || 0;
            if (categoryCount >= Math.ceil(N / 2) && selected.length > 0) {
                continue;
            }

            selected.push(agent);
            usedSubcategories.add(agent.subcategory);
            usedCategories.set(agent.category, categoryCount + 1);
        }

        // Pass 2: Relax constraints if insufficient
        if (selected.length < N && agents.length > selected.length) {
            for (const agent of agents) {
                if (selected.length >= N) break;
                if (!selected.some(s => s.name === agent.name)) {
                    selected.push(agent);
                }
            }
        }

        return selected;
    }

    /**
     * Check if categories are related
     * @private
     */
    _isCategoryRelated(category1, category2) {
        const relations = {
            'backend': ['database', 'security'],
            'frontend': ['performance', 'quality'],
            'database': ['backend', 'performance'],
            'security': ['backend', 'quality'],
            'testing': ['quality', 'backend', 'frontend'],
            'performance': ['frontend', 'database'],
            'quality': ['testing', 'security'],
            'devops': ['backend', 'database']
        };

        return relations[category1]?.includes(category2) || false;
    }

    /**
     * Get domain keyword dictionary
     * @private
     */
    _getDomainKeywords() {
        return {
            backend: ['service', 'controller', 'repository', 'entity', 'dto', 'api', 'rest', 'endpoint', 'business logic', 'usecase', 'dependency', 'inject', 'spring', 'springboot', 'java', 'validation'],
            frontend: ['component', 'page', 'layout', 'ui', 'state', 'hook', 'context', 'react', 'next', 'nextjs', 'jsx', 'tsx', 'client', 'server component', 'async', 'fetch'],
            database: ['schema', 'table', 'column', 'migration', 'query', 'index', 'constraint', 'foreign key', 'primary key', 'jpa', 'entity', 'repository', 'sql', 'postgresql', 'flyway'],
            security: ['authentication', 'authorization', 'jwt', 'oauth2', 'login', 'password', 'hash', 'bcrypt', 'spring security', 'csrf', 'xss', 'sql injection', 'owasp', 'session'],
            testing: ['test', 'junit', 'mockito', 'mock', 'coverage', 'jest', 'react testing library', 'playwright', 'e2e', 'integration test', 'unit test'],
            performance: ['optimize', 'cache', 'redis', 'profiling', 'jvm', 'gc', 'bundle', 'ssr', 'core web vitals', 'lcp', 'performance'],
            quality: ['refactor', 'code smell', 'solid', 'dry', 'complexity', 'cyclomatic', 'sonarqube', 'eslint', 'quality', 'maintainability'],
            devops: ['docker', 'dockerfile', 'container', 'ci/cd', 'github actions', 'pipeline', 'workflow', 'deployment', 'compose']
        };
    }

    /**
     * Extract keywords from recommendation text
     * @private
     */
    _extractRecommendationKeywords(text) {
        const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        return new Set(words);
    }

    /**
     * Calculate Jaccard similarity between two keyword sets
     * @private
     */
    _calculateJaccardSimilarity(set1, set2) {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    /**
     * Group similar recommendations
     * @private
     */
    _groupSimilarRecommendations(recommendations, allKeywords, threshold) {
        const groups = [];
        const used = new Set();

        for (let i = 0; i < recommendations.length; i++) {
            if (used.has(i)) continue;

            const group = [recommendations[i]];
            used.add(i);

            for (let j = i + 1; j < recommendations.length; j++) {
                if (used.has(j)) continue;

                const similarity = this._calculateJaccardSimilarity(allKeywords[i], allKeywords[j]);
                if (similarity >= threshold) {
                    group.push(recommendations[j]);
                    used.add(j);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * Detect contradictory recommendations
     * @private
     */
    _detectContradictoryRecommendations(recommendations) {
        const contradictions = [];

        const CONTRADICTORY_PAIRS = [
            ['synchronous', 'asynchronous'],
            ['sync', 'async'],
            ['jwt', 'session'],
            ['oauth2', 'basic auth'],
            ['sql', 'nosql'],
            ['monolith', 'microservice'],
            ['rest', 'graphql'],
            ['server-side', 'client-side'],
            ['ssr', 'csr'],
            ['eager', 'lazy'],
            ['optimistic', 'pessimistic'],
            ['push', 'pull'],
            ['stateful', 'stateless'],
            ['vertical', 'horizontal'],
            ['centralized', 'distributed']
        ];

        for (let i = 0; i < recommendations.length; i++) {
            for (let j = i + 1; j < recommendations.length; j++) {
                const text1 = recommendations[i].recommendation.toLowerCase();
                const text2 = recommendations[j].recommendation.toLowerCase();

                for (const [word1, word2] of CONTRADICTORY_PAIRS) {
                    if ((text1.includes(word1) && text2.includes(word2)) ||
                        (text1.includes(word2) && text2.includes(word1))) {
                        contradictions.push({
                            type: 'contradictory',
                            agent1: recommendations[i].agent,
                            agent2: recommendations[j].agent,
                            keywords: [word1, word2],
                            severity: 'HIGH'
                        });
                    }
                }
            }
        }

        return contradictions;
    }

    /**
     * Update statistics after coordination
     * @private
     */
    _updateStats(result, complexityResult, personas) {
        // Update complexity distribution
        this.stats.complexity_distribution[complexityResult.level]++;

        // Update agent combinations
        if (result.coordination?.agents) {
            const key = result.coordination.agents.sort().join('+');
            this.stats.agent_combinations[key] = (this.stats.agent_combinations[key] || 0) + 1;
        }

        // Update persona combinations
        if (personas.length > 0) {
            const key = personas.sort().join('+');
            this.stats.persona_combinations[key] = (this.stats.persona_combinations[key] || 0) + 1;
        }

        // Update averages
        const n = this.stats.total_coordinations;
        this.stats.avg_agents_per_task = ((this.stats.avg_agents_per_task * (n - 1)) + (result.coordination?.agentCount || 1)) / n;
        this.stats.avg_confidence = ((this.stats.avg_confidence * (n - 1)) + result.confidence) / n;

        if (result.quality) {
            this.stats.avg_quality = ((this.stats.avg_quality * (n - 1)) + result.quality) / n;
        }

        this.stats.avg_tokens = Math.round(((this.stats.avg_tokens * (n - 1)) + result.tokens) / n);

        // Update consensus/conflict rates
        if (result.coordination?.validation) {
            const hasConsensus = result.coordination.validation.consensusCount > 0;
            const hasConflict = result.coordination.validation.conflictCount > 0;

            if (hasConsensus) {
                this.stats.consensus_rate = ((this.stats.consensus_rate * (n - 1)) + 1) / n;
            } else {
                this.stats.consensus_rate = (this.stats.consensus_rate * (n - 1)) / n;
            }

            if (hasConflict) {
                this.stats.conflict_rate = ((this.stats.conflict_rate * (n - 1)) + 1) / n;
            } else {
                this.stats.conflict_rate = (this.stats.conflict_rate * (n - 1)) / n;
            }
        }
    }
}

module.exports = AgentCoordinator;
