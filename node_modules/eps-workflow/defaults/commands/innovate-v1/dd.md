# INNOVATE_DD Workflow v4.0

## Purpose
Brainstorm **Technical Implementation Details** for Detail Design, **kế thừa từ Basic Design**.

**Focus**: Technical decisions (API design, state management, test strategy) - NOT architecture decisions
**Pattern**: Multi-model brainstorming with Claude + Gemini
**Key Difference from BD**: BD chọn WHAT (architecture), DD chọn HOW (implementation)

---

## Step 0.1: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Expected state: INNOVATE_BD completed or BD_CREATED
- If FAIL: STOP — BD innovation must be completed before DD innovation
- If PASS: Continue to context loading

---

## Pre-requisites (Validated by Router)
- State: RESEARCH_DD
- Quality Gate D2: Passed (BD approved)
- **CRITICAL**: Basic Design selection MUST be loaded as constraint
- All phases run INLINE in conversation (full context available)

---

## Inheritance from Basic Design (CRITICAL)

**GOLDEN RULE**: DD alternatives MUST implement the BD approach, NOT propose alternative architectures.

### What DD INHERITS from BD (Architecture LOCKED)

| Category | Fixed by BD |
|----------|-------------|
| **Architecture Pattern** | Already decided (e.g., Extend MonitoringHub) |
| **Component Structure** | Already defined in BD |
| **Data Model** | Entity fields already specified |
| **Integration Points** | SignalR groups, API routes already designed |
| **Technology Stack** | Already selected in BD |

### What DD CAN Innovate (Technical HOW)

| Category | Innovation Options |
|----------|-------------------|
| **API Design** | REST endpoint naming, DTO structure, validation approach |
| **State Management** | Local state vs Redux, selector optimization, cache strategy |
| **SignalR Events** | Event payload structure, broadcast granularity |
| **Testing Strategy** | Unit coverage, integration approach, mock strategy |
| **Code Organization** | File structure, naming conventions, shared utilities |
| **Error Handling** | Error response format, retry strategy, fallback logic |

---

## Task Type Detection (v3.0)

```bash
# Load context
node core/cli/ops.js context-detect
CONTEXT_DIR=$(node -e "console.log(JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')).data.contextPath||'')" 2>/dev/null || echo "")

TASK_TYPE=$(grep -oP 'Task Type:\s*\K\w+' "$CONTEXT_DIR/context.md" 2>/dev/null || echo "new")
MODULE=$(grep -oP 'Module:\s*\K\w+' "$CONTEXT_DIR/context.md" 2>/dev/null || echo "unknown")

echo "📌 Task Type: $TASK_TYPE"
echo "📦 Module: $MODULE"
```

---

## Workflow Phases

### Phase 0: Inline Generation + Load BD Inheritance (INLINE)

**Step 0.0: Load All Required Documents (MANDATORY)**

⚠️ **CRITICAL**: DD phase INHERITS from BD. You MUST load ALL preceding documents using the Read tool.

| Document | Source Pattern | Variable | Required |
|----------|----------------|----------|----------|
| Evidence | `.claude/memory-bank/{branch}/{feature}/evidence.md` | `evidenceContent` | Optional |
| SRS Selection | `.claude/memory-bank/{branch}/{feature}/innovate-srs-selection.md` | `srsContent` | **Required** |
| BD Selection | `.claude/memory-bank/{branch}/{feature}/innovate-bd-selection.md` | `bdContent` | **CRITICAL** |
| Basic Design | `documents/features/{CODE}-{feature}/{FEATURE}-basic-design.md` | `basicDesignContent` | Optional |

**Use the Read tool** to load each file completely (NOT just file paths - load FULL content).

**Validation Checklist:**
- [ ] `bdContent` loaded (CRITICAL - architecture constraint, must NOT be empty)
- [ ] `srsContent` loaded (requirements context)
- [ ] All content is actual text, not file paths

**If BD Selection NOT found**: STOP - cannot proceed without BD selection. Run `/design --basic` first.

---

**Step 0.0.5: Evidence Fusion**

Invoke the **evidence-fusion** skill:
- Merge research findings from evidence.md with BD selection and SRS context
- Synthesize context for DD alternative generation
- Output: Enriched evidence context for Gemini and Claude

---

**Step 0.1: Summarize BD Inheritance (CRITICAL)**

Using the `bdContent` loaded in Step 0.0, summarize inherited constraints. The BD selection contains architecture decisions that are LOCKED - DD cannot change them.

```javascript
// IMPORTANT: bdContent and srsContent MUST be loaded in Step 0.0
// These should contain FULL text content, NOT file paths
// If undefined, check Step 0.0 validation

// Validate loaded content
if (!bdContent || bdContent.length < 100) {
  console.error('❌ BD Selection not loaded. Cannot proceed without architecture constraints.');
  console.error('   Run /design --basic first, then /innovate for BD phase.');
  throw new Error('MISSING_BD_SELECTION');
}
```

