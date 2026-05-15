/**
 * StackResolver — Per-stack file loading with lazy resolution
 *
 * Replaces the old StackManager pattern of reading a single stacks.json file.
 * Reads from a single source of truth: aurea-code/defaults/config/stacks/
 *
 * Files:
 *   _index.json → lightweight registry
 *   {stack-key}.json → full stack definition (loaded on demand)
 *
 * API-compatible with StackManager for gradual migration.
 */

const fs = require('fs');
const path = require('path');

// Single source of truth — aurea-code/defaults/config/stacks/
const STACKS_DIR = path.resolve(__dirname, '../../defaults/config/stacks');

class StackResolver {
    constructor(stacksDir) {
        this.stacksDir = stacksDir || STACKS_DIR;
        this.index = null;       // _index.json content
        this.cache = new Map();  // stackKey → loaded JSON
        this.loaded = false;
    }

    /**
     * Load the stack index. Must be called before other methods.
     * @returns {Object} The loaded index
     */
    async loadStacks() {
        if (this.loaded) return this.index;

        const indexPath = path.join(this.stacksDir, '_index.json');
        if (!fs.existsSync(indexPath)) {
            throw new Error(`Stack index not found: ${indexPath}`);
        }

        this.index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        this.loaded = true;

        const stackCount = Object.keys(this.index.stacks || {}).length;
        console.log(`[StackResolver] Loaded index with ${stackCount} stacks`);

        return this.index;
    }

