# BD Glossary Micro-Agent / 用語集マイクロエージェント

**Responsibility**: Generate Section 6 (Glossary) of Basic Design
**Output Lines**: 40-60 lines
**Dependencies**: All BD sections, SRS glossary

---

## Input Requirements

- Evidence file path (absolute)
- SRS file path (for SRS glossary reference)
- All BD sections (for term extraction)
- Feature code (e.g., "CMN015002")
- Technical terms (from evidence)

---

## Processing Logic

### Step 1: Load Evidence, SRS, and All BD Sections

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
srs_glossary = extract_glossary(srs)
all_bd_sections = read_all_bd_sections()
technical_terms = extract_technical_terms(all_bd_sections)
design_terms = extract_design_specific_terms(all_bd_sections)
```

**Extract:**
- Architecture terms
- Component/class names
- Database terms
- API/Interface terms
- Security terms
- Framework-specific terms

### Step 2: Categorize Terms

**6.1 アーキテクチャ用語 / Architecture Terms**
- Architecture patterns
- Design patterns
- Infrastructure terms

**6.2 技術用語 / Technical Terms**
- Frameworks and libraries
- Programming languages
- Database technologies
- Security technologies

**6.3 設計用語 / Design Terms**
- Component types
- Data structures
- Interface types

**6.4 SRS用語参照 / SRS Terms Reference**
- Link to SRS glossary for business terms
- Avoid duplication

### Step 3: Generate Bilingual Definitions

**Format:**
- Term in original language (usually English for technical terms)
- Japanese explanation
- Vietnamese explanation
- Usage context in design
- Reference to sections where used

**Alphabetical Order:**
- Sort by English term (for technical)
- Group by category first

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] All terms used in BD sections?
- [ ] No unnecessary terms?
- [ ] Definitions from standard sources?
- [ ] Terms consistent with usage?

**Q2: Consistency?**
- [ ] Consistent with SRS glossary?
- [ ] No conflicting definitions?
- [ ] Term usage consistent across BD?
- [ ] Technical terms standardized?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] All terms have JP/VN translations?
- [ ] Technical terms explained in both languages?
- [ ] Design concepts in both languages?
- [ ] Context examples bilingual?

**Q4: No Prohibited Content?**
- [ ] No implementation code?
- [ ] No SQL queries?
- [ ] Only term definitions?
- [ ] Design-level explanations only?

---

## Output Template

```markdown
## 6. 用語集 / Bảng thuật ngữ (Glossary)

**注意 / Note:**
ビジネス用語については、SRS Section 6の用語集を参照してください。
Để biết thuật ngữ nghiệp vụ, vui lòng tham khảo SRS Section 6 Glossary.

**SRS参照 / SRS Reference:**
- Document: SRS-[FEATURE_CODE]-[DATE]
- Section: 6. 用語集 / Glossary

---

### 6.1 アーキテクチャ用語 / Thuật ngữ kiến trúc (Architecture Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [Architecture Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [Architecture Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [Architecture Term]
**日本語 / Japanese:**
[Detailed Japanese explanation with architecture context]

**Vietnamese:**
[Detailed Vietnamese explanation with architecture context]

**設計での使用 / Usage in Design:**
[Where and how this term is used in design JP] / [Where and how VN]

**参照セクション / Referenced Sections:**
- Section 1.X: [Section name]

---

### 6.2 技術用語 / Thuật ngữ kỹ thuật (Technical Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [Tech Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [Tech Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [Framework/Library Name]
**日本語 / Japanese:**
[Detailed explanation of the technology in Japanese]

**Vietnamese:**
[Detailed explanation in Vietnamese]

**バージョン / Version:** [X.Y.Z]

**用途 / Purpose:**
[Purpose in the design JP] / [Purpose VN]

**参照セクション / Referenced Sections:**
- Section 1.3: Technology Stack
- Section 2: Component Design

---

### 6.3 設計用語 / Thuật ngữ thiết kế (Design Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [Design Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [Design Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [Design Component/Pattern]
**日本語 / Japanese:**
[Detailed explanation in design context]

**Vietnamese:**
[Detailed explanation in design context]

**設計パターン / Design Pattern:**
[Pattern name if applicable]

**実装レイヤー / Implementation Layer:**
[Which layer: Frontend/Backend/Data]

**参照セクション / Referenced Sections:**
- Section 2: Component Design

---

### 6.4 データベース用語 / Thuật ngữ cơ sở dữ liệu (Database Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [DB Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [DB Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [Database Concept]
**日本語 / Japanese:**
[Detailed explanation related to data design]

