# Glossary — 用語集 — Thuật ngữ dự án 施工管理システム

Mapping JP ↔ EN ↔ VI cho toàn bộ domain terms + code identifiers, để đối chiếu giữa tài liệu (JP/VI) và source code (EN).

**Quy tắc**: Code dùng EN identifiers; docs dùng JP terms (target audience: 藤和建設); commit msg/comment có thể bilingual khi cần.

**Maintenance**: Cập nhật mỗi khi thêm feature mới có domain term riêng.

**Last updated**: 2026-05-17 (F2 SRS draft)

---

## 1. Generic / Cross-cutting

| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| ユーザー | User | Người dùng | `User`, `users` table | |
| 役割 / 権限 | Role / Permission | Vai trò | `role`, `Roles` enum | system_admin / manager / employee / invited |
| 管理者 | Admin | Quản trị viên | `system_admin` | Full system access |
| マネージャー / 責任者 | Manager | Quản lý | `manager` | Approve quotes, manage users |
| 担当者 / 社員 | Employee | Nhân viên | `employee` | Sales staff, create quotes |
| 招待ユーザー / 職人 | Invited worker | Người được mời / Thợ | `invited` | Restricted to assigned projects only |
| ステータス | Status | Trạng thái | `status` field | Always enum-typed |
| 作成日時 | Created at | Ngày tạo | `createdAt` | TIMESTAMP timezone |
| 更新日時 | Updated at | Ngày cập nhật | `updatedAt` | |
| 削除日時 | Deleted at | Ngày xóa | `deletedAt` | Soft delete pattern |
| 監査ログ | Audit log | Nhật ký kiểm toán | `audit_logs` table, `AuditStubService` | Append-only |
| 通知 | Notification | Thông báo | `NotificationModule` | Email + future LINE/SMS |
| 検索 | Search | Tìm kiếm | `search` query param | |
| フィルター | Filter | Bộ lọc | filter params | |
| エクスポート | Export | Xuất | `export` endpoint | CSV/PDF |
| インポート | Import | Nhập | `import` endpoint | CSV upload |

---

## 2. F8 認証 (Authentication)

| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| ログイン | Login | Đăng nhập | `login`, `AuthService.login()` | |
| ログアウト | Logout | Đăng xuất | `logout` | |
| パスワード | Password | Mật khẩu | `password`, `passwordHash` | Argon2id hashed |
| 二要素認証 / 2FA | Two-factor auth / 2FA | Xác thực 2 yếu tố | `twoFa`, `twoFaEnabled` | TOTP via otplib |
| ワンタイムパスワード | OTP / TOTP | Mật khẩu 1 lần | `totp`, `TotpService` | 6-digit, 30s window |
| リカバリーコード | Recovery code | Mã khôi phục | `recoveryCode` | 8 codes per user |
| 招待 | Invitation | Lời mời | `Invitation`, `invitations` table | Email-based |
| パスワードリセット | Password reset | Đặt lại mật khẩu | `PasswordResetToken` | Email link |
| リフレッシュトークン | Refresh token | Token làm mới | `RefreshToken`, `refresh_tokens` table | HttpOnly cookie |
| アクセストークン | Access token | Token truy cập | JWT in HttpOnly cookie | 15min TTL |
| セッション | Session | Phiên đăng nhập | `sessions` (logical, from refresh tokens) | |
| アカウントロック | Account lock | Khóa tài khoản | `lockedUntil`, `requireAdminUnlock` | After failed attempts |
| 強制解除 | Force unlock | Mở khóa cưỡng chế | `unlock` action (admin) | |
| 緊急2FA無効化 | Emergency 2FA disable | Tắt 2FA khẩn cấp | `emergencyDisable2Fa` | Admin-only |

---

## 3. F1 顧客・物件・案件 (Customer / Property / Project)

