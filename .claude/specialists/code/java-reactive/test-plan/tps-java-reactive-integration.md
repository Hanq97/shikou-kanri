---
id: tps-java-reactive-integration
stack: java-reactive
type: integration
category: test-plan
subcategory: reactive
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E7]
---

# Integration Test Patterns for Java Reactive
# Java Reactiveの統合テストパターン

## SECTION 1: PATTERNS

### Full Context Testing
- `@SpringBootTest(webEnvironment = RANDOM_PORT)` — full application context
- `@Autowired WebTestClient` — real HTTP calls to running server
- `@ServiceConnection` — auto-configure Testcontainers connections

### Testcontainers Setup
- `@Testcontainers` + `@Container` — lifecycle-managed containers
- `PostgreSQLContainer` — real PostgreSQL for R2DBC tests
- `RedisContainer` — real Redis for cache integration
- `KafkaContainer` — real Kafka for messaging tests
- `@DynamicPropertySource` — inject container URLs into Spring context

### WebTestClient Integration
- `webTestClient.post().uri("/api/v1/resource")` — real endpoint call
- `.header("Authorization", "Bearer " + token)` — auth headers
- `.bodyValue(requestDto)` — request body
- `.exchange()` — execute and get response

### Database Setup/Teardown
- `@Sql("/test-data.sql")` — pre-load test data
- `R2dbcEntityTemplate.insert()` — programmatic test data
- `@Transactional` NOT supported in R2DBC — use manual cleanup
- `deleteAll()` in `@AfterEach` — ensure clean state

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| Full API flow | @SpringBootTest + WebTestClient | End-to-end within service |
| DB integration | Testcontainers PostgreSQL + @ServiceConnection | Real DB, no mocks |
| Cache integration | Testcontainers Redis | Real cache behavior |
| Cross-service call | WireMock + WebClient | Mock external service |
| Kafka publish/consume | Testcontainers Kafka | Real messaging |
| Auth integration | Keycloak Testcontainer or mock JWT | Real/mock OIDC |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `test_{useCase}_{fullFlow}_{expectedOutcome}`
- Example: `test_createCustomer_withValidData_returnsCreatedAndPersisted`

### Assertion Requirements
- Minimum 3 assertions per integration test
- Must verify: HTTP status + response body + side effects (DB/cache/event)
- Verify data persistence after API call

### Coverage Targets
- Focus on critical paths (CRUD + business rules)
- Each API endpoint has at least 1 integration test
- Error paths: at least validation error + not found + auth error

### Test Isolation
- Each test method must be independent
- No shared mutable state between tests
- Use `@DynamicPropertySource` instead of hardcoded ports
