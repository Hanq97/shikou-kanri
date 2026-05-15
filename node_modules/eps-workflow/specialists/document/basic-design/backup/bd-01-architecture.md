# BD Architecture Micro-Agent / アーキテクチャマイクロエージェント

**Responsibility**: Generate Section 1 (Architecture Design) of Basic Design
**Output Lines**: 80-100 lines
**Dependencies**: SRS (for functional requirements), bd-00-document-info.md

---

## Input Requirements

- Evidence file path (absolute)
- SRS file path (for requirements mapping)
- Feature code (e.g., "CMN015002")
- Technical stack (from evidence)
- Architecture diagrams (from evidence if available)

---

## Processing Logic

### Step 1: Load Evidence and SRS

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
functional_reqs = extract_functional_requirements(srs)
tech_stack = extract_section(evidence, "Technology Stack|技術スタック")
architecture_patterns = extract_section(evidence, "Architecture|アーキテクチャ")
```

**Extract:**
- System architecture pattern (Microservices, Monolith, etc.)
- Technology stack (frontend, backend, database)
- Architectural components
- Integration points
- Deployment architecture

### Step 2: Structure Architecture Design

**1.1 システムアーキテクチャ概要 / System Architecture Overview**
- High-level architecture pattern
- Key architectural decisions
- Architecture principles

**1.2 レイヤー構成 / Layer Structure**
- Presentation Layer (Frontend)
- Application Layer (Backend)
- Data Layer (Database)
- Integration Layer (APIs, Services)

**1.3 技術スタック / Technology Stack**
- Frontend technologies
- Backend technologies
- Database technologies
- Infrastructure/DevOps

**1.4 デプロイメントアーキテクチャ / Deployment Architecture**
- Deployment model (Cloud, On-premise, Hybrid)
- Scalability considerations
- High availability setup

**1.5 統合ポイント / Integration Points**
- Internal system integrations
- External system integrations
- API gateways
- Message queues

### Step 3: Map Requirements to Architecture

**Requirement Traceability:**
- Functional requirements → Architectural components
- Non-functional requirements → Architecture patterns
- Constraints → Technology choices

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] Architecture pattern from evidence?
- [ ] Technology stack from evidence/constraints?
- [ ] Integration points from SRS dependencies?
- [ ] All components justified by requirements?
- [ ] No assumed architecture decisions?

**Q2: Consistency?**
- [ ] Aligns with SRS functional requirements?
- [ ] Satisfies SRS non-functional requirements?
- [ ] Compatible with SRS constraints?
- [ ] Technology stack matches project standards?
- [ ] No conflicts with overall system architecture?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] Headers bilingual (日本語 / Vietnamese)?
- [ ] Architecture descriptions bilingual?
- [ ] Component descriptions bilingual?
- [ ] Technical terms in English?
- [ ] Diagrams have bilingual labels?

**Q4: No Prohibited Content?**
- [ ] No detailed implementation code?
- [ ] No SQL queries (schema only)?
- [ ] No specific algorithms (high-level only)?
- [ ] No vendor-specific configs (unless required)?
- [ ] Architecture-level design only?

---

## Output Template

```markdown
## 1. アーキテクチャ設計 / Thiết kế kiến trúc (Architecture Design)

### 1.1 システムアーキテクチャ概要 / Tổng quan kiến trúc hệ thống

**アーキテクチャパターン / Architecture Pattern:**
[Pattern name - e.g., Microservices, Layered Architecture]

**概要 / Overview:**

[Japanese description of overall architecture]

[Vietnamese description of overall architecture]

**主要なアーキテクチャ決定 / Key Architectural Decisions:**

| 決定事項 / Decision | 理由 / Rationale | 代替案 / Alternative | トレードオフ / Trade-off |
|-----------------|---------------|----------------|-------------------|
| [Decision 1 JP/VN] | [Rationale JP/VN] | [Alternative JP/VN] | [Trade-off JP/VN] |
| [Decision 2 JP/VN] | [Rationale JP/VN] | [Alternative JP/VN] | [Trade-off JP/VN] |

**アーキテクチャ原則 / Architecture Principles:**
- [Principle 1 JP] / [Principle 1 VN]
- [Principle 2 JP] / [Principle 2 VN]
- [Principle 3 JP] / [Principle 3 VN]

