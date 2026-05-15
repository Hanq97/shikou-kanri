# WebSocket & Middleware Specialist
# WebSocket & ミドルウェアスペシャリスト
# Chuyên Gia WebSocket & Middleware

**Role**: WebSocket & Middleware Pattern Expert
**Focus**: Real-time Communication, Request/Response Middleware
**Patterns**: 20 patterns (10 WebSocket + 10 Middleware)
**Layer**: Presentation Layer (API)

---

## 🎯 SPECIALIST OVERVIEW

### Responsibilities
- Design WebSocket connections for real-time chat
- Implement middleware for auth, logging, CORS, rate limiting
- Handle connection lifecycle (connect, disconnect, error)
- Broadcast messages to multiple clients
- Middleware chaining and error handling

### Key Technologies
- FastAPI WebSocket support
- Starlette middleware
- Python async/await
- Connection pooling

---

## 📋 PATTERN CATEGORIES

### 1. WebSocket Connection Management (5 patterns)
### 2. WebSocket Message Handling (5 patterns)
### 3. Middleware - Authentication & Security (4 patterns)
### 4. Middleware - Logging & Monitoring (3 patterns)
### 5. Middleware - Error Handling (3 patterns)

---

## 🔧 PATTERN 1: WEBSOCKET CONNECTION MANAGER

**Pattern**: Managing WebSocket connections with connection pool

**Problem**: Need centralized management of active WebSocket connections

**Solution**:
```python
# src/api/websocket/manager.py
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)

    async def send_message(self, message: str, session_id: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_text(message)
```

**Constraints**:
- ✅ Centralized connection pool
- ✅ Session-based grouping
- ✅ Handle connect/disconnect
- ❌ NO memory leaks (cleanup on disconnect)

**Example**: WebSocket connection manager

---

## 🔧 PATTERN 2: WEBSOCKET ENDPOINT

**Pattern**: Creating WebSocket endpoint with message loop

**Problem**: Need to handle WebSocket connections and message processing

**Solution**:
```python
from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: str,
):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            response = await chat_service.process(data)
            await manager.send_message(response, session_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
```

**Constraints**:
- ✅ Accept WebSocket connection
- ✅ Handle message loop
- ✅ Cleanup on disconnect
- ❌ NO blocking operations in message loop

**Example**: WebSocket chat endpoint

---

## 🔧 PATTERN 3: WEBSOCKET BROADCASTING

**Pattern**: Broadcasting messages to all connected clients

**Problem**: Need to send messages to multiple WebSocket connections

**Solution**:
```python
async def broadcast(self, message: str):
    for connections in self.active_connections.values():
        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass  # Connection closed
```

**Constraints**:
- ✅ Broadcast to all connections
- ✅ Handle closed connections gracefully
- ✅ No blocking on failed sends
- ❌ NO waiting for acknowledgments

**Example**: Broadcast system notifications

---

## 🔧 PATTERN 4: WEBSOCKET JSON MESSAGES

**Pattern**: Structured JSON message exchange over WebSocket

**Problem**: Need type-safe message structure for WebSocket communication

**Solution**:
```python
@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            content = data.get("content")

            response = {"type": "response", "content": "..."}
            await websocket.send_json(response)
    except WebSocketDisconnect:
        pass
```

**Constraints**:
- ✅ Use `receive_json()` and `send_json()`
- ✅ Type-safe message structure
- ✅ Handle malformed JSON
- ❌ NO raw text messages for structured data

**Example**: JSON-based chat protocol

---

## 🔧 PATTERN 5: WEBSOCKET AUTHENTICATION

**Pattern**: Authenticating WebSocket connections

**Problem**: Need to verify user identity before accepting WebSocket connection

**Solution**:
```python
@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    user = verify_token(token)
    if not user:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    await manager.connect(websocket, session_id, user)
    # ...
```

**Constraints**:
- ✅ Verify token before accepting
- ✅ Close with appropriate code if unauthorized
- ✅ Pass user context to manager
- ❌ NO accepting unauthenticated connections

**Example**: Authenticated WebSocket chat

---

## 🔧 PATTERN 6: WEBSOCKET STREAMING RESPONSE

**Pattern**: Streaming LLM responses over WebSocket

**Problem**: Need to stream incremental responses to client

**Solution**:
```python
async def stream_chat_response(websocket: WebSocket, query: str):
    async for chunk in llm_service.stream(query):
        event = {
            "type": "chunk",
            "data": chunk.text,
            "metadata": {"tokens": chunk.tokens}
        }
        await websocket.send_json(event)

    await websocket.send_json({"type": "done"})
```

**Constraints**:
- ✅ Stream chunks incrementally
- ✅ Send metadata with chunks
- ✅ Send completion signal
- ❌ NO buffering entire response

