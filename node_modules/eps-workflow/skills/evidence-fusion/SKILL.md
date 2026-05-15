---
name: evidence-fusion
description: Merges evidence from multiple sources (research findings, RAG query results, innovate decisions) into a synthesized context. Use during research, innovate, and plan phases to build grounded evidence base.
allowed-tools: Read, Bash, Grep, Glob
---

# Evidence Fusion Skill

## Input

!`node core/cli/ops.js context-detect --raw`

## Purpose

Aggregates evidence from heterogeneous sources into a unified, deduplicated evidence summary. Provides quality scores to ensure the evidence base meets Q1 thresholds before phase progression.

## Evidence Sources

| Source Type     | Location Pattern                                          | Priority |
|-----------------|-----------------------------------------------------------|----------|
| Research docs   | `memory-bank/{branch}/evidence.md` §1                    | High     |
| RAG queries     | `node core/cli/ops.js rag-query --query "..." --layer eps` | High     |
| Innovate decs.  | `memory-bank/{branch}/evidence.md` §2.1-2.3              | Medium   |
| Design summaries| `memory-bank/{branch}/evidence.md` §3.1-3.3              | Medium   |
| Code patterns   | RAG layer `code`                                          | Low      |

## Fusion Process

### Step 1: Load Existing Evidence

Read the active evidence.md from memory-bank:
```bash
# Context from Input section provides memory-bank path
# Read evidence.md sections:
# - §1: Research findings
# - §2.1-2.3: Innovate decisions
# - §3.1-3.3: Design summaries
```

Parse each section to extract:
- Evidence items (E1, E2, ... format)
- Source attribution
- Confidence score (if present)
- Phase where evidence was gathered

### Step 2: RAG Query Enrichment

Query the RAG system for additional context:
```bash
# Query EPS knowledge layer
node core/cli/ops.js rag-query --query "{feature_topic}" --layer eps

# Query architecture layer for design patterns
node core/cli/ops.js rag-query --query "{architecture_aspect}" --layer arch
```

Parse RAG results:
- Extract relevant chunks
- Note similarity scores
- Deduplicate against existing evidence items

### Step 3: Deduplication

Merge evidence items avoiding duplication:
```
For each new_item from RAG results:
    If new_item.content overlaps >= 80% with existing_item:
        Merge: keep higher confidence score
        Add source attribution from both
    Else:
        Add as new evidence item with next available ID
```

### Step 4: Quality Scoring

Calculate evidence quality metrics:
```
Coverage Score = unique_topics_covered / total_requirements_topics
Confidence Score = avg(individual_source_confidence_scores)
Freshness Score = recent_evidence_count / total_evidence_count
Overall Quality = (Coverage * 0.5) + (Confidence * 0.3) + (Freshness * 0.2)
```

## When to Use

- During `/research` — after gathering raw findings, before writing evidence.md
- During `/innovate` — before generating alternatives, to ensure grounded input
- During `/plan` — to verify evidence base supports planned implementation
- When Q1 gate fails — to identify gaps and fill them

## Invocation

```
Fuse evidence for feature: {feature-name}
Sources to include: research, rag-eps, innovate-decisions
Query topic: {specific topic for RAG enrichment}
```

## Output Format

```
Evidence Fusion Summary
=======================
Feature    : {feature-name}
Branch     : {branch}
Sources    : {list of sources processed}

Evidence Items ({total}):
  E1  [{confidence}] {summary} [Source: {source}]
  E2  [{confidence}] {summary} [Source: {source}]
  ...
  EN  [{confidence}] {summary} [Source: {source}]

Deduplications: {count} items merged
RAG Additions : {count} new items from RAG

Quality Scores:
  Coverage   : {score}% ({N} topics covered)
  Confidence : {score}% (avg source confidence)
  Freshness  : {score}% ({N} recent items)
  Overall    : {score}%

Q1 Gate Status: [PASS (>=80%) | FAIL (<80%)]

Gaps Identified:
  - {topic missing evidence}
  - {topic needing more sources}

Recommendations:
  1. {action to fill gaps}
  2. {additional queries to run}
```

## Notes

- This skill does NOT import other skills (NFR-SKEC-02)
- Wraps evidence-aggregator.js logic from core/research/
- ops.js path is relative to package root: `node core/cli/ops.js`
- RAG server must be running at configured endpoint for RAG queries
- If RAG is unavailable, proceeds with local evidence only (degraded mode)
- Used by /research, /innovate, /plan phases (3 consumers)
