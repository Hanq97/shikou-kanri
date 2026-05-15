# FastAPI Router Specialist
# FastAPI ルータースペシャリスト
# Chuyên Gia FastAPI Router

**Role**: FastAPI Router Pattern Expert
**Focus**: RESTful APIs, Dependency Injection, Request/Response Handling
**Patterns**: 20 patterns
**Layer**: Presentation Layer (API)

---

## 🎯 SPECIALIST OVERVIEW

### Responsibilities
- Design RESTful API endpoints with FastAPI
- Implement dependency injection pattern
- Handle request validation and response serialization
- Error handling and HTTP status codes
- API versioning and routing

### Key Technologies
- FastAPI 0.104+
- Pydantic v2 (validation)
- Python 3.11+ type hints
- Async/await patterns

---

## 📋 PATTERN CATEGORIES

### 1. Router Setup & Configuration (5 patterns)
### 2. Dependency Injection (4 patterns)
### 3. Request Handling (4 patterns)
### 4. Response Handling (3 patterns)
### 5. Error Handling (4 patterns)

---

## 🔧 PATTERN 1: BASIC ROUTER SETUP

**Pattern**: Creating a modular FastAPI router

**Problem**: Need organized, maintainable API endpoint structure

**Solution**:
```python
# src/api/v1/endpoints/chat.py
from fastapi import APIRouter
from src.models.schemas.requests.chat import ChatRequest
from src.models.schemas.responses.chat import ChatResponse

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
    responses={404: {"description": "Not found"}},
)

@router.post("", response_model=ChatResponse)
async def create_chat(request: ChatRequest) -> ChatResponse:
    """Process a chat message."""
    # Implementation
    pass
```

**Constraints**:
- ✅ Use `APIRouter` for modularity
- ✅ Define `prefix` and `tags` for organization
- ✅ Use `response_model` for type safety
- ❌ NO global router state

**Example**: Chat endpoint router

---

## 🔧 PATTERN 2: ROUTER AGGREGATION

**Pattern**: Combining multiple routers into main API

**Problem**: Need central aggregation point for all endpoints

**Solution**:
```python
# src/api/v1/router.py
from fastapi import APIRouter
from src.api.v1.endpoints import chat, knowledge, upload, session

api_router = APIRouter()

api_router.include_router(chat.router)
api_router.include_router(knowledge.router)
api_router.include_router(upload.router)
api_router.include_router(session.router)
```

**Constraints**:
- ✅ Central aggregation in `api_router`
- ✅ Import routers from endpoints
- ✅ Maintain clear namespace
- ❌ NO circular imports

**Example**: Main API router

---

## 🔧 PATTERN 3: DEPENDENCY INJECTION - SERVICE LAYER

**Pattern**: Injecting services via FastAPI `Depends`

**Problem**: Need clean service injection without global state

**Solution**:
```python
# src/api/deps.py
from typing import Annotated
from fastapi import Depends
from src.services.chat_service import ChatService
from src.services.rag_service import RAGService

async def get_rag_service() -> RAGService:
    return RAGService()

async def get_chat_service(
    rag: Annotated[RAGService, Depends(get_rag_service)]
) -> ChatService:
    return ChatService(rag_service=rag)

# Usage in endpoint
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]

@router.post("/chat")
async def chat(
    request: ChatRequest,
    chat_service: ChatServiceDep,
) -> ChatResponse:
    return await chat_service.process(request)
```

**Constraints**:
- ✅ Use `Depends()` for injection
- ✅ Constructor injection pattern
- ✅ Type annotations with `Annotated`
- ❌ NO global service instances
- ❌ NO field injection

**Example**: Chat service injection

---

## 🔧 PATTERN 4: DEPENDENCY INJECTION - REPOSITORY LAYER

**Pattern**: Injecting repositories with lifecycle management

**Problem**: Need database connections with proper cleanup

**Solution**:
```python
# src/api/deps.py
from typing import AsyncGenerator, Annotated
from fastapi import Depends
from src.repositories.neo4j_repository import Neo4jRepository

async def get_neo4j_repository() -> AsyncGenerator[Neo4jRepository, None]:
    repo = Neo4jRepository()
    try:
        yield repo
    finally:
        await repo.close()

Neo4jRepoDep = Annotated[Neo4jRepository, Depends(get_neo4j_repository)]
```

