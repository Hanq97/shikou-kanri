---
name: confidence-check
description: Pre-implementation confidence assessment (>=90% required). Use before starting any implementation to verify readiness with duplicate check, architecture compliance, official docs verification, OSS references, and root cause identification.
allowed-tools: Read, Bash, Grep, Glob
---

# Confidence Check Skill

## Input

!`node core/cli/ops.js context-detect --raw`

## Purpose

Prevents wrong-direction execution by assessing confidence BEFORE starting implementation.

**Requirement**: >=90% confidence to proceed with implementation.

**Test Results** (2026-03-03):
- Precision: 1.000 (no false positives)
- Recall: 1.000 (no false negatives)
- 8/8 test cases passed

## When to Use

Use this skill BEFORE implementing any task to ensure:
- No duplicate implementations exist
- Architecture compliance verified
- Official documentation reviewed
- Working OSS implementations found
- Root cause properly identified

## Confidence Assessment Criteria

Calculate confidence score (0.0 - 1.0) based on 5 checks:

### 1. No Duplicate Implementations? (25%)

**Check**: Search codebase for existing functionality

```bash
# Use Grep to search for similar functions
# Use Glob to find related modules
```

Pass if no duplicates found
Fail if similar implementation exists

### 2. Architecture Compliance? (25%)

**Check**: Verify tech stack alignment

- Read `CLAUDE.md`, package.json, core configuration
- Confirm existing patterns used
- Avoid reinventing existing solutions
- Verify against `node core/cli/ops.js arch-detect` output

Pass if uses existing tech stack
Fail if introduces new dependencies unnecessarily

### 3. Official Documentation Verified? (20%)

**Check**: Review official docs before implementation

- Use WebFetch for documentation URLs
- Verify API compatibility
- Check EPS Framework design docs

Pass if official docs reviewed
Fail if relying on assumptions

### 4. Working OSS Implementations Referenced? (15%)

**Check**: Find proven implementations

- Use WebSearch if available
- Search for similar patterns in codebase via Grep
- Verify working code samples

Pass if OSS reference found
Fail if no working examples

### 5. Root Cause Identified? (15%)

**Check**: Understand the actual problem

- Analyze error messages
- Check logs and stack traces
- Identify underlying issue

Pass if root cause clear
Fail if symptoms unclear

## Confidence Score Calculation

```
Total = Check1 (25%) + Check2 (25%) + Check3 (20%) + Check4 (15%) + Check5 (15%)

If Total >= 0.90:  Proceed with implementation
If Total >= 0.70:  Present alternatives, ask questions
If Total < 0.70:   STOP - Request more context
```

## Output Format

```
Confidence Checks:
   [PASS] No duplicate implementations found
   [PASS] Uses existing tech stack
   [PASS] Official documentation verified
   [PASS] Working OSS implementation found
   [PASS] Root cause identified

Confidence: 1.00 (100%)
[HIGH CONFIDENCE] Proceeding to implementation
```

## Notes

- This skill does NOT import other skills (NFR-SKEC-02)
- ops.js path is relative to package root: `node core/cli/ops.js`
- Token savings: Spend 100-200 tokens on confidence check to save 5,000-50,000 tokens on wrong-direction work
