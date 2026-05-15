/**
 * Liquibase Parser — Extracts FK relationships from Liquibase XML changelog files.
 *
 * Parses <addForeignKeyConstraint> tags to build FK relationship data.
 * Uses fast-xml-parser with attributeNamePrefix:"" to handle v4.5+ defaults.
 *
 * DD Reference: Section 3.2 (Liquibase FK parsing)
 * INNOVATE_DD Decision 1: Entity-First + Liquibase Validation
 *
 * Key patterns from actual Liquibase XML:
 *   - Attributes use PLURAL names: baseColumnNames (not baseColumnName)
 *   - Attributes are on the element (attribute-style, not nested)
 *   - onDelete may not be present (optional)
 *   - File naming: *_added_entity_constraints_*.xml
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

class LiquibaseParser {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "", // Override v4.5+ default "@_"
    });
  }

  /**
   * Parse a single Liquibase XML file.
   * @param {string} filePath - Absolute path to XML file
   * @returns {object[]} Array of ForeignKey objects
   */
  parseFile(filePath) {
    const foreignKeys = [];

    const content = fs.readFileSync(filePath, "utf8");
    if (!content.includes("addForeignKeyConstraint")) return foreignKeys;

    let parsed;
    try {
      parsed = this.parser.parse(content);
    } catch (err) {
      console.warn(`[LiquibaseParser] XML parse error in ${filePath}: ${err.message}`);
      return foreignKeys;
    }

    const changeLog = parsed.databaseChangeLog;
    if (!changeLog) return foreignKeys;

    // Handle both single changeSet (object) and multiple (array)
    const changeSets = Array.isArray(changeLog.changeSet)
      ? changeLog.changeSet
      : changeLog.changeSet
        ? [changeLog.changeSet]
        : [];

    for (const cs of changeSets) {
      // Handle both single constraint (object) and multiple (array)
      const constraints = Array.isArray(cs.addForeignKeyConstraint)
        ? cs.addForeignKeyConstraint
        : cs.addForeignKeyConstraint
          ? [cs.addForeignKeyConstraint]
          : [];

      for (const fk of constraints) {
        // Liquibase uses PLURAL attribute names (even for single-column FKs)
        const baseColumn = fk.baseColumnNames || fk.baseColumnName || "";
        const referencedColumn =
          fk.referencedColumnNames || fk.referencedColumnName || "";

        if (!fk.baseTableName || !fk.referencedTableName) continue;

        foreignKeys.push({
          constraintName: fk.constraintName || "",
          baseTable: fk.baseTableName,
          baseColumn,
          referencedTable: fk.referencedTableName,
          referencedColumn,
          onDelete: fk.onDelete || null,
        });
      }
    }

    return foreignKeys;
  }

  /**
   * Parse all Liquibase XML files in a directory tree.
   * @param {string} rootDir - Root directory to scan
   * @returns {object[]} Array of ForeignKey objects (deduplicated by constraintName)
   */
  parseDirectory(rootDir) {
    const allFKs = [];
    const seen = new Set();
    const xmlFiles = this._findXmlFiles(rootDir);

    for (const filePath of xmlFiles) {
      try {
        const fks = this.parseFile(filePath);
        for (const fk of fks) {
          // Deduplicate by constraintName across files
          if (fk.constraintName && !seen.has(fk.constraintName)) {
            seen.add(fk.constraintName);
            allFKs.push(fk);
          }
        }
      } catch (err) {
        console.warn(`[LiquibaseParser] Error in ${filePath}: ${err.message}`);
      }
    }

    return allFKs;
  }

  /**
   * Recursively find XML files that may contain FK constraints.
   * Prioritizes files with "constraint" in name, falls back to all XML.
   */
  _findXmlFiles(dir) {
    if (!fs.existsSync(dir)) return [];

    const allXml = [];
    this._walkDir(dir, allXml);

    // Prioritize constraint files
    const constraintFiles = allXml.filter(
      (f) => /constraint/i.test(path.basename(f))
    );

    // Fallback: if no constraint files found, use all XML
    return constraintFiles.length > 0 ? constraintFiles : allXml;
  }

  /**
   * Recursively collect .xml files.
   */
  _walkDir(dir, results) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this._walkDir(fullPath, results);
      } else if (entry.name.endsWith(".xml")) {
        results.push(fullPath);
      }
    }
  }
}

module.exports = LiquibaseParser;

// CLI entry point: node liquibase-parser.js <rootDir>
if (require.main === module) {
  const rootDir = process.argv[2];
  if (!rootDir) {
    console.error("Usage: node liquibase-parser.js <rootDir>");
    process.exit(1);
  }
  const parser = new LiquibaseParser();
  const fks = parser.parseDirectory(rootDir);
  process.stdout.write(JSON.stringify(fks));
}
