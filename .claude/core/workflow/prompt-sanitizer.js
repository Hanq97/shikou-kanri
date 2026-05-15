/**
 * Layer 4: Prompt Sanitizer - Constraint Injection
 *
 * Injects hard constraints into agent prompts to prevent bypass.
 * Ensures agent CANNOT skip checkpoints or ignore validation.
 *
 * Evidence: Prompt Engineering best practices (OpenAI, Anthropic)
 */

class PromptSanitizer {
  /**
   * Enforce checkpoint mode - inject HARD CONSTRAINTS
   * Agent receives explicit instructions that cannot be overridden
   */
  enforceCheckpointMode(agentPrompt, checkpointId) {
    return `
${agentPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  HARD CONSTRAINTS (CANNOT BE OVERRIDDEN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CURRENT CHECKPOINT: ${checkpointId}
2. YOU MUST ONLY GENERATE THIS CHECKPOINT
3. YOU MUST NOT generate subsequent checkpoints
4. YOU MUST NOT skip validation steps
5. YOU MUST STOP after generating ${checkpointId} output

If you attempt to:
- Generate content beyond ${checkpointId}
- Skip validation or self-critique
- Bypass quality checks
- Continue to next checkpoint without approval

The workflow engine will REJECT your output and RETRY.

ONLY generate the content for ${checkpointId}. STOP IMMEDIATELY after.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  /**
   * Enforce validation mode - agent must self-critique
   */
  enforceValidationMode(agentPrompt, checkpointId) {
    return `
${agentPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  VALIDATION REQUIREMENTS (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checkpoint: ${checkpointId}

BEFORE submitting your output, you MUST:
1. Answer all self-critique questions (Q1-Q4)
2. Verify evidence linkage (FR/NFR references)
3. Check cross-section consistency
4. Ensure no prohibited content

If validation fails, you MUST regenerate the section.
DO NOT submit invalid output.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  /**
   * Strip any bypass attempts from agent output
   */
  sanitizeOutput(output) {
    // Remove common bypass patterns
    const bypassPatterns = [
      /Proceeding to next checkpoint/gi,
      /Continuing to C\d+/gi,
      /Skipping validation/gi,
      /Moving to next section/gi,
    ];

    let sanitized = output;
    bypassPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(
        pattern,
        "[REMOVED: Bypass attempt detected]",
      );
    });

    return sanitized;
  }
}

module.exports = { PromptSanitizer };
