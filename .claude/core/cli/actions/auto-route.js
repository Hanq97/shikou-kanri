"use strict";

/**
 * auto-route — UserPromptSubmit auto-routing (D25)
 * Reads current EPS state, determines which handler/command should
 * process the incoming user prompt.
 *
 * Args:
 *   --prompt <text>      Incoming user prompt (required)
 *   --contextPath <path> Override context path (optional)
 *
 * Returns: { route, state, featureId, reason, handler }
 */

const path = require("path");

// v7.0: 2D route map — [state][taskType] with fallback to 'default'
// Each task type may have different next-step at the same state
const STATE_ROUTE_MAP = {
  INITIAL:              { default: { handler: "research", reason: "No work started — begin with /research" } },
  RESEARCH_SRS:         { default: { handler: "innovate", reason: "Research done — ready for /innovate" },
                          bugfix:  { handler: "plan", reason: "Bugfix — root cause analyzed, ready for /plan" } },
  RESEARCH_BD:          { default: { handler: "innovate", reason: "SRS done — ready for /innovate (BD)" } },
  RESEARCH_DD:          { default: { handler: "innovate", reason: "BD done — ready for /innovate (DD)" } },
  INNOVATE_SRS:         { default: { handler: "design-srs", reason: "Innovate done — generate SRS" } },
  INNOVATE_BD:          { default: { handler: "design-basic", reason: "Innovate done — generate Basic Design" } },
  INNOVATE_DD:          { default: { handler: "approve-innovate-dd", reason: "Innovate DD ready for approval" } },
  INNOVATE_DD_APPROVED: { default: { handler: "design-detail", reason: "Approved — generate Detail Design" } },
  SRS_CREATED:          { default: { handler: "research", reason: "SRS created — run /research for BD phase" } },
  BD_CREATED:           { default: { handler: "research", reason: "BD created — run /research for DD phase" },
                          enhancement: { handler: "plan", reason: "Enhancement — BD done, ready for /plan" } },
  DD_CREATING:          { default: { handler: "design-detail", reason: "DD generation in progress" } },
  DD_CREATED:           { default: { handler: "design-review", reason: "DD complete — run /design-review" } },
  DD_REVIEWED:          { default: { handler: "plan", reason: "DD reviewed — ready for /plan" } },
  PLAN_CREATED:         { default: { handler: "plan-review", reason: "Plan created — run /plan-review" } },
  PLAN_REVIEWED:        { default: { handler: "execute", reason: "Plan reviewed — ready for /execute" } },
  EXECUTED:             { default: { handler: "validate", reason: "Execution done — run /validate" } },
  VALIDATED:            { default: { handler: "test", reason: "Validated — run /test" } },
  TESTED:               { default: { handler: "done", reason: "Workflow complete" } },
  COMPLETED:            { default: { handler: "done", reason: "Workflow complete (legacy)" } },
  // v8.0: Architecture workflow states
  ARCH_IN_PROGRESS:     { default: { handler: "architect", reason: "Resume /architect workflow" } },
  ARCH_COMPLETED:       { default: { handler: "done", reason: "Architecture workflow complete" } },
};

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const userPrompt = args.prompt || "";

    try {
      const { findActiveContext, loadContext, getCurrentBranch } =
        require(path.join(pkgRoot, "core/state/state-manager"));

      let contextPath = args.contextPath || null;
      if (!contextPath) {
        contextPath = findActiveContext();
      }

      if (!contextPath) {
        return {
          route: "init",
          state: null,
          featureId: null,
          reason: "No active context — run state-manager.js init first",
          handler: "init",
          branch: getCurrentBranch(),
        };
      }

      const context = loadContext(contextPath);
      const currentState = context.currentState || "INITIAL";
      const taskType = context.taskType || "new";

      // v7.0: 2D lookup — [state][taskType] with fallback to default
      const stateRoutes = STATE_ROUTE_MAP[currentState];
      const routeEntry = stateRoutes
        ? (stateRoutes[taskType] || stateRoutes.default)
        : { handler: "research", reason: `Unrecognized state ${currentState} — defaulting to /research` };

      // Check if prompt keyword overrides route
      const promptLower = userPrompt.toLowerCase();
      let overrideHandler = null;
      if (promptLower.includes("/plan")) overrideHandler = "plan";
      else if (promptLower.includes("/execute")) overrideHandler = "execute";
      else if (promptLower.includes("/validate")) overrideHandler = "validate";
      else if (promptLower.includes("/design --srs")) overrideHandler = "design-srs";
      else if (promptLower.includes("/design --basic")) overrideHandler = "design-basic";
      else if (promptLower.includes("/design --detail")) overrideHandler = "design-detail";
      else if (promptLower.includes("/research")) overrideHandler = "research";
      else if (promptLower.includes("/innovate")) overrideHandler = "innovate";

      return {
        route: overrideHandler || routeEntry.handler,
        state: currentState,
        taskType: taskType,
        featureId: context.featureName,
        reason: overrideHandler ? `Explicit command in prompt` : routeEntry.reason,
        handler: overrideHandler || routeEntry.handler,
        contextPath,
        promptKeyword: overrideHandler,
      };
    } catch (err) {
      return {
        route: "unknown",
        state: null,
        featureId: null,
        error: `auto-route failed: ${err.message}`,
        handler: "unknown",
      };
    }
  },
};
