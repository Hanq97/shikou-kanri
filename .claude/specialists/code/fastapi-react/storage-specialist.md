# FastAPI Storage Specialist

**Role**: SeaweedFS Object Storage Integration (Patterns 6.13-6.20)
**Stack**: FastAPI + SeaweedFS + httpx AsyncClient
**Domain**: Vietnamese Legal Document Storage

---

## Pattern 6.13: Base Storage Provider Interface

### INTERFACE

```python
class BaseStorageProvider(ABC):
    @abstractmethod
    async def upload(file_data: BinaryIO, key: str, content_type?: str, metadata?: Dict) -> str
    @abstractmethod
    async def upload_stream(file_stream: AsyncGenerator[bytes], key: str, ...) -> str
    @abstractmethod
    async def download(key: str) -> bytes
    @abstractmethod
    async def download_stream(key: str) -> AsyncGenerator[bytes]
    @abstractmethod
    async def delete(key: str) -> bool
    @abstractmethod
    async def get_metadata(key: str) -> FileMetadata
    @abstractmethod
    async def update_metadata(key: str, metadata: Dict) -> bool
    @abstractmethod
    async def generate_presigned_url(key: str, expires_in: int = 3600) -> str
    @abstractmethod
    async def health_check() -> bool
```

### DATA_STRUCTURES

```python
@dataclass
class StorageConfig:
    provider: StorageProvider
    base_url: str
    bucket: str
    timeout: int = 60
    max_file_size: int = 5 * 1024 * 1024 * 1024  # 5GB
    chunk_size: int = 5 * 1024 * 1024  # 5MB

@dataclass
class FileMetadata:
    key: str
    size: int
    content_type: str
    created_at: datetime
    updated_at: datetime
    etag?: str
    custom_metadata: Dict[str, str] = {}
```

---

## Pattern 6.14: SeaweedFS Storage Provider

### WORKFLOW

```pseudo
WORKFLOW SeaweedFSProvider {
  CONFIG: { base_url, filer_url, master_url, bucket, replication_factor }

  UPLOAD: {
    logic: "Ensure bucket → PUT to filer → Add X-SeaweedFS-Meta-* headers → Return URL"
    endpoint: "{filer_url}/{bucket}/{key}"
  }

  UPLOAD_STREAM: {
    logic: "Collect async chunks → PUT with Transfer-Encoding: chunked → Return URL"
  }

  DOWNLOAD: {
    logic: "GET from filer → Check 404 → Return bytes"
    endpoint: "{filer_url}/{bucket}/{key}"
  }

  DOWNLOAD_STREAM: {
    logic: "Stream GET → Yield chunks (5MB) → AsyncGenerator"
  }

  DELETE: {
    logic: "DELETE request → Handle 404 → Return success/failure"
  }

  METADATA: {
    logic: "HEAD request → Parse Content-Length, Content-Type, ETag, X-SeaweedFS-Meta-*"
  }

  PRESIGNED_URL: {
    logic: "Generate URL with expiry timestamp → {base_url}{path}?expiry={timestamp}"
  }

  HEALTH_CHECK: {
    logic: "GET {master_url}/status → Timeout 5s → Return health status"
  }
}
```

### KEY_INTERFACES

```python
async def _ensure_bucket(bucket_path: str) -> None  # POST mkdir action
def _validate_sql_safety(sql: str) -> bool
```

### CONSTRAINTS

- SeaweedFS requires volume assignment
- Replication factor affects write performance
- Filer must be running for directory operations
- Max metadata header: ~8KB
- Pre-signed URLs include expiration token

---

## Pattern 6.15: File Upload Handler

### WORKFLOW

