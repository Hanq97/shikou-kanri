#!/usr/bin/env node

/**
 * Quality Gates for Enhanced Workflow
 *
 * Usage:
 *   node quality-gates.js check D1
 *   node quality-gates.js check D2
 *   node quality-gates.js check D3
 *   node quality-gates.js check D4
 */

const fs = require('fs');
const path = require('path');
const { findActiveContext, loadContext } = require('../../core/state/state-manager');
const { getDocumentsPath } = require('../../core/state/project-config');

// ============================================
// DOCUMENT PATH RESOLUTION
// ============================================

/**
 * Find design documents directory for a given feature ID.
 *
 * Strategy:
 * 1. First check memory-bank contextPath/documents/ (working copy during design phase)
 * 2. If not found, use documentsPath from project-config.json
 *
 * @param {string} featureId - Feature ID (e.g., 'BNK-LDGR', 'AUT-LGIN')
 * @param {string} contextPath - Active context path in memory-bank
 * @returns {string|null} Path to documents directory, or null if not found
 */
function findDocumentsDir(featureId, contextPath) {
  // Strategy 1: Check memory-bank contextPath/documents/ (backward compat / working copy)
  if (contextPath) {
    const memoryBankDocs = path.join(contextPath, 'documents');
    if (fs.existsSync(memoryBankDocs)) {
      const files = fs.readdirSync(memoryBankDocs);
      const hasDocs = files.some(f =>
        f.includes(featureId) && (f.endsWith('-srs.md') || f.endsWith('-basic-design.md'))
      );
      if (hasDocs) {
        return memoryBankDocs;
      }
    }
  }

  // Strategy 2: Use documentsPath from project-config.json
  const featuresDir = getDocumentsPath();

  if (!fs.existsSync(featuresDir)) {
    return null;
  }

  return scanForFeatureDocs(featuresDir, featureId);
}

/**
 * Recursively scan directory for folder containing {featureId}-srs.md
 * Also supports sub-feature pattern: {featureId}-BASE-srs.md, {featureId}-*-srs.md
 */
function scanForFeatureDocs(dir, featureId) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Check if current dir contains the feature docs
  // Pattern 1: Exact match {featureId}-srs.md
  const hasExactMatch = entries.some(e =>
    e.isFile() && e.name === `${featureId}-srs.md`
  );
  if (hasExactMatch) {
    return dir;
  }

  // Pattern 2: Sub-feature pattern {featureId}-BASE-srs.md or {featureId}-*-srs.md
  const hasSubFeatureMatch = entries.some(e =>
    e.isFile() && (
      e.name === `${featureId}-BASE-srs.md` ||
      (e.name.startsWith(`${featureId}-`) && e.name.endsWith('-srs.md'))
    )
  );
  if (hasSubFeatureMatch) {
    return dir;
  }

  // Recurse into subdirectories
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const result = scanForFeatureDocs(path.join(dir, entry.name), featureId);
      if (result) return result;
    }
  }

  return null;
}

// ============================================
// EVIDENCE PARSING
// ============================================

function parseEvidence(evidencePath) {
  if (!fs.existsSync(evidencePath)) {
    return [];
  }

  const content = fs.readFileSync(evidencePath, 'utf-8');
  const pieces = [];

  // Match evidence sections: ### Evidence N: Title
  const evidenceRegex = /###\s+Evidence\s+\d+:\s+(.+)/g;
  let match;

  while ((match = evidenceRegex.exec(content)) !== null) {
    const title = match[1].trim();
    const startIndex = match.index;
    const nextSection = content.indexOf('###', startIndex + 1);
    const sectionContent = nextSection > 0
      ? content.slice(startIndex, nextSection)
      : content.slice(startIndex);

    // Extract quality score (handles both **Quality**: and Quality:)
    const qualityMatch = sectionContent.match(/\*\*Quality\*\*:\s*(\d+)%/) || sectionContent.match(/Quality:\s*(\d+)%/);
    const quality = qualityMatch ? parseInt(qualityMatch[1]) : 0;

    pieces.push({ title, quality });
  }

  return pieces;
}

// ============================================
// DOCUMENT APPROVAL CHECKING
// ============================================

function checkDocumentApproved(docPath) {
  if (!fs.existsSync(docPath)) {
    return false;
  }

  const content = fs.readFileSync(docPath, 'utf-8');

  // Check for approval markers in document header
  const approvalPatterns = [
    /Status:\s*APPROVED/i,
    /\*\*Status\*\*:\s*APPROVED/i,
    />\s*\*\*Status\*\*:\s*APPROVED/i
  ];

  return approvalPatterns.some(pattern => pattern.test(content));
}

function getDocumentInfo(docPath) {
  const exists = fs.existsSync(docPath);
  const approved = exists ? checkDocumentApproved(docPath) : false;

  return { exists, approved, path: docPath };
}

