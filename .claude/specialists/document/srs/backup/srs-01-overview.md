# SRS Micro-Agent: Overview

**Version**: 1.0.0
**Checkpoint**: C1
**Section**: 1. Tổng quan
**Output Lines**: ~200 lines
**Purpose**: Generate overview section with purpose, scope, definitions, and references

---

## Responsibility

Generate Section 1 (Tổng quan) of SRS document containing:
- 1.1 Mục đích (Purpose)
- 1.2 Phạm vi (Scope)
  - 1.2.1 Trong phạm vi (In-scope)
  - 1.2.2 Service Boundaries / Provides APIs (context-dependent)
  - 1.2.3 Ngoài phạm vi (Out-of-scope)
- 1.3 Định nghĩa & Viết tắt (Definitions & Abbreviations)
- 1.4 Tài liệu tham khảo (References)

## Input Context

Required context loaded by orchestrator:
1. **DOC_TYPE**: BASE or SUB_FEATURE
2. **BASE_TYPE**: core-library | foundation | orchestrator (if DOC_TYPE=BASE)
3. **Feature Code**: From environment variable `$FEATURE_CODE`
4. **Innovation Results**: From `innovation.md`
5. **Evidence Files**: From research phase
6. **Previous Section**: Section 0 (Document Header) for scope level

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK** (Analyze before generating):
1. **Purpose**: Overview of feature - WHAT it does and WHY
2. **Detail Level**: HIGH-LEVEL business context (NO implementation)
3. **DOC_TYPE Check**: Is this BASE or SUB_FEATURE?
4. **Evidence**: innovation.md, evidence files
5. **Length**: MAX 200 lines

**REASON** (Pattern Matching):
- IF DOC_TYPE = BASE → Section 1.2.2 = "Provides APIs/Data/Workflows"
- IF DOC_TYPE = SUB_FEATURE → Section 1.2.2 = "Service Boundaries & Integration"
- Focus on WHAT the feature provides, NOT HOW it's built
- Definitions must be business-focused, NOT technical architecture

**VALIDATE CONSTRAINTS** (Checklist):
- [ ] Purpose understood: Feature overview ✓
- [ ] Detail level: HIGH-LEVEL (WHAT/WHY) ✓
- [ ] Language rules: Vietnamese-first ≥60% ✓
- [ ] Prohibited content: NO architecture/tech/API paths ✓
- [ ] Length target: ≤200 lines ✓
- [ ] Evidence identified ✓

### Step 2: GENERATE SECTION

**Template Path:** `.claude/docs/design-standards/srs/01-overview.md`

Execute pseudo-code logic from template to generate section.

#### Generate Sub-Sections Based on DOC_TYPE

**IF DOC_TYPE === "BASE":**

```markdown
## 1. Tổng quan

### 1.1 Mục đích
[Purpose of BASE - why shared logic/data/workflow is needed]

BASE cung cấp [describe shared capabilities] cho các sub-features của [FEATURE].

**Mục tiêu chính:**
- [Primary goal 1]
- [Primary goal 2]
- [Primary goal 3]

### 1.2 Phạm vi

#### 1.2.1 Trong phạm vi
[What BASE provides - list capabilities]

#### 1.2.2 Provides APIs/Data/Workflows

[Insert appropriate template based on BASE_TYPE]

**IF BASE_TYPE === "core-library":**
BASE cung cấp shared business logic APIs cho các sub-features:

**Shared Business Logic:**
- [API/Method 1]: [Purpose]
  - Used by: [Sub-feature codes]
  - Input: [Parameters]
  - Output: [Return type]
  - Business Rules: [Core rules]

**Integration Contract:**
- Communication: Synchronous (function calls)
- Error Handling: [Strategy]
- Consistency: Strong (single source of truth)

**IF BASE_TYPE === "foundation":**
BASE cung cấp core logic và data cho các sub-features:

**Core Logic APIs:**
- [API 1]: [Purpose and consumers]
- [API 2]: [Purpose and consumers]

**Foundation Data:**
- [Data Entity 1]: [Description]
  - Used by: [≥50% sub-features]
  - Access: [Read-only/Read-write]

**Integration Contract:**
- Communication: Synchronous (function calls + data access)
- Error Handling: [Strategy]
- Consistency: Strong (centralized data)

**IF BASE_TYPE === "orchestrator":**
BASE điều phối workflows phức tạp across sub-features:

**Orchestrated Workflows:**

**Workflow 1: [Name]**
- Steps: [≥5 steps]
- Sub-features involved: [≥3 sub-features]
- Orchestration Logic:
  1. [Step 1 - Sub-feature A]
  2. [Step 2 - Sub-feature B]
  3. [Branching/Rollback scenarios]

**Coordination APIs:**
- `startWorkflow([params])`: [Purpose]
- `compensate([step])`: [Rollback logic]
- `getStatus([workflowId])`: [Status tracking]

**Integration Contract:**
- Communication: Async (event-driven) + Sync (status)
- Error Handling: Compensation/Rollback
- Consistency: Eventual (saga pattern)

#### 1.2.3 Ngoài phạm vi
[What BASE does NOT do - excluded functionality]

### 1.3 Định nghĩa & Viết tắt
[≥5 business-focused definitions]

**Định nghĩa:**
- **[Term 1]**: [Vietnamese definition] ([English term])
- **[Term 2]**: [Vietnamese definition] ([English term])
[...]

**Viết tắt:**
- **[ABBR]**: [Full form Vietnamese] ([English full form])

### 1.4 Tài liệu tham khảo
[Reference documents]

- [Doc 1]: [Description]
- [Doc 2]: [Description]
```