```pseudo
WORKFLOW FileUploadHandler {
  INPUT: { file: BinaryIO, key: str, content_type: str, metadata?: Dict, progress_callback?: Callable }

  STEPS: {
    STEP_1_VALIDATE: {
      logic: "Check content_type in allowed list → Check file size ≤ max_file_size"
      allowed: ["pdf", "docx", "xlsx", "jpeg", "png", "mp4", "wav", "txt"]
    }

    STEP_2_VIRUS_SCAN: {
      logic: "Optional ClamAV scan → Reset file pointer"
    }

    STEP_3_STREAM_UPLOAD: {
      logic: "Read chunks → Update progress → Yield to storage provider"
      chunks: "5MB each, track uploaded_size and percentage"
    }

    STEP_4_RETRY: {
      logic: "Exponential backoff (2^n seconds, max 3 retries)"
      transient_errors: ["timeout", "connection_reset", "too_many_requests"]
    }
  }

  OUTPUT: { url: str, progress: UploadProgress }
}
```

### DATA_STRUCTURES

```python
@dataclass
class UploadProgress:
    filename: str
    total_size: int
    uploaded_size: int
    chunks_completed: int
    total_chunks: int
    percentage: float
    status: str  # pending, uploading, completed, failed
```

---

## Pattern 6.16: File Download Handler

### WORKFLOW

```pseudo
WORKFLOW FileDownloadHandler {
  INPUT: { key: str, inline: bool = False, progress_callback?: Callable }

  STEPS: {
    STEP_1_METADATA: {
      logic: "Get file metadata → size, content_type, etag"
    }

    STEP_2_STREAM: {
      logic: "Stream chunks → Calculate progress → Update callback every 500ms"
      throttling: "Optional max_bandwidth (bytes/sec)"
    }

    STEP_3_HEADERS: {
      logic: "Set Content-Disposition (inline|attachment), Content-Type, Content-Length, ETag, Cache-Control"
    }
  }

  OUTPUT: StreamingResponse
}
```

### CONSTRAINTS

- Progress callback must complete < 100ms
- Bandwidth throttling must not block other downloads
- Range request support requires file size

---

## Pattern 6.17: Pre-signed URL Generation

### WORKFLOW

```pseudo
WORKFLOW PresignedURLGenerator {
  INPUT: { file_key: str, method: str = "GET", expires_in: int = 3600, max_usage?: int }

  STEPS: {
    STEP_1_GENERATE_TOKEN: {
      logic: "SHA256(file_key + timestamp + secret_key) → token_id (16 chars)"
    }

    STEP_2_SIGN_TOKEN: {
      logic: "HMAC-SHA256(secret_key, token_id) → signature"
    }

    STEP_3_CREATE_URL: {
      logic: "base_url + &token={token_id}&sig={signature}"
    }

    STEP_4_STORE_METADATA: {
      logic: "Save PresignedURLToken (created_at, expires_at, usage_count, max_usage, revoked)"
    }
  }

  VALIDATION: {
    logic: "Check revocation list → Verify signature → Check expiration → Check usage limit"
  }
}
```

### DATA_STRUCTURES

```python
@dataclass
class PresignedURLToken:
    token_id: str
    file_key: str
    method: str  # GET, PUT, DELETE
    created_at: datetime
    expires_at: datetime
    revoked: bool = False
    usage_count: int = 0
    max_usage?: int
```

### CONSTRAINTS

- Token expiration: server-side enforcement
- Signature: HMAC-SHA256 or stronger
- Token ID: ≥128 bits cryptographically random
- Revocation list: persistent (Redis/Database)

---

## Pattern 6.18: File Metadata Management

### WORKFLOW

```pseudo
WORKFLOW FileMetadataManager {
  INPUT: { file_key: str, metadata: LegalDocumentMetadata }

  STEPS: {
    STEP_1_SERIALIZE: {
      logic: "Convert dataclass → Dict[str, str] → JSON for lists → ISO for datetimes"
    }

    STEP_2_STORE: {
      logic: "Update storage provider metadata (X-SeaweedFS-Meta-* headers)"
      cache: "Store in Redis for fast retrieval"
    }

    STEP_3_QUERY: {
      logic: "Search by case_number, tags, document_type, jurisdiction, parties"
    }

    STEP_4_LINK_EVIDENCE: {
      logic: "Add evidence_file_key to evidence_items list → Update metadata"
    }

    STEP_5_CLEANUP: {
      logic: "Check retention_until → Delete expired metadata"
    }
  }
}
```

