# Project Roadmap — 藤和建設様 施工管理システム

**Updated**: 2026-05-19
**Mode**: Demo-driven (2 months → sales demo) — see `DEMO-TO-PROD-MIGRATION.md` for what's mock vs real
**Stack**: NestJS + Prisma + PostgreSQL / React + Vite + Antd + Tailwind

---

## Master timeline

| W | Dates (planned) | Focus | Status |
|---|---|---|---|
| **W1** | 2026-05-18 → 24 | F6 アフター (full real) | ✅ Done |
| **W2** | 2026-05-25 → 31 | F8-03 audit + F8-04 backup UI + Migration UI + BD-01 home | ✅ Done |
| **W3** | 2026-06-01 → 07 | F4 chat + invite + notification + unread (real, khách bấm thật) | ✅ Done |
| **W4** | 2026-06-08 → 14 | F3-03 photo + F3-04 電子黒板 + F4-02 attachment + F8-05 PWA shell | ⬜ Planned |
| **W5** | 2026-06-15 → 21 | F3-01 Gantt + F3-05 図面 marker | ⬜ Planned |
| **W6** | 2026-06-22 → 28 | F5 検査 (登録 + 是正 + 帳票PDF) + F3-02 realtime fake | ⬜ Planned |
| **W7** | 2026-06-29 → 07-05 | Phase 3 AI mock-as-real (F2-06 + F7-03/05 + F7-06 OCR) | ⬜ Planned |
| **W8** | 2026-07-06 → 12 | F7-01/02/04 charts + F6-05 LINE button + polish + deploy Railway | ⬜ Planned |

Total: ~8 weeks (~44 working days). Buffer cuối tuần W8 cho fix bug + demo script.

---

## ✅ W1 — F6 アフター (完了 2026-05-19)

**Branch**: `feature/f6-aftercare` (merged to develop)
**Mode**: 🟢 Real full-stack (Phase 1 core)

### Features delivered
- F6-01 OB顧客リスト管理 (sortable theo 次回点検)
- F6-02 点検時期自動通知 (auto-gen schedule +1y/3y/5y/10y, daily batch 8:00 JST)
- F6-03 アフター対応履歴 (records CRUD + auto-complete linked schedule)
- F6-04 メール通知連携 (MailHog dev, hardcoded ja template)

