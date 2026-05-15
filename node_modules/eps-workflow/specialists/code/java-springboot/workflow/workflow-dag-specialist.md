# Workflow DAG Engine Specialist

**Role**: DAG Workflow Engine & Node Handler Expert
**Technology Stack**: Spring Boot batch-workflow module, Airflow Python DAG generation
**Integration**: StarX4CRM batch-workflow microservice
**Version**: Spring Boot 3.4.4

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application (Batch) |
| **Package** | `{rootPackage}.infrastructure.workflow` |
| **Maven Module** | `batch-workflow` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 37.1–37.8 |
| **Source Paths** | `{sourceRoot}/infrastructure/workflow/` |
| **File Count** | ~20 workflow files (16 node types + handlers) |
| **Naming Convention** | `Abstract*NodeHandler.java`, `NodeHandlerFactory.java` |
| **Base Class** | `AbstractNodeHandler` |
| **Imports From** | Application (Services), Domain (Entities) |
| **Cannot Import** | `rest.*` (batch module, no REST layer) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **Node Types**: 16+ node types including API_CALL, SCRIPT, DATA_OPERATION, NOTIFICATION, FILE, LOG
2. **Template Method**: AbstractNodeHandler base with pre/execute/post hooks
3. **Factory Pattern**: NodeHandlerFactory with auto-registration via Spring
4. **Error Strategies**: RETRY, FALLBACK, SKIP, FAIL, COMPENSATE
5. **Compensation**: LIFO stack rollback for saga-style undo
6. **Airflow Integration**: Python DAG generation from workflow definition
7. **Expression Evaluator**: SpEL-based config interpolation

---

## Pattern Index

