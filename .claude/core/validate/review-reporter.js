/**
 * Review Reporter - Multi-format output generator for plan reviews
 * レビューレポーター - 計画レビューのマルチフォーマット出力ジェネレーター
 * Trình Báo Cáo Đánh Giá - Tạo đầu ra đa định dạng cho đánh giá kế hoạch
 *
 * Purpose: Format review results in CLI, JSON, or Markdown
 * Version: 1.0.0
 * Created: 2025-12-24
 */

class ReviewReporter {
    constructor(options = {}) {
        this.verbose = options.verbose || false;
    }

    /**
     * Generate CLI output with colors and progress bars
     * 色とプログレスバー付きCLI出力を生成
     * Tạo đầu ra CLI với màu sắc và thanh tiến trình
     */
    formatCLI(review) {
        const output = [];

        // Header
        output.push('╔══════════════════════════════════════════════════════════════╗');
        output.push('║                     PLAN REVIEW REPORT                        ║');
        output.push('╚══════════════════════════════════════════════════════════════╝');
        output.push('');

        // Plan metadata
        if (review.planMetadata) {
            output.push(`📄 Plan: ${review.planMetadata.name}`);
            if (review.planMetadata.week) output.push(`   Week ${review.planMetadata.week}, Day ${review.planMetadata.day || 'N/A'}`);
            output.push(`   ${review.planMetadata.wordCount} words (~${review.planMetadata.tokenEstimate} tokens)`);
            output.push('');
        }

        // Overall score
        const overallIcon = review.passed ? '✅ PASS' : '❌ FAIL';
        output.push(`📊 OVERALL CONFIDENCE: ${review.overall}% ${overallIcon} (threshold: ${review.threshold}%)`);
        output.push('');

        // Dimension scores
        output.push('📋 DIMENSION SCORES:');
        output.push('');

        const dimensionNames = {
            completeness: 'Completeness',
            feasibility: 'Feasibility',
            clarity: 'Clarity',
            risk: 'Risk',
            consistency: 'Consistency'
        };

        let index = 1;
        for (const [dimension, result] of Object.entries(review.dimensions)) {
            const icon = result.passed ? '✅' : (result.score >= 80 ? '⚠️' : '❌');
            const bar = this._generateProgressBar(result.score);
            const dimName = dimensionNames[dimension] || dimension;

            output.push(`${index}. ${dimName.padEnd(14)} ${result.score.toFixed(1)}% ${icon}  ${bar}`);

            // Details in verbose mode
            if (this.verbose && result.details) {
                for (const [key, value] of Object.entries(result.details)) {
                    if (typeof value === 'object') continue;
                    output.push(`   - ${key}: ${value}`);
                }
            }

            output.push('');
            index++;
        }

        // Improvement suggestions
        if (review.improvements && review.improvements.length > 0) {
            output.push(`💡 IMPROVEMENT SUGGESTIONS (${review.improvements.length} total):`);
            output.push('');

            const topSuggestions = review.improvements.slice(0, 5); // Show top 5

            for (const improvement of topSuggestions) {
                const severityIcon = {
                    critical: '🔴',
                    high: '⚠️',
                    medium: '🟡',
                    low: 'ℹ️'
                }[improvement.severity] || 'ℹ️';

                output.push(` ${severityIcon}  ${improvement.severity.toUpperCase()}: ${improvement.element || improvement.dimension || improvement.type || 'Issue'}`);

                if (improvement.current && improvement.target) {
                    output.push(`    Current: ${improvement.current} | Target: ${improvement.target}`);
                }

                output.push(`    → ${improvement.suggestion}`);
                output.push(`    Impact: +${improvement.impact}%`);
                output.push('');
            }

            if (review.improvements.length > 5) {
                output.push(`   ... and ${review.improvements.length - 5} more suggestions`);
                output.push('');
            }
        } else {
            output.push('✨ No improvements needed - plan meets all quality standards!');
            output.push('');
        }

        // Execution time
        if (review.executionTime) {
            output.push(`⏱️  Review completed in ${review.executionTime}ms`);
            output.push('');
        }

        // Ready status
        output.push('─────────────────────────────────────────────────────────────');
        if (review.readyForExecution) {
            output.push('✅ READY FOR EXECUTION');
        } else {
            output.push('❌ NOT READY - Use /plan-optimize to improve');
        }
        output.push('─────────────────────────────────────────────────────────────');

        return output.join('\n');
    }

