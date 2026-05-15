#!/usr/bin/env node

/**
 * Compliance Measurement Script
 * Week 2 - Bilingual Documentation Quality Gates
 *
 * Measures Q1-Q4 compliance scores for any markdown document
 *
 * Usage: node measure-compliance.js <document-path>
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Q1: Evidence-Based Score
 * Checks for evidence references, source citations, proof statements
 */
function measureEvidence(content) {
  const evidencePatterns = [
    /証拠|evidence|proof|minh chứng|chứng cứ/gi,
    /参照|reference|tham chiếu|tham khảo/gi,
    /出典|source|nguồn/gi,
    /\[.*?\]\(.*?\)/g, // Markdown links
    /```[\s\S]*?```/g, // Code blocks as evidence
    /^\s*>\s+/gm, // Blockquotes
    /\b(図|Figure|Hình|表|Table|Bảng)\s+\d+/gi, // Figure/Table references
    /\b(例|Example|Ví dụ|実例)\s*[:：]/gi, // Examples
    /\b(データ|data|dữ liệu).*?(示す|shows|cho thấy)/gi // Data references
  ];

  let evidenceCount = 0;
  let totalSections = 0;

  // Count sections (headers)
  const sectionPattern = /^#{1,6}\s+.+$/gm;
  const sections = content.match(sectionPattern) || [];
  totalSections = Math.max(sections.length, 1);

  // Count evidence instances
  evidencePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      evidenceCount += matches.length;
    }
  });

  // Score based on evidence density
  // Good: 3+ evidence per section
  const evidenceDensity = evidenceCount / totalSections;
  let score = Math.min(100, (evidenceDensity / 3) * 100);

  // Penalty if no links or references found
  const hasLinks = /\[.*?\]\(.*?\)/.test(content);
  const hasReferences = /参照|reference|tham chiếu/gi.test(content);
  if (!hasLinks && !hasReferences) {
    score = Math.max(0, score - 20);
  }

  return {
    score: Math.round(score),
    evidenceCount,
    totalSections,
    evidenceDensity: evidenceDensity.toFixed(2),
    hasLinks,
    hasReferences
  };
}

/**
 * Q2: Consistency Score
 * Checks for ID uniqueness, no contradictions, consistent terminology
 */
function measureConsistency(content) {
  let score = 100;
  const issues = [];

  // Check 1: ID uniqueness
  const idPattern = /\b([A-Z]{3}\d{6})\b/g;
  const ids = content.match(idPattern) || [];
  const uniqueIds = new Set(ids);
  const duplicateIds = ids.length - uniqueIds.size;

  if (duplicateIds > 0) {
    score -= Math.min(30, duplicateIds * 10);
    issues.push(`Duplicate IDs found: ${duplicateIds}`);
  }

  // Check 2: Contradictory statements
  const contradictionPatterns = [
    { pattern: /(必要|required|cần thiết).*?(不要|not required|không cần)/gi, name: 'Required vs Not Required' },
    { pattern: /(有効|enabled|bật).*?(無効|disabled|tắt)/gi, name: 'Enabled vs Disabled' },
    { pattern: /(許可|allowed|cho phép).*?(禁止|forbidden|cấm)/gi, name: 'Allowed vs Forbidden' },
    { pattern: /(はい|yes|có).*?(いいえ|no|không)/gi, name: 'Yes vs No' }
  ];

  contradictionPatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      score -= 10;
      issues.push(`Possible contradiction: ${name}`);
    }
  });

  // Check 3: Inconsistent terminology
  const terminologyPairs = [
    { terms: ['ユーザー', 'ユーザ'], name: 'User (Japanese)' },
    { terms: ['データベース', 'DB'], name: 'Database' },
    { terms: ['người dùng', 'người sử dụng'], name: 'User (Vietnamese)' }
  ];

  terminologyPairs.forEach(({ terms, name }) => {
    const counts = terms.map(term => (content.match(new RegExp(term, 'gi')) || []).length);
    const hasMultiple = counts.filter(c => c > 0).length > 1;
    if (hasMultiple) {
      score -= 5;
      issues.push(`Inconsistent terminology: ${name}`);
    }
  });

  // Check 4: Broken internal links
  const internalLinks = content.match(/\[.*?\]\(#.*?\)/g) || [];
  const anchors = new Set();
  const headerPattern = /^#{1,6}\s+(.+)$/gm;
  let match;
  while ((match = headerPattern.exec(content)) !== null) {
    const anchor = match[1].toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    anchors.add(anchor);
  }

  let brokenLinks = 0;
  internalLinks.forEach(link => {
    const anchor = link.match(/\(#(.+?)\)/)?.[1];
    if (anchor && !anchors.has(anchor)) {
      brokenLinks++;
    }
  });

  if (brokenLinks > 0) {
    score -= Math.min(20, brokenLinks * 5);
    issues.push(`Broken internal links: ${brokenLinks}`);
  }

  return {
    score: Math.max(0, Math.round(score)),
    uniqueIds: uniqueIds.size,
    duplicateIds,
    issues: issues.length,
    issueList: issues
  };
}

/**
 * Q3: Language Ratio Score
 * Japanese + Vietnamese ≥60% combined
 */
function measureLanguageRatio(content) {
  // Remove code blocks, URLs, and special syntax
  let textContent = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\[[^\]]+\]\([^)]+\)/g, '') // Remove markdown links
    .replace(/[{}\[\]<>]/g, ''); // Remove brackets

  // Vietnamese characters (with tone marks)
  const vietnamesePattern = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]/g;

  // Japanese characters (Hiragana + Katakana + Kanji)
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;

  const vnMatches = textContent.match(vietnamesePattern) || [];
  const jpMatches = textContent.match(japanesePattern) || [];

  const vnChars = vnMatches.length;
  const jpChars = jpMatches.length;
  const bilingualChars = vnChars + jpChars;
  const totalChars = textContent.replace(/\s/g, '').length; // Non-whitespace chars

  const bilingualRatio = totalChars > 0 ? (bilingualChars / totalChars) * 100 : 0;

  // Score based on 60% threshold
  let score = 0;
  if (bilingualRatio >= 60) {
    score = 100;
  } else if (bilingualRatio >= 50) {
    score = 80;
  } else if (bilingualRatio >= 40) {
    score = 60;
  } else if (bilingualRatio >= 30) {
    score = 40;
  } else if (bilingualRatio >= 20) {
    score = 20;
  }

  return {
    score: Math.round(score),
    vnChars,
    jpChars,
    bilingualChars,
    totalChars,
    bilingualRatio: bilingualRatio.toFixed(2),
    passes: bilingualRatio >= 60
  };
}

