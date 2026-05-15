# Core Services Specialist
# コアサービス スペシャリスト
# Chuyên Gia Dịch Vụ Cốt Lõi

**Role**: Core Services Pattern Expert
**Focus**: ChatService, RAGService, AgentService
**Patterns**: 15 patterns
**Layer**: Service Layer (Business Logic)

---

## 🎯 SPECIALIST OVERVIEW

### Responsibilities
- Orchestrate chat flow with session and cache management
- Implement RAG 2.0 pipeline (Retrieve → Validate → Reason → Audit)
- Coordinate multi-agent system routing
- Manage hybrid retrieval (vector + graph)
- Implement streaming responses and confidence scoring

### Key Technologies
- FastAPI 0.104+ with async/await
- Python 3.11+ with `@dataclass`
- Neo4j (graph traversal)
- Qdrant (vector search)
- LLM integration (vLLM, Ollama, OpenAI)

---

## 📋 PATTERN CATEGORIES

### 1. ChatService Patterns (5 patterns)
- Dataclass constructor injection
- Process message flow
- Streaming response
- Session and cache orchestration
- Error handling

### 2. RAGService Patterns (5 patterns)
- 4-stage pipeline (Retrieve → Validate → Reason → Audit)
- Hybrid retrieval (vector + graph)
- Document validation
- LLM reasoning with citations
- Confidence scoring and auditing

### 3. AgentService Patterns (5 patterns)
- Agent orchestration
- Streaming agent execution
- Mode-based agent selection
- Response packaging
- Logging pattern

---

## 🔧 PATTERN 1.1: CHATSERVICE WITH DATACLASS CONSTRUCTOR INJECTION

**Pattern**: Using `@dataclass` for clean dependency injection

**Problem / 問題 / Vấn Đề**:
Need clean, testable service initialization with required and optional dependencies.

**Solution / 解決策 / Giải Pháp**:
```python
from dataclasses import dataclass
from src.services.agent_service import AgentService

@dataclass
class ChatService:
    """Orchestrates chat flow: session, cache, agent delegation."""
    agent_service: AgentService
    session_service: SessionService = None
    cache_service: CacheService = None

    def __post_init__(self):
        if self.session_service is None:
            self.session_service = SessionService()
        if self.cache_service is None:
            self.cache_service = CacheService()
```

**Key Points / 重要なポイント / Điểm Chính**:
- Use `@dataclass` for clean dependency injection
- Constructor injection via required fields
- Optional dependencies with defaults in `__post_init__`

**Constraints**:
- ✅ Use `@dataclass` for service classes
- ✅ Required dependencies as positional fields
- ✅ Optional dependencies initialized in `__post_init__`
- ❌ NO field injection without type hints
- ❌ NO mutable default arguments

---

## 🔧 PATTERN 1.2: CHATSERVICE PROCESS MESSAGE FLOW

**Pattern**: Multi-step message processing orchestration

**Problem / 問題 / Vấn Đề**:
Need to orchestrate complex flow: cache check, session management, agent routing, and response storage.

**Solution / 解決策 / Giải Pháp**:
```python
async def process_message(
    self,
    session_id: str,
    content: str,
    user_mode: str,
    user_id: str,
    attachments: Optional[List[dict]] = None,
) -> ChatResponse:
    """
    Process message with full flow:
    1. Check semantic cache
    2. Get/create session
    3. Add user message
    4. Route to agent
    5. Store response & cache
    """
    # 1. Check cache
    cached = await self.cache_service.get_similar(content, threshold=0.95)
    if cached:
        return cached

    # 2. Get/create session
    session = await self.session_service.get_or_create(session_id, user_id, user_mode)

    # 3. Add user message
    await self.session_service.add_message(session_id, role="user", content=content)

    # 4. Route to agent
    response = await self.agent_service.process(
        query=content,
        mode=user_mode,
        session=session,
        attachments=attachments,
    )

    # 5. Store response & cache
    await self.session_service.add_message(session_id, role="assistant", content=response.content)
    await self.cache_service.store(content, response)

    return response
```

