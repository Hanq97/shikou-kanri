# Kafka Specialist

**Role**: Event Streaming & Messaging Expert
**Technology Stack**: Apache Kafka 3.8.1, Spring Kafka, Spring Cloud Stream
**Integration**: StarX4CRM Backend Microservices
**Version**: Spring Boot 3.4.4, Spring Kafka 3.x

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.kafka`, `{rootPackage}.infrastructure.config.properties` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 30.1–30.6 |
| **Source Paths** | `{sourceRoot}/infrastructure/kafka/`, `{sourceRoot}/infrastructure/config/` |
| **File Count** | ~15 Kafka-related files |
| **Naming Convention** | `Kafka*Config.java`, `*EventPublisher.java`, `*Listener.java` |
| **Base Class** | `@KafkaListener` (annotation), `KafkaProperties` (config) |
| **Imports From** | Application (event DTOs), Domain (domain events) |
| **Cannot Import** | `rest.*` (Presentation layer) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

> **Container Image**: `apache/kafka:3.8.1` (NOT `confluentinc/cp-kafka`)

---

## Expertise Areas

1. **Producer Configuration**: ProducerFactory, KafkaTemplate, serialization
2. **Consumer Configuration**: ConsumerFactory, KafkaListenerContainerFactory, manual ACK
3. **Spring Cloud Stream**: Functional-style bindings, kafkaConsumer-in-0 / kafkaProducer-out-0
4. **Topic Design**: Partition strategy, consumer groups, retention
5. **Event-Driven Architecture**: Domain events, outbox pattern, saga orchestration

---

## Pattern Index

- [Pattern 30.1: Producer Factory & KafkaTemplate](#pattern-301-producer-factory--kafkatemplate)
- [Pattern 30.2: Consumer Factory with Manual ACK](#pattern-302-consumer-factory-with-manual-ack)
- [Pattern 30.3: KafkaListenerContainerFactory Configuration](#pattern-303-kafkalistenercontainerfactory-configuration)
- [Pattern 30.4: Spring Cloud Stream Bindings](#pattern-304-spring-cloud-stream-bindings)
- [Pattern 30.5: Consumer Groups & Topic Design](#pattern-305-consumer-groups--topic-design)
- [Pattern 30.6: Domain Event Publishing](#pattern-306-domain-event-publishing)

---

## Pattern 30.1: Producer Factory & KafkaTemplate

**Use Case**: Configure reliable Kafka producers for domain event publishing.

```java
// config/KafkaProducerConfig.java
@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        config.put(ProducerConfig.ACKS_CONFIG, "all");
        config.put(ProducerConfig.RETRIES_CONFIG, 3);
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}

// messaging/UserEventPublisher.java
@Component
@RequiredArgsConstructor
public class UserEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishUserUpdated(String userId, UserUpdatedEvent event) {
        kafkaTemplate.send("UPDATE_USER", userId, event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish UserUpdated for userId={}", userId, ex);
                } else {
                    log.debug("Published UserUpdated: userId={}, partition={}, offset={}",
                        userId,
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}
```

**Key Points**:
- ACKs=all for durability, idempotence enabled to prevent duplicates
- Per-entity key (userId) ensures ordering within a partition
- Async send with completion callback for error logging

---

## Pattern 30.2: Consumer Factory with Manual ACK

**Use Case**: Manual acknowledgement for at-least-once reliable processing.

```java
// config/KafkaConsumerConfig.java
@Configuration
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ConsumerConfig.GROUP_ID_CONFIG, "core-manager-group");
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        config.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        config.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 10);
        config.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);
        config.put(JsonDeserializer.TRUSTED_PACKAGES, "{rootPackage}.application.event.*");
        return new DefaultKafkaConsumerFactory<>(config);
    }
}
```

---

## Pattern 30.3: KafkaListenerContainerFactory Configuration

**Use Case**: Container factory with MANUAL_IMMEDIATE ACK mode.

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, Object>
        kafkaListenerContainerFactory() {
    var factory = new ConcurrentKafkaListenerContainerFactory<String, Object>();
    factory.setConsumerFactory(consumerFactory());
    factory.setConcurrency(3); // matches partition count for UPDATE_USER topic
    factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
    factory.getContainerProperties().setPollTimeout(3000);
    factory.setCommonErrorHandler(new DefaultErrorHandler(
        new FixedBackOff(1000L, 3L))); // retry 3 times, 1s interval
    return factory;
}

// listener/UserUpdateListener.java
@Component
@RequiredArgsConstructor
@Slf4j
public class UserUpdateListener {

    private final UserSyncService userSyncService;

    @KafkaListener(
        topics = "UPDATE_USER",
        groupId = "core-manager-group",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleUserUpdate(
            ConsumerRecord<String, UserUpdatedEvent> record,
            Acknowledgment ack) {
        try {
            log.debug("Received UserUpdated: key={}, partition={}, offset={}",
                record.key(), record.partition(), record.offset());
            userSyncService.syncUser(record.value());
            ack.acknowledge(); // commit only after successful processing
        } catch (Exception e) {
            log.error("Failed to process UserUpdated: key={}", record.key(), e);
            // Do NOT ack - let error handler retry
            throw e;
        }
    }
}
```

