/**
 * Timeline Adjustment Strategy - Adjust unrealistic timelines
 * タイムライン調整戦略 - 非現実的なタイムラインを調整
 * Chiến Lược Điều Chỉnh Thời Gian - Điều chỉnh thời gian không thực tế
 *
 * Purpose: Adjust timeline estimates based on historical data
 * Version: 1.0.0
 * Created: 2025-12-24
 */

class TimelineAdjustmentStrategy {
    constructor() {
        this.varianceThreshold = 0.30; // 30%
        this.historicalAverage = 6.5; // Average hours per day from historical data
    }

    /**
     * Apply timeline adjustment
     * タイムライン調整を適用
     * Áp dụng điều chỉnh thời gian
     */
    async apply(content, baseline) {
        const changes = [];

        // Extract steps from content
        const steps = this._extractSteps(content);

        if (steps.length === 0) {
            return {
                optimizedContent: content,
                changes: [{
                    type: 'no_steps',
                    description: 'No steps found in plan - timeline analysis skipped'
                }],
                metrics: {
                    adjustedSteps: 0,
                    bottlenecksIdentified: 0,
                    workloadBalanced: false,
                    potentialSavings: 0
                }
            };
        }

        // Calculate total time
        const totalTime = steps.reduce((sum, s) => sum + s.timeEstimate, 0);

        // 1. Compare to historical average
        const variance = Math.abs(totalTime - this.historicalAverage) / this.historicalAverage;

        if (variance > this.varianceThreshold) {
            changes.push({
                type: 'historical_adjustment',
                currentEstimate: totalTime,
                historicalAverage: this.historicalAverage,
                variance: Math.round(variance * 100),
                severity: variance > 0.50 ? 'critical' : 'high',
                description: `Total time (${totalTime}h) differs from historical average (${this.historicalAverage}h) by ${Math.round(variance * 100)}%`
            });
        }

        // 2. Identify bottlenecks (steps >2h)
        const bottlenecks = steps.filter(s => s.timeEstimate > 2);
        if (bottlenecks.length > 0) {
            changes.push({
                type: 'bottleneck',
                count: bottlenecks.length,
                steps: bottlenecks.map(s => ({
                    step: s.description,
                    duration: s.timeEstimate,
                    suggestion: 'Consider splitting into smaller steps or allocating more resources'
                })),
                description: `Found ${bottlenecks.length} bottleneck steps (>2 hours each)`
            });
        }

        // 3. Balance workload
        const targetDuration = this.historicalAverage;
        let workloadBalanced = false;

        if (totalTime > targetDuration * 1.10) {
            changes.push({
                type: 'overbudget',
                totalEstimate: totalTime,
                targetDuration,
                overage: Math.round((totalTime - targetDuration) * 10) / 10,
                suggestion: 'Reduce scope or extend to multiple days',
                description: `Plan exceeds target duration by ${Math.round(((totalTime - targetDuration) / targetDuration) * 100)}%`
            });
        } else if (totalTime < targetDuration * 0.70) {
            changes.push({
                type: 'underutilized',
                totalEstimate: totalTime,
                targetDuration,
                unused: Math.round((targetDuration - totalTime) * 10) / 10,
                suggestion: 'Consider adding more tasks or increasing detail/quality',
                description: `Plan underutilizes available time by ${Math.round(((targetDuration - totalTime) / targetDuration) * 100)}%`
            });
        } else {
            workloadBalanced = true;
        }

        return {
            optimizedContent: content,
            changes,
            metrics: {
                adjustedSteps: changes.filter(c => c.type === 'historical_adjustment').length,
                bottlenecksIdentified: bottlenecks.length,
                workloadBalanced,
                totalTime,
                targetTime: targetDuration,
                potentialSavings: 0
            }
        };
    }

    /**
     * Extract steps from markdown content
     * マークダウンコンテンツからステップを抽出
     * Trích xuất các bước từ nội dung markdown
     */
    _extractSteps(content) {
        const steps = [];
        const stepPattern = /###?\s+Step\s+(\d+(?:\.\d+)?)[:\s]+([^\n(]+)(?:\(([^)]+)\))?/gi;

        let match;
        while ((match = stepPattern.exec(content)) !== null) {
            const stepId = match[1];
            const description = match[2].trim();
            const timeStr = match[3] || '';

            // Extract time estimate
            let timeEstimate = 0;
            const timeMatch = timeStr.match(/(\d+(?:\.\d+)?)\s*(hour|hr|h|min|m)/i);
            if (timeMatch) {
                const value = parseFloat(timeMatch[1]);
                const unit = timeMatch[2].toLowerCase();
                timeEstimate = (unit === 'min' || unit === 'm') ? value / 60 : value;
            }

            steps.push({
                id: `step-${stepId}`,
                number: stepId,
                description,
                timeEstimate
            });
        }

        return steps;
    }
}

module.exports = TimelineAdjustmentStrategy;