**Key Points / 重要なポイント / Điểm Chính**:
- Multi-step orchestration pattern
- Cache-first strategy for performance
- Session management integration
- Agent delegation for business logic
- Response persistence

**Constraints**:
- ✅ Check cache before processing
- ✅ Create session if not exists
- ✅ Store both user and assistant messages
- ❌ NO direct database calls in service
- ❌ NO business logic in ChatService (delegate to agents)

---

## 🔧 PATTERN 1.3: CHATSERVICE STREAMING RESPONSE

**Pattern**: Streaming response with event types

**Problem / 問題 / Vấn Đề**:
Need real-time streaming for long-running agent responses with progress indication.

**Solution / 解決策 / Giải Pháp**:
```python
async def process_message_stream(
    self,
    session_id: str,
    content: str,
    user_mode: str,
    user_id: str,
) -> AsyncGenerator[StreamChunk, None]:
    """Stream response with event types: thinking, analysis, citation, complete."""
    session = await self.session_service.get_or_create(session_id, user_id, user_mode)

    async for event in self.agent_service.process_stream(query=content, mode=user_mode, session=session):
        yield StreamChunk(
            event_type=event.type,
            data=event.data,
            timestamp=event.timestamp,
        )
```

**Key Points / 重要なポイント / Điểm Chính**:
- Use `AsyncGenerator` for streaming
- Yield event chunks incrementally
- Event types: thinking, analysis, citation, complete
- Delegate streaming to agent service

**Constraints**:
- ✅ Use `AsyncGenerator[StreamChunk, None]`
- ✅ Yield events incrementally
- ✅ Include timestamp in each event
- ❌ NO blocking operations in stream
- ❌ NO buffering entire response

---

## 🔧 PATTERN 1.4: RAGSERVICE WITH 4-STAGE PIPELINE

**Pattern**: RAG 2.0 pipeline with audit trail

**Problem / 問題 / Vấn Đề**:
Need transparent, auditable RAG pipeline with validation and confidence scoring.

**Solution / 解決策 / Giải Pháp**:
```python
@dataclass
class RAGService:
    """RAG 2.0 Pipeline: Retrieve → Validate → Reason → Audit"""
    neo4j: Neo4jRepository
    qdrant: QdrantRepository
    llm: LLMService

    async def process(self, query: str, mode: str) -> RAGResult:
        audit_trail = {"stages": []}

        # Stage 1: Retrieve
        retrieved = await self._retrieve(query, mode)
        audit_trail["stages"].append({"name": "retrieve", "documents_found": len(retrieved)})

        # Stage 2: Validate
        validated = await self._validate(retrieved, query)
        audit_trail["stages"].append({"name": "validate", "documents_valid": len(validated)})

        # Stage 3: Reason
        response, citations = await self._reason(query, validated, mode)
        audit_trail["stages"].append({"name": "reason", "citations_count": len(citations)})

        # Stage 4: Audit
        confidence = await self._audit(response, citations, query)
        audit_trail["stages"].append({"name": "audit", "confidence": confidence})

        return RAGResult(content=response, citations=citations, confidence=confidence, audit_trail=audit_trail)
```

**Key Points / 重要なポイント / Điểm Chính**:
- 4-stage RAG pipeline (Retrieve → Validate → Reason → Audit)
- Audit trail for transparency
- Constructor injection of repositories
- Confidence scoring for response quality

**Constraints**:
- ✅ Use `@dataclass` for service
- ✅ Inject repositories via constructor
- ✅ Build audit trail for each stage
- ❌ NO skipping validation stage
- ❌ NO returning results with confidence <0.5

---

## 🔧 PATTERN 1.5: RAG HYBRID RETRIEVAL (VECTOR + GRAPH)

