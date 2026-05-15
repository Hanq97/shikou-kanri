const ExpertRouter = require('./mcp-expert-router.js');
const PersonaManager = require('./persona-manager.js');

/**
 * MultiAgentConsultation - Advanced Multi-Agent Consultation System
 *
 * Purpose: Parallel agent consultation with advanced synthesis and conflict resolution
 *
 * Features:
 * - Parallel agent execution with Promise.allSettled
 * - Advanced response synthesis (complementary merging)
 * - Quality-weighted recommendation scoring
 * - Deduplication of similar recommendations
 * - 3-type conflict detection (contradictory, incompatible, priority)
 * - Conflict categorization and resolution triggers
 *
 * Version: 1.0.0
 * Week: 13 Day 3
 * Date: 2025-12-27
 */
class MultiAgentConsultation {
    constructor(options = {}) {
        this.expertRouter = new ExpertRouter();
        this.personaManager = new PersonaManager();

        this.config = {
            parallelTimeout: 60000,        // 60s max per agent
            maxConcurrent: 6,              // Max concurrent agents
            deduplicationThreshold: 0.9,   // 90% similarity = duplicate (for deduplication)
            consensusThreshold: 0.7,       // 70% similarity = consensus (for grouping)
            minQualityScore: 50,           // Minimum quality score
            ...options
        };

        this.stats = {
            total_consultations: 0,
            successful_consultations: 0,
            failed_consultations: 0,
            avg_response_time: 0,
            avg_agents_used: 0,
            conflicts_detected: 0,
            conflicts_resolved: 0
        };

        console.log('[MultiAgentConsultation] Initialized');
    }

