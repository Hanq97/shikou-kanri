# F6 アフター — Mini Spec (Demo-grade)

**Branch**: `feature/f6-aftercare`
**Mode**: Demo-grade (Phase 1 MVP final feature)
**Effort**: ~5 working days (W1 of 2-month pivot)
**Refer**: `documents/architecture/04-database-design.md` §4, F1-CUSTOMER docs for code pattern

---

## 1. Scope

F6 gồm 4 sub-features, làm **full-stack thật** (không mock — đây là Phase 1 core):

| ID | Feature | Mức độ |
|---|---|---|
| **F6-01** | OB顧客リスト管理 | Full |
| **F6-02** | 点検時期自動通知 | Full |
| **F6-03** | アフター対応履歴管理 | Full |
| **F6-04** | メール通知連携 | Full (reuse `notification` module + MailHog dev) |

**Out of scope** (defer to Phase 2/3):
- LINE/SMS (F6-05 — Phase 3)
- Multi-channel preference per user (Phase 2)
- 雨期 skip / region-based scheduling
- Bulk reschedule UI

---

## 2. Domain rules

### 2.1 引渡日 → maintenance schedule

Mỗi `Property` có `handover_date` (đã có trong F1-02). Khi property được tạo/cập nhật `handover_date`:

- Auto-generate **4 schedule entries**: +1 năm, +3 năm, +5 năm, +10 năm
- Status mặc định: `pending`
- Có thể có 1 schedule type "custom" (manual create) — Phase 1 chỉ auto

### 2.2 Lifecycle của schedule

```
pending ──(14日前)──> notified ──(due date passed, no record)──> overdue
   │                      │                      │
   └──────────────(handle done)─────────────────> completed
                                                  ▲
                                                  └── trigger khi tạo AftercareRecord linked
```

### 2.3 Daily batch (cron)

Mỗi ngày 8:00 JST chạy job:

1. SELECT schedules WHERE `scheduled_date BETWEEN today AND today+14 days` AND status='pending'
2. Send email cho assigned employee + customer email (nếu có)
3. UPDATE status='notified', set `notified_at = now()`
4. SELECT schedules WHERE `scheduled_date < today` AND status IN ('pending','notified')
5. UPDATE status='overdue'

**Demo note**: cron là `@nestjs/schedule`. Có CLI command `pnpm cli aftercare:run-batch` để trigger manually trong demo.

---

## 3. Schema (Prisma diff)

### 3.1 Enum mới

```prisma
enum MaintenanceScheduleType {
  one_year       // +1年
  three_year     // +3年
  five_year      // +5年
  ten_year       // +10年
  custom         // manual
}

enum MaintenanceScheduleStatus {
  pending
  notified
  overdue
  completed
  cancelled
}

enum AftercareRecordType {
  inspection       // 点検
  repair           // 修繕
  inquiry          // 問い合わせ
  complaint        // クレーム
  other
}

enum AftercareRecordStatus {
  open
  in_progress
  resolved
  closed
}
```

### 3.2 Bảng `maintenance_schedules`

| Column | Type | Note |
|---|---|---|
| id | UUID PK | uuid v7 |
| property_id | UUID FK → properties | ON DELETE CASCADE |
| schedule_type | MaintenanceScheduleType | |
| scheduled_date | DATE | = handover_date + N years |
| status | MaintenanceScheduleStatus | default `pending` |
| notified_at | TIMESTAMPTZ NULL | |
| completed_at | TIMESTAMPTZ NULL | |
| completed_record_id | UUID FK → aftercare_records NULL | trigger completion |
| notes | TEXT NULL | |
| created_at / updated_at / created_by / updated_by / deleted_at | audit standard | |

**Indexes**:
- `(property_id, scheduled_date)`
- `(status, scheduled_date)` — for batch query
- `(scheduled_date) WHERE deleted_at IS NULL AND status IN ('pending','notified')`

### 3.3 Bảng `aftercare_records`

| Column | Type | Note |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID FK → customers | |
| property_id | UUID FK → properties NULL | optional (some inquiries pre-property) |
| schedule_id | UUID FK → maintenance_schedules NULL | NULL nếu manual |
| record_type | AftercareRecordType | |
| status | AftercareRecordStatus | default `open` |
| occurred_at | DATE | |
| title | VARCHAR(200) | |
| description | TEXT | |
| handled_by | UUID FK → users NULL | assigned staff |
| resolved_at | TIMESTAMPTZ NULL | |
| resolution_notes | TEXT NULL | |
| created_at / updated_at / created_by / updated_by / deleted_at | audit standard | |

