# LLM Streaming Utilities Specialist

**Role**: LLM streaming, health checks, token tracking, error handling utilities
**Focus**: Streaming response handling, health checks with retry, token usage tracking, timeout/error handling, message formatting
**Technology**: FastAPI, Python 3.11+, asyncio
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST LLMStreamingUtilities {
  ROLE: "LLM streaming and operational utilities specialist"

  RESPONSIBILITIES: [
    "Handle streaming responses with buffering",
    "Implement health checks with retry logic",
    "Track token usage and costs",
    "Manage timeouts and error handling",
    "Format messages for providers"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["asyncio", "dataclasses", "typing"],
    patterns: ["Observer Pattern", "Retry Pattern", "Error Handling"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["TokenMetrics", "StreamingHandler", "HealthChecker"],
    use_cases: ["Real-time responses", "Cost tracking", "Service monitoring"]
  }
}
```

---

## Pattern 4.7: Streaming Response Handling

### Overview

```pseudo
PATTERN StreamingResponseHandling {
  PURPOSE: "Unified streaming handler with buffering and timeout protection"

  PROBLEM: "Raw streaming responses need buffering for smooth output and timeout protection"

  SOLUTION: "StreamingHandler class with configurable buffer and callbacks"

  USE_CASES: [
    "Real-time LLM responses in UI",
    "Progressive document analysis",
    "Live Vietnamese text generation"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW StreamingHandler_Implementation {
  INPUT: {
    stream: AsyncGenerator[str],
    buffer_size: int = 5,
    flush_interval: float = 0.05,
    timeout?: float,
    on_chunk?: Callable[[str], None]
  }

  PRECONDITIONS: [
    "Stream is async generator",
    "Buffer size > 0",
    "Flush interval > 0"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize streaming handler"
      logic: |
        CLASS StreamingHandler {
          CONSTRUCTOR(buffer_size=5, flush_interval=0.05):
            self.buffer_size = buffer_size
            self.flush_interval = flush_interval
            self.total_tokens = 0
        }
    }

    STEP_2_HANDLE_STREAM: {
      description: "Handle streaming with buffering"
      logic: |
        ASYNC FUNCTION handle_stream(stream, on_chunk?) -> str:
          buffer = []
          full_response = []

          TRY:
            ASYNC FOR chunk IN stream:
              buffer.APPEND(chunk)
              full_response.APPEND(chunk)
              total_tokens += chunk.split().length

              // Flush buffer when full
              IF buffer.length >= buffer_size THEN
                flushed = buffer.JOIN("")
                IF on_chunk THEN
                  on_chunk(flushed)
                buffer = []
                AWAIT asyncio.sleep(flush_interval)

            // Flush remaining buffer
            IF buffer.length > 0 THEN
              flushed = buffer.JOIN("")
              IF on_chunk THEN
                on_chunk(flushed)

          CATCH Exception AS e:
            LOG_ERROR("Streaming error: " + e)
            THROW

          RETURN full_response.JOIN("")
    }

    STEP_3_HANDLE_WITH_TIMEOUT: {
      description: "Handle streaming with timeout protection"
      logic: |
        ASYNC FUNCTION handle_stream_with_timeout(stream, timeout=30.0, on_chunk?):
          TRY:
            RETURN AWAIT asyncio.wait_for(
              handle_stream(stream, on_chunk),
              timeout=timeout
            )
          CATCH asyncio.TimeoutError:
            LOG_ERROR("Stream timeout after " + timeout + "s")
            THROW
    }
  }

  ERROR_HANDLING: {
    StreamTimeout: "Raise TimeoutError with context",
    ChunkError: "Log and continue processing next chunk",
    CallbackError: "Log callback error but continue streaming"
  }

  OUTPUT: {
    full_response: "Complete accumulated text",
    total_tokens: "Approximate token count",
    buffered_chunks: "Flushed to callback if provided"
  }

  POSTCONDITIONS: [
    "All chunks processed",
    "Callbacks invoked for all buffers",
    "Timeout respected"
  ]
}
```

### Integration Points

```pseudo
INTEGRATION StreamingHandler_Integration {
  UI_COMPONENTS: {
    triggers: ["ChatInput", "DocumentAnalyzer"],
    displays: ["StreamingTextDisplay", "ProgressIndicator"]
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/llm/stream",
    websocket: "WS /ws/llm/stream"
  }

  DEPENDENCIES: {
    internal: ["@/providers/llm/base"],
    external: ["asyncio"]
  }
}
```

---

## Pattern 4.8: Health Check with Retry Logic

### Overview

```pseudo
PATTERN HealthCheckWithRetry {
  PURPOSE: "Robust health checking with exponential backoff"

  PROBLEM: "Sporadic network issues cause false negative health checks"

  SOLUTION: "HealthChecker with configurable retry and exponential backoff"

  USE_CASES: [
    "Provider availability monitoring",
    "Fallback chain triggering",
    "Service health dashboards"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW HealthChecker_Implementation {
  INPUT: {
    check_fn: Callable[[], Awaitable[bool]],
    provider_name: str,
    max_retries: int = 3,
    initial_delay: float = 0.5,
    max_delay: float = 10.0
  }

  STEPS: {
    STEP_1_CHECK_WITH_RETRY: {
      description: "Health check with exponential backoff"
      logic: |
        CLASS HealthChecker {
          ASYNC FUNCTION check_with_retry(check_fn, provider_name) -> bool:
            delay = initial_delay

            FOR attempt IN 0..max_retries:
              TRY:
                result = AWAIT asyncio.wait_for(check_fn(), timeout=5.0)
                IF result THEN
                  IF attempt > 0 THEN
                    LOG_INFO(provider_name + " recovered after " + attempt + " retries")
                  RETURN true
              CATCH Exception AS e:
                LOG_WARNING(provider_name + " health check attempt " + (attempt+1) + " failed: " + e)

              IF attempt < max_retries THEN
                AWAIT asyncio.sleep(delay)
                delay = MIN(delay * 2, max_delay)

            RETURN false
        }
    }
  }

  OUTPUT: {
    health_status: "true if provider healthy, false otherwise"
  }
}
```

---

## Pattern 4.9: Token Usage Tracking

### Overview

```pseudo
PATTERN TokenUsageTracking {
  PURPOSE: "Track token consumption for cost estimation and quota management"

  PROBLEM: "Need accurate cost tracking for Vietnamese legal document analysis"

  SOLUTION: "TokenMetrics dataclass with cost calculation by provider"

  USE_CASES: [
    "Monthly cost reporting",
    "Per-contract analysis costs",
    "Quota enforcement"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW TokenMetrics_Implementation {
  INPUT: {
    prompt_tokens: int,
    completion_tokens: int,
    provider: str
  }

  STEPS: {
    STEP_1_DEFINE_METRICS: {
      description: "Define token metrics dataclass"
      logic: |
        DATACLASS TokenMetrics {
          prompt_tokens: int = 0,
          completion_tokens: int = 0,
          total_tokens: int = 0,
          cost_usd: float = 0.0,
          provider: str = "unknown",
          timestamp: datetime = NOW()
        }
    }

    STEP_2_CALCULATE_COST: {
      description: "Calculate cost based on provider rates"
      logic: |
        FUNCTION calculate_cost(provider: str) -> float:
          // Pricing as of 2025 (example rates)
          pricing = {
            "openai": {
              prompt: 0.5 / 1_000_000,
              completion: 1.5 / 1_000_000
            },
            "vllm": {prompt: 0, completion: 0},  // Local
            "ollama": {prompt: 0, completion: 0}  // Local
          }

          rates = pricing[provider] OR {prompt: 0, completion: 0}

          cost_usd = (
            prompt_tokens * rates.prompt +
            completion_tokens * rates.completion
          )

          RETURN cost_usd
    }

    STEP_3_AGGREGATE_METRICS: {
      description: "Aggregate metrics across requests"
      logic: |
        FUNCTION __add__(other: TokenMetrics) -> TokenMetrics:
          RETURN TokenMetrics(
            prompt_tokens: self.prompt_tokens + other.prompt_tokens,
            completion_tokens: self.completion_tokens + other.completion_tokens,
            total_tokens: self.total_tokens + other.total_tokens,
            cost_usd: self.cost_usd + other.cost_usd
          )
    }
  }

  OUTPUT: {
    metrics: "TokenMetrics with calculated costs",
    aggregated_metrics: "Sum of multiple requests"
  }
}
```

---

## Pattern 4.10: Timeout and Error Handling

### Overview

```pseudo
PATTERN TimeoutErrorHandling {
  PURPOSE: "Custom exception hierarchy for LLM operations"

  PROBLEM: "Generic exceptions don't provide enough context for debugging"

  SOLUTION: "Specific exception types with context preservation"

  USE_CASES: [
    "LLM request timeout",
    "API authentication errors",
    "Configuration validation"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW LLMExceptions_Implementation {
  STEPS: {
    STEP_1_BASE_EXCEPTION: {
      description: "Base LLM exception"
      logic: |
        CLASS LLMException EXTENDS Exception {
          CONSTRUCTOR(message: str, provider?: str, context?: dict):
            self.message = message
            self.provider = provider
            self.context = context OR {}
            SUPER().__init__(message)
        }
    }

    STEP_2_TIMEOUT_EXCEPTION: {
      description: "Timeout-specific exception"
      logic: |
        CLASS LLMTimeoutException EXTENDS LLMException {
          CONSTRUCTOR(timeout_seconds: float, provider: str):
            SUPER().__init__(
              message: "LLM request timeout after " + timeout_seconds + "s",
              provider: provider,
              context: {timeout_seconds: timeout_seconds}
            )
        }
    }

    STEP_3_API_EXCEPTION: {
      description: "API error exception"
      logic: |
        CLASS LLMAPIException EXTENDS LLMException {
          CONSTRUCTOR(status_code: int, message: str, provider: str):
            SUPER().__init__(
              message: "API error " + status_code + ": " + message,
              provider: provider,
              context: {status_code: status_code}
            )
        }
    }

    STEP_4_ERROR_HANDLER: {
      description: "Convert exceptions to user-friendly messages"
      logic: |
        ASYNC FUNCTION handle_llm_error(exception: Exception) -> str:
          IF exception IS LLMTimeoutException THEN
            RETURN "Hết thời gian chờ. Hãy thử lại sau (Timeout after " + exception.context.timeout_seconds + "s)"

          ELSE IF exception IS LLMAPIException THEN
            RETURN "Lỗi từ nhà cung cấp LLM: " + exception.message

          ELSE IF exception IS LLMConfigException THEN
            RETURN "Cấu hình LLM không đúng"

          ELSE:
            RETURN "Lỗi khi xử lý LLM"
    }
  }

  OUTPUT: {
    exception_hierarchy: "LLMException -> Timeout/API/Config exceptions",
    error_messages: "Vietnamese user-friendly error messages"
  }
}
```

---

## Pattern 4.11: Message Formatting

### Overview

```pseudo
PATTERN MessageFormatting {
  PURPOSE: "Provider-agnostic message formatting"

  PROBLEM: "Different providers expect different message formats"

  SOLUTION: "MessageFormatter with provider-specific formatters"

  USE_CASES: [
    "OpenAI-compatible message arrays",
    "Ollama text-based prompts",
    "Vietnamese legal domain prompts"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW MessageFormatter_Implementation {
  INPUT: {
    prompt: str,
    system_prompt?: str,
    context?: str,
    provider_type: str
  }

  STEPS: {
    STEP_1_OPENAI_FORMAT: {
      description: "Format for OpenAI-compatible APIs"
      logic: |
        STATIC FUNCTION format_for_openai(prompt, system_prompt, context):
          messages = []

          IF system_prompt THEN
            messages.APPEND({role: "system", content: system_prompt})

          IF context THEN
            messages.APPEND({
              role: "user",
              content: "Context:\n" + context + "\n\nQuestion: " + prompt
            })
          ELSE
            messages.APPEND({role: "user", content: prompt})

          RETURN messages
    }

    STEP_2_OLLAMA_FORMAT: {
      description: "Format for Ollama text-based API"
      logic: |
        STATIC FUNCTION format_for_ollama(prompt, system_prompt, context):
          parts = []

          IF system_prompt THEN
            parts.APPEND("System: " + system_prompt)

          IF context THEN
            parts.APPEND("Context: " + context)

          parts.APPEND("User: " + prompt)

          RETURN parts.JOIN("\n\n")
    }

    STEP_3_LEGAL_ANALYSIS_PROMPT: {
      description: "Vietnamese legal document analysis prompt"
      logic: |
        STATIC FUNCTION create_legal_analysis_prompt(document: str, analysis_type: str):
          IF analysis_type == "summary" THEN
            RETURN """Phân tích hợp đồng sau đây:

            """ + document + """

            Yêu cầu:
            1. Tóm tắt điểm chính
            2. Xác định các rủi ro
            3. Liệt kê các điều khoản quan trọng"""

          ELSE IF analysis_type == "risk" THEN
            RETURN "Xác định rủi ro pháp lý trong hợp đồng:\n\n" + document

          ELSE:
            RETURN document
    }
  }

  OUTPUT: {
    formatted_messages: "Provider-specific message format",
    legal_prompts: "Vietnamese domain-specific prompts"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    TokenMetrics: {
      purpose: "Track costs for Vietnamese legal analysis",
      typical_usage: "500-1500 tokens per contract analysis"
    },
    StreamingHandler: {
      use_case: "Real-time Vietnamese text generation in UI",
      buffer_size: "5 chunks for smooth output"
    }
  }

  BUSINESS_RULES: {
    cost_tracking: "Track all token usage for monthly reporting",
    error_handling: "Provide Vietnamese error messages to users",
    streaming: "Buffer output for smooth real-time experience"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 4.1-4.6 - LLM Core Providers",
    relationship: "Utilities support all core providers",
    integration: "StreamingHandler wraps provider.generate_stream()"
  },
  {
    pattern: "Pattern 4.12-4.15 - LLM Context Utilities",
    relationship: "Context management utilities complement streaming",
    integration: "System prompts and context windows"
  }
]
```

---

## References

- **Architecture**: Observer Pattern, Retry Pattern
- **Technology Docs**: [asyncio](https://docs.python.org/3/library/asyncio.html)
- **Internal Docs**: `/docs/patterns/llm-utilities.md`

---

**End of LLM Streaming Utilities Specialist**
**Lines**: ~550 | **Patterns**: 5 | **Compliance**: 100%
