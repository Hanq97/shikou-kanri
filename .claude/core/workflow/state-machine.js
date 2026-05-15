/**
 * Layer 1: State Machine - Strict State Transitions
 *
 * Enforces workflow progression through defined states.
 * Agent CANNOT skip states - code throws error on illegal transitions.
 *
 * Evidence: Finite State Machine pattern (NIST Zero-Trust)
 */

const WorkflowState = {
  INIT: "INIT",

  // Checkpoint C0
  CHECKPOINT_C0: "CHECKPOINT_C0",
  C0_VALIDATION: "C0_VALIDATION",
  USER_REVIEW_C0: "USER_REVIEW_C0",

  // Checkpoint C1
  CHECKPOINT_C1: "CHECKPOINT_C1",
  C1_VALIDATION: "C1_VALIDATION",
  USER_REVIEW_C1: "USER_REVIEW_C1",

  // Checkpoint C2
  CHECKPOINT_C2: "CHECKPOINT_C2",
  C2_VALIDATION: "C2_VALIDATION",
  USER_REVIEW_C2: "USER_REVIEW_C2",

  // Checkpoint C3
  CHECKPOINT_C3: "CHECKPOINT_C3",
  C3_VALIDATION: "C3_VALIDATION",
  USER_REVIEW_C3: "USER_REVIEW_C3",

  // Checkpoint C4
  CHECKPOINT_C4: "CHECKPOINT_C4",
  C4_VALIDATION: "C4_VALIDATION",
  USER_REVIEW_C4: "USER_REVIEW_C4",

  // Checkpoint C5
  CHECKPOINT_C5: "CHECKPOINT_C5",
  C5_VALIDATION: "C5_VALIDATION",
  USER_REVIEW_C5: "USER_REVIEW_C5",

  // Checkpoint C6
  CHECKPOINT_C6: "CHECKPOINT_C6",
  C6_VALIDATION: "C6_VALIDATION",
  USER_REVIEW_C6: "USER_REVIEW_C6",

  // Final states
  FINAL_REVIEW: "FINAL_REVIEW",
  USER_APPROVAL: "USER_APPROVAL",
  COMPLETE: "COMPLETE",
  ABORTED: "ABORTED",
};

/**
 * @typedef {Error} StateTransitionError
 * @property {string} currentState
 * @property {string} attemptedState
 * @property {string[]} allowedStates
 */

class WorkflowStateMachine {
  constructor() {
    this.currentState = WorkflowState.INIT;
    this.stateHistory = [WorkflowState.INIT];

    // Define STRICT transitions (cannot skip states)
    this.allowedTransitions = new Map([
      // Initial state
      [WorkflowState.INIT, [WorkflowState.CHECKPOINT_C0]],

      // C0 flow
      [WorkflowState.CHECKPOINT_C0, [WorkflowState.C0_VALIDATION]],
      [
        WorkflowState.C0_VALIDATION,
        [WorkflowState.USER_REVIEW_C0, WorkflowState.CHECKPOINT_C0],
      ], // Can retry
      [
        WorkflowState.USER_REVIEW_C0,
        [
          WorkflowState.CHECKPOINT_C1,
          WorkflowState.CHECKPOINT_C0,
          WorkflowState.ABORTED,
        ],
      ], // Approve, Regenerate, or Abort

      // C1 flow
      [WorkflowState.CHECKPOINT_C1, [WorkflowState.C1_VALIDATION]],
      [
        WorkflowState.C1_VALIDATION,
        [WorkflowState.USER_REVIEW_C1, WorkflowState.CHECKPOINT_C1],
      ],
      [
        WorkflowState.USER_REVIEW_C1,
        [
          WorkflowState.CHECKPOINT_C2,
          WorkflowState.CHECKPOINT_C1,
          WorkflowState.ABORTED,
        ],
      ],

      // C2 flow
      [WorkflowState.CHECKPOINT_C2, [WorkflowState.C2_VALIDATION]],
      [
        WorkflowState.C2_VALIDATION,
        [WorkflowState.USER_REVIEW_C2, WorkflowState.CHECKPOINT_C2],
      ],
      [
        WorkflowState.USER_REVIEW_C2,
        [
          WorkflowState.CHECKPOINT_C3,
          WorkflowState.CHECKPOINT_C2,
          WorkflowState.ABORTED,
        ],
      ],

      // C3 flow
      [WorkflowState.CHECKPOINT_C3, [WorkflowState.C3_VALIDATION]],
      [
        WorkflowState.C3_VALIDATION,
        [WorkflowState.USER_REVIEW_C3, WorkflowState.CHECKPOINT_C3],
      ],
      [
        WorkflowState.USER_REVIEW_C3,
        [
          WorkflowState.CHECKPOINT_C4,
          WorkflowState.CHECKPOINT_C3,
          WorkflowState.ABORTED,
        ],
      ],

      // C4 flow
      [WorkflowState.CHECKPOINT_C4, [WorkflowState.C4_VALIDATION]],
      [
        WorkflowState.C4_VALIDATION,
        [WorkflowState.USER_REVIEW_C4, WorkflowState.CHECKPOINT_C4],
      ],
      [
        WorkflowState.USER_REVIEW_C4,
        [
          WorkflowState.CHECKPOINT_C5,
          WorkflowState.CHECKPOINT_C4,
          WorkflowState.ABORTED,
        ],
      ],

      // C5 flow
      [WorkflowState.CHECKPOINT_C5, [WorkflowState.C5_VALIDATION]],
      [
        WorkflowState.C5_VALIDATION,
        [WorkflowState.USER_REVIEW_C5, WorkflowState.CHECKPOINT_C5],
      ],
      [
        WorkflowState.USER_REVIEW_C5,
        [
          WorkflowState.CHECKPOINT_C6,
          WorkflowState.CHECKPOINT_C5,
          WorkflowState.ABORTED,
        ],
      ],

      // C6 flow
      [WorkflowState.CHECKPOINT_C6, [WorkflowState.C6_VALIDATION]],
      [
        WorkflowState.C6_VALIDATION,
        [WorkflowState.USER_REVIEW_C6, WorkflowState.CHECKPOINT_C6],
      ],
      [
        WorkflowState.USER_REVIEW_C6,
        [
          WorkflowState.FINAL_REVIEW,
          WorkflowState.CHECKPOINT_C6,
          WorkflowState.ABORTED,
        ],
      ],

      // Final flow
      [WorkflowState.FINAL_REVIEW, [WorkflowState.USER_APPROVAL]],
      [
        WorkflowState.USER_APPROVAL,
        [WorkflowState.COMPLETE, WorkflowState.ABORTED],
      ],

      // Terminal states
      [WorkflowState.COMPLETE, []],
      [WorkflowState.ABORTED, []],
    ]);
  }