    /**
     * Execute parallel consultation with multiple agents
     *
     * @param {Array<object>} agents - Selected agents
     * @param {string} stepDescription - Task description
     * @param {string} category - Task category
     * @param {string} complexity - Task complexity
     * @param {Array<string>} personas - Active personas
     * @returns {Promise<object>} - Consultation result
     */
    async consultParallel(agents, stepDescription, category, complexity = 'medium', personas = []) {
        this.stats.total_consultations++;
        const startTime = Date.now();

        console.log(`\n[MultiAgentConsultation] ═══════════════════════════════════════`);
        console.log(`[MultiAgentConsultation] Parallel Consultation #${this.stats.total_consultations}`);
        console.log(`[MultiAgentConsultation] Agents: ${agents.length} agents`);
        console.log(`[MultiAgentConsultation] Task: ${stepDescription.substring(0, 60)}...`);

        try {
            // Step 1: Execute agents in parallel
            const responses = await this._executeParallel(agents, stepDescription, category, complexity);

            // Step 2: Synthesize responses
            const synthesized = await this._synthesizeResponses(responses, personas);

            // Step 3: Detect conflicts
            const conflicts = this._detectConflicts(responses);

            if (conflicts.length > 0) {
                this.stats.conflicts_detected += conflicts.length;
                console.log(`[MultiAgentConsultation] ⚠️  Conflicts detected: ${conflicts.length}`);
            }

            // Update statistics
            const duration = Date.now() - startTime;
            this._updateStats(responses, duration);

            console.log(`[MultiAgentConsultation] ✓ Consultation complete (${duration}ms)`);
            console.log(`[MultiAgentConsultation] ═══════════════════════════════════════\n`);

            return {
                recommendation: synthesized.recommendation,
                confidence: synthesized.confidence,
                quality: synthesized.quality,
                tokens: synthesized.tokens,
                responses: responses,
                conflicts: conflicts,
                synthesisMethod: synthesized.method,
                duration: duration
            };
        } catch (error) {
            this.stats.failed_consultations++;
            console.error(`[MultiAgentConsultation] ✗ Consultation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Synthesize multiple responses into coherent recommendation
     *
     * @param {Array<object>} responses - Agent responses
     * @param {string} stepDescription - Task description
     * @param {Array<string>} personas - Active personas
     * @returns {Promise<object>} - Synthesized result
     */
    async synthesize(responses, stepDescription = '', personas = []) {
        return await this._synthesizeResponses(responses, personas);
    }

    /**
     * Detect conflicts in multiple responses
     *
     * @param {Array<object>} responses - Agent responses
     * @returns {Array<object>} - Detected conflicts
     */
    detectConflicts(responses) {
        return this._detectConflicts(responses);
    }

    /**
     * Get consultation statistics
     * @returns {object} - Statistics
     */
    getStats() {
        return { ...this.stats };
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Execute agents in parallel with Promise.allSettled
     * @private
     */
    async _executeParallel(agents, stepDescription, category, complexity) {
        console.log(`[MultiAgentConsultation] Executing ${agents.length} agents in parallel...`);

        const consultations = agents.map(agent =>
            this._executeWithTimeout(
                async () => {
                    const result = await this.expertRouter.consultExpert(
                        stepDescription,
                        category,
                        complexity,
                        []
                    );
                    return {
                        agent: agent.name,
                        category: agent.category,
                        subcategory: agent.subcategory,
                        relevance: agent.relevance || 0,
                        recommendation: result.recommendation || '',
                        confidence: result.confidence || 0,
                        tokens: result.tokens || 0,
                        source: result.source || 'unknown'
                    };
                },
                this.config.parallelTimeout,
                agent.name
            )
        );

        const results = await Promise.allSettled(consultations);

        const responses = [];
        results.forEach((result, index) => {
            const agent = agents[index];

            if (result.status === 'fulfilled' && result.value) {
                responses.push(result.value);
                console.log(`  ✓ ${agent.name}: ${result.value.confidence}% confidence, ${result.value.tokens} tokens`);
            } else {
                console.log(`  ✗ ${agent.name}: FAILED - ${result.reason?.message || 'Unknown error'}`);
            }
        });

        console.log(`[MultiAgentConsultation] Success: ${responses.length}/${agents.length} agents`);

        return responses;
    }

    /**
     * Execute with timeout wrapper
     * @private
     */
    async _executeWithTimeout(fn, timeout, label) {
        return Promise.race([
            fn(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout after ${timeout}ms for ${label}`)), timeout)
            )
        ]);
    }

    /**
     * Synthesize responses with quality weighting and deduplication
     * @private
     */
    async _synthesizeResponses(responses, personas = []) {
        if (responses.length === 0) {
            return {
                recommendation: 'No recommendations available',
                confidence: 0,
                quality: 0,
                tokens: 0,
                method: 'empty'
            };
        }

        // Single response - no synthesis needed
        if (responses.length === 1) {
            return {
                recommendation: responses[0].recommendation,
                confidence: responses[0].confidence,
                quality: this._calculateQualityScore(responses[0]),
                tokens: responses[0].tokens,
                method: 'single'
            };
        }

        console.log(`\n[MultiAgentConsultation] Synthesizing ${responses.length} responses...`);

        // Step 1: Deduplicate similar recommendations
        const unique = this._deduplicateResponses(responses);
        console.log(`  Deduplication: ${responses.length} → ${unique.length} unique responses`);

        // Step 2: Check for consensus (≥70% similarity)
        const consensus = this._findConsensus(unique);
        if (consensus) {
            console.log(`  ✓ Consensus found: ${consensus.count}/${unique.length} agents agree`);
            const avgConfidence = Math.round(
                consensus.responses.reduce((sum, r) => sum + r.confidence, 0) / consensus.responses.length
            );

            return {
                recommendation: consensus.responses[0].recommendation,
                confidence: this._applyPersonaModifiers(avgConfidence, personas),
                quality: this._calculateQualityScore(consensus.responses[0], true),
                tokens: consensus.responses.reduce((sum, r) => sum + r.tokens, 0),
                method: 'consensus',
                consensusCount: consensus.count
            };
        }

        // Step 3: Quality-weighted synthesis (merge complementary recommendations)
        const merged = this._mergeComplementary(unique);
        console.log(`  Quality-weighted synthesis: ${merged.sections.length} sections merged`);

        const totalTokens = unique.reduce((sum, r) => sum + r.tokens, 0);
        const avgConfidence = Math.round(
            unique.reduce((sum, r) => sum + r.confidence, 0) / unique.length
        );

        return {
            recommendation: merged.text,
            confidence: this._applyPersonaModifiers(avgConfidence, personas),
            quality: merged.quality,
            tokens: totalTokens,
            method: 'quality-weighted',
            sectionsCount: merged.sections.length
        };
    }

    /**
     * Deduplicate similar responses
     * @private
     */
    _deduplicateResponses(responses) {
        const unique = [];
        const used = new Set();

        for (let i = 0; i < responses.length; i++) {
            if (used.has(i)) continue;

            const group = [responses[i]];
            used.add(i);

            for (let j = i + 1; j < responses.length; j++) {
                if (used.has(j)) continue;

                const similarity = this._calculateSimilarity(
                    responses[i].recommendation,
                    responses[j].recommendation
                );

                if (similarity >= this.config.deduplicationThreshold) {
                    group.push(responses[j]);
                    used.add(j);
                }
            }

            // Use highest confidence response from group
            const best = group.reduce((max, r) => r.confidence > max.confidence ? r : max, group[0]);
            unique.push(best);
        }

        return unique;
    }

    /**
     * Find consensus (≥70% similar recommendations)
     * @private
     */
    _findConsensus(responses) {
        if (responses.length < 2) return null;

        const groups = [];

        for (const response of responses) {
            let foundGroup = false;

            for (const group of groups) {
                const similarity = this._calculateSimilarity(
                    response.recommendation,
                    group[0].recommendation
                );

                if (similarity >= this.config.consensusThreshold) {
                    group.push(response);
                    foundGroup = true;
                    break;
                }
            }

            if (!foundGroup) {
                groups.push([response]);
            }
        }

        // Find majority group (≥70% of responses)
        const majorityThreshold = Math.ceil(responses.length * 0.7);
        for (const group of groups) {
            if (group.length >= majorityThreshold) {
                return {
                    responses: group,
                    count: group.length
                };
            }
        }

        return null;
    }

    /**
     * Merge complementary recommendations
     * @private
     */
    _mergeComplementary(responses) {
        // Sort by quality score (descending)
        const sorted = [...responses].sort((a, b) => {
            const scoreA = this._calculateQualityScore(a);
            const scoreB = this._calculateQualityScore(b);
            return scoreB - scoreA;
        });

        const sections = [];
        let totalQuality = 0;

        for (const response of sorted) {
            const quality = this._calculateQualityScore(response);
            const section = {
                agent: response.agent,
                text: response.recommendation,
                confidence: response.confidence,
                quality: quality,
                category: response.category
            };

            sections.push(section);
            totalQuality += quality;
        }

        // Construct merged text with quality-weighted sections
        const mergedText = sections
            .map((s, i) => `**${s.agent}** (confidence: ${s.confidence}%, quality: ${s.quality}):\n${s.text}`)
            .join('\n\n---\n\n');

        return {
            text: mergedText,
            sections: sections,
            quality: Math.round(totalQuality / sections.length)
        };
    }

    /**
     * Calculate quality score for a response
     * @private
     */
    _calculateQualityScore(response, isConsensus = false) {
        let score = 0;

        // Component 1: Confidence (0-40)
        score += Math.round(response.confidence * 0.4);

        // Component 2: Relevance (0-30)
        if (response.relevance) {
            score += Math.round(response.relevance * 0.3);
        } else {
            score += 15; // Default mid-range
        }

        // Component 3: Recommendation length (0-20)
        const length = response.recommendation.length;
        if (length > 500) {
            score += 20; // Comprehensive
        } else if (length > 200) {
            score += 15; // Moderate
        } else if (length > 50) {
            score += 10; // Brief
        } else {
            score += 5; // Very brief
        }

        // Component 4: Consensus bonus (0-10)
        if (isConsensus) {
            score += 10;
        }

        return Math.min(score, 100);
    }

    /**
     * Calculate Jaccard similarity between two texts
     * @private
     */
    _calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().match(/\b\w{4,}\b/g) || []);
        const words2 = new Set(text2.toLowerCase().match(/\b\w{4,}\b/g) || []);

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    /**
     * Apply persona modifiers to confidence
     * @private
     */
    _applyPersonaModifiers(confidence, personas) {
        if (personas.length === 0) return confidence;

        const modifiers = this.personaManager.getConfidenceModifiers(personas);
        return Math.min(confidence + (modifiers.plan || 0), 100);
    }

    /**
     * Detect conflicts in responses
     * @private
     */
    _detectConflicts(responses) {
        if (responses.length < 2) return [];

        const conflicts = [];

        // Type 1: Contradictory recommendations
        const contradictory = this._detectContradictory(responses);
        conflicts.push(...contradictory);

        // Type 2: Incompatible approaches
        const incompatible = this._detectIncompatible(responses);
        conflicts.push(...incompatible);

        // Type 3: Conflicting priorities
        const priorities = this._detectConflictingPriorities(responses);
        conflicts.push(...priorities);

        return conflicts;
    }

    /**
     * Detect contradictory recommendations
     * @private
     */
    _detectContradictory(responses) {
        const contradictions = [];

        const CONTRADICTORY_PAIRS = [
            ['synchronous', 'asynchronous'],
            ['sync', 'async'],
            ['blocking', 'non-blocking'],
            ['jwt', 'session'],
            ['token-based', 'session-based'],
            ['oauth2', 'basic auth'],
            ['sql', 'nosql'],
            ['relational', 'document'],
            ['postgres', 'mongodb'],
            ['monolith', 'microservice'],
            ['centralized', 'distributed'],
            ['rest', 'graphql'],
            ['server-side', 'client-side'],
            ['ssr', 'csr'],
            ['redux', 'context api']
        ];

        for (let i = 0; i < responses.length; i++) {
            for (let j = i + 1; j < responses.length; j++) {
                const text1 = responses[i].recommendation.toLowerCase();
                const text2 = responses[j].recommendation.toLowerCase();

                for (const [word1, word2] of CONTRADICTORY_PAIRS) {
                    if ((text1.includes(word1) && text2.includes(word2)) ||
                        (text1.includes(word2) && text2.includes(word1))) {
                        contradictions.push({
                            type: 'contradictory',
                            severity: 'HIGH',
                            agent1: responses[i].agent,
                            agent2: responses[j].agent,
                            keywords: [word1, word2],
                            recommendation1: responses[i].recommendation,
                            recommendation2: responses[j].recommendation
                        });
                    }
                }
            }
        }

        return contradictions;
    }

    /**
     * Detect incompatible approaches
     * @private
     */
    _detectIncompatible(responses) {
        const incompatible = [];

        const APPROACH_INDICATORS = {
            architecture: ['layered', 'hexagonal', 'onion', 'clean architecture'],
            testing: ['tdd', 'bdd', 'acceptance testing'],
            deployment: ['blue-green', 'canary', 'rolling update']
        };

        for (const [category, approaches] of Object.entries(APPROACH_INDICATORS)) {
            const found = [];

            for (const response of responses) {
                const text = response.recommendation.toLowerCase();
                for (const approach of approaches) {
                    if (text.includes(approach)) {
                        found.push({ response, approach, category });
                    }
                }
            }

            // If multiple different approaches in same category → potential incompatibility
            if (found.length >= 2) {
                const uniqueApproaches = new Set(found.map(f => f.approach));
                if (uniqueApproaches.size >= 2) {
                    incompatible.push({
                        type: 'incompatible',
                        severity: 'MEDIUM',
                        category: category,
                        approaches: Array.from(uniqueApproaches),
                        agents: found.map(f => f.response.agent)
                    });
                }
            }
        }

        return incompatible;
    }

    /**
     * Detect conflicting priorities
     * @private
     */
    _detectConflictingPriorities(responses) {
        const conflicts = [];

        const PRIORITY_KEYWORDS = {
            performance: ['fast', 'optimize', 'performance', 'speed', 'latency'],
            security: ['secure', 'authentication', 'authorization', 'encryption'],
            simplicity: ['simple', 'minimal', 'straightforward', 'easy'],
            flexibility: ['flexible', 'extensible', 'customizable', 'configurable'],
            maintainability: ['maintainable', 'readable', 'clean code', 'refactor'],
            scalability: ['scalable', 'horizontal scaling', 'distributed']
        };

        const priorities = [];

        for (const response of responses) {
            const text = response.recommendation.toLowerCase();
            const detected = [];

            for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
                const count = keywords.filter(kw => text.includes(kw)).length;
                if (count > 0) {
                    detected.push({ priority, count });
                }
            }

            if (detected.length > 0) {
                priorities.push({
                    agent: response.agent,
                    priorities: detected.sort((a, b) => b.count - a.count)
                });
            }
        }

        // Check for conflicting top priorities
        if (priorities.length >= 2) {
            const topPriorities = new Set(priorities.map(p => p.priorities[0]?.priority));
            if (topPriorities.size >= 2) {
                conflicts.push({
                    type: 'conflicting-priorities',
                    severity: 'LOW',
                    priorities: Array.from(topPriorities),
                    agents: priorities.map(p => p.agent)
                });
            }
        }

        return conflicts;
    }

    /**
     * Update statistics
     * @private
     */
    _updateStats(responses, duration) {
        this.stats.successful_consultations++;

        const n = this.stats.successful_consultations;
        this.stats.avg_response_time = Math.round(
            ((this.stats.avg_response_time * (n - 1)) + duration) / n
        );
        this.stats.avg_agents_used =
            ((this.stats.avg_agents_used * (n - 1)) + responses.length) / n;
    }
}

module.exports = MultiAgentConsultation;
