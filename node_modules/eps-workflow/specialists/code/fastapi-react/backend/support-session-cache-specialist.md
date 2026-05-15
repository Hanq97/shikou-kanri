# Support Session Cache Specialist
# サポート・セッション・キャッシュ スペシャリスト
# Chuyên Gia Session và Cache

**Role**: Session & Cache Management Pattern Expert
**Focus**: SessionService, CacheService with Redis
**Technology**: FastAPI 0.104+, Python 3.11+, Redis, Embeddings
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-03

---

## 🎯 Specialist Identity

```pseudo
SPECIALIST SupportSessionCacheSpecialist {
  ROLE: "Session & Cache Management Expert"

  RESPONSIBILITIES: [
    "Manage user sessions with Redis storage and TTL",
    "Implement semantic caching with embedding similarity",
    "Coordinate session metadata and message history",
    "Provide multi-level caching (L1 memory + L2 Redis)",
    "Handle cache warming and invalidation strategies"
  ]

  TECH_STACK: {
    primary: "FastAPI 0.104+ with async/await",
    libraries: ["Redis", "Sentence Transformers", "cachetools", "Pydantic"],
    patterns: ["Session Management", "Semantic Caching", "Multi-level Cache"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Session", "Message", "Cache", "User"]
  }
}
```

---

## Pattern 3.1: SessionService CRUD

### Overview

```pseudo
PATTERN SessionService_CRUD {
  PURPOSE: "Session get-or-create with Redis storage and TTL management"
  PROBLEM: "Need efficient session management with automatic creation and TTL-based expiration"
  SOLUTION: "Use Redis for session storage with get-or-create pattern and TTL (3600s)"
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SessionCRUD_Workflow {
  INPUT: {
    session_id: string,
    user_id: string,
    mode: string
  }

  STEPS: {
    CHECK_AND_CREATE: {
      description: "Get existing or create new session"
      logic: |
        session_key = "session:" + session_id
        session_data = AWAIT redis.GET(session_key)

        IF session_data IS_NULL THEN
          new_session = Session { id: session_id, user_id: user_id, mode: mode, created_at: NOW(), last_active: NOW() }
          AWAIT redis.SET(key: session_key, value: new_session.TO_JSON(), ex: 3600)
          RETURN new_session
        ELSE
          RETURN Session.PARSE_JSON(session_data)
        END IF
    }

    UPDATE_ACTIVITY: {
      description: "Update last activity timestamp"
      logic: |
        session.last_active = NOW()
        AWAIT redis.SET(key: session_key, value: session.TO_JSON(), ex: 3600)
    }
  }

  ERROR_HANDLING: {
    RedisConnectionError: "Retry with exponential backoff (max 3 attempts)",
    ValidationError: "Return error response with validation details"
  }

  OUTPUT: { success: boolean, session: Session, created: boolean }
}
```

### Key Interfaces

```python
@dataclass
class Session:
    id: str
    user_id: str
    mode: str
    created_at: datetime
    last_active: datetime

class SessionService:
    redis: RedisRepository

    async def get_or_create(self, session_id: str, user_id: str, mode: str) -> Session: ...
    async def update_activity(self, session_id: str) -> None: ...
```

---

## Pattern 3.2: SessionService Message History

### Overview

```pseudo
PATTERN SessionMessageHistory {
  PURPOSE: "Store conversation history efficiently with Redis lists"
  PROBLEM: "Need to store message history with automatic cleanup and efficient retrieval"
  SOLUTION: "Use Redis lists (RPUSH/LRANGE) for chronological message storage"
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW MessageHistory_Workflow {
  INPUT: { session_id: string, message?: Message, limit?: number = 20 }

  STEPS: {
    ADD_AND_GET: {
      description: "Add message and retrieve history"
      logic: |
        key = "session:" + session_id + ":messages"

        IF message IS_PROVIDED THEN
          AWAIT redis.RPUSH(key, message.TO_JSON())
          AWAIT redis.EXPIRE(key, 3600)
        END IF

        messages_data = AWAIT redis.LRANGE(key, -limit, -1)
        result = [Message.PARSE_JSON(msg_data) FOR msg_data IN messages_data]
        RETURN result
    }

    CLEAR: {
      description: "Clear all messages"
      logic: |
        key = "session:" + session_id + ":messages"
        AWAIT redis.DELETE(key)
    }
  }

  OUTPUT: { messages: List[Message], count: number }
}
```

