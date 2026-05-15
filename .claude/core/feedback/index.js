/**
 * Feedback System - Self-Learning RAG Feedback Loop
 * @module .claude/utils/feedback
 *
 * Feature: INF-SFLR (Self-Learning RAG Feedback Loop)
 * Reference: EPS Framework v3.2
 *
 * This module provides a complete feedback loop for tracking pattern usage,
 * aggregating effectiveness metrics, and integrating with RAG for query-time boosting.
 *
 * Architecture:
 * - FeedbackEventBus: Pub/sub event system for decoupled communication
 * - EventLogger: Per-feature event logging with atomic writes
 * - FeedbackAggregator: Batch processing of logs into effectiveness metrics
 * - EffectivenessQuery: Read-only query interface with caching
 * - StalenessChecker: Utility for staleness and deprecation detection
 *
 * Usage:
 *
 * ```javascript
 * const {
 *   FeedbackEventBus,
 *   EventLogger,
 *   EffectivenessQuery,
 *   FeedbackAggregator
 * } = require('./.claude/utils/feedback');
 *
 * // Emit pattern usage event
 * const bus = FeedbackEventBus.getInstance();
 * bus.emit('pattern:used', {
 *   patternId: 'my-pattern',
 *   patternName: 'My Pattern',
 *   category: 'backend',
 *   usedInFile: 'src/example.ts',
 *   usedInStep: 'Implementation',
 *   planConfidence: 85
 * });
 *
 * // Query pattern effectiveness
 * const query = EffectivenessQuery.getInstance();
 * const boostFactor = query.getBoostFactor('my-pattern');
 * const topPatterns = query.getTopPatterns(10);
 * ```
 */

const FeedbackEventBus = require('./event-bus');
const EventLogger = require('./event-logger');
const FeedbackAggregator = require('./aggregator');
const EffectivenessQuery = require('./effectiveness-query');
const StalenessChecker = require('./staleness-checker');

// Re-export all classes
module.exports = {
  // Core classes
  FeedbackEventBus,
  EventLogger,
  FeedbackAggregator,
  EffectivenessQuery,
  StalenessChecker,

  // Convenience functions
  /**
   * Get singleton EventBus instance
   * @returns {FeedbackEventBus}
   */
  getEventBus: () => FeedbackEventBus.getInstance(),

  /**
   * Get singleton Query instance
   * @returns {EffectivenessQuery}
   */
  getQuery: () => EffectivenessQuery.getInstance(),

  /**
   * Create new EventLogger for a feature
   * @param {string} featureId - Feature ID
   * @param {string} [userId] - Optional user ID
   * @returns {EventLogger}
   */
  createLogger: (featureId, userId) => new EventLogger(featureId, userId),

  /**
   * Run aggregation (typically called from CI)
   * @returns {Promise<object>} Aggregation result
   */
  runAggregation: async () => {
    const aggregator = new FeedbackAggregator();
    return aggregator.aggregate();
  },

  // Constants
  ALLOWED_EVENTS: FeedbackEventBus.ALLOWED_EVENTS,
  VALID_CATEGORIES: FeedbackEventBus.VALID_CATEGORIES,
  STALE_THRESHOLD_DAYS: StalenessChecker.STALE_THRESHOLD_DAYS,
  DEPRECATION_THRESHOLD: StalenessChecker.DEPRECATION_THRESHOLD
};
