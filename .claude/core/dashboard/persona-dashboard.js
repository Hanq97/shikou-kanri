const fs = require('fs');
const path = require('path');

/**
 * PersonaDashboard - Usage Monitoring and Analytics for Cognitive Personas
 *
 * Provides:
 * - Persona usage statistics (frequency)
 * - Most common persona combinations
 * - Effectiveness metrics (recommendation quality)
 * - Recommendation quality by persona
 *
 * Version: 1.0.0
 * Date: 2025-12-26
 */
class PersonaDashboard {
    constructor() {
        this.dataFile = path.join(__dirname, '..', '.claude', 'data', 'persona-usage.json');
        this.data = this.loadData();

        console.log('[PersonaDashboard] Initialized');
    }

    /**
     * Load persona usage data from file
     * @returns {object} - Usage data
     */
    loadData() {
        try {
            const dataDir = path.dirname(this.dataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            if (fs.existsSync(this.dataFile)) {
                const content = fs.readFileSync(this.dataFile, 'utf8');
                return JSON.parse(content);
            } else {
                // Initialize empty data structure
                return {
                    persona_usage: {},      // { 'security': { count: 15, total_confidence: 1350, avg_confidence: 90 } }
                    combinations: {},       // { 'security+testing': { count: 5, total_confidence: 450, avg_confidence: 90 } }
                    sessions: [],           // [{ timestamp, personas, confidence, recommendation_quality }]
                    total_sessions: 0
                };
            }
        } catch (error) {
            console.error('[PersonaDashboard] Failed to load data:', error.message);
            return { persona_usage: {}, combinations: {}, sessions: [], total_sessions: 0 };
        }
    }

    /**
     * Save persona usage data to file
     */
    saveData() {
        try {
            const dataDir = path.dirname(this.dataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
            console.log('[PersonaDashboard] Data saved successfully');
        } catch (error) {
            console.error('[PersonaDashboard] Failed to save data:', error.message);
        }
    }

    /**
     * Track persona usage in a session
     * @param {Array<string>} personas - Persona names used
     * @param {number} confidence - Overall confidence score (0-100)
     * @param {number} recommendationQuality - Quality score (0-100)
     */
    trackUsage(personas, confidence, recommendationQuality) {
        const timestamp = new Date().toISOString();

        // Track individual personas
        personas.forEach(persona => {
            if (!this.data.persona_usage[persona]) {
                this.data.persona_usage[persona] = {
                    count: 0,
                    total_confidence: 0,
                    avg_confidence: 0,
                    total_quality: 0,
                    avg_quality: 0
                };
            }

            const usage = this.data.persona_usage[persona];
            usage.count++;
            usage.total_confidence += confidence;
            usage.avg_confidence = Math.round(usage.total_confidence / usage.count * 100) / 100;
            usage.total_quality += recommendationQuality;
            usage.avg_quality = Math.round(usage.total_quality / usage.count * 100) / 100;
        });

        // Track combinations (if multiple personas)
        if (personas.length > 1) {
            const combinationKey = personas.sort().join('+');
            if (!this.data.combinations[combinationKey]) {
                this.data.combinations[combinationKey] = {
                    count: 0,
                    total_confidence: 0,
                    avg_confidence: 0,
                    total_quality: 0,
                    avg_quality: 0
                };
            }

            const combo = this.data.combinations[combinationKey];
            combo.count++;
            combo.total_confidence += confidence;
            combo.avg_confidence = Math.round(combo.total_confidence / combo.count * 100) / 100;
            combo.total_quality += recommendationQuality;
            combo.avg_quality = Math.round(combo.total_quality / combo.count * 100) / 100;
        }

        // Track session
        this.data.sessions.push({
            timestamp,
            personas: personas.sort(),
            confidence,
            recommendation_quality: recommendationQuality
        });

        this.data.total_sessions++;

        // Keep only last 1000 sessions (prevent file bloat)
        if (this.data.sessions.length > 1000) {
            this.data.sessions = this.data.sessions.slice(-1000);
        }

        this.saveData();
    }

    /**
     * Get persona usage statistics
     * @returns {object} - Usage statistics
     */
    getUsageStats() {
        const stats = {
            total_sessions: this.data.total_sessions,
            personas: [],
            combinations: []
        };

        // Sort personas by usage count
        stats.personas = Object.entries(this.data.persona_usage)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);

        // Sort combinations by usage count
        stats.combinations = Object.entries(this.data.combinations)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);

        return stats;
    }

