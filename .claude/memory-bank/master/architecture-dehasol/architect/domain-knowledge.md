# Domain Knowledge Base: Construction Management System (施工管理 / Shikou-Kanri)

**Generated**: 2026-05-15
**Sources**: Claude (inline knowledge) + Reference doc (藤和建設様_統合ドキュメント.md)
**Target market**: Japan — mid-size construction & real estate (新築・リフォーム・アフター一気通貫型)
**Project type**: Custom B2B SaaS / Private cloud deployment for single tenant (藤和建設)

---

## 1. Standard Workflows (業界標準業務フロー)

### 1.1 Tổng thể vòng đời case (案件ライフサイクル)
Trong ngành xây dựng tổng hợp Nhật Bản, một case (案件) chạy qua các giai đoạn chuẩn:

1. **Lead generation (引合)** → **Tiền khảo sát (現地調査)** → **Báo giá (見積)** → **Hợp đồng (契約)** → **Thiết kế (設計)** → **Khởi công (着工)** → **Thi công (施工)** → **Kiểm tra (検査)** → **Bàn giao (引渡し)** → **Aftercare (アフター)**.
2. Phân nhánh theo loại case:
   - **新築** (new construction): cycle dài 6-18 tháng, 10-20+ subcontractor, quy trình kiểm tra nghiêm ngặt theo 建築基準法.
   - **リフォーム** (remodel): cycle ngắn 1-3 tháng, ít subcontractor hơn, đặc biệt phụ thuộc OB customer database.
   - **修繕/メンテ** (repair/maintenance): cycle vài ngày → 1 tháng, từ aftercare flow gọi xuống.

### 1.2 Aftercare cycle (アフターサービスサイクル)
- Chuẩn ngành Nhật: kiểm tra định kỳ **1年・3年・5年・10年・20年** sau bàn giao (引渡し).
- **瑕疵担保責任** (defect liability): pháp luật quy định 10 năm cho cấu kiện chính (構造耐力上主要な部分・雨水侵入防止).
- OB customer business model: khoảng 60-90% doanh thu remodel đến từ existing customer base (như Towa: 90%).

### 1.3 Hiện trường (現場運営)
- Chủ thầu (元請) + nhiều thầu phụ (協力業者・職人) làm việc đồng thời.
- 現場監督 (site supervisor) là người liaison: chỉ đạo công nhân, kiểm tra chất lượng, chụp ảnh báo cáo.
- Báo cáo daily: 写真台帳 (photo log), 日報 (daily report), 工程進捗 (progress).
- **電子黒板** (digital chalkboard): tiêu chuẩn ngành Nhật từ ~2015, do 国交省 (MLIT) thúc đẩy `i-Construction` policy.

### 1.4 Báo giá (見積業務)
- 見積書 phải gồm: 表紙 / 工事内訳明細 (大分類・中分類・小分類・項目) / 諸経費 / 消費税 / 合計.
- Reuse rate: 60-80% line items reuse được từ case tương tự (cùng loại 新築/リフォーム + diện tích + cấu trúc).
- **単価マスタ** (unit price master): quản lý theo 工種 (work type) × 材料/労務 × 適用開始日. Cập nhật khi giá VLXD thay đổi.

---

## 2. Core Entities & Rules (主要エンティティと業務ルール)

