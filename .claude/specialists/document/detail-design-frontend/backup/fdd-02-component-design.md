# Component Design Micro-Agent / コンポーネント設計マイクロエージェント / Micro-Agent Thiết kế Component

**Responsibility / 責任 / Trách nhiệm**: Generate component interfaces, props definitions, and component hierarchy
**Output Lines / 出力行数 / Số dòng đầu ra**: ~150-200 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (UI components), BD (component architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C2

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** / エビデンスファイルパス / Đường dẫn tệp bằng chứng
   - Contains UI component requirements and interactions

2. **SRS File Path** / SRSファイルパス / Đường dẫn tệp SRS
   - Contains component specifications and UI requirements
   - Section: UI components, user interactions

3. **Basic Design File Path** / 基本設計ファイルパス / Đường dẫn tệp Thiết kế Cơ bản
   - Contains component architecture and design patterns
   - Section: Component structure, reusability strategy

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1: Load Context / コンテキスト読み込み / Tải ngữ cảnh

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
basic_design = read_file(basic_design_file_path)

# Extract component information
ui_components = extract_components(srs, section="UI Components")
component_interactions = extract_interactions(evidence)
architecture_patterns = extract_patterns(basic_design, section="Component Architecture")
```

### Step 2: Extract Requirements / 要件抽出 / Trích xuất yêu cầu

```pseudocode
# Extract component hierarchy
component_tree = build_component_tree(ui_components, architecture_patterns)

# Categorize components
components_by_type = {
    "layout": [],      # Layout components
    "container": [],   # Container/smart components
    "presentational": [], # Presentational/dumb components
    "form": [],        # Form components
    "common": []       # Common/shared components
}

FOR each component in ui_components:
    type = determine_component_type(component, architecture_patterns)
    components_by_type[type].append(component)
END FOR

# Extract props requirements
props_requirements = extract_props_for_each_component(ui_components, srs)
```

### Step 3: Generate Design / 設計生成 / Tạo thiết kế

```pseudocode
# Generate component interfaces
component_interfaces = []

FOR each component in ui_components:
    interface = generate_component_interface(
        name=component.name,
        props=determine_props(component, props_requirements),
        component_type=component.type,
        is_client=requires_client_component(component),
        children=component.children
    )
    component_interfaces.append(interface)
END FOR

# Generate props type definitions
props_types = []

FOR each component in ui_components:
    props_type = generate_props_interface(
        component_name=component.name,
        required_props=component.required_props,
        optional_props=component.optional_props,
        event_handlers=component.events
    )
    props_types.append(props_type)
END FOR

# Generate composition patterns
composition_examples = generate_composition_patterns(component_tree)

# Combine into output
output = {
    "component_hierarchy": component_tree,
    "component_interfaces": component_interfaces,
    "props_definitions": props_types,
    "composition_patterns": composition_examples
}
```

### Step 4: Validate Output (Q1-Q4) / 出力検証 / Xác thực đầu ra

#### Q1: Traceable to SRS/BD? / SRS/BDに追跡可能か？ / Có truy xuất được đến SRS/BD không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] Each component maps to SRS UI component specification?
- [ ] Component architecture follows BD patterns?
- [ ] Props match SRS functional requirements?
- [ ] No orphan components without SRS reference?

```pseudocode
FOR each component in component_interfaces:
    ASSERT exists_in_srs(component.name, srs)
    ASSERT follows_bd_architecture(component, architecture_patterns)
    ASSERT props_match_requirements(component.props, srs)
END FOR

ASSERT no_orphan_components(component_interfaces, srs)
```

#### Q2: Implementation Details Correct? / 実装詳細は正しいか？ / Chi tiết triển khai đúng không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] Component interfaces use React 19 conventions?
- [ ] Props use correct TypeScript types?
- [ ] Client/Server component distinction clear?
- [ ] Event handlers typed correctly?

```pseudocode
FOR each component in component_interfaces:
    ASSERT uses_react_19_conventions(component)
    ASSERT has_typescript_props(component)
    ASSERT client_server_marked_correctly(component)

    FOR each event_handler in component.events:
        ASSERT event_handler_typed_correctly(event_handler)
    END FOR
END FOR
```

#### Q3: Japanese + Vietnamese ≥60%? / 日本語+ベトナム語≥60%か？ / Tiếng Nhật + tiếng Việt ≥60% không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] All section headers bilingual?
- [ ] Component names with Japanese + Vietnamese descriptions?
- [ ] Props descriptions bilingual?
- [ ] Combined JP+VN ≥60%?

```pseudocode
content = serialize_output(output)
bilingual_ratio = calculate_bilingual_ratio(content)

ASSERT bilingual_ratio >= 60
ASSERT all_component_descriptions_trilingual(component_interfaces)
ASSERT all_headers_bilingual(content)
```

#### Q4: Interfaces Only (No Implementation)? / インターフェースのみ（実装なし）か？ / Chỉ interface (không có implementation) không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] Only TypeScript interfaces and type definitions?
- [ ] No component implementations?
- [ ] No JSX logic?
- [ ] Only signatures and types?

```pseudocode
code_blocks = extract_code_blocks(output)

FOR each code_block in code_blocks:
    ASSERT is_interface_or_type_definition(code_block)
    ASSERT NOT contains_component_implementation(code_block)
    ASSERT NOT contains_jsx_logic(code_block)
    ASSERT only_type_signatures(code_block)
END FOR
```

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 2. コンポーネント設計 / Thiết kế Component (Component Design)

### 2.1 コンポーネント階層 / Cấu trúc phân cấp Component (Component Hierarchy)

```
WorkflowDesigner/                    # ワークフローデザイナー / Trình thiết kế Workflow
├── WorkflowCanvas/                  # キャンバスコンテナ / Container canvas
│   ├── NodePalette/                 # ノードパレット / Bảng chọn node
│   │   ├── NodeCategory/            # カテゴリ / Danh mục
│   │   └── NodeItem/                # ノード項目 / Mục node
│   ├── CanvasArea/                  # 描画エリア / Khu vực vẽ
│   │   ├── WorkflowNode/            # ワークフローノード / Node workflow
│   │   ├── ConnectionLine/          # 接続線 / Đường kết nối
│   │   └── GridBackground/          # グリッド背景 / Nền lưới
│   └── PropertiesPanel/             # プロパティパネル / Bảng thuộc tính
│       ├── NodeProperties/          # ノードプロパティ / Thuộc tính node
│       └── ConnectionProperties/    # 接続プロパティ / Thuộc tính kết nối
└── WorkflowToolbar/                 # ツールバー / Thanh công cụ
    ├── ActionButtons/               # アクションボタン / Nút hành động
    └── ViewControls/                # 表示制御 / Điều khiển hiển thị
```

### 2.2 コンポーネントインターフェース / Giao diện Component (Component Interfaces)

#### WorkflowCanvas Component / ワークフローキャンバスコンポーネント / Component Canvas Workflow

```typescript
// Traceability: SRS-3.3.1, BD-4.2.1
interface WorkflowCanvasProps {
  workflowId: string;                          // ワークフローID / ID Workflow
  nodes: WorkflowNode[];                       // ノード配列 / Mảng node
  connections: WorkflowConnection[];           // 接続配列 / Mảng kết nối
  readonly?: boolean;                          // 読み取り専用 / Chỉ đọc
  onNodeAdd?: (node: WorkflowNode) => void;    // ノード追加イベント / Sự kiện thêm node
  onNodeUpdate?: (node: WorkflowNode) => void; // ノード更新イベント / Sự kiện cập nhật node
  onNodeDelete?: (nodeId: string) => void;     // ノード削除イベント / Sự kiện xóa node
  onConnectionAdd?: (connection: WorkflowConnection) => void;
  onConnectionDelete?: (connectionId: string) => void;
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  // Client Component - Interface only
}
```

#### NodePalette Component / ノードパレットコンポーネント / Component Bảng chọn Node

```typescript
// Traceability: SRS-3.3.2, BD-4.2.2
interface NodePaletteProps {
  categories: NodeCategory[];                  // カテゴリ配列 / Mảng danh mục
  collapsed?: boolean;                         // 折りたたみ状態 / Trạng thái thu gọn
  onNodeDragStart?: (nodeType: string) => void; // ドラッグ開始 / Bắt đầu kéo
  onNodeDragEnd?: () => void;                  // ドラッグ終了 / Kết thúc kéo
}

export function NodePalette(props: NodePaletteProps) {
  // Client Component - Interface only
}
```

#### WorkflowNode Component / ワークフローノードコンポーネント / Component Node Workflow

```typescript
// Traceability: SRS-3.3.3, BD-4.2.3
interface WorkflowNodeProps {
  id: string;                                  // ノードID / ID node
  type: NodeType;                              // ノードタイプ / Loại node
  position: { x: number; y: number };          // 座標 / Tọa độ
  data: NodeData;                              // ノードデータ / Dữ liệu node
  selected?: boolean;                          // 選択状態 / Trạng thái chọn
  readonly?: boolean;                          // 読み取り専用 / Chỉ đọc
  onSelect?: (id: string) => void;             // 選択イベント / Sự kiện chọn
  onPositionChange?: (id: string, position: Position) => void;
  onDataChange?: (id: string, data: NodeData) => void;
}

export function WorkflowNode(props: WorkflowNodeProps) {
  // Client Component - Interface only
}
```

#### PropertiesPanel Component / プロパティパネルコンポーネント / Component Bảng Thuộc tính

```typescript
// Traceability: SRS-3.3.4, BD-4.2.4
interface PropertiesPanelProps {
  selectedNodeId?: string | null;              // 選択ノードID / ID node đã chọn
  selectedConnectionId?: string | null;        // 選択接続ID / ID kết nối đã chọn
  nodeData?: NodeData;                         // ノードデータ / Dữ liệu node
  connectionData?: ConnectionData;             // 接続データ / Dữ liệu kết nối
  onPropertyChange?: (property: string, value: any) => void;
  onClose?: () => void;                        // 閉じるイベント / Sự kiện đóng
}

export function PropertiesPanel(props: PropertiesPanelProps) {
  // Client Component - Interface only
}
```

### 2.3 型定義 / Định nghĩa Kiểu (Type Definitions)

#### Node Types / ノードタイプ / Kiểu Node

```typescript
// Traceability: SRS-3.4.1, BD-4.3.1
type NodeType =
  | 'start'                                    // 開始ノード / Node bắt đầu
  | 'end'                                      // 終了ノード / Node kết thúc
  | 'task'                                     // タスクノード / Node nhiệm vụ
  | 'approval'                                 // 承認ノード / Node phê duyệt
  | 'condition'                                // 条件分岐ノード / Node điều kiện
  | 'parallel';                                // 並列処理ノード / Node xử lý song song

interface NodeData {
  label: string;                               // ノードラベル / Nhãn node
  description?: string;                        // 説明 / Mô tả
  config: Record<string, any>;                 // 設定 / Cấu hình
  validation?: ValidationRule[];               // 検証ルール / Quy tắc xác thực
}

interface Position {
  x: number;                                   // X座標 / Tọa độ X
  y: number;                                   // Y座標 / Tọa độ Y
}

interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}
```

#### Connection Types / 接続タイプ / Kiểu Kết nối

```typescript
// Traceability: SRS-3.4.2, BD-4.3.2
interface WorkflowConnection {
  id: string;                                  // 接続ID / ID kết nối
  sourceNodeId: string;                        // 接続元ノードID / ID node nguồn
  targetNodeId: string;                        // 接続先ノードID / ID node đích
  sourceHandle?: string;                       // 接続元ハンドル / Handle nguồn
  targetHandle?: string;                       // 接続先ハンドル / Handle đích
  label?: string;                              // ラベル / Nhãn
  condition?: string;                          // 条件式 / Biểu thức điều kiện
}

