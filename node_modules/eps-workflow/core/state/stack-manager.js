/**
 * StackManager - Backward-compatible wrapper around StackResolver
 *
 * DEPRECATED: Use StackResolver directly for new code.
 *   const { StackResolver } = require('./stack-resolver');
 *
 * This wrapper maintains the old StackManager API shape
 * while delegating to the new per-stack-file StackResolver.
 *
 * Migration: stacks.json (composite IDs) → stacks/ folder (per-tech keys)
 *   Old: sm.getStack('java-nextjs-postgres')
 *   New: resolver.getStack('java-spring-boot')
 */

const { StackResolver } = require('./stack-resolver');

class StackManager {
    constructor() {
        // Always use defaults (single source of truth via StackResolver)
        this.resolver = new StackResolver();
    }

    async loadStacks() {
        return await this.resolver.loadStacks();
    }

    getStack(stackKey) {
        return this.resolver.getStack(stackKey);
    }

    getVariant(stackKey, variantId) {
        return this.resolver.getVariant(stackKey, variantId);
    }

    listStacks() {
        return this.resolver.listStacks();
    }

    listVariants(stackKey) {
        return this.resolver.listVariants(stackKey);
    }

    validateStack(stackKey, variantId) {
        return this.resolver.validateStack(stackKey, variantId);
    }

    getDefaults() {
        const result = this.resolver.getDefaults();
        // Backward compat: return flat {stackId, variantId}
        return {
            stackId: result.primary.stackKey,
            variantId: result.primary.variantId
        };
    }

    getVariantConfig(stackKey, variantId) {
        const config = this.resolver.getVariantConfig(stackKey, variantId);
        // Backward compat: rename stackKey → stackId
        return {
            stackId: config.stackKey,
            stackName: config.stackName,
            variantId: config.variantId,
            variantName: config.variantName,
            variantDescription: config.variantDescription,
            patterns: config.patterns,
            specialists: config.specialists,
            kb_path: config.kb_path,
            language: config.language,
            framework: config.framework,
            version: config.version
        };
    }

    getBackendKBPath(stackKey, variantId) {
        return this.resolver.getKBPath(stackKey, variantId, 'backend');
    }

    getFrontendKBPath(stackKey, variantId) {
        return this.resolver.getKBPath(stackKey, variantId, 'frontend');
    }

    getDatabaseKBPath(stackKey, variantId) {
        return this.resolver.getKBPath(stackKey, variantId, 'database');
    }

    // New methods exposed through wrapper
    getSpecialistDir(stackKey, variantId) {
        return this.resolver.getSpecialistDir(stackKey, variantId);
    }

    getSpecialists(stackKey, variantId) {
        return this.resolver.getSpecialists(stackKey, variantId);
    }

    resolveStackKey(language, framework) {
        return this.resolver.resolveStackKey(language, framework);
    }

    getParsingConfig(stackKey) {
        return this.resolver.getParsingConfig(stackKey);
    }

    getArchitectureConfig(stackKey) {
        return this.resolver.getArchitectureConfig(stackKey);
    }
}

module.exports = StackManager;
