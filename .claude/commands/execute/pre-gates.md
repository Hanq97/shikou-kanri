# execute/pre-gates.md — Steps 0.5-0.8: Pre-Execution Gates

Run all pre-execution gates sequentially. If ANY gate fails, STOP.

---

## Step 0.5: Stack Context Loading v5.4

```bash
node core/cli/ops.js stack-load
```

Parse `cache/ops-result.json` → extract `stackKey`, `variantId`, `language`, `framework`.
These values inform specialist resolution and pattern matching throughout execution.

---

## Step 0.6: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Expected state: PLAN_REVIEWED (v7.0: after /plan-review auto-chain)
- If FAIL: STOP — plan must be reviewed before execution
- If PASS: Continue

```pseudo
design-checkpoint --action skill-gate --skill workflow-state-validator --command execute --result {PASS|FAIL}
```

---

## Step 0.7: Quality Gate G0

Invoke the **quality-gate-check** skill with gate G0 (Pre-execution Guard):
- Criteria: Plan exists, confidence ≥90%, plan status = APPROVED
- If FAIL: STOP — display confidence score and required minimum
- If PASS: Continue

```pseudo
design-checkpoint --action skill-gate --skill quality-gate-G0 --command execute --result {PASS|FAIL}
```

---

## Step 0.8: Confidence Check

Invoke the **confidence-check** skill:
- Full 5-point pre-implementation assessment
- Verifies no duplicate components, architecture compliance, valid references
- If confidence < 90%: STOP — display detailed assessment
- If confidence ≥ 90%: Continue

```pseudo
design-checkpoint --action skill-gate --skill confidence-check --command execute --result {PASS|FAIL}
```

---

**NEXT**: Use the **Read tool** to load `commands/execute/plan-loading.md` and follow its instructions completely.

<!-- Next: execute/plan-loading.md -->