interface ConnectionData {
  label?: string;
  condition?: string;
  priority?: number;                           // 優先度 / Độ ưu tiên
}
```

### 2.4 コンポーネント合成パターン / Mẫu Kết hợp Component (Composition Patterns)

#### Container-Presenter Pattern / コンテナ・プレゼンターパターン / Mẫu Container-Presenter

```typescript
// Traceability: BD-4.4.1
// Container (Smart Component)
interface WorkflowDesignerContainerProps {
  workflowId: string;
}

export function WorkflowDesignerContainer(props: WorkflowDesignerContainerProps) {
  // Fetches data, handles state
  // Interface only
}

// Presenter (Dumb Component)
interface WorkflowDesignerPresenterProps {
  workflow: Workflow;
  onSave: (workflow: Workflow) => void;
  onCancel: () => void;
}

export function WorkflowDesignerPresenter(props: WorkflowDesignerPresenterProps) {
  // Pure presentation
  // Interface only
}
```

---

**Checkpoint C2 Validation / チェックポイントC2検証 / Xác thực điểm kiểm tra C2**: ✓
```

---

## Example Output / 出力例 / Ví dụ đầu ra

```markdown
## 2. コンポーネント設計 / Thiết kế Component (Component Design)

**機能 / Tính năng / Feature**: CMN015002 - ワークフローデザイナー / Trình thiết kế Workflow / Workflow Designer

### 2.1 主要コンポーネント一覧 / Danh sách Component Chính (Main Components)

| コンポーネント名 / Tên Component | タイプ / Loại | 説明 / Mô tả / Description | トレーサビリティ / Traceability |
|------------------------|------------|----------------------|---------------------|
| WorkflowCanvas | Container | ワークフロー編集キャンバス / Canvas chỉnh sửa workflow / Workflow edit canvas | SRS-3.3.1, BD-4.2.1 |
| NodePalette | Presentational | ノード選択パレット / Bảng chọn node / Node selection palette | SRS-3.3.2, BD-4.2.2 |
| WorkflowNode | Presentational | ワークフローノード / Node workflow / Workflow node | SRS-3.3.3, BD-4.2.3 |
| PropertiesPanel | Container | プロパティ編集パネル / Bảng chỉnh sửa thuộc tính / Properties edit panel | SRS-3.3.4, BD-4.2.4 |

### 2.2 WorkflowCanvas コンポーネント / Component WorkflowCanvas

```typescript
// Traceability: SRS-3.3.1, BD-4.2.1
// Client Component (requires drag-and-drop interaction)
'use client';