---

### 1.2 レイヤー構成 / Cấu trúc lớp (Layer Structure)

```
┌─────────────────────────────────────────┐
│  Presentation Layer / Tầng giao diện    │
│  [Frontend technologies]                │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│  Application Layer / Tầng ứng dụng      │
│  [Backend services]                     │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│  Data Layer / Tầng dữ liệu              │
│  [Database systems]                     │
└─────────────────────────────────────────┘
```

#### 1.2.1 プレゼンテーション層 / Presentation Layer

**役割 / Responsibility:**
[Role description in Japanese]
[Role description in Vietnamese]

**技術 / Technologies:**
- **Framework**: [Framework name and version]
- **UI Library**: [UI library]
- **State Management**: [State management solution]
- **Styling**: [Styling approach]

**主要コンポーネント / Key Components:**
- [Component 1 JP] / [Component 1 VN]: [Description]
- [Component 2 JP] / [Component 2 VN]: [Description]

---

#### 1.2.2 アプリケーション層 / Application Layer

**役割 / Responsibility:**
[Role description in Japanese]
[Role description in Vietnamese]

**技術 / Technologies:**
- **Framework**: [Framework name and version]
- **Language**: [Programming language]
- **Runtime**: [Runtime environment]

**主要コンポーネント / Key Components:**
- [Service 1 JP] / [Service 1 VN]: [Description]
- [Service 2 JP] / [Service 2 VN]: [Description]

**設計パターン / Design Patterns:**
- [Pattern 1 JP] / [Pattern 1 VN]
- [Pattern 2 JP] / [Pattern 2 VN]

---

#### 1.2.3 データ層 / Data Layer

**役割 / Responsibility:**
[Role description in Japanese]
[Role description in Vietnamese]

**技術 / Technologies:**
- **Database**: [Database name and version]
- **ORM**: [ORM if applicable]
- **Cache**: [Caching solution]

**データストア / Data Stores:**
- [Data store 1 JP] / [Data store 1 VN]: [Purpose]
- [Data store 2 JP] / [Data store 2 VN]: [Purpose]

---

### 1.3 技術スタック / Technology Stack

#### 1.3.1 フロントエンド / Frontend

| カテゴリ / Category | 技術 / Technology | バージョン / Version | 用途 / Purpose |
|-----------------|---------------|------------------|------------|
| Framework | [Framework] | [Version] | [Purpose JP/VN] |
| UI Library | [Library] | [Version] | [Purpose JP/VN] |
| Language | [Language] | [Version] | [Purpose JP/VN] |
| Build Tool | [Tool] | [Version] | [Purpose JP/VN] |

---

#### 1.3.2 バックエンド / Backend

| カテゴリ / Category | 技術 / Technology | バージョン / Version | 用途 / Purpose |
|-----------------|---------------|------------------|------------|
| Framework | [Framework] | [Version] | [Purpose JP/VN] |
| Language | [Language] | [Version] | [Purpose JP/VN] |
| Runtime | [Runtime] | [Version] | [Purpose JP/VN] |

---

#### 1.3.3 データベース / Database

| カテゴリ / Category | 技術 / Technology | バージョン / Version | 用途 / Purpose |
|-----------------|---------------|------------------|------------|
| RDBMS | [Database] | [Version] | [Purpose JP/VN] |
| Cache | [Cache] | [Version] | [Purpose JP/VN] |

---

### 1.4 デプロイメントアーキテクチャ / Kiến trúc triển khai (Deployment Architecture)

**デプロイメントモデル / Deployment Model:**
[Model description - Cloud/On-premise/Hybrid JP]
[Model description VN]

**環境構成 / Environment Configuration:**
- **開発環境 / Development**: [Configuration]
- **ステージング環境 / Staging**: [Configuration]
- **本番環境 / Production**: [Configuration]

**スケーラビリティ戦略 / Scalability Strategy:**
- [Strategy 1 JP] / [Strategy 1 VN]
- [Strategy 2 JP] / [Strategy 2 VN]

**高可用性設計 / High Availability Design:**
- [HA approach 1 JP] / [HA approach 1 VN]
- [HA approach 2 JP] / [HA approach 2 VN]

