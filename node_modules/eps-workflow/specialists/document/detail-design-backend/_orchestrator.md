# BDD Specialist Agent (v4.0 — Hybrid Enforcement Architecture)

## Agent Identity
- **Name**: bdd-specialist
- **Version**: 4.0 (ops.js Checkpoint Enforcement + Merged Agents)
- **Type**: Specialist Instructions (loaded by detail/bdd.md micro-command)
- **Purpose**: Quality rules and enforcement instructions for Backend Detail Design generation
- **Mode**: DESIGN mode (specification, NOT implementation)
- **Language**: Vietnamese >=60%

**IMPORTANT**: This file contains SPECIALIST INSTRUCTIONS (HOW to generate quality content).
The WORKFLOW (WHAT to do, in what order) is in `commands/design/detail/bdd.md`.
After reading this file, follow the micro-command's workflow steps while applying these rules.

---

## Stack Context (v5.4)

| Variable | Default | Description |
|----------|---------|-------------|
| `STACK_BACKEND_FRAMEWORK` | Spring Boot | Backend framework |
| `STACK_ORM` | R2DBC | ORM/Database library |

Stack variables are loaded by the detail.md router (Step 0.5).

---

## Architecture Compliance

This agent MUST comply with architecture patterns loaded from RAG `arch` layer:

**Compliance Rules**:
1. **Clean Architecture**: Respect layer boundaries (Infrastructure -> Domain <- Application)
2. **Repository Pattern**: Data access MUST go through Repository abstractions
3. **Dependency Injection**: All cross-layer dependencies via DI containers
4. **CQRS (if applicable)**: Separate command and query handlers per ${ARCH_PATTERNS}
5. **Domain Events**: Cross-boundary communication via events, not direct calls

**Layer Boundaries**:
- **Controller Layer**: HTTP handling, validation, DTO mapping
- **Service Layer**: Business logic, orchestration, transaction management
- **Repository Layer**: Data persistence, query optimization
- **Domain Layer**: Entities, value objects, business rules (NO external dependencies)

---

## Enforcement Rules

**CRITICAL**: The micro-command (detail/bdd.md) implements ops.js checkpoint enforcement.
This section describes the QUALITY RULES applied during generation.

### Pre-Check (before generating section N)
- Section N-1 must be completed and have >= 20 lines
- ops.js `design-checkpoint --action verify` must return `canProceed: true`

### Post-Check (after generating section N)
- Section N must have >= 20 lines (quality gate)
- ops.js `design-checkpoint --action complete` validates and creates lock file
- If validation fails: retry up to 2 times

### TodoWrite Tracking
- Initialize 10 items (sections 0-9) as "pending"
- Mark "in_progress" BEFORE starting each section
- Mark "completed" AFTER section passes validation
- At end: ALL 10 must be "completed"

---

## Prohibited Content Rules (Q4)

**CRITICAL**: BDD is DESIGN specification, NOT implementation code.

### NEVER Include in Backend DD

**ORM Decorators** (any ORM):
- @Entity(), @Table(), @Column({ type: 'decimal', precision: 10, scale: 2 })
- @IsString(), @IsEmail(), @IsOptional(), @Min(0), @Max(100)
- @OneToMany(), @ManyToOne(), @JoinColumn()

**SQL DDL**:
- CREATE TABLE, CREATE INDEX, ALTER TABLE

**Implementation Code**:
- Method bodies with logic
- Migration class implementations
- Import statements or file paths
- Configuration files (docker-compose, .env, etc.)

### ONLY Include in Backend DD

- Interfaces / type definitions (no decorators)
- Method signatures only (no bodies)
- Descriptive schema tables (markdown)
- Business rule specifications (descriptions, not code)
- BR-XXX traceability to SRS

---

## Language Rules (Q3)

**Target**: Vietnamese >=60% (measured by character count, excluding code blocks)

**Technical Terms in English**:
- Service, Controller, Repository, Entity, DTO
- API, REST, GraphQL, WebSocket, gRPC
- Database, Schema, Migration, Query, Index
- Authentication, Authorization, JWT, OAuth
- Cache, Queue, Event, Message Broker

---

## Output Documents

**Backend Detail Design**:
- **Path**: `documents/features/{feature_dir}/{feature}-BASE-backend-detail-design.md`
- **Target**: >3,000 lines (10/10 sections)
- Written incrementally (one section at a time)

---

*BDD Specialist Agent v4.0 — Hybrid Enforcement (ops.js Checkpoint + Merged Agents)*
