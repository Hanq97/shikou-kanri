/**
 * PatternReuseEngine - Reuses learned patterns in new plans
 * Week 6 Day 4: Learning System Implementation
 *
 * Responsibilities:
 * - Match plan requests to relevant patterns
 * - Load patterns from pattern storage
 * - Apply patterns to plan generation
 * - Track pattern reuse for metrics
 * - Calculate pattern relevance scores
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class PatternReuseEngine {
    constructor(options = {}) {
        this.patternStoragePath = options.patternStoragePath || path.join(__dirname, '../.claude/memory-bank/eps-enhancement/week-6/patterns');
        this.kbPath = options.kbPath || path.join(__dirname, '../knowledge-base');
        this.reuseTrackingPath = options.reuseTrackingPath || path.join(__dirname, '../.claude/memory-bank/eps-enhancement/week-6/metrics/pattern-reuse-tracking.json');
        this.minRelevanceScore = options.minRelevanceScore || 0.3; // Minimum relevance score to include pattern
        this.cache = new Map(); // Cache loaded patterns
    }

    /**
     * Match plan request to relevant patterns
     * @param {Object} request - Plan request (feature, techStack, category)
     * @returns {Array} Relevant patterns with relevance scores
     */
    async matchPatterns(request) {
        const { feature, techStack = [], category = 'backend', keywords = [] } = request;

        // Load all patterns from storage
        const allPatterns = await this.loadAllPatterns();

        // Load KB patterns for additional context
        const kbPatterns = await this.loadKBPatterns(category);

        // Merge patterns (storage + KB)
        const mergedPatterns = this.mergePatterns(allPatterns, kbPatterns);

        // Calculate relevance scores
        const scoredPatterns = mergedPatterns.map(pattern => {
            const score = this.calculateRelevanceScore(pattern, request);
            return { ...pattern, relevanceScore: score };
        });

        // Filter by minimum relevance score and sort by score (descending)
        const relevantPatterns = scoredPatterns
            .filter(p => p.relevanceScore >= this.minRelevanceScore)
            .sort((a, b) => b.relevanceScore - a.relevanceScore);

        return relevantPatterns;
    }

    /**
     * Calculate relevance score for a pattern given a request
     * @param {Object} pattern - Pattern object
     * @param {Object} request - Plan request
     * @returns {number} Relevance score (0-1)
     */
    calculateRelevanceScore(pattern, request) {
        let score = 0;
        let weights = 0;

        // Category match (40% weight)
        if (pattern.type === request.category || pattern.category === request.category) {
            score += 0.4;
        }
        weights += 0.4;

        // Tech stack match (30% weight)
        const techStackMatch = this.calculateTechStackMatch(pattern, request.techStack || []);
        score += techStackMatch * 0.3;
        weights += 0.3;

        // Keyword match (20% weight)
        const keywordMatch = this.calculateKeywordMatch(pattern, request.keywords || []);
        score += keywordMatch * 0.2;
        weights += 0.2;

        // Frequency bonus (10% weight) - higher frequency patterns are more relevant
        const frequencyBonus = Math.min((pattern.frequency || 50) / 100, 1);
        score += frequencyBonus * 0.1;
        weights += 0.1;

        return score / weights;
    }

    /**
     * Calculate tech stack match score
     * @param {Object} pattern - Pattern object
     * @param {Array} requestTechStack - Tech stack from request
     * @returns {number} Match score (0-1)
     */
    calculateTechStackMatch(pattern, requestTechStack) {
        if (!requestTechStack || requestTechStack.length === 0) return 0.5; // Neutral if no tech stack

        const patternTech = (pattern.keywords || [])
            .map(k => k.toLowerCase())
            .filter(k => k.includes('java') || k.includes('spring') || k.includes('react') || k.includes('next') || k.includes('typescript'));

        if (patternTech.length === 0) return 0.5; // Neutral if pattern has no tech keywords

        const matches = requestTechStack.filter(tech =>
            patternTech.some(pt => pt.includes(tech.toLowerCase()) || tech.toLowerCase().includes(pt))
        );

        return matches.length / requestTechStack.length;
    }

    /**
     * Calculate keyword match score
     * @param {Object} pattern - Pattern object
     * @param {Array} requestKeywords - Keywords from request
     * @returns {number} Match score (0-1)
     */
    calculateKeywordMatch(pattern, requestKeywords) {
        if (!requestKeywords || requestKeywords.length === 0) return 0.5; // Neutral if no keywords

        const patternKeywords = (pattern.keywords || []).map(k => k.toLowerCase());
        if (patternKeywords.length === 0) return 0.5; // Neutral if pattern has no keywords

        const matches = requestKeywords.filter(keyword =>
            patternKeywords.some(pk => pk.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(pk))
        );

        return matches.length / requestKeywords.length;
    }

    /**
     * Apply patterns to plan generation
     * @param {Array} patterns - Relevant patterns to apply
     * @param {Object} planContext - Plan generation context
     * @returns {Object} Enhanced plan with applied patterns
     */
    async applyPatterns(patterns, planContext) {
        const appliedPatterns = [];
        const enhancedSections = {};

        for (const pattern of patterns) {
            // Determine where to apply pattern based on type
            const section = this.determinePlanSection(pattern);

            if (!enhancedSections[section]) {
                enhancedSections[section] = {
                    title: section,
                    patterns: [],
                    guidelines: []
                };
            }

            // Add pattern to section
            enhancedSections[section].patterns.push({
                name: pattern.name,
                description: pattern.description || pattern.approved_pattern,
                do: pattern.do || [],
                dont: pattern.dont || [],
                examples: pattern.examples || [],
                relevanceScore: pattern.relevanceScore
            });

            // Track applied pattern
            appliedPatterns.push({
                patternId: pattern.id || this.generatePatternId(pattern),
                patternName: pattern.name,
                relevanceScore: pattern.relevanceScore,
                appliedAt: new Date().toISOString()
            });
        }

        // Record reuse
        await this.recordReuse(planContext, appliedPatterns);

        return {
            enhancedSections,
            appliedPatterns,
            totalPatternsApplied: appliedPatterns.length
        };
    }

    /**
     * Determine which plan section a pattern belongs to
     * @param {Object} pattern - Pattern object
     * @returns {string} Section name
     */
    determinePlanSection(pattern) {
        const type = pattern.type || pattern.category;

        const sectionMap = {
            'architecture': 'Architecture & Design',
            'backend': 'Backend Implementation',
            'frontend': 'Frontend Implementation',
            'database': 'Database Design',
            'testing': 'Testing Strategy',
            'implementation': 'Implementation Plan'
        };

        return sectionMap[type] || 'General Guidelines';
    }

    /**
     * Load all patterns from pattern storage
     * @returns {Array} All patterns
     */
    async loadAllPatterns() {
        const cacheKey = 'all-patterns';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Check if pattern storage path exists
            if (!fsSync.existsSync(this.patternStoragePath)) {
                console.warn(`Pattern storage path does not exist: ${this.patternStoragePath}`);
                return [];
            }

            const files = await fs.readdir(this.patternStoragePath);
            const patternFiles = files.filter(f => f.startsWith('patterns-') && f.endsWith('.json'));

            const allPatterns = [];
            for (const file of patternFiles) {
                const filePath = path.join(this.patternStoragePath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);

                if (data.patterns && Array.isArray(data.patterns)) {
                    allPatterns.push(...data.patterns);
                }
            }

            // Deduplicate patterns by ID
            const uniquePatterns = this.deduplicatePatterns(allPatterns);

            this.cache.set(cacheKey, uniquePatterns);
            return uniquePatterns;
        } catch (error) {
            console.error('Failed to load patterns from storage:', error.message);
            return [];
        }
    }

    /**
     * Load patterns from Knowledge Base
     * @param {string} category - Category (backend, frontend, database)
     * @returns {Array} KB patterns
     */
    async loadKBPatterns(category) {
        const cacheKey = `kb-${category}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const kbFile = `${category}-kb.json`;
            const kbFilePath = path.join(this.kbPath, kbFile);

            if (!fsSync.existsSync(kbFilePath)) {
                console.warn(`KB file does not exist: ${kbFilePath}`);
                return [];
            }

            const content = await fs.readFile(kbFilePath, 'utf-8');
            const kb = JSON.parse(content);

            const patterns = [];
            for (const [key, value] of Object.entries(kb)) {
                if (key === 'metadata') continue;

                patterns.push({
                    id: `kb-${category}-${key}`,
                    type: category,
                    name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    category: category,
                    description: value.description,
                    approved_pattern: value.approved_pattern,
                    rejected_patterns: value.rejected_patterns || [],
                    rationale: value.rationale || '',
                    do: value.do || [],
                    dont: value.dont || [],
                    examples: value.examples || [],
                    keywords: value.keywords || [],
                    frequency: value.frequency || 50,
                    confidence: value.confidence || 90,
                    source: 'knowledge-base'
                });
            }

            this.cache.set(cacheKey, patterns);
            return patterns;
        } catch (error) {
            console.error(`Failed to load KB patterns for ${category}:`, error.message);
            return [];
        }
    }

    /**
     * Merge patterns from different sources
     * @param {Array} storagePatterns - Patterns from storage
     * @param {Array} kbPatterns - Patterns from KB
     * @returns {Array} Merged patterns
     */
    mergePatterns(storagePatterns, kbPatterns) {
        const merged = [...storagePatterns];

        // Add KB patterns that are not in storage
        for (const kbPattern of kbPatterns) {
            const exists = merged.some(p =>
                p.name.toLowerCase() === kbPattern.name.toLowerCase() ||
                p.id === kbPattern.id
            );

            if (!exists) {
                merged.push(kbPattern);
            }
        }

        return merged;
    }

    /**
     * Deduplicate patterns by ID or name
     * @param {Array} patterns - Patterns to deduplicate
     * @returns {Array} Deduplicated patterns
     */
    deduplicatePatterns(patterns) {
        const seen = new Set();
        const unique = [];

        for (const pattern of patterns) {
            const key = pattern.id || pattern.name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(pattern);
            } else {
                // Merge duplicates (sum frequency, merge examples)
                const existing = unique.find(p => (p.id === pattern.id) || (p.name.toLowerCase() === pattern.name.toLowerCase()));
                if (existing) {
                    existing.frequency = (existing.frequency || 0) + (pattern.frequency || 0);
                    existing.examples = [...(existing.examples || []), ...(pattern.examples || [])];
                    existing.sources = [...(existing.sources || [pattern.source]), ...(pattern.sources || [pattern.source])];
                }
            }
        }

        return unique;
    }

    /**
     * Generate pattern ID from pattern name
     * @param {Object} pattern - Pattern object
     * @returns {string} Pattern ID
     */
    generatePatternId(pattern) {
        const type = pattern.type || pattern.category || 'general';
        const name = (pattern.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `${type}-${name}`;
    }

    /**
     * Record pattern reuse for metrics tracking
     * @param {Object} planContext - Plan context (feature, date, etc.)
     * @param {Array} appliedPatterns - Patterns that were applied
     */
    async recordReuse(planContext, appliedPatterns) {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.reuseTrackingPath);
            await fs.mkdir(dir, { recursive: true });

            // Load existing tracking data
            let trackingData = { plans: [] };
            if (fsSync.existsSync(this.reuseTrackingPath)) {
                const content = await fs.readFile(this.reuseTrackingPath, 'utf-8');
                trackingData = JSON.parse(content);
            }

            // Add new plan reuse record
            trackingData.plans.push({
                planId: planContext.planId || `plan-${Date.now()}`,
                feature: planContext.feature || 'unknown',
                category: planContext.category || 'backend',
                generatedAt: new Date().toISOString(),
                patternsApplied: appliedPatterns,
                totalPatternsApplied: appliedPatterns.length
            });

            // Save tracking data
            await fs.writeFile(this.reuseTrackingPath, JSON.stringify(trackingData, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to record pattern reuse:', error.message);
        }
    }

    /**
     * Get reuse statistics
     * @returns {Object} Reuse statistics
     */
    async getReuseStats() {
        try {
            if (!fsSync.existsSync(this.reuseTrackingPath)) {
                return {
                    plansGenerated: 0,
                    plansUsingLearnedPatterns: 0,
                    reuseRate: 0,
                    averagePatternsPerPlan: 0,
                    totalPatternsApplied: 0
                };
            }

            const content = await fs.readFile(this.reuseTrackingPath, 'utf-8');
            const trackingData = JSON.parse(content);

            const plansGenerated = trackingData.plans.length;
            const plansUsingLearnedPatterns = trackingData.plans.filter(p => p.totalPatternsApplied > 0).length;
            const totalPatternsApplied = trackingData.plans.reduce((sum, p) => sum + p.totalPatternsApplied, 0);

            return {
                plansGenerated,
                plansUsingLearnedPatterns,
                reuseRate: plansGenerated > 0 ? (plansUsingLearnedPatterns / plansGenerated * 100).toFixed(1) : 0,
                averagePatternsPerPlan: plansGenerated > 0 ? (totalPatternsApplied / plansGenerated).toFixed(1) : 0,
                totalPatternsApplied
            };
        } catch (error) {
            console.error('Failed to get reuse stats:', error.message);
            return {
                plansGenerated: 0,
                plansUsingLearnedPatterns: 0,
                reuseRate: 0,
                averagePatternsPerPlan: 0,
                totalPatternsApplied: 0
            };
        }
    }

    /**
     * Clear cache (useful after KB updates)
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = { PatternReuseEngine };