### 2.1 Entity chính (must-have)
| Entity | Mô tả | Quan hệ chính |
|---|---|---|
| Customer (顧客) | Cá nhân hoặc pháp nhân; có flag OB | 1:N với Property, 1:N với Project |
| Property (物件) | Nhà/tòa nhà cụ thể; có 引渡日 (handover date) | N:1 với Customer; 1:N với Project |
| Project (案件) | Đơn vị công việc: 新築/リフォーム/修繕/アフター | N:1 với Customer, N:1 với Property |
| Quote (見積) | Báo giá với line items; có status lifecycle | N:1 với Project; N:N với UnitPrice (qua QuoteLine) |
| UnitPrice (単価) | Master data về đơn giá; có version & 適用開始日 | Reference từ QuoteLine |
| Schedule (工程) | Gantt-style schedule, có task dependency | N:1 với Project |
| Task (工程タスク) | Đơn vị schedule item | N:1 với Schedule, có Predecessor refs |
| Photo (現場写真) | Có metadata: GPS, 撮影日時, 工種, 電子黒板 data | N:1 với Project, N:N với InspectionItem |
| Inspection (検査) | Checklist + 合否 | N:1 với Project |
| Correction (是正) | Workflow 3 steps: 依頼→完了→承認 | N:1 với Inspection |
| MaintenanceSchedule (定期点検) | Auto-generated từ Property.引渡日 + interval (1/3/5/10年) | N:1 với Property |
| User | 4 roles | Many:Many với Project (qua ProjectMember) |
| Drawing (図面) | PDF/image + markers | N:1 với Project, 1:N với Marker |
| Message (メッセージ) | Chat thread per project | N:1 với Project, N:N với User (read receipts) |
| AuditLog | Audit trail | Polymorphic |

### 2.2 Business rules cốt lõi
- **R1**: Mỗi Project phải gắn với 1 Customer (có thể null Property nếu là 用地仕入れ pre-acquisition).
- **R2**: Status transition Project: `見積中 → 受注 → 着工 → 完成 → 引渡し → アフター`. Transition phải audit log.
- **R3**: Khi Property.引渡日 set → tự động generate MaintenanceSchedule với 4 entry (1/3/5/10年).
- **R4**: 招待ユーザー (invited user, e.g. 職人) chỉ thấy Project mà mình là member, với folder visibility theo `is_public` flag.
- **R5**: Quote PDF generation phải bao gồm 社印 (company seal) và phải embed text (検索可能 PDF).
- **R6**: Correction workflow: 依頼 phải có required photo before; 完了 phải có required photo after; 承認 chỉ system admin hoặc 社員(マネージャー).
- **R7**: 単価マスタ thay đổi không retroactively apply: Quote đã save giữ snapshot of unit prices tại thời điểm tạo.
- **R8**: Photo bắt buộc gắn với 1 Project; GPS optional (offline upload có thể không có).

### 2.3 Domain edge cases (xem mục 5 chi tiết hơn)

---

## 3. Regulatory Requirements (法令・規制)

### 3.1 Bắt buộc tuân thủ (Project-specific)
| Luật / Quy định | Phạm vi áp dụng | Tác động đến hệ thống |
|---|---|---|
| **個人情報保護法 (APPI)** | Customer PII (氏名/住所/電話/メール) | Cần consent, purpose specification, data minimization, deletion request flow |
| **電子帳簿保存法** (2024 reform) | Quote, contract, invoice in digital form | Search by 取引年月日/金額/取引先, immutable retention, scan timestamping |
| **建設業の働き方改革 (2024年問題)** | Lao động ngành xây dựng | Track 労働時間 → ngụ ý cần feature 工数記録 (nếu mở rộng) |
| **建築基準法** + **住宅瑕疵担保履行法** | Quality inspection, defect liability | 検査記録 phải retained 10年 minimum |
| **GDPR** (nếu future expand sang EU) | EU citizens data | Không applicable hiện tại nhưng nên kiến trúc-aware |

### 3.2 Subsidy / Compliance for funding
- **ものづくり補助金** (Manufacturing subsidy): 
  - Chứng từ minh chứng chi phí phải lưu trữ.
  - Hệ thống phải triển khai theo plan đã đệ trình.
  - **Quan trọng**: Không được phát sinh contract/payment trước ngày 交付決定 (subsidy approval date).
- **GビズID プライム** (G-biz ID Prime): cần thiết cho submit subsidy application; có ảnh hưởng admin onboarding flow (không tích hợp trực tiếp nhưng cần document hóa).

### 3.3 Industry standards (best practice, không bắt buộc luật)
- **i-Construction** (国交省): 電子黒板, 写真台帳 chuẩn hoá.
- **CALS/EC** standards: structured filename/folder cho công trình công cộng (nếu Towa làm dự án công về sau).
- **JIS Q 27001** (ISO 27001 JP): khuyến nghị cho security baseline.

---

## 4. Reference Architectures (参考アーキテクチャ)

