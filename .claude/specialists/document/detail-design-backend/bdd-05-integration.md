# BDD Micro-Agent: Integration (Section 05)

## Agent Identity
- **ID**: bdd-05-integration
- **Section**: 05 - Integration & External Services
- **Output Lines**: 700-900
- **Version**: 4.0 (Merged Agent+Template)
- **Scope**: External service integration, message queues, distributed transactions

## Purpose
Generate integration specifications for Backend Detail Design. This agent contains the complete pseudo-code logic for generating external service integration specs, message queue patterns, and distributed transaction strategies.

## Prerequisites / Context Loading

```pseudo
# Context from orchestrator
feature_name = ENV.FEATURE_NAME
sub_feature = ENV.SUB_FEATURE

# Read Basic Design for integrations
bd_path = f"documents/features/{feature_name}/{feature_name}-{sub_feature}-basic-design.md"
bd_content = file.read(bd_path)
integrations = extract_section(bd_content, "## 5. Integration Design")
```

## Pseudo-Code Logic

```pseudo
# FUNCTION: generate_section_5()
# Purpose: Generate complete Section 5 with 4 subsections (SPECIFICATIONS ONLY)
# Input: Basic Design Section 5 (integrations), Frontend DD (event needs)
# Returns: Section 5.1-5.4 (NO Axios/HTTP client code, NO event handler code)

FUNCTION generate_section_5():
    # STEP 1: Load Basic Design integrations
    feature_name = ENV.FEATURE_NAME
    sub_feature = ENV.SUB_FEATURE
    bd_path = f"documents/features/{feature_name}/{feature_name}-{sub_feature}-basic-design.md"
    bd_content = read_file(bd_path)
    integrations = extract_section(bd_content, "## 5. Integration Design")

    # STEP 2: Parse integration types
    external_apis = extract_external_apis(integrations)
    message_queue_events = extract_message_queue_events(integrations)
    inter_service_calls = extract_inter_service_calls(integrations)
    webhooks = extract_webhooks(integrations)

    # STEP 3: Generate 4 subsections (SPECIFICATIONS ONLY)
    section_5_1 = generate_section_5_1(external_apis)      # External APIs
    section_5_2 = generate_section_5_2(message_queue_events)  # Message Queue
    section_5_3 = generate_section_5_3(inter_service_calls)   # Inter-service
    section_5_4 = generate_section_5_4(webhooks)           # Webhooks

    output = f"""## 5. Integration Design

{section_5_1}

---

{section_5_2}

---

{section_5_3}

---

{section_5_4}

---
"""

    # STEP 4: Validate NO code (Q4 gate)
    IF contains_http_client_code(output):
        raise Error("Q4 FAIL: Found HTTP client code (Axios, fetch) - use specifications only")

    IF contains_event_handler_code(output):
        raise Error("Q4 FAIL: Found event handler code - use specifications only")

    RETURN output

# SUBSECTION 1: External APIs (Synchronous HTTP/REST Calls)

FUNCTION generate_section_5_1(external_apis):
    output = """### 5.1 External API Integrations

> **Mục đích**: Định nghĩa các external systems mà service này gọi (synchronous HTTP/REST)

"""

    IF NOT external_apis:
        output += """_This service does not integrate with external APIs._

"""
        RETURN output

    FOR each api IN external_apis:
        output += f"""#### {api.name} API Integration

**Purpose** (Vietnamese): {api.purpose_vn}

**API Specifications:**

| Attribute | Value |
|-----------|-------|
| **Provider** | {api.provider} |
| **Base URL** | {api.base_url} |
| **Protocol** | {api.protocol} (e.g., REST, GraphQL, SOAP) |
| **Authentication** | {api.auth_type} (e.g., API Key, OAuth 2.0, JWT) |
| **Timeout** | {api.timeout}ms |
| **Retry Strategy** | {api.retry_strategy} |

**Endpoints Used:**

| Method | Endpoint | Purpose (VN) | Request Data | Response Data | Error Handling |
|--------|----------|--------------|--------------|---------------|----------------|
"""
        FOR each endpoint IN api.endpoints:
            output += f"| {endpoint.method} | {endpoint.path} | {endpoint.purpose_vn} | {endpoint.request_summary} | {endpoint.response_summary} | {endpoint.error_handling} |\n"

        output += f"""
**Authentication Flow:**

{api.auth_flow_description}

**Error Handling Strategy:**

| Error Type | HTTP Status | Action | Fallback |
|------------|-------------|--------|----------|
"""
        FOR each error IN api.error_handling:
            output += f"| {error.type} | {error.http_status} | {error.action} | {error.fallback} |\n"

        output += f"""
**Rate Limiting:**

- **Limit**: {api.rate_limit.limit} requests per {api.rate_limit.window}
- **Strategy**: {api.rate_limit.strategy_vn}
- **Exceeded Action**: {api.rate_limit.exceeded_action_vn}

**Data Mapping:**

- External model: `{api.external_model}`
- Internal model: `{api.internal_model}`
- Mapping logic: {api.mapping_logic_vn}

"""

    output += """
**Notes**:
- HTTP client implementation in Specialists (`specialists/code/nestjs-blockchain/http-client.md`)
- Retry logic implementation in Specialists
- Authentication token management in Specialists
"""

    RETURN output

# SUBSECTION 2: Message Queue (Asynchronous Events)

FUNCTION generate_section_5_2(message_queue_events):
    output = """### 5.2 Message Queue Integration (RabbitMQ / Kafka)

> **Mục đích**: Định nghĩa các events mà service này publish/consume (asynchronous messaging)

"""

    IF NOT message_queue_events:
        output += """_This service does not use message queue._

"""
        RETURN output

    output += """**Message Broker Configuration:**

| Attribute | Value |
|-----------|-------|
| **Broker Type** | RabbitMQ / Kafka / AWS SQS |
| **Connection** | From environment variable `MESSAGE_BROKER_URL` |
| **Exchange/Topic** | {exchange_name} |
| **Queue Naming** | {naming_convention} |

#### Published Events (Outbound)

_Events that this service publishes for other services to consume._

"""

    FOR each event IN message_queue_events.published:
        output += f"""**Event: `{event.name}`**

| Attribute | Value |
|-----------|-------|
| **Purpose** (VN) | {event.purpose_vn} |
| **Routing Key** | {event.routing_key} |
| **Exchange** | {event.exchange} |
| **Trigger** | {event.trigger_vn} |
| **Delivery Mode** | {event.delivery_mode} (Persistent / Transient) |

**Event Payload Specification:**

| Field | Type | Required | Description (VN) |
|-------|------|----------|------------------|
"""
        FOR each field IN event.payload_fields:
            required_str = "Yes" IF field.required ELSE "No"
            output += f"| {field.name} | {field.type} | {required_str} | {field.description_vn} |\n"

        output += """
**Consumers** (which services consume this event):
"""
        FOR each consumer IN event.consumers:
            output += f"- {consumer.service_name}: {consumer.action_vn}\n"

        output += "\n"

    output += """#### Consumed Events (Inbound)

_Events that this service consumes from other services._

"""

    FOR each event IN message_queue_events.consumed:
        output += f"""**Event: `{event.name}`**

| Attribute | Value |
|-----------|-------|
| **Purpose** (VN) | {event.purpose_vn} |
| **Queue** | {event.queue_name} |
| **Publisher** | {event.publisher_service} |
| **Acknowledgment** | {event.ack_mode} (Auto / Manual) |
| **Retry Policy** | {event.retry_policy} |

**Event Payload Specification:**

| Field | Type | Required | Description (VN) |
|-------|------|----------|------------------|
"""
        FOR each field IN event.payload_fields:
            required_str = "Yes" IF field.required ELSE "No"
            output += f"| {field.name} | {field.type} | {required_str} | {field.description_vn} |\n"

        output += f"""
**Processing Logic** (text description):

{event.processing_logic_vn}

**Error Handling:**

| Error Type | Action | Dead Letter Queue |
|------------|--------|-------------------|
"""
        FOR each error IN event.error_handling:
            output += f"| {error.type} | {error.action} | {error.dlq} |\n"

        output += "\n"

    output += """
**Notes**:
- Message broker client implementation in Specialists (`specialists/code/nestjs-blockchain/rabbitmq.md`)
- Event handler implementation in Specialists
- Serialization (JSON / Protobuf / Avro) handled by messaging library
"""

    RETURN output

# SUBSECTION 3: Inter-service Communication

FUNCTION generate_section_5_3(inter_service_calls):
    output = """### 5.3 Inter-service Communication

> **Mục đích**: Định nghĩa communication với các microservices khác trong hệ thống

"""

    IF NOT inter_service_calls:
        output += """_This service does not communicate with other internal microservices directly._

"""
        RETURN output

    FOR each service IN inter_service_calls:
        output += f"""#### Service: `{service.name}`

**Purpose** (Vietnamese): {service.purpose_vn}

**Communication Specifications:**

| Attribute | Value |
|-----------|-------|
| **Protocol** | {service.protocol} (HTTP REST / gRPC / GraphQL) |
| **Service URL** | {service.url} (from service discovery or env var) |
| **Authentication** | {service.auth_type} (JWT / API Key / mTLS) |
| **Timeout** | {service.timeout}ms |
| **Circuit Breaker** | {service.circuit_breaker} (Enabled / Disabled) |

**Called Endpoints:**

| Method | Endpoint | Purpose (VN) | Request Data | Response Data | Fallback Strategy |
|--------|----------|--------------|--------------|---------------|-------------------|
"""
        FOR each endpoint IN service.endpoints:
            output += f"| {endpoint.method} | {endpoint.path} | {endpoint.purpose_vn} | {endpoint.request} | {endpoint.response} | {endpoint.fallback} |\n"

        output += f"""
**Resilience Patterns:**

- **Circuit Breaker**: {service.circuit_breaker_config}
- **Retry Policy**: {service.retry_policy}
- **Fallback**: {service.fallback_strategy_vn}
- **Timeout**: {service.timeout}ms

**Data Flow** (text description):

{service.data_flow_vn}

"""

    output += """
**Notes**:
- Service discovery (Consul / Eureka / Kubernetes DNS) configuration in Specialists
- Circuit breaker implementation (Hystrix / Resilience4j) in Specialists
- Load balancing handled by service mesh (Istio) or client-side (Round Robin)
"""

    RETURN output

# SUBSECTION 4: Webhooks (Callback Endpoints)

FUNCTION generate_section_5_4(webhooks):
    output = """### 5.4 Webhooks (Callback Endpoints)

> **Mục đích**: Định nghĩa webhook endpoints mà service này expose cho external systems

"""

    IF NOT webhooks:
        output += """_This service does not expose webhook endpoints._

"""
        RETURN output

    FOR each webhook IN webhooks:
        output += f"""#### Webhook: `{webhook.name}`

**Purpose** (Vietnamese): {webhook.purpose_vn}

**Webhook Specifications:**

| Attribute | Value |
|-----------|-------|
| **Endpoint** | {webhook.endpoint} |
| **Method** | {webhook.method} (usually POST) |
| **Trigger Source** | {webhook.trigger_source} (e.g., Payment Gateway, Blockchain Event) |
| **Authentication** | {webhook.auth_type} (HMAC Signature / API Key / None) |
| **Idempotency** | {webhook.idempotency} (Enabled / Disabled) |

**Expected Payload:**

| Field | Type | Required | Description (VN) |
|-------|------|----------|------------------|
"""
        FOR each field IN webhook.payload_fields:
            required_str = "Yes" IF field.required ELSE "No"
            output += f"| {field.name} | {field.type} | {required_str} | {field.description_vn} |\n"

        output += f"""
**Processing Logic** (text description):

{webhook.processing_logic_vn}

**Response Specification:**

| HTTP Status | Condition | Response Body |
|-------------|-----------|---------------|
"""
        FOR each response IN webhook.responses:
            output += f"| {response.status} | {response.condition} | {response.body} |\n"

        output += f"""
**Security:**

- **Signature Verification**: {webhook.signature_verification}
- **IP Whitelist**: {webhook.ip_whitelist}
- **Rate Limiting**: {webhook.rate_limit}

**Idempotency Strategy:**

{webhook.idempotency_strategy_vn}

"""

    output += """
**Notes**:
- Webhook handler implementation in Specialists (`specialists/code/nestjs-blockchain/webhooks.md`)
- HMAC signature verification in Specialists
- Idempotency key handling (database-based deduplication) in Specialists
"""

    RETURN output

# VALIDATION FUNCTIONS (Q4 Gate)

FUNCTION contains_http_client_code(output):
    # Check for HTTP client code (Axios, fetch, HttpService)
    patterns = ["axios.", "fetch(", "HttpService", "httpService", "@nestjs/axios"]
    FOR each pattern IN patterns:
        IF pattern IN output:
            RETURN True
    RETURN False

FUNCTION contains_event_handler_code(output):
    # Check for event handler decorators/code
    patterns = ["@EventPattern", "@MessagePattern", "@RabbitSubscribe", "async handle"]
    FOR each pattern IN patterns:
        IF pattern IN output:
            RETURN True
    RETURN False
```

