# Server-Sent Events (SSE) Specialist

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure + Presentation |
| **Package** | `{rootPackage}.infrastructure.web`, `{rootPackage}.rest` |
| **Maven Module** | `common` + `gateway` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 81.1–81.2 |
| **Source Paths** | `{sourceRoot}/infrastructure/web/`, `{sourceRoot}/rest/` |
| **File Count** | ~3 SSE files |
| **Naming Convention** | `*SseController.java`, `*NotificationSink.java` |
| **Base Class** | `Sinks.Many<ServerSentEvent>` |
| **Imports From** | Application (notification DTOs), Domain (events) |
| **Cannot Import** | Domain directly (via presentation layer) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

> **Cross-Reference**: Gateway-specific SSE implementation is in
> `gateway/gateway-specialist.md` (Pattern 35.4). This specialist covers the
> general cross-cutting SSE/Sinks.Many pattern applicable to any service.

---

**Title**: Kafka-Driven SSE Push for Real-Time Notification Delivery
**Domain**: Cross-Cutting / Real-Time
**Pattern Range**: 81.1–81.2

---

## Description

StarX4CRM delivers real-time notifications to browser clients via Server-Sent Events.
A Kafka consumer (Spring Cloud Stream) subscribes to notification topics and bridges
messages into a reactive `Sinks.Many` sink. The SSE endpoint streams this sink to the
client. The gateway routes SSE requests to the notification service without buffering.

---

## Key Concepts

- **Spring Cloud Stream**: functional binding style (`Consumer<Flux<...>>`)
- **`Sinks.Many<ServerSentEvent<?>>`**: thread-safe multi-cast reactive sink
- **`text/event-stream`**: SSE media type — browser EventSource compatible
- **Gateway routing**: SSE endpoints require `streaming: true` in gateway routes
- **Client reconnect**: `retry` field tells EventSource the reconnect interval (ms)
- **Heartbeat**: periodic empty events keep proxies from closing idle connections

---

## Pattern 81.1 — Kafka Consumer → SSE Sink

```java
package {rootPackage}.gateway.sse;

import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.core.publisher.Sinks.Many;

import java.time.Duration;
import java.util.function.Consumer;

@Service
public class NotificationSseService {

    // Multicast: up to 256 queued events; on overflow drop oldest
    private final Many<ServerSentEvent<NotificationDTO>> sink =
        Sinks.many().multicast().onBackpressureBuffer(256, false);

    /**
     * Spring Cloud Stream binding: topic → method.
     * Binding name must match spring.cloud.stream.bindings.notificationConsumer-in-0
     */
    public Consumer<NotificationDTO> notificationConsumer() {
        return notification -> {
            var event = ServerSentEvent.<NotificationDTO>builder()
                .id(notification.id())
                .event(notification.type())
                .data(notification)
                .retry(Duration.ofSeconds(5))
                .build();

            sink.tryEmitNext(event);
        };
    }

    /** Public stream exposed to SSE endpoint. Heartbeat every 30 s. */
    public Flux<ServerSentEvent<NotificationDTO>> stream(String userId) {
        var heartbeat = Flux.interval(Duration.ofSeconds(30))
            .map(i -> ServerSentEvent.<NotificationDTO>builder()
                .comment("heartbeat")
                .build());

        return Flux.merge(
            sink.asFlux().filter(e -> isForUser(e, userId)),
            heartbeat
        );
    }

    private boolean isForUser(ServerSentEvent<NotificationDTO> event, String userId) {
        return event.data() == null  // heartbeat
            || userId.equals(event.data().targetUserId())
            || event.data().broadcast();
    }
}
```

### Spring Cloud Stream Binding Config

```yaml
spring:
  cloud:
    stream:
      bindings:
        notificationConsumer-in-0:
          destination: notification-events
          group: sse-gateway
          content-type: application/json
      kafka:
        bindings:
          notificationConsumer-in-0:
            consumer:
              startOffset: latest
              resetOffsets: false
```

---

## Pattern 81.2 — SSE Endpoint and Gateway Routing

```java
package {rootPackage}.gateway.sse;

import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationSseEndpoint {

    private final NotificationSseService sseService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<NotificationDTO>> stream(
            @AuthenticationPrincipal Jwt jwt) {

        String userId = jwt.getSubject();
        return sseService.stream(userId);
    }
}
```