Summarize inherited constraints from BD:
- Architecture pattern (LOCKED)
- Component structure (LOCKED)
- Technology decisions (LOCKED)
- Integration points (LOCKED)

**Step 0.1.5: Query Specialist Patterns (RAG Integration)**

Before generating options, query relevant specialists for patterns and constraints:

```javascript
const RAGService = require('./core/rag/rag-service');
const fs = require('fs');
const path = require('path');

// 1. Extract tech-stack from BD selection
function extractTechStack(bdContent) {
  const techKeywords = [];
  const patterns = [
    /react/gi, /redux/gi, /nestjs/gi, /typescript/gi,
    /postgresql/gi, /mongodb/gi, /redis/gi,
    /hyperledger/gi, /material-ui/gi
  ];

  for (const pattern of patterns) {
    if (pattern.test(bdContent)) {
      techKeywords.push(pattern.source.toLowerCase());
    }
  }
  return [...new Set(techKeywords)];
}

const techStack = extractTechStack(bdContent);

// 2. Query specialists via RAG
const branch = require('child_process').execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
const ragService = RAGService.getInstance(feature, branch);
const specialistContext = await ragService.querySpecialists(techStack, 3);

// 3. Extract DO's and DON'Ts
const constraints = {
  do: [],
  dont: [],
  patterns: [],
  examples: []
};

for (const chunk of specialistContext) {
  if (!chunk.content) continue;

  const doMatches = chunk.content.match(/### ✅ (?:DO|USE)[:\s]*([\s\S]*?)(?=###|$)/gi);
  const dontMatches = chunk.content.match(/### ❌ (?:DON'T|DO NOT|AVOID)[:\s]*([\s\S]*?)(?=###|$)/gi);

  if (doMatches) constraints.do.push(...doMatches.map(m => m.trim()));
  if (dontMatches) constraints.dont.push(...dontMatches.map(m => m.trim()));
}

// 4. Display specialist context
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('📚 SPECIALIST CONTEXT LOADED');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Tech Stack: ${techStack.join(', ')}`);
console.log(`Specialists Found: ${specialistContext.length}`);
console.log('');
if (constraints.do.length > 0) {
  console.log('Key DO Patterns:');
  constraints.do.slice(0, 5).forEach(d => console.log(`  ✅ ${d.substring(0, 100)}...`));
}
if (constraints.dont.length > 0) {
  console.log('');
  console.log('Key DON\'T Patterns:');
  constraints.dont.slice(0, 5).forEach(d => console.log(`  ❌ ${d.substring(0, 100)}...`));
}
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// 5. Warn if no specialists found
if (specialistContext.length === 0) {
  console.warn('⚠️ No specialists found for tech stack');
  console.warn('   DD will be generated without specialist constraints');
  console.warn('   Ensure specialists are available in the project.');
}
```

**Pass specialist constraints to generation context for Claude and Gemini.**

**Step 0.2: Generate Claude Technical Options (INLINE)**

Based on the BD selection, SRS, and architecture documents YOU just read, generate technical implementation options.

**CRITICAL — Architecture-Grounded Analysis Protocol:**

Each decision item MUST include:
1. **Ngữ cảnh (Context)**: Phân tích component này trong hệ thống — role, lifecycle, concurrency, dependencies
2. **Mục đích (Purpose)**: Tại sao cần quyết định này — problem nó giải quyết
3. **Architecture constraints**: Trích dẫn cụ thể từ architecture docs (file:line) — những gì đã LOCKED
4. **Option analysis**: Phân tích từng option dựa trên constraints đã xác định

**Option Quality Rules:**
- Nếu architecture đã lock decision (ví dụ: "Immutable entities (Java records)") → chỉ đưa **1 option tối ưu** với giải thích tại sao đó là lựa chọn duy nhất hợp lý
- Nếu có **≥2 options đều tối ưu** nhưng ở cách tiếp cận khác nhau → đưa ra để user chọn, với phân tích trade-off rõ ràng
- **KHÔNG** đưa option nửa vời, option vi phạm architecture, hoặc option chỉ để cho có số lượng
- Mỗi option phải reference ≥2 evidence points từ architecture docs

You have full access to conversation history, user preferences, and BD constraints.
DO NOT use hardcoded templates - analyze the actual BD selection and SRS requirements.
MUST respect BD architecture decisions (innovation scope: API design, state, testing ONLY).

**Step 0.3: Generate Gemini Technical Options (WebFetch — Sequential after Claude)**

After Claude generates its options (Step 0.2), call Gemini REST API directly via WebFetch.
This runs sequentially: Claude first → Gemini second → Synthesis.

For each generated DD alternative, invoke the **pattern-analyzer** skill and **architecture-analyzer** skill:
- **pattern-analyzer**: Compare proposed patterns against project conventions
- **architecture-analyzer**: Detect duplicate components, validate against BD architecture, check layer compliance
- Output: Pattern alignment + architecture compliance score per alternative

**Execution Steps:**

1. **Read API config** — Use Read tool to load `.claude/config/external-apis.json`
   - Extract: `GEMINI_API_KEY`, `gemini.model`, `gemini.temperature`, `gemini.maxOutputTokens`

2. **Build Gemini prompt** — Construct a prompt for DD technical alternatives:
   - Include BD selection as **LOCKED architecture constraint** (from Step 0.1)
   - Include SRS selection context
   - Include Claude's technical options summary as context
   - Include specialist constraints (DO/DON'T from Step 0.1.5)
   - Ask for 2-3 alternative technical implementation approaches
   - Specify innovation scope: API design, state management, testing strategy, code organization ONLY
   - Request JSON output with structure: `{"alternatives": [{"name": "", "summary": "", "items": [{"name": "", "category": "", "description": "", "strengths": [], "weaknesses": []}]}]}`

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
   - Validate each alternative respects BD constraints (LOCKED)
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
- BD constraints are already in context — no need to pass via file

**CRITICAL**: Both Claude and Gemini options MUST:
- Respect BD architecture decisions (cannot propose alternative architectures)
- Only innovate on: API design, state management, testing strategy, code organization
- Trace back to SRS requirements
- **Follow specialist DO patterns** (from Step 0.1.5)
- **Avoid specialist DON'T patterns** (from Step 0.1.5)

**DD Generation with Specialist Constraints**:

When generating Detail Design, include specialist constraints in prompt:

```markdown
=== SPECIALIST CONSTRAINTS (from querySpecialists) ===
DO:
{constraints.do}

