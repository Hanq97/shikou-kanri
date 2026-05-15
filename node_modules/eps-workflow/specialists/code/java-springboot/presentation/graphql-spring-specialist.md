# GraphQL Spring Specialist — Generic
# GraphQL Springスペシャリスト — 汎用
# Chuyên Gia GraphQL Spring — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 68.1–68.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `*Controller.java` (GraphQL controllers) |
| **Base Class** | N/A |
| **Imports From** | Application |
| **Cannot Import** | Domain, Infrastructure |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Spring for GraphQL: schema-first design, query/mutation mapping, N+1 prevention with DataLoader, subscriptions, and security.

## Patterns

### Pattern 68.1: Setup & Schema-First
```yaml
# application.yml
spring.graphql:
  schema.locations: classpath:graphql/
  graphiql.enabled: true  # dev only
```
```graphql
# src/main/resources/graphql/schema.graphqls
type Query {
    user(id: ID!): User
    users(page: Int = 0, size: Int = 20): UserConnection!
}

type Mutation {
    createUser(input: CreateUserInput!): User!
}

type User {
    id: ID!
    name: String!
    email: String!
    orders: [Order!]!
}
```
- Schema-first: define `.graphqls` files, implement controllers
- Dependency: `spring-boot-starter-graphql`

### Pattern 68.2: Query & Mutation Mapping
```java
@Controller
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @QueryMapping
    public User user(@Argument Long id) {
        return userService.findById(id);
    }

    @QueryMapping
    public Connection<User> users(@Argument int page, @Argument int size) {
        return userService.findAll(PageRequest.of(page, size));
    }

    @MutationMapping
    public User createUser(@Argument CreateUserInput input) {
        return userService.create(input);
    }
}
```
- Method name matches schema field name by default
- `@Argument` maps GraphQL arguments to Java parameters

### Pattern 68.3: DataLoader — N+1 Prevention
```java
@Controller
public class UserController {
    // ❌ N+1: one query per user for orders
    @SchemaMapping(typeName = "User")
    public List<Order> orders(User user) {
        return orderService.findByUserId(user.getId());
    }

    // ✅ Batch loading: one query for ALL users' orders
    @BatchMapping
    public Map<User, List<Order>> orders(List<User> users) {
        List<Long> userIds = users.stream().map(User::getId).toList();
        Map<Long, List<Order>> orderMap = orderService.findByUserIds(userIds);
        return users.stream().collect(toMap(u -> u, u -> orderMap.getOrDefault(u.getId(), List.of())));
    }
}
```
- ALWAYS use `@BatchMapping` for nested relations — prevents N+1
- DataLoader batches requests within single GraphQL query

### Pattern 68.4: Subscriptions
```java
@Controller
public class OrderController {
    @SubscriptionMapping
    public Flux<Order> orderUpdates(@Argument Long userId) {
        return orderEventService.streamByUser(userId);
    }
}
```
- Returns `Flux<T>` for server-sent events over WebSocket
- Client subscribes: `subscription { orderUpdates(userId: 1) { id, status } }`

### Pattern 68.5: Error Handling
```java
@Component
public class GraphQLExceptionResolver extends DataFetcherExceptionResolverAdapter {
    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        if (ex instanceof EntityNotFoundException e) {
            return GraphqlErrorBuilder.newError(env)
                .message(e.getMessage())
                .errorType(ErrorType.NOT_FOUND)
                .build();
        }
        return GraphqlErrorBuilder.newError(env)
            .message("Internal error")
            .errorType(ErrorType.INTERNAL_ERROR)
            .build();
    }
}
```
- GraphQL returns 200 even on errors — errors in `errors[]` array
- Partial success: some fields resolve, others return errors

### Pattern 68.6: Security
```java
@Controller
public class AdminController {
    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditLog> auditLogs() { ... }
}
```
- `@PreAuthorize` works on `@QueryMapping`/`@MutationMapping`
- Spring Security context propagated to GraphQL execution

## REJECTED Patterns
- ❌ Code-first schema generation — schema-first is recommended for Spring
- ❌ `@SchemaMapping` for nested lists without batching — causes N+1
- ❌ Exposing domain entities directly — use dedicated GraphQL types
- ❌ Unlimited depth queries — configure `spring.graphql.schema.inspection.enabled`

## Related Specialists
- `presentation/api-design-governance-specialist.md` — REST API governance (67.x)
- `security/java-security-specialist.md` — Spring Security config (21.x)
