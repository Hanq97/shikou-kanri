# VLM Base Provider Specialist

**Role**: Base VLM interface and Qwen-VL provider implementation
**Focus**: Base VLM interface, data models, and Qwen-VL local provider
**Technology**: FastAPI, Python 3.11+, httpx, PIL, base64
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST VLMBaseProvider {
  ROLE: "Base VLM provider interface and Qwen-VL implementation specialist"

  RESPONSIBILITIES: [
    "Define base VLM provider interface",
    "Define VLM image and response models",
    "Implement Qwen-VL local provider",
    "Support Vietnamese legal document OCR"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["httpx", "PIL", "base64", "dataclasses", "typing"],
    patterns: ["Abstract Base Class", "Provider Pattern", "Image Preprocessing"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["ContractImage", "DocumentOCR", "SignatureDetection"],
    use_cases: ["Contract image analysis", "Document OCR", "Signature verification"]
  }
}
```

---

## Pattern 5.1: Base VLM Provider Interface

### Overview

```pseudo
PATTERN BaseVLMProviderInterface {
  PURPOSE: "Unified interface for all VLM providers (Qwen-VL, Claude, Gemini)"

  PROBLEM: "Multiple VLM providers have different APIs and image encoding formats"

  SOLUTION: "Abstract base class ensuring consistent interface for image analysis"

  USE_CASES: [
    "Switch VLM providers without code changes",
    "Fallback chain for provider failures",
    "Multi-image document analysis"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW BaseVLMProvider_Interface {
  INPUT: {
    config: VLMConfig,
    image: VLMImage,
    prompt: str,
    system_prompt?: str
  }

  PRECONDITIONS: [
    "Config validated on initialization",
    "Image format supported by provider",
    "Async runtime available"
  ]

  STEPS: {
    STEP_1_DEFINE_IMAGE_FORMAT: {
      description: "Define supported image formats"
      logic: |
        ENUM ImageFormat {
          JPEG = "jpeg",
          PNG = "png",
          WEBP = "webp",
          GIF = "gif"
        }
    }

    STEP_2_DEFINE_IMAGE: {
      description: "Define VLM image structure"
      logic: |
        DATACLASS VLMImage {
          data: bytes,  // Image bytes
          format: ImageFormat,
          url?: str  // Alternative: image URL
        }
    }

    STEP_3_DEFINE_RESPONSE: {
      description: "Define VLM response structure"
      logic: |
        DATACLASS VLMResponse {
          content: str,  // Generated description
          model: str,
          confidence?: float,
          metadata?: dict
        }
    }

    STEP_4_DEFINE_CONFIG: {
      description: "Define VLM configuration with validation"
      logic: |
        DATACLASS VLMConfig {
          model: str,
          temperature: float = 0.7,
          max_tokens: int = 1024,
          detail: str = "auto",  // "low", "high", "auto"
          timeout: int = 60
        }

        VALIDATE_ON_INIT:
          IF temperature NOT IN [0.0, 1.0] THEN ERROR
          IF max_tokens <= 0 THEN ERROR
          IF detail NOT IN ["low", "high", "auto"] THEN ERROR
          IF timeout <= 0 THEN ERROR
    }

    STEP_5_DEFINE_INTERFACE: {
      description: "Define abstract base VLM provider"
      logic: |
        ABSTRACT CLASS BaseVLMProvider {
          CONSTRUCTOR(config?: VLMConfig)

          ABSTRACT ASYNC analyze_image(
            image: VLMImage,
            prompt: str,
            system_prompt?: str
          ) -> VLMResponse

          ABSTRACT ASYNC analyze_images(
            images: List[VLMImage],
            prompt: str,
            system_prompt?: str
          ) -> VLMResponse

          ABSTRACT ASYNC health_check() -> bool

          ABSTRACT PROPERTY name() -> str

          ABSTRACT PROPERTY supported_formats() -> List[ImageFormat]
        }
    }
  }

  OUTPUT: {
    base_interface: "BaseVLMProvider abstract class",
    response_model: "VLMResponse dataclass",
    config_model: "VLMConfig dataclass with validation"
  }

  POSTCONDITIONS: [
    "All VLM providers must implement interface",
    "Config validated before use",
    "Image format checked against supported_formats"
  ]
}
```

### Key Interfaces

```typescript
// Image Format Enum
enum ImageFormat {
  JPEG = "jpeg",
  PNG = "png",
  WEBP = "webp",
  GIF = "gif"
}

// VLM Image Input
interface VLMImage {
  data: Uint8Array;  // Image bytes
  format: ImageFormat;
  url?: string;  // Alternative URL
}

// VLM Response
interface VLMResponse {
  content: string;
  model: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

// VLM Configuration
interface VLMConfig {
  model: string;
  temperature?: number; // 0.0 to 1.0
  max_tokens?: number;
  detail?: "low" | "high" | "auto";
  timeout?: number;
}

// Base VLM Provider Interface
interface BaseVLMProvider {
  analyze_image(
    image: VLMImage,
    prompt: string,
    system_prompt?: string
  ): Promise<VLMResponse>;

  analyze_images(
    images: VLMImage[],
    prompt: string,
    system_prompt?: string
  ): Promise<VLMResponse>;

  health_check(): Promise<boolean>;

  readonly name: string;
  readonly supported_formats: ImageFormat[];
}
```

---

## Pattern 5.3: Qwen-VL Provider Implementation

### Overview

```pseudo
PATTERN QwenVLProvider {
  PURPOSE: "Local high-performance vision-language inference via Qwen-VL"

  PROBLEM: "Local VLM requires base64 encoding and OpenAI-compatible format"

  SOLUTION: "Implement with base64 image encoding and multi-image support"

  USE_CASES: [
    "Cost-free local document OCR",
    "Vietnamese contract image analysis",
    "Primary VLM in fallback chain"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW QwenVLProvider_Implementation {
  INPUT: {
    config: VLMConfig with base_url,
    image: VLMImage,
    prompt: str,
    system_prompt?: str
  }

  PRECONDITIONS: [
    "Qwen-VL server running at base_url",
    "Model loaded in Qwen-VL",
    "/health endpoint available"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize Qwen-VL provider"
      logic: |
        CLASS QwenVLProvider EXTENDS BaseVLMProvider {
          CONSTRUCTOR(config: VLMConfig):
            SUPER(config)
            base_url = config.base_url OR settings.QWEN_VL_BASE_URL
            client = AsyncClient(timeout=config.timeout)

          PROPERTY name() -> str:
            RETURN "qwen-vl"

          PROPERTY supported_formats() -> List[ImageFormat]:
            RETURN [JPEG, PNG, WEBP]
        }
    }

    STEP_2_ANALYZE_SINGLE_IMAGE: {
      description: "Analyze single image via Qwen-VL"
      logic: |
        ASYNC FUNCTION analyze_image(image, prompt, system_prompt):
          // Base64 encode image
          image_b64 = base64.b64encode(image.data).decode("utf-8")

          // Build OpenAI-compatible messages
          messages = []
          IF system_prompt THEN
            messages.APPEND({role: "system", content: system_prompt})

          content = [
            {type: "text", text: prompt},
            {
              type: "image_url",
              image_url: {
                url: "data:image/" + image.format.value + ";base64," + image_b64,
                detail: config.detail
              }
            }
          ]
          messages.APPEND({role: "user", content: content})

          payload = {
            model: config.model,
            messages: messages,
            temperature: config.temperature,
            max_tokens: config.max_tokens
          }

          TRY:
            response = AWAIT client.POST(
              base_url + "/v1/chat/completions",
              json=payload
            )
            response.raise_for_status()
            data = response.json()

            RETURN VLMResponse(
              content: data.choices[0].message.content,
              model: data.model,
              metadata: {provider: "qwen-vl", usage: data.usage}
            )
          CATCH HTTPStatusError AS e:
            LOG_ERROR("Qwen-VL HTTP error: " + e)
            THROW
    }

    STEP_3_ANALYZE_MULTIPLE_IMAGES: {
      description: "Analyze multiple images"
      logic: |
        ASYNC FUNCTION analyze_images(images, prompt, system_prompt):
          messages = []
          IF system_prompt THEN
            messages.APPEND({role: "system", content: system_prompt})

          content = [{type: "text", text: prompt}]

          FOR image IN images:
            image_b64 = base64.b64encode(image.data).decode("utf-8")
            content.APPEND({
              type: "image_url",
              image_url: {
                url: "data:image/" + image.format.value + ";base64," + image_b64,
                detail: config.detail
              }
            })

          messages.APPEND({role: "user", content: content})

          payload = {
            model: config.model,
            messages: messages,
            temperature: config.temperature,
            max_tokens: config.max_tokens
          }

          response = AWAIT client.POST(
            base_url + "/v1/chat/completions",
            json=payload
          )
          data = response.json()

          RETURN VLMResponse(
            content: data.choices[0].message.content,
            model: data.model,
            metadata: {
              provider: "qwen-vl",
              image_count: images.length,
              usage: data.usage
            }
          )
    }

    STEP_4_HEALTH_CHECK: {
      description: "Check Qwen-VL availability"
      logic: |
        ASYNC FUNCTION health_check():
          TRY:
            response = AWAIT client.GET(base_url + "/health")
            RETURN response.status_code == 200
          CATCH Exception AS e:
            LOG_WARNING("Qwen-VL health check failed: " + e)
            RETURN false
    }
  }

  ERROR_HANDLING: {
    Base64EncodingError: "Log error and return error response",
    HTTPStatusError: "Log with response details, re-throw",
    TimeoutError: "Trigger fallback to cloud providers"
  }

  OUTPUT: {
    provider: "QwenVLProvider instance",
    responses: "VLMResponse with image analysis",
    multi_image_support: "Up to 10 images per request"
  }

  POSTCONDITIONS: [
    "Response conforms to VLMResponse",
    "Base64 encoding successful",
    "Health check reflects actual status"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    ContractImage: {
      types: ["scanned_contract", "photo_contract", "digital_contract"],
      vietnamese_term: "Ảnh Hợp Đồng",
      analysis_required: ["OCR text extraction", "Signature detection", "Clause identification"]
    },
    DocumentOCR: {
      types: ["legal_document", "court_filing", "evidence_photo"],
      vietnamese_term: "Nhận Dạng Ký Tự Quang Học",
      processing: ["Vietnamese character recognition", "Table extraction", "Metadata extraction"]
    }
  }

  BUSINESS_RULES: {
    image_analysis: "Use Qwen-VL for cost efficiency",
    image_formats: "Accept JPEG, PNG, WEBP for Vietnamese documents"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    ocr_prompts: "Vietnamese text extraction prompts",
    timezone: "Asia/Ho_Chi_Minh"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 5.4-5.5 - Claude Vision and Gemini Flash",
    relationship: "Alternative VLM providers with same interface",
    integration: "All extend BaseVLMProvider"
  },
  {
    pattern: "Pattern 5.6 - VLM Factory",
    relationship: "Factory manages Qwen-VL as primary provider",
    integration: "First in fallback chain: Qwen-VL → Claude → Gemini"
  }
]
```

---

## References

- **Architecture**: Provider Pattern, Abstract Base Class
- **Technology Docs**: [Qwen-VL](https://github.com/QwenLM/Qwen-VL), [PIL](https://pillow.readthedocs.io/)
- **Internal Docs**: `/docs/architecture/vlm-integration.md`

---

**End of VLM Base Provider Specialist**
**Lines**: ~430 | **Patterns**: 2 | **Compliance**: 100%
