# W2 — Phase 1 MVP Completion

**Branch**: `feature/w2-phase1-completion`
**Mode**: Mix (audit + home thật, backup + migration mock UI)
**Effort**: ~5 working days

---

## Scope

| Feature | Mode | Backend | Frontend |
|---|---|---|---|
| **F8-03** 監査ログ | 🟡 **Real** (chỉ viewer thêm) | List endpoint + filters | Page `/admin/audit-logs` |
| **F8-04** バックアップ・リストア | 🔴 **Mock UI** | (mock data trong FE hoặc thin BE endpoint trả static) | Page `/admin/backups` |
| **Migration** CSV import property+引渡日 | 🔴 **Mock UI wizard** | Reuse existing customer CSV import infra cho customer, mock cho property | Page `/admin/migration` |
| **BD-01** Home Dashboard widgets | 🟡 **Real data** | Aggregation endpoint | HomePage real widgets |

---

## F8-03 監査ログ Viewer

### Backend
- New module `backend/src/modules/audit/`
- Controller: `GET /audit-logs` with filters `actorUserId`, `entityType`, `action`, `from`, `to`, `page`, `pageSize`
- Repository wraps existing `audit_logs` table query
- RBAC: `system_admin` only

### Frontend
- Page `/admin/audit-logs` (RoleGuard system_admin)
- ResponsiveTable: 時刻 | 担当者 | アクション | エンティティ | IP | 詳細
- Click row → expand JSON of `changes`
- Filters: date range, action dropdown, search by user name

### Demo-to-prod
- 🟡 Phase 2: async queue (BullMQ) + S3 archival cho data > 1y
- DEMO-TO-PROD entry: add to F8-03 section

---

## F8-04 バックアップ・リストア (Mock UI)

### No backend
- All data hardcoded in FE service file

### Frontend
- Page `/admin/backups` (RoleGuard system_admin)
- Table mock data:
  - 5-10 rows: backup_at (ISO date), type (auto/manual), size (GB), status, retention_days
  - Mix dates 2024-2026
- Button "新規バックアップ" → fake spinner 3s → success message + prepend new row
- Action column: "復元" button → Modal warning → confirm → fake 5s spinner → success/failed alternating

### Demo-to-prod
- 🔴 Entire feature mock — productize = AWS RDS snapshot API + S3 CRR

---

## Migration CSV Import Wizard (Mock UI)

### Backend
- Reuse existing customer CSV import (it works)
- For property+handover_date, we'll mock the response (don't actually parse, just trả canned success)
- OR add real property CSV import — let's check if existing customer import infra cover this

### Frontend
- Page `/admin/migration` (RoleGuard system_admin)
- 3-step wizard:
  1. **Upload CSV**: drag-drop, show preview (5 rows)
  2. **Validate**: fake progress bar (counts rows, mock "X valid, Y invalid")
  3. **Import**: fake progress 3-5s + success summary
- Tab toggle: 顧客CSV (real, reuse existing) | 物件CSV (mock) | 引渡日 (mock)

### Demo-to-prod
- 🔴 Property + 引渡日 CSV parser real implementation
- Update DEMO-TO-PROD entry

---

## BD-01 Home Dashboard Widgets (Real)

### Backend
- New service in dashboard module: `DashboardSummaryService`
- Endpoint `GET /dashboard/summary` returns:
  ```ts
  {
    counts: {
      activeCustomers: number;
      activeProjects: number;
      pendingQuotes: number;
      overdueAftercare: number;
    };
    alerts: {
      aftercareDue14d: Array<{ scheduleId, customerName, scheduledDate, daysUntil }>;
      pendingApprovals: Array<{ quoteId, projectName, customerName, amountTotal }>;
    };
    recentActivity: Array<{
      kind: 'project_created' | 'quote_approved' | 'aftercare_completed' | ...;
      timestamp: ISO;
      summary: string;
      link: string;
    }>;
  }
  ```

### Frontend
- Replace `HomePage` stat cards with real data via `useQuery`
- 4 KPI cards: active customers / active projects / pending quotes / overdue aftercare
- 2 alert panels: 14日点検予定 list + 承認待ち見積 list
- Activity feed: recent 10 actions

---

## Task breakdown (5 days)

| Day | Task | Notes |
|---|---|---|
| **D1** | Mini-spec + F8-03 BE module (controller, service, repo, DTO) | + 2-3 unit tests |
| **D2** | F8-03 FE audit-logs page + i18n | ResponsiveTable + filters |
| **D3** | F8-04 backups + Migration wizard FE (both mock UI) | Pure FE, no BE |
| **D4** | BD-01 BE summary endpoint + service + tests | Aggregates from F1+F2+F6 |
| **D5** | BD-01 FE widgets wire to real data + cleanup HomePage hardcoded values | Replace placeholders, polish |
| **(Buffer)** | Regression test + smoke E2E + commit + push | |

---

## Acceptance criteria

- [ ] F8-03: admin can navigate to /admin/audit-logs, see real login/2FA/customer-change events
- [ ] F8-03: filter by user + date range works
- [ ] F8-04: 5 mock backups visible, "Backup now" button works (fake), "Restore" modal warns
- [ ] Migration: 3-step wizard renders, can upload CSV file (not actually parsed for property), shows fake success
- [ ] BD-01: home shows real counts that change when seed data changes
- [ ] BD-01: aftercare 14d alert pulls from real F6 data
- [ ] All existing tests still pass (90+ unit tests baseline)
- [ ] DEMO-TO-PROD-MIGRATION.md updated with F8-04 + Migration mock entries

---

**Người viết**: Claude
**Ngày**: 2026-05-19