### 3.1 顧客 (Customer)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 顧客 | Customer | Khách hàng | `Customer`, `customers` table | |
| 個人 | Individual | Cá nhân | `customer_type='individual'` | |
| 法人 | Corporate | Doanh nghiệp | `customer_type='corporate'` | |
| 氏名 | Name | Tên | `name` | |
| フリガナ | Name kana | Tên kana | `name_kana` | Katakana for sort |
| 電話番号 | Phone | Điện thoại | `phone` | Normalized (no dashes) |
| メール | Email | Email | `email` | |
| 住所 | Address | Địa chỉ | `address` | |
| OB顧客 | OB / Returning customer | Khách hàng OB | `is_ob` | "Old Boy" — past customer |
| 新規顧客 | New customer | Khách mới | `is_ob=false` | |
| 獲得日 | Acquired at | Ngày tiếp nhận | `acquired_at` | First contact date |
| 備考 | Notes | Ghi chú | `notes` | |
| 重複検出 | Dedup detection | Phát hiện trùng | `duplicateCheckService` | Phone-based match |

### 3.2 物件 (Property)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 物件 | Property | Bất động sản | `Property`, `properties` table | Building/land owned by customer |
| 新築 | New construction | Xây mới | `property_type='new_construction'` | |
| リフォーム | Remodel | Cải tạo | `property_type='remodel'` | |
| 戸建て | Single family | Nhà riêng | `property_type='single_family'` | |
| マンション | Multi-family / Condo | Chung cư | `property_type='multi_family'` | |
| 商業 | Commercial | Thương mại | `property_type='commercial'` | |
| 木造 | Wood | Gỗ | `structure='wood'` | |
| 鉄骨 | Steel | Thép | `structure='steel'` | |
| 鉄筋コンクリート / RC | Reinforced concrete | Bê tông cốt thép | `structure='rc'` | |
| 築年数 | Year built | Năm xây | `year_built` | |
| 引渡日 | Handover date | Ngày bàn giao | `handover_date` | Required for F1-04 timeline |
| 床面積 | Floor area | Diện tích sàn | `floor_area_sqm` | m² |
| 物件写真 | Property photo | Ảnh BĐS | `photo_urls` | Max 3, ≤150KB each (base64) |

### 3.3 案件 (Project)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 案件 | Project | Dự án | `Project`, `projects` table | Construction project |
| 案件番号 | Project code | Mã dự án | `project_code` | Format `YYYY-NNNN`, sequence per year |
| 案件種別 | Project type | Loại dự án | `project_type` | new_construction/remodel/repair/aftercare |
| 修繕 | Repair | Sửa chữa | `project_type='repair'` | |
| アフターケア | Aftercare | Bảo trì | `project_type='aftercare'` | Post-handover service |
| 見積中 | Quoting | Báo giá | `status='quoting'` | Initial state |
| 受注 | Received / Won | Nhận đơn | `status='received'` | Customer signed |
| 施工中 | Construction | Thi công | `status='construction'` | In progress |
| 完了 | Completed | Hoàn thành | `status='completed'` | Work done |
| 引渡し済 | Handed over | Đã bàn giao | `status='handed_over'` | Final state |
| キャンセル | Cancelled | Đã hủy | `status='cancelled'` | Terminal |
| 担当者 / オーナー | Owner | Chủ dự án | `owner_user_id` | Internal user |
| 予定開始日 / 終了日 | Schedule start/end | Dự kiến bắt đầu/kết thúc | `schedule_start`, `schedule_end` | |
| 実開始日 / 実終了日 | Actual start/end | Thực tế bắt đầu/kết thúc | `actual_start`, `actual_end` | Auto-set on status transitions |
| 受注金額 | Amount total | Tổng giá trị | `amount_total` | JPY, no decimals |
| 土地仕入れ | Pre-acquisition | Gom đất | `preAcquisition` flag | Project before customer determined |
| プレースホルダー | Placeholder | Khách tạm | `findOrCreatePlaceholder()` | TBD customer for pre-acquisition |
| ステータス差戻し | Reverse status | Hoàn trạng thái | `reverseTransition()` | Admin-only, requires reason |