### Gateway Route Configuration

```yaml
# application.yml (gateway)
spring:
  cloud:
    gateway:
      routes:
        - id: sse-notifications
          uri: http://core-manager:8082
          predicates:
            - Path=/api/notifications/stream
          filters:
            - RemoveRequestHeader=Accept-Encoding   # prevent gzip — SSE requires streaming
          metadata:
            response-timeout: 0      # no timeout for long-lived SSE connections
            connect-timeout: 5000
```

### Frontend (Next.js EventSource)

```typescript
// src/infrastructure/api/notificationSseClient.ts
export function connectNotificationStream(
  onMessage: (evt: NotificationDTO) => void,
  onError?: (err: Event) => void
): EventSource {
  const es = new EventSource('/api/notifications/stream', {
    withCredentials: true,   // sends session cookie / bearer
  });

  es.addEventListener('TASK_ASSIGNED', (e) => onMessage(JSON.parse(e.data)));
  es.addEventListener('ALERT',         (e) => onMessage(JSON.parse(e.data)));
  es.onerror = onError ?? (() => {});

  return es;   // caller must call es.close() on component unmount
}
```

---

## Pattern 81.3 — WebSocket with STOMP (Variant: ALL)

**Use Case**: Bidirectional real-time communication — chat, collaborative editing, live dashboards.

### When to choose WebSocket vs SSE
| Criteria | SSE | WebSocket |
|----------|-----|-----------|
| Direction | Server → Client only | Bidirectional |
| Protocol | HTTP/1.1+ | WS:// (upgrade from HTTP) |
| Auto-reconnect | Built-in (EventSource) | Manual |
| Binary data | No (text only) | Yes |
| Load balancer | Standard HTTP | Needs sticky sessions or WS support |
| **Use when** | Notifications, feeds, progress | Chat, gaming, collaborative editing |

### Spring WebSocket + STOMP Configuration
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Simple in-memory broker (use RabbitMQ/ActiveMQ for multi-instance)
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");  // per-user messages
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();  // fallback for browsers without WebSocket
    }
}
```

### Message Controller
```java
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    // Client sends to /app/chat.send → broadcast to /topic/chat
    @MessageMapping("/chat.send")
    @SendTo("/topic/chat")
    public ChatMessage send(@Payload ChatMessage message,
                            SimpMessageHeaderAccessor headerAccessor) {
        message.setTimestamp(Instant.now());
        return message;
    }

    // Send to specific user via /user/{userId}/queue/notifications
    public void sendToUser(String userId, NotificationDTO notification) {
        messagingTemplate.convertAndSendToUser(
            userId, "/queue/notifications", notification);
    }
}
```

### WebSocket Security
```java
@Configuration
public class WebSocketSecurityConfig {

    @Bean
    public ChannelInterceptor authChannelInterceptor(JwtDecoder jwtDecoder) {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = accessor.getFirstNativeHeader("Authorization");
                    if (token != null && token.startsWith("Bearer ")) {
                        Jwt jwt = jwtDecoder.decode(token.substring(7));
                        accessor.setUser(new JwtAuthenticationToken(jwt));
                    }
                }
                return message;
            }
        };
    }
}
```

---

## Anti-Patterns

- DO NOT use `Sinks.many().unicast()` — only one subscriber; breaks multi-tab scenarios
- DO NOT omit heartbeat — idle SSE connections are closed by load balancers after ~60 s
- DO NOT set `response-timeout` on the gateway SSE route — terminates long-lived connections
- DO NOT buffer all messages in the sink indefinitely — cap with `onBackpressureBuffer(N, false)` (drop oldest)
- DO NOT authenticate inside the SSE stream — authenticate once at HTTP layer via JWT filter

---

## Related Specialists

- `cross-cutting/domain-events-specialist.md` — domain events published to Kafka, consumed here
- `infrastructure/keycloak-specialist.md` — JWT principal extraction in SSE endpoint
- `infrastructure/docker-compose-specialist.md` — Kafka service dependency
- `infrastructure/spring-profiles-specialist.md` — profile-gated Kafka bindings for dev vs prod