### DATA_STRUCTURES

```python
@dataclass
class LegalDocumentMetadata:
    file_key: str
    document_type: DocumentType  # contract, evidence, court_recording, verdict
    author: str
    case_number?: str
    hearing_date?: datetime
    court_name?: str
    tags: List[str] = []
    confidentiality_level: str = "public"  # public, confidential, sealed
    parties: List[str] = []
    evidence_items: List[str] = []
    jurisdiction?: str  # Vietnam, Japan
    language: str = "vi"
    page_count?: int
    duration_seconds?: int  # For recordings
    retention_until?: datetime
```

### OPERATIONS

```python
async def set_metadata(file_key: str, metadata: LegalDocumentMetadata) -> bool
async def get_metadata(file_key: str) -> LegalDocumentMetadata?
async def update_metadata_field(file_key: str, field_name: str, field_value: Any) -> bool
async def add_tag(file_key: str, tag: str) -> bool
async def link_evidence(file_key: str, evidence_file_key: str) -> bool
async def search_by_case_number(case_number: str) -> List[LegalDocumentMetadata]
async def cleanup_expired() -> int
```

---

## Pattern 6.19: Storage Health Check

### WORKFLOW

```pseudo
WORKFLOW StorageHealthChecker {
  CONFIG: { check_interval: 30s, history_limit: 100 }

  MONITORING: {
    logic: "Every 30s → health_check() → Record result → Maintain history (100 entries)"
  }

  CHECK: {
    logic: "GET {master_url}/status (timeout 5s) → Measure response_time_ms → Classify health"
    classification: {
      "response_time < 5s AND success": HEALTHY,
      "response_time > 5s": DEGRADED,
      "failure": UNHEALTHY
    }
  }

  METRICS: {
    logic: "Calculate uptime_percentage (last 24h) → Track status changes → Alert on degradation"
  }
}
```

### DATA_STRUCTURES

```python
@dataclass
class HealthCheckResult:
    provider_name: str
    status: HealthStatus  # HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN
    timestamp: datetime
    response_time_ms: float
    errors: List[str] = []
    metrics: Dict[str, Any] = {}
```

### OPERATIONS

```python
async def start_monitoring() -> None  # Background task
async def stop_monitoring() -> None
async def check_health() -> HealthCheckResult
async def get_health_status() -> HealthCheckResult?
async def get_uptime_percentage(hours: int = 24) -> float
```

---

## Pattern 6.20: Storage Error Handling

### WORKFLOW

```pseudo
WORKFLOW StorageErrorHandler {
  CONFIG: { max_retries: 3, base_backoff: 1.0, max_backoff: 32.0 }

  CLASSIFICATION: {
    transient: ["timeout", "connection_reset", "too_many_requests", "service_unavailable"]
    permanent: ["access_denied", "invalid_key", "not_found", "invalid_credentials"]
  }

  RETRY_OPERATION: {
    logic: "Try operation → Classify error → Retry if transient → Exponential backoff (2^n + jitter)"
    max_attempts: 3
  }

  FALLBACK: {
    logic: "Try primary_operation → On error → Try fallback_operation → On error → Raise both errors"
  }

  METRICS: {
    logic: "Record error_type, severity, count, first_occurrence, last_occurrence, messages (last 10)"
  }
}
```

### OPERATIONS