// ============================================
// QUALITY GATES
// ============================================

function checkGateD1(contextPath) {
  const evidencePath = path.join(contextPath, 'evidence.md');
  const pieces = parseEvidence(evidencePath);

  const evidenceCount = pieces.length;
  const avgQuality = evidenceCount > 0
    ? pieces.reduce((sum, p) => sum + p.quality, 0) / evidenceCount
    : 0;

  const passed = evidenceCount >= 3 && avgQuality >= 80;

  return {
    passed,
    gate: 'D1',
    evidenceCount,
    requiredCount: 3,
    avgQuality: Math.round(avgQuality * 10) / 10,
    requiredQuality: 80,
    pieces
  };
}

function checkGateD2(contextPath, featureId) {
  // Gate D2: SRS approved + BD evidence
  const docsDir = findDocumentsDir(featureId, contextPath);
  let srsInfo = { exists: false, approved: false, path: '' };

  if (docsDir) {
    const files = fs.readdirSync(docsDir);
    const srsFile = files.find(f => f === `${featureId}-srs.md`)
      || files.find(f => f.endsWith('-BASE-srs.md'))
      || files.find(f => f.endsWith('-srs.md'));
    if (srsFile) {
      srsInfo = getDocumentInfo(path.join(docsDir, srsFile));
    }
  }

  // Check evidence for Basic Design
  const gateD1 = checkGateD1(contextPath);

  const passed = srsInfo.approved && gateD1.passed;

  return {
    passed,
    gate: 'D2',
    srsApproved: srsInfo.approved,
    srsExists: srsInfo.exists,
    evidenceCheck: gateD1
  };
}

function checkGateD3(contextPath, featureId) {
  // Gate D3: BD approved + DD evidence
  const docsDir = findDocumentsDir(featureId, contextPath);
  let bdInfo = { exists: false, approved: false, path: '' };

  if (docsDir) {
    const files = fs.readdirSync(docsDir);
    const bdFile = files.find(f => f === `${featureId}-basic-design.md`)
      || files.find(f => f.endsWith('-BASE-basic-design.md'))
      || files.find(f => f.endsWith('-basic-design.md'));
    if (bdFile) {
      bdInfo = getDocumentInfo(path.join(docsDir, bdFile));
    }
  }

  // Check evidence for Detail Design
  const gateD1 = checkGateD1(contextPath);

  const passed = bdInfo.approved && gateD1.passed;

  return {
    passed,
    gate: 'D3',
    bdApproved: bdInfo.approved,
    bdExists: bdInfo.exists,
    evidenceCheck: gateD1
  };
}

function checkGateD4(contextPath, featureId) {
  // Gate D4: All 3 documents approved
  const docsDir = findDocumentsDir(featureId, contextPath);

  let srsInfo = { exists: false, approved: false, path: '' };
  let bdInfo = { exists: false, approved: false, path: '' };
  let ddInfo = { exists: false, approved: false, path: '' };

  if (docsDir) {
    const files = fs.readdirSync(docsDir);

    // Find SRS
    const srsFile = files.find(f => f === `${featureId}-srs.md`)
      || files.find(f => f.endsWith('-BASE-srs.md'))
      || files.find(f => f.endsWith('-srs.md'));
    if (srsFile) {
      srsInfo = getDocumentInfo(path.join(docsDir, srsFile));
    }

    // Find Basic Design
    const bdFile = files.find(f => f === `${featureId}-basic-design.md`)
      || files.find(f => f.endsWith('-BASE-basic-design.md'))
      || files.find(f => f.endsWith('-basic-design.md'));
    if (bdFile) {
      bdInfo = getDocumentInfo(path.join(docsDir, bdFile));
    }

    // Find Detail Design (any of: backend, frontend, api-contracts, or A+B+C pattern)
    const ddCandidates = [
      // Traditional pattern
      `${featureId}-backend-detail-design.md`,
      `${featureId}-frontend-detail-design.md`,
      `${featureId}-api-contracts.md`,
      // A+B+C FDD pattern (for features with ≥4 sub-features)
      `${featureId}-portal-fdd.md`,
      `${featureId}-aggregate-fdd.md`,
    ];
    for (const candidate of ddCandidates) {
      if (files.includes(candidate)) {
        ddInfo = getDocumentInfo(path.join(docsDir, candidate));
        break;
      }
    }
    // Fallback: any file ending with detail-design.md, portal-fdd.md, aggregate-fdd.md, or screens-fdd.md
    if (!ddInfo.exists) {
      const ddFile = files.find(f =>
        f.endsWith('-detail-design.md') ||
        f.endsWith('-portal-fdd.md') ||
        f.endsWith('-aggregate-fdd.md') ||
        f.endsWith('-screens-fdd.md')
      );
      if (ddFile) {
        ddInfo = getDocumentInfo(path.join(docsDir, ddFile));
      }
    }
  }

  const allExist = srsInfo.exists && bdInfo.exists && ddInfo.exists;
  const allApproved = srsInfo.approved && bdInfo.approved && ddInfo.approved;
  const passed = allExist && allApproved;

  return {
    passed,
    gate: 'D4',
    documents: {
      srs: { exists: srsInfo.exists, approved: srsInfo.approved, path: srsInfo.path },
      bd: { exists: bdInfo.exists, approved: bdInfo.approved, path: bdInfo.path },
      dd: { exists: ddInfo.exists, approved: ddInfo.approved, path: ddInfo.path }
    },
    docsDir
  };
}

