/**
 * Execute Command Configuration Validator
 * Week 15 - Day 0 Infrastructure
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

/**
 * Validate execute configuration
 * @param {Object} config - Execute configuration object
 * @returns {{valid: boolean, violations: string[]}}
 */
function validateExecuteConfig(config) {
  const violations = [];

  // Validate version
  if (!config.version) {
    violations.push('Missing version');
  }

  // Validate execution mode
  if (!config.execution_mode) {
    violations.push('Missing execution_mode');
  } else {
    if (config.execution_mode.llm_fallback === true) {
      violations.push('LLM fallback should be disabled for strict execution');
    }

    if (config.execution_mode.allow_deviation === true) {
      violations.push('Deviation should not be allowed for strict execution');
    }
  }

  // Validate context inheritance
  if (!config.context_inheritance) {
    violations.push('Missing context_inheritance');
  } else {
    const requiredContexts = ['stack', 'type', 'pattern', 'dependency', 'requirements'];

    for (const ctx of requiredContexts) {
      if (!config.context_inheritance.required_contexts.includes(ctx)) {
        violations.push(`Missing required context: ${ctx}`);
      }
    }
  }

  // Validate quality gates
  if (!config.quality_gates) {
    violations.push('Missing quality_gates');
  } else {
    const requiredGates = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];

    for (const gate of requiredGates) {
      if (!config.quality_gates.gates[gate]) {
        violations.push(`Missing quality gate: ${gate}`);
      } else {
        const gateConfig = config.quality_gates.gates[gate];

        // G5 (Coverage) can be 80%, others must be 100%
        const minThreshold = gate === 'G5' ? 80 : 100;

        if (gateConfig.threshold < minThreshold) {
          violations.push(`${gate} threshold too low (must be ≥${minThreshold}%)`);
        }
      }
    }
  }

  // Validate checkpoint system
  if (!config.checkpoint || !config.checkpoint.enabled) {
    violations.push('Checkpoint system must be enabled');
  }

  // Validate rollback mechanism
  if (!config.rollback || !config.rollback.enabled) {
    violations.push('Rollback mechanism must be enabled');
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Validate execution environment
 * @returns {{valid: boolean, violations: string[]}}
 */
function validateExecutionEnvironment() {
  const violations = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 18) {
    violations.push(`Node.js version must be ≥18.0.0 (current: ${nodeVersion})`);
  }

  // Check required tools
  const requiredTools = ['git', 'npm'];

  for (const tool of requiredTools) {
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' });
    } catch (error) {
      violations.push(`Required tool not found: ${tool}`);
    }
  }

  // Check disk space (in MB)
  try {
    const stats = fs.statfsSync(process.cwd());
    const availableSpaceMB = (stats.bavail * stats.bsize) / (1024 * 1024);

    if (availableSpaceMB < 1024) { // Less than 1GB
      violations.push(`Insufficient disk space (need ≥1GB, available: ${availableSpaceMB.toFixed(0)}MB)`);
    }
  } catch (error) {
    // statfsSync not available on all platforms, skip this check
    console.warn('Warning: Could not check disk space');
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

module.exports = {
  validateExecuteConfig,
  validateExecutionEnvironment
};
