# Glossary Micro-Agent / 用語集マイクロエージェント / Micro-Agent Bảng Thuật ngữ

**Responsibility / 責任 / Trách nhiệm**: Generate technical terms, abbreviations, and component name mappings
**Output Lines / 出力行数 / Số dòng đầu ra**: ~60-100 lines
**Dependencies / 依存関係 / Phụ thuộc**: All previous FDD sections
**Checkpoint / チェックポイント / Điểm kiểm tra**: C8

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **All FDD Sections** (fdd-01 through fdd-07) - Extract technical terms
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
| Server Component | サーバーコンポーネント | Component phía server | React component rendered on server (Next.js 15) |
| Client Component | クライアントコンポーネント | Component phía client | React component with client-side interactivity |
| App Router | アプリルーター | Bộ định tuyến App | Next.js 15 file-based routing system |
| Server Action | サーバーアクション | Action phía server | Server-side function callable from client |
| Props | プロパティ | Thuộc tính | Component properties/parameters |
| State | 状態 | Trạng thái | Component or application state |
| Hook | フック | Hook | React function for state/lifecycle management |
| Context | コンテキスト | Ngữ cảnh | React context for global state |
| Reducer | リデューサー | Reducer | State update function |
| Middleware | ミドルウェア | Middleware | Request/response processing layer |

### 8.2 コンポーネント名 / Tên Component (Component Names)

| Component | 日本語 / Japanese | Tiếng Việt / Vietnamese | Purpose |
|-----------|------------------|------------------------|---------|
| WorkflowCanvas | ワークフローキャンバス | Canvas Workflow | Main workflow editing canvas |
| NodePalette | ノードパレット | Bảng chọn Node | Node selection palette |
| WorkflowNode | ワークフローノード | Node Workflow | Individual workflow node |
| PropertiesPanel | プロパティパネル | Bảng thuộc tính | Node/connection properties editor |
| ConnectionLine | 接続線 | Đường kết nối | Visual connection between nodes |

### 8.3 略語 / Chữ viết tắt (Abbreviations)

| Abbreviation | Full Form | 日本語 / Japanese | Tiếng Việt / Vietnamese |
|--------------|-----------|------------------|------------------------|
| FDD | Frontend Detail Design | フロントエンド詳細設計 | Thiết kế Chi tiết Frontend |
| SRS | Software Requirements Specification | ソフトウェア要件仕様書 | Đặc tả Yêu cầu Phần mềm |
| BD | Basic Design | 基本設計 | Thiết kế Cơ bản |
| API | Application Programming Interface | アプリケーションプログラミングインターフェース | Giao diện Lập trình Ứng dụng |
| UI | User Interface | ユーザーインターフェース | Giao diện Người dùng |
| UX | User Experience | ユーザーエクスペリエンス | Trải nghiệm Người dùng |
| HTTP | HyperText Transfer Protocol | ハイパーテキスト転送プロトコル | Giao thức Truyền Siêu văn bản |
| REST | Representational State Transfer | 表現状態転送 | Chuyển trạng thái Biểu diễn |
| SSR | Server-Side Rendering | サーバーサイドレンダリング | Render phía Server |
| CSR | Client-Side Rendering | クライアントサイドレンダリング | Render phía Client |

### 8.4 ドメイン用語 / Thuật ngữ Miền (Domain Terms)

| Term | 日本語 / Japanese | Tiếng Việt / Vietnamese | Description |
|------|------------------|------------------------|-------------|
| Workflow | ワークフロー | Quy trình công việc | Business process definition |
| Node | ノード | Node | Workflow process step |
| Connection | 接続 | Kết nối | Flow between workflow nodes |
| Approval | 承認 | Phê duyệt | Approval decision point |
| Condition | 条件分岐 | Điều kiện | Conditional branching logic |
| Task | タスク | Nhiệm vụ | Work assignment step |

---

**Checkpoint C8 Validation / チェックポイントC8検証 / Xác thực điểm kiểm tra C8**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] All technical terms from previous sections included
2. [ ] Trilingual format (Japanese, Vietnamese, English)
3. [ ] Domain terms from SRS included
4. [ ] Component names mapped correctly
5. [ ] Abbreviations explained
6. [ ] Checkpoint C8 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Glossary Generation*
