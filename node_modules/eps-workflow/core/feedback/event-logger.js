/**
 * EventLogger - Per-feature event logger with atomic writes
 * @module core/feedback/event-logger
 *
 * Pattern: Event Sourcing (append-only)
 * Reference: Detail Design Section 3.2
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const FeedbackEventBus = require('./event-bus');

// Base directory for feedback logs
const FEEDBACK_LOG_DIR = path.resolve(__dirname, '../../feedback-log');

class EventLogger {
  /** @type {string} */
  _featureId;

  /** @type {string} */
  _userId;

  /** @type {string} */
  _logPath;

  /** @type {Array<object>} */
  _events;

  /** @type {string} */
  _startedAt;

  /** @type {boolean} */
  _finalized;

  /** @type {number} */
  _eventCounter;

  /** @type {string} */
  _branch;

  /**
   * Create EventLogger instance for a feature
   * @param {string} featureId - Feature ID (e.g., 'LND-INVS')
   * @param {string} [userId] - User ID, defaults to git user.name
   */
  constructor(featureId, userId) {
    if (!featureId || typeof featureId !== 'string') {
      throw new Error('featureId is required and must be a string');
    }

    this._featureId = featureId;
    this._userId = userId || this._detectUserId();
    this._branch = this._detectBranch();
    this._events = [];
    this._startedAt = new Date().toISOString();
    this._finalized = false;
    this._eventCounter = 0;

    // Generate log path
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this._logPath = path.join(FEEDBACK_LOG_DIR, this._userId, `${featureId}-${date}.json`);

    // Ensure directory exists
    this._ensureDirectory();

    // Subscribe to events
    this._subscribeToEvents();
  }

  /**
   * Auto-detect userId from git config
   * @returns {string}
   * @private
   */
  _detectUserId() {
    try {
      const gitUser = execSync('git config user.name', { encoding: 'utf8' }).trim();
      // Normalize: lowercase, replace spaces with hyphens
      return gitUser.toLowerCase().replace(/\s+/g, '-');
    } catch {
      // Fallback to environment variable or 'anonymous'
      return (process.env.USER || process.env.USERNAME || 'anonymous').toLowerCase();
    }
  }

  /**
   * Auto-detect current git branch
   * @returns {string}
   * @private
   */
  _detectBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Ensure user directory exists
   * @private
   */
  _ensureDirectory() {
    const userDir = path.dirname(this._logPath);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
  }

  /**
   * Subscribe to FeedbackEventBus events
   * @private
   */
  _subscribeToEvents() {
    const bus = FeedbackEventBus.getInstance();

    // Subscribe to pattern:used
    bus.on('pattern:used', (data) => {
      this._onPatternUsed(data);
    });

    // Subscribe to validation:complete
    bus.on('validation:complete', (data) => {
      this._onValidationComplete(data);
    });
  }

  /**
   * Handle pattern:used event
   * @param {object} data - Pattern usage data
   * @private
   */
  _onPatternUsed(data) {
    if (this._finalized) {
      console.warn('[EventLogger] Cannot log after finalize()');
      return;
    }

    this.logPatternUsed(data);
  }

  /**
   * Handle validation:complete event
   * @param {object} data - Validation data
   * @private
   */
  _onValidationComplete(data) {
    if (this._finalized) {
      console.warn('[EventLogger] Cannot log after finalize()');
      return;
    }

    // Only log if this validation is for our feature
    if (data.featureId === this._featureId) {
      this.logValidationComplete(data);
    }
  }

  /**
   * Normalize pattern ID for consistent storage
   * @param {string} id - Raw pattern ID
   * @returns {string} Normalized ID
   * @private
   */
  _normalizePatternId(id) {
    if (!id || typeof id !== 'string') {
      return 'unknown-pattern';
    }
    return id
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID (evt-001, evt-002, etc.)
   * @private
   */
  _generateEventId() {
    this._eventCounter++;
    return `evt-${String(this._eventCounter).padStart(3, '0')}`;
  }

  /**
   * Append event to in-memory array
   * @param {object} event - Event object
   * @private
   */
  _appendEvent(event) {
    this._events.push(event);
  }

  /**
   * Write log file atomically (crash-safe)
   * @returns {Promise<void>}
   * @private
   */
  async _atomicWrite() {
    const data = this._buildLogData();
    const tmpPath = this._logPath + '.tmp';

    try {
      // Write to temp file
      await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');

      // Rename to final (atomic on most filesystems)
      await fs.promises.rename(tmpPath, this._logPath);
    } catch (error) {
      console.error(`[EventLogger] Failed to write log: ${error.message}`);
      // Clean up temp file if exists
      try {
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      } catch {
        // Ignore cleanup errors
      }
      // Don't throw - logging failure should not break workflow
    }
  }

  /**
   * Build log data object
   * @returns {object}
   * @private
   */
  _buildLogData() {
    const data = {
      version: '1.0',
      featureId: this._featureId,
      userId: this._userId,
      branch: this._branch,
      startedAt: this._startedAt,
      status: this._finalized ? 'completed' : 'in_progress',
      events: this._events
    };

    if (this._finalized) {
      data.completedAt = new Date().toISOString();
      data.summary = this._computeSummary();
    }

    return data;
  }

  /**
   * Compute log summary
   * @returns {object}
   * @private
   */
  _computeSummary() {
    const patternEvents = this._events.filter(e => e.type === 'pattern:used');
    const validationEvents = this._events.filter(e => e.type === 'validation:complete');

    // Get unique patterns
    const uniquePatterns = new Set(patternEvents.map(e => e.data.patternId));

    // Get validation result
    const lastValidation = validationEvents[validationEvents.length - 1];
    const validationSuccess = lastValidation ? lastValidation.data.success : false;

    // Calculate average quality score
    const qualityScores = validationEvents
      .map(e => e.data.qualityScore)
      .filter(s => typeof s === 'number');
    const avgQualityScore = qualityScores.length > 0
      ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
      : 0;

    return {
      patternsUsed: uniquePatterns.size,
      validationSuccess,
      avgQualityScore
    };
  }

  /**
   * Log a pattern usage event
   * @param {object} data - Pattern usage details
   */
  logPatternUsed(data) {
    if (this._finalized) {
      console.warn('[EventLogger] Cannot log after finalize()');
      return;
    }

    const event = {
      id: this._generateEventId(),
      type: 'pattern:used',
      timestamp: data.timestamp || new Date().toISOString(),
      data: {
        patternId: this._normalizePatternId(data.patternId),
        patternName: data.patternName || data.patternId,
        category: data.category || 'general',
        usedInFile: data.usedInFile || 'unknown',
        usedInStep: data.usedInStep || 'unknown',
        planConfidence: typeof data.planConfidence === 'number' ? data.planConfidence : 0
      }
    };

    this._appendEvent(event);
  }

  /**
   * Log validation completion event
   * @param {object} data - Validation results
   */
  logValidationComplete(data) {
    if (this._finalized) {
      console.warn('[EventLogger] Cannot log after finalize()');
      return;
    }

    const event = {
      id: this._generateEventId(),
      type: 'validation:complete',
      timestamp: data.timestamp || new Date().toISOString(),
      data: {
        featureId: data.featureId || this._featureId,
        success: Boolean(data.success),
        qualityScore: typeof data.qualityScore === 'number' ? data.qualityScore : 0,
        testsPass: Boolean(data.testsPass),
        coverage: typeof data.coverage === 'number' ? data.coverage : 0,
        patternsValidated: Array.isArray(data.patternsValidated)
          ? data.patternsValidated.map(p => this._normalizePatternId(p))
          : []
      }
    };

    this._appendEvent(event);
  }

  /**
   * Finalize and persist the log file
   * @returns {Promise<void>}
   */
  async finalize() {
    if (this._finalized) {
      console.warn('[EventLogger] Already finalized');
      return;
    }

    this._finalized = true;
    await this._atomicWrite();

    console.log(`[EventLogger] Log finalized: ${this._logPath}`);
  }

  /**
   * Get log file path
   * @returns {string}
   */
  getLogPath() {
    return this._logPath;
  }

  /**
   * Get current event count
   * @returns {number}
   */
  getEventCount() {
    return this._events.length;
  }

  /**
   * Check if logger is finalized
   * @returns {boolean}
   */
  isFinalized() {
    return this._finalized;
  }
}

module.exports = EventLogger;
