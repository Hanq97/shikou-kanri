# SRS Micro-Agents

**Version**: 1.0.0 (v2.0 Reasoning Engine)
**Updated**: 2025-12-07

---

## Overview

Micro-agents for Software Requirements Specification (SRS) document generation. Each agent is responsible for a specific section (single responsibility principle).

**Key Features:**
- Vietnamese-first language enforcement (≥60% ratio)
- Prohibited content validation (7 categories)
- Evidence-driven requirements
- Just-in-Time (JIT) loading pattern
- Inline Acceptance Criteria (v2.0 format)

## Agent List

| Agent | Section | Checkpoint | Purpose | Lines |
|-------|---------|------------|---------|-------|
| srs-00-document-info.md | 0 | C0 | Document metadata, scope level, expected metrics | ~20 |
| srs-01-overview.md | 1 | C1 | Purpose, scope, definitions, references | ~200 |
| srs-02-functional-req.md | 2 | C2 | Functional Requirements (FRs) grouped by areas | ~300 |
| srs-03-nonfunctional-req.md | 3 | C3 | NFRs (Performance, Security, Reliability, Scalability) | ~200 |
| srs-04-user-stories.md | 4 | C4 | User Stories with inline Acceptance Criteria | ~400 |
| srs-05-acceptance-criteria.md | 5 | C5 | Standalone AC (OPTIONAL - usually SKIP) | ~150 |
| srs-06-constraints.md | 6 | C6 | Technical, Business, Operational constraints | ~150 |

**Total**: 7 micro-agents, ~1,400 lines (Full scope), 6 required + 1 optional

## Orchestration

- **Orchestrator**: `core/orchestrate/orchestrate-srs.js`
- **Checkpoints**: C0 → C6 (validation after each agent)
- **Workflow**: `/design --srs`
- **Pattern**: Micro-agent with orchestrator (Evidence: LangChain AgentExecutor)

## Execution Flow

```
C0: Document Information
  ↓
C1: Overview (Purpose, Scope, Definitions, References)
  ↓
C2: Functional Requirements (FRs grouped by functional areas)
  ↓
C3: Non-Functional Requirements (PERF, SEC, REL, SCAL)
  ↓
C4: User Stories with Inline AC (v2.0 format)
  ↓
C5: Acceptance Criteria (OPTIONAL - SKIP by default)
  ↓
C6: Constraints (TECH, BIZ, OPS)
  ↓
Final Validation + User Approval
```

## Usage

### Automatic Invocation

Invoked automatically via `/design --srs` command.

### Manual Testing (CLI)

```bash
cd <PROJECT_ROOT>/.claude/utils
npx ts-node srs-orchestrator.ts BNK ACCT
```

**Arguments:**
- `<FEATURE>`: Feature code (3-4 chars uppercase, e.g., BNK, LND, AUT)
- `<SUB>`: Sub-feature code (4 chars, e.g., ACCT, COMM, LGIN) or BASE

**Environment Variables:**
- `CREATE_BASE=true`: Create BASE document instead of sub-feature
- `BASE_TYPE=core-library|foundation|orchestrator`: BASE type (if CREATE_BASE=true)
- `INCLUDE_SECTION_5=true`: Include Section 5 (standalone AC) - default: false

**Examples:**
```bash
# Sub-feature SRS
npx ts-node srs-orchestrator.ts BNK ACCT

# BASE SRS (core-library)
CREATE_BASE=true BASE_TYPE=core-library npx ts-node srs-orchestrator.ts LND BASE

# Include Section 5 (standalone AC)
INCLUDE_SECTION_5=true npx ts-node srs-orchestrator.ts AUT LGIN
```

## Agent Execution

Each agent execution follows this pattern:

1. **Load Context**:
   - Innovation results (`innovation.md`)
   - Evidence files (`evidence.md`)
   - Previous sections (for cross-reference)
   - Reference documents (if exists)

2. **Load Guidelines** (JIT - Just-In-Time):
   - Agent-specific guidelines from `.claude/docs/design-standards/srs/agent-guidelines/`
   - Only load relevant guidelines (context efficiency)

3. **Generate Section** (v2.0 3-Step Pattern):
   - **Step 1**: Pre-Generation Reasoning (THINK → REASON → VALIDATE)
   - **Step 2**: Generate với explicit constraints
   - **Step 3**: Self-Critique (Q1-Q4 → SELF-FIX)

