/**
 * Enforced Workflow Engine - 8-Layer Defense System
 *
 * Integrates all enforcement layers to prevent agent bypass.
 * Ensures strict checkpoint progression with mandatory user approval.
 *
 * Evidence: Defense-in-depth pattern (Cybersecurity)
 */

const { WorkflowStateMachine, WorkflowState } = require("./state-machine");
const { CheckpointLocks } = require("./checkpoint-locks");
const { GateVerifier } = require("./gate-verifier");
const { PromptSanitizer } = require("./prompt-sanitizer");
const { BypassDetector } = require("./bypass-detector");
const { OutputTruncator } = require("./output-truncator");
const { UserApproval } = require("./user-approval");

/**
 * @typedef {Object} CheckpointConfig
 * @property {string} id
 * @property {string} name
 * @property {string[]} prerequisites
 * @property {string} [description]
 */

/**
 * @typedef {Object} WorkflowConfig
 * @property {CheckpointConfig[]} checkpoints
 * @property {number} maxRetries
 */

/**
 * @typedef {Object} ExecutionResult
 * @property {boolean} success
 * @property {string} checkpointId
 * @property {string} [output]
 * @property {string} [error]
 * @property {number} retries
 */

class EnforcedWorkflowEngine {
  constructor(config) {
    this.config = config;

    // Initialize enforcement layers
    this.stateMachine = new WorkflowStateMachine();
    this.checkpointLocks = new CheckpointLocks(
      config.checkpoints.map((c) => c.id),
    );
    this.gateVerifier = new GateVerifier();
    this.promptSanitizer = new PromptSanitizer();
    this.bypassDetector = new BypassDetector();
    this.outputTruncator = new OutputTruncator();
    this.userApproval = new UserApproval();
  }