    /**
     * Generate JSON output for tool integration
     * ツール統合用のJSON出力を生成
     * Tạo đầu ra JSON cho tích hợp công cụ
     */
    formatJSON(review) {
        return JSON.stringify(review, null, 2);
    }

    /**
     * Generate Markdown output for documentation
     * ドキュメント用のMarkdown出力を生成
     * Tạo đầu ra Markdown cho tài liệu
     */
    formatMarkdown(review) {
        const output = [];

        output.push('# Plan Review Report');
        output.push('# 計画レビューレポート');
        output.push('# Báo Cáo Đánh Giá Kế Hoạch');
        output.push('');

        // Plan metadata
        if (review.planMetadata) {
            output.push(`**Plan**: ${review.planMetadata.name}`);
            if (review.planMetadata.week) {
                output.push(`**Week/Day**: Week ${review.planMetadata.week}, Day ${review.planMetadata.day || 'N/A'}`);
            }
            output.push(`**Size**: ${review.planMetadata.wordCount} words (~${review.planMetadata.tokenEstimate} tokens)`);
            output.push('');
        }

        // Overall results
        output.push('## Overall Results');
        output.push('');
        output.push(`**Overall Confidence**: ${review.overall}% ${review.passed ? '✅ PASS' : '❌ FAIL'}`);
        output.push(`**Threshold**: ${review.threshold}%`);
        output.push(`**Ready for Execution**: ${review.readyForExecution ? 'Yes' : 'No'}`);

        if (review.executionTime) {
            output.push(`**Review Time**: ${review.executionTime}ms`);
        }

        output.push('');

        // Dimension scores
        output.push('## Dimension Scores');
        output.push('');
        output.push('| Dimension | Score | Status | Details |');
        output.push('|-----------|-------|--------|---------|');

        const dimensionNames = {
            completeness: 'Completeness',
            feasibility: 'Feasibility',
            clarity: 'Clarity',
            risk: 'Risk',
            consistency: 'Consistency'
        };

        for (const [dimension, result] of Object.entries(review.dimensions)) {
            const status = result.passed ? '✅ Pass' : '❌ Fail';
            const dimName = dimensionNames[dimension] || dimension;
            const detailsCount = result.details ? Object.keys(result.details).length : 0;
            const detailsText = detailsCount > 0 ? `${detailsCount} checks` : '-';

            output.push(`| ${dimName} | ${result.score.toFixed(1)}% | ${status} | ${detailsText} |`);
        }

        output.push('');

        // Dimension details
        if (this.verbose) {
            output.push('## Dimension Details');
            output.push('');

            for (const [dimension, result] of Object.entries(review.dimensions)) {
                const dimName = dimensionNames[dimension] || dimension;
                output.push(`### ${dimName}: ${result.score.toFixed(1)}%`);
                output.push('');

                if (result.details) {
                    for (const [key, value] of Object.entries(result.details)) {
                        if (typeof value === 'object') {
                            output.push(`- **${key}**: ${JSON.stringify(value)}`);
                        } else {
                            output.push(`- **${key}**: ${value}`);
                        }
                    }
                    output.push('');
                }
            }
        }

        // Improvements
        if (review.improvements && review.improvements.length > 0) {
            output.push('## Improvement Suggestions');
            output.push('');

            // Group by severity
            const groupedBySeverity = {
                critical: [],
                high: [],
                medium: [],
                low: []
            };

            for (const improvement of review.improvements) {
                const severity = improvement.severity || 'low';
                if (groupedBySeverity[severity]) {
                    groupedBySeverity[severity].push(improvement);
                }
            }

            // Output by severity
            for (const [severity, improvements] of Object.entries(groupedBySeverity)) {
                if (improvements.length === 0) continue;

                const severityIcon = {
                    critical: '🔴',
                    high: '⚠️',
                    medium: '🟡',
                    low: 'ℹ️'
                }[severity];

                output.push(`### ${severityIcon} ${severity.toUpperCase()} (${improvements.length})`);
                output.push('');

                for (const improvement of improvements) {
                    output.push(`#### ${improvement.element || improvement.dimension || improvement.type || 'Issue'}`);
                    output.push('');

                    if (improvement.current && improvement.target) {
                        output.push(`**Current**: ${improvement.current}  `);
                        output.push(`**Target**: ${improvement.target}  `);
                    }

                    if (improvement.description) {
                        output.push(`**Description**: ${improvement.description}  `);
                    }

                    output.push(`**Suggestion**: ${improvement.suggestion}  `);
                    output.push(`**Impact**: +${improvement.impact}%`);
                    output.push('');
                }
            }
        } else {
            output.push('## Improvement Suggestions');
            output.push('');
            output.push('✨ No improvements needed - plan meets all quality standards!');
            output.push('');
        }

        // Summary
        output.push('## Summary');
        output.push('');

        if (review.readyForExecution) {
            output.push('✅ **READY FOR EXECUTION**');
            output.push('');
            output.push('This plan has passed all quality gates and is ready to be executed.');
        } else {
            output.push('❌ **NOT READY FOR EXECUTION**');
            output.push('');
            output.push('This plan requires improvements before execution. Consider using `/plan-optimize` to automatically enhance the plan quality.');
        }

        output.push('');
        output.push('---');
        output.push('');
        output.push(`*Generated on ${new Date().toISOString()}*`);

        return output.join('\n');
    }

