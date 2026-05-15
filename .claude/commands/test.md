# /test Command — EPS Test Framework

Parse sub-commands and dispatch to test pipeline actions.

## Usage

```bash
/test scan --module <moduleId>         # Analyze module source code
/test generate --module <moduleId>     # Generate test plan + test code
/test validate --module <moduleId>     # Compile + run + coverage
/test run                              # Run tests (plan-aware, post-validate)
/test scan --all                       # Scan all registered modules
```

## Flags

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--module` | Yes* | - | Module ID (e.g., cmn001000, CST) |
| `--all` | No | false | Scan all registered modules |
| `--level` | No | all | Test level filter: unit, integration, e2e |
| `--compile-only` | No | false | Only compile, don't run tests |
| `--skip-validation` | No | false | Skip validation stage |
| `--plan-only` | No | false | Stop after plan generation |

*`--module` is required unless `--all` is specified.

## Step 1: Parse Arguments

Extract sub-command and flags from user input:

```javascript
const args = process.argv.slice(2);
const subCommand = args[0]; // scan | generate | validate | run
const flags = {};
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--module' && args[i+1]) { flags.module = args[++i]; }
  else if (args[i] === '--all') { flags.all = true; }
  else if (args[i] === '--level' && args[i+1]) { flags.level = args[++i]; }
  else if (args[i] === '--compile-only') { flags.compileOnly = true; }
  else if (args[i] === '--skip-validation') { flags.skipValidation = true; }
  else if (args[i] === '--plan-only') { flags.planOnly = true; }
}
```

## Step 2: Validate

- Sub-command must be: `scan`, `generate`, `validate`, or `run`
- `--module` is REQUIRED for `scan`, `generate`, `validate` (unless `--all` is specified)
- `--module` is OPTIONAL for `run` (auto-detect from active context)
- If invalid, display usage and stop

```
❌ Invalid sub-command: [input]
Valid: scan, generate, validate, run

Usage: /test <sub-command> --module <moduleId>
       /test run
