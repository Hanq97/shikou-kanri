# ADR-011: Offline Strategy

## Status
**ACCEPTED** — 2026-05-15 (Implementation Phase 2)

## Context

Hiện trường có spotty internet (山間部, 地下, remote sites). Photo upload là use case quan trọng nhất phải offline-tolerant per Q3.2 user decision.

Other potential offline cases (rejected from scope):
- ❌ Browse case offline
- ❌ Edit schedule offline
- ❌ Full case data sync

## Options

### Option A: Minimal — Photo capture + queue → sync (Chosen)
- **Scope**: Chỉ photo upload offline-capable
- **Effort**: ~1 sprint within Phase 2

### Option B: Read-mostly — Photo + cached browse
- **Scope**: Cache 1 active case (schedule, drawings, photos) for offline view
- **Effort**: +1-2 sprint

### Option C: Full offline + conflict resolution
- **Scope**: Edit anywhere, sync with merge
- **Effort**: +3-4 sprint, complex testing

## Decision

**Option A — Minimal photo queue with background sync**.

### Implementation

**Storage layer**:
- IndexedDB queue: `photoUploadQueue` store
  - Schema: `{id, blob, metadata: {projectId, takenAt, gps, tags}, attempts, lastError, status}`
- File blob persisted in IDB
- Quota: target ≤2GB IDB usage (most devices give 50% of storage)

**Sync mechanism**:
- Service Worker registers Background Sync event `photo-upload-sync`
- Online detection via `navigator.onLine` + connection event
- Upload retry: exponential backoff (1m, 5m, 30m, 2h, 12h, fail)
- After 6 failures → flag for user manual intervention

**UI states**:
- Per-photo: queued / uploading / synced / failed
- Indicator on photo grid + per-case
- Manual "retry all" action

**Conflict handling**: Photos are append-only — no conflict possible (each photo is unique).

### Edge cases handled
- HEIC iOS photo → transcoded by server (ADR-006), not client (saves battery)
- GPS unavailable offline → mark as null, OK
- 撮影日時 from EXIF or client clock fallback
- Storage full → reject new capture với clear error

### Out-of-scope
- Edit metadata while offline (allowed only after upload synced)
- 電子黒板 composition offline — needs case data; degrade to "ad hoc" mode (composite later)
- Chat offline — read-only of cached recent messages, can't send

## Consequences

### Positive
- 90% of field use case (photo capture) works regardless of connection
- Simple to test (single queue, single sync flow)
- No CRDT or conflict resolution complexity

### Negative
- 工程 view requires connection (acceptable per user choice)
- Drawing markup creation requires connection (Phase 2 scope)

### Phase 1 impact
- None — PWA + offline are Phase 2

## References

- Doc §3.2 F3-03
- Domain KB §5.2
- Assessment Q3.2
- Related: ADR-006 (photo storage), ADR-010 (PWA)
