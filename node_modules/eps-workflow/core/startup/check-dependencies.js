#!/usr/bin/env node
/**
 * EPS Framework Dependency Checker
 *
 * Checks if all required dependencies for the EPS workflow are installed.
 * Run this on project startup to ensure environment is ready.
 *
 * Usage: node core/startup/check-dependencies.js
 *
 * Exit codes:
 *   0 = All dependencies installed
 *   1 = Missing dependencies (prints install instructions)
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Required dependencies for EPS workflow
const REQUIRED_DEPS = [
  {
    name: "@google/generative-ai",
    description: "Gemini SDK for /innovate multi-model workflow",
    requiredFor: ["/innovate", "Multi-model option generation"],
  },
  // Note: Qdrant and Neo4j drivers removed - now using HippoRAG Server (configured in .claude/config/rag-server.json)
];

// Optional but recommended dependencies
const OPTIONAL_DEPS = [
  {
    name: "graphology-traversal",
    description: "Graph traversal algorithms",
    requiredFor: ["Advanced graph queries"],
  },
  {
    name: "graphology-shortest-path",
    description: "Shortest path algorithms",
    requiredFor: ["Dependency path analysis"],
  },
];

/**
 * Check if a package is installed
 * @param {string} packageName
 * @returns {{installed: boolean, version: string|null}}
 */
function checkPackage(packageName) {
  try {
    // Try require.resolve first (cross-platform)
    const resolved = require.resolve(packageName, { paths: [process.cwd()] });
    // Try to get version from package.json
    try {
      const pkgJsonPath = path.join(
        path.dirname(resolved).split("node_modules")[0],
        "node_modules",
        packageName.split("/").length > 1 && packageName.startsWith("@")
          ? packageName
          : packageName,
        "package.json",
      );
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      return { installed: true, version: pkgJson.version || "unknown" };
    } catch (e) {
      return { installed: true, version: "unknown" };
    }
  } catch (err) {
    return { installed: false, version: null };
  }
}

/**
 * Check if node_modules exists
 * @returns {boolean}
 */
function checkNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), "node_modules");
  return fs.existsSync(nodeModulesPath);
}

/**
 * Main check function
 */
function checkDependencies() {
  console.log("");
  console.log(
    "╔══════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║         EPS Framework - Dependency Check                         ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════╝",
  );
  console.log("");

  // Check node_modules first
  if (!checkNodeModules()) {
    console.log("❌ node_modules not found!");
    console.log("");
    console.log("Please run:");
    console.log("  npm install");
    console.log("");
    process.exit(1);
  }

  const missing = [];
  const installed = [];

  // Check required dependencies
  console.log("📦 Required Dependencies:");
  console.log("─".repeat(60));

  for (const dep of REQUIRED_DEPS) {
    const result = checkPackage(dep.name);
    if (result.installed) {
      console.log(`  ✅ ${dep.name} (v${result.version})`);
      installed.push(dep);
    } else {
      console.log(`  ❌ ${dep.name} - MISSING`);
      console.log(`     └─ ${dep.description}`);
      console.log(`     └─ Required for: ${dep.requiredFor.join(", ")}`);
      missing.push(dep);
    }
  }

  console.log("");

  // Check optional dependencies
  console.log("📦 Optional Dependencies:");
  console.log("─".repeat(60));

  const missingOptional = [];
  for (const dep of OPTIONAL_DEPS) {
    const result = checkPackage(dep.name);
    if (result.installed) {
      console.log(`  ✅ ${dep.name} (v${result.version})`);
    } else {
      console.log(`  ⚠️  ${dep.name} - not installed (optional)`);
      missingOptional.push(dep);
    }
  }

  console.log("");

  // Summary
  if (missing.length > 0) {
    console.log("═".repeat(60));
    console.log("❌ MISSING REQUIRED DEPENDENCIES");
    console.log("═".repeat(60));
    console.log("");
    console.log("The following packages are required for EPS workflow:");
    console.log("");

    for (const dep of missing) {
      console.log(`  • ${dep.name}`);
    }

    console.log("");
    console.log("Please run:");
    console.log("");
    console.log("  npm install");
    console.log("");
    console.log("Or install individually:");
    console.log("");
    console.log(`  npm install ${missing.map((d) => d.name).join(" ")}`);
    console.log("");

    process.exit(1);
  }

  // All good
  console.log("═".repeat(60));
  console.log("✅ All required dependencies are installed!");
  console.log("═".repeat(60));
  console.log("");
  console.log("EPS workflow commands are ready to use:");
  console.log("  /research  - Evidence gathering");
  console.log("  /innovate  - Generate alternatives (requires Gemini API key)");
  console.log("  /design    - Create design documents");
  console.log("  /plan      - Create implementation plan");
  console.log("  /execute   - Execute plan");
  console.log("  /validate  - Review implementation");
  console.log("");

  // Reminder about API key
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.log("⚠️  Note: GEMINI_API_KEY environment variable not set.");
    console.log("   RAG embeddings will not work until API key is configured.");
    console.log('   Set it in your shell: export GEMINI_API_KEY="your-key"');
    console.log("");
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  checkDependencies();
}

module.exports = { checkDependencies, checkPackage, REQUIRED_DEPS };
