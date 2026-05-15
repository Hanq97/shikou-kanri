# FastAPI LangGraph Orchestrator Agent Specialist

**Role**: Multi-agent orchestration and routing coordinator
**Focus**: Orchestrator patterns (7.1-7.10)
**Technology**: Python 3.12+, FastAPI, LangGraph, Pydantic v2
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST OrchestratorAgent {
  ROLE: "Multi-agent orchestration and expert routing coordinator"

  RESPONSIBILITIES: [
    "Define base agent interface and contracts",
    "Manage agent state schema with Pydantic",
    "Orchestrate multi-agent workflows",
    "Route queries to appropriate expert agents",
    "Manage agent memory (short-term + long-term)",
    "Handle checkpointing and state persistence",
    "Provide tool registry and discovery",
    "Implement error recovery with retry strategies",
    "Stream responses via SSE",
    "Monitor agent health and performance"
  ]

  TECH_STACK: {
    primary: "LangGraph, FastAPI",
    libraries: ["langgraph", "fastapi", "pydantic", "asyncio", "openai"],
    patterns: ["BaseAgent", "StateGraph", "Router", "Memory", "Checkpointing"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_agents: ["DocumentExpert", "DataExpert", "CodeExpert", "ResearchExpert"],
    workflows: ["Contract Analysis", "Case Management", "Compliance Check"]
  }
}
```

---

## Pattern 7.1: Base Agent Interface

### Overview

```pseudo
PATTERN BaseAgentInterface {
  PURPOSE: "Provide consistent contract for all agents in the system"

  PROBLEM: "Without a standard interface, agents have inconsistent APIs and integration is fragile"

  SOLUTION: "Define abstract base class with async methods for processing, streaming, and validation"

  USE_CASES: [
    "Vietnamese legal document analysis agents",
    "Case database query agents",
    "Compliance checking agents"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW BaseAgent_Process {
  INPUT: {
    messages: List[AgentMessage],
    state: Optional[Dict[str, Any]]
  }

  STEPS: {
    STEP_1_VALIDATE: {
      logic: |
        IF NOT validate_input(messages) THEN
          THROW ERROR "Invalid input messages"
        END IF
    }

    STEP_2_PROCESS: {
      logic: |
        // Implemented by subclass
        response = CALL agent_specific_processing(messages, state)
        RETURN AgentResponse(
          content: response.content,
          metadata: response.metadata,
          next_action: response.next_action
        )
    }
  }

  OUTPUT: {
    content: string,
    metadata: Dict[string, Any],
    next_action: Literal["continue", "finish", "route_to_expert"],
    routed_expert: Optional[string],
    confidence: float
  }
}

WORKFLOW BaseAgent_Stream {
  INPUT: {
    messages: List[AgentMessage],
    state: Optional[Dict[str, Any]]
  }

  STEPS: {
    STEP_1_GENERATE_TOKENS: {
      logic: |
        async for token IN llm_provider.stream(messages):
          YIELD token
    }
  }

  OUTPUT: {
    token_stream: AsyncGenerator[string, None]
  }
}
```

### Key Interfaces

```python
class AgentRole(str, Enum):
    ORCHESTRATOR = "orchestrator"
    DOCUMENT_EXPERT = "document_expert"
    DATA_EXPERT = "data_expert"
    CODE_EXPERT = "code_expert"
    RESEARCH_EXPERT = "research_expert"

class AgentConfig(BaseModel):
    name: str
    role: AgentRole
    model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 2000
    tools: List[str] = Field(default_factory=list)

class AgentMessage(BaseModel):
    role: str  # "user", "assistant", "system", "tool"
    content: str
    metadata: Optional[Dict[str, Any]] = None

class AgentResponse(BaseModel):
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    next_action: Optional[str] = None
    routed_expert: Optional[str] = None
    confidence: float = 1.0

class BaseAgent(ABC):
    @abstractmethod
    async def process(self, messages: List[AgentMessage], state: Optional[Dict[str, Any]] = None) -> AgentResponse: ...
    @abstractmethod
    async def stream(self, messages: List[AgentMessage], state: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]: ...
    @abstractmethod
    async def validate_input(self, messages: List[AgentMessage]) -> bool: ...
```

---

## Pattern 7.2: Agent State Schema

### Workflow

```pseudo
WORKFLOW AgentState_Management {
  INPUT: {
    conversation_id: string,
    user_id: string
  }

  STATE_STRUCTURE: {
    conversation_id: string,
    user_id: string,
    messages: List[Dict[string, Any]],
    context: Dict[string, Any],
    tool_calls: List[Dict[string, Any]],
    tool_results: List[Dict[string, Any]],
    current_agent: string,
    status: ConversationStatus,
    retry_count: int,
    created_at: datetime,
    updated_at: datetime
  }

  METHODS: {
    add_message(role, content, metadata): |
      messages.APPEND({
        "role": role,
        "content": content,
        "metadata": metadata,
        "timestamp": NOW()
      })
      updated_at = NOW()

    route_to_expert(expert_name): |
      current_agent = expert_name
      context["routed_to"] = expert_name
      context["routed_at"] = NOW()

    add_tool_call(tool_name, args): |
      tool_calls.APPEND({
        "tool": tool_name,
        "args": args,
        "timestamp": NOW()
      })
  }
}
```

### Key Interfaces

```python
class ConversationStatus(str, Enum):
    INITIAL = "initial"
    PROCESSING = "processing"
    WAITING_FOR_TOOL = "waiting_for_tool"
    WAITING_FOR_USER = "waiting_for_user"
    COMPLETED = "completed"
    ERROR = "error"

class AgentState(BaseModel):
    conversation_id: str
    user_id: str
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    tool_results: List[Dict[str, Any]] = Field(default_factory=list)
    current_agent: str = "orchestrator"
    status: ConversationStatus = ConversationStatus.INITIAL
    retry_count: int = 0

    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None): ...
    def route_to_expert(self, expert_name: str): ...
    def add_tool_call(self, tool_name: str, args: Dict[str, Any]): ...
```

---

## Pattern 7.3: Orchestrator Agent

### Workflow

```pseudo
WORKFLOW OrchestratorAgent_Process {
  INPUT: {
    messages: List[AgentMessage],
    state: Dict[str, Any]
  }

  STEPS: {
    STEP_1_DETECT_INTENT: {
      logic: |
        user_message = messages[-1].content
        intent = CALL detect_intent_with_llm(user_message)
        // Possible intents: document_qa, data_analysis, code_generation, research, compliance
    }

    STEP_2_ROUTE_OR_ANSWER: {
      logic: |
        IF intent IN ["document_qa", "data_analysis", "code_generation", "research"] THEN
          expert = map_intent_to_expert(intent)
          RETURN AgentResponse(
            content: f"Routing to {expert}...",
            next_action: "route_to_expert",
            routed_expert: expert
          )
        ELSE
          // Simple query, answer directly
          answer = CALL llm_provider.generate(messages, orchestrator_prompt)
          RETURN AgentResponse(
            content: answer,
            next_action: "finish"
          )
        END IF
    }
  }

  SUBWORKFLOW DetectIntent {
    STEPS: {
      STEP_1: CREATE system_prompt for Vietnamese legal intent detection
      STEP_2: CALL llm_provider.generate(messages, system_prompt)
      STEP_3: PARSE intent from response (JSON format)
      STEP_4: RETURN intent
    }
  }

  OUTPUT: {
    content: string,
    next_action: Literal["route_to_expert", "finish"],
    routed_expert: Optional[string]
  }
}
```

---

## Pattern 7.4: Agent Router

### Workflow

```pseudo
WORKFLOW AgentRouter_Route {
  INPUT: {
    query: string,
    user_context: Dict[str, Any]
  }

  STEPS: {
    STEP_1_EXTRACT_KEYWORDS: {
      logic: |
        vietnamese_keywords = ["hợp đồng", "tài liệu", "dữ liệu", "code", "nghiên cứu"]
        english_keywords = ["contract", "document", "data", "code", "research"]

        FOR EACH keyword IN vietnamese_keywords + english_keywords:
          IF keyword IN query.lower() THEN
            extracted_keywords.APPEND(keyword)
          END IF
        END FOR
    }

    STEP_2_MAP_TO_EXPERT: {
      logic: |
        keyword_to_expert = {
          "hợp đồng": "document_expert",
          "contract": "document_expert",
          "tài liệu": "document_expert",
          "document": "document_expert",
          "dữ liệu": "data_expert",
          "data": "data_expert",
          "database": "data_expert",
          "code": "code_expert",
          "api": "code_expert",
          "nghiên cứu": "research_expert",
          "research": "research_expert"
        }

        FOR EACH keyword IN extracted_keywords:
          IF keyword IN keyword_to_expert THEN
            expert = keyword_to_expert[keyword]
            confidence = 0.8
            RETURN (expert, confidence)
          END IF
        END FOR

        // Fallback to LLM-based routing
        expert = CALL llm_detect_intent(query)
        RETURN (expert, 0.6)
    }
  }

  OUTPUT: {
    expert_name: string,
    confidence: float,
    reasoning: string
  }
}
```

---

## Pattern 7.5: Agent Memory Manager

### Workflow

```pseudo
WORKFLOW MemoryManager_Store {
  INPUT: {
    conversation_id: string,
    message: AgentMessage,
    memory_type: Literal["short_term", "long_term"]
  }

  STEPS: {
    STEP_1_GENERATE_EMBEDDING: {
      logic: |
        embedding = CALL embeddings_provider.embed(message.content)
        // Use BGE-M3 for Vietnamese text
    }

    STEP_2_STORE: {
      logic: |
        IF memory_type == "short_term" THEN
          redis.SET(
            key: f"memory:short:{conversation_id}:{timestamp}",
            value: {content: message.content, embedding: embedding},
            ttl: 3600  // 1 hour
          )
        ELSE IF memory_type == "long_term" THEN
          neo4j.CREATE(
            node_type: "Memory",
            properties: {
              conversation_id: conversation_id,
              content: message.content,
              embedding: embedding,
              created_at: NOW()
            }
          )
        END IF
    }
  }
}

WORKFLOW MemoryManager_Retrieve {
  INPUT: {
    query: string,
    conversation_id: string,
    top_k: int = 5
  }

  STEPS: {
    STEP_1_SEARCH: {
      logic: |
        query_embedding = CALL embeddings_provider.embed(query)

        // Search short-term memory first
        short_term_results = redis.VECTOR_SEARCH(
          pattern: f"memory:short:{conversation_id}:*",
          query_embedding: query_embedding,
          top_k: top_k
        )

        // Search long-term memory
        long_term_results = neo4j.VECTOR_SEARCH(
          query_embedding: query_embedding,
          top_k: top_k,
          filter: {conversation_id: conversation_id}
        )

        // Merge and rank results
        merged = short_term_results + long_term_results
        sorted_results = SORT(merged, by="score", desc=true)[:top_k]

        RETURN sorted_results
    }
  }

  OUTPUT: {
    memories: List[Dict[string, Any]]
  }
}
```

---

## Pattern 7.6: Agent Checkpointer

### Workflow

```pseudo
WORKFLOW Checkpointer_Save {
  INPUT: {
    state: AgentState,
    checkpoint_type: Literal["memory", "postgres"]
  }

  STEPS: {
    STEP_1_SERIALIZE: {
      logic: |
        checkpoint_data = {
          "conversation_id": state.conversation_id,
          "user_id": state.user_id,
          "messages": state.messages,
          "context": state.context,
          "current_agent": state.current_agent,
          "status": state.status,
          "timestamp": NOW()
        }
    }

    STEP_2_PERSIST: {
      logic: |
        IF checkpoint_type == "memory" THEN
          memory_saver.put(conversation_id, checkpoint_data)
        ELSE IF checkpoint_type == "postgres" THEN
          postgres.INSERT INTO checkpoints (conversation_id, data, created_at)
          VALUES (conversation_id, checkpoint_data, NOW())
        END IF
    }
  }

  OUTPUT: {
    checkpoint_id: string
  }
}
```

---

## Pattern 7.7: Agent Tool Registry

### Workflow

```pseudo
WORKFLOW ToolRegistry_Register {
  INPUT: {
    tool_name: string,
    tool_callable: Callable,
    tool_schema: Dict[string, Any]
  }

  STEPS: {
    STEP_1_REGISTER: {
      logic: |
        tools[tool_name] = {
          "callable": tool_callable,
          "schema": tool_schema,
          "registered_at": NOW()
        }
    }
  }
}

WORKFLOW ToolRegistry_Execute {
  INPUT: {
    tool_name: string,
    args: Dict[string, Any]
  }

  STEPS: {
    STEP_1_VALIDATE: {
      logic: |
        IF tool_name NOT IN tools THEN
          THROW ERROR f"Tool {tool_name} not found"
        END IF

        tool_schema = tools[tool_name]["schema"]
        IF NOT validate_args(args, tool_schema) THEN
          THROW ERROR "Invalid tool arguments"
        END IF
    }

    STEP_2_EXECUTE: {
      logic: |
        tool_callable = tools[tool_name]["callable"]

        TRY:
          result = AWAIT tool_callable(**args)
          RETURN {"success": true, "result": result}
        CATCH Exception AS e:
          RETURN {"success": false, "error": str(e)}
        END TRY
    }
  }

  OUTPUT: {
    success: boolean,
    result: Optional[Any],
    error: Optional[string]
  }
}
```

---

## Pattern 7.8: Agent Error Recovery

### Workflow

```pseudo
WORKFLOW ErrorRecovery_Retry {
  INPUT: {
    operation: Callable,
    max_retries: int = 3,
    backoff_factor: float = 2.0
  }

  STEPS: {
    STEP_1_EXECUTE_WITH_RETRY: {
      logic: |
        retry_count = 0
        delay = 1.0

        WHILE retry_count < max_retries:
          TRY:
            result = AWAIT operation()
            RETURN {"success": true, "result": result}
          CATCH RecoverableError AS e:
            retry_count += 1
            IF retry_count >= max_retries THEN
              RETURN {"success": false, "error": str(e)}
            END IF

            AWAIT asyncio.sleep(delay)
            delay *= backoff_factor
          CATCH FatalError AS e:
            RETURN {"success": false, "error": str(e), "fatal": true}
          END TRY
        END WHILE
    }
  }

  OUTPUT: {
    success: boolean,
    result: Optional[Any],
    error: Optional[string],
    retry_count: int
  }
}
```

---

## Pattern 7.9: Agent Streaming Handler

### Workflow

```pseudo
WORKFLOW StreamingHandler_SSE {
  INPUT: {
    agent: BaseAgent,
    messages: List[AgentMessage],
    state: Dict[str, Any]
  }

  STEPS: {
    STEP_1_STREAM_TOKENS: {
      logic: |
        async for token IN agent.stream(messages, state):
          sse_event = {
            "event": "token",
            "data": {"token": token, "timestamp": NOW()}
          }
          YIELD format_sse_event(sse_event)
    }

    STEP_2_STREAM_COMPLETION: {
      logic: |
        completion_event = {
          "event": "done",
          "data": {"status": "completed", "timestamp": NOW()}
        }
        YIELD format_sse_event(completion_event)
    }
  }

  OUTPUT: {
    sse_stream: AsyncGenerator[string, None]
  }
}
```

---

## Pattern 7.10: Agent Health Monitor

### Workflow

```pseudo
WORKFLOW HealthMonitor_Check {
  INPUT: {
    agent: BaseAgent
  }

  STEPS: {
    STEP_1_CHECK_AVAILABILITY: {
      logic: |
        TRY:
          test_message = [AgentMessage(role="user", content="health check")]
          result = AWAIT asyncio.wait_for(
            agent.process(test_message),
            timeout=5.0
          )
          availability = "healthy"
        CATCH asyncio.TimeoutError:
          availability = "timeout"
        CATCH Exception AS e:
          availability = "error"
        END TRY
    }

    STEP_2_COLLECT_METRICS: {
      logic: |
        metrics = {
          "availability": availability,
          "response_time_ms": elapsed_time * 1000,
          "last_check": NOW()
        }

        RETURN metrics
    }
  }

  OUTPUT: {
    health_status: Dict[string, Any]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    LegalQuery: {
      types: ["contract_question", "case_lookup", "compliance_check"],
      vietnamese_term: "Truy Vấn Pháp Lý"
    },
    Agent: {
      roles: ["orchestrator", "document_expert", "data_expert", "code_expert"],
      vietnamese_term: "Đại Lý Chuyên Môn"
    },
    Conversation: {
      statuses: ["initial", "processing", "waiting_for_tool", "completed"],
      vietnamese_term: "Cuộc Hội Thoại"
    }
  }

  BUSINESS_RULES: {
    orchestration: "All Vietnamese legal queries routed through orchestrator agent first",
    intent_detection: "Use bilingual keyword matching (Vietnamese + English) before LLM routing",
    memory: "Short-term memory (Redis, TTL=1h), Long-term memory (Neo4j, permanent)"
  }

  WORKFLOWS: {
    contract_analysis: "Orchestrator → Document Expert (with memory context)",
    case_lookup: "Orchestrator → Data Expert → Neo4j query",
    compliance_check: "Orchestrator → Compliance Expert → Vietnamese law validation"
  }
}
```

---

## Integration Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "Vietnamese legal query routing and orchestration"

  FLOW: {
    STEP_1: |
      User asks: "Tôi muốn phân tích hợp đồng bảo hiểm P2P này" (Vietnamese)
      System creates AgentState with conversation_id

    STEP_2: |
      Orchestrator detects intent: "contract_analysis"
      Keyword detected: "hợp đồng" → document_expert
      Confidence: 0.9

    STEP_3: |
      Orchestrator routes to Document Expert
      AgentState.current_agent = "document_expert"
      Memory retrieved from previous conversation

    STEP_4: |
      Document Expert analyzes contract
      Uses VietnamLegalAnalysisTool
      Streams response tokens via SSE

    STEP_5: |
      Response cached in memory (short-term + long-term)
      Checkpoint saved for recovery
      Health metrics updated
  }

  PSEUDO_CODE: |
    // Initialize orchestrator
    orchestrator = OrchestratorAgent(config)

    // Create state
    state = AgentState(
      conversation_id="conv_123",
      user_id="user_456"
    )
    state.add_message("user", "Tôi muốn phân tích hợp đồng bảo hiểm P2P này")

    // Process with orchestrator
    response = AWAIT orchestrator.process(state.messages, state.context)

    IF response.next_action == "route_to_expert" THEN
      expert = experts[response.routed_expert]
      expert_response = AWAIT expert.process(state.messages, state.context)
      state.add_message("assistant", expert_response.content)
    END IF

    // Save checkpoint
    checkpointer.save(state)
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 7.11-7.25 - Expert Agents",
    relationship: "Orchestrator routes to expert agents",
    integration: "Experts implement BaseAgent interface"
  },
  {
    pattern: "Pattern 7.26-7.40 - Graph & Tools",
    relationship: "Orchestrator builds execution graph",
    integration: "Uses StateGraph with AgentState"
  },
  {
    pattern: "Pattern 8.1-8.10 - Pydantic Schemas",
    relationship: "AgentState uses Pydantic validation",
    integration: "Shares entity schemas (User, Contract, Case)"
  }
]
```

---

## References

- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Vietnamese NLP**: BGE-M3 embeddings for Vietnamese text
- **Internal Docs**: `/docs/architecture/orchestrator-patterns.md`

---

**Total Patterns**: 10 (7.1-7.10)
**Lines**: ~780 (compliance: ✅ ≤800)
**Format**: Pseudo-code WORKFLOW
**Domain**: Vietnamese legal P2P platform