- [Pattern 37.1: Node Type Definitions](#pattern-371-node-type-definitions)
- [Pattern 37.2: AbstractNodeHandler (Template Method)](#pattern-372-abstractnodehandler-template-method)
- [Pattern 37.3: NodeHandlerFactory](#pattern-373-nodehandlerfactory)
- [Pattern 37.4: Error Strategies](#pattern-374-error-strategies)
- [Pattern 37.5: Compensation (LIFO Rollback)](#pattern-375-compensation-lifo-rollback)
- [Pattern 37.6: DagDeploymentService & Airflow DAG Generation](#pattern-376-dagdeploymentservice--airflow-dag-generation)
- [Pattern 37.7: ExpressionEvaluator](#pattern-377-expressionevaluator)
- [Pattern 37.8: WorkflowTransactionManager](#pattern-378-workflowtransactionmanager)

---

## Pattern 37.1: Node Type Definitions

**Use Case**: Enumeration of all 16+ supported workflow node types.

```java
// domain/NodeType.java
public enum NodeType {
    // Control flow
    START,
    END,
    CONDITION,        // branch: if/else
    PARALLEL,         // fork: concurrent execution
    JOIN,             // merge parallel branches

    // Operations
    API_CALL,         // REST / GraphQL HTTP call
    SCRIPT,           // Groovy / JavaScript expression
    DATA_OPERATION,   // SQL query, transform, aggregate
    FILE,             // read/write/copy file (S3 or local)

    // Communication
    NOTIFICATION,     // email, Slack, SMS via SES/SNS
    WEBHOOK,          // outbound HTTP callback

    // Batch integration
    JOB_TRIGGER,      // trigger JobRunr background job
    WAIT,             // delay / sleep node

    // Audit
    LOG,              // structured log entry
    METRIC,           // emit custom metric

    // Tenant
    TENANT_CONTEXT    // switch tenant context mid-workflow
}
```

---

## Pattern 37.2: AbstractNodeHandler (Template Method)

**Use Case**: Shared pre/post logic (logging, metrics, context propagation) with per-type execute override.

```java
// handler/AbstractNodeHandler.java
public abstract class AbstractNodeHandler<C extends NodeConfig> {

    protected final Logger log = LoggerFactory.getLogger(getClass());

    /**
     * Template method: pre-execute → execute → post-execute.
     * Subclasses override execute() only.
     */
    public final Mono<NodeResult> handle(NodeContext ctx, C config) {
        return Mono.defer(() -> preExecute(ctx, config))
            .then(Mono.defer(() -> execute(ctx, config)))
            .flatMap(result -> postExecute(ctx, config, result).thenReturn(result))
            .onErrorResume(ex -> handleError(ctx, config, ex));
    }

    protected Mono<Void> preExecute(NodeContext ctx, C config) {
        log.debug("Node START: nodeId={}, type={}", ctx.getNodeId(), nodeType().name());
        ctx.startTimer();
        return Mono.empty();
    }

    protected abstract Mono<NodeResult> execute(NodeContext ctx, C config);

    protected Mono<Void> postExecute(NodeContext ctx, C config, NodeResult result) {
        log.debug("Node END: nodeId={}, durationMs={}, status={}",
            ctx.getNodeId(), ctx.elapsedMs(), result.getStatus());
        return Mono.empty();
    }

    protected Mono<NodeResult> handleError(NodeContext ctx, C config, Throwable ex) {
        log.error("Node ERROR: nodeId={}", ctx.getNodeId(), ex);
        return Mono.just(NodeResult.failed(ex.getMessage()));
    }

    public abstract NodeType nodeType();
}
```

**Concrete Handler Example**:
```java
// handler/ApiCallNodeHandler.java
@Component
public class ApiCallNodeHandler extends AbstractNodeHandler<ApiCallNodeConfig> {

    private final WebClient webClient;

    @Override
    public NodeType nodeType() { return NodeType.API_CALL; }

    @Override
    protected Mono<NodeResult> execute(NodeContext ctx, ApiCallNodeConfig config) {
        return webClient.method(HttpMethod.valueOf(config.getMethod()))
            .uri(ctx.evaluateExpression(config.getUrl()))
            .headers(h -> config.getHeaders().forEach(h::add))
            .bodyValue(ctx.evaluateExpression(config.getBody()))
            .retrieve()
            .bodyToMono(String.class)
            .map(response -> NodeResult.success(Map.of("response", response)))
            .doOnNext(result -> ctx.setOutputVariable(config.getOutputVar(), result));
    }
}
```

---

## Pattern 37.3: NodeHandlerFactory

**Use Case**: Auto-registration of all handlers via Spring; factory lookup by NodeType.

```java
// handler/NodeHandlerFactory.java
@Component
public class NodeHandlerFactory {

    private final Map<NodeType, AbstractNodeHandler<?>> handlers;

    // Spring injects ALL AbstractNodeHandler beans automatically
    public NodeHandlerFactory(List<AbstractNodeHandler<?>> handlerList) {
        this.handlers = handlerList.stream()
            .collect(Collectors.toMap(
                AbstractNodeHandler::nodeType,
                h -> h
            ));
    }

    @SuppressWarnings("unchecked")
    public <C extends NodeConfig> AbstractNodeHandler<C> getHandler(NodeType type) {
        var handler = (AbstractNodeHandler<C>) handlers.get(type);
        if (handler == null) {
            throw new UnsupportedNodeTypeException("No handler registered for NodeType: " + type);
        }
        return handler;
    }
}
```

---

## Pattern 37.4: Error Strategies

**Use Case**: Per-node configurable error handling policy.

```java
// domain/ErrorStrategy.java
public enum ErrorStrategy {
    RETRY,       // exponential backoff, max N attempts
    FALLBACK,    // execute fallback node on failure
    SKIP,        // mark as skipped, continue DAG execution
    FAIL,        // halt execution, mark workflow as failed
    COMPENSATE   // trigger LIFO compensation stack
}

// engine/NodeExecutionEngine.java - retry example
private Mono<NodeResult> executeWithStrategy(
        NodeContext ctx, NodeDefinition node, WorkflowConfig config) {
    var handler = handlerFactory.getHandler(node.getType());

    Mono<NodeResult> execution = handler.handle(ctx, node.getConfig());

    return switch (node.getErrorStrategy()) {
        case RETRY -> execution.retryWhen(
            Retry.backoff(node.getMaxRetries(), Duration.ofSeconds(1))
                .maxBackoff(Duration.ofSeconds(30))
                .doBeforeRetry(signal -> log.warn(
                    "Retrying node={} attempt={}", node.getId(), signal.totalRetries() + 1))
        );
        case SKIP -> execution.onErrorReturn(NodeResult.skipped());
        case FAIL -> execution.onErrorResume(ex ->
            Mono.just(NodeResult.failed(ex.getMessage()))
                .doOnNext(r -> ctx.haltWorkflow()));
        case COMPENSATE -> execution.onErrorResume(ex ->
            runCompensation(ctx).then(Mono.just(NodeResult.failed(ex.getMessage()))));
        default -> execution;
    };
}
```

---

## Pattern 37.5: Compensation (LIFO Rollback)

**Use Case**: Saga-style undo of completed nodes when a later node fails.

```java
// engine/CompensationStack.java
@Component
@Scope("prototype")
public class CompensationStack {

    private final Deque<CompensationAction> stack = new ArrayDeque<>();

    public void push(CompensationAction action) {
        stack.push(action); // LIFO: last completed pushed first
    }

    /**
     * Execute all compensation actions in reverse order (LIFO).
     */
    public Mono<Void> compensate(NodeContext ctx) {
        return Flux.generate(sink -> {
                if (stack.isEmpty()) {
                    sink.complete();
                } else {
                    sink.next(stack.pop());
                }
            })
            .cast(CompensationAction.class)
            .concatMap(action -> {
                log.info("Compensating: action={}", action.getDescription());
                return action.execute(ctx)
                    .onErrorResume(ex -> {
                        log.error("Compensation failed: {}", action.getDescription(), ex);
                        return Mono.empty(); // best-effort
                    });
            })
            .then();
    }
}
```

---

## Pattern 37.6: DagDeploymentService & Airflow DAG Generation

**Use Case**: Generate Python Airflow DAG files from workflow JSON definitions.

```java
// deployment/DagDeploymentService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class DagDeploymentService {

    @Value("${airflow.dag-directory:/opt/airflow/dags}")
    private String dagDirectory;

    private final ExpressionEvaluator expressionEvaluator;

    /**
     * Generates Airflow Python DAG file and writes to tenant-specific directory.
     * Output: /opt/airflow/dags/{tenantId}/{workflowId}.py
     */
    public Mono<Path> deployDag(WorkflowDefinition workflow, String tenantId) {
        return Mono.fromCallable(() -> {
            var dagContent = generateDagPython(workflow, tenantId);
            var tenantDagDir = Path.of(dagDirectory, tenantId);
            Files.createDirectories(tenantDagDir);
            var dagFile = tenantDagDir.resolve(workflow.getId() + ".py");
            Files.writeString(dagFile, dagContent);
            log.info("Deployed DAG: {}", dagFile);
            return dagFile;
        });
    }

    private String generateDagPython(WorkflowDefinition workflow, String tenantId) {
        var sb = new StringBuilder();
        sb.append("from airflow import DAG\n");
        sb.append("from airflow.operators.python import PythonOperator\n");
        sb.append("from datetime import datetime\n\n");
        sb.append("dag = DAG(\n");
        sb.append("    dag_id='").append(tenantId).append("_").append(workflow.getId()).append("',\n");
        sb.append("    schedule_interval='").append(workflow.getCronExpression()).append("',\n");
        sb.append("    start_date=datetime(2026, 1, 1),\n");
        sb.append("    catchup=False\n)\n\n");
        // Node → Task generation omitted for brevity
        return sb.toString();
    }
}
```

---

## Pattern 37.7: ExpressionEvaluator

**Use Case**: Evaluate SpEL expressions in node configurations (e.g., `${ctx.customerId}`).

```java
// engine/ExpressionEvaluator.java
@Component
public class ExpressionEvaluator {

    private final ExpressionParser parser = new SpelExpressionParser();

    public String evaluate(String template, NodeContext ctx) {
        if (template == null || !template.contains("${")) {
            return template;
        }
        var context = new StandardEvaluationContext(ctx);
        context.setVariable("env", System.getenv());
        // Replace ${expr} patterns
        return template.replaceAll("\\$\\{([^}]+)}", match -> {
            var expr = match.replaceAll("\\$\\{|}", "");
            try {
                return String.valueOf(parser.parseExpression(expr).getValue(context));
            } catch (Exception e) {
                return match; // leave unresolved on error
            }
        });
    }
}
```

---

## Pattern 37.8: WorkflowTransactionManager

**Use Case**: Manage workflow execution state persistence across node transitions.

```java
// engine/WorkflowTransactionManager.java
@Service
@RequiredArgsConstructor
public class WorkflowTransactionManager {

    private final WorkflowExecutionRepository executionRepository;

    public Mono<WorkflowExecution> beginExecution(String workflowId, String tenantId) {
        var execution = WorkflowExecution.builder()
            .workflowId(workflowId).tenantId(tenantId)
            .status(ExecutionStatus.RUNNING).startedAt(Instant.now()).build();
        return executionRepository.save(execution);
    }

    public Mono<Void> recordNodeResult(String executionId, String nodeId, NodeResult result) {
        return executionRepository.upsertNodeResult(executionId, nodeId, result);
    }

    public Mono<Void> completeExecution(String executionId, ExecutionStatus status) {
        return executionRepository.updateStatus(executionId, status, Instant.now());
    }
}
```

---

## Anti-Patterns

- NO implementing logic directly in NodeHandlerFactory — it only routes to handlers
- NO blocking I/O in node handlers — all handlers must return Mono
- NO skipping compensation on FAIL strategy when prior nodes are compensable
- NO generating Airflow Python with direct string concat for complex expressions — use template engine

---

## Related Specialists

- `messaging/kafka-specialist.md` - jobs.* Kafka topic triggers JOB_TRIGGER node
- `cloud/aws-specialist.md` - FILE nodes use S3AsyncClient
- `data-access/r2dbc-callback-specialist.md` - DATA_OPERATION nodes use R2DBC
- `multitenancy/multitenancy-specialist.md` - Tenant-specific DAG directory structure
