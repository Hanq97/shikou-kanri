# FastAPI LangGraph Expert Agents Specialist

**Role**: Expert Agent Orchestration (Patterns 7.11-7.17)
**Stack**: FastAPI + LangGraph + Python 3.12
**Domain**: Vietnamese Legal Expert System

---

## Pattern 7.11: Document Expert Agent

### SPECIALIST

```
IDENTITY: Vietnamese legal document Q&A, contract analysis, compliance verification
DOMAIN: Legal documents (contracts, regulations, case files)
TECH: BGE-M3 embeddings, Neo4j vector search, UTF-8 Vietnamese support
```

### WORKFLOW

```pseudo
WORKFLOW DocumentExpert {
  INPUT: { query: str, document_id?: str, state?: Dict }

  STEPS: {
    STEP_1_DETECT_TASK: {
      logic: "Classify Vietnamese query → contract_analysis | compliance | summary | qa"
      keywords: { "hợp đồng": contract, "tuân thủ": compliance, "tóm tắt": summary }
    }

    STEP_2_CONTRACT_ANALYSIS: {
      logic: "Get doc → System prompt (Vietnamese legal expert) → LLM → Extract clauses + risks"
      prompt: "Phân tích hợp đồng tiếng Việt / Analyze Vietnamese contract"
    }

    STEP_3_COMPLIANCE_CHECK: {
      logic: "Embed query → Vector search regulations → Build context → LLM compliance assessment"
      search: "Neo4j vector (document_type=regulation, limit=5)"
    }

    STEP_4_QA: {
      logic: "Embed query → Vector search docs → Build context → LLM answer"
      output: "Answer + sources + confidence"
    }
  }

  OUTPUT: { content: str, confidence: float, metadata: Dict }
  STREAMING: "AsyncGenerator[str] via LLM stream"
}
```

### KEY_INTERFACES

```python
async def process(messages: List[AgentMessage], state?: Dict) -> AgentResponse
async def stream(messages: List[AgentMessage], state?: Dict) -> AsyncGenerator[str]
```

---

## Pattern 7.12: Data Expert Agent

### SPECIALIST

```
IDENTITY: Vietnamese legal case database queries, SQL generation, statistics analysis
DOMAIN: Case database (cases, verdicts, statistics)
TECH: SQL query generation, safety validation
```

### WORKFLOW

```pseudo
WORKFLOW DataExpert {
  INPUT: { query: str, state?: Dict }

  STEPS: {
    STEP_1_CLASSIFY: {
      logic: "Vietnamese query → case_search | statistics | general_query"
      keywords: { "vụ án": case, "thống kê": statistics }
    }

    STEP_2_SQL_GENERATION: {
      logic: "LLM generate SQL SELECT (temp=0.1, very low for accuracy)"
      validation: "No DDL/DML, only SELECT, safe tables only"
    }

    STEP_3_EXECUTE: {
      logic: "Validate SQL safety → Execute → Format results JSON"
      retry: "On transient errors"
    }

    STEP_4_STATISTICS: {
      logic: "Generate aggregation SQL → Execute → LLM analyze trends"
      aggregations: "GROUP BY, COUNT, AVG, MAX, MIN"
    }
  }

  OUTPUT: { results: List[Dict], query: str, confidence: float }
}
```

### KEY_INTERFACES

```python
def _validate_sql_safety(sql: str) -> bool  # Returns False if dangerous keywords
async def _search_cases(query: str, state?: Dict) -> AgentResponse
async def _analyze_statistics(query: str, state?: Dict) -> AgentResponse
```

### CONSTRAINTS

- Only SELECT queries (no DDL/DML)
- Max 10K rows
- Timeout: 30s

---

## Pattern 7.13: Code Expert Agent

### SPECIALIST

```
IDENTITY: FastAPI code generation, debugging, Pydantic model creation
DOMAIN: API endpoints, integration code
TECH: Python 3.12+, async/await, type hints
```

