# FastAPI Neo4j Repository Specialist
# FastAPI Neo4j リポジトリ スペシャリスト
# Chuyên Gia Repository Neo4j FastAPI

**Role**: Graph Database Repository Pattern Expert
**Focus**: Neo4j Repository, Cypher Queries, GraphRAG
**Technology**: Neo4j 5.x, Async Driver, Graph Traversal
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST Neo4jRepositorySpecialist {
  ROLE: "Graph database repository pattern expert for Neo4j operations"

  RESPONSIBILITIES: [
    "Manage Neo4j async driver initialization",
    "Execute Cypher queries for graph operations",
    "Implement GraphRAG relationship traversal",
    "Handle graph CRUD operations with transactions",
    "Provide health checks and connection management"
  ]

  TECH_STACK: {
    primary: "Neo4j 5.x",
    libraries: ["neo4j (async driver)", "python 3.11+"],
    patterns: ["Repository Pattern", "Async/Await", "Transaction Management"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Violation", "Penalty", "Document", "LegalCase"],
    graph_relationships: [
      "OFTEN_CONFUSED_WITH",
      "CAN_BE_REDUCED_TO",
      "REQUIRES_EVIDENCE_OF",
      "HAS_PENALTY"
    ]
  }
}
```

---

## Pattern 2.1: Neo4j Async Driver Initialization

### Overview

```pseudo
PATTERN Neo4jDriverInit {
  PURPOSE: "Initialize async Neo4j driver with connection pooling and lazy loading"

  PROBLEM: "Need efficient async Neo4j driver with proper connection management"

  SOLUTION: "Lazy initialization with connection pool configuration"

  USE_CASES: [
    "Graph database operations for legal knowledge base",
    "GraphRAG relationship traversal for Vietnamese traffic violations"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW Neo4jDriverInit_Workflow {
  INPUT: {
    settings: {
      NEO4J_URI: string,
      NEO4J_USER: string,
      NEO4J_PASSWORD: string
    }
  }

  PRECONDITIONS: [
    "Neo4j server is running",
    "Valid credentials provided"
  ]

  STEPS: {
    STEP_1_CHECK_EXISTING: {
      description: "Check if driver already exists"
      logic: |
        IF self._driver IS_NOT_NULL THEN
          RETURN self._driver
        END IF
    }

    STEP_2_CREATE_DRIVER: {
      description: "Create async driver with pooling"
      logic: |
        self._driver = AsyncGraphDatabase.driver(
          uri: settings.NEO4J_URI,
          auth: (settings.NEO4J_USER, settings.NEO4J_PASSWORD),
          max_connection_pool_size: 50,
          connection_timeout: 30.0,
          max_transaction_retry_time: 15.0
        )
        LOG "Neo4j driver initialized"
    }

    STEP_3_RETURN: {
      description: "Return driver instance"
      logic: |
        RETURN self._driver
    }
  }

  OUTPUT: {
    driver: AsyncDriver
  }

  POSTCONDITIONS: [
    "Driver is initialized",
    "Connection pool is ready"
  ]
}
```

---

## Pattern 2.2: Cypher Query Execution (Single Result)

### Workflow

```pseudo
WORKFLOW CypherSingleQuery_Workflow {
  INPUT: {
    id: string,
    node_label: string = "Document"
  }

  STEPS: {
    STEP_1_GET_DRIVER: {
      logic: |
        driver = AWAIT self._get_driver()
    }

    STEP_2_BUILD_QUERY: {
      logic: |
        cypher = "MATCH (d:" + node_label + " {id: $id}) RETURN d"
    }

    STEP_3_EXECUTE: {
      logic: |
        ASYNC_WITH driver.session() AS session:
          result = AWAIT session.run(cypher, id: id)
          record = AWAIT result.single()
        END ASYNC_WITH
    }

    STEP_4_CONVERT: {
      logic: |
        IF record IS_NOT_NULL THEN
          RETURN Document.from_neo4j(record["d"])
        ELSE
          RETURN None
        END IF
    }
  }

  OUTPUT: Document | None
}
```

---

## Pattern 2.3: Cypher Query Execution (Multiple Results)

### Workflow

```pseudo
WORKFLOW CypherMultipleQuery_Workflow {
  INPUT: {
    limit: int = 100,
    offset: int = 0,
    node_label: string = "Document"
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      logic: |
        cypher = """
          MATCH (d:{node_label})
          RETURN d
          ORDER BY d.created_at DESC
          SKIP $offset
          LIMIT $limit
        """
    }

    STEP_2_EXECUTE: {
      logic: |
        driver = AWAIT self._get_driver()
        ASYNC_WITH driver.session() AS session:
          result = AWAIT session.run(cypher, offset: offset, limit: limit)
          records = AWAIT result.data()
        END ASYNC_WITH
    }

    STEP_3_CONVERT: {
      logic: |
        documents = []
        FOR EACH record IN records:
          doc = Document.from_neo4j(record["d"])
          documents.APPEND(doc)
        END FOR
        RETURN documents
    }
  }

  OUTPUT: List<Document>
}
```

---

## Pattern 2.4: GraphRAG Relationship Traversal

### Overview

```pseudo
PATTERN GraphRAGTraversal {
  PURPOSE: "Traverse graph relationships for related document discovery"

  PROBLEM: "Need to find related documents via GraphRAG relationships (OFTEN_CONFUSED_WITH, etc.)"

  SOLUTION: "Dynamic relationship pattern matching with weight-based sorting"

  USE_CASES: [
    "Find similar traffic violations (Vi phạm thường bị nhầm lẫn)",
    "Discover reducible penalties (Có thể giảm hình phạt)",
    "Identify required evidence (Yêu cầu bằng chứng về)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW GraphRAGTraversal_Workflow {
  INPUT: {
    query: string,
    mode: string = "legal",
    relationships: List<string>,
    limit: int = 10
  }

  STEPS: {
    STEP_1_BUILD_PATTERN: {
      description: "Build dynamic relationship pattern"
      logic: |
        rel_pattern = JOIN(relationships, separator: "|")
        // Example: "OFTEN_CONFUSED_WITH|CAN_BE_REDUCED_TO|REQUIRES_EVIDENCE_OF"
    }

    STEP_2_BUILD_QUERY: {
      logic: |
        cypher = """
          MATCH (start:Document)-[r:{rel_pattern}]-(related:Document)
          WHERE start.content CONTAINS $query_term
          RETURN related, type(r) as relationship, r.weight as weight
          ORDER BY r.weight DESC
          LIMIT $limit
        """
    }

    STEP_3_EXECUTE: {
      logic: |
        driver = AWAIT self._get_driver()
        query_term = SPLIT(query, " ")[0]  // Use first term for matching

        ASYNC_WITH driver.session() AS session:
          result = AWAIT session.run(cypher, query_term: query_term, limit: limit)
          records = AWAIT result.data()
        END ASYNC_WITH
    }

    STEP_4_ATTACH_METADATA: {
      logic: |
        documents = []
        FOR EACH record IN records:
          doc = Document.from_neo4j(record["related"])
          doc.relationship = record["relationship"]
          doc.relationship_weight = record["weight"]
          documents.APPEND(doc)
        END FOR
    }
  }

  OUTPUT: List<Document> (with relationship metadata)
}
```

---

## Pattern 2.5: Domain-Specific Query (Violation Lookup)

### Overview

```pseudo
PATTERN ViolationLookup {
  PURPOSE: "Look up Vietnamese traffic violation with vehicle-type-specific penalty"

  PROBLEM: "Need domain-specific query for Vietnamese traffic violation and penalty lookup"

  SOLUTION: "Query violation node and related penalty node with vehicle type fallback"

  USE_CASES: [
    "Lookup penalty for using phone while driving (Sử dụng điện thoại khi lái xe)",
    "Get vehicle-specific penalty (motorcycle vs car)",
    "Fallback to 'ALL' vehicle type if specific not found"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ViolationLookup_Workflow {
  INPUT: {
    violation_code: string,  // e.g., "VN-46-01-a"
    vehicle_type: string     // e.g., "motorcycle", "car", "truck"
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      logic: |
        cypher = """
          MATCH (v:Violation {code: $code})-[:HAS_PENALTY]->(p:Penalty)
          WHERE p.vehicle_type = $vehicle_type OR p.vehicle_type = 'ALL'
          RETURN v, p
          ORDER BY p.vehicle_type DESC
          LIMIT 1
        """
        // ORDER BY DESC to prioritize specific vehicle_type over 'ALL'
    }

    STEP_2_EXECUTE: {
      logic: |
        driver = AWAIT self._get_driver()
        ASYNC_WITH driver.session() AS session:
          result = AWAIT session.run(cypher, code: violation_code, vehicle_type: vehicle_type)
          record = AWAIT result.single()
        END ASYNC_WITH
    }

    STEP_3_BUILD_RESULT: {
      logic: |
        IF record IS_NOT_NULL THEN
          RETURN {
            violation: ViolationNode.from_record(record["v"]),
            penalty: PenaltyNode.from_record(record["p"])
          }
        ELSE
          RETURN None
        END IF
    }
  }

  OUTPUT: {
    violation?: ViolationNode,
    penalty?: PenaltyNode
  }
}
```

---

## Pattern 2.6: Create Node with Properties

### Workflow

```pseudo
WORKFLOW CreateNode_Workflow {
  INPUT: {
    entity: Document
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      logic: |
        cypher = """
          CREATE (d:Document {
            id: $id,
            title: $title,
            content: $content,
            source: $source,
            created_at: datetime(),
            is_authoritative: $is_authoritative
          })
          RETURN d
        """
    }

    STEP_2_EXECUTE: {
      logic: |
        driver = AWAIT self._get_driver()
        ASYNC_WITH driver.session() AS session:
          result = AWAIT session.run(
            cypher,
            id: entity.id,
            title: entity.title,
            content: entity.content,
            source: entity.source,
            is_authoritative: entity.is_authoritative
          )
          record = AWAIT result.single()
        END ASYNC_WITH
    }

    STEP_3_RETURN: {
      logic: |
        RETURN Document.from_neo4j(record["d"])
    }
  }

  OUTPUT: Document (with generated timestamps)
}
```

---

## Pattern 2.7: Update Node Properties

### Workflow

```pseudo
WORKFLOW UpdateNode_Workflow {
  INPUT: {
    entity: Document
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      logic: |
        cypher = """
          MATCH (d:Document {id: $id})
          SET d.title = $title,
              d.content = $content,
              d.updated_at = datetime()
          RETURN d
        """
    }

    STEP_2_EXECUTE: {
      logic: |
        driver = AWAIT self._get_driver()
        ASYNC_WITH driver.session() AS session:
          result = AWAIT session.run(
            cypher,
            id: entity.id,
            title: entity.title,
            content: entity.content
          )
          record = AWAIT result.single()
        END ASYNC_WITH
    }

    STEP_3_CHECK_EXISTS: {
      logic: |
        IF record IS_NULL THEN
          THROW NotFoundError("Document", entity.id)
        END IF
    }

    STEP_4_RETURN: {
      logic: |
        RETURN Document.from_neo4j(record["d"])
    }
  }

  OUTPUT: Document (with updated timestamp)
}
```

---

## Pattern 2.8: Delete Node with Relationships

### Workflow

```pseudo
WORKFLOW DeleteNode_Workflow {
  INPUT: {
    id: string
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      logic: |
        cypher = """
          MATCH (d:Document {id: $id})
          DETACH DELETE d
          RETURN count(d) as deleted
        """
        // DETACH DELETE removes all relationships first
    }

    STEP_2_EXECUTE: {
      logic: |
        driver = AWAIT self._get_driver()
        ASYNC_WITH driver.session() AS session:
          result = AWAIT session.run(cypher, id: id)
          record = AWAIT result.single()
        END ASYNC_WITH
    }

    STEP_3_RETURN: {
      logic: |
        RETURN record["deleted"] > 0
    }
  }

  OUTPUT: boolean (True if deleted, False if not found)
}
```

---

## Pattern 2.9: Health Check

### Workflow

```pseudo
WORKFLOW Neo4jHealthCheck_Workflow {
  INPUT: None

  STEPS: {
    STEP_1_EXECUTE: {
      logic: |
        TRY:
          driver = AWAIT self._get_driver()
          ASYNC_WITH driver.session() AS session:
            result = AWAIT session.run("RETURN 1 as ping")
            record = AWAIT result.single()
          END ASYNC_WITH

          IF record["ping"] == 1 THEN
            RETURN True
          ELSE
            RETURN False
          END IF
        CATCH error:
          LOG_ERROR("Neo4j health check failed: " + error)
          RETURN False
        END TRY
    }
  }

  OUTPUT: boolean
}
```

---

## Pattern 2.10: Transaction with Multiple Operations

### Overview

```pseudo
PATTERN TransactionPattern {
  PURPOSE: "Execute multiple operations in single atomic transaction"

  PROBLEM: "Need to create document + establish relationships atomically"

  SOLUTION: "Use transaction context manager for atomic operations"

  USE_CASES: [
    "Create violation document and link to related violations",
    "Update multiple nodes and relationships consistently"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW Transaction_Workflow {
  INPUT: {
    document: Document,
    related_ids: List<string>,
    relationship_type: string  // e.g., "OFTEN_CONFUSED_WITH"
  }

  STEPS: {
    STEP_1_BEGIN_TRANSACTION: {
      logic: |
        driver = AWAIT self._get_driver()
        ASYNC_WITH driver.session() AS session:
          ASYNC_WITH session.begin_transaction() AS tx:
            // All operations use 'tx' object
    }

    STEP_2_CREATE_DOCUMENT: {
      logic: |
        create_query = """
          CREATE (d:Document {
            id: $id,
            title: $title,
            content: $content,
            created_at: datetime()
          })
          RETURN d
        """
        result = AWAIT tx.run(
          create_query,
          id: document.id,
          title: document.title,
          content: document.content
        )
        record = AWAIT result.single()
        created_doc = Document.from_neo4j(record["d"])
    }

    STEP_3_CREATE_RELATIONSHIPS: {
      logic: |
        FOR EACH related_id IN related_ids:
          rel_query = """
            MATCH (d:Document {id: $doc_id})
            MATCH (r:Document {id: $related_id})
            CREATE (d)-[:{relationship_type} {weight: 1.0}]->(r)
          """
          AWAIT tx.run(rel_query, doc_id: document.id, related_id: related_id)
        END FOR
    }

    STEP_4_COMMIT: {
      logic: |
        AWAIT tx.commit()
        LOG "Transaction committed successfully"
    }
  }

  ERROR_HANDLING: {
    Exception: "Transaction auto-rolls back on exception"
  }

  OUTPUT: Document (created document)
}
```

---

## Domain Models

### Vietnamese Traffic Violation Models

```typescript
// ViolationNode interface
interface ViolationNode {
  code: string;              // e.g., "VN-46-01-a"
  title_vi: string;          // "Sử dụng điện thoại khi lái xe"
  title_ja: string;          // "運転中の携帯電話使用"
  description_vi: string;
  description_ja: string;
  law_reference: string;     // "Nghị định 100/2019/NĐ-CP"
}

// PenaltyNode interface
interface PenaltyNode {
  vehicle_type: string;                  // "motorcycle" | "car" | "truck" | "ALL"
  fine_min: number;                      // Minimum fine in VND
  fine_max: number;                      // Maximum fine in VND
  license_suspension_days?: number;
  vehicle_impoundment_days?: number;
}
```

---

## Integration Example

### Hybrid Retrieval (Vector + Graph)

```pseudo
INTEGRATION HybridRetrieval {
  SCENARIO: "Combine vector search (Qdrant) + graph traversal (Neo4j) for RAG"

  WORKFLOW: {
    STEP_1_VECTOR_SEARCH: |
      vector_results = AWAIT QdrantRepository.search(
        query: query,
        collection: "legal_docs",
        limit: 10,
        threshold: 0.7
      )

    STEP_2_GRAPH_TRAVERSE: |
      relationships = ["OFTEN_CONFUSED_WITH", "REQUIRES_EVIDENCE_OF"]
      graph_results = AWAIT Neo4jRepository.find_related(
        query: query,
        mode: "legal",
        relationships: relationships,
        limit: 10
      )

    STEP_3_MERGE: |
      seen_ids = SET()
      merged_results = []

      FOR EACH result IN vector_results:
        IF result.id NOT_IN seen_ids THEN
          result.source = "vector"
          merged_results.APPEND(result)
          seen_ids.ADD(result.id)
        END IF
      END FOR

      FOR EACH result IN graph_results:
        IF result.id NOT_IN seen_ids THEN
          result.source = "graph"
          merged_results.APPEND(result)
          seen_ids.ADD(result.id)
        END IF
      END FOR

    STEP_4_SORT: |
      SORT merged_results BY score DESC
      RETURN merged_results[0:limit]
  }

  OUTPUT: List<Document> (hybrid results)
}
```

---

## Validation Checklist

```pseudo
VALIDATION Neo4jRepositoryValidation {
  CHECKS: [
    "Use AsyncGraphDatabase.driver (not synchronous)",
    "Implement lazy driver initialization",
    "Use 'async with driver.session()' for session management",
    "Use parameterized queries (not string interpolation)",
    "Use 'await result.single()' for single record",
    "Use 'await result.data()' for multiple records",
    "Use 'DETACH DELETE' for node deletion",
    "Use 'datetime()' for timestamps",
    "Implement transaction for multiple operations",
    "Handle exceptions with custom error classes"
  ]

  PASS_CRITERIA: "All checks must pass"
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 1.1 - Base Repository Interface",
    relationship: "Neo4j repository implements base interface",
    integration: "Inherits CRUD operations and error handling"
  },
  {
    pattern: "Pattern 3.1 - Qdrant Vector Search",
    relationship: "Used together for hybrid retrieval",
    integration: "Combines vector + graph results"
  },
  {
    pattern: "Pattern 3.1 - Unit of Work",
    relationship: "Coordinates transactions across Neo4j and PostgreSQL",
    integration: "Atomic operations across databases"
  }
]
```

---

## References

- **Neo4j Docs**: [Neo4j Python Driver](https://neo4j.com/docs/python-manual/current/)
- **GraphRAG**: [Microsoft GraphRAG](https://microsoft.github.io/graphrag/)
- **Vietnamese Traffic Law**: Nghị định 100/2019/NĐ-CP

---

**File**: `specialists/code/fastapi-react/fastapi-neo4j-repository.md`
**Patterns**: 10 (Neo4j-specific patterns)
**Lines**: ~720
**Created**: 2026-01-02