---

## Validation (Q1-Q4)

### Q1: Evidence-Based?
- [ ] All 4 subsections present (5.1-5.4)?
- [ ] Integrations derived from Basic Design Section 5?
- [ ] External APIs documented with specifications?
- [ ] Message queue events documented with payload specs?

### Q2: Consistency?
- [ ] External API endpoints match what's called in Section 3 (API Endpoints)?
- [ ] Message queue events match what's described in architecture?
- [ ] Inter-service calls consistent with system architecture?

### Q3: Vietnamese >=60%?
- [ ] Integration purposes in Vietnamese
- [ ] Processing logic descriptions in Vietnamese
- [ ] Error handling strategies in Vietnamese

### Q4: No Prohibited Content? -- **STRENGTHENED**
- [ ] **ZERO** HTTP client code (Axios, fetch, HttpService)?
- [ ] **ZERO** event handler decorators (@EventPattern, @MessagePattern)?
- [ ] **ZERO** implementation code?
- [ ] **ONLY** specification tables, text descriptions?

---

## Output Format

```markdown
## 5. Integration Design
### 5.1 External Service Integrations
### 5.2 Message Queue Patterns
### 5.3 Circuit Breaker & Retry
### 5.4 Distributed Transactions
### 5.5 Data Synchronization
```

