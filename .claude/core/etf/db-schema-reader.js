'use strict';

/**
 * db-schema-reader.js — Query PostgreSQL information_schema, cross-validate DD↔DB.
 *
 * Layer: L6 ENGINE
 * Pattern: Lazy connection + read-only queries
 *
 * Usage: Optional enrichment for DD_FIRST pipeline.
 * If DB connection fails, pipeline continues without DB data.
 */

const path = require('path');

class DBSchemaReader {
  /**
   * @param {object} connectionConfig - { host, port, database, user, password }
   *   or null to auto-load from env/project-config
   */
  constructor(connectionConfig) {
    this.config = connectionConfig;
    this._client = null;
  }

  /**
   * Query information_schema for tables matching module prefix.
   * @param {string} moduleId - Module prefix (e.g. 'CMN015')
   * @returns {Promise<object>} DBSchemaMetadata (from schemas.js)
   */
  async readSchema(moduleId) {
    const schemas = require('./schemas.js');
    const client = await this._getClient();
    const prefix = moduleId.toLowerCase();

    // 1. Query columns
    const columnsResult = await client.query(
      `SELECT table_name, column_name, data_type, is_nullable,
              character_maximum_length, numeric_precision
       FROM information_schema.columns
       WHERE table_schema = 'public' AND LOWER(table_name) LIKE $1
       ORDER BY table_name, ordinal_position`,
      [prefix + '%']
    );

    // 2. Group columns by table
    const tableMap = new Map();
    for (const row of columnsResult.rows) {
      if (!tableMap.has(row.table_name)) {
        tableMap.set(row.table_name, { name: row.table_name, columns: [], indexes: [] });
      }
      tableMap.get(row.table_name).columns.push({
        name: row.column_name,
        dataType: row.data_type,
        nullable: row.is_nullable === 'YES',
        maxLength: row.character_maximum_length,
        numericPrecision: row.numeric_precision,
      });
    }

    // 3. Query foreign keys
    const fkResult = await client.query(
      `SELECT tc.constraint_name, tc.table_name, kcu.column_name,
              ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = 'public'
         AND LOWER(tc.table_name) LIKE $1`,
      [prefix + '%']
    );

    const foreignKeys = fkResult.rows.map(row => ({
      constraintName: row.constraint_name,
      tableName: row.table_name,
      columnName: row.column_name,
      foreignTable: row.foreign_table,
      foreignColumn: row.foreign_column,
    }));

    // 4. Query check constraints
    const checkResult = await client.query(
      `SELECT con.conname AS constraint_name, pg_get_constraintdef(con.oid) AS check_clause
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       WHERE con.contype = 'c'
         AND nsp.nspname = 'public'
         AND LOWER(rel.relname) LIKE $1`,
      [prefix + '%']
    );

    const checkConstraints = checkResult.rows.map(row => ({
      constraintName: row.constraint_name,
      checkClause: row.check_clause,
    }));

    return schemas.createDBSchemaMetadata({
      tables: Array.from(tableMap.values()),
      foreignKeys,
      checkConstraints,
      enums: [],
    });
  }

  /**
   * Cross-validate DD entities against live DB schema.
   * Detects: type mismatches, missing tables/columns, extra DB columns.
   *
   * @param {object} ddMetadata - DDMetadata from RAG/file
   * @param {object} dbSchema - DBSchemaMetadata from readSchema()
   * @returns {{ matches: object[], mismatches: object[], missing: object[] }}
   */
  crossValidate(ddMetadata, dbSchema) {
    const matches = [];
    const mismatches = [];
    const missing = [];

    if (!ddMetadata || !ddMetadata.entities || !dbSchema || !dbSchema.tables) {
      return { matches, mismatches, missing };
    }

    for (const entity of ddMetadata.entities) {
      const table = dbSchema.tables.find(t =>
        t.name.toLowerCase() === entity.name.toLowerCase() ||
        t.name.toLowerCase().replace(/_/g, '') === entity.name.toLowerCase().replace(/_/g, '')
      );

      if (!table) {
        missing.push({ type: 'table', name: entity.name, source: 'DD', description: 'DD entity "' + entity.name + '" has no matching DB table' });
        continue;
      }

      for (const field of (entity.fields || [])) {
        const column = table.columns.find(c =>
          c.name.toLowerCase() === field.name.toLowerCase() ||
          c.name.toLowerCase().replace(/_/g, '') === field.name.toLowerCase().replace(/_/g, '')
        );

        if (!column) {
          missing.push({ type: 'column', table: entity.name, name: field.name, source: 'DD', description: 'DD field "' + entity.name + '.' + field.name + '" not in DB' });
        } else if (field.type && !this._typesCompatible(field.type, column.dataType)) {
          mismatches.push({
            table: entity.name,
            field: field.name,
            ddType: field.type,
            dbType: column.dataType,
            description: 'Type mismatch: DD says "' + field.type + '", DB has "' + column.dataType + '"',
          });
        } else {
          matches.push({ table: entity.name, field: field.name });
        }
      }
    }

    return { matches, mismatches, missing };
  }

  /**
   * Check if DD type is compatible with DB type.
   * Loose matching: 'string' <-> 'character varying', 'number' <-> 'integer', etc.
   */
  _typesCompatible(ddType, dbType) {
    const ddLower = (ddType || '').toLowerCase();
    const dbLower = (dbType || '').toLowerCase();

    const compatMap = {
      'string': ['character varying', 'varchar', 'text', 'char', 'character'],
      'number': ['integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision'],
      'boolean': ['boolean'],
      'date': ['date', 'timestamp', 'timestamp without time zone', 'timestamp with time zone'],
      'uuid': ['uuid'],
      'json': ['json', 'jsonb'],
    };

    if (ddLower === dbLower) return true;

    const compatibles = compatMap[ddLower] || [];
    return compatibles.some(t => dbLower.includes(t));
  }

  /**
   * Ping DB to check availability. Used for degradation detection.
   * @returns {Promise<boolean>}
   */
  async ping() {
    try {
      const client = await this._getClient();
      await client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lazy pg.Client — connects on first use.
   * @returns {Promise<object>} pg.Client
   */
  async _getClient() {
    if (this._client) return this._client;

    const config = this.config || this._loadConfigFromEnv();
    if (!config) throw new Error('No DB connection config available');

    const { Client } = require('pg');
    this._client = new Client(config);
    await this._client.connect();

    // Set statement timeout (5s)
    await this._client.query('SET statement_timeout = 5000');

    return this._client;
  }

  /**
   * Load DB config from environment variables.
   */
  _loadConfigFromEnv() {
    const host = process.env.ETF_DB_HOST || process.env.DB_HOST;
    if (!host) return null;
    return {
      host,
      port: parseInt(process.env.ETF_DB_PORT || process.env.DB_PORT || '5432', 10),
      database: process.env.ETF_DB_NAME || process.env.DB_NAME,
      user: process.env.ETF_DB_USER || process.env.DB_USER,
      password: process.env.ETF_DB_PASS || process.env.DB_PASS,
    };
  }

  /**
   * Close DB connection.
   */
  async close() {
    if (this._client) {
      await this._client.end();
      this._client = null;
    }
  }
}

module.exports = { DBSchemaReader };
