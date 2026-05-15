"use strict";

/**
 * preserve-state — PreCompact state preservation (D26)
 * Saves EPS state snapshot to cache/preserved-state.json
 * before context compaction occurs.
 *
 * Args:
 *   --contextPath <path>   Override active context (optional)
 *   --outFile <path>       Override output path (default: cache/preserved-state.json)
 *
 * Returns: { saved, snapshotFile, state, timestamp }
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_OUT = "cache/preserved-state.json";

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const outFile = args.outFile
      ? (path.isAbsolute(args.outFile) ? args.outFile : path.join(pkgRoot, args.outFile))
      : path.join(pkgRoot, DEFAULT_OUT);

    try {
      const { findActiveContext, loadContext, getCurrentBranch } =
        require(path.join(pkgRoot, "core/state/state-manager"));

      const branch = getCurrentBranch();
      let contextPath = args.contextPath || null;
      if (!contextPath) {
        contextPath = findActiveContext();
      }

      const snapshot = {
        timestamp: new Date().toISOString(),
        branch,
        contextPath: contextPath || null,
        context: null,
        checkpointState: null,
      };

      if (contextPath) {
        try {
          snapshot.context = loadContext(contextPath);
        } catch (_) { /* non-fatal */ }

        // Also capture execution-state if present
        const execStateFile = path.join(pkgRoot, "cache/execution-state.json");
        if (fs.existsSync(execStateFile)) {
          try {
            snapshot.checkpointState = JSON.parse(fs.readFileSync(execStateFile, "utf8"));
          } catch (_) { /* non-fatal */ }
        }
      }

      // Ensure cache dir exists
      const cacheDir = path.dirname(outFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2), "utf8");

      return {
        saved: true,
        snapshotFile: outFile,
        state: snapshot.context ? snapshot.context.currentState : null,
        branch,
        timestamp: snapshot.timestamp,
        hasCheckpoint: snapshot.checkpointState !== null,
      };
    } catch (err) {
      return {
        saved: false,
        error: `preserve-state failed: ${err.message}`,
        snapshotFile: outFile,
      };
    }
  },
};