---

## Error Handling

| Error Condition | Action | Fallback |
|-----------------|--------|----------|
| Basic Design missing integration section | Generate minimal structure with placeholders | Warn in output |
| Q4 validation fails (code detected) | Raise error, regenerate without code | Strip code blocks |
| External API info incomplete | Use placeholder specifications | Mark as TODO |

---

## Notes

**Key Principle**: Describe integrations, NOT implement them.

**Allowed**:
- API specification **tables** (endpoints, methods, payloads)
- Event payload specification **tables**
- Authentication/authorization descriptions
- Error handling strategy **tables**
- Data flow text descriptions

**Prohibited**:
- HTTP client code (Axios, fetch)
- Event handler code (@EventPattern decorators)
- Message broker connection code
- Webhook handler implementation

**Output Size**: ~500-600 lines (expanded from 92-line stub)

**Where to find implementation code**:
- HTTP client patterns: `specialists/code/nestjs-blockchain/http-client.md`
- RabbitMQ patterns: `specialists/code/nestjs-blockchain/rabbitmq.md`
- Webhook handlers: `specialists/code/nestjs-blockchain/webhooks.md`

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (`bdd-05-integration.md`) and template (`05-integration.md`) into single file
- Removed JIT Template Loading section (dead path)
- All pseudo-code logic now inline in agent

**v3.1 (2026-01-27)**:
- Updated to use Template v2.0 (NO CODE philosophy)
- Removed code examples, only specifications and tables
- Strengthened Q4 validation (no decorators, no implementation code)
- Templates expanded from stubs to full specifications

**v3.0 (2025-12-13)**: Migrated to JIT template loading, agent size reduced to ~220 lines (from ~803 lines in v2.0)

---

*BDD Micro-Agent: Integration - v4.0 | Merged Agent+Template*
