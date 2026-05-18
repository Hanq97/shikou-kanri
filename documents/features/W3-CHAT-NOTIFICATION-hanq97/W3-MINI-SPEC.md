# W3 — F4 Chat + Invite + Notification

**Branch**: `feature/w3-chat-notification`
**Mode**: 🟢 Real (khách bấm thật trong demo)
**Effort**: ~5 working days

---

## Scope

| ID | Feature | Mode | Notes |
|---|---|---|---|
| **F4-01** | 案件チャット (per-project) | 🟢 Real | Flat messages (no threading), realtime via Socket.io |
| **F4-02** | ファイル・画像添付 | 🟢 Real | Base64 in DB (like F1 photo pattern); max 5MB for demo |
| **F4-03** | 職人・協力業者招待 | 🟢 Real | Extend existing F8 invite + auto-add to project member |
| **F4-04** | 通知 (in-app) | 🟡 Poll-based (30s) | Bell badge + dropdown, no WebSocket for this in W3 |
| **F4-05** | 未読・既読確認 | 🟢 Real | Per-message read receipt join table |

**Scope cuts (defer)**: threading (reply-to-message), typing indicators, @mentions, Web Push, LINE notification (F6-05 W8).

---

## Schema diff

### 3 new tables

**`chat_messages`**
| Column | Type | Note |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | CASCADE |
| author_id | UUID FK → users | |
| body | TEXT | required |
| attachment_count | INT | default 0 (cached for listing) |
| created_at / updated_at / deleted_at | audit | soft delete |

Indexes: `(project_id, created_at DESC)`

**`chat_attachments`**
| Column | Type | Note |
|---|---|---|
| id | UUID PK | |
| message_id | UUID FK → chat_messages | CASCADE |
| file_name | VARCHAR(255) | original filename |
| mime_type | VARCHAR(100) | image/png, application/pdf, … |
| size_bytes | INT | |
| data_base64 | TEXT | the actual file content base64 |
| created_at | timestamp | |

Indexes: `(message_id)`

**`chat_message_reads`** (read receipts)
| Column | Type | Note |
|---|---|---|
| message_id | UUID FK → chat_messages | CASCADE, composite PK part |
| user_id | UUID FK → users | composite PK part |
| read_at | TIMESTAMPTZ | default now() |

Composite PK `(message_id, user_id)`.

**`notifications`**
| Column | Type | Note |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | recipient |
| kind | NotificationKind enum | |
| title | VARCHAR(200) | |
| body | TEXT NULL | |
| link | VARCHAR(500) NULL | path to navigate on click |
| read_at | TIMESTAMPTZ NULL | |
| created_at | timestamp | |

Indexes: `(user_id, read_at, created_at DESC)`

Enum `NotificationKind`: `chat_mention`, `chat_new_message`, `quote_approval_request`, `aftercare_due`, `project_member_added`, `other`

### Extend Invitation
Add `projectId String? @map("project_id") @db.Uuid` — when set, after accept worker auto-added to project member với role `invited_worker`.

---

## API surface

### Chat (F4-01, F4-02, F4-05) — `/api/v1/projects/:projectId/chat/...`
| Method | Path | Purpose |
|---|---|---|
| GET | `/projects/:id/chat/messages` | List messages (paginated, includes attachments + my read state) |
| POST | `/projects/:id/chat/messages` | Create message (body + optional attachments) |
| DELETE | `/projects/:id/chat/messages/:msgId` | Soft delete (author or admin only) |
| POST | `/projects/:id/chat/messages/:msgId/read` | Mark message read |
| GET | `/projects/:id/chat/unread-count` | My unread count for this project |

### WebSocket — `ws://server/chat` namespace
- Client emits `join` `{ projectId }` after auth
- Server emits `message:new` to room when someone posts
- Server emits `message:read` when read receipt updates

