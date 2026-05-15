/**
 * Phase Executor - Agent Execution Wrapper
 *
 * Executes micro-agents with context loading and output capture.
 * Provides interface between enforced workflow engine and agent subprocess.
 *
 * Evidence: Adapter Pattern (Design Patterns)
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * @typedef {Object} AgentContext
 * @property {string} feature
 * @property {string} sub
 * @property {string} [srsPath]
 * @property {string} [basicDesignPath]
 * @property {string} [innovationPath]
 * @property {string[]} [guidelines]
 */

/**
 * @typedef {Object} AgentExecutionResult
 * @property {string} output
 * @property {number} exitCode
 * @property {string} [error]
 */

class PhaseExecutor {
  constructor() {
    this.agentsDir = path.join(
      process.cwd(),
      ".claude",
      "agents",
      "micro-agents",
    );
  }

  /**
   * Execute a micro-agent with context
   */
  async executeAgent(agentName, checkpointId, context, additionalPrompt) {
    // Build agent prompt
    const prompt = this.buildAgentPrompt(
      agentName,
      checkpointId,
      context,
      additionalPrompt,
    );

    // Write prompt to temp file
    const promptPath = this.writeTempPrompt(prompt);

    try {
      // Execute agent via Claude CLI (or agent executor)
      const output = await this.executeAgentProcess(
        agentName,
        promptPath,
        context,
      );

      return {
        output,
        exitCode: 0,
      };
    } catch (error) {
      return {
        output: "",
        exitCode: 1,
        error: error.message,
      };
    } finally {
      // Cleanup temp prompt
      if (fs.existsSync(promptPath)) {
        fs.unlinkSync(promptPath);
      }
    }
  }

  /**
   * Build agent prompt with context
   */
  buildAgentPrompt(agentName, checkpointId, context, additionalPrompt) {
    const parts = [];

    // Agent instructions
    const agentPath = this.resolveAgentPath(agentName);
    if (fs.existsSync(agentPath)) {
      parts.push(fs.readFileSync(agentPath, "utf-8"));
    }

    // Context files
    if (context.srsPath && fs.existsSync(context.srsPath)) {
      parts.push(
        `\n## SRS Document\n\n${fs.readFileSync(context.srsPath, "utf-8")}`,
      );
    }

    if (context.basicDesignPath && fs.existsSync(context.basicDesignPath)) {
      parts.push(
        `\n## Basic Design Document\n\n${fs.readFileSync(context.basicDesignPath, "utf-8")}`,
      );
    }

    if (context.innovationPath && fs.existsSync(context.innovationPath)) {
      parts.push(
        `\n## Innovation Notes\n\n${fs.readFileSync(context.innovationPath, "utf-8")}`,
      );
    }

    // Guidelines (Just-in-Time loading)
    if (context.guidelines && context.guidelines.length > 0) {
      parts.push("\n## Agent Guidelines\n");
      context.guidelines.forEach((guidelinePath) => {
        if (fs.existsSync(guidelinePath)) {
          parts.push(fs.readFileSync(guidelinePath, "utf-8"));
        }
      });
    }

    // Additional prompt
    if (additionalPrompt) {
      parts.push(`\n## Task\n\n${additionalPrompt}`);
    }

    // Checkpoint reminder
    parts.push(`\n## Current Checkpoint\n\n${checkpointId}`);

    return parts.join("\n");
  }

  /**
   * Execute agent process
   * NOTE: This is a placeholder - actual implementation depends on agent execution method
   */
  async executeAgentProcess(agentName, promptPath, context) {
    // Option 1: Execute via Claude CLI
    // const output = execSync(`claude --agent "${agentName}" --prompt "${promptPath}"`, {
    //   encoding: 'utf-8',
    // })

    // Option 2: Execute via Task tool (current implementation)
    // This is a placeholder - orchestrators handle actual execution

    // For now, return placeholder
    return `[Agent output would be generated here for ${agentName}]`;
  }

  /**
   * Write temp prompt file
   */
  writeTempPrompt(prompt) {
    const tempDir = path.join(process.cwd(), ".claude", "memory-bank", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const promptPath = path.join(tempDir, `prompt-${Date.now()}.md`);
    fs.writeFileSync(promptPath, prompt, "utf-8");

    return promptPath;
  }

  /**
   * Resolve agent file path
   */
  resolveAgentPath(agentName) {
    // Determine workflow type from agent name
    if (agentName.startsWith("srs-")) {
      return path.join(this.agentsDir, "srs", `${agentName}.md`);
    }

    if (agentName.startsWith("bd-")) {
      return path.join(this.agentsDir, "basic-design", `${agentName}.md`);
    }

    if (agentName.startsWith("fdd-")) {
      return path.join(this.agentsDir, "frontend-dd", `${agentName}.md`);
    }

    if (agentName.startsWith("bdd-")) {
      return path.join(this.agentsDir, "backend-dd", `${agentName}.md`);
    }

    // Default
    return path.join(this.agentsDir, `${agentName}.md`);
  }
}

module.exports = { PhaseExecutor };
