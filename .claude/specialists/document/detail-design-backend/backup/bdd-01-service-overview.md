# Service Overview Micro-Agent / サービス概要マイクロエージェント / Micro-Agent Tổng quan Dịch vụ

**Responsibility / 責任 / Trách nhiệm**: Generate service architecture, package structure, and dependency injection specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~120-150 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (services), BD (service architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C1

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Service requirements and interactions
2. **SRS File Path** - Service specifications
3. **Basic Design File Path** - Service architecture and layering

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 1. サービス概要 / Tổng quan Dịch vụ (Service Overview)

### 1.1 パッケージ構造 / Cấu trúc Package (Package Structure)

```
com.startx4crm.workflow/               # ワークフロー機能 / Tính năng Workflow
├── controller/                        # コントローラ層 / Tầng Controller
│   ├── WorkflowController.java
│   └── WorkflowNodeController.java
├── service/                           # サービス層 / Tầng Service
│   ├── WorkflowService.java           # インターフェース / Interface
│   └── impl/
│       └── WorkflowServiceImpl.java   # 実装 / Implementation
├── repository/                        # リポジトリ層 / Tầng Repository
│   ├── WorkflowRepository.java
│   └── WorkflowNodeRepository.java
├── domain/                            # ドメインモデル / Model Domain
│   ├── entity/
│   │   ├── Workflow.java
│   │   ├── WorkflowNode.java
│   │   └── WorkflowConnection.java
│   ├── valueobject/                   # 値オブジェクト / Value Object
│   │   ├── NodeType.java
│   │   └── WorkflowStatus.java
│   └── aggregate/                     # 集約 / Aggregate
│       └── WorkflowAggregate.java
├── dto/                               # データ転送オブジェクト / DTO
│   ├── request/
│   │   ├── CreateWorkflowRequest.java
│   │   └── UpdateWorkflowRequest.java
│   └── response/
│       ├── WorkflowResponse.java
│       └── WorkflowListResponse.java
├── mapper/                            # マッパー / Mapper
│   └── WorkflowMapper.java
└── exception/                         # 例外 / Exception
    ├── WorkflowNotFoundException.java
    └── InvalidWorkflowException.java
```

### 1.2 サービスインターフェース / Giao diện Service (Service Interfaces)

```java
// Traceability: SRS-4.1, BD-5.1
package com.startx4crm.workflow.service;

import com.startx4crm.workflow.dto.request.CreateWorkflowRequest;
import com.startx4crm.workflow.dto.request.UpdateWorkflowRequest;
import com.startx4crm.workflow.dto.response.WorkflowResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ワークフローサービスインターフェース / Giao diện Service Workflow
 * Workflow Service Interface
 */
public interface WorkflowService {

    /**
     * ワークフロー検索（ID） / Tìm workflow theo ID / Find workflow by ID
     */
    WorkflowResponse findById(Long id);

    /**
     * ワークフロー一覧取得 / Lấy danh sách workflow / Get workflow list
     */
    Page<WorkflowResponse> findAll(Pageable pageable);

    /**
     * ワークフロー検索（条件） / Tìm kiếm workflow / Search workflows
     */
    Page<WorkflowResponse> search(String keyword, String status, Pageable pageable);

    /**
     * ワークフロー作成 / Tạo workflow / Create workflow
     */
    WorkflowResponse create(CreateWorkflowRequest request);

    /**
     * ワークフロー更新 / Cập nhật workflow / Update workflow
     */
    WorkflowResponse update(Long id, UpdateWorkflowRequest request);

    /**
     * ワークフロー削除 / Xóa workflow / Delete workflow
     */
    void delete(Long id);

    /**
     * ワークフロー検証 / Xác thực workflow / Validate workflow
     */
    ValidationResult validate(Long id);
}
```

### 1.3 サービス実装クラス / Lớp Triển khai Service (Service Implementation Class)

```java
// Traceability: SRS-4.1, BD-5.1
package com.startx4crm.workflow.service.impl;

import com.startx4crm.workflow.service.WorkflowService;
import com.startx4crm.workflow.repository.WorkflowRepository;
import com.startx4crm.workflow.mapper.WorkflowMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ワークフローサービス実装 / Triển khai Service Workflow
 * Workflow Service Implementation
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkflowServiceImpl implements WorkflowService {

    // 依存性注入（コンストラクタインジェクション） / Dependency Injection
    private final WorkflowRepository workflowRepository;
    private final WorkflowNodeRepository nodeRepository;
    private final WorkflowMapper workflowMapper;
    private final WorkflowValidator workflowValidator;

    @Override
    public WorkflowResponse findById(Long id) {
        // Interface only - no implementation
    }

    @Override
    public Page<WorkflowResponse> findAll(Pageable pageable) {
        // Interface only - no implementation
    }

    @Override
    @Transactional
    public WorkflowResponse create(CreateWorkflowRequest request) {
        // Interface only - no implementation
    }

    @Override
    @Transactional
    public WorkflowResponse update(Long id, UpdateWorkflowRequest request) {
        // Interface only - no implementation
    }

    @Override
    @Transactional
    public void delete(Long id) {
        // Interface only - no implementation
    }
}
```

### 1.4 依存性注入設定 / Cấu hình Dependency Injection (Dependency Injection Configuration)

```java
// Traceability: SRS-4.2, BD-5.2
// Spring Boot Autoconfiguration / Spring Boot自動設定 / Tự động cấu hình Spring Boot
// Constructor-based dependency injection / コンストラクタベース依存性注入 / DI dựa trên Constructor

/**
 * 依存性グラフ / Biểu đồ Phụ thuộc / Dependency Graph
 *
 * WorkflowController
 *   ↓
 * WorkflowService
 *   ↓ (依存 / phụ thuộc / depends on)
 *   ├── WorkflowRepository
 *   ├── WorkflowNodeRepository
 *   ├── WorkflowMapper
 *   └── WorkflowValidator
 */
```

---

**Checkpoint C1 Validation / チェックポイントC1検証 / Xác thực điểm kiểm tra C1**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Package structure follows DDD patterns
2. [ ] Service interfaces traced to SRS
3. [ ] Constructor injection used (Spring Boot standard)
4. [ ] Bilingual format (≥60%)
5. [ ] No implementation logic
6. [ ] Checkpoint C1 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Service Architecture Interface Generation*
