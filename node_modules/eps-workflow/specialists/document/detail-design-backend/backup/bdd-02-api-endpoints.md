# API Endpoints Micro-Agent / APIエンドポイントマイクロエージェント / Micro-Agent Điểm cuối API

**Responsibility / 責任 / Trách nhiệm**: Generate REST API definitions, request/response DTOs, and validation rules
**Output Lines / 出力行数 / Số dòng đầu ra**: ~150-200 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (API requirements), BD (API design)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C2

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - API interaction requirements
2. **SRS File Path** - API specifications
3. **Basic Design File Path** - API design and endpoint definitions

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 2. APIエンドポイント / Điểm cuối API (API Endpoints)

### 2.1 コントローラー定義 / Định nghĩa Controller (Controller Definition)

```java
// Traceability: SRS-4.3, BD-5.3
package com.startx4crm.workflow.controller;

import com.startx4crm.workflow.dto.request.*;
import com.startx4crm.workflow.dto.response.*;
import com.startx4crm.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * ワークフローコントローラー / Controller Workflow / Workflow Controller
 */
@RestController
@RequestMapping("/api/v1/workflows")
@RequiredArgsConstructor
@Validated
public class WorkflowController {

    private final WorkflowService workflowService;

    /**
     * ワークフロー一覧取得 / Lấy danh sách workflow / Get workflow list
     * GET /api/v1/workflows
     */
    @GetMapping
    public ResponseEntity<Page<WorkflowResponse>> getWorkflows(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        Pageable pageable
    );

    /**
     * ワークフロー詳細取得 / Lấy chi tiết workflow / Get workflow detail
     * GET /api/v1/workflows/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<WorkflowResponse> getWorkflow(
        @PathVariable Long id
    );

    /**
     * ワークフロー作成 / Tạo workflow / Create workflow
     * POST /api/v1/workflows
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<WorkflowResponse> createWorkflow(
        @Valid @RequestBody CreateWorkflowRequest request
    );

    /**
     * ワークフロー更新 / Cập nhật workflow / Update workflow
     * PUT /api/v1/workflows/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<WorkflowResponse> updateWorkflow(
        @PathVariable Long id,
        @Valid @RequestBody UpdateWorkflowRequest request
    );

    /**
     * ワークフロー削除 / Xóa workflow / Delete workflow
     * DELETE /api/v1/workflows/{id}
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deleteWorkflow(
        @PathVariable Long id
    );

    /**
     * ワークフロー検証 / Xác thực workflow / Validate workflow
     * POST /api/v1/workflows/{id}/validate
     */
    @PostMapping("/{id}/validate")
    public ResponseEntity<ValidationResult> validateWorkflow(
        @PathVariable Long id
    );
}
```

### 2.2 リクエストDTO / DTO Request (Request DTOs)

