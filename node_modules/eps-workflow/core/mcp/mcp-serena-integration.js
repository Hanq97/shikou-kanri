/**
 * Serena MCP Integration
 * Serena MCP統合
 * Tích Hợp Serena MCP
 *
 * Purpose: Session memory persistence across plans with Serena MCP
 * 目的：Serena MCPによるプラン間のセッションメモリ永続化
 * Mục đích: Lưu trữ bộ nhớ phiên qua các kế hoạch với Serena MCP
 *
 * Features:
 * - Session memory initialization
 * - Memory persistence across plans
 * - Context retrieval with caching
 * - Memory cleanup and lifecycle management
 *
 * Version: 1.0.0
 * Created: 2025-12-27
 */

const SessionMemory = require('../memory/session-memory.js');

class SerenaMCPIntegration {
    constructor(options = {}) {
        this.sessionMemory = new SessionMemory(options.sessionMemoryConfig || {});

        this.config = {
            sessionPrefix: 'serena_',        // Prefix for Serena session keys
            planContextTTL: 7200000,         // 2 hours for plan context
            globalContextTTL: 86400000,      // 24 hours for global context
            enablePersistence: true,         // Enable persistent storage
            maxSessionsPerPlan: 50,          // Max sessions per plan
            ...options
        };

        // Session tracking
        this.sessions = new Map();           // sessionId → { planId, startTime, context }

        // Statistics
        this.stats = {
            total_sessions: 0,
            active_sessions: 0,
            total_contexts_saved: 0,
            total_contexts_retrieved: 0,
            session_hit_rate: 0.0,
            avg_session_duration: 0
        };

        console.log('[SerenaMCP] Initialized');
        console.log(`[SerenaMCP] Config: planTTL=${this.config.planContextTTL}ms, globalTTL=${this.config.globalContextTTL}ms`);
    }