    /**
     * Get effectiveness metrics for a specific persona
     * @param {string} persona - Persona name
     * @returns {object} - Effectiveness metrics
     */
    getEffectivenessMetrics(persona) {
        if (!this.data.persona_usage[persona]) {
            return null;
        }

        const usage = this.data.persona_usage[persona];
        const sessions = this.data.sessions.filter(s => s.personas.includes(persona));

        // Calculate confidence distribution
        const confidenceDistribution = {
            'high (90-100)': sessions.filter(s => s.confidence >= 90).length,
            'medium (70-89)': sessions.filter(s => s.confidence >= 70 && s.confidence < 90).length,
            'low (<70)': sessions.filter(s => s.confidence < 70).length
        };

        // Calculate quality distribution
        const qualityDistribution = {
            'high (90-100)': sessions.filter(s => s.recommendation_quality >= 90).length,
            'medium (70-89)': sessions.filter(s => s.recommendation_quality >= 70 && s.recommendation_quality < 90).length,
            'low (<70)': sessions.filter(s => s.recommendation_quality < 70).length
        };

        return {
            persona,
            total_uses: usage.count,
            avg_confidence: usage.avg_confidence,
            avg_quality: usage.avg_quality,
            confidence_distribution: confidenceDistribution,
            quality_distribution: qualityDistribution,
            recent_sessions: sessions.slice(-5).reverse() // Last 5 sessions
        };
    }

