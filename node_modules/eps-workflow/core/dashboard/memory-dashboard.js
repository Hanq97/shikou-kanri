#!/usr/bin/env node
/**
 * Memory Enhancement Dashboard - Visualize memory enhancement statistics
 * Week 6 Day 5: Dashboard & Deployment
 *
 * CLI Commands:
 * - node memory-dashboard.js main          # Main overview
 * - node memory-dashboard.js patterns      # Pattern analysis
 * - node memory-dashboard.js trends        # Learning trends
 * - node memory-dashboard.js roi           # ROI calculation
 * - node memory-dashboard.js export        # Export data
 */

const fs = require('fs');
const path = require('path');
const { LearningMetricsTracker } = require('../lib/learning-metrics-tracker');
const { PatternReuseEngine } = require('../pattern/pattern-reuse-engine');

class MemoryDashboard {
    constructor() {
        this.metricsPath = path.join(__dirname, '../.claude/memory-bank/eps-enhancement/week-6/metrics/learning-metrics.json');
        this.kbPath = path.join(__dirname, 'knowledge-base');
        this.tracker = new LearningMetricsTracker({ metricsPath: this.metricsPath });
        this.engine = new PatternReuseEngine({ kbPath: this.kbPath });
    }

    /**
     * Display main dashboard overview
     */
    async displayMain() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 MEMORY ENHANCEMENT DASHBOARD - OVERVIEW');
        console.log('='.repeat(80));

        await this.tracker.loadMetrics();
        const metrics = this.tracker.data;

        // Summary Statistics
        this.displaySummary(metrics);

        // Pattern Extraction
        this.displayExtractionSummary(metrics.extraction);

        // Pattern Reuse
        this.displayReuseSummary(metrics.reuse);

        // Quality Improvement
        this.displayQualitySummary(metrics.quality);

        // KB Growth
        await this.displayKBGrowth();

        // Learning Effectiveness
        this.displayLearningEffectiveness(metrics.composite);