**Pattern**: Combining vector search and graph traversal

**Problem / 問題 / Vấn Đề**:
Need rich context from both semantic similarity (vector) and knowledge relationships (graph).

**Solution / 解決策 / Giải Pháp**:
```python
async def _retrieve(self, query: str, mode: str) -> List[Document]:
    """Hybrid retrieval: Vector search + Graph traversal."""
    # Vector search from Qdrant
    vector_results = await self.qdrant.search(
        query=query,
        collection="legal_docs",
        limit=10,
    )

    # Graph traversal from Neo4j
    graph_results = await self.neo4j.find_related(
        query=query,
        mode=mode,
        relationships=["OFTEN_CONFUSED_WITH", "CAN_BE_REDUCED_TO", "OFTEN_ACCOMPANIES"],
    )

    # Merge and deduplicate
    return self._merge_results(vector_results, graph_results)
```

**Key Points / 重要なポイント / Điểム Chính**:
- Hybrid retrieval: vector + graph
- Vector search from Qdrant (semantic similarity)
- Graph traversal from Neo4j with relationships
- Merge and deduplicate results

**Constraints**:
- ✅ Use both vector and graph retrieval
- ✅ Define relationship types for graph
- ✅ Deduplicate merged results
- ❌ NO single-source retrieval
- ❌ NO ignoring graph relationships

---

## 🔧 PATTERN 1.6: RAG DOCUMENT VALIDATION

**Pattern**: Multi-criteria document validation

**Problem / 問題 / Vấn Đề**:
Need to filter retrieved documents by authority, temporal validity, and relevance.

**Solution / 解決策 / Giải Pháp**:
```python
async def _validate(self, documents: List[Document], query: str) -> List[Document]:
    """Validate document relevance and authority."""
    validated = []
    for doc in documents:
        # Check authority (official source?)
        if not doc.is_authoritative:
            continue

        # Check temporal validity (still in effect?)
        if doc.is_expired:
            continue

        # Score relevance
        relevance = await self._score_relevance(doc, query)
        if relevance >= 0.7:
            doc.relevance_score = relevance
            validated.append(doc)

    # Sort by relevance, return top 5
    validated.sort(key=lambda d: d.relevance_score, reverse=True)
    return validated[:5]
```

**Key Points / 重要なポイント / Điểm Chính**:
- Validate authority (official source)
- Check temporal validity (not expired)
- Score relevance (threshold 0.7)
- Return top 5 documents

**Constraints**:
- ✅ Check authority and temporal validity
- ✅ Use relevance threshold (≥0.7)
- ✅ Limit results (top 5)
- ❌ NO using unverified sources
- ❌ NO including expired documents

---

## 🔧 PATTERN 1.7: RAG REASONING WITH LLM

**Pattern**: LLM-based response generation with citations

**Problem / 問題 / Vấn Đề**:
Need to generate accurate response with proper citations from validated documents.

**Solution / 解決策 / Giải Pháp**:
```python
async def _reason(self, query: str, documents: List[Document], mode: str) -> tuple[str, List[Citation]]:
    """Generate response with citations using LLM."""
    # Build context from documents
    context = self._build_context(documents)

    # Generate response
    response = await self.llm.generate(
        prompt=query,
        context=context,
        system_prompt=self._get_system_prompt(mode),
    )

    # Extract citations
    citations = self._extract_citations(response, documents)

    return response, citations
```

**Key Points / 重要なポイント / Điểm Chính**:
- Build context from validated documents
- LLM generation with context injection
- Extract citations from response
- Mode-specific system prompts

**Constraints**:
- ✅ Inject context into LLM prompt
- ✅ Use mode-specific system prompts
- ✅ Extract and verify citations
- ❌ NO generating without context
- ❌ NO ungrounded citations

---

## 🔧 PATTERN 1.8: RAG AUDITING & CONFIDENCE SCORING