  /**
   * Execute a checkpoint with full enforcement
   */
  async executeCheckpoint(checkpointId, agentPrompt, agentExecutor) {
    let retries = 0;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // LAYER 1: Verify state transition (ONCE before retry loop)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const checkpointState = this.getCheckpointState(checkpointId);
    this.stateMachine.transition(checkpointState);

    while (retries < this.config.maxRetries) {
      try {
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LAYER 2: Verify checkpoint is unlocked
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        this.checkpointLocks.verifyUnlocked(checkpointId);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LAYER 3: Verify gate prerequisites
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const checkpointConfig = this.config.checkpoints.find(
          (c) => c.id === checkpointId,
        );
        if (!checkpointConfig) {
          throw new Error(`Unknown checkpoint: ${checkpointId}`);
        }

        const gate = {
          checkpointId,
          prerequisites: checkpointConfig.prerequisites,
          description: checkpointConfig.description,
        };

        await this.gateVerifier.verifyGate(gate);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LAYER 4: Sanitize agent prompt (inject constraints)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const sanitizedPrompt = this.promptSanitizer.enforceCheckpointMode(
          agentPrompt,
          checkpointId,
        );

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // EXECUTE AGENT (with enforced prompt)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log(`\n🤖 Executing agent for checkpoint ${checkpointId}...`);
        let agentOutput = await agentExecutor(sanitizedPrompt);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LAYER 5: Detect bypass attempts
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const bypassDetection = this.bypassDetector.detectBypass(
          agentOutput,
          checkpointId,
        );

        if (this.bypassDetector.shouldAbort(bypassDetection)) {
          throw new Error(
            `Critical bypass detected: ${bypassDetection.violations.join(", ")}`,
          );
        }

        if (this.bypassDetector.shouldRetry(bypassDetection)) {
          console.warn(
            `⚠️  Bypass detected (severity: ${bypassDetection.severity}). Retrying...`,
          );
          retries++;
          continue;
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LAYER 6: Truncate output to checkpoint boundary
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const truncationResult = this.outputTruncator.truncateToCheckpoint(
          agentOutput,
          checkpointId,
        );

        if (truncationResult.truncated) {
          console.warn(
            `⚠️  Output truncated: Removed ${truncationResult.removedContent.length} chars`,
          );
          agentOutput = agentOutput.substring(0, truncationResult.finalLength);
        }

        // Validate single checkpoint
        if (
          !this.outputTruncator.validateSingleCheckpoint(
            agentOutput,
            checkpointId,
          )
        ) {
          console.warn(`⚠️  Multiple checkpoints detected. Retrying...`);
          retries++;
          continue;
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LAYER 7: Validation Integration (handled by orchestrator)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // Note: Validators are called by orchestrator after this step

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LAYER 8: User approval (CRITICAL - BLOCKING)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const approvalResponse = await this.userApproval.requestApproval(
          checkpointId,
          agentOutput,
        );

        if (approvalResponse.action === "abort") {
          throw new Error("Workflow aborted by user");
        }

        if (approvalResponse.action === "regenerate") {
          console.log("🔄 Regenerating checkpoint...");
          retries++;
          continue;
        }

        // User approved - mark checkpoint complete
        this.gateVerifier.markCompleted(checkpointId);
        this.gateVerifier.markUserApproved(checkpointId);

        // Transition to validation state
        const validationState = this.getValidationState(checkpointId);
        this.stateMachine.transition(validationState);

        // Transition to user review state
        const reviewState = this.getUserReviewState(checkpointId);
        this.stateMachine.transition(reviewState);

        return {
          success: true,
          checkpointId,
          output: agentOutput,
          retries,
        };
      } catch (error) {
        console.error(
          `❌ Error executing checkpoint ${checkpointId}:`,
          error.message,
        );

        if (retries >= this.config.maxRetries - 1) {
          return {
            success: false,
            checkpointId,
            error: error.message,
            retries,
          };
        }

        retries++;
      }
    }

    return {
      success: false,
      checkpointId,
      error: "Max retries exceeded",
      retries,
    };
  }

  /**
   * Unlock next checkpoint
   */
  unlockCheckpoint(checkpointId) {
    this.checkpointLocks.lockAllExcept(checkpointId);
  }

  /**
   * Set context loaded status
   */
  setContextLoaded(loaded) {
    this.gateVerifier.setContextLoaded(loaded);
  }

  /**
   * Get checkpoint state enum
   * Maps phase IDs to checkpoint states (C0, C1, C2, etc.)
   */
  getCheckpointState(checkpointId) {
    // Direct mapping if already in Cx format
    if (/^C\d$/.test(checkpointId)) {
      return WorkflowState[`CHECKPOINT_${checkpointId}`];
    }

    // Map phase-based IDs to checkpoint states
    // phase-0-xxx → C0, phase-1-xxx → C1, etc.
    const phaseMatch = checkpointId.match(/^phase-(\d+)/);
    if (phaseMatch) {
      const checkpointNum = phaseMatch[1];
      return WorkflowState[`CHECKPOINT_C${checkpointNum}`];
    }

    // Fallback: try direct lookup
    return WorkflowState[`CHECKPOINT_${checkpointId}`];
  }

  /**
   * Normalize checkpoint ID for state machine
   * Returns Cx format regardless of input format
   */
  normalizeCheckpointId(checkpointId) {
    // Already in Cx format
    if (/^C\d$/.test(checkpointId)) {
      return checkpointId;
    }

    // Map phase-X-xxx to CX
    const phaseMatch = checkpointId.match(/^phase-(\d+)/);
    if (phaseMatch) {
      return `C${phaseMatch[1]}`;
    }

    // Return original if no mapping found
    return checkpointId;
  }

  /**
   * Get validation state enum
   */
  getValidationState(checkpointId) {
    const normalized = this.normalizeCheckpointId(checkpointId);
    return WorkflowState[`${normalized}_VALIDATION`];
  }

  /**
   * Get user review state enum
   */
  getUserReviewState(checkpointId) {
    const normalized = this.normalizeCheckpointId(checkpointId);
    return WorkflowState[`USER_REVIEW_${normalized}`];
  }

  /**
   * Get current workflow state
   */
  getCurrentState() {
    return this.stateMachine.getCurrentState();
  }

  /**
   * Get completed checkpoints
   */
  getCompletedCheckpoints() {
    return this.gateVerifier.getCompletedCheckpoints();
  }

  /**
   * Get approved checkpoints
   */
  getApprovedCheckpoints() {
    return this.userApproval.getApprovedCheckpoints();
  }

  /**
   * Reset workflow (for testing)
   */
  reset() {
    this.stateMachine.reset();
    this.checkpointLocks.reset();
    this.gateVerifier.reset();
    this.bypassDetector.reset();
    this.userApproval.reset();
  }
}

module.exports = { EnforcedWorkflowEngine };
