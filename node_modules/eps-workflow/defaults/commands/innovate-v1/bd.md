# INNOVATE_BD Workflow v4.0

## Purpose
SRS Technical Validation + Technology Decisions + Draft Blueprint + User Review

**Focus**: Đảm bảo Basic Design sẽ đúng, đủ, tối ưu
**Pattern**: Multi-Model Generate → Present → WAIT → Validate → Decide → Draft → WAIT → Iterate → Finalize

---

## Step 0.1: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Expected state: INNOVATE_SRS completed or SRS_CREATED
- If FAIL: STOP — SRS innovation must be completed before BD innovation
- If PASS: Continue to context loading

---

## Pre-requisites (Validated by Router)
- State: RESEARCH_BD
- Quality Gate D1: Passed (evidence ≥3, quality ≥80%)
- Architecture files: **MUST be loaded** (INNOVATE_BD needs system context)
- SRS document available in feature context

---

## Step 0: Impact Assessment (Enhancement only) — v7.0

**CONDITION**: Chi chay khi taskType = 'enhancement'.
- New feature: skip step nay, di thang Step 0.1 (luon can full BD).
- Bugfix: workflow khong di qua innovate/bd.md (bugfix khong co buoc nay).

### 0.1: Doc SRS delta

Doc SRS delta document tu `documents/features/[FEATURE]/`. Xac dinh cac thay doi duoc mo ta.

### 0.2: Map vao 6 tang BD

Voi moi thay doi trong SRS delta, danh gia:

| Tang | Cau hoi | Neu YES |
|---|---|---|
| §1 Architecture | Requirement yeu cau doi architecture pattern hoac technology? | Level 3 |
| §2 Component | Can them component/service moi? | Level 2 |
| §3 Data Flow | Can them luong du lieu moi giua components? | Level 2 |
| §4 Data Model | Can them entity/table/relationship moi? | Level 2 |
| §5 State Mgmt | Can doi cache/sync strategy? | Level 2 |
| §6 NFR | Can them performance/security requirement moi? | Level 2 |

### 0.3: Xac dinh Level va hanh dong

**Level 3** (§1 = YES):
Hien thi: "Enhancement nay yeu cau thay doi kien truc. Can reclassify thanh new feature."
Cho user confirm reclassify. STOP workflow.

**Level 2** (§2-§6 bat ky = YES):
Hien thi: "Impact Assessment: Level 2 (Structural). Sections bi anh huong: §X, §Y."
Cho user confirm. Tiep tuc innovate BD CHI cho sections bi anh huong.

**Level 1** (tat ca = NO):
Hien thi: "Impact Assessment: Level 1 (Logic-only). Kien truc khong doi."
Cho user confirm. Tao BD baseline document (noi dung that). Chuyen sang DD delta.

### 0.4: Luu result

Ghi vao innovate-bd-selection.md: scope level, sections anh huong, user confirmation.

---

## Task Type Detection (v4.1)

**CRITICAL**: Read `taskType` from context to determine innovation strategy.

```bash
# Load context
node core/cli/ops.js context-detect
CONTEXT_DIR=$(node -e "console.log(JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')).data.contextPath||'')" 2>/dev/null || echo "")

# Extract taskType from context.md
TASK_TYPE=$(grep -oP 'Task Type:\s*\K\w+' "$CONTEXT_DIR/context.md" 2>/dev/null || echo "new")
MODULE=$(grep -oP 'Module:\s*\K\w+' "$CONTEXT_DIR/context.md" 2>/dev/null || echo "unknown")

echo "📌 Task Type: $TASK_TYPE"
echo "📦 Module: $MODULE"
```

### Task-Type Specific Strategies

| Task Type | Innovation Strategy | Key Focus |
|-----------|---------------------|-----------|
| `new` | Creative architecture, multiple alternatives | New patterns, technologies, scalability |
| `enhancement` | Minimal changes, extend existing | Maintain patterns, low risk, backward compatible |
| `bugfix` | Root cause fix, minimal impact | Precise fix, no new features, regression prevention |

**For `enhancement` tasks:**
- ✅ MUST analyze existing codebase first
- ✅ MUST extend existing patterns, NOT replace
- ✅ MUST minimize code impact
- ✅ MUST ensure backward compatibility
- ❌ DO NOT propose architectural rewrites
- ❌ DO NOT introduce new technologies unless necessary

---

## Architecture Context Loading

**CRITICAL**: Before proceeding, MUST load architecture files:

{{load_architecture_files | smart_select: true | patterns: {
  "lend|loan|borrow|invest": ["01-system-architecture.md", "02-service-architecture.md"],
  "insur|policy|claim": ["01-system-architecture.md", "06-blockchain-design.md"],
  "default": ["01-system-architecture.md"]
}}}

**Validation Checklist (before proceeding):**
- [ ] Architecture files read into context?
- [ ] Existing technology stack understood? (PostgreSQL, Redis, RabbitMQ, etc.)
- [ ] Existing service structure understood?
- [ ] Existing patterns understood? (REST API, Event-Driven, etc.)
- [ ] Integration approaches understood?

---

## Workflow Phases

### Phase 0: Input Summary + Multi-Model Generation (INLINE)

**Step 0.0: Load Required Documents (MANDATORY)**

⚠️ **CRITICAL**: BEFORE any other step, you MUST load ALL required documents using the Read tool.

#### A. Evidence File (from Research Phase)
```bash
# Pattern: .claude/memory-bank/{branch}/{feature}-{developer}/evidence.md
# Example: .claude/memory-bank/master/AUREA-KG-cuong/evidence.md
```
→ Use **Read tool** to load FULL content, store as `evidenceContent`

#### B. SRS Selection (from INNOVATE_SRS Phase)
```bash
# Pattern: .claude/memory-bank/{branch}/{feature}-{developer}/innovate-srs-selection.md
# Example: .claude/memory-bank/master/AUREA-KG-cuong/innovate-srs-selection.md
```
→ Use **Read tool** to load FULL content, store as `srsContent`

#### C. Architecture Files (from Project)
```bash
# Load relevant architecture documents:
# - documents/01-ARCHITECTURE/01-system-architecture.md (if exists)
# - Or any architecture files in documents/ directory
```
→ Use **Read tool** to load, store as `architectureContent`

