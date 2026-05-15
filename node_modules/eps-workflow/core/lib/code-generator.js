// core/lib/code-generator.js
// Smart code generator implementing the smart abbreviation algorithm

const { ABBREVIATION_DICT } = require('./abbreviation-dict');

class SmartCodeGenerator {
  constructor() {
    this.dictionary = ABBREVIATION_DICT;
  }

  /**
   * Generate 3-4 character sub-feature code
   * @param {string} subFeatureName - e.g., "account-management", "mfa"
   * @param {string} featureCode - e.g., "BNK"
   * @param {Object} existingCodes - Existing feature codes
   * @returns {string} 3-4 char code - e.g., "ACCT", "MFA"
   */
  generateSubFeatureCode(subFeatureName, featureCode, existingCodes) {
    // Normalize
    const normalized = subFeatureName
      .toLowerCase()
      .trim()
      .replace(/[^a-z-]/g, '');

    // Split by hyphen
    const words = normalized.split('-').filter(w => w.length > 0);

    // Generate base code
    let proposedCode;

    switch (words.length) {
      case 0:
        proposedCode = 'XXXX';
        break;
      case 1:
        proposedCode = this.generateSingleWord(words[0]);
        break;
      case 2:
        proposedCode = this.generateTwoWords(words[0], words[1]);
        break;
      default:
        proposedCode = this.generateMultipleWords(words);
    }

    // Resolve conflicts
    return this.resolveConflict(featureCode, proposedCode, existingCodes);
  }

  generateSingleWord(word) {
    // Priority 1: Dictionary lookup
    if (this.dictionary[word]) {
      return this.dictionary[word];
    }

    // Priority 2: 3-4 chars - keep as is (e.g., "mfa" → "MFA", "kyc" → "KYC")
    if (word.length >= 3 && word.length <= 4) {
      return word.toUpperCase();
    }

    // Priority 3: Less than 3 chars - pad to 3 with 'X'
    if (word.length < 3) {
      return word.toUpperCase().padEnd(3, 'X');
    }

    // Priority 4: More than 4 chars - Consonant-based truncation
    const consonants = word.replace(/[aeiou]/g, '');
    if (consonants.length >= 3) {
      const truncated = consonants.substring(0, 3) + word[word.length - 1];
      return truncated.toUpperCase().substring(0, 4);
    }

    // Fallback: First 4 chars
    return word.substring(0, 4).toUpperCase();
  }

  generateTwoWords(word1, word2) {
    const abbr1 = this.dictionary[word1];
    const abbr2 = this.dictionary[word2];

    // Case 1: Both in dictionary
    if (abbr1 && abbr2) {
      // Use full first word if important
      if (abbr1.length === 4 && this.isImportantWord(word1)) {
        return abbr1;
      }
      // Otherwise 2+2
      return abbr1.substring(0, 2) + abbr2.substring(0, 2);
    }

    // Case 2: First in dictionary
    if (abbr1) {
      const suffix = word2.substring(0, Math.max(1, 4 - abbr1.length)).toUpperCase();
      return (abbr1 + suffix).substring(0, 4);
    }

    // Case 3: Second in dictionary
    if (abbr2) {
      const prefix = word1.substring(0, 2).toUpperCase();
      return (prefix + abbr2).substring(0, 4);
    }

    // Case 4: Neither in dictionary - 2+2 pattern
    return word1.substring(0, 2).toUpperCase() +
           word2.substring(0, 2).toUpperCase();
  }

  generateMultipleWords(words) {
    let code = '';
    const usedIndices = [];

    // Priority 1: Important words from dictionary
    for (let i = 0; i < words.length && code.length < 4; i++) {
      if (this.dictionary[words[i]] && this.isImportantWord(words[i])) {
        code += this.dictionary[words[i]].substring(0, 2);
        usedIndices.push(i);
      }
    }

    // Priority 2: First letter of remaining words
    for (let i = 0; i < words.length && code.length < 4; i++) {
      if (!usedIndices.includes(i)) {
        code += words[i][0].toUpperCase();
      }
    }

    // Pad to minimum 3 chars, max 4 chars
    if (code.length < 3) {
      return code.padEnd(3, 'X');
    }
    return code.substring(0, 4);
  }

  isImportantWord(word) {
    const important = [
      'account', 'loan', 'payment', 'transaction',
      'authentication', 'authorization', 'risk',
      'compliance', 'document', 'user', 'admin'
    ];
    return important.includes(word.toLowerCase());
  }

  resolveConflict(featureCode, proposedCode, existingCodes) {
    // Check if no conflict
    if (!this.hasConflict(featureCode, proposedCode, existingCodes)) {
      return proposedCode;
    }

    // Try numeric suffix (2-9)
    for (let i = 2; i <= 9; i++) {
      const candidate = proposedCode.substring(0, 3) + i;
      if (!this.hasConflict(featureCode, candidate, existingCodes)) {
        return candidate;
      }
    }

    // Try alphabetic suffix (A-Z)
    for (let i = 0; i < 26; i++) {
      const candidate = proposedCode.substring(0, 3) +
                       String.fromCharCode(65 + i);
      if (!this.hasConflict(featureCode, candidate, existingCodes)) {
        return candidate;
      }
    }

    // Last resort: use hash
    const hash = this.generateHash(featureCode + proposedCode);
    return proposedCode.substring(0, 2) + hash.substring(0, 2);
  }

  hasConflict(featureCode, code, existingCodes) {
    return existingCodes[featureCode]?.[code] !== undefined;
  }

  generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase();
  }
}

module.exports = { SmartCodeGenerator };
