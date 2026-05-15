#!/usr/bin/env node

/**
 * Integration Test for Pseudo-code System
 * Tests: Generation -> Validation -> Plan Loading
 *
 * Created: 2026-02-12
 * EPS Framework v5.2
 */

const fs = require("fs");
const path = require("path");

class PseudoCodeIntegrationTest {
  constructor() {
    this.testDir = path.join(__dirname, "../../.tmp/pseudo-test");
    this.results = {
      format: { passed: false, errors: [] },
      generator: { passed: false, errors: [] },
      validator: { passed: false, errors: [] },
      ancestry: { passed: false, errors: [] },
    };
  }

  async setup() {
    console.log("🔧 Setting up test environment...\n");

    // Create test directory
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }

    // Create minimal test SRS
    const srsContent = `# Test SRS

## 1. Overview
Test SRS for integration testing.

## 2. Functional Requirements

### FR-TEST-001: Test Requirement 1
The system shall process test data.

### FR-TEST-002: Test Requirement 2
The system shall validate test inputs.

## 3. Non-Functional Requirements

### NFR-TEST-001: Performance
Response time < 100ms.
`;
    fs.writeFileSync(path.join(this.testDir, "TEST-srs.md"), srsContent);

    // Create minimal test DD
    const ddContent = `# Test Detail Design

## Document Information
- **Feature**: TEST
- **Version**: 1.0
- **Created**: 2026-02-12

## 1. Component Overview

**Purpose**: Test component for validation.
**Traces To**: FR-TEST-001

class TestComponent:
  METHOD process():
    STEP 1: Validate input
    STEP 2: Process data
    RETURNS result

**Checkpoint**: C1

## 2. Integration Layer

**Purpose**: Handle external integrations.
**Traces To**: FR-TEST-002

**Checkpoint**: C2

## 3. Error Handling

### ValidationError
When: Invalid input data
Handling: Return error response
`;
    fs.writeFileSync(
      path.join(this.testDir, "TEST-frontend-detail-design.md"),
      ddContent,
    );

