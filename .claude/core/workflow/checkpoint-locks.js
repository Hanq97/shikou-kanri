/**
 * Layer 2: Checkpoint Locks - Explicit Lock/Unlock Mechanism
 *
 * Controls checkpoint execution through lock/unlock mechanism.
 * Agent cannot execute locked checkpoints - only one checkpoint unlocked at a time.
 *
 * Evidence: Mutex pattern (concurrent programming)
 */

/**
 * @typedef {Error} CheckpointLockError
 * @property {string} checkpointId
 * @property {string|null} currentUnlocked
 * @property {Map<string, boolean>} allLocks
 */

class CheckpointLocks {
  constructor(checkpointIds) {
    this.locks = new Map();
    this.currentCheckpoint = null;
    this.lockHistory = [];

    // Lock all checkpoints initially
    checkpointIds.forEach((id) => {
      this.locks.set(id, true);
    });
  }

  /**
   * Unlock a specific checkpoint
   * This is the ONLY way to enable checkpoint execution
   */
  unlock(checkpointId) {
    if (!this.locks.has(checkpointId)) {
      throw new Error(`Unknown checkpoint: ${checkpointId}`);
    }

    this.locks.set(checkpointId, false);
    this.currentCheckpoint = checkpointId;
    this.lockHistory.push({
      checkpoint: checkpointId,
      action: "unlock",
      timestamp: new Date(),
    });
  }

  /**
   * Lock a specific checkpoint
   * Prevents execution until unlocked again
   */
  lock(checkpointId) {
    if (!this.locks.has(checkpointId)) {
      throw new Error(`Unknown checkpoint: ${checkpointId}`);
    }

    this.locks.set(checkpointId, true);

    if (this.currentCheckpoint === checkpointId) {
      this.currentCheckpoint = null;
    }

    this.lockHistory.push({
      checkpoint: checkpointId,
      action: "lock",
      timestamp: new Date(),
    });
  }

  /**
   * Check if checkpoint is unlocked
   */
  isUnlocked(checkpointId) {
    return this.locks.get(checkpointId) === false;
  }

  /**
   * Check if checkpoint is locked
   */
  isLocked(checkpointId) {
    return this.locks.get(checkpointId) === true;
  }

  /**
   * Lock all checkpoints except the specified one
   * Ensures only ONE checkpoint can execute at a time
   */
  lockAllExcept(checkpointId) {
    this.locks.forEach((_, id) => {
      this.locks.set(id, id !== checkpointId);
    });
    this.currentCheckpoint = checkpointId;
    this.lockHistory.push({
      checkpoint: checkpointId,
      action: "unlock",
      timestamp: new Date(),
    });
  }

  /**
   * Verify checkpoint is unlocked before execution
   * Throws error if locked - preventing agent bypass
   */
  verifyUnlocked(checkpointId) {
    if (!this.isUnlocked(checkpointId)) {
      const error = new Error(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🔒 CHECKPOINT LOCKED - EXECUTION DENIED\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Checkpoint: ${checkpointId}\n` +
          `Status: LOCKED\n` +
          `Current Unlocked: ${this.currentCheckpoint || "NONE"}\n\n` +
          `Cannot execute locked checkpoint.\n` +
          `The workflow engine controls checkpoint unlocking.\n` +
          `Agent cannot bypass checkpoint locks.\n\n` +
          `Lock Status:\n${this.getLockStatusFormatted()}\n`,
      );

      error.name = "CheckpointLocked";
      error.checkpointId = checkpointId;
      error.currentUnlocked = this.currentCheckpoint;
      error.allLocks = new Map(this.locks);

      throw error;
    }
  }

  /**
   * Get currently unlocked checkpoint
   */
  getCurrentUnlocked() {
    return this.currentCheckpoint;
  }

  /**
   * Get all lock statuses
   */
  getAllLocks() {
    return new Map(this.locks);
  }

  /**
   * Get formatted lock status for display
   */
  getLockStatusFormatted() {
    return Array.from(this.locks.entries())
      .map(([id, locked]) => {
        const status = locked ? "🔒 LOCKED" : "🔓 UNLOCKED";
        const current = id === this.currentCheckpoint ? " (current)" : "";
        return `  ${id}: ${status}${current}`;
      })
      .join("\n");
  }

  /**
   * Get lock history for debugging
   */
  getLockHistory() {
    return [...this.lockHistory];
  }

  /**
   * Lock all checkpoints
   */
  lockAll() {
    this.locks.forEach((_, id) => {
      this.locks.set(id, true);
    });
    this.currentCheckpoint = null;
  }

  /**
   * Reset all locks (for testing)
   */
  reset() {
    this.locks.forEach((_, id) => {
      this.locks.set(id, true);
    });
    this.currentCheckpoint = null;
    this.lockHistory = [];
  }

  /**
   * Get count of locked checkpoints
   */
  getLockedCount() {
    return Array.from(this.locks.values()).filter((locked) => locked).length;
  }

  /**
   * Get count of unlocked checkpoints
   */
  getUnlockedCount() {
    return Array.from(this.locks.values()).filter((locked) => !locked).length;
  }
}

module.exports = { CheckpointLocks };
