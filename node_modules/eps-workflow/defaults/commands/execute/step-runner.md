# execute/step-runner.md — Steps 2-4: Initialize, Execute Steps, Multi-Sub-Plan Advance

Core execution loop. Operates on `ACTIVE_PLAN_FILE` (resolved by plan-loading.md).
For multi-sub-plan: this runs steps for the CURRENT SP only.

---

## Step 2: Initialize Enforcement

Reset checkpoints and skill tracking for this execution run:

```pseudo
design-checkpoint --action reset --type execute
design-checkpoint --action skill-reset --command execute

TodoWrite([
  # One entry per plan step, auto-generated from plan content
  # + post-execution entries (feedback, verify-all, state update)
])
```

---

## Step 3: Per-Step Execution Loop (D3: Dual-Layer Checkpoint)

For EACH plan step, follow this exact sequence:

```pseudo
for stepIndex = resumeFrom to totalSteps:
  step = planSteps[stepIndex]

  # ─────────────────────────────────────────────────────
  # 3.A: Verify checkpoint (Layer 1: design-checkpoint)
  # ─────────────────────────────────────────────────────
  checkpointResult = design-checkpoint --action verify --section stepIndex --type execute
  if already completed → skip

  # ─────────────────────────────────────────────────────
  # 3.B: Load graph context (design-context)
  # ─────────────────────────────────────────────────────
  fileType = extractFileType(step.description, step.files)
  contextResult = design-context --section 0 --type execute --module fileType
  graphContext = { codePatterns, dependencies, imports, specialistHints }

  # ─────────────────────────────────────────────────────
  # 3.C: Load specialist (specialist-load --source-path)
  # ─────────────────────────────────────────────────────
  sourcePath = step.files[0]  # Primary file being generated
  specialistResult = specialist-load --type code --source-path sourcePath \
    --parse-metadata --filter-variant
  primarySpecialist = specialistResult.specialists[0]
  if variantWarning → log warning

  # ─────────────────────────────────────────────────────
  # 3.D: Mark in-progress (TodoWrite)
  # ─────────────────────────────────────────────────────
  TodoWrite.update(stepIndex, "in_progress")

  # ─────────────────────────────────────────────────────
  # 3.E: Generate code
  # ─────────────────────────────────────────────────────
  # Claude generates using:
  # 1. Plan spec (step.description, step.files, step.acceptance)
  # 2. Specialist content (primarySpecialist.content)
  # 3. Specialist metadata (layer, imports, naming)
  # 4. Graph context (codePatterns, dependencies)
  # 5. Boundary enforcement (allowedFiles, allowedMethods)

  # ─────────────────────────────────────────────────────
  # 3.F: Write/Edit code file
  # ─────────────────────────────────────────────────────
  # Validate against boundaries BEFORE writing
  boundaryCheck = orchestrator.checkBoundaries(file, boundaries)
  if NOT allowed → DEVIATION_DETECTED → STOP

  # ─────────────────────────────────────────────────────
  # 3.F2-3.F4: Test Code Generation (Plan-Guided)
  # ─────────────────────────────────────────────────────
  stepTestCases = extractTestCasesFromPlan(planContent, stepIndex)

  if stepTestCases.length == 0:
    log("ℹ️ Step [stepIndex]: No test cases in plan — skipping test generation")
    # → đi thẳng 3.G (checkpoint)

  else:
    # ── 3.F2: Load test specialist ──
    testFilePath = stepTestCases[0].testFile  # Test file path từ plan
    testSpecialist = specialist-load --category testing --source-path testFilePath \
      --parse-metadata --filter-variant

    # ── 3.F3: Generate test code ──
    # Claude viết test code sử dụng 3 nguồn context:
    #
    # Context 1: Implementation code (đã trong context window từ 3.E-3.F)
    # Context 2: Test specialist (từ 3.F2)
    # Context 3: Test cases từ Plan Section 3.1 (step tương ứng)
    #
    # CRITICAL: Chèn Test ID vào mỗi test method:
    #   Java:       @DisplayName("T1.2: Create user with duplicate email")
    #   TypeScript:  it('T1.2: Create user with duplicate email', () => { ... })

    # ── 3.F4: Write test file ──
    testBoundaryCheck = orchestrator.checkBoundaries(testFilePath, boundaries)
    if NOT allowed → DEVIATION_DETECTED → STOP

  # ─────────────────────────────────────────────────────
  # 3.G: Complete checkpoint (Layer 1: design-checkpoint)
  # ─────────────────────────────────────────────────────
  design-checkpoint --action complete --section stepIndex --type execute \
    --file step.files[0] --test-file testFilePath

  # ─────────────────────────────────────────────────────
  # 3.G.5: Skill gate — pattern-analyzer
  # ─────────────────────────────────────────────────────
  design-checkpoint --action skill-gate --skill pattern-analyzer \
    --command execute --result PASS

  # ─────────────────────────────────────────────────────
  # 3.H: Mark complete (TodoWrite)
  # ─────────────────────────────────────────────────────
  TodoWrite.update(stepIndex, "completed")

  # ─────────────────────────────────────────────────────
  # 3.I: Save execution-state.json (Layer 2: resume data)
  # ─────────────────────────────────────────────────────
  saveCheckpoint(stepIndex, "completed", step.summary)
```

### extractTestCasesFromPlan Helper

```pseudo
function extractTestCasesFromPlan(planContent, stepIndex):
  # Parse Section 3.1 trong plan
  # Tìm heading "#### Step [stepIndex] Tests"
  # Parse table rows → array of { testCase, type, expectedBehavior, testFile }
  # Nếu heading = "No test cases" → return []
  return testCases
```

**Plan Boundary Enforcement for Test Files**: Test files MUST be listed in Plan Section 3.3 (Test File Listing) AND Plan Section 0.1 (Files to Modify). If test file path is not in boundaries → DEVIATION_DETECTED.

---

## Step 4: Multi-Sub-Plan — Advance to Next SP

**Skip if monolithic.** Only applies when `PLAN_STRUCTURE == "multi-sub-plan"`.

After all steps in the current SP complete:

```pseudo
if PLAN_STRUCTURE == "multi-sub-plan":
  # Mark current SP as completed
  executionState.subPlanProgress[currentSP].status = "completed"

  # Checkpoint for SP completion (enforcement layer)
  design-checkpoint --action complete --type execute --section spIndex --file spFile

  nextSP = getNextSPInOrder(sub_plan_registry, currentSP)
  if nextSP:
    executionState.currentSubPlan = nextSP
    executionState.subPlanProgress[nextSP].status = "in_progress"
    executionState.lastCompletedStep = 0
    saveExecutionState(stateFilePath, executionState)
    display("✅ " + currentSP + " done → next: " + nextSP)
    display("ℹ️ Run /execute again to continue with " + nextSP)
    # NOTE: For context window management, execution pauses here.
    # User runs /execute again → plan-loading.md resolves next SP → step-runner resumes.
  else:
    executionState.executionComplete = true
    saveExecutionState(stateFilePath, executionState)
    display("✅ All sub-plans completed!")
    # → Continue to finalize.md
```

**Key difference from monolithic**: Multi-sub-plan may pause between SPs (context window management). The checkpoint restore in plan-loading.md handles seamless resume.

---

**NEXT**: Use the **Read tool** to load `commands/execute/finalize.md` and follow its instructions completely.

<!-- Next: execute/finalize.md -->