### 4.1 Tham chiếu các SaaS cùng domain ở Nhật
| Sản phẩm | Đặc điểm chính | Học gì cho project này |
|---|---|---|
| **ANDPAD** (アンドパッド) | Top thị phần JP, all-in-one (案件・写真・チャット・図面) | Multi-tenant cloud; mobile-first; điện tử hoá 電子黒板; chat tích hợp với 案件 |
| **Buildee** (バイルディー) | Daily report & 作業員管理 mạnh | Workflow approval / hierarchy |
| **SiteBox** | 写真台帳 / 電子黒板 chuyên sâu | Image processing pipeline; offline-first mobile |
| **きづくり** | 中小工務店 focus | Simple UX cho IT-literacy thấp |
| **Procore** (US) | Enterprise GC | Robust permission, document control, BIM integration |
| **PlanGrid / Autodesk Construction Cloud** | Drawing markup mạnh | PDF marker + version control |

### 4.2 Architecture patterns thường gặp
- **Modular monolith** với rõ ràng module boundary (Customer / Project / Quote / Photo / Chat / AI). Phù hợp với scale 50 concurrent users + ~10K customers + ~5K projects.
- **Microservices** chỉ split khi có domain rõ ràng cần scale độc lập (AI service, OCR service). Project này nên start với modular monolith → split AI service ở Phase 3.
- **Event-driven** với async jobs (BullMQ / Celery / AWS SQS) cho: send notification, generate PDF, run OCR, evaluate maintenance schedule daily.
- **Real-time**: WebSocket cho chat + schedule sync; SSE đơn giản hơn nếu chỉ cần server→client.
- **Storage tiering**: hot (S3 standard) cho 30 ngày → cool (S3 IA / Azure Cool) sau đó; archive (Glacier / Archive Tier) cho >2 năm.

### 4.3 Tech stack patterns điển hình cho domain
- Backend: NestJS (TS) - khớp tốt với FE TS, dev team unified language. FastAPI (Python) - tốt khi AI/ML là core, có domain expert ML.
- Database: PostgreSQL (rồi, không nên thay đổi - tốt cho mixed OLTP + analytical query).
- Search: OpenSearch (AWS-native, OSS, không vendor-lock với Elastic license issue).
- Object storage: S3 nếu AWS, Azure Blob nếu Azure. Quyết định cloud trước rồi mới chốt.
- AI Multi-LLM gateway pattern: dùng abstraction layer (LangChain / LlamaIndex / custom) để swap model. RAG dùng Qdrant (self-host được, OSS) hoặc Azure AI Search (managed).

---

## 5. Domain Edge Cases (ドメイン特有のエッジケース)

### 5.1 Customer + Property + Project nhiều-nhiều phức tạp
- 1 Customer có thể có nhiều Property (主邸 + 別邸 + 賃貸不動産).
- 1 Property có thể đổi Customer (bán cho người khác) → vẫn cần track aftercare đến khi expiry.
- 1 Project có thể span nhiều Property (大規模分譲: 1 dự án = nhiều nhà).
- Edge case: 共有名義 (co-owned property) → schema cần support multiple owners.

### 5.2 Offline-first mobile usage
- Hiện trường nhiều khi không có internet (山間部, 地下).
- Photo upload phải queue locally, sync khi online.
- Conflict resolution: nếu 2 người update cùng schedule offline → "last write wins" + alert.

### 5.3 Photo volume & lifecycle
- 100,000 photo target: cần ~500GB-1TB storage giả định 5-10MB/photo.
- HEIC format từ iPhone iOS 11+ → cần transcode sang JPEG cho compatibility.
- Privacy: photo có thể chứa người (職人, customer) → cần data retention policy.

### 5.4 Quote line numbering convention
- Nhật thường dùng 大項目→中項目→小項目 (e.g., "01.土工事 > 01-01.根切り > 01-01-01.掘削").
- Khi reorder line, numbering phải auto-recalculate but reference (cross-line dependency) phải preserved.

### 5.5 Multi-language nội bộ
- Towa staff: tiếng Nhật.
- 職人/協力業者: chủ yếu tiếng Nhật, có thể có người ngoại quốc (技能実習生) → tương lai có thể cần i18n UI.
- DEHA dev team: Việt-Nhật (theo doc reference, partner ベトナム拠点) → docs cần kỹ thuật-bilingual hoặc tối thiểu architecture doc bằng VN/EN cho team, business doc bằng JP cho client.

