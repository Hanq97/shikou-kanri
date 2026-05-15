"use strict";

/**
 * HippoRAG2 HTTP Client
 *
 * Low-level HTTP client for HippoRAG2 Server API.
 * Handles authentication, request/response serialization, error handling, and retries.
 *
 * @module hipporag-client
 */

const fs = require("fs");
const path = require("path");

// Load configuration: project rag-server.json > legacy hipporag-config.json > env vars
const RAG_CONFIG_PATH = path.join(process.cwd(), '.claude/config/rag-server.json');
const LEGACY_CONFIG_PATH = path.join(process.cwd(), '.claude/config/hipporag-config.json');

/**
 * Load HippoRAG configuration from file.
 * @returns {object} Configuration object
 */
function loadConfig() {
  // Try rag-server.json first (new unified format)
  try {
    if (fs.existsSync(RAG_CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(RAG_CONFIG_PATH, "utf8"));
      return raw.hipporag || raw;
    }
  } catch (err) {
    console.warn(`[HippoRAGClient] Failed to load rag-server.json: ${err.message}`);
  }

  // Fallback: legacy hipporag-config.json
  try {
    if (fs.existsSync(LEGACY_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(LEGACY_CONFIG_PATH, "utf8"));
    }
  } catch (err) {
    console.warn(`[HippoRAGClient] Failed to load hipporag-config.json: ${err.message}`);
  }

  // Default configuration from env vars
  return {
    url: process.env.HIPPORAG_URL || "http://localhost:8000",
    timeout_ms: parseInt(process.env.HIPPORAG_TIMEOUT || "30000", 10),
    jwt_token: process.env.HIPPORAG_JWT_TOKEN || "",
    poll_interval_ms: 1000,
    max_poll_attempts: 60,
    max_retries: 3,
    retry_delay_ms: 1000,
  };
}

/**
 * RFC 7807 Problem Details error.
 */
class HippoRAGError extends Error {
  constructor(type, title, status, detail, instance, extensions = {}) {
    super(detail || title);
    this.name = "HippoRAGError";
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    this.extensions = extensions;
  }
}

/**
 * HippoRAG2 HTTP Client.
 */
class HippoRAGClient {
  /**
   * @param {object} [options] - Override configuration
   * @param {string} [options.url] - Server URL
   * @param {string} [options.token] - JWT token
   * @param {number} [options.timeout] - Request timeout in ms
   */
  constructor(options = {}) {
    const config = loadConfig();

    this.baseUrl = options.url || config.url;
    this.token = options.token || config.jwt_token;
    this.timeout = options.timeout || config.timeout_ms;
    this.pollInterval = config.poll_interval_ms || 1000;
    this.maxPollAttempts = config.max_poll_attempts || 60;
    this.maxRetries = config.max_retries || 3;
    this.retryDelay = config.retry_delay_ms || 1000;
  }

  /**
   * Make HTTP request with retry logic.
   * @private
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {object} [body] - Request body
   * @returns {Promise<object>} Response data
   */
  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        options.signal = controller.signal;

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter =
            parseInt(response.headers.get("Retry-After") || "5", 10) * 1000;
          await this._sleep(retryAfter);
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

        // Don't retry on auth errors
        if (err.status === 401 || err.status === 403) {
          throw err;
        }

        // Don't retry on not found
        if (err.status === 404) {
          throw err;
        }