### WORKFLOW

```pseudo
WORKFLOW CodeExpert {
  INPUT: { query: str, task_type: str }

  STEPS: {
    STEP_1_DETECT: {
      logic: "Classify → endpoint_generation | model_generation | debugging | general"
    }

    STEP_2_ENDPOINT: {
      logic: "System prompt (FastAPI expert) → Generate endpoint with type hints + Pydantic validation"
      rules: "Constructor injection, no @Autowired, async/await"
    }

    STEP_3_MODEL: {
      logic: "Generate Pydantic BaseModel with Field validators + Vietnamese descriptions"
    }

    STEP_4_DEBUG: {
      logic: "Analyze error → Root cause → Fix + prevention strategy"
    }
  }

  OUTPUT: { code: str, type: str, confidence: float }
}
```

### KEY_INTERFACES

```python
async def _generate_endpoint(query: str, state?: Dict) -> AgentResponse
async def _generate_pydantic_model(query: str, state?: Dict) -> AgentResponse
async def _debug_code(query: str, state?: Dict) -> AgentResponse
```

---

## Pattern 7.14: Research Expert Agent

### SPECIALIST

```
IDENTITY: Vietnamese legal research, precedent search, regulation retrieval
DOMAIN: Legal databases (luatvietnam.vn, thuvienphapluat.vn)
TECH: Web search, vector embeddings, multi-source synthesis
```

### WORKFLOW

```pseudo
WORKFLOW ResearchExpert {
  INPUT: { query: str, research_type: str }

  STEPS: {
    STEP_1_SEARCH: {
      logic: "Embed query → Vector search (internal) + Web search (external) → Merge results"
      sources: "Neo4j (document_type filter) + Web (site: filter)"
    }

    STEP_2_PRECEDENTS: {
      logic: "Vector search case_law → Find similar cases → Compare + extract learnings"
      limit: 15
    }

    STEP_3_SYNTHESIZE: {
      logic: "LLM synthesize multi-source research → Citations + comprehensive analysis"
      format: "Vietnamese legal research report"
    }
  }

  OUTPUT: { synthesis: str, sources: List[Dict], confidence: float }
}
```

### KEY_INTERFACES

```python
async def _search_regulations(query: str, state?: Dict) -> AgentResponse
async def _find_precedents(query: str, state?: Dict) -> AgentResponse
```

---

## Pattern 7.15: Image Expert Agent

### SPECIALIST

```
IDENTITY: Vietnamese legal document image OCR, signature verification, authenticity check
DOMAIN: Scanned contracts, stamps, signatures
TECH: VLM (Vision Language Model), Tesseract OCR
```

### WORKFLOW

```pseudo
WORKFLOW ImageExpert {
  INPUT: { image_data: str (base64), query: str }

  STEPS: {
    STEP_1_DETECT: {
      logic: "Classify task → text_extraction | signature_verification | authenticity_check"
      keywords: { "chữ ký": signature, "xác thực": authenticity }
    }

    STEP_2_OCR: {
      logic: "VLM analyze image (Vietnamese text) → Extract text + structure + format"
      prompt: "Trích xuất văn bản từ tài liệu pháp luật Việt Nam"
    }

    STEP_3_SIGNATURE: {
      logic: "VLM detect signatures + stamps → Count + analyze location + assess authenticity"
      output: "Signature count, positions, authenticity indicators"
    }

    STEP_4_AUTHENTICITY: {
      logic: "VLM analyze (scan quality, print consistency, tampering signs, security features)"
      score: "0-100 authenticity score"
    }
  }

  OUTPUT: { analysis: str, confidence: float, metadata: Dict }
}
```

### KEY_INTERFACES

```python
async def _extract_text(image_data: str, query: str, state?: Dict) -> AgentResponse
async def _verify_signature(image_data: str, state?: Dict) -> AgentResponse
async def _check_authenticity(image_data: str, state?: Dict) -> AgentResponse
```

