const fs = require('fs');
const path = require('path');

/**
 * PersonaManager - Cognitive Personas System for EPS Framework
 *
 * Manages persona definitions and provides persona-aware recommendation adjustments.
 * Supports multiple persona combination with weighted merging logic.
 *
 * Version: 1.0.0
 * Date: 2025-12-26
 */
class PersonaManager {
    constructor() {
        // Loaded persona definitions (lazy loading)
        this.personas = {}; // { 'security': {...}, 'testing': {...} }

        // Persona combination cache (avoid repeated merging)
        this.combinationCache = new Map();

        // Usage statistics
        this.stats = {
            persona_requests: {},      // { 'security': 15, 'testing': 10, ... }
            combination_patterns: {},  // { 'security+testing': 5, ... }
            total_requests: 0
        };

        console.log('[PersonaManager] Initialized (lazy loading enabled)');
    }

    /**
     * Load persona definition from JSON file
     * @param {string} name - Persona name (e.g., 'security')
     * @returns {object|null} - Parsed persona definition or null if error
     */
    loadPersona(name) {
        // Return cached persona if already loaded
        if (this.personas[name]) {
            return this.personas[name];
        }

        const personaPath = path.join(__dirname, '..', 'personas', `${name}-persona.json`);

        try {
            const content = fs.readFileSync(personaPath, 'utf8');
            const persona = JSON.parse(content);

            // Validate persona structure
            this.validatePersona(persona);

            // Cache persona
            this.personas[name] = persona;

            console.log(`[PersonaManager] Loaded ${name} persona (v${persona.version})`);
            return persona;
        } catch (error) {
            console.error(`[PersonaManager] Failed to load ${name} persona:`, error.message);
            return null;
        }
    }

    /**
     * Validate persona definition structure
     * @param {object} persona - Persona object to validate
     * @throws {Error} - If persona structure is invalid
     */
    validatePersona(persona) {
        const required = ['name', 'version', 'focus_areas', 'priorities', 'confidence_modifiers'];
        const missing = required.filter(field => !(field in persona));

        if (missing.length > 0) {
            throw new Error(`Invalid persona: missing fields ${missing.join(', ')}`);
        }

        // Validate priorities (all values 0.0-1.0)
        Object.entries(persona.priorities).forEach(([key, value]) => {
            if (value < 0 || value > 1) {
                throw new Error(`Invalid priority ${key}: ${value} (must be 0.0-1.0)`);
            }
        });

        // Validate confidence modifiers (non-negative)
        ['kb', 'agent', 'plan'].forEach(key => {
            if (persona.confidence_modifiers[key] < 0) {
                throw new Error(`Invalid confidence modifier ${key}: ${persona.confidence_modifiers[key]} (must be ≥0)`);
            }
        });
    }

    /**
     * Combine multiple personas with weighted merging
     * @param {Array<string>} personaNames - Persona names (e.g., ['security', 'testing'])
     * @returns {object|null} - Combined persona profile or null if no valid personas
     */
    combinePersonas(personaNames) {
        if (!personaNames || personaNames.length === 0) {
            return null;
        }

        // Check cache first (sorted keys for consistent cache lookup)
        const cacheKey = personaNames.slice().sort().join('+');
        if (this.combinationCache.has(cacheKey)) {
            return this.combinationCache.get(cacheKey);
        }

        // Load all personas
        const loadedPersonas = personaNames.map(name => this.loadPersona(name)).filter(p => p !== null);

        if (loadedPersonas.length === 0) {
            return null;
        }

        // Combined persona profile
        const combined = {
            names: personaNames,
            focus_areas: [],
            priorities: {},
            confidence_modifiers: { kb: 0, agent: 0, plan: 0 },
            recommendation_adjustments: [],
            agent_priority_boost: [],
            kb_pattern_boost: []
        };

        // Merge logic
        loadedPersonas.forEach((persona, index) => {
            // 1. focus_areas: Union (combine all unique areas)
            combined.focus_areas.push(...persona.focus_areas);

            // 2. priorities: Weighted average (decay 20% per index)
            const weight = 1.0 - (index * 0.2);
            Object.entries(persona.priorities).forEach(([key, value]) => {
                combined.priorities[key] = (combined.priorities[key] || 0) + (value * weight);
            });

            // 3. confidence_modifiers: Maximum (highest bar wins)
            combined.confidence_modifiers.kb = Math.max(combined.confidence_modifiers.kb, persona.confidence_modifiers.kb);
            combined.confidence_modifiers.agent = Math.max(combined.confidence_modifiers.agent, persona.confidence_modifiers.agent);
            combined.confidence_modifiers.plan = Math.max(combined.confidence_modifiers.plan, persona.confidence_modifiers.plan);

            // 4. recommendation_adjustments: Concatenation (all adjustments apply)
            if (persona.recommendation_adjustments) {
                combined.recommendation_adjustments.push(persona.recommendation_adjustments);
            }

            // 5. agent_priority_boost: Union (all boosted agents included)
            if (persona.agent_priority_boost) {
                combined.agent_priority_boost.push(...persona.agent_priority_boost);
            }

            // 6. kb_pattern_boost: Union (all boosted patterns included)
            if (persona.kb_pattern_boost) {
                combined.kb_pattern_boost.push(...persona.kb_pattern_boost);
            }
        });

        // Remove duplicates
        combined.focus_areas = [...new Set(combined.focus_areas)];
        combined.agent_priority_boost = [...new Set(combined.agent_priority_boost)];
        combined.kb_pattern_boost = [...new Set(combined.kb_pattern_boost)];

        // Cache combined persona
        this.combinationCache.set(cacheKey, combined);

        console.log(`[PersonaManager] Combined ${personaNames.join('+')} → ${combined.focus_areas.length} focus areas`);

        return combined;
    }

