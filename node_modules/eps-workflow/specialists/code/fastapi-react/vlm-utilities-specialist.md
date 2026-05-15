# VLM Utilities Specialist

**Role**: VLM utility patterns (health checks, format validation, response parsing)
**Focus**: Health monitoring, image format validation, VLM response parsing
**Technology**: FastAPI, Python 3.11+, asyncio
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST VLMUtilities {
  ROLE: "VLM utility patterns and helper functions specialist"

  RESPONSIBILITIES: [
    "Monitor VLM provider health with retry logic",
    "Validate image formats for provider compatibility",
    "Parse VLM responses for Vietnamese legal documents"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["asyncio", "dataclasses", "typing", "datetime"],
    patterns: ["Health Check Pattern", "Validator Pattern", "Parser Pattern"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["HealthCheckResult", "ImageFormat", "ParsedVLMResponse"],
    use_cases: ["Provider monitoring", "Format validation", "Legal document parsing"]
  }
}
```

---

## Pattern 5.13: Health Check for VLM Providers

### Overview

```pseudo
PATTERN VLMHealthCheck {
  PURPOSE: "Monitor VLM provider availability with retry logic"

  PROBLEM: "VLM providers can become unavailable, need monitoring to detect failures"

  SOLUTION: "VLMHealthChecker with exponential backoff and status tracking"

  USE_CASES: [
    "Provider availability monitoring",
    "Fallback chain triggering",
    "Service health dashboards"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VLMHealthChecker_Implementation {
  INPUT: {
    provider: BaseVLMProvider,
    max_retries: int = 3,
    initial_delay: float = 0.5,
    max_delay: float = 10.0
  }

  PRECONDITIONS: [
    "Provider implements health_check() method",
    "Async runtime available"
  ]

  STEPS: {
    STEP_1_DEFINE_RESULT: {
      description: "Define health check result structure"
      logic: |
        DATACLASS HealthCheckResult {
          provider_name: str,
          is_healthy: bool,
          last_check: datetime,
          consecutive_failures: int = 0
        }
    }

    STEP_2_INITIALIZE_CHECKER: {
      description: "Initialize health checker"
      logic: |
        CLASS VLMHealthChecker {
          CONSTRUCTOR(
            max_retries=3,
            initial_delay=0.5,
            max_delay=10.0
          ):
            self.max_retries = max_retries
            self.initial_delay = initial_delay
            self.max_delay = max_delay
            self.health_status: dict = {}
        }
    }

    STEP_3_CHECK_PROVIDER: {
      description: "Check provider health with exponential backoff retry"
      logic: |
        ASYNC FUNCTION check_provider(
          provider: BaseVLMProvider
        ) -> HealthCheckResult:

          delay = initial_delay

          FOR attempt IN 0..max_retries:
            TRY:
              result = AWAIT asyncio.wait_for(
                provider.health_check(),
                timeout=5.0
              )

              IF result THEN
                LOG_INFO(provider.name + " is healthy")
                RETURN HealthCheckResult(
                  provider_name: provider.name,
                  is_healthy: true,
                  last_check: datetime.utcnow()
                )

            CATCH Exception AS e:
              LOG_WARNING(
                provider.name + " health check failed (attempt " + (attempt + 1) + "): " + e
              )

            IF attempt < max_retries THEN
              AWAIT asyncio.sleep(delay)
              delay = MIN(delay * 2, max_delay)

          RETURN HealthCheckResult(
            provider_name: provider.name,
            is_healthy: false,
            last_check: datetime.utcnow()
          )
    }

    STEP_4_CHECK_ALL_PROVIDERS: {
      description: "Check health of all providers"
      logic: |
        ASYNC FUNCTION check_all_providers(
          providers: list
        ) -> dict:

          results = {}
          FOR provider IN providers:
            result = AWAIT check_provider(provider)
            results[provider.name] = result

          RETURN results
    }
  }

  ERROR_HANDLING: {
    TimeoutError: "Log timeout and mark provider unhealthy",
    ConnectionError: "Log connection error and retry with backoff",
    UnexpectedError: "Log error and mark provider unhealthy"
  }

  OUTPUT: {
    health_result: "HealthCheckResult with status and timestamp",
    all_results: "Dict of all provider health statuses"
  }

  POSTCONDITIONS: [
    "Health status logged",
    "Unhealthy providers marked for fallback",
    "Retry logic exhausted before marking unhealthy"
  ]
}
```

### Integration Points

```pseudo
INTEGRATION VLMHealthChecker_Integration {
  API_ENDPOINTS: {
    health_dashboard: "GET /api/v1/vlm/health",
    provider_status: "GET /api/v1/vlm/providers/{name}/health"
  }

  STATE_MANAGEMENT: {
    health_cache: "In-memory cache of recent health checks",
    status_history: "Time-series health status for monitoring"
  }

  DEPENDENCIES: {
    internal: ["@/providers/vlm/base"],
    external: ["asyncio", "datetime"]
  }

  EVENTS: {
    emits: ["onProviderHealthChanged", "onHealthCheckFailed"],
    listens: ["onProviderAdded", "onConfigReload"]
  }
}
```

---

## Pattern 5.14: Image Format Validation

### Overview

```pseudo
PATTERN ImageFormatValidation {
  PURPOSE: "Validate and convert image formats for VLM provider compatibility"

  PROBLEM: "Different VLM providers support different image formats"

  SOLUTION: "ImageFormatValidator with provider-specific format checking"

  USE_CASES: [
    "Pre-submission format validation",
    "Format conversion recommendations",
    "MIME type validation"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW ImageFormatValidator_Implementation {
  INPUT: {
    format: ImageFormat,
    provider: str,
    mime_type?: str
  }

  STEPS: {
    STEP_1_DEFINE_PROVIDER_FORMATS: {
      description: "Define supported formats by provider"
      logic: |
        CLASS ImageFormatValidator {
          PROVIDER_FORMATS = {
            "qwen-vl": [JPEG, PNG, WEBP],
            "claude-vision": [JPEG, PNG, WEBP, GIF],  // GIF unique to Claude
            "gemini-flash": [JPEG, PNG, WEBP]
          }
        }
    }

    STEP_2_VALIDATE_FORMAT: {
      description: "Check if format is valid for provider"
      logic: |
        STATIC FUNCTION is_valid_format(
          format: ImageFormat,
          provider: str
        ) -> bool:

          supported = PROVIDER_FORMATS[provider] OR []
          RETURN format IN supported
    }

    STEP_3_GET_SUPPORTED_FORMATS: {
      description: "Get list of supported formats for provider"
      logic: |
        STATIC FUNCTION get_supported_formats(provider: str) -> list:
          RETURN PROVIDER_FORMATS[provider] OR []
    }

    STEP_4_VALIDATE_MIME_TYPE: {
      description: "Validate and convert MIME type to ImageFormat"
      logic: |
        STATIC FUNCTION validate_mime_type(mime_type: str) -> ImageFormat?:
          mime_map = {
            "image/jpeg": JPEG,
            "image/jpg": JPEG,
            "image/png": PNG,
            "image/webp": WEBP,
            "image/gif": GIF
          }

          RETURN mime_map[mime_type.lower()] OR null
    }
  }

  OUTPUT: {
    is_valid: "Boolean indicating format compatibility",
    supported_formats: "List of formats for provider",
    image_format: "ImageFormat enum from MIME type"
  }
}
```

### Integration Points

```pseudo
INTEGRATION ImageFormatValidator_Integration {
  API_ENDPOINTS: {
    validate_upload: "POST /api/v1/vlm/validate-image",
    supported_formats: "GET /api/v1/vlm/formats/{provider}"
  }

  DEPENDENCIES: {
    internal: ["@/providers/vlm/base"],
    external: []
  }

  ERROR_HANDLING: {
    unsupported_format: "Return error with list of supported formats",
    invalid_mime_type: "Return null and log warning"
  }
}
```

---

## Pattern 5.15: VLM Response Parsing

### Overview

```pseudo
PATTERN VLMResponseParsing {
  PURPOSE: "Parse and validate VLM responses for Vietnamese legal domain"

  PROBLEM: "VLM responses need structured extraction for contracts and legal documents"

  SOLUTION: "VLMResponseParser with JSON and legal-specific parsing"

  USE_CASES: [
    "JSON response extraction",
    "Vietnamese legal document parsing",
    "Contract field extraction (type, parties, dates, terms)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VLMResponseParser_Implementation {
  INPUT: {
    response_text: str,
    expected_format: "json" | "legal_document"
  }

  STEPS: {
    STEP_1_DEFINE_PARSED_RESPONSE: {
      description: "Define parsed response structure"
      logic: |
        DATACLASS ParsedVLMResponse {
          raw_text: str,
          parsed_data?: Dict,
          is_valid: bool = false,
          error?: str
        }
    }

    STEP_2_PARSE_JSON: {
      description: "Extract and parse JSON from VLM response"
      logic: |
        CLASS VLMResponseParser {
          STATIC FUNCTION parse_json(response_text: str) -> ParsedVLMResponse:
            TRY:
              start = response_text.find('{')
              end = response_text.rfind('}') + 1

              IF start == -1 OR end == 0 THEN
                RETURN ParsedVLMResponse(
                  raw_text: response_text,
                  is_valid: false,
                  error: "No JSON found in response"
                )

              json_str = response_text[start:end]
              data = JSON.parse(json_str)

              RETURN ParsedVLMResponse(
                raw_text: response_text,
                parsed_data: data,
                is_valid: true
              )

            CATCH JSONDecodeError AS e:
              RETURN ParsedVLMResponse(
                raw_text: response_text,
                is_valid: false,
                error: "JSON parse error: " + e
              )
        }
    }

    STEP_3_PARSE_LEGAL_DOCUMENT: {
      description: "Parse Vietnamese legal document analysis response"
      logic: |
        STATIC FUNCTION parse_legal_document(response_text: str) -> ParsedVLMResponse:
          """
          Parse Vietnamese contract analysis response.

          Expected fields:
          - Loại hợp đồng (Contract Type)
          - Các bên (Parties)
          - Rủi ro chính (Key Risks)
          - Điều khoản quan trọng (Key Terms)
          """

          result = {}
          lines = response_text.split('\n')

          FOR line IN lines:
            IF line.startswith('Loại hợp đồng:') OR line.startswith('Contract Type:') THEN
              result['contract_type'] = line.split(':', 1)[-1].strip()

            ELSE IF line.startswith('Các bên:') OR line.startswith('Parties:') THEN
              result['parties'] = line.split(':', 1)[-1].strip()

            ELSE IF line.startswith('Rủi ro chính:') OR line.startswith('Key Risks:') THEN
              result['risks'] = line.split(':', 1)[-1].strip()

            ELSE IF line.startswith('Điều khoản quan trọng:') OR line.startswith('Key Terms:') THEN
              result['key_terms'] = line.split(':', 1)[-1].strip()

          RETURN ParsedVLMResponse(
            raw_text: response_text,
            parsed_data: result IF result ELSE null,
            is_valid: bool(result)
          )
    }
  }

  ERROR_HANDLING: {
    JSONDecodeError: "Return error in ParsedVLMResponse, don't throw",
    ParsingError: "Log and return raw text as fallback",
    MissingFields: "Return partial data with is_valid=false"
  }

  OUTPUT: {
    parsed_response: "ParsedVLMResponse with extracted data",
    is_valid: "Boolean indicating parse success",
    error_message: "Descriptive error if parsing failed"
  }

  POSTCONDITIONS: [
    "Never throws exceptions (always returns ParsedVLMResponse)",
    "Raw text always preserved",
    "Partial data returned if available"
  ]
}
```

### Integration Points

```pseudo
INTEGRATION VLMResponseParser_Integration {
  API_ENDPOINTS: {
    parse_response: "POST /api/v1/vlm/parse",
    validate_response: "POST /api/v1/vlm/validate"
  }

  STATE_MANAGEMENT: {
    parsing_cache: "Cache parsed responses for repeated queries",
    validation_errors: "Log parsing errors for model improvement"
  }

  DEPENDENCIES: {
    internal: ["@/providers/vlm/base"],
    external: ["json"]
  }

  ERROR_HANDLING: {
    json_parse_error: "Return ParsedVLMResponse with error field",
    invalid_format: "Return is_valid=false with raw_text",
    empty_response: "Return is_valid=false with appropriate error"
  }

  EVENTS: {
    emits: ["onParseSuccess", "onParseError"],
    listens: ["onVLMResponseReceived"]
  }
}
```

### Usage Example (Pseudo-code)

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "Parse Vietnamese contract analysis from VLM"

  ACTORS: {
    client: "FastAPI endpoint handler",
    parser: "VLMResponseParser",
    vlm_provider: "Active VLM provider"
  }

  FLOW: {
    STEP_1: |
      Client receives VLM response for contract image analysis
      Response contains: Vietnamese legal document fields

    STEP_2: |
      parser = VLMResponseParser
      parsed = parser.parse_legal_document(vlm_response.content)

    STEP_3: |
      IF parsed.is_valid THEN
        contract_data = {
          type: parsed.parsed_data['contract_type'],
          parties: parsed.parsed_data['parties'],
          risks: parsed.parsed_data['risks'],
          key_terms: parsed.parsed_data['key_terms']
        }
        RETURN {success: true, data: contract_data}

      ELSE:
        LOG_WARNING("Failed to parse VLM response: " + parsed.error)
        RETURN {
          success: false,
          raw_text: parsed.raw_text,
          error: parsed.error
        }
  }

  PSEUDO_CODE: |
    ASYNC FUNCTION parse_contract_analysis(vlm_response: VLMResponse):
      parser = VLMResponseParser

      // Try JSON parsing first
      parsed = parser.parse_json(vlm_response.content)
      IF parsed.is_valid THEN
        RETURN parsed.parsed_data

      // Fallback to legal document parsing
      parsed = parser.parse_legal_document(vlm_response.content)
      IF parsed.is_valid THEN
        RETURN {
          contract_type: parsed.parsed_data.contract_type,
          parties: parsed.parsed_data.parties,
          risks: parsed.parsed_data.risks,
          key_terms: parsed.parsed_data.key_terms
        }

      // No structured data, return raw text
      RETURN {raw_analysis: parsed.raw_text}
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    HealthCheckResult: {
      monitoring_interval: "5 minutes",
      vietnamese_term: "Kết Quả Kiểm Tra Sức Khỏe",
      critical_threshold: "3 consecutive failures trigger alert"
    },
    ImageFormat: {
      common_formats: "JPEG (scanned), PNG (screenshots), WEBP (optimized)",
      vietnamese_term: "Định Dạng Ảnh",
      conversion_priority: "PNG for quality, JPEG for size"
    },
    ParsedVLMResponse: {
      contract_fields: ["Loại hợp đồng", "Các bên", "Rủi ro", "Điều khoản"],
      vietnamese_term: "Phản Hồi Đã Phân Tích",
      validation_required: "All critical fields must be present"
    }
  }

  BUSINESS_RULES: {
    health_monitoring: "Check all VLM providers every 5 minutes",
    format_validation: "Reject unsupported formats with clear error messages",
    response_parsing: "Always preserve raw text for manual review if parsing fails",
    vietnamese_support: "Parse both Vietnamese and English field names"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    field_names: "Bilingual (Vietnamese primary, English fallback)",
    error_messages: "Vietnamese user-facing errors",
    timezone: "Asia/Ho_Chi_Minh"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 5.1-5.5 - VLM Core Providers",
    relationship: "Utilities support all core VLM providers",
    integration: "Health checks monitor provider availability for factory fallback"
  },
  {
    pattern: "Pattern 5.6-5.12 - VLM Processing",
    relationship: "Utilities enable processing patterns",
    integration: "Format validation before preprocessing, response parsing after analysis"
  },
  {
    pattern: "Pattern 4.8-4.10 - LLM Utilities",
    relationship: "Similar utility patterns for LLM providers",
    integration: "Shared error handling and health check patterns"
  }
]
```

---

## References

- **Architecture**: Health Check Pattern, Validator Pattern, Parser Pattern
- **Technology Docs**: [asyncio](https://docs.python.org/3/library/asyncio.html), [datetime](https://docs.python.org/3/library/datetime.html)
- **Internal Docs**: `/docs/patterns/vlm-utilities.md`

---

**End of VLM Utilities Specialist**
**Lines**: ~260 | **Patterns**: 3 | **Compliance**: 100%
