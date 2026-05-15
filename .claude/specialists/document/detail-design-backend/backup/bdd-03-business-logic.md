# Business Logic Micro-Agent / ビジネスロジックマイクロエージェント / Micro-Agent Logic Nghiệp vụ

**Responsibility / 責任 / Trách nhiệm**: Generate business rules, validation logic, and workflow processing specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~120-150 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (business rules), BD (business logic architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C3

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Business rule requirements
2. **SRS File Path** - Business rule specifications
3. **Basic Design File Path** - Business logic architecture

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 3. ビジネスロジック / Logic Nghiệp vụ (Business Logic)

### 3.1 ビジネスルールインターフェース / Giao diện Quy tắc Nghiệp vụ (Business Rule Interfaces)

```java
// Traceability: SRS-4.7, BD-5.7
package com.startx4crm.workflow.domain.rule;

/**
 * ビジネスルール基底インターフェース / Giao diện Cơ sở Quy tắc / Base Business Rule Interface
 */
public interface BusinessRule<T> {

    /**
     * ルールを満たすか判定 / Kiểm tra quy tắc / Check if rule is satisfied
     */
    boolean isSatisfiedBy(T entity);

    /**
     * 違反情報を取得 / Lấy thông tin vi phạm / Get violation information
     */
    BusinessRuleViolation getViolation();

    /**
     * ルールの説明を取得 / Lấy mô tả quy tắc / Get rule description
     */
    String getDescription();
}

/**
 * ビジネスルール違反 / Vi phạm Quy tắc / Business Rule Violation
 */
public interface BusinessRuleViolation {
    String getCode();                          // エラーコード / Mã lỗi
    String getMessage();                       // メッセージ / Thông báo
    String getField();                         // フィールド / Trường
}
```

### 3.2 検証戦略インターフェース / Giao diện Chiến lược Xác thực (Validation Strategy Interfaces)

```java
// Traceability: SRS-4.8, BD-5.8
package com.startx4crm.workflow.domain.validator;

/**
 * 検証戦略インターフェース / Giao diện Chiến lược Xác thực / Validation Strategy Interface
 */
public interface ValidationStrategy<T> {

    /**
     * エンティティを検証 / Xác thực entity / Validate entity
     */
    ValidationResult validate(T entity);

    /**
     * 検証タイプを取得 / Lấy loại xác thực / Get validation type
     */
    ValidationType getType();
}

/**
 * 検証結果 / Kết quả Xác thực / Validation Result
 */
public class ValidationResult {

    private boolean valid;                     // 検証結果 / Kết quả xác thực

    private List<ValidationError> errors;      // エラー一覧 / Danh sách lỗi

    public boolean isValid();

    public List<ValidationError> getErrors();

    public void addError(ValidationError error);
}

/**
 * 検証エラー / Lỗi Xác thực / Validation Error
 */
public class ValidationError {

    private String code;                       // エラーコード / Mã lỗi

    private String message;                    // メッセージ / Thông báo

    private String field;                      // フィールド / Trường

    private Object rejectedValue;              // 拒否値 / Giá trị bị từ chối
}
```

### 3.3 ワークフロー処理インターフェース / Giao diện Xử lý Workflow (Workflow Processor Interfaces)

```java
// Traceability: SRS-4.9, BD-5.9
package com.startx4crm.workflow.domain.processor;

/**
 * ワークフロー処理インターフェース / Giao diện Xử lý Workflow / Workflow Processor Interface
 */
public interface WorkflowProcessor {

    /**
     * ワークフローを処理 / Xử lý workflow / Process workflow
     */
    WorkflowState process(WorkflowContext context);

    /**
     * 状態遷移が可能か判定 / Kiểm tra chuyển trạng thái / Check if transition is possible
     */
    boolean canTransition(WorkflowState from, WorkflowState to);

    /**
     * 次の可能な状態を取得 / Lấy trạng thái tiếp theo / Get next possible states
     */
    List<WorkflowState> getNextStates(WorkflowState current);
}

/**
 * ワークフローコンテキスト / Ngữ cảnh Workflow / Workflow Context
 */
public interface WorkflowContext {

    Long getWorkflowId();                      // ワークフローID / ID workflow

    WorkflowState getCurrentState();           // 現在の状態 / Trạng thái hiện tại

    Map<String, Object> getVariables();        // 変数 / Biến

    UserContext getUserContext();              // ユーザーコンテキスト / Ngữ cảnh người dùng
}

/**
 * ワークフロー状態 / Trạng thái Workflow / Workflow State
 */
public enum WorkflowState {
    DRAFT,                                     // 下書き / Bản nháp
    SUBMITTED,                                 // 提出済み / Đã gửi
    IN_REVIEW,                                 // レビュー中 / Đang đánh giá
    APPROVED,                                  // 承認済み / Đã phê duyệt
    REJECTED,                                  // 却下 / Bị từ chối
    ACTIVE,                                    // 有効 / Đang hoạt động
    ARCHIVED                                   // アーカイブ / Đã lưu trữ
}
```

### 3.4 ビジネス例外定義 / Định nghĩa Exception Nghiệp vụ (Business Exception Definitions)

```java
// Traceability: SRS-4.10, BD-5.10
package com.startx4crm.workflow.exception;

/**
 * ワークフロー基底例外 / Exception Cơ sở Workflow / Base Workflow Exception
 */
public class WorkflowException extends RuntimeException {

    private final String errorCode;            // エラーコード / Mã lỗi

    private final Object[] args;               // 引数 / Tham số

    public WorkflowException(String errorCode, String message);

    public WorkflowException(String errorCode, String message, Object... args);
}

/**
 * ワークフロー未検出例外 / Exception Không tìm thấy Workflow / Workflow Not Found Exception
 */
public class WorkflowNotFoundException extends WorkflowException {
    // Interface only
}

/**
 * 無効なワークフロー例外 / Exception Workflow Không hợp lệ / Invalid Workflow Exception
 */
public class InvalidWorkflowException extends WorkflowException {
    // Interface only
}

/**
 * ワークフロー状態遷移例外 / Exception Chuyển trạng thái Workflow / Workflow State Transition Exception
 */
public class WorkflowStateTransitionException extends WorkflowException {
    // Interface only
}
```

---

**Checkpoint C3 Validation / チェックポイントC3検証 / Xác thực điểm kiểm tra C3**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Business rules traced to SRS
2. [ ] Validation strategies defined
3. [ ] State machine interfaces specified
4. [ ] Exception hierarchy defined
5. [ ] Bilingual format (≥60%)
6. [ ] No implementation logic
7. [ ] Checkpoint C3 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Business Logic Interface Generation*
