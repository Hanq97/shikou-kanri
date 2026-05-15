#!/usr/bin/env node

/**
 * EPS Auto-Chain — PostToolUse Hook
 *
 * Fires AFTER a Skill tool completes successfully.
 * Reads current EPS state via auto-route logic, determines if
 * the next command should be auto-chained (executed immediately
 * without user confirmation).
 *
 * Mechanism:
 *   1. PostToolUse fires → this hook reads stdin (completed skill info)
 *   2. Loads current state from state-manager
 *   3. Looks up STATE_ROUTE_MAP for next handler
 *   4. If next handler is an auto-chain target, outputs additionalContext
 *      instructing Claude to execute it immediately
 *
 * Usage: Configured in .claude/settings.json as PostToolUse hook
 * Matcher: "Skill" (only fires for Skill tool invocations)
 */

const path = require('path');
const fs = require('fs');

// Skills that trigger auto-chain to the next command
// Map: completedSkill → expectedNextHandler
// Only define pairs where auto-chain is MANDATORY (no user confirmation)
// Auto-chain map: completedSkill → nextHandler
// null = no auto-chain for this skill
const AUTO_CHAIN_MAP = {
  'research':       'innovate',     // v9.0: research → innovate (streamlined workflow)
  'plan':           'plan-review',
  'plan-review':    null,           // resolved dynamically: PLAN_REVIEWED → execute, PLAN_CREATED → plan-optimize
  'plan-optimize':  'plan-review',  // re-review after optimization
  'design-review':  null,           // design-review is itself auto-chained FROM design
  'execute':        'validate',
  'validate':       null,           // test requires human-in-loop (Phase 3 in execute.md)
};

// Max auto-optimize loops: plan-review ↔ plan-optimize
const MAX_OPTIMIZE_LOOPS = 3;
const OPTIMIZE_COUNTER_FILE = 'plan-optimize-loop-count';

// design --detail triggers auto-chain to design-review
// Detected by skill='design' + args containing '--detail'
const DESIGN_DETAIL_CHAIN = 'design-review';

// --- Optimize loop counter (file-based, per context) ---
function counterPath(ctxPath) {
  return path.join(ctxPath, OPTIMIZE_COUNTER_FILE);
}

function getOptimizeCounter(ctxPath) {
  try {
    return parseInt(fs.readFileSync(counterPath(ctxPath), 'utf8').trim(), 10) || 0;
  } catch { return 0; }
}

function incrementOptimizeCounter(ctxPath) {
  fs.writeFileSync(counterPath(ctxPath), String(getOptimizeCounter(ctxPath) + 1));
}

function resetOptimizeCounter(ctxPath) {
  try { fs.unlinkSync(counterPath(ctxPath)); } catch { /* ignore */ }
}

async function main() {
  // Read stdin (PostToolUse input JSON from Claude Code)
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let toolInput;
  try {
    toolInput = JSON.parse(input);
  } catch (e) {
    process.exit(0);
  }

  // Extract completed skill name
  const skillName = toolInput.tool_input?.skill || toolInput.skill || '';
  const skillArgs = toolInput.tool_input?.args || toolInput.args || '';

  if (!skillName) {
    process.exit(0);
  }

  // Determine the effective command that just completed
  let completedCommand = skillName;
  if (skillName === 'design' && skillArgs.includes('--detail')) {
    completedCommand = 'design-detail';
  }

  // Load state manager
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let smPath = path.join(projectDir, '.claude', 'core', 'state', 'state-manager.js');
  if (!fs.existsSync(smPath)) {
    smPath = path.join(projectDir, 'core', 'state', 'state-manager.js');
  }
  if (!fs.existsSync(smPath)) {
    process.exit(0);
  }

  const sm = require(smPath);
  const ctxPath = sm.findActiveContext();
  if (!ctxPath) {
    process.exit(0);
  }

  const context = sm.loadContext(ctxPath);
  const currentState = context.currentState || 'INITIAL';
  const taskType = context.taskType || 'new';

  // Resolve next handler
  let nextHandler;
  if (completedCommand === 'design-detail') {
    nextHandler = DESIGN_DETAIL_CHAIN;
  } else if (completedCommand === 'plan-review') {
    // Dynamic: depends on outcome (state after review)
    if (currentState === 'PLAN_REVIEWED') {
      // Review passed → chain to execute
      nextHandler = 'execute';
      resetOptimizeCounter(ctxPath);
    } else if (currentState === 'PLAN_CREATED') {
      // Review failed (state unchanged) → chain to plan-optimize if under loop limit
      const loopCount = getOptimizeCounter(ctxPath);
      if (loopCount < MAX_OPTIMIZE_LOOPS) {
        nextHandler = 'plan-optimize';
        incrementOptimizeCounter(ctxPath);
      } else {
        // Max loops reached — stop auto-chain, let user decide
        resetOptimizeCounter(ctxPath);
        process.exit(0);
      }
    } else {
      process.exit(0);
    }
  } else if (completedCommand === 'plan-optimize') {
    // After optimize → re-review
    nextHandler = 'plan-review';
  } else {
    nextHandler = AUTO_CHAIN_MAP[completedCommand];
  }

  if (!nextHandler) {
    process.exit(0);
  }

  // Validate the auto-chain transition is legal
  const validation = sm.validateTransition(currentState, nextHandler, taskType);
  if (!validation.valid) {
    process.exit(0);
  }

  // Output additionalContext — Claude receives this as instruction
  const skillCommand = `/${nextHandler}`;
  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: [
        `[EPS Auto-Chain] /${completedCommand} completed. State: ${currentState}.`,
        `MANDATORY: Execute ${skillCommand} now. Do NOT ask for user confirmation.`,
        `Use the Skill tool to invoke "${nextHandler}" immediately.`,
      ].join('\n')
    }
  });

  process.stdout.write(output);
  process.exit(0);
}

main().catch(() => {
  // P4: fail-open — don't break the workflow on hook errors
  process.exit(0);
});
