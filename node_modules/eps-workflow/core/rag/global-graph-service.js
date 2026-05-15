"use strict";

/**
 * Global Graph Service - Client Extension for Global Graph API
 *
 * Extends HippoRAGService with global graph methods.
 * Implements DD §5.1 (L3.6.1-L3.6.4):
 * - L3.6.1: 10 core methods (query, traverse, getContext, etc.)
 * - L3.6.2: Retry strategy [1s, 2s, 4s] with ±30% jitter
 * - L3.6.3: LRU cache (500 entries)
 * - L3.6.4: Error hierarchy (ConnectionError, NotFoundError, etc.)
 *
 * @module global-graph-service
 */

const LRU = require("lru-cache");

// ─────────────────────────────────────────────────────────────────
// Error Hierarchy (L3.6.4)
// ─────────────────────────────────────────────────────────────────

/**
 * Base HippoRAG error with recovery action.
 * DD Reference: §5.1.4
 */
class HippoRAGError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "HippoRAGError";
    this.recoveryAction = options.recoveryAction || "fallback";
    this.statusCode = options.statusCode || 500;
    this.details = options.details || {};
  }
}

/**
 * Connection error - auto retry.
 */
class ConnectionError extends HippoRAGError {
  constructor(message, details = {}) {
    super(message, {
      recoveryAction: "auto_retry",
      statusCode: 503,
      details,
    });
    this.name = "ConnectionError";
  }
}

/**
 * Not found error - fallback.
 */
class NotFoundError extends HippoRAGError {
  constructor(message, details = {}) {
    super(message, {
      recoveryAction: "fallback",
      statusCode: 404,
      details,
    });
    this.name = "NotFoundError";
  }
}

/**
 * Validation error - user action.
 */
class ValidationError extends HippoRAGError {
  constructor(message, details = {}) {
    super(message, {
      recoveryAction: "user_action",
      statusCode: 400,
      details,
    });
    this.name = "ValidationError";
  }
}

/**
 * Rate limit error - auto retry after delay.
 */