        // Retry with backoff
        if (attempt < this.maxRetries - 1) {
          await this._sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Parse error response to HippoRAGError.
   * @private
   */
  _parseError(status, data, path) {
    if (typeof data === "object" && data.type) {
      // RFC 7807 format
      return new HippoRAGError(
        data.type,
        data.title,
        data.status || status,
        data.detail,
        data.instance || path,
        data.extensions || {},
      );
    }

    // Generic error
    return new HippoRAGError(
      `${this.baseUrl}/errors/unknown`,
      "Request Failed",
      status,
      typeof data === "string" ? data : JSON.stringify(data),
      path,
    );
  }

  /**
   * Sleep for specified milliseconds.
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─────────────────────────────────────────────────────────────────
  // Vector Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * Query single layer.
   * @param {string} project - Project identifier
   * @param {string} layer - Knowledge layer (eps, arch, design, code)
   * @param {string} query - Query text
   * @param {number} [topK=5] - Number of results
   * @param {boolean} [includeMetadata=true] - Include metadata (unused, kept for compat)
   * @returns {Promise<object>} Query response
   */
  async query(project, layer, query, topK = 5, includeMetadata = true) {
    return this._request("POST", "/query", {
      project,
      text: query,
      layers: layer ? [layer] : null,
      top_k: topK,
    });
  }

  /**
   * Query multiple layers.
   * @param {string} project - Project identifier
   * @param {string[]} layers - Knowledge layers
   * @param {string} query - Query text
   * @param {number} [topKPerLayer=3] - Results per layer
   * @param {boolean} [mergeResults=true] - Merge and re-rank
   * @returns {Promise<object>} Multi-query response
   */
  async multiQuery(
    project,
    layers,
    query,
    topKPerLayer = 3,
    mergeResults = true,
  ) {
    return this._request("POST", "/multi-query", {
      project,
      layers,
      text: query,
      top_k_per_layer: topKPerLayer,
      merge_results: mergeResults,
    });
  }

  /**
   * Index a document.
   * @param {string} jobId - Job identifier
   * @returns {Promise<object>} Job status response
   */
  async getJobStatus(jobId) {
    return this._request("GET", `/jobs/${jobId}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Graph Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * Extract entities from content.
   * @param {string} project - Project identifier
   * @param {string} layer - Knowledge layer
   * @param {string} content - Markdown content
   * @param {string} docType - Document type
   * @param {string} [sectionId='C0'] - Checkpoint ID
   * @param {string} [feature] - Feature code
   * @returns {Promise<object>} Extract response
   */
  async graphExtract(
    project,
    layer,
    content,
    docType,
    sectionId = "C0",
    feature = null,
  ) {
    return this._request("POST", "/graph/extract", {
      project,
      layer,
      content,
      doc_type: docType,
      section_id: sectionId,
      feature,
    });
  }

  /**
   * Query graph context for an agent.
   * @param {string} project - Project identifier
   * @param {string} layer - Knowledge layer
   * @param {string} agentName - Agent name
   * @param {string} [checkpoint] - Optional checkpoint filter
   * @returns {Promise<object>} Graph context response
   */
  async graphQuery(project, layer, agentName, checkpoint = null) {
    return this._request("POST", "/graph/query", {
      project,
      pattern: agentName || null,
      limit: 50,
    });
  }

  /**
   * Query graph entities for DDMetadata population.
   * Returns all entity types matching modulePattern (regex).
   * @param {string} project - Project identifier
   * @param {string} modulePattern - Regex pattern (e.g., "cmn.*?015")
   * @param {object} [options={}] - Query options
   * @param {number} [options.limit=200] - Max nodes to return
   * @returns {Promise<{nodes: object[], total: number}>}
   */
  async graphQueryEntities(project, modulePattern, options = {}) {
    return this._request("POST", "/graph/query", {
      project,
      pattern: modulePattern || null,
      limit: options.limit || 200,
    });
  }

  /**
   * Batch parse source files via server AST.
   * @param {string} project - Project identifier
   * @param {object[]} files - Array of {path, content} objects
   * @param {object} [config=null] - Optional parser config
   * @returns {Promise<{results: object[], parsed: number, failed: number}>}
   */
  async astParseBatch(project, files, config = null) {
    return this._request("POST", "/ast/parse-batch", {
      project,
      files: files.slice(0, 50),
      config,
    });
  }

  /**
   * Perform impact analysis.
   * @param {string} project - Project identifier
   * @param {string} layer - Knowledge layer
   * @param {string} nodeId - Starting node ID
   * @param {number} [maxDepth=3] - Maximum traversal depth
   * @param {string[]} [edgeTypes] - Edge types to follow
   * @returns {Promise<object>} Impact analysis response
   */
  async graphImpact(project, layer, nodeId, maxDepth = 3, edgeTypes = null) {
    return this._request("POST", "/graph/impact", {
      project,
      node_id: nodeId,
      max_depth: maxDepth,
    });
  }

  /**
   * Find orphan nodes.
   * @param {string} project - Project identifier
   * @param {string} layer - Knowledge layer
   * @param {string} [nodeType] - Optional node type filter
   * @returns {Promise<object>} Orphans response
   */
  async graphOrphans(project, layer, nodeType = null) {
    const params = new URLSearchParams({ project });
    return this._request("GET", `/graph/orphans?${params.toString()}`);
  }

  /**
   * Check coverage quality gate.
   * @param {string} project - Project identifier
   * @param {string} layer - Knowledge layer
   * @param {string} ruleId - Quality rule (Q5_FR_COVERAGE, Q6_COMP_ORPHAN, Q7_API_TESTED)
   * @returns {Promise<object>} Coverage response
   */
  async graphCoverage(project, layer, ruleId) {
    return this._request("POST", "/graph/coverage", {
      project,
      layer,
      rule_id: ruleId,
    });
  }

  /**
   * Get graph statistics.
   * @param {string} project - Project identifier
   * @param {string} layer - Knowledge layer (eps, arch, design, code)
   * @param {object} [options] - Optional parameters
   * @param {string} [options.feature] - Feature code (e.g., BLC-blockchain) for feature graphs
   * @param {string} [options.branch='master'] - Git branch
   * @returns {Promise<object>} Stats response
   */
  async graphStats(project, layer, options = {}) {
    const params = new URLSearchParams({
      project,
      layer,
    });

    if (options.feature) {
      params.set("feature", options.feature);
    }
    if (options.branch) {
      params.set("branch", options.branch);
    }

    return this._request("GET", `/graph/stats?${params.toString()}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────
  // Health Endpoint
  // ─────────────────────────────────────────────────────────────────

  /**
   * Check server health.
   * @returns {Promise<object>} Health response
   */
  async health() {
    return this._request("GET", "/health");
  }
}

// Singleton instance
let _client = null;

/**
 * Get singleton HippoRAG client.
 * @param {object} [options] - Override configuration
 * @returns {HippoRAGClient}
 */
function getClient(options = {}) {
  if (!_client || Object.keys(options).length > 0) {
    _client = new HippoRAGClient(options);
  }
  return _client;
}

/**
 * Clear singleton client (for testing).
 */
function clearClient() {
  _client = null;
}

/**
 * Get project ID from config.
 * Reads from hipporag-config.json or falls back to project-config.json
 * @returns {string} Project ID
 */
function getProjectId() {
  const config = loadConfig();
  if (config.project) {
    return config.project;
  }

  // Fallback: try to read from project-config.json
  try {
    const projectConfigPath = path.join(process.cwd(), '.claude/config/project-config.json');
    if (fs.existsSync(projectConfigPath)) {
      const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, "utf8"));
      if (projectConfig.projectId) {
        return projectConfig.projectId;
      }
    }
  } catch (err) {
    console.warn(`[HippoRAGClient] Failed to load project config: ${err.message}`);
  }

  // Default fallback
  return "default";
}

module.exports = {
  HippoRAGClient,
  HippoRAGError,
  getClient,
  clearClient,
  getProjectId,
  loadConfig,
};