**Pattern**: Multi-metric confidence scoring

**Problem / 問題 / Vấn Đề**:
Need to quantify response quality with citation coverage, grounding, and hallucination detection.

**Solution / 解決策 / Giải Pháp**:
```python
async def _audit(self, response: str, citations: List[Citation], query: str) -> float:
    """Audit response for accuracy. Returns confidence 0-1."""
    # Check citation coverage
    citation_coverage = len(citations) / max(1, len(response.split(". ")))

    # Check factual grounding
    grounding_score = await self._check_grounding(response, citations)

    # Check for hallucination
    hallucination_score = await self._detect_hallucination(response, query)

    # Combine scores (weights: 0.3, 0.5, 0.2)
    confidence = (
        citation_coverage * 0.3 +
        grounding_score * 0.5 +
        (1 - hallucination_score) * 0.2
    )

    return min(1.0, max(0.0, confidence))
```

**Key Points / 重要なポイント / Điểm Chính**:
- Citation coverage metric
- Factual grounding check
- Hallucination detection
- Weighted confidence score (0-1)

**Constraints**:
- ✅ Use multiple metrics for confidence
- ✅ Weight grounding score highest (0.5)
- ✅ Return confidence in [0, 1]
- ❌ NO single-metric confidence
- ❌ NO accepting confidence <0.5 without warning

---

## 🔧 PATTERN 1.9: RAG SYSTEM PROMPTS BY MODE

**Pattern**: Mode-specific system prompts

**Problem / 問題 / Vấn Đề**:
Need different response styles for different user modes (citizen, CSGT, lawyer, analyst).

**Solution / 解決策 / Giải Pháp**:
```python
def _get_system_prompt(self, mode: str) -> str:
    """Get system prompt based on user mode."""
    prompts = {
        "citizen": "Bạn là trợ lý pháp lý giúp người dân hiểu về quy định giao thông...",
        "csgt": "Bạn là trợ lý cho CSGT hỗ trợ xử lý vi phạm giao thông...",
        "lawyer": "Bạn là trợ lý pháp lý chuyên nghiệp...",
        "analyst": "Bạn là chuyên gia phân tích dữ liệu giao thông...",
    }
    return prompts.get(mode, prompts["citizen"])
```

**Key Points / 重要なポイント / Điểm Chính**:
- Mode-specific system prompts
- Fallback to citizen mode
- Vietnamese language support
- Role-appropriate tone and expertise

**Constraints**:
- ✅ Define prompts for all modes
- ✅ Use fallback to citizen mode
- ✅ Maintain consistent role definition
- ❌ NO mode mixing
- ❌ NO English-only prompts

---

## 🔧 PATTERN 1.10: AGENTSERVICE ORCHESTRATION

**Pattern**: Multi-agent system coordination

**Problem / 問題 / Vấn Đề**:
Need to route queries to appropriate agents and package responses uniformly.

**Solution / 解決策 / Giải Pháp**:
```python
@dataclass
class AgentService:
    """Coordinates multi-agent system."""
    rag: RAGService
    llm: LLMService

    async def process(
        self,
        query: str,
        mode: str,
        session: Session,
        attachments: Optional[List[dict]] = None,
    ) -> AgentResponse:
        """Route query to appropriate agent."""
        # Determine agent based on mode
        agent = self._select_agent(mode)

        # Execute agent
        result = await agent.process(query=query, session=session, attachments=attachments)

        return AgentResponse(
            message_id=str(uuid.uuid4()),
            content=result.content,
            citations=result.citations,
            confidence=result.confidence,
            agent_name=agent.name,
            thinking=result.thinking,
        )
```

**Key Points / 重要なポイント / Điểm Chính**:
- Agent selection based on mode
- Agent execution with uniform interface
- Response packaging with metadata
- UUID generation for message tracking