### 5.6 Aftercare bridging to remodel sales
- Khi inspection tại 5年 phát hiện cần repair → có thể tự convert sang Quote/Project mới.
- Khả năng cross-sell: 10年 inspection trùng với thời điểm khách suy nghĩ remodel lớn → cần CRM hint.

### 5.7 GビズID / 電子帳簿保存法 timestamp
- 電帳法 yêu cầu タイムスタンプ (timestamping) cho scanned receipt. Nếu Towa quản lý 業者見積 qua OCR (F7-06) → phải tích hợp timestamp authority hoặc dùng "訂正削除履歴" alternative.

---

## 6. Performance Patterns (パフォーマンス特性)

### 6.1 Workload profile dự kiến
| Metric | Target | Note |
|---|---|---|
| Concurrent users | 50 peak | OK cho monolith trên 1-2 instance |
| Customers | 10,000 | Index trên 氏名/電話/住所 |
| Projects | 5,000 active + historical | Partition theo year nếu cần |
| Photos | 100,000 total | Off-loaded to S3/Blob, DB chỉ giữ metadata |
| Quote line per quote | ~50-500 | JSON column hoặc relational table |
| Chat messages | ~100/case/month × 5000 case = 6M | Pagination required; search via OpenSearch |

### 6.2 Hot paths cần tối ưu
- **顧客検索** với fuzzy match (氏名 typo): trigram index trong PG hoặc OpenSearch.
- **見積作成** với 過去流用: search by criteria + clone in transaction.
- **工程ガント** load + drag-drop update: lightweight payload, optimistic UI.
- **写真一覧 thumbnail**: pre-generate thumbnail (3 sizes), serve via CDN.
- **チャット realtime**: WebSocket với room-per-project; horizontal scale qua Redis pub/sub.

### 6.3 Batch & async
- **Maintenance notification batch**: daily check Property.引渡日 + intervals, mark eligible records → enqueue email/LINE.
- **OCR**: async job, có thể chạy vài chục giây/tài liệu.
- **AI suggestion** (見積補助, 類似案件): có thể cache theo input hash để giảm latency.

### 6.4 Caching strategy
- 単価マスタ: in-memory cache (Redis), TTL 1h, invalidate on update.
- 案件 list with filter: cache theo user + filter signature, TTL 5min.
- Static config (role permission matrix): warm in app startup.

---

## 7. Security Patterns (セキュリティパターン)

### 7.1 AuthN/AuthZ
- **AuthN**: email/password + 強パスワード (12+ chars, complexity) → mặc định; SSO OIDC (Google Workspace likely candidate cho Towa); 2FA optional initial, mandatory cho admin role.
- **AuthZ**: 4 roles + per-project ACL. Implement với **RBAC base + per-resource override**. Policy engine pattern (Oso / Casbin) là overkill ở scale này — middleware-based policy đủ.
- **招待ユーザー** flow: token-based invite link với expiry (7 days), single-use, revocable.

