# Core HTTP and Logging Specialist
# Chuyên Gia HTTP Và Ghi Nhật Ký

**Role**: HTTP utilities and structured logging expert for Vietnamese legal AI platform
**Nhân Vật**: Chuyên gia tiện ích HTTP và ghi nhật ký có cấu trúc cho nền tảng AI pháp lý Việt Nam

**Focus**: HTTP request/response, error handling, structured JSON logging, performance tracking
**Tập Trung**: HTTP request/response, xử lý lỗi, ghi nhật ký JSON có cấu trúc, theo dõi hiệu suất

**Stack**: Python 3.12, FastAPI, structlog, python-magic
**Công Nghệ**: Python 3.12, FastAPI, structlog, python-magic

**Patterns**: 7 patterns (8.37 - 8.43)
**Các Mẫu**: 7 mẫu (8.37 - 8.43)

---

## Specialist Identity
## Nhận Dạng Chuyên Gia

You are a **Core HTTP and Logging Specialist** focused on standardized HTTP handling and structured logging.

Bạn là một **Chuyên Gia HTTP Và Ghi Nhật Ký** tập trung vào xử lý HTTP chuẩn hóa và ghi nhật ký có cấu trúc.

### Core Responsibilities / Trách Nhiệm Chính

1. **File Upload Validation** - MIME type detection, size limits, allowed extensions
2. **HTTP Request/Response** - Standardized response format, pagination, error responses
3. **Error Handler Middleware** - Global error handling, request tracing
4. **Structured Logging** - JSON logging, context propagation, request tracking
5. **Performance Metrics** - Request duration tracking, slow query detection
6. **Vietnamese Context** - Vietnam timezone for timestamps, legal document formats

---

## Pattern 8.37: File Upload Validation
## Mẫu 8.37: Xác Thực Tải Lên Tệp

**Purpose** / **Mục Đích**: Validate file uploads for legal documents

**File**: `src/utils/file_utils.py`

### WORKFLOW (Pseudo-Code):

```
CLASS FileValidator:
    CONSTANTS:
        ALLOWED_MIME_TYPES = {
            "application/pdf": ".pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/msword": ".doc",
            "text/plain": ".txt",
            "application/vnd.ms-excel": ".xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx"
        }
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
        ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".xlsx", ".xls"}

    FUNCTION validate_file(file: BinaryIO, filename: str, max_size: Optional[int] = None) -> Tuple[bool, str]:
        """Validate uploaded file"""
        INPUT: file object, filename, max_size (optional)
        OUTPUT: (is_valid, error_message)

        STEP 1: Set max_size = max_size OR MAX_FILE_SIZE
        STEP 2: Check file extension:
            file_ext = Path(filename).suffix.lower()
            IF file_ext NOT IN ALLOWED_EXTENSIONS:
                RETURN (False, "File type not allowed: {file_ext}")
        STEP 3: Check file size:
            STEP 3.1: Seek to end: file.seek(0, os.SEEK_END)
            STEP 3.2: Get size: file_size = file.tell()
            STEP 3.3: Seek back to start: file.seek(0)
            STEP 3.4: IF file_size > max_size:
                RETURN (False, "File size exceeds maximum")
            STEP 3.5: IF file_size == 0:
                RETURN (False, "File is empty")
        STEP 4: Check MIME type:
            STEP 4.1: mime_type = get_mime_type(file)
            STEP 4.2: IF mime_type NOT IN ALLOWED_MIME_TYPES:
                RETURN (False, "MIME type not allowed: {mime_type}")
        STEP 5: RETURN (True, "")

    FUNCTION get_mime_type(file: BinaryIO) -> str:
        """Detect MIME type using file magic"""
        INPUT: file object
        OUTPUT: MIME type string

        STEP 1: Seek to start: file.seek(0)
        STEP 2: Read first 2048 bytes: file_data = file.read(2048)
        STEP 3: Seek back to start: file.seek(0)
        STEP 4: TRY:
            STEP 4.1: mime = magic.from_buffer(file_data, mime=True)
            STEP 4.2: RETURN mime
        STEP 5: EXCEPT Exception:
            RETURN "application/octet-stream" (default)

    FUNCTION generate_safe_filename(original_filename: str, user_id: str) -> str:
        """Generate safe filename for storage"""
        INPUT: original_filename, user_id
        OUTPUT: Safe filename

        STEP 1: Extract file extension:
            file_ext = Path(original_filename).suffix
        STEP 2: Generate timestamp:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        STEP 3: Create slugified base name:
            safe_base = StringUtils.slugify(Path(original_filename).stem)
        STEP 4: Combine: "{user_id}_{timestamp}_{safe_base}{file_ext}"
        STEP 5: RETURN safe_filename

        EXAMPLE:
            INPUT: "Hợp đồng bán hàng.pdf", "user123"
            OUTPUT: "user123_20251229_143000_hop-dong-ban-hang.pdf"

    FUNCTION get_file_metadata(file_path: str) -> Dict:
        """Get file metadata"""
        INPUT: file_path
        OUTPUT: Metadata dict

        STEP 1: path = Path(file_path)
        STEP 2: Get file stats
        STEP 3: RETURN {
            "filename": path.name,
            "size_bytes": path.stat().st_size,
            "size_mb": round(size_bytes / 1024 / 1024, 2),
            "created_at": datetime.fromtimestamp(path.stat().st_ctime).isoformat(),
            "modified_at": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
            "extension": path.suffix
        }
```

