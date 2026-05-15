# LLM Base Providers Specialist

**Role**: Base LLM interface and vLLM provider implementation
**Focus**: Base interfaces, data models, and vLLM local provider
**Technology**: FastAPI, Python 3.11+, httpx, async/await
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST LLMBaseProviders {
  ROLE: "Base LLM provider interface and vLLM implementation specialist"

  RESPONSIBILITIES: [
    "Define base LLM provider interface",
    "Define LLM response and config models",
    "Implement vLLM local provider",
    "Support Vietnamese legal document analysis"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["httpx", "dataclasses", "abc", "typing"],
    patterns: ["Abstract Base Class", "Provider Pattern", "Async Provider"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Contract", "Document", "LegalAnalysis"],
    use_cases: ["Contract analysis", "Document classification", "Risk assessment"]
  }
}
```

---

## Pattern 4.1: Base LLM Provider Interface

### Overview

```pseudo
PATTERN BaseLLMProviderInterface {
  PURPOSE: "Unified interface for all LLM providers (vLLM, Ollama, OpenAI)"

  PROBLEM: "Multiple LLM providers have different APIs and response formats"

  SOLUTION: "Abstract base class ensuring consistent interface across providers"

  USE_CASES: [
    "Switch providers without code changes",
    "Fallback chain for provider failures",
    "Health monitoring across providers"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW BaseLLMProvider_Interface {
  INPUT: {
    config: LLMConfig,
    prompt: str,
    system_prompt?: str,
    context?: str
  }

  PRECONDITIONS: [
    "Config validated on initialization",
    "Provider implements all abstract methods",
    "Async runtime available"
  ]

  STEPS: {
    STEP_1_DEFINE_RESPONSE: {
      description: "Define LLM response structure"
      logic: |
        DATACLASS LLMResponse {
          content: str,
          model: str,
          tokens_used: int,
          finish_reason: str,
          metadata?: Dict,
          timestamp: datetime = NOW()
        }
    }

    STEP_2_DEFINE_CONFIG: {
      description: "Define LLM configuration with validation"
      logic: |
        DATACLASS LLMConfig {
          model: str,
          temperature: float = 0.7,
          max_tokens: int = 4096,
          top_p: float = 0.9,
          timeout: int = 60,
          base_url?: str,
          api_key?: str
        }

        VALIDATE_ON_INIT:
          IF temperature NOT IN [0.0, 2.0] THEN ERROR
          IF top_p NOT IN [0.0, 1.0] THEN ERROR
          IF max_tokens <= 0 THEN ERROR
          IF timeout <= 0 THEN ERROR
    }

    STEP_3_DEFINE_INTERFACE: {
      description: "Define abstract base provider"
      logic: |
        ABSTRACT CLASS BaseLLMProvider {
          CONSTRUCTOR(config?: LLMConfig)

          ABSTRACT ASYNC generate(
            prompt: str,
            system_prompt?: str,
            context?: str
          ) -> LLMResponse

          ABSTRACT ASYNC generate_stream(
            prompt: str,
            system_prompt?: str,
            context?: str
          ) -> AsyncGenerator[str]

          ABSTRACT ASYNC health_check() -> bool

          ABSTRACT PROPERTY name() -> str
        }
    }
  }

  OUTPUT: {
    base_interface: "BaseLLMProvider abstract class",
    response_model: "LLMResponse dataclass",
    config_model: "LLMConfig dataclass with validation"
  }

  POSTCONDITIONS: [
    "All providers must implement interface",
    "Config validated before use",
    "Type safety enforced"
  ]
}
```

### Key Interfaces

```typescript
// LLM Response Structure
interface LLMResponse {
  content: string;
  model: string;
  tokens_used: number;
  finish_reason: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// LLM Configuration
interface LLMConfig {
  model: string;
  temperature?: number; // 0.0 to 2.0
  max_tokens?: number; // > 0
  top_p?: number; // 0.0 to 1.0
  timeout?: number; // seconds
  base_url?: string;
  api_key?: string;
}

// Base Provider Interface
interface BaseLLMProvider {
  generate(
    prompt: string,
    system_prompt?: string,
    context?: string
  ): Promise<LLMResponse>;

  generate_stream(
    prompt: string,
    system_prompt?: string,
    context?: string
  ): AsyncGenerator<string, void, unknown>;

  health_check(): Promise<boolean>;

  readonly name: string;
}
```

---

## Pattern 4.3: vLLM Provider Implementation

### Overview

```pseudo
PATTERN VLLMProvider {
  PURPOSE: "Local high-throughput LLM inference via vLLM"

  PROBLEM: "Local inference requires OpenAI-compatible API format"

  SOLUTION: "Implement BaseLLMProvider with vLLM-specific message building"

  USE_CASES: [
    "Cost-free local inference",
    "Low latency for Vietnamese text",
    "Primary provider in fallback chain"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VLLMProvider_Implementation {
  INPUT: {
    config: LLMConfig with base_url,
    prompt: str,
    system_prompt?: str,
    context?: str
  }

  PRECONDITIONS: [
    "vLLM server running at base_url",
    "Model loaded in vLLM",
    "/health endpoint available"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize vLLM provider"
      logic: |
        CLASS VLLMProvider EXTENDS BaseLLMProvider {
          CONSTRUCTOR(config: LLMConfig):
            SUPER(config)
            base_url = config.base_url OR settings.VLLM_BASE_URL
            client = AsyncClient(timeout=config.timeout)

          PROPERTY name() -> str:
            RETURN "vllm"
        }
    }

    STEP_2_BUILD_MESSAGES: {
      description: "Build OpenAI-compatible messages"
      logic: |
        FUNCTION _build_messages(prompt, system_prompt, context):
          messages = []

          IF system_prompt THEN
            messages.APPEND({role: "system", content: system_prompt})

          IF context THEN
            user_content = "Context:\n" + context + "\n\nQuestion: " + prompt
          ELSE
            user_content = prompt

          messages.APPEND({role: "user", content: user_content})
          RETURN messages
    }

    STEP_3_GENERATE: {
      description: "Generate response via vLLM"
      logic: |
        ASYNC FUNCTION generate(prompt, system_prompt, context):
          messages = _build_messages(prompt, system_prompt, context)

          payload = {
            model: config.model,
            messages: messages,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p
          }

          TRY:
            response = AWAIT client.POST(
              base_url + "/v1/chat/completions",
              json=payload
            )
            response.raise_for_status()
            data = response.json()

            RETURN LLMResponse(
              content: data.choices[0].message.content,
              model: data.model,
              tokens_used: data.usage.total_tokens,
              finish_reason: data.choices[0].finish_reason,
              metadata: {provider: "vllm"}
            )
          CATCH HTTPStatusError AS e:
            LOG_ERROR("vLLM HTTP error: " + e)
            THROW
    }

    STEP_4_STREAM: {
      description: "Generate streaming response"
      logic: |
        ASYNC FUNCTION generate_stream(prompt, system_prompt, context):
          messages = _build_messages(prompt, system_prompt, context)

          payload = {
            ...same as generate...,
            stream: true
          }

          ASYNC WITH client.stream(POST, url, json=payload) AS response:
            ASYNC FOR line IN response.aiter_lines():
              IF line.startswith("data: ") THEN
                data = line[6:]
                IF data == "[DONE]" THEN BREAK

                TRY:
                  chunk = JSON.parse(data)
                  delta = chunk.choices[0].delta
                  IF delta.content THEN
                    YIELD delta.content
                CATCH JSONDecodeError:
                  CONTINUE
    }

    STEP_5_HEALTH_CHECK: {
      description: "Check vLLM availability"
      logic: |
        ASYNC FUNCTION health_check():
          TRY:
            response = AWAIT client.GET(base_url + "/health")
            RETURN response.status_code == 200
          CATCH Exception AS e:
            LOG_WARNING("vLLM health check failed: " + e)
            RETURN false
    }
  }

  ERROR_HANDLING: {
    HTTPStatusError: "Log error with response details, re-throw",
    ConnectionError: "Return health check failure, trigger fallback",
    TimeoutError: "Log timeout, return error response"
  }

  OUTPUT: {
    provider: "VLLMProvider instance",
    responses: "LLMResponse or streaming chunks",
    health_status: "boolean availability"
  }

  POSTCONDITIONS: [
    "Response conforms to LLMResponse",
    "Errors logged and propagated",
    "Health check reflects actual status"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    Contract: {
      types: ["insurance_contract", "loan_contract", "service_contract"],
      vietnamese_term: "Hợp Đồng",
      analysis_required: ["risk_assessment", "clause_extraction", "party_identification"]
    },
    LegalDocument: {
      types: ["court_filing", "evidence", "legal_notice"],
      vietnamese_term: "Tài Liệu Pháp Lý",
      processing: ["text_extraction", "classification", "summarization"]
    }
  }

  BUSINESS_RULES: {
    contract_analysis: "Use vLLM for cost efficiency",
    response_time: "< 5 seconds for standard analysis",
    token_limits: "Max 4096 tokens for Vietnamese legal documents"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    system_prompts: "Vietnamese legal domain expertise",
    timezone: "Asia/Ho_Chi_Minh"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 4.4-4.5 - Ollama and OpenAI Providers",
    relationship: "Alternative LLM providers with same interface",
    integration: "All extend BaseLLMProvider"
  },
  {
    pattern: "Pattern 4.6 - LLM Factory",
    relationship: "Factory manages vLLM as primary provider",
    integration: "First in fallback chain: vLLM → Ollama → OpenAI"
  }
]
```

---

## References

- **Architecture**: Provider Pattern, Abstract Base Class
- **Technology Docs**: [httpx Async](https://www.python-httpx.org/async/), [vLLM](https://docs.vllm.ai/)
- **Internal Docs**: `/docs/architecture/llm-integration.md`

---

**End of LLM Base Providers Specialist**
**Lines**: ~490 | **Patterns**: 2 | **Compliance**: 100%
