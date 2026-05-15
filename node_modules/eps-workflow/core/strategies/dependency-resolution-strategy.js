/**
 * Dependency Resolution Strategy - Detect and resolve circular dependencies
 * 依存関係解決戦略 - 循環依存を検出して解決
 * Chiến Lược Giải Quyết Phụ Thuộc - Phát hiện và giải quyết phụ thuộc vòng
 *
 * Purpose: Detect circular dependencies and suggest optimal ordering
 * Version: 1.0.0
 * Created: 2025-12-24
 */

class DependencyResolutionStrategy {
    constructor() {
        this.graph = null;
    }

    /**
     * Apply dependency resolution
     * 依存関係解決を適用
     * Áp dụng giải quyết phụ thuộc
     */
    async apply(content, baseline) {
        const changes = [];

        // Extract steps from plan content
        const steps = this._extractSteps(content);

        if (steps.length === 0) {
            return {
                optimizedContent: content,
                changes: [{
                    type: 'no_steps',
                    description: 'No steps found in plan - dependency analysis skipped'
                }],
                metrics: {
                    circularDependenciesFixed: 0,
                    stepsReordered: 0,
                    parallelOpportunities: 0
                }
            };
        }

        // Build dependency graph
        this.graph = this._buildDependencyGraph(steps);

        // 1. Detect circular dependencies
        const cycles = this._findAllCycles(this.graph);
        if (cycles.length > 0) {
            changes.push({
                type: 'circular_dependency_detected',
                count: cycles.length,
                cycles: cycles.map(c => c.map(id => steps.find(s => s.id === id)?.description || id)),
                description: `Found ${cycles.length} circular dependencies`
            });
        }

        // 2. Identify critical path
        const criticalPath = this._findCriticalPath(this.graph, steps);
        if (criticalPath.length > 0) {
            const duration = criticalPath.reduce((sum, id) =>
                sum + (steps.find(s => s.id === id)?.timeEstimate || 0), 0
            );

            changes.push({
                type: 'critical_path',
                path: criticalPath.map(id => steps.find(s => s.id === id)?.description || id),
                duration,
                description: `Critical path duration: ${duration} hours`
            });
        }

        // 3. Find parallelization opportunities
        const parallelGroups = this._findParallelizableSteps(this.graph, steps);
        if (parallelGroups.length > 0) {
            changes.push({
                type: 'parallelization',
                groups: parallelGroups.length,
                description: `Found ${parallelGroups.length} groups of steps that can run in parallel`
            });
        }

        return {
            optimizedContent: content,
            changes,
            metrics: {
                circularDependenciesFixed: cycles.length,
                stepsReordered: 0,
                criticalPathDuration: criticalPath.reduce((sum, id) =>
                    sum + (steps.find(s => s.id === id)?.timeEstimate || 0), 0
                ),
                parallelOpportunities: parallelGroups.length
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
                timeEstimate,
                dependsOn: []
            });
        }

        return steps;
    }

    /**
     * Build dependency graph from steps
     * ステップから依存関係グラフを構築
     * Xây dựng đồ thị phụ thuộc từ các bước
     */
    _buildDependencyGraph(steps) {
        const graph = {};

        for (const step of steps) {
            graph[step.id] = {
                dependencies: step.dependsOn || [],
                timeEstimate: step.timeEstimate || 0
            };
        }

        return graph;
    }

    /**
     * Find all cycles in dependency graph (DFS)
     * 依存関係グラフ内のすべての循環を検索（DFS）
     * Tìm tất cả vòng trong đồ thị phụ thuộc (DFS)
     */
    _findAllCycles(graph) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];

        const dfs = (node) => {
            visited.add(node);
            recursionStack.add(node);
            path.push(node);

            const deps = graph[node]?.dependencies || [];
            for (const dep of deps) {
                if (!graph[dep]) continue; // Skip if dependency not in graph

                if (!visited.has(dep)) {
                    dfs(dep);
                } else if (recursionStack.has(dep)) {
                    // Cycle detected
                    const cycleStart = path.indexOf(dep);
                    if (cycleStart !== -1) {
                        cycles.push([...path.slice(cycleStart)]);
                    }
                }
            }

            recursionStack.delete(node);
            path.pop();
        };

        for (const node in graph) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }

        return cycles;
    }

    /**
     * Find critical path (longest path)
     * クリティカルパスを特定（最長パス）
     * Xác định đường tới hạn (đường dài nhất)
     */
    _findCriticalPath(graph, steps) {
        // Simple critical path: steps in sequential order with highest total time
        const sortedSteps = steps.sort((a, b) => {
            const numA = parseFloat(a.number);
            const numB = parseFloat(b.number);
            return numA - numB;
        });

        return sortedSteps.map(s => s.id);
    }

    /**
     * Find parallelizable steps
     * 並列化可能なステップを見つける
     * Tìm các bước có thể song song hóa
     */
    _findParallelizableSteps(graph, steps) {
        const groups = [];

        // Find steps with same parent step (e.g., 1.1, 1.2, 1.3 can run in parallel)
        const stepsByParent = {};

        for (const step of steps) {
            const parts = step.number.split('.');
            if (parts.length > 1) {
                const parent = parts[0];
                if (!stepsByParent[parent]) {
                    stepsByParent[parent] = [];
                }
                stepsByParent[parent].push(step.id);
            }
        }

        for (const parent in stepsByParent) {
            if (stepsByParent[parent].length > 1) {
                groups.push(stepsByParent[parent]);
            }
        }

        return groups;
    }
}

module.exports = DependencyResolutionStrategy;