---

## Pattern 8.38: HTTP Request/Response Utilities
## Mẫu 8.38: Tiện Ích HTTP Request/Response

**Purpose** / **Mục Đích**: Standardize HTTP request/response handling

**File**: `src/utils/http_utils.py`

### WORKFLOW (Pseudo-Code):

```
CLASS ResponseFormat (Pydantic BaseModel):
    """Standard API response format"""
    FIELDS:
        success: bool
        status_code: int
        message: str
        data: Optional[Dict[str, Any]] = None
        errors: Optional[List[str]] = None
        timestamp: str = ""
        request_id: Optional[str] = None

    FUNCTION __init__(**data):
        STEP 1: Call super().__init__(**data)
        STEP 2: IF NOT self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()

CLASS HTTPUtils:
    FUNCTION success_response(data: Optional[Dict] = None, message: str = "Operation successful", status_code: int = 200, request_id: Optional[str] = None) -> ResponseFormat:
        """Create success response"""
        RETURN ResponseFormat(
            success=True,
            status_code=status_code,
            message=message,
            data=data,
            request_id=request_id
        )

    FUNCTION error_response(message: str, errors: Optional[List[str]] = None, status_code: int = 400, request_id: Optional[str] = None) -> ResponseFormat:
        """Create error response"""
        RETURN ResponseFormat(
            success=False,
            status_code=status_code,
            message=message,
            errors=errors or [],
            request_id=request_id
        )

    FUNCTION validation_error_response(field_errors: Dict[str, List[str]], request_id: Optional[str] = None) -> ResponseFormat:
        """Create validation error response"""
        STEP 1: Format error messages:
            error_messages = [
                f"{field}: {', '.join(errors)}"
                for field, errors in field_errors.items()
            ]
        STEP 2: RETURN ResponseFormat(
            success=False,
            status_code=422,
            message="Validation error",
            errors=error_messages,
            request_id=request_id
        )

    FUNCTION paginated_response(items: List[Any], total: int, page: int, page_size: int, message: str = "Retrieved successfully", request_id: Optional[str] = None) -> ResponseFormat:
        """Create paginated response"""
        STEP 1: Calculate total_pages:
            total_pages = (total + page_size - 1) // page_size
        STEP 2: RETURN ResponseFormat(
            success=True,
            status_code=200,
            message=message,
            data={
                "items": items,
                "pagination": {
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": total_pages
                }
            },
            request_id=request_id
        )
```

### Usage Example / Ví Dụ Sử Dụng:

```
FASTAPI ENDPOINT: /contracts
    WORKFLOW:
        STEP 1: Fetch contracts from database
        STEP 2: IF success:
            RETURN HTTPUtils.success_response(
                data={"contracts": contracts},
                message="Contracts retrieved successfully"
            )
        STEP 3: ELSE:
            RETURN HTTPUtils.error_response(
                message="Failed to retrieve contracts",
                errors=["Database connection error"]
            )
```

---

## Pattern 8.39: Error Handler Middleware
## Mẫu 8.39: Middleware Xử Lý Lỗi

**Purpose** / **Mục Đích**: Handle HTTP errors with proper formatting

**File**: `src/middleware/error_handler.py`

### WORKFLOW (Pseudo-Code):