    /**
     * Adjust recommendation based on persona combination
     * @param {string} recommendation - Base recommendation
     * @param {Array<string>} personaNames - Persona names
     * @returns {string} - Adjusted recommendation with persona-specific advice
     */
    adjustRecommendation(recommendation, personaNames) {
        const combined = this.combinePersonas(personaNames);

        if (!combined) {
            return recommendation;
        }

        let adjusted = recommendation;

        // Append persona adjustments
        combined.recommendation_adjustments.forEach(adjustment => {
            if (adjustment.prefix) {
                adjusted += `\n\n${adjustment.prefix}`;
            }

            if (adjustment.emphasis && adjustment.emphasis.length > 0) {
                adjusted += '\n' + adjustment.emphasis.map(e => `- ${e}`).join('\n');
            }

            if (adjustment.warnings && adjustment.warnings.length > 0) {
                adjusted += '\n\n⚠️ Warnings:';
                adjusted += '\n' + adjustment.warnings.map(w => `- ${w}`).join('\n');
            }

            if (adjustment.metrics && adjustment.metrics.length > 0) {
                adjusted += '\n\n📊 Target Metrics:';
                adjusted += '\n' + adjustment.metrics.map(m => `- ${m}`).join('\n');
            }
        });

        // Update stats
        this.stats.total_requests++;
        personaNames.forEach(name => {
            this.stats.persona_requests[name] = (this.stats.persona_requests[name] || 0) + 1;
        });

        const combinationKey = personaNames.slice().sort().join('+');
        this.stats.combination_patterns[combinationKey] = (this.stats.combination_patterns[combinationKey] || 0) + 1;

        return adjusted;
    }

    /**
     * Get confidence threshold adjustment for personas
     * @param {Array<string>} personaNames - Persona names
     * @returns {object} - Confidence modifiers { kb, agent, plan }
     */
    getConfidenceModifiers(personaNames) {
        const combined = this.combinePersonas(personaNames);

        if (!combined) {
            return { kb: 0, agent: 0, plan: 0 };
        }

        return combined.confidence_modifiers;
    }

    /**
     * Get boosted agents for personas
     * @param {Array<string>} personaNames - Persona names
     * @returns {Array<string>} - Agent names to prioritize in routing
     */
    getBoostedAgents(personaNames) {
        const combined = this.combinePersonas(personaNames);

        if (!combined) {
            return [];
        }

        return combined.agent_priority_boost;
    }

    /**
     * Get boosted KB patterns for personas
     * @param {Array<string>} personaNames - Persona names
     * @returns {Array<string>} - KB pattern keywords to prioritize
     */
    getBoostedPatterns(personaNames) {
        const combined = this.combinePersonas(personaNames);

        if (!combined) {
            return [];
        }

        return combined.kb_pattern_boost;
    }

    /**
     * Get persona usage statistics
     * @returns {object} - Usage statistics with top personas and combinations
     */
    getStatistics() {
        return {
            total_requests: this.stats.total_requests,
            persona_requests: this.stats.persona_requests,
            combination_patterns: this.stats.combination_patterns,
            top_personas: Object.entries(this.stats.persona_requests)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count })),
            top_combinations: Object.entries(this.stats.combination_patterns)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([combo, count]) => ({ combo, count }))
        };
    }

    /**
     * Reset statistics (for testing)
     */
    resetStatistics() {
        this.stats = {
            persona_requests: {},
            combination_patterns: {},
            total_requests: 0
        };
    }
}

module.exports = PersonaManager;
