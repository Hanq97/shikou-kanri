# API Integration Micro-Agent / API統合マイクロエージェント / Micro-Agent Tích hợp API

**Responsibility / 責任 / Trách nhiệm**: Generate API client interfaces, data fetching patterns, and error handling specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~120-150 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (API requirements), BD (API design)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C4

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Contains API interaction requirements
2. **SRS File Path** - Contains API functional requirements
3. **Basic Design File Path** - Contains API architecture and endpoints

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1: Load Context

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
basic_design = read_file(basic_design_file_path)

api_requirements = extract_api_requirements(srs)
api_endpoints = extract_api_endpoints(basic_design)
```

### Step 2: Extract Requirements

```pseudocode
# Extract API endpoints
endpoints = parse_api_endpoints(api_endpoints)

# Extract request/response patterns
request_response_patterns = extract_patterns(endpoints)

# Extract error handling requirements
error_handling = extract_error_handling_requirements(srs)
```

### Step 3: Generate Design

```pseudocode
# Generate API client interface
api_client = generate_api_client_interface(endpoints)

# Generate request/response types
types = generate_request_response_types(endpoints)

# Generate error handling
error_handlers = generate_error_handler_interfaces(error_handling)

# Generate data fetching hooks
hooks = generate_data_fetching_hooks(endpoints)

output = {
    "api_client": api_client,
    "types": types,
    "error_handlers": error_handlers,
    "hooks": hooks
}
```

### Step 4: Validate Output (Q1-Q4)

```pseudocode
FOR each endpoint in endpoints:
    ASSERT exists_in_bd(endpoint, basic_design)
    ASSERT has_request_response_types(endpoint)
END FOR

ASSERT typescript_interfaces_valid(types)
ASSERT bilingual_ratio >= 60
ASSERT only_interfaces_no_implementation(output)
```

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 4. API統合 / Tích hợp API (API Integration)

### 4.1 APIクライアントインターフェース / Giao diện API Client (API Client Interface)

```typescript
// Traceability: SRS-3.8, BD-4.8
interface ApiClient {
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T, D>(url: string, data: D, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T, D>(url: string, data: D, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
}

interface RequestConfig {
  headers?: Record<string, string>;     // ヘッダー / Header
  params?: Record<string, any>;         // クエリパラメータ / Tham số truy vấn
  timeout?: number;                     // タイムアウト / Thời gian chờ
  signal?: AbortSignal;                 // 中断シグナル / Tín hiệu hủy
}

interface ApiResponse<T> {
  data: T;                              // レスポンスデータ / Dữ liệu phản hồi
  status: number;                       // HTTPステータス / Trạng thái HTTP
  headers: Record<string, string>;      // レスポンスヘッダー / Header phản hồi
  message?: string;                     // メッセージ / Thông báo
}
```

### 4.2 ワークフローAPI型定義 / Định nghĩa Kiểu API Workflow (Workflow API Types)

```typescript
// Traceability: SRS-3.8.1, BD-4.8.1
// GET /api/v1/workflows
interface GetWorkflowsRequest {
  page?: number;                        // ページ番号 / Số trang
  limit?: number;                       // 件数 / Số lượng
  search?: string;                      // 検索 / Tìm kiếm
  status?: WorkflowStatus;              // ステータス / Trạng thái
}

interface GetWorkflowsResponse {
  workflows: WorkflowSummary[];         // ワークフロー一覧 / Danh sách workflow
  total: number;                        // 総件数 / Tổng số
  page: number;
  limit: number;
}

// GET /api/v1/workflows/:id
interface GetWorkflowRequest {
  id: string;                           // ワークフローID / ID workflow
}

interface GetWorkflowResponse {
  workflow: Workflow;                   // ワークフロー詳細 / Chi tiết workflow
}

// POST /api/v1/workflows
interface CreateWorkflowRequest {
  name: string;                         // ワークフロー名 / Tên workflow
  description?: string;                 // 説明 / Mô tả
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

interface CreateWorkflowResponse {
  workflow: Workflow;
  message: string;
}

// PUT /api/v1/workflows/:id
interface UpdateWorkflowRequest {
  id: string;
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
}

interface UpdateWorkflowResponse {
  workflow: Workflow;
  message: string;
}

// DELETE /api/v1/workflows/:id
interface DeleteWorkflowRequest {
  id: string;
}

interface DeleteWorkflowResponse {
  message: string;
}
```

### 4.3 エラーハンドリング / Xử lý Lỗi (Error Handling)

```typescript
// Traceability: SRS-3.9, BD-4.9
interface ApiError {
  code: string;                         // エラーコード / Mã lỗi
  message: string;                      // エラーメッセージ / Thông báo lỗi
  details?: Record<string, any>;        // 詳細 / Chi tiết
  timestamp: number;                    // タイムスタンプ / Thời gian
}

interface ValidationError {
  field: string;                        // フィールド名 / Tên trường
  message: string;                      // エラーメッセージ / Thông báo lỗi
  code: string;                         // エラーコード / Mã lỗi
}

type ApiErrorHandler = (error: ApiError) => void;
```

### 4.4 データ取得フック / Hook Lấy Dữ liệu (Data Fetching Hooks)

```typescript
// Traceability: SRS-3.10, BD-4.10
interface UseWorkflowsReturn {
  workflows: WorkflowSummary[];         // ワークフロー一覧 / Danh sách workflow
  total: number;                        // 総件数 / Tổng số
  loading: boolean;                     // ローディング / Đang tải
  error: ApiError | null;               // エラー / Lỗi
  refetch: () => Promise<void>;         // 再取得 / Tải lại
}

function useWorkflows(params?: GetWorkflowsRequest): UseWorkflowsReturn;

interface UseWorkflowReturn {
  workflow: Workflow | null;            // ワークフロー / Workflow
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

function useWorkflow(id: string): UseWorkflowReturn;

interface UseWorkflowMutationReturn {
  createWorkflow: (data: CreateWorkflowRequest) => Promise<Workflow>;
  updateWorkflow: (id: string, data: UpdateWorkflowRequest) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  loading: boolean;
  error: ApiError | null;
}

function useWorkflowMutation(): UseWorkflowMutationReturn;
```

---

**Checkpoint C4 Validation / チェックポイントC4検証 / Xác thực điểm kiểm tra C4**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] All API endpoints traced to BD specifications
2. [ ] Request/Response types complete
3. [ ] Error handling patterns defined
4. [ ] TypeScript interfaces valid
5. [ ] Bilingual format (≥60%)
6. [ ] No implementation code
7. [ ] Checkpoint C4 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: API Integration Interface Generation*
