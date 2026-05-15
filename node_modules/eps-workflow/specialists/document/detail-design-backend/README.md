# Backend Detail Design Micro-Agents

**Version**: 1.0.0
**Updated**: 2025-12-03

---

## Overview

Micro-agents cho Backend Detail Design generation. Mỗi agent responsible cho một section cụ thể (single responsibility).

## Frontend-First Requirement

**CRITICAL**: Backend DD micro-agents require Frontend DD to exist first.

Lý do:
- `bdd-01-service-overview.md` reads Frontend DD Section 07 (Server State)
- API endpoints must match Frontend's API requirements

## Agent List

| Agent | Section | Purpose | Lines |
|-------|---------|---------|-------|
| bdd-00-document-info.md | 00 | Document metadata | 40-60 |
| bdd-01-service-overview.md | 01 | Service overview, API summary | 80-120 |
| bdd-02-business-logic.md | 02 | Class/module diagrams | 100-200 |
| bdd-03-api-endpoints.md | 03 | Sequence diagrams, DTOs | 300-600 |
| bdd-04-data-database.md | 04 | Physical ERD | 150-300 |
| bdd-05-integration.md | 05 | External integrations | 100-200 |
| bdd-06-error-handling.md | 06 | Error codes, messages | 100-200 |
| bdd-07-performance.md | 07 | Caching, optimization | 100-200 |
| bdd-08-security.md | 08 | Auth, authorization | 100-200 |
| bdd-09-test-cases.md | 09 | API test scenarios | 150-300 |

## Orchestration

Micro-agents được orchestrated bởi `core/orchestrate/orchestrate-bdd.js`:

```
Step 0: Load Context
  - Read Frontend DD (REQUIRED)
  - Extract Section 07 (API requirements)
  - Read Basic Design
  - Read SRS

C0: bdd-00 → Document Info
C1: bdd-01 → Service Overview (uses FDD Section 07)
C2: bdd-02 → Business Logic
C3: bdd-03 → API Endpoints (CORE - extracts to api-contracts.md)
C4: bdd-04 → Data & Database
C5: bdd-05 → Integration
C6: bdd-06 → Error Handling
C7: bdd-07 → Performance
C8: bdd-08 → Security
C9: bdd-09 → Test Scenarios

Step Final: Extract API Contracts from Section 03
```

## Input Context

Each micro-agent receives:
1. Frontend DD Section 07 (API requirements)
2. Basic Design (service architecture)
3. SRS (business requirements)
4. Previous sections (for cross-reference)

## Checkpoint Validation

Each checkpoint validates:
- Section completeness
- Vietnamese content ratio (≥60%)
- Prohibited content absence (no implementation code)
- API match với Frontend DD Section 07
- ERD consistency (Section 04)

## Output Files

1. `[FEATURE]-[SUB]-backend-detail-design.md` - Full document
2. `[FEATURE]-[SUB]-api-contracts.md` - Extracted from Section 03

## Usage

Micro-agents are invoked automatically via `/design --detail --backend`.

Manual invocation (for debugging):
```bash
cd .claude/utils
node orchestrate/orchestrate-bdd.js --feature LND --status
node orchestrate/orchestrate-bdd.js --feature LND --workflow
node orchestrate/orchestrate-bdd.js --feature LND --section 03
```
