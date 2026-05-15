# Embeddings Specialists INDEX

**Category**: Embeddings (Text + Image Embeddings, Batch Processing, Health Monitoring)
**Total Files**: 2
**Total Lines**: ~1,445 (771 + 674)
**Compliance**: 100% (all ≤800 lines)
**Last Updated**: 2026-01-02

---

## File Structure

### 1. embeddings-providers-specialist.md (771 lines)
**Purpose**: Base embeddings interface and provider implementations

**Patterns**:
- Pattern 6.21: Base Embeddings Provider Interface
- Pattern 6.22: BGE-M3 Text Embeddings Provider
- Pattern 6.23: CLIP Image Embeddings Provider

**Key Features**:
- Abstract base embeddings interface (BaseEmbeddingsProvider)
- BGE-M3 for Vietnamese text (1024-dim multilingual embeddings)
- CLIP for document images (512-dim image embeddings)
- Vector normalization and similarity computation
- Caching with MD5 keys (text) and FIFO eviction (images)
- Vietnamese text preprocessing

**Domain**:
- Legal contract similarity search
- Document classification
- Semantic search in Vietnamese
- Document image retrieval

---

### 2. embeddings-batch-specialist.md (674 lines)
**Purpose**: Batch processing and health monitoring

**Patterns**:
- Pattern 6.24: Batch Embeddings Processing
- Pattern 6.25: Embeddings Health Monitoring

**Key Features**:
- Efficient batch job queuing and execution
- Concurrent batch processing with semaphore control (max 4 concurrent)
- Progress tracking with callbacks
- Checkpoint-based recovery
- Per-item retry logic (exponential backoff, max 3 retries)
- Health monitoring with quality verification
- Automatic failover to degraded/backup providers
- Uptime percentage calculation

**Domain**:
- Bulk document embedding (thousands of legal documents)
- Mixed text and image batches
- Progress tracking for UI updates
- Provider health monitoring

---

## Usage Patterns

### Vietnamese Legal Contract Similarity (BGE-M3)
```python
from embeddings_providers_specialist import BGEM3Provider

# Initialize provider
text_provider = BGEM3Provider()

# Check health
if not await text_provider.health_check():
    raise RuntimeError("BGE-M3 provider unavailable")

# Embed query text
query_embedding = await text_provider.embed_text(contract_text)

# Batch embed documents
documents_result = await text_provider.embed_texts(document_texts)

# Calculate similarity
for i, doc_embedding in enumerate(documents_result.embeddings):
    similarity = query_embedding.get_similarity(doc_embedding)
```

### Document Image Retrieval (CLIP)
```python
from embeddings_providers_specialist import CLIPProvider

# Initialize provider
image_provider = CLIPProvider()

# Embed query text (for text-image matching)
query_embedding = await image_provider.embed_text(query_text)

# Batch embed document images
image_result = await image_provider.embed_images(document_images)

# Find similar images
similarities = []
for i, img_embedding in enumerate(image_result.embeddings):
    similarity = query_embedding.get_similarity(img_embedding)
    similarities.append({"index": i, "score": similarity})
```

### Bulk Document Embedding with Progress
```python
from embeddings_batch_specialist import BatchEmbeddingsProcessor, EmbeddingItem

# Initialize processor
batch_processor = BatchEmbeddingsProcessor(
    providers={"bge_m3": text_provider},
    batch_size=32
)

# Prepare items
items = [
    EmbeddingItem(
        item_id=doc["id"],
        content=doc["text"],
        content_type="text",
        metadata={"type": "contract"}
    )
    for doc in documents
]

# Process with progress callback
def progress_callback(progress):
    print(f"Progress: {progress.completion_percentage:.1f}%")

result = await batch_processor.process_batch(
    items,
    provider_name="bge_m3",
    progress_callback=progress_callback
)
```

### Health Monitoring with Failover
```python
from embeddings_batch_specialist import EmbeddingsHealthChecker

# Initialize health checker
health_checker = EmbeddingsHealthChecker(
    providers={"bge_m3": text_provider, "clip": image_provider},
    check_interval=60
)

# Start monitoring
await health_checker.start_monitoring()

# Get best available provider
best_provider = await health_checker.get_best_available_provider()

# Get uptime percentage
uptime = await health_checker.get_uptime_percentage("bge_m3", hours=24)
```

---

## Technology Stack

**Common Dependencies**:
- httpx (async HTTP client)
- asyncio (async/await patterns)
- dataclasses (data models)
- numpy (vector operations)

**Providers-Specific**:
- PIL/Pillow (image preprocessing for CLIP)
- hashlib (cache key generation)

**Batch-Specific**:
- uuid (job ID generation)
- datetime (timestamp tracking)

---

## Domain Context

**Industry**: Vietnamese Legal P2P Insurance & Lending
**Key Entities**: LegalDocument, Contract, Verdict, Evidence
**Use Cases**:
1. Legal contract similarity search (BGE-M3, 1024-dim)
2. Document classification (BGE-M3)
3. Semantic search in Vietnamese (BGE-M3)
4. Document image retrieval (CLIP, 512-dim)
5. Image-text similarity matching (CLIP)
6. Bulk document embedding (Batch Processor)
7. Provider health monitoring (Health Checker)

---

## Key Configurations

### BGE-M3 (Text Embeddings)
- **Dimension**: 1024 (fixed)
- **Max Batch Size**: 128
- **Max Tokens**: 512
- **Cache**: MD5-based, unlimited
- **Concurrency**: 4 concurrent batches

### CLIP (Image Embeddings)
- **Dimension**: 512 (fixed)
- **Max Batch Size**: 32
- **Image Size**: 224x224 (resized)
- **Cache**: FIFO, max 1000 images
- **Concurrency**: 2 concurrent batches

### Batch Processing
- **Max Concurrent Batches**: 4
- **Batch Size**: 32 (configurable)
- **Max Retries**: 3 (exponential backoff)
- **Progress Callback**: Optional

### Health Monitoring
- **Check Interval**: 60 seconds (configurable)
- **History Limit**: 100 checks
- **Health Check Timeout**: 5 seconds
- **Embedding Test Timeout**: 10 seconds
- **Quality Score Range**: 0.0 - 1.0

---

## Workflow Format

All specialists use pseudo-code WORKFLOW format:
- Specialist Identity (Role, Responsibilities, Tech Stack, Domain Context)
- Pattern Overview (Purpose, Problem, Solution, Use Cases, Complexity)
- Workflow (Input, Preconditions, Steps, Output, Postconditions)
- Vietnamese Legal Domain Examples

---

**INDEX Version**: 1.0.0
**Last Updated**: 2026-01-02
**Status**: Production-ready, 100% compliant
