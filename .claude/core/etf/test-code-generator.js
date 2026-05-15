'use strict';

/**
 * test-code-generator.js — Strategy-based test code generation.
 *
 * Layer: L2 MICRO-CMD
 * Pattern: Strategy (Backend vs Frontend) [BD Pattern 4]
 *
 * Loads specialist templates from ETF-SPEC (SP-4).
 * Generates actual test files using specialist-guided patterns.
 */

const fs = require('fs');
const path = require('path');
const schemas = require('./schemas.js');

class TestCodeGenerator {
  /**
   * @param {string} pkgRoot - Package root directory
   * @param {object} [options]
   * @param {object} [options.specialistLoader] - Specialist loader (injected for testing)
   */
  constructor(pkgRoot, options) {
    options = options || {};
    this.pkgRoot = pkgRoot;
    this._specialistLoader = options.specialistLoader || null;
  }

  /**
   * Generate test code from test plan.
   *
   * @param {object} testPlan - TestPlan from test-plan-generator
   * @param {object} scanResult - From SP-2 analysis pipeline
   * @param {object} moduleContext - Module context
   * @returns {Promise<object>} TestFile (SP-1 schema)
   */
  async generate(testPlan, scanResult, moduleContext) {
    const testCases = testPlan.testCases || [];
    if (testCases.length === 0) {
      return schemas.createTestFile({
        moduleId: testPlan.moduleId,
        files: [],
        language: 'java',
        framework: 'junit5',
      });
    }

    // Strategy: detect stack and route
    const stack = this._detectStack(scanResult, testCases);
    let files;

    if (stack === 'typescript-nextjs') {
      files = await this.generateFrontend(testCases, scanResult);
    } else {
      files = await this.generateBackend(testCases, scanResult);
    }

    // DD_FIRST: Prepend DataFactory + state factory setup files
    if (testPlan.testData) {
      const ddFiles = this._generateDDSetupFiles(testPlan.testData, stack);
      files = [...ddFiles, ...files];
    }

    // Add DD requirement annotations to test code
    if (scanResult.mode === 'DD_FIRST') {
      files = this._addDDAnnotations(files, testCases);
    }

    const language = stack === 'typescript-nextjs' ? 'typescript' : 'java';
    const framework = stack === 'typescript-nextjs' ? 'vitest' : 'junit5';

    return schemas.createTestFile({
      moduleId: testPlan.moduleId,
      files,
      language,
      framework,
    });
  }

  /**
   * Generate backend (Java reactive) test files.
   *
   * @param {object[]} testCases
   * @param {object} scanResult
   * @returns {Promise<object[]>} File descriptors
   */
  async generateBackend(testCases, scanResult) {
    const files = [];

    // Group test cases by target component
    const grouped = this._groupByComponent(testCases);

    for (const [component, cases] of Object.entries(grouped)) {
      const level = cases[0].level || 'unit';
      const specialistId = cases[0].specialistId || 'tps-java-reactive-' + level;

      // Load specialist template via specialist-load
      const template = await this._loadSpecialistTemplate(specialistId, 'java-reactive');

      // Generate test class content
      const content = this._generateJavaTestClass(component, cases, template, scanResult);
      const outputPath = this.resolveOutputPath(
        scanResult.moduleId, cases[0], 'java-reactive'
      );

      files.push({
        path: outputPath,
        content,
        lines: content.split('\n').length,
        testCaseIds: cases.map(c => c.id),
        level,
        specialistId,
      });
    }

    return files;
  }

  /**
   * Generate frontend (Next.js) test files.
   *
   * @param {object[]} testCases
   * @param {object} scanResult
   * @returns {Promise<object[]>} File descriptors
   */
  async generateFrontend(testCases, scanResult) {
    const files = [];

    const grouped = this._groupByComponent(testCases);

    for (const [component, cases] of Object.entries(grouped)) {
      const level = cases[0].level || 'unit';
      const specialistId = cases[0].specialistId || 'tps-nextjs-' + level;

      const template = await this._loadSpecialistTemplate(specialistId, 'typescript-nextjs');
      const content = this._generateTypeScriptTestFile(component, cases, template, scanResult);
      const outputPath = this.resolveOutputPath(
        scanResult.moduleId, cases[0], 'typescript-nextjs'
      );

      files.push({
        path: outputPath,
        content,
        lines: content.split('\n').length,
        testCaseIds: cases.map(c => c.id),
        level,
        specialistId,
      });
    }

    return files;
  }