**Example**: Streaming LLM chat responses

---

## 🔧 PATTERN 7: WEBSOCKET ERROR HANDLING

**Pattern**: Handling WebSocket errors gracefully

**Problem**: Need to handle connection errors and send error messages

**Solution**:
```python
try:
    while True:
        data = await websocket.receive_text()
        response = await chat_service.process(data)
        await websocket.send_text(response)
except WebSocketDisconnect:
    logger.info(f"Client disconnected: {session_id}")
except Exception as e:
    logger.exception(f"WebSocket error: {e}")
    await websocket.send_json({"type": "error", "message": str(e)})
    await websocket.close()
```

**Constraints**:
- ✅ Handle disconnects gracefully
- ✅ Log unexpected errors
- ✅ Send error messages to client
- ❌ NO silent failures

**Example**: WebSocket error recovery

---

## 🔧 PATTERN 8: WEBSOCKET PING/PONG HEARTBEAT

**Pattern**: Keeping WebSocket connections alive with heartbeat

**Problem**: Need to detect dead connections and keep alive

**Solution**:
```python
import asyncio

async def heartbeat(websocket: WebSocket):
    while True:
        try:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
        except:
            break

@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    await websocket.accept()
    asyncio.create_task(heartbeat(websocket))
    # ...
```

**Constraints**:
- ✅ Send periodic heartbeat
- ✅ Detect dead connections
- ✅ Run heartbeat in background task
- ❌ NO blocking the main message loop

**Example**: WebSocket heartbeat monitoring

---

## 🔧 PATTERN 9: WEBSOCKET RATE LIMITING

**Pattern**: Rate limiting WebSocket messages

**Problem**: Need to prevent abuse by limiting message rate

**Solution**:
```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, max_messages: int = 10, window: int = 60):
        self.max_messages = max_messages
        self.window = window
        self.message_times = defaultdict(list)

    def is_allowed(self, session_id: str) -> bool:
        now = time.time()
        self.message_times[session_id] = [
            t for t in self.message_times[session_id] if now - t < self.window
        ]
        if len(self.message_times[session_id]) >= self.max_messages:
            return False
        self.message_times[session_id].append(now)
        return True
```

**Constraints**:
- ✅ Track message rate per session
- ✅ Sliding window algorithm
- ✅ Reject if rate exceeded
- ❌ NO fixed window (use sliding)

**Example**: Rate limiting chat messages

---

## 🔧 PATTERN 10: WEBSOCKET CONNECTION CLEANUP

**Pattern**: Cleaning up inactive WebSocket connections

**Problem**: Need to remove dead connections from pool

**Solution**:
```python
from fastapi import WebSocketState

class ConnectionManager:
    async def cleanup_inactive(self):
        """Remove inactive connections."""
        for session_id, connections in list(self.active_connections.items()):
            for conn in connections[:]:
                if conn.client_state != WebSocketState.CONNECTED:
                    connections.remove(conn)
            if not connections:
                del self.active_connections[session_id]
```

**Constraints**:
- ✅ Periodic cleanup of dead connections
- ✅ Check connection state
- ✅ Remove empty session groups
- ❌ NO manual iteration without copy (use `list()`)

**Example**: Background connection cleanup

---

## 🔧 PATTERN 11: CUSTOM MIDDLEWARE BASE

**Pattern**: Creating custom HTTP middleware

**Problem**: Need to process requests before/after route handlers

**Solution**:
```python
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

class CustomMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Before request
        response = await call_next(request)
        # After request
        return response
```

**Constraints**:
- ✅ Extend `BaseHTTPMiddleware`
- ✅ Process before and after request
- ✅ Return modified response
- ❌ NO blocking operations in middleware

**Example**: Custom middleware base class

---

## 🔧 PATTERN 12: AUTHENTICATION MIDDLEWARE

**Pattern**: Middleware for token-based authentication

**Problem**: Need to verify authentication for API routes

**Solution**:
```python
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/"):
            token = request.headers.get("Authorization")
            if not token or not verify_token(token.replace("Bearer ", "")):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized"}
                )
        return await call_next(request)
```

**Constraints**:
- ✅ Check Authorization header
- ✅ Verify token for API routes
- ✅ Return 401 if invalid
- ❌ NO authenticating public routes

**Example**: JWT authentication middleware

---

## 🔧 PATTERN 13: RATE LIMITING MIDDLEWARE

**Pattern**: Middleware for rate limiting requests

**Problem**: Need to limit request rate per IP address

**Solution**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Apply rate limiting
    return await call_next(request)