class RateLimitError extends HippoRAGError {
  constructor(message, retryAfter = 5, details = {}) {
    super(message, {
      recoveryAction: "auto_retry",
      statusCode: 429,
      details,
    });
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Timeout error - auto retry.
 */
class TimeoutError extends HippoRAGError {
  constructor(message, details = {}) {
    super(message, {
      recoveryAction: "auto_retry",
      statusCode: 504,
      details,
    });
    this.name = "TimeoutError";
  }
}

// ─────────────────────────────────────────────────────────────────
// Retry Strategy (L3.6.2)
// ─────────────────────────────────────────────────────────────────

/**
 * Retry configuration.
 * DD Reference: §5.1.2
 *
 * Retry Delays: [1s, 2s, 4s] (exponential backoff)
 * Jitter: ±30% random variation
 * Max Retries: 3
 */
const RETRY_CONFIG = {
  delays: [1000, 2000, 4000], // milliseconds
  jitterPercent: 0.3, // ±30%
  maxRetries: 3,
};

/**
 * Calculate delay with jitter.
 * @param {number} baseDelay - Base delay in ms
 * @param {number} jitterPercent - Jitter percentage (0.3 = ±30%)
 * @returns {number} Delay with jitter
 */
function withJitter(baseDelay, jitterPercent = 0.3) {
  const jitterRange = baseDelay * jitterPercent;
  const jitter = Math.random() * 2 * jitterRange - jitterRange;
  return Math.round(baseDelay + jitter);
}

/**
 * Check if error is retryable.
 * @param {Error} error
 * @returns {boolean}
 */
function isRetryable(error) {
  // Retry on connection, timeout, and 5xx errors
  if (error instanceof ConnectionError) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof RateLimitError) return true;

  // Check status code for generic errors
  if (error.statusCode && error.statusCode >= 500) return true;
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────
// Cache Configuration (L3.6.3)
// ─────────────────────────────────────────────────────────────────

/**
 * Cache TTL by method (DD Reference: §5.1.3)
 */
const CACHE_TTL = {
  query: 60 * 1000, // 60s
  getContext: 120 * 1000, // 120s
  healthCheck: 30 * 1000, // 30s
  traverse: 60 * 1000, // 60s
};

/**
 * Max cache entries (DD Reference: §5.1.3)
 */
const MAX_CACHE_ENTRIES = 500;

// ─────────────────────────────────────────────────────────────────
// Global Graph Service
// ─────────────────────────────────────────────────────────────────

/**
 * Global Graph Service - Client-side singleton for Global Graph API.
 *
 * DD Reference: §5.1 (L3.6.1-L3.6.4)
 *
 * Features:
 * - 10 core methods (query, traverse, getContext, etc.)
 * - Retry with exponential backoff + jitter
 * - LRU cache (500 entries)
 * - Error hierarchy with recovery actions
 */
class GlobalGraphService {
  static _instance = null;

  /**
   * Get singleton instance.
   * DD Reference: L3.6.1
   * @returns {GlobalGraphService}
   */
  static getInstance() {
    if (!GlobalGraphService._instance) {
      GlobalGraphService._instance = new GlobalGraphService();
    }
    return GlobalGraphService._instance;
  }

  /**
   * Clear singleton instance (for testing).
   */
  static clearInstance() {
    if (GlobalGraphService._instance) {
      GlobalGraphService._instance._cache.clear();
    }
    GlobalGraphService._instance = null;
  }

  constructor() {
    // Configuration
    this.baseUrl =
      process.env.HIPPORAG_GLOBAL_URL ||
      process.env.HIPPORAG_URL ||
      "http://localhost:8000";
    this.timeout = parseInt(process.env.HIPPORAG_TIMEOUT || "30000", 10);
    this.project = process.env.HIPPORAG_PROJECT || null;

    // LRU Cache (L3.6.3) - using lru-cache v5 API
    this._cache = new LRU({
      max: MAX_CACHE_ENTRIES,
      maxAge: 60 * 1000, // default 60s, overridden per method
      updateAgeOnGet: true,
    });

    // Request stats
    this._stats = {
      requests: 0,
      cacheHits: 0,
      retries: 0,
      errors: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 10 Core Methods (L3.6.1)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Query global graph.
   * DD Reference: §3.2.3 POST /graphs/query
   *
   * @param {string} query - Natural language query
   * @param {object} [config={}] - Query configuration
   * @param {string[]} [config.layers] - Target layers
   * @param {number} [config.topK=10] - Number of results
   * @param {object} [config.filters] - Filter conditions
   * @returns {Promise<object>} Query result
   */
  async query(query, config = {}) {
    const cacheKey = `query:${query}:${JSON.stringify(config)}`;
    const cached = this._getFromCache(cacheKey, "query");
    if (cached) return cached;

    // Redirect to /graph/query (server flat route)
    const result = await this._request("POST", "/graph/query", {
      project: config.project || this.project,
      pattern: query,
      node_type: config.nodeType || null,
      limit: config.topK || 10,
    });

    // Adapt response: server {nodes, total} → client {results, graph_context, summary}
    const adapted = {
      results: result.nodes || [],
      graph_context: {
        nodes: (result.nodes || []).map((n) => ({
          id: n.id,
          type: n.type,
          attributes: { label: n.content || n.id, type: n.type },
        })),
        edges: [],
      },
      summary: `Found ${result.total || 0} nodes matching "${query}"`,
    };

    this._setToCache(cacheKey, adapted, "query");
    return adapted;
  }

  /**
   * Traverse graph from starting node.
   * DD Reference: §3.2.4 POST /graphs/traverse
   *
   * @param {string} startNodeId - Starting node ID
   * @param {object} [config={}] - Traversal configuration
   * @param {string} [config.strategy='bfs'] - 'bfs' | 'dfs'
   * @param {number} [config.maxDepth=3] - Maximum depth
   * @param {string[]} [config.edgeTypes] - Edge types to follow
   * @returns {Promise<object>} Traversal result with nodes
   */
  async traverse(startNodeId, config = {}) {
    const cacheKey = `traverse:${startNodeId}:${JSON.stringify(config)}`;
    const cached = this._getFromCache(cacheKey, "traverse");
    if (cached) return cached;

    // Redirect to /graph/impact (server flat route)
    const result = await this._request("POST", "/graph/impact", {
      project: config.project || this.project,
      node_id: startNodeId,
      max_depth: config.maxDepth || 3,
    });

    // Adapt response: server {affected_nodes} → client {nodes}
    const adapted = {
      nodes: (result.affected_nodes || []).map((n) => ({
        id: n.id,
        type: n.type,
        depth: n.depth,
        path: n.path,
      })),
      breaking_changes: [],
    };

    this._setToCache(cacheKey, adapted, "traverse");
    return adapted;
  }

  /**
   * Get context for an agent.
   * DD Reference: §5.1.1
   *
   * @param {string} query - Context query
   * @param {object} agentDef - Agent definition
   * @param {string} agentDef.name - Agent name
   * @param {string[]} [agentDef.techStack] - Technology keywords
   * @returns {Promise<object>} Context with chunks and graph
   */
  async getContext(query, agentDef) {
    const agentName = agentDef?.name || "default";
    const cacheKey = `context:${query}:${agentName}`;
    const cached = this._getFromCache(cacheKey, "getContext");
    if (cached) return cached;

    // Query vector + graph
    const queryResult = await this.query(query, {
      layers: agentDef?.techStack || ["all"],
      topK: 5,
      includeGraphContext: true,
    });

    // Build context response
    const result = {
      chunks: queryResult.results || [],
      graph: {
        nodes: queryResult.graph_context?.nodes || [],
        edges: queryResult.graph_context?.edges || [],
      },
      summary: queryResult.summary || "No context available",
      mode: queryResult.results?.length > 0 ? "rag2" : "graph-only",
    };

    this._setToCache(cacheKey, result, "getContext");
    return result;
  }

  /**
   * Health check.
   * DD Reference: §5.1.1
   *
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    const cacheKey = "health:check";
    const cached = this._getFromCache(cacheKey, "healthCheck");
    if (cached) return cached;

    try {
      const result = await this._request("GET", "/health");

      const status = {
        status: result.status || "unknown",
        version: result.version || "unknown",
        uptime: result.uptime_seconds || 0,
        healthy: result.status === "healthy",
      };

      this._setToCache(cacheKey, status, "healthCheck");
      return status;
    } catch (err) {
      return {
        status: "unhealthy",
        version: "unknown",
        uptime: 0,
        healthy: false,
        error: err.message,
      };
    }
  }

  /**
   * Get impact analysis for a node.
   * DD Reference: §2.8 Impact Analysis
   *
   * @param {string} nodeId - Node ID
   * @param {number} [maxDepth=3] - Max traversal depth
   * @returns {Promise<object>} Impact result
   */
  async getImpact(nodeId, maxDepth = 3) {
    const result = await this.traverse(nodeId, {
      strategy: "bfs",
      maxDepth,
    });

    return {
      nodeId,
      affectedNodes: result.nodes || [],
      depth: maxDepth,
      breakingChanges: result.breaking_changes || [],
    };
  }

  /**
   * Get statistics.
   * @returns {Promise<object>} Graph stats
   */
  async getStats() {
    const health = await this.healthCheck();
    const sync = { status: 'server-managed' };

    return {
      health,
      sync,
      cache: {
        size: this._cache.size,
        hits: this._stats.cacheHits,
        requests: this._stats.requests,
        hitRate:
          this._stats.requests > 0
            ? (this._stats.cacheHits / this._stats.requests).toFixed(2)
            : "0.00",
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Request with Retry (L3.6.2)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Make HTTP request with retry logic.
   * @private
   */
  async _request(method, path, body = null) {
    this._stats.requests++;

    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Add auth if configured
    const token =
      process.env.HIPPORAG_JWT_TOKEN || process.env.HIPPORAG_API_KEY;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let lastError;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const options = {
          method,
          headers,
          signal: controller.signal,
        };

        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter =
            parseInt(response.headers.get("Retry-After") || "5", 10) * 1000;
          const delay = withJitter(retryAfter, RETRY_CONFIG.jitterPercent);
          await this._sleep(delay);
          this._stats.retries++;
          continue;
        }

        // Parse response
        const contentType = response.headers.get("Content-Type") || "";
        let data;

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Handle errors
        if (!response.ok) {
          throw this._parseError(response.status, data, path);
        }

        return data;
      } catch (err) {
        lastError = err;
        this._stats.errors++;

        // Transform abort to timeout
        if (err.name === "AbortError") {
          lastError = new TimeoutError(`Request timeout: ${path}`);
        }

        // Transform fetch errors to connection errors
        if (
          err.code === "ECONNREFUSED" ||
          err.code === "ETIMEDOUT" ||
          err.message?.includes("fetch")
        ) {
          lastError = new ConnectionError(`Connection failed: ${path}`, {
            originalError: err.message,
          });
        }

        // Don't retry non-retryable errors
        if (!isRetryable(lastError)) {
          throw lastError;
        }

        // Calculate delay with jitter
        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          const delay = withJitter(
            RETRY_CONFIG.delays[attempt],
            RETRY_CONFIG.jitterPercent,
          );
          await this._sleep(delay);
          this._stats.retries++;
        }
      }
    }

    throw lastError;
  }

  /**
   * Parse error response to typed error.
   * @private
   */
  _parseError(status, data, path) {
    const message =
      typeof data === "object"
        ? data.detail || data.message || JSON.stringify(data)
        : String(data);

    switch (status) {
      case 400:
        return new ValidationError(message, { path, data });
      case 404:
        return new NotFoundError(message, { path });
      case 429:
        const retryAfter = typeof data === "object" ? data.retry_after : 5;
        return new RateLimitError(message, retryAfter, { path });
      case 503:
        return new ConnectionError(message, { path });
      case 504:
        return new TimeoutError(message, { path });
      default:
        return new HippoRAGError(message, {
          statusCode: status,
          details: { path, data },
        });
    }
  }

  /**
   * Sleep for specified milliseconds.
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─────────────────────────────────────────────────────────────────
  // Cache Operations (L3.6.3)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get from cache with TTL.
   * @private
   */
  _getFromCache(key, method) {
    const ttl = CACHE_TTL[method] || 60000;
    const cached = this._cache.get(key);

    if (cached) {
      this._stats.cacheHits++;
      return cached;
    }

    return null;
  }

  /**
   * Set to cache with method-specific TTL.
   * @private
   */
  _setToCache(key, value, method) {
    const maxAge = CACHE_TTL[method] || 60000;
    this._cache.set(key, value, maxAge);
  }

  /**
   * Invalidate cache entries matching pattern.
   * @private
   */
  _invalidatePattern(pattern) {
    for (const key of this._cache.keys()) {
      if (pattern.test(key)) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries.
   */
  clearCache() {
    this._cache.clear();
  }
}

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

module.exports = {
  GlobalGraphService,
  // Error classes
  HippoRAGError,
  ConnectionError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  TimeoutError,
  // Utilities
  withJitter,
  isRetryable,
  // Constants
  RETRY_CONFIG,
  CACHE_TTL,
  MAX_CACHE_ENTRIES,
};