  /**
   * Resolve output path for a test file.
   *
   * @param {string} moduleId
   * @param {object} testCase
   * @param {string} stack
   * @returns {string} Output file path
   */
  resolveOutputPath(moduleId, testCase, stack) {
    const component = testCase.targetComponent || 'General';
    const level = testCase.level || 'unit';

    if (stack === 'typescript-nextjs') {
      return path.join(
        '__tests__', level, component + '.test.tsx'
      );
    }

    // Java reactive
    return path.join(
      'src', 'test', 'java', 'com', moduleId.toLowerCase(),
      level, component + 'Test.java'
    );
  }

  // ── Internal Helpers ───────────────────────────────────────────────────

  _detectStack(scanResult, testCases) {
    // Check specialist IDs for stack hints
    for (const tc of testCases) {
      if (tc.specialistId && tc.specialistId.includes('nextjs')) return 'typescript-nextjs';
      if (tc.specialistId && tc.specialistId.includes('java')) return 'java-reactive';
    }

    // Fallback to scan result
    const apis = scanResult.apiContracts || [];
    if (apis.some(a => a.annotations && a.annotations.some(ann => ann.includes('Mapping')))) {
      return 'java-reactive';
    }

    return 'java-reactive';
  }

  _groupByComponent(testCases) {
    const groups = {};
    for (const tc of testCases) {
      const key = tc.targetComponent || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(tc);
    }
    return groups;
  }

  async _loadSpecialistTemplate(specialistId, stackHint) {
    const category = specialistId.includes('tps-') ? 'test-plan' : 'testing';
    const stackMap = {
      'java-reactive': { stack: 'java-spring-boot', variant: 'reactive' },
      'typescript-nextjs': { stack: 'typescript-nextjs', variant: 'default' },
    };
    const resolved = stackMap[stackHint];

    try {
      const specialistLoad = require(path.join(this.pkgRoot, 'core/cli/actions/specialist-load.js'));
      const baseArgs = { type: 'code', category };
      if (resolved) {
        baseArgs.stack = resolved.stack;
        baseArgs.variant = resolved.variant;
      }

      const result = await specialistLoad.run({
        args: { ...baseArgs, name: specialistId },
        pkgRoot: this.pkgRoot,
      });
      if (result.content) return result.content;
    } catch {
      // specialist-load unavailable — non-blocking
    }

    return '';
  }

  /**
   * Generate DD setup files: DataFactory (E2E) + state factory helpers.
   */
  _generateDDSetupFiles(testData, stack) {
    const files = [];

    if (testData.dataFactoryCode) {
      files.push({
        path: stack === 'typescript-nextjs'
          ? path.join('test', 'e2e', 'data-factory.ts')
          : path.join('src', 'test', 'java', 'helpers', 'DataFactory.java'),
        content: testData.dataFactoryCode,
        lines: testData.dataFactoryCode.split('\n').length,
        testCaseIds: [],
        level: 'e2e',
        specialistId: 'setup',
        type: 'setup',
      });
    }

    if (testData.stateFactories && testData.stateFactories.length > 0) {
      const content = this._generateStateFactoryCode(testData.stateFactories, stack);
      if (content) {
        files.push({
          path: stack === 'typescript-nextjs'
            ? path.join('test', 'helpers', 'state-factory.ts')
            : path.join('src', 'test', 'java', 'helpers', 'StateFactory.java'),
          content,
          lines: content.split('\n').length,
          testCaseIds: [],
          level: 'unit',
          specialistId: 'setup',
          type: 'helper',
        });
      }
    }

    if (testData.seedScript) {
      files.push({
        path: path.join('test', 'resources', 'seed.sql'),
        content: testData.seedScript,
        lines: testData.seedScript.split('\n').length,
        testCaseIds: [],
        level: 'integration',
        specialistId: 'setup',
        type: 'seed',
      });
    }

    return files;
  }

