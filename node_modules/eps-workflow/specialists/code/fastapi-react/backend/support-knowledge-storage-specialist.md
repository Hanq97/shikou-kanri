# Support Knowledge & Storage Specialist
# サポートナレッジ&ストレージ スペシャリスト
# Chuyên Gia Knowledge & Storage

**Role**: Knowledge Base & Storage Pattern Expert
**Focus**: Knowledge indexing, RAG, storage, health monitoring
**Patterns**: 3.7-3.12, 3.15 (7 patterns)
**Technology**: Qdrant, MinIO/S3, Embeddings
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST SupportKnowledgeStorage {
  ROLE: "Knowledge Base Indexing and File Storage Expert"

  RESPONSIBILITIES: [
    "Document indexing with chunking and embedding generation",
    "Semantic search with metadata filtering",
    "Index synchronization and consistency",
    "File upload with validation (S3/MinIO)",
    "Presigned URL generation for secure access",
    "Storage lifecycle and cleanup",
    "Document metadata management"
  ]

  TECH_STACK: {
    primary: "FastAPI + Python 3.11",
    storage: ["Qdrant (vectors)", "MinIO/S3 (files)"],
    libraries: ["sentence-transformers", "boto3", "pydantic"],
    patterns: ["Repository pattern", "Service layer", "Async I/O"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Document", "KnowledgeBase", "File", "Storage"]
  }
}
```

---

## Pattern 3.7: Document Indexing Pipeline

### Overview

```pseudo
PATTERN DocumentIndexing {
  PURPOSE: "Index documents with chunking, embedding, and metadata"
  PROBLEM: "Need efficient document indexing with chunking and vector generation"
  SOLUTION: "Multi-stage pipeline: chunk → embed → store in Qdrant"
  USE_CASES: ["Index legal contracts for semantic search", "Update knowledge base with new documents", "Re-index documents after content changes"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW DocumentIndexing_Workflow {
  INPUT: { document_id: string, content: string, metadata: dict }

  STEPS: {
    STEP_1_CHUNK_AND_EMBED: {
      description: "Split document into chunks and generate embeddings"
      logic: |
        chunks = TextSplitter.split(content, chunk_size=512, chunk_overlap=50)
        chunk_texts = [chunk.text FOR chunk IN chunks]
        embeddings = AWAIT EmbeddingService.embed_batch(chunk_texts)
    }

    STEP_2_BUILD_AND_UPSERT: {
      description: "Build Qdrant points and store"
      logic: |
        points = []
        FOR idx, (chunk, embedding) IN ENUMERATE(ZIP(chunks, embeddings)):
          point = {
            id: document_id + "_" + idx,
            vector: embedding.tolist(),
            payload: {
              document_id: document_id, chunk_index: idx, text: chunk.text,
              start_char: chunk.start, end_char: chunk.end, ...metadata
            }
          }
          points.APPEND(point)
        END FOR

        AWAIT Qdrant.upsert(collection="knowledge_base", points=points)
        RETURN { success: true, chunks_indexed: points.length, document_id: document_id }
    }
  }

  ERROR_HANDLING: "ChunkingError: Log error, return partial results | EmbeddingError: Retry with exponential backoff (max 3 attempts) | QdrantError: Rollback any partial inserts, return error"
  OUTPUT: { success: boolean, chunks_indexed: integer, document_id: string, error?: string }
}
```

### Key Interfaces

```typescript
interface ChunkResult {
  text: string;
  start: number;
  end: number;
}

interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    document_id: string;
    chunk_index: number;
    text: string;
    start_char: number;
    end_char: number;
    [key: string]: any;
  };
}

async function indexDocument(documentId: string, content: string, metadata: Record<string, any>): Promise<number>;
async function deleteDocument(documentId: string): Promise<void>;
```

---

## Pattern 3.8: Semantic Search with Filters

### Overview

```pseudo
PATTERN SemanticSearch {
  PURPOSE: "Search knowledge base with vector similarity and metadata filters"
  PROBLEM: "Need semantic search with relevance ranking and filtering"
  SOLUTION: "Generate query embedding, search Qdrant with filters"
  USE_CASES: ["Find similar legal clauses", "Search contracts by criteria", "RAG context retrieval"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW SemanticSearch_Workflow {
  INPUT: { query: string, limit: integer = 10, filters?: dict, min_score: float = 0.7 }

  STEPS: {
    STEP_1_EMBED_AND_FILTER: {
      description: "Generate query embedding and build Qdrant filter"
      logic: |
        query_embedding = AWAIT EmbeddingService.embed(query)

        IF filters IS NOT NULL THEN
          conditions = []
          FOR key, value IN filters.items():
            conditions.APPEND({ key: key, match: { value: value } })
          END FOR
          qdrant_filter = { must: conditions }
        ELSE
          qdrant_filter = NULL
        END IF
    }

    STEP_2_SEARCH_AND_PARSE: {
      description: "Search Qdrant and parse results"
      logic: |
        results = AWAIT Qdrant.search(
          collection="knowledge_base",
          query_vector=query_embedding.tolist(),
          limit=limit,
          filter=qdrant_filter,
          score_threshold=min_score
        )

        search_results = []
        FOR r IN results:
          result = {
            document_id: r.payload.document_id,
            text: r.payload.text,
            score: r.score,
            metadata: FILTER_PAYLOAD(r.payload)
          }
          search_results.APPEND(result)
        END FOR

        RETURN { success: true, results: search_results, count: search_results.length }
    }
  }

  OUTPUT: { success: boolean, results: SearchResult[], count: integer }
}

FUNCTION FILTER_PAYLOAD(payload) {
  excluded_fields = ["text", "chunk_index", "start_char", "end_char"]
  metadata = {}
  FOR key, value IN payload.items():
    IF key NOT IN excluded_fields THEN metadata[key] = value
  END FOR
  RETURN metadata
}
```

### Key Interfaces

```typescript
interface SearchQuery {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
  min_score?: number;
}

interface SearchResult {
  document_id: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
}

async function search(query: SearchQuery): Promise<SearchResult[]>;
```

---

## Pattern 3.9: Index Synchronization

### Overview

```pseudo
PATTERN IndexSynchronization {
  PURPOSE: "Keep vector index in sync with source data"
  PROBLEM: "Detect and fix inconsistencies between source and index"
  SOLUTION: "Compare source documents with indexed documents, sync differences"
  USE_CASES: ["Scheduled sync jobs", "Post-migration validation", "Disaster recovery"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW IndexSync_Workflow {
  INPUT: { source_documents: list[dict] }

  STEPS: {
    STEP_1_GET_INDEXED_AND_SYNC: {
      description: "Get all indexed document IDs and process source documents"
      logic: |
        results = AWAIT Qdrant.scroll(collection="knowledge_base", limit=1000)
        indexed_ids = SET([r.payload.document_id FOR r IN results])

        stats = { added: 0, updated: 0, deleted: 0, errors: 0 }
        source_ids = SET()

        FOR doc IN source_documents:
          source_ids.ADD(doc.id)
          TRY:
            IF doc.id IN indexed_ids THEN
              IF NEEDS_UPDATE(doc) THEN
                AWAIT DELETE_DOCUMENT(doc.id)
                AWAIT INDEX_DOCUMENT(doc.id, doc.content, doc.metadata)
                stats.updated += 1
              END IF
            ELSE
              AWAIT INDEX_DOCUMENT(doc.id, doc.content, doc.metadata)
              stats.added += 1
            END IF
          CATCH error:
            LOG_ERROR("Error syncing document: " + doc.id)
            stats.errors += 1
          END TRY
        END FOR
    }

    STEP_2_CLEANUP: {
      description: "Delete orphaned entries"
      logic: |
        orphaned_ids = indexed_ids - source_ids
        FOR doc_id IN orphaned_ids:
          TRY:
            AWAIT DELETE_DOCUMENT(doc_id)
            stats.deleted += 1
          CATCH error:
            LOG_ERROR("Error deleting document: " + doc_id)
            stats.errors += 1
          END TRY
        END FOR

        RETURN { success: true, statistics: stats }
    }
  }

  OUTPUT: { success: boolean, statistics: { added: integer, updated: integer, deleted: integer, errors: integer } }
}
```

---

## Pattern 3.10: File Upload with Validation

### Overview

```pseudo
PATTERN FileUpload {
  PURPOSE: "Secure file upload with validation and metadata"
  PROBLEM: "Need to validate files before uploading to S3/MinIO"
  SOLUTION: "Multi-stage validation → organized key structure → S3 upload"
  USE_CASES: ["Upload legal documents", "Store evidence files", "Attach images to cases"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW FileUpload_Workflow {
  INPUT: { file: BinaryIO, filename: string, content_type: string, user_id: string }

  STEPS: {
    STEP_1_VALIDATE: {
      description: "Check file size and content type"
      logic: |
        file.SEEK(0, SEEK_END)
        file_size = file.TELL()
        file.SEEK(0, SEEK_START)

        MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
        IF file_size > MAX_FILE_SIZE THEN THROW ERROR "File too large: " + file_size + " bytes"

        ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"]
        IF content_type NOT IN ALLOWED_TYPES THEN THROW ERROR "Invalid content type: " + content_type
    }

    STEP_2_UPLOAD: {
      description: "Generate S3 key and upload"
      logic: |
        timestamp = NOW().format("YYYYMMDD_HHMMSS")
        object_key = "uploads/" + user_id + "/" + timestamp + "_" + filename

        AWAIT S3Client.put_object(
          Bucket=bucket_name, Key=object_key, Body=file, ContentType=content_type,
          Metadata={ user_id: user_id, original_filename: filename, upload_timestamp: timestamp }
        )

        RETURN {
          success: true, object_key: object_key, size: file_size,
          content_type: content_type, url: "s3://" + bucket_name + "/" + object_key
        }
    }
  }

  ERROR_HANDLING: "ValidationError: Return error with validation details | S3Error: Retry with exponential backoff (max 3 attempts) | QuotaError: Return quota exceeded error"
  OUTPUT: { success: boolean, object_key?: string, size?: integer, content_type?: string, url?: string, error?: string }
}
```

### Key Interfaces

```typescript
interface UploadRequest {
  file: File | Blob;
  filename: string;
  content_type: string;
  user_id: string;
}

interface UploadResult {
  object_key: string;
  size: number;
  content_type: string;
  url: string;
}

async function uploadFile(request: UploadRequest): Promise<UploadResult>;
```

---

## Pattern 3.11: Presigned URL Generation

### Overview

```pseudo
PATTERN PresignedURLs {
  PURPOSE: "Generate temporary, secure URLs for file access"
  PROBLEM: "Need secure file access without exposing credentials"
  SOLUTION: "Generate presigned URLs with expiration"
  USE_CASES: ["Download legal documents", "Share files with clients", "Direct upload from browser"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW GenerateDownloadURL_Workflow {
  INPUT: { object_key: string, expiration: integer = 3600 }

  STEPS: {
    STEP_1_VALIDATE_AND_GENERATE: {
      description: "Validate object exists and generate presigned URL"
      logic: |
        exists = AWAIT S3Client.head_object(Bucket=bucket_name, Key=object_key)
        IF NOT exists THEN THROW ERROR "Object not found: " + object_key

        url = AWAIT S3Client.generate_presigned_url(
          ClientMethod='get_object',
          Params={ Bucket: bucket_name, Key: object_key },
          ExpiresIn=expiration
        )

        RETURN { success: true, url: url, expires_in: expiration }
    }
  }

  OUTPUT: { success: boolean, url?: string, expires_in?: integer, error?: string }
}

WORKFLOW GenerateUploadURL_Workflow {
  INPUT: { object_key: string, content_type: string, expiration: integer = 3600 }

  STEPS: {
    STEP_1_GENERATE: {
      description: "Generate presigned upload URL"
      logic: |
        url = AWAIT S3Client.generate_presigned_url(
          ClientMethod='put_object',
          Params={ Bucket: bucket_name, Key: object_key, ContentType: content_type },
          ExpiresIn=expiration
        )

        RETURN {
          success: true, url: url, method: "PUT",
          headers: { "Content-Type": content_type }, expires_in: expiration
        }
    }
  }

  OUTPUT: { success: boolean, url?: string, method?: string, headers?: dict, expires_in?: integer }
}
```

---

## Pattern 3.12: Storage Cleanup

### Overview

```pseudo
PATTERN StorageCleanup {
  PURPOSE: "Automatic cleanup of temporary and orphaned files"
  PROBLEM: "Need to remove old files and free up storage"
  SOLUTION: "Age-based and user-based deletion with batch processing"
  USE_CASES: ["Delete files older than 30 days", "Remove user files on account deletion", "Clean temporary upload folders"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW CleanupExpiredFiles_Workflow {
  INPUT: { prefix: string = "uploads/", max_age_days: integer = 30 }

  STEPS: {
    STEP_1_LIST_AND_DELETE: {
      description: "Calculate cutoff date and delete old objects"
      logic: |
        cutoff_date = NOW() - DAYS(max_age_days)
        deleted_count = 0
        paginator = S3Client.get_paginator('list_objects_v2')

        FOR EACH page IN paginator.paginate(Bucket=bucket_name, Prefix=prefix):
          IF 'Contents' NOT IN page THEN CONTINUE

          FOR obj IN page.Contents:
            IF obj.LastModified < cutoff_date THEN
              AWAIT S3Client.delete_object(Bucket=bucket_name, Key=obj.Key)
              deleted_count += 1
            END IF
          END FOR
        END FOR

        RETURN { success: true, deleted_count: deleted_count }
    }
  }

  OUTPUT: { success: boolean, deleted_count: integer }
}

WORKFLOW DeleteUserFiles_Workflow {
  INPUT: { user_id: string }

  STEPS: {
    STEP_1_LIST_AND_BATCH_DELETE: {
      description: "List user files and batch delete"
      logic: |
        prefix = "uploads/" + user_id + "/"
        deleted_count = 0
        paginator = S3Client.get_paginator('list_objects_v2')

        FOR EACH page IN paginator.paginate(Bucket=bucket_name, Prefix=prefix):
          IF 'Contents' NOT IN page THEN CONTINUE

          objects = [{ Key: obj.Key } FOR obj IN page.Contents]
          IF objects.length > 0 THEN
            AWAIT S3Client.delete_objects(Bucket=bucket_name, Delete={ Objects: objects })
            deleted_count += objects.length
          END IF
        END FOR

        RETURN { success: true, deleted_count: deleted_count }
    }
  }

  OUTPUT: { success: boolean, deleted_count: integer }
}
```

---

## Pattern 3.15: Document Metadata Management

### Overview

```pseudo
PATTERN DocumentMetadata {
  PURPOSE: "Efficient metadata storage and querying"
  PROBLEM: "Need to update and query document metadata"
  SOLUTION: "Use Qdrant payload operations for metadata"
  USE_CASES: ["Update document tags", "Filter by document type", "Query by date range"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW UpdateMetadata_Workflow {
  INPUT: { document_id: string, metadata: dict }

  STEPS: {
    STEP_1_UPDATE: {
      description: "Update all chunks for document"
      logic: |
        AWAIT Qdrant.set_payload(
          collection="knowledge_base",
          payload=metadata,
          filter={ must: [{ key: "document_id", match: { value: document_id } }] }
        )
        RETURN { success: true }
    }
  }

  OUTPUT: { success: boolean }
}

WORKFLOW GetMetadata_Workflow {
  INPUT: { document_id: string }

  STEPS: {
    STEP_1_QUERY_AND_FILTER: {
      description: "Get first chunk metadata and filter internal fields"
      logic: |
        results = AWAIT Qdrant.scroll(
          collection="knowledge_base",
          filter={ must: [{ key: "document_id", match: { value: document_id } }] },
          limit=1, with_payload=true, with_vectors=false
        )

        IF results.length == 0 THEN RETURN { success: false, error: "Document not found" }

        payload = results[0].payload
        excluded = ["text", "chunk_index", "start_char", "end_char"]
        metadata = {}
        FOR key, value IN payload.items():
          IF key NOT IN excluded THEN metadata[key] = value
        END FOR

        RETURN { success: true, metadata: metadata }
    }
  }

  OUTPUT: { success: boolean, metadata?: dict, error?: string }
}

WORKFLOW FilterByMetadata_Workflow {
  INPUT: { filters: dict, limit: integer = 100 }

  STEPS: {
    STEP_1_BUILD_AND_QUERY: {
      description: "Build Qdrant filter and query with deduplication"
      logic: |
        conditions = []
        FOR key, value IN filters.items():
          conditions.APPEND({ key: key, match: { value: value } })
        END FOR
        qdrant_filter = { must: conditions }

        results = AWAIT Qdrant.scroll(
          collection="knowledge_base",
          filter=qdrant_filter,
          limit=limit,
          with_payload=["document_id"],
          with_vectors=false
        )

        document_ids = SET([r.payload.document_id FOR r IN results])
        unique_ids = LIST(document_ids)

        RETURN { success: true, document_ids: unique_ids, count: unique_ids.length }
    }
  }

  OUTPUT: { success: boolean, document_ids: string[], count: integer }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    Document: { types: ["contract", "evidence", "court_filing", "legal_memo"], vietnamese_term: "Tài Liệu Pháp Lý" },
    KnowledgeBase: { purpose: "Legal clause search and contract analysis", vietnamese_term: "Cơ Sở Tri Thức" },
    File: { formats: ["PDF", "DOCX", "JPEG", "PNG"], vietnamese_term: "Tệp Tin" }
  }
  BUSINESS_RULES: {
    retention: "Legal documents retained for 10 years minimum",
    encryption: "All files encrypted at rest (S3 server-side encryption)",
    access_control: "Role-based access with audit logging"
  }
}
```

---

## Pattern Summary

```pseudo
PATTERN_SUMMARY = {
  total_patterns: 7,
  categories: { knowledge_indexing: ["3.7", "3.8", "3.9", "3.15"], file_storage: ["3.10", "3.11", "3.12"] },
  performance_targets: { indexing: "< 5 seconds per document (avg 500 tokens)", search: "< 200ms for semantic search", upload: "< 2 seconds for 10MB file" }
}
```

---

## Testing Guidelines

```pseudo
TESTING KnowledgeStorage_Tests {
  UNIT_TESTS: [
    { name: "should chunk document correctly", input: { content: "..." }, expected: { chunks: 10, overlap: 50 } },
    { name: "should generate presigned URL", input: { object_key: "test.pdf" }, expected: { url: "https://...", expires_in: 3600 } }
  ]
  INTEGRATION_TESTS: ["Index document end-to-end", "Search with filters", "Upload file and generate download URL"]
}
```

---

## References

- **Qdrant Docs**: https://qdrant.tech/documentation/
- **AWS S3 SDK**: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html
- **Internal Docs**: `/docs/architecture/knowledge-base.md`

---

**Version**: 1.0
**Created**: 2026-01-03
**Patterns**: 3.7-3.12, 3.15 (7 patterns)
**Lines**: ~640 target
