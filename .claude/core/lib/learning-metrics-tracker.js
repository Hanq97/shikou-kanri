/**
 * LearningMetricsTracker - Tracks learning system effectiveness
 * Week 6 Day 4: Learning System Implementation
 *
 * Responsibilities:
 * - Track pattern extraction metrics
 * - Track pattern reuse metrics
 * - Track quality improvement metrics
 * - Calculate composite learning effectiveness score
 * - Visualize metrics with CLI dashboard
 * - Analyze trends over time
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class LearningMetricsTracker {
    constructor(options = {}) {
        this.metricsPath = options.metricsPath || path.join(__dirname, '../.claude/memory-bank/eps-enhancement/week-6/metrics/learning-metrics.json');
        this.data = null; // Loaded lazily
    }

    /**
     * Load metrics data from file
     * @returns {Object} Metrics data
     */
    async loadMetrics() {
        if (this.data) return this.data;

        try {
            if (fsSync.existsSync(this.metricsPath)) {
                const content = await fs.readFile(this.metricsPath, 'utf-8');
                this.data = JSON.parse(content);
            } else {
                // Initialize with default structure
                this.data = this.createDefaultMetrics();
            }
            return this.data;
        } catch (error) {
            console.error('Failed to load metrics:', error.message);
            this.data = this.createDefaultMetrics();
            return this.data;
        }
    }

    /**
     * Create default metrics structure
     * @returns {Object} Default metrics
     */
    createDefaultMetrics() {
        return {
            metadata: {
                version: '1.0.0',
                created: new Date().toISOString().substring(0, 10),
                updated: new Date().toISOString().substring(0, 10)
            },
            extraction: {
                totalPlansAnalyzed: 0,
                patternsExtracted: 0,
                antiPatternsIdentified: 0,
                patternsAddedToKB: 0,
                patternsDuplicate: 0,
                patternsRejected: 0,
                extractionEfficiency: 0
            },
            reuse: {
                plansGenerated: 0,
                plansUsingLearnedPatterns: 0,
                reuseRate: 0,
                averagePatternsPerPlan: 0,
                totalPatternsApplied: 0
            },
            quality: {
                before: {
                    avgConfidence: 0,
                    avgCompleteness: 0,
                    planSuccessRate: 0,
                    avgTime: 0
                },
                after: {
                    avgConfidence: 0,
                    avgCompleteness: 0,
                    planSuccessRate: 0,
                    avgTime: 0
                },
                improvement: {
                    confidence: 0,
                    completeness: 0,
                    successRate: 0,
                    time: 0
                }
            },
            composite: {
                learningEffectiveness: 0,
                score: 'N/A'
            },
            history: []
        };
    }

    /**
     * Record pattern extraction metrics
     * @param {Object} extraction - Extraction metrics
     */
    async recordExtraction(extraction) {
        await this.loadMetrics();

        this.data.extraction = {
            totalPlansAnalyzed: extraction.totalPlansAnalyzed || 0,
            patternsExtracted: extraction.patternsExtracted || 0,
            antiPatternsIdentified: extraction.antiPatternsIdentified || 0,
            patternsAddedToKB: extraction.patternsAddedToKB || 0,
            patternsDuplicate: extraction.patternsDuplicate || 0,
            patternsRejected: extraction.patternsRejected || 0,
            extractionEfficiency: this.calculateExtractionEfficiency(extraction)
        };

        this.data.metadata.updated = new Date().toISOString().substring(0, 10);
        await this.save();
    }

    /**
     * Calculate extraction efficiency
     * @param {Object} extraction - Extraction metrics
     * @returns {number} Efficiency percentage
     */
    calculateExtractionEfficiency(extraction) {
        if (!extraction.patternsExtracted || extraction.patternsExtracted === 0) return 0;
        return parseFloat((extraction.patternsAddedToKB / extraction.patternsExtracted * 100).toFixed(1));
    }

    /**
     * Record pattern reuse metrics
     * @param {Object} reuse - Reuse metrics
     */
    async recordReuse(reuse) {
        await this.loadMetrics();

        this.data.reuse = {
            plansGenerated: reuse.plansGenerated || 0,
            plansUsingLearnedPatterns: reuse.plansUsingLearnedPatterns || 0,
            reuseRate: this.calculateReuseRate(reuse),
            averagePatternsPerPlan: this.calculateAvgPatternsPerPlan(reuse),
            totalPatternsApplied: reuse.totalPatternsApplied || 0
        };

        this.data.metadata.updated = new Date().toISOString().substring(0, 10);
        await this.save();
    }

    /**
     * Calculate reuse rate
     * @param {Object} reuse - Reuse metrics
     * @returns {number} Reuse rate percentage
     */
    calculateReuseRate(reuse) {
        if (!reuse.plansGenerated || reuse.plansGenerated === 0) return 0;
        return parseFloat((reuse.plansUsingLearnedPatterns / reuse.plansGenerated * 100).toFixed(1));
    }

    /**
     * Calculate average patterns per plan
     * @param {Object} reuse - Reuse metrics
     * @returns {number} Average patterns per plan
     */
    calculateAvgPatternsPerPlan(reuse) {
        if (!reuse.plansGenerated || reuse.plansGenerated === 0) return 0;
        return parseFloat((reuse.totalPatternsApplied / reuse.plansGenerated).toFixed(1));
    }

    /**
     * Record quality improvement metrics
     * @param {Object} before - Quality metrics before learning
     * @param {Object} after - Quality metrics after learning
     */
    async recordQuality(before, after) {
        await this.loadMetrics();

        this.data.quality = {
            before: {
                avgConfidence: before.avgConfidence || 0,
                avgCompleteness: before.avgCompleteness || 0,
                planSuccessRate: before.planSuccessRate || 0,
                avgTime: before.avgTime || 0
            },
            after: {
                avgConfidence: after.avgConfidence || 0,
                avgCompleteness: after.avgCompleteness || 0,
                planSuccessRate: after.planSuccessRate || 0,
                avgTime: after.avgTime || 0
            },
            improvement: {
                confidence: parseFloat((after.avgConfidence - before.avgConfidence).toFixed(1)),
                completeness: parseFloat((after.avgCompleteness - before.avgCompleteness).toFixed(1)),
                successRate: parseFloat((after.planSuccessRate - before.planSuccessRate).toFixed(1)),
                time: parseFloat((after.avgTime - before.avgTime).toFixed(1))
            }
        };

        // Calculate composite score
        this.calculateComposite();

        this.data.metadata.updated = new Date().toISOString().substring(0, 10);
        await this.save();
    }

    /**
     * Calculate composite learning effectiveness score
     */
    calculateComposite() {
        const { improvement } = this.data.quality;
        const { reuseRate } = this.data.reuse;
        const { planSuccessRate } = this.data.quality.after;

        // Formula: weighted average of normalized improvements
        const confidenceScore = Math.min(improvement.confidence / 5, 1) * 0.3;  // 30% weight
        const completenessScore = Math.min(improvement.completeness / 7, 1) * 0.2;  // 20% weight
        const reuseScore = Math.min(Math.max(reuseRate - 60, 0) / 40, 1) * 0.3;  // 30% weight
        const successScore = Math.min(Math.max(planSuccessRate - 95, 0) / 5, 1) * 0.2;  // 20% weight

        const score = confidenceScore + completenessScore + reuseScore + successScore;

        this.data.composite = {
            learningEffectiveness: parseFloat(score.toFixed(2)),
            score: this.interpretScore(score)
        };
    }

    /**
     * Interpret composite score
     * @param {number} score - Composite score
     * @returns {string} Score interpretation
     */
    interpretScore(score) {
        if (score >= 0.90) return 'Excellent';
        if (score >= 0.75) return 'Good';
        if (score >= 0.60) return 'Moderate';
        return 'Poor';
    }

    /**
     * Save metrics to file
     */
    async save() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.metricsPath);
            await fs.mkdir(dir, { recursive: true });

            // Save snapshot to history
            this.data.history.push({
                date: new Date().toISOString().substring(0, 10),
                snapshot: {
                    extraction: { ...this.data.extraction },
                    reuse: { ...this.data.reuse },
                    quality: JSON.parse(JSON.stringify(this.data.quality)),
                    composite: { ...this.data.composite }
                }
            });

            // Keep only last 30 days of history
            if (this.data.history.length > 30) {
                this.data.history = this.data.history.slice(-30);
            }

            await fs.writeFile(this.metricsPath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save metrics:', error.message);
        }
    }

    /**
     * Display CLI dashboard
     */
    async displayDashboard() {
        await this.loadMetrics();

        console.log('\n' + '='.repeat(70));
        console.log('📊 LEARNING METRICS DASHBOARD');
        console.log('='.repeat(70));

        // Pattern Extraction
        this.displayExtractionMetrics();

        // Pattern Reuse
        this.displayReuseMetrics();

        // Quality Improvement
        this.displayQualityMetrics();

        // Composite Score
        this.displayCompositeScore();

        // Trends
        this.displayTrends();

        console.log('='.repeat(70) + '\n');
    }

    /**
     * Display extraction metrics section
     */
    displayExtractionMetrics() {
        const { extraction } = this.data;

        console.log('\n📊 PATTERN EXTRACTION');
        console.log('-'.repeat(70));
        console.log(`Total Plans Analyzed:      ${extraction.totalPlansAnalyzed}`);
        console.log(`Patterns Extracted:        ${extraction.patternsExtracted} ${this.checkmark(extraction.patternsExtracted >= 20)}`);
        console.log(`Anti-Patterns Identified:  ${extraction.antiPatternsIdentified} ${this.checkmark(extraction.antiPatternsIdentified >= 4)}`);
        console.log(`Patterns Added to KB:      ${extraction.patternsAddedToKB}`);
        console.log(`Duplicates:                ${extraction.patternsDuplicate} (${this.percentage(extraction.patternsDuplicate, extraction.patternsExtracted)})`);
        console.log(`Rejected:                  ${extraction.patternsRejected} (${this.percentage(extraction.patternsRejected, extraction.patternsExtracted)})`);
        console.log(`Extraction Efficiency:     ${extraction.extractionEfficiency}% ${this.checkmark(extraction.extractionEfficiency >= 80)}`);
    }

    /**
     * Display reuse metrics section
     */
    displayReuseMetrics() {
        const { reuse } = this.data;

        console.log('\n📈 PATTERN REUSE');
        console.log('-'.repeat(70));
        console.log(`Plans Generated:           ${reuse.plansGenerated}`);
        console.log(`Plans Using Learned:       ${reuse.plansUsingLearnedPatterns} (${reuse.reuseRate}%) ${this.checkmark(reuse.reuseRate >= 60)}`);
        console.log(`Reuse Rate:                ${reuse.reuseRate}% ${this.checkmark(reuse.reuseRate >= 60)} (target: ≥60%)`);
        console.log(`Avg Patterns/Plan:         ${reuse.averagePatternsPerPlan} ${this.checkmark(reuse.averagePatternsPerPlan >= 3)}`);
        console.log(`Total Patterns Applied:    ${reuse.totalPatternsApplied}`);
    }

    /**
     * Display quality metrics section
     */
    displayQualityMetrics() {
        const { quality } = this.data;

        console.log('\n📈 QUALITY IMPROVEMENT');
        console.log('-'.repeat(70));
        console.log('Metric                     Before    After     Improvement');
        console.log('-'.repeat(70));
        console.log(`Confidence:                ${this.formatPercent(quality.before.avgConfidence)}    ${this.formatPercent(quality.after.avgConfidence)}    ${this.formatDelta(quality.improvement.confidence)}% ${this.checkmark(quality.improvement.confidence >= 3)}`);
        console.log(`Completeness:              ${this.formatPercent(quality.before.avgCompleteness)}    ${this.formatPercent(quality.after.avgCompleteness)}    ${this.formatDelta(quality.improvement.completeness)}% ${this.checkmark(quality.improvement.completeness >= 3)}`);
        console.log(`Success Rate:              ${this.formatPercent(quality.before.planSuccessRate)}    ${this.formatPercent(quality.after.planSuccessRate)}    ${this.formatDelta(quality.improvement.successRate)}% ${this.checkmark(quality.improvement.successRate >= 0)}`);
        console.log(`Time (minutes):            ${this.formatNumber(quality.before.avgTime)}     ${this.formatNumber(quality.after.avgTime)}     ${this.formatDelta(quality.improvement.time)} ${this.checkmark(quality.improvement.time < 0)}`);
    }

    /**
     * Display composite score section
     */
    displayCompositeScore() {
        const { composite } = this.data;

        console.log('\n🎯 OVERALL LEARNING EFFECTIVENESS');
        console.log('-'.repeat(70));
        console.log(`Score:                     ${composite.learningEffectiveness} ${this.checkmark(composite.learningEffectiveness >= 0.75)} (${composite.score})`);
        console.log(`Interpretation:            ${this.getInterpretationMessage(composite.score)}`);
    }

    /**
     * Display trends section
     */
    displayTrends() {
        const { history } = this.data;

        if (!history || history.length < 2) {
            console.log('\n📅 TRENDS');
            console.log('-'.repeat(70));
            console.log('Not enough data for trend analysis (minimum 2 data points)');
            return;
        }

        console.log('\n📅 TRENDS (Last 7 Days)');
        console.log('-'.repeat(70));

        const recent = history.slice(-7);
        console.log('Date       | Confidence | Reuse Rate | Effectiveness');
        console.log('-'.repeat(70));

        recent.forEach(entry => {
            const conf = entry.snapshot.quality.after.avgConfidence || 0;
            const reuse = entry.snapshot.reuse.reuseRate || 0;
            const effectiveness = entry.snapshot.composite.learningEffectiveness || 0;

            console.log(`${entry.date} | ${this.formatPercent(conf)}     | ${this.formatPercent(reuse)}     | ${effectiveness.toFixed(2)}`);
        });
    }

    /**
     * Helper: Format percentage
     */
    formatPercent(value) {
        return value.toFixed(1).padStart(5, ' ');
    }

    /**
     * Helper: Format number
     */
    formatNumber(value) {
        return value.toFixed(1).padStart(5, ' ');
    }

    /**
     * Helper: Format delta with sign
     */
    formatDelta(value) {
        const sign = value >= 0 ? '+' : '';
        return sign + value.toFixed(1).padStart(4, ' ');
    }

    /**
     * Helper: Calculate percentage
     */
    percentage(value, total) {
        if (!total || total === 0) return '0%';
        return `${(value / total * 100).toFixed(1)}%`;
    }

    /**
     * Helper: Checkmark for success
     */
    checkmark(condition) {
        return condition ? '✅' : '⚠️';
    }

    /**
     * Helper: Get interpretation message
     */
    getInterpretationMessage(score) {
        const messages = {
            'Excellent': 'Learning is highly effective',
            'Good': 'Learning is effective',
            'Moderate': 'Learning is somewhat effective',
            'Poor': 'Learning is not effective'
        };
        return messages[score] || 'N/A';
    }

    /**
     * Export metrics to CSV
     * @param {string} outputPath - Output file path
     */
    async exportToCSV(outputPath) {
        await this.loadMetrics();

        const rows = [
            ['Date', 'Confidence Before', 'Confidence After', 'Improvement', 'Reuse Rate', 'Effectiveness Score']
        ];

        this.data.history.forEach(entry => {
            rows.push([
                entry.date,
                entry.snapshot.quality.before.avgConfidence,
                entry.snapshot.quality.after.avgConfidence,
                entry.snapshot.quality.improvement.confidence,
                entry.snapshot.reuse.reuseRate,
                entry.snapshot.composite.learningEffectiveness
            ]);
        });

        const csv = rows.map(row => row.join(',')).join('\n');
        await fs.writeFile(outputPath, csv, 'utf-8');
    }
}

module.exports = { LearningMetricsTracker };
