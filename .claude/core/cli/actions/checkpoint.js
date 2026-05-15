"use strict";

/**
 * checkpoint — Load or save EPS execution checkpoint
 * Handles both "checkpoint-load" and "checkpoint-save" actions.
 *
 * Args (save):
 *   --step <id>          Step identifier, e.g. "SP-1.3"
 *   --status <status>    COMPLETED | IN_PROGRESS | BLOCKED
 *   --data <json>        Optional JSON string with step result data
 *   --planFile <path>    Path to execution-state.json (optional)
 *
 * Args (load):
 *   --planFile <path>    Path to execution-state.json (optional)
 *
 * Returns: { action, step?, status?, checkpointFile, data? }
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_CHECKPOINT_FILE = "cache/execution-state.json";

module.exports = {
  run: async function (ctx) {
    const { action, args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const checkpointFile = args.planFile
      ? (path.isAbsolute(args.planFile) ? args.planFile : path.join(pkgRoot, args.planFile))
      : path.join(pkgRoot, DEFAULT_CHECKPOINT_FILE);

    try {
      if (action === "checkpoint-save") {
        return await saveCheckpoint(checkpointFile, args);
      } else {
        return await loadCheckpoint(checkpointFile, args);
      }
    } catch (err) {
      return { error: `${action} failed: ${err.message}`, checkpointFile };
    }
  },
};

async function loadCheckpoint(checkpointFile, args) {
  if (!fs.existsSync(checkpointFile)) {
    return {
      action: "checkpoint-load",
      found: false,
      checkpointFile,
      state: null,
    };
  }

  const raw = fs.readFileSync(checkpointFile, "utf8");
  const state = JSON.parse(raw);

  return {
    action: "checkpoint-load",
    found: true,
    checkpointFile,
    state,
    currentStep: state.currentStep || null,
    completedSteps: state.completedSteps || [],
    pendingSteps: state.pendingSteps || [],
    overallStatus: state.overallStatus || "UNKNOWN",
  };
}

async function saveCheckpoint(checkpointFile, args) {
  const step = args.step;
  const status = args.status || "COMPLETED";

  if (!step) {
    return { error: "checkpoint-save requires --step" };
  }

  // Ensure cache dir exists
  const dir = path.dirname(checkpointFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load existing or initialize
  let state = { completedSteps: [], pendingSteps: [], overallStatus: "IN_PROGRESS" };
  if (fs.existsSync(checkpointFile)) {
    try {
      state = JSON.parse(fs.readFileSync(checkpointFile, "utf8"));
    } catch (_) { /* keep default */ }
  }

  // Parse optional data
  let stepData = null;
  if (args.data) {
    try {
      stepData = JSON.parse(args.data);
    } catch (_) {
      stepData = args.data;
    }
  }

  // Update state
  state.currentStep = step;
  state.lastUpdated = new Date().toISOString();

  if (status === "COMPLETED") {
    if (!state.completedSteps.includes(step)) {
      state.completedSteps.push(step);
    }
    state.pendingSteps = (state.pendingSteps || []).filter((s) => s !== step);
  }

  if (stepData) {
    if (!state.stepResults) state.stepResults = {};
    state.stepResults[step] = stepData;
  }

  fs.writeFileSync(checkpointFile, JSON.stringify(state, null, 2), "utf8");

  return {
    action: "checkpoint-save",
    saved: true,
    step,
    status,
    checkpointFile,
    completedSteps: state.completedSteps,
  };
}