**Constraints**:
- ✅ Use `AsyncGenerator` for cleanup
- ✅ Always close connections in `finally`
- ✅ Yield repository instance
- ❌ NO connection leaks

**Example**: Repository dependency

---

## 🔧 PATTERN 5: AUTHENTICATION DEPENDENCY

**Pattern**: JWT token authentication via dependency

**Problem**: Need to verify user authentication across endpoints

**Solution**:
```python
# src/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.core.security import verify_token
from src.models.domain.user import User

security = HTTPBearer()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return User(**payload)

CurrentUserDep = Annotated[User, Depends(get_current_user)]
```

**Constraints**:
- ✅ Use `HTTPBearer` for token extraction
- ✅ Verify token validity
- ✅ Raise 401 on invalid token
- ❌ NO token storage in memory

**Example**: Authentication dependency

---

## 🔧 PATTERN 6: REQUEST BODY VALIDATION

**Pattern**: Using Pydantic v2 for request validation

**Problem**: Need automatic validation of request payloads

**Solution**:
```python
# src/models/schemas/requests/chat.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=5000)
    mode: str = Field(default="citizen", pattern="^(citizen|csgt|lawyer)$")
    attachments: Optional[List[dict]] = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content cannot be empty or whitespace")
        return v.strip()

    model_config = {"str_strip_whitespace": True}
```

**Constraints**:
- ✅ Use Pydantic `BaseModel`
- ✅ Define field constraints with `Field`
- ✅ Custom validators with `@field_validator`
- ❌ NO manual validation code

**Example**: Chat request validation

---

## 🔧 PATTERN 7: QUERY PARAMETERS

**Pattern**: Handling query parameters with validation

**Problem**: Need validated query parameters for filtering/pagination

**Solution**:
```python
from typing import Annotated
from fastapi import Query

@router.get("/search")
async def search_knowledge(
    query: Annotated[str, Query(min_length=1, max_length=200)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
    mode: Annotated[str, Query(pattern="^(citizen|csgt|lawyer)$")] = "citizen",
) -> SearchResponse:
    # Implementation
    pass
```

**Constraints**:
- ✅ Use `Query()` for parameter validation
- ✅ Type hints with `Annotated`
- ✅ Default values where appropriate
- ❌ NO manual parsing

**Example**: Search endpoint with filters

---

## 🔧 PATTERN 8: PATH PARAMETERS

**Pattern**: Handling path parameters with validation

**Problem**: Need validated URL path parameters

**Solution**:
```python
from fastapi import Path
from typing import Annotated

@router.get("/session/{session_id}")
async def get_session(
    session_id: Annotated[str, Path(min_length=1, max_length=100)],
) -> SessionResponse:
    # Implementation
    pass

@router.delete("/session/{session_id}/messages/{message_id}")
async def delete_message(
    session_id: Annotated[str, Path(min_length=1)],
    message_id: Annotated[int, Path(ge=1)],
) -> DeleteResponse:
    # Implementation
    pass
```

**Constraints**:
- ✅ Use `Path()` for validation
- ✅ Type hints for conversion
- ✅ Constraints on path params
- ❌ NO unchecked path params

**Example**: Session and message endpoints

---

## 🔧 PATTERN 9: FILE UPLOAD HANDLING

**Pattern**: Handling file uploads with size limits

**Problem**: Need to accept and validate uploaded files

**Solution**:
```python
from fastapi import File, UploadFile
from typing import Annotated

@router.post("/upload/image")
async def upload_image(
    file: Annotated[UploadFile, File(...)],
    session_id: Annotated[str, Query(...)],
) -> UploadResponse:
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, WEBP images allowed"
        )

    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Process file
    # ...

    return UploadResponse(file_id="...", url="...")
```

**Constraints**:
- ✅ Use `UploadFile` for file handling
- ✅ Validate `content_type`
- ✅ Enforce size limits
- ❌ NO unlimited file sizes

**Example**: Image upload endpoint

---

## 🔧 PATTERN 10: RESPONSE MODEL WITH STATUS CODES

**Pattern**: Defining response models and status codes

**Problem**: Need type-safe responses with proper HTTP status