  /**
   * Attempt to transition to next state
   * Throws error if transition is not allowed
   */
  transition(nextState) {
    const allowed = this.allowedTransitions.get(this.currentState) || [];

    if (!allowed.includes(nextState)) {
      const error = new Error(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `❌ ILLEGAL STATE TRANSITION DETECTED\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Current State: ${this.currentState}\n` +
          `Attempted State: ${nextState}\n` +
          `Allowed Transitions: ${allowed.join(", ") || "NONE (terminal state)"}\n\n` +
          `This transition violates the workflow state machine.\n` +
          `The workflow must follow strict checkpoint progression.\n` +
          `Agent cannot skip states or bypass checkpoints.\n\n` +
          `State History:\n${this.getStateHistoryFormatted()}\n`,
      );

      error.name = "IllegalStateTransition";
      error.currentState = this.currentState;
      error.attemptedState = nextState;
      error.allowedStates = allowed;

      throw error;
    }

    this.currentState = nextState;
    this.stateHistory.push(nextState);
  }

  /**
   * Get current state
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Get state history
   */
  getStateHistory() {
    return [...this.stateHistory];
  }

  /**
   * Get formatted state history for display
   */
  getStateHistoryFormatted() {
    return this.stateHistory
      .map(
        (state, index) =>
          `  ${index + 1}. ${state}${index === this.stateHistory.length - 1 ? " (current)" : ""}`,
      )
      .join("\n");
  }

  /**
   * Check if state is a checkpoint state
   */
  isCheckpointState(state = this.currentState) {
    return state.startsWith("CHECKPOINT_");
  }

  /**
   * Check if state is a validation state
   */
  isValidationState(state = this.currentState) {
    return state.includes("_VALIDATION");
  }

  /**
   * Check if state is a user review state
   */
  isUserReviewState(state = this.currentState) {
    return state.startsWith("USER_REVIEW_");
  }

  /**
   * Check if workflow is complete
   */
  isComplete() {
    return this.currentState === WorkflowState.COMPLETE;
  }

  /**
   * Check if workflow is aborted
   */
  isAborted() {
    return this.currentState === WorkflowState.ABORTED;
  }

  /**
   * Check if workflow is in terminal state
   */
  isTerminalState() {
    return this.isComplete() || this.isAborted();
  }

  /**
   * Get checkpoint number from current state (C0-C6)
   * Returns null if not in checkpoint-related state
   */
  getCurrentCheckpoint() {
    const stateStr = this.currentState.toString();
    const match = stateStr.match(/C(\d)/);
    return match ? `C${match[1]}` : null;
  }

  /**
   * Reset state machine (for testing or restart)
   */
  reset() {
    this.currentState = WorkflowState.INIT;
    this.stateHistory = [WorkflowState.INIT];
  }
}

module.exports = { WorkflowStateMachine, WorkflowState };
