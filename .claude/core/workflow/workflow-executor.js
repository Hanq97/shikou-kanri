/**
 * Workflow Executor v3.0 (RAG 2.0 / GraphRAG Integration)
 *
 * Bridges workflow definitions with Claude conversation
 * NOW INTEGRATED with EnforcedWorkflowEngine for 8-layer defense
 *
 * Architecture:
 * - Load workflow definitions (from .md or .js)
 * - Initialize EnforcedWorkflowEngine with checkpoint config
 * - Execute phases through enforcement layers:
 *   Layer 1: State Machine (strict transitions)
 *   Layer 2: Checkpoint Locks (mutex)
 *   Layer 3: Gate Verifier (prerequisites)
 *   Layer 4: Prompt Sanitizer (constraint injection)
 *   Layer 5: Bypass Detector (behavior monitoring)
 *   Layer 6: Output Truncator (boundary enforcement)
 *   Layer 7: Validation (quality checks)
 *   Layer 8: User Approval (blocking stdin)
 *
 * Evidence: Phase 6 completion - Update All References
 */

const fs = require("fs");
const path = require("path");

// Import enforcement engine
const {
  EnforcedWorkflowEngine,
} = require('./enforced-workflow-engine');

// Import individual enforcement layers for direct access when needed
const {
  BypassDetector,
} = require('./bypass-detector');
const {
  PromptSanitizer,
} = require('./prompt-sanitizer');

/**
 * State file path for persisting workflow state between runs
 * Used for Claude Code CLI mode where each phase runs in separate invocation
 */
const STATE_DIR = path.join(__dirname, "..", "..", "state");
const getStateFilePath = (workflowName, feature) =>
  path.join(STATE_DIR, `workflow-${workflowName}-${feature}.json`);

/**
 * Execution modes:
 * - 'cli': Claude Code CLI mode - print prompt and exit, state persisted to file
 * - 'api': API mode - expects agentExecutor to return actual output (original behavior)
 */
const EXECUTION_MODE = {
  CLI: "cli",
  API: "api",
};

class WorkflowExecutor {
  constructor(workflowName, context, options = {}) {
    this.workflowName = workflowName;
    this.context = context || {};
    this.workflow = null;
    this.phaseOutputs = {};
    this.currentPhase = null;
    this.currentPhaseIndex = 0;
    this.enforcementEngine = null;
    this.enforcementEnabled = true; // Can be disabled for testing

    // CLI mode options
    this.executionMode = options.mode || EXECUTION_MODE.CLI;
    this.providedOutput = options.output || null; // Output from previous Claude response
    this.stateFile = null;
  }

  /**
   * Load workflow definition
   * Supports both .js (new) and .md (legacy fallback)
   */
  loadWorkflow() {
    // Try loading .js workflow first (new format)
    // Note: workflow-definitions is at .claude/utils/workflow-definitions/ (sibling to workflow-engine/)
    const jsWorkflowPath = path.join(
      __dirname,
      "..",
      "workflow-definitions",
      `${this.workflowName}.js`,
    );

    if (fs.existsSync(jsWorkflowPath)) {
      try {
        this.workflow = require(jsWorkflowPath);
        console.log(
          `✅ Loaded workflow: ${this.workflow.name || this.workflowName} (JavaScript)`,
        );

        // Initialize enforcement engine for JS workflows
        if (this.enforcementEnabled && this.workflow.phases) {
          this.initializeEnforcementEngine();
        }
        return;
      } catch (error) {
        console.warn(`⚠️  Failed to load JS workflow: ${error.message}`);
      }
    }

    // Fallback to .md workflow (legacy format)
    // Note: commands is at commands/ (two levels up from workflow-engine/)
    const mdWorkflowPath = path.join(
      __dirname,
      "..",
      "..",
      "commands",
      this.workflowName
        .replace("innovate-", "innovate/")
        .replace("design-", "design/") + ".md",
    );

    if (fs.existsSync(mdWorkflowPath)) {
      console.log(
        `✅ Loaded workflow: ${this.workflowName} (Markdown - legacy fallback)`,
      );
      this.workflow = {
        type: "markdown",
        content: fs.readFileSync(mdWorkflowPath, "utf-8"),
      };
      return;
    }

    throw new Error(`Workflow not found: ${this.workflowName}`);
  }

