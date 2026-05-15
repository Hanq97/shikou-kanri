# SRS Glossary Micro-Agent / 用語集マイクロエージェント

**Responsibility**: Generate Section 6 (Glossary) of SRS
**Output Lines**: 40-60 lines
**Dependencies**: All other SRS sections (for term collection)

---

## Input Requirements

- Evidence file path (absolute)
- Feature code (e.g., "CMN015002")
- All SRS sections (for term extraction)
- Domain-specific terms (from evidence)

---

## Processing Logic

### Step 1: Load Evidence and All SRS Sections

```pseudocode
evidence = read_file(evidence_file_path)
all_terms = extract_all_terms_from_evidence(evidence)
technical_terms = extract_technical_terms()
business_terms = extract_business_terms()
acronyms = extract_acronyms()
```

**Extract:**
- Technical terms used in requirements
- Business domain terms
- Acronyms and abbreviations
- System-specific terminology
- Third-party tools/services mentioned

### Step 2: Categorize Terms

**6.1 技術用語 / Technical Terms**
- Programming languages and frameworks
- Technical concepts
- Software architecture terms
- Infrastructure terms

**6.2 ビジネス用語 / Business Terms**
- Domain-specific business terms
- Business process terms
- Industry terminology
- CRM-specific terms

**6.3 略語 / Acronyms & Abbreviations**
- Project acronyms
- Industry standard acronyms
- Organization-specific abbreviations

**6.4 システム固有用語 / System-Specific Terms**
- Feature-specific terminology
- StarX4CRM-specific terms
- Custom concepts

### Step 3: Generate Bilingual Definitions

**Format:**
- Term in original language (usually English for technical terms)
- Japanese translation/explanation
- Vietnamese translation/explanation
- Usage context if needed

**Alphabetical Order:**
- Sort by English term (for technical)
- Group by category first, then alphabetical

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] All terms used in SRS sections?
- [ ] Definitions from evidence or standard sources?
- [ ] No unnecessary terms?
- [ ] Terms consistent with usage in document?

**Q2: Consistency?**
- [ ] Term usage consistent across all SRS sections?
- [ ] Definitions align with Section 1.4 (if exists)?
- [ ] No conflicting definitions?
- [ ] Acronyms expanded correctly?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] All terms have JP/VN translations?
- [ ] Technical terms explained in both languages?
- [ ] Business terms in both languages?
- [ ] Context examples bilingual?

**Q4: No Prohibited Content?**
- [ ] No implementation code?
- [ ] No SQL queries?
- [ ] No API specifications?
- [ ] Only term definitions and explanations?

---

## Output Template

```markdown
## 6. 用語集 / Bảng thuật ngữ (Glossary)

### 6.1 技術用語 / Thuật ngữ kỹ thuật (Technical Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [Technical Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [Technical Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [Technical Term]
**日本語 / Japanese:**
[Detailed Japanese explanation with context]

**Vietnamese:**
[Detailed Vietnamese explanation with context]

**使用例 / Usage Example:**
[Example sentence in context JP] / [Example sentence VN]

---

### 6.2 ビジネス用語 / Thuật ngữ nghiệp vụ (Business Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [Business Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [Business Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [Business Term]
**日本語 / Japanese:**
[Detailed Japanese explanation]

**Vietnamese:**
[Detailed Vietnamese explanation]

**ビジネスコンテキスト / Business Context:**
[Context JP] / [Context VN]

---

### 6.3 略語 / Viết tắt (Acronyms & Abbreviations)

| 略語 / Acronym | 正式名称 / Full Form | 日本語 / Japanese | Vietnamese | 説明 / Description |
|--------------|------------------|---------------|-----------|------------------|
| [ACRONYM1] | [Full Form] | [JP translation] | [VN translation] | [Brief explanation JP/VN] |
| [ACRONYM2] | [Full Form] | [JP translation] | [VN translation] | [Brief explanation JP/VN] |

---

### 6.4 システム固有用語 / Thuật ngữ riêng của hệ thống (System-Specific Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| [System Term 1] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |
| [System Term 2] | [JP translation] | [VN translation] | [Explanation JP] / [Explanation VN] |

**詳細説明 / Detailed Explanations:**

#### [System-Specific Term]
**日本語 / Japanese:**
[Detailed explanation specific to StarX4CRM]

**Vietnamese:**
[Detailed explanation specific to StarX4CRM]

**システム内での役割 / Role in System:**
[Role description JP] / [Role description VN]

---

### 6.5 参考資料 / Tài liệu tham khảo (References)

**技術仕様 / Technical Specifications:**
- [Reference 1]
- [Reference 2]

**業界標準 / Industry Standards:**
- [Standard 1]
- [Standard 2]

**内部ドキュメント / Internal Documents:**
- [Internal doc 1]
- [Internal doc 2]

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- Sections: All SRS sections, Domain terminology
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Example Output

```markdown
## 6. 用語集 / Bảng thuật ngữ (Glossary)

