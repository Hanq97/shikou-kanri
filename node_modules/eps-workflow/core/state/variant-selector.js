/**
 * VariantSelector - Select variant and provide session context
 *
 * Responsibilities:
 * - Select variant (explicit or auto-detect)
 * - Provide pattern flags
 * - Provide specialist list
 * - Provide KB paths
 * - Validate variant compatibility
 *
 * @example
 * const StackManager = require('./stack-manager');
 * const VariantSelector = require('./variant-selector');
 * const sm = new StackManager();
 * await sm.loadStacks();
 * const selector = new VariantSelector(sm);
 * await selector.selectVariant('java-nextjs-postgres', 'lightweight');
 * const patterns = selector.getPatterns();
 */

class VariantSelector {
  constructor(stackManager) {
    if (!stackManager) {
      throw new Error('StackManager instance required');
    }
    this.stackManager = stackManager;
    this.selectedStack = null;
    this.selectedVariant = null;
    this.config = null;
  }

  /**
   * Select variant (explicit or default)
   * @param {string} stackId - Stack identifier (optional)
   * @param {string} variantId - Variant identifier (optional)
   * @returns {Promise<Object>} Selected variant configuration
   */
  async selectVariant(stackId, variantId) {
    // Load stacks if not already loaded
    if (!this.stackManager.stacks) {
      await this.stackManager.loadStacks();
    }

    // Use defaults if not provided
    if (!stackId || !variantId) {
      const defaults = this.stackManager.getDefaults();
      stackId = stackId || defaults.stackId;
      variantId = variantId || defaults.variantId;
    }

    // Get variant config
    this.config = this.stackManager.getVariantConfig(stackId, variantId);
    this.selectedStack = stackId;
    this.selectedVariant = variantId;

    console.log(`✅ Selected: ${stackId} / ${variantId}`);
    return this.config;
  }

  /**
   * Get pattern flags for current variant
   * @returns {Object} Pattern flags
   */
  getPatterns() {
    if (!this.config) {
      throw new Error('No variant selected. Call selectVariant() first.');
    }
    return this.config.patterns;
  }

  /**
   * Get specialist list for current variant
   * @returns {Array<string>} Specialist file names
   */
  getSpecialists() {
    if (!this.config) {
      throw new Error('No variant selected. Call selectVariant() first.');
    }
    return this.config.specialists;
  }

  /**
   * Get KB path for current variant
   * @param {string} type - 'backend', 'frontend', or 'database'
   * @returns {string} KB path
   */
  getKBPath(type = 'backend') {
    if (!this.config) {
      throw new Error('No variant selected. Call selectVariant() first.');
    }

    if (!this.config.kb_path[type]) {
      // Database KB is optional
      if (type === 'database') {
        return null;
      }
      throw new Error(`No ${type} KB path defined`);
    }

    return this.config.kb_path[type];
  }

  /**
   * Get all KB paths for current variant
   * @returns {Object} {backend, frontend, database}
   */
  getAllKBPaths() {
    if (!this.config) {
      throw new Error('No variant selected. Call selectVariant() first.');
    }
    return this.config.kb_path;
  }

  /**
   * Check if pattern is enabled in current variant
   * @param {string} patternName - Pattern name (e.g., 'use_jpa')
   * @returns {boolean} True if enabled
   */
  isPatternEnabled(patternName) {
    const patterns = this.getPatterns();
    return patterns[patternName] === true;
  }