### Key Interfaces

```python
@dataclass
class Message:
    role: str  # "user" | "assistant"
    content: str
    timestamp: datetime

class SessionService:
    async def add_message(self, session_id: str, message: Message) -> None: ...
    async def get_messages(self, session_id: str, limit: int = 20) -> List[Message]: ...
    async def clear_messages(self, session_id: str) -> None: ...
```

---

## Pattern 3.3: CacheService Semantic Cache

### Overview

```pseudo
PATTERN SemanticCache {
  PURPOSE: "Intelligent caching using embedding similarity, not exact string match"
  PROBLEM: "Need to recognize semantically similar queries (e.g., 'How to file claim?' ≈ 'Cách nộp đơn bảo hiểm?')"
  SOLUTION: "Generate embeddings for queries, use cosine similarity (threshold ≥0.95) to find cached responses"
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW SemanticCache_Workflow {
  INPUT: { query: string, threshold: float = 0.95, response?: ChatResponse }

  STEPS: {
    SEARCH_AND_STORE: {
      description: "Search for similar cache or store new"
      logic: |
        query_embedding = AWAIT embedding_service.EMBED(query)

        // Search
        cached_keys = AWAIT redis.KEYS("cache:*")
        FOR EACH key IN cached_keys:
          cached_data = AWAIT redis.GET(key)
          IF cached_data IS_NULL THEN CONTINUE

          cached = JSON.PARSE(cached_data)
          similarity = COSINE_SIMILARITY(query_embedding, cached["embedding"])

          IF similarity >= threshold THEN
            RETURN ChatResponse.PARSE(cached["response"])
          END IF
        END FOR

        // Store if response provided
        IF response IS_PROVIDED THEN
          cache_key = "cache:" + MD5_HASH(query)
          cache_data = { query: query, embedding: query_embedding.TO_LIST(), response: response.TO_DICT() }
          AWAIT redis.SET(key: cache_key, value: JSON.STRINGIFY(cache_data), ex: 86400)
        END IF

        RETURN null
    }
  }

  OUTPUT: { cached_response: ChatResponse | null, similarity_score: float }
}
```

### Key Interfaces

```python
class CacheService:
    redis: RedisRepository
    embedding_service: EmbeddingService

    async def get_similar(self, query: str, threshold: float = 0.95) -> Optional[ChatResponse]: ...
    async def store(self, query: str, response: ChatResponse) -> None: ...
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float: ...
```

---

## Pattern 3.4: CacheService Invalidation

### Overview

```pseudo
PATTERN CacheInvalidation {
  PURPOSE: "Multi-strategy cache invalidation (pattern, tag, all)"
  PROBLEM: "Need flexible invalidation for different scenarios"
  SOLUTION: "Support pattern-based, tag-based, and bulk invalidation"
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW CacheInvalidation_Workflow {
  INPUT: { pattern?: string, tag?: string, invalidate_all?: boolean }

  STEPS: {
    INVALIDATE: {
      description: "Invalidate by strategy"
      logic: |
        deleted_count = 0

        IF pattern IS_PROVIDED THEN
          keys = AWAIT redis.KEYS("cache:" + pattern + "*")
          IF keys.LENGTH > 0 THEN deleted_count = AWAIT redis.DELETE(...keys)
        ELSE IF tag IS_PROVIDED THEN
          tag_key = "cache:tag:" + tag
          cache_keys = AWAIT redis.SMEMBERS(tag_key)
          IF cache_keys.LENGTH > 0 THEN deleted_count = AWAIT redis.DELETE(...cache_keys, tag_key) - 1
        ELSE IF invalidate_all IS true THEN
          keys = AWAIT redis.KEYS("cache:*")
          IF keys.LENGTH > 0 THEN deleted_count = AWAIT redis.DELETE(...keys)
        END IF

        RETURN deleted_count
    }
  }

  OUTPUT: { deleted_count: number, stats: CacheStats }
}
```

