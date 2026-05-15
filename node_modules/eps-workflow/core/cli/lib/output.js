/**
 * output.js — JSON output writer for ops.js results
 * Writes to cache/ops-result.json (arch/03 §1.1)
 */
const fs = require('fs');
const path = require('path');

function writeResult(result, pkgRoot) {
  const cacheDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const outFile = path.join(cacheDir, 'ops-result.json');
  result.timestamp = new Date().toISOString();
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
}

module.exports = { writeResult };
