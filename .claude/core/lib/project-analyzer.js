#!/usr/bin/env node
/**
 * Project Analyzer - Auto-detect project configuration
 *
 * Analyzes project structure to detect:
 * - Technology stack (backend, frontend, database)
 * - Architecture pattern
 * - Source code modules
 * - Design documents status
 * - RAG system health
 *
 * Usage:
 *   node core/lib/project-analyzer.js [--json] [--rag-only] [--stack-only]
 *
 * @module project-analyzer
 * @version 1.0.0
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

class ProjectAnalyzer {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.claudeDir = path.join(projectRoot, ".claude");
  }

  /**
   * Run full analysis
   */
  async analyze() {
    const results = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      currentConfig: await this.loadCurrentConfig(),
      detectedStack: await this.detectTechStack(),
      structure: await this.analyzeStructure(),
      designDocs: await this.analyzeDesignDocs(),
      ragStatus: await this.checkRAGStatus(),
      recommendations: [],
    };

    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  /**
   * Load current project configuration
   */
  async loadCurrentConfig() {
    const config = {
      projectConfig: null,
      sourceRoots: null,
      infrastructure: null,
    };

    try {
      const projectConfigPath = path.join(
        this.claudeDir,
        "config",
        "project-config.json"
      );
      if (fs.existsSync(projectConfigPath)) {
        config.projectConfig = JSON.parse(
          fs.readFileSync(projectConfigPath, "utf8")
        );
      }
    } catch (err) {
      config.projectConfigError = err.message;
    }

    try {
      const { getTechStack } = require("../state/project-config.js");
      const ts = getTechStack();
      config.sourceRoots = ts.sourceRoots;
      config.infrastructure = ts.infrastructure;
    } catch (err) {
      config.techStackError = err.message;
    }

    return config;
  }

  /**
   * Detect technology stack from project files
   */
  async detectTechStack() {
    const detected = {
      backend: { value: null, confidence: "low", source: null },
      frontend: { value: null, confidence: "low", source: null },
      database: { value: null, confidence: "low", source: null },
      blockchain: { value: null, confidence: "low", source: null },
      architecture: { value: null, confidence: "low", source: null },
      realtime: { value: null, confidence: "low", source: null },
    };

    // Check package.json (Node.js ecosystem)
    const pkgPath = path.join(this.projectRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Backend detection
        if (deps["@nestjs/core"]) {
          const version = deps["@nestjs/core"].replace(/[\^~]/, "");
          detected.backend = {
            value: `NestJS ${version}`,
            confidence: "high",
            source: "package.json",
          };

          // Check for common NestJS additions
          const additions = [];
          if (deps["@nestjs/swagger"]) additions.push("Swagger");
          if (deps["@nestjs/graphql"]) additions.push("GraphQL");
          if (deps["@nestjs/websockets"]) additions.push("WebSockets");
          if (deps["@nestjs/bull"]) additions.push("Bull Queue");
          if (additions.length > 0) {
            detected.backend.value += ` + ${additions.join(" + ")}`;
          }
        } else if (deps["express"]) {
          detected.backend = {
            value: "Express.js",
            confidence: "high",
            source: "package.json",
          };
        } else if (deps["fastify"]) {
          detected.backend = {
            value: "Fastify",
            confidence: "high",
            source: "package.json",
          };
        } else if (deps["hapi"]) {
          detected.backend = {
            value: "Hapi.js",
            confidence: "high",
            source: "package.json",
          };
        }

        // Frontend detection
        if (deps["react"]) {
          const version = deps["react"].replace(/[\^~]/, "");
          let frontend = `React ${version}`;

          const additions = [];
          if (deps["@mui/material"])
            additions.push(`Material-UI ${deps["@mui/material"].replace(/[\^~]/, "")}`);
          if (deps["@reduxjs/toolkit"])
            additions.push(`Redux Toolkit ${deps["@reduxjs/toolkit"].replace(/[\^~]/, "")}`);
          if (deps["react-router-dom"]) additions.push("React Router");
          if (deps["@tanstack/react-query"]) additions.push("React Query");
          if (additions.length > 0) {
            frontend += ` + ${additions.join(" + ")}`;
          }

          detected.frontend = {
            value: frontend,
            confidence: "high",
            source: "package.json",
          };
        } else if (deps["vue"]) {
          detected.frontend = {
            value: `Vue.js ${deps["vue"].replace(/[\^~]/, "")}`,
            confidence: "high",
            source: "package.json",
          };
        } else if (deps["@angular/core"]) {
          detected.frontend = {
            value: `Angular ${deps["@angular/core"].replace(/[\^~]/, "")}`,
            confidence: "high",
            source: "package.json",
          };
        }

        // Database detection from dependencies
        const databases = [];
        if (deps["pg"] || deps["@prisma/client"] || deps["typeorm"]) {
          if (deps["pg"]) databases.push("PostgreSQL");
        }
        if (deps["mongodb"] || deps["mongoose"]) {
          databases.push("MongoDB");
        }
        if (deps["redis"] || deps["ioredis"]) {
          databases.push("Redis");
        }
        if (deps["couchdb-nano"] || deps["nano"]) {
          databases.push("CouchDB");
        }
        if (databases.length > 0) {
          detected.database = {
            value: databases.join(" + "),
            confidence: "medium",
            source: "package.json dependencies",
          };
        }

        // Blockchain detection
        if (deps["fabric-network"] || deps["fabric-ca-client"]) {
          detected.blockchain = {
            value: "Hyperledger Fabric",
            confidence: "high",
            source: "package.json",
          };
        } else if (deps["ethers"] || deps["web3"]) {
          detected.blockchain = {
            value: "Ethereum/EVM",
            confidence: "high",
            source: "package.json",
          };
        }

        // Realtime detection
        if (deps["socket.io"] || deps["@nestjs/websockets"]) {
          detected.realtime = {
            value: "WebSocket (Socket.io)",
            confidence: "high",
            source: "package.json",
          };
        } else if (deps["ws"]) {
          detected.realtime = {
            value: "WebSocket (ws)",
            confidence: "high",
            source: "package.json",
          };
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    // Check for .csproj (C# ecosystem)
    const csprojFiles = this.findFiles(this.projectRoot, /\.csproj$/i, 2);
    if (csprojFiles.length > 0) {
      detected.backend = {
        value: "ASP.NET Core",
        confidence: "high",
        source: csprojFiles[0],
      };
    }

    // Check for pom.xml (Java ecosystem)
    if (fs.existsSync(path.join(this.projectRoot, "pom.xml"))) {
      detected.backend = {
        value: "Java/Spring Boot",
        confidence: "high",
        source: "pom.xml",
      };
    }

    // Check for go.mod (Go ecosystem)
    if (fs.existsSync(path.join(this.projectRoot, "go.mod"))) {
      detected.backend = {
        value: "Go",
        confidence: "high",
        source: "go.mod",
      };
    }

    // Check docker-compose for database
    const composePath = path.join(this.projectRoot, "docker-compose.yml");
    if (fs.existsSync(composePath)) {
      try {
        const compose = fs.readFileSync(composePath, "utf8");
        const databases = [];
        if (/postgres/i.test(compose)) databases.push("PostgreSQL");
        if (/mongo/i.test(compose)) databases.push("MongoDB");
        if (/redis/i.test(compose)) databases.push("Redis");
        if (/couchdb/i.test(compose)) databases.push("CouchDB");
        if (/mysql|mariadb/i.test(compose)) databases.push("MySQL/MariaDB");

        if (databases.length > 0 && !detected.database.value) {
          detected.database = {
            value: databases.join(" + "),
            confidence: "high",
            source: "docker-compose.yml",
          };
        }
      } catch (err) {
        // Ignore
      }
    }

    // Architecture detection
    if (
      fs.existsSync(path.join(this.projectRoot, "apps")) &&
      fs.existsSync(path.join(this.projectRoot, "libs"))
    ) {
      detected.architecture = {
        value: "Monorepo (Nx-style)",
        confidence: "high",
        source: "apps/ + libs/ directories",
      };
    } else if (
      fs.existsSync(path.join(this.projectRoot, "src", "domain")) ||
      fs.existsSync(path.join(this.projectRoot, "src", "application"))
    ) {
      detected.architecture = {
        value: "Clean Architecture with DDD",
        confidence: "high",
        source: "src/domain/ or src/application/",
      };
    } else if (fs.existsSync(path.join(this.projectRoot, "src"))) {
      detected.architecture = {
        value: "Standard (src/)",
        confidence: "medium",
        source: "src/ directory",
      };
    }

    return detected;
  }

  /**
   * Analyze project structure
   */
  async analyzeStructure() {
    const structure = {
      sourceRoot: null,
      modules: [],
      totalFiles: 0,
      totalLines: 0,
    };

    // Determine source root - check multiple patterns
    const sourcePatterns = [
      { dir: "apps", type: "monorepo" },
      { dir: "src", type: "standard" },
      { dir: "lib", type: "library" },
      { dir: "backend", type: "fullstack" },
      { dir: "packages", type: "monorepo" },
    ];

    for (const pattern of sourcePatterns) {
      if (fs.existsSync(path.join(this.projectRoot, pattern.dir))) {
        structure.sourceRoot = pattern.dir;
        structure.sourceType = pattern.type;
        break;
      }
    }

    // For fullstack projects, also scan frontend
    if (structure.sourceType === "fullstack" && fs.existsSync(path.join(this.projectRoot, "frontend"))) {
      structure.additionalRoots = ["frontend"];
    }

    if (structure.sourceRoot) {
      const sourceDir = path.join(this.projectRoot, structure.sourceRoot);
      const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const modulePath = path.join(sourceDir, entry.name);
          const files = this.countFiles(modulePath, /\.(ts|js|tsx|jsx|cs|java|go|py)$/);
          if (files > 0) {
            structure.modules.push({
              name: entry.name,
              path: `${structure.sourceRoot}/${entry.name}`,
              files: files,
            });
            structure.totalFiles += files;
          }
        }
      }
    }

    return structure;
  }

  /**
   * Analyze design documents
   */
  async analyzeDesignDocs() {
    const docs = {
      total: 0,
      srs: { count: 0, files: [] },
      basicDesign: { count: 0, files: [] },
      detailDesign: { count: 0, files: [] },
      features: [],
    };

    const docsPath = path.join(this.projectRoot, "documents", "features");
    if (!fs.existsSync(docsPath)) {
      return docs;
    }

    // Find all feature directories
    const features = fs.readdirSync(docsPath, { withFileTypes: true });
    for (const feature of features) {
      if (feature.isDirectory()) {
        const featurePath = path.join(docsPath, feature.name);
        const featureInfo = {
          name: feature.name,
          srs: false,
          basicDesign: false,
          detailDesign: false,
        };

        const files = fs.readdirSync(featurePath);
        for (const file of files) {
          if (file.endsWith("-srs.md")) {
            docs.srs.count++;
            docs.srs.files.push(path.join(feature.name, file));
            featureInfo.srs = true;
          } else if (file.endsWith("-basic-design.md")) {
            docs.basicDesign.count++;
            docs.basicDesign.files.push(path.join(feature.name, file));
            featureInfo.basicDesign = true;
          } else if (file.endsWith("-detail-design.md") || file.endsWith("-bdd.md") || file.endsWith("-fdd.md")) {
            docs.detailDesign.count++;
            docs.detailDesign.files.push(path.join(feature.name, file));
            featureInfo.detailDesign = true;
          }
        }

        if (featureInfo.srs || featureInfo.basicDesign || featureInfo.detailDesign) {
          docs.features.push(featureInfo);
        }
      }
    }

    docs.total = docs.srs.count + docs.basicDesign.count + docs.detailDesign.count;
    return docs;
  }

  /**
   * Check RAG system status
   */
  async checkRAGStatus() {
    const status = {
      hipporag: { available: false, version: null, uptime: null },
      embedding: { available: false },
      layers: [],
      lastError: null,
    };

    // Load RAG URLs from rag-server.json (unified) or legacy files
    const ragConfigPath = path.join(process.cwd(), '.claude/config/rag-server.json');
    const legacyHipporagPath = path.join(process.cwd(), '.claude/config/hipporag-config.json');
    const legacyEmbeddingPath = path.join(process.cwd(), '.claude/config/embedding-server.json');
    let hipporagUrl = "http://localhost:8000";
    let embeddingUrl = "http://localhost:8080";
    try {
      if (fs.existsSync(ragConfigPath)) {
        const rcfg = JSON.parse(fs.readFileSync(ragConfigPath, 'utf8'));
        hipporagUrl = rcfg.hipporag?.url || hipporagUrl;
        embeddingUrl = rcfg.embedding?.url || embeddingUrl;
      } else {
        try { hipporagUrl = JSON.parse(fs.readFileSync(legacyHipporagPath, 'utf8')).url || hipporagUrl; } catch (e) {}
        try { embeddingUrl = JSON.parse(fs.readFileSync(legacyEmbeddingPath, 'utf8')).url || embeddingUrl; } catch (e) {}
      }
    } catch (e) {}

    // Check HippoRAG server
    try {
      const hipporagHealth = await this.httpGet(`${hipporagUrl}/health`, 3000);
      if (hipporagHealth) {
        const data = JSON.parse(hipporagHealth);
        status.hipporag = {
          available: data.status === "healthy",
          version: data.version,
          uptime: Math.floor(data.uptime_seconds / 3600) + " hours",
          instancesLoaded: data.instances_loaded,
          dependencies: data.dependencies,
        };
      }
    } catch (err) {
      status.lastError = `HippoRAG: ${err.message}`;
    }

    // Check embedding server
    try {
      const embeddingHealth = await this.httpGet(`${embeddingUrl}/health`, 3000);
      if (embeddingHealth) {
        status.embedding = { available: true };
      }
    } catch (err) {
      if (!status.lastError) {
        status.lastError = `Embedding: ${err.message}`;
      }
    }

    // Get layer stats if available
    if (status.hipporag.available) {
      try {
        let projectId = process.env.HIPPORAG_PROJECT;
        if (!projectId) {
          const cfgPath = path.join(this.claudeDir, "config", "project-config.json");
          if (fs.existsSync(cfgPath)) {
            projectId = JSON.parse(fs.readFileSync(cfgPath, "utf8")).projectId;
          }
        }
        const stats = await this.httpGet(
          `${hipporagUrl}/graph/stats?project=${encodeURIComponent(projectId || "default")}`,
          3000,
        );
        if (stats) {
          status.layers = JSON.parse(stats);
        }
      } catch (err) {
        // Stats endpoint might not exist or project not found
      }
    }

    return status;
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Stack mismatch
    if (results.currentConfig.sourceRoots && results.currentConfig.sourceRoots.length > 0) {
      const configuredStacks = results.currentConfig.sourceRoots.map(r => r.stackKey || r.stack);
      const detected = results.detectedStack;
      if (detected.backend.confidence === "high" && !configuredStacks.some(s => s?.includes("nestjs")) && detected.backend.value?.includes("NestJS")) {
        recommendations.push({
          type: "warning",
          message: "Detected NestJS but stack config doesn't match",
          action: "Consider updating sourceRoots stack to 'typescript-nestjs'",
        });
      }
    }

    // RAG not available
    if (!results.ragStatus.hipporag.available) {
      recommendations.push({
        type: "warning",
        message: "HippoRAG server unavailable",
        action: "Start HippoRAG server for RAG features (see .claude/config/hipporag-config.json)",
      });
    }

    // No design docs
    if (results.designDocs.total === 0) {
      recommendations.push({
        type: "info",
        message: "No design documents found",
        action: "Run /research → /innovate → /design to create design docs",
      });
    }

    // Source code not indexed
    if (results.ragStatus.hipporag.available && results.structure.totalFiles > 0) {
      recommendations.push({
        type: "info",
        message: `${results.structure.totalFiles} source files available for indexing`,
        action: "Run /scan --code to index source code for RAG",
      });
    }

    return recommendations;
  }

  // ─────────────────────────────────────────────────────────────
  // Helper methods
  // ─────────────────────────────────────────────────────────────

  findFiles(dir, pattern, maxDepth = 3, currentDepth = 0) {
    const files = [];
    if (currentDepth > maxDepth) return files;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          files.push(...this.findFiles(fullPath, pattern, maxDepth, currentDepth + 1));
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
    return files;
  }

  countFiles(dir, pattern, maxDepth = 5, currentDepth = 0) {
    let count = 0;
    if (currentDepth > maxDepth) return count;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist") {
          count += this.countFiles(fullPath, pattern, maxDepth, currentDepth + 1);
        } else if (entry.isFile() && pattern.test(entry.name)) {
          count++;
        }
      }
    } catch (err) {
      // Ignore
    }
    return count;
  }

  httpGet(url, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Timeout"));
      });
    });
  }
}

