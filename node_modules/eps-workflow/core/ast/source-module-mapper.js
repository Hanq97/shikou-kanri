"use strict";

/**
 * Source Module Mapper — Config-Driven File-to-Module Mapping
 *
 * Maps source file paths to module codes by reading from feature-dictionary.json.
 * Framework-agnostic: works with any project that has a feature-dictionary config.
 *
 * Mapping strategy (priority order):
 * 1. Service API files → module code via service-name matching
 * 2. Feature folder → module code via folder-name matching
 * 3. Setting subfolder → module code via subfolder-name matching
 * 4. Fallback → '_shared'
 *
 * @module source-module-mapper
 */

const fs = require("fs");
const path = require("path");

// Cache
let _dictionary = null;
let _mappingRules = null;

/**
 * Load feature dictionary from config.
 * @param {string} [configPath] - Optional path to feature-dictionary.json
 * @returns {object} The parsed dictionary
 */
function loadDictionary(configPath) {
  if (_dictionary && !configPath) return _dictionary;

  const dictPath =
    configPath ||
    path.join(process.cwd(), '.claude/config/feature-dictionary.json');

  if (!fs.existsSync(dictPath)) {
    console.warn(
      `[source-module-mapper] feature-dictionary.json not found at ${dictPath}`,
    );
    return { modules: {} };
  }

  _dictionary = JSON.parse(fs.readFileSync(dictPath, "utf8"));
  _mappingRules = null; // Reset rules cache when dictionary changes
  return _dictionary;
}

/**
 * Build mapping rules from feature dictionary.
 * Each rule: { pattern: RegExp, moduleCode: string, priority: number }
 *
 * Rules are built dynamically from module names and subfeature folders.
 * @returns {Array<{pattern: RegExp, moduleCode: string, priority: number, source: string}>}
 */
function buildMappingRules() {
  if (_mappingRules) return _mappingRules;

  const dict = loadDictionary();
  const rules = [];

  for (const [code, mod] of Object.entries(dict.modules || {})) {
    const name = mod.name; // e.g., 'authentication', 'location', 'construction'
    const aliases = mod.pathAliases || []; // e.g., ['auth', 'user']

    // Collect all name variants: module name + aliases
    const allNames = [name, ...aliases];

    // Rule 1: services/api/{name-variant}.ts (highest priority)
    const serviceVariants = _buildServiceVariants(
      name,
      mod.subfeatures,
      aliases,
    );
    for (const variant of serviceVariants) {
      rules.push({
        pattern: new RegExp(
          `services[\\/\\\\]api[\\/\\\\]${variant}\\.tsx?$`,
          "i",
        ),
        moduleCode: code,
        priority: 100,
        source: `service:${variant}`,
      });
    }

    // Rule 2: features/{alias}/ folder (high priority) — includes pathAliases
    for (const n of allNames) {
      rules.push({
        pattern: new RegExp(
          `features[\\/\\\\]${_escapeRegex(n)}[\\/\\\\]`,
          "i",
        ),
        moduleCode: code,
        priority: 90,
        source: `feature:${n}`,
      });
    }

    // Rule 3: setting/{name-or-alias}/ folder — more specific than features/{name}
    // Priority 95: higher than feature folder match (90), because setting/factory
    // is more specific than features/setting/ (which would match SET)
    const settingNames = [name, ...aliases];
    for (const sn of settingNames) {
      const folderVariants = _buildFolderVariants(sn);
      for (const variant of folderVariants) {
        rules.push({
          pattern: new RegExp(`setting[\\/\\\\]${variant}[\\/\\\\]`, "i"),
          moduleCode: code,
          priority: 95,
          source: `setting-name:${sn}`,
        });
      }
    }

    // Rule 4: setting/{subfeature-folder}/ — subfeature folders are specific
    if (mod.subfeatures) {
      for (const [, sub] of Object.entries(mod.subfeatures)) {
        if (sub.folder) {
          const folderVariants = _buildFolderVariants(sub.folder);
          for (const variant of folderVariants) {
            rules.push({
              pattern: new RegExp(`setting[\\/\\\\]${variant}[\\/\\\\]`, "i"),
              moduleCode: code,
              priority: 95,
              source: `setting:${sub.folder}`,
            });
          }
        }
      }
    }

    // Rule 5: Any path containing module name or alias (low priority, broad match)
    for (const n of allNames) {
      rules.push({
        pattern: new RegExp(`[\\/\\\\]${_escapeRegex(n)}[\\/\\\\]`, "i"),
        moduleCode: code,
        priority: 30,
        source: `broad:${n}`,
      });
    }
  }

  // Sort by priority descending (highest first)
  rules.sort((a, b) => b.priority - a.priority);

  _mappingRules = rules;
  return rules;
}

/**
 * Map a file path to a module code.
 *
 * @param {string} filePath - Relative or absolute path to source file
 * @returns {string} Module code (e.g., 'AUT', 'LOC') or '_shared'
 */
