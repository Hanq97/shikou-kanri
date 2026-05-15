# Entity Catalog

**Source**: Doc §2 + Domain KB §2 + 26 screens + 関連API list
**Schema convention**: snake_case columns, UUIDv7 PK, `created_at`/`updated_at`/`deleted_at` audit fields (ADR-004)

---

## Phase 1 Entities (MVP)

### 1. `users` (User)
**Module**: auth

| Field | Type | Description |
|---|---|---|
| id | uuid PK | UUIDv7 |
| email | varchar(255) UNIQUE | Login email |
| password_hash | varchar(255) | Argon2id/bcrypt |
| name | varchar(100) | Display name |
| role | enum | system_admin / manager / employee / invited |
| status | enum | active / suspended / pending_invite |
| 2fa_enabled | boolean | TOTP enabled |
| 2fa_secret | varchar(64) encrypted | TOTP secret if enabled |
| auth_provider | enum | local (Phase 1) / google (Phase 2) |
| external_id | varchar(255) NULL | SSO sub claim |
| last_login_at | timestamptz | — |
| created_at / updated_at | timestamptz | — |

Relations: 1:N with `project_members`; 1:N with `audit_logs.actor`

---

### 2. `customers` (顧客)
**Module**: customer

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| customer_type | enum | individual (個人) / corporate (法人) |
| name | varchar(200) | 氏名 / 法人名 |
| name_kana | varchar(200) | フリガナ for search |
| phone | varchar(20) | Normalized |
| email | varchar(255) NULL | — |
| address | text | 住所 |
| is_ob | boolean | OB顧客 flag |
| acquired_at | date | 初回取引日 |
| notes | text | — |
| search_text | tsvector GENERATED | FTS index (ADR-007) |
| audit fields | — | created_at, updated_at, deleted_at, created_by, updated_by |

Relations: 1:N with `properties`, `projects`, `aftercare_records`

Indexes: B-tree(name_kana), GIN(search_text), pg_trgm(name, address) (ADR-007)

---

### 3. `properties` (物件)
**Module**: customer

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| customer_id | uuid FK | — |
| address | text | — |
| property_type | enum | new_construction / remodel / single_family / multi_family / commercial / other |
| structure | enum | wood / steel / rc / other |
| year_built | int | 築年 |
| **handover_date** | date | **引渡日 — triggers maintenance schedule** |
| floor_area_sqm | decimal | 延床面積 |
| photo_urls | text[] | Exterior photos (max 3 per doc F1-02) |
| notes | text | — |
| audit fields | — | — |

Relations: N:1 customer; 1:N projects; 1:N maintenance_schedules

Trigger on insert/update of `handover_date`: regenerate `maintenance_schedules` rows.

---

### 4. `projects` (案件)
**Module**: project

| Field | Type | Description |
|---|---|---|
| id | uuid PK | Used in URLs |
| project_code | varchar(20) UNIQUE | Auto-numbered for human ref (e.g., `2026-0001`) |
| customer_id | uuid FK | — |
| property_id | uuid FK NULL | NULL if pre-acquisition (用地仕入れ) |
| project_type | enum | new_construction / remodel / repair / aftercare |
| status | enum | quoting / received / construction / completed / handed_over / cancelled |
| name | varchar(200) | 案件名 |
| description | text | — |
| owner_user_id | uuid FK | Primary 営業 |
| schedule_start | date NULL | Planned start |
| schedule_end | date NULL | Planned end |
| actual_start | date NULL | — |
| actual_end | date NULL | — |
| amount_total | decimal(15,0) NULL | 受注額 (set when status=received) |
| search_text | tsvector GENERATED | — |
| audit fields | — | — |

Relations: N:1 customer; N:1 property; 1:N quotes; 1:N project_members; 1:N audit_logs; 1:N folders

Indexes: B-tree(status, schedule_start), B-tree(customer_id, created_at desc), GIN(search_text)

---