    /**
     * Get most common persona combinations
     * @param {number} limit - Number of combinations to return
     * @returns {Array} - Top combinations
     */
    getTopCombinations(limit = 5) {
        return Object.entries(this.data.combinations)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Display dashboard in CLI
     */
    displayDashboard() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 PERSONA DASHBOARD - Usage Monitoring & Analytics');
        console.log('='.repeat(80) + '\n');

        const stats = this.getUsageStats();

        // Overall Statistics
        console.log('📈 OVERALL STATISTICS');
        console.log('-'.repeat(80));
        console.log(`Total Sessions: ${stats.total_sessions}`);
        console.log(`Unique Personas Used: ${stats.personas.length}`);
        console.log(`Unique Combinations: ${stats.combinations.length}\n`);

        // Persona Usage Ranking
        console.log('🏆 PERSONA USAGE RANKING');
        console.log('-'.repeat(80));
        console.log('Rank | Persona        | Count | Avg Confidence | Avg Quality');
        console.log('-'.repeat(80));

        stats.personas.slice(0, 9).forEach((p, index) => {
            const rank = `${index + 1}`.padEnd(4);
            const name = p.name.padEnd(14);
            const count = `${p.count}`.padEnd(5);
            const conf = `${p.avg_confidence}%`.padEnd(14);
            const qual = `${p.avg_quality}%`;
            console.log(`${rank} | ${name} | ${count} | ${conf} | ${qual}`);
        });

        console.log('');

        // Top Combinations
        if (stats.combinations.length > 0) {
            console.log('🔗 TOP PERSONA COMBINATIONS');
            console.log('-'.repeat(80));
            console.log('Rank | Combination              | Count | Avg Confidence | Avg Quality');
            console.log('-'.repeat(80));

            stats.combinations.slice(0, 5).forEach((c, index) => {
                const rank = `${index + 1}`.padEnd(4);
                const name = c.name.padEnd(24);
                const count = `${c.count}`.padEnd(5);
                const conf = `${c.avg_confidence}%`.padEnd(14);
                const qual = `${c.avg_quality}%`;
                console.log(`${rank} | ${name} | ${count} | ${conf} | ${qual}`);
            });

            console.log('');
        }

        // Effectiveness Analysis (top 3 personas)
        console.log('⚡ EFFECTIVENESS ANALYSIS (Top 3 Personas)');
        console.log('-'.repeat(80));

        stats.personas.slice(0, 3).forEach(p => {
            const metrics = this.getEffectivenessMetrics(p.name);
            if (metrics) {
                console.log(`\n${p.name.toUpperCase()} PERSONA:`);
                console.log(`  Total Uses: ${metrics.total_uses}`);
                console.log(`  Avg Confidence: ${metrics.avg_confidence}%`);
                console.log(`  Avg Quality: ${metrics.avg_quality}%`);
                console.log(`  Confidence Distribution:`);
                console.log(`    - High (90-100): ${metrics.confidence_distribution['high (90-100)']} sessions`);
                console.log(`    - Medium (70-89): ${metrics.confidence_distribution['medium (70-89)']} sessions`);
                console.log(`    - Low (<70): ${metrics.confidence_distribution['low (<70)']} sessions`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('📊 Dashboard generated successfully');
        console.log('='.repeat(80) + '\n');
    }

    /**
     * Export dashboard data as JSON
     * @param {string} outputPath - Output file path
     */
    exportJSON(outputPath) {
        const stats = this.getUsageStats();

        const exportData = {
            generated_at: new Date().toISOString(),
            total_sessions: stats.total_sessions,
            persona_usage: stats.personas,
            combinations: stats.combinations,
            recent_sessions: this.data.sessions.slice(-20).reverse() // Last 20 sessions
        };

        try {
            fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
            console.log(`[PersonaDashboard] Data exported to ${outputPath}`);
        } catch (error) {
            console.error('[PersonaDashboard] Failed to export data:', error.message);
        }
    }

    /**
     * Clear all usage data (use with caution!)
     */
    clearData() {
        this.data = {
            persona_usage: {},
            combinations: {},
            sessions: [],
            total_sessions: 0
        };
        this.saveData();
        console.log('[PersonaDashboard] All usage data cleared');
    }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

if (require.main === module) {
    const dashboard = new PersonaDashboard();

    const args = process.argv.slice(2);
    const command = args[0] || 'display';

    switch (command) {
        case 'display':
            dashboard.displayDashboard();
            break;

        case 'export':
            const outputPath = args[1] || './persona-dashboard-export.json';
            dashboard.exportJSON(outputPath);
            break;

        case 'clear':
            console.log('⚠️  WARNING: This will clear all persona usage data.');
            console.log('Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');
            setTimeout(() => {
                dashboard.clearData();
                console.log('✅ Data cleared successfully');
            }, 3000);
            break;

        case 'test':
            // Generate test data
            console.log('Generating test data...\n');
            const personas = ['security', 'testing', 'architect', 'frontend', 'backend', 'database', 'performance', 'documentation', 'devops'];

            // Single persona tests (30 sessions)
            for (let i = 0; i < 30; i++) {
                const persona = personas[i % personas.length];
                const confidence = 70 + Math.random() * 30; // 70-100
                const quality = 75 + Math.random() * 25; // 75-100
                dashboard.trackUsage([persona], confidence, quality);
            }

            // Combination tests (20 sessions)
            for (let i = 0; i < 20; i++) {
                const persona1 = personas[Math.floor(Math.random() * personas.length)];
                let persona2 = personas[Math.floor(Math.random() * personas.length)];
                while (persona2 === persona1) {
                    persona2 = personas[Math.floor(Math.random() * personas.length)];
                }
                const confidence = 80 + Math.random() * 20; // 80-100
                const quality = 85 + Math.random() * 15; // 85-100
                dashboard.trackUsage([persona1, persona2], confidence, quality);
            }

            console.log('✅ Test data generated (50 sessions)');
            dashboard.displayDashboard();
            break;

        default:
            console.log('Usage:');
            console.log('  node persona-dashboard.js display      # Display dashboard');
            console.log('  node persona-dashboard.js export [path] # Export to JSON');
            console.log('  node persona-dashboard.js test         # Generate test data');
            console.log('  node persona-dashboard.js clear        # Clear all data');
    }
}

module.exports = PersonaDashboard;