  /**
   * Auto-detect variant based on project files
   * @param {string} stackId - Stack identifier
   * @returns {Promise<string>} Detected variant ID
   */
  async autoDetectVariant(stackId) {
    const fs = require('fs').promises;
    const stack = this.stackManager.getStack(stackId);

    // Java stack auto-detection
    if (stackId === 'java-nextjs-postgres') {
      try {
        // Check for pom.xml
        const pomContent = await fs.readFile('pom.xml', 'utf8');

        // Check for WebFlux (reactive)
        if (pomContent.includes('spring-boot-starter-webflux')) {
          console.log('🔍 Detected: WebFlux dependency → reactive variant');
          return 'reactive';
        }

        // Check for JPA (standard)
        if (pomContent.includes('spring-boot-starter-data-jpa')) {
          console.log('🔍 Detected: JPA dependency → standard variant');
          return 'standard';
        }

        // Check for JDBC (lightweight)
        if (pomContent.includes('spring-boot-starter-jdbc')) {
          console.log('🔍 Detected: JDBC dependency → lightweight variant');
          return 'lightweight';
        }

      } catch (error) {
        console.log('⚠️  Auto-detection failed (pom.xml not found), using default variant');
      }
    }

    // C# stack auto-detection
    if (stackId === 'csharp-react-mssql') {
      try {
        // Check for .csproj files
        const path = require('path');
        const { readdirSync } = require('fs');

        const csprojFiles = readdirSync('.')
          .filter(f => f.endsWith('.csproj'));

        if (csprojFiles.length > 0) {
          const csprojContent = await fs.readFile(csprojFiles[0], 'utf8');

          // Check for MediatR (NOT in simplified-clean)
          if (!csprojContent.includes('MediatR')) {
            console.log('🔍 Detected: No MediatR → simplified-clean variant');
            return 'simplified-clean';
          }
        }
      } catch (error) {
        console.log('⚠️  Auto-detection failed, using default variant');
      }
    }

    // NestJS stack auto-detection
    if (stackId === 'nestjs-blockchain') {
      try {
        const packageContent = await fs.readFile('package.json', 'utf8');
        const packageJson = JSON.parse(packageContent);

        if (packageJson.dependencies && packageJson.dependencies['@nestjs/core']) {
          console.log('🔍 Detected: NestJS project → default variant');
          return 'default';
        }
      } catch (error) {
        console.log('⚠️  Auto-detection failed, using default variant');
      }
    }

    // Default fallback
    console.log(`ℹ️  Using default variant: ${stack.default_variant}`);
    return stack.default_variant;
  }

  /**
   * Validate variant is compatible with project
   * @param {string} stackId - Stack identifier
   * @param {string} variantId - Variant identifier
   * @returns {Promise<Object>} Validation result {valid, warnings}
   */
  async validateVariant(stackId, variantId) {
    const fs = require('fs').promises;
    const variant = this.stackManager.getVariant(stackId, variantId);
    const warnings = [];

    // Java stack validation
    if (stackId === 'java-nextjs-postgres') {
      try {
        const pomContent = await fs.readFile('pom.xml', 'utf8');

        // Check JPA variant compatibility
        if (variantId === 'standard' && !pomContent.includes('spring-boot-starter-data-jpa')) {
          warnings.push('⚠️  Standard variant selected but JPA dependency not found in pom.xml');
        }

        // Check Lightweight variant compatibility
        if (variantId === 'lightweight' && pomContent.includes('spring-boot-starter-data-jpa')) {
          warnings.push('⚠️  Lightweight variant selected but JPA dependency found (may cause conflicts)');
        }

        // Check Reactive variant compatibility
        if (variantId === 'reactive' && !pomContent.includes('spring-boot-starter-webflux')) {
          warnings.push('⚠️  Reactive variant selected but WebFlux dependency not found');
        }

      } catch (error) {
        // pom.xml not found - might be a new project
        warnings.push('ℹ️  pom.xml not found - validation skipped (new project?)');
      }
    }

    // C# stack validation
    if (stackId === 'csharp-react-mssql') {
      try {
        const { readdirSync } = require('fs');
        const csprojFiles = readdirSync('.').filter(f => f.endsWith('.csproj'));

        if (csprojFiles.length > 0) {
          const csprojContent = await fs.readFile(csprojFiles[0], 'utf8');

          // Check simplified-clean variant
          if (variantId === 'simplified-clean' && csprojContent.includes('MediatR')) {
            warnings.push('⚠️  Simplified Clean variant selected but MediatR dependency found');
          }
        }
      } catch (error) {
        warnings.push('ℹ️  .csproj not found - validation skipped (new project?)');
      }
    }

    // NestJS stack validation
    if (stackId === 'nestjs-blockchain') {
      try {
        const packageContent = await fs.readFile('package.json', 'utf8');
        const packageJson = JSON.parse(packageContent);

        if (!packageJson.dependencies || !packageJson.dependencies['@nestjs/core']) {
          warnings.push('⚠️  NestJS variant selected but @nestjs/core not found in package.json');
        }
      } catch (error) {
        warnings.push('ℹ️  package.json not found - validation skipped (new project?)');
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
      variantId,
      variantName: variant.name
    };
  }

  /**
   * Get current selection info
   * @returns {Object} {stackId, variantId, config}
   */
  getCurrentSelection() {
    return {
      stackId: this.selectedStack,
      variantId: this.selectedVariant,
      config: this.config
    };
  }
}

module.exports = VariantSelector;
