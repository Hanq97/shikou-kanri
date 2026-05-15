/**
 * design-checkpoint.js — Section-by-section enforcement for design document generation
 *
 * Sub-actions: verify, complete, verify-all, reset, skill-gate, skill-verify, skill-reset
 *
 * Usage:
 *   node core/cli/ops.js design-checkpoint --action verify --section N --type bdd|fdd|basic|srs|plan|execute|validate
 *   node core/cli/ops.js design-checkpoint --action complete --section N --type bdd|fdd|basic|srs|plan|execute|validate --file <path>
 *   node core/cli/ops.js design-checkpoint --action verify-all --type bdd|fdd|basic|srs|plan|execute|validate
 *   node core/cli/ops.js design-checkpoint --action reset --type bdd|fdd|basic|srs|plan|execute|validate
 *   node core/cli/ops.js design-checkpoint --action skill-gate --skill <name> --command <cmd> --result PASS
 *   node core/cli/ops.js design-checkpoint --action skill-verify --skills <name1,name2> --mode strict|warn
 *   node core/cli/ops.js design-checkpoint --action skill-reset --command <cmd>
 */

const fs = require('fs');
const path = require('path');

// Default fallback — overridden in handler via resolveCheckpointDir()
let CHECKPOINT_DIR = '.checkpoints';

/**
 * Resolve checkpoint directory to memory-bank/{branch}/{context}/checkpoints/
 * Falls back to CWD/.checkpoints if no active context found.
 * @param {string} pkgRoot — aurea-code package root
 */
function resolveCheckpointDir(pkgRoot) {
  try {
    const sm = require(path.join(pkgRoot, 'core/state/state-manager.js'));
    const activeCtx = sm.findActiveContext();
    if (activeCtx) {
      return path.join(activeCtx, 'checkpoints');
    }
  } catch (_) {
    // state-manager unavailable or no git repo — fall through
  }
  return '.checkpoints';
}

