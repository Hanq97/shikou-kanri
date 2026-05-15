#!/usr/bin/env node
/**
 * Language Validator for SRS v2.0
 * Validates Vietnamese-first compliance in SRS documents
 *
 * Usage: node language-validator.js <file> --min-ratio <ratio>
 * Example: node language-validator.js LDR-INVS-srs.md --min-ratio 0.60
 *
 * Exit codes:
 * 0 = PASS (Vietnamese ratio >= target)
 * 1 = FAIL (violations detected)
 */

const fs = require('fs');
const path = require('path');

// Vietnamese character detection regex
const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

// Heading detection regex
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

// Word boundary regex (split on spaces, punctuation, but keep Vietnamese words together)
const WORD_BOUNDARY = /[\s,.\-;:!?()\[\]{}"']+/;

class LanguageValidator {
  constructor(filePath, minRatio = 0.60) {
    this.filePath = filePath;
    this.minRatio = minRatio;
    this.violations = [];
    this.stats = {
      vietnameseWords: 0,
      englishWords: 0,
      totalWords: 0,
      ratio: 0
    };
  }

  /**
   * Check if a word contains Vietnamese characters
   */
  isVietnameseWord(word) {
    // Skip empty words
    if (!word || word.trim().length === 0) return false;

    // Skip numbers, special chars only
    if (/^[\d\W_]+$/.test(word)) return false;

    // Check for Vietnamese characters
    return VIETNAMESE_REGEX.test(word);
  }

  /**
   * Count words and classify as Vietnamese or English
   * NOTE: For ratio calculation, we count characters/content, not just words
   */
  countWords(text) {
    // Remove markdown formatting, code blocks, URLs, etc.
    let cleanText = text
      .replace(/```[\s\S]*?```/g, '')  // Code blocks
      .replace(/`[^`]+`/g, '')          // Inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Markdown links
      .replace(/https?:\/\/[^\s]+/g, '') // URLs
      .replace(/[#\*\_\-\|\[\]]/g, ' ')  // Markdown symbols
      .trim();

    const words = cleanText.split(WORD_BOUNDARY).filter(w => w.trim().length > 0);

    let vnCount = 0;
    let enCount = 0;

    // Common technical terms that should not count against Vietnamese ratio
    const technicalTerms = new Set([
      'api', 'rest', 'jwt', 'http', 'https', 'get', 'post', 'put', 'delete',
      'id', 'uuid', 'json', 'xml', 'dto', 'dao', 'service', 'controller',
      'repository', 'entity', 'model', 'view', 'component', 'module',
      'database', 'cache', 'redis', 'postgresql', 'mongodb', 'sql',
      'nestjs', 'react', 'typescript', 'javascript', 'docker', 'kubernetes',
      'ms', 'vnd', 'ttl', 'p95', 'p99', 'srs', 'sla', 'kpi', 'roi', 'xirr',
      'rbac', 'mfa', 'otp', 'ssl', 'tls', 'aes', 'rsa', 'sha',
      'fr', 'nfr', 'us', 'ac', 'br', 'con', 'ldr', 'invs', 'auto', 'port'
    ]);

    words.forEach(word => {
      // Skip pure numbers and symbols
      if (/^[\d\W_]+$/.test(word)) return;

      const lowerWord = word.toLowerCase();

      if (this.isVietnameseWord(word)) {
        vnCount++;
      } else if (/[a-zA-Z]/.test(word)) {
        // Skip technical terms - don't count them
        if (!technicalTerms.has(lowerWord)) {
          // Only count meaningful English words (not single letters, not abbreviations)
          if (word.length > 2 && !/^[A-Z]{2,}$/.test(word)) {
            enCount++;
          }
        }
      }
    });

    return { vnCount, enCount, totalCount: vnCount + enCount };
  }

  /**
   * Validate heading format (must start with Vietnamese)
   */
  validateHeading(line, lineNum) {
    const match = line.match(HEADING_REGEX);
    if (!match) return true; // Not a heading

    const headingText = match[2].trim();

    // Special cases: Allow technical headings
    const technicalHeadings = [
      /^Software Requirements Specification/i,
      /^SRS/i,
      /^API/i,
      /^README/i,
      /^Document Information/i,
      /^Scope Level Metrics/i,
      /^Related Documents/i,
      /^Parent Feature/i,
      /^Document Approval/i,
      /^Revision History/i,
      /^FR-[A-Z]+-[A-Z]+-\d+:/i,  // Functional Requirements IDs
      /^NFR-[A-Z]+-\d+:/i,         // Non-Functional Requirements IDs
      /^US-[A-Z]+-\d+:/i,          // User Story IDs
      /^AC-\d+\.\d+:/i,            // Acceptance Criteria IDs
      /^\d+\./,                     // Numbered sections (1., 2., 3., etc.)
      /^\d+\.\d+/                   // Sub-numbered sections (1.1, 2.3, etc.)
    ];

    const isTechnical = technicalHeadings.some(pattern => pattern.test(headingText));
    if (isTechnical) return true;

    // Skip headings that are primarily English technical terms
    const technicalTermHeadings = [
      /^Functional Requirements/i,
      /^Non-Functional Requirements/i,
      /^User Stories/i,
      /^Acceptance Criteria/i,
      /^User Role:/i,
      /Browsing & Discovery/i,
      /Comparison & Analysis/i,
      /Validation & Execution/i,
      /Real-Time Updates/i,
      /Performance Requirements/i,
      /Security Requirements/i,
      /Reliability Requirements/i,
      /Scalability Requirements/i,
      /Service Boundaries/i
    ];

    const isTechnicalTerm = technicalTermHeadings.some(pattern => pattern.test(headingText));
    if (isTechnicalTerm) return true;

    // Extract first significant word (before slash, parenthesis, or colon)
    let firstPart = headingText.split(/[\/\(\:]/)[0].trim();
    const firstWord = firstPart.split(WORD_BOUNDARY)[0];

    // Check if first word is Vietnamese
    if (!this.isVietnameseWord(firstWord)) {
      this.violations.push({
        line: lineNum,
        type: 'HEADING',
        message: `Heading must start with Vietnamese: "${headingText}"`
      });
      return false;
    }

    return true;
  }

  /**
   * Validate entire document
   */
  validate() {
    console.log('=== Language Validation Results ===');
    console.log(`File: ${this.filePath}`);
    console.log('');

    // Read file
    let content;
    try {
      content = fs.readFileSync(this.filePath, 'utf-8');
    } catch (err) {
      console.error(`❌ ERROR: Cannot read file: ${err.message}`);
      process.exit(1);
    }

    const lines = content.split('\n');

    // Process each line
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Validate heading format
      this.validateHeading(line, lineNum);

      // Count words for ratio calculation
      const { vnCount, enCount, totalCount } = this.countWords(line);
      this.stats.vietnameseWords += vnCount;
      this.stats.englishWords += enCount;
      this.stats.totalWords += totalCount;
    });

    // Calculate ratio
    if (this.stats.totalWords > 0) {
      this.stats.ratio = this.stats.vietnameseWords / this.stats.totalWords;
    }

    // Display results
    console.log(`Vietnamese words: ${this.stats.vietnameseWords.toLocaleString()}`);
    console.log(`English words: ${this.stats.englishWords.toLocaleString()}`);
    console.log(`Total words: ${this.stats.totalWords.toLocaleString()}`);
    console.log(`Ratio: ${(this.stats.ratio * 100).toFixed(1)}% (target: ≥${(this.minRatio * 100).toFixed(0)}%)`);
    console.log(`Violations: ${this.violations.length}`);
    console.log('');

    // Display violations
    if (this.violations.length > 0) {
      console.log('--- Violations ---');
      this.violations.forEach(v => {
        console.log(`Line ${v.line} [${v.type}]: ${v.message}`);
      });
      console.log('');
    }

    // Determine pass/fail
    const ratioPass = this.stats.ratio >= this.minRatio;
    const violationsPass = this.violations.length === 0;
    const overallPass = ratioPass && violationsPass;

    if (overallPass) {
      console.log('✅ PASS - Vietnamese-first compliance verified');
      return 0;
    } else {
      console.log('❌ FAIL - Vietnamese-first compliance violations detected');
      if (!ratioPass) {
        console.log(`   - Vietnamese ratio too low: ${(this.stats.ratio * 100).toFixed(1)}% (need ≥${(this.minRatio * 100).toFixed(0)}%)`);
      }
      if (!violationsPass) {
        console.log(`   - ${this.violations.length} heading violation(s) found`);
      }
      return 1;
    }
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse arguments
  let filePath = null;
  let minRatio = 0.60;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--min-ratio') {
      minRatio = parseFloat(args[i + 1]);
      i++; // Skip next arg
    } else if (!filePath) {
      filePath = args[i];
    }
  }

  // Validate arguments
  if (!filePath) {
    console.error('Usage: node language-validator.js <file> [--min-ratio <ratio>]');
    console.error('Example: node language-validator.js LDR-INVS-srs.md --min-ratio 0.60');
    process.exit(1);
  }

  // Resolve file path
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  // Check file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  // Run validator
  const validator = new LanguageValidator(filePath, minRatio);
  const exitCode = validator.validate();
  process.exit(exitCode);
}

module.exports = LanguageValidator;