DON'T:
{constraints.dont}

=== INHERITED FROM BD (LOCKED) ===
{bdSelection.architecture}
{bdSelection.components}
{bdSelection.dataModel}

=== DD OUTPUT REQUIREMENTS ===
1. All API endpoints MUST follow specialist patterns
2. All React components MUST follow specialist patterns
3. State management MUST align with specialist DO's
4. Include comment references in code examples:
   `// Pattern: [specialist-name]`
   `// Ref: react-query-specialist.md`

=== VALIDATION CHECKLIST ===
After generation, verify:
- [ ] No violations of DON'T patterns
- [ ] API design follows NestJS specialist
- [ ] React components follow React specialist
- [ ] State management follows Redux/React-Query specialist
```

---

### Phase 1: BD Inheritance + Constraint-Aware Synthesis (HUMAN CHECKPOINT 1)

**PURPOSE**: Show BD inheritance (LOCKED decisions), then synthesize strengths.

**CRITICAL**: DỪNG LẠI VÀ CHỜ USER PHẢN HỒI sau Step 6.

#### Step 0: BD INHERITANCE DISPLAY

```pseudo
// Load BD selection document
SET bd_selection = READ file 'innovate-bd-selection.md' FROM memory-bank context

// Extract key information
SET bd_approach = bd_selection.architecture_approach
SET bd_score = bd_selection.score
SET bd_decisions = bd_selection.key_decisions    // Array of D1, D2, D3...
SET bd_components = bd_selection.components       // Array of components

// Convert BD decisions to [CONSTRAINT] tags for Gemini context (FR-INNO-012, BR-028)
SET bd_constraints = []
FOR EACH decision IN bd_decisions:
  bd_constraints.push({
    tag: 'CONSTRAINT',
    content: 'BD-' + decision.id + ': ' + decision.description,
    source: 'Basic Design Selection'
  })

// Inject BD constraints into Gemini context alongside evidence constraints (BR-029)
// This happens in the Gemini call: context.constraints includes bd_constraints

// Error handling: if file not found
TRY:
  SET bd_selection = READ 'innovate-bd-selection.md'
CATCH:
  DISPLAY '⚠️ No BD selection found. Proceeding without BD inheritance.'
  SET bd_constraints = []
  // Skip BD inheritance display, continue to Steps 1-6
```

**Output Format (BD Inheritance):**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📋 INNOVATE DD: [FEATURE-NAME]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🔗 Inherited from Basic Design (LOCKED — READ ONLY)

**Selected BD Approach**: [bd_approach]
**Score**: [bd_score]/100

**Key Decisions (Cannot Change):**
- D1: [decision.description]
- D2: [decision.description]
- ...

**Components to Implement** (from BD):

| Component | Action | Estimated LOC |
|-----------|--------|---------------|
| [component.name] | [component.action] | ~[component.loc] |
| ... | | |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 1: DIVERGE + VALIDATE

```pseudo
// ═══════════════════════════════════════════════════════════════
// Collect approaches and validate against BD constraints
// ═══════════════════════════════════════════════════════════════

// Same as srs.md Step 1-2 with BD constraint additions:
// - Collect Claude approach (inline analysis)
// - Collect Gemini alternatives (SDK call)

// Additional BD constraint validation (BR-027)
FOR EACH alternative IN gemini_alternatives:
  FOR EACH bd_constraint IN bd_constraints:
    IF alternative.description CONTRADICTS bd_constraint.content:
      MARK alternative WITH '⚠️ BD CONSTRAINT VIOLATION: ' + bd_constraint.content
