/**
 * Layer 6: Output Truncator - Checkpoint Boundary Enforcement
 *
 * Truncates agent output to ONLY the requested checkpoint.
 * Prevents agent from generating multiple checkpoints in one call.
 *
 * Evidence: Content Filtering patterns (Web security)
 */

/**
 * @typedef {Object} TruncationResult
 * @property {boolean} truncated
 * @property {number} originalLength
 * @property {number} finalLength
 * @property {string} removedContent
 * @property {string} checkpoint
 */

class OutputTruncator {
  /**
   * Truncate output to only the specified checkpoint
   */
  truncateToCheckpoint(output, expectedCheckpoint) {
    const originalLength = output.length;

    // Find checkpoint boundaries
    const checkpointPattern = new RegExp(
      `(━+\\s*\\n.*?Checkpoint\\s+${expectedCheckpoint}.*?\\n━+)([\\s\\S]*?)(?=━+\\s*\\n.*?Checkpoint\\s+C\\d+|$)`,
      "i",
    );

    const match = output.match(checkpointPattern);

    if (!match) {
      // No checkpoint found - return as-is but mark as suspicious
      return {
        truncated: false,
        originalLength,
        finalLength: originalLength,
        removedContent: "",
        checkpoint: expectedCheckpoint,
      };
    }

    // Extract ONLY the expected checkpoint content
    const header = match[1]; // Checkpoint header
    const content = match[2]; // Checkpoint content

    // Check if there's content after this checkpoint
    const afterContent = output.substring(match.index + match[0].length);
    const hasNextCheckpoint = /Checkpoint\s+C\d+/i.test(afterContent);

    if (hasNextCheckpoint) {
      // Truncate - remove everything after expected checkpoint
      const truncatedOutput = header + content;

      return {
        truncated: true,
        originalLength,
        finalLength: truncatedOutput.length,
        removedContent: afterContent,
        checkpoint: expectedCheckpoint,
      };
    }

    // No truncation needed
    return {
      truncated: false,
      originalLength,
      finalLength: originalLength,
      removedContent: "",
      checkpoint: expectedCheckpoint,
    };
  }

  /**
   * Extract specific checkpoint content from multi-checkpoint output
   */
  extractCheckpoint(output, checkpointId) {
    const pattern = new RegExp(
      `(━+\\s*\\n.*?Checkpoint\\s+${checkpointId}.*?\\n━+[\\s\\S]*?)(?=━+\\s*\\n.*?Checkpoint\\s+C\\d+|$)`,
      "i",
    );

    const match = output.match(pattern);
    return match ? match[1].trim() : "";
  }

  /**
   * Count checkpoints in output
   */
  countCheckpoints(output) {
    const matches = output.matchAll(/Checkpoint\s+(C\d+)/gi);
    return Array.from(matches).length;
  }

  /**
   * Validate output contains ONLY expected checkpoint
   */
  validateSingleCheckpoint(output, expectedCheckpoint) {
    const count = this.countCheckpoints(output);
    if (count !== 1) return false;

    const pattern = new RegExp(`Checkpoint\\s+${expectedCheckpoint}`, "i");
    return pattern.test(output);
  }

  /**
   * Get all checkpoint IDs from output
   */
  getCheckpointIds(output) {
    const matches = output.matchAll(/Checkpoint\s+(C\d+)/gi);
    return Array.from(matches).map((match) => match[1].toUpperCase());
  }
}

module.exports = { OutputTruncator };