**Validation Checklist:**
- [ ] `evidenceContent` loaded (NOT empty, 50+ lines)
- [ ] `srsContent` loaded (from SRS phase or innovate-srs-selection.md)
- [ ] `architectureContent` loaded (system architecture context)

**If required documents NOT found**: Display which document is missing and suggest next action.

---

**Step 0.0.5: Evidence Fusion**

Invoke the **evidence-fusion** skill:
- Merge research findings from evidence.md with RAG results and SRS context
- Synthesize context for BD alternative generation
- Output: Enriched evidence context for Gemini and Claude

---

**Step 0.1: Summarize Loaded Inputs**

Using the documents loaded in Step 0.0 (`evidenceContent`, `srsContent`, `architectureContent`), summarize inputs INLINE with full conversation context.
DO NOT proceed if any required document is empty.

**Step 0.1.5: Query Architecture Patterns & Specialist Context (RAG Integration)**

Before generating options, query RAG for existing architecture patterns, codebase conventions, and specialist constraints:

```javascript
const RAGService = require('./core/rag/rag-service');
const fs = require('fs');

// 1. Extract tech-stack keywords from SRS + architecture
function extractTechStack(srsContent, architectureContent) {
  const combined = (srsContent || '') + '\n' + (architectureContent || '');
  const techKeywords = [];
  const patterns = [
    /react/gi, /redux/gi, /nestjs/gi, /typescript/gi,
    /postgresql/gi, /mongodb/gi, /redis/gi,
    /hyperledger/gi, /material-ui/gi, /rabbitmq/gi,
    /signalr/gi, /websocket/gi, /graphql/gi
  ];

  for (const pattern of patterns) {
    if (pattern.test(combined)) {
      techKeywords.push(pattern.source.toLowerCase());
    }
  }
  return [...new Set(techKeywords)];
}

const techStack = extractTechStack(srsContent, architectureContent);

// 2. Query RAG for existing architecture patterns + source code conventions
const branch = require('child_process')
  .execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
const ragService = RAGService.getInstance('_global', branch);

// 2a. Architecture + EPS knowledge: existing patterns and standards
const archContext = await ragService.getContext(
  `${feature} architecture patterns service component integration`,
  { name: 'innovate-bd' },
  { topK: 5, layers: ['architecture', 'eps-knowledge'] }
);

// 2b. Source code: existing implementation conventions
const codeContext = await ragService.getContext(
  `${feature} service repository controller module structure`,
  { name: 'innovate-bd' },
  { topK: 3, layer: 'source-code' }
);

// 2c. Specialist high-level patterns (architecture-level DO/DON'Ts)
const specialistContext = await ragService.querySpecialists(techStack, 2);

// 3. Build architecture constraints from RAG results
const ragConstraints = {
  architecturePatterns: [],
  codeConventions: [],
  specialistGuidance: []
};

// Architecture patterns
for (const chunk of (archContext.chunks || [])) {
  if (chunk.content) {
    ragConstraints.architecturePatterns.push({
      content: chunk.content,
      score: chunk.score,
      layer: chunk.layer
    });
  }
}

// Source code conventions
for (const chunk of (codeContext.chunks || [])) {
  if (chunk.content) {
    ragConstraints.codeConventions.push({
      content: chunk.content,
      score: chunk.score,
      filePath: chunk.metadata?.filePath
    });
  }
}

// Specialist guidance (high-level only for BD)
for (const chunk of specialistContext) {
  if (!chunk.content) continue;

  const doMatches = chunk.content.match(/### ✅ (?:DO|USE)[:\s]*([\s\S]*?)(?=###|$)/gi);
  const dontMatches = chunk.content.match(/### ❌ (?:DON'T|DO NOT|AVOID)[:\s]*([\s\S]*?)(?=###|$)/gi);

  if (doMatches) ragConstraints.specialistGuidance.push(...doMatches.map(m => m.trim()));
  if (dontMatches) ragConstraints.specialistGuidance.push(...dontMatches.map(m => m.trim()));
}

// 4. Display RAG context summary
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('📚 RAG CONTEXT LOADED FOR BD');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Tech Stack: ${techStack.join(', ')}`);
console.log(`Architecture patterns: ${archContext.chunks?.length || 0} chunks`);
console.log(`Code conventions: ${codeContext.chunks?.length || 0} chunks`);
console.log(`Specialist guidance: ${specialistContext.length} chunks`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

if (archContext.chunks?.length === 0 && codeContext.chunks?.length === 0 && specialistContext.length === 0) {
  console.warn('⚠️ No RAG context found. BD will be generated without codebase context.');
  console.warn('   RAG indexes may need to be populated for full context.');
}
```

**Pass RAG constraints to Claude (Step 0.2) and Gemini (Step 0.3) generation context.**

The RAG context helps BD:
- **Align with existing architecture** (not invent conflicting patterns)
- **Respect codebase conventions** (file structure, naming, module patterns)
- **Follow specialist DO/DON'T** at architecture level (e.g., "DO use Clean Architecture", "DON'T mix sync/async patterns")

---

**Step 0.2: Generate Claude Validation & Recommendations (INLINE)**

Based on the SRS, architecture, **and RAG context from Step 0.1.5**, generate:
- SRS validation findings (gaps, ambiguities, conflicts)
- Technology recommendations aligned with existing stack
- Architecture pattern proposals

You have full access to conversation history, user preferences, and task type context.
DO NOT use hardcoded templates - analyze the actual SRS and architecture.

**RAG Context Usage** (from Step 0.1.5):
- Use `ragConstraints.architecturePatterns` to validate SRS against existing architecture
- Use `ragConstraints.codeConventions` to ensure proposals follow codebase conventions
- Use `ragConstraints.specialistGuidance` to apply DO/DON'T constraints at architecture level
- If RAG found existing similar patterns → prefer extending them over inventing new ones

**Step 0.3: Generate Gemini Validation (WebFetch — Sequential after Claude)**

After Claude generates its approach (Step 0.2), call Gemini REST API directly via WebFetch.
This runs sequentially: Claude first → Gemini second → Synthesis.

For each generated BD alternative, invoke the **pattern-analyzer** skill:
- Compare proposed architecture patterns against project conventions
- Check for conflicts with existing codebase patterns
- Flag incompatible technology choices
- Output: Pattern alignment score per alternative

**Execution Steps:**

1. **Read API config** — Use Read tool to load `.claude/config/external-apis.json`
   - Extract: `GEMINI_API_KEY`, `gemini.model`, `gemini.temperature`, `gemini.maxOutputTokens`

2. **Build Gemini prompt** — Construct a prompt for BD architecture alternatives:
   - Include evidence summary and SRS selection context
   - Include task type and architecture constraints from loaded architecture files
   - Include Claude's analysis summary as context for Gemini
   - Ask for 2-3 alternative architecture approaches (different from Claude's approach)
   - Request JSON output with structure: `{"alternatives": [{"name": "", "summary": "", "architecture_pattern": "", "strengths": [], "weaknesses": [], "items": [{"name": "", "category": "", "description": ""}]}]}`

3. **Call Gemini via WebFetch** — POST to Gemini REST API:

```
URL: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}
Method: POST
Headers: Content-Type: application/json
Body:
{
  "contents": [{"parts": [{"text": "{prompt}"}]}],
  "generationConfig": {
    "temperature": {temperature},
    "maxOutputTokens": {maxOutputTokens}
  }
}
```

4. **Parse response** — Extract `response.candidates[0].content.parts[0].text`
   - Parse the JSON from Gemini's text response
   - If WebFetch fails or Gemini returns error → proceed with Claude-only (still valid)

5. **Store Gemini alternatives** — Keep in conversation context for Phase 1 synthesis

**Error Handling:**
- If `.claude/config/external-apis.json` not found → Claude-only
- If WebFetch fails (network, auth, quota) → Claude-only
- If Gemini response is malformed → Claude-only
- Always log: "⚠️ Gemini unavailable - proceeding with Claude-only" on failure

**Why WebFetch instead of subprocess:**
- Agent sandbox blocks `node` subprocess execution
- WebFetch is a native tool available to Claude agent
- No dependency on npm packages or file system scripts
- Sequential flow keeps full conversation context available

**Output Format:**

```markdown
## INNOVATE BD: [FEATURE-NAME]

