# LLM API Providers Specialist

**Role**: Ollama, OpenAI providers and LLM factory implementation
**Focus**: Ollama local provider, OpenAI cloud provider, and factory with fallback chain
**Technology**: FastAPI, Python 3.11+, httpx, async/await
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST LLMAPIProviders {
  ROLE: "Ollama, OpenAI, and LLM factory specialist"

  RESPONSIBILITIES: [
    "Implement Ollama local provider",
    "Implement OpenAI cloud provider",
    "Provide factory pattern with fallback chain",
    "Support automatic failover across providers"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["httpx", "dataclasses", "typing"],
    patterns: ["Factory Pattern", "Singleton Pattern", "Fallback Chain"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Contract", "Document", "LegalAnalysis"],
    use_cases: ["Automatic provider failover", "Cost optimization", "High availability"]
  }
}
```

---

## Pattern 4.4: Ollama Provider Implementation

### Overview

```pseudo
PATTERN OllamaProvider {
  PURPOSE: "Local LLM inference via Ollama"

  PROBLEM: "Ollama uses text-based prompt format (not messages array)"

  SOLUTION: "Implement with Ollama-specific prompt building and JSONL streaming"

  USE_CASES: [
    "Local inference alternative to vLLM",
    "Easy model switching",
    "Fallback for vLLM failures"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW OllamaProvider_Implementation {
  INPUT: {
    config: LLMConfig with base_url,
    prompt: str,
    system_prompt?: str,
    context?: str
  }

  PRECONDITIONS: [
    "Ollama server running",
    "Model pulled in Ollama",
    "/api/tags endpoint available"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize Ollama provider"
      logic: |
        CLASS OllamaProvider EXTENDS BaseLLMProvider {
          PROPERTY name() -> str:
            RETURN "ollama"
        }
    }

    STEP_2_BUILD_PROMPT: {
      description: "Build text-based prompt (not messages)"
      logic: |
        FUNCTION _build_prompt(prompt, system_prompt, context):
          parts = []

          IF system_prompt THEN
            parts.APPEND("System: " + system_prompt)

          IF context THEN
            parts.APPEND("Context: " + context)

          parts.APPEND("User: " + prompt)

          RETURN parts.JOIN("\n\n")
    }

    STEP_3_GENERATE: {
      description: "Generate via Ollama API"
      logic: |
        ASYNC FUNCTION generate(prompt, system_prompt, context):
          full_prompt = _build_prompt(prompt, system_prompt, context)

          payload = {
            model: config.model,
            prompt: full_prompt,
            temperature: config.temperature,
            options: {
              num_predict: config.max_tokens,
              top_p: config.top_p
            }
          }

          response = AWAIT client.POST(
            base_url + "/api/generate",
            json=payload
          )
          data = response.json()

          RETURN LLMResponse(
            content: data.response,
            model: data.model,
            tokens_used: data.eval_count OR 0,
            finish_reason: "stop",
            metadata: {
              provider: "ollama",
              eval_count: data.eval_count,
              duration_ms: data.total_duration / 1_000_000
            }
          )
    }

    STEP_4_STREAM: {
      description: "Stream via JSONL format"
      logic: |
        ASYNC FUNCTION generate_stream(prompt, system_prompt, context):
          full_prompt = _build_prompt(prompt, system_prompt, context)

          payload = {...same as generate..., stream: true}

          ASYNC WITH client.stream(POST, url, json=payload) AS response:
            ASYNC FOR line IN response.aiter_lines():
              TRY:
                data = JSON.parse(line)
                IF data.response THEN
                  YIELD data.response
                IF data.done THEN
                  BREAK
              CATCH JSONDecodeError:
                CONTINUE
    }

    STEP_5_HEALTH_CHECK: {
      description: "Check Ollama via /api/tags"
      logic: |
        ASYNC FUNCTION health_check():
          TRY:
            response = AWAIT client.GET(base_url + "/api/tags")
            RETURN response.status_code == 200
          CATCH:
            RETURN false
    }
  }

  OUTPUT: {
    provider: "OllamaProvider instance",
    responses: "LLMResponse with eval_count metrics"
  }
}
```

---

## Pattern 4.5: OpenAI Provider Implementation

### Overview

```pseudo
PATTERN OpenAIProvider {
  PURPOSE: "Cloud LLM inference via OpenAI API"

  PROBLEM: "OpenAI requires authentication and has specific token tracking"

  SOLUTION: "Implement with Bearer token auth and detailed token usage"

  USE_CASES: [
    "Fallback when local providers unavailable",
    "Production-quality responses",
    "Advanced model access (GPT-4)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW OpenAIProvider_Implementation {
  INPUT: {
    config: LLMConfig with api_key,
    prompt: str,
    system_prompt?: str,
    context?: str
  }

  PRECONDITIONS: [
    "Valid OpenAI API key",
    "Network access to api.openai.com",
    "Sufficient API credits"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize with authentication"
      logic: |
        CLASS OpenAIProvider EXTENDS BaseLLMProvider {
          CONSTRUCTOR(config: LLMConfig):
            SUPER(config)
            api_key = config.api_key OR settings.OPENAI_API_KEY
            base_url = "https://api.openai.com"
            client = AsyncClient(
              timeout=config.timeout,
              headers={
                "Authorization": "Bearer " + api_key,
                "Content-Type": "application/json"
              }
            )

          PROPERTY name() -> str:
            RETURN "openai"
        }
    }

    STEP_2_GENERATE: {
      description: "Generate with OpenAI-compatible format"
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

          response = AWAIT client.POST(
            base_url + "/v1/chat/completions",
            json=payload
          )
          data = response.json()

          RETURN LLMResponse(
            content: data.choices[0].message.content,
            model: data.model,
            tokens_used: data.usage.total_tokens,
            finish_reason: data.choices[0].finish_reason,
            metadata: {
              provider: "openai",
              prompt_tokens: data.usage.prompt_tokens,
              completion_tokens: data.usage.completion_tokens
            }
          )
    }

    STEP_3_STREAM: {
      description: "Stream with SSE format"
      logic: |
        ASYNC FUNCTION generate_stream(prompt, system_prompt, context):
          // Same as vLLM streaming (OpenAI-compatible)
          payload = {..., stream: true}

          ASYNC WITH client.stream(POST, url, json=payload) AS response:
            ASYNC FOR line IN response.aiter_lines():
              IF line.startswith("data: ") THEN
                data = line[6:]
                IF data == "[DONE]" THEN BREAK

                chunk = JSON.parse(data)
                delta = chunk.choices[0].delta
                IF delta.content THEN
                  YIELD delta.content
    }

    STEP_4_HEALTH_CHECK: {
      description: "Check API availability"
      logic: |
        ASYNC FUNCTION health_check():
          TRY:
            response = AWAIT client.GET(base_url + "/v1/models")
            RETURN response.status_code == 200
          CATCH:
            RETURN false
    }
  }

  ERROR_HANDLING: {
    401_Unauthorized: "Invalid API key, log error",
    429_RateLimitExceeded: "Wait and retry with exponential backoff",
    500_ServerError: "Trigger fallback to local providers"
  }

  OUTPUT: {
    provider: "OpenAIProvider with detailed token tracking",
    cost_tracking: "prompt_tokens + completion_tokens for billing"
  }
}
```

---

## Pattern 4.6: LLM Factory with Fallback Chain

### Overview

```pseudo
PATTERN LLMProviderFactory {
  PURPOSE: "Automatic provider selection with fallback: vLLM → Ollama → OpenAI"

  PROBLEM: "Manual provider management is error-prone, no automatic failover"

  SOLUTION: "Singleton factory with health monitoring and automatic fallback"

  USE_CASES: [
    "Zero-downtime LLM service",
    "Cost optimization (prefer local)",
    "Automatic recovery from provider failures"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW LLMProviderFactory_Pattern {
  INPUT: {
    provider_configs: Dict[str, LLMConfig],
    fallback_order: ["vllm", "ollama", "openai"]
  }

  PRECONDITIONS: [
    "At least one provider configured",
    "Async runtime available",
    "Settings loaded with provider URLs/keys"
  ]

  STEPS: {
    STEP_1_SINGLETON_INITIALIZATION: {
      description: "Initialize factory (once)"
      logic: |
        CLASS LLMProviderFactory {
          CLASS_VARS:
            _providers: List[BaseLLMProvider] = []
            _active_provider: BaseLLMProvider? = null
            _initialized: bool = false
            _health_check_interval: int = 300  // 5 minutes

          CLASSMETHOD ASYNC initialize():
            IF _initialized THEN RETURN

            configs = {
              "vllm": LLMConfig(
                model=settings.VLLM_MODEL,
                base_url=settings.VLLM_BASE_URL,
                timeout=60
              ),
              "ollama": LLMConfig(
                model=settings.OLLAMA_MODEL,
                base_url=settings.OLLAMA_BASE_URL,
                timeout=60
              ),
              "openai": LLMConfig(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                timeout=60
              )
            }

            _providers = [
              VLLMProvider(configs["vllm"]),
              OllamaProvider(configs["ollama"]),
              OpenAIProvider(configs["openai"])
            ]

            AWAIT _select_active_provider()
            _initialized = true
            LOG_INFO("LLM Factory initialized with " + _providers.length + " providers")
        }
    }

    STEP_2_SELECT_ACTIVE_PROVIDER: {
      description: "Health check all providers, select first healthy"
      logic: |
        CLASSMETHOD ASYNC _select_active_provider():
          FOR EACH provider IN _providers:
            LOG_INFO("Checking provider: " + provider.name)

            IF AWAIT provider.health_check() THEN
              _active_provider = provider
              LOG_INFO("✅ Active LLM provider: " + provider.name)
              RETURN

          THROW RuntimeError("❌ No LLM providers available")
    }

    STEP_3_GET_PROVIDER: {
      description: "Get active provider with automatic fallback"
      logic: |
        CLASSMETHOD ASYNC get_provider() -> BaseLLMProvider:
          IF NOT _initialized THEN
            AWAIT initialize()

          // Re-check active provider health
          IF _active_provider AND NOT AWAIT _active_provider.health_check() THEN
            LOG_WARNING("⚠️ Provider " + _active_provider.name + " unhealthy, attempting fallback")
            AWAIT _select_active_provider()

          RETURN _active_provider
    }

    STEP_4_GET_BY_NAME: {
      description: "Get specific provider (manual override)"
      logic: |
        CLASSMETHOD ASYNC get_provider_by_name(name: str) -> BaseLLMProvider?:
          IF NOT _initialized THEN
            AWAIT initialize()

          FOR EACH provider IN _providers:
            IF provider.name == name THEN
              RETURN provider

          LOG_WARNING("Provider " + name + " not found")
          RETURN null
    }

    STEP_5_ACTIVE_PROVIDER_NAME: {
      description: "Get current active provider name"
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
    active_provider: "First healthy provider from fallback chain",
    fallback_chain: "Automatic failover on health check failure"
  }

  POSTCONDITIONS: [
    "At least one provider healthy",
    "Active provider available for requests",
    "Health checks run before provider selection"
  ]
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 4.1-4.3 - Base LLM and vLLM Provider",
    relationship: "Factory manages all providers including vLLM",
    integration: "All providers extend BaseLLMProvider"
  },
  {
    pattern: "Pattern 4.7-4.15 - LLM Utilities",
    relationship: "Utilities support all providers managed by factory",
    integration: "Streaming, health checks, message formatting"
  }
]
```

---

## References

- **Architecture**: Factory Pattern, Singleton, Fallback Chain
- **Technology Docs**: [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md), [OpenAI API](https://platform.openai.com/docs/api-reference)
- **Internal Docs**: `/docs/architecture/llm-integration.md`

---

**End of LLM API Providers Specialist**
**Lines**: ~486 | **Patterns**: 3 | **Compliance**: 100%
