"use strict";

/**
 * gemini-read — Read Gemini enrichment results from cache
 * Looks for gemini output files in cache/ directory.
 *
 * Args:
 *   --type <INNOVATE_SRS|INNOVATE_BD|INNOVATE_DD>  Call type to read (optional)
 *   --file <path>                                   Explicit file to read (optional)
 *
 * Returns: { found, type, content, filePath, timestamp }
 */

const fs = require("fs");
const path = require("path");

const GEMINI_CACHE_FILES = {
  INNOVATE_SRS: "cache/gemini-srs.json",
  INNOVATE_BD: "cache/gemini-bd.json",
  INNOVATE_DD: "cache/gemini-dd.json",
  default: "cache/gemini-result.json",
};

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    try {
      let filePath;

      if (args.file) {
        filePath = path.isAbsolute(args.file)
          ? args.file
          : path.join(pkgRoot, args.file);
      } else {
        const type = args.type || "default";
        const relative = GEMINI_CACHE_FILES[type] || GEMINI_CACHE_FILES.default;
        filePath = path.join(pkgRoot, relative);
      }

      if (!fs.existsSync(filePath)) {
        // Scan cache dir for any gemini result
        const cacheDir = path.join(pkgRoot, "cache");
        if (fs.existsSync(cacheDir)) {
          const geminiFiles = fs.readdirSync(cacheDir)
            .filter((f) => f.startsWith("gemini") && f.endsWith(".json"))
            .map((f) => path.join(cacheDir, f));

          if (geminiFiles.length > 0) {
            // Return the most recently modified
            geminiFiles.sort((a, b) => {
              return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
            });
            filePath = geminiFiles[0];
          }
        }

        if (!fs.existsSync(filePath)) {
          return { found: false, type: args.type || null, content: null, filePath };
        }
      }

      const raw = fs.readFileSync(filePath, "utf8");
      let content;
      try {
        content = JSON.parse(raw);
      } catch (_) {
        content = raw;
      }

      const stat = fs.statSync(filePath);

      return {
        found: true,
        type: args.type || null,
        content,
        filePath,
        timestamp: stat.mtime.toISOString(),
        sizeBytes: stat.size,
      };
    } catch (err) {
      return {
        found: false,
        error: `gemini-read failed: ${err.message}`,
        content: null,
        filePath: null,
      };
    }
  },
};