/**
 * Q4: No Prohibited Content Score
 * No implementation code, SQL queries, sensitive data
 */
function measureProhibitedContent(content) {
  let score = 100;
  const violations = [];

  // Check 1: Implementation code patterns
  const implementationPatterns = [
    { pattern: /class\s+\w+\s*{[\s\S]*?}/g, name: 'Java/TypeScript class implementation', penalty: 15 },
    { pattern: /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/g, name: 'Function implementation', penalty: 15 },
    { pattern: /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*?}/g, name: 'Arrow function implementation', penalty: 15 },
    { pattern: /@Override[\s\S]*?{[\s\S]*?}/g, name: 'Java override implementation', penalty: 15 },
    { pattern: /public\s+\w+\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/g, name: 'Java method implementation', penalty: 15 }
  ];

  // Allow examples in code blocks but check for full implementations
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  codeBlocks.forEach(block => {
    const lines = block.split('\n');
    // If code block has more than 20 lines, it might be full implementation
    if (lines.length > 20) {
      implementationPatterns.forEach(({ pattern, name, penalty }) => {
        if (pattern.test(block)) {
          score -= penalty;
          violations.push(`${name} (${lines.length} lines)`);
        }
      });
    }
  });

  // Check 2: SQL queries (DDL/DML statements)
  const sqlPatterns = [
    { pattern: /CREATE\s+TABLE\s+\w+/gi, name: 'CREATE TABLE statement', penalty: 10 },
    { pattern: /ALTER\s+TABLE\s+\w+/gi, name: 'ALTER TABLE statement', penalty: 10 },
    { pattern: /DROP\s+TABLE\s+\w+/gi, name: 'DROP TABLE statement', penalty: 10 },
    { pattern: /INSERT\s+INTO\s+\w+/gi, name: 'INSERT statement', penalty: 10 },
    { pattern: /UPDATE\s+\w+\s+SET/gi, name: 'UPDATE statement', penalty: 10 },
    { pattern: /DELETE\s+FROM\s+\w+/gi, name: 'DELETE statement', penalty: 10 }
  ];

  sqlPatterns.forEach(({ pattern, name, penalty }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      score -= penalty;
      violations.push(`${name} (${matches.length} occurrences)`);
    }
  });

  // Check 3: Sensitive data patterns
  const sensitivePatterns = [
    { pattern: /password\s*[=:]\s*["'][\w@!#$%^&*]+["']/gi, name: 'Hardcoded password', penalty: 20 },
    { pattern: /api[_-]?key\s*[=:]\s*["'][\w-]+["']/gi, name: 'API key', penalty: 20 },
    { pattern: /secret\s*[=:]\s*["'][\w-]+["']/gi, name: 'Secret key', penalty: 20 },
    { pattern: /jdbc:postgresql:\/\/[\w.-]+:\d+/gi, name: 'Database connection string', penalty: 15 },
    { pattern: /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, name: 'JWT token', penalty: 20 }
  ];

  sensitivePatterns.forEach(({ pattern, name, penalty }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      score -= penalty;
      violations.push(`${name} (${matches.length} occurrences)`);
    }
  });

  // Check 4: Environment-specific values
  const envPatterns = [
    { pattern: /localhost:\d+/gi, name: 'Localhost reference', penalty: 5 },
    { pattern: /192\.168\.\d+\.\d+/gi, name: 'Private IP address', penalty: 5 },
    { pattern: /\/home\/\w+/gi, name: 'Absolute home path', penalty: 5 }
  ];

  envPatterns.forEach(({ pattern, name, penalty }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 2) { // Allow a few references
      score -= penalty;
      violations.push(`${name} (${matches.length} occurrences)`);
    }
  });

  return {
    score: Math.max(0, Math.round(score)),
    violations: violations.length,
    violationList: violations,
    passes: score >= 80
  };
}

/**
 * Generate compliance report
 */
function generateReport(documentPath, results) {
  const { q1, q2, q3, q4 } = results;
  const overall = Math.round((q1.score + q2.score + q3.score + q4.score) / 4);
  const status = overall >= 95 ? 'PASS' : 'FAIL';
  const statusColor = overall >= 95 ? colors.green : colors.red;

  const formatScore = (score) => {
    const icon = score >= 80 ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    const scoreColor = score >= 80 ? colors.green : colors.red;
    return `${scoreColor}${score.toString().padStart(3)}%${colors.reset} ${icon}`;
  };

  const report = `
${colors.bold}${colors.cyan}📊 Compliance Measurement Report${colors.reset}
${'='.repeat(50)}

${colors.bold}Document:${colors.reset} ${documentPath}
${colors.bold}Date:${colors.reset}     ${new Date().toISOString()}

${colors.bold}Quality Gates:${colors.reset}
${'─'.repeat(50)}
Q1 (Evidence-Based):     ${formatScore(q1.score)}
   Evidence count:       ${q1.evidenceCount}
   Total sections:       ${q1.totalSections}
   Evidence density:     ${q1.evidenceDensity} per section
   Has links:            ${q1.hasLinks ? colors.green + 'Yes' + colors.reset : colors.red + 'No' + colors.reset}
   Has references:       ${q1.hasReferences ? colors.green + 'Yes' + colors.reset : colors.red + 'No' + colors.reset}

Q2 (Consistency):        ${formatScore(q2.score)}
   Unique IDs:           ${q2.uniqueIds}
   Duplicate IDs:        ${q2.duplicateIds}
   Issues found:         ${q2.issues}${q2.issueList.length > 0 ? '\n   - ' + q2.issueList.join('\n   - ') : ''}

Q3 (Language Ratio):     ${formatScore(q3.score)}
   Japanese chars:       ${q3.jpChars.toLocaleString()}
   Vietnamese chars:     ${q3.vnChars.toLocaleString()}
   Bilingual chars:      ${q3.bilingualChars.toLocaleString()}
   Total chars:          ${q3.totalChars.toLocaleString()}
   Bilingual ratio:      ${q3.bilingualRatio}% ${q3.passes ? colors.green + '(≥60% ✓)' + colors.reset : colors.red + '(<60% ✗)' + colors.reset}

Q4 (No Prohibited):      ${formatScore(q4.score)}
   Violations found:     ${q4.violations}${q4.violationList.length > 0 ? '\n   - ' + q4.violationList.join('\n   - ') : ''}

${'='.repeat(50)}
${colors.bold}Overall Compliance:${colors.reset}      ${statusColor}${overall}%${colors.reset}
${colors.bold}Status:${colors.reset}                  ${statusColor}${colors.bold}${status}${colors.reset}
${'='.repeat(50)}
`;

  return { report, overall, status };
}

/**
 * Main execution
 */
function main() {
  // Check arguments
  if (process.argv.length < 3) {
    console.error(`${colors.red}Error: Document path required${colors.reset}`);
    console.log(`\n${colors.bold}Usage:${colors.reset} node measure-compliance.js <document-path>`);
    console.log(`\n${colors.bold}Example:${colors.reset}`);
    console.log(`  node measure-compliance.js .claude/memory-bank/dev/plans/feature-spec.md`);
    process.exit(1);
  }

  const documentPath = process.argv[2];

  // Check file exists
  if (!fs.existsSync(documentPath)) {
    console.error(`${colors.red}Error: File not found: ${documentPath}${colors.reset}`);
    process.exit(1);
  }

  // Read document
  let content;
  try {
    content = fs.readFileSync(documentPath, 'utf8');
  } catch (error) {
    console.error(`${colors.red}Error reading file: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  // Measure compliance
  console.log(`${colors.cyan}Analyzing document...${colors.reset}\n`);

  const results = {
    q1: measureEvidence(content),
    q2: measureConsistency(content),
    q3: measureLanguageRatio(content),
    q4: measureProhibitedContent(content)
  };

  // Generate and display report
  const { report, overall, status } = generateReport(documentPath, results);
  console.log(report);

  // Exit with appropriate code
  process.exit(overall >= 95 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  measureEvidence,
  measureConsistency,
  measureLanguageRatio,
  measureProhibitedContent,
  generateReport
};
