#!/usr/bin/env node
/**
 * ops.js — Single CLI entry point for all EPS operations
 * Usage: node core/cli/ops.js <action> [--key value ...]
 * Output: cache/ops-result.json (JSON)
 * 
 * Contract: arch/03 §1 — Every action produces {ok, action, data?, error?}
 */

const path = require('path');
const { writeResult } = require('./lib/output');
const { parseArgs } = require('./lib/validate');

const ACTION = process.argv[2];
const args = parseArgs(process.argv.slice(3));

// Package root = 2 levels up from core/cli/
const PKG_ROOT = path.resolve(__dirname, '../..');

if (!ACTION) {
  writeResult({ ok: false, action: 'unknown', error: 'No action specified. Usage: node ops.js <action> [--key value]' }, PKG_ROOT);
  process.exit(2);
}

// Load action registry
let registry;
try {
  registry = require('./package-ops.json');
} catch (e) {
  writeResult({ ok: false, action: ACTION, error: 'Cannot load package-ops.json: ' + e.message }, PKG_ROOT);
  process.exit(2);
}

const modulePath = registry.actions[ACTION];
if (!modulePath) {
  writeResult({ ok: false, action: ACTION, error: `Unknown action: ${ACTION}. Available: ${Object.keys(registry.actions).join(', ')}` }, PKG_ROOT);
  process.exit(2);
}

// Route to action module
(async () => {
  try {
    const actionModule = require(modulePath);
    const handler = typeof actionModule === 'function' ? actionModule : actionModule.run || actionModule[ACTION] || actionModule.default;
    
    if (typeof handler !== 'function') {
      writeResult({ ok: false, action: ACTION, error: `Action module ${ACTION} has no callable handler` }, PKG_ROOT);
      process.exit(1);
    }

    const result = await handler({ action: ACTION, args, pkgRoot: PKG_ROOT });
    writeResult({ ok: true, action: ACTION, data: result || {} }, PKG_ROOT);
    process.exit(0);
  } catch (err) {
    // P4: fail-open — always output valid JSON, never crash silently
    writeResult({ ok: false, action: ACTION, error: err.message, stack: args.verbose ? err.stack : undefined }, PKG_ROOT);
    process.exit(1);
  }
})();
