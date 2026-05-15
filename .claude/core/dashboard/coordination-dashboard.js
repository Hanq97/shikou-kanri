/**
 * Coordination Dashboard
 * コーディネーションダッシュボード
 * Dashboard Phối Hợp
 *
 * Purpose: Real-time monitoring and analytics for agent coordination system
 * 目的：エージェント調整システムのリアルタイム監視と分析
 * Mục đích: Giám sát và phân tích thời gian thực cho hệ thống phối hợp agent
 *
 * Features:
 * - Agent usage statistics
 * - Coordination effectiveness metrics
 * - Token cost per coordination
 * - Conflict resolution analytics
 * - Response quality scores
 *
 * Version: 1.0.0
 * Created: 2025-12-27
 */

const AgentCoordinator = require('../mcp/agent-coordinator.js');
const MultiAgentConsultation = require('../mcp/multi-agent-consultation.js');
const SequentialMCPIntegration = require('../mcp/mcp-sequential-integration.js');
const SerenaMCPIntegration = require('../mcp/mcp-serena-integration.js');

class CoordinationDashboard {
    constructor(options = {}) {
        this.coordinator = options.coordinator || new AgentCoordinator();
        this.consultation = options.consultation || new MultiAgentConsultation();
        this.sequential = options.sequential || null; // Lazy load
        this.serena = options.serena || null; // Lazy load

        this.config = {
            refreshInterval: 5000,           // 5 seconds refresh
            historySize: 100,                // Keep last 100 coordinations
            enableRealtime: true,            // Enable real-time updates
            ...options
        };

        // Metrics tracking
        this.metrics = {
            // Agent usage
            agentUsage: new Map(),           // agentName → usage count
            agentSuccessRate: new Map(),     // agentName → success rate
            agentAvgConfidence: new Map(),   // agentName → avg confidence
            agentAvgTokens: new Map(),       // agentName → avg tokens

            // Coordination effectiveness
            totalCoordinations: 0,
            successfulCoordinations: 0,
            failedCoordinations: 0,
            avgCoordinationTime: 0,
            complexityDistribution: {
                low: 0,
                medium: 0,
                high: 0
            },

            // Token costs
            totalTokens: 0,
            avgTokensPerCoordination: 0,
            tokensByComplexity: {
                low: 0,
                medium: 0,
                high: 0
            },

            // Conflict resolution
            totalConflicts: 0,
            conflictsByType: {
                contradictory: 0,
                incompatible: 0,
                priority: 0
            },
            conflictsResolved: 0,
            conflictResolutionRate: 0.0,

            // Response quality
            avgQualityScore: 0,
            qualityDistribution: {
                excellent: 0,  // 90-100
                good: 0,       // 70-89
                fair: 0,       // 50-69
                poor: 0        // 0-49
            },

            // Recent history
            recentCoordinations: []
        };

        console.log('[CoordinationDashboard] Initialized');
        console.log(`[CoordinationDashboard] Config: refreshInterval=${this.config.refreshInterval}ms, historySize=${this.config.historySize}`);
    }

