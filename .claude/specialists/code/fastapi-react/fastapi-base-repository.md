# FastAPI Base Repository Specialist
# FastAPI ベース リポジトリ スペシャリスト
# Chuyên Gia Base Repository FastAPI

**Role**: Base Repository Pattern Expert
**Focus**: Generic Repository Interface, Error Handling
**Technology**: Python 3.11+, FastAPI 0.104+, Abstract Base Classes
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST BaseRepositorySpecialist {
  ROLE: "Define generic repository interface and error handling patterns"

  RESPONSIBILITIES: [
    "Implement abstract base repository with CRUD operations",
    "Define consistent error handling across all repositories",
    "Provide type-safe generic repository interface",
    "Ensure proper resource cleanup patterns"
  ]

  TECH_STACK: {
    primary: "Python 3.11+ with ABC (Abstract Base Classes)",
    libraries: ["typing", "abc", "functools"],
    patterns: ["Generic Repository", "Decorator Pattern", "Exception Hierarchy"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["User", "Contract", "Case", "Document", "Session"]
  }
}
```

---

## Pattern 1.1: Base Repository Interface

### Overview

```pseudo
PATTERN BaseRepositoryInterface {
  PURPOSE: "Provide consistent CRUD interface for all database implementations"

  PROBLEM: |
    Multiple database types (PostgreSQL, Neo4j, Qdrant) need consistent
    interface for CRUD operations to ensure code uniformity and maintainability.

  SOLUTION: |
    Use Python ABC (Abstract Base Class) with generic type T to define
    repository interface that all database-specific repositories implement.

  USE_CASES: [
    "PostgreSQL user session repository",
    "Neo4j document graph repository",
    "Qdrant vector search repository"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW BaseRepository_Interface {
  INPUT: {
    T: Generic domain model type
  }

  PRECONDITIONS: [
    "Domain model T is defined",
    "All methods are async (async def)",
    "Type hints are provided for all parameters"
  ]

  INTERFACE_METHODS: {
    GET_BY_ID: {
      signature: "async def get_by_id(self, id: str) -> Optional[T]"
      description: "Retrieve entity by unique identifier"
      returns: "Entity if found, None otherwise"
    }

    GET_ALL: {
      signature: "async def get_all(self, limit: int = 100, offset: int = 0) -> List[T]"
      description: "Retrieve all entities with pagination"
      returns: "List of entities (empty list if none)"
    }

    CREATE: {
      signature: "async def create(self, entity: T) -> T"
      description: "Create new entity in database"
      returns: "Created entity with generated ID and timestamps"
    }

    UPDATE: {
      signature: "async def update(self, entity: T) -> T"
      description: "Update existing entity"
      returns: "Updated entity"
      raises: "NotFoundError if entity does not exist"
    }

    DELETE: {
      signature: "async def delete(self, id: str) -> bool"
      description: "Delete entity by ID"
      returns: "True if deleted, False if not found"
    }

    CLOSE: {
      signature: "async def close(self) -> None"
      description: "Close database connections and release resources"
      returns: "None"
    }
  }

  POSTCONDITIONS: [
    "All methods are abstract (@abstractmethod)",
    "All methods are async",
    "All methods have type hints",
    "Generic type T is properly defined"
  ]
}
```

### Key Interfaces

```typescript
// Generic repository interface (Python ABC equivalent)
interface BaseRepository<T> {
  // Retrieve entity by ID
  get_by_id(id: string): Promise<T | null>;

  // Retrieve all entities with pagination
  get_all(limit?: number, offset?: number): Promise<T[]>;

  // Create new entity
  create(entity: T): Promise<T>;

  // Update existing entity
  update(entity: T): Promise<T>;

  // Delete entity by ID
  delete(id: string): Promise<boolean>;

  // Close database connections
  close(): Promise<void>;
}
```

### Integration Points

```pseudo
INTEGRATION BaseRepository_Integration {
  IMPLEMENTATIONS: {
    postgres: "PostgresRepository implements BaseRepository<SessionModel>",
    neo4j: "Neo4jRepository implements BaseRepository<Document>",
    qdrant: "QdrantRepository implements BaseRepository<VectorPoint>"
  }

  TYPE_SAFETY: {
    generic_type: "T represents domain model",
    compile_time_checks: "MyPy validates all type hints",
    runtime_validation: "Pydantic for data validation"
  }

  ERROR_HANDLING: {
    not_found: "NotFoundError raised by update/delete",
    connection: "ConnectionError for database connectivity",
    repository: "RepositoryError as base exception"
  }
}
```

### Usage Example (Pseudo-code only)

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "Implement PostgreSQL repository for user sessions"

  ACTORS: {
    developer: "Backend developer",
    system: "FastAPI application"
  }

  FLOW: {
    STEP_1: |
      Developer creates PostgresRepository class
      CLASS PostgresRepository IMPLEMENTS BaseRepository<SessionModel>

    STEP_2: |
      Developer implements all abstract methods:
        - get_by_id(id) → Query with SELECT WHERE id = $id
        - get_all(limit, offset) → Query with LIMIT/OFFSET
        - create(entity) → INSERT with RETURNING
        - update(entity) → UPDATE with RETURNING
        - delete(id) → DELETE with rowcount check
        - close() → Dispose engine

    STEP_3: |
      Service layer uses repository with type safety:
        repo = PostgresRepository()
        session = AWAIT repo.get_by_id("session_123")
        IF session IS NOT NULL THEN
          DISPLAY session.user_id
        END IF

    STEP_4: |
      FINALLY AWAIT repo.close()
  }

  PSEUDO_CODE: |
    // In service layer
    ASYNC FUNCTION get_user_session(session_id: string) {
      repo = PostgresRepository()

      TRY:
        session = AWAIT repo.get_by_id(session_id)
        IF session IS NULL THEN
          THROW NotFoundError("Session not found")
        END IF
        RETURN session
      FINALLY:
        AWAIT repo.close()
      END TRY
    }
}
```

---

## Pattern 1.2: Base Repository Error Handling

### Overview

```pseudo
PATTERN BaseRepositoryErrorHandling {
  PURPOSE: "Provide consistent error handling across all repositories"

  PROBLEM: |
    Different database exceptions need to be caught and converted to
    domain-specific errors for consistent error handling in service layer.

  SOLUTION: |
    - Custom exception hierarchy (RepositoryError, NotFoundError, etc.)
    - Decorator pattern (@handle_repository_errors) for automatic error handling
    - Logging with exc_info=True for stack traces

  USE_CASES: [
    "Convert SQLAlchemy exceptions to NotFoundError",
    "Convert Neo4j exceptions to RepositoryError",
    "Log all database errors for debugging"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW RepositoryError_Handling {
  INPUT: {
    exception: Any database exception
  }

  PRECONDITIONS: [
    "Custom exception classes defined",
    "Logger configured with appropriate level",
    "Decorator applied to repository methods"
  ]

  EXCEPTION_HIERARCHY: {
    BASE: {
      name: "RepositoryError",
      parent: "Exception",
      description: "Base exception for all repository errors"
    }

    NOT_FOUND: {
      name: "NotFoundError",
      parent: "RepositoryError",
      fields: ["entity_type: str", "entity_id: str"],
      message: "{entity_type} with ID {entity_id} not found"
    }

    DUPLICATE: {
      name: "DuplicateError",
      parent: "RepositoryError",
      fields: ["entity_type: str", "field: str", "value: str"],
      message: "{entity_type} with {field}={value} already exists"
    }

    CONNECTION: {
      name: "ConnectionError",
      parent: "RepositoryError",
      description: "Database connection error"
    }
  }

  DECORATOR_LOGIC: {
    STEP_1_WRAP: |
      Decorator @handle_repository_errors wraps async function

    STEP_2_EXECUTE: |
      TRY:
        result = AWAIT wrapped_function(*args, **kwargs)
        RETURN result

    STEP_3_CATCH_DOMAIN: |
      CATCH NotFoundError:
        RE-RAISE (don't wrap, already domain-specific)
      CATCH DuplicateError:
        RE-RAISE (don't wrap, already domain-specific)

    STEP_4_CATCH_GENERIC: |
      CATCH Exception as e:
        LOG error with exc_info=True
        RAISE RepositoryError("Database operation failed: {e}") FROM e

    STEP_5_FINALLY: |
      FINALLY:
        Cleanup resources if needed
  }

  OUTPUT: {
    success_case: "Return result from wrapped function",
    error_case: "Raise domain-specific exception with details"
  }

  POSTCONDITIONS: [
    "All exceptions are logged with stack traces",
    "Domain-specific errors are preserved",
    "Generic exceptions are wrapped in RepositoryError"
  ]
}
```

### Key Interfaces

```typescript
// Exception classes (Python equivalent)
class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryError";
  }
}

class NotFoundError extends RepositoryError {
  entity_type: string;
  entity_id: string;

  constructor(entity_type: string, entity_id: string) {
    super(`${entity_type} with ID ${entity_id} not found`);
    this.name = "NotFoundError";
    this.entity_type = entity_type;
    this.entity_id = entity_id;
  }
}

class DuplicateError extends RepositoryError {
  entity_type: string;
  field: string;
  value: string;

  constructor(entity_type: string, field: string, value: string) {
    super(`${entity_type} with ${field}=${value} already exists`);
    this.name = "DuplicateError";
    this.entity_type = entity_type;
    this.field = field;
    this.value = value;
  }
}

class ConnectionError extends RepositoryError {
  constructor(message: string) {
    super(message);
    this.name = "ConnectionError";
  }
}
```

### Integration Points

```pseudo
INTEGRATION ErrorHandling_Integration {
  DECORATOR_USAGE: {
    apply_to: "All repository methods that perform database operations",
    example: |
      @handle_repository_errors
      async def get_by_id(self, id: str) -> Optional[T]:
        # Database operation here
  }

  LOGGING: {
    logger: "get_logger(__name__)",
    level: "ERROR for exceptions, INFO for success",
    format: "Include timestamp, method name, exception type, stack trace"
  }

  SERVICE_LAYER: {
    error_handling: |
      Service layer catches domain-specific errors:
        - NotFoundError → Return 404 HTTP status
        - DuplicateError → Return 409 HTTP status
        - RepositoryError → Return 500 HTTP status
  }

  FASTAPI_INTEGRATION: {
    exception_handlers: |
      @app.exception_handler(NotFoundError)
      async def not_found_handler(request, exc):
        RETURN JSONResponse(status_code=404, content={"detail": str(exc)})

      @app.exception_handler(RepositoryError)
      async def repository_error_handler(request, exc):
        RETURN JSONResponse(status_code=500, content={"detail": "Internal server error"})
  }
}
```

### Usage Example (Pseudo-code only)

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "Handle user session not found error"

  ACTORS: {
    client: "Mobile app user",
    api: "FastAPI backend",
    repository: "PostgresRepository"
  }

  FLOW: {
    STEP_1: |
      Client sends GET /sessions/{session_id}

    STEP_2: |
      API calls SessionService.get_session(session_id)

    STEP_3: |
      Service calls repo.get_by_id(session_id)
      Repository decorated with @handle_repository_errors

    STEP_4: |
      IF session not found in database THEN
        Repository method returns None
        Service layer checks result
        RAISE NotFoundError("Session", session_id)
      END IF

    STEP_5: |
      FastAPI exception handler catches NotFoundError
      RETURN HTTP 404 with message:
        {
          "detail": "Session with ID session_123 not found"
        }

    STEP_6: |
      Client displays error toast:
        "Phiên không tồn tại" (Vietnamese)
        "Session not found" (English)
  }

  PSEUDO_CODE: |
    // In repository method
    @handle_repository_errors
    ASYNC FUNCTION get_by_id(session_id: string) {
      result = AWAIT db_session.execute(SELECT SessionModel WHERE id = session_id)
      IF result IS NULL THEN
        RETURN None  // Not an error, just not found
      END IF
      RETURN result
    }

    // In service layer
    ASYNC FUNCTION get_session(session_id: string) {
      session = AWAIT repo.get_by_id(session_id)
      IF session IS NULL THEN
        RAISE NotFoundError("Session", session_id)  // Convert None to exception
      END IF
      RETURN session
    }

    // In FastAPI endpoint
    @router.get("/sessions/{session_id}")
    ASYNC FUNCTION get_session_endpoint(session_id: string) {
      TRY:
        session = AWAIT session_service.get_session(session_id)
        RETURN session
      CATCH NotFoundError as e:
        RAISE HTTPException(status_code=404, detail=str(e))
      END TRY
    }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    User: {
      roles: ["admin", "lawyer", "paralegal", "client"],
      vietnamese_term: "Người Dùng"
    },
    Session: {
      types: ["chat_session", "legal_consultation", "document_review"],
      vietnamese_term: "Phiên / セッション"
    },
    Document: {
      types: ["legal_document", "contract", "evidence", "court_filing"],
      vietnamese_term: "Tài Liệu Pháp Lý / 法的文書"
    }
  }

  BUSINESS_RULES: {
    data_retention: "Legal documents retained for 10 years",
    error_messages: "Bilingual error messages (Vietnamese + English)",
    logging: "All database errors logged for audit trail"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    error_messages: {
      not_found: "Không tìm thấy / Not found",
      duplicate: "Đã tồn tại / Already exists",
      connection: "Lỗi kết nối / Connection error"
    }
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 2.x - Neo4j Repository",
    relationship: "Implements BaseRepository<Document>",
    integration: "Uses BaseRepository interface and error handling"
  },
  {
    pattern: "Pattern 3.x - Qdrant Repository",
    relationship: "Implements BaseRepository<VectorPoint>",
    integration: "Uses BaseRepository interface and error handling"
  },
  {
    pattern: "Pattern 4.x - PostgreSQL Repository",
    relationship: "Implements BaseRepository<SessionModel>",
    integration: "Uses BaseRepository interface and error handling"
  }
]
```

---

## References

- **Architecture**: Repository Pattern, Decorator Pattern
- **Technology Docs**: [Python ABC](https://docs.python.org/3/library/abc.html), [FastAPI Error Handling](https://fastapi.tiangolo.com/tutorial/handling-errors/)
- **Internal Docs**: `/docs/backend/repository-pattern.md`

---

**File**: `specialists/code/fastapi-react/backend/fastapi-base-repository.md`
**Lines**: 230
**Patterns**: 2 (Base Repository Interface + Error Handling)
**Created**: 2026-01-02
