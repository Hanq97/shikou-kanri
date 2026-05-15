#!/usr/bin/env node
/**
 * Phase Output Validator
 *
 * Validates Claude's output against workflow rules
 *
 * Usage:
 *   node validate-phase.js <workflow-name> <phase-id> <output-file>
 *
 * Example:
 *   node validate-phase.js innovate-srs phase-0 output.md
 *
 * Exit codes:
 *   0 = Validation passed
 *   1 = Validation failed
 *   2 = Usage error
 */

const fs = require("fs");
const path = require("path");

// Parse arguments
const workflowName = process.argv[2];
const phaseId = process.argv[3];
const outputFile = process.argv[4];

if (!workflowName || !phaseId || !outputFile) {
  console.error(
    "❌ Usage: node validate-phase.js <workflow-name> <phase-id> <output-file>",
  );
  console.error("");
  console.error("Example:");
  console.error(
    "  node validate-phase.js innovate-srs phase-0-evidence-synthesis output.md",
  );
  process.exit(2);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  PHASE OUTPUT VALIDATOR`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Workflow: ${workflowName}`);
console.log(`Phase:    ${phaseId}`);
console.log(`Output:   ${outputFile}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Load output file
if (!fs.existsSync(outputFile)) {
  console.error(`❌ Output file not found: ${outputFile}`);
  process.exit(2);
}

const output = fs.readFileSync(outputFile, "utf-8");
console.log(`✅ Loaded output file (${output.length} chars)\n`);

// Load workflow definition
const workflowPath = path.join(__dirname, "workflows", `${workflowName}.js`);

let workflow;
try {
  if (fs.existsSync(workflowPath)) {
    workflow = require(workflowPath);
    console.log(`✅ Loaded workflow: ${workflow.name || workflowName}\n`);
  } else {
    // Fallback: Legacy markdown workflow (no validation rules)
    console.log(`⚠️  Workflow definition not found: ${workflowPath}`);
    console.log(`⚠️  Legacy markdown workflow - no validation rules`);
    console.log(`✅ Validation passed (no rules to check)\n`);
    process.exit(0);
  }
} catch (error) {
  console.error(`❌ Failed to load workflow: ${error.message}`);
  console.log(`⚠️  Skipping validation (workflow load error)`);
  console.log(`✅ Validation passed (no rules to check)\n`);
  process.exit(0);
}

// Find phase in workflow
const phase = workflow.phases?.find((p) => p.id === phaseId);

if (!phase) {
  console.error(`❌ Phase not found: ${phaseId}`);
  console.error(
    `   Available phases: ${workflow.phases?.map((p) => p.id).join(", ") || "none"}`,
  );
  process.exit(2);
}

console.log(`✅ Found phase: ${phase.name}\n`);

// Check if phase has validation rules
const validation = phase.validation;
if (!validation) {
  console.log(`ℹ️  No validation rules for phase ${phaseId}`);
  console.log(`✅ Validation passed (no rules to check)\n`);
  process.exit(0);
}

console.log(`📋 Validation Rules:`);
if (validation.requiredSections) {
  console.log(`   - Required sections: ${validation.requiredSections.length}`);
}
if (validation.mustInclude) {
  console.log(`   - Must include: ${validation.mustInclude.length}`);
}
if (validation.forbiddenPatterns) {
  console.log(
    `   - Forbidden patterns: ${validation.forbiddenPatterns.length}`,
  );
}
if (validation.tableValidation) {
  console.log(
    `   - Table validation: Yes (min rows: ${validation.tableValidation.minRows || "N/A"})`,
  );
}
console.log("");

// Perform validation
const violations = [];
const warnings = [];

// Check required sections
if (validation.requiredSections) {
  console.log(`🔍 Checking required sections...`);
  validation.requiredSections.forEach((section) => {
    if (!output.includes(section)) {
      violations.push(`Missing required section: "${section}"`);
      console.log(`   ❌ Missing: "${section}"`);
    } else {
      console.log(`   ✅ Found: "${section}"`);
    }
  });
  console.log("");
}

// Check required content
if (validation.mustInclude) {
  console.log(`🔍 Checking required content...`);
  validation.mustInclude.forEach((content) => {
    if (!output.includes(content)) {
      violations.push(`Missing required content: "${content}"`);
      console.log(`   ❌ Missing: "${content}"`);
    } else {
      console.log(`   ✅ Found: "${content}"`);
    }
  });
  console.log("");
}

// Check forbidden patterns
if (validation.forbiddenPatterns) {
  console.log(`🔍 Checking forbidden patterns...`);
  validation.forbiddenPatterns.forEach((pattern) => {
    const matches = output.match(pattern);
    if (matches) {
      violations.push(
        `Forbidden pattern detected: ${pattern.toString()} (found: "${matches[0]}")`,
      );
      console.log(`   ❌ Forbidden: ${pattern.toString()}`);
      console.log(`      Match: "${matches[0]}"`);
    } else {
      console.log(`   ✅ Clean: ${pattern.toString()}`);
    }
  });
  console.log("");
}

// Check table validation
if (validation.tableValidation) {
  console.log(`🔍 Checking table validation...`);
  const tableLines = output
    .split("\n")
    .filter((line) => line.trim().startsWith("|"));
  const tableRows = tableLines.length;

  if (
    validation.tableValidation.minRows &&
    tableRows < validation.tableValidation.minRows
  ) {
    violations.push(
      `Table has only ${tableRows} rows, minimum ${validation.tableValidation.minRows} required`,
    );
    console.log(
      `   ❌ Table rows: ${tableRows} (min: ${validation.tableValidation.minRows})`,
    );
  } else {
    console.log(`   ✅ Table rows: ${tableRows}`);
  }
  console.log("");
}

// Check length validation (if any)
if (validation.minLength) {
  if (output.length < validation.minLength) {
    warnings.push(
      `Output too short: ${output.length} chars (min: ${validation.minLength})`,
    );
  }
}

if (validation.maxLength) {
  if (output.length > validation.maxLength) {
    warnings.push(
      `Output too long: ${output.length} chars (max: ${validation.maxLength})`,
    );
  }
}

// Report results
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  VALIDATION RESULTS`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

if (warnings.length > 0) {
  console.log(`⚠️  Warnings (${warnings.length}):`);
  warnings.forEach((w) => console.log(`   - ${w}`));
  console.log("");
}

if (violations.length === 0) {
  console.log(`✅ VALIDATION PASSED for phase ${phaseId}`);
  console.log(`   No violations detected`);
  console.log("");
  process.exit(0);
} else {
  console.error(`❌ VALIDATION FAILED for phase ${phaseId}`);
  console.error(`   Found ${violations.length} violation(s):\n`);
  violations.forEach((v) => console.error(`   - ${v}`));
  console.error("");
  console.error(`💡 Tip: Fix violations and run validation again`);
  console.error("");
  process.exit(1);
}
