"use strict";

/**
 * Build Source Graph — Extract source files into Neo4j knowledge graph.
 *
 * Reads sourceRoot + excludeDirs from project-config.json.
 * sourceRoot can be:
 *   - "."          → scan from project root (exclude non-source dirs)
 *   - "apps"       → scan single subfolder
 *   - ["src/fe","src/be"] → scan multiple folders
 *
 * Supports .ts/.tsx (TypeScript) and .cs (C#) files.
 * Uses stackId to determine which extractors to use.
 *
 * Usage:
 *   node build-source-graph.js --project eagle-plus --branch develop_202601
 *
 * @module build-source-graph
 */

const fs = require("fs");
const path = require("path");
const sourceExtractor = require("./source-extractor");
const moduleMapper = require("./source-module-mapper");
const HippoRAGService = require('../rag/hipporag-service');

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const CONFIG_ROOT = path.resolve(__dirname, "..", "..", "config");

// Default directories to always skip
const DEFAULT_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "bin",
  "obj",
  ".git",
  ".claude",
  ".vs",
  ".vscode",
  ".idea",
  "coverage",
  "__pycache__",
]);

// File extensions by stack
const EXTENSIONS_BY_STACK = {
  "csharp-react-mssql": [".ts", ".tsx", ".cs"],
  "nestjs-blockchain": [".ts", ".tsx"],
  "fastapi-react": [".ts", ".tsx", ".py"],
};
const DEFAULT_EXTENSIONS = [".ts", ".tsx"];

/**
 * Load config from project-config.json.
 * Returns { sourceRoots: string[], skipDirs: Set, extensions: string[] }
 */
function loadConfig() {
  const configPath = path.join(CONFIG_ROOT, "project-config.json");
  if (!fs.existsSync(configPath)) {
    return {
      sourceRoots: [PROJECT_ROOT],
      skipDirs: DEFAULT_SKIP_DIRS,
      extensions: DEFAULT_EXTENSIONS,
    };
  }

  const { getTechStack, loadConfig } = require("../state/project-config.js");
  const ts = getTechStack();
  const config = loadConfig();

  // Resolve sourceRoots → array of absolute paths
  const sourceRoots = ts.sourceRoots.map((r) => path.resolve(PROJECT_ROOT, r.path));

  // Build skip dirs: defaults + excludeDirs from config + documentsPath
  const skipDirs = new Set(DEFAULT_SKIP_DIRS);
  if (Array.isArray(config.excludeDirs)) {
    for (const d of config.excludeDirs) skipDirs.add(d);
  }
  if (config.documentsPath) {
    skipDirs.add(config.documentsPath);
  }

  // Merge file extensions from all sourceRoots stacks
  const extSet = new Set();
  for (const root of ts.sourceRoots) {
    const stackExts = EXTENSIONS_BY_STACK[root.stackKey || root.stack];
    if (stackExts) stackExts.forEach((e) => extSet.add(e));
  }
  const extensions = extSet.size > 0 ? [...extSet] : DEFAULT_EXTENSIONS;

  return { sourceRoots, skipDirs, extensions };
}

/**
 * Simple fallback extractor for non-TS files (e.g. .cs, .py).
 * Creates a basic SRC node without deep AST parsing.
 */
const simpleExtractor = {
  extract(content, filePath, feature) {
    return {
      classes: [],
      functions: [],
      imports: [],
      exports: [],
      meta: { filePath, feature, linesOfCode: content.split("\n").length },
    };
  },
  toGraphEntities(result, filePath, feature) {
    const srcNodeId = `SRC-${filePath}`;
    return {
      nodes: [
        {
          id: srcNodeId,
          attributes: {
            type: "SourceFile",
            language: path.extname(filePath).replace(".", ""),
            feature,
            filePath,
            linesOfCode: result.meta.linesOfCode,
          },
        },
      ],
      edges: [],
    };
  },
};

/**
 * Get the appropriate extractor for a file.
 * TS/TSX → full source-extractor, others → simple SRC node.
 */
function getExtractor(filePath) {
  if (/\.tsx?$/.test(filePath)) {
    return sourceExtractor;
  }
  return simpleExtractor;
}

/**
 * Build source code graph for all source files.
 * @param {string} branch - Git branch
 * @param {string} project - Project ID
 * @returns {object} Build statistics
 */
