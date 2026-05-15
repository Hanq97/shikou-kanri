/**
 * FeedbackAggregator - Batch aggregator for feedback logs
 * @module core/feedback/aggregator
 *
 * Pattern: Batch Processing
 * Reference: Detail Design Section 3.3
 *
 * CLI Usage:
 *   node core/feedback/aggregator.js
 */

const fs = require('fs');
const path = require('path');
const StalenessChecker = require('./staleness-checker');

// Directory paths
const FEEDBACK_LOG_DIR = path.resolve(__dirname, '../../feedback-log');
const FEEDBACK_AGGREGATED_DIR = path.resolve(__dirname, '../../feedback-aggregated');
const HISTORY_DIR = path.join(FEEDBACK_AGGREGATED_DIR, 'aggregation-history');

// Output files
const EFFECTIVENESS_FILE = path.join(FEEDBACK_AGGREGATED_DIR, 'pattern-effectiveness.json');
const LAST_AGGREGATION_FILE = path.join(FEEDBACK_AGGREGATED_DIR, 'last-aggregation.json');

class FeedbackAggregator {
  /** @type {string} */
  _logDir;

  /** @type {string} */
  _outputDir;

  /** @type {string} */
  _historyDir;

  constructor() {
    this._logDir = FEEDBACK_LOG_DIR;
    this._outputDir = FEEDBACK_AGGREGATED_DIR;
    this._historyDir = HISTORY_DIR;

    // Ensure directories exist
    this._ensureDirectories();
  }

  /**
   * Ensure output directories exist
   * @private
   */
  _ensureDirectories() {
    if (!fs.existsSync(this._outputDir)) {
      fs.mkdirSync(this._outputDir, { recursive: true });
    }
    if (!fs.existsSync(this._historyDir)) {
      fs.mkdirSync(this._historyDir, { recursive: true });
    }
  }

  /**
   * Load all log files from feedback-log directory
   * @returns {Promise<Array<object>>}
   * @private
   */
  async _loadAllLogs() {
    const logs = [];

    if (!fs.existsSync(this._logDir)) {
      return logs;
    }

    // Get all user directories
    const userDirs = fs.readdirSync(this._logDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const userDir of userDirs) {
      const userPath = path.join(this._logDir, userDir);
      const files = fs.readdirSync(userPath)
        .filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(userPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const log = JSON.parse(content);
          log._sourcePath = filePath;
          logs.push(log);
        } catch (error) {
          console.warn(`[Aggregator] Failed to read ${filePath}: ${error.message}`);
          // Skip corrupted files
        }
      }
    }

