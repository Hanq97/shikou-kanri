---
name: design-validator
description: Validates design document output against Q1-Q4 quality criteria. Use after generating SRS/BD/DD sections to verify evidence grounding, ID uniqueness, bilingual ratio, and interface purity.
allowed-tools: Read, Bash, Grep, Glob
---

# Design Validator Skill

## Input

!`node core/cli/ops.js context-detect --raw`

## Purpose

Validates generated design documents (SRS, Basic Design, Detail Design) against the four EPS quality gates. Ensures documents meet standards before progressing to the next phase.

## Quality Gate Definitions

| Gate | Name               | Criterion                                       | Threshold |
|------|--------------------|-------------------------------------------------|-----------|
| `Q1` | Evidence-Based     | Requirements grounded in evidence               | >=80%     |
| `Q2` | ID Uniqueness      | FR/NFR IDs unique, terminology consistent       | 100%      |
| `Q3` | Bilingual Ratio    | Dual language content ratio                     | >=60%     |
| `Q4` | Interface Purity   | Interfaces only, no implementation code         | 100%      |

## Validation Logic

When invoked with a design document path:

1. Read the design document from the given path
2. Run each quality check in sequence
3. Calculate per-gate scores
4. Report aggregate result

### Q1 — Evidence-Based Requirements Check

Scan document for evidence references:
```
- Count total requirements (FR-xxx, NFR-xxx items)
- Count requirements with evidence citations ([Evidence: Exx] or similar markers)
- Score = cited_requirements / total_requirements
- Threshold: >= 0.80
```

Use Grep to find:
- `\[Evidence:` patterns
- `E[0-9]+` references
- `§[0-9]` section references from evidence.md

### Q2 — ID Uniqueness and Terminology Check

Scan document for ID conflicts:
```bash
# Extract all FR/NFR IDs
grep -oE "FR-[A-Z]+-[0-9]+" {document}
grep -oE "NFR-[A-Z]+-[0-9]+" {document}
```

Check:
- No duplicate IDs in same document
- IDs follow naming convention (FR-MODULE-001 format)
- Technical terms used consistently (no synonym mixing)

Score = (total_ids - duplicate_ids) / total_ids

### Q3 — Bilingual Ratio Check

Assess language content balance:
```
- Detect Japanese content (CJK characters in ja range)
- Detect Vietnamese content (diacritics pattern)
- Detect English content (ASCII text blocks)
- Bilingual ratio = (ja_chars + vi_chars) / total_content_chars
- Threshold: >= 0.60 for projects requiring bilingual
```

Note: If project does not require bilingual (check context), Q3 is auto-PASS.

### Q4 — Interface Purity Check

Scan document for implementation leakage:
```bash
# Flag implementation patterns in design docs
grep -n "class.*implements\|new [A-Z].*(\|private.*=.*new\|return.*Repository" {document}
grep -n "\.java\|\.ts\|@Service\|@Repository\|@Component" {document}
```

Design docs MUST contain only:
- Interface definitions (method signatures)
- Data structure schemas
- Sequence/flow descriptions
- No actual code implementations
- No framework-specific annotations embedded in requirements

## When to Use

- After `/design --srs` generates SRS sections
- After `/design --basic` generates Basic Design
- After `/design --detail` generates Detail Design
- As a pre-commit check before saving design artifacts

## Invocation

```
Validate design document at: {document_path}
Run all Q1-Q4 checks.
```

## Output Format

```
Design Document Validation
==========================
Document   : {document_path}
Feature    : {feature-name}
Doc Type   : {SRS | BD | DD}

Quality Gate Results:
  Q1 Evidence-Based : {score}% [{PASS|FAIL|WARN}] ({cited}/{total} requirements cited)
  Q2 ID Uniqueness  : {score}% [{PASS|FAIL}] ({duplicates} duplicates found)
  Q3 Bilingual Ratio: {score}% [{PASS|FAIL|SKIP}] ({ratio} ratio)
  Q4 Interface Purity: {score}% [{PASS|FAIL}] ({violations} violations)

Overall: {PASS | FAIL | WARN}
Gates Passed: {n}/4

Violations:
  Q1: {list of requirements missing evidence}
  Q2: {list of duplicate IDs}
  Q4: {list of implementation leakage lines}

Recommendations:
  1. {action for each failed gate}
```

## Notes

- This skill does NOT import other skills (NFR-SKEC-02)
- ops.js path is relative to package root: `node core/cli/ops.js`
- Used by 4 design sub-commands: srs, basic, detail, and validate phase
- Q3 threshold can be configured per project context