  /**
   * Initialize EnforcedWorkflowEngine from workflow phases
   */
  initializeEnforcementEngine() {
    // Convert phases to checkpoint config
    const checkpoints = this.workflow.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      prerequisites: this.derivePrerequisites(phase),
      description: phase.llmPrompt?.system || phase.name,
    }));

    const config = {
      checkpoints,
      maxRetries: 3,
    };

    try {
      this.enforcementEngine = new EnforcedWorkflowEngine(config);
      this.enforcementEngine.setContextLoaded(true);

      // Unlock first phase
      if (checkpoints.length > 0) {
        this.enforcementEngine.unlockCheckpoint(checkpoints[0].id);
      }

      console.log(`🛡️  Enforcement Engine initialized (8-layer defense active)`);
    } catch (error) {
      console.warn(`⚠️  Enforcement Engine init failed: ${error.message}`);
      console.warn(`⚠️  Falling back to basic validation`);
      this.enforcementEngine = null;
    }
  }

  /**
   * Derive prerequisites from phase definition
   */
  derivePrerequisites(phase) {
    const prerequisites = ["context-loaded"];

    if (phase.dependsOn && phase.dependsOn.length > 0) {
      phase.dependsOn.forEach((dep) => {
        prerequisites.push(`${dep}-completed`);
        prerequisites.push(`user-approved-${dep}`);
      });
    }

    return prerequisites;
  }

  /**
   * Load persisted state from file (CLI mode)
   */
  loadState() {
    const feature = this.context.feature || "default";
    this.stateFile = getStateFilePath(this.workflowName, feature);

    if (fs.existsSync(this.stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(this.stateFile, "utf-8"));
        this.currentPhaseIndex = state.currentPhaseIndex || 0;
        this.phaseOutputs = state.phaseOutputs || {};
        this.context = { ...this.context, ...state.context };
        console.log(`📂 Loaded state: Phase ${this.currentPhaseIndex}`);
        return true;
      } catch (error) {
        console.warn(`⚠️  Failed to load state: ${error.message}`);
      }
    }
    return false;
  }

  /**
   * Save current state to file (CLI mode)
   */
  saveState() {
    if (!this.stateFile) {
      const feature = this.context.feature || "default";
      this.stateFile = getStateFilePath(this.workflowName, feature);
    }

    // Ensure state directory exists
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }

    const state = {
      workflowName: this.workflowName,
      currentPhaseIndex: this.currentPhaseIndex,
      phaseOutputs: this.phaseOutputs,
      context: this.context,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
    console.log(`💾 State saved: Phase ${this.currentPhaseIndex}`);
  }

  /**
   * Clear persisted state (when workflow completes or resets)
   */
  clearState() {
    if (this.stateFile && fs.existsSync(this.stateFile)) {
      fs.unlinkSync(this.stateFile);
      console.log(`🗑️  State cleared`);
    }
  }

  /**
   * Execute workflow phase by phase
   */
  async executeWorkflow() {
    console.log(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    );
    console.log(`  WORKFLOW EXECUTOR v3.0 (RAG 2.0 / GraphRAG)`);
    console.log(`  Workflow: ${this.workflow.name || this.workflowName}`);
    console.log(`  Mode: ${this.executionMode.toUpperCase()}`);
    if (this.enforcementEngine) {
      console.log(`  🛡️  8-Layer Enforcement: ACTIVE`);
    } else {
      console.log(`  ⚠️  Enforcement: DISABLED (basic validation only)`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // If legacy markdown workflow, output and exit
    if (this.workflow.type === "markdown") {
      console.log(`\n📋 Legacy markdown workflow detected`);
      console.log(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
      );
      console.log(this.workflow.content);
      console.log(
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      );
      return { success: true, type: "legacy", outputs: {} };
    }

    // Execute JavaScript workflow phases
    if (!this.workflow.phases || !Array.isArray(this.workflow.phases)) {
      throw new Error("Workflow missing phases array");
    }

    // CLI mode: Load previous state and handle provided output
    if (this.executionMode === EXECUTION_MODE.CLI) {
      this.loadState();

      // If output provided, validate and store it for current phase
      if (this.providedOutput) {
        const result = await this.processProvidedOutput();
        if (!result.continue) {
          return result;
        }
      }
    }

    // Execute phases starting from current index
    for (let i = this.currentPhaseIndex; i < this.workflow.phases.length; i++) {
      const phase = this.workflow.phases[i];
      console.log(`\n📍 Phase ${phase.id}: ${phase.name}`);

      // Check dependencies
      if (phase.dependsOn) {
        for (const dep of phase.dependsOn) {
          if (!this.phaseOutputs[dep]) {
            throw new Error(`Missing dependency: ${dep}`);
          }
        }
      }

      // Execute phase with enforcement
      const result = await this.executePhaseWithEnforcement(phase);

      // CLI mode: Print prompt and exit, waiting for Claude's response
      if (this.executionMode === EXECUTION_MODE.CLI && result.awaitingResponse) {
        this.currentPhaseIndex = i;
        this.saveState();
        return {
          success: true,
          type: "awaiting_response",
          phase: phase.id,
          phaseName: phase.name,
          message: "Prompt printed. Run again with --output to provide Claude's response.",
        };
      }

      // Store output
      if (phase.outputToContext && result.output) {
        this.phaseOutputs[phase.id] = result.output;
        this.context[phase.outputToContext] = result.output;
      }

      // Unlock next phase if enforcement engine is active
      if (this.enforcementEngine && i < this.workflow.phases.length - 1) {
        const nextPhase = this.workflow.phases[i + 1];
        this.enforcementEngine.unlockCheckpoint(nextPhase.id);
      }

      // Update phase index for next iteration
      this.currentPhaseIndex = i + 1;
    }

    // Workflow completed - clear state
    if (this.executionMode === EXECUTION_MODE.CLI) {
      this.clearState();
    }

    console.log(`\n✅ Workflow completed: ${this.workflow.name}`);
    return { success: true, type: "completed", outputs: this.phaseOutputs };
  }

  /**
   * Process output provided from previous Claude response (CLI mode)
   */
  async processProvidedOutput() {
    const phase = this.workflow.phases[this.currentPhaseIndex];
    if (!phase) {
      return { continue: false, error: "No phase to process output for" };
    }

    console.log(`\n🔄 Processing output for Phase ${phase.id}: ${phase.name}`);

    // Validate the provided output
    const validation = this.validatePhaseOutput(phase, this.providedOutput);
    if (!validation.pass) {
      console.error(`❌ Validation failed:`);
      validation.violations.forEach((v) => console.error(`   - ${v}`));
      return {
        continue: false,
        success: false,
        type: "validation_failed",
        violations: validation.violations,
      };
    }

    console.log(`✅ Output validated for Phase ${phase.id}`);

    // Store output and move to next phase
    if (phase.outputToContext) {
      this.phaseOutputs[phase.id] = this.providedOutput;
      this.context[phase.outputToContext] = this.providedOutput;
    }

    // Move to next phase
    this.currentPhaseIndex++;
    this.providedOutput = null; // Clear for next phase

    return { continue: true };
  }

  /**
   * Execute single phase with full 8-layer enforcement
   */
  async executePhaseWithEnforcement(phase) {
    this.currentPhase = phase;

    // NEW: Handle orchestrator phase type (BLOCKING execution)
    // This prevents AI bypass by directly spawning orchestrator scripts
    if (phase.type === 'orchestrator') {
      console.log(`\n🛡️ ENFORCEMENT: Orchestrator phase detected`);
      console.log(`   Phase type: orchestrator (BLOCKING)`);
      console.log(`   AI bypass: PREVENTED`);
      return await this.executeOrchestratorPhase(phase);
    }

    // NEW: Handle orchestrator-loop phase type
    if (phase.type === 'orchestrator-loop') {
      console.log(`\n🛡️ ENFORCEMENT: Orchestrator loop phase detected`);
      console.log(`   Phase type: orchestrator-loop (BLOCKING)`);
      console.log(`   AI bypass: PREVENTED`);
      return await this.executeOrchestratorLoop(phase);
    }

    // Render prompt with constraints
    const enhancedPrompt = this.renderPromptWithConstraints(phase);

    // If enforcement engine is available, use it
    if (this.enforcementEngine) {
      return await this.executeWithEnforcementEngine(phase, enhancedPrompt);
    }

    // Fallback to basic execution
    return await this.executePhaseBasic(phase, enhancedPrompt);
  }

  /**
   * Execute phase through EnforcedWorkflowEngine (8 layers)
   */
  async executeWithEnforcementEngine(phase, prompt) {
    console.log(`\n🛡️  Executing with 8-layer enforcement...`);

    // CLI mode: Print prompt and signal awaiting response
    if (this.executionMode === EXECUTION_MODE.CLI) {
      this.printPromptForClaude(phase, prompt, true);
      return { awaitingResponse: true, prompt };
    }

    // API mode: Use original agentExecutor pattern
    const agentExecutor = async (sanitizedPrompt) => {
      // This should be overridden by the caller in API mode
      console.warn(`⚠️  API mode requires external agentExecutor`);
      return sanitizedPrompt;
    };

    try {
      const result = await this.enforcementEngine.executeCheckpoint(
        phase.id,
        prompt,
        agentExecutor,
      );

      if (result.success) {
        console.log(`✅ Phase ${phase.id} completed with enforcement`);
        console.log(`   Retries: ${result.retries}`);
        return { output: result.output };
      } else {
        console.error(`❌ Phase ${phase.id} failed: ${result.error}`);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`❌ Enforcement execution failed: ${error.message}`);
      // Fallback to basic execution on enforcement failure
      console.warn(`⚠️  Falling back to basic execution...`);
      return await this.executePhaseBasic(phase, prompt);
    }
  }

  /**
   * Execute orchestrator phase (BLOCKING - no AI involvement)
   * This method directly spawns orchestrator scripts, preventing AI bypass.
   * @param {Object} phase - Phase definition with type: "orchestrator"
   * @returns {Object} - { output, exitCode, orchestrator }
   */
  async executeOrchestratorPhase(phase) {
    const { spawnSync } = require('child_process');

    console.log(`\n🔧 Executing orchestrator: ${phase.orchestrator}`);
    console.log(`   Type: BLOCKING (AI cannot intercept)`);

    // Resolve orchestrator path
    const orchestratorPath = path.join(
      __dirname, '..', 'orchestrate', phase.orchestrator
    );

    if (!fs.existsSync(orchestratorPath)) {
      throw new Error(`Orchestrator not found: ${orchestratorPath}`);
    }

    // Resolve args with context variables
    const resolvedArgs = (phase.args || []).map(arg =>
      this.injectContextVars(arg, this.context)
    );

    console.log(`   Path: ${orchestratorPath}`);
    console.log(`   Args: ${resolvedArgs.join(' ')}`);

    // BLOCKING spawn - AI cannot intercept
    const result = spawnSync('node', [orchestratorPath, ...resolvedArgs], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
      timeout: phase.timeout || 600000 // 10 minutes default
    });

    // Log output
    if (result.stdout) {
      console.log(`\n--- Orchestrator Output ---`);
      // Truncate if too long
      const output = result.stdout.length > 5000
        ? result.stdout.substring(0, 5000) + '\n... (truncated)'
        : result.stdout;
      console.log(output);
      console.log(`--- End Output ---\n`);
    }

    if (result.stderr && result.status !== 0) {
      console.error(`\n--- Orchestrator Errors ---`);
      console.error(result.stderr);
      console.error(`--- End Errors ---\n`);
    }

    if (result.status !== 0) {
      throw new Error(`Orchestrator failed with exit code ${result.status}: ${result.stderr}`);
    }

    console.log(`✅ Orchestrator completed successfully`);

    return {
      output: result.stdout,
      exitCode: result.status,
      orchestrator: phase.orchestrator
    };
  }

  /**
   * Execute orchestrator-loop phase (loops over sub-features)
   * @param {Object} phase - Phase definition with type: "orchestrator-loop"
   * @returns {Object} - { outputs: [], success: boolean }
   */
  async executeOrchestratorLoop(phase) {
    console.log(`\n🔄 Executing orchestrator loop: ${phase.orchestrator}`);

    // Check condition
    if (phase.condition) {
      const conditionValue = this.injectContextVars(phase.condition, this.context);
      if (conditionValue === 'false' || !conditionValue) {
        console.log(`   Condition not met, skipping loop`);
        return { outputs: [], skipped: true };
      }
    }

    // Get loop items
    const loopItemsRaw = this.injectContextVars(phase.loopOver, this.context);
    let loopItems = [];

    try {
      loopItems = typeof loopItemsRaw === 'string'
        ? JSON.parse(loopItemsRaw)
        : loopItemsRaw;
    } catch {
      console.log(`   No items to loop over`);
      return { outputs: [], skipped: true };
    }

    if (!Array.isArray(loopItems) || loopItems.length === 0) {
      console.log(`   Empty loop items, skipping`);
      return { outputs: [], skipped: true };
    }

    console.log(`   Loop items: ${loopItems.join(', ')}`);

    const outputs = [];

    for (const item of loopItems) {
      console.log(`\n   Processing: ${item}`);

      // Build args with item substitution
      const itemContext = { ...this.context, item };
      const resolvedArgs = (phase.argsTemplate || []).map(arg =>
        this.injectContextVars(arg, itemContext)
      );

      // Execute orchestrator for this item
      const loopPhase = {
        ...phase,
        args: resolvedArgs,
        type: 'orchestrator'
      };

      try {
        const result = await this.executeOrchestratorPhase(loopPhase);
        outputs.push({ item, success: true, output: result.output });
      } catch (err) {
        console.error(`   Failed for ${item}: ${err.message}`);
        outputs.push({ item, success: false, error: err.message });
      }
    }

    const successCount = outputs.filter(o => o.success).length;
    console.log(`\n🔄 Loop complete: ${successCount}/${outputs.length} successful`);

    return { outputs, success: successCount === outputs.length };
  }

  /**
   * Basic phase execution (fallback when enforcement unavailable)
   */
  async executePhaseBasic(phase, enhancedPrompt) {
    // CLI mode: Print prompt and signal awaiting response
    if (this.executionMode === EXECUTION_MODE.CLI) {
      this.printPromptForClaude(phase, enhancedPrompt, false);
      return { awaitingResponse: true, prompt: enhancedPrompt };
    }

    // API mode: Return prompt (original behavior)
    console.log(`\n${"=".repeat(60)}`);
    console.log(`PHASE ${phase.id}: ${phase.name}`);
    console.log(`${"=".repeat(60)}\n`);
    console.log(enhancedPrompt);

    return { output: enhancedPrompt };
  }

  /**
   * Print prompt formatted for Claude to read and process (CLI mode)
   */
  printPromptForClaude(phase, prompt, enforced) {
    const separator = "═".repeat(70);
    const thinSep = "─".repeat(70);

    console.log(`\n${separator}`);
    console.log(`║ PHASE ${phase.id}: ${phase.name}`);
    console.log(`║ Mode: Claude Code CLI | Enforcement: ${enforced ? "ACTIVE" : "BASIC"}`);
    console.log(`${separator}\n`);

    // Print the actual prompt for Claude
    console.log(prompt);

    console.log(`\n${thinSep}`);
    console.log(`📌 INSTRUCTIONS FOR CLAUDE:`);
    console.log(`${thinSep}`);
    console.log(`1. Read the prompt above carefully`);
    console.log(`2. Generate the requested output following all constraints`);
    console.log(`3. After generating, user will run:`);
    console.log(`   node run-workflow-executor.js ${this.workflowName} ${this.context.feature || "<feature>"} --continue`);
    console.log(`${thinSep}`);
    console.log(`\n💡 Alternatively, Claude can directly validate and proceed by including`);
    console.log(`   the output in conversation context.\n`);
    console.log(`${separator}\n`);
  }

  /**
   * Render prompt with enforcement constraints injected
   */
  renderPromptWithConstraints(phase) {
    // Get base prompt from phase definition
    let prompt = "";

    if (phase.template && typeof phase.template === "function") {
      prompt = phase.template(this.context);
    } else if (phase.llmPrompt) {
      prompt = `${phase.llmPrompt.system || ""}\n\n${phase.llmPrompt.user || ""}`;
    } else if (phase.prompt) {
      prompt = phase.prompt;
    }

    // Inject context variables
    prompt = this.injectContextVars(prompt, this.context);

    // Add enforcement constraints
    if (phase.validation) {
      prompt += `\n\n${"━".repeat(60)}\n`;
      prompt += `⚠️  ENFORCEMENT CONSTRAINTS (8-Layer Defense Active)\n`;
      prompt += `${"━".repeat(60)}\n\n`;

      if (phase.validation.requiredSections) {
        prompt += `**Required sections** (MUST include):\n`;
        phase.validation.requiredSections.forEach((sec) => {
          prompt += `- ${sec}\n`;
        });
        prompt += `\n`;
      }

      if (phase.validation.mustInclude) {
        prompt += `**Required content** (MUST include):\n`;
        phase.validation.mustInclude.forEach((item) => {
          prompt += `- ${item}\n`;
        });
        prompt += `\n`;
      }

      if (phase.validation.forbiddenPatterns) {
        prompt += `**Forbidden patterns** (NEVER include):\n`;
        phase.validation.forbiddenPatterns.forEach((pattern) => {
          prompt += `- Pattern: ${pattern.toString()}\n`;
        });
        prompt += `\n`;
      }

      if (phase.validation.tableValidation) {
        prompt += `**Table requirements**:\n`;
        if (phase.validation.tableValidation.minRows) {
          prompt += `- Minimum rows: ${phase.validation.tableValidation.minRows}\n`;
        }
        prompt += `\n`;
      }

      prompt += `${"━".repeat(60)}\n`;
      prompt += `⚠️  ENFORCEMENT LAYERS:\n`;
      prompt += `   1. State Machine: Strict checkpoint progression\n`;
      prompt += `   2. Checkpoint Locks: One checkpoint at a time\n`;
      prompt += `   3. Gate Verifier: Prerequisites checked\n`;
      prompt += `   4. Prompt Sanitizer: Constraints injected\n`;
      prompt += `   5. Bypass Detector: Monitoring for bypass attempts\n`;
      prompt += `   6. Output Truncator: Boundary enforcement\n`;
      prompt += `   7. Validation: Quality checks on output\n`;
      prompt += `   8. User Approval: Required before proceeding\n`;
      prompt += `${"━".repeat(60)}\n`;
    }

    return prompt;
  }

  /**
   * Inject context variables into prompt
   */
  injectContextVars(prompt, context) {
    let result = prompt;

    // Replace {{context.varName}} with context.varName
    const regex = /\{\{context\.(\w+)\}\}/g;
    result = result.replace(regex, (match, varName) => {
      return context[varName] || match;
    });

    // Replace {{varName}} with context.varName (shorthand)
    const shorthandRegex = /\{\{(\w+)\}\}/g;
    result = result.replace(shorthandRegex, (match, varName) => {
      return context[varName] || match;
    });

    return result;
  }

  /**
   * Validate phase output against rules
   */
  validatePhaseOutput(phase, output) {
    const validation = phase.validation;
    if (!validation) return { pass: true, violations: [] };

    const violations = [];

    // Check required sections
    if (validation.requiredSections) {
      validation.requiredSections.forEach((section) => {
        if (!output.includes(section)) {
          violations.push(`Missing required section: ${section}`);
        }
      });
    }

    // Check required content
    if (validation.mustInclude) {
      validation.mustInclude.forEach((content) => {
        if (!output.includes(content)) {
          violations.push(`Missing required content: ${content}`);
        }
      });
    }

    // Check forbidden patterns
    if (validation.forbiddenPatterns) {
      validation.forbiddenPatterns.forEach((pattern) => {
        if (pattern.test(output)) {
          violations.push(`Forbidden pattern detected: ${pattern.toString()}`);
        }
      });
    }

    // Check table validation
    if (validation.tableValidation) {
      const tables = output.match(/\|.*\|/g) || [];
      const tableRows = tables.length;

      if (
        validation.tableValidation.minRows &&
        tableRows < validation.tableValidation.minRows
      ) {
        violations.push(
          `Table has only ${tableRows} rows, minimum ${validation.tableValidation.minRows} required`,
        );
      }
    }

    // Use BypassDetector for additional checks if available
    if (this.enforcementEngine) {
      const detector = new BypassDetector();
      const bypassResult = detector.detectBypass(output, phase.id);
      if (bypassResult.detected) {
        violations.push(`Bypass detected: ${bypassResult.violations.join(", ")}`);
      }
    }

    return {
      pass: violations.length === 0,
      violations,
    };
  }

  /**
   * Get current workflow state
   */
  getState() {
    const state = {
      workflowName: this.workflowName,
      currentPhase: this.currentPhase?.id || null,
      completedPhases: Object.keys(this.phaseOutputs),
      context: this.context,
      enforcementActive: !!this.enforcementEngine,
    };

    if (this.enforcementEngine) {
      state.enforcementState = this.enforcementEngine.getCurrentState();
      state.completedCheckpoints = Array.from(
        this.enforcementEngine.getCompletedCheckpoints(),
      );
    }

    return state;
  }

  /**
   * Enable/disable enforcement (for testing)
   */
  setEnforcementEnabled(enabled) {
    this.enforcementEnabled = enabled;
    if (!enabled && this.enforcementEngine) {
      this.enforcementEngine = null;
      console.log(`⚠️  Enforcement disabled`);
    }
  }
}

module.exports = { WorkflowExecutor };