### 5. `project_members`
**Module**: project (Junction table)

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| project_id | uuid FK | — |
| user_id | uuid FK | — |
| role_on_project | enum | owner / contributor / inspector / invited_worker |
| folder_access_override | jsonb NULL | Per-folder grants if non-default |
| invited_at | timestamptz | — |
| revoked_at | timestamptz NULL | — |
| UNIQUE(project_id, user_id) | — | — |

---

### 6. `folders` (案件フォルダ)
**Module**: project

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| project_id | uuid FK | — |
| name | varchar(100) | 文書/図面/工程/写真/黒板/検査 (6 default; see ADR + F3-06) |
| folder_type | enum | document / drawing / schedule / photo / chalkboard / inspection / custom |
| is_public_for_invited | boolean | Visibility to 招待ユーザー |
| audit fields | — | — |

Auto-created on `project` insert (trigger or app code).

---

### 7. `unit_prices` (単価マスタ)
**Module**: quote

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| category_l1 | varchar(100) | 大分類 |
| category_l2 | varchar(100) | 中分類 |
| category_l3 | varchar(100) NULL | 小分類 |
| item_name | varchar(200) | 項目名 |
| unit | varchar(20) | 単位 (m, m², 個, 人工, …) |
| unit_price | decimal(15,2) | 単価 |
| effective_from | date | 適用開始日 |
| effective_to | date NULL | 適用終了日 |
| notes | text NULL | — |
| audit fields | — | — |

CSV import target. Versioning: insert new row with new `effective_from`; old row gets `effective_to`.

---

### 8. `quotes` (見積)
**Module**: quote

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| project_id | uuid FK | — |
| quote_number | varchar(20) UNIQUE | Auto-numbered (e.g., `Q-2026-0001`) |
| status | enum | draft / pending_approval / approved / sent / accepted / lost |
| version | int | Increments on each save after finalize |
| issued_at | date | 取引年月日 (for 電帳法) |
| valid_until | date | — |
| amount_subtotal | decimal(15,0) | — |
| amount_tax | decimal(15,0) | — |
| amount_total | decimal(15,0) | 金額 (for 電帳法 search) |
| counter_party_name | varchar(200) | 取引先 (customer name snapshot for 電帳法) |
| approved_by | uuid FK NULL | — |
| approved_at | timestamptz NULL | — |
| pdf_url | text NULL | S3 path of generated PDF |
| cloned_from_quote_id | uuid FK NULL | F2-03 lineage tracking |
| audit fields | — | — |

Indexes: B-tree(project_id), B-tree(issued_at), B-tree(amount_total), pg_trgm(counter_party_name) for 電帳法 search (ADR-017)

---

### 9. `quote_lines` (見積明細)
**Module**: quote

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| quote_id | uuid FK | — |
| line_no | varchar(20) | Display order code (e.g., "01-01-01") |
| sort_order | int | Sortable index |
| unit_price_id | uuid FK NULL | Reference to master (snapshot at quote creation) |
| description | text | 工事内容 |
| quantity | decimal(15,3) | — |
| unit | varchar(20) | — |
| unit_price_snapshot | decimal(15,2) | Captured at line creation (ADR-004 R7) |
| amount | decimal(15,0) | quantity × unit_price (computed or stored) |
| notes | text NULL | — |

---

### 10. `quote_versions` (見積バージョン — 電帳法 compliance)
**Module**: quote

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| quote_id | uuid FK | — |
| version_number | int | — |
| snapshot | jsonb | Full quote+lines at this version |
| change_type | enum | correction / deletion / status_change |
| change_reason | text | Required for 訂正/削除 |
| changed_by | uuid FK | — |
| changed_at | timestamptz | — |

Append-only. Per ADR-017.

---

### 11. `maintenance_schedules` (定期点検)
**Module**: aftercare

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| property_id | uuid FK | — |
| customer_id | uuid FK | Denormalized for query speed |
| milestone | enum | year_1 / year_3 / year_5 / year_10 |
| scheduled_date | date | handover_date + interval |
| pre_notify_date | date | scheduled_date - 14 days |
| status | enum | scheduled / pre_notified / notified / responded / completed / skipped |
| assigned_user_id | uuid FK NULL | — |
| audit fields | — | — |

Indexes: B-tree(scheduled_date), B-tree(pre_notify_date) — for batch query