### 7.2 Data protection
- TLS 1.2+ everywhere (Let's Encrypt / ACM).
- AES-256 at rest: PG-level transparent encryption (RDS/Azure DB managed); S3/Blob default encryption.
- PII column-level encryption (氏名, 電話, アドレス) khuyến nghị nếu compliance audit nghiêm khắc — tradeoff search performance.
- Password: bcrypt cost 12+, hoặc Argon2id.
- **Audit log retention**: 2 năm theo doc; consider 監査 immutable storage (S3 Object Lock / WORM) cho regulatory robustness.

### 7.3 AI security (private)
- **Self-hosted vs API LLM** tradeoff: cost/control. Recommend hybrid:
  - Embedding model self-hosted (small model OK) trong VPC.
  - LLM inference qua **API** (Claude/GPT/Gemini) với "BYOK + no-training" agreement → vẫn private.
  - Vector DB self-hosted (Qdrant) hoặc managed-private (Azure AI Search private endpoint).
- AI prompt injection: sanitize user input vào RAG context; restrict tool/function calling.
- AI output: human-in-the-loop bắt buộc cho quote suggestion (per doc).

### 7.4 Network & infra
- VPC isolation; admin API behind IP allowlist (optional per doc).
- WAF for public endpoints (CloudFront WAF / Azure Front Door).
- Secret management: Secrets Manager / Key Vault. Không hardcode trong code/.env commit.

### 7.5 Threat model highlight
- Insider misuse → audit log + role separation.
- Stolen mobile device with offline data → require local app PIN + remote wipe consideration.
- Public link leakage (図面 share) → expiring signed URLs.

---

## 8. Integration Patterns (外部連携パターン)

### 8.1 Outbound integrations (per doc)
| System | Purpose | Phase | Pattern |
|---|---|---|---|
| SMTP/SendGrid/SES | Email notifications | 1 | Sync API call + retry queue |
| SSO Provider (Google/...) | OIDC SSO | 1 | Standard OIDC flow |
| LLM API (Claude/GPT/Gemini) | AI quote, chatbot | 3 | Gateway abstraction; rate limit + cost tracking |
| OCR service (Azure Doc Intelligence) | Quote scan | 3 | Async job; manual review step |
| LINE Messaging API | OB notification | 3 | Webhook verify; opt-in management |
| SMS API (Twilio/...) | OB notification | 3 | Cost-conscious; fallback to email |

### 8.2 Inbound (one-time data migration)
- 既存顧客管理ソフト → CSV → import job + validation report.
- Google Drive 工程表 → manual export to CSV/Excel → import.
- **Risk**: data quality (duplicate, missing field) — cần cleansing tool / report.

### 8.3 Future integrations (likely Phase 3+)
- 会計ソフト (freee / 弥生 / MoneyForward): export 売上 cho accounting.
- BIM tools (Revit, Vectorworks): drawing import.
- 電子契約 (CloudSign / GMO電子印鑑Agree): 電帳法 compliance for contracts.

### 8.4 Webhook strategy
- Outbound webhooks (cho khi future cần notify external system): retry với exponential backoff, signed payload.
- Inbound webhooks (LINE event delivery): HMAC verify, idempotent handler.

---

## Domain Knowledge Summary

**Domain complexity**: **Complex (7 topics for interview)** — multi-stakeholder, regulatory-heavy (個情法 + 電帳法 + 瑕疵担保), AI integration, mobile/offline, multi-tenant-capable architecture.

**Key architectural drivers detected từ doc**:
1. **Phased delivery** (Phase 1 → 3) — kiến trúc phải dễ extend AI features sau.
2. **Mobile-first cho hiện trường** — affects API design, offline sync, image handling.
3. **AI-private** — cannot ship data ngoài; vector DB & RAG self-controlled.
4. **Subsidy compliance** — không được trigger billable work trước 交付決定; có ảnh hưởng project schedule.
5. **OB customer-centric** — Customer entity là center of model, không phải Project.
6. **Reuse từ similar PJ của DEHA** — 60-70% feature theo doc. Architecture nên reuse được existing components/patterns.

**Critical open questions từ doc** (sẽ become Interview Plan):
1. Backend stack: **NestJS vs FastAPI** (chưa chốt)
2. Cloud: **AWS vs Azure** (chưa chốt)
3. Mobile: **PWA vs Native** (PWA default, có thể chuyển)
4. Search: **Elasticsearch vs OpenSearch**
5. Vector DB: **Pinecone vs Qdrant**
6. OCR: **Azure Doc Intelligence vs others**
7. Multi-tenancy: chỉ single-tenant Towa, hay platform multi-tenant?
8. Deployment topology: shared SaaS, dedicated VPC, on-premise?
9. Team size & velocity assumptions cho 12-month timeline
10. SSO provider cụ thể & 2FA policy
11. Data migration scope & data quality assumptions
12. Drawing format support (PDF only? CAD/DWG?)
13. Photo storage lifecycle & retention policy
14. DR strategy (RTO 4h, RPO 24h — multi-region active-passive?)
15. CI/CD platform (GitHub Actions vs Azure DevOps theo doc)
