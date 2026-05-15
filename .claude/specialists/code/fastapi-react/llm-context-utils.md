# LLM Context Utilities Specialist

**Role**: System prompts, context window management, provider selection, response parsing
**Focus**: System prompt integration, context window management, provider selection strategies, LLM response parsing
**Technology**: FastAPI, Python 3.11+, dataclasses
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST LLMContextUtilities {
  ROLE: "LLM context management and response parsing specialist"

  RESPONSIBILITIES: [
    "Manage system prompts for different roles",
    "Handle context window limits",
    "Implement provider selection strategies",
    "Parse and validate LLM responses"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["dataclasses", "typing", "enum"],
    patterns: ["Strategy Pattern", "Parser Pattern", "Template Pattern"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["SystemPrompt", "ContextWindow", "ParsedResponse"],
    use_cases: ["Prompt engineering", "Token management", "Response extraction"]
  }
}
```

---

## Pattern 4.12: System Prompt Integration

### Overview

```pseudo
PATTERN SystemPromptIntegration {
  PURPOSE: "Unified system prompt management for Vietnamese legal domain"

  PROBLEM: "System prompts guide LLM behavior but vary by role and language"

  SOLUTION: "SystemPrompt dataclass with role-based templates"

  USE_CASES: [
    "Legal advisor prompts",
    "Contract analyzer prompts",
    "Vietnamese legal expertise"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SystemPrompt_Implementation {
  INPUT: {
    role: str,
    language: str = "vietnamese",
    instructions: str,
    constraints?: str,
    output_format?: str
  }

  STEPS: {
    STEP_1_DEFINE_PROMPT: {
      description: "Define system prompt structure"
      logic: |
        DATACLASS SystemPrompt {
          role: str,
          language: str = "vietnamese",
          instructions: str = "",
          constraints?: str,
          output_format?: str
        }

        FUNCTION build() -> str:
          parts = ["You are a " + role + "."]

          IF instructions THEN
            parts.APPEND(instructions)

          IF constraints THEN
            parts.APPEND("Constraints: " + constraints)

          IF output_format THEN
            parts.APPEND("Output format: " + output_format)

          RETURN parts.JOIN(" ")
    }

    STEP_2_LEGAL_ADVISOR: {
      description: "Vietnamese legal advisor prompt"
      logic: |
        LEGAL_ADVISOR_PROMPT = SystemPrompt(
          role: "Vietnamese legal advisor specializing in contracts",
          language: "vietnamese",
          instructions: """
          Analyze documents in Vietnamese legal context.
          Use precise legal terminology.
          Reference relevant Vietnamese law provisions.
          """,
          constraints: "Do not provide legal advice for criminal cases",
          output_format: "Structured JSON with risk assessment"
        )
    }

    STEP_3_CONTRACT_ANALYZER: {
      description: "Contract analysis specialist prompt"
      logic: |
        CONTRACT_ANALYZER_PROMPT = SystemPrompt(
          role: "Contract analysis specialist",
          language: "vietnamese",
          instructions: """
          Analyze contracts for:
          1. Completeness (đủ điều khoản)
          2. Clarity (rõ ràng)
          3. Enforceability (khả năng thực hiện)
          4. Risk assessment (đánh giá rủi ro)
          """
        )
    }
  }

  OUTPUT: {
    system_prompt: "Built system prompt string",
    templates: "Pre-defined role-based prompts"
  }
}
```

---

## Pattern 4.13: Context Window Management

### Overview

```pseudo
PATTERN ContextWindowManagement {
  PURPOSE: "Manage context window limits across providers"

  PROBLEM: "Different providers have different token limits (4K, 8K, 128K)"

  SOLUTION: "ContextWindow manager with smart truncation"

  USE_CASES: [
    "Large Vietnamese legal documents",
    "Multi-page contract analysis",
    "Token limit enforcement"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ContextWindow_Implementation {
  INPUT: {
    provider: str,
    text: str,
    reserved_for_output: int = 1024
  }

  STEPS: {
    STEP_1_DEFINE_WINDOWS: {
      description: "Define provider-specific windows"
      logic: |
        DATACLASS ContextWindow {
          provider: str,
          total_tokens: int,
          reserved_for_output: int = 1024
        }

        PROPERTY available_for_input() -> int:
          RETURN total_tokens - reserved_for_output

        CONTEXT_WINDOWS = {
          "vllm": ContextWindow("vllm", 8192),
          "ollama": ContextWindow("ollama", 4096),
          "openai": ContextWindow("openai", 128000)  // GPT-4
        }
    }

    STEP_2_CHECK_FIT: {
      description: "Check if text fits in window"
      logic: |
        FUNCTION fits(text: str) -> bool:
          // Approximate: 1 token ≈ 4 characters
          tokens = text.length / 4
          RETURN tokens <= available_for_input
    }

    STEP_3_TRUNCATE: {
      description: "Truncate text to fit"
      logic: |
        FUNCTION truncate_to_fit(text: str) -> str:
          available = available_for_input * 4
          IF text.length <= available THEN
            RETURN text

          // Keep beginning and end
          half = available / 2
          truncated = text[0:half] + "\n...[truncated]...\n" + text[-half:]
          RETURN truncated
    }
  }

  OUTPUT: {
    window_config: "Provider-specific context window",
    truncated_text: "Text fit within token limits"
  }
}
```

---

## Pattern 4.14: Provider Selection Strategy

### Overview

```pseudo
PATTERN ProviderSelectionStrategy {
  PURPOSE: "Smart provider selection based on requirements"

  PROBLEM: "Different providers have different strengths (cost, speed, accuracy)"

  SOLUTION: "Strategy pattern for task-specific selection"

  USE_CASES: [
    "Cost-optimized (prefer local)",
    "Quality-optimized (prefer GPT-4)",
    "Performance-optimized (fastest)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ProviderSelectionStrategy_Implementation {
  INPUT: {
    available_providers: List[str],
    optimization_goal: "cost" | "quality" | "performance"
  }

  STEPS: {
    STEP_1_STRATEGY_INTERFACE: {
      description: "Define strategy interface"
      logic: |
        ABSTRACT CLASS SelectionStrategy {
          ABSTRACT ASYNC select(available_providers: list) -> str?
        }
    }

    STEP_2_COST_OPTIMIZED: {
      description: "Prefer free local providers"
      logic: |
        CLASS CostOptimizedStrategy EXTENDS SelectionStrategy {
          ASYNC FUNCTION select(available_providers):
            preference = ["vllm", "ollama", "openai"]
            FOR name IN preference:
              IF name IN available_providers THEN
                RETURN name
            RETURN null
        }
    }

    STEP_3_QUALITY_OPTIMIZED: {
      description: "Prefer best model quality"
      logic: |
        CLASS QualityOptimizedStrategy EXTENDS SelectionStrategy {
          ASYNC FUNCTION select(available_providers):
            IF "openai" IN available_providers THEN
              RETURN "openai"
            IF "ollama" IN available_providers THEN
              RETURN "ollama"
            RETURN null
        }
    }

    STEP_4_PERFORMANCE_OPTIMIZED: {
      description: "Prefer fastest provider"
      logic: |
        CLASS PerformanceOptimizedStrategy EXTENDS SelectionStrategy {
          ASYNC FUNCTION select(available_providers):
            IF "vllm" IN available_providers THEN
              RETURN "vllm"
            IF "ollama" IN available_providers THEN
              RETURN "ollama"
            RETURN null
        }
    }
  }

  OUTPUT: {
    selected_provider: "Provider name based on strategy",
    strategy: "Cost/Quality/Performance optimized"
  }
}
```

---

## Pattern 4.15: LLM Response Parsing

### Overview

```pseudo
PATTERN LLMResponseParsing {
  PURPOSE: "Parse and validate LLM responses for Vietnamese legal domain"

  PROBLEM: "LLM responses need structured extraction for contracts/documents"

  SOLUTION: "ResponseParser with JSON and legal-specific parsing"

  USE_CASES: [
    "JSON response extraction",
    "Vietnamese legal document parsing",
    "Contract field extraction"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ResponseParser_Implementation {
  INPUT: {
    response_text: str,
    expected_format: "json" | "legal_analysis"
  }

  STEPS: {
    STEP_1_PARSE_JSON: {
      description: "Extract and parse JSON from response"
      logic: |
        DATACLASS ParsedResponse {
          raw_text: str,
          parsed_data?: Dict,
          is_valid: bool = false,
          error?: str
        }

        FUNCTION parse_json(response_text: str) -> ParsedResponse:
          TRY:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1

            IF start == -1 OR end == 0 THEN
              RETURN ParsedResponse(
                raw_text: response_text,
                is_valid: false,
                error: "No JSON found in response"
              )

            json_str = response_text[start:end]
            data = JSON.parse(json_str)

            RETURN ParsedResponse(
              raw_text: response_text,
              parsed_data: data,
              is_valid: true
            )
          CATCH JSONDecodeError AS e:
            RETURN ParsedResponse(
              raw_text: response_text,
              is_valid: false,
              error: "JSON parse error: " + e
            )
    }

    STEP_2_PARSE_LEGAL_ANALYSIS: {
      description: "Parse Vietnamese legal analysis"
      logic: |
        FUNCTION parse_legal_analysis(response_text: str) -> ParsedResponse:
          result = {}
          lines = response_text.split('\n')

          FOR line IN lines:
            IF line.startswith('Summary:') THEN
              result.summary = line.replace('Summary:', '').strip()
            ELSE IF line.startswith('Risks:') THEN
              result.risks = line.replace('Risks:', '').strip()
            ELSE IF line.startswith('Key Terms:') THEN
              result.key_terms = line.replace('Key Terms:', '').strip()

          RETURN ParsedResponse(
            raw_text: response_text,
            parsed_data: result IF result ELSE null,
            is_valid: bool(result)
          )
    }
  }

  ERROR_HANDLING: {
    JSONDecodeError: "Return error in ParsedResponse, don't throw",
    ParsingError: "Log and return raw text as fallback"
  }

  OUTPUT: {
    parsed_response: "ParsedResponse with extracted data",
    is_valid: "Boolean indicating parse success"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    SystemPrompt: {
      roles: ["legal_advisor", "contract_analyzer", "risk_assessor"],
      vietnamese_expertise: "Vietnamese legal terminology and law references"
    },
    ContextWindow: {
      challenges: "Vietnamese legal documents often exceed 4K tokens",
      solution: "Smart truncation or multi-request analysis"
    },
    ParsedResponse: {
      formats: ["JSON structured data", "Legal analysis sections"],
      validation: "Type checking and completeness validation"
    }
  }

  BUSINESS_RULES: {
    prompt_engineering: "Use Vietnamese legal expert system prompts",
    context_management: "Truncate large documents intelligently",
    response_validation: "Parse and validate all structured responses"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 4.7-4.11 - LLM Streaming Utilities",
    relationship: "Context utilities complement streaming utilities",
    integration: "System prompts used with message formatting"
  },
  {
    pattern: "Pattern 4.1-4.6 - LLM Core Providers",
    relationship: "Context utilities support all core providers",
    integration: "Response parsing handles provider outputs"
  }
]
```

---

## References

- **Architecture**: Strategy Pattern, Parser Pattern, Template Pattern
- **Technology Docs**: [dataclasses](https://docs.python.org/3/library/dataclasses.html)
- **Internal Docs**: `/docs/patterns/llm-utilities.md`

---

**End of LLM Context Utilities Specialist**
**Lines**: ~437 | **Patterns**: 4 | **Compliance**: 100%
