# plan/generation.md — Steps 4 + 4.5: Plan Generation (INLINE) + Auto-Split

## 🚨 EXECUTION CONSTRAINTS (INHERITED FROM ROUTER)

```
╔══════════════════════════════════════════════════════════════════╗
║  ⚠️ Generate ALL plan content INLINE — NO Agent/Task tool       ║
║  ⚠️ SEQUENTIAL only — one step/sub-plan at a time               ║
║  ⚠️ Each sub-plan: generate → WRITE → validate → THEN next      ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Step 4: Generate Implementation Plan (INLINE — NO Agent Tool)

⚠️ **MANDATORY**: Generate the plan INLINE in the current conversation. DO NOT use Agent tool, Task tool, or any subagent delegation. Claude (you) directly analyzes all input documents and generates the plan.

### 4.0: Initialize Checkpoint Enforcement

```bash
# Reset checkpoints for plan type
node core/cli/ops.js design-checkpoint --action reset --type plan
node core/cli/ops.js design-checkpoint --action skill-reset --command plan

# Verify section 0 (plan uses non-sequential mode — no N-1 lock check)
node core/cli/ops.js design-checkpoint --action verify --section 0 --type plan
```

Synthesize all loaded context into a comprehensive implementation plan:

**Input Documents**:
```
=== APPROVED SRS ===
[content from [FEATURE]-srs.md]

=== APPROVED BASIC DESIGN ===
[content from [FEATURE]-basic-design.md]

=== APPROVED DETAIL DESIGN (Traditional Pattern) - Mode: [DD_MODE] ===
[content from $FDD_PATH, $BDD_PATH, api-contracts.md]
[If pseudo-code format: parse META, TRACE_MATRIX, COMPONENTS sections]
[If human format: extract from narrative text]

=== APPROVED DETAIL DESIGN (A+B+C Pattern - if applicable) ===
[Document A: portal-fdd.md - Cross-feature workflows, API strategy]
[Document B: aggregate-fdd.md - Shared components, state architecture, error handling]
[Document C: *-screens-fdd.md - Module-specific screens per sub-feature]

=== SOURCE CODE CONTEXT (RAG - from Step 2.5) ===
[ragContext.codePatterns - existing implementation patterns found via vector search]
[ragContext.graphConstraints - REALIZES/DEFINED_IN relationships from knowledge graph]

=== EVIDENCE CONTEXT (from Step 2.7 - enriched, if available) ===
[evidenceContent - research findings + innovate decisions + design summaries]

=== ARCHITECTURE CONSTRAINTS (v5.4 - from Step 2.10) ===
Source: ${archContext.source}
Layers: ${archContext.layerBoundaries.join(' -> ')}

## Design Patterns
| Pattern | Applied To | Source |
|---------|-----------|--------|
${archContext.patterns.map(p => `| ${p.name} | ${p.appliedTo} | ${p.source} |`).join('\n')}

## Layer Boundaries
${archContext.layerBoundaries.map((layer, i) => `${i + 1}. **${layer}** Layer`).join('\n')}

## Constraints
${archContext.constraints.map(c => `- ${c}`).join('\n')}

ARCHITECTURE_COMPLIANCE:
  - Each step MUST specify which layer it operates in
  - Each step SHOULD reference applicable design pattern
  - Cross-layer calls MUST use defined interfaces
  - Validate against constraints before generating step

=== STACK-SPECIFIC PATTERNS (v5.4 - from Step 2.9) ===
Stack: ${stackContext.stackId}
Matched Specialists: ${stackContext.specialists.length}

## Specialist Patterns
${stackContext.specialists.map(s => `
### ${s.name}
Relevance: ${s.relevance}
${s.pattern}
`).join('\n')}

## RAG Patterns (if available)
${stackContext.ragPatterns.map(p => `
Source: ${p.source} (score: ${p.score.toFixed(2)})
${p.content}
`).join('\n')}

