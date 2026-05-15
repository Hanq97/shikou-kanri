# FastAPI LangGraph Graph & Tools Specialist

**Role**: LangGraph execution graph and tool integration architect
**Focus**: Graph patterns (7.26-7.35), Tool patterns (7.36-7.40)
**Technology**: Python 3.11+, LangGraph, LangChain, FastAPI, Pydantic v2
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST LangGraphBuilder {
  ROLE: "LangGraph execution graph and tool integration architect"

  RESPONSIBILITIES: [
    "Design multi-agent LangGraph execution graphs",
    "Implement node definitions and conditional routing",
    "Manage graph checkpointing and state persistence",
    "Integrate LangChain tools and custom tool definitions",
    "Implement tool sandboxing and caching strategies",
    "Stream intermediate results and monitor tool usage"
  ]

  TECH_STACK: {
    primary: "LangGraph, LangChain",
    libraries: ["langgraph", "langchain", "pydantic", "asyncio"],
    patterns: ["StateGraph", "Conditional Edges", "Checkpointing", "Tool Integration"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_workflows: ["Contract Analysis", "Document Review", "Compliance Check", "Risk Assessment"]
  }
}
```

---

## PART A: GRAPH & STATE PATTERNS

---

## Pattern 7.26: Graph Builder

### Overview

```pseudo
PATTERN GraphBuilder {
  PURPOSE: "Build complex multi-agent LangGraph execution graphs"

  PROBLEM: "Manual graph construction is error-prone and difficult to maintain"

  SOLUTION: "Use dedicated builder class with clear node/edge separation"

  USE_CASES: [
    "Vietnamese contract analysis workflow",
    "Multi-expert document processing",
    "Orchestrated agent collaboration"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW GraphBuilder_Build {
  INPUT: {
    config: GraphConfig,
    orchestrator: OrchestratorAgent,
    experts: Dict[str, BaseAgent]
  }

  STEPS: {
    STEP_1_INIT_GRAPH: {
      description: "Initialize StateGraph with AgentState schema"
      logic: |
        graph = StateGraph(AgentState)
        checkpointer = MemorySaver() IF config.enable_checkpointing
    }

    STEP_2_ADD_NODES: {
      description: "Add orchestrator and expert nodes"
      logic: |
        graph.add_node("orchestrator", orchestrator_node_func)
        FOR EACH expert_name IN experts:
          graph.add_node(expert_name, create_expert_node(expert_name))
        END FOR
    }

    STEP_3_ADD_EDGES: {
      description: "Configure routing between nodes"
      logic: |
        graph.add_conditional_edges(
          "orchestrator",
          route_decision_func,
          {
            "document_expert": "document_expert",
            "data_expert": "data_expert",
            "code_expert": "code_expert",
            "research_expert": "research_expert",
            END: END
          }
        )

        FOR EACH expert IN experts:
          graph.add_edge(expert, END)
        END FOR
    }

    STEP_4_COMPILE: {
      description: "Compile graph with checkpointing"
      logic: |
        graph.set_entry_point("orchestrator")
        compiled = graph.compile(checkpointer=checkpointer)
        RETURN compiled
    }
  }

  OUTPUT: {
    compiled_graph: CompiledStateGraph,
    entry_point: "orchestrator",
    checkpointing_enabled: boolean
  }
}
```

### Key Interfaces

```python
@dataclass
class GraphConfig:
    enable_checkpointing: bool = True
    checkpoint_memory: bool = True
    enable_streaming: bool = True
    max_retries: int = 3
    timeout_seconds: int = 300

class AgentGraphBuilder:
    def __init__(self, config: Optional[GraphConfig] = None): ...
    def build(self) -> CompiledStateGraph: ...
    async def _orchestrator_node(self, state: AgentState) -> AgentState: ...
    def _create_expert_node(self, expert_name: str) -> Callable: ...
    def _route_decision(self, state: AgentState) -> str: ...
```

### Integration Points

```pseudo
INTEGRATION GraphBuilder_Integration {
  UI_COMPONENTS: {
    triggers: ["AgentChat", "ContractUpload"],
    displays: ["GraphVisualization", "ExecutionLog"]
  }

  STATE_MANAGEMENT: {
    graph_state: "AgentState (messages, context, current_agent)",
    checkpointing: "MemorySaver or PostgresSaver",
    routing: "Conditional edges based on state.current_agent"
  }

  API_ENDPOINTS: {
    invoke: "POST /api/agents/invoke",
    stream: "POST /api/agents/stream",
    checkpoint: "GET /api/agents/checkpoint/{id}"
  }
}
```

---

## Pattern 7.27: Node Definitions

### Workflow

```pseudo
WORKFLOW NodeFactory_Create {
  INPUT: {
    agent: BaseAgent,
    node_type: Literal["orchestrator", "expert", "tool", "human"]
  }

  STEPS: {
    STEP_1_CREATE_NODE_FUNC: {
      logic: |
        MATCH node_type:
          CASE "orchestrator":
            RETURN create_orchestrator_node(agent)
          CASE "expert":
            RETURN create_expert_node(agent)
          CASE "tool":
            RETURN create_tool_node(tool_executor)
          CASE "human":
            RETURN create_human_feedback_node()
        END MATCH
    }

    STEP_2_WRAP_WITH_LOGGING: {
      logic: |
        IF config.enable_logging THEN
          node_func = wrap_with_node_decorator(node_func, config)
        END IF
    }
  }

  OUTPUT: {
    node_function: Callable[[AgentState], Awaitable[AgentState]]
  }
}
```

### Key Interfaces

```python
@dataclass
class NodeConfig:
    name: str
    agent_role: str
    timeout_seconds: int = 30
    enable_logging: bool = True
    enable_validation: bool = True

class NodeFactory:
    @staticmethod
    def create_orchestrator_node(agent: Any) -> Callable: ...
    @staticmethod
    def create_expert_node(agent: Any) -> Callable: ...
    @staticmethod
    def create_tool_node(tool_executor: Any) -> Callable: ...
```

---

## Pattern 7.28: Conditional Edges

### Workflow

```pseudo
WORKFLOW ConditionalRouting {
  INPUT: {
    state: AgentState
  }

  STEPS: {
    STEP_1_INSPECT_STATE: {
      logic: |
        IF state.current_agent == "orchestrator" THEN
          RETURN "END"
        END IF

        IF state.status == "error" AND state.retry_count >= 3 THEN
          RETURN "error_handler"
        END IF

        IF state.status == "waiting_for_user" THEN
          RETURN "human_feedback"
        END IF
    }

    STEP_2_ROUTE_BY_INTENT: {
      logic: |
        intent_mapping = {
          "document_qa": "document_expert",
          "data_analysis": "data_expert",
          "code_generation": "code_expert",
          "research": "research_expert"
        }

        RETURN intent_mapping.get(state.intent, "orchestrator")
    }
  }

  OUTPUT: {
    next_node: string  // Node name or "END"
  }
}
```

---

## Pattern 7.29: State Reducer

### Workflow

```pseudo
WORKFLOW StateReducer_Merge {
  INPUT: {
    current_state: AgentState,
    updates: Dict[str, Any]
  }

  STEPS: {
    STEP_1_MERGE_MESSAGES: {
      logic: |
        IF "messages" IN updates THEN
          merged_messages = []
          FOR EACH msg IN current_state.messages:
            merged_messages.APPEND(msg)
          END FOR
          FOR EACH new_msg IN updates["messages"]:
            IF new_msg NOT IN merged_messages THEN
              merged_messages.APPEND(new_msg)
            END IF
          END FOR
          current_state.messages = merged_messages
        END IF
    }

    STEP_2_MERGE_CONTEXT: {
      logic: |
        IF "context" IN updates THEN
          FOR EACH key, value IN updates["context"]:
            IF isinstance(value, dict) AND key IN current_state.context THEN
              current_state.context[key] = deep_merge(current_state.context[key], value)
            ELSE
              current_state.context[key] = value
            END IF
          END FOR
        END IF
    }

    STEP_3_UPDATE_TIMESTAMP: {
      logic: |
        current_state.updated_at = NOW()
    }
  }

  OUTPUT: {
    updated_state: AgentState
  }
}
```

---

## Pattern 7.30: Graph Checkpointing

### Workflow

```pseudo
WORKFLOW Checkpointing_Save {
  INPUT: {
    state: AgentState,
    node_name: string,
    step: int
  }

  STEPS: {
    STEP_1_CREATE_CHECKPOINT: {
      logic: |
        checkpoint = Checkpoint(
          checkpoint_id: GENERATE_UUID(),
          step: step,
          timestamp: NOW(),
          state: SERIALIZE(state),
          node_name: node_name
        )
    }

    STEP_2_PERSIST: {
      logic: |
        IF checkpoint_type == "memory" THEN
          memory_saver.put(checkpoint)
        ELSE IF checkpoint_type == "postgres" THEN
          postgres_saver.put(checkpoint)
        END IF
    }

    STEP_3_CLEANUP_OLD: {
      logic: |
        IF checkpoint_count > max_checkpoints THEN
          DELETE oldest_checkpoints(keep_recent=10)
        END IF
    }
  }

  OUTPUT: {
    checkpoint_id: string
  }
}

WORKFLOW Checkpointing_Resume {
  INPUT: {
    checkpoint_id: string
  }

  STEPS: {
    STEP_1_LOAD: {
      logic: |
        checkpoint = checkpointer.get(checkpoint_id)
        IF checkpoint IS NULL THEN
          THROW ERROR "Checkpoint not found"
        END IF
    }

    STEP_2_DESERIALIZE: {
      logic: |
        state = DESERIALIZE(checkpoint.state)
        RETURN state
    }
  }

  OUTPUT: {
    restored_state: AgentState
  }
}
```

---

## Pattern 7.31: Graph Visualization

### Workflow

```pseudo
WORKFLOW GraphVisualization_Generate {
  INPUT: {
    compiled_graph: CompiledStateGraph
  }

  STEPS: {
    STEP_1_EXTRACT_STRUCTURE: {
      logic: |
        nodes = EXTRACT_NODES(compiled_graph)
        edges = EXTRACT_EDGES(compiled_graph)

        structure = {
          "nodes": {},
          "edges": []
        }

        FOR EACH node IN nodes:
          structure["nodes"][node] = {
            "name": node,
            "type": INFER_TYPE(node)  // orchestrator, expert, tool, human
          }
        END FOR

        FOR EACH edge IN edges:
          structure["edges"].APPEND({
            "source": edge.source,
            "target": edge.target,
            "label": edge.condition IF conditional ELSE ""
          })
        END FOR
    }

    STEP_2_GENERATE_MERMAID: {
      logic: |
        mermaid = "graph TD\n"

        FOR EACH node_name, node_info IN structure["nodes"]:
          color = COLOR_MAP[node_info.type]
          mermaid += f'  {node_name}["{node_name}"]\n'
          mermaid += f'  style {node_name} fill:{color}\n'
        END FOR

        FOR EACH edge IN structure["edges"]:
          IF edge.label THEN
            mermaid += f'  {edge.source} -->|{edge.label}| {edge.target}\n'
          ELSE
            mermaid += f'  {edge.source} --> {edge.target}\n'
          END IF
        END FOR

        RETURN mermaid
    }
  }

  OUTPUT: {
    mermaid_diagram: string,
    structure: Dict[str, Any]
  }
}
```

---

## Pattern 7.32: Human-in-the-Loop

### Workflow

```pseudo
WORKFLOW HumanLoop_Request {
  INPUT: {
    state: AgentState,
    decision_type: string,
    context: Dict[str, Any]
  }

  STEPS: {
    STEP_1_CREATE_REQUEST: {
      logic: |
        request_id = GENERATE_UUID()

        feedback = HumanFeedback(
          request_id: request_id,
          status: "pending",
          decision: decision_type,
          context: context,
          created_at: NOW()
        )

        pending_requests[request_id] = feedback
    }

    STEP_2_NOTIFY_USER: {
      logic: |
        IF feedback_callback IS NOT NULL THEN
          CALL feedback_callback({
            "request_id": request_id,
            "decision": decision_type,
            "context": context
          })
        END IF
    }

    STEP_3_PAUSE_EXECUTION: {
      logic: |
        state.status = "waiting_for_user"
        state.approval_request_id = request_id
        RETURN state  // Graph execution pauses
    }
  }

  OUTPUT: {
    request_id: string,
    paused_state: AgentState
  }
}

WORKFLOW HumanLoop_Process {
  INPUT: {
    request_id: string,
    user_feedback: HumanFeedback
  }

  STEPS: {
    STEP_1_UPDATE_FEEDBACK: {
      logic: |
        pending_requests[request_id] = user_feedback
    }

    STEP_2_RESUME_EXECUTION: {
      logic: |
        IF user_feedback.status == "approved" THEN
          state.status = "approved"
          state.waiting_for_human = false
        ELSE IF user_feedback.status == "rejected" THEN
          state.status = "rejected"
          state.waiting_for_human = false
        ELSE IF user_feedback.status == "modified" THEN
          state.modified_value = user_feedback.modified_value
          state.status = "approved"
          state.waiting_for_human = false
        END IF

        RETURN state  // Graph resumes from this point
    }
  }

  OUTPUT: {
    updated_state: AgentState
  }
}
```

---

## Pattern 7.33: Parallel Execution

### Workflow

```pseudo
WORKFLOW ParallelExecution {
  INPUT: {
    tasks: List[ParallelTask],
    max_concurrent: int = 4
  }

  STEPS: {
    STEP_1_CREATE_SEMAPHORE: {
      logic: |
        semaphore = asyncio.Semaphore(max_concurrent)
    }

    STEP_2_EXECUTE_CONCURRENT: {
      logic: |
        async def execute_with_limit(task):
          async with semaphore:
            TRY:
              agent = agent_factory(task.agent_name)
              result = AWAIT agent.process(task.input_data)
              task.result = result
            CATCH Exception AS e:
              task.error = str(e)
            END TRY
            RETURN task

        completed = AWAIT asyncio.gather(*[
          execute_with_limit(task) FOR task IN tasks
        ])
    }

    STEP_3_MERGE_RESULTS: {
      logic: |
        parallel_results = {}
        errors = []

        FOR EACH task IN completed:
          parallel_results[task.task_id] = {
            "result": task.result,
            "error": task.error
          }
          IF task.error THEN
            errors.APPEND(task.error)
          END IF
        END FOR

        status = "parallel_complete" IF len(errors) == 0 ELSE "partial_failure"
    }
  }

  OUTPUT: {
    results: Dict[task_id, result],
    errors: List[string],
    status: string
  }
}
```

---

## Pattern 7.34: Subgraph Execution

### Workflow

```pseudo
WORKFLOW SubgraphComposer {
  INPUT: {
    parent_graph: StateGraph,
    subgraph: StateGraph,
    subgraph_name: string,
    entry_source: string,
    exit_destination: string
  }

  STEPS: {
    STEP_1_CREATE_SUBGRAPH_NODE: {
      logic: |
        async def subgraph_node(state):
          compiled_subgraph = subgraph.compile()
          result = AWAIT compiled_subgraph.ainvoke(state)
          RETURN result
    }

    STEP_2_ADD_TO_PARENT: {
      logic: |
        parent_graph.add_node(subgraph_name, subgraph_node)
        parent_graph.add_edge(entry_source, subgraph_name)
        parent_graph.add_edge(subgraph_name, exit_destination)
    }
  }

  OUTPUT: {
    composed_graph: StateGraph
  }
}
```

---

## Pattern 7.35: Graph Streaming

### Workflow

```pseudo
WORKFLOW GraphStreaming {
  INPUT: {
    graph_invocation: AsyncIterator
  }

  STEPS: {
    STEP_1_STREAM_CHUNKS: {
      logic: |
        async for chunk IN graph_invocation:
          event = {
            "type": "chunk",
            "data": chunk,
            "timestamp": NOW()
          }
          YIELD event
          AWAIT asyncio.sleep(0)  // Allow other tasks
    }

    STEP_2_EMIT_EVENTS: {
      logic: |
        AWAIT event_queue.put({
          "type": event_type,
          "node": node_name,
          "data": data,
          "timestamp": NOW()
        })
    }
  }

  OUTPUT: {
    event_stream: AsyncGenerator[Dict[str, Any], None]
  }
}
```

---

## PART B: TOOLS & INTEGRATION PATTERNS

---

## Pattern 7.36: LangChain Tool Adapter

### Workflow

```pseudo
WORKFLOW LangChainToolAdapter_Convert {
  INPUT: {
    langchain_tool: LangChainTool
  }

  STEPS: {
    STEP_1_EXTRACT_METADATA: {
      logic: |
        name = langchain_tool.name
        description = langchain_tool.description

        IF hasattr(langchain_tool, "args_schema") THEN
          schema = langchain_tool.args_schema
          parameters = convert_pydantic_to_json_schema(schema)
        ELSE
          parameters = {}
        END IF
    }

    STEP_2_CREATE_WRAPPER: {
      logic: |
        tool_def = {
          "name": name,
          "description": description,
          "parameters": parameters,
          "callable": langchain_tool
        }

        RETURN tool_def
    }
  }

  SUBWORKFLOW ExecuteTool {
    STEPS: {
      STEP_1: GET tool_callable FROM tool_def
      STEP_2: CALL result = AWAIT tool_callable.ainvoke(kwargs)
      STEP_3: RETURN {"success": true, "result": result}
    }
    ERROR_HANDLING: {
      Exception: RETURN {"success": false, "error": str(e)}
    }
  }

  OUTPUT: {
    name: string,
    description: string,
    parameters: Dict[str, Any],
    callable: Callable
  }
}
```

---

## Pattern 7.37: Custom Tool Definition

### Workflow

```pseudo
WORKFLOW CustomTool_Vietnamese_Legal_Analysis {
  INPUT: {
    document_text: string,
    analysis_type: Literal["contract", "compliance", "risk"],
    language: Literal["vi", "en", "ja"]
  }

  STEPS: {
    STEP_1_EXTRACT_CLAUSES: {
      logic: |
        keywords = ["điều khoản", "clause", "条項", "article", "section"]
        clauses = []

        FOR EACH line IN document_text.split("\n"):
          IF any(kw IN line.lower() FOR kw IN keywords) THEN
            clauses.APPEND(line.strip())
          END IF
        END FOR
    }

    STEP_2_ASSESS_RISKS: {
      logic: |
        risks = {
          "high_risk": [],
          "medium_risk": [],
          "low_risk": []
        }

        FOR EACH clause IN clauses:
          IF "vô hạn trách nhiệm" IN clause OR "unlimited liability" IN clause THEN
            risks["high_risk"].APPEND(clause)
          ELSE IF "tranh chấp" IN clause OR "dispute" IN clause THEN
            risks["medium_risk"].APPEND(clause)
          ELSE
            risks["low_risk"].APPEND(clause)
          END IF
        END FOR
    }

    STEP_3_GENERATE_RECOMMENDATIONS: {
      logic: |
        recommendations = []

        IF len(risks["high_risk"]) > 0 THEN
          recommendations.APPEND("Review unlimited liability clauses")
        END IF
        IF len(risks["medium_risk"]) > 0 THEN
          recommendations.APPEND("Clarify dispute resolution mechanism")
        END IF

        recommendations.APPEND("Verify Vietnamese legal jurisdiction compliance")
    }
  }

  OUTPUT: {
    result: string,
    analysis_type: string,
    key_clauses: List[string],
    risk_assessment: Dict[string, List[string]],
    recommendations: List[string],
    metadata: {
      document_length: int,
      clauses_count: int
    }
  }
}
```

### Key Interfaces

```python
class CustomToolInput(BaseModel):
    pass

class CustomToolOutput(BaseModel):
    result: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CustomTool(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def description(self) -> str: ...

    @abstractmethod
    async def execute(self, **kwargs) -> CustomToolOutput: ...

class VietnamLegalAnalysisInput(CustomToolInput):
    document_text: str
    analysis_type: str = "contract"
    language: str = "vi"
```

---

## Pattern 7.38: Tool Execution Sandbox

### Workflow

```pseudo
WORKFLOW ToolSandbox_Execute {
  INPUT: {
    tool_func: Callable,
    timeout_seconds: int = 30,
    kwargs: Dict[str, Any]
  }

  STEPS: {
    STEP_1_SETUP_SANDBOX: {
      logic: |
        execution_id = GENERATE_UUID()
        SETUP_ENVIRONMENT(execution_id)
        APPLY_RESOURCE_LIMITS(memory_mb=512, cpu_percent=50)
    }

    STEP_2_EXECUTE_WITH_TIMEOUT: {
      logic: |
        TRY:
          result = AWAIT asyncio.wait_for(
            tool_func(**kwargs),
            timeout=timeout_seconds
          )
          RETURN {"success": true, "result": result, "timeout": false}
        CATCH asyncio.TimeoutError:
          RETURN {"success": false, "error": "Timeout", "timeout": true}
        CATCH Exception AS e:
          RETURN {"success": false, "error": str(e), "timeout": false}
        END TRY
    }

    STEP_3_CLEANUP: {
      logic: |
        CLEANUP_ENVIRONMENT(execution_id)
        REMOVE_TEMP_FILES()
    }
  }

  OUTPUT: {
    success: boolean,
    result: Any,
    error: Optional[string],
    timeout: boolean
  }
}
```

---

## Pattern 7.39: Tool Result Caching

### Workflow

```pseudo
WORKFLOW ToolCache_GetOrExecute {
  INPUT: {
    tool_name: string,
    tool_func: Callable,
    kwargs: Dict[str, Any],
    ttl_seconds: int = 3600
  }

  STEPS: {
    STEP_1_GENERATE_CACHE_KEY: {
      logic: |
        sorted_kwargs = json.dumps(kwargs, sort_keys=true)
        key_string = f"{tool_name}:{sorted_kwargs}"
        cache_key = md5(key_string).hexdigest()
    }

    STEP_2_CHECK_CACHE: {
      logic: |
        cached_result = cache.get(cache_key)

        IF cached_result IS NOT NULL THEN
          IF NOT cached_result.is_expired() THEN
            cached_result.hit_count += 1
            RETURN {"success": true, "result": cached_result.result, "from_cache": true}
          ELSE
            DELETE cache[cache_key]
          END IF
        END IF
    }

    STEP_3_EXECUTE_AND_CACHE: {
      logic: |
        result = AWAIT tool_func(**kwargs)

        IF result.success THEN
          IF cache.size >= max_size THEN
            EVICT_LRU()
          END IF

          cache.set(cache_key, CachedResult(
            key: cache_key,
            result: result,
            ttl_seconds: ttl_seconds
          ))
        END IF

        RETURN {"success": true, "result": result, "from_cache": false}
    }
  }

  OUTPUT: {
    success: boolean,
    result: Any,
    from_cache: boolean
  }
}
```

---

## Pattern 7.40: Tool Usage Analytics

### Workflow

```pseudo
WORKFLOW ToolAnalytics_Record {
  INPUT: {
    tool_name: string,
    execution_id: string,
    status: Literal["success", "failure", "timeout"],
    duration_ms: float,
    input_size: int,
    output_size: int
  }

  STEPS: {
    STEP_1_CREATE_METRIC: {
      logic: |
        metric = ToolExecutionMetric(
          tool_name: tool_name,
          execution_id: execution_id,
          status: status,
          duration_ms: duration_ms,
          timestamp: NOW(),
          input_size: input_size,
          output_size: output_size
        )

        metrics.APPEND(metric)
    }
  }
}

WORKFLOW ToolAnalytics_GetStats {
  INPUT: {
    tool_name: string
  }

  STEPS: {
    STEP_1_FILTER_METRICS: {
      logic: |
        tool_metrics = [m FOR m IN metrics IF m.tool_name == tool_name]
    }

    STEP_2_CALCULATE_STATS: {
      logic: |
        successful = [m FOR m IN tool_metrics IF m.status == "success"]
        failed = [m FOR m IN tool_metrics IF m.status == "failure"]
        durations = [m.duration_ms FOR m IN tool_metrics]

        stats = {
          "total_executions": len(tool_metrics),
          "successful": len(successful),
          "failed": len(failed),
          "success_rate": len(successful) / len(tool_metrics),
          "avg_duration_ms": sum(durations) / len(durations),
          "min_duration_ms": min(durations),
          "max_duration_ms": max(durations)
        }

        RETURN stats
    }
  }

  OUTPUT: {
    tool_name: string,
    stats: Dict[string, Any]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    LegalDocument: {
      types: ["contract", "agreement", "policy_document"],
      vietnamese_term: "Tài Liệu Pháp Lý"
    },
    LegalClause: {
      types: ["liability", "payment", "dispute_resolution", "termination"],
      vietnamese_term: "Điều Khoản"
    },
    ComplianceCheck: {
      standards: ["Vietnam Civil Code", "Insurance Law", "Lending Regulations"],
      vietnamese_term: "Kiểm Tra Tuân Thủ"
    }
  }

  BUSINESS_RULES: {
    contract_validation: "All Vietnamese contracts require legal clause extraction and risk assessment",
    compliance_workflow: "Multi-agent workflow: Document Expert → Legal Analysis → Human Review",
    caching_policy: "Legal analysis results cached for 1 hour (similar contracts)"
  }

  WORKFLOWS: {
    contract_review: "Orchestrator → Document Expert → VietnamLegalAnalysisTool → Human-in-Loop",
    parallel_processing: "Multiple contracts analyzed concurrently (max 4 parallel)",
    checkpointing: "Resume contract review from failure point"
  }
}
```

---

## Integration Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "Vietnamese P2P insurance contract review"

  FLOW: {
    STEP_1: |
      User uploads Vietnamese insurance contract PDF
      System extracts text and creates AgentState

    STEP_2: |
      Graph invoked with entry point "orchestrator"
      Orchestrator routes to "document_expert"

    STEP_3: |
      Document Expert calls VietnamLegalAnalysisTool
      Tool extracts clauses in Vietnamese ("điều khoản", "article")
      Assesses risks: high/medium/low classification

    STEP_4: |
      IF high-risk clauses detected THEN
        Trigger Human-in-Loop approval request
        Pause graph execution
        Wait for lawyer review
      END IF

    STEP_5: |
      Human approves/modifies decision
      Graph resumes execution
      Results cached (TTL=1 hour)

    STEP_6: |
      Generate compliance report
      Stream results to user via SSE
      Save checkpoint for audit trail
  }

  PSEUDO_CODE: |
    // Build graph
    builder = AgentGraphBuilder(GraphConfig(enable_checkpointing=true))
    graph = builder.build()

    // Create state
    state = AgentState(
      conversation_id="contract_review_123",
      user_id="lawyer_456"
    )
    state.add_message("user", "Analyze Vietnamese insurance contract...")
    state.context["document_id"] = "doc_789"

    // Invoke with streaming
    async for event IN graph.astream(state):
      IF event.type == "node_start" THEN
        EMIT_SSE({"status": "processing", "node": event.node})
      ELSE IF event.type == "tool_result" THEN
        EMIT_SSE({"status": "tool_complete", "result": event.data})
      END IF
    END FOR
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 7.1-7.10 - Orchestrator Agent",
    relationship: "Orchestrator uses graph builder to create execution flow",
    integration: "Shares AgentState schema and routing logic"
  },
  {
    pattern: "Pattern 7.11-7.25 - Expert Agents",
    relationship: "Expert agents registered as graph nodes",
    integration: "Each expert is wrapped in expert_node function"
  },
  {
    pattern: "Pattern 8.1-8.10 - Pydantic Schemas",
    relationship: "AgentState uses Pydantic models for validation",
    integration: "Tool inputs/outputs use Pydantic schemas"
  }
]
```

---

## References

- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **LangChain Tools**: https://python.langchain.com/docs/modules/agents/tools/
- **Vietnamese Legal Standards**: Vietnam Civil Code, Insurance Law 2000
- **Internal Docs**: `/docs/architecture/agent-graph-patterns.md`

---

**Total Patterns**: 15 (7.26-7.40)
**Lines**: ~750 (compliance: ✅ ≤800)
**Format**: Pseudo-code WORKFLOW
**Domain**: Vietnamese legal P2P platform