// ============================================
// ERROR FORMATTING
// ============================================

function formatGateD1Error(result) {
  const { evidenceCount, requiredCount, avgQuality, requiredQuality, pieces } = result;

  const piecesTable = pieces.length > 0
    ? pieces.map((p, i) => `${i + 1}. ${p.title} (Quality: ${p.quality}%)`).join('\n')
    : 'No evidence collected yet';

  return `
❌ QUALITY GATE D1 FAILED

Evidence Requirements:
- Count: ${evidenceCount}/${requiredCount} pieces ${evidenceCount >= requiredCount ? '✅' : '❌'}
- Quality: ${avgQuality}%/${requiredQuality}% ${avgQuality >= requiredQuality ? '✅' : '❌'}

Current Evidence:
${piecesTable}

Action Required:
1. Run /research to gather more evidence
2. Ensure evidence quality ≥${requiredQuality}% (use official docs, OSS examples)
3. Re-run /innovate when evidence sufficient

Tip: Use official documentation and regulations for higher quality scores.
`;
}

function formatGateD2Error(result) {
  const { srsApproved, srsExists, evidenceCheck } = result;

  return `
❌ QUALITY GATE D2 FAILED

Prerequisites for Basic Design:
- SRS exists: ${srsExists ? 'YES ✅' : 'NO ❌'}
- SRS approved: ${srsApproved ? 'YES ✅' : 'NO ❌'}
- Evidence (BD): ${evidenceCheck.evidenceCount}/${evidenceCheck.requiredCount} pieces ${evidenceCheck.evidenceCount >= 3 ? '✅' : '❌'}
- Evidence quality: ${evidenceCheck.avgQuality}%/${evidenceCheck.requiredQuality}% ${evidenceCheck.avgQuality >= 80 ? '✅' : '❌'}

Action Required:
${!srsExists ? '1. Create SRS document using /design --srs\n' : ''}${!srsApproved ? '1. Review and approve SRS document (01-requirements.md)\n2. Update document status to APPROVED in header\n' : ''}${!evidenceCheck.passed ? '1. Run /research to gather architecture evidence\n2. Ensure evidence quality ≥80%\n' : ''}
Then re-run /design --basic
`;
}

function formatGateD3Error(result) {
  const { bdApproved, bdExists, evidenceCheck } = result;

  return `
❌ QUALITY GATE D3 FAILED

Prerequisites for Detail Design:
- Basic Design exists: ${bdExists ? 'YES ✅' : 'NO ❌'}
- Basic Design approved: ${bdApproved ? 'YES ✅' : 'NO ❌'}
- Evidence (DD): ${evidenceCheck.evidenceCount}/${evidenceCheck.requiredCount} pieces ${evidenceCheck.evidenceCount >= 3 ? '✅' : '❌'}
- Evidence quality: ${evidenceCheck.avgQuality}%/${evidenceCheck.requiredQuality}% ${evidenceCheck.avgQuality >= 80 ? '✅' : '❌'}

Action Required:
${!bdExists ? '1. Create Basic Design document using /design --basic\n' : ''}${!bdApproved ? '1. Review and approve Basic Design document (02-basic-design.md)\n2. Update document status to APPROVED in header\n' : ''}${!evidenceCheck.passed ? '1. Run /research to gather detail design evidence\n2. Focus on: API specifications, UI patterns, DB schema, Testing strategies\n3. Ensure evidence quality ≥80%\n' : ''}
Then re-run /design --detail
`;
}