### CONSTRAINTS

- Max image: 20MB
- Formats: PDF, JPEG, PNG, TIFF
- OCR confidence: ≥0.80

---

## Pattern 7.16: Voice Expert Agent

### SPECIALIST

```
IDENTITY: Vietnamese legal audio transcription, testimony extraction, hearing summary
DOMAIN: Court hearings, depositions, interviews
TECH: Whisper/faster-whisper, speech-to-text
```

### WORKFLOW

```pseudo
WORKFLOW VoiceExpert {
  INPUT: { audio_data: str, query: str }

  STEPS: {
    STEP_1_TRANSCRIBE: {
      logic: "Whisper transcribe (language=vi, model=base) → Format + punctuation + speakers"
      output: "Formatted Vietnamese transcript"
    }

    STEP_2_TESTIMONY: {
      logic: "Transcribe → LLM extract key testimony + contradictions + important details"
      prompt: "Trích xuất lời khai pháp luật"
    }

    STEP_3_SUMMARY: {
      logic: "Transcribe → LLM summarize (issues discussed, decisions, court orders)"
      format: "Hearing summary report"
    }
  }

  OUTPUT: { transcript: str, analysis: str, confidence: float }
}
```

### KEY_INTERFACES

```python
async def _transcribe_audio(audio_data: str, query: str, state?: Dict) -> AgentResponse
async def _extract_testimony(audio_data: str, state?: Dict) -> AgentResponse
async def _summarize_hearing(audio_data: str, state?: Dict) -> AgentResponse
```

### CONSTRAINTS

- Formats: MP3, WAV, OGG, M4A
- Max: 500MB
- Confidence: ≥0.75

---

## Pattern 7.17: Workflow Expert Agent

### SPECIALIST

```
IDENTITY: Multi-step legal process automation, Vietnamese workflow orchestration
DOMAIN: Case filing, document review, compliance checks
TECH: LangGraph workflow, async parallel execution
```

### WORKFLOW

```pseudo
WORKFLOW WorkflowExpert {
  INPUT: { query: str, workflow_type: str }

  STEPS: {
    STEP_1_DETECT: {
      logic: "Classify → case_filing | document_review | compliance_check | custom"
    }

    STEP_2_CASE_FILING: {
      workflow: [
        "Prepare documents (document agent)",
        "Legal check (research agent)",
        "Generate filing (code agent)",
        "Submit to court (workflow agent)"
      ]
      execution: "Sequential with retry (max 3)"
    }

    STEP_3_COMPLIANCE: {
      workflow: [
        PARALLEL: ["Check regulations", "Check precedents"],
        SEQUENTIAL: ["Generate compliance report"]
      ]
      execution: "Parallel groups → Sequential aggregation"
    }

    STEP_4_CUSTOM: {
      logic: "LLM design workflow from query → User approval → Execute"
    }
  }

  OUTPUT: { workflow_results: Dict, status: str, confidence: float }
}
```

### KEY_INTERFACES

```python
async def _execute_workflow(workflow: Workflow, state?: Dict) -> AgentResponse
async def _execute_step(step: WorkflowStep, state?: Dict, results: Dict) -> None
```

### DATA_STRUCTURES

```python
@dataclass
class WorkflowStep:
    step_id: str
    name: str
    agent_type: str  # document, data, code, research
    input_data: Dict
    status: WorkflowStepStatus
    retry_count: int = 0
    max_retries: int = 3

class Workflow:
    workflow_id: str
    steps: List[WorkflowStep]
    parallel_groups: List[List[str]]  # Parallel execution groups
    status: WorkflowStepStatus
```

### CONSTRAINTS

- Max steps: 50
- Step timeout: 300s
- Max parallel groups: 5
- Retry: exponential backoff (2s, 4s, 8s)

---

## Supporting Patterns (7.18-7.25)