---

### 📋 Input Summary

| Document | Metrics |
|----------|---------|
| **SRS Document** | [FEATURE]-[SUB]-srs.md |
| Functional Requirements | X FRs |
| Non-Functional Requirements | Y NFRs |
| Business Rules | Z BRs |
| Use Cases | W UCs |

**System Architecture Alignment:**

| Stack | Technology |
|-------|------------|
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, MongoDB, Redis |
| Message Queue | RabbitMQ |
| Patterns | [Relevant patterns từ system architecture] |
```

---

### Phase 1: Present SRS Validation Results (HUMAN CHECKPOINT 1)

**PURPOSE**: Present validation findings từ cả Gemini và Claude, user quyết định xử lý issues.

**CRITICAL**: DỪNG LẠI VÀ CHỜ USER PHẢN HỒI.

**Output Format:**

```markdown
---

## 🤖 Multi-Model SRS Validation Results

### Gemini Findings
> [Tóm tắt 2-3 câu validation findings từ Gemini]

**Issues Found:**
- [Issue 1]
- [Issue 2]

### Claude Findings
> [Tóm tắt 2-3 câu validation findings từ Claude]

**Issues Found:**
- [Issue 1]
- [Issue 2]

### Consolidated Validation

## 🔍 SRS Technical Validation

> Cross-checking SRS với System Architecture và existing patterns...

---

### 🔴 CATEGORY 1: Architecture Conflicts

**Issues Found:**

| # | SRS Requirement | System Arch Conflict | Severity | Recommendation |
|---|-----------------|---------------------|----------|----------------|
| 1 | [FR-XXX: Requirement] | [Conflict description] | 🔴 High | [Fix option] |
| 2 | [NFR-XXX: Requirement] | [Conflict description] | 🟡 Medium | [Fix option] |

**Analysis:**

**Issue 1:** [Detailed analysis of why this conflicts and options to resolve]

**Issue 2:** [Detailed analysis]

---

### 🟡 CATEGORY 2: Implementation Pattern Conflicts

**Issues Found:**

| # | SRS Requirement | Existing Pattern | Conflict | Recommendation |
|---|-----------------|------------------|----------|----------------|
| 1 | [UC-XXX: Use case] | [Current pattern] | [Logic conflict] | [New pattern needed] |

---

### 🟢 CATEGORY 3: Missing/Incomplete Requirements

**Gaps Found:**

| # | Gap Description | Why Needed | Recommendation |
|---|-----------------|------------|----------------|
| 1 | [Missing requirement] | [Why needed for implementation] | [Add FR/NFR] |

---

### 📊 Validation Summary

| Category | Issues | Severity |
|----------|--------|----------|
| Architecture Conflicts | X | 🔴 Y High, 🟡 Z Medium |
| Implementation Pattern Conflicts | A | 🟡 B Medium |
| Missing/Incomplete Requirements | C | 🟢 D Low (additions) |
| **Total** | **X+A+C** | |

---

🤔 **Anh muốn làm gì với các issues này?**

| Response | Action |
|----------|--------|
| `continue` | Accept recommendations, proceed to Technology Decisions |
| `fix srs` | Stop INNOVATE_BD, update SRS first, re-run sau |
| `review [issue #]` | Tôi sẽ elaborate thêm về issue cụ thể |
| [Custom feedback] | Tôi sẽ điều chỉnh theo feedback |
```

**WAIT FOR USER RESPONSE BEFORE CONTINUING.**

**Validation Categories:**

| Category | What to Check | Severity |
|----------|---------------|----------|
| **Architecture Conflicts** | SRS requirements vs System Architecture capabilities | 🔴 High - có thể block implementation |
| **Implementation Pattern Conflicts** | SRS logic vs Existing implementation patterns | 🟡 Medium - cần pattern changes |
| **Missing/Incomplete Requirements** | Gaps cần bổ sung để implementation hoàn chỉnh | 🟢 Low - additions, không block |

**IMPORTANT**:
- Nếu có 🔴 High severity issues → Strongly recommend "fix srs" first
- Nếu chỉ có 🟡🟢 issues → "continue" acceptable
- User có quyền override bất kỳ recommendation nào

---

### Phase 2: Technology Decisions - Per-Item Loop (After Phase 1 Approved)

**CRITICAL**: Mỗi decision PHẢI có full analysis VÀ user quyết định TỪNG decision.

**Pre-condition**: Phase 1 completed (SRS validated hoặc issues acknowledged)

**Output Format (Initial):**

```markdown
---

