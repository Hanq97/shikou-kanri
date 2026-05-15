"use strict";

/**
 * arch-detect — Detect architecture patterns from project files
 *
 * Reads project-config.json and source directory structure to
 * infer architecture pattern, ORM type, layers, etc.
 *
 * Args:
 *   --sourceRoot <path>   Specific source root to inspect (optional)
 *
 * Returns: { pattern, orm, layers, stack, variant, sourceRoots, conventions }
 */

const fs = require("fs");
const path = require("path");

// Known architecture patterns from source root config
const PATTERN_SIGNALS = {
  "Clean Architecture": ["domain", "application", "infrastructure", "presentation"],
  "Hexagonal": ["port", "adapter", "domain"],
  "MVC": ["controller", "service", "repository", "model"],
  "Layered": ["web", "service", "data"],
};

function detectLayersFromDirs(sourceRoot) {
  if (!fs.existsSync(sourceRoot)) return [];
  const found = [];
  try {
    const entries = fs.readdirSync(sourceRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        found.push(entry.name.toLowerCase());
      }
    }
  } catch (_) { /* non-fatal */ }
  return found;
}

function matchArchPattern(dirs) {
  for (const [pattern, signals] of Object.entries(PATTERN_SIGNALS)) {
    const matchCount = signals.filter((s) => dirs.some((d) => d.includes(s))).length;
    if (matchCount >= 2) return pattern;
  }
  return "Unknown";
}

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    try {
      // Load project-config.json
      const configPath = path.join(pkgRoot, ".claude/config/project-config.json");
      if (!fs.existsSync(configPath)) {
        return { error: ".claude/config/project-config.json not found", pattern: null };
      }

      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const sourceRoots = config.sourceRoots || [];

      if (sourceRoots.length === 0) {
        return { error: "No sourceRoots defined in project-config.json", pattern: null };
      }

      const results = [];

      for (const src of sourceRoots) {
        const rootPath = args.sourceRoot
          ? path.join(pkgRoot, args.sourceRoot)
          : path.join(pkgRoot, src.path || "");

        const dirs = detectLayersFromDirs(rootPath);
        const detected = src.architecture || matchArchPattern(dirs);

        results.push({
          path: src.path,
          type: src.label || src.type,
          stack: src.stackKey || src.stack,
          variant: src.variant,
          language: src.language,
          framework: src.framework,
          architecture: detected,
          orm: src.patterns ? (src.patterns.orm || null) : null,
          api: src.patterns ? (src.patterns.api || null) : null,
          detectedLayers: dirs.slice(0, 10),
          conventions: src.conventions || null,
        });
      }

      // Primary (first backend root)
      const primary = results.find((r) => r.type === "backend") || results[0];

      return {
        pattern: primary ? primary.architecture : "Unknown",
        orm: primary ? primary.orm : null,
        stack: primary ? primary.stack : null,
        variant: primary ? primary.variant : null,
        language: primary ? primary.language : null,
        framework: primary ? primary.framework : null,
        sourceRoots: results,
        conventions: primary ? primary.conventions : null,
        projectId: config.projectId || null,
      };
    } catch (err) {
      return {
        pattern: null,
        error: `arch-detect failed: ${err.message}`,
        sourceRoots: [],
      };
    }
  },
};