    console.log("✅ Test files created\n");
  }

  async testFormatSpec() {
    console.log("📋 Test 1: Format Specification...");

    const formatPath = path.join(__dirname, "formats/pseudo-code-format.md");

    if (!fs.existsSync(formatPath)) {
      this.results.format.errors.push("Format spec not found");
      console.log("❌ FAILED: Format spec not found\n");
      return;
    }

    const content = fs.readFileSync(formatPath, "utf8");

    // Check required sections
    const requiredSections = [
      "META Section",
      "TRACE_MATRIX Section",
      "COMPONENTS Section",
      "ERROR_HANDLING Section",
      "INTEGRATION_POINTS Section",
    ];

    for (const section of requiredSections) {
      if (!content.includes(section)) {
        this.results.format.errors.push(`Missing section: ${section}`);
      }
    }

    // Check extended keywords
    const requiredKeywords = [
      "CLASS",
      "METHOD",
      "CHECKPOINT",
      "GIVEN",
      "WHEN",
      "THEN",
    ];
    for (const keyword of requiredKeywords) {
      if (!content.includes(keyword)) {
        this.results.format.errors.push(`Missing keyword: ${keyword}`);
      }
    }

    this.results.format.passed = this.results.format.errors.length === 0;
    console.log(
      this.results.format.passed
        ? "✅ PASSED"
        : `❌ FAILED: ${this.results.format.errors.join(", ")}`,
    );
    console.log("");
  }

  async testGenerator() {
    console.log("📋 Test 2: Pseudo-code Generator...");

    try {
      const PseudoCodeGenerator = require("./generator.js");

      const srsPath = path.join(this.testDir, "TEST-srs.md");
      const ddPath = path.join(this.testDir, "TEST-frontend-detail-design.md");
      const outputPath = path.join(
        this.testDir,
        "TEST-frontend-detail-design.pseudo",
      );

      const generator = new PseudoCodeGenerator(ddPath, srsPath, "FRONTEND_DD");
      await generator.save(outputPath);

      // Verify output exists
      if (!fs.existsSync(outputPath)) {
        this.results.generator.errors.push("Output file not created");
      } else {
        const pseudoContent = fs.readFileSync(outputPath, "utf8");

        // Check required sections in output
        if (!pseudoContent.includes("## META")) {
          this.results.generator.errors.push("Missing META section in output");
        }
        if (!pseudoContent.includes("## TRACE_MATRIX")) {
          this.results.generator.errors.push(
            "Missing TRACE_MATRIX section in output",
          );
        }
        if (!pseudoContent.includes("## COMPONENTS")) {
          this.results.generator.errors.push(
            "Missing COMPONENTS section in output",
          );
        }
      }
    } catch (error) {
      this.results.generator.errors.push(`Generator error: ${error.message}`);
    }

    this.results.generator.passed = this.results.generator.errors.length === 0;
    console.log(
      this.results.generator.passed
        ? "✅ PASSED"
        : `❌ FAILED: ${this.results.generator.errors.join(", ")}`,
    );
    console.log("");
  }

  async testValidator() {
    console.log("📋 Test 3: Pseudo-code Validator...");

    try {
      const PseudoCodeValidator = require("./validator.js");

      const srsPath = path.join(this.testDir, "TEST-srs.md");
      const ddPath = path.join(this.testDir, "TEST-frontend-detail-design.md");
      const pseudoPath = path.join(
        this.testDir,
        "TEST-frontend-detail-design.pseudo",
      );

      if (!fs.existsSync(pseudoPath)) {
        this.results.validator.errors.push(
          "Pseudo file not found (generator may have failed)",
        );
      } else {
        const validator = new PseudoCodeValidator(pseudoPath, ddPath, srsPath);
        const report = await validator.validate();

        // Check validation ran
        if (!report) {
          this.results.validator.errors.push("Validation returned no report");
        } else {
          console.log(`   V1 (Syntax): ${report.layers.V1.valid ? "✅" : "❌"}`);
          console.log(
            `   V2 (Completeness): ${report.layers.V2.valid ? "✅" : "❌"}`,
          );
          console.log(
            `   V3 (Traceability): ${report.layers.V3.valid ? "✅" : "❌"}`,
          );
          console.log(
            `   V4 (Consistency): ${report.layers.V4.valid ? "✅" : "❌"}`,
          );

          // We expect some failures in minimal test - just check it ran
          if (report.summary === undefined) {
            this.results.validator.errors.push("Report missing summary");
          }
        }
      }
    } catch (error) {
      this.results.validator.errors.push(`Validator error: ${error.message}`);
    }

    this.results.validator.passed = this.results.validator.errors.length === 0;
    console.log(
      this.results.validator.passed
        ? "✅ PASSED"
        : `❌ FAILED: ${this.results.validator.errors.join(", ")}`,
    );
    console.log("");
  }

  async testAncestryLoader() {
    console.log("📋 Test 4: Ancestry Loader...");

    try {
      const AncestryLoader = require("./ancestry-loader.js");

      // Test with non-existent paths (should fail gracefully)
      const loader = new AncestryLoader(
        this.testDir,
        this.testDir,
        "TEST",
      );

      const chain = loader.getAncestryChain();

      // Check chain has 6 documents
      if (chain.length !== 6) {
        this.results.ancestry.errors.push(
          `Expected 6 documents, got ${chain.length}`,
        );
      }

      // Check all documents are marked required
      const allRequired = chain.every((doc) => doc.required === true);
      if (!allRequired) {
        this.results.ancestry.errors.push(
          "Not all documents marked as required",
        );
      }
    } catch (error) {
      this.results.ancestry.errors.push(`Ancestry error: ${error.message}`);
    }

    this.results.ancestry.passed = this.results.ancestry.errors.length === 0;
    console.log(
      this.results.ancestry.passed
        ? "✅ PASSED"
        : `❌ FAILED: ${this.results.ancestry.errors.join(", ")}`,
    );
    console.log("");
  }

  async cleanup() {
    console.log("🧹 Cleaning up test files...\n");

    // Remove test directory
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true });
    }
  }

  async run() {
    console.log("═══════════════════════════════════════════");
    console.log("  Pseudo-code System Integration Tests");
    console.log("  EPS Framework v5.2");
    console.log("═══════════════════════════════════════════\n");

    await this.setup();
    await this.testFormatSpec();
    await this.testGenerator();
    await this.testValidator();
    await this.testAncestryLoader();
    await this.cleanup();

    // Summary
    console.log("═══════════════════════════════════════════");
    console.log("  Test Summary");
    console.log("═══════════════════════════════════════════");

    const tests = Object.entries(this.results);
    const passed = tests.filter(([_, r]) => r.passed).length;
    const failed = tests.filter(([_, r]) => !r.passed).length;

    tests.forEach(([name, result]) => {
      console.log(`  ${name}: ${result.passed ? "✅ PASSED" : "❌ FAILED"}`);
    });

    console.log("");
    console.log(`  Total: ${passed}/${tests.length} tests passed`);
    console.log("═══════════════════════════════════════════\n");

    return failed === 0;
  }
}

// CLI Interface
if (require.main === module) {
  const test = new PseudoCodeIntegrationTest();
  test.run().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = PseudoCodeIntegrationTest;
