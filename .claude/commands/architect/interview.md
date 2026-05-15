# /architect Phase 1: Smart Interview + Domain Research

> **EXECUTION CONSTRAINTS**
>
> 1. INLINE conversation only.
> 2. Save assessment.md after EACH topic completion.
> 3. Update architect-state.json after EACH topic.
> 4. WAIT for user response at every question.

---

## Purpose

Build Domain Knowledge Base, then conduct adaptive interview to create Architecture Assessment.
AI acts as: Domain Expert + Reference Architect + Localization Advisor.

**Input**: User idea (greenfield) or codebase (reverse-engineer)
**Output**: `architect/assessment.md`, `architect/domain-knowledge.md`

---

## Step 0: Mode Branch

Read `architect-state.json` → extract `mode`.

### Greenfield Mode

Ask user to describe the project idea:

```
Describe your project idea. This can be:
  - A few bullet points
  - A paragraph
  - A file path to read

The more context you provide, the better the architecture will be.
```

WAIT for user response. Store as `userInput`.

AI analyzes `userInput` → identify domain keywords.
If confident → display: "Detected domain: [domain]. Correct?"
If uncertain → ask: "Which domain best describes your project?"
  Options: fintech, healthcare, CRM, e-commerce, ERP, education, social, IoT, other

WAIT user confirm domain. Save `domain` to architect-state.json.

### Reverse-engineer Mode

Ask user for codebase path (default: current directory).

Scan codebase automatically:
- **Tech stack**: Read package.json / pom.xml / go.mod / requirements.txt / Cargo.toml
- **Architecture pattern**: Glob src/ → analyze folder structure (layers, modules, features)
- **Entities/models**: Grep for model/entity definitions (schemas, migrations, types)
- **API endpoints**: Grep for route/controller/handler definitions
- **Security**: Grep for auth middleware, encryption, JWT patterns
- **Integration**: Grep for HTTP clients, message queues, external API calls

Display code analysis results:

```
Codebase Analysis Complete:
  Tech stack: [languages, frameworks, databases]
  Architecture: [pattern — layered, modular, microservices]
  Entities: [N] models found
  Endpoints: [N] routes found
  Integrations: [list external services]
```

WAIT user confirm. AI identify domain from code context.

Pre-fill `architect/assessment.md` with code analysis results (Section 0: Code Analysis).

---

## Step 1: Build Domain Knowledge Base

Using the confirmed domain, AI builds Domain Knowledge Base with 8 sections:

### 1.1 Claude generates (inline, full context):

For each of the 8 sections, generate domain-specific knowledge:

1. **Standard Workflows** — Industry-standard processes, step by step
2. **Core Entities & Rules** — Must-have entities, mandatory business rules
3. **Regulatory Requirements** — Laws, compliance, certifications for target market
4. **Reference Architectures** — How major systems (Stripe, Salesforce, Epic, etc.) solve this
5. **Domain Edge Cases** — Tricky scenarios that generic designs miss
6. **Performance Patterns** — Domain-specific performance characteristics and bottlenecks
7. **Security Patterns** — Domain-specific security requirements and standards
8. **Integration Patterns** — Common external systems to connect with

### 1.2 Gemini enriches (if available):

```bash
node core/cli/ops.js gemini-call --prompt "
  Domain: [domain]
  Market: [target market if known]

  Provide:
  1. Current regulatory landscape and recent changes
  2. Market trends and competitor analysis
  3. Technology adoption patterns in this domain
  4. Common pitfalls and failure patterns
" --model "gemini-2.0-flash"
```

If Gemini unavailable → continue with Claude-only. Log: "Gemini unavailable — proceeding with Claude knowledge base."

### 1.3 Save Domain KB

Merge Claude + Gemini results → save `architect/domain-knowledge.md`:

```markdown
# Domain Knowledge Base: [domain]
## Generated: [timestamp]
## Sources: Claude [+ Gemini if available]

## 1. Standard Workflows
[content]

## 2. Core Entities & Rules
[content]

## 3. Regulatory Requirements
[content]

## 4. Reference Architectures
[content]

## 5. Domain Edge Cases
[content]

## 6. Performance Patterns
[content]

## 7. Security Patterns
[content]

## 8. Integration Patterns
[content]
```

Display: "Domain Knowledge Base built: [domain] — 8 sections."

---

## Step 2: Generate Interview Plan

Analyze domain complexity to determine interview scope:

| Domain Complexity | Topics | Questions (est.) | Time (est.) |
|---|---|---|---|
| Simple (blog, CMS, portfolio) | 3 | ~8 | ~15 min |
| Medium (CRM, e-commerce, SaaS) | 5 | ~15 | ~30 min |
| Complex (fintech, healthcare, ERP) | 7 | ~22 | ~45 min |