### Notifications (F4-04) — `/api/v1/notifications/...`
| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications` | List my notifications (with unread filter) |
| GET | `/notifications/unread-count` | Bell badge value |
| POST | `/notifications/:id/read` | Mark single read |
| POST | `/notifications/read-all` | Mark all read |

### Invitations (F4-03) — extend existing
| Method | Path | Purpose |
|---|---|---|
| POST | `/projects/:id/invite` | Send project-scoped invite (auto-role=invited_worker) |

Reuse existing `POST /auth/accept-invitation`, modified to: if invitation has projectId → add ProjectMember after user creation.

---

## UI

### Chat (F4-01, F4-02, F4-05)
- Project detail page → new "チャット" tab
- Message list: latest at bottom, scroll up for older
- Message bubble: author avatar + name + body + timestamp + read count
- Composer at bottom: textarea + 📎 attach button + send
- Attached files preview chips (filename + size) before send
- Image attachments inline preview (clickable to full size)
- Non-image: filename link

### Notifications (F4-04)
- Replace existing Bell icon (currently no-op) in `AppLayout` header
- Click → Dropdown panel:
  - Unread count badge on bell (red dot if > 0)
  - List 10 latest notifications
  - Click item → mark read + navigate `link`
  - "Mark all read" button
  - "View all" → `/notifications` (page với full list)

### Invite (F4-03)
- Project detail → 担当者 tab → new "外部招待" button
- Modal: email + name (optional) + role select (invited_worker only for demo)
- Submit → MailHog email with link
- Worker opens link → existing AcceptInvitePage with project context shown

---

## Day breakdown (5 days)

| Day | Task |
|---|---|
| **D1** | Mini-spec + Prisma schema (4 tables + extend Invitation) + migration + seed sample messages |
| **D2** | BE chat module: messages CRUD + attachments + read receipts + RBAC (project member only) + unit tests |
| **D3** | BE notifications + project invite + Socket.io gateway (chat real-time) |
| **D4** | FE chat tab on project detail: message list, composer, attachments, real-time via socket.io-client |
| **D5** | FE notification bell + dropdown + invite worker modal + i18n (ja/en/vi) |
| Buffer | Smoke E2E + roadmap update + commit + push |

---

## Acceptance criteria

- [ ] 2 browser tabs (admin + employee) open same project chat → message in tab 1 appears in tab 2 in <2s
- [ ] Upload PNG image → preview inline in chat
- [ ] Upload PDF → download link works
- [ ] File >5MB rejected with error
- [ ] Read receipt: tab 2 marks read → tab 1 sees "既読 1名" badge
- [ ] Bell badge shows correct unread count (poll every 30s)
- [ ] Click bell notification → navigate to correct page + mark read
- [ ] Invite worker via project → MailHog email → accept → worker can see project in their list
- [ ] Mobile responsive: chat full-width drawer-style
- [ ] All 3 locales translate UI
- [ ] All 90 existing unit tests still pass + new chat tests

---

## Tech decisions

| Concern | Pick | Why |
|---|---|---|
| Realtime | `@nestjs/websockets` + `socket.io` | Battle-tested, room namespaces, Antd-compatible client |
| File storage | Base64 in DB | Consistent with F1 photos; no S3 setup for demo. ⚠ defer S3 to W4 photo work |
| Notification realtime | Poll 30s | WebSocket only for chat to limit complexity |
| Read receipts | Per-message-per-user join | Standard pattern, easy to query |
| Project access control | Reuse existing ProjectMember check | RBAC already implemented in F1 |

**Demo-to-prod gaps** (will add to `DEMO-TO-PROD-MIGRATION.md`):
- Base64 storage doesn't scale → S3 + presigned URLs
- Single-instance Socket.io won't work in multi-instance → Redis adapter
- 5MB attachment limit → 20MB after S3
- Poll-30s notification → Web Push API for mobile

---

**Người viết**: Claude
**Ngày**: 2026-05-19
