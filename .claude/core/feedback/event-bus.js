/**
 * FeedbackEventBus - Singleton event bus for feedback events
 * @module core/feedback/event-bus
 *
 * Pattern: Singleton + Observer (Pub/Sub)
 * Reference: Detail Design Section 3.1
 */

const { EventEmitter } = require('events');

// Allowed event types
const ALLOWED_EVENTS = ['pattern:used', 'validation:complete'];

// Required fields per event type
const EVENT_SCHEMAS = {
  'pattern:used': ['patternId', 'patternName', 'category', 'usedInFile', 'usedInStep', 'planConfidence'],
  'validation:complete': ['featureId', 'success', 'qualityScore', 'testsPass', 'coverage', 'patternsValidated']
};

// Valid categories
const VALID_CATEGORIES = ['backend', 'frontend', 'database', 'testing', 'general'];

class FeedbackEventBus {
  /** @type {FeedbackEventBus | null} */
  static _instance = null;

  /** @type {EventEmitter} */
  _emitter;

  constructor() {
    if (FeedbackEventBus._instance) {
      return FeedbackEventBus._instance;
    }
    this._emitter = new EventEmitter();
    // Increase max listeners for multiple subscribers
    this._emitter.setMaxListeners(20);
    FeedbackEventBus._instance = this;
  }

  /**
   * Get singleton instance
   * @returns {FeedbackEventBus}
   */
  static getInstance() {
    if (!FeedbackEventBus._instance) {
      FeedbackEventBus._instance = new FeedbackEventBus();
    }
    return FeedbackEventBus._instance;
  }

  /**
   * Reset singleton (for testing only)
   * @private
   */
  static _resetInstance() {
    if (FeedbackEventBus._instance) {
      FeedbackEventBus._instance._emitter.removeAllListeners();
      FeedbackEventBus._instance = null;
    }
  }

  /**
   * Validate event name
   * @param {string} event - Event name
   * @returns {boolean}
   * @private
   */
  _validateEvent(event) {
    return ALLOWED_EVENTS.includes(event);
  }

  /**
   * Validate event data against schema
   * @param {string} event - Event name
   * @param {object} data - Event payload
   * @returns {{ valid: boolean, missing: string[] }}
   * @private
   */
  _validateData(event, data) {
    const schema = EVENT_SCHEMAS[event];
    if (!schema) {
      return { valid: true, missing: [] };
    }

    const missing = [];
    for (const field of schema) {
      if (data[field] === undefined || data[field] === null) {
        missing.push(field);
      }
    }

    // Additional validation for pattern:used
    if (event === 'pattern:used') {
      if (data.category && !VALID_CATEGORIES.includes(data.category)) {
        console.warn(`[FeedbackEventBus] Invalid category: ${data.category}. Using 'general'.`);
        data.category = 'general';
      }
      if (typeof data.planConfidence === 'number' && (data.planConfidence < 0 || data.planConfidence > 100)) {
        console.warn(`[FeedbackEventBus] planConfidence out of range: ${data.planConfidence}. Clamping to 0-100.`);
        data.planConfidence = Math.max(0, Math.min(100, data.planConfidence));
      }
    }

    return { valid: missing.length === 0, missing };
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name ('pattern:used' | 'validation:complete')
   * @param {object} data - Event payload
   * @throws {Error} If event name is invalid
   */
  emit(event, data) {
    // Validate event name
    if (!this._validateEvent(event)) {
      throw new Error(`Unknown event: ${event}. Allowed events: ${ALLOWED_EVENTS.join(', ')}`);
    }

    // Validate data (graceful degradation - log warning but emit anyway)
    const validation = this._validateData(event, data);
    if (!validation.valid) {
      console.warn(`[FeedbackEventBus] Missing fields for '${event}': ${validation.missing.join(', ')}`);
    }

    // Add timestamp if not provided
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }

    // Emit event with error handling for handlers
    const listeners = this._emitter.listeners(event);
    for (const handler of listeners) {
      try {
        handler(data);
      } catch (error) {
        console.error(`[FeedbackEventBus] Handler error for '${event}':`, error.message);
        // Continue to next handler
      }
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Callback function(data)
   */
  on(event, handler) {
    if (!this._validateEvent(event)) {
      throw new Error(`Unknown event: ${event}. Allowed events: ${ALLOWED_EVENTS.join(', ')}`);
    }
    this._emitter.on(event, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Callback to remove
   */
  off(event, handler) {
    this._emitter.off(event, handler);
  }

  /**
   * Subscribe once to an event
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   */
  once(event, handler) {
    if (!this._validateEvent(event)) {
      throw new Error(`Unknown event: ${event}. Allowed events: ${ALLOWED_EVENTS.join(', ')}`);
    }
    this._emitter.once(event, handler);
  }

  /**
   * Remove all listeners
   * @param {string} [event] - Optional event name (removes all if not specified)
   */
  removeAllListeners(event) {
    if (event) {
      this._emitter.removeAllListeners(event);
    } else {
      this._emitter.removeAllListeners();
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    return this._emitter.listenerCount(event);
  }
}

// Export constants for consumers
FeedbackEventBus.ALLOWED_EVENTS = ALLOWED_EVENTS;
FeedbackEventBus.VALID_CATEGORIES = VALID_CATEGORIES;

module.exports = FeedbackEventBus;
