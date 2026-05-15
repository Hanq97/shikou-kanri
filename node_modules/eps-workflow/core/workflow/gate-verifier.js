/**
 * Layer 3: Gate Verifier - Prerequisite Checking
 *
 * Verifies all prerequisites are met before checkpoint execution.
 * Blocks execution if any prerequisite is missing.
 *
 * Evidence: Quality Gates pattern (CI/CD pipelines)
 */

/**
 * @typedef {Object} GateConfig
 * @property {string} checkpointId
 * @property {string[]} prerequisites
 * @property {string} [description]
 */

/**
 * @typedef {Error} GateVerificationError
 * @property {GateConfig} gate
 * @property {string[]} missingPrerequisites
 * @property {string[]} metPrerequisites
 */

class GateVerifier {
  constructor() {
    this.completedCheckpoints = new Set();
    this.userApprovals = new Map();
    this.contextLoaded = false;
    this.verificationHistory = [];
  }

  /**
   * Verify all prerequisites for a gate
   * Throws error if any prerequisite is not met
   */
  async verifyGate(gate) {
    const missing = this.getMissingPrerequisites(gate);

    if (missing.length > 0) {
      this.verificationHistory.push({
        checkpointId: gate.checkpointId,
        success: false,
        timestamp: new Date(),
        missingPrerequisites: missing,
      });

      const error = new Error(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🚫 GATE VERIFICATION FAILED - PREREQUISITES NOT MET\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Checkpoint: ${gate.checkpointId}\n` +
          `${gate.description ? `Description: ${gate.description}\n` : ""}` +
          `\n` +
          `Required Prerequisites: ${gate.prerequisites.join(", ")}\n` +
          `Missing Prerequisites: ${missing.join(", ")}\n\n` +
          `Cannot execute checkpoint until all prerequisites are met.\n` +
          `The workflow engine ensures proper execution order.\n` +
          `Agent cannot bypass quality gates.\n\n` +
          `Verification Status:\n${this.getVerificationStatusFormatted(gate)}\n`,
      );

      error.name = "GateVerificationFailed";
      error.gate = gate;
      error.missingPrerequisites = missing;
      error.metPrerequisites = this.getMetPrerequisites(gate);

      throw error;
    }

    this.verificationHistory.push({
      checkpointId: gate.checkpointId,
      success: true,
      timestamp: new Date(),
    });
  }

  /**
   * Get missing prerequisites for a gate
   */
  getMissingPrerequisites(gate) {
    return gate.prerequisites.filter((prereq) => {
      // Check context-loaded prerequisite
      if (prereq === "context-loaded") {
        return !this.hasContext();
      }

      // Check user-approved prerequisite (e.g., 'user-approved-C0')
      if (prereq.startsWith("user-approved-")) {
        const checkpointId = prereq.replace("user-approved-", "");
        return !this.hasUserApproval(checkpointId);
      }

      // Check checkpoint-completed prerequisite (e.g., 'C0-completed')
      if (prereq.endsWith("-completed")) {
        const checkpointId = prereq.replace("-completed", "");
        return !this.completedCheckpoints.has(checkpointId);
      }

      // Check specific prerequisite types
      if (prereq.startsWith("srs-")) {
        return !this.hasDocument("srs");
      }

      if (prereq.startsWith("basic-design-")) {
        return !this.hasDocument("basic-design");
      }

      if (prereq.startsWith("evidence-")) {
        return !this.hasEvidence();
      }

      // Unknown prerequisite - treat as missing
      console.warn(`⚠️  Unknown prerequisite type: ${prereq}`);
      return true;
    });
  }

  /**
   * Get met prerequisites for a gate
   */
  getMetPrerequisites(gate) {
    return gate.prerequisites.filter((prereq) => {
      const missing = this.getMissingPrerequisites({
        ...gate,
        prerequisites: [prereq],
      });
      return missing.length === 0;
    });
  }

  /**
   * Get formatted verification status
   */
  getVerificationStatusFormatted(gate) {
    const met = this.getMetPrerequisites(gate);
    const missing = this.getMissingPrerequisites(gate);

    const lines = [];

    if (met.length > 0) {
      lines.push("  ✅ Met Prerequisites:");
      met.forEach((prereq) => lines.push(`     - ${prereq}`));
    }

    if (missing.length > 0) {
      lines.push("  ❌ Missing Prerequisites:");
      missing.forEach((prereq) => lines.push(`     - ${prereq}`));
    }

    return lines.join("\n");
  }

  /**
   * Mark checkpoint as completed
   */
  markCompleted(checkpointId) {
    this.completedCheckpoints.add(checkpointId);
  }

  /**
   * Mark checkpoint as user-approved
   */
  markUserApproved(checkpointId) {
    this.userApprovals.set(checkpointId, true);
  }

  /**
   * Set context loaded status
   */
  setContextLoaded(loaded) {
    this.contextLoaded = loaded;
  }

  /**
   * Check if context is loaded
   */
  hasContext() {
    return this.contextLoaded;
  }

  /**
   * Check if user has approved a checkpoint
   */
  hasUserApproval(checkpointId) {
    return this.userApprovals.get(checkpointId) === true;
  }

  /**
   * Check if checkpoint is completed
   */
  isCompleted(checkpointId) {
    return this.completedCheckpoints.has(checkpointId);
  }

  /**
   * Placeholder: Check if document exists
   */
  hasDocument(type) {
    // TODO: Implement actual document check
    // For now, assume documents exist if context is loaded
    return this.contextLoaded;
  }

  /**
   * Placeholder: Check if evidence exists
   */
  hasEvidence() {
    // TODO: Implement actual evidence check
    // For now, assume evidence exists if context is loaded
    return this.contextLoaded;
  }

  /**
   * Get completed checkpoints
   */
  getCompletedCheckpoints() {
    return new Set(this.completedCheckpoints);
  }

  /**
   * Get approved checkpoints
   */
  getApprovedCheckpoints() {
    return Array.from(this.userApprovals.keys()).filter(
      (id) => this.userApprovals.get(id) === true,
    );
  }

  /**
   * Get verification history
   */
  getVerificationHistory() {
    return [...this.verificationHistory];
  }

  /**
   * Reset all gates (for testing)
   */
  reset() {
    this.completedCheckpoints.clear();
    this.userApprovals.clear();
    this.contextLoaded = false;
    this.verificationHistory = [];
  }
}

module.exports = { GateVerifier };