**Constraints**:
- ✅ Use mode-based agent selection
- ✅ Generate unique message ID
- ✅ Include agent name in response
- ❌ NO hardcoded agent selection
- ❌ NO missing agent metadata

---

## 🔧 PATTERN 1.11: AGENTSERVICE STREAMING

**Pattern**: Streaming agent execution with events

**Problem / 問題 / Vấn Đề**:
Need real-time streaming of agent execution with progress events.

**Solution / 解決策 / Giải Pháp**:
```python
async def process_stream(
    self,
    query: str,
    mode: str,
    session: Session,
) -> AsyncGenerator[AgentEvent, None]:
    """Stream agent execution events."""
    agent = self._select_agent(mode)

    # Yield thinking event
    yield AgentEvent(type="thinking", data={"agent": agent.name}, timestamp=time.time())

    # Stream agent execution
    async for chunk in agent.process_stream(query=query, session=session):
        yield AgentEvent(type="analysis", data=chunk, timestamp=time.time())

    # Yield completion event
    yield AgentEvent(type="complete", data={}, timestamp=time.time())
```

**Key Points / 重要なポイント / Điểm Chính**:
- Yield thinking, analysis, complete events
- Stream from agent execution
- Event timestamping
- Progressive event types

**Constraints**:
- ✅ Yield events in order: thinking → analysis → complete
- ✅ Include timestamps
- ✅ Use `AsyncGenerator`
- ❌ NO blocking in stream
- ❌ NO missing completion event

---

## 🔧 PATTERN 1.12: AGENTSERVICE AGENT SELECTION

**Pattern**: Mode-based agent mapping

**Problem / 問題 / Vấn Đề**:
Need to select appropriate agent based on user mode with fallback.

**Solution / 解決策 / Giải Pháp**:
```python
def _select_agent(self, mode: str) -> BaseAgent:
    """Select agent based on user mode."""
    agent_map = {
        "citizen": self._citizen_agent,
        "csgt": self._csgt_agent,
        "lawyer": self._lawyer_agent,
        "analyst": self._analyst_agent,
    }
    return agent_map.get(mode, self._citizen_agent)
```

**Key Points / 重要なポイント / Điểm Chính**:
- Map mode to agent
- Lazy agent initialization
- Fallback to citizen agent
- Clear agent responsibility separation

**Constraints**:
- ✅ Use dictionary mapping for agents
- ✅ Provide fallback agent
- ✅ Initialize agents lazily (properties)
- ❌ NO eager agent initialization
- ❌ NO missing fallback

---

## 🔧 PATTERN 1.13: AGENTSERVICE RESPONSE PACKAGING

**Pattern**: Uniform response structure

**Problem / 問題 / Vấn Đề**:
Need consistent response format across all agents with metadata.

**Solution / 解決策 / Giải Pháp**:
```python
def _package_response(self, result: dict, agent_name: str) -> AgentResponse:
    """Package agent result into AgentResponse."""
    return AgentResponse(
        message_id=str(uuid.uuid4()),
        content=result["content"],
        citations=result.get("citations", []),
        confidence=result.get("confidence", 0.8),
        agent_name=agent_name,
        thinking=result.get("thinking"),
    )
```

**Key Points / 重要なポイント / Điểm Chính**:
- Generate unique message ID
- Extract result fields safely
- Default confidence 0.8
- Include optional fields (citations, thinking)

**Constraints**:
- ✅ Use UUID for message ID
- ✅ Provide default values for optional fields
- ✅ Include agent name
- ❌ NO missing required fields
- ❌ NO hardcoded message IDs

---

## 🔧 PATTERN 1.14: SERVICE ERROR HANDLING

**Pattern**: Layered exception handling with context

**Problem / 問題 / Vấn Đề**:
Need to handle errors gracefully with proper logging and error propagation.