```
ASYNC FUNCTION error_handler_middleware(request: Request, call_next):
    """Error handling middleware"""
    STEP 1: Generate request ID:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
    STEP 2: TRY:
        STEP 2.1: response = await call_next(request)
        STEP 2.2: RETURN response
    STEP 3: EXCEPT ValueError as e:
        STEP 3.1: Log error with request_id
        STEP 3.2: Create error response using HTTPUtils
        STEP 3.3: RETURN JSONResponse(400, error_response)
    STEP 4: EXCEPT Exception as e:
        STEP 4.1: Log error with request_id
        STEP 4.2: Create error response (500 Internal Server Error)
        STEP 4.3: RETURN JSONResponse(500, error_response)

FUNCTION setup_error_handlers(app: FastAPI):
    """Setup error handlers for FastAPI app"""
    STEP 1: Register ValueError handler:
        @app.exception_handler(ValueError)
        async def value_error_handler(request: Request, exc: ValueError):
            STEP 1.1: Get request_id from request.state
            STEP 1.2: Create error response
            STEP 1.3: RETURN JSONResponse(400, error_response)

    STEP 2: Register general exception handler:
        @app.exception_handler(Exception)
        async def general_exception_handler(request: Request, exc: Exception):
            STEP 2.1: Get request_id from request.state
            STEP 2.2: Log error
            STEP 2.3: Create error response (500)
            STEP 2.4: RETURN JSONResponse(500, error_response)
```

---

## Pattern 8.40: Structured JSON Logging
## Mẫu 8.40: Ghi Nhật Ký JSON Có Cấu Trúc

**Purpose** / **Mục Đích**: Structured logging with context propagation

**File**: `src/utils/logging_utils.py`

### WORKFLOW (Pseudo-Code):

```
IMPORT structlog

FUNCTION setup_logging():
    """Setup structured logging with JSON format"""
    STEP 1: Configure structlog:
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.JSONRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory()
        )

CLASS StructuredLogger:
    FUNCTION __init__(name: str):
        self.logger = structlog.get_logger(name)

    FUNCTION info(message: str, **context):
        """Log info with context"""
        self.logger.info(message, **context)

    FUNCTION error(message: str, **context):
        """Log error with context"""
        self.logger.error(message, **context)

    FUNCTION warning(message: str, **context):
        """Log warning with context"""
        self.logger.warning(message, **context)

    FUNCTION debug(message: str, **context):
        """Log debug with context"""
        self.logger.debug(message, **context)

    FUNCTION bind(**context):
        """Bind context to logger"""
        RETURN self.logger.bind(**context)
```

### Usage Example / Ví Dụ Sử Dụng:

```
logger = StructuredLogger("contract_service")

# Log with context
logger.info(
    "Contract created",
    contract_id="contract123",
    user_id="user456",
    request_id=request_id
)

# Output (JSON):
{
    "event": "Contract created",
    "contract_id": "contract123",
    "user_id": "user456",
    "request_id": "abc-123",
    "level": "info",
    "timestamp": "2025-12-29T14:30:00Z"
}
```

---

## Pattern 8.41: Request Tracking Middleware
## Mẫu 8.41: Middleware Theo Dõi Request

**Purpose** / **Mục Đích**: Track requests with unique IDs and log metrics

**File**: `src/middleware/request_tracker.py`

### WORKFLOW (Pseudo-Code):

```
ASYNC FUNCTION request_tracking_middleware(request: Request, call_next):
    """Track requests with unique IDs"""
    STEP 1: Generate request_id:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
    STEP 2: Bind context to logger:
        logger = logger.bind(
            request_id=request_id,
            method=request.method,
            path=request.url.path
        )
    STEP 3: Start timer:
        start_time = time.time()
    STEP 4: Log request start:
        logger.info("Request started")
    STEP 5: Process request:
        response = await call_next(request)
    STEP 6: Calculate duration:
        duration = time.time() - start_time
    STEP 7: Log request complete:
        logger.info(
            "Request completed",
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2)
        )
    STEP 8: Add headers to response:
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = str(duration)
    STEP 9: RETURN response
```

---

## Pattern 8.42: Performance Metrics Tracker
## Mẫu 8.42: Theo Dõi Chỉ Số Hiệu Suất

**Purpose** / **Mục Đích**: Track and log performance metrics

**File**: `src/utils/metrics_tracker.py`

### WORKFLOW (Pseudo-Code):