function mapFileToModule(filePath) {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, "/");
  const rules = buildMappingRules();

  for (const rule of rules) {
    if (rule.pattern.test(normalized)) {
      return rule.moduleCode;
    }
  }

  return "_shared";
}

/**
 * Map all files to modules, returning a grouped result.
 *
 * @param {string[]} filePaths - Array of file paths
 * @returns {Object<string, string[]>} Map of moduleCode → [filePaths]
 */
function groupFilesByModule(filePaths) {
  const groups = {};

  for (const fp of filePaths) {
    const mod = mapFileToModule(fp);
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push(fp);
  }

  return groups;
}

/**
 * Get all known module codes from the dictionary.
 * @returns {string[]}
 */
function getModuleCodes() {
  const dict = loadDictionary();
  return Object.keys(dict.modules || {});
}

/**
 * Get module info by code.
 * @param {string} code - Module code (e.g., 'AUT')
 * @returns {object|null}
 */
function getModuleInfo(code) {
  const dict = loadDictionary();
  return (dict.modules || {})[code] || null;
}

// --- Private helpers ---

/**
 * Build service file name variants from module name and aliases.
 * Subfeature folders are NOT used for service matching — they only affect setting/ rules.
 * e.g., 'authentication' + aliases ['auth','user'] → ['authentication','auth','user']
 */
function _buildServiceVariants(moduleName, _subfeatures, aliases) {
  const variants = new Set();

  // Full name
  variants.add(_escapeRegex(moduleName));

  // Shortened name: 'authentication' → 'auth', 'construction' → 'construct'
  const shortMatch = moduleName.match(
    /^(\w{3,}?)(?:tion|ment|ing|ure|ory|ies)$/i,
  );
  if (shortMatch) {
    variants.add(_escapeRegex(shortMatch[1]));
  }

  // From pathAliases (explicit overrides from config)
  if (aliases) {
    for (const alias of aliases) {
      variants.add(_escapeRegex(alias));
    }
  }

  return [...variants];
}

/**
 * Build folder name variants (with/without hyphens, underscores).
 * e.g., 'mixer-truck' → ['mixertruck', 'mixer-truck', 'mixer_truck']
 */
function _buildFolderVariants(folderName) {
  const variants = new Set();
  const escaped = _escapeRegex(folderName);
  variants.add(escaped);

  // Without separator: 'mixer-truck' → 'mixertruck'
  const collapsed = folderName.replace(/[-_]/g, "");
  if (collapsed !== folderName) {
    variants.add(_escapeRegex(collapsed));
  }

  return [...variants];
}

/**
 * Escape special regex characters in a string.
 */
function _escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reset cached state (for testing).
 */
function resetCache() {
  _dictionary = null;
  _mappingRules = null;
}

// --- CLI mode ---
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    console.log("Usage: node source-module-mapper.js [options]");
    console.log("");
    console.log("Options:");
    console.log(
      "  --list              List all module codes and their mapping rules",
    );
    console.log("  --map <filePath>    Map a single file to its module code");
    console.log(
      "  --test <dir>        Scan directory and group files by module",
    );
    console.log("  --config <path>     Path to feature-dictionary.json");
    console.log("  --help              Show this help");
    process.exit(0);
  }

  const configIdx = args.indexOf("--config");
  if (configIdx !== -1 && args[configIdx + 1]) {
    loadDictionary(args[configIdx + 1]);
  }

  if (args.includes("--list")) {
    const rules = buildMappingRules();
    console.log(`\nMapping rules (${rules.length} total):\n`);
    for (const r of rules) {
      console.log(
        `  [P${r.priority}] ${r.moduleCode} ← ${r.source} (${r.pattern})`,
      );
    }
    console.log(`\nModule codes: ${getModuleCodes().join(", ")}`);
  }

  if (args.includes("--map")) {
    const fp = args[args.indexOf("--map") + 1];
    if (fp) {
      console.log(`${fp} → ${mapFileToModule(fp)}`);
    }
  }

  if (args.includes("--test")) {
    const dir = args[args.indexOf("--test") + 1];
    if (dir) {
      // Recursively find .ts/.tsx files
      const files = _findFiles(dir, /\.(tsx?|ts)$/);
      const groups = groupFilesByModule(files);

      console.log(`\nScanned ${files.length} files:\n`);
      for (const [mod, fps] of Object.entries(groups).sort()) {
        console.log(`  ${mod} (${fps.length} files)`);
        for (const f of fps.slice(0, 3)) {
          console.log(`    - ${path.relative(dir, f)}`);
        }
        if (fps.length > 3) {
          console.log(`    ... and ${fps.length - 3} more`);
        }
      }
    }
  }
}

function _findFiles(dir, pattern) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules"
      ) {
        results.push(..._findFiles(full, pattern));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(full);
      }
    }
  } catch (e) {
    // Skip unreadable directories
  }
  return results;
}

module.exports = {
  loadDictionary,
  buildMappingRules,
  mapFileToModule,
  groupFilesByModule,
  getModuleCodes,
  getModuleInfo,
  resetCache,
};