4. **Validation**:
   - Language ratio (≥60% Vietnamese) via `language-validator.js`
   - Prohibited content check (7 categories) via `prohibited-content-checker.js`
   - Section-specific checks

5. **User Review** (Checkpoint):
   - Show output preview
   - User approves/regenerates/aborts
   - Interactive checkpoint

## Standards

**Language Policy:**
- **Content**: Vietnamese-first (≥60% ratio)
- **Technical Terms**: English in parentheses after Vietnamese
- **Format**: `[Tiếng Việt] ([English term])`
- **Example**: "Hệ thống phải hỗ trợ authentication qua JWT tokens"

**Prohibited Content (7 Categories):**

SRS is HIGH-LEVEL requirements (WHAT/WHY), NOT implementation (HOW).

| Category | Examples | Allowed in Sections |
|----------|----------|---------------------|
| Architecture Patterns | Event-driven, Microservices, Saga, CQRS | ❌ NEVER (implementation detail) |
| Technology Stack | Redis, PostgreSQL, NestJS, React, Docker | ✅ Section 6 only (constraints) |
| API/Protocol Details | REST, GraphQL, GET /api/..., HTTP methods | ❌ NEVER (implementation detail) |
| Method Signatures | async function..., class..., interface... | ❌ NEVER (code) |
| SQL Statements | SELECT, CREATE TABLE, INSERT, indexes | ❌ NEVER (code) |
| Source Code | ```typescript, ```sql, pseudocode | ❌ NEVER (code) |
| Implementation Details | Retry 3x, Timeout 5s, Connection pool, Cache TTL | ❌ NEVER (implementation strategy) |

**Validation Utilities:**
- `.claude/utils/language-validator.js` - Vietnamese ratio + heading validation (CLI)
- `.claude/utils/prohibited-content-checker.js` - 7-category violation detection (CLI)

**SRS Alignment:**
- Components MUST derive from FRs (Functional Requirements)
- NFRs MUST be measurable with specific targets
- Business Rules (BRs) MUST be referenced in FRs
- All requirements MUST be traceable (FR-XXX-YYY-ZZZ)

**Format:**
- **ID Conventions**:
  - FRs: `FR-[FEATURE]-[SUB]-[###]` (e.g., FR-BNK-ACCT-001)
  - NFRs: `NFR-[CATEGORY]-[###]` (e.g., NFR-PERF-001, NFR-SEC-002)
  - USs: `US-[ROLE]-[###]` (e.g., US-LNDR-001, US-BRRW-005)
  - ACs (inline): `AC-{US#}.{seq}` (e.g., AC-001.1, AC-001.2)
  - ACs (standalone): `AC-[###]` (e.g., AC-001, AC-002)
  - Constraints: `CON-[TYPE]-[###]` (e.g., CON-TECH-001, CON-BIZ-002)

**Scope:**
- ✅ Requirements (WHAT system must do)
- ✅ Quality attributes (performance targets, security requirements)
- ✅ User goals and acceptance criteria
- ✅ Constraints and limitations
- ❌ NO Architecture diagrams (Basic Design only)
- ❌ NO API specifications (api-contracts.md only)
- ❌ NO Implementation code (Detail Design only)

## Checkpoint Validation

### C0: Document Information

- Validates metadata completeness
- Checks:
  - Scope Level specified (Core/Full/Premium)
  - Expected Metrics match scope
  - Current date used
  - Status = Draft

### C1: Overview

- Language ratio ≥60% Vietnamese
- Prohibited content check
- Section 1.2.2 follows correct template (BASE vs Sub-Feature)
- ≥5 definitions with Vietnamese + English

### C2: Functional Requirements (CRITICAL)

- Language ratio ≥60% Vietnamese
- **Prohibited content check** (architecture, tech stack, API paths, implementation)
- FR count matches Scope Level (±5 tolerance)
- All FRs have: ID, Priority, Dependencies, Business Rules
- Cross-section consistency

### C3: Non-Functional Requirements

- Language ratio ≥60% Vietnamese
- Prohibited content check (NO implementation solutions, only targets)
- NFR count matches Scope Level
- All 4 categories present (PERF, SEC, REL, SCAL)
- All NFRs have measurable metrics

### C4: User Stories (v2.0 Format)

