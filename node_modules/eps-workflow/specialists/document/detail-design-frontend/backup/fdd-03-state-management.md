# State Management Micro-Agent / 状態管理マイクロエージェント / Micro-Agent Quản lý Trạng thái

**Responsibility / 責任 / Trách nhiệm**: Generate state structure, state management patterns, and data flow specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~120-150 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (user interactions), BD (state architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C3

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Contains user interaction flows and state requirements
2. **SRS File Path** - Contains functional requirements and user scenarios
3. **Basic Design File Path** - Contains state management approach and architecture

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1: Load Context / コンテキスト読み込み / Tải ngữ cảnh

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
basic_design = read_file(basic_design_file_path)

state_requirements = extract_state_requirements(evidence, srs)
architecture_approach = extract_state_management_approach(basic_design)
```

### Step 2: Extract Requirements / 要件抽出 / Trích xuất yêu cầu

```pseudocode
# Extract state domains
state_domains = categorize_state(state_requirements)
# Domains: ui, user, workflow, form, cache

# Extract state transitions
state_transitions = extract_state_transitions(evidence)

# Extract state persistence requirements
persistence_needs = extract_persistence_requirements(srs)
```

### Step 3: Generate Design / 設計生成 / Tạo thiết kế

```pseudocode
# Generate state tree structure
state_tree = build_state_tree(state_domains, architecture_approach)

# Generate state interfaces
state_interfaces = generate_state_type_definitions(state_tree)

# Generate action/mutation interfaces
actions = generate_action_interfaces(state_transitions)

# Generate state management hooks
hooks = generate_custom_hooks(state_interfaces, architecture_approach)

output = {
    "state_tree": state_tree,
    "state_interfaces": state_interfaces,
    "actions": actions,
    "hooks": hooks
}
```

### Step 4: Validate Output (Q1-Q4) / 出力検証 / Xác thực đầu ra

#### Q1: Traceable to SRS/BD? / SRS/BDに追跡可能か？ / Có truy xuất được đến SRS/BD không?

```pseudocode
FOR each state_domain in state_tree:
    ASSERT exists_in_srs(state_domain.requirements, srs)
    ASSERT follows_bd_architecture(state_domain, architecture_approach)
END FOR
```

#### Q2: Implementation Details Correct? / 実装詳細は正しいか？ / Chi tiết triển khai đúng không?

```pseudocode
ASSERT state_management_approach_matches_bd(architecture_approach)
ASSERT uses_react_19_hooks(hooks)
ASSERT typescript_interfaces_valid(state_interfaces)
```

#### Q3: Japanese + Vietnamese ≥60%? / 日本語+ベトナム語≥60%か？ / Tiếng Nhật + tiếng Việt ≥60% không?

```pseudocode
content = serialize_output(output)
bilingual_ratio = calculate_bilingual_ratio(content)
ASSERT bilingual_ratio >= 60
```

#### Q4: Interfaces Only (No Implementation)? / インターフェースのみ（実装なし）か？ / Chỉ interface (không có implementation) không?

```pseudocode
code_blocks = extract_code_blocks(output)
FOR each code_block in code_blocks:
    ASSERT is_interface_or_type_definition(code_block)
    ASSERT NOT contains_state_logic_implementation(code_block)
END FOR
```

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 3. 状態管理 / Quản lý Trạng thái (State Management)

### 3.1 状態ツリー構造 / Cấu trúc Cây Trạng thái (State Tree Structure)

```typescript
// Traceability: SRS-3.5, BD-4.5
interface AppState {
  user: UserState;           // ユーザー状態 / Trạng thái người dùng
  workflow: WorkflowState;   // ワークフロー状態 / Trạng thái workflow
  ui: UIState;               // UI状態 / Trạng thái UI
  form: FormState;           // フォーム状態 / Trạng thái form
}
```

### 3.2 状態インターフェース / Giao diện Trạng thái (State Interfaces)

#### User State / ユーザー状態 / Trạng thái Người dùng

```typescript
// Traceability: SRS-3.5.1, BD-4.5.1
interface UserState {
  profile: UserProfile | null;      // プロフィール / Hồ sơ
  permissions: Permission[];        // 権限 / Quyền
  isAuthenticated: boolean;         // 認証状態 / Trạng thái xác thực
  preferences: UserPreferences;     // 設定 / Cài đặt
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;              // 表示名 / Tên hiển thị
}

interface UserPreferences {
  language: 'ja' | 'vi' | 'en';     // 言語 / Ngôn ngữ
  theme: 'light' | 'dark';          // テーマ / Chủ đề
  notifications: boolean;            // 通知 / Thông báo
}
```

#### Workflow State / ワークフロー状態 / Trạng thái Workflow

```typescript
// Traceability: SRS-3.5.2, BD-4.5.2
interface WorkflowState {
  currentWorkflow: Workflow | null;     // 現在のワークフロー / Workflow hiện tại
  nodes: WorkflowNode[];                // ノード配列 / Mảng node
  connections: WorkflowConnection[];    // 接続配列 / Mảng kết nối
  selectedNodeId: string | null;        // 選択ノードID / ID node đã chọn
  isDirty: boolean;                     // 変更フラグ / Cờ thay đổi
  validationErrors: ValidationError[];  // 検証エラー / Lỗi xác thực
}
```

#### UI State / UI状態 / Trạng thái UI

```typescript
// Traceability: SRS-3.5.3, BD-4.5.3
interface UIState {
  sidebarCollapsed: boolean;        // サイドバー折りたたみ / Thu gọn sidebar
  modalStack: ModalConfig[];        // モーダルスタック / Ngăn xếp modal
  loading: LoadingState;            // ローディング状態 / Trạng thái loading
  notifications: Notification[];     // 通知 / Thông báo
}

interface LoadingState {
  global: boolean;                  // グローバルローディング / Loading toàn cục
  actions: Record<string, boolean>; // アクション別ローディング / Loading theo hành động
}
```

### 3.3 アクションインターフェース / Giao diện Action (Action Interfaces)

```typescript
// Traceability: SRS-3.6, BD-4.6
interface Action<T = any> {
  type: string;                     // アクションタイプ / Loại action
  payload: T;                       // ペイロード / Dữ liệu
  meta?: ActionMeta;                // メタデータ / Metadata
}

interface ActionMeta {
  timestamp: number;                // タイムスタンプ / Thời gian
  userId?: string;                  // ユーザーID / ID người dùng
  traceId?: string;                 // トレースID / ID theo dõi
}

// Workflow Actions / ワークフローアクション / Action Workflow
type WorkflowAction =
  | { type: 'WORKFLOW_LOAD'; payload: { workflowId: string } }
  | { type: 'WORKFLOW_UPDATE'; payload: { workflow: Workflow } }
  | { type: 'NODE_ADD'; payload: { node: WorkflowNode } }
  | { type: 'NODE_UPDATE'; payload: { nodeId: string; data: Partial<NodeData> } }
  | { type: 'NODE_DELETE'; payload: { nodeId: string } }
  | { type: 'CONNECTION_ADD'; payload: { connection: WorkflowConnection } }
  | { type: 'CONNECTION_DELETE'; payload: { connectionId: string } };
```

### 3.4 カスタムフック / Hook Tùy chỉnh (Custom Hooks)

```typescript
// Traceability: SRS-3.7, BD-4.7
// Workflow State Hook
interface UseWorkflowReturn {
  workflow: Workflow | null;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, data: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  addConnection: (connection: WorkflowConnection) => void;
  deleteConnection: (connectionId: string) => void;
  saveWorkflow: () => Promise<void>;
  validateWorkflow: () => ValidationResult;
}

function useWorkflow(workflowId: string): UseWorkflowReturn;

// UI State Hook
interface UseUIStateReturn {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
  showNotification: (notification: Notification) => void;
}

function useUIState(): UseUIStateReturn;
```

---

**Checkpoint C3 Validation / チェックポイントC3検証 / Xác thực điểm kiểm tra C3**: ✓
```

---

## Example Output / 出力例 / Ví dụ đầu ra

```markdown
## 3. 状態管理 / Quản lý Trạng thái (State Management)

**機能 / Tính năng / Feature**: CMN015002 - ワークフローデザイナー / Trình thiết kế Workflow

**状態管理アプローチ / Phương pháp Quản lý Trạng thái / State Management Approach**: React Context + useReducer (Traceability: BD-4.5)

### 3.1 ワークフロー状態 / Trạng thái Workflow (Workflow State)

```typescript
// Traceability: SRS-3.5.2, BD-4.5.2
interface WorkflowState {
  currentWorkflow: Workflow | null;     // 現在編集中のワークフロー / Workflow đang chỉnh sửa
  nodes: WorkflowNode[];                // ノード配列 / Mảng các node
  connections: WorkflowConnection[];    // 接続配列 / Mảng kết nối
  selectedNodeId: string | null;        // 選択中のノードID / ID node đang chọn
  clipboard: ClipboardData | null;      // クリップボード / Bộ nhớ tạm
  history: WorkflowHistory;             // 履歴管理（Undo/Redo） / Quản lý lịch sử (Undo/Redo)
  isDirty: boolean;                     // 未保存の変更あり / Có thay đổi chưa lưu
  validationErrors: ValidationError[];  // 検証エラー / Lỗi xác thực
}

interface WorkflowHistory {
  past: WorkflowSnapshot[];             // 過去の状態 / Trạng thái quá khứ
  future: WorkflowSnapshot[];           // 未来の状態（Redo用） / Trạng thái tương lai (cho Redo)
  maxSize: number;                      // 最大履歴サイズ / Kích thước lịch sử tối đa
}
```

### 3.2 useWorkflowDesigner フック / Hook useWorkflowDesigner

```typescript
// Traceability: SRS-3.7.1, BD-4.7.1
interface UseWorkflowDesignerReturn {
  // State / 状態 / Trạng thái
  workflow: Workflow | null;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  selectedNodeId: string | null;
  isDirty: boolean;
  validationErrors: ValidationError[];

  // Actions / アクション / Hành động
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  addConnection: (connection: WorkflowConnection) => void;
  deleteConnection: (connectionId: string) => void;

  // History / 履歴 / Lịch sử
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Persistence / 永続化 / Lưu trữ
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (workflowId: string) => Promise<void>;
  validateWorkflow: () => ValidationResult;
}

function useWorkflowDesigner(workflowId?: string): UseWorkflowDesignerReturn;
```

---

**Checkpoint C3 Validation / チェックポイントC3検証 / Xác thực điểm kiểm tra C3**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] All state structures traced to SRS requirements
2. [ ] State management approach matches BD architecture
3. [ ] State interfaces use TypeScript correctly
4. [ ] Action types properly defined
5. [ ] Custom hooks follow React 19 conventions
6. [ ] Bilingual format (Japanese + Vietnamese ≥60%)
7. [ ] No implementation code (interfaces only)
8. [ ] Checkpoint C3 validation marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: State Management Interface Generation*
