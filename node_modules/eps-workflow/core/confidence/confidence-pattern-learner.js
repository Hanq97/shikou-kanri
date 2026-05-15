#!/usr/bin/env node

/**
 * Confidence Pattern Learner
 *
 * Extracts patterns from high-confidence successful plans and updates
 * Knowledge Base with learned patterns for continuous improvement.
 *
 * Features:
 * - Extract patterns from successful plans (confidence ≥95%, outcome=success)
 * - Group patterns by category (backend, frontend, database, integration)
 * - Find common patterns using keyword frequency analysis
 * - Update Knowledge Base with LEARNED patterns (80% confidence)
 * - Track pattern effectiveness over time
 *
 * Pattern Types:
 * - Approved patterns (100% confidence, manually reviewed)
 * - Learned patterns (80% confidence, extracted from history)
 *
 * @version 1.0.0
 * @author EPS Framework Team
 * @date 2025-12-22
 */

const ConfidenceHistoryManager = require('./confidence-history-manager.js');
const fs = require('fs').promises;
const path = require('path');

class ConfidencePatternLearner {
  constructor(config = {}) {
    this.config = {
      minConfidence: 95,          // Minimum confidence for pattern extraction
      minFrequency: 3,             // Minimum frequency to be considered a pattern
      learnedConfidence: 80,       // Confidence level for learned patterns
      approvedConfidence: 100,     // Confidence level for approved patterns
      maxPatternsPerCategory: 20,  // Max patterns to extract per category
      ...config
    };

    this.historyManager = new ConfidenceHistoryManager();
    this.knowledgeBasePath = path.join(
      process.cwd(),
      '.claude',
      'knowledge-base',
      'patterns.json'
    );
  }

  /**
   * Extract patterns from high-confidence successful plans
   * @param {object} options - Extraction options
   * @returns {object} - Patterns grouped by category
   */
  async extractPatterns(options = {}) {
    const { minConfidence = this.config.minConfidence } = options;

    // Load history
    const history = await this.historyManager.loadHistory();

    // Filter high-confidence successful plans
    const successful = history.history.filter(h => {
      const confidence = h.confidence?.overall || h.confidence || 0;
      const outcome = h.outcome?.status || h.outcome || 'pending';
      return confidence >= minConfidence && outcome === 'success';
    });

    console.log(`Found ${successful.length} high-confidence successful plans (≥${minConfidence}%)`);

    if (successful.length === 0) {
      return {};
    }

    // Group by category
    const byCategory = this.groupBy(successful, 'category');

    // Extract common patterns for each category
    const patterns = {};
    for (const [category, plans] of Object.entries(byCategory)) {
      console.log(`\nExtracting patterns for category: ${category} (${plans.length} plans)`);
      patterns[category] = this.findCommonPatterns(plans);
    }

    return patterns;
  }

  /**
   * Find common patterns from plans using keyword frequency analysis
   * @param {Array} plans - Array of plan entries
   * @returns {Array} - Array of pattern objects
   */
  findCommonPatterns(plans) {
    // Extract all text content from plans
    const allText = [];

    for (const plan of plans) {
      // Extract from steps
      if (plan.metadata?.patterns_used) {
        allText.push(...plan.metadata.patterns_used);
      }

      // Extract from confidence factors context
      if (plan.confidence?.factors) {
        const steps = plan.detailedSteps || [];
        for (const step of steps) {
          if (step.context?.do) {
            allText.push(...step.context.do);
          }
          if (step.context?.recommendation) {
            allText.push(step.context.recommendation);
          }
          if (step.description) {
            allText.push(step.description);
          }
        }
      }
    }

    // Count keyword frequencies
    const keywordCounts = {};
    const commonKeywords = [
      // Backend patterns
      'constructor injection', '@RequiredArgsConstructor', 'final fields',
      'repository pattern', 'service layer', 'dto pattern', 'transaction',
      'dependency injection', 'builder pattern', 'factory pattern',

      // Frontend patterns
      'server component', 'client component', 'use client', 'async/await',
      'typescript', 'props validation', 'useState', 'useEffect',
      'error boundary', 'suspense',

      // Database patterns
      'migration', 'foreign key', 'index', 'normalization',
      'constraint', 'cascade', 'unique constraint',

      // Integration patterns
      'api contract', 'rest api', 'dto validation', 'error handling',
      'circuit breaker', 'retry logic', 'kafka', 'redis',

      // General patterns
      'clean code', 'solid principles', 'separation of concerns',
      'single responsibility', 'interface segregation'
    ];

    // Count occurrences of each keyword
    for (const keyword of commonKeywords) {
      const count = allText.filter(text =>
        text.toLowerCase().includes(keyword.toLowerCase())
      ).length;

      if (count >= this.config.minFrequency) {
        keywordCounts[keyword] = count;
      }
    }

    // Convert to pattern objects sorted by frequency
    const patterns = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.maxPatternsPerCategory)
      .map(([keyword, frequency]) => ({
        pattern: keyword,
        frequency: frequency,
        confidence: this.config.learnedConfidence,
        type: 'LEARNED',
        extracted_at: new Date().toISOString(),
        sample_count: plans.length,
        effectiveness: this.calculateEffectiveness(keyword, plans)
      }));