- Language ratio ≥60% Vietnamese
- All USs have ≥2 inline ACs (AC-{US#}.{seq} format)
- US count matches Scope Level
- All USs linked to FRs
- All ACs use GIVEN-WHEN-THEN format

### C5: Acceptance Criteria (OPTIONAL)

- **Default**: SKIP (inline AC in Section 4)
- Only use if compliance/audit requires standalone AC
- Validation:
  - Section 4 does NOT have inline AC (no conflict)
  - AC count ≥ (US count × 2)
  - Traceability matrix complete

### C6: Constraints (Final Quality Gate)

- Language ratio ≥60% Vietnamese
- All 3 categories present (TECH, BIZ, OPS)
- Constraint count matches Scope Level
- All constraints have: Description, Impact, Rationale, Mitigation

## Evidence-Driven Requirements

All requirements MUST be derived from research evidence:

**Functional Requirements (FRs)** ← Innovation Results + Evidence
- Example: Evidence shows "Users need to track multiple loans" → FR-001 "Display loan list with filters"

**Non-Functional Requirements (NFRs)** ← Business Needs + Evidence
- Example: Evidence shows "1000 concurrent users expected" → NFR-SCAL-001 "Support 1000 concurrent users"

**User Stories (USs)** ← Functional Requirements
- Example: FR-001 "Display loan list" → US-LNDR-001 "As a Lender, I want to view available loans"

**Acceptance Criteria (ACs)** ← User Stories
- Example: US-LNDR-001 → AC-001.1 "GIVEN I am logged in, WHEN I view loans, THEN I see list with filters"

## Scope Level (Determines Document Size)

| Scope Level | FRs | NFRs | USs | ACs | Constraints | Total Lines |
|-------------|-----|------|-----|-----|-------------|-------------|
| **Core** | 15-20 | 5-8 | 10-15 | 20-30 | 5-8 | ~800-1,000 |
| **Full** | 40-50 | 12-18 | 30-40 | 60-80 | 10-15 | ~1,200-1,500 |
| **Premium** | 80-100 | 25+ | 60-80 | 120-160 | 15-20 | ~2,000-2,500 |

Scope Level is determined during `/innovate --srs` phase and stored in `innovation.md`.

## Directory Structure

```
specialists/document/srs/
├── README.md                      # This file
├── srs-00-document-info.md        # Document header agent (C0)
├── srs-01-overview.md             # Overview agent (C1)
├── srs-02-functional-req.md       # Functional Requirements agent (C2)
├── srs-03-nonfunctional-req.md    # Non-Functional Requirements agent (C3)
├── srs-04-user-stories.md         # User Stories with inline AC agent (C4)
├── srs-05-acceptance-criteria.md  # Standalone AC agent (C5 - OPTIONAL)
└── srs-06-constraints.md          # Constraints agent (C6)
```

## Related Files

| File | Purpose |
|------|---------|
| `core/orchestrate/orchestrate-srs.js` | JavaScript orchestrator (v3.0) |
| `.claude/docs/design-standards/srs/agent-guidelines/` | JIT guidelines (19 files) |
| `.claude/docs/SRS_STANDARD.md` | Human-readable standard (v1.1 - Tiếng Việt) |
| `.claude/utils/language-validator.js` | Vietnamese ratio validation utility |
| `.claude/utils/prohibited-content-checker.js` | Prohibited content validation utility |
| `.claude/archive/legacy/agents/srs-specialist.md` | Monolithic SRS agent (v2.0 - legacy, 1,546 lines) |

## Migration History

- **2025-12-07**: Phase 2 - Migrated from monolithic srs-specialist.md to micro-agents/srs/
  - Extracted 7 micro-agents from 1,546-line monolithic agent
  - Created srs-orchestrator.ts (TypeScript)
  - Created this README
  - Aligned with Basic Design micro-agent pattern

- **2025-11-23**: v2.0 - SRS Quality Improvement (Reasoning Engine)
  - Pre-Generation Reasoning (THINK → REASON → VALIDATE)
  - Self-Critique Loop (Q1-Q4 → SELF-FIX)
  - 19 AI-centric guidelines created
  - Just-in-Time loading pattern
  - Inline AC format (v2.0)
  - Language validation + Prohibited content checker
  - Quality improvement: 6.95/10 → 9.5/10

- **2025-11-18**: v1.1 - Vietnamese Documentation Standards
  - Language policy: Vietnamese-first content ≥60%
  - Prohibited content rules enforced
  - Technical terms in English after Vietnamese

---

*SRS Micro-Agents v1.0 (v2.0 Reasoning Engine)*
*Workflow Unification Migration - Phase 2*
