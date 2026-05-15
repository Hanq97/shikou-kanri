# ADR-002: Backend Framework

## Status
**ACCEPTED** — 2026-05-15

## Context

Cần chọn backend framework cho NestJS modular monolith (ADR-001). Doc reference đề xuất "NestJS hoặc FastAPI". Team DEHA primarily TS/Node có khả năng dùng cả 2.

Yêu cầu:
- REST API + WebSocket (Phase 2)
- Module boundary support (ADR-001)
- AI integration qua API call (Phase 3)
- Background jobs (notification, batch aftercare check, OCR async)

## Options

### Option A: NestJS (Node.js + TypeScript) — Chosen
- **Pros**:
  - Unified language với FE React/TS — giảm context switching cho dev
  - Native module structure (NestJS modules) align với ADR-001
  - Mature ecosystem: WebSocket (@nestjs/websockets), BullMQ adapter, TypeORM/Prisma
  - DI container giúp module boundary clean
- **Cons**:
  - Single-threaded Node.js — CPU-bound task (PDF rendering) cần worker thread hoặc spawn service
  - AI/ML ecosystem yếu hơn Python (nhưng project AI scope nhẹ, qua API)

### Option B: FastAPI (Python)
- **Pros**: Mạnh AI/ML; async first; pydantic type safety
- **Cons**: Split language với FE; team unified TS đỡ hơn; module structure không native

### Option C: Hybrid (NestJS main + FastAPI for AI)
- **Pros**: Best of both
- **Cons**: 2 deployment, 2 dependency tree; overkill ở MVP

## Decision

**Option A — NestJS** with TypeScript strict mode.

### Stack details:
- **Runtime**: Node.js 20 LTS (or 22 LTS depending on availability time)
- **Framework**: NestJS 10.x
- **ORM**: Prisma (better DX, migration safety) — alternative TypeORM nếu team đã quen
- **Validation**: class-validator + class-transformer (NestJS standard)
- **API style**: REST primarily; WebSocket cho chat + schedule realtime (Phase 2)
- **Background job**: BullMQ + Redis
- **PDF generation**: Puppeteer trong worker process (cho 見積 PDF, 検査 PDF)

## Consequences

### Positive
- Code sharing potential (types DTO) giữa FE/BE qua shared package
- NestJS opinionated → giảm bikeshedding về folder structure
- Strong typing end-to-end

### Negative
- Need worker process pattern cho CPU-heavy task (PDF) → tăng infra complexity nhẹ
- Node.js memory limit cho large file processing (mitigate bằng streaming)

### Future
- Phase 3: nếu AI workload heavy → tách `ai/` module thành FastAPI microservice (queue-based, không change main API contract)

## References

- Assessment Q1.1
- Domain KB §4.2, §4.3
- Related: ADR-001 (Modular Monolith), ADR-003 (Frontend TS)
