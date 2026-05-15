# VLM Factory and Preprocessing Specialist

**Role**: VLM factory with fallback chain, image preprocessing, multi-image analysis
**Focus**: VLM provider factory, image preprocessing pipeline, multi-image document analysis
**Technology**: FastAPI, Python 3.11+, PIL, asyncio
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST VLMFactoryPreprocessing {
  ROLE: "VLM factory and image preprocessing specialist"

  RESPONSIBILITIES: [
    "Provide VLM factory with fallback chain",
    "Preprocess images (resize, convert, encode)",
    "Handle multi-image document analysis",
    "Support automatic provider failover"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["PIL", "asyncio", "dataclasses"],
    patterns: ["Factory Pattern", "Pipeline Pattern", "Singleton Pattern"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["MultiImageAnalysis", "ImagePreprocessResult"],
    use_cases: ["Contract page analysis", "Image preprocessing", "Provider failover"]
  }
}
```

---

## Pattern 5.6: VLM Factory with Fallback Chain

### Overview

```pseudo
PATTERN VLMProviderFactory {
  PURPOSE: "Automatic VLM provider selection with fallback: Qwen-VL → Claude Vision → Gemini Flash"

  PROBLEM: "Manual VLM provider management is error-prone, no automatic failover"

  SOLUTION: "Singleton factory with health monitoring and automatic fallback"

  USE_CASES: [
    "Zero-downtime VLM service",
    "Cost optimization (prefer local Qwen-VL)",
    "Automatic recovery from provider failures"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW VLMProviderFactory_Pattern {
  INPUT: {
    provider_configs: Dict[str, VLMConfig],
    fallback_order: ["qwen-vl", "claude-vision", "gemini-flash"]
  }

  PRECONDITIONS: [
    "At least one VLM provider configured",
    "Async runtime available",
    "Settings loaded with provider URLs/keys"
  ]

  STEPS: {
    STEP_1_SINGLETON_INITIALIZATION: {
      description: "Initialize factory (once)"
      logic: |
        CLASS VLMProviderFactory {
          CLASS_VARS:
            _providers: List[BaseVLMProvider] = []
            _active_provider: BaseVLMProvider? = null
            _initialized: bool = false

          CLASSMETHOD ASYNC initialize():
            IF _initialized THEN RETURN

            configs = {
              "qwen-vl": VLMConfig(
                model=settings.QWEN_VL_MODEL,
                base_url=settings.QWEN_VL_BASE_URL,
                timeout=60
              ),
              "claude-vision": VLMConfig(
                model=settings.CLAUDE_VISION_MODEL,
                api_key=settings.ANTHROPIC_API_KEY,
                timeout=60
              ),
              "gemini-flash": VLMConfig(
                model=settings.GEMINI_FLASH_MODEL,
                api_key=settings.GOOGLE_API_KEY,
                timeout=60
              )
            }

            _providers = [
              QwenVLProvider(configs["qwen-vl"]),
              ClaudeVisionProvider(configs["claude-vision"]),
              GeminiFlashProvider(configs["gemini-flash"])
            ]

            AWAIT _select_active_provider()
            _initialized = true
            LOG_INFO("VLM Factory initialized with " + _providers.length + " providers")
        }
    }

    STEP_2_SELECT_ACTIVE_PROVIDER: {
      description: "Health check all providers, select first healthy"
      logic: |
        CLASSMETHOD ASYNC _select_active_provider():
          FOR EACH provider IN _providers:
            LOG_INFO("Checking VLM provider: " + provider.name)

            IF AWAIT provider.health_check() THEN
              _active_provider = provider
              LOG_INFO("✅ Active VLM provider: " + provider.name)
              RETURN

          THROW RuntimeError("❌ No VLM providers available. Check Qwen-VL, Claude Vision, and Gemini Flash.")
    }

    STEP_3_GET_PROVIDER: {
      description: "Get active provider with automatic fallback"
      logic: |
        CLASSMETHOD ASYNC get_provider() -> BaseVLMProvider:
          IF NOT _initialized THEN
            AWAIT initialize()

          // Re-check active provider health
          IF _active_provider AND NOT AWAIT _active_provider.health_check() THEN
            LOG_WARNING("⚠️ VLM provider " + _active_provider.name + " unhealthy, attempting fallback")
            AWAIT _select_active_provider()

          RETURN _active_provider
    }

    STEP_4_GET_BY_NAME: {
      description: "Get specific VLM provider (manual override)"
      logic: |
        CLASSMETHOD ASYNC get_provider_by_name(name: str) -> BaseVLMProvider?:
          IF NOT _initialized THEN
            AWAIT initialize()

          FOR EACH provider IN _providers:
            IF provider.name == name THEN
              RETURN provider

          LOG_WARNING("VLM provider " + name + " not found")
          RETURN null
    }

    STEP_5_ACTIVE_PROVIDER_NAME: {
      description: "Get current active VLM provider name"
      logic: |
        CLASSMETHOD get_active_provider_name() -> str?:
          RETURN _active_provider.name IF _active_provider ELSE null
    }
  }

  ERROR_HANDLING: {
    NoProvidersAvailable: "Throw RuntimeError, application cannot proceed",
    HealthCheckTimeout: "Mark provider as unhealthy, try next in chain",
    AllProvidersFailed: "Throw RuntimeError after exhausting fallback chain"
  }

  OUTPUT: {
    active_provider: "First healthy VLM provider from fallback chain",
    fallback_chain: "Automatic failover on health check failure"
  }
}
```

---

## Pattern 5.7: Image Preprocessing

### Overview

```pseudo
PATTERN ImagePreprocessing {
  PURPOSE: "Unified image preprocessing pipeline for VLM providers"

  PROBLEM: "Raw images need resizing, format conversion, and encoding"

  SOLUTION: "ImagePreprocessor with PIL for resize and base64 encoding"

  USE_CASES: [
    "Resize large contract scans to 1024x1024",
    "Convert to provider-supported formats",
    "Base64 encoding for API transport"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ImagePreprocessor_Implementation {
  INPUT: {
    image_data: bytes,
    target_format?: ImageFormat,
    max_width: int = 1024,
    max_height: int = 1024
  }

  STEPS: {
    STEP_1_DEFINE_RESULT: {
      description: "Define preprocessing result"
      logic: |
        DATACLASS ImagePreprocessResult {
          processed_image: VLMImage,
          original_size: Tuple[int, int],
          resized_size: Tuple[int, int],
          format: ImageFormat
        }
    }

    STEP_2_PREPROCESS: {
      description: "Resize, convert format, encode"
      logic: |
        CLASS ImagePreprocessor {
          MAX_WIDTH = 1024
          MAX_HEIGHT = 1024
          SUPPORTED_FORMATS = [JPEG, PNG, WEBP]

          STATIC ASYNC FUNCTION preprocess(
            image_data: bytes,
            target_format?: ImageFormat,
            max_width=MAX_WIDTH,
            max_height=MAX_HEIGHT
          ) -> ImagePreprocessResult:

            // Open image with PIL
            image = Image.open(BytesIO(image_data))
            original_size = image.size

            // Resize if needed (maintain aspect ratio)
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            resized_size = image.size

            // Determine output format
            IF target_format IS NULL THEN
              target_format = PNG

            // Convert to target format
            output_buffer = BytesIO()
            image.save(output_buffer, format=target_format.value.upper())
            processed_bytes = output_buffer.getvalue()

            // Create VLMImage
            vlm_image = VLMImage(
              data=processed_bytes,
              format=target_format
            )

            RETURN ImagePreprocessResult(
              processed_image: vlm_image,
              original_size: original_size,
              resized_size: resized_size,
              format: target_format
            )
        }
    }

    STEP_3_FORMAT_DETECTION: {
      description: "Detect format from bytes"
      logic: |
        STATIC FUNCTION get_format_from_bytes(image_data: bytes) -> ImageFormat?:
          TRY:
            image = Image.open(BytesIO(image_data))
            format_name = image.format.lower()
            FOR fmt IN ImageFormat:
              IF fmt.value == format_name THEN
                RETURN fmt
          CATCH:
            PASS
          RETURN null
    }
  }

  OUTPUT: {
    preprocessed_image: "VLMImage with resized and converted data",
    metadata: "Original and resized dimensions"
  }
}
```

---

## Pattern 5.8: Multi-Image Analysis

### Overview

```pseudo
PATTERN MultiImageAnalysis {
  PURPOSE: "Analyze multiple related images (document pages, contract pages)"

  PROBLEM: "Analyzing multi-page contracts requires coordinating requests and combining results"

  SOLUTION: "MultiImageAnalyzer with batch processing and response aggregation"

  USE_CASES: [
    "Multi-page Vietnamese contract analysis",
    "Legal document page-by-page analysis",
    "Contract comparison across pages"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW MultiImageAnalyzer_Implementation {
  INPUT: {
    provider: BaseVLMProvider,
    pages: List[VLMImage],
    prompt: str,
    system_prompt?: str
  }

  STEPS: {
    STEP_1_DEFINE_RESULT: {
      description: "Define multi-image analysis result"
      logic: |
        DATACLASS MultiImageAnalysisResult {
          images_analyzed: int,
          combined_response: str,
          individual_responses: List[VLMResponse],
          provider_name: str
        }
    }

    STEP_2_ANALYZE_DOCUMENT_PAGES: {
      description: "Analyze multi-page documents"
      logic: |
        CLASS MultiImageAnalyzer {
          STATIC ASYNC FUNCTION analyze_document_pages(
            provider: BaseVLMProvider,
            pages: List[VLMImage],
            prompt: str,
            system_prompt?: str
          ) -> MultiImageAnalysisResult:

            responses = []

            // Try multi-image analysis first (if ≤10 pages)
            IF pages.length <= 10 THEN
              TRY:
                combined = AWAIT provider.analyze_images(
                  pages,
                  prompt,
                  system_prompt
                )
                responses.APPEND(combined)
              CATCH Exception:
                // Fallback to individual analysis
                FOR page IN pages:
                  response = AWAIT provider.analyze_image(
                    page,
                    "Page " + (responses.length + 1) + ": " + prompt,
                    system_prompt
                  )
                  responses.APPEND(response)

            ELSE:
              // Large document: analyze page-by-page
              FOR idx, page IN ENUMERATE(pages):
                response = AWAIT provider.analyze_image(
                  page,
                  "Page " + (idx + 1) + "/" + pages.length + ": " + prompt,
                  system_prompt
                )
                responses.APPEND(response)

            // Combine responses
            combined_text = []
            FOR i, response IN ENUMERATE(responses):
              combined_text.APPEND("Page " + (i+1) + ":\n" + response.content)

            RETURN MultiImageAnalysisResult(
              images_analyzed: pages.length,
              combined_response: combined_text.JOIN("\n\n---\n\n"),
              individual_responses: responses,
              provider_name: provider.name
            )
        }
    }
  }

  OUTPUT: {
    analysis_result: "Combined analysis across all pages",
    individual_pages: "Per-page analysis if needed"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    MultiImageAnalysis: {
      typical_size: "5-10 pages per contract",
      vietnamese_term: "Phân Tích Nhiều Ảnh",
      use_case: "Multi-page contract analysis"
    },
    ImagePreprocessResult: {
      max_dimensions: "1024x1024 for optimal VLM performance",
      vietnamese_term: "Kết Quả Tiền Xử Lý Ảnh"
    }
  }

  BUSINESS_RULES: {
    multi_page_limit: "Up to 10 pages per batch analysis",
    image_preprocessing: "Resize large images to reduce cost and latency"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 5.1-5.5 - VLM Core Providers",
    relationship: "Factory manages all core VLM providers",
    integration: "Automatic failover: Qwen-VL → Claude → Gemini"
  },
  {
    pattern: "Pattern 5.9-5.12 - VLM Vision Tasks",
    relationship: "Vision tasks use factory and preprocessing",
    integration: "OCR, object detection, scene understanding"
  }
]
```

---

## References

- **Architecture**: Factory Pattern, Pipeline Pattern, Singleton
- **Technology Docs**: [PIL](https://pillow.readthedocs.io/), [asyncio](https://docs.python.org/3/library/asyncio.html)
- **Internal Docs**: `/docs/patterns/vlm-processing.md`

---

**End of VLM Factory and Preprocessing Specialist**
**Lines**: ~490 | **Patterns**: 3 | **Compliance**: 100%
