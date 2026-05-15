/**
 * Execute Command Infrastructure Setup
 * Week 15 - Day 0 Infrastructure
 */

const fs = require('fs');
const path = require('path');
const {
  DIR_BASE,
  DIR_CHECKPOINTS,
  DIR_SNAPSHOTS,
  DIR_REPORTS,
  DIR_TEMP,
  DIR_LOGS,
  FILE_CONFIG
} = require('./execute-constants');
const { validateExecuteConfig } = require('./execute-validator');

/**
 * Main setup function
 */
function setupExecuteInfrastructure() {
  console.log('🔧 Setting up Execute Command infrastructure...\n');

  // Step 1: Create directories
  createDirectories();

  // Step 2: Create config file
  createConfigFile();

  // Step 3: Validate setup
  validateSetup();

  // Step 4: Create integration points
  setupIntegrationPoints();

  console.log('\n✅ Execute infrastructure setup complete!');
}

/**
 * Create directory structure
 */
function createDirectories() {
  const directories = [
    DIR_CHECKPOINTS,
    DIR_SNAPSHOTS,
    DIR_REPORTS,
    DIR_TEMP,
    DIR_LOGS
  ];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✓ Created: ${dir}`);
    } else {
      console.log(`  ↷ Exists: ${dir}`);
    }
  }
}

/**
 * Create config file if not exists
 */
function createConfigFile() {
  if (!fs.existsSync(FILE_CONFIG)) {
    const defaultConfig = loadDefaultConfig();
    fs.writeFileSync(FILE_CONFIG, JSON.stringify(defaultConfig, null, 2));
    console.log(`  ✓ Created: ${FILE_CONFIG}`);
  } else {
    console.log(`  ↷ Exists: ${FILE_CONFIG}`);
  }
}

/**
 * Load default configuration
 * @returns {Object} Default configuration
 */
function loadDefaultConfig() {
  return {
    version: '1.0.0',
    enabled: true,
    execution_mode: {
      template_first: true,
      llm_fallback: false,
      strict_validation: true,
      allow_deviation: false
    },
    context_inheritance: {
      enabled: true,
      required_contexts: ['stack', 'type', 'pattern', 'dependency', 'requirements']
    },
    quality_gates: {
      enabled: true,
      gates: {
        G1: { name: 'Syntax Validation', enabled: true, threshold: 100, blocking: true },
        G2: { name: 'Linting', enabled: true, threshold: 100, blocking: true },
        G3: { name: 'Tests Generated', enabled: true, threshold: 100, blocking: true },
        G4: { name: 'Tests Passed', enabled: true, threshold: 100, blocking: true },
        G5: { name: 'Coverage', enabled: true, threshold: 80, blocking: true },
        G6: { name: 'Security Scan', enabled: true, threshold: 100, blocking: true }
      }
    },
    checkpoint: {
      enabled: true,
      save_after_each_step: true,
      checkpoint_dir: '.claude/execute/checkpoints/',
      max_checkpoints: 100,
      auto_cleanup: true
    },
    rollback: {
      enabled: true,
      snapshot_dir: '.claude/execute/snapshots/',
      max_snapshots: 10,
      auto_snapshot_before_execute: true
    },
    pattern_learning: {
      enabled: true,
      extract_on_success: true,
      min_confidence: 90,
      storage_dir: '.claude/memory-bank/eps-enhancement/week-6/patterns/'
    },
    multi_stack: {
      enabled: true,
      supported_stacks: [
        'java-nextjs-postgres',
        'csharp-react-mssql',
        'nestjs-blockchain',
        'fastapi-react-postgres'
      ],
      auto_load_kb: true,
      auto_select_specialists: true
    },
    reporting: {
      enabled: true,
      report_dir: '.claude/execute/reports/',
      generate_after_execute: true,
      include_metrics: true
    },
    integrations: {
      week_2_confidence: true,
      week_6_patterns: true,
      week_14_multi_stack: true
    }
  };
}

/**
 * Validate setup
 */
function validateSetup() {
  console.log('\n🛡️ Validating setup...');

  // Check directories
  const requiredDirs = [DIR_CHECKPOINTS, DIR_SNAPSHOTS, DIR_REPORTS, DIR_TEMP, DIR_LOGS];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Missing directory: ${dir}`);
    }
  }

  // Check config
  const config = JSON.parse(fs.readFileSync(FILE_CONFIG, 'utf8'));
  const validation = validateExecuteConfig(config);

  if (!validation.valid) {
    console.error('  ✗ Config validation failed:');
    validation.violations.forEach(v => console.error(`    - ${v}`));
    throw new Error('Configuration validation failed');
  }

  console.log('  ✓ All validations passed');
}

/**
 * Setup integration points
 */
function setupIntegrationPoints() {
  console.log('\n🔗 Setting up integration points...');

  const config = JSON.parse(fs.readFileSync(FILE_CONFIG, 'utf8'));

  // Week 2 Confidence Engine
  if (config.integrations.week_2_confidence) {
    try {
      verifyConfidenceEngine();
      console.log('  ✓ Week 2 Confidence Engine: OK');
    } catch (error) {
      console.warn(`  ⚠ Week 2 Confidence Engine: ${error.message}`);
    }
  }

  // Week 6 Pattern Learning
  if (config.integrations.week_6_patterns) {
    try {
      verifyPatternLearning();
      console.log('  ✓ Week 6 Pattern Learning: OK');
    } catch (error) {
      console.warn(`  ⚠ Week 6 Pattern Learning: ${error.message}`);
    }
  }

  // Week 14 Multi-Stack
  if (config.integrations.week_14_multi_stack) {
    try {
      verifyMultiStack();
      console.log('  ✓ Week 14 Multi-Stack: OK');
    } catch (error) {
      console.warn(`  ⚠ Week 14 Multi-Stack: ${error.message}`);
    }
  }
}

/**
 * Verify Confidence Engine integration
 */
function verifyConfidenceEngine() {
  const confidenceFile = '.claude/utils/confidence-engine-v2.js';

  if (!fs.existsSync(confidenceFile)) {
    throw new Error(`Not found: ${confidenceFile}`);
  }
}

/**
 * Verify Pattern Learning integration
 */
function verifyPatternLearning() {
  // Check for pattern learning directory
  const patternDir = '.claude/memory-bank/eps-enhancement/week-6/';

  if (!fs.existsSync(patternDir)) {
    console.warn(`  Creating pattern directory: ${patternDir}`);
    fs.mkdirSync(patternDir, { recursive: true });
  }
}

/**
 * Verify Multi-Stack integration
 */
function verifyMultiStack() {
  const { getTechStack } = require("../state/project-config.js");
  const { getStackResolver } = require("../state/stack-resolver.js");
  const ts = getTechStack();
  const resolver = getStackResolver();

  for (const root of ts.sourceRoots) {
    const stackId = root.stackKey || root.stack;
    const stackDef = resolver.getStack(stackId);
    if (!stackDef) {
      throw new Error(`Stack not found in config: ${stackId}`);
    }
  }
}

// Export
module.exports = {
  setupExecuteInfrastructure
};

// Run if called directly
if (require.main === module) {
  try {
    setupExecuteInfrastructure();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}
