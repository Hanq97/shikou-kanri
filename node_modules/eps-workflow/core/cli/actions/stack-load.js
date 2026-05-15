"use strict";

/**
 * stack-load — Load tech stack configuration
 * Reads from .claude/config/project-config.json or specialists/code/{stack}/stack.json
 *
 * Args: --stack <stackKey>  (optional, defaults to project default)
 * Returns: { stackKey, variantId, stackData, source }
 */

const fs = require("fs");
const path = require("path");

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    try {
      const StackManager = require(path.join(pkgRoot, "core/state/stack-manager"));
      const sm = new StackManager();

      await sm.loadStacks();

      // Determine target stack
      let stackKey = args.stack || null;
      let variantId = args.variant || null;

      if (!stackKey) {
        const defaults = sm.getDefaults();
        stackKey = defaults.stackId;
        variantId = variantId || defaults.variantId;
      }

      if (!variantId) {
        const variants = sm.listVariants(stackKey);
        variantId = variants[0] || "standard";
      }

      const stackData = sm.getVariantConfig(stackKey, variantId);

      return {
        stackKey,
        variantId,
        stackData,
        source: "stack-manager",
      };
    } catch (err) {
      // Fallback: try reading project-config.json directly
      try {
        const configPath = path.join(pkgRoot, ".claude/config/project-config.json");
        if (!fs.existsSync(configPath)) {
          return { error: "No stack config found", stackKey: null, variantId: null };
        }
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        const src = config.sourceRoots && config.sourceRoots[0];
        return {
          stackKey: src ? (src.stackKey || src.stack) : "unknown",
          variantId: src ? src.variant : "standard",
          stackData: config,
          source: "project-config",
        };
      } catch (fallbackErr) {
        return {
          error: `Stack load failed: ${err.message}; fallback: ${fallbackErr.message}`,
          stackKey: null,
          variantId: null,
        };
      }
    }
  },
};