    /**
     * Initialize a new session for a plan
     *
     * @param {string} sessionId - Unique session identifier
     * @param {string} planId - Plan identifier
     * @param {Object} initialContext - Initial context data
     * @returns {Object} - Session initialization result
     */
    initializeSession(sessionId, planId, initialContext = {}) {
        console.log(`[SerenaMCP] Initializing session: ${sessionId} for plan: ${planId}`);

        // Validate session doesn't already exist
        if (this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} already exists`);
        }

        // Create session
        const session = {
            sessionId: sessionId,
            planId: planId,
            startTime: Date.now(),
            context: { ...initialContext },
            isActive: true
        };

        this.sessions.set(sessionId, session);
        this.stats.total_sessions++;
        this.stats.active_sessions++;

        // Store initial context in session memory
        const contextKey = this._buildContextKey(sessionId, 'initial');
        this.sessionMemory.save(contextKey, initialContext, {
            ttl: this.config.planContextTTL,
            planId: planId,
            tags: ['session', 'initial']
        });

        this.stats.total_contexts_saved++;

        console.log(`[SerenaMCP] Session ${sessionId} initialized`);

        return {
            sessionId: sessionId,
            planId: planId,
            contextKey: contextKey,
            startTime: new Date(session.startTime).toISOString()
        };
    }

    /**
     * Save context to session memory
     *
     * @param {string} sessionId - Session identifier
     * @param {string} contextType - Type of context (e.g., 'step', 'result', 'intermediate')
     * @param {any} contextData - Context data to save
     * @param {Object} options - Save options
     * @returns {Object} - Save result
     */
    saveContext(sessionId, contextType, contextData, options = {}) {
        console.log(`[SerenaMCP] Saving context for session: ${sessionId}, type: ${contextType}`);

        // Validate session exists
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Build context key
        const contextKey = this._buildContextKey(sessionId, contextType);

        // Determine TTL
        const isGlobal = options.global || false;
        const ttl = isGlobal ? this.config.globalContextTTL : this.config.planContextTTL;

        // Save to session memory
        const result = this.sessionMemory.save(contextKey, contextData, {
            ttl: ttl,
            planId: session.planId,
            tags: [contextType, isGlobal ? 'global' : 'plan', 'session'],
            ...options
        });

        // Update session context
        session.context[contextType] = contextKey;

        this.stats.total_contexts_saved++;

        console.log(`[SerenaMCP] Context saved: ${contextKey} (${result.size} bytes)`);

        return {
            contextKey: contextKey,
            size: result.size,
            expiresAt: result.expiresAt,
            ttl: ttl
        };
    }

    /**
     * Retrieve context from session memory
     *
     * @param {string} sessionId - Session identifier
     * @param {string} contextType - Type of context to retrieve
     * @param {Object} options - Retrieval options
     * @returns {any|null} - Context data or null if not found
     */
    retrieveContext(sessionId, contextType, options = {}) {
        console.log(`[SerenaMCP] Retrieving context for session: ${sessionId}, type: ${contextType}`);

        this.stats.total_contexts_retrieved++;

        // Validate session exists
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.log(`[SerenaMCP] Session ${sessionId} not found`);
            this._updateSessionHitRate(false);
            return null;
        }

        // Build context key
        const contextKey = this._buildContextKey(sessionId, contextType);

        // Retrieve from session memory
        const contextData = this.sessionMemory.retrieve(contextKey, options);

        if (contextData) {
            console.log(`[SerenaMCP] Context retrieved: ${contextKey}`);
            this._updateSessionHitRate(true);
        } else {
            console.log(`[SerenaMCP] Context not found: ${contextKey}`);
            this._updateSessionHitRate(false);
        }

        return contextData;
    }

    /**
     * Get all contexts for a session
     *
     * @param {string} sessionId - Session identifier
     * @returns {Object} - Map of contextType → contextData
     */
    getAllContexts(sessionId) {
        console.log(`[SerenaMCP] Retrieving all contexts for session: ${sessionId}`);

        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const contexts = {};

        for (const [contextType, contextKey] of Object.entries(session.context)) {
            const contextData = this.sessionMemory.retrieve(contextKey);
            if (contextData) {
                contexts[contextType] = contextData;
            }
        }

        console.log(`[SerenaMCP] Retrieved ${Object.keys(contexts).length} contexts for session ${sessionId}`);

        return contexts;
    }

    /**
     * End a session and cleanup
     *
     * @param {string} sessionId - Session identifier
     * @param {Object} options - Cleanup options { preserveContext }
     * @returns {Object} - Session summary
     */
    endSession(sessionId, options = {}) {
        console.log(`[SerenaMCP] Ending session: ${sessionId}`);

        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const duration = Date.now() - session.startTime;
        session.isActive = false;

        // Update statistics
        this.stats.active_sessions--;
        this.stats.avg_session_duration = (this.stats.avg_session_duration * (this.stats.total_sessions - 1) + duration) / this.stats.total_sessions;

        // Cleanup context if requested
        if (!options.preserveContext) {
            for (const contextKey of Object.values(session.context)) {
                this.sessionMemory.delete(contextKey);
            }
            console.log(`[SerenaMCP] Cleaned up ${Object.keys(session.context).length} contexts`);
        }

        // Remove session
        this.sessions.delete(sessionId);

        console.log(`[SerenaMCP] Session ${sessionId} ended (duration: ${duration}ms)`);

        return {
            sessionId: sessionId,
            planId: session.planId,
            duration: duration,
            contextsPreserved: options.preserveContext ? Object.keys(session.context).length : 0
        };
    }

    /**
     * Get session information
     *
     * @param {string} sessionId - Session identifier
     * @returns {Object|null} - Session info or null if not found
     */
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);

        if (!session) {
            return null;
        }

        return {
            sessionId: session.sessionId,
            planId: session.planId,
            startTime: new Date(session.startTime).toISOString(),
            duration: Date.now() - session.startTime,
            isActive: session.isActive,
            contextCount: Object.keys(session.context).length,
            contextTypes: Object.keys(session.context)
        };
    }

    /**
     * Get all active sessions
     *
     * @returns {Array<Object>} - Array of active session info
     */
    getActiveSessions() {
        const activeSessions = [];

        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.isActive) {
                activeSessions.push({
                    sessionId: sessionId,
                    planId: session.planId,
                    duration: Date.now() - session.startTime
                });
            }
        }

        return activeSessions;
    }

    /**
     * Clear all sessions for a plan
     *
     * @param {string} planId - Plan identifier
     * @returns {number} - Number of sessions cleared
     */
    clearPlanSessions(planId) {
        console.log(`[SerenaMCP] Clearing sessions for plan: ${planId}`);

        let clearedCount = 0;

        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.planId === planId) {
                this.endSession(sessionId, { preserveContext: false });
                clearedCount++;
            }
        }

        // Clear plan context from session memory
        this.sessionMemory.clearPlan(planId);

        console.log(`[SerenaMCP] Cleared ${clearedCount} sessions for plan ${planId}`);

        return clearedCount;
    }

    /**
     * Get statistics
     *
     * @returns {Object} - Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            memoryStats: this.sessionMemory.getStats()
        };
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        console.log('[SerenaMCP] Destroying Serena MCP integration');

        // End all active sessions
        for (const sessionId of this.sessions.keys()) {
            this.endSession(sessionId, { preserveContext: false });
        }

        // Destroy session memory
        this.sessionMemory.destroy();

        console.log('[SerenaMCP] Destroyed');
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Build context key for session memory
     *
     * @param {string} sessionId - Session identifier
     * @param {string} contextType - Context type
     * @returns {string} - Context key
     */
    _buildContextKey(sessionId, contextType) {
        return `${this.config.sessionPrefix}${sessionId}_${contextType}`;
    }

    /**
     * Update session hit rate statistic
     *
     * @param {boolean} hit - True if hit, false if miss
     */
    _updateSessionHitRate(hit) {
        const total = this.stats.total_contexts_retrieved;
        const hits = hit ?
            Math.round(this.stats.session_hit_rate * (total - 1) / 100) + 1 :
            Math.round(this.stats.session_hit_rate * (total - 1) / 100);

        this.stats.session_hit_rate = (hits / total * 100).toFixed(2);
    }
}

module.exports = SerenaMCPIntegration;
