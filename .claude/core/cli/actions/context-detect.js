"use strict";

/**
 * context-detect — Detect active feature context
 * Returns branch, current state, feature ID, context path.
 *
 * Args: (none required)
 * Returns: { found, branch, featureId, developer, state, contextPath, stack, variant }
 */

const path = require("path");

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    try {
      const {
        findActiveContext,
        loadContext,
        getCurrentBranch,
      } = require(path.join(pkgRoot, "core/state/state-manager"));

      const branch = getCurrentBranch();
      const contextPath = findActiveContext();

      if (!contextPath) {
        return {
          found: false,
          branch,
          featureId: null,
          developer: null,
          state: null,
          contextPath: null,
          stack: null,
          variant: null,
        };
      }

      const context = loadContext(contextPath);

      return {
        found: true,
        branch,
        featureId: context.featureName || null,
        developer: context.developerName || null,
        state: context.currentState || "INITIAL",
        contextPath,
        stack: context.stack || null,
        variant: context.variant || null,
        requirementFile: context.requirementFile || null,
        taskType: context.taskType || null,
        module: context.module || null,
        startedAt: context.startedAt || null,
        lastUpdated: context.lastUpdated || null,
      };
    } catch (err) {
      return {
        found: false,
        error: `context-detect failed: ${err.message}`,
        branch: null,
        featureId: null,
        state: null,
      };
    }
  },
};