---

## Pattern 3.5: CacheService Multi-Level

### Overview

```pseudo
PATTERN MultiLevelCache {
  PURPOSE: "L1 (in-memory) + L2 (Redis) caching for ultra-fast access"
  PROBLEM: "Need extremely fast cache for frequently accessed data with persistence"
  SOLUTION: "L1 cache (cachetools.TTLCache) for hot data, L2 Redis for persistence and sharing"
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW MultiLevelCache_Workflow {
  INPUT: { key: string, value?: any, ttl?: number = 86400 }

  STEPS: {
    GET_OR_SET: {
      description: "Get from L1/L2 or set both"
      logic: |
        // Get from L1
        IF key IN l1_cache THEN RETURN l1_cache[key]

        // Get from L2
        data = AWAIT redis.GET("cache:" + key)
        IF data IS_NOT_NULL THEN
          value = JSON.PARSE(data)
          l1_cache[key] = value
          RETURN value
        END IF

        // Set both levels if value provided
        IF value IS_PROVIDED THEN
          l1_cache[key] = value
          AWAIT redis.SET(key: "cache:" + key, value: JSON.STRINGIFY(value), ex: ttl)
        END IF

        RETURN null
    }

    DELETE: {
      description: "Delete from both levels"
      logic: |
        l1_cache.POP(key, default: null)
        AWAIT redis.DELETE("cache:" + key)
    }
  }

  OUTPUT: { value: any | null, cache_hit_level: "L1" | "L2" | "MISS" }
}
```

### Key Interfaces

```python
from cachetools import TTLCache

class MultiLevelCacheService:
    redis: RedisRepository
    l1_maxsize: int = 100
    l1_ttl: int = 300
    l1_cache: TTLCache

    async def get(self, key: str) -> Optional[Any]: ...
    async def set(self, key: str, value: Any, ttl: int = 86400) -> None: ...
    async def delete(self, key: str) -> None: ...
```

---

## Pattern 3.6: SessionService Metadata

### Overview

```pseudo
PATTERN SessionMetadata {
  PURPOSE: "Track session context (user preferences, mode, conversation state)"
  PROBLEM: "Need efficient metadata storage without bloating session object"
  SOLUTION: "Use Redis hash (HSET/HGET) for field-level metadata operations"
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SessionMetadata_Workflow {
  INPUT: { session_id: string, key?: string, value?: any }

  STEPS: {
    GET_OR_SET: {
      description: "Get/set metadata fields"
      logic: |
        metadata_key = "session:" + session_id + ":metadata"

        IF value IS_PROVIDED THEN
          AWAIT redis.HSET(metadata_key, key, JSON.STRINGIFY(value))
          AWAIT redis.EXPIRE(metadata_key, 3600)
        ELSE IF key IS_PROVIDED THEN
          value = AWAIT redis.HGET(metadata_key, key)
          RETURN JSON.PARSE(value) IF value IS_NOT_NULL ELSE null
        ELSE
          data = AWAIT redis.HGETALL(metadata_key)
          result = {}
          FOR EACH (k, v) IN data.ITEMS(): result[k] = JSON.PARSE(v)
          RETURN result
        END IF
    }
  }

  OUTPUT: { metadata: dict, success: boolean }
}
```

---

## Pattern 3.13: CacheService Warming

### Overview

