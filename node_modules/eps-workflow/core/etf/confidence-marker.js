'use strict';

/**
 * confidence-marker.js — Apply confidence level markers to DD sections.
 *
 * Layer: L6 ENGINE
 *
 * Levels:
 *   EXTRACTED ≥ 90% — directly extracted from code/docs
 *   INFERRED  55-89% — derived/inferred from patterns
 *   MISSING   < 55% — insufficient data
 */

const MARKERS = {
  EXTRACTED: { emoji: '✅', label: 'EXTRACTED', comment: 'confidence: EXTRACTED' },
  INFERRED:  { emoji: '🔶', label: 'INFERRED',  comment: 'confidence: INFERRED' },
  MISSING:   { emoji: '❌', label: 'MISSING',   comment: 'confidence: MISSING' },
};

/**
 * Prepend confidence marker to section content.
 *
 * @param {string} sectionContent - Markdown content
 * @param {string} level - 'EXTRACTED', 'INFERRED', or 'MISSING'
 * @returns {string} Content with marker prepended
 */
function markSection(sectionContent, level) {
  const marker = MARKERS[level] || MARKERS.MISSING;
  const htmlComment = '<!-- ' + marker.comment + ' -->';
  const visual = '> ' + marker.emoji + ' **' + marker.label + '**';
  return htmlComment + '\n' + visual + '\n\n' + (sectionContent || '');
}

/**
 * Categorize confidence percentage into level.
 *
 * @param {number} confidence - 0-100
 * @returns {string} 'EXTRACTED' | 'INFERRED' | 'MISSING'
 */
function categorize(confidence) {
  if (confidence >= 90) return 'EXTRACTED';
  if (confidence >= 55) return 'INFERRED';
  return 'MISSING';
}

/**
 * Generate summary from marked sections.
 *
 * @param {object[]} sections - Array of { id, title, confidence, level }
 * @returns {{ extracted: number, inferred: number, missing: number, overallConfidence: number }}
 */
function generateSummary(sections) {
  let extracted = 0;
  let inferred = 0;
  let missing = 0;
  let totalConfidence = 0;

  for (const section of (sections || [])) {
    const level = section.level || categorize(section.confidence || 0);
    if (level === 'EXTRACTED') extracted++;
    else if (level === 'INFERRED') inferred++;
    else missing++;
    totalConfidence += (section.confidence || 0);
  }

  const count = sections ? sections.length : 0;
  const overallConfidence = count > 0 ? Math.round(totalConfidence / count) : 0;

  return { extracted, inferred, missing, overallConfidence };
}

module.exports = { markSection, categorize, generateSummary };