### 6.1 技術用語 / Thuật ngữ kỹ thuật (Technical Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| Canvas | キャンバス | Vùng vẽ | ワークフロー図を描画する作業領域 / Vùng làm việc để vẽ sơ đồ workflow |
| Drag & Drop | ドラッグ&ドロップ | Kéo và thả | マウスでオブジェクトを移動する操作 / Thao tác di chuyển đối tượng bằng chuột |
| Node | ノード | Nút | ワークフロー内の処理単位 / Đơn vị xử lý trong workflow |
| React Flow | React Flow | React Flow | Reactベースのフロー図描画ライブラリ / Thư viện vẽ sơ đồ flow dựa trên React |
| Server Component | サーバーコンポーネント | Server Component | サーバー側でレンダリングされるReactコンポーネント / React component được render phía server |

**詳細説明 / Detailed Explanations:**

#### Node (ノード / Nút)
**日本語 / Japanese:**
ワークフロー内の個別の処理や意思決定を表す基本単位。開始ノード、処理ノード、条件分岐ノード、終了ノードなどの種類があります。各ノードは入力と出力を持ち、他のノードと接続されることで業務フローを形成します。

**Vietnamese:**
Đơn vị cơ bản đại diện cho xử lý hoặc quyết định riêng lẻ trong workflow. Có các loại như start node, process node, condition node, end node. Mỗi node có input và output, kết nối với các node khác để tạo thành luồng nghiệp vụ.

**使用例 / Usage Example:**
ユーザーは条件分岐ノードをキャンバスに配置し、承認フローを設計します。
Người dùng đặt condition node lên canvas để thiết kế luồng phê duyệt.

---

#### Canvas (キャンバス / Vùng vẽ)
**日本語 / Japanese:**
ワークフロー図を視覚的に設計するための作業領域。グリッドベースで、ノードの配置と接続を行います。ズームイン/アウト、パン操作をサポートします。

**Vietnamese:**
Vùng làm việc để thiết kế trực quan sơ đồ workflow. Dựa trên lưới, thực hiện bố trí và kết nối các node. Hỗ trợ zoom in/out và thao tác pan.

**使用例 / Usage Example:**
キャンバス上でノードをドラッグして配置します。
Kéo node để bố trí trên canvas.

---

### 6.2 ビジネス用語 / Thuật ngữ nghiệp vụ (Business Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| Approval Flow | 承認フロー | Luồng phê duyệt | 申請から承認までの業務プロセス / Quy trình nghiệp vụ từ đề xuất đến phê duyệt |
| Business Process | 業務プロセス | Quy trình nghiệp vụ | 業務活動の一連の流れ / Chuỗi hoạt động nghiệp vụ |
| Template | テンプレート | Mẫu | 事前定義されたワークフロー設計 / Thiết kế workflow được định nghĩa trước |
| Workflow | ワークフロー | Quy trình làm việc | 業務の流れを定義したもの / Định nghĩa luồng công việc |

**詳細説明 / Detailed Explanations:**

#### Approval Flow (承認フロー / Luồng phê duyệt)
**日本語 / Japanese:**
見積書や発注書などの申請書類が、担当者から上位承認者へと段階的に承認されていく業務プロセス。条件分岐により、金額や種類に応じて承認ルートが変わることがあります。

**Vietnamese:**
Quy trình nghiệp vụ mà tài liệu đề xuất như báo giá, đơn đặt hàng được phê duyệt từng bước từ người phụ trách đến người phê duyệt cấp cao hơn. Tuyến phê duyệt có thể thay đổi theo số tiền hoặc loại thông qua rẽ nhánh điều kiện.

**ビジネスコンテキスト / Business Context:**
CRMシステムでは、商談の進行や契約締結に承認フローが必要です。
Trong hệ thống CRM, cần luồng phê duyệt để tiến triển cơ hội và ký kết hợp đồng.

---

### 6.3 略語 / Viết tắt (Acronyms & Abbreviations)

