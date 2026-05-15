"use strict";

/**
 * state-update — Non-destructive single-field update in context.md
 * Changes exactly ONE field/line — never rewrites entire file.
 *
 * Args:
 *   --field <name>       Field name, e.g. "Current State"
 *   --value <value>      New value for that field
 *   --contextPath <path> Explicit context.md path (optional; auto-detect if omitted)
 *
 * Returns: { updated, field, oldValue, newValue, contextFile }
 */

const fs = require("fs");
const path = require("path");

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const field = args.field;
    const value = args.value;

    if (!field || value === undefined) {
      return { error: "state-update requires --field and --value" };
    }

    try {
      // Resolve context file path
      let contextFile;
      if (args.contextPath) {
        contextFile = args.contextPath.endsWith("context.md")
          ? args.contextPath
          : path.join(args.contextPath, "context.md");
      } else {
        const { findActiveContext } = require(path.join(pkgRoot, "core/state/state-manager"));
        const contextPath = findActiveContext();
        if (!contextPath) {
          return { error: "No active context found and --contextPath not provided" };
        }
        contextFile = path.join(contextPath, "context.md");
      }

      if (!fs.existsSync(contextFile)) {
        return { error: `context.md not found: ${contextFile}` };
      }

      const content = fs.readFileSync(contextFile, "utf8");
      const lines = content.split("\n");

      // Pattern: "- **Field**: value" or "**Field**: value"
      const fieldPattern = new RegExp(`^([-\\s]*\\*\\*${escapeRegex(field)}\\*\\*:\\s*)(.+)$`);

      let updated = false;
      let oldValue = null;
      let newLines = lines.map((line) => {
        const match = line.match(fieldPattern);
        if (match && !updated) {
          oldValue = match[2].trim();
          updated = true;
          return match[1] + value;
        }
        return line;
      });

      if (!updated) {
        return { error: `Field "${field}" not found in context.md`, contextFile };
      }

      fs.writeFileSync(contextFile, newLines.join("\n"), "utf8");

      return { updated: true, field, oldValue, newValue: value, contextFile };
    } catch (err) {
      return { error: `state-update failed: ${err.message}` };
    }
  },
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