  _generateStateFactoryCode(stateFactories, stack) {
    if (!stateFactories || stateFactories.length === 0) return '';

    const lines = [];

    if (stack === 'typescript-nextjs') {
      lines.push('// Auto-generated state factory helpers');
      lines.push('// Generated by ETF test-code-generator.js');
      lines.push('');

      for (const factory of stateFactories) {
        const name = factory.workflowName || 'workflow';
        lines.push('export const ' + name + 'Transitions = {');
        lines.push('  valid: [');
        for (const t of (factory.validTransitions || [])) {
          lines.push("    { from: '" + t.from + "', to: '" + t.to + "', trigger: '" + t.trigger + "' },");
        }
        lines.push('  ],');
        lines.push('  invalid: [');
        for (const t of (factory.invalidTransitions || [])) {
          lines.push("    { from: '" + t.from + "', to: '" + t.to + "', trigger: '" + t.trigger + "' },");
        }
        lines.push('  ],');
        lines.push('};');
        lines.push('');
      }
    } else {
      lines.push('package helpers;');
      lines.push('');
      lines.push('import java.util.List;');
      lines.push('import java.util.Map;');
      lines.push('');
      lines.push('public class StateFactory {');

      for (const factory of stateFactories) {
        const name = (factory.workflowName || 'workflow').replace(/[^a-zA-Z0-9]/g, '');
        lines.push('  public static final List<Map<String, String>> ' + name + 'ValidTransitions = List.of(');
        for (const t of (factory.validTransitions || [])) {
          lines.push('    Map.of("from", "' + t.from + '", "to", "' + t.to + '", "trigger", "' + t.trigger + '"),');
        }
        lines.push('  );');
        lines.push('');
      }

      lines.push('}');
    }

    return lines.join('\n');
  }

  /**
   * Add DD requirement annotations as comments in generated test code.
   */
  _addDDAnnotations(files, testCases) {
    const reqMap = new Map();
    for (const tc of testCases) {
      if (tc.ddRequirement) {
        reqMap.set(tc.id, tc.ddRequirement);
      }
    }

    return files.map(file => {
      if (!file.testCaseIds || file.testCaseIds.length === 0) return file;

      const ddReqs = file.testCaseIds
        .map(id => reqMap.get(id))
        .filter(Boolean);

      if (ddReqs.length === 0) return file;

      const uniqueReqs = [...new Set(ddReqs)];
      const annotation = '// DD Requirements: ' + uniqueReqs.join(', ') + '\n';

      return {
        ...file,
        content: annotation + file.content,
        lines: file.lines + 1,
      };
    });
  }

  _generateJavaTestClass(component, cases, template, scanResult) {
    const className = component.replace(/[^a-zA-Z0-9]/g, '') + 'Test';
    const lines = [];

    lines.push('package com.' + (scanResult.moduleId || 'test').toLowerCase() + ';');
    lines.push('');
    lines.push('import org.junit.jupiter.api.Test;');
    lines.push('import org.junit.jupiter.api.DisplayName;');

    // Add imports based on test level
    const level = cases[0].level || 'unit';
    if (level === 'unit') {
      lines.push('import reactor.test.StepVerifier;');
    } else if (level === 'integration') {
      lines.push('import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;');
      lines.push('import org.springframework.test.web.reactive.server.WebTestClient;');
    }

    lines.push('');
    lines.push('/**');
    lines.push(' * Generated test class for ' + component);
    lines.push(' * Test cases: ' + cases.length);
    lines.push(' */');

    if (level === 'integration') {
      lines.push('@WebFluxTest');
    }
    lines.push('class ' + className + ' {');
    lines.push('');

    for (const tc of cases) {
      lines.push('    @Test');
      lines.push('    @DisplayName("' + (tc.name || '').replace(/"/g, '\\"') + '")');
      const methodName = 'test_' + (tc.name || 'case').replace(/[^a-zA-Z0-9]+/g, '_').substring(0, 60);
      lines.push('    void ' + methodName + '() {');
      lines.push('        // TODO: Implement - ' + (tc.description || tc.name));
      lines.push('    }');
      lines.push('');
    }

    lines.push('}');
    return lines.join('\n');
  }

  _generateTypeScriptTestFile(component, cases, template, scanResult) {
    const lines = [];

    lines.push("import { describe, it, expect } from 'vitest';");

    const level = cases[0].level || 'unit';
    if (level === 'unit') {
      lines.push("import { render, screen } from '@testing-library/react';");
    } else if (level === 'e2e') {
      lines.push("import { test } from '@playwright/test';");
    }

    lines.push('');
    lines.push("describe('" + component + "', () => {");

    for (const tc of cases) {
      const testName = (tc.name || 'test case').replace(/'/g, "\\'");
      lines.push("  it('" + testName + "', () => {");
      lines.push('    // TODO: Implement - ' + (tc.description || tc.name));
      lines.push('  });');
      lines.push('');
    }

    lines.push('});');
    return lines.join('\n');
  }
}

module.exports = { TestCodeGenerator };