const SECTION_CONFIGS = {
  bdd:   { count: 10, headerRegex: /^##\s+(\d+)\./,       minLines: 20 },
  fdd:   { count: 10, headerRegex: /^##\s+(\d+)\./,       minLines: 20 },
  basic: { count: 7,  headerRegex: /^##\s+(\d+)\.(\d+)/,  minLines: 30 },
  srs:   { count: 7,  headerRegex: /^##\s+(0[0-6])/,      minLines: 25 },
  plan:  { count: -1, headerRegex: null,                    minLines: 40 },
  // EXECUTE-VALIDATE-FIX: Lock-only — execute/validate write code files, not markdown sections
  execute:  { count: -1, headerRegex: null, minLines: 0, sequential: false },
  validate: { count: -1, headerRegex: null, minLines: 0, sequential: false },
};

function getConfig(type) {
  const config = SECTION_CONFIGS[type];
  if (!config) throw new Error(`Unknown type: ${type}. Valid: ${Object.keys(SECTION_CONFIGS).join(', ')}`);
  return config;
}

function getLockPath(type, section) {
  return path.join(CHECKPOINT_DIR, `${type}-s${section}.lock`);
}

async function verify({ section, type }) {
  const config = getConfig(type);

  // Plan type: no sequential enforcement (sub-plans are independent)
  if (config.count === -1) {
    const currentLock = getLockPath(type, section);
    if (fs.existsSync(currentLock)) {
      return { ok: false, canProceed: false, error: `Section ${section} already completed.` };
    }
    return { ok: true, canProceed: true, section, type };
  }

  // Sequential enforcement (basic, srs, bdd, fdd)
  if (section > 0) {
    const prevLock = getLockPath(type, section - 1);
    if (!fs.existsSync(prevLock)) {
      return {
        ok: false, canProceed: false,
        error: `Section ${section - 1} checkpoint missing. Complete section ${section - 1} first.`,
        expected: prevLock,
      };
    }
  }

  const currentLock = getLockPath(type, section);
  if (fs.existsSync(currentLock)) {
    return { ok: false, canProceed: false, error: `Section ${section} already completed.` };
  }

  return { ok: true, canProceed: true, section, type };
}

async function complete({ section, type, file }) {
  if (!file || !fs.existsSync(file)) {
    return { ok: false, error: `Output file not found: ${file}` };
  }

  // C0 reasoning special case: basic type section 0 produces reasoning.json
  // Skip header validation — Zod validates via reasoning-validator-bd.js
  if (type === 'basic' && section === 0) {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }
    const lockPath = getLockPath(type, section);
    const lockContent = JSON.stringify({
      section, type, lines: 0, minRequired: 0,
      timestamp: new Date().toISOString(), file,
      note: 'C0 reasoning — validated by reasoning-validator-bd.js',
    }, null, 2);
    fs.writeFileSync(lockPath, lockContent);
    return { ok: true, section: 0, lines: 0, validated: true,
             note: 'C0 reasoning — validated by reasoning-validator-bd.js' };
  }

  const config = getConfig(type);

  // EXECUTE-VALIDATE-FIX: Lock-only types (minLines=0 + no headerRegex)
  // Skip ALL content validation — quality enforced via skill-gates
  if (config.minLines === 0 && !config.headerRegex) {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }
    const lockPath = getLockPath(type, section);
    const lockContent = JSON.stringify({
      section, type,
      lines: 0, minRequired: 0,
      timestamp: new Date().toISOString(),
      file: file || null,
      note: 'Lock-only checkpoint — quality enforced via skill-gates',
    }, null, 2);
    fs.writeFileSync(lockPath, lockContent);
    return {
      ok: true, section, lines: 0, validated: true,
      note: `Lock-only — ${type} type, no content validation`,
    };
  }

  const content = fs.readFileSync(file, 'utf-8');
  const sectionHeader = findSectionHeader(content, section, config);

  if (!sectionHeader.found) {
    return { ok: false, error: `Section ${section} not found in output file`, section };
  }

  if (sectionHeader.lines < config.minLines) {
    return {
      ok: false, section, lines: sectionHeader.lines,
      error: `Section too short (${sectionHeader.lines} < ${config.minLines} lines)`,
    };
  }

  if (!fs.existsSync(CHECKPOINT_DIR)) {
    fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }

  const lockPath = getLockPath(type, section);
  const lockContent = JSON.stringify({
    section, type, lines: sectionHeader.lines, minRequired: config.minLines,
    timestamp: new Date().toISOString(), file,
  }, null, 2);
  fs.writeFileSync(lockPath, lockContent);

  return { ok: true, section, lines: sectionHeader.lines, validated: true };
}

async function verifyAll({ type }) {
  const config = getConfig(type);
  const completed = [];
  const missing = [];

  if (config.count === -1) {
    // Plan type: count all existing lock files
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      return { ok: false, sections: [], missing: [], total: 0 };
    }
    const files = fs.readdirSync(CHECKPOINT_DIR)
      .filter(f => f.startsWith(`${type}-s`) && f.endsWith('.lock'));
    return {
      ok: files.length > 0,
      sections: files.map(f => parseInt(f.match(/s(\d+)/)?.[1] || 0)),
      missing: [], total: files.length
    };
  }

  for (let i = 0; i < config.count; i++) {
    if (fs.existsSync(getLockPath(type, i))) {
      completed.push(i);
    } else {
      missing.push(i);
    }
  }

  return { ok: missing.length === 0, sections: completed, missing, total: completed.length };
}

async function reset({ type }) {
  const config = getConfig(type);
  let deleted = 0;

  if (config.count === -1) {
    if (fs.existsSync(CHECKPOINT_DIR)) {
      const files = fs.readdirSync(CHECKPOINT_DIR)
        .filter(f => f.startsWith(`${type}-s`) && f.endsWith('.lock'));
      files.forEach(f => { fs.unlinkSync(path.join(CHECKPOINT_DIR, f)); deleted++; });
    }
  } else {
    for (let i = 0; i < config.count; i++) {
      const lockPath = getLockPath(type, i);
      if (fs.existsSync(lockPath)) { fs.unlinkSync(lockPath); deleted++; }
    }
  }

  return { ok: true, deleted, type };
}

function findSectionHeader(content, section, config) {
  const lines = content.split('\n');
  let inSection = false;
  let sectionLines = 0;

  // Plan type: no regex-based detection — use marker-based
  if (!config || !config.headerRegex) {
    const stepRegex = /^###?\s+(Step\s+)?(\d+)[:.]/;
    for (const line of lines) {
      const match = line.match(stepRegex);
      if (match) {
        const num = parseInt(match[2], 10);
        if (num === section) { inSection = true; sectionLines = 0; continue; }
        else if (inSection) { break; }
      }
      if (inSection) sectionLines++;
    }
    return { found: inSection || sectionLines > 0, lines: sectionLines };
  }

  for (const line of lines) {
    const match = line.match(config.headerRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num === section) { inSection = true; sectionLines = 0; continue; }
      else if (inSection) { break; }
    }
    if (inSection) sectionLines++;
  }

  return { found: inSection || sectionLines > 0, lines: sectionLines };
}

