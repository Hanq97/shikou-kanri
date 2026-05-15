/**
 * Plan Optimizer - Automated plan quality improvement engine
 * プランオプティマイザー - 自動計画品質改善エンジン
 * Trình Tối Ưu Hóa Kế Hoạch - Công cụ cải thiện chất lượng kế hoạch tự động
 *
 * Purpose: Optimize plans using token, dependency, timeline, and quality strategies
 * Version: 1.0.0
 * Created: 2025-12-24
 */

const fs = require('fs').promises;
const path = require('path');
const { PlanReviewEngine } = require('./plan-review-engine');

class PlanOptimizer {
    constructor(config = {}) {
        this.config = {
            threshold: config.threshold || 95,
            dryRun: config.dryRun !== false,
            autoApprove: config.autoApprove || false,
            verbose: config.verbose || false,
            ...config
        };

        // Initialize components (lazy loading)
        this._reviewEngine = null;
        this._strategies = null;
    }

    /**
     * Get review engine instance (lazy initialization)
     * レビューエンジンインスタンスを取得（遅延初期化）
     * Lấy instance công cụ đánh giá (khởi tạo lazy)
     */
    get reviewEngine() {
        if (!this._reviewEngine) {
            this._reviewEngine = new PlanReviewEngine({ threshold: this.config.threshold });
        }
        return this._reviewEngine;
    }

    /**
     * Get optimization strategies (lazy initialization)
     * 最適化戦略を取得（遅延初期化）
     * Lấy các chiến lược tối ưu (khởi tạo lazy)
     */
    get strategies() {
        if (!this._strategies) {
            const TokenOptimizationStrategy = require('../strategies/token-optimization-strategy');
            const DependencyResolutionStrategy = require('../strategies/dependency-resolution-strategy');
            const TimelineAdjustmentStrategy = require('../strategies/timeline-adjustment-strategy');
            const QualityEnhancementStrategy = require('../strategies/quality-enhancement-strategy');

            this._strategies = {
                token: new TokenOptimizationStrategy(),
                dependency: new DependencyResolutionStrategy(),
                timeline: new TimelineAdjustmentStrategy(),
                quality: new QualityEnhancementStrategy()
            };
        }
        return this._strategies;
    }

