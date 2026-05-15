#!/usr/bin/env node
// cli.js — npx eps <command> entry point

'use strict';

require('dotenv').config();
const path = require('path');

/**
 * Parse flags from argv slice.
 * Returns an object with boolean flags and --key=value pairs.
 * @param {string[]} args
 * @returns {{ yes: boolean, force: boolean, dryRun: boolean, json: boolean, verbose: boolean, [key: string]: any }}
 */
function parseFlags(args) {
  const flags = {
    yes: false,
    force: false,
    dryRun: false,
    json: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--yes' || arg === '-y') {
      flags.yes = true;
    } else if (arg === '--force' || arg === '-f') {
      flags.force = true;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--json') {
      flags.json = true;
    } else if (arg === '--verbose' || arg === '-v') {
      flags.verbose = true;
    } else if (arg.startsWith('--')) {
      // Generic --key=value or --key value (next arg)
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const value = arg.slice(eqIdx + 1);
        flags[key] = value;
      } else {
        const key = arg.slice(2);
        // Peek ahead: if next arg exists and is not a flag, consume it as value
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          flags[key] = next;
          i++; // skip consumed value
        } else {
          flags[key] = true;
        }
      }
    }
  }

  return flags;
}

/**
 * Print usage help.
 */
function printHelp() {
  console.log(`
eps — Enhanced Productivity System CLI

USAGE
  npx eps <command> [options]

COMMANDS
  init, setup       Scaffold EPS config into a project directory
  doctor            Check symlinks, deps, config, and optional RAG health
  sync-commands     Merge new default commands without overwriting customizations
  test <sub>        Run ETF test pipeline (scan | generate | validate)

OPTIONS
  --yes, -y         Skip interactive prompts (CI/CD mode)
  --force, -f       Overwrite existing files (use with caution)
  --dry-run         Preview changes without writing
  --json            Output results in JSON format
  --verbose, -v     Show detailed output
  --module <id>     Target module for test command (e.g. cmn015000)
  --all             Run test command against all modules
  --help, -h        Show this help message

EXAMPLES
  npx eps init
  npx eps init --yes
  npx eps doctor
  npx eps sync-commands --dry-run
  npx eps sync-commands --force
  npx eps test scan --module cmn015000
  npx eps test generate --module cmn015000 --json
`);
}

/**
 * Run the init/setup command.
 * @param {{ yes: boolean, force: boolean, dryRun: boolean, json: boolean, verbose: boolean }} flags
 */
async function runInit(flags) {
  const { detectStack } = require('./init/detect');
  const { scaffold } = require('./init/scaffold');
  const { confirm } = require('./init/confirm');

  const projectDir = process.cwd();

  if (flags.verbose) {
    console.log(`[eps init] Detecting stack in: ${projectDir}`);
  }

  let detectResult;
  try {
    detectResult = detectStack(projectDir);
  } catch (err) {
    console.error(`[eps init] Stack detection failed: ${err.message}`);
    process.exit(1);
  }

  if (!detectResult.detected) {
    console.warn('[eps init] No recognized stack detected. Proceeding with generic scaffold.');
  } else if (flags.verbose) {
    console.log(`[eps init] Detected: ${JSON.stringify(detectResult.stacks)}`);
  }

  // Build scaffold plan (dry run = preview only)
  let scaffoldResult;
  try {
    scaffoldResult = scaffold(detectResult, projectDir, { ...flags, previewOnly: true });
  } catch (err) {
    console.error(`[eps init] Scaffold planning failed: ${err.message}`);
    process.exit(1);
  }

  // Interactive confirmation
  let proceed;
  try {
    proceed = await confirm(detectResult, scaffoldResult, flags);
  } catch (err) {
    console.error(`[eps init] Confirmation failed: ${err.message}`);
    process.exit(1);
  }

  if (!proceed) {
    console.log('[eps init] Aborted by user.');
    process.exit(0);
  }

  if (flags.dryRun) {
    console.log('[eps init] Dry-run mode — no files written.');
    if (flags.json) {
      console.log(JSON.stringify({ dryRun: true, plan: scaffoldResult }, null, 2));
    }
    process.exit(0);
  }

  // Execute scaffold
  let result;
  try {
    result = scaffold(detectResult, projectDir, flags);
  } catch (err) {
    console.error(`[eps init] Scaffold failed: ${err.message}`);
    process.exit(1);
  }

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const written = result.files.filter(f => f.status === 'written').length;
    const skipped = result.files.filter(f => f.status === 'skipped').length;
    console.log(`[eps init] Done. Written: ${written}, Skipped: ${skipped}`);
  }
}

/**
 * Run the doctor command.
 * @param {{ json: boolean, verbose: boolean }} flags
 */
