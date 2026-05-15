# INDEX: Support Services Specialists

**Navigation**: FastAPI Backend Support & Infrastructure Services
**Total Specialists**: 2
**Pattern Range**: 3.1-3.15
**Location**: `specialists/code/fastapi-react/backend/`

---

## Specialists Overview

### 1. Session & Cache Management
**File**: `backend/support-session-cache-specialist.md`
**Lines**: 565
**Patterns**: 3.1-3.6

**Capabilities**:
- Pattern 3.1: Redis session management với JWT tokens
- Pattern 3.2: Cache invalidation strategies (TTL, tags, patterns)
- Pattern 3.3: Distributed caching với Redis Cluster
- Pattern 3.4: Session persistence & recovery mechanisms
- Pattern 3.5: Cache warming & preloading strategies
- Pattern 3.6: Multi-level caching (L1: Memory, L2: Redis)

**Key Services**:
- SessionService: JWT session lifecycle quản lý
- CacheService: Redis cache operations với namespacing
- DistributedLockService: Phân tán locking với Redis
- CacheWarmerService: Pre-population strategies

---

### 2. Knowledge Base & Storage
**File**: `backend/support-knowledge-storage-specialist.md`
**Lines**: 680
**Patterns**: 3.7-3.15

**Capabilities**:
- Pattern 3.7: Document versioning & history tracking
- Pattern 3.8: Multi-tenant knowledge isolation
- Pattern 3.9: Full-text search với PostgreSQL FTS
- Pattern 3.10: Metadata extraction & indexing
- Pattern 3.11: Document classification & tagging
- Pattern 3.12: Knowledge graph construction
- Pattern 3.13: Semantic search integration
- Pattern 3.14: Content deduplication strategies
- Pattern 3.15: Archive & retention policies

**Key Services**:
- KnowledgeStorageService: Document lifecycle quản lý
- VersionControlService: Git-like versioning cho documents
- SearchService: Hybrid search (keyword + semantic)
- MetadataExtractorService: Automated metadata population
- TaxonomyService: Category & tag management

---

## Integration Patterns

### Cross-Service Communication
```python
# Session-aware knowledge access
WORKFLOW:
1. SessionService.validate_token() → User context
2. KnowledgeStorageService.get_documents(user_id, tenant_id)
3. CacheService.get_or_set(cache_key, fetcher)
4. Return cached/fresh documents
```

### Multi-Tenant Isolation
```python
# Tenant-aware caching
WORKFLOW:
1. Extract tenant_id từ session
2. Generate tenant-scoped cache key
3. Apply tenant-level cache policies
4. Ensure cross-tenant isolation
```

---

## Vietnamese Domain Context

### Session Management
- **Phiên làm việc**: User sessions với JWT tokens
- **Bộ nhớ đệm**: Redis caching layers
- **Khóa phân tán**: Distributed locks cho critical operations
- **Làm mới phiên**: Session refresh & renewal

### Knowledge Storage
- **Kho tri thức**: Centralized knowledge repository
- **Phiên bản tài liệu**: Document version control
- **Tìm kiếm ngữ nghĩa**: Semantic search capabilities
- **Phân loại nội dung**: Automated content classification

---

## Usage Examples

### Example 1: Cached Knowledge Retrieval
```python
WORKFLOW:
1. User requests document list
2. SessionService validates JWT token
3. Extract user_id, tenant_id từ session
4. Generate cache_key = f"docs:{tenant_id}:{user_id}:{filters}"
5. CacheService.get(cache_key)
6. IF cache miss:
   - KnowledgeStorageService.query_documents()
   - CacheService.set(cache_key, results, ttl=300)
7. Return documents
```

### Example 2: Session-Aware Search
```python
WORKFLOW:
1. User submits search query
2. SessionService.get_current_user()
3. SearchService.hybrid_search(query, user_context)
4. Apply tenant isolation filters
5. Cache results với user-specific key
6. Return ranked results
```

---

## Pattern Distribution

### Session & Cache (3.1-3.6)
- Redis-based session store
- Multi-level caching strategies
- Distributed locking mechanisms
- Cache invalidation patterns
- Session persistence & recovery
- Performance optimization

### Knowledge & Storage (3.7-3.15)
- Document lifecycle management
- Version control systems
- Full-text + semantic search
- Metadata extraction pipelines
- Content classification
- Knowledge graph construction
- Multi-tenant isolation
- Archive & retention
- Deduplication strategies

---

## Related Specialists

**Core Services**:
- `core-services-specialist.md` - Health checks, metrics, logging
- `core-validation-specialist.md` - Input validation for documents

**LLM Integration**:
- `backend/llm-vlm-specialist.md` - Embeddings cho semantic search
- `embeddings-providers-specialist.md` - Vector generation

**Data Access**:
- `fastapi-postgres-repository.md` - Document persistence
- `fastapi-redis-uow.md` - Cache unit of work

---

## Migration Notes

**From**: `support-services-specialist.md` (1,291 lines)
**To**: 2 optimized specialists (1,245 lines total)
**Reduction**: 46 lines (-3.6%)
**Compliance**: 100% (all files ≤800 lines)

**Refactoring Date**: 2026-01-03
**Backup Location**: `.backups/group_5_batch2_20260103_002722/`

---

*Navigation Index for FastAPI Support Services Specialists*
*EPS Framework v3.0 - Pseudo-code WORKFLOW format*