**Indexes**:
- `(customer_id, occurred_at DESC)` — for customer history view
- `(property_id, occurred_at DESC)`
- `(status, occurred_at)` — for open-items dashboard

---

## 4. API surface (~9 endpoints)

Base path: `/api/v1/aftercare/...`

### 4.1 OB customer list (F6-01)

| Method | Path | Purpose |
|---|---|---|
| GET | `/aftercare/ob-customers` | List customers có ≥1 property với handover_date (sortable theo next_maintenance_date asc) |

Query params:
- `nextMaintenanceFrom`, `nextMaintenanceTo` — date range
- `overdueOnly` — boolean
- `search` — name fuzzy
- `page`, `pageSize`

Response: `{ items: OBCustomerSummary[], total, page, pageSize }`

```ts
interface OBCustomerSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  propertyCount: number;
  nextMaintenance: { scheduleId: string; date: string; type: ScheduleType; isOverdue: boolean } | null;
  openRecordCount: number;
}
```

### 4.2 Maintenance schedule (F6-02)

| Method | Path | Purpose |
|---|---|---|
| GET | `/aftercare/schedules` | List schedules, filter by property/customer/status/date |
| POST | `/aftercare/schedules/:id/mark-completed` | Mark completed (alternative to auto-trigger via record) |
| POST | `/aftercare/schedules/:id/cancel` | Cancel a schedule |
| POST | `/aftercare/schedules/regenerate-for-property/:propertyId` | Regenerate (when handover_date changes) |
| POST | `/aftercare/batch/run` | Manual trigger daily batch (admin only, for demo) |

### 4.3 Aftercare records (F6-03)

| Method | Path | Purpose |
|---|---|---|
| GET | `/aftercare/records` | List records (filter customer/property/status/type) |
| GET | `/aftercare/records/:id` | Detail |
| POST | `/aftercare/records` | Create record (optionally link schedule_id) |
| PATCH | `/aftercare/records/:id` | Update status/notes/handler |
| DELETE | `/aftercare/records/:id` | Soft delete |
| GET | `/customers/:id/aftercare-timeline` | Combined view: properties + schedules + records (existing F1-04 timeline extended) |

### 4.4 RBAC

- All endpoints require `system_admin | manager | employee`
- Invited users (職人) không access F6
- `POST /batch/run` — chỉ `system_admin`

---

## 5. Email template (F6-04)

File mới: `backend/src/modules/notification/templates/maintenance-reminder.hbs`

Content (Japanese, hardcoded — defer i18n per memory `tech_debt_email_i18n`):

```
件名: 【{{type}}点検のお知らせ】{{customerName}}様 - {{propertyAddress}}

{{customerName}} 様

平素より大変お世話になっております。藤和建設です。

下記物件の{{typeLabel}}点検時期が近づいておりますのでご連絡いたします。

物件: {{propertyAddress}}
引渡日: {{handoverDate}}
点検予定日: {{scheduledDate}} (本日より{{daysUntil}}日後)

ご都合の良い日時をご連絡ください。

藤和建設株式会社
```

**Trigger**: `EmailService.sendMaintenanceReminder({ to, customerName, propertyAddress, ... })` được gọi bởi batch service.

Demo: dùng MailHog (đã cấu hình SMTP 1025/UI 8025).

---

## 6. UI screens (3 màn)

### 6.1 OB Customer List — `/aftercare/ob-customers`

- Header: filters (next maintenance date range, overdue checkbox, search)
- ResponsiveTable:
  - Mobile card: name + phone + next maintenance badge + property count
  - Desktop columns: 氏名 | 電話 | プロパティ数 | 次回点検 (date + type badge + overdue red ring) | 未対応件数 | 操作
- Row click → navigate `/customers/:id` (existing detail) + scroll tới aftercare tab

### 6.2 Maintenance Schedule Calendar/List — `/aftercare/schedules`

- Toggle view: **Calendar** (FullCalendar lib hoặc Antd Calendar) | **List** (Table)
- Filters: status (pending/notified/overdue/completed/cancelled), date range, property type
- Click schedule → modal detail với: property info, customer info, button "Create record" / "Mark completed" / "Cancel"
- Color code: pending=brand, notified=amber, overdue=red, completed=emerald, cancelled=zinc

