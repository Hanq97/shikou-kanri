#!/usr/bin/env node

/**
 * Pseudo-code Validator v1.0
 * 4-layer validation for pseudo-code documents
 *
 * Implements:
 * - FR-PSEUDO-009: V1 Syntax Validation (incremental)
 * - FR-PSEUDO-010: V2 Completeness Validation (incremental)
 * - FR-PSEUDO-011: V3 Traceability Validation (batch)
 * - FR-PSEUDO-012: V4 Consistency Validation (batch)
 *
 * Created: 2026-02-12
 * EPS Framework v5.2
 */

const fs = require("fs");
const path = require("path");

class PseudoCodeValidator {
  /**
   * @param {string} pseudoCodePath - Path to pseudo-code file
   * @param {string} humanDDPath - Path to human DD for comparison
   * @param {string} srsPath - Path to SRS for FR validation
   */
  constructor(pseudoCodePath, humanDDPath, srsPath) {
    this.pseudoCodePath = pseudoCodePath;
    this.humanDDPath = humanDDPath;
    this.srsPath = srsPath;
    this.errors = {
      V1: { valid: true, errors: [] },
      V2: { valid: true, errors: [] },
      V3: { valid: true, errors: [] },
      V4: { valid: true, errors: [] },
    };
  }

  /**
   * Run all 4 validation layers
   */
  async validate() {
    const pseudoCode = fs.readFileSync(this.pseudoCodePath, "utf8");
    const humanDD = fs.readFileSync(this.humanDDPath, "utf8");
    const srs = fs.readFileSync(this.srsPath, "utf8");

    console.log("🔍 Running 4-layer validation...\n");

    // V1: Syntax Validation (incremental - per section)
    await this.validateSyntax(pseudoCode);

    // V2: Completeness Validation (incremental - per component)
    await this.validateCompleteness(pseudoCode, humanDD);

    // V3: Traceability Validation (batch - all FRs)
    await this.validateTraceability(pseudoCode, srs);

    // V4: Consistency Validation (batch - cross-document)
    await this.validateConsistency(pseudoCode, humanDD);

    return this.generateReport();
  }

