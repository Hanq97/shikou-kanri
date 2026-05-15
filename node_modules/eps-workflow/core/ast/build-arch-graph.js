"use strict";

/**
 * Build Architecture Graph — Extract architecture documents into Neo4j
 *
 * Reads documents/architecture/*.md and extracts Component, Entity, API nodes
 * via GraphService.extractAndUpdate().
 *
 * Usage:
 *   node build-arch-graph.js --project eagle-plus --branch develop_202601
 *
 * @module build-arch-graph
 */

const fs = require("fs");
const path = require("path");
const HippoRAGService = require('../rag/hipporag-service');

const ARCH_DIR = path.resolve(__dirname, "../../../documents/architecture");

/**
 * Build architecture graph from markdown documents.
 * @param {string} branch
 * @param {string} project
 * @returns {object} Build statistics
 */
async function buildArchGraph(branch, project) {
  console.log(
    `\n[build-arch-graph] Starting: project=${project}, branch=${branch}`,
  );
  console.log(`[build-arch-graph] Arch dir: ${ARCH_DIR}`);

  if (!fs.existsSync(ARCH_DIR)) {
    console.warn(
      `[build-arch-graph] Architecture directory not found: ${ARCH_DIR}`,
    );
    return {
      totalFiles: 0,
      totalNodes: 0,
      totalEdges: 0,
      errors: ["Directory not found"],
    };
  }

  const files = fs
    .readdirSync(ARCH_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(ARCH_DIR, f));

  console.log(`[build-arch-graph] Found ${files.length} architecture docs`);

  const featureId = "_architecture";
  const gs = HippoRAGService.getInstance(featureId, branch);

  const stats = {
    totalFiles: files.length,
    processedFiles: [],
    totalNodes: 0,
    totalEdges: 0,
    errors: [],
  };

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    try {
      const content = fs.readFileSync(filePath, "utf8");

      // Extract section ID from filename: 04-source-code-architecture.md → ARCH-04
      const numMatch = fileName.match(/^(\d+)/);
      const sectionId = numMatch
        ? `ARCH-${numMatch[1]}`
        : `ARCH-${fileName.replace(".md", "")}`;

      const beforeNodes = gs.store.getStats().nodes;
      const beforeEdges = gs.store.getStats().edges;

      await gs.extractAndUpdate(content, "architecture", sectionId);

      const afterNodes = gs.store.getStats().nodes;
      const afterEdges = gs.store.getStats().edges;
      const newNodes = afterNodes - beforeNodes;
      const newEdges = afterEdges - beforeEdges;

      console.log(`  ${fileName}: +${newNodes} nodes, +${newEdges} edges`);
      stats.processedFiles.push({
        file: fileName,
        nodes: newNodes,
        edges: newEdges,
      });
      stats.totalNodes += newNodes;
      stats.totalEdges += newEdges;
    } catch (err) {
      const msg = `Error processing ${fileName}: ${err.message}`;
      console.warn(`  WARN: ${msg}`);
      stats.errors.push(msg);
    }
  }

  // Tag all nodes with project + layer before persisting
  try {
    const graphData = gs.store.serialize();
    if (graphData && graphData.nodes) {
      for (const node of graphData.nodes) {
        if (node.attributes) {
          node.attributes.project = project;
          node.attributes.layer = "architecture";
        }
      }
      gs.store.deserialize(graphData);
      gs.dirty = true;
    }
  } catch (err) {
    console.warn(`  Tag warning: ${err.message}`);
  }

  // Persist
  try {
    await gs.persist();
    console.log(
      `\n[build-arch-graph] Persisted: ${stats.totalNodes} nodes, ${stats.totalEdges} edges`,
    );
  } catch (err) {
    console.error(`[build-arch-graph] PERSIST ERROR: ${err.message}`);
    stats.errors.push(`Persist: ${err.message}`);
  }

  return stats;
}

// ─── CLI ───
if (require.main === module) {
  const args = process.argv.slice(2);
  const projectIdx = args.indexOf("--project");
  const branchIdx = args.indexOf("--branch");

  const project = projectIdx !== -1 ? args[projectIdx + 1] : "eagle-plus";
  const branch = branchIdx !== -1 ? args[branchIdx + 1] : "develop_202601";

  buildArchGraph(branch, project)
    .then((stats) => {
      console.log("\n--- Stats ---");
      console.log(JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Build failed:", err);
      process.exit(1);
    });
}

module.exports = { buildArchGraph };
