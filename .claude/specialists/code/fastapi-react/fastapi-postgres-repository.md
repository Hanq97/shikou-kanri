# FastAPI PostgreSQL Repository Specialist
# FastAPI PostgreSQL リポジトリ スペシャリスト
# Chuyên Gia Repository PostgreSQL FastAPI

**Role**: SQL Database Repository Pattern Expert
**Focus**: PostgreSQL Repository, SQLAlchemy 2.0, Async CRUD
**Technology**: PostgreSQL 14+, SQLAlchemy 2.0+, AsyncPG
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST PostgresRepositorySpecialist {
  ROLE: "SQL database repository pattern expert for async PostgreSQL operations"

  RESPONSIBILITIES: [
    "Manage async PostgreSQL engine and session factory",
    "Execute CRUD operations with SQLAlchemy 2.0",
    "Handle transaction management",
    "Implement connection pooling",
    "Provide health checks and resource management"
  ]

  TECH_STACK: {
    primary: "PostgreSQL 14+",
    libraries: ["SQLAlchemy 2.0+", "asyncpg", "python 3.11+"],
    patterns: ["Repository Pattern", "Async/Await", "Connection Pooling"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["User", "Session", "ChatHistory", "Transaction"],
    use_cases: [
      "User session management",
      "Chat history persistence",
      "Transaction records"
    ]
  }
}
```

---

## Pattern 1.1: Postgres Async Session Initialization

### Overview

```pseudo
PATTERN PostgresSessionInit {
  PURPOSE: "Initialize async SQLAlchemy engine and session factory"

  PROBLEM: "Need async PostgreSQL session with connection pooling and proper configuration"

  SOLUTION: "Lazy initialization with connection pool and session factory"

  USE_CASES: [
    "User session management for Vietnamese legal chatbot",
    "Store chat history for P2P insurance platform",
    "Transaction record persistence"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW PostgresSessionInit_Workflow {
  INPUT: {
    settings: {
      POSTGRES_URI: string,
      DEBUG: boolean
    }
  }

  PRECONDITIONS: [
    "PostgreSQL server is running",
    "Valid connection URI provided"
  ]

  STEPS: {
    STEP_1_CHECK_EXISTING_ENGINE: {
      description: "Check if engine already exists"
      logic: |
        IF self._engine IS_NOT_NULL THEN
          RETURN self._engine
        END IF
    }

    STEP_2_CREATE_ENGINE: {
      description: "Create async engine with pooling"
      logic: |
        self._engine = create_async_engine(
          url: settings.POSTGRES_URI,
          echo: settings.DEBUG,
          pool_size: 20,
          max_overflow: 10,
          pool_pre_ping: True,
          pool_recycle: 3600  // Recycle after 1 hour
        )
        LOG "Postgres engine initialized"
    }

    STEP_3_CREATE_SESSION_FACTORY: {
      description: "Create session factory"
      logic: |
        IF self._session_factory IS_NULL THEN
          engine = AWAIT self._get_engine()
          self._session_factory = async_sessionmaker(
            bind: engine,
            class_: AsyncSession,
            expire_on_commit: False
          )
        END IF
        RETURN self._session_factory
    }
  }

  OUTPUT: {
    engine: AsyncEngine,
    session_factory: async_sessionmaker
  }

  POSTCONDITIONS: [
    "Engine is initialized",
    "Session factory is ready",
    "Connection pool is active"
  ]
}
```

---

## Pattern 1.2: Postgres CRUD - Create

### Overview

```pseudo
PATTERN PostgresCreate {
  PURPOSE: "Create new entity in database with auto-refresh"

  PROBLEM: "Need to insert entity and get generated values (ID, timestamps)"

  SOLUTION: "Add entity, commit, refresh to get generated fields"

  USE_CASES: [
    "Create user chat session",
    "Store new transaction record",
    "Insert chat message"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW PostgresCreate_Workflow {
  INPUT: {
    entity: SessionModel  // Example entity
  }

  STEPS: {
    STEP_1_GET_SESSION: {
      logic: |
        session_factory = AWAIT self._get_session_factory()
        ASYNC_WITH session_factory() AS db_session:
          // Session auto-managed
    }

    STEP_2_ADD_ENTITY: {
      logic: |
        db_session.add(entity)
    }

    STEP_3_COMMIT: {
      logic: |
        AWAIT db_session.commit()
    }

    STEP_4_REFRESH: {
      description: "Get generated ID and timestamps"
      logic: |
        AWAIT db_session.refresh(entity)
    }

    STEP_5_RETURN: {
      logic: |
        RETURN entity  // With generated fields
    }
  }

  OUTPUT: SessionModel (with generated ID and timestamps)
}
```

---

## Pattern 1.3: Postgres CRUD - Read (Single)

### Workflow

```pseudo
WORKFLOW PostgresReadSingle_Workflow {
  INPUT: {
    session_id: string
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      description: "Use SQLAlchemy 2.0 select() syntax"
      logic: |
        stmt = select(SessionModel).where(SessionModel.id == session_id)
    }

    STEP_2_EXECUTE: {
      logic: |
        session_factory = AWAIT self._get_session_factory()
        ASYNC_WITH session_factory() AS db_session:
          result = AWAIT db_session.execute(stmt)
          session = result.scalar_one_or_none()
        END ASYNC_WITH
    }

    STEP_3_RETURN: {
      logic: |
        RETURN session  // None if not found
    }
  }

  OUTPUT: SessionModel | None
}
```

---

## Pattern 1.4: Postgres CRUD - Read (Multiple)

### Overview

```pseudo
PATTERN PostgresReadMultiple {
  PURPOSE: "Retrieve multiple entities with filtering and pagination"

  PROBLEM: "Need to query entities with filters, ordering, and pagination"

  SOLUTION: "Use select() with where(), order_by(), limit(), offset()"

  USE_CASES: [
    "List all chat sessions for user (Danh sách phiên chat)",
    "Get recent transactions",
    "Load paginated chat history"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW PostgresReadMultiple_Workflow {
  INPUT: {
    user_id: string,
    limit: int = 100,
    offset: int = 0
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      logic: |
        stmt = (
          select(SessionModel)
          .where(SessionModel.user_id == user_id)
          .order_by(SessionModel.created_at.desc())
          .limit(limit)
          .offset(offset)
        )
    }

    STEP_2_EXECUTE: {
      logic: |
        session_factory = AWAIT self._get_session_factory()
        ASYNC_WITH session_factory() AS db_session:
          result = AWAIT db_session.execute(stmt)
          sessions = result.scalars().all()
        END ASYNC_WITH
    }

    STEP_3_RETURN: {
      logic: |
        RETURN list(sessions)
    }
  }

  OUTPUT: List<SessionModel>
}
```

---

## Pattern 1.5: Postgres CRUD - Update

### Overview

```pseudo
PATTERN PostgresUpdate {
  PURPOSE: "Update existing entity with .returning() for updated values"

  PROBLEM: "Need to update entity fields and get updated values"

  SOLUTION: "Use update() with .returning() (PostgreSQL-specific)"

  USE_CASES: [
    "Update chat session metadata",
    "Modify transaction status",
    "Update user preferences"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW PostgresUpdate_Workflow {
  INPUT: {
    session_id: string,
    updates: Dict<string, any>
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      logic: |
        stmt = (
          update(SessionModel)
          .where(SessionModel.id == session_id)
          .values(**updates)
          .returning(SessionModel)
        )
    }

    STEP_2_EXECUTE: {
      logic: |
        session_factory = AWAIT self._get_session_factory()
        ASYNC_WITH session_factory() AS db_session:
          result = AWAIT db_session.execute(stmt)
          AWAIT db_session.commit()
          updated_session = result.scalar_one_or_none()
        END ASYNC_WITH
    }

    STEP_3_RETURN: {
      logic: |
        RETURN updated_session  // None if not found
    }
  }

  OUTPUT: SessionModel | None
}
```

---

## Pattern 1.6: Postgres CRUD - Delete

### Workflow

```pseudo
WORKFLOW PostgresDelete_Workflow {
  INPUT: {
    session_id: string
  }

  STEPS: {
    STEP_1_BUILD_QUERY: {
      logic: |
        stmt = delete(SessionModel).where(SessionModel.id == session_id)
    }

    STEP_2_EXECUTE: {
      logic: |
        session_factory = AWAIT self._get_session_factory()
        ASYNC_WITH session_factory() AS db_session:
          result = AWAIT db_session.execute(stmt)
          AWAIT db_session.commit()
        END ASYNC_WITH
    }

    STEP_3_CHECK_ROWCOUNT: {
      logic: |
        RETURN result.rowcount > 0
    }
  }

  OUTPUT: boolean (True if deleted, False if not found)
}
```

---

## Pattern 1.7: Postgres Health Check

### Workflow

```pseudo
WORKFLOW PostgresHealthCheck_Workflow {
  INPUT: None

  STEPS: {
    STEP_1_EXECUTE: {
      logic: |
        TRY:
          session_factory = AWAIT self._get_session_factory()
          ASYNC_WITH session_factory() AS db_session:
            result = AWAIT db_session.execute(text("SELECT 1"))
            value = result.scalar()
          END ASYNC_WITH

          IF value == 1 THEN
            RETURN True
          ELSE
            RETURN False
          END IF
        CATCH error:
          LOG_ERROR("Postgres health check failed: " + error)
          RETURN False
        END TRY
    }
  }

  OUTPUT: boolean
}
```

---

## Domain Models

### Vietnamese Session Models

```typescript
// SessionModel interface (SQLAlchemy ORM)
interface SessionModel {
  __tablename__: "sessions";

  id: string;                    // Primary key
  user_id: string;               // Foreign key to users table
  created_at: Date;              // Auto-generated timestamp
  updated_at?: Date;             // Auto-updated timestamp
  message_count: number;         // Default: 0
  last_message?: string;         // Last message content

  // Vietnamese domain context
  // Phiên chat người dùng / ユーザーチャットセッション
}

// ChatMessageModel interface
interface ChatMessageModel {
  __tablename__: "chat_messages";

  id: string;
  session_id: string;            // Foreign key to sessions
  role: "user" | "assistant" | "system";
  content: string;               // Message content (Vietnamese)
  created_at: Date;
  metadata?: {
    model?: string;              // "gpt-4" | "claude-3"
    tokens?: number;
    source?: "rag" | "direct";
  };
}
```

---

## Integration Example

### Service Layer with Postgres and Redis

```pseudo
INTEGRATION ChatServiceWithCache {
  SCENARIO: "Get user session with Redis cache fallback"

  WORKFLOW: {
    STEP_1_CHECK_CACHE: |
      cached_session = AWAIT RedisRepository.hget_session(session_id)

      IF cached_session IS_NOT_NULL THEN
        LOG "Cache hit for session: " + session_id
        RETURN SessionModel(**cached_session)
      END IF

    STEP_2_QUERY_POSTGRES: |
      session = AWAIT PostgresRepository.get_session_by_id(session_id)

      IF session IS_NULL THEN
        RETURN None
      END IF

    STEP_3_CACHE_SESSION: |
      session_data = {
        id: session.id,
        user_id: session.user_id,
        created_at: session.created_at.isoformat(),
        message_count: session.message_count
      }
      AWAIT RedisRepository.hset_session(session_id, session_data)

    STEP_4_RETURN: |
      RETURN session
  }

  BENEFITS: [
    "Fast cache hits (< 10ms)",
    "Reduced database load",
    "Automatic cache warming"
  ]
}
```

---

## Validation Checklist

```pseudo
VALIDATION PostgresRepositoryValidation {
  CHECKS: [
    "Use create_async_engine with connection pooling",
    "Set pool_pre_ping=True for connection health",
    "Set expire_on_commit=False to avoid extra queries",
    "Use 'async with session_factory()' for session management",
    "Use select() for query building (SQLAlchemy 2.0 style)",
    "Use scalar_one_or_none() for single result",
    "Use scalars().all() for multiple results",
    "Use .returning() for update/delete operations",
    "Commit after create/update/delete operations",
    "Implement health check with text('SELECT 1')"
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
    relationship: "Postgres repository implements base interface",
    integration: "Inherits CRUD operations"
  },
  {
    pattern: "Pattern 2.2 - Redis Hash Operations",
    relationship: "Used together for cache-aside pattern",
    integration: "Cache session data in Redis"
  },
  {
    pattern: "Pattern 3.1 - Unit of Work",
    relationship: "Coordinates transactions across Postgres and Neo4j",
    integration: "Atomic operations across databases"
  }
]
```

---

## References

- **SQLAlchemy Docs**: [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- **AsyncPG**: [AsyncPG Driver](https://magicstack.github.io/asyncpg/)
- **PostgreSQL**: [PostgreSQL 14 Documentation](https://www.postgresql.org/docs/14/)

---

**File**: `specialists/code/fastapi-react/fastapi-postgres-repository.md`
**Patterns**: 7 (PostgreSQL-specific patterns)
**Lines**: ~530
**Created**: 2026-01-02
