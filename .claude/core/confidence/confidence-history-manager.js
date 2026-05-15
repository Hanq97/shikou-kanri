#!/usr/bin/env node

/**
 * Confidence History Manager
 *
 * Manages persistence and querying of confidence calculation history.
 * Stores results in branch-specific JSON files for historical analysis.
 *
 * Features:
 * - Store complete confidence calculation results (7 factors)
 * - Track execution outcomes (success/failed/pending)
 * - Enable similarity matching (category + keywords + complexity)
 * - Aggregated statistics (by command, category, complexity)
 * - Trend analysis (last 7 days)
 * - Auto-recommendations for low confidence
 *
 * File Location: `.claude/memory-bank/[branch]/confidence-history.json`
 * Schema Version: 2.0 (enhanced for 7-factor confidence)
 *
 * @version 2.0.0
 * @author EPS Framework Team
 * @date 2025-12-22
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class ConfidenceHistoryManager {
  constructor(config = {}) {
    this.config = {
      maxEntries: 1000,           // Rotate after 1000 entries
      backupEnabled: true,        // Daily backup
      autoArchive: true,          // Archive old entries
      schemaVersion: '2.0',       // Schema version
      ...config
    };

    // Get current branch
    this.branch = this.getCurrentBranch();

    // Set history file path
    this.historyPath = path.join(
      process.cwd(),
      '.claude',
      'memory-bank',
      this.branch,
      'confidence-history.json'
    );
  }

  /**
   * Get current git branch
   * @returns {string} - Branch name
   */
  getCurrentBranch() {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
        cwd: process.cwd()
      }).trim();
      return branch || 'dev';
    } catch (error) {
      console.warn('Could not determine git branch, using "dev"');
      return 'dev';
    }
  }

  /**
   * Load history from file
   * @returns {object} - History object with entries and statistics
   */
  async loadHistory() {
    try {
      // Check if file exists
      await fs.access(this.historyPath);

      // Read and parse
      const content = await fs.readFile(this.historyPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist, return empty history
      return this.createEmptyHistory();
    }
  }

  /**
   * Create empty history structure
   * @returns {object} - Empty history
   */
  createEmptyHistory() {
    return {
      schema_version: this.config.schemaVersion,
      branch: this.branch,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      history: [],
      statistics: {
        total_entries: 0,
        avg_confidence: 0,
        success_rate: 0,
        last_updated: new Date().toISOString(),
        by_command: {},
        by_category: {},
        by_complexity: {},
        trends: {},
        factor_averages: {}
      },
      metadata: {
        version: this.config.schemaVersion,
        total_size: '0KB',
        entry_count: 0,
        oldest_entry: null,
        newest_entry: null,
        last_archive: null,
        next_archive: null,
        backup_enabled: this.config.backupEnabled,
        last_backup: null
      }
    };
  }

  /**
   * Save history to file
   * @param {object} history - History object
   */
  async saveHistory(history) {
    // Ensure directory exists
    const dir = path.dirname(this.historyPath);
    await fs.mkdir(dir, { recursive: true });

    // Update metadata
    history.updated_at = new Date().toISOString();
    history.metadata.entry_count = history.history.length;

    // Write to file
    await fs.writeFile(
      this.historyPath,
      JSON.stringify(history, null, 2),
      'utf8'
    );
  }

  /**
   * Record new confidence calculation
   * @param {object} entry - Confidence entry
   * @returns {string} - Entry ID
   */
  async record(entry) {
    // Load current history
    const history = await this.loadHistory();

    // Generate unique ID if not provided
    if (!entry.id) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 6);
      entry.id = `conf-${timestamp}-${random}`;
    }

    // Add timestamp if not provided
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }

    // Validate entry
    this.validateEntry(entry);

    // Append to history
    history.history.push(entry);

    // Update statistics
    history.statistics = this.calculateStatistics(history.history);

    // Update metadata
    history.metadata.newest_entry = entry.timestamp;
    if (!history.metadata.oldest_entry) {
      history.metadata.oldest_entry = entry.timestamp;
    }

    // Check if rotation needed
    if (history.history.length > this.config.maxEntries && this.config.autoArchive) {
      await this.rotateHistory(history);
    }

    // Save to file
    await this.saveHistory(history);

    return entry.id;
  }

  /**
   * Update entry outcome after execution
   * @param {string} entryId - Entry ID
   * @param {object} outcome - Execution outcome
   */
  async updateOutcome(entryId, outcome) {
    const history = await this.loadHistory();

    // Find entry by ID
    const entry = history.history.find(e => e.id === entryId);
    if (!entry) {
      throw new Error(`Entry ${entryId} not found`);
    }

    // Update outcome fields
    entry.outcome = {
      ...entry.outcome,
      ...outcome,
      completed_at: new Date().toISOString()
    };

    // Recalculate statistics
    history.statistics = this.calculateStatistics(history.history);

    // Save to file
    await this.saveHistory(history);
  }

  /**
   * Find similar historical entries
   * @param {object} query - Search criteria
   * @returns {Array} - Matching entries
   */
  async getSimilar(query) {
    const history = await this.loadHistory();

    const scored = history.history.map(entry => {
      let similarity = 0;

      // Category match (40 points)
      if (entry.category === query.category) similarity += 40;

      // Keyword overlap (40 points) - Jaccard index
      const queryKeywords = new Set((query.keywords || []).map(k => k.toLowerCase()));
      const entryKeywords = new Set((entry.keywords || []).map(k => k.toLowerCase()));

      if (queryKeywords.size > 0 && entryKeywords.size > 0) {
        const intersection = new Set([...queryKeywords].filter(k => entryKeywords.has(k)));
        const union = new Set([...queryKeywords, ...entryKeywords]);
        const jaccardIndex = intersection.size / union.size;
        similarity += jaccardIndex * 40;
      }

      // Complexity match (20 points)
      if (entry.complexity === query.complexity) similarity += 20;

      return { entry, similarity };
    });

    // Return top N with ≥50% similarity, sorted by similarity
    return scored
      .filter(s => s.similarity >= 50)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, query.limit || 10)
      .map(s => s.entry);
  }

  /**
   * Get statistics summary
   * @returns {object} - Statistics
   */
  async getStatistics() {
    const history = await this.loadHistory();
    return history.statistics;
  }

  /**
   * Calculate aggregated statistics from history entries
   * @param {Array} entries - History entries
   * @returns {object} - Statistics object
   */
  calculateStatistics(entries) {
    const stats = {
      total_entries: entries.length,
      avg_confidence: 0,
      success_rate: 0,
      last_updated: new Date().toISOString(),
      by_command: {},
      by_category: {},
      by_complexity: {},
      trends: {},
      factor_averages: {}
    };

    if (entries.length === 0) return stats;

    // Overall averages
    const completedEntries = entries.filter(e =>
      e.outcome?.status && e.outcome.status !== 'pending'
    );

    stats.avg_confidence = this.average(
      entries.map(e => e.confidence?.overall || e.confidence || 0)
    );

    stats.success_rate = completedEntries.length > 0
      ? (completedEntries.filter(e => e.outcome.status === 'success').length / completedEntries.length) * 100
      : 0;

    // By command
    const commands = [...new Set(entries.map(e => e.command))];
    for (const cmd of commands) {
      const cmdEntries = entries.filter(e => e.command === cmd);
      const cmdCompleted = cmdEntries.filter(e => e.outcome?.status !== 'pending');

      stats.by_command[cmd] = {
        count: cmdEntries.length,
        avg_confidence: this.average(cmdEntries.map(e => e.confidence?.overall || 0)),
        success_rate: cmdCompleted.length > 0
          ? (cmdCompleted.filter(e => e.outcome.status === 'success').length / cmdCompleted.length) * 100
          : 0,
        avg_execution_time: this.average(
          cmdCompleted.map(e => e.outcome?.execution_time).filter(Boolean)
        )
      };
    }

    // By category
    const categories = [...new Set(entries.map(e => e.category))];
    for (const cat of categories) {
      const catEntries = entries.filter(e => e.category === cat);
      const catCompleted = catEntries.filter(e => e.outcome?.status !== 'pending');

      // Top patterns
      const allPatterns = catEntries.flatMap(e => e.metadata?.patterns_used || []);
      const patternCounts = {};
      allPatterns.forEach(p => patternCounts[p] = (patternCounts[p] || 0) + 1);
      const topPatterns = Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(p => p[0]);

      stats.by_category[cat] = {
        count: catEntries.length,
        avg_confidence: this.average(catEntries.map(e => e.confidence?.overall || 0)),
        success_rate: catCompleted.length > 0
          ? (catCompleted.filter(e => e.outcome.status === 'success').length / catCompleted.length) * 100
          : 0,
        top_patterns: topPatterns
      };
    }

    // By complexity
    const complexities = ['low', 'medium', 'high'];
    for (const comp of complexities) {
      const compEntries = entries.filter(e => e.complexity === comp);
      const compCompleted = compEntries.filter(e => e.outcome?.status !== 'pending');

      stats.by_complexity[comp] = {
        count: compEntries.length,
        avg_confidence: compEntries.length > 0
          ? this.average(compEntries.map(e => e.confidence?.overall || 0))
          : null,
        success_rate: compCompleted.length > 0
          ? (compCompleted.filter(e => e.outcome.status === 'success').length / compCompleted.length) * 100
          : null
      };
    }

    // Trends (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEntries = entries.filter(e =>
      new Date(e.timestamp) >= sevenDaysAgo
    );
    const dateGroups = this.groupBy(recentEntries, e => e.timestamp.split('T')[0]);

    for (const [date, dateEntries] of Object.entries(dateGroups)) {
      stats.trends[date] = {
        avg: this.average(dateEntries.map(e => e.confidence?.overall || 0)),
        count: dateEntries.length
      };
    }

    // Factor averages
    const factorNames = [
      'evidence', 'consistency', 'complexity', 'expert_confidence',
      'context_depth', 'pattern_match', 'historical_data'
    ];
    for (const factor of factorNames) {
      const values = entries
        .map(e => e.confidence?.factors?.[factor])
        .filter(v => v !== undefined && v !== null);
      stats.factor_averages[factor] = values.length > 0
        ? this.average(values)
        : null;
    }

    return stats;
  }

  /**
   * Validate entry against schema
   * @param {object} entry - Entry to validate
   * @throws {Error} - If validation fails
   */
  validateEntry(entry) {
    // Required fields
    if (!entry.command) throw new Error('Entry must have command field');
    if (!entry.category) throw new Error('Entry must have category field');
    if (!entry.confidence) throw new Error('Entry must have confidence field');

    // Confidence structure
    if (typeof entry.confidence.overall !== 'number') {
      throw new Error('Confidence.overall must be a number');
    }
    if (entry.confidence.overall < 0 || entry.confidence.overall > 100) {
      throw new Error('Confidence.overall must be between 0-100');
    }
    if (!entry.confidence.factors || typeof entry.confidence.factors !== 'object') {
      throw new Error('Confidence.factors must be an object');
    }
  }

  /**
   * Rotate history when it exceeds max entries
   * @param {object} history - Current history
   */
  async rotateHistory(history) {
    const archivePath = path.join(
      path.dirname(this.historyPath),
      `confidence-history-archive-${Date.now()}.json`
    );

    // Save current history as archive
    await fs.writeFile(
      archivePath,
      JSON.stringify(history, null, 2),
      'utf8'
    );

    // Keep only recent entries
    const keepCount = Math.floor(this.config.maxEntries * 0.5);
    history.history = history.history.slice(-keepCount);
    history.metadata.last_archive = new Date().toISOString();

    console.log(`Archived ${history.history.length} old entries to ${archivePath}`);
  }

  /**
   * Calculate average of array
   * @param {Array} arr - Numbers array
   * @returns {number} - Average
   */
  average(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Math.round((sum / arr.length) * 10) / 10;
  }

  /**
   * Group array by key function
   * @param {Array} arr - Array to group
   * @param {Function} keyFn - Key function
   * @returns {object} - Grouped object
   */
  groupBy(arr, keyFn) {
    return arr.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new ConfidenceHistoryManager();

  (async () => {
    if (command === 'stats') {
      const stats = await manager.getStatistics();
      console.log('\n=== Confidence History Statistics ===');
      console.log(JSON.stringify(stats, null, 2));

    } else if (command === 'similar') {
      const category = args[1] || 'backend';
      const keywords = args.slice(2);

      const similar = await manager.getSimilar({
        category,
        keywords,
        complexity: 'medium',
        limit: 5
      });

      console.log(`\n=== Similar Features (${category}) ===`);
      console.log(JSON.stringify(similar, null, 2));

    } else if (command === 'test') {
      // Test recording
      const entryId = await manager.record({
        command: '/plan',
        feature: 'TEST-001',
        sub_feature: 'test_feature',
        category: 'backend',
        complexity: 'medium',
        keywords: ['authentication', 'JWT'],
        confidence: {
          overall: 95.5,
          passed: true,
          threshold: 90,
          risk: 'LOW',
          factors: {
            evidence: 100,
            consistency: 100,
            complexity: 95,
            expert_confidence: 87,
            context_depth: 90,
            pattern_match: 85,
            historical_data: 80
          },
          weights: {
            evidence: 15,
            consistency: 15,
            complexity: 15,
            expert_confidence: 30,
            context_depth: 10,
            pattern_match: 10,
            historical_data: 5
          },
          contributions: {
            evidence: 15.0,
            consistency: 15.0,
            complexity: 14.25,
            expert_confidence: 26.1,
            context_depth: 9.0,
            pattern_match: 8.5,
            historical_data: 4.0
          }
        },
        outcome: {
          status: 'pending',
          execution_time: null,
          tokens_used: null,
          quality_score: null,
          completed_at: null,
          error: null
        },
        metadata: {
          agent_hits: 35,
          kb_hits: 3,
          mcp_hits: 3,
          patterns_used: ['Constructor Injection', '@RequiredArgsConstructor'],
          evidence_sources: ['official-spring-boot-docs'],
          retries: 0,
          checkpoint: null,
          step_count: 8,
          validator: null
        },
        recommendations: []
      });

      console.log(`\n✅ Test entry recorded: ${entryId}`);

      // Update outcome
      await manager.updateOutcome(entryId, {
        status: 'success',
        execution_time: 8500,
        tokens_used: 32500,
        quality_score: 98
      });

      console.log(`✅ Outcome updated`);

      // Show statistics
      const stats = await manager.getStatistics();
      console.log('\n=== Updated Statistics ===');
      console.log(JSON.stringify(stats, null, 2));

    } else {
      console.log('Confidence History Manager');
      console.log('\nUsage:');
      console.log('  node confidence-history-manager.js stats');
      console.log('  node confidence-history-manager.js similar <category> <keyword1> <keyword2>...');
      console.log('  node confidence-history-manager.js test');
      console.log('\nExamples:');
      console.log('  node confidence-history-manager.js stats');
      console.log('  node confidence-history-manager.js similar backend authentication JWT');
      console.log('  node confidence-history-manager.js test');
    }
  })();
}

module.exports = ConfidenceHistoryManager;