### 3.4 メンバー (Project Members)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| プロジェクトメンバー | Project member | Thành viên dự án | `ProjectMember`, `project_members` table | |
| オーナー | Owner | Chủ dự án | `role_on_project='owner'` | Min 1 per project |
| コントリビューター | Contributor | Cộng tác viên | `role_on_project='contributor'` | |
| 検査担当 | Inspector | Kiểm tra viên | `role_on_project='inspector'` | |
| 招待ワーカー | Invited worker | Thợ được mời | `role_on_project='invited_worker'` | Field worker, restricted |
| メンバー追加 | Add member | Thêm thành viên | `addMember()` | |
| メンバー解除 | Remove member | Bỏ thành viên | `removeMember()` (soft, sets revokedAt) | |
| 役割変更 | Change role | Đổi vai trò | `updateRole()` | Last-owner protection |

### 3.5 フォルダ (Folders)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| フォルダ | Folder | Thư mục | `Folder`, `folders` table | Per-project |
| 文書 | Document | Tài liệu | `folder_type='document'` | |
| 図面 | Drawing | Bản vẽ | `folder_type='drawing'` | |
| 工程 | Schedule | Tiến độ | `folder_type='schedule'` | |
| 写真 | Photo | Ảnh | `folder_type='photo'` | |
| 黒板 | Chalkboard | Bảng đen | `folder_type='chalkboard'` | Field photo annotation |
| 検査 | Inspection | Kiểm tra | `folder_type='inspection'` | |

### 3.6 工事履歴 (Construction history — F1-04)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 工事履歴 | Construction history | Lịch sử thi công | F1-04 timeline tab | All projects for a customer |
| タイムライン | Timeline | Dòng thời gian | `ProjectTimelineTab` component | Antd Timeline |

---

## 4. F2 見積 (Quote — current scope)

### 4.1 Quote core
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 見積 / 見積書 | Quote / Quotation | Báo giá | `Quote`, `quotes` table | |
| 見積番号 | Quote number | Mã báo giá | `quote_number` | Format `Q-YYYY-NNNNN` (5-digit) |
| 取引年月日 | Issued at / Transaction date | Ngày phát hành | `issued_at` | 電帳法 mandatory search key |
| 有効期限 | Valid until | Ngày hết hạn | `valid_until` | |
| 取引先 | Counter party | Bên giao dịch | `counter_party_name` | Snapshot from customer at issue |
| 小計 | Subtotal | Tổng trước thuế | `amount_subtotal` | |
| 消費税 | Consumption tax | Thuế tiêu dùng | `amount_tax` | 10% standard / 8% reduced |
| 合計 / 取引金額 | Total amount | Tổng cộng | `amount_total` | 電帳法 mandatory search key |
| 備考 | Notes | Ghi chú | `notes` | |

### 4.2 Quote status (state machine)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 下書き | Draft | Bản nháp | `status='draft'` | Initial state, editable |
| 提出済 | Submitted | Đã nộp | `status='submitted'` | Awaiting approval |
| 承認待ち (Admin) | Pending admin | Chờ admin | `status='pending_admin'` | >¥10M tier |
| 承認済 | Approved | Đã duyệt | `status='approved'` | Locked |
| 却下 | Rejected | Bị từ chối | `status='rejected'` | Returned for revision |
| 送付済 | Sent | Đã gửi | `status='sent'` | PDF sent to customer |
| 受注 | Won | Trúng thầu | `status='won'` | Customer accepted |
| 失注 | Lost | Mất đơn | `status='lost'` | Customer declined |