    /**
     * Get full stack definition (lazy-loaded from per-stack file)
     * @param {string} stackKey - e.g. 'java-spring-boot'
     * @returns {Object} Full stack definition
     */
    getStack(stackKey) {
        this._ensureLoaded();

        if (this.cache.has(stackKey)) {
            return this.cache.get(stackKey);
        }

        const entry = this.index.stacks[stackKey];
        if (!entry) {
            const available = Object.keys(this.index.stacks).join(', ');
            throw new Error(`Stack '${stackKey}' not found. Available: ${available}`);
        }

        const filePath = path.join(this.stacksDir, entry.file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Stack file not found: ${filePath}`);
        }

        const stackDef = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.cache.set(stackKey, stackDef);
        return stackDef;
    }

    /**
     * Get variant configuration within a stack
     * @param {string} stackKey
     * @param {string} variantId
     * @returns {Object} Variant config
     */
    getVariant(stackKey, variantId) {
        const stack = this.getStack(stackKey);

        if (!stack.variants || !stack.variants[variantId]) {
            const available = Object.keys(stack.variants || {}).join(', ');
            throw new Error(`Variant '${variantId}' not found in stack '${stackKey}'. Available: ${available}`);
        }

        return stack.variants[variantId];
    }

    /**
     * List all available stack keys
     * @returns {Array<string>}
     */
    listStacks() {
        this._ensureLoaded();
        return Object.keys(this.index.stacks);
    }

    /**
     * List all variants for a stack
     * @param {string} stackKey
     * @returns {Array<string>}
     */
    listVariants(stackKey) {
        const stack = this.getStack(stackKey);
        return Object.keys(stack.variants || {});
    }

    /**
     * Validate that a stack/variant combination exists
     * @param {string} stackKey
     * @param {string} variantId
     * @returns {boolean}
     */
    validateStack(stackKey, variantId) {
        this.getVariant(stackKey, variantId); // throws if invalid
        return true;
    }

    /**
     * Get defaults from project-config.json sourceRoots.
     * Returns the first sourceRoot's stack info as primary default.
     * @returns {Object} { stacks: [{stack, variant, type, path}], primary: {stackKey, variantId} }
     */
    getDefaults() {
        this._ensureLoaded();

        const projectConfigPath = path.join(process.cwd(), '.claude/config/project-config.json');
        if (!fs.existsSync(projectConfigPath)) {
            return { stacks: [], primary: { stackKey: null, variantId: null } };
        }

        const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
        const sourceRoots = projectConfig.sourceRoots || [];

        const stacks = sourceRoots.map(sr => ({
            stackKey: sr.stackKey || sr.stack || '',
            variant: sr.variant || 'default',
            label: sr.label || '',
            path: sr.path || ''
        }));

        // Primary = first sourceRoot with a stackKey defined, prefer backend
        const backend = stacks.find(s => s.label === 'backend' && s.stackKey);
        const primary = backend || stacks.find(s => s.stackKey) || { stackKey: null, variant: null };

        return {
            stacks,
            primary: {
                stackKey: primary.stackKey,
                variantId: primary.variant || 'default'
            }
        };
    }

    /**
     * Get full variant configuration with all metadata.
     * @param {string} [stackKey]
     * @param {string} [variantId]
     * @returns {Object} Complete variant config with stack metadata
     */
    getVariantConfig(stackKey, variantId) {
        if (!stackKey || !variantId) {
            const defaults = this.getDefaults();
            stackKey = stackKey || defaults.primary.stackKey;
            variantId = variantId || defaults.primary.variantId;
        }

        if (!stackKey) {
            throw new Error('No stack key provided and no default found in project-config.json');
        }

        const stack = this.getStack(stackKey);
        const variant = this.getVariant(stackKey, variantId);

        return {
            stackKey,
            stackName: stack.name,
            variantId,
            variantName: variant.name,
            variantDescription: variant.description,
            patterns: variant.patterns,
            specialists: variant.specialists,
            specialistDir: variant.specialistDir,
            kb_path: variant.kb_path,
            language: stack.language,
            framework: stack.framework,
            version: stack.version
        };
    }

    /**
     * Resolve stack key from language + framework
     * @param {string} language - e.g. 'java', 'typescript'
     * @param {string} framework - e.g. 'spring-boot', 'nextjs'
     * @returns {string|null} Stack key or null
     */
    resolveStackKey(language, framework) {
        this._ensureLoaded();

        // Direct match: language-framework
        const directKey = `${language}-${framework}`.toLowerCase();
        if (this.index.stacks[directKey]) {
            return directKey;
        }

        // Search by language + framework fields
        for (const [key, entry] of Object.entries(this.index.stacks)) {
            if (entry.language === language && entry.framework === framework) {
                return key;
            }
        }

        return null;
    }

    /**
     * Get specialist directory path(s) for a stack/variant
     * @param {string} stackKey
     * @param {string} variantId
     * @returns {string} Relative path under specialists/code/
     */
    getSpecialistDir(stackKey, variantId) {
        const variant = this.getVariant(stackKey, variantId);
        return variant.specialistDir || stackKey;
    }

    /**
     * Get all specialist names (flattened) for a stack/variant
     * @param {string} stackKey
     * @param {string} variantId
     * @returns {Array<string>} Flat list of specialist names
     */
    getSpecialists(stackKey, variantId) {
        const variant = this.getVariant(stackKey, variantId);
        const specialists = variant.specialists;

        if (!specialists) return [];

        // If array, return directly
        if (Array.isArray(specialists)) return specialists;

        // If object (categorized), flatten
        const flat = [];
        for (const category of Object.values(specialists)) {
            if (Array.isArray(category)) {
                flat.push(...category);
            }
        }
        return flat;
    }

    /**
     * Resolve ALL specialists for current project context.
     * Merges variant-specific (from stack JSON) + generic (from directory scan).
     * Generic specialists (Variant=ALL) on filesystem are included automatically.
     *
     * @param {Object} [query] - Optional filters
     * @param {string} [query.layer] - Filter by architecture layer
     * @param {string} [query.pattern] - Filter by implementation pattern name
     * @returns {string[]} - Deduped list of specialist file names
     */
    resolveSpecialists(query = {}) {
        this._ensureLoaded();

        const defaults = this.getDefaults();
        const stackKey = defaults.primary.stackKey;
        const variantId = defaults.primary.variantId;

        if (!stackKey) return [];

        // Source 1: existing stack JSON config (backward compat)
        let fromConfig;
        try {
            fromConfig = this.getSpecialists(stackKey, variantId);
        } catch {
            fromConfig = [];
        }

        // Source 2: scan specialist directory for files with metadata (additive)
        const scanResult = this._scanSpecialists(stackKey);

        // Filter scan results: include ALL + current variant
        const fromScan = scanResult.specialists
            .filter(s => s.variant.includes('ALL') || s.variant.includes(variantId))
            .map(s => s.file);

        // Union + dedup (BD D4: additive merge)
        let result = [...new Set([...fromConfig, ...fromScan])];

        // Optional: filter by layer
        if (query.layer) {
            const layerSpecs = scanResult.indexes.layer[query.layer] || [];
            const allLayerSpecs = scanResult.indexes.layer['ALL'] || [];
            const layerSet = new Set([...layerSpecs, ...allLayerSpecs]);
            result = result.filter(s => layerSet.has(s) || fromConfig.includes(s));
        }

        // Optional: filter by implementation pattern
        if (query.pattern) {
            const patternSpecs = scanResult.indexes.pattern[query.pattern] || [];
            if (patternSpecs.length > 0) {
                result = [...new Set([...result, ...patternSpecs])];
            }
        }

        return result;
    }

    /**
     * Scan specialist directory for .md files with Architecture Metadata.
     * Results cached in this.cache with key `scan:${stackKey}`.
     *
     * @param {string} stackKey
     * @returns {{ specialists: Array, indexes: { variant: Object, layer: Object, pattern: Object } }}
     */
    _scanSpecialists(stackKey) {
        const cacheKey = `scan:${stackKey}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const empty = { specialists: [], indexes: { variant: {}, layer: {}, pattern: {} } };

        // Get stack-level specialistDir (SP-03 adds this)
        let specialistDir;
        try {
            const stack = this.getStack(stackKey);
            specialistDir = stack.specialistDir;
            if (!specialistDir) {
                // Fallback: try first variant's specialistDir
                const variants = Object.values(stack.variants || {});
                specialistDir = variants[0]?.specialistDir;
            }
        } catch {
            this.cache.set(cacheKey, empty);
            return empty;
        }

        if (!specialistDir) {
            this.cache.set(cacheKey, empty);
            return empty;
        }

        // Resolve to absolute path
        const basePath = path.resolve(__dirname, '../../specialists/code', specialistDir);
        if (!fs.existsSync(basePath)) {
            this.cache.set(cacheKey, empty);
            return empty;
        }

        // Find all .md files recursively, excluding index/readme
        const skipFiles = new Set(['_INDEX.md', 'MASTER_INDEX.md', 'README.md']);
        const files = [];
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory()) {
                    walk(path.join(dir, entry.name));
                } else if (entry.name.endsWith('.md') && !skipFiles.has(entry.name)) {
                    files.push(path.join(dir, entry.name));
                }
            }
        };
        walk(basePath);

        // Parse metadata from each file
        const { parseArchMetadata } = require('../cli/actions/specialist-load.js');
        const specialists = [];

        for (const filePath of files) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const meta = parseArchMetadata(content);
                if (!meta || !meta.variant) continue;

                const variant = meta.variant.includes(',')
                    ? meta.variant.split(',').map(s => s.trim())
                    : meta.variant.includes('ALL') ? ['ALL'] : [meta.variant.trim()];

                const layer = meta.layer
                    ? (meta.layer.includes(',')
                        ? meta.layer.split(',').map(s => s.trim())
                        : [meta.layer.trim()])
                    : ['ALL'];

                specialists.push({
                    file: path.basename(filePath, '.md'),
                    path: filePath,
                    framework: meta.framework || stackKey,
                    architecture: meta.architecture || 'ANY',
                    variant,
                    layer,
                    sourcePaths: meta.sourcePaths
                        ? (typeof meta.sourcePaths === 'string'
                            ? meta.sourcePaths.split(',').map(s => s.trim()) : meta.sourcePaths)
                        : [],
                    implementationPatterns: meta.implementationPatterns || [],
                });
            } catch {
                // Skip unparseable files
            }
        }

        const indexes = this._buildIndexes(specialists);
        const result = { specialists, indexes };
        this.cache.set(cacheKey, result);
        return result;
    }

    /**
     * Build lookup indexes from scanned specialists.
     * @param {Array} specialists
     * @returns {{ variant: Object, layer: Object, pattern: Object }}
     */
    _buildIndexes(specialists) {
        const variant = {};
        const layer = {};
        const pattern = {};

        for (const spec of specialists) {
            for (const v of spec.variant) {
                if (!variant[v]) variant[v] = [];
                variant[v].push(spec.file);
            }
            for (const l of spec.layer) {
                if (!layer[l]) layer[l] = [];
                layer[l].push(spec.file);
            }
            for (const p of spec.implementationPatterns) {
                if (!pattern[p]) pattern[p] = [];
                pattern[p].push(spec.file);
            }
        }

        return { variant, layer, pattern };
    }

    /**
     * Get parsing configuration for a stack
     * @param {string} stackKey
     * @returns {Object} { parser, extractor, patterns, annotations, ... }
     */
    getParsingConfig(stackKey) {
        const stack = this.getStack(stackKey);
        return stack.parsing || {};
    }

    /**
     * Get architecture configuration for a stack
     * @param {string} stackKey
     * @returns {Object} { supportedArchitectures, autoDetection, layerMappings, ... }
     */
    getArchitectureConfig(stackKey) {
        const stack = this.getStack(stackKey);
        return stack.architecture || {};
    }

    /**
     * Get KB path for a specific type (backend, frontend, database)
     * @param {string} stackKey
     * @param {string} variantId
     * @param {string} type - 'backend', 'frontend', or 'database'
     * @returns {string|null} Absolute path to KB file or null
     */
    getKBPath(stackKey, variantId, type) {
        const variant = this.getVariant(stackKey, variantId);
        const relativePath = variant.kb_path && variant.kb_path[type];

        if (!relativePath) return null;

        if (path.isAbsolute(relativePath)) return relativePath;
        return path.join(process.cwd(), relativePath);
    }

    /**
     * Get extension-to-language mapping
     * @param {string} ext - e.g. '.java', '.ts'
     * @returns {string|null} Language name or null
     */
    getLanguageForExtension(ext) {
        this._ensureLoaded();
        return (this.index.extensionToLanguage || {})[ext] || null;
    }

    /**
     * Get possible stack keys for a language
     * @param {string} language
     * @returns {Array<string>} Stack keys
     */
    getStacksForLanguage(language) {
        this._ensureLoaded();
        return (this.index.languageToStacks || {})[language] || [];
    }

    /**
     * Get exclude patterns (global)
     * @returns {Array<string>}
     */
    getExcludePatterns() {
        this._ensureLoaded();
        return this.index.excludePatterns || [];
    }

    /**
     * Get priority patterns (global)
     * @returns {Object} { high: [], medium: [], low: [] }
     */
    getPriorityPatterns() {
        this._ensureLoaded();
        return this.index.priorityPatterns || {};
    }

    // ── Internal ──────────────────────────────────────────

    _ensureLoaded() {
        if (!this.loaded) {
            throw new Error('StackResolver not loaded. Call loadStacks() first.');
        }
    }
}