```

#### Step 2: EXTRACT DECISION ITEMS

```pseudo
// ═══════════════════════════════════════════════════════════════
// Extract discrete decision items (DD focus: API, State, Testing)
// ═══════════════════════════════════════════════════════════════

SET decision_items = []

// Parse Claude approach into technical decision points
FOR EACH section IN claude_approach:
  IF section.type IN ['api_design', 'state_management', 'component_structure', 'testing_strategy']:
    decision_items.push({
      name: section.title,
      category: section.type,
      options: [{
        number: 1,
        source: 'Claude',
        description: section.content,
        strengths: section.strengths OR [],
        weaknesses: section.weaknesses OR [],
        bd_flag: CHECK_BD_CONSTRAINT(section, bd_constraints)
      }]
    })

// Parse Gemini alternatives and merge by topic
FOR EACH alternative IN gemini_alternatives:
  FOR EACH section IN alternative.content:
    SET existing = FIND decision_items WHERE name SIMILAR TO section.title
    IF existing:
      existing.options.push({
        number: LENGTH(existing.options) + 1,
        source: 'Gemini Alt ' + alternative.index,
        description: section.content,
        strengths: section.strengths OR [],
        weaknesses: section.weaknesses OR [],
        bd_flag: CHECK_BD_CONSTRAINT(section, bd_constraints)
      })
    ELSE:
      decision_items.push({
        name: section.title,
        category: INFER_CATEGORY(section),
        options: [{
          number: 1,
          source: 'Gemini Alt ' + alternative.index,
          description: section.content,
          strengths: section.strengths OR [],
          weaknesses: section.weaknesses OR [],
          bd_flag: CHECK_BD_CONSTRAINT(section, bd_constraints)
        }]
      })
```

#### Step 3: PER-ITEM DECISION LOOP (HUMAN CHECKPOINT)

```pseudo
// ═══════════════════════════════════════════════════════════════
// Sequential decision loop — user decides EACH technical item
// BD inheritance displayed as READ-ONLY above each item
// ═══════════════════════════════════════════════════════════════

SET current_index = 0
SET total = LENGTH(decision_items)
SET decisions = []

// Backward compatibility fallback (BC-001)
IF total == 0:
  DISPLAY "⚠️ No decision items extracted. Falling back to unified synthesis."
  GOTO V1_UNIFIED_FLOW

// Display BD inheritance header once (READ-ONLY)
DISPLAY "[BD Inheritance section from Step 0 — LOCKED]"
DISPLAY ""