## ✅ SRS Validation Complete

| Status | Details |
|--------|---------|
| Issues Found | X issues (Y accepted, Z deferred) |
| Adjustments | [List adjustments if any] |
| User Decision | Continue with noted adjustments |

---

## 🔧 Technology Decisions - Per-Item Review

> Tôi sẽ present TỪNG decision để anh review và quyết định.
> Mỗi decision có options với pros/cons, AI recommendation, và anh chọn.
```

---

#### Step 2.1: EXTRACT TECHNOLOGY DECISIONS

```pseudo
// ═══════════════════════════════════════════════════════════════
// Extract technology decisions based on SRS requirements
// ═══════════════════════════════════════════════════════════════

SET tech_decisions = []

// Analyze SRS requirements to identify needed decisions
FOR EACH requirement IN srs_requirements:
  IF requirement.implies_tech_decision:
    SET decision = {
      name: DERIVE_DECISION_NAME(requirement),
      context: requirement.id + ": " + requirement.description,
      options: []
    }

    // Generate options from Claude analysis
    SET claude_options = ANALYZE_OPTIONS_FOR(requirement)
    FOR EACH opt IN claude_options:
      decision.options.push({
        number: LENGTH(decision.options) + 1,
        name: opt.name,
        source: 'Claude',
        description: opt.description,
        strengths: opt.pros,
        weaknesses: opt.cons
      })

    // Add Gemini alternatives if available
    IF gemini_tech_alternatives:
      FOR EACH gemini_opt IN gemini_tech_alternatives[decision.name]:
        decision.options.push({
          number: LENGTH(decision.options) + 1,
          name: gemini_opt.name,
          source: 'Gemini',
          description: gemini_opt.description,
          strengths: gemini_opt.pros,
          weaknesses: gemini_opt.cons
        })

    tech_decisions.push(decision)
```

#### Step 2.2: PER-DECISION LOOP (HUMAN CHECKPOINT)

```pseudo
// ═══════════════════════════════════════════════════════════════
// Sequential decision loop — user decides EACH tech decision
// ═══════════════════════════════════════════════════════════════

SET current_index = 0
SET total = LENGTH(tech_decisions)
SET decisions = []

// Backward compatibility fallback (BC-001)
IF total == 0:
  DISPLAY "⚠️ No technology decisions needed. Proceeding to Blueprint."
  GOTO PHASE_3_BLUEPRINT

WHILE current_index < total:
  SET decision = tech_decisions[current_index]

  // ─────────────────────────────────────────────────────────────
  // Display decision header
  // ─────────────────────────────────────────────────────────────
  DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  DISPLAY "## 📌 Decision [current_index + 1]/[total]: [decision.name]"
  DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  DISPLAY ""
  DISPLAY "**SRS Context**: [decision.context]"
  DISPLAY ""

  // ─────────────────────────────────────────────────────────────
  // Display options table với strengths/weaknesses
  // ─────────────────────────────────────────────────────────────
  DISPLAY "### Options"
  DISPLAY ""
  DISPLAY "| # | Option | Source | Strengths | Weaknesses |"
  DISPLAY "|---|--------|--------|-----------|------------|"
  FOR EACH option IN decision.options:
    SET strengths_str = option.strengths.map(s => "✅ " + s).join("<br>")
    SET weaknesses_str = option.weaknesses.map(w => "❌ " + w).join("<br>")
    DISPLAY "| [option.number] | **[option.name]** | [option.source] | [strengths_str] | [weaknesses_str] |"

  // ─────────────────────────────────────────────────────────────
  // Display AI recommendation với rationale
  // ─────────────────────────────────────────────────────────────
  SET recommended = SELECT_BEST_OPTION(decision.options)

  DISPLAY ""
  DISPLAY "### ⭐ Recommended: Option [recommended.number] - [recommended.name]"
  DISPLAY ""
  DISPLAY "**Rationale**:"
  DISPLAY "- [SRS context] → [Why this option fits]"
  DISPLAY "- Trade-off: [What we gain vs give up]"

  // ─────────────────────────────────────────────────────────────
  // Display response options
  // ─────────────────────────────────────────────────────────────
  DISPLAY ""
  DISPLAY "---"
  DISPLAY ""
  DISPLAY "🤔 **Chọn option nào cho decision này?**"
  DISPLAY ""
  DISPLAY "| Response | Action |"
  DISPLAY "|----------|--------|"
  DISPLAY "| `1` - `[N]` | Chọn option tương ứng |"
  DISPLAY "| `own: [tech choice]` | Dùng tech choice của anh |"
  DISPLAY "| `more info` | Cần thêm thông tin về options |"

  // ─────────────────────────────────────────────────────────────
  // WAIT FOR USER RESPONSE
  // ─────────────────────────────────────────────────────────────
  DISPLAY ""
  DISPLAY "[WAIT FOR USER RESPONSE]"

  SET response = AWAIT USER_INPUT

  // ─────────────────────────────────────────────────────────────
  // Process response
  // ─────────────────────────────────────────────────────────────
  SWITCH response:
    CASE REGEX "^\d+$":
      SET choice_num = INT(response)
      IF choice_num >= 1 AND choice_num <= LENGTH(decision.options):
        SET chosen = decision.options[choice_num - 1]
        decisions.push({
          name: decision.name,
          choice: chosen.name,
          source: chosen.source,
          rationale: BRIEF_RATIONALE(chosen)
        })
        current_index++
      ELSE:
        DISPLAY "❌ Invalid number. Please choose 1-[LENGTH(decision.options)]"

    CASE REGEX "^own:\s*(.+)":
      SET user_choice = REGEX_MATCH[1]
      IF LENGTH(user_choice) > 5:
        decisions.push({
          name: decision.name,
          choice: user_choice,
          source: "User",
          rationale: "User preference"
        })
        current_index++
      ELSE:
        DISPLAY "❌ Please provide more detail"

    CASE "more info":
      FOR EACH option IN decision.options:
        DISPLAY "### Option [option.number]: [option.name]"
        DISPLAY "[DETAILED_EXPLANATION_WITH_EXAMPLES(option)]"
      // Stay on same decision

    DEFAULT:
      DISPLAY "❌ Invalid input. Use: number, 'own: [choice]', or 'more info'"

  // ─────────────────────────────────────────────────────────────
  // Show running summary after valid decision
  // ─────────────────────────────────────────────────────────────
  IF current_index CHANGED:
    // Persist state
    SET session_state = {
      feature: FEATURE_NAME,
      phase: "INNOVATE_BD_TECH",
      current_index: current_index,
      total_items: total,
      decisions: decisions
    }
    WRITE "cache/innovate-session.json" WITH JSON(session_state)

    // Display progress
    DISPLAY ""
    DISPLAY "📊 **Progress: [current_index]/[total] tech decisions made**"
    DISPLAY ""
    DISPLAY "| # | Decision | Choice | Source |"
    DISPLAY "|---|----------|--------|--------|"
    FOR EACH d IN decisions:
      DISPLAY "| [INDEX+1] | [d.name] | [d.choice] | [d.source] |"
