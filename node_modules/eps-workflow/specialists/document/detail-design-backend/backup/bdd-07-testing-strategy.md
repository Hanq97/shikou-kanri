# Testing Strategy Micro-Agent / テスト戦略マイクロエージェント / Micro-Agent Chiến lược Kiểm thử

**Responsibility / 責任 / Trách nhiệm**: Generate test structure, test patterns, and coverage requirements for backend
**Output Lines / 出力行数 / Số dòng đầu ra**: ~100-120 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (test scenarios), BD (test architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C7

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Test scenarios
2. **SRS File Path** - Testing requirements
3. **Basic Design File Path** - Test architecture

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 7. テスト戦略 / Chiến lược Kiểm thử (Testing Strategy)

### 7.1 テストファイル構成 / Cấu trúc Tệp Test (Test File Organization)

```java
// Traceability: SRS-4.23, BD-5.23
/**
 * テストファイル構成 / Cấu trúc Tệp Test / Test File Organization
 *
 * src/test/java/
 * ├── com/startx4crm/workflow/
 * │   ├── controller/
 * │   │   └── WorkflowControllerTest.java        // コントローラーテスト / Test Controller
 * │   ├── service/
 * │   │   └── WorkflowServiceTest.java           // サービステスト / Test Service
 * │   ├── repository/
 * │   │   └── WorkflowRepositoryTest.java        // リポジトリテスト / Test Repository
 * │   └── integration/
 * │       └── WorkflowIntegrationTest.java       // 統合テスト / Test Tích hợp
 */
```

### 7.2 ユニットテストパターン / Mẫu Unit Test (Unit Test Patterns)

```java
// Traceability: SRS-4.24, BD-5.24
package com.startx4crm.workflow.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

/**
 * ワークフローサービステスト / Test Service Workflow / Workflow Service Test
 */
@SpringBootTest
class WorkflowServiceTest {

    @MockBean
    private WorkflowRepository workflowRepository;

    @MockBean
    private WorkflowMapper workflowMapper;

    private WorkflowService workflowService;

    @BeforeEach
    void setUp() {
        // セットアップ / Thiết lập / Setup
    }

    @Test
    @DisplayName("ワークフロー作成 - 正常系 / Tạo workflow - Trường hợp thành công / Create workflow - Success case")
    void shouldCreateWorkflow() {
        // Interface only - test method signature
    }

    @Test
    @DisplayName("ワークフロー検索 - IDで検索 / Tìm workflow - Tìm theo ID / Find workflow - By ID")
    void shouldFindWorkflowById() {
        // Interface only - test method signature
    }

    @Test
    @DisplayName("ワークフロー検索 - 存在しない / Tìm workflow - Không tồn tại / Find workflow - Not found")
    void shouldThrowExceptionWhenWorkflowNotFound() {
        // Interface only - test method signature
    }

    @Test
    @DisplayName("ワークフロー削除 - 正常系 / Xóa workflow - Thành công / Delete workflow - Success")
    void shouldDeleteWorkflow() {
        // Interface only - test method signature
    }
}
```

### 7.3 統合テストパターン / Mẫu Integration Test (Integration Test Patterns)

```java
// Traceability: SRS-4.25, BD-5.25
package com.startx4crm.workflow.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * ワークフロー統合テスト / Test Tích hợp Workflow / Workflow Integration Test
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WorkflowRepository workflowRepository;

    @Test
    @DisplayName("ワークフロー作成API - 正常系 / API Tạo workflow - Thành công / Create workflow API - Success")
    void shouldCreateWorkflowViaApi() {
        // Interface only - integration test method signature
    }

    @Test
    @DisplayName("ワークフロー一覧取得API / API Lấy danh sách workflow / Get workflows API")
    void shouldGetWorkflowsViaApi() {
        // Interface only - integration test method signature
    }
}
```

### 7.4 テストデータビルダー / Builder Dữ liệu Test (Test Data Builders)

```java
// Traceability: SRS-4.26, BD-5.26
package com.startx4crm.workflow.test.builder;

/**
 * ワークフローテストビルダー / Builder Test Workflow / Workflow Test Builder
 */
public class WorkflowTestBuilder {

    private String name;                       // ワークフロー名 / Tên workflow
    private String description;                // 説明 / Mô tả
    private WorkflowStatus status;             // ステータス / Trạng thái

    public WorkflowTestBuilder withName(String name);

    public WorkflowTestBuilder withDescription(String description);

    public WorkflowTestBuilder withStatus(WorkflowStatus status);

    public WorkflowTestBuilder withDefaultValues();

    public Workflow build();
}

/**
 * ワークフローリクエストビルダー / Builder Request Workflow / Workflow Request Builder
 */
public class CreateWorkflowRequestTestBuilder {

    private String name;
    private String description;
    private List<WorkflowNodeRequest> nodes;
    private List<WorkflowConnectionRequest> connections;

    public CreateWorkflowRequestTestBuilder withName(String name);

    public CreateWorkflowRequestTestBuilder withDescription(String description);

    public CreateWorkflowRequestTestBuilder withNodes(List<WorkflowNodeRequest> nodes);

    public CreateWorkflowRequestTestBuilder withValidWorkflow();

    public CreateWorkflowRequest build();
}
```

### 7.5 モック・スタブ設定 / Cấu hình Mock/Stub (Mock & Stub Configuration)

```java
// Traceability: SRS-4.27, BD-5.27
/**
 * モック設定パターン / Mẫu Cấu hình Mock / Mock Configuration Patterns
 */

// Mockito annotations / Mockitoアノテーション / Chú thích Mockito
@MockBean                                      // Spring Boot Mock Bean
@Mock                                          // Mockito Mock
@Spy                                           // Mockito Spy
@InjectMocks                                   // Mockito Inject Mocks

// Stubbing patterns / スタブパターン / Mẫu Stub
when(repository.findById(1L)).thenReturn(Optional.of(workflow));
when(service.create(any())).thenThrow(new WorkflowException("ERROR"));

// Verification patterns / 検証パターン / Mẫu Xác thực
verify(repository, times(1)).save(any(Workflow.class));
verify(repository, never()).delete(any());
```

### 7.6 カバレッジ目標 / Mục tiêu Coverage (Coverage Targets)

```java
// Traceability: SRS-4.28, BD-5.28
/**
 * カバレッジ目標 / Mục tiêu Coverage / Coverage Targets
 *
 * - 文カバレッジ / Coverage câu lệnh / Statement coverage: ≥80%
 * - 分岐カバレッジ / Coverage nhánh / Branch coverage: ≥75%
 * - メソッドカバレッジ / Coverage phương thức / Method coverage: ≥80%
 *
 * 重点テスト領域 / Khu vực Test trọng tâm / Focus test areas:
 * - ビジネスロジック / Logic nghiệp vụ / Business logic: 90%
 * - セキュリティ / Bảo mật / Security: 90%
 * - データアクセス / Truy cập dữ liệu / Data access: 85%
 * - API / API: 85%
 */
```

---

**Checkpoint C7 Validation / チェックポイントC7検証 / Xác thực điểm kiểm tra C7**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Test patterns match Spring Boot conventions
2. [ ] Test data builders defined
3. [ ] Mock/Stub configurations specified
4. [ ] Coverage targets from SRS included
5. [ ] Bilingual format (≥60%)
6. [ ] No implementation logic
7. [ ] Checkpoint C7 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Backend Testing Strategy Interface Generation*
