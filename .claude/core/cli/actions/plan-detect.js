"use strict";

/**
 * plan-detect — Detect plan files in memory-bank context directory
 *
 * Args:
 *   --contextPath <path>   Override active context (optional)
 *   --planDir <path>       Explicit plans directory to scan (optional)
 *
 * Returns: { found, planFiles, masterPlan, subPlans, contextPath }
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
      let plansDir = null;

      if (args.planDir) {
        plansDir = path.isAbsolute(args.planDir)
          ? args.planDir
          : path.join(pkgRoot, args.planDir);
      } else {
        let contextPath = args.contextPath || null;

        if (!contextPath) {
          const { findActiveContext } = require(path.join(pkgRoot, "core/state/state-manager"));
          contextPath = findActiveContext();
        }

        if (contextPath) {
          plansDir = path.join(contextPath, "plans");
        }
      }

      if (!plansDir || !fs.existsSync(plansDir)) {
        return {
          found: false,
          planFiles: [],
          masterPlan: null,
          subPlans: [],
          plansDir: plansDir || null,
        };
      }

      const allFiles = fs.readdirSync(plansDir)
        .filter((f) => f.endsWith(".md") || f.endsWith(".json"))
        .map((f) => {
          const fullPath = path.join(plansDir, f);
          const stat = fs.statSync(fullPath);
          return {
            name: f,
            path: fullPath,
            sizeBytes: stat.size,
            modified: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.modified) - new Date(a.modified));

      const masterPlan = allFiles.find((f) =>
        f.name.includes("master") || f.name.includes("plan.md") || f.name.includes("-plan-")
      ) || allFiles[0] || null;

      const subPlans = allFiles.filter((f) =>
        f.name.match(/SP-\d+/) || f.name.includes("sub-plan")
      );

      return {
        found: allFiles.length > 0,
        planFiles: allFiles,
        masterPlan: masterPlan ? masterPlan.path : null,
        subPlans: subPlans.map((f) => f.path),
        plansDir,
        count: allFiles.length,
      };
    } catch (err) {
      return {
        found: false,
        error: `plan-detect failed: ${err.message}`,
        planFiles: [],
        masterPlan: null,
        subPlans: [],
      };
    }
  },
};