// Singleton for shared usage
let _instance = null;

/**
 * Get or create shared StackResolver instance
 * @param {string} [stacksDir] - Override stacks directory
 * @returns {StackResolver}
 */
function getStackResolver(stacksDir) {
    if (!_instance) {
        _instance = new StackResolver(stacksDir);
    }
    return _instance;
}

module.exports = { StackResolver, getStackResolver };

// CLI usage for testing
if (require.main === module) {
    (async () => {
        const resolver = new StackResolver();
        await resolver.loadStacks();

        console.log('\n=== Stack Resolver ===\n');
        console.log('Available stacks:', resolver.listStacks());

        const defaults = resolver.getDefaults();
        console.log('\nDefaults:', JSON.stringify(defaults.primary, null, 2));

        if (defaults.primary.stackKey) {
            const config = resolver.getVariantConfig();
            console.log('\nPrimary stack config:');
            console.log(`  Stack: ${config.stackName}`);
            console.log(`  Variant: ${config.variantName}`);
            console.log(`  Specialist dir: ${config.specialistDir}`);

            const specialists = resolver.getSpecialists(config.stackKey, config.variantId);
            console.log(`  Specialists: ${specialists.length}`);
        }

        // Test resolveStackKey
        console.log('\nResolve tests:');
        console.log('  java + spring-boot →', resolver.resolveStackKey('java', 'spring-boot'));
        console.log('  typescript + nextjs →', resolver.resolveStackKey('typescript', 'nextjs'));
        console.log('  python + fastapi →', resolver.resolveStackKey('python', 'fastapi'));
    })();
}
