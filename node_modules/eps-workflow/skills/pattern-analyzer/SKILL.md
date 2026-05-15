---
name: pattern-analyzer
description: Analyzes code patterns for conflicts and matches against specialist recommendations. Use during innovate, design, and plan phases to ensure proposed patterns align with project conventions and specialist guidance.
allowed-tools: Read, Bash, Grep, Glob
---

# Pattern Analyzer Skill

## Input

!`node core/cli/ops.js context-detect --raw`

## Purpose

Scans the codebase for existing patterns, compares proposed patterns against specialist recommendations, and reports conflicts or alignment issues. Prevents pattern inconsistency across the project.

## Analysis Commands

```bash
# Query RAG for relevant patterns from EPS knowledge
node core/cli/ops.js rag-query --query "{pattern_topic}" --layer eps

# Query for code patterns
node core/cli/ops.js rag-query --query "{pattern_topic}" --layer code

# Query architecture patterns
node core/cli/ops.js rag-query --query "{pattern_topic}" --layer arch
```

## Analysis Logic

### Step 1: Extract Proposed Patterns

From the current feature context and design artifacts, identify:
- Proposed architectural patterns (e.g., Repository, CQRS, Event Sourcing)
- Proposed code organization patterns (e.g., module structure, naming)
- Proposed data access patterns (e.g., reactive, sync, batch)
- Proposed API patterns (e.g., REST, GraphQL, gRPC)
- Proposed integration patterns (e.g., messaging, direct calls)

### Step 2: Scan Existing Codebase Patterns

Use Grep and Glob to identify established patterns:

```bash
# Find existing service patterns
# Find existing repository patterns
# Find existing controller patterns
# Find existing entity naming conventions
```

For each found pattern, record:
- Pattern type
- File locations using it
- Frequency (how many implementations)
- Variant details (any deviations)

### Step 3: Query Specialist Recommendations

Query the RAG system for specialist guidance:
```bash
node core/cli/ops.js rag-query --query "recommended patterns for {tech_stack} {pattern_type}" --layer eps
```

Parse specialist recommendations for:
- Recommended pattern name
- Specialist domain (e.g., backend-reactive, frontend-nextjs)
- Confidence score from RAG
- Any warnings or anti-patterns to avoid

### Step 4: Conflict Detection

Compare proposed patterns against existing patterns and specialist recommendations:

```
For each proposed_pattern:
    existing_match = find in codebase_patterns
    specialist_rec = find in rag_results

    If proposed != existing AND existing.frequency > 3:
        Conflict: ESTABLISHED_PATTERN_DEVIATION
        Severity: HIGH (many existing uses to migrate)

    If proposed is in specialist.anti_patterns:
        Conflict: ANTI_PATTERN_DETECTED
        Severity: CRITICAL

    If proposed != specialist_rec AND specialist_rec.confidence > 0.8:
        Conflict: SPECIALIST_RECOMMENDATION_DIVERGENCE
        Severity: MEDIUM

    If proposed == existing AND existing == specialist_rec:
        Result: ALIGNED (no conflict)
```

### Step 5: Generate Recommendations

For each conflict:
- Identify the correct pattern to use
- Estimate migration complexity (if existing code needs updating)
- Provide rationale from specialist recommendations

## When to Use

- During `/innovate` — validate proposed alternative patterns
- During `/design` — check design doc patterns against codebase
- During `/plan` — verify implementation approach patterns
- When pattern drift is suspected in design artifacts
- When introducing new frameworks or libraries

## Invocation

```
Analyze patterns for feature: {feature-name}
Proposed patterns: {list of patterns to validate}
Scope: {path or module to scan}
RAG query topic: {specific pattern type}
```

## Output Format

```
Pattern Analysis Report
=======================
Feature    : {feature-name}
Branch     : {branch}
Scope      : {analyzed scope}
Timestamp  : {datetime}

Proposed Patterns ({count}):
  1. {pattern_name} — {pattern_type}
  2. {pattern_name} — {pattern_type}
  ...

Existing Codebase Patterns:
  {pattern_name} : {count} implementations in {module(s)}
  {pattern_name} : {count} implementations in {module(s)}

Specialist Recommendations (RAG):
  {pattern_type}: Use {recommended_pattern} (confidence: {score})
  Source: {specialist_id} — {specialist_name}

Conflict Analysis:
  [CRITICAL] {conflict_description}
             Proposed  : {proposed_pattern}
             Required  : {correct_pattern}
             Reason    : {specialist rationale}
             Impact    : {N} files to update

  [HIGH]     {conflict_description}
             ...

  [MEDIUM]   {conflict_description}
             ...

  [ALIGNED]  {pattern_name} — consistent with codebase and specialists

Summary:
  Total patterns analyzed : {N}
  Conflicts (Critical)    : {count}
  Conflicts (High)        : {count}
  Conflicts (Medium)      : {count}
  Aligned                 : {count}

Overall: [CLEAN | WARN | BLOCKED]

Recommendations:
  1. {highest priority fix}
  2. {secondary fix}
  3. {optional improvements}
```

## Notes

- This skill does NOT import other skills (NFR-SKEC-02)
- Wraps InnovateEnricher pattern logic from core/enrichers/
- ops.js path is relative to package root: `node core/cli/ops.js`
- RAG server must be running for specialist recommendation queries
- Degrades gracefully: if RAG unavailable, uses codebase-only analysis
- Used by /innovate, /design, /plan phases (3 consumers)
- Pattern range reference: Backend 30-41, Frontend 50-63, Infrastructure 70-81
