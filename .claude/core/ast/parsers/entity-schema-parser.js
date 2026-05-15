/**
 * Entity Schema Parser — Extracts database schema from Java R2DBC entity classes.
 *
 * Parses @Table, @Column, @Id, @NotNull, @Transient annotations from
 * Spring Data R2DBC entities. Two-pass approach for multi-line annotations.
 *
 * DD Reference: Section 3.1 (Entity-First + Liquibase Validation)
 * INNOVATE_DD Decision 1: Entity-First parsing strategy
 */

"use strict";

const fs = require("fs");
const path = require("path");

// Hardcoded audit fields from AbstractAuditingEntity
const AUDIT_FIELDS = [
  { name: "insUserId", columnName: "ins_user_id", javaType: "Long", nullable: true, isPK: false, isFK: false },
  { name: "insDate", columnName: "ins_date", javaType: "Instant", nullable: true, isPK: false, isFK: false },
  { name: "updUserId", columnName: "upd_user_id", javaType: "Long", nullable: true, isPK: false, isFK: false },
  { name: "updDate", columnName: "upd_date", javaType: "Instant", nullable: true, isPK: false, isFK: false },
  { name: "delDate", columnName: "del_date", javaType: "Instant", nullable: true, isPK: false, isFK: false },
  { name: "delUserId", columnName: "del_user_id", javaType: "Long", nullable: true, isPK: false, isFK: false },
  { name: "delFlg", columnName: "del_flg", javaType: "Boolean", nullable: true, isPK: false, isFK: false },
  { name: "updCnt", columnName: "upd_cnt", javaType: "Integer", nullable: true, isPK: false, isFK: false },
];

// Module detection from class name prefix
const MODULE_PREFIXES = {
  Cmn: "cmn",
  Sfa: "sfa",
  Tnt: "tnt",
  Ctm: "ctm",
};

/**
 * Convert camelCase field name to snake_case column name.
 * Used as fallback when @Column is absent.
 */
function camelToSnake(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/**
 * Detect module from class name prefix.
 */
function detectModule(className) {
  for (const [prefix, mod] of Object.entries(MODULE_PREFIXES)) {
    if (className.startsWith(prefix)) return mod;
  }
  return "unknown";
}

class EntitySchemaParser {
  /**
   * Parse a single Java entity file.
   * @param {string} filePath - Absolute path to .java file
   * @returns {object|null} EntitySchema or null if not an entity
   */
  parseFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");

    // 1. Extract @Table("table_name")
    const tableMatch = content.match(/@Table\("(\w+)"\)/);
    if (!tableMatch) return null; // Not an entity
    const tableName = tableMatch[1];

    // 2. Extract class declaration → className, baseClass
    const classMatch = content.match(
      /class\s+(\w+)\s+extends\s+([\w<>]+)/
    );
    if (!classMatch) return null;
    const className = classMatch[1];
    const baseClass = classMatch[2];

    // 3. Detect module
    const module = detectModule(className);

    // 4. Two-pass field extraction
    const fields = this._extractFields(content);

    // 5. Add audit fields if extends AbstractAuditingEntity
    const auditFields = baseClass.startsWith("AbstractAuditingEntity")
      ? AUDIT_FIELDS.map((f) => ({ ...f }))
      : [];

    return {
      className,
      tableName,
      module,
      baseClass,
      fields,
      auditFields,
      sourcePath: filePath,
    };
  }

  /**
   * Two-pass field extraction from entity content.
   * Pass 1: Split into annotation blocks (one per field declaration).
   * Pass 2: Extract metadata from each block.
   */
  _extractFields(content) {
    const fields = [];

    // Find the class body (between first { and last })
    const classBodyMatch = content.match(
      /class\s+\w+[^{]*\{([\s\S]*)\}/
    );
    if (!classBodyMatch) return fields;
    const classBody = classBodyMatch[1];

    // Pass 1: Match field declarations with their preceding annotations.
    // Pattern: zero or more annotation lines followed by a private field declaration.
    const fieldRegex =
      /((?:\s*@[\w.]+(?:\([^)]*\))?\s*\n)*)\s*private\s+([\w<>]+)\s+(\w+)\s*(?:=\s*[^;]+)?;/g;

    let match;
    while ((match = fieldRegex.exec(classBody)) !== null) {
      const annotationBlock = match[1];
      const javaType = match[2];
      const fieldName = match[3];

      // Skip static/final fields (serialVersionUID, etc.)
      if (/static\s+final/.test(match[0])) continue;

      // Pass 2: Extract annotations from block
      const isTransient =
        /@(?:org\.springframework\.data\.annotation\.)?Transient/.test(
          annotationBlock
        );
      if (isTransient) continue; // Skip non-persisted fields

      const isPK = /@Id/.test(annotationBlock);
      const isNotNull = /@NotNull/.test(annotationBlock);

      // Extract @Column("column_name")
      const columnMatch = annotationBlock.match(/@Column\("(\w+)"\)/);
      const columnName = columnMatch
        ? columnMatch[1]
        : camelToSnake(fieldName);

      // FK detection: column ends with _id, type is Long, not the PK
      const isFK =
        !isPK &&
        javaType === "Long" &&
        columnName.endsWith("_id");

      fields.push({
        name: fieldName,
        columnName,
        javaType,
        nullable: !isNotNull && !isPK,
        isPK,
        isFK,
      });
    }

    return fields;
  }

  /**
   * Parse all entity files in a directory tree.
   * @param {string} rootDir - Root directory to scan
   * @returns {object[]} Array of EntitySchema objects
   */
  parseDirectory(rootDir) {
    const entities = [];
    const javaFiles = this._findJavaFiles(rootDir);

    for (const filePath of javaFiles) {
      try {
        const entity = this.parseFile(filePath);
        if (entity) {
          entities.push(entity);
        }
      } catch (err) {
        console.warn(`[EntitySchemaParser] Error parsing ${filePath}: ${err.message}`);
      }
    }

    return entities;
  }

  /**
   * Recursively find .java files containing @Table.
   */
  _findJavaFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this._findJavaFiles(fullPath));
      } else if (entry.name.endsWith(".java")) {
        // Quick filter: only read files that might contain @Table
        const content = fs.readFileSync(fullPath, "utf8");
        if (content.includes("@Table(")) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }
}

module.exports = EntitySchemaParser;

// CLI entry point: node entity-schema-parser.js <rootDir>
if (require.main === module) {
  const rootDir = process.argv[2];
  if (!rootDir) {
    console.error("Usage: node entity-schema-parser.js <rootDir>");
    process.exit(1);
  }
  const parser = new EntitySchemaParser();
  const entities = parser.parseDirectory(rootDir);
  process.stdout.write(JSON.stringify(entities));
}
