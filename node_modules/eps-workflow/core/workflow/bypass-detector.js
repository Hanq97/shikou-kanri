/**
 * Layer 5: Bypass Detector - Agent Behavior Monitoring
 *
 * Detects when agent attempts to bypass workflow constraints.
 * Triggers retry or abort based on severity.
 *
 * Evidence: Anomaly Detection patterns (Security monitoring)
 */

/**
 * @typedef {Object} BypassDetection
 * @property {boolean} detected
 * @property {'low'|'medium'|'high'|'critical'} severity
 * @property {string[]} violations
 * @property {Date} timestamp
 */

class BypassDetector {
  constructor() {
    this.detectionHistory = [];
  }

  /**
   * Detect bypass attempts in agent output
   */
  detectBypass(output, expectedCheckpoint) {
    const violations = [];

    // Pattern 1: Checkpoint skipping
    const checkpointPattern = /(?:Checkpoint|C)(\d+)/gi;
    const matches = Array.from(output.matchAll(checkpointPattern));
    const expectedNum = parseInt(expectedCheckpoint.replace("C", ""));

    matches.forEach((match) => {
      const num = parseInt(match[1]);
      if (num > expectedNum) {
        violations.push(
          `Attempted to generate C${num} (expected ${expectedCheckpoint})`,
        );
      }
    });

    // Pattern 2: Validation bypass
    const validationBypass = [
      /skip.*validation/gi,
      /bypass.*check/gi,
      /ignore.*constraint/gi,
      /proceed without.*approval/gi,
    ];

    validationBypass.forEach((pattern) => {
      if (pattern.test(output)) {
        violations.push(`Validation bypass attempt: ${pattern.source}`);
      }
    });

    // Pattern 3: Continuing without stop
    const continuationPatterns = [
      /proceeding to next/gi,
      /continuing to C\d+/gi,
      /moving forward to/gi,
    ];

    continuationPatterns.forEach((pattern) => {
      if (pattern.test(output)) {
        violations.push(`Unauthorized continuation: ${pattern.source}`);
      }
    });

    // Pattern 4: Generating multiple checkpoints
    const checkpointSections = output.split(/━+/);
    const checkpointCount = checkpointSections.filter((section) =>
      /Checkpoint C\d+/i.test(section),
    ).length;

    if (checkpointCount > 1) {
      violations.push(`Generated ${checkpointCount} checkpoints (expected 1)`);
    }

    // Determine severity
    let severity = "low";
    if (violations.length === 0) {
      severity = "low";
    } else if (violations.length <= 2) {
      severity = "medium";
    } else if (violations.length <= 4) {
      severity = "high";
    } else {
      severity = "critical";
    }

    const detection = {
      detected: violations.length > 0,
      severity,
      violations,
      timestamp: new Date(),
    };

    this.detectionHistory.push(detection);

    return detection;
  }

  /**
   * Check if bypass severity requires abort
   */
  shouldAbort(detection) {
    return detection.severity === "critical";
  }

  /**
   * Check if bypass severity requires retry
   */
  shouldRetry(detection) {
    return detection.severity === "high" || detection.severity === "medium";
  }

  /**
   * Get detection history
   */
  getDetectionHistory() {
    return [...this.detectionHistory];
  }

  /**
   * Get recent bypass attempts (last N detections)
   */
  getRecentBypass(count = 5) {
    return this.detectionHistory.slice(-count);
  }

  /**
   * Reset detection history (for testing)
   */
  reset() {
    this.detectionHistory = [];
  }
}

module.exports = { BypassDetector };
