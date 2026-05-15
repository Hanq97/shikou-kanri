# Glossary Micro-Agent / 用語集マイクロエージェント / Micro-Agent Bảng Thuật ngữ

**Responsibility / 責任 / Trách nhiệm**: Generate technical terms, abbreviations, and class name mappings for backend
**Output Lines / 出力行数 / Số dòng đầu ra**: ~60-100 lines
**Dependencies / 依存関係 / Phụ thuộc**: All previous BDD sections
**Checkpoint / チェックポイント / Điểm kiểm tra**: C8

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **All BDD Sections** (bdd-01 through bdd-07) - Extract technical terms
2. **SRS File Path** - Domain terminology
3. **Basic Design File Path** - Architecture terminology

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps - extract all technical terms from previous sections]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 8. 用語集 / Bảng Thuật ngữ (Glossary)

### 8.1 技術用語 / Thuật ngữ Kỹ thuật (Technical Terms)

| Term | 日本語 / Japanese | Tiếng Việt / Vietnamese | Description |
|------|------------------|------------------------|-------------|
| Service | サービス | Dịch vụ | Business logic layer component |
| Repository | リポジトリ | Kho dữ liệu | Data access layer pattern (DDD) |
| Entity | エンティティ | Thực thể | JPA persistent domain object |
| DTO | データ転送オブジェクト | Đối tượng truyền dữ liệu | Data Transfer Object |
| Mapper | マッパー | Bộ chuyển đổi | Entity-DTO conversion component |
| Controller | コントローラー | Bộ điều khiển | REST API endpoint handler |
| Bean Validation | Bean検証 | Xác thực Bean | JSR-303/380 validation framework |
| JPA | Java永続化API | API Lưu trữ Java | Java Persistence API |
| Transaction | トランザクション | Giao dịch | ACID database transaction |
| Dependency Injection | 依存性注入 | Tiêm phụ thuộc | IoC pattern implementation |

### 8.2 クラス名・インターフェース名 / Tên Lớp/Interface (Class & Interface Names)

| Class/Interface | 日本語 / Japanese | Tiếng Việt / Vietnamese | Purpose |
|-----------------|------------------|------------------------|---------|
| WorkflowService | ワークフローサービス | Dịch vụ Workflow | Workflow business logic |
| WorkflowRepository | ワークフローリポジトリ | Kho Workflow | Workflow data access |
| WorkflowController | ワークフローコントローラー | Bộ điều khiển Workflow | Workflow REST API |
| WorkflowMapper | ワークフローマッパー | Bộ chuyển đổi Workflow | Entity-DTO conversion |
| WorkflowValidator | ワークフロー検証器 | Bộ xác thực Workflow | Workflow validation logic |
| AuthenticationService | 認証サービス | Dịch vụ Xác thực | User authentication |
| AuthorizationService | 認可サービス | Dịch vụ Phân quyền | Permission checking |
| EventPublisher | イベントパブリッシャー | Nhà phát hành Sự kiện | Kafka message publisher |
| EventHandler | イベントハンドラー | Xử lý Sự kiện | Kafka message consumer |

### 8.3 略語 / Chữ viết tắt (Abbreviations)

| Abbreviation | Full Form | 日本語 / Japanese | Tiếng Việt / Vietnamese |
|--------------|-----------|------------------|------------------------|
| BDD | Backend Detail Design | バックエンド詳細設計 | Thiết kế Chi tiết Backend |
| SRS | Software Requirements Specification | ソフトウェア要件仕様書 | Đặc tả Yêu cầu Phần mềm |
| BD | Basic Design | 基本設計 | Thiết kế Cơ bản |
| DTO | Data Transfer Object | データ転送オブジェクト | Đối tượng Truyền Dữ liệu |
| JPA | Java Persistence API | Java永続化API | API Lưu trữ Java |
| DDD | Domain-Driven Design | ドメイン駆動設計 | Thiết kế Hướng Miền |
| REST | Representational State Transfer | 表現状態転送 | Chuyển trạng thái Biểu diễn |
| JWT | JSON Web Token | JSONウェブトークン | Token Web JSON |
| API | Application Programming Interface | アプリケーションプログラミングインターフェース | Giao diện Lập trình Ứng dụng |
| CRUD | Create, Read, Update, Delete | 作成・参照・更新・削除 | Tạo, Đọc, Cập nhật, Xóa |

### 8.4 ドメイン用語 / Thuật ngữ Miền (Domain Terms)

| Term | 日本語 / Japanese | Tiếng Việt / Vietnamese | Description |
|------|------------------|------------------------|-------------|
| Workflow | ワークフロー | Quy trình công việc | Business process definition |
| Node | ノード | Node | Workflow process step |
| Connection | 接続 | Kết nối | Flow between workflow nodes |
| Approval | 承認 | Phê duyệt | Approval decision point |
| Condition | 条件分岐 | Điều kiện | Conditional branching logic |
| Task | タスク | Nhiệm vụ | Work assignment step |
| Aggregate | 集約 | Tập hợp | DDD aggregate root |
| Value Object | 値オブジェクト | Đối tượng Giá trị | DDD value object |
| Domain Event | ドメインイベント | Sự kiện Miền | Domain-level event |

### 8.5 Springアノテーション / Chú thích Spring (Spring Annotations)

| Annotation | 日本語 / Japanese | Tiếng Việt / Vietnamese | Description |
|------------|------------------|------------------------|-------------|
| @Service | サービスアノテーション | Chú thích Service | Service layer component |
| @Repository | リポジトリアノテーション | Chú thích Repository | Data access component |
| @RestController | RESTコントローラーアノテーション | Chú thích REST Controller | REST API controller |
| @Transactional | トランザクショナルアノテーション | Chú thích Transactional | Transaction management |
| @Valid | 検証アノテーション | Chú thích Valid | Bean validation trigger |
| @Autowired | 自動配線アノテーション | Chú thích Autowired | Dependency injection |
| @Entity | エンティティアノテーション | Chú thích Entity | JPA entity marker |
| @Table | テーブルアノテーション | Chú thích Table | Database table mapping |

---

**Checkpoint C8 Validation / チェックポイントC8検証 / Xác thực điểm kiểm tra C8**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] All technical terms from previous sections included
2. [ ] Trilingual format (Japanese, Vietnamese, English)
3. [ ] Domain terms from SRS included
4. [ ] Class/Interface names mapped correctly
5. [ ] Abbreviations explained
6. [ ] Spring annotations documented
7. [ ] Checkpoint C8 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Backend Glossary Generation*