---

### 1.5 統合ポイント / Điểm tích hợp (Integration Points)

#### 1.5.1 内部システム統合 / Internal System Integration

| システム / System | 統合方式 / Method | プロトコル / Protocol | データ形式 / Format | 目的 / Purpose |
|---------------|---------------|------------------|----------------|------------|
| [System 1] | [Method] | [Protocol] | [Format] | [Purpose JP/VN] |
| [System 2] | [Method] | [Protocol] | [Format] | [Purpose JP/VN] |

---

#### 1.5.2 外部システム統合 / External System Integration

| システム / System | 統合方式 / Method | プロトコル / Protocol | データ形式 / Format | 目的 / Purpose |
|---------------|---------------|------------------|----------------|------------|
| [External 1] | [Method] | [Protocol] | [Format] | [Purpose JP/VN] |

---

### 1.6 アーキテクチャ図 / Architecture Diagram

**システムコンテキスト図 / System Context Diagram:**

```
[High-level system context diagram in text or reference to diagram file]

Note: ユーザー / User → Frontend → Backend → Database
      Bilingual labels in diagram / Nhãn song ngữ trong sơ đồ
```

**コンポーネント図 / Component Diagram:**

```
[Component interaction diagram]
```

---

### 1.7 要件トレーサビリティ / Requirements Traceability

| 要件ID / Req ID | 要件名 / Req Name | アーキテクチャコンポーネント / Component | 設計決定 / Design Decision |
|--------------|---------------|---------------------------|---------------------|
| FR-[CODE]-001 | [Requirement] | [Component] | [Decision JP/VN] |
| NFR-PERF-[CODE]-001 | [Requirement] | [Component] | [Decision JP/VN] |

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- SRS Reference: `[srs_file_path]`
- Sections: Architecture, Technology Stack, Integration, Deployment
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Example Output

```markdown
## 1. アーキテクチャ設計 / Thiết kế kiến trúc (Architecture Design)

### 1.1 システムアーキテクチャ概要 / Tổng quan kiến trúc hệ thống

**アーキテクチャパターン / Architecture Pattern:**
Layered Architecture with Microservices

**概要 / Overview:**

ワークフロー設計機能は、レイヤードアーキテクチャパターンに基づき、フロントエンド（Next.js）、バックエンド（Spring Boot）、データベース（PostgreSQL）の3層構造で設計されています。マイクロサービスアーキテクチャの原則に従い、User Management ServiceやNotification Serviceと疎結合で統合します。

Chức năng thiết kế workflow được thiết kế theo mô hình Layered Architecture với 3 tầng: Frontend (Next.js), Backend (Spring Boot), và Database (PostgreSQL). Tuân theo nguyên tắc kiến trúc microservices, tích hợp lỏng lẻo với User Management Service và Notification Service.

**主要なアーキテクチャ決定 / Key Architectural Decisions:**

| 決定事項 / Decision | 理由 / Rationale | 代替案 / Alternative | トレードオフ / Trade-off |
|-----------------|---------------|----------------|-------------------|
| Next.js 15 App Router / Sử dụng Next.js 15 App Router | Server Componentsでパフォーマンス向上 / Cải thiện hiệu năng với Server Components | Pages Router | 学習曲線あり / Có đường cong học tập |
| PostgreSQL JSONB / Sử dụng PostgreSQL JSONB | ワークフロー定義の柔軟な保存 / Lưu trữ linh hoạt định nghĩa workflow | NoSQL database | ACID保証とスキーマ検証のバランス / Cân bằng ACID và validation |
| React Flow library / Thư viện React Flow | 成熟したワークフロー描画機能 / Chức năng vẽ workflow trưởng thành | カスタム実装 / Tự triển khai | ライブラリ依存 / Phụ thuộc thư viện |

**アーキテクチャ原則 / Architecture Principles:**
- 関心の分離 (Separation of Concerns) / Tách biệt quan tâm
- 疎結合・高凝集 (Loose Coupling, High Cohesion) / Liên kết lỏng, tính gắn kết cao
- 再利用性と拡張性 (Reusability and Scalability) / Khả năng tái sử dụng và mở rộng

---

### 1.2 レイヤー構成 / Cấu trúc lớp (Layer Structure)

```
┌──────────────────────────────────────────────────┐
│  Presentation Layer / Tầng giao diện             │
│  Next.js 15.3.0 + React 19 + TypeScript 5       │
└──────────────────────────────────────────────────┘
                        ↕ REST API / GraphQL
