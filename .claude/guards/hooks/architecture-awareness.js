#!/usr/bin/env node

"use strict";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Module: architecture-awareness-hook.js
// Type: PreToolUse Hook (Claude Code settings.json)
// Pattern: Fail-open advisory (always exit 0)
// SRS: FR-RAG-HKD-001, FR-RAG-HKD-002
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const path = require("path");

// ─── Command → Hook Type Mapping ───
const HOOK_MAP = {
  "design --basic": {
    actions: ["compatibility", "duplicates"],
    phase: "pre-design",
  },
  "design --detail": {
    actions: ["compatibility", "duplicates"],
    phase: "pre-design",
  },
  plan: { actions: ["compatibility", "impact"], phase: "pre-plan" },
  execute: { actions: ["duplicates"], phase: "pre-execute" },
};

// ─── Parse Stdin (same pattern as workflow-gate.js) ───
async function parseStdin() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input;
}

// ─── Detect EPS Command ───
function detectCommand(toolInput) {
  const skillName = toolInput.tool_input?.skill || toolInput.skill || "";
  const args = toolInput.tool_input?.args || toolInput.args || "";

  const command = args ? (skillName + " " + args).trim() : skillName;
  const hookConfig = HOOK_MAP[command] || null;

  return { command, hookConfig, skillName };
}

// ─── Call GlobalGraphAggregator directly (NOT via MCP) ───
async function runArchitectureCheck(hookConfig) {
  try {
    const aggregatorPath = path.join(
      __dirname,
      "..",
      "..",
      "core",
      "ast",
      "global-graph-aggregator",
    );
    const GlobalGraphAggregator = require(aggregatorPath);
    const aggregator = GlobalGraphAggregator.getInstance();

    if (!aggregator._loaded) {
      await aggregator.init();
    }

    const warnings = [];

    for (const action of hookConfig.actions) {
      switch (action) {
        case "compatibility":
          // Need feature from context — skip if not available (best-effort)
          break;

        case "duplicates": {
          const result = aggregator.findDuplicates("Component");
          if (result.total > 0) {
            const top5 = result.duplicates.slice(0, 5);
            warnings.push(
              "[ARCH] " +
                result.total +
                " duplicate components detected. Top: " +
                top5
                  .map((d) => d.normalizedName + "(" + d.count + ")")
                  .join(", "),
            );
          }
          break;
        }

        case "impact":
          // Need nodeId from context — skip if not available (best-effort)
          break;
      }
    }

    return warnings;
  } catch (error) {
    // Graceful degradation — aggregator unavailable
    return [];
  }
}

// ─── Main (Entry Point) ───
async function main() {
  try {
    const rawInput = await parseStdin();

    if (!rawInput || rawInput.trim().length === 0) {
      process.exit(0);
    }

    const toolInput = JSON.parse(rawInput);
    const { command, hookConfig } = detectCommand(toolInput);

    if (!hookConfig) {
      process.exit(0);
    }

    const warnings = await runArchitectureCheck(hookConfig);

    if (warnings.length > 0) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("[Architecture Awareness] " + hookConfig.phase);
      for (const warning of warnings) {
        console.error("  " + warning);
      }
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }

    process.exit(0);
  } catch (error) {
    console.error("[Architecture Awareness] Error:", error.message);
    process.exit(0);
  }
}

main();