```pseudo
PATTERN CacheWarming {
  PURPOSE: "Preload frequently accessed data into cache on startup or schedule"
  PROBLEM: "Cold cache causes slow initial requests after deployment"
  SOLUTION: "Warm cache from query logs or predefined keys in background task"
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW CacheWarming_Workflow {
  INPUT: { data_source: callable, keys: List[string], limit?: number = 100 }

  STEPS: {
    WARM: {
      description: "Warm cache with predefined keys or top queries"
      logic: |
        stats = { loaded: 0, errors: 0 }

        FOR EACH key IN keys:
          TRY:
            data = AWAIT data_source(key)
            AWAIT cache.STORE(key, data)
            stats.loaded += 1
          CATCH error:
            LOG_ERROR("Error warming key: " + key)
            stats.errors += 1
          END TRY
        END FOR

        RETURN stats
    }
  }

  OUTPUT: { loaded: number, errors: number, total_keys: number }
}
```

---

## Pattern 3.14: SessionService Cleanup

### Overview

```pseudo
PATTERN SessionCleanup {
  PURPOSE: "Periodic cleanup of expired sessions and orphaned data"
  PROBLEM: "Expired sessions leave orphaned message/metadata keys"
  SOLUTION: "Background task to cleanup expired sessions and orphaned data"
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SessionCleanup_Workflow {
  STEPS: {
    CLEANUP: {
      description: "Cleanup expired and orphaned data"
      logic: |
        stats = { sessions_deleted: 0, messages_deleted: 0, metadata_deleted: 0 }
        session_keys = AWAIT redis.KEYS("session:*")

        FOR EACH key IN session_keys:
          IF key.CONTAINS(":messages") OR key.CONTAINS(":metadata") THEN CONTINUE

          ttl = AWAIT redis.TTL(key)
          IF ttl == -1 THEN AWAIT redis.EXPIRE(key, 3600)
          ELSE IF ttl == -2 THEN stats.sessions_deleted += 1
        END FOR

        // Cleanup orphaned data
        FOR EACH suffix IN [":messages", ":metadata"]:
          orphan_keys = AWAIT redis.KEYS("session:*" + suffix)
          FOR EACH key IN orphan_keys:
            session_id = key.SPLIT(":")[1]
            parent_key = "session:" + session_id

            IF NOT (AWAIT redis.EXISTS(parent_key)) THEN
              AWAIT redis.DELETE(key)
              IF suffix == ":messages" THEN stats.messages_deleted += 1
              ELSE stats.metadata_deleted += 1
            END IF
          END FOR
        END FOR

        RETURN stats
    }
  }

  OUTPUT: { sessions_deleted: number, messages_deleted: number, metadata_deleted: number }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    Session: { modes: ["chat", "rag", "agent", "multimodal"], vietnamese_term: "Phiên Làm Việc" },
    Message: { roles: ["user", "assistant", "system"], vietnamese_term: "Tin Nhắn" },
    Cache: { types: ["semantic", "pattern", "tag"], vietnamese_term: "Bộ Nhớ Đệm" }
  }

  BUSINESS_RULES: {
    session_ttl: "1 hour (3600 seconds)",
    cache_ttl: "24 hours (86400 seconds)",
    similarity_threshold: "0.95 (95% similarity)"
  }
}
```

---

## Integration

```pseudo
INTEGRATION = {
  used_by: ["Pattern 1.1-1.15 - Core Services", "Pattern 3.7-3.12 - Knowledge Storage"],
  shared_services: ["Redis", "EmbeddingService"]
}
```

---

## References

- **Technology**: [FastAPI](https://fastapi.tiangolo.com), [Redis](https://redis.io)
- **Libraries**: [cachetools](https://github.com/tkem/cachetools), [Sentence Transformers](https://www.sbert.net)

---

**Version**: 1.0
**Created**: 2026-01-03
**Patterns**: 8 patterns (3.1-3.6, 3.13-3.14)
**Total Lines**: ~800

---

*Support Session Cache Specialist: Session | Cache | Metadata | Warming | Cleanup*