WHILE current_index < total:
  SET item = decision_items[current_index]

  // ─────────────────────────────────────────────────────────────
  // Display item header
  // ─────────────────────────────────────────────────────────────
  DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  DISPLAY "## 🔍 Item [current_index + 1]/[total]: [item.name]"
  DISPLAY "**Category**: [item.category]"
  DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  // ─────────────────────────────────────────────────────────────
  // Display architecture-grounded analysis
  // ─────────────────────────────────────────────────────────────
  DISPLAY ""
  DISPLAY "#### Phân tích ngữ cảnh"
  DISPLAY "[Context analysis: role in system, lifecycle, concurrency, dependencies]"
  DISPLAY ""
  DISPLAY "#### Architecture constraints"
  DISPLAY "[Cite specific architecture docs with file:line references]"
  DISPLAY "[What is LOCKED vs what is open for decision]"

  // ─────────────────────────────────────────────────────────────
  // Display options — QUALITY OVER QUANTITY
  // ─────────────────────────────────────────────────────────────
  // Rules:
  // - If architecture LOCKS the decision → show 1 optimal option only
  // - If ≥2 genuinely optimal approaches exist → show them with trade-off analysis
  // - NEVER show weak/filler options just for quantity
  // - Each option MUST reference ≥2 architecture evidence points

  DISPLAY ""
  DISPLAY "#### Options"
  DISPLAY ""
  IF LENGTH(item.options) == 1:
    // Architecture-locked — single optimal option
    DISPLAY "**Architecture đã constrain → 1 option tối ưu:**"
    DISPLAY ""
    DISPLAY "| Approach | Phân tích |"
    DISPLAY "|----------|-----------|"
    DISPLAY "| [option.description] | [deep analysis grounded in architecture] |"
  ELSE:
    // Multiple genuinely optimal approaches
    DISPLAY "| # | Approach | Phân tích |"
    DISPLAY "|---|----------|-----------|"
    FOR EACH option IN item.options:
      DISPLAY "| [option.number] | [option.description] | [architecture-grounded analysis] |"

  // ─────────────────────────────────────────────────────────────
  // Recommendation with rationale
  // ─────────────────────────────────────────────────────────────
  SET recommended = SELECT_BEST_OPTION(item.options)

  DISPLAY ""
  DISPLAY "### Recommended: Option [recommended.number]"
  DISPLAY ""
  DISPLAY "**Rationale**: [rationale grounded in architecture constraints + evidence]"

  // ─────────────────────────────────────────────────────────────
  // Display response options
  // ─────────────────────────────────────────────────────────────
  DISPLAY ""
  DISPLAY "---"
  DISPLAY ""
  DISPLAY "🤔 **Chọn option nào cho item này?**"
  DISPLAY ""
  DISPLAY "| Response | Action |"
  DISPLAY "|----------|--------|"
  DISPLAY "| `1` - `[N]` | Chọn option tương ứng |"
  DISPLAY "| `own: [ý tưởng]` | Dùng ý tưởng của anh |"
  DISPLAY "| `more info` | Cần thêm thông tin về options |"

  // ─────────────────────────────────────────────────────────────
  // WAIT FOR USER RESPONSE
  // ─────────────────────────────────────────────────────────────
  DISPLAY ""
  DISPLAY "[WAIT FOR USER RESPONSE]"

  SET response = AWAIT USER_INPUT

  // ─────────────────────────────────────────────────────────────
  // Process response (same logic as srs.md Step 4F)
  // ─────────────────────────────────────────────────────────────
  SWITCH response:
    CASE REGEX "^\d+$":
      SET choice_num = INT(response)
      IF choice_num >= 1 AND choice_num <= LENGTH(item.options):
        SET chosen = item.options[choice_num - 1]
        decisions.push({
          item: item.name,
          category: item.category,
          choice: chosen.description,
          source: chosen.source,
          has_bd_flag: BOOL(chosen.bd_flag)
        })
        current_index++
      ELSE:
        DISPLAY "❌ Invalid number. Please choose 1-[LENGTH(item.options)]"

    CASE REGEX "^own:\s*(.+)":
      SET user_idea = REGEX_MATCH[1]
      IF LENGTH(user_idea) > 10:
        decisions.push({
          item: item.name,
          category: item.category,
          choice: user_idea,
          source: "User",
          has_bd_flag: false
        })
        current_index++
      ELSE:
        DISPLAY "❌ Please provide more detail (>10 chars)"

    CASE "more info":
      FOR EACH option IN item.options:
        DISPLAY "### Option [option.number]: [option.source]"
        DISPLAY "[DETAILED_EXPLANATION(option)]"
        IF option.bd_flag:
          DISPLAY "⚠️ **BD Constraint Note**: [option.bd_flag]"
      // Stay on same item

    DEFAULT:
      DISPLAY "❌ Invalid input. Use: number, 'own: [idea]', or 'more info'"

  // ─────────────────────────────────────────────────────────────
  // Save state + Show running summary (after valid decision)
  // ─────────────────────────────────────────────────────────────
  IF current_index CHANGED:
    // Persist to file backup (D2)
    SET session_state = {
      feature: FEATURE_NAME,
      phase: "INNOVATE_DD",
      current_index: current_index,
      total_items: total,
      decisions: decisions,
      bd_inheritance: bd_selection
    }
    WRITE "cache/innovate-session.json" WITH JSON(session_state)

    // Display running summary + AUTO-ADVANCE to next item
    DISPLAY ""
    DISPLAY "📊 **Progress: [current_index]/[total] decisions made**"
    DISPLAY ""
    DISPLAY "| # | Item | Selected | Source |"
    DISPLAY "|---|------|----------|--------|"
    FOR EACH d IN decisions:
      SET flag = d.has_bd_flag ? " ⚠️" : ""
      DISPLAY "| [INDEX+1] | [d.item] | [TRUNCATE(d.choice, 30)][flag] | [d.source] |"

    // AUTO-ADVANCE: Immediately continue to next item in the WHILE loop
    // Do NOT wait for user to say "tiếp" — only wait at the NEXT item's option selection
    // The WHILE loop naturally advances to show the next item
```

#### Step 4: FINAL SUMMARY

```pseudo
// ═══════════════════════════════════════════════════════════════
// Display all decisions with BD inheritance for final review
// ═══════════════════════════════════════════════════════════════

DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "## 📋 Final Summary - DD Decisions"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY ""
DISPLAY "### 🔗 BD Inheritance (LOCKED)"
DISPLAY "[Brief BD summary - approach, key decisions]"
DISPLAY ""
DISPLAY "### 🔧 Technical Decisions"
DISPLAY ""
DISPLAY "| # | Item | Category | Selected Option | Source |"
DISPLAY "|---|------|----------|-----------------|--------|"
FOR EACH decision IN decisions:
  SET flag = decision.has_bd_flag ? " ⚠️" : ""
  DISPLAY "| [INDEX+1] | [decision.item] | [decision.category] | [decision.choice][flag] | [decision.source] |"
DISPLAY ""
DISPLAY "**Total**: [LENGTH(decisions)] technical decisions"
IF ANY decision.has_bd_flag:
  DISPLAY ""
  DISPLAY "⚠️ **Note**: Some decisions have BD constraint flags. Ensure alignment with Basic Design."
