'use strict';

/**
 * coverage-aggregator.js — JaCoCo + Istanbul coverage report parsing.
 *
 * Layer: L6 ENGINE
 *
 * Parses JaCoCo XML (Java) and Istanbul JSON (TypeScript)
 * into unified coverage metrics.
 */

const fs = require('fs');

/**
 * Aggregate JaCoCo XML coverage reports.
 *
 * @param {string[]} xmlPaths - Paths to JaCoCo XML files
 * @returns {{line: number, branch: number, method: number, packages: object[]}}
 */
function aggregateJaCoCo(xmlPaths) {
  const result = { line: 0, branch: 0, method: 0, packages: [] };
  let totalLine = { covered: 0, missed: 0 };
  let totalBranch = { covered: 0, missed: 0 };
  let totalMethod = { covered: 0, missed: 0 };

  for (const xmlPath of (xmlPaths || [])) {
    if (!fs.existsSync(xmlPath)) continue;

    try {
      const content = fs.readFileSync(xmlPath, 'utf8');
      const parsed = _parseJaCoCoXML(content);

      totalLine.covered += parsed.line.covered;
      totalLine.missed += parsed.line.missed;
      totalBranch.covered += parsed.branch.covered;
      totalBranch.missed += parsed.branch.missed;
      totalMethod.covered += parsed.method.covered;
      totalMethod.missed += parsed.method.missed;

      result.packages.push(...parsed.packages);
    } catch {
      // XML parse error — skip
    }
  }

  result.line = _pct(totalLine.covered, totalLine.missed);
  result.branch = _pct(totalBranch.covered, totalBranch.missed);
  result.method = _pct(totalMethod.covered, totalMethod.missed);

  return result;
}

/**
 * Aggregate Istanbul JSON coverage reports.
 *
 * @param {string[]} jsonPaths - Paths to Istanbul coverage-final.json files
 * @returns {{statement: number, branch: number, function: number, files: object[]}}
 */
function aggregateIstanbul(jsonPaths) {
  const result = { line: 0, branch: 0, method: 0, statement: 0, function: 0, files: [] };
  let totalStatement = { covered: 0, total: 0 };
  let totalBranch = { covered: 0, total: 0 };
  let totalFunction = { covered: 0, total: 0 };
  let totalLine = { covered: 0, total: 0 };

  for (const jsonPath of (jsonPaths || [])) {
    if (!fs.existsSync(jsonPath)) continue;

    try {
      const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      for (const [filePath, data] of Object.entries(content)) {
        const stats = _calcIstanbulFile(data);

        totalStatement.covered += stats.statement.covered;
        totalStatement.total += stats.statement.total;
        totalBranch.covered += stats.branch.covered;
        totalBranch.total += stats.branch.total;
        totalFunction.covered += stats.function.covered;
        totalFunction.total += stats.function.total;
        totalLine.covered += stats.line.covered;
        totalLine.total += stats.line.total;

        result.files.push({
          path: filePath,
          statement: _safePct(stats.statement.covered, stats.statement.total),
          branch: _safePct(stats.branch.covered, stats.branch.total),
          function: _safePct(stats.function.covered, stats.function.total),
          line: _safePct(stats.line.covered, stats.line.total),
        });
      }
    } catch {
      // JSON parse error — skip
    }
  }

  result.statement = _safePct(totalStatement.covered, totalStatement.total);
  result.branch = _safePct(totalBranch.covered, totalBranch.total);
  result.function = _safePct(totalFunction.covered, totalFunction.total);
  result.line = _safePct(totalLine.covered, totalLine.total);
  result.method = result.function; // Alias for unified interface

  return result;
}

/**
 * Generate a markdown coverage dashboard.
 *
 * @param {object} backendCoverage - From aggregateJaCoCo
 * @param {object} frontendCoverage - From aggregateIstanbul
 * @returns {string} Markdown content
 */