**Solution / 解決策 / Giải Pháp**:
```python
from src.core.exceptions import ServiceError, AgentError, RAGError

async def process_message(self, session_id: str, content: str) -> ChatResponse:
    try:
        response = await self.agent_service.process(...)
        return response
    except AgentError as e:
        logger.exception(f"Agent processing failed: {e}")
        raise ServiceError(f"Agent failed: {str(e)}") from e
    except RAGError as e:
        logger.exception(f"RAG processing failed: {e}")
        raise ServiceError(f"Knowledge retrieval failed: {str(e)}") from e
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        raise ServiceError("An unexpected error occurred") from e
```

**Key Points / 重要なポイント / Điểm Chính**:
- Catch specific exceptions first
- Log with context using logger.exception
- Re-raise as ServiceError for API layer
- Preserve exception chain with `from e`

**Constraints**:
- ✅ Catch specific exceptions before generic
- ✅ Use logger.exception for stack traces
- ✅ Re-raise as ServiceError
- ❌ NO silent exception swallowing
- ❌ NO exposing internal errors to API

---

## 🔧 PATTERN 1.15: SERVICE LOGGING PATTERN

**Pattern**: Structured logging with context

**Problem / 問題 / Vấn Đề**:
Need consistent, informative logging across services for debugging and monitoring.

**Solution / 解決策 / Giải Pháp**:
```python
from src.core.logging import get_logger

logger = get_logger(__name__)

async def process_message(self, session_id: str, content: str) -> ChatResponse:
    logger.info(f"Processing message for session {session_id}: {content[:50]}...")

    # Process...

    logger.info(f"Message processed successfully. Response length: {len(response.content)}")
    logger.debug(f"Full response: {response}")

    return response
```

**Key Points / 重要なポイント / Điểm Chính**:
- Use `get_logger(__name__)` for module logger
- Log at appropriate levels (info, debug, error)
- Truncate long content in logs
- Include relevant context (session_id, length, etc.)

**Constraints**:
- ✅ Use module-level logger
- ✅ Truncate long strings in info logs
- ✅ Use debug for full content
- ❌ NO print statements
- ❌ NO logging sensitive data (passwords, tokens)

---

## 📊 PATTERN SUMMARY

### ChatService Patterns (5)
1. Dataclass constructor injection
2. Process message flow
3. Streaming response
4. (Covered in 1.2) Session and cache orchestration
5. (Covered in 1.14) Error handling

### RAGService Patterns (5)
6. 4-stage pipeline
7. Hybrid retrieval
8. Document validation
9. LLM reasoning
10. Confidence scoring

### AgentService Patterns (5)
11. Agent orchestration
12. Streaming execution
13. Agent selection
14. Response packaging
15. Logging pattern

---

## ✅ CRITICAL CONSTRAINTS

### Required Patterns
- ✅ Use `@dataclass` for service classes
- ✅ Constructor injection for dependencies
- ✅ `AsyncGenerator` for streaming
- ✅ 4-stage RAG pipeline (Retrieve → Validate → Reason → Audit)
- ✅ Hybrid retrieval (vector + graph)
- ✅ Multi-metric confidence scoring
- ✅ Mode-based system prompts
- ✅ Layered exception handling
- ✅ Structured logging

### Prohibited Patterns
- ❌ NO field injection without type hints
- ❌ NO mutable default arguments
- ❌ NO single-source retrieval (must use hybrid)
- ❌ NO skipping validation stage
- ❌ NO unverified sources or expired documents
- ❌ NO generating without context
- ❌ NO silent exception swallowing
- ❌ NO logging sensitive data
- ❌ NO print statements for logging
- ❌ NO missing audit trail

---

**Version**: 1.0
**Created**: 2025-12-31
**Layer**: Service Layer (Business Logic)
**Dependencies**: Repositories (Neo4j, Qdrant), LLMService, SessionService, CacheService
**Patterns**: 15 core service patterns

---

*Core Services Specialist: ChatService | RAGService | AgentService | 15 Patterns*