// ═══════════════════════════════════════════════════════
// Skill Enforcement Functions
// ═══════════════════════════════════════════════════════

async function skillGate({ skill, command, result, data }) {
  if (!skill) return { ok: false, error: 'Required: --skill <name>' };
  if (!command) return { ok: false, error: 'Required: --command <plan|basic|srs>' };

  const artifactPath = path.join(CHECKPOINT_DIR, `skill-${skill}.json`);

  if (!fs.existsSync(CHECKPOINT_DIR)) {
    fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }

  const artifact = {
    skill,
    command,
    result: result || 'PASS',
    timestamp: new Date().toISOString(),
    data: data ? JSON.parse(data) : {},
  };

  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  return { ok: true, skill, artifactPath, result: artifact.result };
}

async function skillVerify({ skills, mode }) {
  if (!skills) return { ok: false, error: 'Required: --skills <name1,name2,...>' };

  const required = skills.split(',').map(s => s.trim());
  const results = [];
  const missing = [];
  const failed = [];

  for (const skill of required) {
    const artifactPath = path.join(CHECKPOINT_DIR, `skill-${skill}.json`);
    if (!fs.existsSync(artifactPath)) {
      missing.push(skill);
      continue;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
    if (artifact.result !== 'PASS') {
      failed.push({ skill, result: artifact.result, data: artifact.data });
    } else {
      results.push({ skill, result: 'PASS', timestamp: artifact.timestamp });
    }
  }

  const isStrict = (mode || 'strict') === 'strict';

  if (missing.length > 0) {
    return {
      ok: !isStrict,
      error: isStrict ? `Skills not invoked: ${missing.join(', ')}. Invoke required skills first.` : undefined,
      warning: !isStrict ? `Skills not invoked (non-blocking): ${missing.join(', ')}` : undefined,
      missing,
      failed,
      passed: results,
    };
  }

  if (failed.length > 0) {
    return {
      ok: !isStrict,
      error: isStrict ? `Skills failed: ${failed.map(f => f.skill).join(', ')}` : undefined,
      warning: !isStrict ? `Skills failed (non-blocking): ${failed.map(f => f.skill).join(', ')}` : undefined,
      failed,
      passed: results,
    };
  }

  return { ok: true, passed: results, total: results.length };
}

async function skillReset({ command }) {
  let deleted = 0;
  if (!fs.existsSync(CHECKPOINT_DIR)) return { ok: true, deleted: 0 };

  const files = fs.readdirSync(CHECKPOINT_DIR)
    .filter(f => f.startsWith('skill-') && f.endsWith('.json'));

  for (const file of files) {
    fs.unlinkSync(path.join(CHECKPOINT_DIR, file));
    deleted++;
  }

  return { ok: true, deleted, command };
}

// ops.js contract: handler({ action, args, pkgRoot })
// ops.js wraps result: { ok: true, action: "design-checkpoint", data: <return value> }
module.exports = async function(ctx) {
  const { args, pkgRoot } = ctx;

  // Resolve checkpoint dir to memory-bank context (or fallback to CWD/.checkpoints)
  CHECKPOINT_DIR = resolveCheckpointDir(pkgRoot);

  const opts = {
    action: args.action,
    section: parseInt(args.section, 10),
    type: args.type,
    file: args.file,
  };

  if (!opts.action) {
    return { ok: false, error: 'Required: --action [verify|complete|verify-all|reset|skill-gate|skill-verify|skill-reset]' };
  }

  // Skill actions don't require --type
  if (['skill-gate', 'skill-verify', 'skill-reset'].includes(opts.action)) {
    switch (opts.action) {
      case 'skill-gate':
        return skillGate({ skill: args.skill, command: args.command, result: args.result, data: args.data });
      case 'skill-verify':
        return skillVerify({ skills: args.skills, mode: args.mode });
      case 'skill-reset':
        return skillReset({ command: args.command });
    }
  }

  if (!opts.type) {
    return { ok: false, error: 'Required: --type [bdd|fdd|basic|srs|plan|execute|validate]' };
  }

  switch (opts.action) {
    case 'verify':
      if (isNaN(opts.section)) return { ok: false, error: 'Required: --section N' };
      return verify(opts);
    case 'complete':
      if (isNaN(opts.section)) return { ok: false, error: 'Required: --section N' };
      return complete(opts);
    case 'verify-all':
      return verifyAll(opts);
    case 'reset':
      return reset(opts);
    default:
      return { ok: false, error: `Unknown action: ${opts.action}` };
  }
};