```

#### Step 2.3: FINAL SUMMARY

```pseudo
// ═══════════════════════════════════════════════════════════════
// Display all tech decisions for final review
// ═══════════════════════════════════════════════════════════════

DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "## 📊 Final Summary - Technology Decisions"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY ""
DISPLAY "| # | Decision | Choice | Source | Rationale |"
DISPLAY "|---|----------|--------|--------|-----------|"
FOR EACH d IN decisions:
  DISPLAY "| [INDEX+1] | [d.name] | [d.choice] | [d.source] | [d.rationale] |"
DISPLAY ""
DISPLAY "**Total**: [LENGTH(decisions)] technology decisions"
```

#### Step 2.4: CONFIRMATION (HUMAN CHECKPOINT)

```pseudo
// ═══════════════════════════════════════════════════════════════
// Final confirmation before proceeding to Blueprint
// ═══════════════════════════════════════════════════════════════

DISPLAY ""
DISPLAY "---"
DISPLAY ""
DISPLAY "🤔 **Confirm để proceed to Blueprint?**"
DISPLAY ""
DISPLAY "| Response | Action |"
DISPLAY "|----------|--------|"
DISPLAY "| `confirm` hoặc `approved` | Proceed to Blueprint phase |"
DISPLAY "| `change [N]` | Go back to decision N để chọn lại |"
DISPLAY "| `cancel` | Abort tech decisions |"
DISPLAY ""
DISPLAY "[WAIT FOR USER RESPONSE]"

SET confirmation = AWAIT USER_INPUT

SWITCH confirmation:
  CASE "confirm" OR "approved" OR "ok":
    DISPLAY "✅ Technology decisions confirmed. Proceeding to Blueprint..."
    GOTO PHASE_3_BLUEPRINT

  CASE REGEX "^change\s+(\d+)":
    SET go_back_to = INT(REGEX_MATCH[1]) - 1
    IF go_back_to >= 0 AND go_back_to < total:
      current_index = go_back_to
      decisions = decisions.slice(0, go_back_to)
      GOTO STEP_2_2_LOOP
    ELSE:
      DISPLAY "❌ Invalid decision number"

  CASE "cancel":
    DISPLAY "❌ Aborted."
    DELETE "cache/innovate-session.json"
```

**WAIT FOR USER RESPONSE BEFORE CONTINUING.**

**Common Technology Decisions:**

| Category | Decisions | When to Include |
|----------|-----------|-----------------|
| **Communication** | WebSocket vs SSE vs Polling | Khi có real-time requirements |
| **Async Processing** | Message Queue vs Direct API | Khi có background jobs, notifications |
| **Caching** | Redis Cache vs In-Memory vs No Cache | Khi có performance requirements |
| **Data Sync** | Webhook vs Polling vs Event-Driven | Khi integrate với external systems |
| **File Storage** | MinIO vs Local vs External CDN | Khi có file upload requirements |
| **Search** | PostgreSQL Full-Text vs Elasticsearch | Khi có search requirements |
| **Rate Limiting** | Redis-based vs In-Memory vs API Gateway | Khi có rate limit requirements |
| **Session** | JWT stateless vs Redis session | Khi có auth requirements |

**IMPORTANT**: Chỉ include decisions **relevant** cho feature cụ thể.

---

### Phase 3: Draft Blueprint (After Decisions Approved)

**Output Format:**

```markdown
---

## ✅ Approved Technology Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | [Decision 1] | [Chosen Option] | [Why - SRS trace] |
| 2 | [Decision 2] | [Chosen Option] | [Why - SRS trace] |
| 3 | [Decision 3] | [Chosen Option] | [Why - SRS trace] |

---

## 🏗️ Draft Architecture Blueprint

### 1. Components

| Component | Responsibility | Derives from |
|-----------|----------------|--------------|
| **[Component A]** | [Mô tả nhiệm vụ] | FR-001, FR-002 |
| **[Component B]** | [Mô tả nhiệm vụ] | FR-003, FR-004 |
| **[Component C]** | [Mô tả nhiệm vụ] | FR-005, NFR-001 |

### 2. Patterns

| Pattern | Applied To | Rationale |
|---------|------------|-----------|
| [Pattern 1] | [Component/Area] | [Why - traces to requirement] |
| [Pattern 2] | [Component/Area] | [Why - traces to requirement] |

### 3. Data Flows

**Flow 1: [Use Case Name]**

```
[Actor] → [Component A] → [Component B] → [Database] → [Response]
```

**Flow 2: [Use Case Name]**

```
[Actor] → [Component C] → [External Service] → [Component D] → [Response]
```

### 4. Integration Points