    /**
     * Record a coordination event
     *
     * @param {Object} event - Coordination event data
     */
    recordCoordination(event) {
        console.log(`[CoordinationDashboard] Recording coordination: ${event.type}`);

        // Update total coordinations
        this.metrics.totalCoordinations++;

        // Update success/failure
        if (event.status === 'success') {
            this.metrics.successfulCoordinations++;
        } else {
            this.metrics.failedCoordinations++;
        }

        // Update complexity distribution
        if (event.complexity) {
            this.metrics.complexityDistribution[event.complexity]++;
        }

        // Update agent usage
        if (event.agents) {
            for (const agent of event.agents) {
                const currentCount = this.metrics.agentUsage.get(agent) || 0;
                this.metrics.agentUsage.set(agent, currentCount + 1);
            }
        }

        // Update token costs
        if (event.tokens) {
            this.metrics.totalTokens += event.tokens;
            this.metrics.avgTokensPerCoordination = Math.round(
                this.metrics.totalTokens / this.metrics.totalCoordinations
            );

            if (event.complexity) {
                this.metrics.tokensByComplexity[event.complexity] += event.tokens;
            }
        }

        // Update coordination time
        if (event.duration) {
            this.metrics.avgCoordinationTime = Math.round(
                (this.metrics.avgCoordinationTime * (this.metrics.totalCoordinations - 1) + event.duration) /
                this.metrics.totalCoordinations
            );
        }

        // Update quality scores
        if (event.quality) {
            this.metrics.avgQualityScore = (
                (this.metrics.avgQualityScore * (this.metrics.totalCoordinations - 1) + event.quality) /
                this.metrics.totalCoordinations
            ).toFixed(2);

            // Update quality distribution
            if (event.quality >= 90) {
                this.metrics.qualityDistribution.excellent++;
            } else if (event.quality >= 70) {
                this.metrics.qualityDistribution.good++;
            } else if (event.quality >= 50) {
                this.metrics.qualityDistribution.fair++;
            } else {
                this.metrics.qualityDistribution.poor++;
            }
        }

        // Update conflicts
        if (event.conflicts) {
            this.metrics.totalConflicts += event.conflicts.length;

            for (const conflict of event.conflicts) {
                if (conflict.type) {
                    this.metrics.conflictsByType[conflict.type]++;
                }
                if (conflict.resolved) {
                    this.metrics.conflictsResolved++;
                }
            }

            this.metrics.conflictResolutionRate = (
                (this.metrics.conflictsResolved / this.metrics.totalConflicts) * 100
            ).toFixed(2);
        }

        // Add to recent history
        this.metrics.recentCoordinations.push({
            timestamp: new Date().toISOString(),
            ...event
        });

        // Trim history to max size
        if (this.metrics.recentCoordinations.length > this.config.historySize) {
            this.metrics.recentCoordinations.shift();
        }

        console.log(`[CoordinationDashboard] Recorded (total: ${this.metrics.totalCoordinations})`);
    }

    /**
     * Get current dashboard metrics
     *
     * @returns {Object} - Dashboard metrics
     */
    getMetrics() {
        return {
            overview: {
                totalCoordinations: this.metrics.totalCoordinations,
                successRate: (
                    (this.metrics.successfulCoordinations / this.metrics.totalCoordinations) * 100
                ).toFixed(2) + '%',
                avgCoordinationTime: this.metrics.avgCoordinationTime + 'ms',
                avgTokensPerCoordination: this.metrics.avgTokensPerCoordination,
                avgQualityScore: this.metrics.avgQualityScore
            },
            agentUsage: this._getTopAgents(10),
            complexity: this.metrics.complexityDistribution,
            tokens: {
                total: this.metrics.totalTokens,
                average: this.metrics.avgTokensPerCoordination,
                byComplexity: this.metrics.tokensByComplexity
            },
            conflicts: {
                total: this.metrics.totalConflicts,
                resolved: this.metrics.conflictsResolved,
                resolutionRate: this.metrics.conflictResolutionRate + '%',
                byType: this.metrics.conflictsByType
            },
            quality: {
                average: this.metrics.avgQualityScore,
                distribution: this.metrics.qualityDistribution
            },
            recent: this.metrics.recentCoordinations.slice(-10)
        };
    }

