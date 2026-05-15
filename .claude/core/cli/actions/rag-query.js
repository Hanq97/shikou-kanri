"use strict";

/**
 * rag-query — Query HippoRAG server for relevant context
 *
 * Args:
 *   --query <text>    Natural language query (required)
 *   --command <name>  Auto-resolve layers from LAYER_PRIORITY (e.g., design-srs)
 *   --layers <list>   Explicit comma-separated layers (e.g., code,arch,docs)
 *   --layer <name>    Single layer (backward compat, default: eps)
 *   --topK <n>        Max results (default: 5)
 *   --feature <id>    Feature code (default: _global)
 *   --branch <name>   Git branch (default: current)
 *
 * Priority: --layers > --command > --layer > default "eps"
 *
 * Returns: { chunks, graph, mode, query, layers }
 */

const path = require("path");
const { execSync } = require("child_process");

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const query = args.query;
    if (!query) {
      return { error: "rag-query requires --query" };
    }

    const topK = parseInt(args.topK || "5", 10);
    const feature = args.feature || "_global";

    let branch = args.branch || null;
    if (!branch) {
      try {
        branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
      } catch (_) {
        branch = "main";
      }
    }

    // Resolve layers: --layers > --command > --layer > default "eps"
    const HippoRAGService = require(path.join(pkgRoot, "core/rag/hipporag-service"));

    let queryLayers = null;
    if (args.layers) {
      queryLayers = args.layers.split(",");
    } else if (args.command) {
      queryLayers = HippoRAGService.getLayerForCommand(args.command);
    } else if (args.layer) {
      queryLayers = [args.layer];
    }

    try {
      const service = HippoRAGService.getInstance(feature, branch);

      const result = await service.getContext(query, { name: "ops-cli" }, {
        topK,
        layers: queryLayers,
        layer: queryLayers ? undefined : "eps",
      });

      return {
        chunks: result.chunks || [],
        graph: result.graph || { nodes: [], edges: [] },
        mode: result.mode || "unknown",
        query,
        layers: queryLayers || ["eps"],
      };
    } catch (err) {
      return {
        error: `rag-query failed: ${err.message}`,
        chunks: [],
        graph: { nodes: [], edges: [] },
        mode: "error",
        query,
        layers: queryLayers || ["eps"],
      };
    }
  },
};
