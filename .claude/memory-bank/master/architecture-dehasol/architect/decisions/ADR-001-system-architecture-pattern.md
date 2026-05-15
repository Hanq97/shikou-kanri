# ADR-001: System Architecture Pattern

## Status
**ACCEPTED** — 2026-05-15

## Context

Hệ thống施工管理 cần phục vụ:
- 50 concurrent users (peak)
- 10K customers / 5K projects / 100K photos scale
- 3 phases (MVP Phase 1 → Phase 2 mobile/chat → Phase 3 AI)
- Team 7 người DEHA
- Single-tenant cho Towa (ADR-012)

Cần chọn pattern hệ thống cốt lõi: monolith / modular monolith / microservices.

## Options

### Option A: Single Monolith (classical layered)
- **Mô tả**: 1 codebase, layer-based (controller → service → repository)
- **Pros**: Đơn giản nhất; deploy 1 unit; debug dễ
- **Cons**: Module coupling dễ phát sinh; khó refactor sau; Phase 3 AI khó tách

### Option B: Modular Monolith (Recommended)
- **Mô tả**: 1 codebase, deploy 1 unit, nhưng có module boundary rõ rệt (Customer / Project / Quote / Photo / Chat / AI). Mỗi module có public API (DTO + service interface), không cross-import internal.
- **Pros**: Giữ simplicity của monolith; sẵn sàng tách microservice khi cần (AI service Phase 3); test dễ; module ownership clear cho team
- **Cons**: Cần discipline với module boundary; cần lint/architecture test
- **Used by**: ANDPAD (built-in modular structure); Shopify (famous "majestic monolith")

### Option C: Microservices từ đầu
- **Mô tả**: Tách từng module thành service riêng (Customer Service, Project Service, AI Service...)
- **Pros**: Scale từng service độc lập; technology heterogeneity
- **Cons**: Operational complexity cao (service mesh, distributed tracing, network failure); overkill cho 50 concurrent users; team 7 người không đủ

## Decision

**Option B — Modular Monolith** với deployment 1 NestJS application.

### Module structure (NestJS):

```
src/
  modules/
    auth/           # F8-01, F8-02
    customer/       # F1-01, F1-02, F1-04
    project/        # F1-03, F1-05, F1-06, F3-06
    quote/          # F2-01 → F2-05
    schedule/       # F3-01, F3-02
    photo/          # F3-03, F3-04 (Phase 2)
    drawing/        # F3-05 (Phase 2)
    chat/           # F4-01 → F4-05 (Phase 2)
    inspection/     # F5-01 → F5-03 (Phase 2)
    aftercare/      # F6-01 → F6-04
    notification/   # F4-04, F6-04 shared
    audit/          # F8-03
    backup/         # F8-04
    dashboard/      # F7-01, F7-02 (Phase 3)
    ai/             # F2-06, F7-03, F7-05, F7-06 (Phase 3, dormant in MVP)
  shared/
    database/
    storage/
    queue/
```

### Rules:
- Module chỉ import từ `shared/` và public API của module khác
- Không cross-module direct repository access
- Architecture test (e.g., `eslint-plugin-boundaries` hoặc `dependency-cruiser`) enforce boundary

## Consequences

### Positive
- Deploy đơn giản (1 NestJS app, 1 RDS, 1 S3 bucket)
- Phase 3 AI module có thể tách microservice nếu workload tăng (queue-based decoupling sẵn)
- Code navigation rõ ràng cho team mới
- Refactor module nội bộ không ảnh hưởng module khác

### Negative
- Cần đầu tư setup architecture test ngay (1-2 ngày)
- Risk: module boundary bị vi phạm nếu không enforce

### Risks & Mitigation
- **R1**: Module boundary thoái hóa → mitigate bằng CI lint check
- **R2**: Phase 3 AI workload spike → mitigate bằng queue-based decoupling; có thể split sau với ít refactor

## References

- Assessment: `architect/assessment.md` Topic 6 (team size + phases)
- Domain KB: §4.2 (Modular monolith với rõ ràng module boundary)
- Related ADRs: ADR-002 (NestJS chọn vì hỗ trợ tốt cho modular pattern)
