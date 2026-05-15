# LLM & VLM Specialist
# LLM/VLM スペシャリスト
# Chuyên Gia LLM & VLM

**Role**: LLM/VLM Provider Orchestration Expert
**Focus**: LLM provider abstraction, VLM integration, streaming, fallback chain
**Patterns**: 2.1-2.10 (10 patterns)
**Technology**: vLLM, Ollama, OpenAI, LLaVA, httpx
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST LLM_VLM {
  ROLE: "LLM and Vision-Language Model Provider Expert"

  RESPONSIBILITIES: [
    "Implement LLM provider abstraction with fallback chain",
    "Manage VLM for image analysis (traffic violations, documents)",
    "Handle streaming responses from providers",
    "Implement health checks and automatic failover",
    "Parse and validate VLM responses"
  ]

  TECH_STACK: {
    primary: "FastAPI + Python 3.11",
    llm_providers: ["vLLM", "Ollama", "OpenAI"],
    vlm_providers: ["LLaVA"],
    libraries: ["httpx", "Pillow", "pydantic"],
    patterns: ["Factory pattern", "Abstract base class", "Async I/O"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_use_cases: ["Traffic violation analysis", "Document OCR", "Legal Q&A"]
  }
}
```

---

## Pattern 2.1: Base LLM Provider Interface

### Overview

```pseudo
PATTERN BaseLLMProvider {
  PURPOSE: "Standardized interface for multiple LLM providers"
  PROBLEM: "Need consistent API across vLLM, Ollama, OpenAI"
  SOLUTION: "Abstract base class with generate, stream, health_check methods"
  USE_CASES: ["Switch providers without code changes", "Implement fallback chain", "Test with mock providers"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW BaseLLMProvider_Interface {
  INTERFACE_DEFINITION: {
    abstract_methods: [
      "generate(prompt, system_prompt?, context?): LLMResponse",
      "generate_stream(prompt, system_prompt?): AsyncGenerator<string>",
      "health_check(): boolean"
    ],
    properties: ["name: string (provider identifier)"]
  }

  DATA_MODELS: {
    LLMResponse: { content: string, model: string, tokens_used: integer, finish_reason: string },
    LLMConfig: { model: string, temperature: float = 0.7, max_tokens: integer = 2048 }
  }

  IMPLEMENTATION_RULES: [
    "All providers MUST inherit from BaseLLMProvider",
    "All methods MUST be async",
    "All providers MUST implement health_check",
    "All providers MUST use LLMResponse dataclass"
  ]
}
```

### Key Interfaces

```typescript
interface BaseLLMProvider {
  generate(prompt: string, system_prompt?: string, context?: string): Promise<LLMResponse>;
  generate_stream(prompt: string, system_prompt?: string): AsyncGenerator<string, void, unknown>;
  health_check(): Promise<boolean>;
  readonly name: string;
}

interface LLMResponse {
  content: string;
  model: string;
  tokens_used: number;
  finish_reason: string;
}

interface LLMConfig {
  model: string;
  temperature?: number;
  max_tokens?: number;
}
```

---

## Pattern 2.2: vLLM Provider Implementation

### Overview

```pseudo
PATTERN VLLMProvider {
  PURPOSE: "vLLM provider for local LLM inference"
  PROBLEM: "Integrate vLLM with OpenAI-compatible API"
  SOLUTION: "Implement BaseLLMProvider using httpx async client"
  USE_CASES: ["Primary LLM provider for legal Q&A", "Vietnamese language generation", "Cost-effective local inference"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VLLMProvider_Generate {
  INPUT: { prompt: string, system_prompt?: string, context?: string }

  STEPS: {
    STEP_1_BUILD_AND_REQUEST: {
      description: "Construct message array and send request"
      logic: |
        messages = []
        IF system_prompt IS NOT NULL THEN
          messages.APPEND({ role: "system", content: system_prompt })
        END IF

        IF context IS NOT NULL THEN
          content = "Context:\n" + context + "\n\nQuestion: " + prompt
          messages.APPEND({ role: "user", content: content })
        ELSE
          messages.APPEND({ role: "user", content: prompt })
        END IF

        response = AWAIT httpx_client.post(
          url=vllm_base_url + "/v1/chat/completions",
          json={ model: config.model, messages: messages, temperature: config.temperature },
          timeout=60.0
        )
    }

    STEP_2_PARSE: {
      description: "Parse response"
      logic: |
        data = response.json()
        llm_response = LLMResponse(
          content=data.choices[0].message.content,
          model=data.model,
          tokens_used=data.usage.total_tokens,
          finish_reason=data.choices[0].finish_reason
        )
        RETURN llm_response
    }
  }

  ERROR_HANDLING: "TimeoutError: Retry with increased timeout (max 3 attempts) | HTTPError: Log error, fallback to next provider | JSONDecodeError: Return error response"
  OUTPUT: LLMResponse
}
```

---

## Pattern 2.3: Streaming Implementation

### Overview

```pseudo
PATTERN LLMStreaming {
  PURPOSE: "Real-time streaming of LLM responses"
  PROBLEM: "Long responses need incremental display"
  SOLUTION: "Parse SSE format and yield chunks"
  USE_CASES: ["Real-time chat interface", "Long document generation", "Better UX for slow responses"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VLLMProvider_Stream {
  INPUT: { prompt: string, system_prompt?: string }

  STEPS: {
    STEP_1_STREAM: {
      description: "Build messages and open streaming connection"
      logic: |
        messages = BUILD_MESSAGES(prompt, system_prompt, null)

        ASYNC WITH httpx_client.stream(
          method="POST",
          url=vllm_base_url + "/v1/chat/completions",
          json={ model: config.model, messages: messages, stream: true }
        ) AS response:

          FOR EACH line IN response.aiter_lines():
            IF line.STARTSWITH("data: ") THEN
              data = line[6:]  // Remove "data: " prefix

              IF data == "[DONE]" THEN BREAK

              chunk = JSON.parse(data)
              content = chunk.choices[0].delta.get("content")

              IF content IS NOT NULL THEN YIELD content
            END IF
          END FOR
        END ASYNC WITH
    }
  }

  ERROR_HANDLING: "ConnectionError: Close stream, return partial results | TimeoutError: Close stream after 120 seconds | ParseError: Skip malformed chunk, continue streaming"
  OUTPUT: AsyncGenerator<string>
}
```

---

## Pattern 2.4: LLM Provider Factory with Fallback

### Overview

```pseudo
PATTERN LLMProviderFactory {
  PURPOSE: "Factory with fallback chain: vLLM → Ollama → OpenAI"
  PROBLEM: "Automatic failover when provider is unavailable"
  SOLUTION: "Health check + provider selection with singleton pattern"
  USE_CASES: ["High availability LLM service", "Graceful degradation", "Cost optimization (prefer local → cloud)"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW LLMProviderFactory_GetProvider {
  CLASS_STATE: { _providers: list[BaseLLMProvider] = [], _active_provider: BaseLLMProvider? = null }

  INITIALIZATION: {
    STEP_1_CREATE_AND_SELECT: {
      description: "Initialize provider chain and select first healthy provider"
      logic: |
        _providers = [
          VLLMProvider(config=vllm_config),
          OllamaProvider(config=ollama_config),
          OpenAIProvider(config=openai_config)
        ]

        FOR provider IN _providers:
          is_healthy = AWAIT provider.health_check()
          IF is_healthy THEN
            _active_provider = provider
            LOG("Active LLM provider: " + provider.name)
            RETURN
          END IF
        END FOR

        THROW ERROR "No LLM providers available"
    }
  }

  GET_PROVIDER: {
    STEP_1_VERIFY_AND_RETURN: {
      description: "Check initialization and verify health"
      logic: |
        IF _active_provider IS NULL THEN AWAIT INITIALIZE()

        is_healthy = AWAIT _active_provider.health_check()
        IF NOT is_healthy THEN
          LOG("Active provider unhealthy, selecting new provider")
          AWAIT SELECT_ACTIVE_PROVIDER()
        END IF

        RETURN _active_provider
    }
  }

  OUTPUT: BaseLLMProvider
}
```

---

## Pattern 2.5: LLMService Wrapper

### Overview

```pseudo
PATTERN LLMService {
  PURPOSE: "High-level LLM service abstraction"
  PROBLEM: "Business logic should not depend on provider details"
  SOLUTION: "Service wrapper using factory pattern"
  USE_CASES: ["ChatService integration", "RAGService integration", "Simplified API for developers"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW LLMService_Generate {
  INPUT: { prompt: string, context?: string, system_prompt?: string }

  STEPS: {
    STEP_1_GENERATE: {
      description: "Get active provider and generate response"
      logic: |
        provider = AWAIT LLMProviderFactory.get_provider()
        response = AWAIT provider.generate(prompt, system_prompt, context)
        RETURN response.content
    }
  }

  OUTPUT: string
}

WORKFLOW LLMService_Stream {
  INPUT: { prompt: string, context?: string, system_prompt?: string }

  STEPS: {
    STEP_1_STREAM: {
      description: "Get provider and stream chunks"
      logic: |
        provider = AWAIT LLMProviderFactory.get_provider()
        ASYNC FOR chunk IN provider.generate_stream(prompt, system_prompt):
          YIELD chunk
        END FOR
    }
  }

  OUTPUT: AsyncGenerator<string>
}
```

---

## Pattern 2.6: Base VLM Provider Interface

### Overview

```pseudo
PATTERN BaseVLMProvider {
  PURPOSE: "Standardized interface for Vision-Language Models"
  PROBLEM: "Need consistent API for image analysis"
  SOLUTION: "Abstract base class for VLM providers"
  USE_CASES: ["Traffic violation analysis", "Document OCR", "Evidence image processing"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW BaseVLMProvider_Interface {
  INTERFACE_DEFINITION: {
    abstract_methods: [
      "analyze(image_path: string, prompt: string): VLMResponse",
      "analyze_bytes(image_bytes: bytes, prompt: string): VLMResponse",
      "health_check(): boolean"
    ],
    properties: ["name: string"]
  }

  DATA_MODELS: {
    VLMResponse: { content: string, model: string, confidence: float, detected_objects?: list },
    VLMConfig: { model: string, max_image_size: integer = 1024, quality: integer = 85 }
  }
}
```

---

## Pattern 2.7: VLM Provider Implementation (LLaVA)

### Overview

```pseudo
PATTERN LLaVAProvider {
  PURPOSE: "Vision model integration for image analysis"
  PROBLEM: "Analyze traffic violation images with Vietnamese text"
  SOLUTION: "LLaVA provider with base64 image encoding"
  USE_CASES: ["Traffic violation detection", "License plate recognition", "Document text extraction"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW LLaVAProvider_AnalyzeBytes {
  INPUT: { image_bytes: bytes, prompt: string }

  STEPS: {
    STEP_1_PREPROCESS_AND_REQUEST: {
      description: "Convert image to base64 and send request"
      logic: |
        image_data = base64.encode(image_bytes).decode("utf-8")

        message = {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: "data:image/jpeg;base64," + image_data }
            }
          ]
        }

        response = AWAIT httpx_client.post(
          url=llava_base_url + "/v1/chat/completions",
          json={ model: config.model, messages: [message] },
          timeout=120.0
        )
    }

    STEP_2_PARSE: {
      description: "Parse response"
      logic: |
        data = response.json()
        vlm_response = VLMResponse(
          content=data.choices[0].message.content,
          model=data.model,
          confidence=data.get("confidence", 0.9)
        )
        RETURN vlm_response
    }
  }

  ERROR_HANDLING: "TimeoutError: Return error, vision processing timeout | ImageFormatError: Return error, invalid image format | HTTPError: Log error, return fallback response"
  OUTPUT: VLMResponse
}
```

---

## Pattern 2.8: Image Preprocessing Pipeline

### Overview

```pseudo
PATTERN ImagePreprocessing {
  PURPOSE: "Optimize images for VLM processing"
  PROBLEM: "Large images slow down processing and waste bandwidth"
  SOLUTION: "Multi-stage pipeline: resize → convert → compress"
  USE_CASES: ["Reduce image size before VLM analysis", "Standardize image format", "Optimize upload bandwidth"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW ImagePreprocessor_Preprocess {
  INPUT: { image_bytes: bytes }
  CONFIG: { max_size: integer = 1024, quality: integer = 85, target_format: string = "JPEG" }

  STEPS: {
    STEP_1_LOAD_AND_RESIZE: {
      description: "Load image and resize if too large"
      logic: |
        image = Image.open(BytesIO(image_bytes))

        IF MAX(image.size) > max_size THEN
          ratio = max_size / MAX(image.size)
          new_width = INT(image.width * ratio)
          new_height = INT(image.height * ratio)
          image = image.resize((new_width, new_height), LANCZOS)
        END IF
    }

    STEP_2_CONVERT_AND_COMPRESS: {
      description: "Convert to RGB and compress"
      logic: |
        IF image.mode != "RGB" THEN image = image.convert("RGB")

        output = BytesIO()
        image.save(output, format=target_format, quality=quality)
        compressed_bytes = output.getvalue()
        RETURN compressed_bytes
    }
  }

  OUTPUT: bytes
}
```

---

## Pattern 2.9: Multimodal Prompt Construction

### Overview

```pseudo
PATTERN MultimodalPrompts {
  PURPOSE: "Structured prompts for vision-language tasks"
  PROBLEM: "Need effective prompts for traffic violation analysis"
  SOLUTION: "Task-specific prompt templates with JSON output"
  USE_CASES: ["Traffic violation detection", "Document OCR", "Evidence analysis"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW VLMPromptBuilder_ViolationAnalysis {
  INPUT: { violation_type: string }
  OUTPUT: { prompt: string }

  TEMPLATE: |
    Phân tích hình ảnh vi phạm giao thông:

    1. Xác định loại vi phạm: {violation_type}
    2. Mô tả chi tiết hành vi vi phạm
    3. Xác định biển số xe (nếu có)
    4. Đánh giá mức độ nghiêm trọng (thấp/trung bình/cao)
    5. Đề xuất mức phạt theo quy định

    Trả lời bằng tiếng Việt với format JSON:
    {
      "violation_type": "...",
      "description": "...",
      "license_plate": "...",
      "severity": "...",
      "penalty_suggestion": "..."
    }
}

WORKFLOW VLMPromptBuilder_DocumentOCR {
  OUTPUT: { prompt: string }

  TEMPLATE: |
    Trích xuất toàn bộ văn bản từ hình ảnh tài liệu.
    Giữ nguyên định dạng và cấu trúc.
    Hỗ trợ tiếng Việt có dấu.
}
```

---

## Pattern 2.10: Vision Response Parsing

### Overview

```pseudo
PATTERN VisionResponseParsing {
  PURPOSE: "Parse and validate VLM JSON responses"
  PROBLEM: "VLM may return mixed text + JSON format"
  SOLUTION: "Extract JSON, validate with Pydantic"
  USE_CASES: ["Parse traffic violation analysis", "Extract structured data from OCR", "Validate response format"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VLMResponseParser_ParseViolation {
  INPUT: { response: string }

  DATA_MODEL: {
    ViolationAnalysis: {
      violation_type: string, description: string, license_plate: string?,
      severity: string, penalty_suggestion: string
    }
  }

  STEPS: {
    STEP_1_EXTRACT_AND_PARSE: {
      description: "Extract JSON from response and validate"
      logic: |
        start = response.FIND("{")
        end = response.RFIND("}") + 1

        IF start == -1 OR end == 0 THEN
          THROW ERROR "No JSON object found in response"
        END IF

        json_str = response[start:end]

        TRY:
          data = JSON.parse(json_str)
          violation = ViolationAnalysis(**data)
        CATCH JSONDecodeError:
          THROW ERROR "Failed to parse JSON"
        CATCH ValidationError:
          THROW ERROR "Invalid response format"
        END TRY

        RETURN violation
    }
  }

  ERROR_HANDLING: "JSONDecodeError: Log error, return error response | ValidationError: Log error, return fallback data | ValueError: Return error with details"
  OUTPUT: ViolationAnalysis
}
```

### Key Interfaces

```typescript
interface ViolationAnalysis {
  violation_type: string;
  description: string;
  license_plate?: string;
  severity: 'low' | 'medium' | 'high';
  penalty_suggestion: string;
}

class VLMResponseParser {
  parseViolationAnalysis(response: string): ViolationAnalysis;
  extractJSON(text: string): string;
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    TrafficViolation: {
      types: ["speeding", "red_light_violation", "wrong_lane", "no_helmet", "parking_violation"],
      vietnamese_terms: ["Vi phạm tốc độ", "Vượt đèn đỏ", "Đi sai làn", "Không đội mũ bảo hiểm", "Đỗ xe sai quy định"]
    },
    LegalDocument: { types: ["contract", "evidence", "court_filing"], vietnamese_term: "Tài Liệu Pháp Lý" }
  }
  BUSINESS_RULES: {
    image_analysis: "All images must be analyzed within 10 seconds",
    vietnamese_support: "All prompts and responses in Vietnamese",
    confidence_threshold: "Minimum 0.7 confidence for automated decisions"
  }
}
```

---

## Pattern Summary

```pseudo
PATTERN_SUMMARY = {
  total_patterns: 10,
  categories: { llm_patterns: ["2.1", "2.2", "2.3", "2.4", "2.5"], vlm_patterns: ["2.6", "2.7", "2.8", "2.9", "2.10"] },
  fallback_chain: "vLLM → Ollama → OpenAI",
  performance_targets: { llm_response: "< 3 seconds (non-streaming)", llm_streaming: "< 500ms first token", vlm_analysis: "< 10 seconds per image" }
}
```

---

## Testing Guidelines

```pseudo
TESTING LLM_VLM_Tests {
  UNIT_TESTS: [
    { name: "should fallback to next provider", input: { vllm_down: true }, expected: { active_provider: "ollama" } },
    { name: "should parse violation analysis", input: { response: "JSON with text" }, expected: { violation_type: "speeding" } }
  ]
  INTEGRATION_TESTS: ["Generate response with fallback", "Stream LLM response", "Analyze traffic violation image"]
}
```

---

## References

- **vLLM Docs**: https://docs.vllm.ai/
- **LLaVA**: https://llava-vl.github.io/
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Internal Docs**: `/docs/architecture/llm-integration.md`

---

**Version**: 1.0
**Created**: 2026-01-03
**Patterns**: 2.1-2.10 (10 patterns)
**Lines**: ~650 target