```

#### Step 5: CONFIRMATION (HUMAN CHECKPOINT)

```pseudo
// ═══════════════════════════════════════════════════════════════
// Final confirmation before save
// ═══════════════════════════════════════════════════════════════

DISPLAY ""
DISPLAY "---"
DISPLAY ""
DISPLAY "🤔 **Confirm để save?**"
DISPLAY ""
DISPLAY "| Response | Action |"
DISPLAY "|----------|--------|"
DISPLAY "| `confirm` hoặc `save` | Save to selection file |"
DISPLAY "| `change [N]` | Go back to item N để chọn lại |"
DISPLAY "| `cancel` | Abort, không save |"
DISPLAY ""
DISPLAY "[WAIT FOR USER RESPONSE]"

SET confirmation = AWAIT USER_INPUT

SWITCH confirmation:
  CASE "confirm" OR "save" OR "ok":
    CALL SAVE_SELECTION(decisions, bd_inheritance)
    DISPLAY "✅ Saved to innovate-dd-selection.md"

  CASE REGEX "^change\s+(\d+)":
    SET go_back_to = INT(REGEX_MATCH[1]) - 1
    IF go_back_to >= 0 AND go_back_to < total:
      current_index = go_back_to
      decisions = decisions.slice(0, go_back_to)
      GOTO STEP_3_LOOP
    ELSE:
      DISPLAY "❌ Invalid item number"

  CASE "cancel":
    DISPLAY "❌ Aborted. No changes saved."
    DELETE "cache/innovate-session.json"
```

**WAIT FOR USER RESPONSE BEFORE CONTINUING.**

**IMPORTANT - Phase 1 Guidelines (v3 - Architecture-Grounded):**
- ✅ ALWAYS display BD inheritance as READ-ONLY ABOVE items (BR-026)
- ✅ ALWAYS ground options in architecture docs with specific file:line citations
- ✅ ALWAYS include context analysis (role, lifecycle, concurrency, dependencies) per item
- ✅ Show 1 option if architecture locks the decision — explain WHY it's the only valid choice
- ✅ Show ≥2 options ONLY if genuinely optimal approaches exist at different trade-offs
- ✅ Wait for user choice PER ITEM, then AUTO-ADVANCE to next item (no "tiếp" required)
- ✅ User can: choose number / own idea / ask for more info
- ✅ Show running progress summary after each decision
- ✅ Final confirmation before save with option to go back
- ❌ NEVER show weak/filler options just to have multiple choices
- ❌ NEVER present options that violate architecture constraints
- ❌ NEVER auto-select without user input
- ❌ NEVER require user to type "tiếp" / "next" between items

---

### Phase 2: Refine Technical Details (Based on User Choice)

**PURPOSE**: AI refine technical approach dựa trên lựa chọn của user.

**Output Format:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🔧 Refined Technical Approach
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Based on**: [User choice: Gemini/Claude/Hybrid]

### Category 1: API & Backend Design

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Endpoint Style** | [Action-based/Resource-based/Hybrid] | [Why] |
| **DTO Pattern** | [Flat/Nested/Record types] | [Why] |
| **Error Response** | [Problem Details RFC/Custom/Existing] | [Why] |
| **Validation** | [FluentValidation/DataAnnotations/Domain] | [Why] |

### Category 2: Frontend State & UI

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **State Location** | [Redux slice/Local hook/React Query] | [Why] |
| **Re-render Strategy** | [useShallowEqual/Reselect/Manual memo] | [Why] |
| **SignalR Integration** | [Global/Per-component/Hook-based] | [Why] |

### Category 3: Testing Strategy

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **BE Unit Tests** | [Handler/Service/Repository focused] | [Why] |
| **FE Unit Tests** | [Hook/Component/Both] | [Why] |
| **Integration Tests** | [API only/SignalR included/Full flow] | [Why] |
| **Mock Strategy** | [In-memory DB/Repository mocks/Service mocks] | [Why] |

### Implementation Files

| File | Action | Estimated Lines |
|------|--------|-----------------|
| [File 1] | [NEW/MODIFY] | ~[N] |
| [File 2] | [NEW/MODIFY] | ~[N] |
| [File 3] | [NEW/MODIFY] | ~[N] |

**Total Estimated Impact**: ~[N] lines
```

**CONTINUE TO PHASE 3 (NO WAIT HERE)**

---

### Phase 3: User Review Technical Decisions (HUMAN CHECKPOINT 2)

**PURPOSE**: User review và approve technical decisions.

**CRITICAL**: DỪNG LẠI VÀ CHỜ USER PHẢN HỒI.

**Output Format:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🔍 Review Technical Decisions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Để đảm bảo technical approach **đúng, đủ, tối ưu**, anh hãy review:

### 1. API Design
- Endpoint naming có **consistent** với existing APIs không?
- DTO structure có **đủ fields** không?
- Validation approach có **phù hợp** không?

### 2. State Management
- State location có **đúng** với complexity không?
- Re-render optimization có **cần thiết** không?
- SignalR integration có **match** với existing pattern không?

