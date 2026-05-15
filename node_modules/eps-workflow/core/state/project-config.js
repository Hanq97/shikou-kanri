/**
 * Project Configuration Helper
 * Provides centralized access to project-config.json settings
 *
 * @module project-config
 * @version 1.0.0
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Cache for config
let cachedConfig = null;
let cachedRoot = null;
let cachedTechStack = null;

/**
 * Get repository root directory
 * @returns {string} Absolute path to repository root
 */
function getRepositoryRoot() {
  if (cachedRoot) return cachedRoot;

  try {
    cachedRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return cachedRoot;
  } catch (error) {
    // Fallback: traverse up from current directory
    let dir = process.cwd();
    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, ".git"))) {
        cachedRoot = dir;
        return cachedRoot;
      }
      dir = path.dirname(dir);
    }
    throw new Error("Not in a git repository");
  }
}

/**
 * Load project configuration
 * @returns {Object} Project configuration object
 */
function loadConfig() {
  if (cachedConfig) return cachedConfig;

  const root = getRepositoryRoot();
  const configPath = path.join(
    root,
    ".claude",
    "config",
    "project-config.json",
  );

  if (!fs.existsSync(configPath)) {
    // Return default config if file doesn't exist
    cachedConfig = {
      documentsPath: "documents",
    };
    return cachedConfig;
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    cachedConfig = JSON.parse(content);
    return cachedConfig;
  } catch (error) {
    console.warn(
      `Warning: Failed to parse project-config.json: ${error.message}`,
    );
    cachedConfig = {
      documentsPath: "documents",
    };
    return cachedConfig;
  }
}

/**
 * Get documents root directory path
 * @returns {string} Absolute path to documents directory
 */
function getDocumentsPath() {
  const config = loadConfig();
  const root = getRepositoryRoot();

  // Use configured path or default
  const relativePath = config.documentsPath || "documents";
  return path.join(root, relativePath);
}

/**
 * Get documents/features directory path
 * @returns {string} Absolute path to documents/features directory
 */
function getFeaturesPath() {
  return path.join(getDocumentsPath(), "features");
}

/**
 * Get documents/architecture directory path
 * @returns {string} Absolute path to documents/architecture directory
 */
function getArchitecturePath() {
  return path.join(getDocumentsPath(), "architecture");
}

/**
 * Get a specific config value
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Configuration value
 */
function get(key, defaultValue = null) {
  const config = loadConfig();
  return config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Get tech stack configuration from project-config.json
 * Returns sourceRoots array + infrastructure + testing — consumers iterate sourceRoots
 * @returns {{ sourceRoots: Array, infrastructure: Object, testing: Object }}
 */
function getTechStack() {
  if (cachedTechStack) return cachedTechStack;

  const config = loadConfig();
  cachedTechStack = {
    sourceRoots: config.sourceRoots || [],
    infrastructure: config.infrastructure || {},
    testing: config.testing || {},
  };
  return cachedTechStack;
}

/**
 * Clear config cache (useful for testing)
 */
function clearCache() {
  cachedConfig = null;
  cachedRoot = null;
  cachedTechStack = null;
}

module.exports = {
  getRepositoryRoot,
  loadConfig,
  getDocumentsPath,
  getFeaturesPath,
  getArchitecturePath,
  get,
  getTechStack,
  clearCache,
};
