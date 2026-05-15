/**
 * Layer 8: User Approval (stdin) - CRITICAL ENFORCEMENT LAYER
 *
 * Blocks workflow execution until user provides explicit approval.
 * Agent CANNOT bypass - stdin read is synchronous and blocking.
 *
 * Evidence: Human-in-the-loop pattern (NIST Zero-Trust)
 */

const readline = require("readline");

/**
 * @typedef {Object} ApprovalRequest
 * @property {string} checkpointId
 * @property {string} content
 * @property {Date} timestamp
 */

/**
 * @typedef {Object} ApprovalResponse
 * @property {boolean} approved
 * @property {'approve'|'regenerate'|'abort'} action
 * @property {string} [feedback]
 * @property {Date} timestamp
 */

class UserApproval {
  constructor() {
    this.approvalHistory = [];
  }

  /**
   * Request user approval for checkpoint output
   * BLOCKS until user responds
   */
  async requestApproval(checkpointId, content) {
    const request = {
      checkpointId,
      content,
      timestamp: new Date(),
    };

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📋 CHECKPOINT ${checkpointId} - USER REVIEW REQUIRED`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("Generated content:\n");
    console.log(content);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Please review the content above.\n");
    console.log("Options:");
    console.log("  [A] Approve - Accept and continue to next checkpoint");
    console.log("  [R] Regenerate - Regenerate this checkpoint");
    console.log("  [X] Abort - Stop workflow execution");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const response = await this.readUserInput("Your choice (A/R/X): ");

    const approvalResponse = this.parseResponse(response);
    approvalResponse.timestamp = new Date();

    // Record approval history
    this.approvalHistory.push({ request, response: approvalResponse });

    return approvalResponse;
  }

  /**
   * Request user approval with custom question
   */
  async requestCustomApproval(question) {
    console.log(`\n❓ ${question}`);
    const response = await this.readUserInput("Your answer (Yes/No): ");

    return this.parseYesNo(response);
  }

  /**
   * Request user feedback
   */
  async requestFeedback(prompt) {
    console.log(`\n💬 ${prompt}`);
    return await this.readUserInput("Your feedback: ");
  }

  /**
   * Read user input from stdin (BLOCKING)
   */
  async readUserInput(prompt) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  /**
   * Parse user response into ApprovalResponse
   */
  parseResponse(input) {
    const normalized = input.trim().toUpperCase();

    if (normalized === "A" || normalized === "APPROVE") {
      return {
        approved: true,
        action: "approve",
        timestamp: new Date(),
      };
    }

    if (normalized === "R" || normalized === "REGENERATE") {
      return {
        approved: false,
        action: "regenerate",
        timestamp: new Date(),
      };
    }

    if (normalized === "X" || normalized === "ABORT") {
      return {
        approved: false,
        action: "abort",
        timestamp: new Date(),
      };
    }

    // Default to regenerate if invalid input
    console.warn("⚠️  Invalid input. Defaulting to Regenerate.");
    return {
      approved: false,
      action: "regenerate",
      timestamp: new Date(),
    };
  }

  /**
   * Parse Yes/No response
   */
  parseYesNo(input) {
    const normalized = input.trim().toLowerCase();
    return normalized === "yes" || normalized === "y";
  }

  /**
   * Get approval history
   */
  getApprovalHistory() {
    return [...this.approvalHistory];
  }

  /**
   * Get approved checkpoints
   */
  getApprovedCheckpoints() {
    return this.approvalHistory
      .filter((entry) => entry.response.approved)
      .map((entry) => entry.request.checkpointId);
  }

  /**
   * Check if checkpoint was approved
   */
  isCheckpointApproved(checkpointId) {
    const entry = this.approvalHistory.find(
      (e) => e.request.checkpointId === checkpointId,
    );
    return entry?.response.approved ?? false;
  }

  /**
   * Reset approval history (for testing)
   */
  reset() {
    this.approvalHistory = [];
  }
}

module.exports = { UserApproval };