| Integration | With | Method | Notes |
|-------------|------|--------|-------|
| [Integration 1] | [Service/System] | Sync/Async | [Notes] |

### 5. Key Decisions

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | [Decision A] | [Why chosen] | [Other options] |
| 2 | [Decision B] | [Why chosen] | [Other options] |
```

**CONTINUE TO PHASE 3.5 (Abstraction Level Validation)**

---

### Phase 3.5: Abstraction Level Validation

**PURPOSE**: Ensure BD uses high-level patterns, not library-specific terms.
**MOTIVE**: Library-specific decisions belong in DD phase, not BD phase.

Before finalizing blueprint, validate abstraction level:

**ALLOWED in BD** (High-Level Patterns):
- "Centralized state management pattern"
- "Server-state caching with automatic invalidation"
- "Repository pattern for data access"
- "Event-driven architecture"
- "API Gateway pattern"
- "CQRS pattern"
- "Message queue pattern"
- "Circuit breaker pattern"

**NOT ALLOWED in BD** (Library-Specific - move to DD):
- "Redux Toolkit with createSlice"
- "React Query useQuery hooks"
- "NestJS @Injectable decorators"
- "PostgreSQL JSONB columns"
- "Axios interceptors"
- "Prisma ORM"
- "TypeORM entities"

**Validation Rule**:
```javascript
const LIBRARY_KEYWORDS = [
  'redux', 'rtk', 'react-query', 'axios', 'nestjs',
  '@injectable', '@controller', 'createslice', 'usequery',
  'usemutation', 'postgresql', 'jsonb', 'prisma', 'typeorm',
  'mongoose', 'ioredis', 'bullmq'
];

function validateAbstractionLevel(bdContent) {
  const lowerContent = bdContent.toLowerCase();
  const violations = [];

  for (const keyword of LIBRARY_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      violations.push(keyword);
    }
  }

  if (violations.length > 0) {
    console.warn('⚠️ BD contains library-specific terms:');
    console.warn(`   ${violations.join(', ')}`);
    console.warn('   → These should be moved to DD phase');
    return false;
  }

  return true;
}
```

**If violations found**:
- Display warning with specific terms
- Suggest rephrasing to high-level patterns
- Allow user to proceed with acknowledgment

**Mapping Table (Library → High-Level Pattern)**:

| Library-Specific | High-Level Pattern |
|-----------------|-------------------|
| Redux Toolkit | Centralized state management |
| React Query | Server-state caching |
| NestJS modules | Modular service architecture |
| PostgreSQL | Relational data storage |
| MongoDB | Document-based storage |
| Redis | In-memory caching |
| Axios | HTTP client abstraction |

**CONTINUE TO PHASE 4 (NO WAIT HERE)**

---

### Phase 4: User Review Blueprint (HUMAN CHECKPOINT 3)

**PURPOSE**: User review blueprint và provide feedback.

**CRITICAL**: DỪNG LẠI VÀ CHỜ USER PHẢN HỒI.

**Output Format:**

```markdown
---

## 🔍 Review Questions

Để đảm bảo blueprint **đúng, đủ, tối ưu**, anh hãy review:

### 1. Components
- Có component nào **thiếu** không?
- Có component nào **thừa** không?
- Responsibility của mỗi component có **đúng** không?

### 2. Patterns
- Patterns này có **phù hợp** với context của anh không?
- Có pattern nào anh muốn **thay đổi** không?
- Có pattern nào **cần thêm** không?

### 3. Data Flows
- Luồng dữ liệu có **đúng** không?
- Có **edge case** nào cần xử lý không?
- Có flow nào **thiếu** không?

### 4. Coverage
- Có requirement nào trong SRS mà blueprint **chưa cover** không?
- Có NFR nào chưa được **address** không?

### 5. Context
- Có **constraints** nào của anh mà tôi chưa biết không?
- Có **preferences** nào về implementation không?
- Có **technical debt** hoặc **existing code** cần consider không?

---

🤔 **Anh review và cho feedback:**

| Response | Action |
|----------|--------|
| `approved` | Blueprint đã đúng, đủ, tối ưu → Proceed to finalize |
| [Specific feedback] | Tôi sẽ update và show lại |
```

**WAIT FOR USER RESPONSE BEFORE CONTINUING.**

---

### Phase 5: Iterate (If User Has Feedback)

**Iteration Tracking**: Soft limit 3 rounds. After 3 iterations, gợi ý escalate.

**Output Format:**

```markdown
---

## 🔄 Updated Blueprint (Iteration [N]/3)

### Changes Made

| # | Change | Reason |
|---|--------|--------|
| 1 | [Change description] | User feedback: [reason] |
| 2 | [Change description] | User feedback: [reason] |

### Updated Blueprint

[Show updated sections only]

---

🤔 **Anh review lại và cho feedback:**

| Response | Action |
|----------|--------|
| `approved` | Blueprint đã đúng → Proceed to finalize |
| [Specific feedback] | Tiếp tục điều chỉnh |
```

**After 3 iterations without approval:**

```markdown
---

⚠️ **Iteration Limit Reached (3/3)**

Chúng ta đã iterate 3 lần. Có thể requirements chưa clear.

| Response | Action |
|----------|--------|
| `continue` | Tiếp tục iterate thêm |
| `escalate` | Dừng lại, review lại requirements |
| `approved` | Chấp nhận version hiện tại |
```

**WAIT FOR USER RESPONSE.**

---

### Phase 6: Finalize & Save (HUMAN CHECKPOINT 4)

**PURPOSE**: Final confirmation trước khi save.

**CRITICAL**: DỪNG LẠI VÀ CHỜ USER CONFIRM "save" hoặc "approved".

**Output Format:**

```markdown
---

## 📋 Final Summary Before Save

### SRS Validation
| Category | Issues | Decision |
|----------|--------|----------|
| Architecture Conflicts | [X] | [Accepted/Deferred] |
| Implementation Conflicts | [Y] | [Accepted/Deferred] |
| Missing Requirements | [Z] | [Noted] |

### Technology Decisions
| # | Decision | Choice |
|---|----------|--------|
| 1 | [Decision 1] | [Choice] |
| 2 | [Decision 2] | [Choice] |