interface WorkflowCanvasProps {
  workflowId: string;                          // ワークフローID / ID Workflow
  initialNodes?: WorkflowNode[];               // 初期ノード / Node ban đầu
  initialConnections?: WorkflowConnection[];   // 初期接続 / Kết nối ban đầu
  readonly?: boolean;                          // 読み取り専用モード / Chế độ chỉ đọc

  // Event Handlers / イベントハンドラ / Xử lý sự kiện
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onConnectionsChange?: (connections: WorkflowConnection[]) => void;
  onSave?: (workflow: WorkflowData) => Promise<void>;
  onValidate?: (workflow: WorkflowData) => ValidationResult;
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  // Interface only - no implementation
}
```

---

**Checkpoint C2 Validation / チェックポイントC2検証 / Xác thực điểm kiểm tra C2**: ✓

**Traceability / トレーサビリティ / Khả năng truy xuất**:
- SRS: Sections 3.3.1-3.3.4 (Component specifications)
- BD: Sections 4.2.1-4.2.4 (Component architecture)
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] All components traced to SRS specifications
2. [ ] Component interfaces use React 19 and TypeScript 5 conventions
3. [ ] Props definitions complete with bilingual descriptions
4. [ ] Client/Server component distinction clear
5. [ ] Event handlers properly typed
6. [ ] Bilingual format (Japanese + Vietnamese ≥60%)
7. [ ] No implementation code (interfaces only)
8. [ ] Checkpoint C2 validation marker present
9. [ ] Traceability references included

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Component Interface and Type Definition Generation*