CONTEXT_PRIORITY:
  1. Approved Design Documents - PRIMARY
  2. Architecture Constraints - MUST FOLLOW (from Step 2.10)
  3. Stack-Specific Patterns - HOW to implement
  4. Evidence - research findings
  5. RAG Source Code - existing patterns

USE specialist patterns when generating implementation steps.
Each step SHOULD reference a specialist pattern if applicable.
```

**Pattern Detection**: If `[FEATURE]-portal-fdd.md` exists, use A+B+C pattern documents.

**Task**:
Create comprehensive implementation plan based on approved design documents (NOT assumptions).

**Plan Structure (v5.4 Execute-Compatible)**:
```markdown
# Implementation Plan: [Feature Name]

> **Confidence**: [X]% (≥90% required for APPROVED status)
> **Status**: APPROVED | DRAFT
> **DD Mode**: [pseudo-code | hybrid | human]
> **Token Reduction**: ~[X]%
> **Stack**: [stackContext.stackId]
> **Architecture Source**: [archContext.source]

## 0. Plan Boundaries

### 0.1 Files to Modify

| # | File | Lines | Action | Layer |
|---|------|-------|--------|-------|
| 1 | `path/to/file.ts` | 10-50 | MODIFY | Application |

### 0.2 Methods to Change

| # | File | Method | Action | Pattern |
|---|------|--------|--------|---------|
| 1 | `path/to/file.ts` | `methodName()` | ADD | Repository |

### 0.3 Dependencies Between Steps

| Step | Depends On | Reason |
|------|-----------|--------|
| 2 | 1 | Requires interface from Step 1 |

## 1. Implementation Steps

### Step 1: [Concise Description]

**Architecture Reference**:
- Pattern: [from archContext.patterns]
- Layer: [Presentation | Application | Domain | Infrastructure]
- Constraint: [relevant constraint from archContext.constraints]

**Specialist Pattern**:
```typescript
// From: [stackContext.specialists[n].name]
[relevant code pattern snippet]
```

**Files**:
- `path/to/file.ts` (lines X-Y)

**Methods**:
- `methodName()` - [ADD | MODIFY | DELETE]

**Dependencies**:
- Depends on: [previous step or "None"]
- Required by: [subsequent step or "None"]

**Implementation**:
```typescript
// Pseudo-code or interface definition
// NO full implementation code
```

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

---

[... additional steps following same format ...]

## 2. Validation Checklist

### Architecture Compliance
- [ ] All steps operate within correct layer
- [ ] No cross-layer direct dependencies
- [ ] Design patterns correctly applied

### Execute Compatibility
- [ ] All files listed in Boundaries
- [ ] All methods listed with actions
- [ ] Dependencies clearly defined
- [ ] Each step is independently executable

### Quality Gates
- [ ] Confidence ≥90%
- [ ] No prohibited content (full implementation)
- [ ] Specialist patterns referenced

## 3. Test Plan

### 3.1 Per-Step Test Cases

#### Step [N] Tests

| # | Test Case | Type | Expected Behavior | Test File |
|---|-----------|------|-------------------|-----------|
| T[N].1 | [tên test case] | NORMAL | [expected result] | [TestFile.java / test-file.test.ts] |
| T[N].2 | [tên test case] | ABNORMAL | [expected error/behavior] | [same file] |

> Nếu step không cần test (config, migration): ghi "No test cases — [lý do]"

### 3.2 Test Summary

| Metric | Target |
|--------|--------|
| Total test cases | [N] |
| Normal cases | [X] ([X/N]%) |
| Abnormal cases | [Y] ([Y/N]%) |
| Abnormal ratio | ≥40% |
| Unit test coverage target | [Z]% |
| Integration test coverage target | [W]% |

### 3.3 Test File Listing

| # | Test File | Steps Covered | Level | Framework |
|---|-----------|---------------|-------|-----------|
| 1 | [path/TestFile.java] | Step 1, 3 | unit | JUnit5 + StepVerifier |
| 2 | [path/test-file.test.ts] | Step 2 | unit | Vitest + @testing-library |

---