**Solution**:
```python
from fastapi import status

@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"description": "Invalid request"},
        401: {"description": "Unauthorized"},
        500: {"description": "Internal server error"},
    }
)
async def create_chat(
    request: ChatRequest,
    chat_service: ChatServiceDep,
) -> ChatResponse:
    response = await chat_service.process(request)
    return response
```

**Constraints**:
- ✅ Use `response_model` for serialization
- ✅ Define `status_code` explicitly
- ✅ Document error responses
- ❌ NO raw dict returns

**Example**: Chat endpoint with typed response

---

## 🔧 PATTERN 11: STREAMING RESPONSE (SSE)

**Pattern**: Server-Sent Events for streaming responses

**Problem**: Need real-time streaming responses

**Solution**:
```python
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator

@router.post("/chat/stream")
async def chat_stream(
    request: StreamRequest,
    chat_service: ChatServiceDep,
) -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        async for chunk in chat_service.process_stream(request):
            yield f"event: {chunk.event_type}\n"
            yield f"data: {chunk.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

**Constraints**:
- ✅ Use `StreamingResponse`
- ✅ SSE format: `event: ...\ndata: ...\n\n`
- ✅ Set `media_type="text/event-stream"`
- ❌ NO blocking operations in generator

**Example**: Streaming chat response

---

## 🔧 PATTERN 12: JSON RESPONSE

**Pattern**: Returning JSON responses with custom serialization

**Problem**: Need custom JSON serialization (dates, etc.)

**Solution**:
```python
from fastapi.responses import JSONResponse
from datetime import datetime

@router.get("/stats")
async def get_stats() -> JSONResponse:
    stats = {
        "total_sessions": 1234,
        "total_messages": 5678,
        "timestamp": datetime.now().isoformat(),
    }
    return JSONResponse(
        content=stats,
        headers={"X-Custom-Header": "value"},
    )
```

**Constraints**:
- ✅ Use `JSONResponse` for custom headers
- ✅ ISO format for dates
- ✅ Pydantic models preferred
- ❌ NO unserializable objects

**Example**: Stats endpoint

---

## 🔧 PATTERN 13: EXCEPTION HANDLING - CUSTOM EXCEPTIONS

**Pattern**: Raising custom HTTP exceptions

**Problem**: Need meaningful error responses

**Solution**:
```python
from fastapi import HTTPException, status

class ResourceNotFoundError(HTTPException):
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with id '{resource_id}' not found"
        )

@router.get("/session/{session_id}")
async def get_session(session_id: str) -> SessionResponse:
    session = await session_service.get(session_id)
    if not session:
        raise ResourceNotFoundError("Session", session_id)
    return session
```

**Constraints**:
- ✅ Extend `HTTPException` for custom errors
- ✅ Include meaningful `detail` message
- ✅ Use appropriate status codes
- ❌ NO generic 500 errors

**Example**: Session not found error

---

## 🔧 PATTERN 14: EXCEPTION HANDLING - TRY/EXCEPT

**Pattern**: Handling service layer exceptions

**Problem**: Need to catch and convert service errors to HTTP responses

**Solution**:
```python
from src.core.exceptions import AgentError, RAGError

@router.post("/chat")
async def chat(
    request: ChatRequest,
    chat_service: ChatServiceDep,
) -> ChatResponse:
    try:
        return await chat_service.process(request)
    except AgentError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent processing failed: {str(e)}"
        )
    except RAGError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Knowledge retrieval failed: {str(e)}"
        )
    except Exception as e:
        logger.exception("Unexpected error in chat endpoint")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )
```

**Constraints**:
- ✅ Catch specific exceptions first
- ✅ Convert to appropriate HTTP status
- ✅ Log unexpected errors
- ❌ NO bare except clauses

**Example**: Error handling in endpoint

---

## 🔧 PATTERN 15: VALIDATION ERROR HANDLING

**Pattern**: Handling Pydantic validation errors

**Problem**: Return user-friendly validation errors

**Solution**:
```python
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": errors}
    )
```

**Constraints**:
- ✅ Format validation errors clearly
- ✅ Include field location
- ✅ Use 422 status code
- ❌ NO raw Pydantic errors exposed

**Example**: Validation error handler

---

## 🔧 PATTERN 16: HEALTH CHECK ENDPOINT

**Pattern**: Implementing health check for monitoring

**Problem**: Need endpoint to verify service health

**Solution**:
```python
from fastapi import status