```java
// Traceability: SRS-4.4, BD-5.4
package com.startx4crm.workflow.dto.request;

import lombok.Data;
import javax.validation.constraints.*;
import java.util.List;

/**
 * ワークフロー作成リクエスト / Request Tạo Workflow / Create Workflow Request
 */
@Data
public class CreateWorkflowRequest {

    @NotBlank(message = "ワークフロー名は必須です / Tên workflow là bắt buộc / Workflow name is required")
    @Size(max = 255, message = "ワークフロー名は255文字以内 / Tên workflow tối đa 255 ký tự / Max 255 characters")
    private String name;                           // ワークフロー名 / Tên workflow

    @Size(max = 1000, message = "説明は1000文字以内 / Mô tả tối đa 1000 ký tự / Max 1000 characters")
    private String description;                    // 説明 / Mô tả

    @NotNull(message = "ノードは必須です / Node là bắt buộc / Nodes are required")
    @Size(min = 2, message = "最低2つのノードが必要 / Cần ít nhất 2 node / At least 2 nodes required")
    private List<WorkflowNodeRequest> nodes;       // ノード配列 / Mảng node

    @NotNull(message = "接続は必須です / Kết nối là bắt buộc / Connections are required")
    private List<WorkflowConnectionRequest> connections; // 接続配列 / Mảng kết nối
}

/**
 * ワークフローノードリクエスト / Request Node Workflow / Workflow Node Request
 */
@Data
public class WorkflowNodeRequest {

    @NotBlank(message = "ノードIDは必須 / ID node là bắt buộc / Node ID is required")
    private String nodeId;                         // ノードID / ID node

    @NotNull(message = "ノードタイプは必須 / Loại node là bắt buộc / Node type is required")
    private NodeType type;                         // ノードタイプ / Loại node

    @NotBlank(message = "ラベルは必須 / Nhãn là bắt buộc / Label is required")
    private String label;                          // ラベル / Nhãn

    @NotNull(message = "座標は必須 / Tọa độ là bắt buộc / Position is required")
    private Position position;                     // 座標 / Tọa độ

    private Object config;                         // 設定 / Cấu hình
}

/**
 * ワークフロー更新リクエスト / Request Cập nhật Workflow / Update Workflow Request
 */
@Data
public class UpdateWorkflowRequest {

    @Size(max = 255)
    private String name;

    @Size(max = 1000)
    private String description;

    private List<WorkflowNodeRequest> nodes;

    private List<WorkflowConnectionRequest> connections;

    private WorkflowStatus status;                 // ステータス / Trạng thái
}
```

### 2.3 レスポンスDTO / DTO Response (Response DTOs)

```java
// Traceability: SRS-4.5, BD-5.5
package com.startx4crm.workflow.dto.response;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

/**
 * ワークフローレスポンス / Response Workflow / Workflow Response
 */
@Data
public class WorkflowResponse {

    private Long id;                               // ワークフローID / ID workflow

    private String name;                           // ワークフロー名 / Tên workflow

    private String description;                    // 説明 / Mô tả

    private WorkflowStatus status;                 // ステータス / Trạng thái

    private List<WorkflowNodeResponse> nodes;      // ノード配列 / Mảng node

    private List<WorkflowConnectionResponse> connections; // 接続配列 / Mảng kết nối

    private LocalDateTime createdAt;               // 作成日時 / Thời gian tạo

    private LocalDateTime updatedAt;               // 更新日時 / Thời gian cập nhật

    private String createdBy;                      // 作成者 / Người tạo

    private String updatedBy;                      // 更新者 / Người cập nhật
}

/**
 * ワークフローノードレスポンス / Response Node Workflow / Workflow Node Response
 */
@Data
public class WorkflowNodeResponse {

    private String nodeId;                         // ノードID / ID node

    private NodeType type;                         // タイプ / Loại

    private String label;                          // ラベル / Nhãn

    private Position position;                     // 座標 / Tọa độ

    private Object config;                         // 設定 / Cấu hình
}
```

### 2.4 バリデーション / Xác thực (Validation)

```java
// Traceability: SRS-4.6, BD-5.6
// Bean Validation annotations / Bean Validationアノテーション / Chú thích Bean Validation

/**
 * 使用するバリデーションアノテーション / Chú thích Xác thực sử dụng / Used Validation Annotations:
 *
 * - @NotNull: null不可 / Không được null / Not null
 * - @NotBlank: 空白不可 / Không được rỗng / Not blank
 * - @Size: サイズ制約 / Ràng buộc kích thước / Size constraint
 * - @Min/@Max: 数値範囲 / Phạm vi số / Numeric range
 * - @Email: メール形式 / Định dạng email / Email format
 * - @Pattern: 正規表現 / Biểu thức chính quy / Regex pattern
 * - @Valid: ネストバリデーション / Xác thực lồng / Nested validation
 */
```

---

**Checkpoint C2 Validation / チェックポイントC2検証 / Xác thực điểm kiểm tra C2**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] All endpoints traced to SRS
2. [ ] DTOs use Bean Validation annotations
3. [ ] HTTP status codes specified
4. [ ] Bilingual format (≥60%)
5. [ ] No implementation logic
6. [ ] Checkpoint C2 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: API Endpoint Interface Generation*