```

**Constraints**:
- ✅ Use `slowapi` for rate limiting
- ✅ Key by IP address
- ✅ Return 429 if exceeded
- ❌ NO unlimited requests

**Example**: IP-based rate limiting

---

## 🔧 PATTERN 14: REQUEST LOGGING MIDDLEWARE

**Pattern**: Middleware for logging requests and response times

**Problem**: Need to log all HTTP requests with timing

**Solution**:
```python
import time

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} duration={process_time:.3f}s"
        )
        return response
```

**Constraints**:
- ✅ Log request method and path
- ✅ Measure request duration
- ✅ Include status code
- ❌ NO logging sensitive data (passwords, tokens)

**Example**: Request logging with timing

---

## 🔧 PATTERN 15: ERROR HANDLING MIDDLEWARE

**Pattern**: Global error handling middleware

**Problem**: Need to catch all unhandled exceptions

**Solution**:
```python
class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            logger.exception(f"Unhandled exception: {e}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
```

**Constraints**:
- ✅ Catch all unhandled exceptions
- ✅ Log exceptions
- ✅ Return generic 500 error
- ❌ NO exposing stack traces to client

**Example**: Global exception handler

---

## 🔧 PATTERN 16: REQUEST ID MIDDLEWARE

**Pattern**: Adding request ID to all requests

**Problem**: Need to track requests across services

**Solution**:
```python
import uuid

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
```

**Constraints**:
- ✅ Generate or use existing request ID
- ✅ Store in `request.state`
- ✅ Return in response headers
- ❌ NO losing request ID in async tasks

**Example**: Request ID tracking

---

## 🔧 PATTERN 17: TIMING HEADERS MIDDLEWARE

**Pattern**: Adding timing headers to responses

**Problem**: Need to measure request processing time

**Solution**:
```python
import time

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        response.headers["X-Process-Time"] = f"{process_time:.3f}"
        return response
```

**Constraints**:
- ✅ Measure request processing time
- ✅ Add timing header to response
- ✅ Useful for performance monitoring
- ❌ NO blocking time measurement

**Example**: Performance monitoring headers

---

## 🔧 PATTERN 18: CORS PREFLIGHT MIDDLEWARE

**Pattern**: Configuring CORS for frontend

**Problem**: Need to allow cross-origin requests from frontend

**Solution**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)
```

**Constraints**:
- ✅ Configure CORS for frontend
- ✅ Allow credentials for cookies
- ✅ Expose custom headers
- ❌ NO wildcard origins in production

**Example**: CORS configuration for React frontend

---

## 🔧 PATTERN 19: COMPRESSION MIDDLEWARE

**Pattern**: Compressing HTTP responses

**Problem**: Need to reduce bandwidth usage

**Solution**:
```python
from fastapi.middleware.gzip import GZIPMiddleware

app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

**Constraints**:
- ✅ Compress responses > 1KB
- ✅ Reduce bandwidth usage
- ✅ Automatic content-encoding header
- ❌ NO compressing images/videos (already compressed)

**Example**: GZIP compression for API responses

---

## 🔧 PATTERN 20: SECURITY HEADERS MIDDLEWARE

**Pattern**: Adding security headers to responses

**Problem**: Need to protect against common web vulnerabilities

**Solution**:
```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000"

        return response
```

**Constraints**:
- ✅ Add security headers
- ✅ Prevent MIME sniffing
- ✅ Prevent clickjacking
- ✅ Enable HSTS
- ❌ NO missing security headers in production

**Example**: Security headers for production

---

## 📊 PATTERN SUMMARY

**Total Patterns**: 20

### Distribution
- WebSocket Connection Management: 5 patterns (25%)
- WebSocket Message Handling: 5 patterns (25%)
- Middleware - Authentication & Security: 4 patterns (20%)
- Middleware - Logging & Monitoring: 3 patterns (15%)
- Middleware - Error Handling: 3 patterns (15%)

### Critical Constraints
✅ **REQUIRED**:
- WebSocket connection pooling
- Async/await everywhere
- Error handling in message loops
- Cleanup on disconnect
- Rate limiting for WebSocket
- Security headers in middleware
- Request logging with timing
- Authentication middleware for APIs

❌ **PROHIBITED**:
- Blocking operations in WebSocket loop
- Missing error handling
- Connection leaks
- Exposing stack traces
- Missing CORS configuration
- Wildcard CORS in production
- Missing authentication checks
- No rate limiting

---

**Created**: 2025-12-31
**Status**: ✅ Complete
**Specialist**: WebSocket & Middleware
**Patterns**: 20 patterns (10 WebSocket + 10 Middleware)

---

*WebSocket & Middleware Specialist - FastAPI Presentation Layer*
*Real-time Communication | Middleware Chaining | Error Handling | Security*
