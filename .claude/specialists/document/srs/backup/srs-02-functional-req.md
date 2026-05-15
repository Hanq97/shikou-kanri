# SRS Micro-Agent: Functional Requirements

**Version**: 1.0.0
**Checkpoint**: C2
**Section**: 2. Functional Requirements
**Output Lines**: ~300 lines
**Purpose**: Generate functional requirements grouped by functional areas

---

## Responsibility

Generate Section 2 (Functional Requirements) of SRS document containing:
- Functional areas (domain entity / user workflow / capability groupings)
- Functional Requirements (FRs) with unique IDs
- Format: FR-[FEATURE]-[SUB]-[###]
- Priority, Dependencies, Business Rules for each FR

## Input Context

Required context loaded by orchestrator:
1. **Scope Level**: From Section 0 (Core/Full/Premium)
2. **Feature Code**: From environment variable `$FEATURE_CODE`
3. **Innovation Results**: From `innovation.md`
4. **Evidence Files**: From research phase
5. **Previous Sections**: Section 0-1 for context

## FR Count by Scope Level

| Scope Level | FR Count | Tolerance |
|-------------|----------|-----------|
| Core | 15-20 FRs | ±5 |
| Full | 40-50 FRs | ±5 |
| Premium | 80-100 FRs | ±10 |

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK** (Analyze before generating):
1. **Purpose**: Define WHAT the system must do (requirements)
2. **Detail Level**: HIGH-LEVEL requirements (WHAT, not HOW)
3. **Scope Level**: Check from Section 0 → determine FR count
4. **Functional Areas**: Group by domain entities, user workflows, capabilities
5. **Evidence**: innovation.md, evidence files
6. **Length**: MAX 300 lines

**REASON** (Pattern Matching):
- Requirements describe WHAT system must do, NOT HOW it's implemented
- Focus on business capabilities, NOT technical solutions
- Group FRs logically by functional areas
- Each FR must be testable and traceable

**VALIDATE CONSTRAINTS** (Checklist):
- [ ] Purpose understood: Functional requirements ✓
- [ ] Detail level: HIGH-LEVEL (WHAT) ✓
- [ ] Language rules: Vietnamese-first ≥60% ✓
- [ ] Prohibited content: NO architecture/tech/implementation ✓
- [ ] Length target: ≤300 lines ✓
- [ ] FR count matches scope level ✓

### Step 2: GENERATE SECTION

**Template Path:** `.claude/docs/design-standards/srs/02-functional-requirements.md`

Execute pseudo-code logic from template to generate section.

**Output Format:**

```markdown
## 2. Functional Requirements

### 2.1 [Functional Area 1 Name]

#### FR-[FEATURE]-[SUB]-001: [Requirement Title Vietnamese]
**Description:** Hệ thống phải/cần [Vietnamese description of WHAT system must do]

**Priority:** High | Medium | Low

**Dependencies:**
- [List of dependent FRs or "None"]
- Format: FR-XXX-YYY-ZZZ

**Business Rules:**
- BR-001: [Business rule Vietnamese]
- BR-002: [Business rule Vietnamese]
- [Or "None" if no specific rules]

**Acceptance Criteria Reference:** AC-001, AC-002 (defined in Section 5)

---

#### FR-[FEATURE]-[SUB]-002: [Next requirement...]
[...]

### 2.2 [Functional Area 2 Name]

#### FR-[FEATURE]-[SUB]-010: [Another requirement...]
[...]

[Continue grouping FRs by functional areas]
```

**Functional Area Grouping Strategy:**

1. **Domain Entity-Based** (recommended for data-heavy features):
   - Account Management
   - Transaction Processing
   - Document Management

2. **User Workflow-Based** (recommended for workflow features):
   - Onboarding
   - Application Process
   - Approval Workflow

3. **Capability-Based** (recommended for technical features):
   - Authentication & Authorization
   - Notification System
   - Reporting & Analytics

**FR Format Rules:**
- **ID**: FR-[FEATURE]-[SUB]-[###] (sequential numbering, zero-padded)
- **Title**: Vietnamese, concise, action-oriented
- **Description**: Must start with "Hệ thống phải/cần..." (Vietnamese-first)
- **Priority**: High (critical), Medium (important), Low (nice-to-have)
- **Dependencies**: List related FRs or "None"
- **Business Rules**: Numbered (BR-001, BR-002...) or "None"

### Step 3: SELF-CRITIQUE

**CRITICAL QUESTIONS**:

**Q1: Language Compliance?**
- [ ] ALL headings start with Vietnamese?
- [ ] Zero sentences start with English?
- [ ] Technical terms in parentheses after Vietnamese?
- **Fix**: Add Vietnamese first, move English to parentheses

**Q2: Prohibited Content?** (7 categories - **CRITICAL FOR SECTION 2**)

**Architecture Patterns** (PROHIBITED):
- [ ] Event-driven, FBO, Cache-aside, State machine, Idempotency pattern?
- [ ] Microservices, Monolith, Service-oriented?
- [ ] Saga, CQRS, Event Sourcing?

**Technology Stack** (PROHIBITED):
- [ ] Redis, PostgreSQL, MongoDB, Elasticsearch?
- [ ] NestJS, React, TypeScript, Express?
- [ ] Docker, Kubernetes, AWS, Azure, GCP?

**API/Protocol Details** (PROHIBITED):
- [ ] REST, GraphQL, gRPC, HTTP, WebSocket?
- [ ] GET /api/..., POST /v1/...?
- [ ] Endpoint paths, HTTP methods?

**Implementation Details** (PROHIBITED):
- [ ] Retry 3x, Timeout 5s, Connection pool?
- [ ] Database indexes, Query optimization?
- [ ] Cache TTL, Rate limiting specifics?

**Code/SQL** (PROHIBITED):
- [ ] ```typescript, ```sql, ```javascript?
- [ ] SELECT, CREATE TABLE, INSERT?
- [ ] Pseudocode, method signatures?

**Fix**: Remove ALL prohibited content. Rewrite as requirements:
```markdown
❌ "System must cache user balance in Redis with 5min TTL"
✅ "Hệ thống phải cung cấp user balance với độ trễ < 100ms"

❌ "Implement Event-driven architecture for notifications"
✅ "Hệ thống phải gửi notification realtime khi có transaction mới"

❌ "POST /api/accounts endpoint must validate account number"
✅ "Hệ thống phải validate account number trước khi tạo account"
```

**Q3: Length Limit?**
- [ ] FR count matches Scope Level (±tolerance)?
- [ ] Total ≤300 lines?
- **Fix**: Adjust FR count or trim descriptions

**Q4: Content Scope?**
- [ ] All FRs have unique IDs (FR-[FEATURE]-[SUB]-[###])?
- [ ] All FRs have Priority (High/Medium/Low)?
- [ ] All FRs have Dependencies (or "None")?
- [ ] All FRs have Business Rules (or "None")?
- [ ] Every FR describes WHAT (not HOW)?
- **Fix**: Add missing fields, elevate HOW to WHAT

**SELF-FIX** (Iterative):
```
if violations_found:
  - Remove architecture patterns → business requirements
  - Remove tech stack → functional capabilities
  - Remove API paths → business operations
  - Remove implementation details → performance targets
  - Ensure all FRs complete with Priority/Dependencies/BRs
  - Re-check Q1-Q4
```

### Step 4: VALIDATION

**Automated Checks**:
```bash
# Language validator
node .claude/utils/language-validator.js [DOCUMENT] --min-ratio 0.60

# Prohibited content checker (CRITICAL for Section 2)
node .claude/utils/prohibited-content-checker.js [DOCUMENT] --sections 2
```

**Manual Checks**:
- [ ] FR count trong range của Scope Level (±5/±10)
- [ ] All FRs have unique IDs (FR-[FEATURE]-[SUB]-[###])
- [ ] All FRs have Priority (High/Medium/Low)
- [ ] All FRs have Dependencies listed (or "None")
- [ ] All FRs have Business Rules (or "None")
- [ ] Language: Vietnamese-first
- [ ] **CRITICAL**: NO architecture patterns (Event-driven, FBO, Cache-aside, etc.)
- [ ] **CRITICAL**: NO technology stack (Redis, PostgreSQL, NestJS, React, etc.)
- [ ] **CRITICAL**: NO implementation details

**Prohibited Keywords Regex (Reference):**
```regex
❌ Event-driven|FBO|Cache-aside|State machine|Idempotency pattern
❌ Redis|PostgreSQL|MongoDB|NestJS|React|TypeScript
❌ REST|GraphQL|gRPC|HTTP|WebSocket
❌ Microservices|Monolith|Service-oriented
❌ Docker|Kubernetes|AWS|Azure|GCP
```

**If validation FAILS**:
- Display errors với line numbers
- Regenerate Section 2 (max 3 attempts)
- If max attempts reached: Exit với detailed error report

**If validation PASSES**: ✅ Continue to Section 3

## Output Format

**Section structure** (300 lines max):
- Grouped by 3-5 Functional Areas
- Each Functional Area contains multiple FRs
- FR format: ID, Title, Description, Priority, Dependencies, Business Rules
- Sequential numbering: FR-XXX-YYY-001, FR-XXX-YYY-002, ...

**Example Functional Area:**
```markdown
### 2.1 Account Management

#### FR-BNK-ACCT-001: Tạo tài khoản mới
**Description:** Hệ thống phải cho phép user tạo tài khoản mới với thông tin cá nhân đầy đủ

**Priority:** High

**Dependencies:** None

**Business Rules:**
- BR-001: User phải ≥18 tuổi
- BR-002: Một CCCD chỉ được tạo tối đa 3 tài khoản
- BR-003: Account number phải unique trong hệ thống

**Acceptance Criteria Reference:** AC-001, AC-002

---

[More FRs in this area...]
```

## Quality Standards

- **Completeness**: All FRs have ID, Title, Description, Priority, Dependencies, Business Rules
- **FR Count**: Matches Scope Level (±tolerance)
- **Language**: Vietnamese-first ≥60%
- **Prohibited Content**: Zero violations (architecture, tech, implementation)
- **Traceability**: All FRs have unique IDs for tracking
- **Business Focus**: HIGH-LEVEL requirements (WHAT), no implementation (HOW)

---

**Next Checkpoint**: C3 (Section 3: Non-Functional Requirements)
