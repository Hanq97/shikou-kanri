# DESIGN Command - Modular Structure

> **Version**: v3.0 (Micro-Command Architecture)
> **Updated**: 2026-02-26

## Overview

This directory contains the modular implementation of the `/design` command. The router (`design.md`) dispatches to self-contained micro-command workflows via JIT (Just-in-Time) Loading.

## Directory Structure

```
commands/
├── design.md                  # Router (184 lines) - Thin dispatcher
└── design/
    ├── README.md              # This file
    ├── srs.md                 # /design --srs workflow (550 lines)
    ├── basic.md               # /design --basic workflow (620 lines)
    ├── detail.md              # /design --detail workflow (1,048 lines)
    ├── detail-flow.md         # --detail flow visualization (770 lines)
    ├── test.md                # /design --test workflow (703 lines)
    ├── test-flow.md           # --test flow visualization (298 lines)
    └── .backup-legacy/        # Pre-refactor originals (reference only)
        ├── srs.md
        ├── basic.md
        ├── detail.md
        ├── test.md
        └── README.md
```

## Workflow Files

| File | Option | Lines | Micro-Agents | Specialists |
|------|--------|-------|-------------|-------------|
| `srs.md` | `--srs` | 550 | srs-specialist (1) | — |
| `basic.md` | `--basic` | 620 | bd-*-agent (7) | — |
| `detail.md` | `--detail` | 1,048 | FDD (10) + BDD (10) | frontend/backend-design |
| `test.md` | `--test` | 703 | tp-00→09 (10) | 11 test-type specialists |

### Flow Visualizations

| File | For | Content |
|------|-----|---------|
| `detail-flow.md` | `--detail` | Scope detection, FDD/BDD pipeline, A+B+C pattern |
| `test-flow.md` | `--test` | Context levels, enforcement loop, RAG integration map |

## Router Pattern

The main `design.md` (184 lines) acts as a **thin router**:
1. Parses option (`--srs`, `--basic`, `--detail`, `--test`)
2. Validates state transition and quality gates (D1/D2/D3)
3. Dispatches to the relevant workflow file via `Read` tool
4. Each workflow is **self-contained** (Stack Context + BASE + Post-Workflow)

### Context Efficiency
- Router: ~1,200 tokens (vs 6,200+ for monolithic design.md)
- Each workflow loaded only when needed (JIT)

## Agent Specifications

| Document | Master Specialist | Micro-Agents | Location |
|----------|------------------|-------------|----------|
| SRS | `agents/srs-specialist.md` | — | — |
| Basic Design | — | 7 (bd-*-agent.md) | `micro-agents/basic-design/` |
| Detail Design (FDD) | `agents/frontend-design-specialist.md` | 10 (fdd-00→09) | `micro-agents/frontend-dd/` |
| Detail Design (BDD) | `agents/backend-design-specialist.md` | 10 (bdd-00→09) | `micro-agents/backend-dd/` |
| Test Plan | `agents/test-plan-specialist.md` | 10 (tp-00→09) | `micro-agents/test-plan/` |

### Test Plan Specialists (11)

| Category | Specialists | Location |
|----------|------------|----------|
| Java/Spring Boot | tps-java-unit, integration, performance, security | `specialists/java-springboot/test-plan/` |
| Next.js | tps-nextjs-unit, integration, e2e, manual | `specialists/nextjs/test-plan/` |
| Shared | tps-strategy, coverage, execution | `specialists/_shared/test-plan/` |

## Quality Validation

Each workflow includes quality validation:
- **SRS**: Q1-Q4 self-critique, language validator, prohibited content checker
- **Basic Design**: C0-C6 checkpoints with interactive review
- **Detail Design**: G0 Gate (5 conditions), Enforcement Mode, scope-aware (BE/FE/fullstack)
- **Test Plan**: 10-agent enforcement loop, drop-and-summarize, scope-aware specialists

## Backup Legacy

The `.backup-legacy/` directory contains the original workflow files from before the modular refactoring. These are **reference copies only** — not loaded by the router. They document the pre-refactor logic for audit purposes.

## Related Files

| File | Purpose |
|------|---------|
| `core/state/state-manager.js` | State management |
| `core/validate/quality-gates.js` | Gate checking |
| `.claude/config/project-config.json` | Stack configuration |
| `.claude/utils/rag/hipporag-service.js` | RAG adapter (interface contracts) |

---
*EPS Framework v3.2 — Micro-Command Architecture*
