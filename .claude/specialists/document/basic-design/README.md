# Basic Design Micro-Agents

**Version**: 1.0.0
**Updated**: 2025-12-07

---

## Overview

Micro-agents for Basic Design (high-level architecture) document generation. Each agent is responsible for a specific section (single responsibility principle).

## Agent List

| Agent | Sections | Checkpoint | Purpose | Lines |
|-------|----------|------------|---------|-------|
| bd-00-reasoning.md | - | C0 | Pre-reasoning: Derive components from FRs, patterns from NFRs | ~120 |
| bd-01-architecture.md | 1.1-1.2 | C1 | System Architecture Diagram + Architectural Patterns | ~180 |
| bd-02-component.md | 2.1-2.2 | C2 | Component Diagram + Service Boundaries | ~130 |
| bd-03-dataflow.md | 3.1-3.3 | C3 | Use Cases + Data Flows + Event Flow | ~170 |
| bd-04-datamodel.md | 4.1-4.2 | C4 | ERD + Entity Descriptions | ~170 |
| bd-05-state.md | 5.1-5.5 | C5 | State Management (Backend + Frontend + Cache + Sync + Consistency) | ~250 |
| bd-06-nfr.md | 6.1-6.3 | C6 | Performance + Security + Reliability Design | ~180 |

**Total**: 7 micro-agents, ~1,200 lines (vs 3,163 lines in monolithic v3.0)

## Orchestration

- **Orchestrator**: `core/orchestrate/orchestrate-bd.js`
- **Checkpoints**: C0 → C6 (validation after each agent)
- **Workflow**: `/design --basic`
- **Pattern**: Micro-agent with orchestrator (Evidence: LangChain AgentExecutor)

## Execution Flow

```
C0: Reasoning
  ↓
C1: Architecture (Sections 1.1-1.2)
  ↓
C2: Component (Sections 2.1-2.2)
  ↓
C3: Data Flow (Sections 3.1-3.3)
  ↓
C4: Data Model (Sections 4.1-4.2)
  ↓
C5: State Management (Sections 5.1-5.5)
  ↓
C6: NFR Design (Sections 6.1-6.3)
  ↓
Final Validation + User Approval
```

## Usage

### Automatic Invocation

Invoked automatically via `/design --basic` command.

### Manual Testing (CLI)

```bash
cd <PROJECT_ROOT>/.claude/utils
npx ts-node bd-orchestrator.ts BNK ACCT
```

## Agent Execution

Each agent execution follows this pattern:

1. **Load Context**:
   - SRS document (`documents/features/{FEATURE}-{SUB}/{FEATURE}-{SUB}-srs.md`)
   - System architecture (`documents/architecture/01-system-architecture.md`)
   - Evidence file (`.claude/memory-bank/master/{feature}/evidence.md`)
   - Reference document (if exists)

2. **Load Guidelines** (JIT - Just-In-Time):
   - Agent-specific guidelines from `.claude/docs/design-standards/basic-design/agent-guidelines/`
   - Only load relevant guidelines (context efficiency)

3. **Generate Section**:
   - Agent generates its assigned sections
   - Uses reasoning.json from C0 (components, patterns, technologies)
   - References previous sections for consistency

4. **Validation**:
   - Language ratio (≥60% Vietnamese)
   - Prohibited content check (no code, SQL, API paths)
   - Cross-section consistency
   - FR/NFR evidence linkage

5. **User Review**:
   - Show output preview
   - User approves/regenerates/aborts
   - Interactive checkpoint

## Standards

- **Language**: Tiếng Việt (content) + English (technical terms)
- **Prohibited**: NO source code, SQL, pseudocode in Basic Design
- **SRS Alignment**:
  - Components MUST derive from SRS Functional Requirements (FRs)
  - Patterns MUST justify by SRS Non-Functional Requirements (NFRs)
  - Business Rules (BRs) MUST be referenced in architecture decisions
- **Format**: Diagrams FIRST, descriptions AFTER
- **Scope**:
  - ✅ System Architecture Diagram, Component Diagram, Data Flow Diagram, ERD, State Management
  - ❌ NO Sequence Diagrams (Detail Design only)
  - ❌ NO API Specs (api-contracts.md only)
  - ❌ NO detailed schemas (Detail Design only)

## Checkpoint Validation

### C0: Reasoning (Schema Validation)

- Validates reasoning.json schema (Zod)
- Checks:
  - Components array exists, each has name/responsibility/frs/rationale
  - Patterns array exists, each has name/category/nfrs/rationale
  - Technologies array exists
  - Metadata complete

### C1-C2: Architecture & Component

- Language ratio ≥60% Vietnamese
- Prohibited content check
- Cross-section consistency

### C3-C5: Data Flow, Model, State

- Language ratio ≥60% Vietnamese
- Prohibited content check
- Cross-section consistency (components, entities, services referenced correctly)

### C6: NFR Design (Final + Quality Gate)

- Language ratio ≥60% Vietnamese
- Prohibited content check
- FR/NFR evidence linkage (≥90% coverage)
- Quality gate (≥9.0/10 aggregate score)

## Evidence-Driven Design

All components and patterns MUST be derived from SRS:

**Components** ← SRS Functional Requirements (FRs)
- Example: FR-001 "User authentication" → AuthService component

**Patterns** ← SRS Non-Functional Requirements (NFRs)
- Example: NFR-PERF-001 "Response time <200ms" → CQRS pattern

**Technologies** ← NFRs + BRs
- Example: NFR-SCAL-001 "Support 10K concurrent users" → PostgreSQL with connection pooling

## Directory Structure

```
specialists/document/basic-design/
├── README.md                 # This file
├── bd-00-reasoning.md        # Reasoning agent (C0)
├── bd-01-architecture.md     # Architecture agent (C1)
├── bd-02-component.md        # Component agent (C2)
├── bd-03-dataflow.md         # Data flow agent (C3)
├── bd-04-datamodel.md        # Data model agent (C4)
├── bd-05-state.md            # State management agent (C5)
└── bd-06-nfr.md              # NFR design agent (C6)
```

## Related Files

| File | Purpose |
|------|---------|
| `core/orchestrate/orchestrate-bd.js` | JavaScript orchestrator (v4.2) |
| `.claude/docs/design-standards/basic-design/agent-guidelines/` | JIT guidelines (17 files) |
| `.claude/docs/BASIC_DESIGN_STANDARD.md` | Human-readable standard (v1.1) |
| `.claude/utils/prohibited-content-checker-bd.js` | Validation utility |
| `.claude/utils/consistency-checker-bd.js` | Validation utility |
| `.claude/utils/evidence-validator-bd.js` | Validation utility |

## Migration History

- **2025-12-07**: Phase 1 - Migrated from root directory to micro-agents/basic-design/
  - Renamed bd-*-agent.md → bd-00- through bd-06- (numeric prefixes)
  - Converted bd-orchestrator.js → TypeScript
  - Created this README
  - Updated agent paths in orchestrator

- **2025-11-24**: v4.1 - Complete output format structures in agent specs
  - Redundancy approach: Format in both agent specs AND guidelines
  - Fixed incomplete output (e.g., Section 3.2 tables)

- **2025-11-23**: v3.0 - Basic Design v3.0 FULL implementation
  - 17 AI-centric guidelines created
  - Just-in-time loading pattern
  - Self-critique loops (Q1-Q4)
  - Evidence-driven architecture

---

*Basic Design Micro-Agents v1.0*
*Workflow Unification Migration - Phase 1*
