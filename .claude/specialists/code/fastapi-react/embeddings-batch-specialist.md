# Embeddings Batch Specialist

**Role**: Batch embeddings processing and health monitoring
**Focus**: Batch processor, async operations, progress tracking, health checks
**Technology**: FastAPI, Python 3.11+, asyncio, dataclasses
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST EmbeddingsBatch {
  ROLE: "Batch embeddings processing and health monitoring specialist"

  RESPONSIBILITIES: [
    "Efficient batch job queuing and execution",
    "Concurrent batch processing with semaphore control",
    "Progress tracking and checkpoint recovery",
    "Health monitoring for embeddings providers",
    "Error resilience with per-item retry logic"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["asyncio", "dataclasses", "datetime", "uuid"],
    patterns: ["Batch Processing", "Health Check", "Progress Tracking"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["LegalDocument", "Contract", "Verdict"],
    use_cases: ["Bulk document embedding", "Health monitoring", "Progress tracking"]
  }
}
```

---

## Pattern 6.24: Batch Embeddings Processing

### Overview

```pseudo
PATTERN BatchEmbeddingsProcessing {
  PURPOSE: "Efficient batch processing for thousands of documents"

  PROBLEM: "Sequential embedding is slow, naive parallelization exhausts resources"

  SOLUTION: "Dedicated batch processor with concurrency control and recovery"

  USE_CASES: [
    "Bulk document embedding",
    "Mixed text and image batches",
    "Progress tracking for UI updates"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW BatchEmbeddings_Processing {
  INPUT: {
    items: List[EmbeddingItem],
    provider_name: str,
    progress_callback?: Callable[[BatchJobProgress], None]
  }

  PRECONDITIONS: [
    "Items validated (text or image)",
    "Provider available",
    "Batch size configured"
  ]

  STEPS: {
    STEP_1_DEFINE_STATUS: {
      description: "Define job status and items"
      logic: |
        ENUM JobStatus {
          PENDING = "pending",
          PROCESSING = "processing",
          COMPLETED = "completed",
          FAILED = "failed",
          PAUSED = "paused"
        }

        DATACLASS EmbeddingItem {
          item_id: str,
          content: Union[str, bytes],
          content_type: str,  // "text" or "image"
          metadata: Dict = {},
          result?: EmbeddingResult,
          error?: str,
          retry_count: int = 0
        }
    }

    STEP_2_DEFINE_PROGRESS: {
      description: "Define progress tracking"
      logic: |
        DATACLASS BatchJobProgress {
          job_id: str,
          total_items: int,
          processed_items: int,
          failed_items: int,
          status: JobStatus,
          start_time: datetime,
          estimated_completion?: datetime,
          processing_time_ms: float = 0.0,
          items_per_second: float = 0.0

          PROPERTY completion_percentage() -> float {
            RETURN (processed_items / total_items * 100) IF total_items > 0 ELSE 0.0
          }

          PROPERTY success_rate() -> float {
            completed = processed_items - failed_items
            RETURN (completed / total_items * 100) IF total_items > 0 ELSE 0.0
          }
        }
    }

    STEP_3_BATCH_PROCESSOR: {
      description: "Initialize batch processor"
      logic: |
        CLASS BatchEmbeddingsProcessor {
          providers: Dict[str, BaseEmbeddingsProvider],
          max_concurrent_batches: int = 4,
          batch_size: int = 32,
          max_retries: int = 3,
          jobs: Dict[str, List[EmbeddingItem]] = {},
          progress: Dict[str, BatchJobProgress] = {},
          semaphore: asyncio.Semaphore(4)
        }
    }

    STEP_4_PROCESS_BATCH: {
      description: "Process batch with progress tracking"
      logic: |
        ASYNC METHOD process_batch(
          items: List[EmbeddingItem],
          provider_name: str = "bge_m3",
          progress_callback?: Callable
        ) -> Dict {
          job_id = str(uuid.uuid4())
          jobs[job_id] = items

          // Initialize progress
          progress = BatchJobProgress(
            job_id=job_id,
            total_items=len(items),
            processed_items=0,
            failed_items=0,
            status=JobStatus.PROCESSING,
            start_time=datetime.utcnow()
          )
          progress_map[job_id] = progress

          provider = providers.get(provider_name)
          IF NOT provider:
            RAISE ValueError(f"Provider not found: {provider_name}")

          TRY:
            // Process items in batches
            FOR i IN range(0, len(items), batch_size):
              batch = items[i : i + batch_size]

              // Separate text and image items
              text_items = [item FOR item IN batch IF item.content_type == "text"]
              image_items = [item FOR item IN batch IF item.content_type == "image"]

              // Process concurrently
              ASYNC WITH semaphore:
                AWAIT asyncio.gather(
                  _process_text_batch(text_items, provider),
                  _process_image_batch(image_items, provider)
                )

              // Update progress
              progress.processed_items += len(batch) - len([item FOR item IN batch IF item.error])
              progress.failed_items = sum(1 FOR item IN batch IF item.error)

              IF progress_callback:
                progress_callback(progress)

            progress.status = JobStatus.COMPLETED
            progress.processing_time_ms = (
              datetime.utcnow() - progress.start_time
            ).total_seconds() * 1000

            LOG INFO f"Batch job {job_id}: {progress.processed_items}/{len(items)} in {progress.processing_time_ms:.0f}ms"

            RETURN {
              "job_id": job_id,
              "status": progress.status.value,
              "items": items,
              "progress": {
                "total": progress.total_items,
                "completed": progress.processed_items,
                "failed": progress.failed_items,
                "percentage": progress.completion_percentage
              }
            }

          CATCH Exception AS e:
            progress.status = JobStatus.FAILED
            LOG ERROR f"Batch job {job_id} failed: {e}"
            RAISE
        }
    }

    STEP_5_PROCESS_TEXT_BATCH: {
      description: "Process text items with retry"
      logic: |
        ASYNC METHOD _process_text_batch(
          items: List[EmbeddingItem],
          provider: BaseEmbeddingsProvider
        ) -> None {
          IF NOT items:
            RETURN

          texts = [item.content FOR item IN items]

          FOR retry IN range(max_retries):
            TRY:
              result = AWAIT provider.embed_texts(texts)

              FOR i, item IN enumerate(items):
                IF i < len(result.embeddings):
                  item.result = EmbeddingResult(
                    vector=result.embeddings[i],
                    dimension=provider.dimension,
                    provider=provider.name,
                    metadata=result.metadata
                  )
                ELSE:
                  item.error = "Index out of range"

              LOG DEBUG f"Text batch processed: {len(items)} items"
              RETURN

            CATCH Exception AS e:
              IF retry < max_retries - 1:
                wait_time = 2 ** retry
                LOG WARNING f"Text batch error (retry {retry + 1}): {e}, waiting {wait_time}s"
                AWAIT asyncio.sleep(wait_time)
              ELSE:
                FOR item IN items:
                  item.error = str(e)
                LOG ERROR f"Text batch failed after {max_retries} retries"
        }
    }

    STEP_6_PROCESS_IMAGE_BATCH: {
      description: "Process image items with retry"
      logic: |
        ASYNC METHOD _process_image_batch(
          items: List[EmbeddingItem],
          provider: BaseEmbeddingsProvider
        ) -> None {
          IF NOT items:
            RETURN

          images = [item.content FOR item IN items]

          FOR retry IN range(max_retries):
            TRY:
              result = AWAIT provider.embed_images(images)

              FOR i, item IN enumerate(items):
                IF i < len(result.embeddings):
                  item.result = EmbeddingResult(
                    vector=result.embeddings[i],
                    dimension=provider.dimension,
                    provider=provider.name,
                    metadata=result.metadata
                  )
                ELSE:
                  item.error = "Index out of range"

              LOG DEBUG f"Image batch processed: {len(items)} items"
              RETURN

            CATCH Exception AS e:
              IF retry < max_retries - 1:
                wait_time = 2 ** retry
                LOG WARNING f"Image batch error (retry {retry + 1}): {e}, waiting {wait_time}s"
                AWAIT asyncio.sleep(wait_time)
              ELSE:
                FOR item IN items:
                  item.error = str(e)
                LOG ERROR f"Image batch failed after {max_retries} retries"
        }
    }

    STEP_7_PROGRESS_MANAGEMENT: {
      description: "Get and cancel jobs"
      logic: |
        METHOD get_progress(job_id: str) -> Optional[BatchJobProgress] {
          RETURN progress.get(job_id)
        }

        METHOD cancel_job(job_id: str) -> bool {
          IF job_id IN progress:
            progress[job_id].status = JobStatus.PAUSED
            LOG INFO f"Job {job_id} cancelled"
            RETURN True
          RETURN False
        }
    }
  }

  OUTPUT: {
    processor: "BatchEmbeddingsProcessor with concurrency control",
    progress: "Real-time progress tracking",
    retry: "Exponential backoff retry logic"
  }

  POSTCONDITIONS: [
    "Batch size ≤ provider limits",
    "Max retries = 3",
    "Progress callback completes quickly"
  ]
}
```

---

## Pattern 6.25: Embeddings Health Monitoring

### Overview

```pseudo
PATTERN EmbeddingsHealthMonitoring {
  PURPOSE: "Monitor provider availability with automatic failover"

  PROBLEM: "Providers can become unavailable or degraded"

  SOLUTION: "Periodic health checks with quality verification and fallback"

  USE_CASES: [
    "Provider availability monitoring",
    "Automatic failover to backup providers",
    "Degradation detection"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW EmbeddingsHealth_Monitoring {
  INPUT: {
    providers: Dict[str, BaseEmbeddingsProvider],
    check_interval: int = 60
  }

  STEPS: {
    STEP_1_DEFINE_STATUS: {
      description: "Define health status"
      logic: |
        ENUM ProviderHealthStatus {
          HEALTHY = "healthy",
          DEGRADED = "degraded",
          UNAVAILABLE = "unavailable",
          UNKNOWN = "unknown"
        }

        DATACLASS HealthCheckResult {
          provider_name: str,
          status: ProviderHealthStatus,
          timestamp: datetime,
          response_time_ms: float,
          quality_score: float,  // 0.0 - 1.0
          errors: List[str] = [],
          metrics: Dict = {}

          PROPERTY is_healthy() -> bool {
            RETURN status == ProviderHealthStatus.HEALTHY
          }
        }
    }

    STEP_2_HEALTH_CHECKER: {
      description: "Initialize health checker"
      logic: |
        CLASS EmbeddingsHealthChecker {
          providers: Dict[str, BaseEmbeddingsProvider],
          check_interval: int = 60,
          history_limit: int = 100,
          health_history: Dict[str, List[HealthCheckResult]] = {},
          last_check: Dict[str, Optional[HealthCheckResult]] = {},
          is_running: bool = False,
          primary_provider: str
        }
    }

    STEP_3_START_MONITORING: {
      description: "Start periodic health checks"
      logic: |
        ASYNC METHOD start_monitoring() -> None {
          is_running = True
          LOG INFO "Starting embeddings health checks"

          WHILE is_running:
            TRY:
              FOR provider_name, provider IN providers.items():
                result = AWAIT check_health(provider)
                health_history[provider_name].append(result)

                // Keep history limited
                IF len(health_history[provider_name]) > history_limit:
                  health_history[provider_name].pop(0)

                last_check[provider_name] = result

                // Log status changes
                IF len(health_history[provider_name]) > 1:
                  prev_status = health_history[provider_name][-2].status
                  IF result.status != prev_status:
                    LOG WARNING f"{provider_name} health: {prev_status.value} -> {result.status.value}"

              AWAIT asyncio.sleep(check_interval)

            CATCH Exception AS e:
              LOG ERROR f"Health check error: {e}"
              AWAIT asyncio.sleep(check_interval)
        }
    }

    STEP_4_CHECK_HEALTH: {
      description: "Perform comprehensive health check"
      logic: |
        ASYNC METHOD check_health(provider: BaseEmbeddingsProvider) -> HealthCheckResult {
          start_time = time.time()
          errors = []
          quality_score = 1.0

          TRY:
            // Check 1: Provider health endpoint
            is_available = AWAIT asyncio.wait_for(
              provider.health_check(),
              timeout=5.0
            )

            IF NOT is_available:
              errors.append("Provider health check returned False")
              quality_score -= 0.5

            // Check 2: Test embedding quality
            TRY:
              test_text = "Test sentence for Vietnamese legal document embeddings."
              result = AWAIT asyncio.wait_for(
                provider.embed_text(test_text),
                timeout=10.0
              )

              // Verify embedding properties
              IF len(result.vector) != provider.dimension:
                errors.append(f"Dimension mismatch: {len(result.vector)} != {provider.dimension}")
                quality_score -= 0.3

              // Check vector normalization
              vector_norm = sum(x**2 FOR x IN result.vector) ** 0.5
              IF abs(vector_norm - 1.0) > 0.01:
                LOG WARNING f"Vector not normalized: norm={vector_norm}"

            CATCH asyncio.TimeoutError:
              errors.append("Embedding test timed out")
              quality_score -= 0.4
            CATCH Exception AS e:
              errors.append(f"Embedding test failed: {str(e)}")
              quality_score -= 0.5

          CATCH asyncio.TimeoutError:
            errors.append("Health check timed out")
            quality_score = 0.0
          CATCH Exception AS e:
            errors.append(str(e))
            quality_score = 0.0

          elapsed_ms = (time.time() - start_time) * 1000

          // Determine status
          IF quality_score < 0.5:
            status = ProviderHealthStatus.UNAVAILABLE
          ELSE IF elapsed_ms > 5000 OR quality_score < 0.7:
            status = ProviderHealthStatus.DEGRADED
          ELSE IF NOT errors AND quality_score >= 0.9:
            status = ProviderHealthStatus.HEALTHY
          ELSE:
            status = ProviderHealthStatus.DEGRADED

          result = HealthCheckResult(
            provider_name=provider.name,
            status=status,
            timestamp=datetime.utcnow(),
            response_time_ms=elapsed_ms,
            quality_score=max(0.0, quality_score),
            errors=errors,
            metrics={
              "response_time_ms": elapsed_ms,
              "dimension": provider.dimension,
              "provider": provider.name
            }
          )

          LOG DEBUG f"{provider.name} health: {status.value} ({elapsed_ms:.0f}ms, quality={quality_score:.2f})"
          RETURN result
        }
    }

    STEP_5_GET_BEST_PROVIDER: {
      description: "Get best available provider by health"
      logic: |
        ASYNC METHOD get_best_available_provider() -> Optional[BaseEmbeddingsProvider] {
          statuses = get_all_statuses()

          // Prefer healthy providers
          FOR name, status IN statuses.items():
            IF status.status == ProviderHealthStatus.HEALTHY:
              RETURN providers.get(name)

          // Fall back to degraded providers
          FOR name, status IN statuses.items():
            IF status.status == ProviderHealthStatus.DEGRADED:
              LOG WARNING f"Using degraded provider: {name}"
              RETURN providers.get(name)

          LOG ERROR "No healthy embeddings providers available"
          RETURN None
        }
    }

    STEP_6_UPTIME_PERCENTAGE: {
      description: "Calculate uptime percentage"
      logic: |
        ASYNC METHOD get_uptime_percentage(
          provider_name: str,
          hours: int = 24
        ) -> float {
          history = health_history.get(provider_name, [])
          IF NOT history:
            RETURN 0.0

          cutoff_time = datetime.utcnow() - timedelta(hours=hours)
          recent_checks = [c FOR c IN history IF c.timestamp >= cutoff_time]

          IF NOT recent_checks:
            RETURN 0.0

          healthy_count = sum(
            1 FOR c IN recent_checks
            IF c.is_healthy OR c.status == ProviderHealthStatus.DEGRADED
          )

          uptime = (healthy_count / len(recent_checks)) * 100
          RETURN round(uptime, 2)
        }
    }

    STEP_7_HEALTH_REPORT: {
      description: "Generate health report"
      logic: |
        METHOD get_health_report() -> Dict {
          report = {
            "timestamp": datetime.utcnow().isoformat(),
            "providers": {}
          }

          FOR name, status IN get_all_statuses().items():
            IF status:
              report["providers"][name] = {
                "status": status.status.value,
                "response_time_ms": status.response_time_ms,
                "quality_score": status.quality_score,
                "errors": status.errors,
                "last_check": status.timestamp.isoformat()
              }

          RETURN report
        }
    }
  }

  OUTPUT: {
    checker: "EmbeddingsHealthChecker with monitoring",
    best_provider: "Automatic failover to healthy provider",
    uptime: "Uptime percentage calculation"
  }

  POSTCONDITIONS: [
    "Health checks ≤5 seconds",
    "Check interval ≥30 seconds",
    "Quality score 0.0-1.0"
  ]
}
```

---

## Vietnamese Legal Domain Example

```pseudo
EXAMPLE BulkDocumentEmbedding {
  USE_CASE: "Batch embed Vietnamese legal documents with progress tracking"

  ASYNC FUNCTION batch_embed_legal_documents(
    documents: List[Dict]
  ) -> Dict {
    // Initialize provider and processor
    text_provider = BGEM3Provider()
    batch_processor = BatchEmbeddingsProcessor(
      providers={"bge_m3": text_provider},
      batch_size=32
    )

    // Prepare items
    items = []
    FOR doc IN documents:
      items.append(EmbeddingItem(
        item_id=doc["id"],
        content=doc["text"],
        content_type="text",
        metadata={
          "document_type": doc.get("type", "contract"),
          "case_number": doc.get("case_number")
        }
      ))

    // Process with progress tracking
    FUNCTION progress_callback(progress):
      PRINT f"Progress: {progress.processed_items}/{progress.total_items} ({progress.completion_percentage:.1f}%)"

    result = AWAIT batch_processor.process_batch(
      items,
      provider_name="bge_m3",
      progress_callback=progress_callback
    )

    // Extract embeddings
    embeddings = {}
    FOR item IN result["items"]:
      IF item.result:
        embeddings[item.item_id] = {
          "vector": item.result.vector,
          "metadata": item.result.metadata
        }

    RETURN {
      "job_id": result["job_id"],
      "total_documents": result["progress"]["total"],
      "successful": result["progress"]["completed"],
      "failed": result["progress"]["failed"],
      "embeddings": embeddings
    }
  }
}
```

---

**Specialist Version**: 1.0.0
**Last Updated**: 2026-01-02
**Target Framework**: FastAPI 0.100+, Python 3.12+
**Dependencies**: asyncio, dataclasses, datetime, uuid
**Domain**: Vietnamese legal batch embeddings