| 略語 / Acronym | 正式名称 / Full Form | 日本語 / Japanese | Vietnamese | 説明 / Description |
|--------------|------------------|---------------|-----------|------------------|
| API | Application Programming Interface | アプリケーションプログラミングインターフェース | Giao diện lập trình ứng dụng | システム間のデータ連携方法 / Phương thức liên kết dữ liệu giữa hệ thống |
| BPM | Business Process Management | ビジネスプロセス管理 | Quản lý quy trình nghiệp vụ | 業務プロセスの設計・実行・監視 / Thiết kế, thực thi và giám sát quy trình |
| BPMN | Business Process Model and Notation | ビジネスプロセスモデリング表記法 | Ký hiệu mô hình quy trình | 業務プロセスを図式化する国際標準 / Tiêu chuẩn quốc tế để biểu đồ hóa quy trình |
| JWT | JSON Web Token | JSONウェブトークン | JSON Web Token | 認証情報を含むトークン形式 / Định dạng token chứa thông tin xác thực |
| RBAC | Role-Based Access Control | ロールベースアクセス制御 | Kiểm soát truy cập theo vai trò | ユーザーロールに基づく権限管理 / Quản lý quyền dựa trên vai trò |
| SRS | Software Requirements Specification | ソフトウェア要求仕様書 | Đặc tả yêu cầu phần mềm | ソフトウェア機能を定義した文書 / Tài liệu định nghĩa chức năng phần mềm |
| UI/UX | User Interface / User Experience | ユーザーインターフェース/ユーザー体験 | Giao diện / Trải nghiệm người dùng | 画面設計とユーザー体験 / Thiết kế màn hình và trải nghiệm |

---

### 6.4 システム固有用語 / Thuật ngữ riêng của hệ thống (System-Specific Terms)

| 用語 / Term | 日本語 / Japanese | Vietnamese | 説明 / Description |
|------------|---------------|-----------|------------------|
| Node Palette | ノードパレット | Bảng node | 利用可能なノードタイプ一覧 / Danh sách loại node có sẵn |
| Workflow Designer | ワークフロー設計機能 | Chức năng thiết kế workflow | StarX4CRMのワークフロー設計ツール / Công cụ thiết kế workflow của StarX4CRM |
| Workflow Engine | ワークフローエンジン | Workflow Engine | ワークフローを実行するシステム / Hệ thống thực thi workflow |

**詳細説明 / Detailed Explanations:**

#### Node Palette (ノードパレット / Bảng node)
**日本語 / Japanese:**
ワークフロー設計画面の左側に表示される、利用可能なノードタイプのリスト。開始ノード、タスクノード、条件分岐ノード、承認ノード、通知ノード、終了ノードなどが含まれます。ドラッグ&ドロップでキャンバスに配置します。

**Vietnamese:**
Danh sách các loại node có sẵn hiển thị bên trái màn hình thiết kế workflow. Bao gồm start node, task node, condition node, approval node, notification node, end node. Kéo thả để đặt lên canvas.

**システム内での役割 / Role in System:**
ワークフロー設計のUIコンポーネントとして、ユーザーがノードを選択・配置するためのツールパレット。
Component UI của thiết kế workflow, tool palette để người dùng chọn và đặt node.

---

### 6.5 参考資料 / Tài liệu tham khảo (References)

**技術仕様 / Technical Specifications:**
- React Flow Documentation: https://reactflow.dev/
- Next.js 15 Documentation: https://nextjs.org/docs
- TypeScript Documentation: https://www.typescriptlang.org/docs/

**業界標準 / Industry Standards:**
- BPMN 2.0 Specification: https://www.omg.org/spec/BPMN/
- OAuth 2.0 / OpenID Connect: https://oauth.net/2/

**内部ドキュメント / Internal Documents:**
- StarX4CRM Architecture Overview
- StarX4CRM Development Standards

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `.claude/memory-bank/evidence/CMN015002_workflow_designer.md`
- Sections: All SRS sections, Technical terminology, Business domain terms
- Extracted: 2025-12-20 11:00:00

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All terms used in SRS collected
2. [ ] Terms categorized correctly (Tech/Business/Acronym/System)
3. [ ] All terms have JP/VN translations
4. [ ] Definitions clear and concise
5. [ ] Alphabetical order within categories
6. [ ] No duplicate terms
7. [ ] Consistent with Section 1.4 (if exists)
8. [ ] Technical terms explained for non-technical readers
9. [ ] Evidence sources cited

**Validation Commands:**
```bash
# Count total terms
grep -c "^| " output.md | wc -l

# Find technical terms
grep "技術用語" -A 20 output.md

# Verify bilingual format
grep -c " / " output.md
```

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: SRS Section 6 - Glossary*