┌──────────────────────────────────────────────────┐
│  Application Layer / Tầng ứng dụng               │
│  Spring Boot 3.4.4 + Java 21                    │
└──────────────────────────────────────────────────┘
                        ↕ JPA/Hibernate
┌──────────────────────────────────────────────────┐
│  Data Layer / Tầng dữ liệu                       │
│  PostgreSQL 14+ + Redis                         │
└──────────────────────────────────────────────────┘
```

#### 1.2.1 プレゼンテーション層 / Presentation Layer

**役割 / Responsibility:**
ユーザーインターフェースの提供とユーザー操作の処理を担当します。ワークフロー設計のビジュアルエディタを提供し、ドラッグ&ドロップ操作を実現します。

Cung cấp giao diện người dùng và xử lý thao tác. Cung cấp trình soạn thảo trực quan cho thiết kế workflow, thực hiện thao tác kéo thả.

**技術 / Technologies:**
- **Framework**: Next.js 15.3.0 (App Router)
- **UI Library**: React 19 (Server Components優先)
- **State Management**: React Context API + Zustand
- **Styling**: TailwindCSS 3.x

**主要コンポーネント / Key Components:**
- ワークフローキャンバス / Workflow Canvas: ドラッグ&ドロップエディタ
- ノードパレット / Node Palette: 利用可能なノード一覧
- プロパティパネル / Property Panel: ノード設定編集

---

#### 1.2.2 アプリケーション層 / Application Layer

**役割 / Responsibility:**
ビジネスロジックの実装、ワークフロー定義の管理、他サービスとの統合を担当します。

Triển khai business logic, quản lý định nghĩa workflow, tích hợp với các service khác.

**技術 / Technologies:**
- **Framework**: Spring Boot 3.4.4
- **Language**: Java 21
- **Runtime**: JVM 21

**主要コンポーネント / Key Components:**
- ワークフロー管理サービス / Workflow Management Service: CRUD操作
- バリデーションサービス / Validation Service: ワークフロー検証
- 統合サービス / Integration Service: 外部サービス連携

**設計パターン / Design Patterns:**
- DDD (Domain-Driven Design) / Thiết kế hướng miền
- Repository Pattern / Mẫu Repository
- Service Layer Pattern / Mẫu tầng dịch vụ

---

#### 1.2.3 データ層 / Data Layer

**役割 / Responsibility:**
ワークフロー定義、メタデータ、実行履歴の永続化を担当します。

Lưu trữ định nghĩa workflow, metadata và lịch sử thực thi.

**技術 / Technologies:**
- **Database**: PostgreSQL 14+
- **ORM**: Hibernate 6.x (JPA 3.0)
- **Cache**: Redis 7.x

**データストア / Data Stores:**
- PostgreSQL: ワークフロー定義(JSONB)、メタデータ / Định nghĩa workflow (JSONB), metadata
- Redis: セッションキャッシュ、一時データ / Cache session, dữ liệu tạm

---

### 1.3 技術スタック / Technology Stack

#### 1.3.1 フロントエンド / Frontend

| カテゴリ / Category | 技術 / Technology | バージョン / Version | 用途 / Purpose |
|-----------------|---------------|------------------|------------|
| Framework | Next.js | 15.3.0 | SSR/SSG フレームワーク / Framework SSR/SSG |
| UI Library | React | 19 | UIコンポーネント / UI components |
| Language | TypeScript | 5 | 型安全開発 / Type-safe development |
| Build Tool | Turbopack | - | 高速ビルド / Fast build |
| Workflow Library | React Flow | 11.10.0 | ワークフロー図描画 / Vẽ sơ đồ workflow |

---

#### 1.3.2 バックエンド / Backend

| カテゴリ / Category | 技術 / Technology | バージョン / Version | 用途 / Purpose |
|-----------------|---------------|------------------|------------|
| Framework | Spring Boot | 3.4.4 | バックエンドフレームワーク / Backend framework |
| Language | Java | 21 | プログラミング言語 / Programming language |
| Runtime | JVM | 21 | 実行環境 / Runtime environment |
| API | Spring Web | 6.x | RESTful API |

---

#### 1.3.3 データベース / Database

| カテゴリ / Category | 技術 / Technology | バージョン / Version | 用途 / Purpose |
|-----------------|---------------|------------------|------------|
| RDBMS | PostgreSQL | 14+ | メインデータベース / Main database |
| Cache | Redis | 7.x | キャッシング / Caching |

---

### 1.4 デプロイメントアーキテクチャ / Kiến trúc triển khai (Deployment Architecture)

**デプロイメントモデル / Deployment Model:**
クラウドネイティブデプロイメント（Kubernetes on AWS/GCP）
Triển khai cloud-native (Kubernetes trên AWS/GCP)

**環境構成 / Environment Configuration:**
- **開発環境 / Development**: Docker Compose (ローカル / local)
- **ステージング環境 / Staging**: Kubernetes cluster (1 pod/service)
- **本番環境 / Production**: Kubernetes cluster (3+ pods/service)

**スケーラビリティ戦略 / Scalability Strategy:**
- 水平スケーリング (Horizontal Pod Autoscaler) / Mở rộng ngang
- 負荷分散 (Load Balancer) / Cân bằng tải

**高可用性設計 / High Availability Design:**
- マルチAZ配置 / Triển khai đa AZ
- データベースレプリケーション / Sao chép database

---

### 1.5 統合ポイント / Điểm tích hợp (Integration Points)

#### 1.5.1 内部システム統合 / Internal System Integration

| システム / System | 統合方式 / Method | プロトコル / Protocol | データ形式 / Format | 目的 / Purpose |
|---------------|---------------|------------------|----------------|------------|
| User Management Service | REST API | HTTPS | JSON | 認証・認可 / Xác thực, phân quyền |
| Notification Service | Message Queue | Kafka | JSON | 通知送信 / Gửi thông báo |

---

#### 1.5.2 外部システム統合 / External System Integration

| システム / System | 統合方式 / Method | プロトコル / Protocol | データ形式 / Format | 目的 / Purpose |
|---------------|---------------|------------------|----------------|------------|
| Keycloak | OAuth 2.0/OIDC | HTTPS | JWT | SSO認証 / Xác thực SSO |

---

### 1.6 アーキテクチャ図 / Architecture Diagram

**システムコンテキスト図 / System Context Diagram:**

```
[User/ユーザー/Người dùng]
        ↓