*Plan generated: [DATE]*
*EPS Framework v5.4*
```

### Section 3 Generation Rules

1. **Test cases lấy từ đâu**: Claude phân tích implementation steps (Section 1) + DD contracts + test specialist (tps-*) để thiết kế test cases
2. **Specialist loading**: Trước khi generate Section 3, load test-plan specialist:
   - Detect stack từ Plan Section 0.1 file extensions (.java → java-reactive, .ts/.tsx → typescript-nextjs)
   - Load: `specialist-load --category test-plan --source-path <first-file-of-stack>`
   - Ví dụ: `tps-java-reactive-unit.md` (backend), `tps-nextjs-unit.md` (frontend)
   - Fullstack: load cả 2 specialists
3. **Abnormal ratio**: Tổng abnormal cases / total cases ≥ 40%. Nếu < 40% → Claude phải bổ sung abnormal cases
4. **Test file naming**:
   - Java: `[ClassName]Test.java` cùng package structure trong `src/test/`
   - TypeScript: `[file-name].test.ts` hoặc `[file-name].spec.ts` cùng thư mục `__tests__/`
5. **Type chỉ có 2 giá trị**: `NORMAL` hoặc `ABNORMAL`
6. **Test ID convention**: Mỗi test case có ID duy nhất `T[step].[seq]` (ví dụ: T1.1, T1.2, T2.1). Lifecycle:
   - `/plan`: Tạo ID trong Section 3.1 table (cột #)
   - `/execute`: Chèn ID vào test method — `@DisplayName("T1.2: ...")` (Java) hoặc `it('T1.2: ...')` (TypeScript)
   - `/test run`: Match test result với plan case bằng ID (tìm `T1.2` trong displayName/test name)

**Ví dụ cụ thể**:

```markdown
#### Step 1 Tests (UserService.createUser)

| # | Test Case | Type | Expected Behavior | Test File |
|---|-----------|------|-------------------|-----------|
| T1.1 | Create user with valid data | NORMAL | Return UserDTO with generated ID | UserServiceTest.java |
| T1.2 | Create user with duplicate email | ABNORMAL | Throw DuplicateEmailException (ERR-001) | UserServiceTest.java |
| T1.3 | Create user with null required fields | ABNORMAL | Throw ValidationException | UserServiceTest.java |
| T1.4 | Create user when DB connection fails | ABNORMAL | Throw ServiceUnavailableException | UserServiceTest.java |
```

### 4.0b: Complete Monolithic Plan Checkpoint

After generating and writing the monolithic plan:

```bash
# Complete section 0 checkpoint (non-blocking — warn if < 40 lines)
node core/cli/ops.js design-checkpoint --action complete --section 0 --type plan --file "$PLAN_PATH"

# Verify-all (report count)
node core/cli/ops.js design-checkpoint --action verify-all --type plan
```

**IMPORTANT Instructions (INLINE Generation)**:
- ⚠️ Generate ALL plan content INLINE — DO NOT delegate to Agent/Task tool
- ✅ Base ALL steps on approved documents (reference specific sections)
- ✅ Include file paths from Basic Design
- ✅ Include API signatures from Detail Design
- ✅ Include database schema from Detail Design
- ✅ Follow coding standards (FRONTEND_CODING_STANDARDS.md, BACKEND_CODING_STANDARDS.md)
- ❌ NO assumptions or hallucinations
- ❌ NO generic placeholders
- ❌ NO Agent tool, NO Task tool, NO subagent delegation
- ❌ NO parallel execution — generate sequentially

---

## Step 4.5: Auto-Split Plan Generation (Multi-File Mode — SEQUENTIAL INLINE)

⚠️ **MANDATORY**: Generate ALL sub-plans INLINE in the current conversation. SEQUENTIAL only — generate one sub-plan, WRITE it to file, then proceed to the next. DO NOT use Agent tool, Task tool, or parallel execution.

**Trigger**: Only when `designDocs.splitMode === "multi-file"` AND estimated plan size > 600 lines.
When triggered, this step replaces the monolithic plan output from Step 4 with a two-pass approach.

```javascript
const { buildSectionOrder, groupBySizeConstraint, generateMasterPlanIndex,
        estimatePlanSize, validateMasterPlan, validateSubPlan,
        SIZE_THRESHOLDS, SIZE_CONSTRAINTS
} = require('./core/plan/auto-split.js');