### 4.3 Quote lines (明細)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 明細 / 見積項目 | Line item | Hạng mục | `QuoteLine`, `quote_lines` table | Up to ~500 per quote |
| 大分類 | Category | Danh mục lớn | `category` | e.g., 解体工事, 基礎工事 |
| 項目名 | Item name | Tên hạng mục | `item_name` | |
| 仕様 | Specification | Quy cách | `description` | |
| 単位 | Unit | Đơn vị | `unit` | m², kg, 式, 個, セット |
| 数量 | Quantity | Số lượng | `quantity` | DECIMAL(15,2) |
| 単価 | Unit price | Đơn giá | `unit_price` | JPY, no decimals |
| 金額 | Amount | Thành tiền | `amount` | unit_price × quantity (computed) |
| 税率 | Tax rate | Thuế suất | `tax_rate` | 0.10 / 0.08 |
| オプション項目 | Optional item | Hạng mục tùy chọn | `is_optional` | Separate subtotal on PDF |
| 値引き | Discount | Giảm giá | (negative amount line) | |

### 4.4 Quote master data
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 単価マスタ | Unit price master | Bảng giá đơn vị | `UnitPrice`, `unit_prices` table | Reusable line item templates |
| 単価コード | SKU code | Mã sản phẩm | `code` | Internal unique |

### 4.5 Quote versioning (電帳法)
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 版 / バージョン | Version | Phiên bản | `version_no`, `QuoteVersion` | Append-only |
| 版履歴 | Version history | Lịch sử bản | `quote_versions` table | JSONB snapshot per version |
| 訂正 | Correction | Sửa đổi | `change_type='correction'` | Requires change_reason |
| 削除 | Deletion | Xóa | `change_type='deletion'` | Soft delete + version snapshot |
| ステータス変更 | Status change | Đổi trạng thái | `change_type='status_change'` | Auto on transition |
| 変更理由 | Change reason | Lý do thay đổi | `change_reason` | Required ≥5 chars for correction/deletion |
| スナップショット | Snapshot | Ảnh chụp | `snapshot` JSONB | Full quote + lines at version time |

### 4.6 Quote operations
| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| 見積コピー | Clone quote | Sao chép báo giá | `cloneQuote()` | Copy lines, reset status |
| 新規版作成 | Create new version | Tạo phiên bản mới | "Create v2" button | After sent, immutable original |
| PDF出力 | PDF export | Xuất PDF | `generatePdf()` | Synchronous Puppeteer |
| 承認 | Approve | Duyệt | `approve()` | Manager (≤¥10M) or Admin (>¥10M) |
| 却下 | Reject | Từ chối | `reject(reason)` | Returns to editor |

---

## 5. Regulations 法律 (Compliance terms)

| 日本語 | English | Tiếng Việt | Code identifier / Reference | Notes |
|---|---|---|---|---|
| 電子帳簿保存法 / 電帳法 | Electronic Bookkeeping Law | Luật bảo lưu sổ sách điện tử | "denchoho" in comments | Mandatory 2024+ for corporates |
| 真実性 | Authenticity | Tính xác thực | quote_versions append-only | 電帳法 §7 requirement |
| 可視性 | Visibility | Khả năng hiển thị | PDF + screen render | 電帳法 §7 requirement |
| 検索性 | Searchability | Khả năng tìm kiếm | 3 indexes (date/amount/party) | 電帳法 §7 requirement |
| 保存期間 | Retention period | Thời gian lưu trữ | 10yr for quotes | 7yr legal minimum, 10yr practice |
| 消費税法 | Consumption Tax Law | Luật thuế tiêu thụ | `tax_rate` 10%/8% | |
| 適格請求書 / インボイス | Qualified invoice | Hóa đơn đủ điều kiện | `qualified_invoice_number` | Effective 2023.10 |
| 登録番号 | Registration number | Số đăng ký | `qualified_invoice_number` | T-prefix + 13 digits |
| 個人情報保護法 / APPI | Act on Personal Info Protection | Luật bảo vệ TT cá nhân | (cross-cutting) | Customer/user data |
| 瑕疵担保責任 | Defect liability | Trách nhiệm bảo hành | (cross-cutting) | 10yr inspection records |
| 印鑑 / 判子 | Hanko / Stamp | Con dấu | (PDF placeholder MVP) | Traditional seal |
| クラウドサイン | Cloud Sign | Chữ ký điện tử | (out of MVP) | Wan Cloud Sign service |