**IF DOC_TYPE === "SUB_FEATURE":**

```markdown
## 1. Tổng quan

### 1.1 Mục đích
[Purpose of this sub-feature - specific business capability]

### 1.2 Phạm vi

#### 1.2.1 Trong phạm vi
[What this sub-feature handles]

#### 1.2.2 Service Boundaries & Integration

**Owns (Responsibilities):**
Các business logic và data mà sub-feature này sở hữu:

- [Responsibility 1]: [Description]
  - Business Rules: [Rules owned]
  - Data Ownership: [Data entities]

**Depends On - BASE APIs** (if baseNeeded === true):
APIs được consume từ [FEATURE]-BASE:

- `[BASE_API_1]([params])`: [Purpose]
  - Used in: [Which FRs]
  - Integration: Sync/Async
  - Error Handling: [Strategy]

**Depends On - External Services:**
APIs được consume từ external services:

- **[Service Name]**: `[method]([params])`
  - Purpose: [Why needed]
  - Integration: [Protocol]
  - Error Handling: [Strategy]

**Depends On - Other Sub-Features** (choreography):
Integration với sibling sub-features:

- **[SUB-2]**: [Integration type]
  - Consumes Event: `[EventName]`
  - Produces Event: `[EventName]`
  - Consistency: [Eventual/Strong]

**Rollback/Compensation:**
[Compensation logic for distributed transactions]

**Rationale (Integration Design):**
[Why this integration approach chosen]

#### 1.2.3 Ngoài phạm vi
[What this sub-feature does NOT do]

### 1.3 Định nghĩa & Viết tắt
[≥5 business-focused definitions]

### 1.4 Tài liệu tham khảo
[Reference documents]
```

### Step 3: SELF-CRITIQUE

**CRITICAL QUESTIONS**:

**Q1: Language Compliance?**
- [ ] ALL headings start with Vietnamese?
- [ ] Zero sentences start with English?
- **Fix**: Add Vietnamese first, move English to parentheses

**Q2: Prohibited Content?** (7 categories - check each)
- [ ] Architecture patterns? (Event-driven, Microservices, Saga, CQRS - PROHIBITED in Section 1)
- [ ] Tech stack? (Redis, PostgreSQL, NestJS, Docker - PROHIBITED)
- [ ] API paths? (GET /api/..., POST /v1/... - PROHIBITED)
- [ ] Method signatures? (async function..., class... - PROHIBITED)
- [ ] SQL statements? (SELECT, CREATE TABLE - PROHIBITED)
- [ ] Source code? (```typescript, ```sql - PROHIBITED)
- [ ] Implementation details? (Retry 3x, Timeout 5s - PROHIBITED in Section 1)
- **Fix**: Remove ALL prohibited content, rewrite as requirements

**Q3: Length Limit?**
- [ ] ≤200 lines?
- **Fix**: Trim unnecessary details

**Q4: Content Scope?**
- [ ] 4 sub-sections exist (1.1, 1.2, 1.3, 1.4)?
- [ ] 1.2 has Section 1.2.2 (correct template for DOC_TYPE)?
- [ ] 1.3 has ≥5 definitions with Vietnamese + English?
- [ ] Every sentence HIGH-LEVEL (WHAT/WHY not HOW)?
- **Fix**: Elevate language from HOW to WHAT

**SELF-FIX** (Iterative):
If violations found, fix before proceeding to validation.

### Step 4: VALIDATION

**Automated Checks**:
```bash
# Language validator
node .claude/utils/language-validator.js [DOCUMENT] --min-ratio 0.60

# Prohibited content checker
node .claude/utils/prohibited-content-checker.js [DOCUMENT] --sections 1
```

**Manual Checks**:
- [ ] 4 sub-sections exist (1.1, 1.2, 1.3, 1.4)
- [ ] 1.2 has Section 1.2.2 (Provides APIs for BASE OR Service Boundaries for Sub-Feature)
- [ ] Section 1.2.2 follows template based on DOC_TYPE and BASE_TYPE
- [ ] 1.3 has ≥5 definitions with Vietnamese + English
- [ ] Language: Vietnamese-first `[Tiếng Việt] ([English term])`
- [ ] NO prohibited content (architecture patterns, tech stack in wrong places)

**If validation FAILS**: Regenerate Section 1 (max 3 attempts)
**If validation PASSES**: ✅ Continue to Section 2

## Output Format

**Section structure** (200 lines max):
- 1.1 Mục đích (~30-50 lines)
- 1.2 Phạm vi (~80-120 lines, including 1.2.2 templates)
- 1.3 Định nghĩa & Viết tắt (~30-50 lines, ≥5 definitions)
- 1.4 Tài liệu tham khảo (~10-20 lines)

## Quality Standards

- **Completeness**: All 4 sub-sections present
- **Accuracy**: Section 1.2.2 follows correct template for DOC_TYPE
- **Language**: Vietnamese-first ≥60%
- **Prohibited Content**: Zero violations
- **Conciseness**: ≤200 lines
- **Business Focus**: HIGH-LEVEL requirements (WHAT/WHY), no implementation (HOW)

---

**Next Checkpoint**: C2 (Section 2: Functional Requirements)