function generateDashboard(backendCoverage, frontendCoverage) {
  const lines = [];

  lines.push('# Coverage Dashboard');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Backend | Frontend | Combined |');
  lines.push('|--------|---------|----------|----------|');

  const beLine = backendCoverage ? backendCoverage.line : 0;
  const feLine = frontendCoverage ? frontendCoverage.line : 0;
  const beBranch = backendCoverage ? backendCoverage.branch : 0;
  const feBranch = frontendCoverage ? frontendCoverage.branch : 0;
  const beMethod = backendCoverage ? backendCoverage.method : 0;
  const feMethod = frontendCoverage ? (frontendCoverage.function || frontendCoverage.method || 0) : 0;

  const combined = (val1, val2) => {
    if (!val1 && !val2) return 0;
    if (!val1) return val2;
    if (!val2) return val1;
    return Math.round((val1 + val2) / 2);
  };

  lines.push('| Line | ' + beLine + '% | ' + feLine + '% | ' + combined(beLine, feLine) + '% |');
  lines.push('| Branch | ' + beBranch + '% | ' + feBranch + '% | ' + combined(beBranch, feBranch) + '% |');
  lines.push('| Method/Function | ' + beMethod + '% | ' + feMethod + '% | ' + combined(beMethod, feMethod) + '% |');

  // Backend packages
  if (backendCoverage && backendCoverage.packages && backendCoverage.packages.length > 0) {
    lines.push('');
    lines.push('## Backend Packages');
    lines.push('');
    lines.push('| Package | Line | Branch | Method |');
    lines.push('|---------|------|--------|--------|');
    for (const pkg of backendCoverage.packages) {
      lines.push('| ' + pkg.name + ' | ' + pkg.line + '% | ' + pkg.branch + '% | ' + pkg.method + '% |');
    }
  }

  // Frontend files
  if (frontendCoverage && frontendCoverage.files && frontendCoverage.files.length > 0) {
    lines.push('');
    lines.push('## Frontend Files');
    lines.push('');
    lines.push('| File | Statement | Branch | Function |');
    lines.push('|------|-----------|--------|----------|');
    for (const file of frontendCoverage.files) {
      const name = file.path.split('/').slice(-2).join('/');
      lines.push('| ' + name + ' | ' + file.statement + '% | ' + file.branch + '% | ' + file.function + '% |');
    }
  }

  return lines.join('\n');
}

// ── JaCoCo XML Parser ────────────────────────────────────────────────────────

function _parseJaCoCoXML(xml) {
  const result = {
    line: { covered: 0, missed: 0 },
    branch: { covered: 0, missed: 0 },
    method: { covered: 0, missed: 0 },
    packages: [],
  };

  // Parse top-level counters: <counter type="LINE" missed="X" covered="Y"/>
  const counterRegex = /<counter\s+type="(\w+)"\s+missed="(\d+)"\s+covered="(\d+)"\s*\/>/g;
  let m;
  while ((m = counterRegex.exec(xml)) !== null) {
    const type = m[1].toLowerCase();
    const missed = parseInt(m[2]);
    const covered = parseInt(m[3]);

    if (type === 'line') {
      result.line.covered += covered;
      result.line.missed += missed;
    } else if (type === 'branch') {
      result.branch.covered += covered;
      result.branch.missed += missed;
    } else if (type === 'method') {
      result.method.covered += covered;
      result.method.missed += missed;
    }
  }

  // Parse package-level data
  const pkgRegex = /<package\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/package>/g;
  let p;
  while ((p = pkgRegex.exec(xml)) !== null) {
    const pkgName = p[1];
    const pkgContent = p[2];
    const pkgCounters = {};

    let c;
    const innerCounter = /<counter\s+type="(\w+)"\s+missed="(\d+)"\s+covered="(\d+)"\s*\/>/g;
    while ((c = innerCounter.exec(pkgContent)) !== null) {
      pkgCounters[c[1].toLowerCase()] = {
        missed: parseInt(c[2]),
        covered: parseInt(c[3]),
      };
    }

    result.packages.push({
      name: pkgName.replace(/\//g, '.'),
      line: _pct(
        (pkgCounters.line || {}).covered || 0,
        (pkgCounters.line || {}).missed || 0
      ),
      branch: _pct(
        (pkgCounters.branch || {}).covered || 0,
        (pkgCounters.branch || {}).missed || 0
      ),
      method: _pct(
        (pkgCounters.method || {}).covered || 0,
        (pkgCounters.method || {}).missed || 0
      ),
    });
  }

  return result;
}

// ── Istanbul Helpers ─────────────────────────────────────────────────────────

function _calcIstanbulFile(data) {
  const stats = {
    statement: { covered: 0, total: 0 },
    branch: { covered: 0, total: 0 },
    function: { covered: 0, total: 0 },
    line: { covered: 0, total: 0 },
  };

  // Statement map
  if (data.s) {
    for (const [, count] of Object.entries(data.s)) {
      stats.statement.total++;
      if (count > 0) stats.statement.covered++;
    }
  }

  // Branch map
  if (data.b) {
    for (const [, branches] of Object.entries(data.b)) {
      for (const count of branches) {
        stats.branch.total++;
        if (count > 0) stats.branch.covered++;
      }
    }
  }

  // Function map
  if (data.f) {
    for (const [, count] of Object.entries(data.f)) {
      stats.function.total++;
      if (count > 0) stats.function.covered++;
    }
  }

  // Line map (if available)
  if (data.l) {
    for (const [, count] of Object.entries(data.l)) {
      stats.line.total++;
      if (count > 0) stats.line.covered++;
    }
  } else {
    // Fallback: estimate from statement map
    stats.line = { ...stats.statement };
  }

  return stats;
}

// ── Utility ──────────────────────────────────────────────────────────────────

function _pct(covered, missed) {
  const total = covered + missed;
  if (total === 0) return 0;
  return Math.round((covered / total) * 100);
}

function _safePct(covered, total) {
  if (total === 0) return 0;
  return Math.round((covered / total) * 100);
}

module.exports = { aggregateJaCoCo, aggregateIstanbul, generateDashboard };
