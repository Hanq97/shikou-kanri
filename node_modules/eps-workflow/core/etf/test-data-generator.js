'use strict';

/**
 * test-data-generator.js — Generate test data from DD constraints using EP + BVA.
 *
 * Layer: L6 ENGINE
 * Pattern: Equivalence Partitioning + Boundary Value Analysis
 *
 * Input: DDMetadata (entities with field constraints) + optional DBSchemaMetadata
 * Output: TestDataFixture (validSets, invalidSets, boundaryValues per entity)
 *
 * Dependency: @faker-js/faker (seeded for reproducibility)
 */

class TestDataGenerator {
  /**
   * @param {number|string} fakerSeed - Seed for deterministic random data.
   *   Convention: hash of moduleId for reproducibility.
   */
  constructor(fakerSeed) {
    this._faker = null;
    this._seed = typeof fakerSeed === 'string' ? this._hashString(fakerSeed) : (fakerSeed || 42);
  }

  _getFaker() {
    if (!this._faker) {
      const { faker } = require('@faker-js/faker');
      faker.seed(this._seed);
      this._faker = faker;
    }
    return this._faker;
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Generate complete test data fixture from DD constraints.
   *
   * @param {object} ddMetadata - DDMetadata (entities, workflows)
   * @param {object} [dbSchema] - Optional DBSchemaMetadata for constraint enrichment
   * @returns {object} TestDataFixture (from schemas.js)
   */
  generate(ddMetadata, dbSchema) {
    const schemas = require('./schemas.js');

    if (!ddMetadata || !ddMetadata.entities) {
      return schemas.createTestDataFixture({ entities: [], stateFactories: [] });
    }

    // 1. Generate EP + BVA per entity field
    const entities = [];
    for (const entity of ddMetadata.entities) {
      const validSets = [];
      const invalidSets = [];
      const boundaryValues = [];

      for (const field of (entity.fields || [])) {
        const constraints = this._mergeConstraints(field, entity.name, dbSchema);
        const ep = this.generateEP(constraints);
        const bva = this.generateBVA(constraints);

        for (const v of ep.validSets) { v.field = field.name; }
        for (const v of ep.invalidSets) { v.field = field.name; }
        for (const v of bva.boundaryValues) { v.field = field.name; }

        validSets.push(...ep.validSets);
        invalidSets.push(...ep.invalidSets);
        boundaryValues.push(...bva.boundaryValues);
      }

      entities.push({ name: entity.name, validSets, invalidSets, boundaryValues });
    }

    // 2. State machine transitions from workflows
    const stateFactories = [];
    for (const workflow of (ddMetadata.workflows || [])) {
      const transitions = this.generateStateTransitions(workflow);
      stateFactories.push({
        workflowName: workflow.name || 'unnamed',
        ...transitions,
      });
    }

    // 3. DataFactory code for Playwright E2E
    const dataFactoryCode = this._generateDataFactoryCode(entities);

    // 4. Seed SQL for TestContainers
    const seedScript = this._generateSeedSQL(entities);

    return schemas.createTestDataFixture({ entities, stateFactories, dataFactoryCode, seedScript });
  }

  /**
   * Merge field constraints from DD definition + DB schema.
   * DB constraints override DD when both present.
   */
  _mergeConstraints(field, entityName, dbSchema) {
    const spec = {
      name: field.name,
      type: (field.type || 'string').toLowerCase(),
      required: false,
      min: undefined,
      max: undefined,
      maxLength: undefined,
      minLength: undefined,
      enum: undefined,
      regex: undefined,
    };

    const constraintStr = (field.constraints || '').toLowerCase();
    if (constraintStr.includes('not null') || constraintStr.includes('required')) spec.required = true;

    const maxLenMatch = constraintStr.match(/maxlength\s*[:=]?\s*(\d+)/);
    if (maxLenMatch) spec.maxLength = parseInt(maxLenMatch[1], 10);

    const minLenMatch = constraintStr.match(/minlength\s*[:=]?\s*(\d+)/);
    if (minLenMatch) spec.minLength = parseInt(minLenMatch[1], 10);

    const minMatch = constraintStr.match(/(?<![a-z])min\s*[:=]?\s*(\d+)/);
    const maxMatch = constraintStr.match(/(?<![a-z])max\s*[:=]?\s*(\d+)/);
    if (minMatch) spec.min = parseInt(minMatch[1], 10);
    if (maxMatch) spec.max = parseInt(maxMatch[1], 10);

    const enumMatch = constraintStr.match(/enum\s*[:(]\s*([^)]+)/);
    if (enumMatch) spec.enum = enumMatch[1].split(',').map(v => v.trim()).filter(Boolean);

    // Enrich from DB schema (if available)
    if (dbSchema && dbSchema.tables) {
      const table = dbSchema.tables.find(t =>
        t.name.toLowerCase().replace(/_/g, '') === entityName.toLowerCase().replace(/_/g, '')
      );
      if (table) {
        const column = table.columns.find(c =>
          c.name.toLowerCase().replace(/_/g, '') === field.name.toLowerCase().replace(/_/g, '')
        );
        if (column) {
          spec.type = this._mapDBType(column.dataType);
          if (column.maxLength && (!spec.maxLength || column.maxLength < spec.maxLength)) {
            spec.maxLength = column.maxLength;
          }
          if (!column.nullable) spec.required = true;
        }
      }
    }

    return spec;
  }

  _mapDBType(dbType) {
    const lower = (dbType || '').toLowerCase();
    if (['character varying', 'varchar', 'text', 'char'].some(t => lower.includes(t))) return 'string';
    if (['integer', 'bigint', 'smallint', 'numeric', 'decimal'].some(t => lower.includes(t))) return 'number';
    if (lower.includes('boolean')) return 'boolean';
    if (['date', 'timestamp'].some(t => lower.includes(t))) return 'date';
    if (lower.includes('uuid')) return 'uuid';
    if (['json', 'jsonb'].some(t => lower.includes(t))) return 'json';
    return 'string';
  }

  /**
   * Generate Equivalence Partitioning sets for a field.
   */
  generateEP(fieldSpec) {
    const faker = this._getFaker();
    const validSets = [];
    const invalidSets = [];

    switch (fieldSpec.type) {
      case 'string':
        if (fieldSpec.enum) {
          for (const val of fieldSpec.enum) {
            validSets.push({ value: val, partition: 'valid_enum' });
          }
          invalidSets.push({ value: 'INVALID_ENUM_VALUE_' + this._seed, partition: 'invalid_enum' });
        } else {
          const midLen = Math.min(fieldSpec.maxLength || 50, 50);
          validSets.push({ value: faker.string.alpha(Math.floor(midLen / 2)), partition: 'valid_mid' });
          invalidSets.push({ value: '', partition: 'empty_string' });
          if (fieldSpec.maxLength) {
            invalidSets.push({ value: faker.string.alpha(fieldSpec.maxLength + 1), partition: 'too_long' });
          }
        }
        break;

      case 'number': {
        const min = fieldSpec.min != null ? fieldSpec.min : 0;
        const max = fieldSpec.max != null ? fieldSpec.max : 1000000;
        validSets.push({ value: Math.floor((min + max) / 2), partition: 'valid_mid' });
        if (fieldSpec.min != null) {
          invalidSets.push({ value: fieldSpec.min - 100, partition: 'below_min' });
        }
        if (fieldSpec.max != null) {
          invalidSets.push({ value: fieldSpec.max + 100, partition: 'above_max' });
        }
        invalidSets.push({ value: 'not_a_number', partition: 'invalid_type' });
        break;
      }

      case 'boolean':
        validSets.push({ value: true, partition: 'valid_true' });
        validSets.push({ value: false, partition: 'valid_false' });
        invalidSets.push({ value: 'not_boolean', partition: 'invalid_type' });
        break;

      case 'date':
        validSets.push({ value: faker.date.recent().toISOString(), partition: 'valid_recent' });
        validSets.push({ value: faker.date.past().toISOString(), partition: 'valid_past' });
        invalidSets.push({ value: 'not-a-date', partition: 'invalid_format' });
        invalidSets.push({ value: '9999-99-99', partition: 'invalid_date' });
        break;

      case 'uuid':
        validSets.push({ value: faker.string.uuid(), partition: 'valid_uuid' });
        invalidSets.push({ value: 'not-a-uuid', partition: 'invalid_format' });
        invalidSets.push({ value: '', partition: 'empty_string' });
        break;

      default:
        validSets.push({ value: faker.string.alpha(10), partition: 'valid_default' });
        break;
    }

    if (fieldSpec.required) {
      invalidSets.push({ value: null, partition: 'null_required' });
    } else {
      validSets.push({ value: null, partition: 'null_optional' });
    }

    return { validSets, invalidSets };
  }

  /**
   * Generate Boundary Value Analysis data for a field.
   */
  generateBVA(fieldSpec) {
    const faker = this._getFaker();
    const boundaryValues = [];

    if (fieldSpec.type === 'number' && fieldSpec.min != null && fieldSpec.max != null) {
      boundaryValues.push(
        { value: fieldSpec.min, label: 'min', valid: true },
        { value: fieldSpec.min - 1, label: 'min-1', valid: false },
        { value: fieldSpec.min + 1, label: 'min+1', valid: true },
        { value: fieldSpec.max, label: 'max', valid: true },
        { value: fieldSpec.max - 1, label: 'max-1', valid: true },
        { value: fieldSpec.max + 1, label: 'max+1', valid: false },
      );
    }

    if (fieldSpec.maxLength && ['string', 'uuid'].includes(fieldSpec.type)) {
      boundaryValues.push(
        { value: faker.string.alpha(fieldSpec.maxLength), label: 'maxLen', valid: true },
        { value: faker.string.alpha(fieldSpec.maxLength + 1), label: 'maxLen+1', valid: false },
      );

      if (fieldSpec.minLength) {
        boundaryValues.push(
          { value: faker.string.alpha(fieldSpec.minLength), label: 'minLen', valid: true },
          { value: faker.string.alpha(Math.max(0, fieldSpec.minLength - 1)), label: 'minLen-1', valid: false },
        );
      }
    }

    return { boundaryValues };
  }

  /**
   * Generate valid + invalid state transitions from DD workflow.
   */
  generateStateTransitions(workflow) {
    if (!workflow || !workflow.transitions || !workflow.states) {
      return { validTransitions: [], invalidTransitions: [] };
    }

    const validTransitions = workflow.transitions.map(t => ({
      from: t.from,
      to: t.to,
      trigger: t.trigger || 'unknown',
      type: 'valid',
    }));

    const allStates = workflow.states.map(s => s.name || s);
    const invalidTransitions = [];

    for (const state of allStates) {
      const validTargets = validTransitions
        .filter(t => t.from === state)
        .map(t => t.to);
      const invalidTargets = allStates.filter(s => !validTargets.includes(s) && s !== state);

      for (const target of invalidTargets) {
        invalidTransitions.push({
          from: state,
          to: target,
          trigger: 'invalid_transition',
          type: 'invalid',
        });
      }
    }

    return { validTransitions, invalidTransitions };
  }

  _generateDataFactoryCode(entities) {
    if (!entities || entities.length === 0) return '';

    const lines = [
      '// Auto-generated DataFactory for E2E tests',
      '// Generated by ETF test-data-generator.js',
      '',
      'import { APIRequestContext } from "@playwright/test";',
      '',
      'export class DataFactory {',
      '  constructor(private request: APIRequestContext) {}',
      '',
    ];

    for (const entity of entities) {
      const name = entity.name || 'Entity';

      lines.push('  async create' + name + '(overrides: Partial<Record<string, unknown>> = {}) {');
      lines.push('    const defaults = { /* TODO: fill from EP valid partition */ };');
      lines.push('    const data = { ...defaults, ...overrides };');
      lines.push('    const response = await this.request.post(`/api/' + name.toLowerCase() + '`, { data });');
      lines.push('    return response.json();');
      lines.push('  }');
      lines.push('');
    }

    lines.push('}');
    return lines.join('\n');
  }

  _generateSeedSQL(entities) {
    if (!entities || entities.length === 0) return '';

    const lines = [
      '-- Auto-generated seed SQL for TestContainers',
      '-- Generated by ETF test-data-generator.js',
      '',
    ];

    for (const entity of entities) {
      const validSets = (entity.validSets || []).filter(v => v.partition === 'valid_mid');
      if (validSets.length === 0) continue;

      lines.push('-- Seed data for ' + entity.name);
      lines.push('-- INSERT INTO ' + entity.name.toLowerCase() + ' (...) VALUES (...);');
      lines.push('-- TODO: Generate actual INSERT from entity field definitions');
      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = { TestDataGenerator };