---

## Pattern 30.4: Spring Cloud Stream Bindings

**Use Case**: Functional-style Kafka binding for notification and lifecycle events.

```yaml
# application.yml
spring:
  cloud:
    stream:
      bindings:
        kafkaConsumer-in-0:
          destination: notifications.user
          group: core-manager-notifications
        kafkaProducer-out-0:
          destination: tenants.lifecycle.events
      kafka:
        bindings:
          kafkaConsumer-in-0:
            consumer:
              start-offset: earliest
```

```java
// config/StreamFunctionConfig.java
@Configuration
public class StreamFunctionConfig {

    @Bean
    public Consumer<Message<NotificationEvent>> kafkaConsumer(
            NotificationService notificationService) {
        return message -> {
            var event = message.getPayload();
            notificationService.process(event);
        };
    }

    @Bean
    public Supplier<Flux<TenantLifecycleEvent>> kafkaProducer(
            TenantEventSource eventSource) {
        return eventSource::stream;
    }
}
```

---

## Pattern 30.5: Consumer Groups & Topic Design

**Use Case**: Topic naming conventions and partition strategy for StarX4CRM.

```
Topics:
  UPDATE_USER              3 partitions  (user update sync across microservices)
  notifications.*          1 partition   (per-tenant notification channels)
  tenants.lifecycle.*      1 partition   (tenant create/suspend/delete events)
  jobs.*                   2 partitions  (background job triggers)

Consumer Groups:
  core-manager-group       Consumes: UPDATE_USER, jobs.*
  sfa-manager-group        Consumes: UPDATE_USER
  tenant-manager-group     Consumes: tenants.lifecycle.*
  gateway-sse-group        Consumes: notifications.*  (SSE push to clients)
```

```java
// config/KafkaTopicConfig.java
@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic updateUserTopic() {
        return TopicBuilder.name("UPDATE_USER")
            .partitions(3)
            .replicas(1)
            .config(TopicConfig.RETENTION_MS_CONFIG, String.valueOf(7 * 24 * 60 * 60 * 1000L))
            .build();
    }

    @Bean
    public NewTopic tenantLifecycleTopic() {
        return TopicBuilder.name("tenants.lifecycle.events")
            .partitions(1)
            .replicas(1)
            .build();
    }
}
```

---

## Pattern 30.6: Domain Event Publishing

**Use Case**: Event-driven updates across microservices after DB writes.

```java
// domain/events/UserUpdatedEvent.java
public record UserUpdatedEvent(
    String userId,
    String tenantId,
    String email,
    String fullName,
    Instant occurredAt
) {}

// service/UserCommandService.java
@Service
@RequiredArgsConstructor
public class UserCommandServiceImpl implements UserCommandService {
    private final UserRepository userRepository;
    private final UserEventPublisher eventPublisher;

    @Transactional
    public Mono<UserDto> updateUser(String userId, UpdateUserRequest request) {
        return userRepository.findById(userId)
            .flatMap(user -> {
                user.setEmail(request.email());
                user.setFullName(request.fullName());
                return userRepository.save(user);
            })
            .doOnNext(saved -> eventPublisher.publishUserUpdated(
                saved.getId(),
                new UserUpdatedEvent(
                    saved.getId(), saved.getTenantId(),
                    saved.getEmail(), saved.getFullName(),
                    Instant.now()
                )
            ))
            .map(UserMapper::toDto);
    }
}
```

---

## Anti-Patterns

- NO `AUTO_COMMIT=true` with manual business logic — messages lost on crash
- NO blocking calls inside `@KafkaListener` — use reactive chain or executor
- NO storing large payloads in Kafka messages (>1MB) — use reference IDs
- NO sharing consumer groups between unrelated services — creates unexpected consumption

---

## Related Specialists

- `application/java-reactive-specialist.md` - Reactor operators used in event handlers
- `multitenancy/multitenancy-specialist.md` - Tenant context in Kafka consumers
- `gateway/gateway-specialist.md` - SSE push from Kafka to frontend
- `cache/cache-specialist.md` - Cache invalidation triggered by Kafka events

