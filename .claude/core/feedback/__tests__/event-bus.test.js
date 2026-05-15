/**
 * Unit tests for FeedbackEventBus
 * @module core/feedback/__tests__/event-bus.test.js
 */

const FeedbackEventBus = require('../event-bus');

describe('FeedbackEventBus', () => {
  beforeEach(() => {
    // Reset singleton between tests
    FeedbackEventBus._resetInstance();
  });

  describe('Singleton Pattern', () => {
    test('getInstance returns same instance', () => {
      const instance1 = FeedbackEventBus.getInstance();
      const instance2 = FeedbackEventBus.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('constructor returns existing instance', () => {
      const instance1 = new FeedbackEventBus();
      const instance2 = new FeedbackEventBus();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Event Validation', () => {
    test('emit throws for unknown event', () => {
      const bus = FeedbackEventBus.getInstance();
      expect(() => {
        bus.emit('unknown:event', {});
      }).toThrow('Unknown event: unknown:event');
    });

    test('emit accepts pattern:used event', () => {
      const bus = FeedbackEventBus.getInstance();
      expect(() => {
        bus.emit('pattern:used', {
          patternId: 'test',
          patternName: 'Test',
          category: 'general',
          usedInFile: 'test.ts',
          usedInStep: 'test',
          planConfidence: 80
        });
      }).not.toThrow();
    });

    test('emit accepts validation:complete event', () => {
      const bus = FeedbackEventBus.getInstance();
      expect(() => {
        bus.emit('validation:complete', {
          featureId: 'TEST-001',
          success: true,
          qualityScore: 85,
          testsPass: true,
          coverage: 80,
          patternsValidated: ['test']
        });
      }).not.toThrow();
    });

    test('on throws for unknown event', () => {
      const bus = FeedbackEventBus.getInstance();
      expect(() => {
        bus.on('unknown:event', () => {});
      }).toThrow('Unknown event: unknown:event');
    });
  });

  describe('Data Validation', () => {
    test('warns on missing fields but emits anyway', () => {
      const bus = FeedbackEventBus.getInstance();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      bus.emit('pattern:used', { patternId: 'test' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('clamps planConfidence to 0-100', () => {
      const bus = FeedbackEventBus.getInstance();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const data = {
        patternId: 'test',
        patternName: 'Test',
        category: 'general',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 150
      };

      bus.emit('pattern:used', data);

      expect(data.planConfidence).toBe(100);
      consoleSpy.mockRestore();
    });

    test('corrects invalid category to general', () => {
      const bus = FeedbackEventBus.getInstance();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const data = {
        patternId: 'test',
        patternName: 'Test',
        category: 'invalid',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 80
      };

      bus.emit('pattern:used', data);

      expect(data.category).toBe('general');
      consoleSpy.mockRestore();
    });
  });

  describe('Event Subscription', () => {
    test('on receives emitted events', () => {
      const bus = FeedbackEventBus.getInstance();
      const handler = jest.fn();

      bus.on('pattern:used', handler);
      bus.emit('pattern:used', {
        patternId: 'test',
        patternName: 'Test',
        category: 'general',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 80
      });

      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        patternId: 'test'
      }));
    });

    test('off removes handler', () => {
      const bus = FeedbackEventBus.getInstance();
      const handler = jest.fn();

      bus.on('pattern:used', handler);
      bus.off('pattern:used', handler);

      bus.emit('pattern:used', {
        patternId: 'test',
        patternName: 'Test',
        category: 'general',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 80
      });

      expect(handler).not.toHaveBeenCalled();
    });

    test('removeAllListeners removes all handlers for event', () => {
      const bus = FeedbackEventBus.getInstance();
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      bus.on('pattern:used', handler1);
      bus.on('pattern:used', handler2);
      bus.removeAllListeners('pattern:used');

      bus.emit('pattern:used', {
        patternId: 'test',
        patternName: 'Test',
        category: 'general',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 80
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    test('listenerCount returns correct count', () => {
      const bus = FeedbackEventBus.getInstance();

      expect(bus.listenerCount('pattern:used')).toBe(0);

      bus.on('pattern:used', () => {});
      expect(bus.listenerCount('pattern:used')).toBe(1);

      bus.on('pattern:used', () => {});
      expect(bus.listenerCount('pattern:used')).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('handler error does not stop other handlers', () => {
      const bus = FeedbackEventBus.getInstance();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const badHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = jest.fn();

      bus.on('pattern:used', badHandler);
      bus.on('pattern:used', goodHandler);

      bus.emit('pattern:used', {
        patternId: 'test',
        patternName: 'Test',
        category: 'general',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 80
      });

      expect(badHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Timestamp', () => {
    test('adds timestamp if not provided', () => {
      const bus = FeedbackEventBus.getInstance();
      const handler = jest.fn();

      bus.on('pattern:used', handler);
      bus.emit('pattern:used', {
        patternId: 'test',
        patternName: 'Test',
        category: 'general',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 80
      });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(String)
      }));
    });

    test('preserves provided timestamp', () => {
      const bus = FeedbackEventBus.getInstance();
      const handler = jest.fn();
      const customTimestamp = '2025-01-01T00:00:00.000Z';

      bus.on('pattern:used', handler);
      bus.emit('pattern:used', {
        patternId: 'test',
        patternName: 'Test',
        category: 'general',
        usedInFile: 'test.ts',
        usedInStep: 'test',
        planConfidence: 80,
        timestamp: customTimestamp
      });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: customTimestamp
      }));
    });
  });

  describe('Constants', () => {
    test('exports ALLOWED_EVENTS', () => {
      expect(FeedbackEventBus.ALLOWED_EVENTS).toEqual(['pattern:used', 'validation:complete']);
    });

    test('exports VALID_CATEGORIES', () => {
      expect(FeedbackEventBus.VALID_CATEGORIES).toEqual(['backend', 'frontend', 'database', 'testing', 'general']);
    });
  });

  describe('once method', () => {
    test('once throws for unknown event', () => {
      const bus = FeedbackEventBus.getInstance();
      expect(() => {
        bus.once('unknown:event', () => {});
      }).toThrow('Unknown event: unknown:event');
    });

    test('once accepts valid event', () => {
      const bus = FeedbackEventBus.getInstance();
      expect(() => {
        bus.once('pattern:used', () => {});
      }).not.toThrow();
    });
  });
});