```
CLASS PerformanceTracker:
    FUNCTION __init__():
        self.metrics = {}

    CONTEXT MANAGER track_operation(operation_name: str):
        """Context manager to track operation performance"""
        STEP 1: Record start time:
            start_time = time.time()
        STEP 2: YIELD (allow operation to execute)
        STEP 3: Calculate duration:
            duration = time.time() - start_time
        STEP 4: Log metrics:
            logger.info(
                f"{operation_name} completed",
                operation=operation_name,
                duration_ms=round(duration * 1000, 2)
            )
        STEP 5: IF duration > SLOW_THRESHOLD:
            logger.warning(
                f"Slow operation detected: {operation_name}",
                duration_ms=round(duration * 1000, 2)
            )

    FUNCTION record_metric(metric_name: str, value: float):
        """Record custom metric"""
        STEP 1: IF metric_name NOT IN self.metrics:
            self.metrics[metric_name] = []
        STEP 2: Append value to metrics list
        STEP 3: Log metric:
            logger.info(f"Metric recorded: {metric_name}", value=value)

    FUNCTION get_statistics(metric_name: str) -> Dict:
        """Get statistics for metric"""
        STEP 1: values = self.metrics.get(metric_name, [])
        STEP 2: IF NOT values:
            RETURN {}
        STEP 3: Calculate statistics:
            RETURN {
                "count": len(values),
                "min": min(values),
                "max": max(values),
                "avg": sum(values) / len(values),
                "median": sorted(values)[len(values) // 2]
            }
```

### Usage Example / Ví Dụ Sử Dụng:

```
tracker = PerformanceTracker()

# Track database query
with tracker.track_operation("fetch_contracts"):
    contracts = db.query(Contract).all()

# Record custom metric
tracker.record_metric("contracts_count", len(contracts))

# Get statistics
stats = tracker.get_statistics("contracts_count")
```

---

## Pattern 8.43: Testing Utilities
## Mẫu 8.43: Tiện Ích Kiểm Tra

**Purpose** / **Mục Đích**: Testing utilities for FastAPI applications

**File**: `src/utils/test_utils.py`

### WORKFLOW (Pseudo-Code):

```
CLASS TestClient (FastAPI TestClient):
    """Enhanced test client with auth support"""

    FUNCTION authenticate(user_id: str, role: str = "user") -> str:
        """Generate test JWT token"""
        STEP 1: Create JWTUtils instance with test secret
        STEP 2: Generate token with user_id and role
        STEP 3: RETURN token

    FUNCTION get_with_auth(url: str, user_id: str = "test_user") -> Response:
        """GET request with authentication"""
        STEP 1: Generate token for user_id
        STEP 2: Add Authorization header
        STEP 3: Make GET request
        STEP 4: RETURN response

    FUNCTION post_with_auth(url: str, json: Dict, user_id: str = "test_user") -> Response:
        """POST request with authentication"""
        STEP 1: Generate token for user_id
        STEP 2: Add Authorization header
        STEP 3: Make POST request with JSON body
        STEP 4: RETURN response

FUNCTION create_test_file(content: bytes, filename: str, mime_type: str) -> UploadFile:
    """Create test upload file"""
    STEP 1: Create BytesIO from content
    STEP 2: Create UploadFile:
        file = UploadFile(
            filename=filename,
            file=BytesIO(content)
        )
    STEP 3: RETURN file
```

---

## Best Practices / Thực Tiễn Tốt Nhất

### 1. Always Validate File Uploads
```
# Check extension, size, and MIME type
is_valid, error = FileValidator.validate_file(file, filename)
```

### 2. Use Structured Logging
```
# Always include context in logs
logger.info("Operation complete", user_id=user_id, duration_ms=duration)
```

### 3. Track Request IDs
```
# Generate unique ID for each request
request_id = str(uuid.uuid4())
request.state.request_id = request_id
```

### 4. Standardized Response Format
```
# Always use HTTPUtils for consistent responses
return HTTPUtils.success_response(data={"result": result})
```

### 5. Monitor Performance
```
# Track slow operations
with tracker.track_operation("database_query"):
    result = db.query().all()
```

---

## Constraints / Ràng Buộc

1. **File Upload**: Max 50MB, PDF/DOCX/XLS only
2. **MIME Detection**: Use python-magic for accurate detection
3. **Logging**: Use structured JSON format for all logs
4. **Response Format**: Always use ResponseFormat for API responses
5. **Request Tracking**: Generate UUID for each request

---

## Testing Requirements / Yêu Cầu Kiểm Tra

1. **File Validation**: Test all file types, sizes, MIME types
2. **HTTP Responses**: Test success, error, validation, pagination responses
3. **Error Handling**: Test ValueError, Exception handling
4. **Logging**: Verify JSON format, context propagation
5. **Performance Tracking**: Test operation timing, slow detection

---

**Lines**: ~750 lines
**Status**: ✅ Compliant (≤800 lines)
**Domain**: Vietnamese Legal AI Platform - HTTP & Logging Utilities