    /**
     * Main optimization entry point
     * メイン最適化エントリーポイント
     * Điểm vào chính của tối ưu hóa
     */
    async optimize(planPath, strategyNames = ['all']) {
        const startTime = Date.now();

        try {
            // Step 1: Baseline review
            const baseline = await this._runBaselineReview(planPath);

            // Early exit if already meets threshold
            if (baseline.overall >= this.config.threshold) {
                return {
                    status: 'already_optimal',
                    baseline,
                    message: `Plan already meets ${this.config.threshold}% threshold`,
                    executionTime: Date.now() - startTime
                };
            }

            // Step 2: Strategy selection
            const selectedStrategies = this._selectStrategies(strategyNames, baseline);

            if (selectedStrategies.length === 0) {
                return {
                    status: 'no_strategies',
                    baseline,
                    message: 'No applicable strategies found for this plan',
                    executionTime: Date.now() - startTime
                };
            }

            // Step 3: Apply optimizations
            const optimizationResults = await this._applyStrategies(
                planPath,
                selectedStrategies,
                baseline
            );

            // Step 4: Re-validate
            const improved = await this._revalidate(optimizationResults.optimizedContent, planPath);

            // Step 5: Check for quality degradation
            if (improved.overall < baseline.overall) {
                return this._rollback(baseline, improved, optimizationResults, Date.now() - startTime);
            }

            // Step 6: User confirmation (if not autoApprove)
            if (!this.config.autoApprove && !this.config.dryRun) {
                const approved = await this._getUserConfirmation(baseline, improved, optimizationResults);
                if (!approved) {
                    return {
                        status: 'cancelled',
                        baseline,
                        improved,
                        message: 'User cancelled optimization',
                        executionTime: Date.now() - startTime
                    };
                }
            }

            // Step 7: Apply to file (if not dryRun)
            if (!this.config.dryRun) {
                await this._applyToFile(planPath, optimizationResults.optimizedContent);
            }

            // Step 8: Return report
            return this._generateReport(baseline, improved, optimizationResults, Date.now() - startTime);

        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                executionTime: Date.now() - startTime
            };
        }
    }

    /**
     * Run baseline review using plan-review-engine.js
     * plan-review-engine.jsを使用してベースラインレビューを実行
     * Chạy đánh giá cơ sở sử dụng plan-review-engine.js
     */
    async _runBaselineReview(planPath) {
        return await this.reviewEngine.review(planPath);
    }

    /**
     * Select applicable strategies based on baseline weaknesses
     * ベースラインの弱点に基づいて適用可能な戦略を選択
     * Chọn các chiến lược áp dụng dựa trên điểm yếu cơ sở
     */
    _selectStrategies(requestedStrategies, baseline) {
        if (requestedStrategies.includes('all')) {
            return this._autoSelectStrategies(baseline);
        }

        return requestedStrategies
            .map(name => ({
                name,
                strategy: this.strategies[name],
                applicable: this._isStrategyApplicable(name, baseline)
            }))
            .filter(s => s.applicable);
    }

    /**
     * Auto-select strategies based on baseline analysis
     * ベースライン分析に基づいて戦略を自動選択
     * Tự động chọn chiến lược dựa trên phân tích cơ sở
     */
    _autoSelectStrategies(baseline) {
        const strategies = [];

        // Token optimization: if plan is large
        if (baseline.planMetadata?.tokenEstimate > 3000) {
            strategies.push({
                name: 'token',
                strategy: this.strategies.token,
                reason: `Token count (${baseline.planMetadata.tokenEstimate}) exceeds 3,000`
            });
        }

        // Dependency resolution: if circular dependencies detected or risk score low
        if (baseline.dimensions?.risk?.score < 90) {
            strategies.push({
                name: 'dependency',
                strategy: this.strategies.dependency,
                reason: 'Risk score below 90% - may have dependency issues'
            });
        }

        // Timeline adjustment: if feasibility low
        if (baseline.dimensions?.feasibility?.score < 90) {
            strategies.push({
                name: 'timeline',
                strategy: this.strategies.timeline,
                reason: 'Feasibility score below 90% - timeline may need adjustment'
            });
        }

        // Quality enhancement: always applicable
        strategies.push({
            name: 'quality',
            strategy: this.strategies.quality,
            reason: 'Quality improvements always beneficial'
        });

        return strategies;
    }

    /**
     * Check if strategy is applicable to this plan
     * この計画に戦略が適用可能かチェック
     * Kiểm tra chiến lược có áp dụng được cho kế hoạch này không
     */
    _isStrategyApplicable(name, baseline) {
        switch (name) {
            case 'token':
                return baseline.planMetadata?.tokenEstimate > 3000;
            case 'dependency':
                return baseline.dimensions?.risk?.score < 90;
            case 'timeline':
                return baseline.dimensions?.feasibility?.score < 90;
            case 'quality':
                return true; // Always applicable
            default:
                return false;
        }
    }

    /**
     * Apply selected strategies sequentially
     * 選択された戦略を順次適用
     * Áp dụng các chiến lược đã chọn tuần tự
     */
    async _applyStrategies(planPath, strategies, baseline) {
        // Load plan content
        let currentContent = await fs.readFile(planPath, 'utf-8');

        const results = {
            optimizedContent: currentContent,
            strategiesApplied: [],
            totalChanges: 0
        };

        for (const { name, strategy, reason } of strategies) {
            const strategyResult = await strategy.apply(currentContent, baseline);

            results.strategiesApplied.push({
                name,
                reason,
                changes: strategyResult.changes || [],
                metrics: strategyResult.metrics || {}
            });

            results.totalChanges += (strategyResult.changes || []).length;
            currentContent = strategyResult.optimizedContent || currentContent;
        }

        results.optimizedContent = currentContent;
        return results;
    }

    /**
     * Re-validate optimized plan
     * 最適化された計画を再検証
     * Xác thực lại kế hoạch đã tối ưu
     */
    async _revalidate(optimizedContent, originalPath) {
        // Write to temp file
        const tempPath = path.join(__dirname, 'tests', 'fixtures', 'temp-optimized-plan.md');
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, optimizedContent, 'utf-8');

        // Review temp file
        const review = await this.reviewEngine.review(tempPath);

        // Clean up temp file
        try {
            await fs.unlink(tempPath);
        } catch (e) {
            // Ignore cleanup errors
        }

        return review;
    }

    /**
     * Rollback if quality degraded
     * 品質が低下した場合はロールバック
     * Khôi phục nếu chất lượng giảm
     */
    _rollback(baseline, improved, optimizationResults, executionTime) {
        return {
            status: 'rollback',
            reason: 'quality_degradation',
            baseline,
            improved,
            degradation: Math.round((baseline.overall - improved.overall) * 10) / 10,
            message: 'Optimizations caused quality degradation. Rolled back to original plan.',
            suggestions: this._suggestAlternativeStrategies(optimizationResults),
            executionTime
        };
    }

    /**
     * Suggest alternative strategies after rollback
     * ロールバック後の代替戦略を提案
     * Đề xuất chiến lược thay thế sau khi khôi phục
     */
    _suggestAlternativeStrategies(failedResults) {
        const suggestions = [];

        const appliedStrategies = failedResults.strategiesApplied.map(s => s.name);

        if (appliedStrategies.includes('token')) {
            suggestions.push({
                strategy: 'token',
                issue: 'Aggressive token reduction may have removed essential content',
                alternative: 'Try less aggressive token optimization or skip this strategy'
            });
        }

        if (appliedStrategies.includes('dependency')) {
            suggestions.push({
                strategy: 'dependency',
                issue: 'Step reordering may have broken logical flow',
                alternative: 'Manually review dependency graph before applying'
            });
        }

        if (appliedStrategies.includes('timeline')) {
            suggestions.push({
                strategy: 'timeline',
                issue: 'Timeline adjustments may not align with actual constraints',
                alternative: 'Review historical data accuracy or use custom estimates'
            });
        }

        return suggestions;
    }

    /**
     * Get user confirmation for applying changes
     * 変更を適用するためのユーザー確認を取得
     * Lấy xác nhận người dùng để áp dụng thay đổi
     */
    async _getUserConfirmation(baseline, improved, optimizationResults) {
        const comparison = this._formatComparison(baseline, improved, optimizationResults);
        console.log(comparison);

        // In CLI mode, prompt user
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('\n💾 Apply changes? (y/n): ', (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'y');
            });
        });
    }

    /**
     * Format comparison display
     * 比較表示をフォーマット
     * Định dạng hiển thị so sánh
     */
    _formatComparison(baseline, improved, optimizationResults) {
        const output = [];

        output.push('╔══════════════════════════════════════════════════════════════╗');
        output.push('║                   OPTIMIZATION COMPARISON                     ║');
        output.push('╚══════════════════════════════════════════════════════════════╝');
        output.push('');

        output.push('📊 DIMENSION SCORES:');
        output.push('');
        output.push('                      BEFORE    AFTER    CHANGE');
        output.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const dimensions = ['completeness', 'feasibility', 'clarity', 'risk', 'consistency'];
        const dimensionNames = {
            completeness: 'Completeness',
            feasibility: 'Feasibility',
            clarity: 'Clarity',
            risk: 'Risk',
            consistency: 'Consistency'
        };

        for (const dim of dimensions) {
            const before = baseline.dimensions[dim]?.score || 0;
            const after = improved.dimensions[dim]?.score || 0;
            const change = after - before;
            const icon = change >= 0 ? '✅' : '❌';

            output.push(`${dimensionNames[dim].padEnd(20)} ${before.toFixed(1)}%      ${after.toFixed(1)}%      ${change >= 0 ? '+' : ''}${change.toFixed(1)}%  ${icon}`);
        }

        output.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const overallChange = improved.overall - baseline.overall;
        output.push(`${'OVERALL CONFIDENCE'.padEnd(20)} ${baseline.overall.toFixed(1)}%      ${improved.overall.toFixed(1)}%      ${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(1)}%  ${overallChange >= 0 ? '✅' : '❌'}`);
        output.push('');

        output.push(`🔧 STRATEGIES APPLIED (${optimizationResults.strategiesApplied.length}):`);
        output.push('');

        for (let i = 0; i < optimizationResults.strategiesApplied.length; i++) {
            const strategy = optimizationResults.strategiesApplied[i];
            output.push(`${i + 1}. ${strategy.name.charAt(0).toUpperCase() + strategy.name.slice(1)} Optimization`);
            output.push(`   Reason: ${strategy.reason}`);
            output.push(`   Changes: ${strategy.changes.length}`);
            if (strategy.metrics && Object.keys(strategy.metrics).length > 0) {
                output.push(`   Metrics: ${JSON.stringify(strategy.metrics)}`);
            }
            output.push('');
        }

        output.push(`📝 TOTAL CHANGES: ${optimizationResults.totalChanges}`);

        return output.join('\n');
    }

    /**
     * Apply optimizations to file
     * ファイルに最適化を適用
     * Áp dụng tối ưu vào file
     */
    async _applyToFile(planPath, optimizedContent) {
        await fs.writeFile(planPath, optimizedContent, 'utf-8');
    }

    /**
     * Generate optimization report
     * 最適化レポートを生成
     * Tạo báo cáo tối ưu
     */
    _generateReport(baseline, improved, optimizationResults, executionTime) {
        const dimensionImprovements = {};
        for (const dim of ['completeness', 'feasibility', 'clarity', 'risk', 'consistency']) {
            const before = baseline.dimensions[dim]?.score || 0;
            const after = improved.dimensions[dim]?.score || 0;
            dimensionImprovements[dim] = Math.round((after - before) * 10) / 10;
        }

        return {
            status: 'success',
            baseline: {
                overall: baseline.overall,
                dimensions: baseline.dimensions
            },
            improved: {
                overall: improved.overall,
                dimensions: improved.dimensions
            },
            improvement: {
                overall: Math.round((improved.overall - baseline.overall) * 10) / 10,
                dimensions: dimensionImprovements
            },
            strategies: optimizationResults.strategiesApplied,
            totalChanges: optimizationResults.totalChanges,
            executionTime,
            dryRun: this.config.dryRun,
            message: this.config.dryRun ? 'Dry run mode - changes not applied' : 'Optimizations applied successfully'
        };
    }
}

module.exports = { PlanOptimizer };