**Mobile**: chỉ List view (calendar quá chật).

### 6.3 Aftercare History Timeline — embed vào `/customers/:id` (F1-04 timeline mở rộng)

- Existing F1-04 đã có project timeline → thêm aftercare lane
- Card hiển thị: record type icon + title + status pill + date + handled_by avatar
- "+ Add aftercare record" button trên header tab
- Modal form: type, occurred_at, title, description, link to schedule (optional autocomplete), handled_by

### 6.4 Sidebar nav

Thêm 1 item mới vào sidebar (sau "見積", trước "単価マスタ"):
- key: `aftercare`
- icon: `Wrench` từ Lucide (hoặc `Hammer`)
- to: `/aftercare/ob-customers`
- roles: `system_admin | manager | employee`

---

## 7. Demo data (W1 seed)

Mở rộng existing seed:

- 10 customers (Japanese realistic: 田中, 佐藤, 鈴木, 高橋, 渡辺, 伊藤, 山本, 中村, 小林, 加藤)
- 15 properties (Tokyo: 新宿区, 渋谷区, 港区, 世田谷区, 杉並区) với `handover_date` rải từ 2014-2025
- Auto-generated maintenance schedules cho mỗi property → ~60 schedules total
  - Một số đã `completed` (past dates với fake record)
  - Một số `overdue` (past < today, status='overdue')
  - Một số `notified` (scheduled_date trong 14 ngày tới)
  - Một số `pending` (future > 14 ngày)
- 8-12 aftercare records (mix type: 点検, 修繕, 問い合わせ, クレーム; mix status)

Email demo:
- Set 5 customers có `email` field → batch send sẽ tới MailHog

---

## 8. Migration plan (demo → prod) — record trong DEMO-TO-PROD-MIGRATION.md

| Mục | Demo (W1) | Prod-grade upgrade cần làm sau |
|---|---|---|
| Daily batch trigger | `@nestjs/schedule` cron | + retry logic, distributed lock (multi-instance), failure alerting |
| Email send | MailHog dev SMTP | SES production + bounce handling + suppression list |
| Schedule regeneration on property update | Triggered manually via API | Auto on property.handover_date change (DB trigger or service event) |
| Email i18n | Hardcoded ja (per `tech_debt_email_i18n`) | i18n via Handlebars partials |
| Bulk operations | Not in scope | Bulk reschedule UI, bulk cancel |
| LINE/SMS (F6-05) | UI button stub | Real LINE Messaging API + SMS gateway |

---

## 9. Task breakdown (W1 — 5 ngày)

| Day | Task | Notes |
|---|---|---|
| **D1 AM** | Mini-spec review + Prisma schema diff + migration | This doc + 2 entities + 4 enums |
| **D1 PM** | Seed script realistic Japanese data | 10 customers + 15 properties + auto-schedules + records |
| **D2** | BE F6-01 + F6-02: OB list endpoint, schedule CRUD, repository + service + tests | Follow F1 pattern |
| **D3** | BE F6-04 email + batch service + cron + manual trigger CLI | Email template + MailHog test |
| **D4** | BE F6-03 record CRUD + customer timeline extension | + API contracts tests |
| **D5** | FE 3 screens (OB list + Schedule view + Record timeline) + sidebar nav + i18n keys (ja/en/vi) | ResponsiveTable + Antd Calendar |
| **(Buffer)** | Smoke test E2E + DEMO-TO-PROD-MIGRATION.md entry | |

---

## 10. Acceptance criteria (demo-ready)

- [ ] Tạo 1 property mới với handover_date → auto-generate 4 schedules visible trong /aftercare/schedules
- [ ] Manually trigger batch → MailHog nhận email cho schedule trong 14 ngày tới
- [ ] Filter overdue → list đúng các schedule quá hạn
- [ ] Tạo aftercare record link schedule → schedule auto-mark completed
- [ ] Customer detail page hiển thị timeline tổng hợp project + aftercare records
- [ ] Mobile responsive: ResponsiveTable card view ổn trên iPhone width
- [ ] i18n ja/en/vi đều có translation
- [ ] Sidebar nav xuất hiện cho role employee+, ẩn cho invited

---

**Người viết**: Claude
**Ngày**: 2026-05-19
**Status**: Draft — chờ user review trước khi start D1.
