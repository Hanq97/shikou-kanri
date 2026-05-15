# File Handling Specialist — Generic
# ファイル処理スペシャリスト — 汎用
# Chuyên Gia Xử Lý File — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 87.1–87.5 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `*StorageService.java`, `*StorageAdapter.java` |
| **Base Class** | N/A |
| **Imports From** | Application (interfaces) |
| **Cannot Import** | Presentation |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
File upload/download, storage abstraction, validation, and large file handling patterns.

## Patterns

### Pattern 87.1: Multipart Upload
```java
// Blocking (Spring MVC)
@PostMapping(value = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<FileDTO> upload(@RequestPart("file") MultipartFile file) {
    validateFile(file);
    String key = storageService.store(file.getInputStream(), file.getOriginalFilename());
    return ResponseEntity.created(URI.create("/files/" + key)).body(new FileDTO(key));
}

// Reactive (WebFlux)
@PostMapping(value = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public Mono<FileDTO> upload(@RequestPart("file") FilePart filePart) {
    return storageService.store(filePart)
        .map(key -> new FileDTO(key));
}
```
- Configure limits: `spring.servlet.multipart.max-file-size=10MB`
- `spring.servlet.multipart.max-request-size=10MB`

### Pattern 87.2: File Download with Streaming
```java
@GetMapping("/files/{key}")
public ResponseEntity<StreamingResponseBody> download(@PathVariable String key) {
    FileMetadata meta = storageService.getMetadata(key);
    StreamingResponseBody body = outputStream -> storageService.streamTo(key, outputStream);

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(meta.contentType()))
        .contentLength(meta.size())
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + meta.filename() + "\"")
        .body(body);
}
```
- `StreamingResponseBody` for large files — avoids loading entire file in memory
- `ResourceRegion` for HTTP range requests (video streaming, resume download)

### Pattern 87.3: Storage Abstraction
```java
// Port — in application layer
public interface StorageService {
    String store(InputStream input, String filename);
    void streamTo(String key, OutputStream output);
    FileMetadata getMetadata(String key);
    void delete(String key);
}

// Adapter — local filesystem
@Component
@ConditionalOnProperty(name = "storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageAdapter implements StorageService { ... }

// Adapter — S3/MinIO
@Component
@ConditionalOnProperty(name = "storage.type", havingValue = "s3")
public class S3StorageAdapter implements StorageService { ... }
```
- Switch storage backend via configuration — no code changes
- Same interface for local dev and cloud production

### Pattern 87.4: File Validation
```java
private void validateFile(MultipartFile file) {
    // 1. Size limit
    if (file.getSize() > MAX_FILE_SIZE) throw new FileTooLargeException(MAX_FILE_SIZE);

    // 2. MIME type by magic bytes (NOT extension — can be spoofed)
    String detectedType = tika.detect(file.getInputStream());
    if (!ALLOWED_TYPES.contains(detectedType)) throw new InvalidFileTypeException(detectedType);

    // 3. Filename sanitization
    String safeName = file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
}

private static final Set<String> ALLOWED_TYPES = Set.of(
    "image/jpeg", "image/png", "application/pdf", "text/csv"
);
```
- NEVER trust file extension — use Apache Tika or magic bytes for MIME detection
- Sanitize filenames to prevent path traversal (`../../etc/passwd`)

### Pattern 87.5: Large File Handling
```java
// Chunked upload endpoint
@PostMapping("/files/chunk")
public ResponseEntity<Void> uploadChunk(
    @RequestParam String uploadId,
    @RequestParam int chunkIndex,
    @RequestParam int totalChunks,
    @RequestPart("chunk") MultipartFile chunk) {

    storageService.storeChunk(uploadId, chunkIndex, chunk.getInputStream());

    if (chunkIndex == totalChunks - 1) {
        storageService.assembleChunks(uploadId, totalChunks);
    }
    return ResponseEntity.ok().build();
}
```
- Chunked upload for files >100MB — client splits, server assembles
- Stream processing: never `file.getBytes()` on large files → OOM
- Consider tus protocol for resumable uploads

## REJECTED Patterns
- ❌ `file.getBytes()` for large files — loads entire file in memory
- ❌ Trusting file extension for type validation
- ❌ Storing files in database BLOBs (except metadata)
- ❌ Unsanitized filenames in storage paths
- ❌ No size limits on upload endpoints

## Related Specialists
- `cloud/aws-specialist.md` — S3 integration (38.x)
- `language/java-design-patterns-specialist.md` — Adapter pattern for storage (63.7)
