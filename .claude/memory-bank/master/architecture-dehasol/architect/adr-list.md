# ADR Index — 藤和建設様 施工管理システム

**Generated**: 2026-05-15
**Total ADRs**: 21

| ADR | Title | Status | Phase |
|---|---|---|---|
| [ADR-001](decisions/ADR-001-system-architecture-pattern.md) | System Architecture Pattern | Accepted | All |
| [ADR-002](decisions/ADR-002-backend-framework.md) | Backend Framework | Accepted | All |
| [ADR-003](decisions/ADR-003-frontend-framework.md) | Frontend Framework | Accepted | All |
| [ADR-004](decisions/ADR-004-database.md) | Database | Accepted | All (pgvector P3) |
| [ADR-005](decisions/ADR-005-cloud-platform.md) | Cloud Platform | Accepted | All |
| [ADR-006](decisions/ADR-006-object-storage.md) | Object Storage | Accepted | All |
| [ADR-007](decisions/ADR-007-search-strategy.md) | Full-text Search Strategy | Accepted | P1→P2 |
| [ADR-008](decisions/ADR-008-realtime-communication.md) | Real-time Communication | Accepted | Phase 2 |
| [ADR-009](decisions/ADR-009-cicd-platform.md) | CI/CD Platform | Accepted | All |
| [ADR-010](decisions/ADR-010-mobile-platform.md) | Mobile Platform | Accepted | Phase 2 |
| [ADR-011](decisions/ADR-011-offline-strategy.md) | Offline Strategy | Accepted | Phase 2 |
| [ADR-012](decisions/ADR-012-tenancy-model.md) | Tenancy Model | Accepted | All |
| [ADR-013](decisions/ADR-013-dr-strategy.md) | Disaster Recovery Strategy | Accepted | All |
| [ADR-014](decisions/ADR-014-deployment-ownership.md) | Deployment Ownership | Accepted | All |
| [ADR-015](decisions/ADR-015-identity-provider.md) | Identity Provider | Accepted | P1→P2 |
| [ADR-016](decisions/ADR-016-2fa-policy.md) | 2FA Policy | Accepted | All |
| [ADR-017](decisions/ADR-017-denkihou-compliance.md) | 電帳法 Compliance Strategy | Accepted | All |
| [ADR-018](decisions/ADR-018-data-migration.md) | Data Migration Strategy | Accepted | All |
| [ADR-019](decisions/ADR-019-llm-hosting.md) | LLM Hosting | Deferred Phase 3 | Phase 3 |
| [ADR-020](decisions/ADR-020-vector-database.md) | Vector Database | Deferred Phase 3 | Phase 3 |
| [ADR-021](decisions/ADR-021-ai-abstraction.md) | AI Abstraction Layer | Deferred Phase 3 | Phase 3 |

**Status Legend**:
- **Accepted**: Decision active, implementation begins per phase
- **Deferred Phase 3**: Decision recorded, revisit + refine when Phase 3 starts

**Dependency Graph**:
- ADR-001 (architecture pattern) is foundation
- ADR-002, 003, 004, 005 are stack core
- ADR-019, 020, 021 depend on ADR-005 (Cloud=AWS)
- ADR-013 (DR), ADR-014 (ownership) depend on ADR-005 (Cloud)
- ADR-007 (Search Phase 2) depends on ADR-005 (OpenSearch=AWS managed)
