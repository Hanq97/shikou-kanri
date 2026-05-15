"use strict";

/**
 * Build Design Graph — Extract design standard documents into Neo4j
 *
 * Reads SRS, Basic Design, and Detail Design templates from
 * .claude/docs/design-standards/ and extracts into graph.
 *
 * Usage:
 *   node build-design-graph.js --project eagle-plus --branch develop_202601
 *
 * @module build-design-graph
 */

const fs = require("fs");
const path = require("path");
const HippoRAGService = require('../rag/hipporag-service');

const DESIGN_STANDARDS_DIR = path.resolve(
  __dirname,
  "../../docs/design-standards",
);

// Design doc sources and their docTypes
const DESIGN_SOURCES = [
  { dir: "srs", docType: "srs", label: "SRS" },
  { dir: "basic-design", docType: "bd", label: "Basic Design" },
  { dir: "detail-design/backend", docType: "bdd", label: "Backend DD" },
  { dir: "detail-design/frontend", docType: "fdd", label: "Frontend DD" },
];

/**
 * Build design graph from design standard documents.
 * @param {string} branch
 * @param {string} project
 * @returns {object} Build statistics
 */
async function buildDesignGraph(branch, project) {
  console.log(
    `\n[build-design-graph] Starting: project=${project}, branch=${branch}`,
  );
  console.log(`[build-design-graph] Design dir: ${DESIGN_STANDARDS_DIR}`);

  if (!fs.existsSync(DESIGN_STANDARDS_DIR)) {
    console.warn(
      `[build-design-graph] Design standards directory not found: ${DESIGN_STANDARDS_DIR}`,
    );
    return {
      totalFiles: 0,
      totalNodes: 0,
      totalEdges: 0,
      errors: ["Directory not found"],
    };
  }

  const featureId = "_design-standards";
  const gs = HippoRAGService.getInstance(featureId, branch);

  const stats = {
    totalFiles: 0,
    sources: {},
    totalNodes: 0,
    totalEdges: 0,
    errors: [],
  };

  for (const source of DESIGN_SOURCES) {
    const dirPath = path.join(DESIGN_STANDARDS_DIR, source.dir);

    if (!fs.existsSync(dirPath)) {
      console.log(
        `  [${source.label}] Directory not found: ${dirPath}, skipping`,
      );
      continue;
    }

    const files = findMarkdownFiles(dirPath);
    console.log(
      `  [${source.label}] Found ${files.length} files in ${source.dir}/`,
    );

    let sourceNodes = 0;
    let sourceEdges = 0;

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      try {
        const content = fs.readFileSync(filePath, "utf8");

        // Section ID from filename: 01-overview.md → DS-SRS-01
        const numMatch = fileName.match(/^(\d+)/);
        const sectionId = numMatch
          ? `DS-${source.docType.toUpperCase()}-${numMatch[1]}`
          : `DS-${source.docType.toUpperCase()}-${fileName.replace(".md", "")}`;

        const beforeNodes = gs.store.getStats().nodes;
        const beforeEdges = gs.store.getStats().edges;

        await gs.extractAndUpdate(content, source.docType, sectionId);

        const afterNodes = gs.store.getStats().nodes;
        const afterEdges = gs.store.getStats().edges;
        const newNodes = afterNodes - beforeNodes;
        const newEdges = afterEdges - beforeEdges;

        sourceNodes += newNodes;
        sourceEdges += newEdges;
        stats.totalFiles++;
      } catch (err) {
        const msg = `Error processing ${source.dir}/${fileName}: ${err.message}`;
        console.warn(`    WARN: ${msg}`);
        stats.errors.push(msg);
      }
    }

    console.log(`    → ${sourceNodes} nodes, ${sourceEdges} edges`);
    stats.sources[source.label] = {
      files: files.length,
      nodes: sourceNodes,
      edges: sourceEdges,
    };
    stats.totalNodes += sourceNodes;
    stats.totalEdges += sourceEdges;
  }

  // Also process feature-specific design docs from documents/features/
  const featuresDir = path.resolve(__dirname, "../../../documents/features");
  if (fs.existsSync(featuresDir)) {
    const featureDirs = fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    console.log(
      `\n  [Feature Docs] Found ${featureDirs.length} feature directories`,
    );

    for (const featureDir of featureDirs) {
      const featurePath = path.join(featuresDir, featureDir);
      const mdFiles = fs
        .readdirSync(featurePath)
        .filter((f) => f.endsWith(".md"));

      if (mdFiles.length === 0) continue;

      // Extract feature code from directory name: GLB-global-graph → GLB
      const featureCode = featureDir.split("-")[0];
      const featureFeatureId = `${featureCode}-design`;

      const featureGs = HippoRAGService.getInstance(featureFeatureId, branch);
      let featureNodes = 0;
      let featureEdges = 0;

      for (const mdFile of mdFiles) {
        try {
          const content = fs.readFileSync(
            path.join(featurePath, mdFile),
            "utf8",
          );

          // Determine docType from filename
          let docType = "bd"; // default
          if (mdFile.includes("srs")) docType = "srs";
          else if (mdFile.includes("frontend-detail")) docType = "fdd";
          else if (mdFile.includes("backend-detail")) docType = "bdd";
          else if (mdFile.includes("basic-design")) docType = "bd";
          else if (mdFile.includes("test-plan")) docType = "test-plan";
          else if (mdFile.includes("detail-design")) docType = "bdd";

          const sectionId = `FD-${featureCode}-${mdFile.replace(".md", "")}`;

          const beforeNodes = featureGs.store.getStats().nodes;
          const beforeEdges = featureGs.store.getStats().edges;

          await featureGs.extractAndUpdate(content, docType, sectionId);

          const afterNodes = featureGs.store.getStats().nodes;
          const afterEdges = featureGs.store.getStats().edges;
          featureNodes += afterNodes - beforeNodes;
          featureEdges += afterEdges - beforeEdges;
        } catch (err) {
          stats.errors.push(`Feature ${featureDir}/${mdFile}: ${err.message}`);
        }
      }

      if (featureNodes > 0) {
        // Tag and persist
        try {
          const graphData = featureGs.store.serialize();
          if (graphData && graphData.nodes) {
            for (const node of graphData.nodes) {
              if (node.attributes) {
                node.attributes.project = project;
                node.attributes.layer = "design";
              }
            }
            featureGs.store.deserialize(graphData);
            featureGs.dirty = true;
          }
          await featureGs.persist();
        } catch (err) {
          stats.errors.push(`Persist ${featureFeatureId}: ${err.message}`);
        }

        console.log(
          `    ${featureDir}: ${featureNodes} nodes, ${featureEdges} edges`,
        );
        stats.totalNodes += featureNodes;
        stats.totalEdges += featureEdges;
      }
    }
  }

  // Tag design standards nodes with project + layer
  try {
    const graphData = gs.store.serialize();
    if (graphData && graphData.nodes) {
      for (const node of graphData.nodes) {
        if (node.attributes) {
          node.attributes.project = project;
          node.attributes.layer = "design";
        }
      }
      gs.store.deserialize(graphData);
      gs.dirty = true;
    }
  } catch (err) {
    console.warn(`  Tag warning: ${err.message}`);
  }

  // Persist design standards
  try {
    await gs.persist();
    console.log(
      `\n[build-design-graph] Persisted: ${stats.totalNodes} nodes, ${stats.totalEdges} edges`,
    );
  } catch (err) {
    console.error(`[build-design-graph] PERSIST ERROR: ${err.message}`);
    stats.errors.push(`Persist: ${err.message}`);
  }

  return stats;
}

/**
 * Recursively find .md files.
 */
function findMarkdownFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findMarkdownFiles(full));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
  } catch (e) {
    // Skip unreadable
  }
  return results;
}

// ─── CLI ───
if (require.main === module) {
  const args = process.argv.slice(2);
  const projectIdx = args.indexOf("--project");
  const branchIdx = args.indexOf("--branch");

  const project = projectIdx !== -1 ? args[projectIdx + 1] : "eagle-plus";
  const branch = branchIdx !== -1 ? args[branchIdx + 1] : "develop_202601";

  buildDesignGraph(branch, project)
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

module.exports = { buildDesignGraph };