function formatGateD4Error(result) {
  const { documents } = result;

  const getStatus = (doc) => {
    if (!doc.exists) return 'NOT_CREATED ❌';
    if (!doc.approved) return 'DRAFT (needs approval) ⚠️';
    return 'APPROVED ✅';
  };

  return `
❌ QUALITY GATE D4 FAILED

Implementation Plan requires 3 approved design documents:

| Document | Exists | Approved | Status |
|----------|--------|----------|--------|
| SRS (01-requirements.md) | ${documents.srs.exists ? '✅' : '❌'} | ${documents.srs.approved ? '✅' : '❌'} | ${getStatus(documents.srs)} |
| Basic Design (02-basic-design.md) | ${documents.bd.exists ? '✅' : '❌'} | ${documents.bd.approved ? '✅' : '❌'} | ${getStatus(documents.bd)} |
| Detail Design (03-*.md) | ${documents.dd.exists ? '✅' : '❌'} | ${documents.dd.approved ? '✅' : '❌'} | ${getStatus(documents.dd)} |

Action Required:
${!documents.srs.exists ? '1. Create SRS using /design --srs\n' : ''}${documents.srs.exists && !documents.srs.approved ? '1. Review and approve SRS: ' + documents.srs.path + '\n' : ''}${!documents.bd.exists ? '1. Create Basic Design using /design --basic\n' : ''}${documents.bd.exists && !documents.bd.approved ? '1. Review and approve Basic Design: ' + documents.bd.path + '\n' : ''}${!documents.dd.exists ? '1. Create Detail Design using /design --detail\n' : ''}${documents.dd.exists && !documents.dd.approved ? '1. Review and approve Detail Design: ' + documents.dd.path + '\n' : ''}
After all documents are approved, re-run /plan

Why This Matters:
- Implementation plan must be based on APPROVED designs, not assumptions
- Skipping design approval leads to poor code quality and rework
- Compliance requirements mandate design review before implementation
`;
}

function formatGateError(result) {
  switch (result.gate) {
    case 'D1':
      return formatGateD1Error(result);
    case 'D2':
      return formatGateD2Error(result);
    case 'D3':
      return formatGateD3Error(result);
    case 'D4':
      return formatGateD4Error(result);
    default:
      return `Quality Gate ${result.gate} failed: ${result.message || 'Unknown error'}`;
  }
}

// ============================================
// CLI INTERFACE
// ============================================

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command !== 'check') {
    console.error(`❌ Unknown command: ${command}

Usage:
  node quality-gates.js check <gate>

Gates:
  D1 - Evidence quality check (≥3 pieces, ≥80% quality)
  D2 - SRS approved + BD evidence
  D3 - BD approved + DD evidence
  D4 - All 3 documents approved
`);
    process.exit(1);
  }

  const gate = args[1];

  if (!['D1', 'D2', 'D3', 'D4'].includes(gate)) {
    console.error(`❌ Invalid gate: ${gate}. Valid gates: D1, D2, D3, D4`);
    process.exit(1);
  }

  try {
    const contextPath = findActiveContext();

    if (!contextPath) {
      console.error('❌ No active context found');
      process.exit(1);
    }

    // Extract feature ID from context
    const context = loadContext(contextPath);
    const featureId = context.featureName || '';

    if (!featureId || featureId === 'unknown') {
      console.error('❌ No feature ID found in active context');
      console.error('   Run: node state-manager.js init <feature-id> [developer]');
      process.exit(1);
    }

    let result;

    switch (gate) {
      case 'D1':
        result = checkGateD1(contextPath);
        break;
      case 'D2':
        result = checkGateD2(contextPath, featureId);
        break;
      case 'D3':
        result = checkGateD3(contextPath, featureId);
        break;
      case 'D4':
        result = checkGateD4(contextPath, featureId);
        break;
      default:
        throw new Error(`Unknown gate: ${gate}`);
    }

    if (!result.passed) {
      console.error(formatGateError(result));
      process.exit(1);
    }

    console.log(`✅ QUALITY GATE ${gate}: PASSED`);

    // Display gate-specific success information
    if (gate === 'D1') {
      console.log(`   - Evidence: ${result.evidenceCount}/${result.requiredCount} pieces`);
      console.log(`   - Quality: ${result.avgQuality}%/${result.requiredQuality}%`);
    } else if (gate === 'D2') {
      console.log(`   - SRS: Approved ✅`);
      console.log(`   - Evidence: ${result.evidenceCheck.evidenceCount}/${result.evidenceCheck.requiredCount} pieces`);
    } else if (gate === 'D3') {
      console.log(`   - Basic Design: Approved ✅`);
      console.log(`   - Evidence: ${result.evidenceCheck.evidenceCount}/${result.evidenceCheck.requiredCount} pieces`);
    } else if (gate === 'D4') {
      console.log(`   - SRS: Approved ✅`);
      console.log(`   - Basic Design: Approved ✅`);
      console.log(`   - Detail Design: Approved ✅`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkGateD1,
  checkGateD2,
  checkGateD3,
  checkGateD4,
  findDocumentsDir,
  formatGateD1Error,
  formatGateD2Error,
  formatGateD3Error,
  formatGateD4Error,
  formatGateError,
  checkDocumentApproved
};
