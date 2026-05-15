# FastAPI Qdrant Repository Specialist
# FastAPI Qdrant リポジトリ スペシャリスト
# Chuyên Gia Repository Qdrant FastAPI

**Role**: Vector Database Repository Pattern Expert
**Focus**: Qdrant Repository, Semantic Search, CLIP Embeddings
**Technology**: Qdrant, Vector Search, Image Search
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST QdrantRepositorySpecialist {
  ROLE: "Vector database repository pattern expert for semantic search"

  RESPONSIBILITIES: [
    "Manage Qdrant client initialization",
    "Create and manage vector collections",
    "Execute semantic search with embeddings",
    "Implement image search with CLIP embeddings",
    "Handle vector upsert and deletion operations"
  ]

  TECH_STACK: {
    primary: "Qdrant",
    libraries: ["qdrant-client", "python 3.11+"],
    patterns: ["Repository Pattern", "Async Operations", "Vector Search"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_collections: [
      "legal_docs (1024-dim text embeddings)",
      "traffic_violations (1024-dim violation descriptions)",
      "traffic_signs (512-dim CLIP image embeddings)"
    ],
    use_cases: [
      "Semantic search for legal documents",
      "Traffic sign identification from camera images"
    ]
  }
}
```

---

## Pattern 3.1: Qdrant Client Initialization

### Overview

```pseudo
PATTERN QdrantClientInit {
  PURPOSE: "Initialize async Qdrant client with lazy loading"

  PROBLEM: "Need efficient Qdrant client for vector database operations"

  SOLUTION: "Lazy initialization with timeout configuration"

  USE_CASES: [
    "Semantic search for Vietnamese legal documents",
    "Image search for traffic signs"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW QdrantClientInit_Workflow {
  INPUT: {
    settings: {
      QDRANT_HOST: string,
      QDRANT_PORT: int
    }
  }

  PRECONDITIONS: [
    "Qdrant server is running",
    "Host and port are accessible"
  ]

  STEPS: {
    STEP_1_CHECK_EXISTING: {
      description: "Check if client already exists"
      logic: |
        IF self._client IS_NOT_NULL THEN
          RETURN self._client
        END IF
    }

    STEP_2_CREATE_CLIENT: {
      description: "Create Qdrant client"
      logic: |
        self._client = QdrantClient(
          host: settings.QDRANT_HOST,
          port: settings.QDRANT_PORT,
          timeout: 30.0
        )
        LOG "Qdrant client initialized"
    }

    STEP_3_RETURN: {
      description: "Return client instance"
      logic: |
        RETURN self._client
    }
  }

  OUTPUT: {
    client: QdrantClient
  }

  POSTCONDITIONS: [
    "Client is initialized",
    "Ready for vector operations"
  ]
}
```

---

## Pattern 3.2: Create Collection

### Overview

```pseudo
PATTERN CreateCollection {
  PURPOSE: "Create vector collection with schema definition"

  PROBLEM: "Need to create collection with vector size and distance metric"

  SOLUTION: "Check existence first, then create with schema"

  USE_CASES: [
    "Create legal_docs collection (1024-dim)",
    "Create traffic_signs collection (512-dim CLIP)",
    "Create traffic_violations collection (1024-dim)"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW CreateCollection_Workflow {
  INPUT: {
    collection_name: string,
    vector_size: int = 1024,
    distance: string = "Cosine"
  }

  STEPS: {
    STEP_1_CHECK_EXISTS: {
      logic: |
        client = AWAIT self._get_client()
        collections = client.get_collections()

        FOR EACH collection IN collections.collections:
          IF collection.name == collection_name THEN
            LOG "Collection already exists: " + collection_name
            RETURN True
          END IF
        END FOR
    }

    STEP_2_CREATE: {
      logic: |
        distance_metric = Distance.COSINE IF distance == "Cosine" ELSE Distance.DOT

        client.create_collection(
          collection_name: collection_name,
          vectors_config: VectorParams(
            size: vector_size,
            distance: distance_metric
          )
        )
        LOG "Created collection: " + collection_name
        RETURN True
    }
  }

  ERROR_HANDLING: {
    Exception: "Log error and return False"
  }

  OUTPUT: boolean (True if created or exists, False on error)
}
```

---

## Pattern 3.3: Upsert Vectors

### Overview

```pseudo
PATTERN UpsertVectors {
  PURPOSE: "Insert or update vectors in collection with metadata"

  PROBLEM: "Need batch upsert with payload for filtering"

  SOLUTION: "Use PointStruct for structured points with metadata"

  USE_CASES: [
    "Upsert legal documents with Vietnamese content",
    "Upsert traffic violation descriptions",
    "Update existing vectors with new embeddings"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW UpsertVectors_Workflow {
  INPUT: {
    collection_name: string,
    points: List<{
      id: string,
      vector: List<float>,
      payload: {
        title: string,
        content: string,
        doc_type: string,
        source?: string
      }
    }>
  }

  STEPS: {
    STEP_1_BUILD_POINTS: {
      logic: |
        point_structs = []
        FOR EACH point IN points:
          point_struct = PointStruct(
            id: point.id,
            vector: point.vector,
            payload: point.payload
          )
          point_structs.APPEND(point_struct)
        END FOR
    }

    STEP_2_UPSERT: {
      logic: |
        client = AWAIT self._get_client()
        client.upsert(
          collection_name: collection_name,
          points: point_structs
        )
        LOG "Upserted " + points.length + " vectors to " + collection_name
    }
  }

  ERROR_HANDLING: {
    Exception: "Log error and return False"
  }

  OUTPUT: boolean (True if successful, False on error)
}
```

---

## Pattern 3.4: Vector Search (Semantic Search)

### Overview

```pseudo
PATTERN SemanticSearch {
  PURPOSE: "Search similar vectors by query embedding with filters"

  PROBLEM: "Need semantic search with metadata filters and score threshold"

  SOLUTION: "Convert query to embedding, apply filters, return structured results"

  USE_CASES: [
    "Search Vietnamese legal documents by query",
    "Filter by doc_type (traffic_violation, legal_document)",
    "Apply score threshold to filter low-quality results"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW SemanticSearch_Workflow {
  INPUT: {
    query: string,
    collection: string,
    limit: int = 10,
    score_threshold: float = 0.7,
    filters?: {
      doc_type?: string,
      vehicle_type?: string,
      source?: string
    }
  }

  STEPS: {
    STEP_1_GET_EMBEDDING: {
      description: "Convert query to embedding"
      logic: |
        query_vector = AWAIT self.embedding_service.embed_text(query)
        // Example: [0.1, 0.2, ..., 0.9] (1024-dim)
    }

    STEP_2_BUILD_FILTER: {
      logic: |
        filter_condition = None

        IF filters IS_NOT_NULL THEN
          conditions = []
          FOR EACH (key, value) IN filters:
            condition = FieldCondition(
              key: key,
              match: { value: value }
            )
            conditions.APPEND(condition)
          END FOR

          filter_condition = Filter(must: conditions)
        END IF
    }

    STEP_3_SEARCH: {
      logic: |
        client = AWAIT self._get_client()
        search_result = client.search(
          collection_name: collection,
          query_vector: query_vector,
          limit: limit,
          score_threshold: score_threshold,
          query_filter: filter_condition
        )
    }

    STEP_4_CONVERT: {
      logic: |
        results = []
        FOR EACH hit IN search_result:
          result = SearchResult(
            id: hit.id,
            score: hit.score,
            payload: hit.payload
          )
          results.APPEND(result)
        END FOR
        RETURN results
    }
  }

  OUTPUT: List<SearchResult>
}
```

### Key Interfaces

```typescript
interface SearchResult {
  id: string;
  score: number;
  payload: {
    title: string;
    content: string;
    doc_type: string;
    source?: string;
  };
}
```

---

## Pattern 3.5: Image Search (CLIP Embeddings)

### Overview

```pseudo
PATTERN ImageSearch {
  PURPOSE: "Search similar images using CLIP embeddings"

  PROBLEM: "Need image similarity search for Vietnamese traffic signs"

  SOLUTION: "Use 512-dim CLIP embeddings with higher score threshold"

  USE_CASES: [
    "Identify traffic sign from camera image",
    "Find similar traffic signs",
    "Traffic sign recognition for Vietnamese roads"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ImageSearch_Workflow {
  INPUT: {
    image_embedding: List<float>,  // 512-dim CLIP embedding
    collection: string = "traffic_signs",
    limit: int = 5,
    score_threshold: float = 0.8
  }

  STEPS: {
    STEP_1_SEARCH: {
      logic: |
        client = AWAIT self._get_client()
        search_result = client.search(
          collection_name: collection,
          query_vector: image_embedding,
          limit: limit,
          score_threshold: score_threshold
        )
    }

    STEP_2_CONVERT: {
      logic: |
        results = []
        FOR EACH hit IN search_result:
          result = ImageSearchResult(
            id: hit.id,
            score: hit.score,
            image_url: hit.payload.get("image_url"),
            sign_type: hit.payload.get("sign_type"),
            description: hit.payload.get("description")
          )
          results.APPEND(result)
        END FOR
        RETURN results
    }
  }

  OUTPUT: List<ImageSearchResult>
}
```

### Key Interfaces

```typescript
interface ImageSearchResult {
  id: string;
  score: number;
  image_url: string;
  sign_type: string;           // "prohibitory" | "warning" | "mandatory"
  description: string;         // "Cấm sử dụng điện thoại" / "携帯電話使用禁止"
}
```

---

## Pattern 3.6: Scroll (Retrieve All Points)

### Overview

```pseudo
PATTERN ScrollCollection {
  PURPOSE: "Retrieve all points from collection with pagination"

  PROBLEM: "Need to retrieve all points for batch processing or export"

  SOLUTION: "Use scroll with offset for pagination"

  USE_CASES: [
    "Export all legal documents",
    "Batch reprocessing of embeddings",
    "Collection backup"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW ScrollCollection_Workflow {
  INPUT: {
    collection_name: string,
    limit: int = 100,
    offset?: string = None
  }

  STEPS: {
    STEP_1_SCROLL: {
      logic: |
        client = AWAIT self._get_client()
        scroll_result = client.scroll(
          collection_name: collection_name,
          limit: limit,
          offset: offset,
          with_payload: True,
          with_vectors: False  // Save bandwidth
        )
    }

    STEP_2_EXTRACT: {
      logic: |
        points = []
        FOR EACH point IN scroll_result[0]:
          point_data = {
            id: point.id,
            payload: point.payload
          }
          points.APPEND(point_data)
        END FOR

        next_offset = scroll_result[1]  // None if no more results
    }

    STEP_3_RETURN: {
      logic: |
        RETURN (points, next_offset)
    }
  }

  OUTPUT: (List<Point>, next_offset: string | None)
}
```

---

## Pattern 3.7: Delete Points

### Overview

```pseudo
PATTERN DeletePoints {
  PURPOSE: "Delete specific points from collection by IDs"

  PROBLEM: "Need batch deletion of vectors"

  SOLUTION: "Use points_selector for ID-based deletion"

  USE_CASES: [
    "Delete outdated legal documents",
    "Remove duplicate vectors",
    "Clean up test data"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW DeletePoints_Workflow {
  INPUT: {
    collection_name: string,
    point_ids: List<string>
  }

  STEPS: {
    STEP_1_DELETE: {
      logic: |
        client = AWAIT self._get_client()
        client.delete(
          collection_name: collection_name,
          points_selector: point_ids
        )
        LOG "Deleted " + point_ids.length + " points from " + collection_name
        RETURN True
    }
  }

  ERROR_HANDLING: {
    Exception: "Log error and return False"
  }

  OUTPUT: boolean (True if successful, False on error)
}
```

---

## Pattern 3.8: Health Check

### Workflow

```pseudo
WORKFLOW QdrantHealthCheck_Workflow {
  INPUT: None

  STEPS: {
    STEP_1_CHECK: {
      logic: |
        TRY:
          client = AWAIT self._get_client()
          collections = client.get_collections()
          collection_count = collections.collections.length

          LOG "Qdrant health check passed (" + collection_count + " collections)"
          RETURN True
        CATCH error:
          LOG_ERROR("Qdrant health check failed: " + error)
          RETURN False
        END TRY
    }
  }

  OUTPUT: boolean
}
```

---

## Domain Context Examples

### Vietnamese Legal Document Collections

```pseudo
COLLECTION_SCHEMAS = {
  legal_docs: {
    vector_size: 1024,
    distance: "Cosine",
    payload_schema: {
      title: "string (Tên văn bản pháp lý)",
      content: "string (Nội dung)",
      doc_type: "legal_document | regulation | decree",
      source: "string (Nguồn)",
      law_reference: "string (Nghị định số...)"
    },
    example: {
      title: "Nghị định 100/2019/NĐ-CP",
      content: "Quy định xử phạt vi phạm hành chính...",
      doc_type: "decree",
      source: "Chính phủ Việt Nam"
    }
  },

  traffic_violations: {
    vector_size: 1024,
    distance: "Cosine",
    payload_schema: {
      code: "string (VN-46-01-a)",
      title_vi: "string (Sử dụng điện thoại khi lái xe)",
      title_ja: "string (運転中の携帯電話使用)",
      description: "string",
      vehicle_type: "motorcycle | car | truck | ALL"
    }
  },

  traffic_signs: {
    vector_size: 512,  // CLIP embeddings
    distance: "Cosine",
    payload_schema: {
      image_url: "string",
      sign_type: "prohibitory | warning | mandatory",
      description: "string (Biển báo giao thông)"
    },
    example: {
      image_url: "/signs/prohibit_phone.png",
      sign_type: "prohibitory",
      description: "Cấm sử dụng điện thoại / 携帯電話使用禁止"
    }
  }
}
```

---

## Integration Example

### RAG System with Semantic Cache

```pseudo
INTEGRATION RAGSystemWithCache {
  SCENARIO: "Legal chatbot with semantic search and response caching"

  WORKFLOW: {
    STEP_1_CHECK_CACHE: |
      cached_response = AWAIT RedisRepository.get_similar_cached_response(
        query_embedding: query_embedding,
        threshold: 0.95
      )

      IF cached_response IS_NOT_NULL THEN
        LOG "Cache hit (similarity: " + cached_response.score + ")"
        RETURN cached_response.response
      END IF

    STEP_2_SEMANTIC_SEARCH: |
      search_results = AWAIT QdrantRepository.search(
        query: user_query,
        collection: "legal_docs",
        limit: 5,
        score_threshold: 0.7,
        filters: { doc_type: "legal_document" }
      )

    STEP_3_GENERATE_RESPONSE: |
      context = BUILD_CONTEXT(search_results)
      response = AWAIT LLM.generate(
        prompt: context + user_query,
        temperature: 0.7
      )

    STEP_4_CACHE_RESPONSE: |
      AWAIT RedisRepository.cache_response_with_embedding(
        query: user_query,
        query_embedding: query_embedding,
        response: response,
        ttl: 3600  // 1 hour
      )

      RETURN response
  }

  BENEFITS: [
    "Reduce LLM API calls for similar queries",
    "Faster response time (cache hit < 50ms)",
    "Cost optimization"
  ]
}
```

---

## Validation Checklist

```pseudo
VALIDATION QdrantRepositoryValidation {
  CHECKS: [
    "Use QdrantClient with lazy initialization",
    "Create collections with schema (vector size, distance)",
    "Use PointStruct for structured points",
    "Include payload for metadata filtering",
    "Convert query to embedding before search",
    "Use score threshold (0.7+ for text, 0.8+ for images)",
    "Support filters with Filter(must=[...])",
    "Use scroll for retrieving all points",
    "Set with_vectors=False by default (save bandwidth)",
    "Return structured domain models (not raw hits)"
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
    relationship: "Qdrant repository can implement base interface",
    integration: "Common CRUD operations"
  },
  {
    pattern: "Pattern 2.4 - Neo4j GraphRAG Traversal",
    relationship: "Used together for hybrid retrieval",
    integration: "Combines vector + graph results"
  },
  {
    pattern: "Pattern 2.3 - Redis Semantic Cache",
    relationship: "Cache RAG responses with embeddings",
    integration: "Reduces Qdrant search calls"
  }
]
```

---

## References

- **Qdrant Docs**: [Qdrant Python Client](https://qdrant.tech/documentation/quick-start/)
- **CLIP**: [OpenAI CLIP](https://github.com/openai/CLIP)
- **Vietnamese Traffic Signs**: [Vietnam Traffic Sign Database](https://gplx.gov.vn)

---

**File**: `specialists/code/fastapi-react/fastapi-qdrant-repository.md`
**Patterns**: 8 (Qdrant-specific patterns)
**Lines**: ~680
**Created**: 2026-01-02