```

## Step 3: Dispatch via Command Router

```javascript
const { routeCommand } = require('./core/etf/command-router.js');
const result = await routeCommand({
  command: 'test',
  sub: subCommand,
  flags,
});
```

Route to ops.js action:
- `scan` → `test-scan` action
- `generate` → `test-generate` action
- `validate` → `test-validate` action
- `run` → inline 6-phase flow (does NOT go through ETF command-router)

### `/test run` — Plan-Aware Test Execution (6-Phase Flow)

```pseudo
if subCommand == "run":
  # ═══════════════════════════════════════════════════════════════
  # PHASE 1: Load Plan + Test Context
  # ═══════════════════════════════════════════════════════════════

  # 1.1: Find active context
  contextDir = findActiveContext()  # state-manager.js
  if NOT contextDir:
    error("No active context. Run /plan and /execute first.")

  # 1.2: Load Plan Section 3 (Test Plan)
  planFile = findPlanFile(contextDir)  # ls -t plans/*-implementation-plan.md
  planContent = readFile(planFile)
  testPlan = extractSection3(planContent)  # Parse Section 3.1 + 3.2 + 3.3

  if NOT testPlan OR testPlan.totalCases == 0:
    error("Plan has no Test Plan section. Re-run /plan to generate test cases.")

  # 1.3: Verify test files exist
  testFiles = testPlan.fileList  # từ Section 3.3
  missingTestFiles = testFiles.filter(f => !fileExists(f))
  if missingTestFiles.length > 0:
    warn("Missing test files: " + missingTestFiles.join(", "))
    warn("These test cases will be marked MISSING in report.")

  # ═══════════════════════════════════════════════════════════════
  # PHASE 2: Compile + Run Tests (reuse ETF test-validator.js)
  # ═══════════════════════════════════════════════════════════════

  # 2.1: Detect stack (Java / TypeScript / both)
  testStacks = detectTestStacks(testFiles)

  # 2.2: Run tests per stack
  results = {}
  for stack in testStacks:
    if stack == "java":
      validator = TestValidator({ stack: "java", testFiles: javaTestFiles })
      results.java = validator.run()
    if stack == "typescript":
      validator = TestValidator({ stack: "typescript", testFiles: tsTestFiles })
      results.typescript = validator.run()

  # ═══════════════════════════════════════════════════════════════
  # PHASE 3: Per-Case Mapping (plan comparison)
  # ═══════════════════════════════════════════════════════════════

  # 3.1: Parse test results
  # Java: parse JUnit XML (target/surefire-reports/*.xml)
  # TypeScript: parse Vitest JSON (coverage/test-results.json)
  executedTests = parseTestResults(results)

  # 3.2: Map results → Plan test cases
  caseMapping = []
  for planCase in testPlan.allCases:  # từ Section 3.1, tất cả steps
    matchedResult = findMatchingResult(executedTests, planCase)
    # Match by Test ID: tìm "T1.2" trong test method displayName/name
    # Java:       @DisplayName("T1.2: ...") → parse XML displayName
    # TypeScript:  it('T1.2: ...') → parse JSON test name
    # Fallback: match bằng test file + keyword nếu không tìm thấy Test ID

    if matchedResult:
      caseMapping.push({
        planCase: planCase.name, type: planCase.type, step: planCase.stepIndex,
        status: matchedResult.status, duration: matchedResult.duration,
        error: matchedResult.error || null
      })
    else:
      caseMapping.push({
        planCase: planCase.name, type: planCase.type, step: planCase.stepIndex,
        status: "MISSING", duration: null, error: "Test case not implemented"
      })

  # ═══════════════════════════════════════════════════════════════
  # PHASE 4: T-COV + T-QUAL (moved from validate)
  # ═══════════════════════════════════════════════════════════════

  # 4.1: Coverage Report (T-COV)
  coverageResult = invoke coverage-reporter
  # → { line: 78%, branch: 65%, method: 82% }

  # 4.2: Test Quality Analysis (T-QUAL)
  qualityResult = invoke test-analyzer
  # → { qualityScore: 85, smells: [...], namingCompliance: 90% }

  # ═══════════════════════════════════════════════════════════════
  # PHASE 5: Report
  # ═══════════════════════════════════════════════════════════════

  # 5.1: Per-Case Report
  display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  display("📊 TEST RUN REPORT")
  display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  display("| # | Step | Test Case | Type | Status | Duration |")
  display("|---|------|-----------|------|--------|----------|")
  for case in caseMapping:
    statusIcon = case.status == "PASSED" ? "✅" : case.status == "FAILED" ? "❌" : "⚠️"
    display(f"| {index} | {case.step} | {case.planCase} | {case.type} | {statusIcon} {case.status} | {case.duration} |")

  # 5.2: Summary + Coverage + Quality tables
  passed = caseMapping.filter(c => c.status == "PASSED").length
  failed = caseMapping.filter(c => c.status == "FAILED").length
  missing = caseMapping.filter(c => c.status == "MISSING").length
  total = caseMapping.length

  # 5.3: Overall Result
  overallPass = failed == 0 AND missing == 0 AND coverageResult.line >= target
  display(f"### Overall: {overallPass ? '✅ PASS' : '❌ FAIL'}")

  # 5.4: Save report to context directory
  reportPath = f"{contextDir}/test-run-report.md"
  writeFile(reportPath, reportContent)
  display(f"📄 Full report: {reportPath}")

  # ═══════════════════════════════════════════════════════════════
  # PHASE 6: State Update
  # ═══════════════════════════════════════════════════════════════

  # 6.1: Ghi test results vào execution-state.json
  execState.testRun = {
    timestamp: now(),
    overallResult: overallPass ? "PASS" : "FAIL",
    passed: passed, failed: failed, missing: missing, total: total,
    coverage: { line: coverageResult.line, branch: coverageResult.branch },
    qualityScore: qualityResult.qualityScore,
    reportPath: reportPath
  }
  writeFile(execStatePath, execState)

  # 6.2: State transition: VALIDATED → TESTED (state-manager.js: test → TESTED)
  node core/state/state-manager.js update TESTED
  display("State: TESTED")
```

### Standalone vs Workflow Pathway

```
Standalone: /test scan → /test generate → /test validate (ETF pipeline, module-based)
Workflow:   /plan → /execute → /validate → /test run (plan-aware, context-based)
```

`/test run` does NOT go through the ETF command-router. It runs inline with plan context.
The standalone pipeline (`scan`, `generate`, `validate`) remains unchanged.

## Step 4: Display Report

```javascript
const { generateReport } = require('./core/etf/report-generator.js');
const report = generateReport('test', subCommand, moduleContext, result);
console.log(report.inline);
```

Display inline summary in conversation. Full report saved to file.

## Step 5: Post-Test Analysis

### Coverage Report

After tests complete, invoke the **coverage-reporter** skill:
- Parse coverage output (JaCoCo XML for Java, Istanbul JSON for JS/TS)
- Generate coverage dashboard with line/branch/method percentages
- Compare against project threshold (default 80%)
- Output: Coverage report

### Test Quality Analysis

Invoke the **test-analyzer** skill:
- Analyze test files for quality patterns
- Flag test smells (empty tests, no assertions, complex setup)
- Report test naming conventions compliance
- Output: Test quality report

---

## RETURN

Test run complete. Control returns to the calling router (if auto-chained from `/execute`).
If invoked standalone, pipeline ends here.

<!-- RETURN to execute.md — pipeline complete -->
