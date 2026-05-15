#!/usr/bin/env node
/**
 * Workflow Executor Runner v3.0 (RAG 2.0 / GraphRAG Integration)
 *
 * Designed for Claude Code CLI conversation - prints prompts and persists state
 * between invocations. Claude reads prompts and generates output, then user
 * runs again with --continue to validate and proceed.
 *
 * Usage:
 *   # Start workflow (prints first phase prompt)
 *   node run-workflow-executor.js <workflow-name> <feature> [evidence-file]
 *
 *   # Continue workflow (validates previous output, prints next phase)
 *   node run-workflow-executor.js <workflow-name> <feature> --continue
 *
 *   # Continue with explicit output file
 *   node run-workflow-executor.js <workflow-name> <feature> --output <file>
 *
 *   # Reset workflow state
 *   node run-workflow-executor.js <workflow-name> <feature> --reset
 *
 *   # Show current state
 *   node run-workflow-executor.js <workflow-name> <feature> --status
 *
 * Example:
 *   node run-workflow-executor.js innovate-srs ADM .claude/memory-bank/master/ADM-cuong/evidence.md
 *   # Claude generates output...
 *   node run-workflow-executor.js innovate-srs ADM --continue
 */

const fs = require("fs");
const path = require("path");
const { WorkflowExecutor } = require("./workflow-executor");

// Parse arguments
const args = process.argv.slice(2);
const workflowName = args[0];
const feature = args[1];

// Parse flags
const hasFlag = (flag) => args.includes(flag);
const getFlagValue = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};

const isContinue = hasFlag("--continue");
const isReset = hasFlag("--reset");
const isStatus = hasFlag("--status");
const outputFile = getFlagValue("--output");
const evidenceFile = args[2] && !args[2].startsWith("--") ? args[2] : null;

// State file path
const STATE_DIR = path.join(__dirname, "..", "..", "state");
const getStateFilePath = (wf, ft) => path.join(STATE_DIR, `workflow-${wf}-${ft}.json`);

// Show usage
function showUsage() {
  console.error("❌ Usage: node run-workflow-executor.js <workflow-name> <feature> [options]");
  console.error("");
  console.error("Options:");
  console.error("  <evidence-file>     Path to evidence file (for starting workflow)");
  console.error("  --continue          Continue from saved state");
  console.error("  --output <file>     Provide output from file for validation");
  console.error("  --reset             Reset workflow state");
  console.error("  --status            Show current workflow status");
  console.error("");
  console.error("Examples:");
  console.error("  # Start new workflow");
  console.error("  node run-workflow-executor.js innovate-srs ADM evidence.md");
  console.error("");
  console.error("  # Continue after Claude generates output");
  console.error("  node run-workflow-executor.js innovate-srs ADM --continue");
  console.error("");
  console.error("  # Reset and start over");
  console.error("  node run-workflow-executor.js innovate-srs ADM --reset");
  process.exit(1);
}

// Validate required args
if (!workflowName || !feature) {
  showUsage();
}

// Handle --status
if (isStatus) {
  const stateFile = getStateFilePath(workflowName, feature);
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  WORKFLOW STATUS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Workflow: ${state.workflowName}`);
    console.log(`Feature: ${feature}`);
    console.log(`Current Phase Index: ${state.currentPhaseIndex}`);
    console.log(`Completed Phases: ${Object.keys(state.phaseOutputs).join(", ") || "none"}`);
    console.log(`Last Updated: ${state.timestamp}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } else {
    console.log("No workflow state found for:", workflowName, feature);
  }
  process.exit(0);
}

// Handle --reset
if (isReset) {
  const stateFile = getStateFilePath(workflowName, feature);
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
    console.log("✅ Workflow state reset for:", workflowName, feature);
  } else {
    console.log("No state to reset for:", workflowName, feature);
  }
  process.exit(0);
}

// Build context
const context = {
  feature,
  evidenceFile: evidenceFile || null,
};

// Build options
const options = {
  mode: "cli",
  output: null,
};

// Load output from file if provided
if (outputFile) {
  if (fs.existsSync(outputFile)) {
    options.output = fs.readFileSync(outputFile, "utf-8");
    console.log(`📄 Loaded output from: ${outputFile}`);
  } else {
    console.error(`❌ Output file not found: ${outputFile}`);
    process.exit(1);
  }
}

// Header
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  WORKFLOW ENGINE v3.0 (RAG 2.0 / GraphRAG)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("");
console.log("Workflow:", workflowName);
console.log("Feature:", feature);
if (evidenceFile) console.log("Evidence:", evidenceFile);
if (isContinue) console.log("Mode: CONTINUE from saved state");
if (outputFile) console.log("Output file:", outputFile);
console.log("");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("");

// Create executor
const executor = new WorkflowExecutor(workflowName, context, options);

// Execute
async function run() {
  try {
    executor.loadWorkflow();
    console.log("✅ Workflow loaded successfully\n");

    const result = await executor.executeWorkflow();

    // Handle different result types
    if (result.type === "awaiting_response") {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("⏳ AWAITING CLAUDE RESPONSE");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Phase: ${result.phase} - ${result.phaseName}`);
      console.log("");
      console.log("Next steps:");
      console.log("1. Claude reads the prompt above and generates output");
      console.log("2. Save Claude's output to a file (e.g., output.md)");
      console.log(`3. Run: node run-workflow-executor.js ${workflowName} ${feature} --output output.md`);
      console.log("");
      console.log("Or: Simply run --continue to proceed with Claude's inline response:");
      console.log(`   node run-workflow-executor.js ${workflowName} ${feature} --continue`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } else if (result.type === "completed") {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎉 WORKFLOW COMPLETED");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Completed phases: ${Object.keys(result.outputs).join(", ")}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } else if (result.type === "validation_failed") {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("❌ VALIDATION FAILED");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      result.violations.forEach((v) => console.log(`  - ${v}`));
      console.log("");
      console.log("Please fix the issues and run --continue again.");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ Workflow execution failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run();
