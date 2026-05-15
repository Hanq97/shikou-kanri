---
name: multi-model-executor
description: Generates alternative designs using Gemini API alongside Claude for multi-model consensus. Use during /innovate phases to produce >=3 alternatives with diverse perspectives. Requires GEMINI_API_KEY or external-apis.json configuration.
allowed-tools: Read, Bash, Grep, Glob
---

# Multi-Model Executor Skill

## Input

!`node core/cli/ops.js context-detect --raw`

## Purpose

Invokes the Gemini API in parallel with Claude to generate diverse design alternatives during the innovate phase. Compares outputs into a structured matrix to support evidence-based alternative selection.

## Prerequisites

Before invoking:
1. Verify Gemini API key is available:
   ```bash
   node core/cli/ops.js gemini-call --check-config
   ```
   - Checks `process.env.GEMINI_API_KEY` and `config/external-apis.json`
   - If unavailable: skill proceeds in degraded mode (Claude-only alternatives)

## Invocation Command

```bash
# Call Gemini with a design prompt
node core/cli/ops.js gemini-call --prompt "{design_prompt}"

# Call with specific context
node core/cli/ops.js gemini-call --prompt "{design_prompt}" --context "{feature_context}"

# Call with model specification
node core/cli/ops.js gemini-call --prompt "{design_prompt}" --model "gemini-2.0-flash"
```

## Execution Process

### Step 1: Prepare Design Prompt

From the injected context (feature name, evidence summary, constraints):
```
Construct prompt:
  "Given the following context: {evidence_summary}
   Generate {N} alternative approaches for: {design_problem}
   Each alternative must include:
   - Approach name and summary
   - Key technical decisions
   - Pros and cons
   - Risk level (Low/Medium/High)
   - Alignment with: {tech_stack}"
```

### Step 2: Execute Gemini Call

```bash
node core/cli/ops.js gemini-call --prompt "{constructed_prompt}"
```

Parse response for:
- Alternative name
- Technical approach
- Pros list
- Cons list
- Risk assessment

### Step 3: Generate Claude Alternative

Independently generate Claude's alternative analysis using the same prompt structure (without calling ops.js — use Claude's native capability).

### Step 4: Build Comparison Matrix

Merge both model outputs:
```
For each alternative (from Gemini + Claude):
    Normalize format: name, approach, pros, cons, risk
    Add model source attribution
    Assign preliminary score based on:
        - Evidence alignment (0-30 points)
        - Tech stack fit (0-25 points)
        - Risk level (0-25 points)
        - Innovation score (0-20 points)
```

### Step 5: Synthesize Recommendation

Identify consensus between models:
```
If both models agree on top alternative:
    Confidence: HIGH
    Recommendation: {agreed_alternative}
Else if partial overlap:
    Confidence: MEDIUM
    Recommendation: {best scored} with noted divergence
Else:
    Confidence: LOW
    Present all alternatives, request human decision
```

## When to Use

- During `/innovate` — primary use case for generating >=3 alternatives
- When a single-model approach produces insufficient diversity
- For high-stakes design decisions requiring multiple perspectives
- When evidence is ambiguous and multiple valid approaches exist

## Degraded Mode (No Gemini)

If Gemini API is unavailable:
- Generate all alternatives using Claude only
- Label alternatives as: Approach A (Conservative), Approach B (Balanced), Approach C (Innovative)
- Note in output that multi-model comparison was not performed
- Still produce comparison matrix format

## Output Format

```
Multi-Model Design Alternatives
================================
Feature    : {feature-name}
Problem    : {design_problem}
Models     : Claude + Gemini ({model_version})
Timestamp  : {datetime}

Alternative Comparison Matrix:
+------------------+-------------------+-------------------+-------------------+
| Criterion        | Alt-1: {name}     | Alt-2: {name}     | Alt-3: {name}     |
+------------------+-------------------+-------------------+-------------------+
| Source Model     | Claude / Gemini   | Claude / Gemini   | Claude / Gemini   |
| Approach         | {summary}         | {summary}         | {summary}         |
| Tech Fit         | {score}/25        | {score}/25        | {score}/25        |
| Evidence Align   | {score}/30        | {score}/30        | {score}/30        |
| Risk Level       | Low/Medium/High   | Low/Medium/High   | Low/Medium/High   |
| Innovation       | {score}/20        | {score}/20        | {score}/20        |
| TOTAL            | {total}/100       | {total}/100       | {total}/100       |
+------------------+-------------------+-------------------+-------------------+

Model Consensus: [HIGH | MEDIUM | LOW | DIVERGENT]

Recommendation:
  Primary  : Alt-{N} — {name} (score: {score}/100)
  Rationale: {evidence-based rationale}
  Rejected : Alt-{M} — {reason} | Alt-{K} — {reason}

Confidence: {percentage}%
Next: Present to /innovate for human approval
```

## Notes

- This skill does NOT import other skills (NFR-SKEC-02)
- Wraps core/gemini/call-gemini.js + multi-model-innovate logic
- ops.js path is relative to package root: `node core/cli/ops.js`
- Used by 3 innovate sub-commands
- API key loaded via GeminiIntegrator.initialize() — checks both env and config file
- Gemini model default: gemini-2.0-flash (configurable in external-apis.json)
