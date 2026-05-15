'use strict';

// init/confirm.js — Interactive Summary + Confirmation
// Displays detection summary and scaffold plan, then prompts Y/N.
// --yes flag bypasses prompt for CI/CD pipelines.

const readline = require('readline');
const path = require('path');

/**
 * Format a list of scaffold file entries for display.
 * @param {import('./scaffold').ScaffoldFileEntry[]} files
 * @returns {string[]}
 */
function formatFileList(files) {
  return files.map(f => {
    const dest = f.dest;
    const name = path.basename(dest);
    const dir = path.dirname(dest);
    if (f.status === 'skipped') {
      return `  - ${name}  [SKIP — ${f.reason || 'exists'}]`;
    }
    return `  - ${name}  →  ${dir}`;
  });
}

/**
 * Print the detection + scaffold summary to stdout.
 * @param {import('./detect').DetectResult} detectResult
 * @param {import('./scaffold').ScaffoldResult} scaffoldPlan
 */
function printSummary(detectResult, scaffoldPlan) {
  console.log('');
  console.log('=== EPS Init — Detection Summary ===');

  if (detectResult.detected) {
    console.log(`  Project   : ${detectResult.projectName}`);
    console.log(`  Stack(s)  : ${detectResult.stacks.join(', ')}`);
    if (detectResult.variant) {
      console.log(`  Variant   : ${detectResult.variant}`);
    }
    console.log(`  Confidence: ${Math.round(detectResult.confidence * 100)}%`);
    console.log(`  Probe file: ${detectResult.probeFile || 'n/a'}`);
  } else {
    console.log('  No recognized stack detected — will scaffold generic template.');
    console.log(`  Project   : ${detectResult.projectName}`);
  }

  console.log('');
  console.log('=== Files to Scaffold ===');

  if (!scaffoldPlan || !scaffoldPlan.files || scaffoldPlan.files.length === 0) {
    console.log('  (no files)');
  } else {
    const lines = formatFileList(scaffoldPlan.files);
    lines.forEach(l => console.log(l));
  }

  const toWrite = (scaffoldPlan && scaffoldPlan.files)
    ? scaffoldPlan.files.filter(f => f.status === 'preview').length
    : 0;
  const toSkip = (scaffoldPlan && scaffoldPlan.files)
    ? scaffoldPlan.files.filter(f => f.status === 'skipped').length
    : 0;

  console.log('');
  console.log(`  Will write: ${toWrite} file(s)   Will skip: ${toSkip} file(s)`);
  console.log('');
}

/**
 * Prompt the user for Y/N confirmation using readline.
 * Returns a Promise<boolean>.
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function promptYN(question) {
  return new Promise((resolve) => {
    let answered = false;
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      const normalized = (answer || '').trim().toLowerCase();
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });

    // Handle stream close without answer (e.g. piped input)
    rl.on('close', () => {
      if (!answered) resolve(false);
    });
  });
}

/**
 * Display detection summary and ask user for confirmation.
 *
 * Returns true (proceed) or false (abort).
 *
 * --yes flag bypasses interactive prompt and returns true immediately.
 *
 * @param {import('./detect').DetectResult} detectResult
 * @param {import('./scaffold').ScaffoldResult} scaffoldPlan
 * @param {{ yes?: boolean, force?: boolean }} options
 * @returns {Promise<boolean>}
 */
async function confirm(detectResult, scaffoldPlan, options = {}) {
  const { yes = false } = options;

  printSummary(detectResult, scaffoldPlan);

  // CI/CD mode — skip prompt
  if (yes) {
    console.log('[eps init] --yes flag set, proceeding without prompt.');
    return true;
  }

  // Check if stdin is a TTY; if not (piped), default to false
  if (!process.stdin.isTTY) {
    console.log('[eps init] Non-interactive mode detected. Use --yes to proceed.');
    return false;
  }

  let answer;
  try {
    answer = await promptYN('Proceed with scaffolding? [Y/n] ');
  } catch (err) {
    console.error(`[eps init] Prompt error: ${err.message}`);
    return false;
  }

  return answer;
}

module.exports = { confirm, printSummary };