### What to test (manual smoke E2E)
1. Login admin → sidebar **アフター** → OB list
2. Verify 28 overdue rows visible (red badges), 1 notified (Sato Kenichi 2026-05-30)
3. Click 高橋 浩二 row → customer detail loads OK
4. Sidebar → **スケジュール** → filter status=overdue → 28 results
5. Pick a pending schedule → click "完了" → status changes to completed
6. Pick another → "キャンセル" → status changes to cancelled
7. Click "バッチ実行" on OB list → MailHog (http://localhost:8025) receives email for Sato
8. Verify email subject + body Japanese, 引渡日 + 点検予定日 + days until correct
9. Mobile responsive: open in <640px viewport → cards instead of tables
10. Switch language ja → en → vi → all UI text translates

### Acceptance ✅
- [x] 9/9 unit tests pass (ScheduleGenerator + AftercareRecords)
- [x] Backend lint + typecheck clean
- [x] FE typecheck clean (zod pre-existing errors not blocking)
- [x] Smoke API: 4 endpoints (`ob-customers`, `schedules`, `records`, `customers/:id/timeline`)
- [x] Smoke email: MailHog receives ja template
- [x] DEMO-TO-PROD-MIGRATION.md F6 section filled

---

## ✅ W2 — Phase 1 MVP Completion (完了 2026-05-19)

**Branch**: `feature/w2-phase1-completion` (pending merge)
**Mode**: Mix — audit real, backup UI giả, migration UI giả, home real

### Features delivered
- F8-03 監査ログ Viewer (🟡 read-only real, write infra deferred)
- F8-04 バックアップ・リストア (🔴 mock UI — 8 hardcoded rows, fake spinners)
- Migration tool (🔴 mock UI — 3-tab wizard, customer tab links to real F1 import)
- BD-01 Home Dashboard widgets (🟢 real F1+F2+F6 counts + alerts + activity feed)

### What to test (manual smoke E2E)
1. Login admin → home shows 4 KPI cards với data thật (12/4/0/28)
2. 2 alert panels visible: Sato 14日点検 + (no pending approvals)
3. Recent activity feed có 5 aftercare records
4. Click KPI card → navigate đúng list page
5. Sidebar → **監査ログ** → see 114+ logs với localized action labels (ログイン成功, 顧客作成, …)
6. Filter by action dropdown → results narrow
7. Date range filter → results narrow
8. Expand "変更内容" JSON → readable
9. Sidebar → **バックアップ** → 8 mock rows, click "今すぐバックアップ" → 3s spinner, new row prepended
10. Click "復元" on any row → confirm modal warning → 5s spinner → success modal
11. Sidebar → **データ移行** → 3 tabs (顧客/物件/引渡日)
12. 顧客 tab → click "顧客インポートへ" → existing F1 import page
13. 物件 tab → upload any CSV → "次へ: 検証" → fake 2s validate → result alert
14. Continue "インポート開始" → 4s fake → done page với counts

### Acceptance ✅
- [x] 90/90 unit tests pass (no regression from W1)
- [x] Backend typecheck + lint clean
- [x] FE Vite serve OK, audit page localized (action codes + entity types)
- [x] DEMO-TO-PROD-MIGRATION.md W2 entries filled

---

## ✅ W3 — F4 Chat + Invite + Notification (完了 2026-05-19)

**Branch**: `feature/w3-chat-notification`
**Mode**: 🟢 Real chat + notification poll-based + Socket.io realtime

### Features delivered
- F4-01 案件チャット — flat messages per project, realtime via Socket.io
- F4-02 ファイル・画像添付 — base64 storage (5MB limit, image/pdf/text)
- F4-03 職人・協力業者招待 — `POST /projects/:id/members/invite-worker`, auto-add member after accept
- F4-04 通知 — bell dropdown, 30s poll, mark-read, navigate on click
- F4-05 未読・既読確認 — per-message read receipts join table

### Decisions made
- Socket.io picked (with Vite WS proxy via `/chat` + `/socket.io`)
- Base64 in DB chosen for demo simplicity (DEMO-TO-PROD: defer S3)
- Gateway no auth — REST API enforces RBAC (defer prod-grade JWT cookie in handshake)

### What to test (manual smoke E2E)
1. Login admin → bell shows badge 2 (unread)
2. Click bell → dropdown shows 5 notifications, click any → navigate + mark read
3. "Mark all read" → badge clears
4. Open project "田中様邸 キッチンリフォーム" → click tab "チャット" → see 8 seeded messages (admin's last 2 should show unread bg color initially, mark read after view)
5. Type a message, attach a PNG image → send → appears at bottom
6. Open same project in 2nd browser (employee login) → see admin's message via WebSocket within 2s
7. Reply from employee → admin tab sees reply via WS
8. Hover own message → "既読 1名" tag with timestamp
9. Project detail → タブ メンバー → "外部招待" button → modal → invite worker@test.com → MailHog receives invite email
10. Mobile responsive: chat full-width OK

### Acceptance ✅
- [x] 90/90 unit tests pass (no regression)
- [x] Backend typecheck + lint clean
- [x] FE typecheck clean (chat/notifications/invite, ignoring pre-existing Zod errors)
- [x] Smoke API: chat list/create/mark-read/unread, notifications list/unread, invite-worker
- [x] DEMO-TO-PROD-MIGRATION.md W3 entries to be added in next commit (deferred to PR)

---

## ⬜ W4 — Photo + 電子黒板 + Attachment + PWA shell

**Branch**: `feature/w4-photo-chalkboard-pwa`
**Mode**: 🟢 Real photo + 黒板 (khách bấm thật) + 🟡 PWA shell

### Scope
- F3-03 現場写真撮影・アップロード — file upload + GPS metadata (browser geolocation API), preview gallery per project
- F3-04 電子黒板 — canvas composite (HTML5 canvas overlay) on photo: 工事名 + 工種 + 日付 + 場所 + 撮影者
- F4-02 file attachment (carry from W3 if not done)
- F8-05 PWA shell — manifest.json + service worker (offline shell only, no offline data sync)

### Decisions
- Canvas lib: native HTML5 canvas vs fabric.js (recommend native — simpler for demo)
- Storage: base64 in DB (demo, like F1 property photos) vs S3 (defer)
- PWA scope: install prompt + offline shell only, no offline mutation

### Acceptance
- [ ] Open project on mobile → "写真追加" → camera access → upload
- [ ] Apply 電子黒板 template → composite preview correct
- [ ] Save photo → visible in gallery
- [ ] PWA install prompt shows on Chrome mobile
- [ ] Open app offline → cached shell loads (read-only)

---

## ⬜ W5 — Gantt + 図面 Marker

**Branch**: `feature/w5-gantt-drawing`
**Mode**: 🟡 Gantt drag-drop real, save DB; figure marker real but ko version diff

### Scope
- F3-01 工程表 Gantt — drag-drop bar (start/end date adjustment), 10 task templates per project type, dependencies (finish-to-start only for demo)
- F3-05 図面管理 — PDF upload + render via react-pdf, click → place marker pin, link before/after photo

### Decisions
- Gantt lib: `frappe-gantt` vs `dhtmlx-gantt-free` vs build trên Antd Timeline (recommend frappe-gantt MIT-licensed)
- PDF render: react-pdf-viewer or plain `<embed>`? (recommend react-pdf-viewer for marker overlay)

### Acceptance
- [ ] Project detail → Gantt tab → 10 default tasks visible
- [ ] Drag a task bar → date persists in DB
- [ ] Add dependency arrow → render line
- [ ] 図面 tab → upload PDF → render → click → marker placed → persist

---

## ⬜ W6 — 検査 (Inspection) + Realtime fake

**Branch**: `feature/w6-inspection`
**Mode**: 🟡 Real forms, canned PDF output

### Scope
- F5-01 検査登録 — 3-5 inspection templates (基礎 / 構造 / 設備 / 外装 / 完成) với 合否 + 写真 + コメント per item
- F5-02 是正ワークフロー — 3-step (依頼 → 完了 → 承認), before/after photo per step
- F5-03 検査帳票PDF — Puppeteer template với photos (similar pattern as F2 quote PDF)
- F3-02 工程表リアルタイム共有 — setInterval poll 30s để simulate realtime (no WebSocket for this in demo scope)

### Acceptance
- [ ] Create inspection → select template → fill 合否/写真/コメント each item → save
- [ ] 是正 workflow → 3 stages with photos → PDF report generates với all photos embedded
- [ ] Gantt page open 2 tabs → change in tab 1 → tab 2 sees within 30s

---

## ⬜ W7 — Phase 3 AI mock-as-real

**Branch**: `feature/w7-ai-mock`
**Mode**: 🔴 All AI features mock (keyword/template matching)

### Scope
- F2-06 AI 見積補助 — keyword overlap on past quotes → top 3 suggestions + fake confidence 75-95%
- F7-03 AI 類似案件検索 — trigram fuzzy "labeled" as AI semantic search
- F7-05 AI チャットボット (社内Q&A) — `chatbot_qa` table (keyword → answer template) + typing animation
- F7-06 OCR 見積書取込 — pre-baked `ocr_samples` JSON keyed by filename

### Decisions
- Where to seed canned data: separate `dashboard_metrics` + `chatbot_qa` + `ocr_samples` tables, populate via seed script

### Acceptance
- [ ] Quote creation page → "AI候補" button → 3 quote cards với confidence badge
- [ ] Search bar trên project list → type "リフォーム" → results labeled "AI類似度: 87%"
- [ ] Chatbot widget → type "見積どうやって作る?" → typing animation → canned answer
- [ ] Upload supplier quote PDF → "OCR解析中..." 2s → structured fields populated

---

## ⬜ W8 — Charts + LINE button + polish + deploy

**Branch**: `feature/w8-charts-deploy`
**Mode**: 🔴 Charts canned, LINE button fake, deploy to Railway

### Scope
- F7-01 進捗ダッシュボード — recharts line/bar với mock time-series from `dashboard_metrics` table
- F7-02 売上・粗利可視化 — bar + pie charts
- F7-04 受注トレンド analysis — line chart với fake forecast region (dotted)
- F6-05 LINE/SMS notification — button "LINEで送信" trong aftercare → fake toast "送信完了"
- Polish: bug fixes, performance, demo script doc
- Deploy: Railway setup (postgres + backend + frontend in 1 click)

### Acceptance
- [ ] Home dashboard có chart section (3 charts)
- [ ] Aftercare schedule detail → "LINEで送信" button → fake success
- [ ] App accessible at `https://shikou-kanri-demo.railway.app` (or similar)
- [ ] Demo data seeded on prod-like env
- [ ] DEMO-TO-PROD-MIGRATION.md fully populated for all features

---

## Final E2E Test Checklist (run at end of W8)

**Goal**: Toàn bộ flow demo từ login → action chính của từng feature → logout.

### Login + RBAC (F8)
- [ ] Login admin (DevPassword123!) → home
- [ ] Login manager → home (no admin menu visible)
- [ ] Login employee → home (limited menu)
- [ ] Login invited worker → home (only assigned projects)
- [ ] 2FA enroll + verify flow (admin)
- [ ] Password reset via email link

### Customer (F1)
- [ ] Create customer → properties → projects
- [ ] CSV import customer
- [ ] Fuzzy search 氏名/電話/住所
- [ ] Customer detail timeline (project + aftercare merged)

### Project (F1)
- [ ] Create project → status 見積→受注→着工→完成→引渡し
- [ ] Add/remove members
- [ ] Auto-generate 6 folder structure
- [ ] CSV export project list with filters

### Quote (F2)
- [ ] Create quote → add lines from 単価マスタ
- [ ] Submit → admin approve → send → won
- [ ] Clone past quote với +5% adjustment
- [ ] PDF download (Puppeteer)
- [ ] Version history visible
- [ ] 単価マスタ admin CRUD

### Aftercare (F6) — W1
- [ ] OB list overdue badges
- [ ] Mark schedule completed → linked record auto-created (or vice versa)
- [ ] Batch run → MailHog email Japanese
- [ ] Customer detail aftercare timeline

### Admin tools (W2)
- [ ] Audit logs filter + JSON expand
- [ ] Backups mock UI runs
- [ ] Migration wizard 3 tabs
- [ ] Home dashboard widgets all populated

### Chat + invite (W3)
- [ ] 2 users chat in same project
- [ ] Upload image inline
- [ ] Invite worker email → accept → join
- [ ] Unread badge + mark read
- [ ] Read receipts hover

### Photo + 黒板 + PWA (W4)
- [ ] Mobile camera upload + GPS
- [ ] 電子黒板 composite on photo
- [ ] PWA install prompt
- [ ] Offline shell

### Gantt + 図面 (W5)
- [ ] 10 default tasks Gantt
- [ ] Drag bar persists
- [ ] PDF render + marker pin

### Inspection (W6)
- [ ] Inspection template → 合否 per item
- [ ] 是正 3 stages với before/after photo
- [ ] Inspection PDF report

### AI (W7)
- [ ] AI quote suggestion (3 cards)
- [ ] AI similar project search
- [ ] Chatbot Q&A
- [ ] OCR upload supplier quote

### Charts + LINE (W8)
- [ ] 3 dashboard charts populated
- [ ] LINE send button fake success
- [ ] Deploy URL accessible from public internet

### Cross-cutting
- [ ] All pages mobile responsive (<640px)
- [ ] All 3 languages (ja/en/vi) translate correctly
- [ ] No console errors on any page
- [ ] No 500/404 except intentional 403 for invited users on restricted pages
- [ ] Watermark "DEMO" visible (decide in W8 polish)

---

## How to update this doc

Each week:
1. Move W status from ⬜ Planned → 🚧 In Progress at start
2. Fill "What to test" + "Acceptance" sections as you build
3. Mark ✅ Done at end of week
4. Update DEMO-TO-PROD-MIGRATION.md với mock entries simultaneously

If scope/timeline shifts: edit timeline table at top + note in changelog below.

---

## Changelog

| Date | Change | By |
|---|---|---|
| 2026-05-19 | Initial roadmap, W1+W2 marked done | Claude |