let subPlanMode = "disabled";

if (designDocs.bddSectionMap && designDocs.bddSectionMap.size > 0) {
  const estimated = estimatePlanSize(designDocs.bddSectionMap);
  if (estimated > SIZE_THRESHOLDS.planSplitLines) {
    subPlanMode = "auto";
    console.log(`📂 Auto-split: estimated ${estimated} lines > ${SIZE_THRESHOLDS.planSplitLines} threshold`);
  } else {
    console.log(`📄 Single plan: estimated ${estimated} lines ≤ ${SIZE_THRESHOLDS.planSplitLines} threshold`);
  }
}

if (subPlanMode === "auto") {
  // Reset checkpoints for auto-split (replaces monolithic checkpoint)
  // node core/cli/ops.js design-checkpoint --action reset --type plan

  // Build section order from document position (E22, E23)
  const boundaries = [...designDocs.bddSectionMap.entries()].map(([id], i) =>
    ({ sectionId: id, documentOrder: i }));
  const sectionOrder = buildSectionOrder(designDocs.bddSectionMap, boundaries);

  // Estimate tokens per section (read section file, count lines × 4)
  const sectionTokens = new Map();
  for (const [sectionId, filePath] of Object.entries(designDocs.bddSectionFiles)) {
    const content = fs.readFileSync(filePath, "utf8");
    sectionTokens.set(sectionId, Math.round(content.split("\n").length * 4));
  }

  const groups = groupBySizeConstraint(sectionOrder, sectionTokens, SIZE_CONSTRAINTS);

  // === PASS 1: Master Plan Index ===
  // Generate master plan using multi-model (Claude/Gemini/Hybrid) — full quality
  const sharedContext = {
    confidence: "94%",
    summary: evidenceContent ? evidenceContent.substring(0, 2000) : "",
    definitions: ""
  };
  const masterPlan = generateMasterPlanIndex(groups, sharedContext, feature, innovateSelection);

  // Save master plan
  const plansDir = path.join(contextDir, 'plans');
  if (!fs.existsSync(plansDir)) fs.mkdirSync(plansDir, { recursive: true });
  const masterPath = path.join(plansDir, `${feature}-implementation-plan.md`);
  fs.writeFileSync(masterPath, masterPlan, 'utf8');
  console.log(`✅ Master plan index: ${masterPath} (${masterPlan.split('\n').length} lines)`);

  // Validate master plan (non-blocking)
  const masterValidation = validateMasterPlan(masterPlan);
  if (masterValidation.valid) {
    console.log(`  ✅ Master validation: ${masterValidation.lineCount} lines, ${masterValidation.subPlanCount} sub-plans`);
  } else {
    console.warn(`  ⚠️ Master validation warnings: ${masterValidation.errors.join(', ')}`);
  }

  // === PASS 2: Each Sub-Plan (SEQUENTIAL INLINE — NO Agent tool) ===
  // ⚠️ CRITICAL: Generate each sub-plan INLINE in current conversation.
  // DO NOT use Agent tool, Task tool, or parallel execution.
  // Generate → Write → Validate → THEN move to next sub-plan.
  for (const group of groups) {
    let sectionContent = "";
    for (const sectionId of group.sections) {
      const filePath = designDocs.bddSectionFiles[sectionId];
      if (filePath && fs.existsSync(filePath)) {
        sectionContent += fs.readFileSync(filePath, "utf8") + "\n---\n";
      }
    }

    const spFileName = `SP-${group.spId.split('-')[1]}-${group.title.replace(/ \+ /g, '-')}.md`;
    const spPath = path.join(plansDir, spFileName);

    console.log(`  📝 Generating ${group.spId}: ${group.title} (${group.sections.length} sections)...`);

    // Checkpoint: verify (non-blocking — plan non-sequential)
    // node core/cli/ops.js design-checkpoint --action verify --section $SP_INDEX --type plan

    // Load per-sub-plan graph context
    // node core/cli/ops.js design-context --section $SP_INDEX --type plan --module "$MODULE"

    // INLINE generation: Claude directly generates sub-plan content using:
    // - masterPlan (compact index) as structural reference
    // - sectionContent (relevant DD only) as primary input
    // - matched specialists for HOW context
    // Each sub-plan follows same structure as monolithic plan but scoped to group.sections
    // This is where the 74% token savings occur (E4)

    // After generating sub-plan content INLINE:
    // 1. WRITE the sub-plan file using Write tool
    // 2. Validate (non-blocking — warn but don't stop)
    // 3. THEN proceed to next group (SEQUENTIAL)

    // Checkpoint: complete (non-blocking — warn if < 40 lines)
    // node core/cli/ops.js design-checkpoint --action complete --section $SP_INDEX --type plan --file "$SP_PATH"

    // const spValidation = validateSubPlan(spContent);
    // if (spValidation.valid) {
    //   console.log(`  ✅ ${group.spId} validation: ${spValidation.lineCount} lines`);
    // } else {
    //   console.warn(`  ⚠️ ${group.spId} validation warnings: ${spValidation.errors.join(', ')}`);
    // }
  }

  // Checkpoint: verify-all (report count — non-blocking)
  // node core/cli/ops.js design-checkpoint --action verify-all --type plan

  console.log(`✅ Auto-split: ${groups.length} sub-plans generated`);

  // AC8: Token budget estimation (informational — not enforced)
  // Context window ~200K tokens. Target: master < 5%, per SP < 15%
  const masterTokens = Math.round(masterPlan.split('\n').length * 4);
  const contextWindow = 200000;
  const masterPct = ((masterTokens / contextWindow) * 100).toFixed(1);
  console.log(`📊 Token budget (AC8):`);
  console.log(`   Master: ~${masterTokens} tokens (${masterPct}% of context) — target < 5%`);
  for (const group of groups) {
    const spTokens = group.sections.reduce((sum, sid) => sum + (sectionTokens.get(sid) || 0), 0);
    const spPct = ((spTokens / contextWindow) * 100).toFixed(1);
    console.log(`   ${group.spId}: ~${spTokens} tokens (${spPct}% of context) — target < 15%`);
  }
}
// else: monolithic plan (existing Step 4 logic — unchanged)
```

**Key Rules**:
- ⚠️ ALL generation runs INLINE — NO Agent tool, NO Task tool, NO parallel execution
- Master plan uses full multi-model generation (3 plans: Claude/Gemini/Hybrid)
- Sub-plans use single-model only (Claude) — no multi-model per sub-plan
- SEQUENTIAL sub-plan generation: generate → write → validate → next (E22)
- Each sub-plan loads ONLY its section pseudo files (74% token savings)
- `planStructure: multi-sub-plan` marker in master plan header

---

## Step 4.6: Confidence Check

After generating the plan (or all sub-plans), invoke the **confidence-check** skill:
- 5-point assessment:
  1. Duplicate check — plan doesn't recreate existing components
  2. Architecture compliance — plan respects layer boundaries
  3. Official docs verification — referenced APIs/libraries are valid
  4. OSS references — dependencies are current and maintained
  5. Root cause identification — plan addresses actual problem, not symptoms
- Minimum required: ≥90% confidence
- If < 90%: Display assessment details, ask user to address gaps before approving plan
- If ≥ 90%: Set plan status to APPROVED, continue to save

```bash
# Skill artifact enforcement
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill confidence-check --command plan --result PASS
node core/cli/ops.js design-checkpoint --action skill-verify \
  --skills "confidence-check" --mode strict
```

---

**NEXT**: Use the **Read tool** to load `commands/plan/save-and-display.md` and follow its instructions completely.

<!-- Next: plan/save-and-display.md — Steps 5-7: Save, State Update, Display -->