```python
async def retry_operation(operation: Callable, *args, **kwargs) -> T
async def with_fallback(primary_op: Callable, fallback_op: Callable, *args) -> T
def _classify_error(error_message: str) -> ErrorType  # TRANSIENT, PERMANENT, UNKNOWN
def _calculate_backoff(attempt: int) -> float  # 2^n + random jitter
def record_error(error_type: str, message: str, severity: ErrorSeverity) -> None
def get_error_summary() -> Dict
```

---

## Integration Example

```python
from fastapi import FastAPI, UploadFile, File
from src.integrations.storage.seaweedfs import SeaweedFSProvider
from src.integrations.storage.handlers import FileUploadHandler, FileDownloadHandler
from src.integrations.storage.metadata import FileMetadataManager, LegalDocumentMetadata
from src.integrations.storage.health import StorageHealthChecker
from src.integrations.storage.errors import StorageErrorHandler

app = FastAPI()

# Initialize
storage_provider = SeaweedFSProvider()
upload_handler = FileUploadHandler(storage_provider)
download_handler = FileDownloadHandler(storage_provider)
metadata_manager = FileMetadataManager(storage_provider)
error_handler = StorageErrorHandler()
health_checker = StorageHealthChecker(storage_provider)

@app.post("/legal-documents/upload")
async def upload_legal_document(
    file: UploadFile = File(...),
    case_number?: str = None,
    document_type: str = "contract"
):
    # Upload with retry
    url = await error_handler.retry_operation(
        upload_handler.upload_file,
        await file.read(),
        file.filename,
        file.content_type,
        metadata={"case_number": case_number}
    )

    # Store metadata
    metadata = LegalDocumentMetadata(
        file_key=file.filename,
        document_type=DocumentType(document_type),
        author="user123",
        case_number=case_number,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    await metadata_manager.set_metadata(file.filename, metadata)

    return {"url": url, "filename": file.filename}

@app.get("/legal-documents/{file_key}/download")
async def download_legal_document(file_key: str):
    return await error_handler.retry_operation(
        download_handler.download_file,
        file_key,
        inline=False
    )

@app.get("/health/storage")
async def get_storage_health():
    result = await health_checker.check_health()
    return {
        "provider": result.provider_name,
        "status": result.status.value,
        "response_time_ms": result.response_time_ms
    }
```

---

## Pattern Summary

**8 Core Patterns**:
1. **Base Storage Provider** - Abstract interface for any storage backend
2. **SeaweedFS Provider** - S3-compatible implementation with filer operations
3. **File Upload Handler** - Streaming uploads with progress, retry, virus scanning
4. **File Download Handler** - Streaming downloads with bandwidth throttling
5. **Pre-signed URL Generation** - Secure temporary access tokens with revocation
6. **File Metadata Management** - Legal document metadata with case linking
7. **Storage Health Check** - Continuous monitoring with uptime tracking
8. **Storage Error Handling** - Retry strategies with error classification

**Vietnamese Legal Use Cases**:
- Contract storage with case number tracking
- Evidence file management with linking
- Court recording storage with duration metadata
- Document authenticity tracking
- Multi-party document access control
- Retention policy enforcement

---

## Implementation Checklist

- [ ] BaseStorageProvider abstract interface
- [ ] SeaweedFS S3-compatible provider
- [ ] Async/await throughout
- [ ] Type hints on all functions
- [ ] Dataclass for domain models
- [ ] Streaming uploads/downloads
- [ ] Progress tracking callbacks
- [ ] Virus scanning hooks
- [ ] Pre-signed URL generation
- [ ] Token-based access control
- [ ] Metadata management (Vietnamese legal)
- [ ] Health check monitoring
- [ ] Error retry with exponential backoff
- [ ] Fallback strategies
- [ ] Comprehensive logging
- [ ] Max file size enforcement (5GB)
- [ ] Chunk size optimization (5MB)
- [ ] Vietnamese UTF-8 support

---

*Storage Specialist v1.0*
*Patterns 6.13-6.20 for SeaweedFS Integration*
*Created: 2026-01-01*
