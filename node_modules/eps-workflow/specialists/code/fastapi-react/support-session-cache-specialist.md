# Support Session & Cache Specialist
# サポートセッション&キャッシュ スペシャリスト
# Chuyên Gia Session & Cache

**Role**: Session Management & Caching Pattern Expert
**Focus**: Session CRUD, message history, semantic cache, multi-level caching
**Patterns**: 3.1-3.6, 3.13-3.14 (8 patterns)
**Technology**: Redis, Embeddings, Python 3.11
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST SupportSessionCache {
  ROLE: "Session Management and Intelligent Caching Expert"

  RESPONSIBILITIES: [
    "Manage user sessions with Redis storage and TTL",
    "Store conversation message history",
    "Implement semantic caching with embedding similarity",
    "Provide multi-level caching (L1 memory + L2 Redis)",
    "Handle cache warming and preloading",
    "Clean up expired sessions and orphaned data"
  ]

  TECH_STACK: {
    primary: "FastAPI + Python 3.11",
    storage: ["Redis (sessions & cache)"],
    libraries: ["redis-py", "cachetools", "sentence-transformers"],
    patterns: ["Get-or-create", "TTL management", "Semantic similarity"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Session", "Message", "Cache", "Metadata"]
  }
}
```

---

## Pattern 3.1: Session CRUD Operations

### Overview

```pseudo
PATTERN SessionCRUD {
  PURPOSE: "Session get-or-create with Redis storage"

  PROBLEM: "Need efficient session management with automatic creation and TTL"

  SOLUTION: "Get-or-create pattern with Redis storage and 1-hour TTL"

  USE_CASES: [
    "Start new chat session",
    "Resume existing session",
    "Update session activity"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SessionService_GetOrCreate {
  INPUT: {
    session_id: string,
    user_id: string,
    mode: string
  }

  STEPS: {
    STEP_1_TRY_GET: {
      description: "Try to get existing session"
      logic: |
        key = "session:" + session_id
        session_data = AWAIT Redis.get(key)

        IF session_data IS NOT NULL THEN
          session = Session.parse_json(session_data)
          RETURN session
        END IF
    }

    STEP_2_CREATE: {
      description: "Create new session"
      logic: |
        new_session = Session(
          id=session_id,
          user_id=user_id,
          mode=mode,
          created_at=NOW(),
          last_active=NOW()
        )
    }

    STEP_3_STORE: {
      description: "Store with TTL"
      logic: |
        key = "session:" + session_id
        AWAIT Redis.set(
          key,
          new_session.to_json(),
          ex=3600  // 1 hour TTL
        )
    }

    STEP_4_RETURN: {
      description: "Return session"
      logic: |
        RETURN new_session
    }
  }

  OUTPUT: Session
}

WORKFLOW SessionService_UpdateActivity {
  INPUT: {
    session_id: string
  }

  STEPS: {
    STEP_1_GET: {
      description: "Get session"
      logic: |
        session = AWAIT GET_OR_CREATE(session_id, "", "")
    }

    STEP_2_UPDATE: {
      description: "Update timestamp"
      logic: |
        session.last_active = NOW()
    }

    STEP_3_SAVE: {
      description: "Save with TTL"
      logic: |
        key = "session:" + session_id
        AWAIT Redis.set(key, session.to_json(), ex=3600)
    }
  }

  OUTPUT: void
}
```

### Key Interfaces

```typescript
interface Session {
  id: string;
  user_id: string;
  mode: string;
  created_at: Date;
  last_active: Date;
}

class SessionService {
  async getOrCreate(
    session_id: string,
    user_id: string,
    mode: string
  ): Promise<Session>;

  async updateActivity(session_id: string): Promise<void>;
}
```

---

## Pattern 3.2: Message History Management

### Overview

```pseudo
PATTERN MessageHistory {
  PURPOSE: "Message history with Redis lists"

  PROBLEM: "Need efficient chronological message storage with cleanup"

  SOLUTION: "Use Redis RPUSH for append-only, LRANGE for retrieval"

  USE_CASES: [
    "Store conversation messages",
    "Retrieve recent chat history",
    "Clear session messages"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SessionService_AddMessage {
  INPUT: {
    session_id: string,
    message: Message
  }

  STEPS: {
    STEP_1_APPEND: {
      description: "Append to list"
      logic: |
        key = "session:" + session_id + ":messages"
        AWAIT Redis.rpush(key, message.to_json())
    }

    STEP_2_SET_TTL: {
      description: "Set expiration"
      logic: |
        AWAIT Redis.expire(key, 3600)
    }
  }

  OUTPUT: void
}

WORKFLOW SessionService_GetMessages {
  INPUT: {
    session_id: string,
    limit: integer = 20
  }

  STEPS: {
    STEP_1_RETRIEVE: {
      description: "Get last N messages"
      logic: |
        key = "session:" + session_id + ":messages"
        messages_data = AWAIT Redis.lrange(key, -limit, -1)
    }

    STEP_2_PARSE: {
      description: "Parse messages"
      logic: |
        messages = []
        FOR data IN messages_data:
          msg = Message.parse_json(data)
          messages.APPEND(msg)
        END FOR
    }

    STEP_3_RETURN: {
      description: "Return messages"
      logic: |
        RETURN messages
    }
  }

  OUTPUT: Message[]
}
```

---

## Pattern 3.3: Semantic Cache

### Overview

```pseudo
PATTERN SemanticCache {
  PURPOSE: "Semantic caching with embedding similarity"

  PROBLEM: "Need intelligent caching for semantically similar queries"

  SOLUTION: "Store query embeddings, search by cosine similarity"

  USE_CASES: [
    "Cache LLM responses",
    "Find similar queries",
    "Reduce redundant API calls"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW CacheService_GetSimilar {
  INPUT: {
    query: string,
    threshold: float = 0.95
  }

  STEPS: {
    STEP_1_EMBED: {
      description: "Generate query embedding"
      logic: |
        query_embedding = AWAIT EmbeddingService.embed(query)
    }

    STEP_2_SEARCH: {
      description: "Search cached embeddings"
      logic: |
        cached_keys = AWAIT Redis.keys("cache:*")
        best_match = NULL
        best_similarity = 0.0

        FOR key IN cached_keys:
          cached_data = AWAIT Redis.get(key)
          IF cached_data IS NULL THEN CONTINUE END IF

          cached = JSON.parse(cached_data)
          similarity = COSINE_SIMILARITY(
            query_embedding,
            cached.embedding
          )

          IF similarity >= threshold AND similarity > best_similarity THEN
            best_match = cached.response
            best_similarity = similarity
          END IF
        END FOR
    }

    STEP_3_RETURN: {
      description: "Return if found"
      logic: |
        IF best_match IS NOT NULL THEN
          RETURN ChatResponse.parse(best_match)
        END IF
        RETURN NULL
    }
  }

  OUTPUT: ChatResponse | null
}

WORKFLOW CacheService_Store {
  INPUT: {
    query: string,
    response: ChatResponse
  }

  STEPS: {
    STEP_1_EMBED: {
      description: "Generate embedding"
      logic: |
        embedding = AWAIT EmbeddingService.embed(query)
    }

    STEP_2_CREATE_KEY: {
      description: "Generate cache key"
      logic: |
        key = "cache:" + MD5(query)
    }

    STEP_3_STORE: {
      description: "Store with 24h TTL"
      logic: |
        cache_entry = {
          query: query,
          embedding: embedding.tolist(),
          response: response.to_dict()
        }

        AWAIT Redis.set(
          key,
          JSON.stringify(cache_entry),
          ex=86400  // 24 hours
        )
    }
  }

  OUTPUT: void
}

FUNCTION COSINE_SIMILARITY(a, b) {
  dot_product = DOT(a, b)
  norm_a = NORM(a)
  norm_b = NORM(b)
  RETURN dot_product / (norm_a * norm_b)
}
```

---

## Pattern 3.4: Cache Invalidation

### Overview

```pseudo
PATTERN CacheInvalidation {
  PURPOSE: "Multi-strategy cache invalidation"

  PROBLEM: "Need flexible invalidation (pattern, tag, all)"

  SOLUTION: "Pattern-based, tag-based, and bulk invalidation"

  USE_CASES: [
    "Invalidate by user",
    "Clear specific topics",
    "Reset all cache"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW CacheService_InvalidateByPattern {
  INPUT: {
    pattern: string
  }

  STEPS: {
    STEP_1_FIND: {
      description: "Find matching keys"
      logic: |
        keys = AWAIT Redis.keys("cache:" + pattern + "*")
    }

    STEP_2_DELETE: {
      description: "Delete keys"
      logic: |
        IF keys.length == 0 THEN RETURN 0 END IF
        deleted = AWAIT Redis.delete(*keys)
        RETURN deleted
    }
  }

  OUTPUT: integer
}

WORKFLOW CacheService_InvalidateByTag {
  INPUT: {
    tag: string
  }

  STEPS: {
    STEP_1_GET_KEYS: {
      description: "Get keys with tag"
      logic: |
        tag_key = "cache:tag:" + tag
        cache_keys = AWAIT Redis.smembers(tag_key)
    }

    STEP_2_DELETE: {
      description: "Delete cache + tag"
      logic: |
        IF cache_keys.length == 0 THEN RETURN 0 END IF
        all_keys = cache_keys + [tag_key]
        deleted = AWAIT Redis.delete(*all_keys)
        RETURN deleted - 1  // Exclude tag key
    }
  }

  OUTPUT: integer
}

WORKFLOW CacheService_GetStats {
  STEPS: {
    STEP_1_GET_KEYS: {
      description: "Get all cache keys"
      logic: |
        keys = AWAIT Redis.keys("cache:*")
    }

    STEP_2_CALCULATE: {
      description: "Calculate statistics"
      logic: |
        total_size = 0
        FOR key IN keys:
          size = AWAIT Redis.memory_usage(key)
          total_size += size OR 0
        END FOR
    }

    STEP_3_RETURN: {
      description: "Return stats"
      logic: |
        RETURN {
          total_entries: keys.length,
          total_size_bytes: total_size,
          total_size_mb: total_size / (1024 * 1024)
        }
    }
  }

  OUTPUT: CacheStats
}
```

---

## Pattern 3.5: Multi-Level Cache

### Overview

```pseudo
PATTERN MultiLevelCache {
  PURPOSE: "L1 (memory) + L2 (Redis) caching"

  PROBLEM: "Need ultra-fast cache with Redis fallback"

  SOLUTION: "In-memory TTLCache + Redis storage"

  USE_CASES: [
    "Frequently accessed data",
    "Worker-local cache",
    "Reduce Redis round-trips"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW MultiLevelCache_Get {
  CLASS_STATE: {
    l1_cache: TTLCache(maxsize=100, ttl=300)  // 5 minutes
  }

  INPUT: {
    key: string
  }

  STEPS: {
    STEP_1_CHECK_L1: {
      description: "Check memory cache"
      logic: |
        IF key IN l1_cache THEN
          RETURN l1_cache[key]
        END IF
    }

    STEP_2_CHECK_L2: {
      description: "Check Redis"
      logic: |
        data = AWAIT Redis.get("cache:" + key)
        IF data IS NULL THEN RETURN NULL END IF
    }

    STEP_3_POPULATE_L1: {
      description: "Populate L1 from L2"
      logic: |
        value = JSON.parse(data)
        l1_cache[key] = value
        RETURN value
    }
  }

  OUTPUT: any | null
}

WORKFLOW MultiLevelCache_Set {
  INPUT: {
    key: string,
    value: any,
    ttl: integer = 86400
  }

  STEPS: {
    STEP_1_SET_L1: {
      description: "Set in memory"
      logic: |
        l1_cache[key] = value
    }

    STEP_2_SET_L2: {
      description: "Set in Redis"
      logic: |
        AWAIT Redis.set(
          "cache:" + key,
          JSON.stringify(value),
          ex=ttl
        )
    }
  }

  OUTPUT: void
}

WORKFLOW MultiLevelCache_Delete {
  INPUT: {
    key: string
  }

  STEPS: {
    STEP_1_DELETE_L1: {
      description: "Delete from memory"
      logic: |
        l1_cache.pop(key, NULL)
    }

    STEP_2_DELETE_L2: {
      description: "Delete from Redis"
      logic: |
        AWAIT Redis.delete("cache:" + key)
    }
  }

  OUTPUT: void
}
```

---

## Pattern 3.6: Session Metadata

### Overview

```pseudo
PATTERN SessionMetadata {
  PURPOSE: "Session metadata and context tracking"

  PROBLEM: "Track session context (preferences, mode, state)"

  SOLUTION: "Use Redis hash for field-level operations"

  USE_CASES: [
    "Store user preferences",
    "Track conversation state",
    "Manage session context"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SessionService_SetMetadata {
  INPUT: {
    session_id: string,
    key: string,
    value: any
  }

  STEPS: {
    STEP_1_SET: {
      description: "Set hash field"
      logic: |
        metadata_key = "session:" + session_id + ":metadata"
        AWAIT Redis.hset(metadata_key, key, JSON.stringify(value))
    }

    STEP_2_EXPIRE: {
      description: "Set TTL"
      logic: |
        AWAIT Redis.expire(metadata_key, 3600)
    }
  }

  OUTPUT: void
}

WORKFLOW SessionService_GetMetadata {
  INPUT: {
    session_id: string,
    key: string
  }

  STEPS: {
    STEP_1_GET: {
      description: "Get field"
      logic: |
        metadata_key = "session:" + session_id + ":metadata"
        value = AWAIT Redis.hget(metadata_key, key)
    }

    STEP_2_PARSE: {
      description: "Parse JSON"
      logic: |
        IF value IS NULL THEN RETURN NULL END IF
        RETURN JSON.parse(value)
    }
  }

  OUTPUT: any | null
}

WORKFLOW SessionService_GetAllMetadata {
  INPUT: {
    session_id: string
  }

  STEPS: {
    STEP_1_GET_ALL: {
      description: "Get all fields"
      logic: |
        metadata_key = "session:" + session_id + ":metadata"
        data = AWAIT Redis.hgetall(metadata_key)
    }

    STEP_2_PARSE_ALL: {
      description: "Parse all values"
      logic: |
        metadata = {}
        FOR key, value IN data.items():
          metadata[key] = JSON.parse(value)
        END FOR
        RETURN metadata
    }
  }

  OUTPUT: dict
}
```

---

## Pattern 3.13: Cache Warming

### Overview

```pseudo
PATTERN CacheWarming {
  PURPOSE: "Cache warming and preloading"

  PROBLEM: "Cold cache causes slow initial requests"

  SOLUTION: "Preload frequently accessed data on startup"

  USE_CASES: [
    "Warm cache from query logs",
    "Preload common responses",
    "Startup optimization"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW CacheService_WarmCache {
  INPUT: {
    data_source: callable,
    keys: string[]
  }

  STEPS: {
    STEP_1_LOAD: {
      description: "Load data for each key"
      logic: |
        stats = { loaded: 0, errors: 0 }

        FOR key IN keys:
          TRY:
            data = AWAIT data_source(key)
            AWAIT STORE(key, data)
            stats.loaded += 1
          CATCH error:
            LOG_ERROR("Error warming cache for key: " + key)
            stats.errors += 1
          END TRY
        END FOR
    }

    STEP_2_RETURN: {
      description: "Return statistics"
      logic: |
        RETURN stats
    }
  }

  OUTPUT: {
    loaded: integer,
    errors: integer
  }
}

WORKFLOW CacheService_WarmFromQueryLog {
  INPUT: {
    limit: integer = 100
  }

  STEPS: {
    STEP_1_GET_TOP_QUERIES: {
      description: "Get frequent queries"
      logic: |
        top_queries = AWAIT GET_TOP_QUERIES(limit)
    }

    STEP_2_WARM: {
      description: "Warm cache"
      logic: |
        stats = { loaded: 0, errors: 0 }

        FOR query IN top_queries:
          TRY:
            cached = AWAIT GET_SIMILAR(query.text)
            IF cached IS NOT NULL THEN CONTINUE END IF

            // Generate response (will auto-cache)
            stats.loaded += 1
          CATCH error:
            LOG_ERROR("Error warming query: " + error)
            stats.errors += 1
          END TRY
        END FOR
    }

    STEP_3_RETURN: {
      description: "Return stats"
      logic: |
        RETURN stats
    }
  }

  OUTPUT: {
    loaded: integer,
    errors: integer
  }
}
```

---

## Pattern 3.14: Session Cleanup

### Overview

```pseudo
PATTERN SessionCleanup {
  PURPOSE: "Expired session cleanup"

  PROBLEM: "Need periodic cleanup of expired and orphaned data"

  SOLUTION: "Background task to clean sessions, messages, metadata"

  USE_CASES: [
    "Scheduled cleanup job",
    "Remove orphaned data",
    "Fix missing TTLs"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW SessionService_CleanupExpired {
  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize stats"
      logic: |
        stats = {
          sessions_deleted: 0,
          messages_deleted: 0,
          metadata_deleted: 0
        }
    }

    STEP_2_CHECK_SESSIONS: {
      description: "Check session keys"
      logic: |
        session_keys = AWAIT Redis.keys("session:*")

        FOR key IN session_keys:
          // Skip message and metadata keys
          IF ":messages" IN key OR ":metadata" IN key THEN
            CONTINUE
          END IF

          ttl = AWAIT Redis.ttl(key)

          IF ttl == -1 THEN
            // No expiration set, fix it
            AWAIT Redis.expire(key, 3600)
          ELSE IF ttl == -2 THEN
            // Already expired
            stats.sessions_deleted += 1
          END IF
        END FOR
    }

    STEP_3_CLEANUP_ORPHANS: {
      description: "Remove orphaned data"
      logic: |
        FOR suffix IN [":messages", ":metadata"]:
          orphan_keys = AWAIT Redis.keys("session:*" + suffix)

          FOR key IN orphan_keys:
            session_id = EXTRACT_SESSION_ID(key)
            session_key = "session:" + session_id

            exists = AWAIT Redis.exists(session_key)
            IF NOT exists THEN
              AWAIT Redis.delete(key)

              IF suffix == ":messages" THEN
                stats.messages_deleted += 1
              ELSE
                stats.metadata_deleted += 1
              END IF
            END IF
          END FOR
        END FOR
    }

    STEP_4_RETURN: {
      description: "Return stats"
      logic: |
        RETURN stats
    }
  }

  OUTPUT: {
    sessions_deleted: integer,
    messages_deleted: integer,
    metadata_deleted: integer
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    Session: {
      modes: ["legal_qa", "contract_review", "case_management"],
      vietnamese_term: "Phiên Làm Việc"
    },

    Message: {
      roles: ["user", "assistant", "system"],
      vietnamese_term: "Tin Nhắn"
    },

    Cache: {
      types: ["semantic", "exact", "multi-level"],
      vietnamese_term: "Bộ Nhớ Đệm"
    }
  }

  BUSINESS_RULES: {
    session_ttl: "Sessions expire after 1 hour of inactivity",
    cache_ttl: "Semantic cache entries expire after 24 hours",
    cleanup_schedule: "Run cleanup job every 6 hours"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    timezone: "Asia/Ho_Chi_Minh",
    date_format: "DD/MM/YYYY HH:mm:ss"
  }
}
```

---

## Pattern Summary

```pseudo
PATTERN_SUMMARY = {
  total_patterns: 8,
  categories: {
    session: ["3.1", "3.2", "3.6", "3.14"],
    cache: ["3.3", "3.4", "3.5", "3.13"]
  },

  dependencies: {
    internal: ["RedisRepository", "EmbeddingService"],
    external: ["redis-py", "cachetools", "numpy"]
  },

  performance_targets: {
    session_get: "< 10ms",
    semantic_cache_search: "< 100ms",
    l1_cache_hit: "< 1ms",
    cleanup: "< 5 seconds for 1000 sessions"
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING SessionCache_Tests {
  UNIT_TESTS: {
    test_cases: [
      {
        name: "should create session with TTL",
        input: { session_id: "test123" },
        expected: { ttl: 3600 }
      },
      {
        name: "should find similar query",
        input: { query: "what is contract", threshold: 0.95 },
        expected: { found: true, similarity: 0.97 }
      }
    ]
  }

  INTEGRATION_TESTS: {
    test_scenarios: [
      "Session lifecycle (create, update, expire)",
      "Message history management",
      "Semantic cache hit/miss"
    ]
  }

  EDGE_CASES: [
    "Session with no TTL",
    "Orphaned message keys",
    "Cache with invalid embedding",
    "L1 cache eviction"
  ]
}
```

---

## References

- **Redis Docs**: https://redis.io/docs/
- **cachetools**: https://github.com/tkem/cachetools
- **Internal Docs**: `/docs/architecture/session-management.md`

---

**Version**: 1.0
**Created**: 2026-01-03
**Patterns**: 3.1-3.6, 3.13-3.14 (8 patterns)
**Lines**: ~650 optimized