    return logs;
  }

  /**
   * Filter to only completed logs
   * @param {Array<object>} logs - All logs
   * @returns {Array<object>} Completed logs only
   * @private
   */
  _filterCompletedLogs(logs) {
    return logs.filter(log => log.status === 'completed');
  }

  /**
   * Group all events by patternId
   * @param {Array<object>} logs - Completed logs
   * @returns {Map<string, Array<object>>} Events grouped by patternId
   * @private
   */
  _groupByPattern(logs) {
    const patternMap = new Map();

    for (const log of logs) {
      if (!Array.isArray(log.events)) continue;

      // Get all pattern:used events
      const patternEvents = log.events.filter(e => e.type === 'pattern:used');

      // Get validation result for this log
      const validationEvent = log.events.find(e => e.type === 'validation:complete');

      for (const event of patternEvents) {
        const patternId = event.data.patternId;
        if (!patternId) continue;

        if (!patternMap.has(patternId)) {
          patternMap.set(patternId, {
            usages: [],
            validations: [],
            name: event.data.patternName || patternId,
            category: event.data.category || 'general'
          });
        }

        const patternData = patternMap.get(patternId);
        patternData.usages.push({
          timestamp: event.timestamp,
          usedInFile: event.data.usedInFile,
          usedInStep: event.data.usedInStep,
          planConfidence: event.data.planConfidence,
          featureId: log.featureId,
          userId: log.userId
        });

        // Link validation if pattern was validated
        if (validationEvent && validationEvent.data.patternsValidated?.includes(patternId)) {
          patternData.validations.push({
            timestamp: validationEvent.timestamp,
            success: validationEvent.data.success,
            qualityScore: validationEvent.data.qualityScore,
            featureId: log.featureId
          });
        }
      }
    }

    return patternMap;
  }

  /**
   * Compute effectiveness metrics for a single pattern
   * @param {string} patternId - Pattern ID
   * @param {object} patternData - Grouped pattern data
   * @returns {object} Pattern metrics
   * @private
   */
  _computeEffectiveness(patternId, patternData) {
    const usageCount = patternData.usages.length;
    const validations = patternData.validations;

    const successCount = validations.filter(v => v.success).length;
    const failureCount = validations.filter(v => !v.success).length;
    const totalValidations = successCount + failureCount;

    // Calculate success rate
    const successRate = totalValidations > 0
      ? successCount / totalValidations
      : 1.0; // Default to 1.0 if no validations yet

    // Calculate average quality score
    const qualityScores = validations.map(v => v.qualityScore).filter(s => typeof s === 'number');
    const avgQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 80; // Default to 80 if no scores

    // Find first and last usage timestamps
    const timestamps = patternData.usages.map(u => new Date(u.timestamp).getTime());
    const firstUsedAt = timestamps.length > 0
      ? new Date(Math.min(...timestamps)).toISOString()
      : new Date().toISOString();
    const lastUsedAt = timestamps.length > 0
      ? new Date(Math.max(...timestamps)).toISOString()
      : new Date().toISOString();

    // Calculate confidence
    const currentConfidence = this._applyConfidenceFormula({
      successRate,
      avgQualityScore,
      failureCount
    });

    return {
      id: patternId,
      name: patternData.name,
      category: patternData.category,
      usageCount,
      successCount,
      failureCount,
      successRate: Math.round(successRate * 1000) / 1000, // 3 decimal places
      avgQualityScore: Math.round(avgQualityScore * 10) / 10, // 1 decimal place
      baseConfidence: 80,
      currentConfidence,
      status: 'active', // Will be updated by StalenessChecker
      lastUsedAt,
      firstUsedAt,
      daysSinceLastUse: 0 // Will be updated by StalenessChecker
    };
  }

  /**
   * Apply confidence formula
   * @param {object} metrics - Partial metrics
   * @returns {number} Current confidence (50-100)
   * @private
   */
  _applyConfidenceFormula(metrics) {
    const baseConfidence = 80;
    const successBonus = metrics.successRate * 15; // 0-15
    const qualityBonus = (metrics.avgQualityScore / 100) * 5; // 0-5
    const failurePenalty = Math.min(metrics.failureCount * 5, 20); // 0-20

    const confidence = baseConfidence + successBonus + qualityBonus - failurePenalty;

    // Clamp to 50-100
    return Math.round(Math.max(50, Math.min(100, confidence)));
  }

  /**
   * Write aggregated state atomically
   * @param {object} data - Aggregated state
   * @returns {Promise<void>}
   * @private
   */
  async _atomicWrite(data) {
    const tmpPath = EFFECTIVENESS_FILE + '.tmp';

    try {
      await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
      await fs.promises.rename(tmpPath, EFFECTIVENESS_FILE);
    } catch (error) {
      console.error(`[Aggregator] Failed to write: ${error.message}`);
      // Clean up temp file
      try {
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      } catch {
        // Ignore
      }
      throw error;
    }
  }

  /**
   * Save aggregation to history
   * @param {object} data - Aggregated state
   * @returns {Promise<void>}
   * @private
   */
  async _saveHistory(data) {
    const date = new Date().toISOString().split('T')[0];
    const historyFile = path.join(this._historyDir, `${date}.json`);

    try {
      await fs.promises.writeFile(historyFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.warn(`[Aggregator] Failed to save history: ${error.message}`);
      // Non-critical, continue
    }
  }

  /**
   * Save last aggregation metadata
   * @param {object} metadata - Aggregation metadata
   * @returns {Promise<void>}
   * @private
   */
  async _saveLastAggregation(metadata) {
    try {
      await fs.promises.writeFile(
        LAST_AGGREGATION_FILE,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );
    } catch (error) {
      console.warn(`[Aggregator] Failed to save metadata: ${error.message}`);
    }
  }

  /**
   * Get last aggregation metadata
   * @returns {object | null}
   */
  getLastAggregation() {
    try {
      if (!fs.existsSync(LAST_AGGREGATION_FILE)) {
        return null;
      }
      const content = fs.readFileSync(LAST_AGGREGATION_FILE, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Aggregate all user logs into effectiveness metrics
   * @returns {Promise<object>} Aggregation result
   */
  async aggregate() {
    const startTime = Date.now();

    // Load all logs
    const allLogs = await this._loadAllLogs();
    console.log(`[Aggregator] Loaded ${allLogs.length} log files`);

    // Filter completed logs only
    const completedLogs = this._filterCompletedLogs(allLogs);
    console.log(`[Aggregator] ${completedLogs.length} completed logs`);

    if (completedLogs.length === 0) {
      console.log('[Aggregator] No completed logs to aggregate');
      return {
        success: true,
        logsProcessed: 0,
        patternsUpdated: 0,
        outputPath: EFFECTIVENESS_FILE
      };
    }

    // Group events by pattern
    const patternMap = this._groupByPattern(completedLogs);
    console.log(`[Aggregator] Found ${patternMap.size} unique patterns`);

    // Compute effectiveness for each pattern
    const patterns = {};
    for (const [patternId, patternData] of patternMap) {
      patterns[patternId] = this._computeEffectiveness(patternId, patternData);
    }

    // Run staleness checks
    const patternArray = Object.values(patterns);
    const checkedPatterns = StalenessChecker.check(patternArray);

    // Update patterns object with checked status
    for (const pattern of checkedPatterns) {
      patterns[pattern.id] = pattern;
    }

    // Get summary
    const summary = StalenessChecker.getSummary(checkedPatterns);

    // Build aggregated state
    const aggregatedState = {
      version: '1.0',
      aggregatedAt: new Date().toISOString(),
      aggregatedFrom: {
        userCount: new Set(completedLogs.map(l => l.userId)).size,
        featureCount: new Set(completedLogs.map(l => l.featureId)).size,
        logFileCount: completedLogs.length,
        eventCount: completedLogs.reduce((sum, l) => sum + (l.events?.length || 0), 0)
      },
      patterns,
      summary: {
        totalPatterns: summary.total,
        active: summary.active,
        stale: summary.stale,
        deprecated: summary.deprecated
      }
    };

    // Write atomically
    await this._atomicWrite(aggregatedState);

    // Save to history
    await this._saveHistory(aggregatedState);

    // Save metadata
    const durationMs = Date.now() - startTime;
    await this._saveLastAggregation({
      timestamp: new Date().toISOString(),
      durationMs,
      logsProcessed: completedLogs.length,
      patternsUpdated: patternMap.size,
      triggeredBy: process.env.CI ? 'ci' : 'manual'
    });

    console.log(`[Aggregator] Aggregation complete in ${durationMs}ms`);

    return {
      success: true,
      logsProcessed: completedLogs.length,
      patternsUpdated: patternMap.size,
      outputPath: EFFECTIVENESS_FILE,
      summary: aggregatedState.summary
    };
  }
}

// CLI entry point
if (require.main === module) {
  (async () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                   FEEDBACK AGGREGATOR                          ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    try {
      const aggregator = new FeedbackAggregator();
      const result = await aggregator.aggregate();

      console.log('');
      console.log('───────────────────────────────────────────────────────────────');
      if (result.success) {
        console.log('✅ Aggregation complete');
        console.log(`   Logs processed: ${result.logsProcessed}`);
        console.log(`   Patterns updated: ${result.patternsUpdated}`);
        console.log(`   Output: ${result.outputPath}`);
        if (result.summary) {
          console.log(`   Summary: ${result.summary.active} active, ${result.summary.stale} stale, ${result.summary.deprecated} deprecated`);
        }
      } else {
        console.log('❌ Aggregation failed');
        process.exit(1);
      }
      console.log('───────────────────────────────────────────────────────────────');
      console.log('');
    } catch (error) {
      console.error('❌ Aggregation error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = FeedbackAggregator;