// ─────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const ragOnly = args.includes("--rag-only");
  const stackOnly = args.includes("--stack-only");

  const analyzer = new ProjectAnalyzer();

  if (ragOnly) {
    const status = await analyzer.checkRAGStatus();
    if (jsonOutput) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log("\n🔍 RAG System Status\n");
      console.log(`HippoRAG Server: ${status.hipporag.available ? "✅ Available" : "❌ Unavailable"}`);
      if (status.hipporag.available) {
        console.log(`  Version: ${status.hipporag.version}`);
        console.log(`  Uptime: ${status.hipporag.uptime}`);
      }
      console.log(`Embedding Server: ${status.embedding.available ? "✅ Available" : "❌ Unavailable"}`);
      if (status.lastError) {
        console.log(`\n⚠️ Error: ${status.lastError}`);
      }
    }
    return;
  }

  if (stackOnly) {
    const detected = await analyzer.detectTechStack();
    if (jsonOutput) {
      console.log(JSON.stringify(detected, null, 2));
    } else {
      console.log("\n🔬 Detected Tech Stack\n");
      for (const [key, value] of Object.entries(detected)) {
        if (value.value) {
          console.log(`${key}: ${value.value} (${value.confidence}, from ${value.source})`);
        }
      }
    }
    return;
  }

  // Full analysis
  const results = await analyzer.analyze();

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log("\n" + "═".repeat(60));
    console.log("  📊 Project Analysis Results");
    console.log("═".repeat(60) + "\n");

    // Current config
    if (results.currentConfig.projectConfig) {
      console.log("📋 Current Configuration:");
      console.log(`   Project: ${results.currentConfig.projectConfig.name}`);
      console.log(`   Stacks: ${(results.currentConfig.sourceRoots || []).map(r => r.stackKey || r.stack).join(', ')}`);
      console.log("");
    }

    // Detected stack
    console.log("🔬 Detected Tech Stack:");
    for (const [key, value] of Object.entries(results.detectedStack)) {
      if (value.value) {
        const confidence = value.confidence === "high" ? "✓" : "?";
        console.log(`   ${confidence} ${key}: ${value.value}`);
      }
    }
    console.log("");

    // Structure
    console.log("📁 Project Structure:");
    console.log(`   Source Root: ${results.structure.sourceRoot || "not detected"}`);
    console.log(`   Modules: ${results.structure.modules.length}`);
    console.log(`   Total Files: ${results.structure.totalFiles}`);
    console.log("");

    // Design docs
    console.log("📄 Design Documents:");
    console.log(`   SRS: ${results.designDocs.srs.count}`);
    console.log(`   Basic Design: ${results.designDocs.basicDesign.count}`);
    console.log(`   Detail Design: ${results.designDocs.detailDesign.count}`);
    console.log("");

    // RAG status
    console.log("🔍 RAG System:");
    console.log(`   HippoRAG: ${results.ragStatus.hipporag.available ? "✅ Available" : "❌ Unavailable"}`);
    console.log(`   Embedding: ${results.ragStatus.embedding.available ? "✅ Available" : "❌ Unavailable"}`);
    console.log("");

    // Recommendations
    if (results.recommendations.length > 0) {
      console.log("💡 Recommendations:");
      for (const rec of results.recommendations) {
        const icon = rec.type === "warning" ? "⚠️" : "ℹ️";
        console.log(`   ${icon} ${rec.message}`);
        console.log(`      → ${rec.action}`);
      }
    }

    console.log("\n" + "═".repeat(60) + "\n");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

module.exports = ProjectAnalyzer;