**Vietnamese:**
[Detailed explanation related to data design]

**データ設計での役割 / Role in Data Design:**
[Role description JP] / [Role description VN]

**参照セクション / Referenced Sections:**
- Section 3: Data Design

---

### 6.5 API/インターフェース用語 / Thuật ngữ API/Giao diện (API/Interface Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [API Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [API Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [API/Interface Concept]
**日本語 / Japanese:**
[Detailed explanation in interface context]

**Vietnamese:**
[Detailed explanation in interface context]

**使用箇所 / Usage Location:**
[Where used in interface design JP] / [Where used VN]

**参照セクション / Referenced Sections:**
- Section 4: Interface Design

---

### 6.6 セキュリティ用語 / Thuật ngữ bảo mật (Security Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [Security Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [Security Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [Security Concept]
**日本語 / Japanese:**
[Detailed explanation of security term]

**Vietnamese:**
[Detailed explanation of security term]

**セキュリティ設計での実装 / Implementation in Security Design:**
[Implementation approach JP] / [Implementation approach VN]

**参照セクション / Referenced Sections:**
- Section 5: Security Design

---

### 6.7 略語 / Viết tắt (Acronyms & Abbreviations)

**注意 / Note:**
一般的な技術略語のみをリストします。ビジネス略語はSRSを参照。
Chỉ liệt kê các từ viết tắt kỹ thuật. Xem SRS cho các từ viết tắt nghiệp vụ.

| 略語 / Acronym | 正式名称 / Full Form | 日本語 / Japanese | Vietnamese | 説明 / Description |
|--------------|------------------|---------------|-----------|------------------|
| API | Application Programming Interface | アプリケーションプログラミングインターフェース | Giao diện lập trình ứng dụng | システム間連携 / Liên kết hệ thống |
| DTO | Data Transfer Object | データ転送オブジェクト | Đối tượng truyền dữ liệu | レイヤー間データ転送 / Truyền dữ liệu giữa các tầng |
| JPA | Java Persistence API | Java永続化API | API Java Persistence | ORMフレームワーク / Framework ORM |
| JWT | JSON Web Token | JSONウェブトークン | JSON Web Token | 認証トークン / Token xác thực |
| ORM | Object-Relational Mapping | オブジェクト関係マッピング | Ánh xạ đối tượng-quan hệ | DB ↔ オブジェクト変換 / Chuyển đổi DB ↔ Object |
| RBAC | Role-Based Access Control | ロールベースアクセス制御 | Kiểm soát truy cập theo vai trò | 権限管理方式 / Phương thức quản lý quyền |
| REST | Representational State Transfer | 表現状態転送 | Chuyển giao trạng thái đại diện | APIアーキテクチャスタイル / Phong cách kiến trúc API |
| SSO | Single Sign-On | シングルサインオン | Đăng nhập một lần | 統合認証 / Xác thực tích hợp |
| TLS | Transport Layer Security | トランスポート層セキュリティ | Bảo mật tầng truyền tải | 通信暗号化 / Mã hóa truyền thông |

---

### 6.8 参考資料 / Tài liệu tham khảo (References)

**技術仕様 / Technical Specifications:**
- Spring Framework Documentation: https://spring.io/projects/spring-framework
- Next.js Documentation: https://nextjs.org/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- React Flow Documentation: https://reactflow.dev/

**設計パターン / Design Patterns:**
- Domain-Driven Design (DDD): Eric Evans
- Patterns of Enterprise Application Architecture: Martin Fowler
- Clean Architecture: Robert C. Martin

**セキュリティ標準 / Security Standards:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OAuth 2.0 / OpenID Connect: https://oauth.net/2/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725

**関連SRS / Related SRS:**
- SRS-[FEATURE_CODE]-[DATE] Section 6: ビジネス用語 / Business terms

---

### 6.9 用語索引 / Term Index

**アルファベット順 / Alphabetical Order:**

**A-D**
- API, App Router, Authentication, Authorization
- Bearer Token, BPMN
- Canvas, Component, Controller, CRUD
- DTO, DDD, Domain Model

**E-J**
- Entity, ER Diagram
- Foreign Key, Framework
- HTTPS, Hook
- Index, Interface
- JPA, JSON, JWT

**K-R**
- Keycloak
- Layered Architecture
- Microservices, Migration
- Node (Workflow), NFR
- OAuth, ORM, OWASP
- PostgreSQL, Primary Key
- RBAC, Repository, REST, Role