### Pattern 7.18: Expert Agent Base Class

```python
# Inherits from BaseAgent
# Features: Context management, confidence scoring, fallback chains, output validation
```

### Pattern 7.19: Expert Tool Implementation

```python
# Tool wrappers for each expert
TOOLS = {
    "document": ["extract_clauses", "semantic_search", "summarize_contract"],
    "data": ["generate_sql", "execute_query", "analyze_statistics"],
    "code": ["generate_endpoint", "debug_code", "validate_syntax"],
    "research": ["search_regulations", "find_precedents", "analyze_case_law"],
    "image": ["extract_text", "verify_signature", "check_authenticity"],
    "voice": ["transcribe_audio", "extract_testimony", "summarize_hearing"],
    "workflow": ["create_workflow", "execute_step", "handle_error"]
}
```

### Pattern 7.20: Expert Context Management

```python
# Context window optimization (8000 token limit)
# Vietnamese legal terminology database (100+ terms)
# Sliding window for large documents
# Context priority scoring
```

### Pattern 7.21: Expert Prompt Templates

```python
# Bilingual Vietnamese + English system prompts
# Domain-specific terminology consistency
# Few-shot examples from legal domain
```

### Pattern 7.22: Expert Response Parsing

```python
@dataclass
class LegalAnalysisOutput:
    analysis_type: str
    key_findings: List[str]
    risk_assessment: str
    recommendations: List[str]
    confidence_score: float
```

### Pattern 7.23: Expert Fallback Chain

```python
# Multi-level fallback:
# 1. Primary expert (specific model)
# 2. General expert (fallback)
# 3. Cached response
# 4. Error message with remediation
```

### Pattern 7.24: Expert Collaboration

```python
@dataclass
class CollaborativeExpertTask:
    primary_expert: str
    supporting_experts: List[str]
    coordination_strategy: str  # sequential, parallel, feedback_loop
    merge_strategy: str  # concatenate, synthesize, conflict_resolution
```

### Pattern 7.25: Expert Validation

```python
# Output validation gates:
# Q1: Vietnamese legal accuracy (≥90%)
# Q2: Completeness (all required fields)
# Q3: Consistency (no contradictions)
# Q4: Compliance (legal standards)
```

---

## Integration Example

```python
from src.agents.experts.document_expert import DocumentExpertAgent
from src.agents.experts.data_expert import DataExpertAgent
from src.agents.experts.code_expert import CodeExpertAgent
from src.agents.experts.research_expert import ResearchExpertAgent
from src.agents.experts.workflow_expert import WorkflowExpertAgent

# Initialize experts
doc_expert = DocumentExpertAgent()
data_expert = DataExpertAgent()
research_expert = ResearchExpertAgent()
workflow_expert = WorkflowExpertAgent()

# Execute workflow
workflow_result = await workflow_expert.process([
    AgentMessage(role="user", content="Nộp đơn kiện dân sự")
])
```

---

## Implementation Checklist

- [ ] All 7 core expert agents (7.11-7.17)
- [ ] 8 supporting patterns (7.18-7.25)
- [ ] Vietnamese legal domain integration
- [ ] Constructor injection (no decorators)
- [ ] Async/await throughout
- [ ] Type hints on all functions
- [ ] Dataclass for domain models
- [ ] Error handling with fallback chains
- [ ] Streaming support
- [ ] LLM provider factory abstraction
- [ ] Neo4j repository integration
- [ ] SQL repository integration
- [ ] Vector embeddings integration
- [ ] Web search integration
- [ ] VLM provider for images
- [ ] Speech-to-text for audio
- [ ] Comprehensive logging
- [ ] ≥90% confidence thresholds
- [ ] Bilingual prompt templates
- [ ] Q1-Q4 validation gates

---

*Expert Agents Specialist v1.0*
*Patterns 7.11-7.25 for Vietnamese Legal Domain*
*Created: 2026-01-01*