### Blueprint Summary
| Metric | Count |
|--------|-------|
| Components | [X] components |
| Patterns | [Y] patterns |
| Data Flows | [Z] flows |
| Integrations | [W] points |

### Iterations
| Round | Changes |
|-------|---------|
| 1 | [Summary] |
| 2 | [Summary] |

---

🤔 **Confirm để save?**

| Response | Action |
|----------|--------|
| `save` hoặc `approved` | Save to innovate-bd-selection.md |
| `wait` | Chưa save, cần review thêm |
| [Feedback] | Điều chỉnh trước khi save |
```

**WAIT FOR USER RESPONSE.**

**Only after user confirms "save" or "approved":**

{{append_to_evidence | template: "innovate-bd-save.md" | data: {
  approvedDate: "CURRENT_DATETIME",
  srsValidation: {
    architectureConflicts: {count: "X", decision: "[Accepted/Deferred/Fixed]"},
    implementationConflicts: {count: "Y", decision: "[Accepted/Deferred/Fixed]"},
    missingRequirements: {count: "Z", decision: "[Noted for SRS update]"}
  },
  acceptedAdjustments: [
    "[Adjustment 1]: [Description]",
    "[Adjustment 2]: [Description]"
  ],
  technologyDecisions: [
    {id: 1, decision: "[Decision Name]", choice: "[Chosen Option]", rationale: "[Why chosen]", srsTrace: "[NFR-XXX, FR-YYY]"}
  ],
  components: [
    {name: "[Component 1]", responsibility: "[Responsibility]", derivesFrom: "[FR-XXX, NFR-YYY]"}
  ],
  patterns: [
    {pattern: "[Pattern 1]", appliedTo: "[Component]", rationale: "[Why - traces to requirement]"}
  ],
  dataFlows: [
    {name: "Flow 1: [Use Case Name]", description: "[Flow description]"}
  ],
  integrationPoints: [
    {integration: "[Integration 1]", with: "[Service]", method: "[Sync/Async]", notes: "[Notes]"}
  ],
  keyDecisions: [
    {id: 1, decision: "[Decision]", rationale: "[Why]", alternativesConsidered: "[Other options]"}
  ],
  userFeedback: "[Feedback or 'No adjustments needed - draft approved as-is']",
  iterations: "[N] rounds"
}}}

---

## Update State

{{update_state | phase: "INNOVATE_BD"}}

---

## Phase 6.5: Update Evidence & Context (Post-Save — MANDATORY)

After saving `innovate-bd-selection.md`, update evidence.md and context.md:

**1. Update evidence.md — Section "### 2.2 Architecture Decisions"**

Using the Read tool, read current `evidence.md`. Then using the Edit tool, add or replace the section:

```markdown
### 2.2 Architecture Decisions (updated by /innovate BD — [DATE])

**SRS Validation**: [X] conflicts found — [Accepted/Deferred/Fixed]
**Technology Decisions**:
- [Decision 1]: [Choice] — [rationale]
- [Decision 2]: [Choice] — [rationale]

**Blueprint Summary**: [X] components, [Y] patterns, [Z] data flows

**Corrections to Research/SRS Findings**:
[List corrections or "No corrections"]
```

**2. Update context.md — Add to Decisions Log**

Read context.md. If "## Decisions Log" section doesn't exist, create it with table header. Then append rows:

| # | Phase | Decision | Choice | Rationale | Corrects |
|---|-------|----------|--------|-----------|----------|
| N | INNOVATE_BD | Architecture | [Tech stack summary] | [1-line] | [E# or "—"] |
| N+1 | INNOVATE_BD | [Key tech decision] | [Choice] | [1-line] | [E# or "—"] |

**3. Update Impact Analysis** (if architecture changes scope)

If architecture decisions change the implementation scope from what SRS estimated, update the Impact Analysis section in evidence.md.

**CRITICAL**: This step is MANDATORY. Do NOT skip even if user says "done" or "next".

---

## Completion Message

```markdown
---

## ✅ INNOVATE_BD Complete

### SRS Technical Validation

| Category | Issues | Decision |
|----------|--------|----------|
| Architecture Conflicts | [X] | [Accepted/Deferred] |
| Implementation Conflicts | [Y] | [Accepted/Deferred] |
| Missing Requirements | [Z] | [Noted] |

### Technology Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | [Decision 1] | [Choice] |
| 2 | [Decision 2] | [Choice] |

### Blueprint Summary

| Metric | Count |
|--------|-------|
| Components | [X] components defined |
| Patterns | [Y] patterns selected |
| Data Flows | [Z] flows documented |
| Integration Points | [W] integrations defined |

### User Feedback Incorporated
> [N] iterations, [M] adjustments made

### Quality Assurance

- ✅ SRS validated against System Architecture
- ✅ Technology decisions approved với full analysis
- ✅ All SRS requirements covered
- ✅ Aligned with System Architecture
- ✅ User reviewed and approved

[If deferred issues exist:]
> ⚠️ Pending: [N] SRS issues deferred