    /**
     * Generate dashboard report
     *
     * @returns {string} - Formatted dashboard report
     */
    generateReport() {
        const metrics = this.getMetrics();

        const report = `
═══════════════════════════════════════════════════════════
COORDINATION DASHBOARD
═══════════════════════════════════════════════════════════

📊 OVERVIEW
───────────────────────────────────────────────────────────
Total Coordinations:      ${metrics.overview.totalCoordinations}
Success Rate:             ${metrics.overview.successRate}
Avg Coordination Time:    ${metrics.overview.avgCoordinationTime}
Avg Tokens/Coordination:  ${metrics.overview.avgTokensPerCoordination}
Avg Quality Score:        ${metrics.overview.avgQualityScore}/100

🤖 TOP AGENTS (by usage)
───────────────────────────────────────────────────────────
${this._formatAgentUsage(metrics.agentUsage)}

📈 COMPLEXITY DISTRIBUTION
───────────────────────────────────────────────────────────
Low:      ${metrics.complexity.low} (${this._percentage(metrics.complexity.low, this.metrics.totalCoordinations)})
Medium:   ${metrics.complexity.medium} (${this._percentage(metrics.complexity.medium, this.metrics.totalCoordinations)})
High:     ${metrics.complexity.high} (${this._percentage(metrics.complexity.high, this.metrics.totalCoordinations)})

💰 TOKEN COSTS
───────────────────────────────────────────────────────────
Total Tokens:             ${metrics.tokens.total.toLocaleString()}
Avg Tokens/Coordination:  ${metrics.tokens.average}
By Complexity:
  - Low:      ${metrics.tokens.byComplexity.low.toLocaleString()}
  - Medium:   ${metrics.tokens.byComplexity.medium.toLocaleString()}
  - High:     ${metrics.tokens.byComplexity.high.toLocaleString()}

⚠️ CONFLICT RESOLUTION
───────────────────────────────────────────────────────────
Total Conflicts:          ${metrics.conflicts.total}
Resolved:                 ${metrics.conflicts.resolved}
Resolution Rate:          ${metrics.conflicts.resolutionRate}
By Type:
  - Contradictory:  ${metrics.conflicts.byType.contradictory}
  - Incompatible:   ${metrics.conflicts.byType.incompatible}
  - Priority:       ${metrics.conflicts.byType.priority}

⭐ QUALITY SCORES
───────────────────────────────────────────────────────────
Average Score:            ${metrics.quality.average}/100
Distribution:
  - Excellent (90-100): ${metrics.quality.distribution.excellent} (${this._percentage(metrics.quality.distribution.excellent, this.metrics.totalCoordinations)})
  - Good (70-89):       ${metrics.quality.distribution.good} (${this._percentage(metrics.quality.distribution.good, this.metrics.totalCoordinations)})
  - Fair (50-69):       ${metrics.quality.distribution.fair} (${this._percentage(metrics.quality.distribution.fair, this.metrics.totalCoordinations)})
  - Poor (0-49):        ${metrics.quality.distribution.poor} (${this._percentage(metrics.quality.distribution.poor, this.metrics.totalCoordinations)})

📜 RECENT COORDINATIONS (last 10)
───────────────────────────────────────────────────────────
${this._formatRecentCoordinations(metrics.recent)}

═══════════════════════════════════════════════════════════
Generated: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════
`;

        return report;
    }

    /**
     * Display dashboard in console
     */
    display() {
        console.clear();
        console.log(this.generateReport());
    }

    /**
     * Export metrics to JSON
     *
     * @returns {Object} - Metrics object
     */
    exportMetrics() {
        return {
            timestamp: new Date().toISOString(),
            metrics: this.getMetrics(),
            coordinator: this.coordinator.getStats ? this.coordinator.getStats() : null,
            consultation: this.consultation.getStats ? this.consultation.getStats() : null,
            sequential: this.sequential ? this.sequential.getStats() : null,
            serena: this.serena ? this.serena.getStats() : null
        };
    }

