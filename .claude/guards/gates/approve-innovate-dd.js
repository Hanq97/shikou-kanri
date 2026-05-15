#!/usr/bin/env node

/**
 * INNOVATE_DD Approval Script
 * Validates and approves innovate-dd-selection.md, transitioning state to INNOVATE_DD_APPROVED
 *
 * Implements: FR-PSEUDO-003, FR-PSEUDO-004
 *
 * Created: 2026-02-12
 * EPS Framework v5.2
 */

const fs = require("fs");
const path = require("path");

// Import state manager
const stateManager = require('../../core/state/state-manager.js');

class InnovateDDApproval {
  constructor() {
    this.contextDir = null;
    this.selectionFile = null;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Find active context and selection file
   */
  findContext() {
    this.contextDir = stateManager.findActiveContext();

    if (!this.contextDir) {
      throw new Error(
        "No active context found. Run: node core/state/state-manager.js init <feature> [developer]",
      );
    }

    this.selectionFile = path.join(this.contextDir, "innovate-dd-selection.md");
    return this.contextDir;
  }

  /**
   * Validate G0.1: File exists
   */
  validateFileExists() {
    if (!fs.existsSync(this.selectionFile)) {
      this.errors.push({
        code: "G0.1",
        message: `File not found: ${this.selectionFile}`,
        fix: "Run /innovate for DD phase first",
      });
      return false;
    }
    return true;
  }

  /**
   * Validate G0.2: Innovation Score >= 85
   */
  validateScore(content) {
    const scoreMatch = content.match(/Innovation Score[:\s]+(\d+)/i);

    if (!scoreMatch) {
      this.errors.push({
        code: "G0.2",
        message: "Innovation Score not found in file",
        fix: "Add 'Innovation Score: XX' to innovate-dd-selection.md",
      });
      return false;
    }

    const score = parseInt(scoreMatch[1]);
    if (score < 85) {
      this.errors.push({
        code: "G0.2",
        message: `Innovation Score ${score} is below threshold (85)`,
        fix: "Re-run /innovate to improve option quality",
      });
      return false;
    }

    return true;
  }

  /**
   * Validate G0.3: Multi-model flag present
   */
  validateMultiModel(content) {
    const multiModelMatch = content.match(
      /Multi-Model[:\s]+(true|yes|Claude|Gemini)/i,
    );

    if (!multiModelMatch) {
      this.warnings.push({
        code: "G0.3",
        message: "Multi-Model flag not found",
        note: "Recommended: Document should indicate multi-model synthesis",
      });
      // Warning only, not a blocker
      return true;
    }

    return true;
  }

  /**
   * Validate G0.4: Rationale section exists and is substantial
   */
  validateRationale(content) {
    if (!/## .*Rationale/i.test(content)) {
      this.errors.push({
        code: "G0.4",
        message: "Rationale section not found",
        fix: "Add a '## Rationale' section explaining the selected approach",
      });
      return false;
    }

    if (content.length < 1000) {
      this.errors.push({
        code: "G0.4",
        message: `Content too short (${content.length} chars, minimum 1000)`,
        fix: "Expand the rationale and option details",
      });
      return false;
    }

    return true;
  }

  /**
   * Validate G0.5: At least 1 rejected alternative documented
   */
  validateRejectedAlternatives(content) {
    const rejectedMatches = content.match(
      /Why NOT Selected|Rejected|Not Selected|Alternative.*rejected/gi,
    );

    if (!rejectedMatches || rejectedMatches.length < 1) {
      this.errors.push({
        code: "G0.5",
        message: "No rejected alternatives documented",
        fix: "Document at least 1 rejected option with 'Why NOT Selected' explanation",
      });
      return false;
    }

    return true;
  }

  /**
   * Validate current state is INNOVATE_DD
   */
  validateState() {
    const context = stateManager.loadContext(this.contextDir);

    if (context.currentState !== "INNOVATE_DD") {
      this.errors.push({
        code: "STATE",
        message: `Current state is ${context.currentState}, expected INNOVATE_DD`,
        fix: "Complete /innovate for DD phase first",
      });
      return false;
    }

    return true;
  }

  /**
   * Run all validations
   */
  async validate() {
    console.log("🔒 INNOVATE_DD Gate Validation (G0)\n");

    // Find context
    try {
      this.findContext();
      console.log(`Context: ${this.contextDir}`);
      console.log(`Selection: ${this.selectionFile}\n`);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      return false;
    }

    // Validate state first
    console.log("Checking state...");
    if (!this.validateState()) {
      this.displayResults();
      return false;
    }
    console.log("  ✅ State: INNOVATE_DD\n");

    // Validate file exists
    console.log("Checking G0.1: File exists...");
    if (!this.validateFileExists()) {
      this.displayResults();
      return false;
    }
    console.log("  ✅ G0.1: File exists\n");

    // Read content for remaining validations
    const content = fs.readFileSync(this.selectionFile, "utf8");

    // Validate score
    console.log("Checking G0.2: Innovation Score >= 85...");
    const scoreValid = this.validateScore(content);
    console.log(scoreValid ? "  ✅ G0.2: Score valid\n" : "");

    // Validate multi-model
    console.log("Checking G0.3: Multi-model flag...");
    this.validateMultiModel(content);
    console.log("  ✅ G0.3: Checked\n");

    // Validate rationale
    console.log("Checking G0.4: Rationale section...");
    const rationaleValid = this.validateRationale(content);
    console.log(rationaleValid ? "  ✅ G0.4: Rationale present\n" : "");

    // Validate rejected alternatives
    console.log("Checking G0.5: Rejected alternatives...");
    const alternativesValid = this.validateRejectedAlternatives(content);
    console.log(alternativesValid ? "  ✅ G0.5: Alternatives documented\n" : "");

    return this.errors.length === 0;
  }

  /**
   * Display validation results
   */
  displayResults() {
    if (this.errors.length > 0) {
      console.log("─────────────────────────────────────────");
      console.log("❌ GATE 0 VALIDATION FAILED\n");
      console.log("Errors:");
      this.errors.forEach((err) => {
        console.log(`  [${err.code}] ${err.message}`);
        console.log(`    Fix: ${err.fix}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log("\nWarnings:");
      this.warnings.forEach((warn) => {
        console.log(`  [${warn.code}] ${warn.message}`);
        if (warn.note) console.log(`    Note: ${warn.note}`);
      });
    }

    console.log("─────────────────────────────────────────\n");
  }

  /**
   * Approve INNOVATE_DD and transition state
   */
  async approve() {
    const valid = await this.validate();

    if (!valid) {
      this.displayResults();
      return false;
    }

    // Transition state
    console.log("─────────────────────────────────────────");
    console.log("✅ GATE 0 VALIDATION PASSED\n");

    try {
      stateManager.approveInnovateDD(this.contextDir);
      console.log("State transitioned: INNOVATE_DD → INNOVATE_DD_APPROVED");
      console.log("\n🎉 Ready for /design --detail\n");
      return true;
    } catch (error) {
      console.error(`❌ State transition failed: ${error.message}`);
      return false;
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
INNOVATE_DD Approval Script

Usage:
  node approve-innovate-dd.js [options]

Options:
  --validate-only  Run validation without approving
  --help, -h       Show this help message

Description:
  Validates innovate-dd-selection.md against Gate 0 conditions (G0.1-G0.5)
  and transitions state from INNOVATE_DD to INNOVATE_DD_APPROVED.

Gate 0 Conditions:
  G0.1: File exists
  G0.2: Innovation Score >= 85
  G0.3: Multi-model flag (warning only)
  G0.4: Rationale section with sufficient content
  G0.5: At least 1 rejected alternative documented

Example:
  node guards/gates/approve-innovate-dd.js
`);
    process.exit(0);
  }

  const approval = new InnovateDDApproval();
  const validateOnly = args.includes("--validate-only");

  if (validateOnly) {
    approval.validate().then((valid) => {
      approval.displayResults();
      process.exit(valid ? 0 : 1);
    });
  } else {
    approval.approve().then((success) => {
      process.exit(success ? 0 : 1);
    });
  }
}

module.exports = InnovateDDApproval;
