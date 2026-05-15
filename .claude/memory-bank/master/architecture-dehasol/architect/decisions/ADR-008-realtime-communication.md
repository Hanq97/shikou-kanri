# ADR-008: Real-time Communication

## Status
**ACCEPTED** — 2026-05-15 (Implementation Phase 2)

## Context

Phase 2 features cần realtime:
- F3-02 工程表リアルタイム共有 (schedule updates broadcast)
- F4-01 案件チャット (chat messaging)
- F4-04 通知 (push notification — out-of-band, not realtime per se)

Yêu cầu:
- Bidirectional cho chat
- Server-push cho schedule update
- Scale: 50 concurrent users (low)
- Mobile PWA compatible

## Options

### Option A: WebSocket (native via NestJS @nestjs/websockets) — Chosen
- **Pros**: Bidirectional; mature; mobile PWA OK; NestJS native support
- **Cons**: Connection state management; cần Redis adapter cho horizontal scale

### Option B: Server-Sent Events (SSE)
- **Pros**: Simpler; HTTP-based; auto-reconnect built-in
- **Cons**: Unidirectional (server → client only); chat khó

### Option C: Long polling
- **Pros**: Simplest; firewall friendly
- **Cons**: High overhead; bad for chat UX

### Option D: 3rd party (Pusher / Ably / AWS AppSync)
- **Pros**: Managed; scaling handled
- **Cons**: Vendor lock-in; cost; data leaves AWS for Pusher/Ably; AppSync overkill (GraphQL subscription model)

## Decision

**Option A — WebSocket via @nestjs/websockets** with Socket.IO adapter.

### Stack
- **Server**: NestJS WebSocket gateway với Socket.IO adapter
- **Client**: socket.io-client trong React FE (graceful fallback to polling)
- **Multi-instance scaling**: Redis adapter (`@socket.io/redis-adapter`) — leverages ElastiCache đã có cho BullMQ
- **Authentication**: JWT trong handshake auth payload; validate trên connect
- **Authorization**: room-based — `project:{projectId}` rooms; join when user opens project; permission check on join

### Event types

| Event | Direction | Use case |
|---|---|---|
| `schedule:updated` | S→C | Schedule task changed |
| `chat:message:new` | S→C | New chat message |
| `chat:message:read` | S→C | Read receipt |
| `chat:typing` | C→S→C | Typing indicator |
| `inspection:status` | S→C | Inspection result updated |

### Fallback
- If WebSocket fails → Socket.IO falls back to long polling automatically
- ALB sticky session cho WebSocket (target group stickiness)

### Out-of-band notifications (F4-04)
- **Push to PWA**: Web Push API (VAPID); requires HTTPS + service worker
- **Email**: SES async via BullMQ
- These are NOT via WebSocket — they're for users not currently connected

## Consequences

### Positive
- Low-latency UX for chat
- Schedule sync without polling
- Socket.IO maturity reduces edge-case dev time

### Negative
- ALB sticky session locks user to instance until disconnect — caveat khi rolling deploy (use graceful shutdown)
- Connection count metric needs monitoring (ALB target health based on it)

### Phase 1 implication
- WebSocket infra NOT needed Phase 1; defer setup
- Skeleton interface in NestJS đặt sẵn cho Phase 2 integration

## References

- Doc §3.2 F3-02, F4-01
- Domain KB §6.2
- Related: ADR-005 (ElastiCache), ADR-002 (NestJS)
