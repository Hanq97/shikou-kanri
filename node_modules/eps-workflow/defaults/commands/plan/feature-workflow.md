# plan/feature-workflow.md — Feature Task Entry Point (State Validation + Quality Gate D4)

## Step 1: Validate State Transition

Run state validation:

```bash
node core/state/state-manager.js validate plan
```

**Expected state**: DD_REVIEWED, DD_CREATED, or BD_DD_CREATED (all design documents completed)

**If validation fails**: Display error message and stop.
**If validation passes**: Continue to Step 2.

---

## Step 2: Check Quality Gate D4

Verify all 3 design documents are approved:

```bash
node core/validate/quality-gates.js check D4
```

**Requirements**:
- ✅ SRS ([FEATURE]-BASE-srs.md) exists and approved
- ✅ Basic Design ([FEATURE]-BASE-basic-design.md) exists and approved
- ✅ Detail Design (frontend/backend-detail-design.md + api-contracts.md) exists and approved

**If gate fails**: Display formatted error with document status table.
**If gate passes**: Continue to context loading.

---

**NEXT**: Use the **Read tool** to load `commands/plan/context-loading.md` and follow its instructions completely.

After the micro-command chain completes, control will return to the router for auto-chain.

<!-- Next: plan/context-loading.md → plan/document-loading.md → plan/generation.md → plan/save-and-display.md → RETURN to plan.md -->
