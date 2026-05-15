# Stakeholder Roles Catalog

**Source**: Doc §2.5 + ロール×機能 matrix §04 + ADR-015/016

---

## Internal Roles (4 system roles)

### 1. システム管理者 (System Administrator)
- **Headcount target**: 1-2 (Towa IT staff + DEHA support account)
- **Primary screens**: All; especially S24 ユーザー管理, S26 監査ログ, S15 単価マスタ, S20 アフター通知設定
- **CRUD authority**: Full on all entities
- **Special rules**:
  - 2FA **MANDATORY** (ADR-016)
  - Only role who can hard-delete (with audit log)
  - Only role who can change other users' roles
  - Only role who can run data backup/restore
- **Key features**: F8-01 → F8-04, F1-05, F2-02, F8-03

### 2. 社員 (マネージャー) — Manager-level Employee
- **Headcount target**: 営業マネージャー, 工程管理マネージャー (~3-5 people)
- **Primary screens**: S02 dashboard, S03/04 customer, S06/07 project, S12/13 quote, S19 OB list
- **CRUD authority**: CRUD on customer/project/quote; approve quote (F2-05)
- **Special rules**:
  - Can approve quotes (見積承認 authority per F2-05 ロール マトリクス)
  - Can invite 招待ユーザー (F4-03)
  - Can view dashboard 売上・粗利 (Phase 3 F7-02)
  - 2FA optional but strongly recommended
- **Key features**: All Phase 1 features

### 3. 社員 (一般) — Regular Employee
- **Headcount target**: 営業/積算/現場監督/アフター担当 (~5-10 people)
- **Primary screens**: Same as manager except dashboard 売上タブ + approval
- **CRUD authority**:
  - 顧客/物件: Create + Read + Update (no delete)
  - 案件: Create + Read + Update (no delete)
  - 見積: Create + Read + Update (no approve)
- **Special rules**:
  - Cannot approve quotes (must escalate to manager)
  - Cannot view 売上・粗利 (Phase 3 sensitive data)
  - 2FA optional
- **Key features**: F1, F2 (no approve), F3 (Phase 2), F5 (Phase 2), F6 (limited)

### 4. 招待ユーザー (Invited User — 職人 / 協力業者)
- **Headcount**: dynamic per project; can be 5-30 per active project
- **Primary screens**: S07 project detail (限定 visibility), S08 工程, S09 写真, S10 図面, S11 chat, S17 検査
- **CRUD authority**:
  - Project: Read only (only projects they're invited to)
  - Schedule: Read only
  - Photo: Create + Read on assigned project; no delete
  - Drawing: Read + add marker comment on public folders only
  - Chat: Create + Read on assigned project chat
  - Inspection: Read + complete 是正 reports (own assignments)
- **Special rules**:
  - Authentication via invite link (token-based)
  - Sees ONLY projects they're invited to
  - Folder visibility honors `is_public` flag (F3-06)
  - Cannot see 売上, 単価マスタ, other customers
  - Account can be revoked by inviter or admin
- **Phase**: Active from Phase 2 (because needs F3, F4 features for value)

---

## External Stakeholders (no system login)

### 5. OB顧客 (OB Customer — Towa's customer)
- **Headcount**: ~2,000 (existing OB base) + new
- **Touch points**:
  - **Phase 1**: Email notifications (F6-02 自動点検通知, F6-04 メール通知)
  - **Phase 3**: LINE / SMS notifications (F6-05)
- **No login Phase 1**. Future option: customer self-service portal (out of scope).
- **Data fields system maintains**: 氏名, 連絡先, 住所, 物件(s) with 引渡日, 工事履歴, アフター対応履歴

### 6. 経営層 (Executives — Towa)
- **Headcount**: 2-5 (president, general manager, etc.)
- **System interaction**: Read dashboard primarily
- **Role in system**: Typically 社員(マネージャー) role with read-mostly behavior
- **Phase**: Dashboard meaningful from Phase 3 (F7-01, F7-02)

### 7. 補助金支援機関 / 認定経営革新等支援機関
- **No system role**
- **Touch points**: Receive subsidy compliance evidence (export from system if asked)
- **Phase**: Not user; relevant for compliance documentation (ものづくり補助金)

---

## Role Matrix Quick Reference (from doc §04)

Compact view of CRUD authority. **C**=Create **R**=Read **U**=Update **D**=Delete **—**=No access.

| Feature | システム管理者 | 社員(M) | 社員(一般) | 招待ユーザー |
|---|---|---|---|---|
| F1-01 顧客マスタ | CRUD | RU | R | — |
| F1-03 案件 | CRUD | CRUD | CRU | R (own) |
| F2-01 見積作成 | CRUD | CRUD | CRU | — |
| F2-05 見積承認 | CRUD | CRU | R | — |
| F3-03 写真 (P2) | CRUD | CRUD | CRU | CR |
| F4-01 チャット (P2) | CRUD | CRU | CRU | CR (own project) |
| F5-02 是正 (P2) | CRUD | CRUD | CRU | RU (own assignment) |
| F6-01 OB管理 | CRUD | RU | R | — |
| F7-02 売上 (P3) | R | R | — | — |
| F8-02 ロール管理 | CRUD | R | — | — |
| F8-03 監査ログ | R | — | — | — |

> Full matrix preserved in reference doc §04 ロール×機能.

---

## Permission Implementation Pattern (per ADR-001 + ADR-015)

**Tiered authorization**:
1. **Role-based** (system_admin / manager / employee / invited) — coarse-grained, checked at controller guard
2. **Resource-based** (project membership) — fine-grained, checked at service layer
3. **Folder visibility** (within project) — applied at query level (F3-06 `is_public`)

```typescript
// Example NestJS pattern (illustrative)
@Get(':projectId/photos')
@Roles('system_admin', 'manager', 'employee', 'invited')
@ProjectMembership('projectId')  // custom guard: invited user must be project member
@FolderVisibility('public_only_for_invited')
listPhotos(@Param('projectId') id: string, @CurrentUser() user) { ... }
```

**Audit log entries** (F8-03) for: role assignment changes, permission overrides, sensitive data access (見積承認, 削除, 監査ログ閲覧).