async function runDoctor(flags) {
  const { checkSymlinks } = require('./doctor/check-symlinks');
  const { checkDeps } = require('./doctor/check-deps');
  const { checkConfig } = require('./doctor/check-config');
  const { checkRag } = require('./doctor/check-rag');

  const projectDir = process.cwd();
  const allResults = [];

  // Run checks in order
  const checks = [
    { label: 'Symlinks', fn: () => checkSymlinks(projectDir) },
    { label: 'Dependencies', fn: () => checkDeps(projectDir) },
    { label: 'Config', fn: () => checkConfig(projectDir) },
    { label: 'RAG', fn: () => checkRag(projectDir) }
  ];

  for (const check of checks) {
    if (flags.verbose) {
      console.log(`[eps doctor] Running check: ${check.label}`);
    }
    try {
      const results = await Promise.resolve(check.fn());
      for (const r of results) {
        allResults.push({ category: check.label, ...r });
      }
    } catch (err) {
      allResults.push({
        category: check.label,
        name: check.label,
        ok: false,
        message: `Check threw error: ${err.message}`
      });
    }
  }

  if (flags.json) {
    console.log(JSON.stringify(allResults, null, 2));
  } else {
    let hasFailure = false;
    for (const r of allResults) {
      const icon = r.ok ? 'PASS' : 'FAIL';
      console.log(`  [${icon}] ${r.category}/${r.name}: ${r.message}`);
      if (!r.ok) hasFailure = true;
    }
    const total = allResults.length;
    const passed = allResults.filter(r => r.ok).length;
    console.log(`\n[eps doctor] ${passed}/${total} checks passed.`);
    if (hasFailure) process.exit(1);
  }
}

/**
 * Run the sync-commands command.
 * @param {{ dryRun: boolean, force: boolean, json: boolean, verbose: boolean }} flags
 */
async function runSyncCommands(flags) {
  const { syncCommands } = require('./sync/sync-commands');

  const projectDir = process.cwd();
  // The defaults dir is relative to this package's install location
  const defaultsDir = path.join(__dirname, 'defaults', 'commands');
  const targetDir = path.join(projectDir, '.claude', 'commands');

  if (flags.verbose) {
    console.log(`[eps sync-commands] defaults: ${defaultsDir}`);
    console.log(`[eps sync-commands] target:   ${targetDir}`);
  }

  let results;
  try {
    results = await Promise.resolve(syncCommands(defaultsDir, targetDir, flags));
  } catch (err) {
    console.error(`[eps sync-commands] Failed: ${err.message}`);
    process.exit(1);
  }

  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      const icon = r.action === 'copy' ? 'COPY' : 'SKIP';
      console.log(`  [${icon}] ${r.file}${r.note ? ' — ' + r.note : ''}`);
    }
    const copied = results.filter(r => r.action === 'copy').length;
    const skipped = results.filter(r => r.action === 'skip').length;
    const label = flags.dryRun ? ' (dry-run)' : '';
    console.log(`\n[eps sync-commands] Copied: ${copied}, Skipped: ${skipped}${label}`);
  }
}

/**
 * Run the test command (ETF pipeline).
 * @param {string} subCommand - scan | generate | validate
 * @param {{ module?: string, all?: boolean, json?: boolean, verbose?: boolean }} flags
 */
async function runTest(subCommand, flags) {
  const { routeCommand } = require('./core/etf/command-router');

  const validSubs = ['scan', 'generate', 'validate'];
  if (!subCommand || !validSubs.includes(subCommand)) {
    console.error(`[eps test] Invalid sub-command: ${subCommand || '(none)'}`);
    console.error(`  Valid sub-commands: ${validSubs.join(', ')}`);
    console.error('  Usage: npx eps test scan --module <id>');
    process.exit(1);
  }

  if (!flags.module && !flags.all) {
    console.error('[eps test] --module <id> or --all is required.');
    console.error('  Usage: npx eps test scan --module cmn015000');
    process.exit(1);
  }

  if (flags.verbose) {
    console.log(`[eps test] ${subCommand} module=${flags.module || '(all)'}`);
  }

  const result = await routeCommand({ command: 'test', sub: subCommand, flags });

  if (!result.ok) {
    if (result.needsBootstrap) {
      console.error('[eps test] Test infrastructure not ready.');
      console.error('  Run the bootstrapper to set up test infrastructure first.');
    } else {
      console.error(`[eps test] Error: ${result.error}`);
    }
    process.exit(1);
  }

  if (flags.json) {
    console.log(JSON.stringify(result.report || result.result, null, 2));
  } else {
    const inline = result.report && result.report.inline;
    if (inline) {
      console.log(inline);
    } else {
      console.log(`[eps test] ${subCommand} completed successfully.`);
      if (result.outputPath) {
        console.log(`  Output: ${result.outputPath}`);
      }
    }
  }
}

// ── Main Dispatch ─────────────────────────────────────────────────────────────

const command = process.argv[2];

if (command === 'test') {
  // test has a sub-command: npx eps test scan --module cmn015000
  const subCommand = process.argv[3];
  const flags = parseFlags(process.argv.slice(4));
  runTest(subCommand, flags).catch(err => {
    console.error(`[eps] Unexpected error: ${err.message}`);
    process.exit(1);
  });
} else {
  const flags = parseFlags(process.argv.slice(3));

  switch (command) {
    case 'init':
    case 'setup':
      runInit(flags).catch(err => {
        console.error(`[eps] Unexpected error: ${err.message}`);
        process.exit(1);
      });
      break;

    case 'doctor':
      runDoctor(flags).catch(err => {
        console.error(`[eps] Unexpected error: ${err.message}`);
        process.exit(1);
      });
      break;

    case 'sync-commands':
      runSyncCommands(flags).catch(err => {
        console.error(`[eps] Unexpected error: ${err.message}`);
        process.exit(1);
      });
      break;

    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}