        console.log('='.repeat(80) + '\n');
    }

    /**
     * Display summary statistics
     */
    displaySummary(metrics) {
        console.log('\n📈 SUMMARY STATISTICS');
        console.log('-'.repeat(80));

        const summary = [
            ['Total Patterns Extracted', metrics.extraction.patternsExtracted, ''],
            ['Patterns Added to KB', metrics.extraction.patternsAddedToKB, ''],
            ['Pattern Reuse Rate', `${metrics.reuse.reuseRate}%`, metrics.reuse.reuseRate >= 60 ? '✅' : '⚠️'],
            ['Confidence Improvement', `+${metrics.quality.improvement.confidence}%`, metrics.quality.improvement.confidence >= 3 ? '✅' : '⚠️'],
            ['Learning Effectiveness', metrics.composite.learningEffectiveness, metrics.composite.learningEffectiveness >= 0.75 ? '✅' : metrics.composite.learningEffectiveness >= 0.60 ? '⚠️' : '❌']
        ];

        summary.forEach(([label, value, status]) => {
            console.log(`  ${label.padEnd(30)} ${String(value).padStart(10)} ${status}`);
        });
    }

    /**
     * Display extraction summary
     */
    displayExtractionSummary(extraction) {
        console.log('\n📊 PATTERN EXTRACTION');
        console.log('-'.repeat(80));

        console.log(`  Plans Analyzed:           ${extraction.totalPlansAnalyzed}`);
        console.log(`  Patterns Extracted:       ${extraction.patternsExtracted}`);
        console.log(`  Anti-Patterns:            ${extraction.antiPatternsIdentified}`);
        console.log(`  Extraction Efficiency:    ${extraction.extractionEfficiency}% ${extraction.extractionEfficiency >= 80 ? '✅' : '⚠️'}`);
    }

    /**
     * Display reuse summary
     */
    displayReuseSummary(reuse) {
        console.log('\n📈 PATTERN REUSE');
        console.log('-'.repeat(80));

        console.log(`  Plans Generated:          ${reuse.plansGenerated}`);
        console.log(`  Plans Using Patterns:     ${reuse.plansUsingLearnedPatterns} (${reuse.reuseRate}%)`);
        console.log(`  Avg Patterns/Plan:        ${reuse.averagePatternsPerPlan}`);
        console.log(`  Total Patterns Applied:   ${reuse.totalPatternsApplied}`);
    }

    /**
     * Display quality summary
     */
    displayQualitySummary(quality) {
        console.log('\n📈 QUALITY IMPROVEMENT');
        console.log('-'.repeat(80));

        const improvements = [
            ['Confidence', quality.before.avgConfidence, quality.after.avgConfidence, quality.improvement.confidence],
            ['Completeness', quality.before.avgCompleteness, quality.after.avgCompleteness, quality.improvement.completeness],
            ['Success Rate', quality.before.planSuccessRate, quality.after.planSuccessRate, quality.improvement.successRate]
        ];

        console.log('  Metric            Before    After     Improvement');
        console.log('  ' + '-'.repeat(76));

        improvements.forEach(([metric, before, after, improvement]) => {
            const sign = improvement >= 0 ? '+' : '';
            const status = improvement >= 3 ? '✅' : improvement >= 0 ? '⚠️' : '❌';
            console.log(`  ${metric.padEnd(16)} ${before.toFixed(1).padStart(7)}   ${after.toFixed(1).padStart(7)}   ${sign}${improvement.toFixed(1).padStart(6)}% ${status}`);
        });
    }

    /**
     * Display KB growth
     */
    async displayKBGrowth() {
        console.log('\n📚 KNOWLEDGE BASE GROWTH');
        console.log('-'.repeat(80));

        try {
            const kbFiles = ['backend-kb.json', 'frontend-kb.json', 'database-kb.json'];
            let totalPatterns = 0;
            let totalExamples = 0;

            for (const file of kbFiles) {
                const filePath = path.join(this.kbPath, file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const kb = JSON.parse(content);

                    const patterns = Object.keys(kb).filter(k => k !== 'metadata').length;
                    const examples = Object.values(kb)
                        .filter(v => v && v.examples)
                        .reduce((sum, v) => sum + (v.examples?.length || 0), 0);

                    totalPatterns += patterns;
                    totalExamples += examples;

                    console.log(`  ${file.padEnd(20)} ${kb.metadata.version.padStart(8)}   ${String(patterns).padStart(3)} patterns   ${String(examples).padStart(3)} examples`);
                }
            }

            console.log('  ' + '-'.repeat(76));
            console.log(`  ${'TOTAL'.padEnd(20)} ${''.padStart(8)}   ${String(totalPatterns).padStart(3)} patterns   ${String(totalExamples).padStart(3)} examples`);
        } catch (error) {
            console.log('  Error loading KB files:', error.message);
        }
    }

    /**
     * Display learning effectiveness
     */
    displayLearningEffectiveness(composite) {
        console.log('\n🎯 LEARNING EFFECTIVENESS');
        console.log('-'.repeat(80));

        const score = composite.learningEffectiveness;
        const rating = composite.score;

        // ASCII bar chart
        const barLength = Math.round(score * 40);
        const bar = '█'.repeat(barLength) + '░'.repeat(40 - barLength);

        console.log(`  Score: ${score.toFixed(2)} (${rating})`);
        console.log(`  [${bar}] ${(score * 100).toFixed(0)}%`);
        console.log('');
        console.log(`  Interpretation: ${this.getInterpretation(rating)}`);
    }

    /**
     * Get interpretation message
     */
    getInterpretation(rating) {
        const messages = {
            'Excellent': 'Learning is highly effective - continue current approach',
            'Good': 'Learning is effective - minor optimizations possible',
            'Moderate': 'Learning is somewhat effective - consider improvements',
            'Poor': 'Learning is not effective - review strategy'
        };
        return messages[rating] || 'N/A';
    }

    /**
     * Display pattern analysis view
     */
    async displayPatterns() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 PATTERN ANALYSIS');
        console.log('='.repeat(80));

        // Load all patterns
        const allPatterns = await this.engine.loadAllPatterns();

        // Patterns by type
        this.displayPatternsByType(allPatterns);

        // Top 10 patterns
        this.displayTopPatterns(allPatterns);

        // Confidence distribution
        this.displayConfidenceDistribution(allPatterns);

        // Frequency distribution
        this.displayFrequencyDistribution(allPatterns);

        console.log('='.repeat(80) + '\n');
    }

    /**
     * Display patterns by type
     */
    displayPatternsByType(patterns) {
        console.log('\n📊 PATTERNS BY TYPE');
        console.log('-'.repeat(80));

        const types = {};
        patterns.forEach(p => {
            const type = p.type || p.category || 'unknown';
            types[type] = (types[type] || 0) + 1;
        });

        const total = patterns.length;
        const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);

        sortedTypes.forEach(([type, count]) => {
            const percentage = (count / total * 100).toFixed(1);
            const barLength = Math.round(count / total * 40);
            const bar = '█'.repeat(barLength);

            console.log(`  ${type.padEnd(20)} ${String(count).padStart(3)} (${percentage.padStart(5)}%) ${bar}`);
        });
    }

    /**
     * Display top 10 most reused patterns
     */
    displayTopPatterns(patterns) {
        console.log('\n📈 TOP 10 MOST REUSED PATTERNS');
        console.log('-'.repeat(80));

        const sorted = patterns
            .filter(p => p.frequency && p.frequency > 0)
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 10);

        if (sorted.length === 0) {
            console.log('  No pattern usage data available');
            return;
        }

        console.log('  Rank  Pattern Name                      Frequency  Confidence');
        console.log('  ' + '-'.repeat(76));

        sorted.forEach((p, index) => {
            const rank = String(index + 1).padStart(4);
            const name = (p.name || 'Unknown').substring(0, 30).padEnd(30);
            const freq = String(p.frequency || 0).padStart(9);
            const conf = `${(p.confidence || 0).toFixed(0)}%`.padStart(10);

            console.log(`  ${rank}  ${name}  ${freq}  ${conf}`);
        });
    }

    /**
     * Display confidence distribution
     */
    displayConfidenceDistribution(patterns) {
        console.log('\n📊 CONFIDENCE DISTRIBUTION');
        console.log('-'.repeat(80));

        const ranges = {
            '90-100%': patterns.filter(p => p.confidence >= 90).length,
            '80-89%': patterns.filter(p => p.confidence >= 80 && p.confidence < 90).length,
            '70-79%': patterns.filter(p => p.confidence >= 70 && p.confidence < 80).length,
            '<70%': patterns.filter(p => p.confidence < 70).length
        };

        const total = patterns.length;

        Object.entries(ranges).forEach(([range, count]) => {
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
            const barLength = total > 0 ? Math.round(count / total * 40) : 0;
            const bar = '█'.repeat(barLength);

            console.log(`  ${range.padEnd(10)} ${String(count).padStart(3)} (${percentage.padStart(5)}%) ${bar}`);
        });
    }

    /**
     * Display frequency distribution
     */
    displayFrequencyDistribution(patterns) {
        console.log('\n📊 FREQUENCY DISTRIBUTION');
        console.log('-'.repeat(80));

        const ranges = {
            'Very High (90-100%)': patterns.filter(p => p.frequency >= 90).length,
            'High (70-89%)': patterns.filter(p => p.frequency >= 70 && p.frequency < 90).length,
            'Medium (50-69%)': patterns.filter(p => p.frequency >= 50 && p.frequency < 70).length,
            'Low (<50%)': patterns.filter(p => p.frequency < 50).length
        };

        const total = patterns.length;

        Object.entries(ranges).forEach(([range, count]) => {
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
            const barLength = total > 0 ? Math.round(count / total * 40) : 0;
            const bar = '█'.repeat(barLength);

            console.log(`  ${range.padEnd(22)} ${String(count).padStart(3)} (${percentage.padStart(5)}%) ${bar}`);
        });
    }

    /**
     * Display learning trends over time
     */
    async displayTrends(days = 30) {
        console.log('\n' + '='.repeat(80));
        console.log(`📈 LEARNING TRENDS (Last ${days} Days)`);
        console.log('='.repeat(80));

        await this.tracker.loadMetrics();
        const history = this.tracker.data.history || [];

        if (history.length === 0) {
            console.log('\nNo historical data available');
            console.log('='.repeat(80) + '\n');
            return;
        }

        // Filter by days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const filtered = history.filter(h => new Date(h.date) >= cutoffDate);

        if (filtered.length === 0) {
            console.log(`\nNo data in the last ${days} days`);
            console.log('='.repeat(80) + '\n');
            return;
        }

        // Confidence trend
        this.displayConfidenceTrend(filtered);

        // Reuse rate trend
        this.displayReuseRateTrend(filtered);

        // Effectiveness trend
        this.displayEffectivenessTrend(filtered);

        console.log('='.repeat(80) + '\n');
    }

    /**
     * Display confidence trend
     */
    displayConfidenceTrend(history) {
        console.log('\n📈 CONFIDENCE IMPROVEMENT TREND');
        console.log('-'.repeat(80));

        console.log('Date         Before    After     Improvement');
        console.log('-'.repeat(80));

        history.forEach(entry => {
            const before = entry.snapshot.quality.before.avgConfidence || 0;
            const after = entry.snapshot.quality.after.avgConfidence || 0;
            const improvement = entry.snapshot.quality.improvement.confidence || 0;

            const sign = improvement >= 0 ? '+' : '';
            const status = improvement >= 3 ? '✅' : improvement >= 0 ? '⚠️' : '❌';

            console.log(`${entry.date}   ${before.toFixed(1).padStart(7)}   ${after.toFixed(1).padStart(7)}   ${sign}${improvement.toFixed(1).padStart(6)}% ${status}`);
        });
    }

    /**
     * Display reuse rate trend
     */
    displayReuseRateTrend(history) {
        console.log('\n📈 REUSE RATE TREND');
        console.log('-'.repeat(80));

        console.log('Date         Reuse Rate  Status');
        console.log('-'.repeat(80));

        history.forEach(entry => {
            const reuseRate = entry.snapshot.reuse.reuseRate || 0;
            const status = reuseRate >= 60 ? '✅' : '⚠️';
            const barLength = Math.round(reuseRate / 100 * 30);
            const bar = '█'.repeat(barLength);

            console.log(`${entry.date}   ${reuseRate.toFixed(1).padStart(9)}%  ${status} ${bar}`);
        });
    }

    /**
     * Display effectiveness trend
     */
    displayEffectivenessTrend(history) {
        console.log('\n📈 LEARNING EFFECTIVENESS TREND');
        console.log('-'.repeat(80));

        console.log('Date         Score   Rating      Status');
        console.log('-'.repeat(80));

        history.forEach(entry => {
            const score = entry.snapshot.composite.learningEffectiveness || 0;
            const rating = entry.snapshot.composite.score || 'N/A';
            const status = score >= 0.75 ? '✅' : score >= 0.60 ? '⚠️' : '❌';

            console.log(`${entry.date}   ${score.toFixed(2).padStart(5)}   ${rating.padEnd(10)}  ${status}`);
        });
    }

    /**
     * Display ROI calculation
     */
    async displayROI() {
        console.log('\n' + '='.repeat(80));
        console.log('💰 RETURN ON INVESTMENT (ROI)');
        console.log('='.repeat(80));

        await this.tracker.loadMetrics();
        const metrics = this.tracker.data;

        // Time savings
        this.displayTimeSavings(metrics);

        // Quality improvements
        this.displayQualityROI(metrics);

        // Maintenance reduction
        this.displayMaintenanceReduction(metrics);

        // Overall ROI
        this.displayOverallROI(metrics);

        console.log('='.repeat(80) + '\n');
    }

    /**
     * Display time savings
     */
    displayTimeSavings(metrics) {
        console.log('\n⏱️ TIME SAVINGS');
        console.log('-'.repeat(80));

        const timeBefore = metrics.quality.before.avgTime || 0;
        const timeAfter = metrics.quality.after.avgTime || 0;
        const savings = timeBefore - timeAfter;
        const savingsPercent = timeBefore > 0 ? (savings / timeBefore * 100).toFixed(1) : 0;

        const plansGenerated = metrics.reuse.plansGenerated || 0;
        const totalSavings = savings * plansGenerated;

        console.log(`  Time per plan (before):   ${timeBefore.toFixed(1)} minutes`);
        console.log(`  Time per plan (after):    ${timeAfter.toFixed(1)} minutes`);
        console.log(`  Savings per plan:         ${savings.toFixed(1)} minutes (-${savingsPercent}%)`);
        console.log(`  Plans generated:          ${plansGenerated}`);
        console.log(`  Total time saved:         ${totalSavings.toFixed(1)} minutes (${(totalSavings / 60).toFixed(1)} hours)`);
    }

    /**
     * Display quality ROI
     */
    displayQualityROI(metrics) {
        console.log('\n📈 QUALITY IMPROVEMENTS');
        console.log('-'.repeat(80));

        const improvements = [
            ['Confidence', metrics.quality.improvement.confidence],
            ['Completeness', metrics.quality.improvement.completeness],
            ['Success Rate', metrics.quality.improvement.successRate]
        ];

        improvements.forEach(([metric, value]) => {
            const sign = value >= 0 ? '+' : '';
            const status = value >= 3 ? '✅ Excellent' : value >= 0 ? '⚠️ Good' : '❌ Poor';
            console.log(`  ${metric.padEnd(20)} ${sign}${value.toFixed(1).padStart(6)}%  ${status}`);
        });
    }

    /**
     * Display maintenance reduction
     */
    displayMaintenanceReduction(metrics) {
        console.log('\n🔧 MAINTENANCE REDUCTION');
        console.log('-'.repeat(80));

        const reuseRate = metrics.reuse.reuseRate || 0;
        const avgPatternsPerPlan = metrics.reuse.averagePatternsPerPlan || 0;

        // Estimate: Each reused pattern reduces maintenance by 5%
        const maintenanceReduction = reuseRate * 0.05;

        console.log(`  Pattern reuse rate:       ${reuseRate.toFixed(1)}%`);
        console.log(`  Avg patterns per plan:    ${avgPatternsPerPlan.toFixed(1)}`);
        console.log(`  Est. maintenance reduction: ${maintenanceReduction.toFixed(1)}%`);
        console.log(`  Status:                   ${maintenanceReduction >= 3 ? '✅ Significant' : '⚠️ Moderate'}`);
    }

    /**
     * Display overall ROI
     */
    displayOverallROI(metrics) {
        console.log('\n💰 OVERALL ROI');
        console.log('-'.repeat(80));

        const effectiveness = metrics.composite.learningEffectiveness || 0;
        const reuseRate = metrics.reuse.reuseRate || 0;
        const timeSavingsPercent = metrics.quality.before.avgTime > 0
            ? ((metrics.quality.before.avgTime - metrics.quality.after.avgTime) / metrics.quality.before.avgTime * 100)
            : 0;

        // ROI score (0-100)
        const roiScore = (effectiveness * 0.4 + reuseRate / 100 * 0.3 + timeSavingsPercent / 100 * 0.3) * 100;

        console.log(`  Learning Effectiveness:   ${effectiveness.toFixed(2)} (40% weight)`);
        console.log(`  Reuse Rate:               ${reuseRate.toFixed(1)}% (30% weight)`);
        console.log(`  Time Savings:             ${timeSavingsPercent.toFixed(1)}% (30% weight)`);
        console.log('  ' + '-'.repeat(76));
        console.log(`  Overall ROI Score:        ${roiScore.toFixed(1)}/100 ${roiScore >= 70 ? '✅' : roiScore >= 50 ? '⚠️' : '❌'}`);

        if (roiScore >= 70) {
            console.log('  Assessment:               Excellent ROI - highly valuable system');
        } else if (roiScore >= 50) {
            console.log('  Assessment:               Good ROI - valuable system');
        } else {
            console.log('  Assessment:               Moderate ROI - consider improvements');
        }
    }

    /**
     * Export data
     */
    async exportData(format = 'json') {
        console.log('\n📤 EXPORTING DATA...\n');

        await this.tracker.loadMetrics();
        const metrics = this.tracker.data;

        const exportPath = path.join(__dirname, '../.claude/memory-bank/eps-enhancement/week-6/metrics', `dashboard-export-${Date.now()}.${format}`);

        if (format === 'json') {
            fs.writeFileSync(exportPath, JSON.stringify(metrics, null, 2), 'utf-8');
        } else if (format === 'csv') {
            await this.tracker.exportToCSV(exportPath);
        }

        console.log(`✅ Data exported to: ${exportPath}\n`);
    }
}

// CLI Handler
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'main';
    const dashboard = new MemoryDashboard();

    try {
        switch (command) {
            case 'main':
                await dashboard.displayMain();
                break;
            case 'patterns':
                await dashboard.displayPatterns();
                break;
            case 'trends':
                const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1]) || 30;
                await dashboard.displayTrends(days);
                break;
            case 'roi':
                await dashboard.displayROI();
                break;
            case 'export':
                const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'json';
                await dashboard.exportData(format);
                break;
            default:
                console.log('Unknown command:', command);
                console.log('Available commands: main, patterns, trends, roi, export');
                process.exit(1);
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { MemoryDashboard };