    /**
     * Format error output
     * エラー出力をフォーマット
     * Định dạng đầu ra lỗi
     */
    formatError(error, format = 'cli') {
        if (format === 'json') {
            return JSON.stringify({
                error: error.error || 'Error',
                message: error.message || 'Unknown error occurred',
                suggestion: error.suggestion || 'Please try again',
                severity: error.severity || 'medium'
            }, null, 2);
        }

        if (format === 'markdown') {
            return [
                '# Plan Review Error',
                '',
                `**Error**: ${error.error || 'Error'}`,
                `**Message**: ${error.message || 'Unknown error occurred'}`,
                `**Suggestion**: ${error.suggestion || 'Please try again'}`,
                `**Severity**: ${error.severity || 'medium'}`,
                ''
            ].join('\n');
        }

        // CLI format (default)
        const output = [];
        output.push('╔══════════════════════════════════════════════════════════════╗');
        output.push('║                    PLAN REVIEW ERROR                          ║');
        output.push('╚══════════════════════════════════════════════════════════════╝');
        output.push('');
        output.push(`❌ Error: ${error.error || 'Error'}`);
        output.push(`   ${error.message || 'Unknown error occurred'}`);
        output.push('');
        output.push(`💡 Suggestion: ${error.suggestion || 'Please try again'}`);
        output.push(`   Severity: ${error.severity || 'medium'}`);

        return output.join('\n');
    }

    /**
     * Generate progress bar
     * プログレスバーを生成
     * Tạo thanh tiến trình
     */
    _generateProgressBar(percentage, length = 20) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '[' + '█'.repeat(filled) + ' '.repeat(empty) + ']';
    }

    /**
     * Format review for specific output type
     * 特定の出力タイプ用にレビューをフォーマット
     * Định dạng đánh giá cho loại đầu ra cụ thể
     */
    format(review, outputFormat = 'cli') {
        // Handle errors
        if (review.error) {
            return this.formatError(review, outputFormat);
        }

        // Format based on output type
        switch (outputFormat.toLowerCase()) {
            case 'json':
                return this.formatJSON(review);
            case 'markdown':
            case 'md':
                return this.formatMarkdown(review);
            case 'cli':
            default:
                return this.formatCLI(review);
        }
    }
}

module.exports = { ReviewReporter };