**Next command:** `/design --basic`
```

---

## Architecture Alternatives Evaluation Criteria (CRITICAL)

**IMPORTANT**: Evaluation criteria CHANGE based on task type.

### For `new` features: Evaluate by ARCHITECTURAL MERIT

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Architectural Soundness** | 25% | Pattern matches problem (CAP, DDD, Pattern-problem fit) |
| **Technology Alignment** | 20% | Leverages existing infrastructure effectively |
| **Business Domain Fit** | 20% | Matches business domain characteristics |
| **Industry Precedent** | 15% | Proven in similar systems |
| **System Quality Attributes** | 20% | Meets NFRs (performance, security, reliability) |

### For `enhancement` features: Evaluate by CODE IMPACT (v4.1)

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Code Impact** | 30% | How much existing code changes? (lower = better) |
| **Pattern Consistency** | 25% | Follows existing codebase patterns |
| **Risk Level** | 20% | Chance of breaking existing functionality |
| **Requirement Coverage** | 15% | Does it address all requested changes? |
| **Backward Compatibility** | 10% | Maintains API/interface compatibility |

### For `bugfix` features: Evaluate by ROOT CAUSE FIX (v4.1)

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Root Cause Fix** | 35% | Does it fix the actual cause? |
| **Regression Risk** | 25% | Chance of introducing new bugs |
| **Code Impact** | 20% | Scope of code changes (smaller = better) |
| **Test Coverage** | 10% | Can it be properly tested? |
| **Fix Confidence** | 10% | Confidence level in the fix |

---

### Secondary Criteria (Tie-breakers Only)

| Criterion | When to Use |
|-----------|-------------|
| **Team Capability** | Only as tie-breaker between equally sound architectures |
| **Evolutionary Path** | Important for risk mitigation (gradual vs big-bang) |
| **Observability** | Critical for production support |

### EXPLICITLY FORBIDDEN Criteria

| Criterion | Why Forbidden |
|-----------|--------------|
| **Development Time** | Architecture quality ≠ implementation speed. Fast to build ≠ correct for domain. |
| **Implementation Complexity** | Appropriate complexity for domain is GOOD. Over-simplification is technical debt. |
| **Team Training Time** | Skills can be learned. Wrong architecture cannot be easily fixed later. |
| **Testing Time** | Proper architecture may require more tests, but that's investment not cost. |

### Comparison Table Format (for Architecture Alternatives)

```markdown
| Criterion | Alternative 1 | Alternative 2 | Alternative 3 | Winner |
|-----------|---------------|---------------|---------------|--------|
| Architectural Soundness | [CAP, DDD analysis] | [CAP, DDD analysis] | [CAP, DDD analysis] | Alt X |
| Technology Alignment | [PostgreSQL, RabbitMQ leverage] | [PostgreSQL, RabbitMQ leverage] | [PostgreSQL, RabbitMQ leverage] | Alt X |
| Business Domain Fit | [Payment/Lending/Insurance fit] | [Payment/Lending/Insurance fit] | [Payment/Lending/Insurance fit] | Alt X |
| Industry Precedent | [SWIFT, Visa, Uber examples] | [SWIFT, Visa, Uber examples] | [SWIFT, Visa, Uber examples] | Alt X |
| System Quality Attributes | [NFRs coverage] | [NFRs coverage] | [NFRs coverage] | Alt X |
| **Overall Score** | X/100 | Y/100 | Z/100 | Alt X |
```

### Recommendation Format (ARCHITECTURAL JUSTIFICATION REQUIRED)

```markdown
**⭐ RECOMMENDATION: Alternative X - [Name]**

**Architectural Justification** (NOT implementation ease):
1. **CAP Theorem**: [Why this choice correct for domain - CP for core, AP for auxiliary]
2. **DDD**: [Why this matches subdomain structure - different patterns per domain]
3. **Technology**: [How this leverages existing stack optimally - PostgreSQL ACID + RabbitMQ events]
4. **Industry**: [Which proven systems use this pattern - SWIFT, Visa, Uber examples]
5. **Compliance**: [How this meets regulatory requirements - SBV, NHNN, PCI DSS]

**Decision Score**: X/100 (based on architectural merit)
```

**Example (from BRW-PAYM)**:
```markdown
Alternative 3 (Hybrid Orchestration-Choreography) selected with score 95/100

Justification:
1. CAP Theorem: Core (CP) + Auxiliary (AP) = correct per subdomain
2. DDD: Different subdomains use appropriate patterns (not one-size-fits-all)
3. Technology: PostgreSQL ACID + RabbitMQ events both utilized optimally
4. Industry: Same pattern as SWIFT, Visa, Uber payments (50+ years proven)
5. Compliance: Centralized audit trail for SBV/NHNN regulatory requirements
```

---

## Guidelines Summary

**DO:**
- ✅ QUERY RAG for architecture patterns, code conventions, and specialist guidance (Step 0.1.5)
- ✅ Generate options INLINE from both Claude (direct analysis) and Gemini (SDK call) in Phase 0
- ✅ LOAD architecture files before brainstorming
- ✅ PRESENT SRS validation to user (Phase 1) → WAIT
- ✅ BATCH technology decisions, present together (Phase 2)
- ✅ WAIT for decisions approval (Phase 2.5)
- ✅ DRAFT blueprint với traceability (Phase 3)
- ✅ ASK review questions (Phase 4) → WAIT
- ✅ ITERATE until user approves, soft limit 3 rounds (Phase 5)
- ✅ CONFIRM before save (Phase 6) → WAIT
- ✅ Save to `innovate-bd-selection.md` ONLY after user confirms

**DON'T:**
- ❌ Use Task agents for option generation (loses conversation context)
- ❌ Use hardcoded templates for Claude options (analyze actual SRS/architecture)
- ❌ Skip architecture file loading
- ❌ Skip SRS validation
- ❌ Auto-proceed without user approval at checkpoints
- ❌ Evaluate alternatives by development time or implementation complexity
- ❌ List options without architectural analysis
- ❌ Add components not in SRS
- ❌ Present numbered choices (1/2/3) for auto-selection
- ❌ Auto-continue with 🔴 High severity issues
- ❌ Compare by "faster to implement" or "easier to build"
- ❌ Skip RAG context query (Step 0.1.5) — codebase alignment is critical for BD
- ❌ Save without final user confirmation

**HUMAN CHECKPOINTS:**

| Checkpoint | Phase | User Action Required |
|------------|-------|---------------------|
| HC1 | Phase 1 | Review SRS validation, decide continue/fix/review |
| HC2 | Phase 2.5 | Approve technology decisions batch |
| HC3 | Phase 4 | Review blueprint, provide feedback or approve |
| HC4 | Phase 6 | Final confirmation before save |

**ITERATION POLICY:**
- Soft limit: 3 rounds
- After 3 rounds: Gợi ý escalate hoặc continue
- User có quyền override và continue unlimited

---
*INNOVATE_BD Workflow v4.1*
*Pattern: RAG Context → Inline Generate → Present → WAIT → Validate → Decide → WAIT → Draft → Review → WAIT → Iterate → WAIT → Finalize*
*RAG Integration: Architecture patterns + Code conventions + Specialist guidance*
*Hybrid Inline Pattern - EPS Framework v8.0*
*Updated: 2026-02-01*