[Next.js Frontend]
        ↓
[API Gateway]
        ↓
[Spring Boot Backend] ←→ [User Mgmt Service]
        ↓                       ↓
[PostgreSQL]              [Notification Service]
```

---

### 1.7 要件トレーサビリティ / Requirements Traceability

| 要件ID / Req ID | 要件名 / Req Name | アーキテクチャコンポーネント / Component | 設計決定 / Design Decision |
|--------------|---------------|---------------------------|---------------------|
| FR-CMN015002-001 | ドラッグ&ドロップ | React Flow + Canvas | クライアントサイド描画 / Vẽ phía client |
| NFR-PERF-CMN015002-001 | レスポンス500ms | Server Components | SSR最適化 / Tối ưu SSR |

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `.claude/memory-bank/evidence/CMN015002_workflow_designer.md`
- SRS Reference: `/docs/srs/SRS-CMN015002-20251220.md`
- Sections: Architecture, Technology Stack, Integration
- Extracted: 2025-12-20 11:10:00

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] Architecture pattern from evidence/SRS
2. [ ] Technology stack matches constraints
3. [ ] All layers clearly defined
4. [ ] Integration points identified
5. [ ] Requirements mapped to components
6. [ ] Bilingual format ≥60% of content
7. [ ] No implementation code
8. [ ] Architecture diagrams included (text-based OK)
9. [ ] Evidence sources cited

**Validation Commands:**
```bash
# Verify bilingual headers
grep -c " / " output.md

# Count architecture components
grep -c "####" output.md
```

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: BD Section 1 - Architecture Design*