  /**
   * V1: Syntax Validation (incremental)
   * Implements: FR-PSEUDO-009, BD Section 5.1
   */
  async validateSyntax(pseudoCode) {
    const lines = pseudoCode.split("\n");
    const requiredSections = [
      "META",
      "TRACE_MATRIX",
      "COMPONENTS",
      "ERROR_HANDLING",
      "INTEGRATION_POINTS",
    ];
    const foundSections = [];

    // Check required sections exist
    lines.forEach((line) => {
      if (line.startsWith("## ")) {
        const sectionName = line.substring(3).trim();
        if (requiredSections.includes(sectionName)) {
          foundSections.push(sectionName);
        }
      }
    });

    const missingSections = requiredSections.filter(
      (s) => !foundSections.includes(s),
    );
    if (missingSections.length > 0) {
      this.errors.V1.valid = false;
      missingSections.forEach((section) => {
        this.errors.V1.errors.push({
          code: "V1.001",
          line: 0,
          message: `Missing required section: ${section}`,
          section: "STRUCTURE",
        });
      });
    }

    // Validate META section has required fields
    const metaFields = [
      "FEATURE_ID",
      "DOC_TYPE",
      "VERSION",
      "GENERATED",
      "SOURCE",
    ];
    metaFields.forEach((field) => {
      if (!pseudoCode.includes(`${field}:`)) {
        this.errors.V1.valid = false;
        this.errors.V1.errors.push({
          code: "V1.002",
          line: 0,
          message: `Missing META field: ${field}`,
          section: "META",
        });
      }
    });

    // Validate extended keywords usage
    const validKeywords = [
      "COMPONENT",
      "CLASS",
      "INTERFACE",
      "METHOD",
      "FUNCTION",
      "PROPERTY",
      "PARAM",
      "RETURNS",
      "CHECKPOINT",
      "VALIDATE",
      "GIVEN",
      "WHEN",
      "THEN",
      "TRACES_TO",
      "PURPOSE",
      "INTERFACES",
      "IMPLEMENTATION",
      "EXPORTS",
      "DEPENDENCIES",
      "STEP",
    ];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check COMPONENT syntax
      if (trimmed.startsWith("COMPONENT ")) {
        const componentName = trimmed.substring(10).trim();
        if (!/^[A-Za-z][A-Za-z0-9_\s-]*$/.test(componentName)) {
          this.errors.V1.valid = false;
          this.errors.V1.errors.push({
            code: "V1.003",
            line: idx + 1,
            message: `Invalid COMPONENT name syntax: ${componentName}`,
            section: "COMPONENTS",
          });
        }
      }
    });

    console.log(
      `V1 Syntax Validation: ${this.errors.V1.valid ? "✅ PASSED" : "❌ FAILED"}`,
    );
    if (!this.errors.V1.valid) {
      console.log(`   Errors: ${this.errors.V1.errors.length}`);
    }
  }

  /**
   * V2: Completeness Validation (incremental)
   * Implements: FR-PSEUDO-010, BD Section 5.2
   */
  async validateCompleteness(pseudoCode, humanDD) {
    // Extract components from human DD
    const humanComponents = this.extractHumanComponents(humanDD);
    const pseudoComponents = this.extractPseudoComponents(pseudoCode);

    // Check all human components are in pseudo-code
    humanComponents.forEach((hComp) => {
      const found = pseudoComponents.find(
        (p) =>
          p.name.toLowerCase().includes(hComp.name.toLowerCase()) ||
          hComp.name.toLowerCase().includes(p.name.toLowerCase()),
      );

      if (!found) {
        this.errors.V2.valid = false;
        this.errors.V2.errors.push({
          code: "V2.001",
          line: 0,
          message: `Missing component from human DD: ${hComp.name}`,
          section: "COMPONENTS",
        });
      } else {
        // Check component has all required fields
        const requiredFields = [
          "PURPOSE",
          "INTERFACES",
          "IMPLEMENTATION",
          "CHECKPOINT",
        ];
        requiredFields.forEach((field) => {
          if (!found.content.includes(field)) {
            this.errors.V2.valid = false;
            this.errors.V2.errors.push({
              code: "V2.002",
              line: found.line || 0,
              message: `Component "${hComp.name}" missing ${field}`,
              section: "COMPONENTS",
            });
          }
        });
      }
    });

    console.log(
      `V2 Completeness Validation: ${this.errors.V2.valid ? "✅ PASSED" : "❌ FAILED"}`,
    );
    if (!this.errors.V2.valid) {
      console.log(`   Errors: ${this.errors.V2.errors.length}`);
    }
  }

  /**
   * V3: Traceability Validation (batch)
   * Implements: FR-PSEUDO-011, BD Section 5.3
   */
  async validateTraceability(pseudoCode, srs) {
    // Extract all FR IDs from SRS
    const frPattern = /FR-[A-Z]+-\d+/g;
    const srsRequirements = [...new Set(srs.match(frPattern) || [])];

    if (srsRequirements.length === 0) {
      console.log(
        "V3 Traceability Validation: ⚠️ SKIPPED (no FR IDs in SRS)",
      );
      return;
    }

    // Extract TRACE_MATRIX from pseudo-code
    const matrixSection = this.extractSection(pseudoCode, "TRACE_MATRIX");
    const tracedFRs = [...new Set(matrixSection.match(frPattern) || [])];

    // Check coverage
    const coverage = Math.round(
      (tracedFRs.length / srsRequirements.length) * 100,
    );

    // Find missing FRs
    const missing = srsRequirements.filter((fr) => !tracedFRs.includes(fr));

    if (missing.length > 0) {
      this.errors.V3.valid = false;
      this.errors.V3.errors.push({
        code: "V3.001",
        line: 0,
        message: `Incomplete FR coverage: ${coverage}% (missing ${missing.length} FRs)`,
        section: "TRACE_MATRIX",
        details: missing,
      });
    }

    // Check for NOT_TRACED entries
    const notTracedMatches = matrixSection.match(/\[NOT_TRACED\]/g) || [];
    if (notTracedMatches.length > 0) {
      this.errors.V3.valid = false;
      this.errors.V3.errors.push({
        code: "V3.002",
        line: 0,
        message: `${notTracedMatches.length} FRs marked as NOT_TRACED`,
        section: "TRACE_MATRIX",
      });
    }

    console.log(
      `V3 Traceability Validation: ${this.errors.V3.valid ? "✅ PASSED" : "❌ FAILED"} (${coverage}% coverage)`,
    );
    if (!this.errors.V3.valid) {
      console.log(`   Errors: ${this.errors.V3.errors.length}`);
    }
  }

  /**
   * V4: Consistency Validation (batch)
   * Implements: FR-PSEUDO-012, BD Section 5.4
   */
  async validateConsistency(pseudoCode, humanDD) {
    // Extract component names from both documents
    const humanComponents = this.extractHumanComponents(humanDD).map((c) =>
      c.name.toLowerCase(),
    );
    const pseudoComponents = this.extractPseudoComponents(pseudoCode).map((c) =>
      c.name.toLowerCase(),
    );

    // Check for naming mismatches (allow partial matches)
    humanComponents.forEach((hName) => {
      const found = pseudoComponents.some(
        (pName) => pName.includes(hName) || hName.includes(pName),
      );
      if (!found && hName.length > 3) {
        // Skip very short names
        this.errors.V4.valid = false;
        this.errors.V4.errors.push({
          code: "V4.001",
          line: 0,
          message: `Component name mismatch: "${hName}" in human DD not found in pseudo-code`,
          section: "CONSISTENCY",
        });
      }
    });

    // Check checkpoint consistency
    const humanCheckpoints = this.extractCheckpoints(humanDD);
    const pseudoCheckpoints = this.extractCheckpoints(pseudoCode);

    humanCheckpoints.forEach((hCheck) => {
      if (!pseudoCheckpoints.includes(hCheck)) {
        this.errors.V4.valid = false;
        this.errors.V4.errors.push({
          code: "V4.002",
          line: 0,
          message: `Checkpoint mismatch: ${hCheck} in human DD not found in pseudo-code`,
          section: "CONSISTENCY",
        });
      }
    });

    console.log(
      `V4 Consistency Validation: ${this.errors.V4.valid ? "✅ PASSED" : "❌ FAILED"}`,
    );
    if (!this.errors.V4.valid) {
      console.log(`   Errors: ${this.errors.V4.errors.length}`);
    }
  }

  /**
   * Extract components from human DD (## N. Title format)
   */
  extractHumanComponents(humanDD) {
    const componentPattern = /^## (\d+)\.\s+(.+?)$/gm;
    const components = [];
    let match;

    while ((match = componentPattern.exec(humanDD)) !== null) {
      const sectionNum = match[1];
      const name = match[2].replace(/[*_`]/g, "").trim();
      const startIdx = match.index;
      const endIdx = humanDD.indexOf("\n## ", startIdx + 1);
      const content = humanDD.substring(
        startIdx,
        endIdx > 0 ? endIdx : humanDD.length,
      );

      components.push({
        section: sectionNum,
        name,
        content,
        line: humanDD.substring(0, startIdx).split("\n").length,
      });
    }

    return components;
  }

  /**
   * Extract components from pseudo-code (COMPONENT Name format)
   */
  extractPseudoComponents(pseudoCode) {
    const componentPattern = /^COMPONENT\s+(.+?)$/gm;
    const components = [];
    let match;

    while ((match = componentPattern.exec(pseudoCode)) !== null) {
      const name = match[1].trim();
      const startIdx = match.index;
      const endIdx = pseudoCode.indexOf("\nCOMPONENT ", startIdx + 1);
      const content = pseudoCode.substring(
        startIdx,
        endIdx > 0 ? endIdx : pseudoCode.length,
      );

      components.push({
        name,
        content,
        line: pseudoCode.substring(0, startIdx).split("\n").length,
      });
    }

    return components;
  }

  /**
   * Extract a specific section from content
   */
  extractSection(content, sectionName) {
    const sectionPattern = new RegExp(
      `## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
      "i",
    );
    const match = content.match(sectionPattern);
    return match ? match[1] : "";
  }

  /**
   * Extract checkpoints from content
   */
  extractCheckpoints(content) {
    const checkpointPattern = /(?:Checkpoint|CHECKPOINT)[:\s]+C?(\d+)/gi;
    const checkpoints = [];
    let match;

    while ((match = checkpointPattern.exec(content)) !== null) {
      checkpoints.push(`C${match[1]}`);
    }

    return [...new Set(checkpoints)];
  }

  /**
   * Extract feature ID from pseudo-code
   */
  extractFeatureId() {
    const pseudoCode = fs.readFileSync(this.pseudoCodePath, "utf8");
    const match = pseudoCode.match(/FEATURE_ID:\s*([A-Z0-9-]+)/);
    return match ? match[1] : "UNKNOWN";
  }

  /**
   * Generate JSON validation report
   * Implements: DD Decision 3 (JSON Error Report)
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      feature: this.extractFeatureId(),
      pseudoCodeFile: path.basename(this.pseudoCodePath),
      humanDDFile: path.basename(this.humanDDPath),
      srsFile: path.basename(this.srsPath),
      layers: this.errors,
      summary: {
        totalLayers: 4,
        passed: Object.values(this.errors).filter((l) => l.valid).length,
        failed: Object.values(this.errors).filter((l) => !l.valid).length,
        totalErrors: Object.values(this.errors).reduce(
          (sum, l) => sum + l.errors.length,
          0,
        ),
      },
      overallValid: Object.values(this.errors).every((l) => l.valid),
    };

    return report;
  }

  /**
   * Save validation report to JSON file
   */
  async saveReport(outputPath) {
    const report = await this.validate();
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

    console.log(`\n📊 Validation Report: ${outputPath}`);
    console.log(
      `   Overall: ${report.overallValid ? "✅ VALID" : "❌ INVALID"}`,
    );
    console.log(`   Passed: ${report.summary.passed}/4 layers`);
    if (report.summary.totalErrors > 0) {
      console.log(`   Errors: ${report.summary.totalErrors}`);
    }

    return report;
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(
      `Usage: node validator.js <pseudo-code-path> <human-dd-path> <srs-path> [--output <report-path>]`,
    );
    console.log("");
    console.log("Options:");
    console.log(
      "  --output  Output path for JSON report (default: validation-report.json)",
    );
    process.exit(1);
  }

  const pseudoCodePath = args[0];
  const humanDDPath = args[1];
  const srsPath = args[2];

  // Parse options
  let outputPath = "validation-report.json";
  for (let i = 3; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  // Validate inputs
  if (!fs.existsSync(pseudoCodePath)) {
    console.error(`❌ Pseudo-code file not found: ${pseudoCodePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(humanDDPath)) {
    console.error(`❌ Human DD file not found: ${humanDDPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(srsPath)) {
    console.error(`❌ SRS file not found: ${srsPath}`);
    process.exit(1);
  }

  // Validate
  const validator = new PseudoCodeValidator(pseudoCodePath, humanDDPath, srsPath);
  validator
    .saveReport(outputPath)
    .then((report) => {
      console.log("");
      if (report.overallValid) {
        console.log("✅ Validation complete - all layers passed!");
        process.exit(0);
      } else {
        console.log("❌ Validation failed - see report for details");
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(`❌ Validation error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = PseudoCodeValidator;
