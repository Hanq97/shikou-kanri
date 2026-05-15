/**
 * Unit tests for EventLogger
 * @module core/feedback/__tests__/event-logger.test.js
 */

const EventLogger = require('../event-logger');
const FeedbackEventBus = require('../event-bus');

describe('EventLogger', () => {
  beforeEach(() => {
    // Reset event bus singleton
    FeedbackEventBus._resetInstance();
  });

  describe('Constructor', () => {
    test('throws error for missing featureId', () => {
      expect(() => new EventLogger()).toThrow('featureId is required');
      expect(() => new EventLogger('')).toThrow('featureId is required');
      expect(() => new EventLogger(null)).toThrow('featureId is required');
    });

    test('creates logger with featureId', () => {
      const logger = new EventLogger('TEST-001', 'test-user');
      expect(logger.getEventCount()).toBe(0);
      expect(logger.isFinalized()).toBe(false);
    });
  });

  describe('Event Logging', () => {
    test('logs pattern:used event', () => {
      const logger = new EventLogger('TEST-001', 'test-user');

      logger.logPatternUsed({
        patternId: 'test-pattern',
        patternName: 'Test Pattern',
        category: 'backend',
        usedInFile: 'src/test.ts',
        usedInStep: 'Implementation',
        planConfidence: 85
      });

      expect(logger.getEventCount()).toBe(1);
    });

    test('logs validation:complete event', () => {
      const logger = new EventLogger('TEST-001', 'test-user');

      logger.logValidationComplete({
        featureId: 'TEST-001',
        success: true,
        qualityScore: 90,
        testsPass: true,
        coverage: 85,
        patternsValidated: ['pattern-a', 'pattern-b']
      });

      expect(logger.getEventCount()).toBe(1);
    });

    test('logs multiple events', () => {
      const logger = new EventLogger('TEST-001', 'test-user');

      logger.logPatternUsed({
        patternId: 'p1',
        patternName: 'P1',
        category: 'backend',
        usedInFile: 'a.ts',
        usedInStep: 'test',
        planConfidence: 80
      });

      logger.logPatternUsed({
        patternId: 'p2',
        patternName: 'P2',
        category: 'frontend',
        usedInFile: 'b.ts',
        usedInStep: 'test',
        planConfidence: 90
      });

      expect(logger.getEventCount()).toBe(2);
    });
  });

  describe('Default Values', () => {
    test('uses default values for missing fields', () => {
      const logger = new EventLogger('TEST-001', 'test-user');

      logger.logPatternUsed({
        patternId: 'test'
        // Missing other fields
      });

      expect(logger.getEventCount()).toBe(1);
    });
  });

  describe('Finalization', () => {
    test('isFinalized returns false before finalize', () => {
      const logger = new EventLogger('TEST-001', 'test-user');
      expect(logger.isFinalized()).toBe(false);
    });

    test('isFinalized returns true after finalize', async () => {
      const logger = new EventLogger('TEST-001', 'test-user');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await logger.finalize();

      expect(logger.isFinalized()).toBe(true);
      consoleSpy.mockRestore();
    });

    test('does not log after finalize', async () => {
      const logger = new EventLogger('TEST-001', 'test-user');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await logger.finalize();

      logger.logPatternUsed({
        patternId: 'test',
        patternName: 'Test',
        category: 'backend',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 80
      });

      expect(logger.getEventCount()).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('[EventLogger] Cannot log after finalize()');

      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });

    test('double finalize shows warning', async () => {
      const logger = new EventLogger('TEST-001', 'test-user');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await logger.finalize();
      await logger.finalize();

      expect(consoleSpy).toHaveBeenCalledWith('[EventLogger] Already finalized');
      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe('Log Path', () => {
    test('getLogPath returns valid path', () => {
      const logger = new EventLogger('TEST-001', 'test-user');
      const logPath = logger.getLogPath();

      expect(logPath).toContain('feedback-log');
      expect(logPath).toContain('test-user');
      expect(logPath).toContain('TEST-001');
      expect(logPath.endsWith('.json')).toBe(true);
    });
  });
});
