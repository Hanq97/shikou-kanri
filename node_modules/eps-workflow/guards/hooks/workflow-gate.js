#!/usr/bin/env node

/**
 * EPS Workflow Gate - PreToolUse Hook
 *
 * Validates workflow state before EPS skill execution.
 * Blocks invalid state transitions with exit code 2.
 *
 * Usage: Configured in .claude/settings.json as PreToolUse hook
 * Matcher: "Skill" (only fires for Skill tool invocations)
 */

const path = require('path');
const fs = require('fs');

const EPS_SKILLS = ['research', 'innovate', 'design', 'design-review', 'plan', 'plan-review', 'execute', 'validate', 'test'];

// Skill name → state-manager command mapping
function getCommandName(skillName, args) {
  if (skillName === 'design') {
    if (args && args.includes('--srs')) return 'design-srs';
    if (args && args.includes('--basic')) return 'design-basic';
    if (args && args.includes('--detail')) return 'design-detail';
    return 'design-srs'; // default
  }
  return skillName;
}

async function main() {
  // Read stdin (tool input JSON from Claude Code)
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let toolInput;
  try {
    toolInput = JSON.parse(input);
  } catch (e) {
    // Cannot parse → pass through
    process.exit(0);
  }

  // Extract skill name
  const skillName = toolInput.tool_input?.skill || toolInput.skill || '';
  const args = toolInput.tool_input?.args || toolInput.args || '';

  // Only validate EPS workflow skills
  if (!EPS_SKILLS.includes(skillName)) {
    process.exit(0); // pass through
  }

  // /research is always allowed (it creates context)
  if (skillName === 'research') {
    process.exit(0);
  }

  // Find active context
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let smPath = path.join(projectDir, '.claude', 'core', 'state', 'state-manager.js');
  if (!fs.existsSync(smPath)) {
    // Fallback: direct path (running from package dir itself, e.g., development)
    smPath = path.join(projectDir, 'core', 'state', 'state-manager.js');
  }

  if (!fs.existsSync(smPath)) {
    // No state-manager → pass through (enforcement not available)
    process.exit(0);
  }

  const sm = require(smPath);
  const ctx = sm.findActiveContext();

  if (!ctx) {
    process.stderr.write(
      `[EPS Gate] No active workflow context found.\n` +
      `Run /research first to initialize a workflow context.\n` +
      `Example: /research --input <requirement-file> --type <new|enhancement|bugfix>\n` +
      `For infrastructure: /research --type infrastructure --module INF\n`
    );
    process.exit(2);
  }

  // Load current state + task type
  const context = sm.loadContext(ctx);
  const currentState = context.currentState || 'INITIAL';
  const taskType = context.taskType || null;
  const commandName = getCommandName(skillName, args);

  // Validate transition (v7.0: task-type-aware)
  const result = sm.validateTransition(currentState, commandName, taskType);

  if (!result.valid) {
    process.stderr.write(
      `[EPS Gate] Invalid workflow transition.\n` +
      `Current state: ${currentState}\n` +
      `Task type: ${taskType || 'new'}\n` +
      `Command: /${skillName}${args ? ' ' + args : ''}\n` +
      `${result.message}\n`
    );
    process.exit(2);
  }

  // Valid → proceed
  process.exit(0);
}

main().catch(() => {
  // On error, pass through (don't block on hook failures)
  process.exit(0);
});