### 3. Testing Strategy
- Test coverage có **đủ** cho requirements không?
- Mock strategy có **practical** không?
- Integration tests có **cover critical flows** không?

### 4. Code Impact
- Estimated lines có **reasonable** không?
- File changes có **miss** anything không?
- Có **existing code** cần consider không?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤔 **Anh review và cho feedback:**

| Response | Action |
|----------|--------|
| `approved` | Technical decisions đã OK → Proceed to finalize |
| `change [category] to [option]` | Thay đổi decision cụ thể |
| `need more info on [category]` | Tôi sẽ elaborate thêm |
| [Specific feedback] | Tôi sẽ update và show lại |
```

**WAIT FOR USER RESPONSE BEFORE CONTINUING.**

---

### Phase 4: Iterate (If User Has Feedback)

**Iteration Tracking**: Soft limit 3 rounds. After 3 iterations, gợi ý escalate.

**Output Format:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🔄 Updated Technical Approach (Iteration [N]/3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Changes Made

| # | Category | Change | Reason |
|---|----------|--------|--------|
| 1 | [Category] | [Old → New] | User feedback: [reason] |
| 2 | [Category] | [Old → New] | User feedback: [reason] |

### Updated Decisions

[Show updated categories only]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤔 **Anh review lại và cho feedback:**

| Response | Action |
|----------|--------|
| `approved` | Technical decisions đã OK → Proceed to finalize |
| [Specific feedback] | Tiếp tục điều chỉnh |
```

**After 3 iterations without approval:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ **Iteration Limit Reached (3/3)**

Chúng ta đã iterate 3 lần. Có thể requirements chưa clear.

| Response | Action |
|----------|--------|
| `continue` | Tiếp tục iterate thêm |
| `escalate` | Dừng lại, review lại BD decisions |
| `approved` | Chấp nhận version hiện tại |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**WAIT FOR USER RESPONSE.**

---

### Phase 5: Finalize & Save (HUMAN CHECKPOINT 3)

**PURPOSE**: Final confirmation trước khi save.

**CRITICAL**: DỪNG LẠI VÀ CHỜ USER CONFIRM "save" hoặc "approved".

**Output Format:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📋 Final Summary Before Save
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Inheritance
**From Basic Design**: [BD Approach Name]
**BD Score**: [Score]/100

### Technical Decisions

| Category | Decision |
|----------|----------|
| **API Design** | |
| - Endpoint Style | [Choice] |
| - DTO Pattern | [Choice] |
| - Validation | [Choice] |
| **State Management** | |
| - State Location | [Choice] |
| - Re-render Strategy | [Choice] |
| - SignalR Integration | [Choice] |
| **Testing Strategy** | |
| - Backend Tests | [Choice] |
| - Frontend Tests | [Choice] |
| - Integration Tests | [Choice] |

### Implementation Files

| File | Action | Estimated Lines |
|------|--------|-----------------|
| [File 1] | [NEW/MODIFY] | ~[N] |
| [File 2] | [NEW/MODIFY] | ~[N] |

**Total Estimated Impact**: ~[N] lines

### Iterations
> [N] rounds, [M] changes made

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤔 **Confirm để save?**

| Response | Action |
|----------|--------|
| `save` hoặc `approved` | Save to innovate-dd-selection.md |
| `wait` | Chưa save, cần review thêm |
| [Feedback] | Điều chỉnh trước khi save |
```

**WAIT FOR USER RESPONSE.**

**Only after user confirms "save" or "approved":**

Save to `innovate-dd-selection.md`:

```markdown
# INNOVATE DD Selection: [FEATURE-ID]

## Inheritance

**From Basic Design**: [BD Approach Name]
**BD Score**: [Score]/100

## Selection Summary

| Field | Value |
|-------|-------|
| **Feature** | [FEATURE-ID] |
| **Task Type** | [enhancement/new/bugfix] |
| **Module** | [MODULE] |
| **Selected Technical Approach** | [Gemini/Claude/Hybrid] |
| **Selection Date** | [DATE] |

## Technical Decisions

### API & Backend
- **Endpoint Style**: [Choice]
- **DTO Pattern**: [Choice]
- **Validation**: [Choice]

### Frontend State & UI
- **State Management**: [Choice]
- **Re-render Strategy**: [Choice]
- **SignalR Integration**: [Choice]

### Testing Strategy
- **Backend Tests**: [Choice]
- **Frontend Tests**: [Choice]
- **Integration Tests**: [Choice]

## Implementation Files

| File | Action | Estimated Lines |
|------|--------|-----------------|
| [File 1] | [NEW/MODIFY] | ~[N] |
| [File 2] | [NEW/MODIFY] | ~[N] |

## User Feedback Incorporated
> [N] iterations, [M] changes made

---