@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    tags=["Health"]
)
async def health_check() -> dict:
    # Check database connections
    neo4j_healthy = await check_neo4j()
    redis_healthy = await check_redis()

    if not (neo4j_healthy and redis_healthy):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "neo4j": neo4j_healthy,
                "redis": redis_healthy,
            }
        )

    return {
        "status": "healthy",
        "version": "2.0.0",
        "neo4j": "ok",
        "redis": "ok",
    }
```

**Constraints**:
- ✅ Check critical dependencies
- ✅ Return 503 if unhealthy
- ✅ Include version info
- ❌ NO slow health checks

**Example**: Health endpoint

---

## 🔧 PATTERN 17: BACKGROUND TASKS

**Pattern**: Running background tasks after response

**Problem**: Need async work without blocking response

**Solution**:
```python
from fastapi import BackgroundTasks

async def log_analytics(session_id: str, query: str):
    # Log to analytics service
    await analytics_service.log(session_id, query)

@router.post("/chat")
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    chat_service: ChatServiceDep,
) -> ChatResponse:
    response = await chat_service.process(request)

    # Run analytics logging in background
    background_tasks.add_task(
        log_analytics,
        request.session_id,
        request.content
    )

    return response
```

**Constraints**:
- ✅ Use `BackgroundTasks` for non-critical work
- ✅ Add tasks after main processing
- ✅ Handle errors in background tasks
- ❌ NO critical logic in background

**Example**: Analytics logging

---

## 🔧 PATTERN 18: API VERSIONING

**Pattern**: Versioning APIs with prefix

**Problem**: Need API version management

**Solution**:
```python
# src/api/v1/router.py
from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(chat.router)

# src/api/v2/router.py
api_v2_router = APIRouter(prefix="/api/v2")
api_v2_router.include_router(chat.router)

# src/api/main.py
app.include_router(api_v1_router)
app.include_router(api_v2_router)
```

**Constraints**:
- ✅ Version in URL path (`/api/v1/...`)
- ✅ Separate routers per version
- ✅ Maintain backward compatibility
- ❌ NO breaking changes within version

**Example**: Multi-version API

---

## 🔧 PATTERN 19: CORS CONFIGURATION

**Pattern**: Configuring CORS for frontend

**Problem**: Need cross-origin requests from frontend

**Solution**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "https://app.example.com",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

**Constraints**:
- ✅ Whitelist specific origins
- ✅ Enable credentials if needed
- ✅ Limit methods appropriately
- ❌ NO `allow_origins=["*"]` in production

**Example**: CORS middleware

---

## 🔧 PATTERN 20: ROUTER LIFESPAN EVENTS

**Pattern**: Handling startup/shutdown events

**Problem**: Need initialization and cleanup

**Solution**:
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing connections...")
    await neo4j_client.connect()
    await redis_client.connect()

    yield  # Application runs

    # Shutdown
    print("Closing connections...")
    await neo4j_client.close()
    await redis_client.close()

app = FastAPI(lifespan=lifespan)
```

**Constraints**:
- ✅ Use `@asynccontextmanager` for lifespan
- ✅ Initialize in startup, cleanup in shutdown
- ✅ Handle errors in cleanup
- ❌ NO resource leaks

**Example**: Application lifespan

---

## 📊 PATTERN SUMMARY

**Total Patterns**: 20

### Distribution
- Router Setup & Configuration: 5 patterns
- Dependency Injection: 4 patterns
- Request Handling: 4 patterns
- Response Handling: 3 patterns
- Error Handling: 4 patterns

### Critical Constraints
✅ **REQUIRED**:
- FastAPI `APIRouter` for modularity
- Pydantic v2 for validation
- `Depends()` for injection
- Async/await everywhere
- Type hints on all functions

❌ **PROHIBITED**:
- Global state in routers
- Field injection (use constructor)
- Blocking operations in async
- Missing type hints
- Bare except clauses

---

**Created**: 2025-12-28
**Status**: ✅ Complete
**Specialist**: FastAPI Router
**Patterns**: 20 patterns documented

---

*FastAPI Router Specialist - Presentation Layer Expert*
*RESTful APIs | Dependency Injection | Type Safety | Error Handling*
