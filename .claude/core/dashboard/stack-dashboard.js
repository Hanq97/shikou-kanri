/**
 * Stack Dashboard - Multi-Stack Visualization Tool
 * Phase 0 Day 2 - Multi-Stack Infrastructure
 *
 * Purpose: Visualize stack configurations, variants, and comparisons
 * Features:
 * - Main dashboard view (all stacks/variants)
 * - Stack info view (variants, specialists, patterns)
 * - Variant info view (patterns, specialists, KB paths)
 * - Variant comparison view (side-by-side)
 * - ASCII art visualization with Unicode box-drawing
 *
 * Requirements:
 * - FR-W2-009: Display main view (all stacks/variants)
 * - FR-W2-010: Display stack info (variants, specialists, patterns)
 * - FR-W2-011: Display variant info (patterns, specialists, KB path)
 * - FR-W2-012: Compare 2 variants side-by-side
 * - NFR-W2-004: ASCII art visualization
 * - NFR-W2-005: Terminal width ≥80 chars
 */

const StackManager = require('../state/stack-manager');
const VariantSelector = require('../state/variant-selector');

class StackDashboard {
  constructor() {
    this.stackManager = new StackManager();
    this.terminalWidth = process.stdout.columns || 80;
  }

  /**
   * Initialize dashboard (load stacks)
   */
  async init() {
    await this.stackManager.loadStacks();
  }

  /**
   * CHECKPOINT 3.2: Display main dashboard view
   * FR-W2-009: Display all stacks and variants
   */
  displayMain() {
    this.printHeader('MULTI-STACK DASHBOARD v1.0');

    const stacks = this.stackManager.listStacks();
    console.log(`\nAvailable Stacks (${stacks.length}):\n`);

    stacks.forEach((stackId, index) => {
      const stack = this.stackManager.getStack(stackId);
      const variantCount = Object.keys(stack.variants).length;

      console.log(`${index + 1}. ${stackId}`.padEnd(40) + `(${variantCount} variant${variantCount > 1 ? 's' : ''})`);
      console.log(`   ${stack.name}`);
      console.log(`   Backend:  ${stack.backend}`);
      console.log(`   Frontend: ${stack.frontend}`);
      console.log(`   Database: ${stack.database}`);
      console.log('');
    });

    this.printFooter();
  }

  /**
   * CHECKPOINT 3.3: Display stack information
   * FR-W2-010: Display variants, specialists, patterns for a stack
   *
   * @param {string} stackId - Stack ID
   */
  displayStackInfo(stackId) {
    const stack = this.stackManager.getStack(stackId);
    if (!stack) {
      console.error(`❌ Stack '${stackId}' not found`);
      return;
    }

    this.printHeader(`STACK: ${stackId}`);

    console.log(`Name: ${stack.name}`);
    console.log(`Description: ${stack.description}`);
    console.log('');

    console.log('Technology Stack:');
    console.log(`  Backend:  ${stack.backend}`);
    console.log(`  Frontend: ${stack.frontend}`);
    console.log(`  Database: ${stack.database}`);
    console.log('');

    console.log(`Variants (${Object.keys(stack.variants).length}):\n`);

    for (const [variantId, variant] of Object.entries(stack.variants)) {
      const isDefault = stack.default_variant === variantId;
      console.log(`  ${variantId}${isDefault ? ' (default)' : ''}`);
      console.log(`    ${variant.description}`);

      const enabledPatterns = Object.entries(variant.patterns)
        .filter(([_, enabled]) => enabled === true)
        .map(([pattern, _]) => pattern);

      console.log(`    Patterns: ${enabledPatterns.length} enabled`);
      console.log(`    Specialists: ${variant.specialists.length}`);
      console.log('');
    }

    this.printFooter();
  }

  /**
   * CHECKPOINT 3.4: Display variant information
   * FR-W2-011: Display patterns, specialists, KB path for a variant
   *
   * @param {string} stackId - Stack ID
   * @param {string} variantId - Variant ID
   */
  displayVariantInfo(stackId, variantId) {
    const variantConfig = this.stackManager.getVariantConfig(stackId, variantId);
    if (!variantConfig) {
      console.error(`❌ Variant '${variantId}' not found in stack '${stackId}'`);
      return;
    }

    const stack = this.stackManager.getStack(stackId);
    const variant = stack.variants[variantId];
    this.printHeader(`VARIANT: ${stackId} / ${variantId}`);

    console.log(`Name: ${variant.name}`);
    console.log(`Description: ${variant.description}`);
    console.log('');

    // Patterns
    console.log('Patterns:\n');
    const enabledPatterns = [];
    const disabledPatterns = [];

    for (const [pattern, enabled] of Object.entries(variantConfig.patterns)) {
      if (enabled === true) {
        enabledPatterns.push(pattern);
      } else if (enabled === false) {
        disabledPatterns.push(pattern);
      }
    }

    console.log(`  ✅ Enabled (${enabledPatterns.length}):`);
    enabledPatterns.forEach(p => console.log(`     - ${p}`));

    if (disabledPatterns.length > 0) {
      console.log(`\n  ❌ Disabled (${disabledPatterns.length}):`);
      disabledPatterns.forEach(p => console.log(`     - ${p}`));
    }

    // Specialists
    console.log(`\n  Specialists (${variantConfig.specialists.length}):\n`);
    variantConfig.specialists.forEach(s => console.log(`     - ${s}`));

    // KB Paths
    console.log('\nKnowledge Base Paths:\n');
    for (const [type, kbPath] of Object.entries(variantConfig.kb_path || {})) {
      console.log(`  ${type}: ${kbPath}`);
    }

    this.printFooter();
  }