*Generated by EPS INNOVATE_DD v3.0*
*Inherited from: BD Selection*
*Human-in-Loop Pattern - EPS Framework v7.0*
```

---

## DD Innovation Approval Gate (G0-DD)

After user selects and confirms their preferred DD approach, run the approval gate:

```bash
node core/cli/ops.js gate-check --gate G0-DD
GATE_RESULT=$(node -e "const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')); console.log(r.ok ? 'PASS' : 'FAIL: ' + JSON.stringify(r.data?.violations || []))")
echo "$GATE_RESULT"
```

This gate (`guards/gates/approve-innovate-dd.js`) verifies:
- User has explicitly approved the DD innovation selection
- Selection is recorded in `innovate-dd-selection.md`
- If FAIL: BLOCK — user must approve selection before proceeding to design
- If PASS: Continue to state update

---

## Update State

```bash
node core/state/state-manager.js update INNOVATE_DD
```

---

## Phase 5.5: Update Evidence & Context (Post-Save — MANDATORY)

After saving `innovate-dd-selection.md`, update evidence.md and context.md:

**1. Update evidence.md — Section "### 2.3 Technical Decisions"**

Using the Read tool, read current `evidence.md`. Then using the Edit tool, add or replace the section:

```markdown
### 2.3 Technical Decisions (updated by /innovate DD — [DATE])

**Inherits from BD**: [BD approach name] (Score: [X]/100)
**API Design**: [Endpoint style, DTO pattern, validation]
**State Management**: [State location, re-render strategy]
**Testing Strategy**: [Backend, frontend, integration approach]
**Implementation Files**: [X] files, ~[Y] estimated lines

**Corrections to Research/BD Findings**:
[List corrections or "No corrections"]
```

**2. Update context.md — Add to Decisions Log**

Read context.md. If "## Decisions Log" section doesn't exist, create it with table header. Then append rows:

| # | Phase | Decision | Choice | Rationale | Corrects |
|---|-------|----------|--------|-----------|----------|
| N | INNOVATE_DD | API design | [Style] | [1-line] | [E# or "—"] |
| N+1 | INNOVATE_DD | State management | [Choice] | [1-line] | [E# or "—"] |

**3. Update Impact Analysis** with final file list and effort estimate

Update the Impact Analysis section in evidence.md with the finalized technical scope.

**CRITICAL**: This step is MANDATORY. Do NOT skip even if user says "done" or "next".

---

## Completion Message

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ INNOVATE_DD Complete - Technical Approach Selected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Feature: [FEATURE-ID]
🔗 Inherited from BD: [BD Approach Name]
🔧 Technical Approach: [Gemini/Claude/Hybrid]

### Technical Decisions Summary

| Category | Decision |
|----------|----------|
| API Design | [Summary] |
| State Management | [Summary] |
| Testing Strategy | [Summary] |

### Impact
- Estimated: ~[N] lines
- Files: [M] files

### User Feedback
> [N] iterations incorporated

### Quality Assurance
- ✅ BD inheritance respected (architecture locked)
- ✅ Technical decisions approved
- ✅ User reviewed and approved

**Next command:** `/design --detail`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Guidelines Summary

**DO:**
- ✅ LOAD BD selection file first (Phase 0) - architecture is LOCKED
- ✅ GENERATE Claude options INLINE (direct analysis with full context)
- ✅ GENERATE Gemini options via SDK (with BD selection as constraint)
- ✅ DISPLAY BD inheritance as context (Phase 1)
- ✅ PRESENT options to user (Phase 1) → WAIT
- ✅ REFINE based on user choice (Phase 2)
- ✅ ASK review questions (Phase 3) → WAIT
- ✅ ITERATE until user approves, soft limit 3 rounds (Phase 4)
- ✅ CONFIRM before save (Phase 5) → WAIT
- ✅ Save to `innovate-dd-selection.md` ONLY after user confirms

**DON'T:**
- ❌ Use Task agents for option generation (loses conversation context)
- ❌ Use hardcoded templates for Claude options (analyze actual BD/SRS)
- ❌ Propose alternative architectures (that's BD's job)
- ❌ Change components defined in BD
- ❌ Add new components not in BD
- ❌ Ignore BD decisions
- ❌ Present numbered choices (1/2/3/4/5) for auto-selection
- ❌ Auto-proceed without user approval at checkpoints
- ❌ Save without final user confirmation

**HUMAN CHECKPOINTS:**

| Checkpoint | Phase | User Action Required |
|------------|-------|---------------------|
| HC1 | Phase 1 | Choose technical approach (Gemini/Claude/Hybrid) |
| HC2 | Phase 3 | Review technical decisions, provide feedback or approve |
| HC3 | Phase 5 | Final confirmation before save |

**ITERATION POLICY:**
- Soft limit: 3 rounds
- After 3 rounds: Gợi ý escalate hoặc continue
- User có quyền override và continue unlimited

---
*INNOVATE_DD Workflow v4.0*
*Pattern: Inline Generate → Present → WAIT → Refine → Review → WAIT → Iterate → WAIT → Finalize*
*Key Constraint: BD inheritance MUST be respected (architecture LOCKED)*
*Hybrid Inline Pattern - EPS Framework v8.0*
*Updated: 2026-01-24*