Generated on `properties.handover_date` insert/update. Batch checks daily.

---

### 12. `aftercare_records` (アフター対応履歴)
**Module**: customer (aftercare submodule)

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| customer_id | uuid FK | — |
| property_id | uuid FK | — |
| maintenance_schedule_id | uuid FK NULL | Link if triggered from schedule |
| occurred_at | date | 対応日 |
| record_type | enum | scheduled_inspection / customer_inquiry / repair / other |
| handler_user_id | uuid FK | — |
| description | text | — |
| outcome | text | 結果 |
| converted_to_project_id | uuid FK NULL | If turned into new project |
| photo_urls | text[] NULL | — |
| audit fields | — | — |

---

### 13. `notifications`
**Module**: notification

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| recipient_user_id | uuid FK NULL | If internal user (NULL for external like OB customer) |
| recipient_external_email | varchar(255) NULL | For OB customer notifications |
| recipient_external_phone | varchar(20) NULL | For Phase 3 SMS |
| channel | enum | email / push / line / sms |
| notification_type | enum | aftercare_pre / aftercare_due / schedule_update / chat_mention / inspection_due / etc |
| subject | varchar(200) | — |
| body | text | — |
| template_id | varchar(100) NULL | Template reference |
| status | enum | queued / sent / failed / opened (when tracking) |
| sent_at | timestamptz NULL | — |
| failed_reason | text NULL | — |
| created_at | timestamptz | — |
| ix(recipient_user_id, created_at) | for inbox query |

---

### 14. `audit_logs`
**Module**: audit

| Field | Type | Description |
|---|---|---|
| id | uuid PK | — |
| actor_user_id | uuid FK | — |
| action | varchar(100) | e.g., "customer.create", "quote.approve" |
| entity_type | varchar(50) | "customer" / "quote" / "user" / etc. |
| entity_id | uuid | — |
| changes | jsonb | { field: { from, to } } |
| ip_address | inet | — |
| user_agent | text | — |
| occurred_at | timestamptz | — |

Append-only. Retention 2 years (per doc) via S3 archive lifecycle when partitioned out.

Indexes: B-tree(actor_user_id, occurred_at), B-tree(entity_type, entity_id, occurred_at), B-tree(occurred_at) for retention sweep

---

## Phase 2 Entities (added later)

- **photos** — Photo metadata (filename, gps, taken_at, project_id, tags, has_chalkboard, exif)
- **drawings** — Drawing files + version history
- **markers** — Drawing markers with comments and before/after photo refs
- **messages** — Chat messages with thread support
- **attachments** — Message attachments
- **message_reads** — Read receipts (per-user per-message)
- **inspections** — Inspection records with template ref
- **inspection_items** — Per-item check result + photos
- **corrections** — 是正 workflow records

## Phase 3 Entities (deferred AI)

- **project_embeddings** (pgvector vector(1536))
- **quote_embeddings**
- **document_chunks** (RAG corpus chunks)
- **ai_call_logs** (cost tracking)

---

## Entity Diagram (high-level ER)

```
                    ┌─────────────┐
                    │  users      │
                    └──┬──────────┘
                       │ project_members
                       │
┌──────────┐  1:N  ┌───┴────────┐  1:N  ┌─────────┐
│ customers│───────│  projects  │───────│ quotes  │──┐
└──┬───────┘       └────┬───────┘       └─────────┘  │ 1:N
   │ 1:N                │ 1:N                         │
┌──▼────────┐    ┌──────▼─────┐                ┌────▼────────┐
│properties │    │  folders   │                │ quote_lines │
└──┬────────┘    └────────────┘                │ quote_version│
   │ 1:N                                       └─────────────┘
┌──▼──────────────────┐
│maintenance_schedules│
└─────────────────────┘
   │ 1:N (when notified)
┌──▼─────────────────┐
│  notifications      │
└────────────────────┘
   ↗ also from chat (P2), inspection (P2), etc.

      ┌──────────────────┐ (cross-cutting)
      │   audit_logs     │←── actor=users, target=any entity
      └──────────────────┘
```
