/**
 * Database Graph Builder — Builds ERD-style graph nodes/edges from parsed schema.
 *
 * Creates Entity enrichment nodes (reuses CLS-{className} from code-indexer),
 * PKField/FKField nodes, and HAS_PK/HAS_FK/FK_TO edges.
 *
 * DD Reference: Section 3.3 (Graph Schema Design)
 * INNOVATE_DD Decision 3: Entity + Key-Field Nodes (ERD-Style)
 *
 * Critical constraints:
 *   - Entity node ID: CLS-{className} (matches ast-graph-builder.js:403)
 *   - Edge types lowercased by hipporag-client.js:509 (FK_TO → fk_to)
 *   - Batch upsert triggers metadata.update() merge on existing nodes
 */

"use strict";

class DatabaseGraphBuilder {
  /**
   * Build graph nodes and edges from parsed entities and FK constraints.
   *
   * @param {object[]} entities - From EntitySchemaParser
   * @param {object[]} foreignKeys - From LiquibaseParser
   * @returns {{ nodes: object[], edges: object[], warnings: string[] }}
   */
  build(entities, foreignKeys) {
    const nodes = [];
    const edges = [];
    const warnings = [];
    const entityMap = new Map(); // tableName → entity

    for (const entity of entities) {
      entityMap.set(entity.tableName, entity);
    }

    // 1. Entity enrichment nodes + PKField nodes
    for (const entity of entities) {
      // Entity enrichment node (reuses code-indexer ID for metadata merge)
      nodes.push({
        id: `CLS-${entity.className}`,
        attributes: {
          type: "Entity",
          name: entity.className,
          importance: 0.8,
          table_name: entity.tableName,
          module: entity.module,
          field_count: entity.fields.length,
          base_class: entity.baseClass,
          db_fields: entity.fields,
          pk_field: entity.fields.find((f) => f.isPK)?.columnName || null,
          fk_fields: entity.fields
            .filter((f) => f.isFK)
            .map((f) => f.columnName),
          audit_fields: entity.auditFields.length > 0,
          db_indexed: true,
        },
      });

      // PKField node
      const pkField = entity.fields.find((f) => f.isPK);
      if (pkField) {
        const pkNodeId = `db:pk:${entity.className}.${pkField.name}`;
        nodes.push({
          id: pkNodeId,
          attributes: {
            type: "PKField",
            name: `${entity.className}.${pkField.name}`,
            importance: 0.6,
            column_name: pkField.columnName,
            java_type: pkField.javaType,
          },
        });
        edges.push({
          source: `CLS-${entity.className}`,
          target: pkNodeId,
          attributes: { type: "HAS_PK", weight: 1.0 },
        });
      }
    }

    // 2. FK resolution: match Liquibase FK constraints to entities
    for (const fk of foreignKeys) {
      const sourceEntity = entityMap.get(fk.baseTable);
      const targetEntity = entityMap.get(fk.referencedTable);

      if (!sourceEntity) {
        warnings.push(
          `FK source not found: ${fk.baseTable} (constraint: ${fk.constraintName})`
        );
        continue;
      }

      // Find FK field in source entity by column name
      const fkField = sourceEntity.fields.find(
        (f) => f.columnName === fk.baseColumn
      );
      const fieldName = fkField?.name || fk.baseColumn;

      const fkNodeId = `db:fk:${sourceEntity.className}.${fieldName}`;

      nodes.push({
        id: fkNodeId,
        attributes: {
          type: "FKField",
          name: `${sourceEntity.className}.${fieldName}`,
          importance: 0.7,
          column_name: fk.baseColumn,
          java_type: fkField?.javaType || "Long",
          target_table: fk.referencedTable,
          target_column: fk.referencedColumn,
        },
      });

      // HAS_FK edge: source entity → FKField
      edges.push({
        source: `CLS-${sourceEntity.className}`,
        target: fkNodeId,
        attributes: { type: "HAS_FK", weight: 1.0 },
      });

      // FK_TO edge: FKField → target entity (when resolvable)
      if (targetEntity) {
        edges.push({
          source: fkNodeId,
          target: `CLS-${targetEntity.className}`,
          attributes: {
            type: "FK_TO",
            weight: 1.0,
            constraint_name: fk.constraintName,
            on_delete: fk.onDelete || null,
          },
        });
      } else {
        warnings.push(
          `FK target not found: ${fk.referencedTable} (constraint: ${fk.constraintName})`
        );
      }
    }

    return { nodes, edges, warnings };
  }
}

module.exports = DatabaseGraphBuilder;

// CLI entry point: reads JSON from stdin {entities, fks}, outputs graph JSON
if (require.main === module) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    try {
      const data = JSON.parse(input);
      const builder = new DatabaseGraphBuilder();
      const result = builder.build(data.entities || [], data.fks || []);
      process.stdout.write(JSON.stringify(result));
    } catch (err) {
      console.error(`[DatabaseGraphBuilder] Error: ${err.message}`);
      process.stdout.write(JSON.stringify({ nodes: [], edges: [], warnings: [err.message] }));
    }
  });
}