async function buildSourceGraph(branch, project) {
  console.log(
    `\n[build-source-graph] Starting: project=${project}, branch=${branch}`,
  );

  const { sourceRoots, skipDirs, extensions } = loadConfig();

  console.log(
    `[build-source-graph] Source roots: ${sourceRoots.map((r) => path.relative(PROJECT_ROOT, r) || ".").join(", ")}`,
  );
  console.log(`[build-source-graph] Extensions: ${extensions.join(", ")}`);
  console.log(
    `[build-source-graph] Skip dirs: ${[...skipDirs].sort().join(", ")}`,
  );

  // Find all source files across all roots
  const allFiles = [];
  for (const root of sourceRoots) {
    allFiles.push(...findSourceFiles(root, skipDirs, extensions));
  }
  console.log(`[build-source-graph] Found ${allFiles.length} source files`);

  // For module mapping, use paths relative to PROJECT_ROOT
  const relativePaths = allFiles.map((f) => path.relative(PROJECT_ROOT, f));
  const groups = moduleMapper.groupFilesByModule(relativePaths);

  const moduleNames = Object.keys(groups).sort();
  console.log(`[build-source-graph] Modules: ${moduleNames.join(", ")}`);

  const stats = {
    totalFiles: allFiles.length,
    modules: {},
    totalNodes: 0,
    totalEdges: 0,
    errors: [],
  };

  // Process each module
  for (const [moduleCode, relPaths] of Object.entries(groups)) {
    const featureId =
      moduleCode === "_shared" ? "_shared" : `${moduleCode}-source`;

    console.log(
      `  [${moduleCode}] ${relPaths.length} files → feature=${featureId}`,
    );

    const gs = HippoRAGService.getInstance(featureId, branch);
    let moduleNodes = 0;
    let moduleEdges = 0;

    for (const relPath of relPaths) {
      const absPath = path.join(PROJECT_ROOT, relPath);
      try {
        const content = fs.readFileSync(absPath, "utf8");
        const extractor = getExtractor(relPath);
        const result = extractor.extract(content, relPath, featureId);
        const entities = extractor.toGraphEntities(result, relPath, featureId);

        // Add nodes to graph store
        for (const node of entities.nodes) {
          gs.store.addNode(node.id, {
            ...node.attributes,
            project,
            layer: "source",
            module: moduleCode,
          });
          moduleNodes++;
        }

        // Add edges to graph store
        for (const edge of entities.edges) {
          gs.store.addEdge(edge.source, edge.target, {
            ...edge.attributes,
            project,
            layer: "source",
          });
          moduleEdges++;
        }

        gs.dirty = true;
      } catch (err) {
        const msg = `Error processing ${relPath}: ${err.message}`;
        console.warn(`    WARN: ${msg}`);
        stats.errors.push(msg);
      }
    }

    // Persist module graph
    try {
      await gs.persist();
      console.log(`    Persisted: ${moduleNodes} nodes, ${moduleEdges} edges`);
    } catch (err) {
      console.error(`    PERSIST ERROR: ${err.message}`);
      stats.errors.push(`Persist ${featureId}: ${err.message}`);
    }

    stats.modules[moduleCode] = {
      files: relPaths.length,
      nodes: moduleNodes,
      edges: moduleEdges,
    };
    stats.totalNodes += moduleNodes;
    stats.totalEdges += moduleEdges;
  }

  console.log(
    `\n[build-source-graph] Complete: ${stats.totalNodes} nodes, ${stats.totalEdges} edges across ${moduleNames.length} modules`,
  );
  return stats;
}

/**
 * Recursively find source files matching given extensions.
 * @param {string} dir - Directory to scan
 * @param {Set<string>} skipDirs - Directory names to skip
 * @param {string[]} extensions - File extensions to include (e.g. ['.ts', '.tsx', '.cs'])
 */
function findSourceFiles(dir, skipDirs, extensions) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        results.push(...findSourceFiles(full, skipDirs, extensions));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!extensions.includes(ext)) continue;
        // Skip test, spec, declaration, designer files
        if (/\.(spec|test|d)\.tsx?$/.test(entry.name)) continue;
        if (/\.Designer\.cs$/.test(entry.name)) continue;
        if (/\.g\.cs$/.test(entry.name)) continue; // auto-generated
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

  buildSourceGraph(branch, project)
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

module.exports = { buildSourceGraph };
