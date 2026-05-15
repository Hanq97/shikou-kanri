'use strict';

/**
 * preuninstall.js — Cleanup when consumer runs `npm uninstall eps-workflow`
 *
 * Steps:
 *   1. Detect consumer project root (INIT_CWD or cwd)
 *   2. Remove 4 symlinks: core, specialists, guards, skills
 *   3. Keep .claude/commands/, .claude/rules/, .claude/config/ (user-owned copies)
 *
 * P4 fail-open: always exits with code 0 so that uninstall never breaks for the consumer.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { remove: removeSymlink } = require('./lib/symlink-manager');

// ── Resolve consumer root ─────────────────────────────────────────────────────

function resolveConsumerRoot() {
  const initCwd = process.env.INIT_CWD;
  if (initCwd && fs.existsSync(initCwd)) {
    return initCwd;
  }
  let dir = process.cwd();
  const nmIdx = dir.lastIndexOf(`${path.sep}node_modules${path.sep}`);
  if (nmIdx !== -1) {
    return dir.slice(0, nmIdx);
  }
  return dir;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(function main() {
  let consumerRoot;
  try {
    consumerRoot = resolveConsumerRoot();
  } catch (e) {
    process.exit(0);
  }

  const claudeDir = path.join(consumerRoot, '.claude');

  if (!fs.existsSync(claudeDir)) {
    // Nothing to clean up
    process.exit(0);
  }

  // Remove only the 4 managed symlinks — user-owned content is untouched
  const SYMLINK_NAMES = ['core', 'specialists', 'guards', 'skills'];

  for (const name of SYMLINK_NAMES) {
    const link = path.join(claudeDir, name);
    try {
      const result = removeSymlink(link);
      if (!result.ok) {
        process.stderr.write(
          `[eps-workflow] warn: could not remove .claude/${name}: ${result.error || 'unknown'}\n`
        );
      }
    } catch (e) {
      process.stderr.write(`[eps-workflow] warn: could not remove .claude/${name}: ${e.message}\n`);
    }
  }

  // .claude/commands/, .claude/rules/, .claude/config/ — intentionally NOT removed
  // These are user-owned copies placed by postinstall and may contain customisations.

  // Always exit 0 (P4 fail-open)
  process.exit(0);
})();