    console.log(`  Found ${patterns.length} common patterns (min frequency: ${this.config.minFrequency})`);

    return patterns;
  }

  /**
   * Calculate effectiveness of a pattern based on success rate
   * @param {string} keyword - Pattern keyword
   * @param {Array} plans - Array of plans
   * @returns {number} - Effectiveness score (0-100)
   */
  calculateEffectiveness(keyword, plans) {
    const plansWithPattern = plans.filter(plan => {
      const patterns = plan.metadata?.patterns_used || [];
      const steps = plan.detailedSteps || [];
      const stepTexts = steps.map(s =>
        `${s.description || ''} ${s.context?.recommendation || ''}`.toLowerCase()
      );

      return patterns.some(p => p.toLowerCase().includes(keyword.toLowerCase())) ||
             stepTexts.some(text => text.includes(keyword.toLowerCase()));
    });

    if (plansWithPattern.length === 0) return 0;

    // Calculate average confidence of plans using this pattern
    const avgConfidence = plansWithPattern.reduce((sum, plan) =>
      sum + (plan.confidence?.overall || plan.confidence || 0), 0
    ) / plansWithPattern.length;

    // Success rate (all plans are already filtered as successful)
    const successRate = 100; // All plans in input are successful

    // Weighted score: 70% avg confidence + 30% success rate
    return Math.round(avgConfidence * 0.7 + successRate * 0.3);
  }

  /**
   * Update Knowledge Base with learned patterns
   * @param {object} patterns - Patterns grouped by category
   * @returns {object} - Update summary
   */
  async updateKnowledgeBase(patterns) {
    // Ensure knowledge base directory exists
    const kbDir = path.dirname(this.knowledgeBasePath);
    await fs.mkdir(kbDir, { recursive: true });

    // Load existing KB or create new
    let kb = {};
    try {
      const content = await fs.readFile(this.knowledgeBasePath, 'utf8');
      kb = JSON.parse(content);
    } catch (error) {
      // File doesn't exist, create new KB structure
      kb = {
        version: '1.0',
        last_updated: new Date().toISOString(),
        categories: {}
      };
    }

    const summary = {
      added: 0,
      updated: 0,
      skipped: 0,
      by_category: {}
    };

    // Update each category
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      if (!kb.categories[category]) {
        kb.categories[category] = {
          approved: [],
          learned: []
        };
      }

      summary.by_category[category] = {
        added: 0,
        updated: 0,
        skipped: 0
      };

      // Process each pattern
      for (const newPattern of categoryPatterns) {
        // Check if pattern already exists (in approved or learned)
        const existingApproved = kb.categories[category].approved.find(p =>
          p.pattern.toLowerCase() === newPattern.pattern.toLowerCase()
        );
        const existingLearned = kb.categories[category].learned.find(p =>
          p.pattern.toLowerCase() === newPattern.pattern.toLowerCase()
        );

        if (existingApproved) {
          // Skip - approved patterns take precedence
          summary.skipped++;
          summary.by_category[category].skipped++;
          console.log(`  Skipped "${newPattern.pattern}" (already approved)`);

        } else if (existingLearned) {
          // Update existing learned pattern with new data
          existingLearned.frequency = Math.max(
            existingLearned.frequency,
            newPattern.frequency
          );
          existingLearned.effectiveness = Math.round(
            (existingLearned.effectiveness + newPattern.effectiveness) / 2
          );
          existingLearned.sample_count += newPattern.sample_count;
          existingLearned.last_updated = new Date().toISOString();

          summary.updated++;
          summary.by_category[category].updated++;
          console.log(`  Updated "${newPattern.pattern}" (frequency: ${existingLearned.frequency})`);

        } else {
          // Add new learned pattern
          kb.categories[category].learned.push(newPattern);

          summary.added++;
          summary.by_category[category].added++;
          console.log(`  Added "${newPattern.pattern}" (frequency: ${newPattern.frequency})`);
        }
      }

      // Sort learned patterns by effectiveness
      kb.categories[category].learned.sort((a, b) =>
        b.effectiveness - a.effectiveness
      );
    }

    // Update metadata
    kb.last_updated = new Date().toISOString();
    kb.last_learning = {
      timestamp: new Date().toISOString(),
      summary: summary
    };

    // Save to file
    await fs.writeFile(
      this.knowledgeBasePath,
      JSON.stringify(kb, null, 2),
      'utf8'
    );

    console.log(`\n✅ Knowledge Base updated: ${this.knowledgeBasePath}`);
    console.log(`   Added: ${summary.added}, Updated: ${summary.updated}, Skipped: ${summary.skipped}`);

    return summary;
  }

  /**
   * Get learned patterns from Knowledge Base
   * @param {string} category - Category name
   * @returns {Array} - Learned patterns
   */
  async getLearnedPatterns(category) {
    try {
      const content = await fs.readFile(this.knowledgeBasePath, 'utf8');
      const kb = JSON.parse(content);
      return kb.categories?.[category]?.learned || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Group array by property
   * @param {Array} array - Array to group
   * @param {string} key - Property key
   * @returns {object} - Grouped object
   */
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key];
      if (!groups[value]) groups[value] = [];
      groups[value].push(item);
      return groups;
    }, {});
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const learner = new ConfidencePatternLearner();

  (async () => {
    try {
      if (command === 'extract') {
        console.log('\n=== Extracting Patterns from History ===\n');
        const patterns = await learner.extractPatterns();

        if (Object.keys(patterns).length === 0) {
          console.log('No patterns found. Need more high-confidence successful plans.');
          return;
        }

        console.log('\n=== Extracted Patterns ===\n');
        for (const [category, categoryPatterns] of Object.entries(patterns)) {
          console.log(`\n${category.toUpperCase()}:`);
          categoryPatterns.slice(0, 10).forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.pattern} (frequency: ${p.frequency}, effectiveness: ${p.effectiveness}%)`);
          });
        }

      } else if (command === 'update') {
        console.log('\n=== Updating Knowledge Base ===\n');
        const patterns = await learner.extractPatterns();

        if (Object.keys(patterns).length === 0) {
          console.log('No patterns to update.');
          return;
        }

        const summary = await learner.updateKnowledgeBase(patterns);

        console.log('\n=== Update Summary ===');
        console.log(JSON.stringify(summary, null, 2));

      } else if (command === 'show') {
        const category = args[1] || 'backend';
        console.log(`\n=== Learned Patterns (${category}) ===\n`);

        const patterns = await learner.getLearnedPatterns(category);
        if (patterns.length === 0) {
          console.log('No learned patterns found.');
          return;
        }

        patterns.forEach((p, i) => {
          console.log(`${i + 1}. ${p.pattern}`);
          console.log(`   Frequency: ${p.frequency}, Effectiveness: ${p.effectiveness}%`);
          console.log(`   Type: ${p.type}, Confidence: ${p.confidence}%`);
          console.log(`   Extracted: ${p.extracted_at}\n`);
        });

      } else {
        console.log('Confidence Pattern Learner');
        console.log('\nUsage:');
        console.log('  node confidence-pattern-learner.js extract');
        console.log('  node confidence-pattern-learner.js update');
        console.log('  node confidence-pattern-learner.js show <category>');
        console.log('\nExamples:');
        console.log('  node confidence-pattern-learner.js extract');
        console.log('  node confidence-pattern-learner.js update');
        console.log('  node confidence-pattern-learner.js show backend');
        console.log('\nDescription:');
        console.log('  extract - Extract patterns from high-confidence successful plans');
        console.log('  update  - Extract and update Knowledge Base with learned patterns');
        console.log('  show    - Display learned patterns for a category');
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

module.exports = ConfidencePatternLearner;
