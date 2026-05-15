# FastAPI Redis & Unit of Work Specialist
# FastAPI Redis & Unit of Work スペシャリスト
# Chuyên Gia Redis & Unit of Work FastAPI

**Role**: Cache & Transaction Coordination Expert
**Focus**: Redis Repository, Unit of Work, Semantic Cache
**Technology**: Redis 7.x, Async Redis, Transaction Coordination
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST RedisUoWSpecialist {
  ROLE: "Cache repository and transaction coordination expert"

  RESPONSIBILITIES: [
    "Manage async Redis client initialization",
    "Execute basic and advanced cache operations",
    "Implement semantic cache with embeddings for RAG",
    "Coordinate transactions across multiple repositories",
    "Provide Unit of Work pattern for atomic operations"
  ]

  TECH_STACK: {
    primary: "Redis 7.x",
    libraries: ["redis.asyncio", "python 3.11+"],
    patterns: ["Repository Pattern", "Unit of Work", "Semantic Cache"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    use_cases: [
      "Session cache for Vietnamese legal chatbot",
      "Semantic cache for RAG responses",
      "Atomic operations across PostgreSQL + Neo4j"
    ]
  }
}
```

---

## REDIS PATTERNS

---

## Pattern 2.1: Redis Client Initialization

### Workflow

```pseudo
WORKFLOW RedisClientInit_Workflow {
  INPUT: {
    settings: {
      REDIS_URI: string
    }
  }

  STEPS: {
    STEP_1_CHECK: {
      logic: |
        IF self._client IS_NOT_NULL THEN
          RETURN self._client
        END IF
    }

    STEP_2_CREATE: {
      logic: |
        self._client = AWAIT aioredis.from_url(
          url: settings.REDIS_URI,
          encoding: "utf-8",
          decode_responses: True,
          max_connections: 50
        )
        LOG "Redis client initialized"
    }
  }

  OUTPUT: aioredis.Redis
}
```

---

## Pattern 2.2: Redis Basic Operations

### Workflow

```pseudo
WORKFLOW RedisBasicOps_Workflow {
  OPERATIONS: {
    GET: {
      input: { key: string }
      logic: |
        client = AWAIT self._get_client()
        RETURN AWAIT client.get(key)
      output: string | None
    }

    SET: {
      input: { key: string, value: string, ttl?: int }
      logic: |
        client = AWAIT self._get_client()
        IF ttl IS_NOT_NULL THEN
          RETURN AWAIT client.setex(key, ttl, value)
        ELSE
          RETURN AWAIT client.set(key, value)
        END IF
      output: boolean
    }

    DELETE: {
      input: { key: string }
      logic: |
        client = AWAIT self._get_client()
        deleted = AWAIT client.delete(key)
        RETURN deleted > 0
      output: boolean
    }
  }
}
```

---

## Pattern 2.3: Redis Semantic Cache

### Overview

```pseudo
PATTERN SemanticCache {
  PURPOSE: "Cache RAG responses with query embeddings for similarity search"

  PROBLEM: "Need to cache responses with embeddings for semantic similarity matching"

  SOLUTION: "Store embeddings with responses, use cosine similarity for cache hits"

  USE_CASES: [
    "Cache Vietnamese legal chatbot responses",
    "Reuse similar query responses (similarity ≥ 0.95)",
    "Reduce LLM API calls"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW SemanticCacheGet_Workflow {
  INPUT: {
    query_embedding: List<float>,
    threshold: float = 0.95
  }

  STEPS: {
    STEP_1_GET_ALL_KEYS: {
      logic: |
        client = AWAIT self._get_client()
        cache_keys = AWAIT client.keys("cache:query:*")
    }

    STEP_2_FIND_BEST_MATCH: {
      logic: |
        max_similarity = 0.0
        best_match_key = None

        FOR EACH key IN cache_keys:
          cached_data = AWAIT client.get(key)
          IF cached_data IS_NULL THEN CONTINUE

          data = JSON.parse(cached_data)
          cached_embedding = data["embedding"]

          similarity = COSINE_SIMILARITY(query_embedding, cached_embedding)

          IF similarity > max_similarity AND similarity >= threshold THEN
            max_similarity = similarity
            best_match_key = key
          END IF
        END FOR
    }

    STEP_3_RETURN: {
      logic: |
        IF best_match_key IS_NOT_NULL THEN
          cached_data = JSON.parse(AWAIT client.get(best_match_key))
          RETURN (cached_data["response"], max_similarity)
        ELSE
          RETURN None
        END IF
    }
  }

  OUTPUT: (response: string, similarity: float) | None
}

WORKFLOW SemanticCacheSet_Workflow {
  INPUT: {
    query: string,
    query_embedding: List<float>,
    response: string,
    ttl: int = 3600
  }

  STEPS: {
    STEP_1_BUILD_DATA: {
      logic: |
        cache_key = "cache:query:" + HASH(query)
        cache_data = {
          query: query,
          embedding: query_embedding,
          response: response
        }
    }

    STEP_2_SET: {
      logic: |
        client = AWAIT self._get_client()
        AWAIT client.setex(cache_key, ttl, JSON.stringify(cache_data))
    }
  }

  OUTPUT: None
}
```

### Helper Function

```pseudo
FUNCTION COSINE_SIMILARITY(vec1, vec2) {
  dot_product = SUM(vec1[i] * vec2[i] FOR i IN 0..vec1.length)
  norm1 = SQRT(SUM(vec1[i]^2 FOR i IN 0..vec1.length))
  norm2 = SQRT(SUM(vec2[i]^2 FOR i IN 0..vec2.length))
  RETURN dot_product / (norm1 * norm2)
}
```

---

## Pattern 2.4: Redis Batch Operations

### Workflow

```pseudo
WORKFLOW RedisBatchOps_Workflow {
  OPERATIONS: {
    MGET: {
      input: { keys: List<string> }
      logic: |
        client = AWAIT self._get_client()
        RETURN AWAIT client.mget(keys)
      output: List<string | None>
    }

    MSET: {
      input: { mapping: Dict<string, string> }
      logic: |
        client = AWAIT self._get_client()
        RETURN AWAIT client.mset(mapping)
      output: boolean
    }

    PIPELINE: {
      input: { operations: List<{cmd: string, args: List}> }
      logic: |
        client = AWAIT self._get_client()
        ASYNC_WITH client.pipeline() AS pipe:
          FOR EACH op IN operations:
            cmd_func = getattr(pipe, op.cmd)
            cmd_func(*op.args)
          END FOR
          results = AWAIT pipe.execute()
        END ASYNC_WITH
        RETURN results
      output: List<any>
    }
  }
}
```

---

## Pattern 2.5: Redis Hash Operations

### Overview

```pseudo
PATTERN RedisHash {
  PURPOSE: "Store structured data as Redis hashes"

  PROBLEM: "Need to store session data efficiently with field access"

  SOLUTION: "Use hashes for structured data instead of JSON strings"

  USE_CASES: [
    "Store user chat session metadata",
    "Cache user preferences",
    "Store temporary form data"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW RedisHashSet_Workflow {
  INPUT: {
    session_id: string,
    session_data: Dict<string, any>
  }

  STEPS: {
    STEP_1_FLATTEN: {
      logic: |
        key = "session:" + session_id
        flat_data = {}

        FOR EACH (k, v) IN session_data:
          IF IS_DICT(v) OR IS_LIST(v) THEN
            flat_data[k] = JSON.stringify(v)
          ELSE
            flat_data[k] = STRING(v)
          END IF
        END FOR
    }

    STEP_2_SET: {
      logic: |
        client = AWAIT self._get_client()
        AWAIT client.hset(key, mapping: flat_data)
        AWAIT client.expire(key, 3600)  // 1 hour TTL
    }
  }

  OUTPUT: None
}

WORKFLOW RedisHashGet_Workflow {
  INPUT: {
    session_id: string
  }

  STEPS: {
    STEP_1_GET: {
      logic: |
        key = "session:" + session_id
        client = AWAIT self._get_client()
        data = AWAIT client.hgetall(key)

        IF data IS_EMPTY THEN
          RETURN None
        END IF
    }

    STEP_2_PARSE: {
      logic: |
        parsed_data = {}
        FOR EACH (k, v) IN data:
          TRY:
            parsed_data[k] = JSON.parse(v)
          CATCH:
            parsed_data[k] = v
          END TRY
        END FOR
        RETURN parsed_data
    }
  }

  OUTPUT: Dict<string, any> | None
}
```

---

## Pattern 2.6: Redis Health Check

### Workflow

```pseudo
WORKFLOW RedisHealthCheck_Workflow {
  INPUT: None

  STEPS: {
    STEP_1_PING: {
      logic: |
        TRY:
          client = AWAIT self._get_client()
          pong = AWAIT client.ping()
          RETURN pong IS True
        CATCH error:
          LOG_ERROR("Redis health check failed: " + error)
          RETURN False
        END TRY
    }
  }

  OUTPUT: boolean
}
```

---

## UNIT OF WORK PATTERNS

---

## Pattern 3.1: Unit of Work - Transaction Coordination

### Overview

```pseudo
PATTERN UnitOfWork {
  PURPOSE: "Coordinate atomic transactions across PostgreSQL and Neo4j"

  PROBLEM: "Need to ensure both databases commit or both rollback"

  SOLUTION: "Use context manager to coordinate transaction lifecycle"

  USE_CASES: [
    "Create user session in Postgres AND initial document in Neo4j",
    "Update chat session AND create graph relationships",
    "Delete session AND remove related documents"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW UnitOfWork_Workflow {
  INITIALIZATION: {
    logic: |
      self.postgres = PostgresRepository()
      self.neo4j = Neo4jRepository()
      self._postgres_session = None
      self._neo4j_transaction = None
  }

  TRANSACTION: {
    STEP_1_BEGIN: {
      logic: |
        // Start Postgres transaction
        session_factory = AWAIT self.postgres._get_session_factory()
        self._postgres_session = session_factory()
        AWAIT self._postgres_session.begin()

        // Start Neo4j transaction
        neo4j_driver = AWAIT self.neo4j._get_driver()
        neo4j_session = neo4j_driver.session()
        self._neo4j_transaction = AWAIT neo4j_session.begin_transaction()
    }

    STEP_2_YIELD: {
      description: "Yield self for operations"
      logic: |
        TRY:
          YIELD self
    }

    STEP_3_COMMIT: {
      description: "Commit both transactions"
      logic: |
          AWAIT self._postgres_session.commit()
          AWAIT self._neo4j_transaction.commit()
          LOG "Unit of Work: All transactions committed"
    }

    STEP_4_ERROR_HANDLING: {
      logic: |
        CATCH error:
          // Rollback both transactions
          AWAIT self._postgres_session.rollback()
          AWAIT self._neo4j_transaction.rollback()
          LOG_ERROR("Unit of Work: All transactions rolled back: " + error)
          RAISE error
        END TRY
    }

    STEP_5_CLEANUP: {
      logic: |
        FINALLY:
          AWAIT self._postgres_session.close()
          AWAIT neo4j_session.close()
          self._postgres_session = None
          self._neo4j_transaction = None
        END FINALLY
    }
  }

  CLOSE: {
    logic: |
      AWAIT self.postgres.close()
      AWAIT self.neo4j.close()
  }
}
```

---

## Pattern 3.2: Unit of Work - Usage Example

### Overview

```pseudo
PATTERN UoWUsage {
  PURPOSE: "Example of using Unit of Work in service layer"

  PROBLEM: "Show how to create session + document atomically"

  SOLUTION: "Use 'async with uow.transaction()' context manager"

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW UoWUsage_Workflow {
  SERVICE_LAYER: {
    SCENARIO: "Create chat session in Postgres AND initial context document in Neo4j"

    INITIALIZATION: {
      logic: |
        self.uow = UnitOfWork()
    }

    CREATE_SESSION_WITH_CONTEXT: {
      input: {
        session_id: string,
        user_id: string,
        initial_document: Document
      }

      logic: |
        ASYNC_WITH self.uow.transaction():
          // Operation 1: Create session in Postgres
          session = SessionModel(
            id: session_id,
            user_id: user_id,
            created_at: NOW()
          )
          AWAIT self.uow.postgres.create_session(session)

          // Operation 2: Create document in Neo4j
          AWAIT self.uow.neo4j.create(initial_document)

          // If either fails, both rollback automatically
        END ASYNC_WITH

        RETURN session
    }

    SHUTDOWN: {
      logic: |
        AWAIT self.uow.close()
    }
  }
}
```

---

## Integration Example

### RAG System with Semantic Cache

```pseudo
INTEGRATION RAGWithSemanticCache {
  SCENARIO: "Legal chatbot with semantic cache and multi-database persistence"

  COMPONENTS: {
    postgres: "Store user sessions and chat history",
    neo4j: "Store legal documents and relationships",
    qdrant: "Semantic search for legal documents",
    redis: "Semantic cache for RAG responses"
  }

  WORKFLOW: {
    STEP_1_CHECK_CACHE: |
      query_embedding = AWAIT embedding_service.embed_text(user_query)

      cached = AWAIT redis_repo.get_similar_cached_response(
        query_embedding: query_embedding,
        threshold: 0.95
      )

      IF cached IS_NOT_NULL THEN
        LOG "Cache hit (similarity: " + cached.similarity + ")"
        RETURN cached.response
      END IF

    STEP_2_SEMANTIC_SEARCH: |
      search_results = AWAIT qdrant_repo.search(
        query: user_query,
        collection: "legal_docs",
        limit: 5,
        threshold: 0.7
      )

    STEP_3_GRAPH_TRAVERSE: |
      graph_results = AWAIT neo4j_repo.find_related(
        query: user_query,
        relationships: ["OFTEN_CONFUSED_WITH", "REQUIRES_EVIDENCE_OF"],
        limit: 5
      )

    STEP_4_GENERATE_RESPONSE: |
      context = MERGE(search_results, graph_results)
      response = AWAIT llm.generate(
        prompt: BUILD_PROMPT(context, user_query),
        temperature: 0.7
      )

    STEP_5_CACHE_AND_PERSIST: |
      // Cache response
      AWAIT redis_repo.cache_response_with_embedding(
        query: user_query,
        query_embedding: query_embedding,
        response: response,
        ttl: 3600
      )

      // Persist chat history (atomic operation)
      ASYNC_WITH uow.transaction():
        // Update session
        AWAIT uow.postgres.update_session(session_id, {
          message_count: session.message_count + 2,
          last_message: user_query
        })

        // Store chat message
        AWAIT uow.postgres.create_message({
          session_id: session_id,
          role: "user",
          content: user_query
        })
        AWAIT uow.postgres.create_message({
          session_id: session_id,
          role: "assistant",
          content: response
        })
      END ASYNC_WITH

      RETURN response
  }

  BENEFITS: [
    "Fast cache hits (< 50ms)",
    "Reduced LLM API calls",
    "Atomic persistence across databases",
    "Hybrid search (vector + graph)"
  ]
}
```

---

## Validation Checklist

```pseudo
VALIDATION RedisUoWValidation {
  REDIS_CHECKS: [
    "Use redis.asyncio with lazy initialization",
    "Set decode_responses=True for string handling",
    "Set encoding='utf-8' for Vietnamese text",
    "Use setex for TTL support (not separate expire)",
    "Store embeddings with responses for semantic cache",
    "Use cosine similarity with 0.95+ threshold",
    "Use mget/mset for batch operations",
    "Use pipeline for mixed operations",
    "Use hashes for structured data (not JSON strings)",
    "Implement health check with ping()"
  ]

  UOW_CHECKS: [
    "Use context manager for automatic commit/rollback",
    "Commit ALL or rollback ALL (atomic)",
    "Clean up resources in finally block",
    "Log transaction outcomes",
    "Raise exception after rollback",
    "Close Unit of Work on service shutdown"
  ]

  PASS_CRITERIA: "All checks must pass"
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 1.3 - Postgres Read Single",
    relationship: "Used in cache-aside pattern",
    integration: "Check cache, fallback to database"
  },
  {
    pattern: "Pattern 2.4 - Neo4j Transaction",
    relationship: "Coordinated via Unit of Work",
    integration: "Atomic operations across databases"
  },
  {
    pattern: "Pattern 3.4 - Qdrant Semantic Search",
    relationship: "Combined with semantic cache",
    integration: "Cache search results with embeddings"
  }
]
```

---

## References

- **Redis Async**: [redis.asyncio](https://redis-py.readthedocs.io/en/stable/examples/asyncio_examples.html)
- **Unit of Work Pattern**: [Martin Fowler - UoW](https://martinfowler.com/eaaCatalog/unitOfWork.html)
- **Semantic Caching**: [GPTCache](https://github.com/zilliztech/GPTCache)

---

**File**: `specialists/code/fastapi-react/fastapi-redis-uow.md`
**Patterns**: 8 (6 Redis + 2 Unit of Work)
**Lines**: ~790
**Created**: 2026-01-02