  /**
   * CHECKPOINT 3.5: Compare two variants side-by-side
   * FR-W2-012: Compare 2 variants with differences highlighted
   *
   * @param {string} stackId - Stack ID
   * @param {string} variant1Id - First variant ID
   * @param {string} variant2Id - Second variant ID
   */
  compareVariants(stackId, variant1Id, variant2Id) {
    const v1Config = this.stackManager.getVariantConfig(stackId, variant1Id);
    const v2Config = this.stackManager.getVariantConfig(stackId, variant2Id);

    if (!v1Config || !v2Config) {
      console.error(`❌ One or both variants not found`);
      return;
    }

    this.printHeader(`COMPARISON: ${variant1Id} vs ${variant2Id}`);

    const colWidth = Math.floor((this.terminalWidth - 4) / 2);

    // Headers
    console.log('');
    console.log(
      variant1Id.padEnd(colWidth) +
      ' │ ' +
      variant2Id.padEnd(colWidth)
    );
    console.log('─'.repeat(colWidth) + '─┼─' + '─'.repeat(colWidth));

    // Compare patterns
    console.log('\nPATTERNS:\n');

    const allPatterns = new Set([
      ...Object.keys(v1Config.patterns),
      ...Object.keys(v2Config.patterns)
    ]);

    for (const pattern of allPatterns) {
      const v1State = v1Config.patterns[pattern];
      const v2State = v2Config.patterns[pattern];

      if (v1State !== v2State) {
        const v1Display = v1State === true ? '✅' : v1State === false ? '❌' : '  ';
        const v2Display = v2State === true ? '✅' : v2State === false ? '❌' : '  ';

        console.log(
          `${v1Display} ${pattern}`.padEnd(colWidth) +
          ' │ ' +
          `${v2Display} ${pattern}`.padEnd(colWidth)
        );
      }
    }

    // Compare specialists
    console.log('\nSPECIALISTS:\n');

    const v1Specialists = new Set(v1Config.specialists);
    const v2Specialists = new Set(v2Config.specialists);

    const onlyInV1 = [...v1Specialists].filter(s => !v2Specialists.has(s));
    const onlyInV2 = [...v2Specialists].filter(s => !v1Specialists.has(s));

    if (onlyInV1.length > 0) {
      console.log(`Only in ${variant1Id}:`);
      onlyInV1.forEach(s => console.log(`  - ${s}`));
    }

    if (onlyInV2.length > 0) {
      console.log(`\nOnly in ${variant2Id}:`);
      onlyInV2.forEach(s => console.log(`  - ${s}`));
    }

    const common = [...v1Specialists].filter(s => v2Specialists.has(s));
    console.log(`\nCommon: ${common.length} specialists`);

    this.printFooter();
  }

  /**
   * Print dashboard header with Unicode box-drawing
   *
   * @param {string} title - Header title
   */
  printHeader(title) {
    const width = this.terminalWidth;
    const padding = Math.floor((width - title.length - 2) / 2);

    console.log('');
    console.log('╔' + '═'.repeat(width - 2) + '╗');
    console.log('║' + ' '.repeat(padding) + title + ' '.repeat(width - padding - title.length - 2) + '║');
    console.log('╚' + '═'.repeat(width - 2) + '╝');
  }

  /**
   * Print dashboard footer
   */
  printFooter() {
    console.log('─'.repeat(this.terminalWidth));
  }
}

// CLI Support
if (require.main === module) {
  (async () => {
    const dashboard = new StackDashboard();
    await dashboard.init();

    const command = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];

    switch (command) {
      case 'main':
        dashboard.displayMain();
        break;

      case 'info':
        if (!arg1) {
          console.error('Usage: node stack-dashboard.js info <stackId>');
          process.exit(1);
        }
        dashboard.displayStackInfo(arg1);
        break;

      case 'variant':
        if (!arg1 || !arg2) {
          console.error('Usage: node stack-dashboard.js variant <stackId> <variantId>');
          process.exit(1);
        }
        dashboard.displayVariantInfo(arg1, arg2);
        break;

      case 'compare':
        const stackId = arg1;
        const v1 = arg2;
        const v2 = process.argv[5];
        if (!stackId || !v1 || !v2) {
          console.error('Usage: node stack-dashboard.js compare <stackId> <variant1> <variant2>');
          process.exit(1);
        }
        dashboard.compareVariants(stackId, v1, v2);
        break;

      default:
        console.log('Usage:');
        console.log('  node stack-dashboard.js main');
        console.log('  node stack-dashboard.js info <stackId>');
        console.log('  node stack-dashboard.js variant <stackId> <variantId>');
        console.log('  node stack-dashboard.js compare <stackId> <variant1> <variant2>');
        process.exit(1);
    }
  })();
}

// Export for use in other modules
module.exports = StackDashboard;