    /**
     * Reset all metrics
     */
    reset() {
        console.log('[CoordinationDashboard] Resetting metrics');

        this.metrics.agentUsage.clear();
        this.metrics.agentSuccessRate.clear();
        this.metrics.agentAvgConfidence.clear();
        this.metrics.agentAvgTokens.clear();

        this.metrics.totalCoordinations = 0;
        this.metrics.successfulCoordinations = 0;
        this.metrics.failedCoordinations = 0;
        this.metrics.avgCoordinationTime = 0;
        this.metrics.complexityDistribution = { low: 0, medium: 0, high: 0 };

        this.metrics.totalTokens = 0;
        this.metrics.avgTokensPerCoordination = 0;
        this.metrics.tokensByComplexity = { low: 0, medium: 0, high: 0 };

        this.metrics.totalConflicts = 0;
        this.metrics.conflictsByType = { contradictory: 0, incompatible: 0, priority: 0 };
        this.metrics.conflictsResolved = 0;
        this.metrics.conflictResolutionRate = 0.0;

        this.metrics.avgQualityScore = 0;
        this.metrics.qualityDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

        this.metrics.recentCoordinations = [];

        console.log('[CoordinationDashboard] Reset complete');
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Get top N agents by usage
     *
     * @param {number} n - Number of agents to return
     * @returns {Array<Object>} - Top agents
     */
    _getTopAgents(n) {
        const agents = Array.from(this.metrics.agentUsage.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, n);

        return agents;
    }

    /**
     * Format agent usage for display
     *
     * @param {Array<Object>} agents - Agent usage array
     * @returns {string} - Formatted string
     */
    _formatAgentUsage(agents) {
        if (agents.length === 0) {
            return 'No agents used yet';
        }

        return agents.map((agent, index) => {
            const percentage = this._percentage(agent.count, this.metrics.totalCoordinations);
            return `${index + 1}. ${agent.name.padEnd(30)} ${agent.count.toString().padStart(5)} (${percentage})`;
        }).join('\n');
    }

    /**
     * Format recent coordinations for display
     *
     * @param {Array<Object>} coordinations - Recent coordinations
     * @returns {string} - Formatted string
     */
    _formatRecentCoordinations(coordinations) {
        if (coordinations.length === 0) {
            return 'No recent coordinations';
        }

        return coordinations.map((coord, index) => {
            const time = new Date(coord.timestamp).toLocaleTimeString();
            const status = coord.status === 'success' ? '✓' : '✗';
            const complexity = (coord.complexity || 'unknown').padEnd(6);
            const tokens = (coord.tokens || 0).toString().padStart(5);
            const quality = (coord.quality || 0).toString().padStart(3);

            return `${index + 1}. ${time} ${status} ${complexity} ${tokens}t Q:${quality}`;
        }).join('\n');
    }

    /**
     * Calculate percentage
     *
     * @param {number} value - Value
     * @param {number} total - Total
     * @returns {string} - Formatted percentage
     */
    _percentage(value, total) {
        if (total === 0) return '0.00%';
        return ((value / total) * 100).toFixed(2) + '%';
    }
}

module.exports = CoordinationDashboard;

// ==================== STANDALONE EXECUTION ====================

if (require.main === module) {
    console.log('[CoordinationDashboard] Running standalone mode\n');

    const dashboard = new CoordinationDashboard();

    // Simulate some coordination events
    console.log('[CoordinationDashboard] Simulating coordination events...\n');

    dashboard.recordCoordination({
        type: 'single-agent',
        status: 'success',
        complexity: 'low',
        agents: ['java-di-specialist'],
        tokens: 450,
        duration: 1200,
        quality: 85,
        conflicts: []
    });

    dashboard.recordCoordination({
        type: 'multi-agent',
        status: 'success',
        complexity: 'medium',
        agents: ['java-di-specialist', 'java-security-specialist', 'java-testing-specialist'],
        tokens: 1350,
        duration: 3400,
        quality: 92,
        conflicts: []
    });

    dashboard.recordCoordination({
        type: 'multi-agent',
        status: 'success',
        complexity: 'high',
        agents: ['java-di-specialist', 'java-security-specialist', 'java-testing-specialist', 'database-specialist', 'frontend-specialist'],
        tokens: 2800,
        duration: 5200,
        quality: 88,
        conflicts: [
            { type: 'contradictory', resolved: true },
            { type: 'priority', resolved: true }
        ]
    });

    // Display dashboard
    dashboard.display();
}
