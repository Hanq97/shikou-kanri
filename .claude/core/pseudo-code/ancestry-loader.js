#!/usr/bin/env node

/**
 * Ancestry Chain Loader v1.0
 * Loads full context chain for DD generation
 *
 * Implements: FR-PSEUDO-005
 *
 * Required Documents (in order):
 * 1. Evidence Report
 * 2. SRS INNOVATE Selection
 * 3. SRS Document
 * 4. BD INNOVATE Selection
 * 5. Basic Design Document
 * 6. DD INNOVATE Selection
 *
 * Created: 2026-02-12
 * EPS Framework v5.2
 */

const fs = require("fs");
const path = require("path");

class AncestryLoader {
  /**
   * @param {string} contextDir - Context directory (memory-bank path)
   * @param {string} docsDir - Documents directory
   * @param {string} featureName - Feature name for file paths
   */
  constructor(contextDir, docsDir, featureName) {
    this.contextDir = contextDir;
    this.docsDir = docsDir;
    this.featureName = featureName;
    this.loadedDocuments = {};
    this.missingRequired = [];
    this.missingOptional = [];
  }

  /**
   * Get the ancestry chain definition
   */
  getAncestryChain() {
    return [
      {
        id: 1,
        name: "Evidence Report",
        path: path.join(this.contextDir, "evidence.md"),
        required: true,
        description: "Research findings and problem analysis",
      },
      {
        id: 2,
        name: "SRS INNOVATE Selection",
        path: path.join(this.contextDir, "innovate-srs-selection.md"),
        required: true,
        description: "Approved business approach for SRS",
      },
      {
        id: 3,
        name: "SRS Document",
        path: path.join(this.docsDir, `${this.featureName}-srs.md`),
        required: true,
        description: "Software requirements specification",
      },
      {
        id: 4,
        name: "BD INNOVATE Selection",
        path: path.join(this.contextDir, "innovate-bd-selection.md"),
        required: true,
        description: "Approved architectural approach for Basic Design",
      },
      {
        id: 5,
        name: "Basic Design Document",
        path: path.join(this.docsDir, `${this.featureName}-basic-design.md`),
        required: true,
        description: "Component architecture and design patterns",
      },
      {
        id: 6,
        name: "DD INNOVATE Selection",
        path: path.join(this.contextDir, "innovate-dd-selection.md"),
        required: true,
        description: "Approved technical decisions for Detail Design",
      },
    ];
  }

  /**
   * Load all documents in the ancestry chain
   * @returns {{ success: boolean, documents: object, missing: string[], summary: object }}
   */
  load() {
    const ancestryChain = this.getAncestryChain();

    console.log("\n📚 Loading Ancestry Chain (6 documents)...\n");

    ancestryChain.forEach((doc) => {
      if (fs.existsSync(doc.path)) {
        const content = fs.readFileSync(doc.path, "utf8");
        this.loadedDocuments[doc.name] = {
          id: doc.id,
          path: doc.path,
          size: content.length,
          lines: content.split("\n").length,
          content: content,
        };
        console.log(`✅ [${doc.id}] ${doc.name}`);
        console.log(`   Path: ${doc.path}`);
        console.log(
          `   Size: ${(content.length / 1024).toFixed(1)} KB, ${content.split("\n").length} lines\n`,
        );
      } else {
        if (doc.required) {
          this.missingRequired.push(doc.name);
          console.error(`❌ [${doc.id}] ${doc.name} - MISSING (REQUIRED)`);
          console.error(`   Path: ${doc.path}\n`);
        } else {
          this.missingOptional.push(doc.name);
          console.warn(`⚠️  [${doc.id}] ${doc.name} - MISSING (OPTIONAL)`);
          console.warn(`   Path: ${doc.path}\n`);
        }
      }
    });

    // Summary
    const totalSize = Object.values(this.loadedDocuments).reduce(
      (sum, d) => sum + d.size,
      0,
    );
    const summary = {
      total: ancestryChain.length,
      loaded: Object.keys(this.loadedDocuments).length,
      missingRequired: this.missingRequired.length,
      missingOptional: this.missingOptional.length,
      totalSizeKB: (totalSize / 1024).toFixed(1),
    };

    console.log("─────────────────────────────────────────");
    console.log("📊 Ancestry Chain Summary:");
    console.log(`   Total: ${summary.total} documents`);
    console.log(`   Loaded: ${summary.loaded}`);
    console.log(`   Missing (required): ${summary.missingRequired}`);
    console.log(`   Missing (optional): ${summary.missingOptional}`);
    console.log(`   Total Size: ${summary.totalSizeKB} KB`);
    console.log("─────────────────────────────────────────\n");

    const success = this.missingRequired.length === 0;

    if (!success) {
      console.error("❌ ANCESTRY CHAIN INCOMPLETE");
      console.error(
        `   Missing ${this.missingRequired.length} required document(s):`,
      );
      this.missingRequired.forEach((name) => console.error(`   - ${name}`));
      console.error("\nTo fix:");
      console.error("1. Complete previous phases (/research, /innovate)");
      console.error("2. Ensure all INNOVATE selections are approved");
      console.error("3. Re-run /design --detail\n");
    }

    return {
      success,
      documents: this.loadedDocuments,
      missing: this.missingRequired,
      summary,
    };
  }

  /**
   * Get document content by name
   * @param {string} name - Document name
   * @returns {string|null}
   */
  getDocument(name) {
    return this.loadedDocuments[name]?.content || null;
  }

  /**
   * Get all loaded documents
   * @returns {object}
   */
  getDocuments() {
    return this.loadedDocuments;
  }

  /**
   * Check if all required documents are loaded
   * @returns {boolean}
   */
  isComplete() {
    return this.missingRequired.length === 0;
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(
      `Usage: node ancestry-loader.js <context-dir> <docs-dir> <feature-name>`,
    );
    console.log("");
    console.log("Example:");
    console.log(
      "  node ancestry-loader.js .claude/memory-bank/dev/FEATURE-user documents/features/FEATURE FEATURE",
    );
    process.exit(1);
  }

  const contextDir = args[0];
  const docsDir = args[1];
  const featureName = args[2];

  const loader = new AncestryLoader(contextDir, docsDir, featureName);
  const result = loader.load();

  if (!result.success) {
    process.exit(1);
  }

  console.log("✅ Ancestry chain loaded successfully!");
  process.exit(0);
}

module.exports = AncestryLoader;
