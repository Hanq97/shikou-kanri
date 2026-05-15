# VLM API Providers Specialist

**Role**: Claude Vision, Gemini Flash providers implementation
**Focus**: Claude Vision cloud provider, Gemini Flash cloud provider
**Technology**: FastAPI, Python 3.11+, httpx, base64
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST VLMAPIProviders {
  ROLE: "Claude Vision and Gemini Flash VLM providers specialist"

  RESPONSIBILITIES: [
    "Implement Claude Vision cloud provider",
    "Implement Gemini Flash cloud provider",
    "Support cloud-based VLM fallback",
    "Handle provider-specific image formats"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["httpx", "base64", "dataclasses", "typing"],
    patterns: ["Provider Pattern", "Cloud Integration", "API Authentication"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["ContractImage", "DocumentOCR"],
    use_cases: ["Cloud VLM fallback", "High-accuracy OCR", "Safety moderation"]
  }
}
```

---

## Pattern 5.4: Claude Vision Provider Implementation

### Overview

```pseudo
PATTERN ClaudeVisionProvider {
  PURPOSE: "Cloud VLM inference via Anthropic Claude Vision API"

  PROBLEM: "Claude has specific message format and authentication requirements"

  SOLUTION: "Implement with x-api-key auth and Claude-specific image format"

  USE_CASES: [
    "Fallback when local VLM unavailable",
    "High-accuracy Vietnamese document OCR",
    "GIF format support (unique to Claude)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ClaudeVisionProvider_Implementation {
  INPUT: {
    config: VLMConfig with api_key,
    image: VLMImage,
    prompt: str,
    system_prompt?: str
  }

  PRECONDITIONS: [
    "Valid Anthropic API key",
    "Network access to api.anthropic.com",
    "Image format supported (JPEG/PNG/WEBP/GIF)"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize with Anthropic authentication"
      logic: |
        CLASS ClaudeVisionProvider EXTENDS BaseVLMProvider {
          CONSTRUCTOR(config: VLMConfig):
            SUPER(config)
            api_key = config.api_key OR settings.ANTHROPIC_API_KEY
            base_url = "https://api.anthropic.com"
            client = AsyncClient(
              timeout=config.timeout,
              headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
              }
            )

          PROPERTY name() -> str:
            RETURN "claude-vision"

          PROPERTY supported_formats() -> List[ImageFormat]:
            RETURN [JPEG, PNG, WEBP, GIF]  // GIF unique to Claude
        }
    }

    STEP_2_ANALYZE_SINGLE_IMAGE: {
      description: "Analyze image with Claude-specific format"
      logic: |
        ASYNC FUNCTION analyze_image(image, prompt, system_prompt):
          image_b64 = base64.b64encode(image.data).decode("utf-8")

          content = [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/" + image.format.value,
                data: image_b64
              }
            },
            {type: "text", text: prompt}
          ]

          payload = {
            model: config.model,
            max_tokens: config.max_tokens,
            temperature: config.temperature,
            messages: [{role: "user", content: content}]
          }

          IF system_prompt THEN
            payload["system"] = system_prompt

          TRY:
            response = AWAIT client.POST(
              base_url + "/v1/messages",
              json=payload
            )
            response.raise_for_status()
            data = response.json()

            RETURN VLMResponse(
              content: data.content[0].text,
              model: data.model,
              metadata: {
                provider: "claude-vision",
                usage: data.usage,
                stop_reason: data.stop_reason
              }
            )
          CATCH HTTPStatusError AS e:
            LOG_ERROR("Claude Vision HTTP error: " + e.response.text)
            THROW
    }

    STEP_3_ANALYZE_MULTIPLE_IMAGES: {
      description: "Analyze multiple images"
      logic: |
        ASYNC FUNCTION analyze_images(images, prompt, system_prompt):
          content = []

          FOR image IN images:
            image_b64 = base64.b64encode(image.data).decode("utf-8")
            content.APPEND({
              type: "image",
              source: {
                type: "base64",
                media_type: "image/" + image.format.value,
                data: image_b64
              }
            })

          content.APPEND({type: "text", text: prompt})

          payload = {
            model: config.model,
            max_tokens: config.max_tokens,
            temperature: config.temperature,
            messages: [{role: "user", content: content}]
          }

          IF system_prompt THEN
            payload["system"] = system_prompt

          response = AWAIT client.POST(
            base_url + "/v1/messages",
            json=payload
          )
          data = response.json()

          RETURN VLMResponse(
            content: data.content[0].text,
            model: data.model,
            metadata: {
              provider: "claude-vision",
              image_count: images.length,
              usage: data.usage
            }
          )
    }

    STEP_4_HEALTH_CHECK: {
      description: "Check Claude Vision API availability"
      logic: |
        ASYNC FUNCTION health_check():
          TRY:
            response = AWAIT client.GET(base_url + "/v1")
            RETURN response.status_code IN [200, 404]
          CATCH:
            RETURN false
    }
  }

  ERROR_HANDLING: {
    401_Unauthorized: "Invalid API key, log error",
    429_RateLimitExceeded: "Wait and retry with exponential backoff",
    500_ServerError: "Trigger fallback to Gemini Flash"
  }

  OUTPUT: {
    provider: "ClaudeVisionProvider with GIF support",
    cloud_fallback: "Reliable cloud alternative to local VLM"
  }
}
```

---

## Pattern 5.5: Gemini Flash Provider Implementation

### Overview

```pseudo
PATTERN GeminiFlashProvider {
  PURPOSE: "Fast cloud VLM inference via Google Gemini Flash"

  PROBLEM: "Gemini has different parts-based content format"

  SOLUTION: "Implement with Gemini's inline_data format and safety ratings"

  USE_CASES: [
    "Alternative cloud VLM provider",
    "Fast vision understanding",
    "Content safety moderation"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW GeminiFlashProvider_Implementation {
  INPUT: {
    config: VLMConfig with api_key,
    image: VLMImage,
    prompt: str,
    system_prompt?: str
  }

  PRECONDITIONS: [
    "Valid Google API key",
    "Network access to generativelanguage.googleapis.com",
    "Image format supported (JPEG/PNG/WEBP)"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize Gemini Flash provider"
      logic: |
        CLASS GeminiFlashProvider EXTENDS BaseVLMProvider {
          CONSTRUCTOR(config: VLMConfig):
            SUPER(config)
            api_key = config.api_key OR settings.GOOGLE_API_KEY
            base_url = "https://generativelanguage.googleapis.com"
            client = AsyncClient(timeout=config.timeout)

          PROPERTY name() -> str:
            RETURN "gemini-flash"

          PROPERTY supported_formats() -> List[ImageFormat]:
            RETURN [JPEG, PNG, WEBP]
        }
    }

    STEP_2_ANALYZE_SINGLE_IMAGE: {
      description: "Analyze with Gemini's parts-based format"
      logic: |
        ASYNC FUNCTION analyze_image(image, prompt, system_prompt):
          image_b64 = base64.b64encode(image.data).decode("utf-8")

          parts = []
          IF system_prompt THEN
            parts.APPEND({text: system_prompt})

          parts.APPEND({text: prompt})
          parts.APPEND({
            inline_data: {
              mime_type: "image/" + image.format.value,
              data: image_b64
            }
          })

          payload = {
            contents: [{parts: parts}],
            generationConfig: {
              temperature: config.temperature,
              maxOutputTokens: config.max_tokens
            }
          }

          TRY:
            response = AWAIT client.POST(
              base_url + "/v1/models/" + config.model + ":generateContent",
              params={key: api_key},
              json=payload
            )
            response.raise_for_status()
            data = response.json()

            content = data.candidates[0].content.parts[0].text

            RETURN VLMResponse(
              content: content,
              model: config.model,
              metadata: {
                provider: "gemini-flash",
                usage: data.usageMetadata,
                safety_ratings: data.candidates[0].safetyRatings
              }
            )
          CATCH HTTPStatusError AS e:
            LOG_ERROR("Gemini Flash HTTP error: " + e.response.text)
            THROW
    }

    STEP_3_ANALYZE_MULTIPLE_IMAGES: {
      description: "Analyze multiple images"
      logic: |
        ASYNC FUNCTION analyze_images(images, prompt, system_prompt):
          parts = []

          IF system_prompt THEN
            parts.APPEND({text: system_prompt})

          parts.APPEND({text: prompt})

          FOR image IN images:
            image_b64 = base64.b64encode(image.data).decode("utf-8")
            parts.APPEND({
              inline_data: {
                mime_type: "image/" + image.format.value,
                data: image_b64
              }
            })

          payload = {
            contents: [{parts: parts}],
            generationConfig: {
              temperature: config.temperature,
              maxOutputTokens: config.max_tokens
            }
          }

          response = AWAIT client.POST(
            base_url + "/v1/models/" + config.model + ":generateContent",
            params={key: api_key},
            json=payload
          )
          data = response.json()

          RETURN VLMResponse(
            content: data.candidates[0].content.parts[0].text,
            model: config.model,
            metadata: {
              provider: "gemini-flash",
              image_count: images.length,
              usage: data.usageMetadata
            }
          )
    }

    STEP_4_HEALTH_CHECK: {
      description: "Check Gemini Flash API availability"
      logic: |
        ASYNC FUNCTION health_check():
          TRY:
            response = AWAIT client.GET(
              base_url + "/v1/models/" + config.model,
              params={key: api_key}
            )
            RETURN response.status_code == 200
          CATCH:
            RETURN false
    }
  }

  ERROR_HANDLING: {
    SafetyRatingBlock: "Content blocked by safety filter, log and return error",
    InvalidAPIKey: "Invalid Google API key, log error",
    QuotaExceeded: "API quota exceeded, trigger fallback"
  }

  OUTPUT: {
    provider: "GeminiFlashProvider with safety ratings",
    safety_moderation: "Built-in content safety checks"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    CloudVLMProviders: {
      types: ["claude-vision", "gemini-flash"],
      vietnamese_term: "Nhà Cung Cấp VLM Đám Mây",
      use_case: "Fallback when local VLM unavailable"
    },
    SafetyModeration: {
      purpose: "Content safety checks for Vietnamese documents",
      vietnamese_term: "Kiểm Duyệt An Toàn"
    }
  }

  BUSINESS_RULES: {
    critical_ocr: "Fallback to Claude Vision for high-accuracy requirements",
    safety_moderation: "Use Gemini Flash for content safety checks"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    output_format: "Structured Vietnamese text"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 5.1-5.3 - Base VLM and Qwen-VL",
    relationship: "Cloud providers as fallback for local VLM",
    integration: "All extend BaseVLMProvider"
  },
  {
    pattern: "Pattern 5.6 - VLM Factory",
    relationship: "Factory manages cloud providers in fallback chain",
    integration: "Qwen-VL → Claude → Gemini"
  }
]
```

---

## References

- **Architecture**: Provider Pattern, Cloud Integration
- **Technology Docs**: [Anthropic Claude](https://docs.anthropic.com/claude/docs), [Google Gemini](https://ai.google.dev/docs)
- **Internal Docs**: `/docs/architecture/vlm-integration.md`

---

**End of VLM API Providers Specialist**
**Lines**: ~435 | **Patterns**: 2 | **Compliance**: 100%
