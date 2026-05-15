"use strict";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Module: rag-mcp-server.js
// Pattern: Single-class MCP Server (JSON-RPC 2.0 over stdio)
// SRS: FR-RAG-MCP-001/002/003
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

// HippoRAG imports (top-level for consistent access)
const HippoRAGService = require('../rag/hipporag-service');
const { LAYER_MAP } = require('../rag/hipporag-service');

class RAGMCPServer {
  // ─── Constructor (sync only — no async) ───
  constructor() {
    this._initialized = false;
    this._RAGService = null;
    this._GraphService = null;
    this._GlobalGraphAggregator = null;
    this._aggregator = null;
    this._verbose = process.env.RAG_VERBOSE === "true";
    this._setupStdio();
  }

  // ─── Stdio Setup ───
  _setupStdio() {
    this._rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
      crlfDelay: Infinity,
    });

    this._rl.on("line", (line) => {
      try {
        const request = JSON.parse(line);
        this._handleRequest(request);
      } catch (parseError) {
        console.error("[RAG-MCP] JSON parse error:", parseError.message);
      }
    });

    process.stdin.on("error", (err) => {
      console.error("[RAG-MCP] stdin error:", err.message);
    });
  }

  // ─── Lazy Init (called on first tool call) ───
  async _init() {
    if (this._initialized) return;

    try {
      const basePath = path.join(__dirname, "..");

      // HippoRAGService is imported at top-level
      this._RAGService = HippoRAGService;
      this._GraphService = HippoRAGService;
      this._GlobalGraphAggregator = require(
        path.join(basePath, "graph", "global-graph-aggregator"),
      );

      this._initialized = true;
      if (this._verbose) {
        console.error("[RAG-VERBOSE] Services loaded successfully");
      }
    } catch (error) {
      console.error("[RAG-MCP] Init failed:", error.message);
    }
  }

  // ─── Branch Detection (FR-RAG-BRN-001) ───
  _detectBranch() {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();
    } catch {
      return "master";
    }
  }

  // ─── Request Router ───
  async _handleRequest(request) {
    if (request.id === undefined || request.id === null) {
      if (this._verbose) {
        console.error("[RAG-VERBOSE] Notification:", request.method);
      }
      return;
    }

    try {
      switch (request.method) {
        case "initialize":
          this._sendResponse(request.id, {
            protocolVersion: "2024-11-05",
            serverInfo: { name: "mcp-server-rag", version: "1.0.0" },
            capabilities: { tools: {} },
          });
          break;

        case "notifications/initialized":
          return;

        case "tools/list":
          this._sendResponse(request.id, { tools: this._getAvailableTools() });
          break;

        case "tools/call":
          await this._init();
          const result = await this._handleToolCall(request);
          this._sendResponse(request.id, result);
          break;

        default:
          this._sendError(
            request.id,
            -32601,
            "Method not found: " + request.method,
          );
      }
    } catch (error) {
      this._sendError(request.id, -32603, "Internal error: " + error.message);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Tool Definitions (FR-RAG-MCP-002)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _getAvailableTools() {
    return [
      {
        name: "rag_query",
        description:
          "Vector + Graph combined search. Returns relevant chunks from design docs and source code.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query text" },
            feature: {
              type: "string",
              description: "Feature ID (e.g., AUT-LGIN)",
            },
            branch: {
              type: "string",
              description: "Git branch (auto-detected if omitted)",
            },
            topK: { type: "number", description: "Max results (default: 5)" },
            docType: {
              type: "string",
              description: "Filter: srs, bd, bdd, fdd, test-plan",
            },
            command: {
              type: "string",
              description: "EPS command context for layer routing",
            },
          },
          required: ["query", "feature"],
        },
      },
      {
        name: "rag_graph",
        description:
          "Graph-only operations: context, impact analysis, or stats for a feature.",
        inputSchema: {
          type: "object",
          properties: {
            feature: { type: "string", description: "Feature ID" },
            action: {
              type: "string",
              enum: ["context", "impact", "stats"],
              description: "Graph operation",
            },
            nodeId: {
              type: "string",
              description: "Node ID (required for impact)",
            },
            branch: { type: "string", description: "Git branch" },
            maxDepth: {
              type: "number",
              description: "Max traversal depth (default: 3)",
            },
          },
          required: ["feature", "action"],
        },
      },
      {
        name: "rag_specialists",
        description: "Query specialist knowledge patterns by technology stack.",
        inputSchema: {
          type: "object",
          properties: {
            techStack: {
              type: "array",
              items: { type: "string" },
              description: 'Tech keywords (e.g., ["nestjs", "react"])',
            },
            topK: {
              type: "number",
              description: "Max specialists (default: 3)",
            },
          },
          required: ["techStack"],
        },
      },
      {
        name: "rag_stats",
        description:
          "Health check: vector index and graph stats for a feature.",
        inputSchema: {
          type: "object",
          properties: {
            feature: { type: "string", description: "Feature ID" },
            branch: { type: "string", description: "Git branch" },
          },
          required: ["feature"],
        },
      },
      {
        name: "rag_architecture",
        description:
          "Cross-feature architecture analysis via GlobalGraphAggregator.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["check", "duplicates", "impact", "compatibility"],
              description: "Analysis type",
            },
            nodeId: {
              type: "string",
              description: "Node ID (for impact action)",
            },
            nodeType: {
              type: "string",
              description: "Filter by node type (for duplicates)",
            },
            feature: {
              type: "string",
              description: "Feature ID (for compatibility)",
            },
            focus: {
              type: "string",
              description: "Focus area for projected subgraph",
            },
          },
          required: ["action"],
        },
      },
    ];
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Tool Call Dispatch (FR-RAG-MCP-003)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async _handleToolCall(request) {
    const toolName = request.params && request.params.name;
    const args = (request.params && request.params.arguments) || {};
    const startTime = Date.now();

    try {
      let result = null;

      switch (toolName) {
        case "rag_query":
          result = await this._tool_rag_query(args);
          break;
        case "rag_graph":
          result = await this._tool_rag_graph(args);
          break;
        case "rag_specialists":
          result = await this._tool_rag_specialists(args);
          break;
        case "rag_stats":
          result = await this._tool_rag_stats(args);
          break;
        case "rag_architecture":
          result = await this._tool_rag_architecture(args);
          break;
        default:
          return {
            content: [{ type: "text", text: "Unknown tool: " + toolName }],
            isError: true,
          };
      }

      if (this._verbose) {
        console.error(
          "[RAG-VERBOSE] " + toolName + ": " + (Date.now() - startTime) + "ms",
        );
      }

      if (result.error) {
        return {
          content: [{ type: "text", text: result.error.message }],
          isError: true,
        };
      }

      return { content: [{ type: "text", text: result.text }] };
    } catch (error) {
      console.error("[RAG-MCP] Tool error (" + toolName + "):", error.message);
      return {
        content: [
          {
            type: "text",
            text: "Internal error in " + toolName + ": " + error.message,
          },
        ],
        isError: true,
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TOOL HANDLERS
  // Pattern: validate → delegate → format
  // Error: return { error: { category, message, tool } }
  // Success: return { text: string }
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ─── rag_query (FR-RAG-QRY-001, FR-RAG-QRY-002) ───
  async _tool_rag_query(args) {
    if (!args.query || typeof args.query !== "string") {
      return {
        error: {
          category: "Validation",
          message: "Required: query (string), feature (string)",
          tool: "rag_query",
        },
      };
    }
    if (!args.feature || typeof args.feature !== "string") {
      return {
        error: {
          category: "Validation",
          message: "Required: query (string), feature (string)",
          tool: "rag_query",
        },
      };
    }

    const branch = args.branch || this._detectBranch();
    const options = { topK: args.topK || 5 };

    // Map well-known feature names to layer for correct filter routing
    const mappedLayer = LAYER_MAP[args.feature];
    if (mappedLayer) {
      options.layer = mappedLayer;
    }

    if (args.command) {
      const layers = HippoRAGService.getLayerForCommand(args.command);
      if (layers) options.layers = layers;
    }
    if (args.docType) options.docType = args.docType;

    try {
      const ragService = HippoRAGService.getInstance(
        args.feature,
        branch,
      );
      const result = await ragService.getContext(
        args.query,
        { name: "mcp-tool" },
        options,
      );

      let text = "## RAG Query Results\n\n";
      text +=
        "**Feature**: " + args.feature + " | **Branch**: " + branch + "\n";
      text +=
        "**Mode**: " +
        result.mode +
        " | **Chunks**: " +
        result.chunks.length +
        "\n\n";

      if (result.chunks.length > 0) {
        result.chunks.forEach((chunk, index) => {
          text += "### Result " + (index + 1) + "\n";
          if (chunk.metadata && chunk.metadata.docType) {
            text += "**Type**: " + chunk.metadata.docType;
          }
          if (chunk.score) {
            text += " | **Score**: " + chunk.score.toFixed(3);
          }
          text += "\n\n";
          text += (chunk.text || "") + "\n\n";
        });
      } else {
        text +=
          '_No results found for query in feature "' + args.feature + '"_\n';
      }

      if (result.graph && result.graph.nodes && result.graph.nodes.length > 0) {
        text += "### Graph Context\n";
        text += "**Nodes**: " + result.graph.nodes.length;
        text +=
          " | **Edges**: " +
          ((result.graph.edges && result.graph.edges.length) || 0) +
          "\n";
      }

      return { text };
    } catch (error) {
      console.error("[RAG-MCP] rag_query service error:", error.message);
      return {
        error: {
          category: "Service",
          message: "Vector search failed: " + error.message,
          tool: "rag_query",
        },
      };
    }
  }

  // ─── rag_graph (FR-RAG-GRF-001, FR-RAG-GRF-002) ───
  async _tool_rag_graph(args) {
    if (!args.feature) {
      return {
        error: {
          category: "Validation",
          message: "Required: feature (string), action (context|impact|stats)",
          tool: "rag_graph",
        },
      };
    }
    if (!args.action || !["context", "impact", "stats"].includes(args.action)) {
      return {
        error: {
          category: "Validation",
          message: "Required: action must be context, impact, or stats",
          tool: "rag_graph",
        },
      };
    }
    if (args.action === "impact" && !args.nodeId) {
      return {
        error: {
          category: "Validation",
          message: 'nodeId required for action "impact"',
          tool: "rag_graph",
        },
      };
    }

    const branch = args.branch || this._detectBranch();

    try {
      const graphService = HippoRAGService.getInstance(
        args.feature,
        branch,
      );

      switch (args.action) {
        case "context": {
          const result = await graphService.getContext({ name: "mcp-tool" });
          return { text: JSON.stringify(result, null, 2) };
        }
        case "impact": {
          const maxDepth = args.maxDepth || 3;
          const result = await graphService.getImpact(args.nodeId, maxDepth);
          return { text: JSON.stringify(result, null, 2) };
        }
        case "stats": {
          const result = graphService.getStats();
          return { text: JSON.stringify(result, null, 2) };
        }
      }
    } catch (error) {
      return {
        error: {
          category: "Service",
          message:
            'Graph service unavailable for feature "' + args.feature + '"',
          tool: "rag_graph",
        },
      };
    }
  }

  // ─── rag_specialists (FR-RAG-SPC-001) ───
  async _tool_rag_specialists(args) {
    if (!Array.isArray(args.techStack) || args.techStack.length === 0) {
      return {
        error: {
          category: "Validation",
          message: "Required: techStack (non-empty string array)",
          tool: "rag_specialists",
        },
      };
    }

    const topK = args.topK || 3;

    try {
      const ragService = HippoRAGService.getInstance(
        "eps-knowledge",
        "_global",
      );
      const results = await ragService.querySpecialists(args.techStack, topK);

      let text = "## Specialist Patterns\n\n";
      text += "**Tech Stack**: " + args.techStack.join(", ") + "\n";
      text += "**Found**: " + results.length + " specialists\n\n";

      results.forEach((spec, index) => {
        text += "### Specialist " + (index + 1) + "\n";
        text += (spec.text || "") + "\n\n";
      });

      if (results.length === 0) {
        text +=
          "_No specialists found for [" + args.techStack.join(", ") + "]_\n";
      }

      return { text };
    } catch (error) {
      return {
        error: {
          category: "Service",
          message: "Specialist search unavailable",
          tool: "rag_specialists",
        },
      };
    }
  }

  // ─── rag_stats (FR-RAG-STS-001) ───
  async _tool_rag_stats(args) {
    if (!args.feature) {
      return {
        error: {
          category: "Validation",
          message: "Required: feature (string)",
          tool: "rag_stats",
        },
      };
    }

    const branch = args.branch || this._detectBranch();

    try {
      const ragService = HippoRAGService.getInstance(
        args.feature,
        branch,
      );
      const ragStats = await ragService.getStats();

      const graphService = HippoRAGService.getInstance(
        args.feature,
        branch,
      );
      const graphStats = graphService.getStats();

      const combined = {
        feature: args.feature,
        branch: branch,
        vector: ragStats,
        graph: graphStats,
      };

      return { text: JSON.stringify(combined, null, 2) };
    } catch (error) {
      return {
        error: {
          category: "Service",
          message: 'Stats unavailable for feature "' + args.feature + '"',
          tool: "rag_stats",
        },
      };
    }
  }

  // ─── rag_architecture (FR-RAG-ARC-001/002/003/004) ───
  async _tool_rag_architecture(args) {
    if (
      !args.action ||
      !["check", "duplicates", "impact", "compatibility"].includes(args.action)
    ) {
      return {
        error: {
          category: "Validation",
          message: "Required: action (check|duplicates|impact|compatibility)",
          tool: "rag_architecture",
        },
      };
    }
    if (args.action === "impact" && !args.nodeId) {
      return {
        error: {
          category: "Validation",
          message: 'nodeId required for action "impact"',
          tool: "rag_architecture",
        },
      };
    }
    if (args.action === "compatibility" && !args.feature) {
      return {
        error: {
          category: "Validation",
          message: 'feature required for action "compatibility"',
          tool: "rag_architecture",
        },
      };
    }

    try {
      if (!this._aggregator) {
        this._aggregator = this._GlobalGraphAggregator.getInstance();
        await this._aggregator.init();
      }

      let result = null;

      switch (args.action) {
        case "check":
          result = this._aggregator.checkConsistency();
          break;
        case "duplicates":
          result = this._aggregator.findDuplicates(args.nodeType || null);
          break;
        case "impact":
          result = this._aggregator.crossImpact(args.nodeId, 3, 100);
          break;
        case "compatibility":
          result = this._aggregator.checkCompatibility(
            args.feature,
            args.focus || null,
          );
          break;
      }

      let text = "## Architecture Analysis: " + args.action + "\n\n";
      text += JSON.stringify(result, null, 2);

      return { text };
    } catch (error) {
      return {
        error: {
          category: "Service",
          message: "GlobalGraphAggregator unavailable: " + error.message,
          tool: "rag_architecture",
        },
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Response Formatting
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _sendResponse(id, result) {
    const response = { jsonrpc: "2.0", id, result };
    process.stdout.write(JSON.stringify(response) + "\n");
  }

  _sendError(id, code, message) {
    const response = { jsonrpc: "2.0", id, error: { code, message } };
    process.stdout.write(JSON.stringify(response) + "\n");
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Entry Point
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
new RAGMCPServer();
