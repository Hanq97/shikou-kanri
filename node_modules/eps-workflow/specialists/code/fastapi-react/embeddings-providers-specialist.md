# Embeddings Providers Specialist

**Role**: Base embeddings interface and provider implementations (BGE-M3, CLIP)
**Focus**: Base interface, BGE-M3 text embeddings, CLIP image embeddings, similarity
**Technology**: FastAPI, Python 3.11+, httpx, numpy, PIL
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST EmbeddingsProviders {
  ROLE: "Embeddings provider interface and implementation specialist"

  RESPONSIBILITIES: [
    "Define base embeddings provider interface",
    "Implement BGE-M3 for Vietnamese text (1024-dim)",
    "Implement CLIP for document images (512-dim)",
    "Similarity computation and vector normalization",
    "Support Vietnamese legal document semantic search"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["httpx", "numpy", "PIL", "dataclasses", "asyncio"],
    patterns: ["Abstract Base Class", "Provider Pattern", "Batch Processing"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["LegalDocument", "Contract", "Verdict", "Evidence"],
    use_cases: ["Contract similarity", "Document classification", "Semantic search"]
  }
}
```

---

## Pattern 6.21: Base Embeddings Provider Interface

### Overview

```pseudo
PATTERN BaseEmbeddingsProviderInterface {
  PURPOSE: "Unified interface for all embeddings providers (BGE-M3, CLIP, OpenAI)"

  PROBLEM: "Multiple embeddings providers have different APIs and output dimensions"

  SOLUTION: "Abstract base class ensuring consistent interface for embeddings"

  USE_CASES: [
    "Switch providers without code changes",
    "Health monitoring for provider availability",
    "Normalized vector output for vector search"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW BaseEmbeddingsProvider_Interface {
  INPUT: {
    config: EmbeddingsConfig,
    content: Union[str, bytes]  // Text or image
  }

  PRECONDITIONS: [
    "Config validated on initialization",
    "Provider implements all abstract methods",
    "Dimension consistent across provider"
  ]

  STEPS: {
    STEP_1_DEFINE_ENUMS: {
      description: "Define provider types"
      logic: |
        ENUM EmbeddingsProvider {
          BGE_M3 = "bge_m3",
          CLIP = "clip",
          SENTENCE_TRANSFORMERS = "sentence_transformers",
          OPENAI = "openai"
        }
    }

    STEP_2_DEFINE_CONFIG: {
      description: "Define embeddings configuration"
      logic: |
        DATACLASS EmbeddingsConfig {
          provider: EmbeddingsProvider,
          model: str,
          base_url?: str,
          api_key?: str,
          dimension: int = 1024,
          max_tokens: int = 512,
          timeout: int = 30,
          batch_size: int = 32,
          normalize_embeddings: bool = True,
          cache_enabled: bool = True
        }
    }

    STEP_3_DEFINE_RESULT: {
      description: "Define embedding result"
      logic: |
        DATACLASS EmbeddingResult {
          vector: List[float],
          dimension: int,
          provider: str,
          tokens_used?: int,
          processing_time_ms?: float,
          metadata: Dict = {}

          METHOD to_numpy() -> np.ndarray {
            RETURN np.array(vector)
          }

          METHOD get_similarity(other: EmbeddingResult) -> float {
            vec1 = np.array(vector)
            vec2 = np.array(other.vector)
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            RETURN dot_product / (norm1 * norm2) IF norm1 > 0 AND norm2 > 0 ELSE 0.0
          }
        }
    }

    STEP_4_DEFINE_BATCH_RESULT: {
      description: "Define batch embedding result"
      logic: |
        DATACLASS BatchEmbeddingResult {
          embeddings: List[List[float]],
          count: int,
          provider: str,
          processing_time_ms: float,
          batch_id?: str,
          failed_indices: List[int] = [],
          metadata: Dict = {}

          METHOD get_embedding(index: int) -> List[float] {
            IF 0 <= index < len(embeddings):
              RETURN embeddings[index]
            RETURN []
          }
        }
    }

    STEP_5_DEFINE_INTERFACE: {
      description: "Define abstract base provider"
      logic: |
        ABSTRACT CLASS BaseEmbeddingsProvider {
          CONSTRUCTOR(config: EmbeddingsConfig)

          ABSTRACT ASYNC embed_text(text: str) -> EmbeddingResult
          ABSTRACT ASYNC embed_texts(texts: List[str]) -> BatchEmbeddingResult
          ABSTRACT ASYNC embed_image(image_data: bytes) -> EmbeddingResult
          ABSTRACT ASYNC embed_images(images: List[bytes]) -> BatchEmbeddingResult
          ABSTRACT ASYNC health_check() -> bool

          ABSTRACT PROPERTY name() -> str
          ABSTRACT PROPERTY dimension() -> int
          ABSTRACT PROPERTY max_batch_size() -> int

          METHOD normalize_vector(vector: List[float]) -> List[float] {
            IF NOT config.normalize_embeddings:
              RETURN vector
            arr = np.array(vector)
            norm = np.linalg.norm(arr)
            IF norm > 0:
              arr = arr / norm
            RETURN arr.tolist()
          }
        }
    }
  }

  OUTPUT: {
    base_interface: "BaseEmbeddingsProvider abstract class",
    result_model: "EmbeddingResult with similarity method",
    config_model: "EmbeddingsConfig with validation",
    batch_model: "BatchEmbeddingResult"
  }

  POSTCONDITIONS: [
    "All providers must implement interface",
    "Vectors normalized if configured",
    "Type safety enforced"
  ]
}
```

---

## Pattern 6.22: BGE-M3 Text Embeddings Provider

### Overview

```pseudo
PATTERN BGEM3TextEmbeddings {
  PURPOSE: "BGE-M3 implementation for Vietnamese legal document embeddings"

  PROBLEM: "BGE-M3 requires text preprocessing and batch handling for Vietnamese"

  SOLUTION: "Implement BaseEmbeddingsProvider with Vietnamese text optimization"

  USE_CASES: [
    "Legal contract similarity",
    "Document classification",
    "Semantic search in Vietnamese"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW BGEM3_Implementation {
  INPUT: {
    text: str OR texts: List[str],
    config: EmbeddingsConfig
  }

  PRECONDITIONS: [
    "BGE-M3 server running",
    "Text valid Vietnamese or English",
    "Dimension fixed at 1024"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize BGE-M3 provider"
      logic: |
        CLASS BGEM3Provider EXTENDS BaseEmbeddingsProvider {
          base_url: str
          _client: httpx.AsyncClient
          embedding_cache: Dict[str, EmbeddingResult] = {}
          batch_semaphore: asyncio.Semaphore(4)

          CONSTRUCTOR(config?: EmbeddingsConfig):
            IF NOT config:
              config = EmbeddingsConfig(
                provider=EmbeddingsProvider.BGE_M3,
                model=settings.BGE_M3_MODEL,
                base_url=settings.BGE_M3_BASE_URL,
                dimension=1024,
                batch_size=32
              )
            CALL super().__init__(config)
            SET base_url = config.base_url
            SET _client = httpx.AsyncClient(timeout=config.timeout)
        }
    }

    STEP_2_SINGLE_TEXT_EMBED: {
      description: "Embed single text with caching"
      logic: |
        ASYNC METHOD embed_text(text: str) -> EmbeddingResult {
          // Check cache
          cache_key = _get_cache_key(text)
          IF cache_key IN embedding_cache:
            LOG DEBUG f"Cache hit for text: {text[:50]}..."
            RETURN embedding_cache[cache_key]

          // Preprocess Vietnamese text
          processed_text = _preprocess_text(text)
          start_time = time.time()

          TRY:
            payload = {
              "input": processed_text,
              "model": config.model
            }

            response = AWAIT _client.post(
              f"{base_url}/v1/embeddings",
              json=payload
            )
            response.raise_for_status()
            data = response.json()

            embedding = data["data"][0]["embedding"]
            normalized = normalize_vector(embedding)
            processing_time = (time.time() - start_time) * 1000

            result = EmbeddingResult(
              vector=normalized,
              dimension=dimension,
              provider=name,
              tokens_used=data.get("usage", {}).get("prompt_tokens"),
              processing_time_ms=processing_time,
              metadata={
                "original_length": len(text),
                "processed_length": len(processed_text),
                "model": config.model,
                "language": "vi"
              }
            )

            // Cache result
            IF config.cache_enabled:
              embedding_cache[cache_key] = result

            LOG INFO f"Embedded text: {processing_time:.0f}ms"
            RETURN result

          CATCH Exception AS e:
            LOG ERROR f"BGE-M3 embedding error: {e}"
            RAISE
        }
    }

    STEP_3_BATCH_TEXT_EMBED: {
      description: "Embed multiple texts in batches"
      logic: |
        ASYNC METHOD embed_texts(texts: List[str]) -> BatchEmbeddingResult {
          IF NOT texts:
            RETURN BatchEmbeddingResult(
              embeddings=[],
              count=0,
              provider=name,
              processing_time_ms=0.0
            )

          start_time = time.time()
          embeddings = []
          failed_indices = []

          // Process in chunks
          FOR i IN range(0, len(texts), config.batch_size):
            chunk = texts[i : i + config.batch_size]

            TRY:
              ASYNC WITH batch_semaphore:
                chunk_result = AWAIT _embed_batch_chunk(chunk)
                embeddings.extend(chunk_result)
            CATCH Exception AS e:
              LOG ERROR f"Batch chunk error at index {i}: {e}"
              failed_indices.extend(range(i, min(i + config.batch_size, len(texts))))

          processing_time = (time.time() - start_time) * 1000

          result = BatchEmbeddingResult(
            embeddings=embeddings,
            count=len(embeddings),
            provider=name,
            processing_time_ms=processing_time,
            failed_indices=failed_indices,
            metadata={
              "batch_size": config.batch_size,
              "total_texts": len(texts),
              "successful": len(embeddings),
              "failed": len(failed_indices)
            }
          )

          LOG INFO f"Batch: {len(embeddings)}/{len(texts)} in {processing_time:.0f}ms"
          RETURN result
        }
    }

    STEP_4_PREPROCESS_TEXT: {
      description: "Preprocess Vietnamese text"
      logic: |
        METHOD _preprocess_text(text: str) -> str {
          // Remove extra whitespace
          text = " ".join(text.split())

          // Truncate if exceeding max tokens (1 token ≈ 4 chars)
          max_chars = config.max_tokens * 4
          IF len(text) > max_chars:
            text = text[:max_chars].rsplit(" ", 1)[0]  // Word boundary

          RETURN text
        }
    }

    STEP_5_CACHE_KEY: {
      description: "Generate cache key"
      logic: |
        METHOD _get_cache_key(text: str) -> str {
          RETURN hashlib.md5(text.encode()).hexdigest()
        }
    }

    STEP_6_IMAGE_NOT_SUPPORTED: {
      description: "BGE-M3 is text-only"
      logic: |
        ASYNC METHOD embed_image(image_data: bytes) -> EmbeddingResult {
          RAISE NotImplementedError(
            "BGE-M3 does not support images. Use CLIP provider."
          )
        }
    }

    STEP_7_HEALTH_CHECK: {
      description: "Check BGE-M3 availability"
      logic: |
        ASYNC METHOD health_check() -> bool {
          TRY:
            response = AWAIT _client.get(f"{base_url}/health", timeout=5.0)
            RETURN response.status_code == 200
          CATCH Exception AS e:
            LOG WARNING f"BGE-M3 health check failed: {e}"
            RETURN False
        }
    }

    STEP_8_PROPERTIES: {
      description: "Provider metadata"
      logic: |
        PROPERTY name() -> str:
          RETURN "bge-m3"

        PROPERTY dimension() -> int:
          RETURN 1024

        PROPERTY max_batch_size() -> int:
          RETURN 128
    }
  }

  OUTPUT: {
    provider: "BGEM3Provider implementation",
    embeddings: "1024-dim Vietnamese text embeddings",
    caching: "MD5-based cache for repeated texts"
  }

  POSTCONDITIONS: [
    "Dimension always 1024",
    "Vietnamese text preprocessed",
    "Batch size ≤128"
  ]
}
```

---

## Pattern 6.23: CLIP Image Embeddings Provider

### Overview

```pseudo
PATTERN CLIPImageEmbeddings {
  PURPOSE: "CLIP implementation for document image embeddings"

  PROBLEM: "CLIP requires image preprocessing and format validation"

  SOLUTION: "Implement BaseEmbeddingsProvider with image optimization"

  USE_CASES: [
    "Document image retrieval",
    "Legal document classification",
    "Image-text similarity matching"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW CLIP_Implementation {
  INPUT: {
    image_data: bytes OR images: List[bytes],
    config: EmbeddingsConfig
  }

  PRECONDITIONS: [
    "CLIP server running",
    "Image format valid (JPEG, PNG, WebP)",
    "Dimension fixed at 512"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize CLIP provider"
      logic: |
        ENUM ImageFormat {
          JPEG = "jpeg",
          PNG = "png",
          WEBP = "webp",
          BMP = "bmp"
        }

        CLASS CLIPProvider EXTENDS BaseEmbeddingsProvider {
          base_url: str
          _client: httpx.AsyncClient
          image_cache: Dict[str, EmbeddingResult] = {}
          max_cache_size: int = 1000
          image_semaphore: asyncio.Semaphore(2)

          CONSTRUCTOR(config?: EmbeddingsConfig):
            IF NOT config:
              config = EmbeddingsConfig(
                provider=EmbeddingsProvider.CLIP,
                model=settings.CLIP_MODEL,
                base_url=settings.CLIP_BASE_URL,
                dimension=512,
                batch_size=16
              )
            CALL super().__init__(config)
        }
    }

    STEP_2_TEXT_EMBED: {
      description: "CLIP can embed text for image-text matching"
      logic: |
        ASYNC METHOD embed_text(text: str) -> EmbeddingResult {
          start_time = time.time()

          TRY:
            payload = {"text": text, "model": config.model}
            response = AWAIT _client.post(
              f"{base_url}/v1/embeddings/text",
              json=payload
            )
            response.raise_for_status()
            data = response.json()

            embedding = data["embedding"]
            normalized = normalize_vector(embedding)
            processing_time = (time.time() - start_time) * 1000

            RETURN EmbeddingResult(
              vector=normalized,
              dimension=dimension,
              provider=name,
              processing_time_ms=processing_time,
              metadata={"type": "text", "text_length": len(text)}
            )
          CATCH Exception AS e:
            LOG ERROR f"CLIP text embedding error: {e}"
            RAISE
        }
    }

    STEP_3_IMAGE_EMBED: {
      description: "Embed single image with caching"
      logic: |
        ASYNC METHOD embed_image(image_data: bytes) -> EmbeddingResult {
          // Check cache
          cache_key = _get_cache_key(image_data)
          IF cache_key IN image_cache:
            LOG DEBUG "Cache hit for image"
            RETURN image_cache[cache_key]

          start_time = time.time()

          TRY:
            // Preprocess image
            processed_image = AWAIT _preprocess_image(image_data)
            image_b64 = base64.b64encode(processed_image).decode("utf-8")

            payload = {"image": image_b64, "model": config.model}
            response = AWAIT _client.post(
              f"{base_url}/v1/embeddings/image",
              json=payload
            )
            response.raise_for_status()
            data = response.json()

            embedding = data["embedding"]
            normalized = normalize_vector(embedding)
            processing_time = (time.time() - start_time) * 1000

            result = EmbeddingResult(
              vector=normalized,
              dimension=dimension,
              provider=name,
              processing_time_ms=processing_time,
              metadata={"type": "image", "original_size": len(image_data)}
            )

            // Cache with FIFO eviction
            IF config.cache_enabled:
              IF len(image_cache) >= max_cache_size:
                image_cache.pop(next(iter(image_cache)))
              image_cache[cache_key] = result

            LOG INFO f"Embedded image: {processing_time:.0f}ms"
            RETURN result

          CATCH Exception AS e:
            LOG ERROR f"CLIP image embedding error: {e}"
            RAISE
        }
    }

    STEP_4_PREPROCESS_IMAGE: {
      description: "Preprocess image for CLIP (224x224, RGB)"
      logic: |
        ASYNC METHOD _preprocess_image(image_data: bytes) -> bytes {
          TRY:
            image = Image.open(io.BytesIO(image_data))

            // Convert RGBA to RGB
            IF image.mode == "RGBA":
              rgb_image = Image.new("RGB", image.size, (255, 255, 255))
              rgb_image.paste(image, mask=image.split()[3])
              image = rgb_image
            ELSE IF image.mode != "RGB":
              image = image.convert("RGB")

            // Resize to 224x224 for CLIP
            image.thumbnail((224, 224), Image.Resampling.LANCZOS)

            // Convert back to bytes
            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=90)
            RETURN buffer.getvalue()

          CATCH Exception AS e:
            LOG WARNING f"Image preprocessing error: {e}, using original"
            RETURN image_data
        }
    }

    STEP_5_BATCH_IMAGE_EMBED: {
      description: "Embed multiple images in batches"
      logic: |
        ASYNC METHOD embed_images(images: List[bytes]) -> BatchEmbeddingResult {
          IF NOT images:
            RETURN BatchEmbeddingResult(
              embeddings=[],
              count=0,
              provider=name,
              processing_time_ms=0.0
            )

          start_time = time.time()
          embeddings = []
          failed_indices = []

          FOR i IN range(0, len(images), config.batch_size):
            chunk = images[i : i + config.batch_size]

            TRY:
              ASYNC WITH image_semaphore:
                chunk_result = AWAIT _embed_image_batch_chunk(chunk)
                embeddings.extend(chunk_result)
            CATCH Exception AS e:
              LOG ERROR f"Image batch chunk error at index {i}: {e}"
              failed_indices.extend(range(i, min(i + config.batch_size, len(images))))

          processing_time = (time.time() - start_time) * 1000

          RETURN BatchEmbeddingResult(
            embeddings=embeddings,
            count=len(embeddings),
            provider=name,
            processing_time_ms=processing_time,
            failed_indices=failed_indices,
            metadata={
              "type": "image",
              "total_images": len(images),
              "successful": len(embeddings)
            }
          )
        }
    }

    STEP_6_HEALTH_CHECK: {
      description: "Check CLIP availability"
      logic: |
        ASYNC METHOD health_check() -> bool {
          TRY:
            response = AWAIT _client.get(f"{base_url}/health", timeout=5.0)
            RETURN response.status_code == 200
          CATCH Exception AS e:
            LOG WARNING f"CLIP health check failed: {e}"
            RETURN False
        }
    }

    STEP_7_PROPERTIES: {
      description: "Provider metadata"
      logic: |
        PROPERTY name() -> str:
          RETURN "clip"

        PROPERTY dimension() -> int:
          RETURN 512

        PROPERTY max_batch_size() -> int:
          RETURN 32
    }
  }

  OUTPUT: {
    provider: "CLIPProvider implementation",
    text_embeddings: "512-dim text embeddings for image-text matching",
    image_embeddings: "512-dim image embeddings",
    preprocessing: "224x224 RGB image optimization"
  }

  POSTCONDITIONS: [
    "Dimension always 512",
    "Images preprocessed to 224x224 RGB",
    "FIFO cache with 1000 image limit"
  ]
}
```

---

## Vietnamese Legal Domain Example

```pseudo
EXAMPLE LegalDocumentSimilarity {
  USE_CASE: "Find similar legal contracts using BGE-M3 and CLIP"

  ASYNC FUNCTION find_similar_contracts(
    query_text: str,
    document_images: List[bytes]
  ) -> Dict {
    // Initialize providers
    text_provider = BGEM3Provider()
    image_provider = CLIPProvider()

    // Check health
    IF NOT AWAIT text_provider.health_check():
      RAISE RuntimeError("BGE-M3 provider unavailable")

    // Embed query text
    query_embedding = AWAIT text_provider.embed_text(query_text)

    // Embed document images
    image_result = AWAIT image_provider.embed_images(document_images)

    // Calculate similarities
    similarities = []
    FOR i, img_embedding IN enumerate(image_result.embeddings):
      img_result = EmbeddingResult(
        vector=img_embedding,
        dimension=512,
        provider="clip"
      )
      similarity = query_embedding.get_similarity(img_result)
      similarities.append({
        "document_index": i,
        "similarity_score": similarity
      })

    // Sort by similarity
    similarities.sort(key=lambda x: x["similarity_score"], reverse=True)

    RETURN {
      "query_text": query_text,
      "total_documents": len(document_images),
      "top_matches": similarities[:10]
    }
  }
}
```

---

**Specialist Version**: 1.0.0
**Last Updated**: 2026-01-02
**Target Framework**: FastAPI 0.100+, Python 3.12+
**Dependencies**: httpx, numpy, pillow, dataclasses, asyncio
**Domain**: Vietnamese legal document embeddings
