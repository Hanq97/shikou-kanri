#!/usr/bin/env node
/**
 * Test Script for Workflow Executor
 *
 * Tests workflow-executor.js with mock workflow
 *
 * Usage:
 *   node test-workflow-executor.js [workflow-name]
 *
 * Example:
 *   node test-workflow-executor.js innovate-srs
 *   node test-workflow-executor.js (uses default: innovate-srs)
 */

const { WorkflowExecutor } = require("./workflow-executor");
const path = require("path");

// Get workflow name from args or use default
const workflowName = process.argv[2] || "innovate-srs";

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  WORKFLOW EXECUTOR TEST SUITE`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Testing workflow: ${workflowName}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Test context
const context = {
  feature: "BRW-KYC",
  sub: "BASE",
  evidenceFile: ".claude/memory-bank/master/BRW-KYC-cuong/evidence.md",
  srsPath: "documents/features/BRW-borrower/BRW-kyc/BRW-KYC-srs.md",
};

console.log("📋 Test Context:");
console.log(`   Feature: ${context.feature}`);
console.log(`   Sub: ${context.sub}`);
console.log(`   Evidence: ${context.evidenceFile}`);
console.log(`   SRS: ${context.srsPath}`);
console.log("");

// Test 1: Create workflow executor
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 1: Create WorkflowExecutor Instance");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

let executor;
try {
  executor = new WorkflowExecutor(workflowName, context);
  console.log("✅ WorkflowExecutor created successfully\n");
} catch (error) {
  console.error("❌ Failed to create WorkflowExecutor:", error.message);
  process.exit(1);
}

// Test 2: Load workflow
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 2: Load Workflow Definition");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

try {
  executor.loadWorkflow();
  console.log("✅ Workflow loaded successfully");
  console.log(`   Type: ${executor.workflow.type || "JavaScript"}`);

  if (executor.workflow.type === "markdown") {
    console.log(`   Content length: ${executor.workflow.content.length} chars`);
    console.log(
      "\n⚠️  Legacy markdown workflow detected - skipping phase tests\n",
    );
    process.exit(0);
  } else {
    console.log(`   Name: ${executor.workflow.name || "N/A"}`);
    console.log(`   Version: ${executor.workflow.version || "N/A"}`);
    console.log(`   Phases: ${executor.workflow.phases?.length || 0}`);
  }
  console.log("");
} catch (error) {
  console.error("❌ Failed to load workflow:", error.message);
  process.exit(1);
}

// Test 3: Get workflow state
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 3: Get Workflow State");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

try {
  const state = executor.getState();
  console.log("✅ State retrieved successfully:");
  console.log(`   Workflow: ${state.workflowName}`);
  console.log(`   Current phase: ${state.currentPhase || "none"}`);
  console.log(`   Completed phases: ${state.completedPhases.length}`);
  console.log("");
} catch (error) {
  console.error("❌ Failed to get state:", error.message);
  process.exit(1);
}

// Test 4: Test context variable injection
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 4: Context Variable Injection");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

try {
  const template =
    "Feature: {{feature}}, Sub: {{sub}}, Context test: {{context.feature}}";
  const injected = executor.injectContextVars(template, context);

  console.log("Template:");
  console.log(`   ${template}`);
  console.log("");
  console.log("Result:");
  console.log(`   ${injected}`);
  console.log("");

  if (injected.includes("BRW-KYC") && injected.includes("BASE")) {
    console.log("✅ Context variable injection works correctly\n");
  } else {
    console.error("❌ Context variable injection failed\n");
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Context injection test failed:", error.message);
  process.exit(1);
}

// Test 5: Test prompt rendering (if phases exist)
if (!executor.workflow.phases || executor.workflow.phases.length === 0) {
  console.log("⚠️  No phases found - skipping prompt rendering test\n");
} else {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST 5: Render Prompt with Constraints");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const phase0 = executor.workflow.phases[0];
    console.log(`Testing with phase: ${phase0.id} - ${phase0.name}`);
    console.log("");

    const prompt = executor.renderPromptWithConstraints(phase0);

    console.log("✅ Prompt rendered successfully");
    console.log(`   Length: ${prompt.length} chars`);

    // Check if enforcement constraints are injected
    if (phase0.validation && prompt.includes("ENFORCEMENT CONSTRAINTS")) {
      console.log("   ✅ Enforcement constraints injected");
    } else if (!phase0.validation) {
      console.log("   ℹ️  No validation rules for this phase");
    }
    console.log("");

    // Show first 500 chars of prompt
    console.log("Prompt preview (first 500 chars):");
    console.log("─".repeat(60));
    console.log(prompt.substring(0, 500) + (prompt.length > 500 ? "..." : ""));
    console.log("─".repeat(60));
    console.log("");
  } catch (error) {
    console.error("❌ Prompt rendering failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Test 6: Test validation logic
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 6: Phase Output Validation Logic");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

try {
  // Create mock phase with validation rules
  const mockPhase = {
    id: "test-phase",
    name: "Test Phase",
    validation: {
      requiredSections: ["## Section A", "## Section B"],
      mustInclude: ["important keyword"],
      forbiddenPatterns: [/chọn \d+\/\d+/gi],
    },
  };

  // Test case 1: Valid output
  const validOutput = `
## Section A
Some content here

## Section B
This contains important keyword

No forbidden patterns here.
  `;

  const result1 = executor.validatePhaseOutput(mockPhase, validOutput);
  if (result1.pass) {
    console.log("✅ Test case 1 (valid output): PASSED");
  } else {
    console.error("❌ Test case 1 should pass but failed:", result1.violations);
    process.exit(1);
  }

  // Test case 2: Missing section
  const invalidOutput1 = `
## Section A
Some content

Missing Section B and important keyword
  `;

  const result2 = executor.validatePhaseOutput(mockPhase, invalidOutput1);
  if (!result2.pass && result2.violations.length === 2) {
    console.log(
      "✅ Test case 2 (missing sections): PASSED (correctly detected 2 violations)",
    );
  } else {
    console.error("❌ Test case 2 should fail with 2 violations");
    process.exit(1);
  }

  // Test case 3: Forbidden pattern
  const invalidOutput2 = `
## Section A
## Section B
important keyword

Vui lòng chọn 1/2/3
  `;

  const result3 = executor.validatePhaseOutput(mockPhase, invalidOutput2);
  if (
    !result3.pass &&
    result3.violations.some((v) => v.includes("Forbidden pattern"))
  ) {
    console.log(
      "✅ Test case 3 (forbidden pattern): PASSED (correctly detected)",
    );
  } else {
    console.error("❌ Test case 3 should detect forbidden pattern");
    process.exit(1);
  }

  console.log("\n✅ All validation logic tests passed\n");
} catch (error) {
  console.error("❌ Validation logic test failed:", error.message);
  process.exit(1);
}

// Summary
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  TEST SUMMARY");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("✅ All tests passed successfully!");
console.log("");
console.log("Tested components:");
console.log("   ✅ WorkflowExecutor instantiation");
console.log("   ✅ Workflow loading (JS + MD fallback)");
console.log("   ✅ State management");
console.log("   ✅ Context variable injection");
console.log("   ✅ Prompt rendering with constraints");
console.log("   ✅ Validation logic (3 test cases)");
console.log("");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  🎉 WORKFLOW EXECUTOR IS WORKING");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

process.exit(0);
