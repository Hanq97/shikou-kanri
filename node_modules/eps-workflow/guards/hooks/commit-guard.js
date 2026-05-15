#!/usr/bin/env node

/**
 * EPS Commit Guard - PreToolUse Hook
 *
 * Blocks git commit commands that contain Claude/Anthropic as author/co-author.
 * Suggests using the actual git user instead.
 *
 * Matcher: "Bash(git commit*)" — only fires for git commit commands
 * Exit 2 = BLOCK the tool use
 * Exit 0 = ALLOW
 */

'use strict';

const { execSync } = require('child_process');

const BLOCKED_PATTERNS = [
  /Claude\s+(Opus|Sonnet|Haiku)/i,
  /noreply@anthropic\.com/i,
  /Anthropic/i,
  /Claude\s+\d/i
];

function getGitUser() {
  try {
    const name = execSync('git config user.name', { encoding: 'utf8' }).trim();
    const email = execSync('git config user.email', { encoding: 'utf8' }).trim();
    if (name && email) return `${name} <${email}>`;
    if (name) return name;
  } catch (e) {
    // ignore
  }
  return null;
}

async function main() {
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

  const command = toolInput.tool_input?.command || toolInput.command || '';

  // Only check git commit commands
  if (!command.includes('git commit')) {
    process.exit(0);
  }

  // Check for blocked patterns in the commit command
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      const gitUser = getGitUser();
      const suggestion = gitUser
        ? `Use the git user instead: ${gitUser}`
        : `Configure git user: git config user.name "Your Name" && git config user.email "you@example.com"`;

      process.stderr.write(
        `[EPS Commit Guard] BLOCKED: Claude/Anthropic attribution detected in commit.\n` +
        `Rule: Commits must use the real git user, NOT AI attribution.\n` +
        `${suggestion}\n`
      );
      process.exit(2);
    }
  }

  process.exit(0);
}

main().catch(() => {
  // On error, pass through (P4 fail-open)
  process.exit(0);
});