---

## 6. Common UI / UX

| 日本語 | English | Tiếng Việt | Code identifier | Notes |
|---|---|---|---|---|
| ホーム | Home | Trang chủ | `/home` route | |
| サイドバー | Sidebar | Thanh bên | `AppLayout` aside | Drawer on mobile |
| ヘッダー | Header | Thanh tiêu đề | `AppLayout` header | |
| カンバン | Kanban | Kanban | `KanbanBoard` component | 6 columns drag-drop |
| テーブル | Table | Bảng | Antd Table + ResponsiveTable | Card on mobile |
| モーダル | Modal | Hộp thoại | Antd Modal | Full-width on mobile |
| ドロワー | Drawer | Ngăn kéo | Antd Drawer | Sidebar mobile |
| 保存した検索 | Saved search | Tìm kiếm đã lưu | `SavedSearch` | Per-user filter presets |

---

## 7. Project Modules (technical)

| Module (code) | 日本語 | English | Notes |
|---|---|---|---|
| `auth` | 認証 | Auth | F8 — Login, 2FA, JWT, sessions, invitations, password reset |
| `customer` | 顧客 / 物件 | Customer / Property | F1-01, F1-02 — Customer + Property CRUD |
| `project` | 案件 | Project | F1-03..06 — State machine, members, folders, saved searches, CSV |
| `quote` | 見積 | Quote | F2 — In progress |
| `aftercare` | アフターサービス | Aftercare | F6 — Phase 1 (planned) |
| `notification` | 通知 | Notification | Cross-cutting, email/SMS adapters |
| `audit` | 監査 | Audit | Currently stub in auth module, will graduate to own module |
| `pdf` | PDF生成 | PDF generation | Puppeteer wrapper (in `shared/`) |

---

## 8. Acronyms / Abbreviations

| Acronym | Full | 日本語 | Notes |
|---|---|---|---|
| OB | Old Boy | OB顧客 | Returning customer |
| 2FA | Two-Factor Authentication | 二要素認証 | TOTP via authenticator app |
| TOTP | Time-based One-Time Password | ワンタイムパスワード | RFC 6238 |
| FR | Functional Requirement | 機能要件 | Doc prefix |
| NFR | Non-Functional Requirement | 非機能要件 | Doc prefix |
| BR | Business Rule | ビジネスルール | Doc prefix |
| AC | Acceptance Criteria | 受け入れ基準 | Doc prefix |
| SRS | Software Requirements Specification | 要件定義書 | Phase 3 doc |
| BD | Basic Design | 基本設計書 | Phase 3 doc |
| DD | Detail Design | 詳細設計書 | Phase 3 doc |
| ADR | Architecture Decision Record | アーキテクチャ決定記録 | `documents/adr/` |
| MVP | Minimum Viable Product | MVP | Phase 1 scope |
| PWA | Progressive Web App | PWA | Phase 2 |
| APPI | Act on Protection of Personal Information | 個人情報保護法 | JP privacy law |
| EPS | Enhanced Productivity System | EPS Framework | Workflow tool |
| FDD | Frontend Detail Design | フロントエンド詳細設計 | DD sub-doc |
| BDD | Backend Detail Design | バックエンド詳細設計 | DD sub-doc |

---

## 9. Sources

- Architecture docs: `documents/architecture/00-09`
- F1 SRS: `documents/features/F1-CUSTOMER-hanq97/F1-CUSTOMER-BASE-srs.md`
- F2 domain KB: `.claude/memory-bank/feature/f2-quote/F2-QUOTE-hanq97/domain-knowledge.md`
- 電子帳簿保存法: [国税庁](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/index.htm)
- 適格請求書制度: [国税庁インボイス制度](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice.htm)

---

*Glossary maintained by feature work. Add new terms here ngay khi gặp domain term mới trong code/docs. PR review nên check term consistency.*
