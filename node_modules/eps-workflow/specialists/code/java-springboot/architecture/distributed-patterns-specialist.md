# Distributed Patterns Specialist — Generic
# 分散パターンスペシャリスト — 汎用
# Chuyên Gia Hệ Thống Phân Tán — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 94.1–94.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | Domain, Infrastructure |
| **Cannot Import** | Presentation |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Distributed system patterns: saga, idempotency, distributed locking, outbox, event schema evolution, DLQ, and eventual consistency.

## Patterns

### Pattern 94.1: Saga Pattern
**Choreography** (event-driven — simpler, decentralized):
```
OrderCreated → PaymentService → PaymentCompleted → InventoryService → InventoryReserved → [done]
                                PaymentFailed → OrderService → OrderCancelled (compensation)
```

**Orchestration** (centralized coordinator — better visibility):
```java
@Service
public class OrderSagaOrchestrator {
    public void execute(CreateOrderCommand cmd) {
        Order order = orderService.create(cmd);
        try {
            paymentService.charge(order.getId(), cmd.amount());
            inventoryService.reserve(order.getId(), cmd.items());
            orderService.confirm(order.getId());
        } catch (PaymentException e) {
            orderService.cancel(order.getId(), "Payment failed");  // compensate
        } catch (InventoryException e) {
            paymentService.refund(order.getId());  // compensate
            orderService.cancel(order.getId(), "Inventory unavailable");
        }
    }
}
```
- Choreography: each service knows next step. Simple but hard to trace.
- Orchestration: central coordinator. More code but clear flow + easier monitoring.

### Pattern 94.2: Idempotency
```java
@PostMapping("/payments")
public ResponseEntity<PaymentResult> createPayment(
    @RequestHeader("Idempotency-Key") String idempotencyKey,
    @RequestBody PaymentRequest request) {

    // Check if already processed
    return paymentCache.get(idempotencyKey)
        .map(ResponseEntity::ok)
        .orElseGet(() -> {
            PaymentResult result = paymentService.process(request);
            paymentCache.put(idempotencyKey, result, Duration.ofHours(24));
            return ResponseEntity.status(CREATED).body(result);
        });
}
```
- Client generates `Idempotency-Key` (UUID) — same key = same result
- Store processed results in cache (Redis) with TTL
- CRITICAL for: payment processing, order creation, any non-idempotent POST

### Pattern 94.3: Distributed Locking
```java
// Redis-based (Redisson)
@Service
@RequiredArgsConstructor
public class InventoryService {
    private final RedissonClient redisson;

    public void reserve(String sku, int quantity) {
        RLock lock = redisson.getLock("inventory:" + sku);
        try {
            if (lock.tryLock(5, 30, TimeUnit.SECONDS)) { // wait 5s, hold 30s
                doReserve(sku, quantity);
            } else {
                throw new LockAcquisitionException("Cannot lock SKU: " + sku);
            }
        } finally {
            if (lock.isHeldByCurrentThread()) lock.unlock();
        }
    }
}
```
- Always set TTL on locks — prevent deadlocks if holder crashes
- `tryLock` with timeout — never block indefinitely
- Database alternative: `SELECT ... FOR UPDATE SKIP LOCKED`

### Pattern 94.4: Transactional Outbox Pattern
```java
// 1. Save event in same transaction as business data
@Transactional
public Order createOrder(CreateOrderRequest request) {
    Order order = orderRepository.save(mapToOrder(request));
    outboxRepository.save(new OutboxEvent("OrderCreated", order.getId(), serialize(order)));
    return order;
}

// 2. Background poller publishes to message broker
@Scheduled(fixedDelay = 1000)
@Transactional
public void publishOutboxEvents() {
    List<OutboxEvent> events = outboxRepository.findUnpublished(100);
    for (OutboxEvent event : events) {
        kafkaTemplate.send(event.getTopic(), event.getPayload());
        event.markPublished();
    }
}
```
- Guarantees: business data + event published atomically (or neither)
- Alternative: CDC (Change Data Capture) with Debezium — reads DB changelog

### Pattern 94.5: Event Schema Evolution
```java
// Version in event — consumers handle multiple versions
public record OrderCreatedEvent(
    int schemaVersion,  // 1, 2, 3...
    String orderId,
    // v2: added field (backward compatible)
    @Nullable String customerEmail
) {
    public OrderCreatedEvent(String orderId) {
        this(1, orderId, null); // v1 constructor
    }
}
```
| Change | Backward Compatible? | Action |
|--------|---------------------|--------|
| Add optional field | ✅ Yes | Add with default value |
| Remove field | ❌ No | Deprecate first, remove after consumers updated |
| Rename field | ❌ No | Add new name, keep old, migrate consumers |
| Change field type | ❌ No | New schema version |

- Avro schema registry for strict compatibility enforcement
- Always support at least N-1 schema version

### Pattern 94.6: Dead Letter Queue (DLQ)
```java
// Kafka DLT (Dead Letter Topic) — Spring Kafka
@KafkaListener(topics = "orders")
@RetryableTopic(
    attempts = "3",
    backoff = @Backoff(delay = 1000, multiplier = 2),
    dltStrategy = DltStrategy.FAIL_ON_ERROR
)
public void processOrder(OrderEvent event) {
    orderService.process(event); // throws → retried, then DLT
}

@DltHandler
public void handleDlt(OrderEvent event) {
    log.error("Failed after retries: {}", event);
    alertService.notifyOps("Order processing failed", event);
}
```
- Retry with exponential backoff FIRST
- After max retries → move to DLQ for manual investigation
- Monitor DLQ depth — alert if growing

### Pattern 94.7: Eventual Consistency Patterns
```java
// Read-your-writes: client passes version token
@GetMapping("/orders/{id}")
public OrderDTO getOrder(@PathVariable Long id,
                          @RequestHeader(value = "If-None-Match", required = false) String etag) {
    Order order = orderService.findById(id);
    String currentEtag = "\"" + order.getVersion() + "\"";
    if (currentEtag.equals(etag)) return ResponseEntity.status(NOT_MODIFIED).build();
    return ResponseEntity.ok().eTag(currentEtag).body(mapToDTO(order));
}
```
- Accept eventual consistency for reads — optimize for availability
- Use ETags for cache validation and optimistic concurrency
- UI: optimistic updates (show success immediately, reconcile later)

## REJECTED Patterns
- ❌ Distributed transactions (2PC) — use Saga instead
- ❌ Locks without TTL — deadlock risk
- ❌ Direct DB calls across service boundaries — use API/events
- ❌ Ignoring DLQ messages — they indicate real failures
- ❌ Tight coupling between event producer and consumer schemas

## Related Specialists
- `messaging/kafka-specialist.md` — Kafka producer/consumer mechanics (30.x)
- `patterns/resilience-specialist.md` — Circuit breaker (40.x)
- `cross-cutting/domain-events-specialist.md` — In-process events (78.x)
- `data-access/transaction-management-specialist.md` — Local transactions (84.x)
