/**
 * KB Loader - Variant-Aware Knowledge Base Loading
 * Phase 0 Day 2 - Multi-Stack Infrastructure
 *
 * Purpose: Load knowledge base files based on variant configuration
 * Features:
 * - Variant-specific KB path resolution
 * - Pattern-based KB filtering
 * - Multiple KB support (backend, frontend, database, etc.)
 * - Error handling with fallback
 * - 100% backward compatible
 *
 * Requirements:
 * - FR-W2-005: Load KB from variant.kb_path
 * - FR-W2-006: Support multiple KB files (backend+frontend)
 * - FR-W2-007: Filter KB patterns by enabled patterns
 * - FR-W2-008: Fallback to default KB
 * - NFR-W2-003: KB loading latency ≤100ms
 */

const path = require('path');
const fs = require('fs');

class KBLoader {
  constructor() {
    // Default KB paths
    this.defaultKBPaths = {
      backend: '.claude/utils/knowledge-base/backend-kb.json',
      frontend: '.claude/utils/knowledge-base/frontend-kb.json',
      database: '.claude/utils/knowledge-base/database-kb.json',
      devops: '.claude/utils/knowledge-base/devops-kb.json',
      'code-quality': '.claude/utils/knowledge-base/code-quality-kb.json'
    };

    // Cache for loaded KBs
    this.cache = {};
  }

  /**
   * CHECKPOINT 2.3: Load knowledge base with variant-aware path resolution
   *
   * @param {Object|null} variantContext - Variant context from VariantSelector
   * @returns {Object} - Loaded knowledge bases
   */
  loadKB(variantContext = null) {
    // FR-W2-008: Fallback to default KB if no variant context
    if (!variantContext) {
      return this.loadLegacyKB();
    }

    // FR-W2-006: Support multiple KB files
    const kbPaths = variantContext.kb_path || {};
    const kbs = {};

    // Load each KB type
    for (const [type, kbPath] of Object.entries(kbPaths)) {
      if (!kbPath) continue;

      try {
        // FR-W2-005: Load KB from variant.kb_path
        const fullPath = this.resolveKBPath(kbPath);
        const kb = this.loadJSON(fullPath);

        // FR-W2-007: Filter KB patterns by enabled patterns
        if (type === 'backend' || type === 'database') {
          kbs[type] = this.filterKBPatterns(kb, variantContext.patterns);
        } else {
          kbs[type] = kb;
        }

        console.log(`✅ Loaded ${type} KB: ${path.basename(kbPath)}`);
      } catch (error) {
        console.error(`⚠️ Warning: Could not load ${type} KB from ${kbPath}: ${error.message}`);
        // FR-W2-008: Fallback to default KB
        kbs[type] = this.loadDefaultKB(type);
      }
    }

    return kbs;
  }

  /**
   * CHECKPOINT 2.3: Resolve KB path relative to utils directory
   *
   * @param {string} kbPath - KB path from variant config
   * @returns {string} - Absolute path to KB file
   */
  resolveKBPath(kbPath) {
    // If already absolute, return as-is
    if (path.isAbsolute(kbPath)) {
      return kbPath;
    }

    // Resolve relative to project root (.claude/utils/knowledge-base -> project root = 3 levels up)
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    return path.resolve(projectRoot, kbPath);
  }

  /**
   * CHECKPOINT 2.4: Filter KB patterns based on enabled patterns
   *
   * @param {Object} kb - Knowledge base object
   * @param {Object} enabledPatterns - Patterns from variant config
   * @returns {Object} - Filtered knowledge base
   */
  filterKBPatterns(kb, enabledPatterns) {
    if (!kb || !kb.categories) {
      return kb;
    }

    return {
      ...kb,
      categories: kb.categories.map(category => ({
        ...category,
        patterns: category.patterns ? category.patterns.filter(pattern => {
          // Include pattern if:
          // 1. It has no requirements, OR
          // 2. All requirements are enabled (not explicitly set to false)
          if (!pattern.requires || pattern.requires.length === 0) {
            return true;
          }

          return pattern.requires.every(req => enabledPatterns[req] !== false);
        }) : []
      }))
    };
  }

  /**
   * Load JSON file with error handling
   *
   * @param {string} filePath - Path to JSON file
   * @returns {Object} - Parsed JSON object
   */
  loadJSON(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load/parse JSON from ${filePath}: ${error.message}`);
    }
  }

  /**
   * CHECKPOINT 2.5: Load default KB for a type
   *
   * @param {string} type - KB type (backend, frontend, database, etc.)
   * @returns {Object} - Default KB or empty object
   */
  loadDefaultKB(type) {
    const defaultPath = this.defaultKBPaths[type];
    if (!defaultPath) {
      console.warn(`⚠️  No default KB defined for type '${type}'`);
      return { categories: [] };
    }

    try {
      const fullPath = this.resolveKBPath(defaultPath);
      const kb = this.loadJSON(fullPath);
      console.log(`✅ Loaded default ${type} KB`);
      return kb;
    } catch (error) {
      console.error(`❌ Could not load default ${type} KB: ${error.message}`);
      return { categories: [] };
    }
  }

  /**
   * Legacy KB loading for backward compatibility
   *
   * @returns {Object} - Legacy KB structure
   */
  loadLegacyKB() {
    const kbs = {};

    for (const [type, kbPath] of Object.entries(this.defaultKBPaths)) {
      try {
        const fullPath = this.resolveKBPath(kbPath);
        kbs[type] = this.loadJSON(fullPath);
      } catch (error) {
        console.warn(`⚠️  Could not load default ${type} KB: ${error.message}`);
        kbs[type] = { categories: [] };
      }
    }

    return kbs;
  }

  /**
   * Get KB by type (convenience method)
   *
   * @param {string} type - KB type
   * @param {Object|null} variantContext - Variant context
   * @returns {Object} - KB for the specified type
   */
  async getKB(type, variantContext = null) {
    const kbs = this.loadKB(variantContext);
    return kbs[type] || { categories: [] };
  }

  /**
   * Preload KB into cache (for performance optimization)
   *
   * @param {Object} variantContext - Variant context
   */
  preloadKB(variantContext) {
    const cacheKey = JSON.stringify(variantContext);
    if (!this.cache[cacheKey]) {
      this.cache[cacheKey] = this.loadKB(variantContext);
    }
    return this.cache[cacheKey];
  }
}

// Export for use in other modules
module.exports = KBLoader;