Generate topics list based on domain + Domain KB. Each topic has:
- Topic name
- Estimated questions
- Key areas to cover (from Domain KB)
- Which architecture outputs this topic feeds into (ADRs, Documents)

Display plan:

```
Interview Plan: [domain]
  [N] topics | ~[M] questions | ~[T] minutes estimated

  1. [Topic name] (~[Q] questions)
     Focus: [key areas]
     Feeds into: [ADR/Doc references]

  2. [Topic name] (~[Q] questions)
     ...

Confirm to start interview? (y/n)
```

WAIT user confirm.

Save `architect/interview-plan.md`.
Update architect-state.json: `interview.totalTopics = N`.

---

## Step 3: Interview Loop

FOR each topic in interview plan:

### 3.1 Display Progress

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Topic [current/total]: [topic name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3.2 Generate Questions for THIS Topic

Based on:
- Domain Knowledge Base (relevant section)
- Previous topic answers (adaptive context)
- Topic scope from interview plan

Generate questions with 3 types:

**CONFIRM** — Validate domain standard applies:
```
[Domain KB] says [standard X] is typical for [domain].
Does your project follow this standard?
  - Yes (default)
  - No — explain how yours differs
  - Not sure → AI records as assumption
```

**DISCOVER** — Explore customization:
```
Beyond [standard pattern], does your project have any specific requirements for [area]?
Examples from similar systems: [reference from KB]
```

**DECIDE** — Choose between alternatives affecting architecture:
```
For [area], there are [N] common approaches:

Option A: [name]
  How it works: [description from KB]
  Architecture impact: [what changes — ADR-XXX]
  Used by: [reference systems]

Option B: [name]
  How it works: [description]
  Architecture impact: [what changes]
  Used by: [reference systems]

Which approach fits your project? (A/B/other/not sure)
```

### 3.3 Ask Each Question

FOR each question in topic:

  - **Simple question** (yes/no, pick 1): Use output with clear options
  - **Complex question** (trade-offs, multiple aspects): Full context + explanation

  WAIT for user response.

  IF user says "chua biet" / "not sure" / "skip":
    Record assumption with AI-suggested default (from Domain KB)
    Flag for resolution before ADR phase
    Display: "Noted as assumption: [default]. Can be revised later."

  Adaptive adjustment:
    Based on answer, AI may:
    - Remove upcoming questions that are no longer relevant
    - Add follow-up questions for new branches
    - Adjust context for remaining questions

END FOR

### 3.4 Save Topic Results

Append topic answers to `architect/assessment.md`:

```markdown
## [Topic Name]

### Q1: [question summary]
**Type**: CONFIRM | DISCOVER | DECIDE
**Answer**: [user response]
**Source**: user confirmed | assumption (default: [X])
**Impact**: [ADR/Doc reference]

### Q2: ...
```

Update architect-state.json:
```
interview.completedTopics += [topic name]
interview.currentTopic = [next topic]
interview.currentQuestion = 0
```

Display: "Topic [name] complete. [remaining] topics left."

END FOR (topics)

---

## Step 4: Cross-check + Gap Analysis

Read full `architect/assessment.md`.

### 4.1 Coverage Check (9 Layers)

Verify all 9 architectural layers have sufficient data:

| Layer | Min Data Points | Status |
|---|---|---|
| Business | 2 | check |
| Domain | 3 | check |
| Reference | 1 | check |
| Regulatory | 1 | check |
| Localization | 1 | check |
| Technical | 2 | check |
| Operational | 2 | check |
| Integration | 1 | check |
| Security | 2 | check |

If any layer has insufficient data → generate supplementary questions.
WAIT for user answers. Append to assessment.

### 4.2 Contradiction Detection

Check for contradictions between answers:
- Technology choices vs constraints (e.g., chose microservices but team of 2)
- Performance requirements vs budget
- Regulatory requirements vs chosen patterns

If contradictions found → present to user, ask to resolve.
WAIT for user resolution.

---

## Step 5: Finalize Assessment

Display assessment summary — key decisions per section.

Display unresolved assumptions (if any):
```
Unresolved Assumptions ([N]):
  1. [assumption] — default: [X]
  2. [assumption] — default: [Y]

These will be flagged during ADR generation.
```

Ask: "Approve this Architecture Assessment? (y/n/feedback)"
WAIT for user.

If feedback → revise relevant sections → re-present → WAIT again.
If approved → save final `architect/assessment.md`.

Update architect-state.json:
```
interview.status = "completed"
currentPhase = "adr"
```

Display: "Phase 1 complete. Assessment saved. Moving to Phase 2: Architecture Decisions."

**RETURN** control to router.

---

**/architect Phase 1: Smart Interview v1.0**
*Domain KB (8 sections) + Adaptive Interview (CONFIRM/DISCOVER/DECIDE)*
*EPS Framework v8.0*