**S-Z**
- Schema, Security, Server Component, Service, SSO
- Table, TLS, Token, TypeScript
- Use Case
- Validation
- Workflow

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- SRS Reference: `[srs_file_path]` (Section 6)
- All BD Sections: Architecture, Components, Data, Interface, Security
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Example Output

```markdown
## 6. 用語集 / Bảng thuật ngữ (Glossary)

**注意 / Note:**
ビジネス用語については、SRS Section 6の用語集を参照してください。
Để biết thuật ngữ nghiệp vụ, vui lòng tham khảo SRS Section 6 Glossary.

**SRS参照 / SRS Reference:**
- Document: SRS-CMN015002-20251220
- Section: 6. 用語集 / Glossary

---

### 6.1 アーキテクチャ用語 / Thuật ngữ kiến trúc (Architecture Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| Layered Architecture | レイヤードアーキテクチャ | Kiến trúc phân lớp | プレゼンテーション、ビジネス、データ層に分離 / Phân tách thành tầng trình diễn, nghiệp vụ, dữ liệu |
| Microservices | マイクロサービス | Microservices | 独立してデプロイ可能な小さなサービス群 / Tập hợp các dịch vụ nhỏ có thể triển khai độc lập |
| DDD | ドメイン駆動設計 | Thiết kế hướng miền | ドメインモデル中心の設計手法 / Phương pháp thiết kế tập trung vào mô hình miền |

**詳細説明 / Detailed Explanations:**

#### Layered Architecture / レイヤードアーキテクチャ / Kiến trúc phân lớp
**日本語 / Japanese:**
システムを複数の論理レイヤーに分割するアーキテクチャパターン。各レイヤーは特定の責任を持ち、上位レイヤーから下位レイヤーへの一方向依存を原則とします。本設計では、Presentation (Next.js)、Application (Spring Boot)、Data (PostgreSQL)の3層構造を採用しています。

**Vietnamese:**
Mô hình kiến trúc chia hệ thống thành nhiều tầng logic. Mỗi tầng có trách nhiệm cụ thể và nguyên tắc phụ thuộc một chiều từ tầng trên xuống tầng dưới. Thiết kế này sử dụng cấu trúc 3 tầng: Presentation (Next.js), Application (Spring Boot), Data (PostgreSQL).

**設計での使用 / Usage in Design:**
システム全体の基本アーキテクチャパターンとして使用 / Sử dụng làm mô hình kiến trúc cơ bản cho toàn hệ thống

**参照セクション / Referenced Sections:**
- Section 1.1: System Architecture Overview
- Section 1.2: Layer Structure

---

### 6.2 技術用語 / Thuật ngữ kỹ thuật (Technical Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| Next.js | Next.js | Next.js | Reactベースのフルスタックフレームワーク / Framework full-stack dựa trên React |
| Spring Boot | Spring Boot | Spring Boot | Javaアプリケーションフレームワーク / Framework ứng dụng Java |
| React Flow | React Flow | React Flow | ワークフロー図描画ライブラリ / Thư viện vẽ sơ đồ workflow |

**詳細説明 / Detailed Explanations:**

#### Next.js
**日本語 / Japanese:**
Vercelが開発するReactベースのフルスタックフレームワーク。Server Components、Server Actions、App Routerなどの機能により、高性能なWebアプリケーションを構築できます。本設計ではバージョン15.3.0を使用し、フロントエンド全体を実装します。

**Vietnamese:**
Framework full-stack dựa trên React do Vercel phát triển. Với các tính năng như Server Components, Server Actions, App Router, có thể xây dựng ứng dụng web hiệu năng cao. Thiết kế này sử dụng phiên bản 15.3.0 để triển khai toàn bộ frontend.

**バージョン / Version:** 15.3.0

**用途 / Purpose:**
フロントエンドフレームワーク (Presentation Layer) / Framework frontend (Tầng trình diễn)

**参照セクション / Referenced Sections:**
- Section 1.2.1: Presentation Layer
- Section 1.3.1: Frontend Technology Stack

---

### 6.3 設計用語 / Thuật ngữ thiết kế (Design Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| Controller | コントローラー | Controller | HTTPリクエストを処理するコンポーネント / Component xử lý HTTP request |
| Service | サービス | Service | ビジネスロジックを実装するコンポーネント / Component triển khai business logic |
| Repository | リポジトリ | Repository | データアクセスを抽象化するコンポーネント / Component trừu tượng hóa truy cập dữ liệu |
| DTO | データ転送オブジェクト | Đối tượng truyền dữ liệu | レイヤー間でデータを転送するオブジェクト / Đối tượng truyền dữ liệu giữa các tầng |

**詳細説明 / Detailed Explanations:**

#### Repository Pattern / リポジトリパターン / Mẫu Repository
**日本語 / Japanese:**
データアクセス層を抽象化し、ビジネスロジックからデータストアの詳細を隠蔽するデザインパターン。Spring Data JPAのRepositoryインターフェースを使用して実装します。

**Vietnamese:**
Mẫu thiết kế trừu tượng hóa tầng truy cập dữ liệu, che giấu chi tiết data store khỏi business logic. Triển khai sử dụng Repository interface của Spring Data JPA.

**設計パターン / Design Pattern:**
Repository Pattern (DDD)

**実装レイヤー / Implementation Layer:**
Backend - Data Access Layer

**参照セクション / Referenced Sections:**
- Section 2.2.3: Repositories

---

### 6.4 データベース用語 / Thuật ngữ cơ sở dữ liệu (Database Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| JSONB | JSON Binary | JSONB | PostgreSQLのバイナリJSON型 / Kiểu JSON nhị phân của PostgreSQL |
| Foreign Key | 外部キー | Khóa ngoại | 他テーブルの主キーを参照するキー / Khóa tham chiếu đến khóa chính của bảng khác |
| Index | インデックス | Chỉ mục | クエリ高速化のためのデータ構造 / Cấu trúc dữ liệu để tăng tốc truy vấn |

**詳細説明 / Detailed Explanations:**

#### JSONB
**日本語 / Japanese:**
PostgreSQLのバイナリJSON型。ワークフロー定義のような柔軟な構造データを効率的に保存・検索できます。テキスト型JSONより高速なクエリが可能で、インデックスもサポートされています。

**Vietnamese:**
Kiểu JSON nhị phân của PostgreSQL. Có thể lưu trữ và truy vấn hiệu quả dữ liệu cấu trúc linh hoạt như định nghĩa workflow. Truy vấn nhanh hơn JSON dạng text và hỗ trợ index.

**データ設計での役割 / Role in Data Design:**
ワークフロー定義の保存に使用 / Sử dụng để lưu định nghĩa workflow

**参照セクション / Referenced Sections:**
- Section 3.2: Table Design
- Section 3.3.2: Custom Data Types

---

### 6.5 API/インターフェース用語 / Thuật ngữ API/Giao diện (API/Interface Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| REST | 表現状態転送 | REST | HTTPベースのAPIアーキテクチャスタイル / Phong cách kiến trúc API dựa trên HTTP |
| Endpoint | エンドポイント | Endpoint | APIの特定のURLパス / Đường dẫn URL cụ thể của API |
| Status Code | ステータスコード | Mã trạng thái | HTTPレスポンスの結果コード / Mã kết quả của HTTP response |

---

### 6.6 セキュリティ用語 / Thuật ngữ bảo mật (Security Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| JWT | JSONウェブトークン | JSON Web Token | JSON形式の認証トークン / Token xác thực định dạng JSON |
| OAuth 2.0 | OAuth 2.0 | OAuth 2.0 | 認可フレームワーク / Framework phân quyền |
| RBAC | ロールベースアクセス制御 | Kiểm soát truy cập theo vai trò | ロールに基づく権限管理 / Quản lý quyền dựa trên vai trò |
| TLS | トランスポート層セキュリティ | Bảo mật tầng truyền tải | 通信暗号化プロトコル / Giao thức mã hóa truyền thông |

---

[Continue with other sections as shown in template...]

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `.claude/memory-bank/evidence/CMN015002_workflow_designer.md`
- SRS Reference: `/docs/srs/SRS-CMN015002-20251220.md` (Section 6)
- All BD Sections: Architecture, Components, Data, Interface, Security
- Extracted: 2025-12-20 11:15:00

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All terms used in BD sections collected
2. [ ] Terms categorized correctly
3. [ ] All terms have JP/VN translations
4. [ ] Definitions clear and design-focused
5. [ ] Alphabetical order within categories
6. [ ] No duplicate with SRS glossary (business terms)
7. [ ] Consistent with SRS technical terms
8. [ ] References to sections provided
9. [ ] Evidence sources cited

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: BD Section 6 - Glossary*
