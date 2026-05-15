# Integration Micro-Agent / 統合マイクロエージェント / Micro-Agent Tích hợp

**Responsibility / 責任 / Trách nhiệm**: Generate external API integration, message queue, and event handling specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~120-150 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (integration requirements), BD (integration architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C5

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Integration requirements
2. **SRS File Path** - External system specifications
3. **Basic Design File Path** - Integration architecture

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 5. 統合 / Tích hợp (Integration)

### 5.1 外部APIクライアント / Client API Bên ngoài (External API Client)

```java
// Traceability: SRS-4.15, BD-5.15
package com.startx4crm.workflow.integration.client;

import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

/**
 * 外部APIクライアントインターフェース / Giao diện Client API Bên ngoài / External API Client Interface
 */
public interface ExternalApiClient {

    /**
     * API呼び出し / Gọi API / Call API
     */
    <T> T callApi(
        String endpoint,
        HttpMethod method,
        Object request,
        Class<T> responseType
    );

    /**
     * 非同期API呼び出し / Gọi API bất đồng bộ / Call API asynchronously
     */
    <T> CompletableFuture<T> callApiAsync(
        String endpoint,
        HttpMethod method,
        Object request,
        Class<T> responseType
    );

    /**
     * リトライ付きAPI呼び出し / Gọi API với retry / Call API with retry
     */
    <T> T callApiWithRetry(
        String endpoint,
        HttpMethod method,
        Object request,
        Class<T> responseType,
        int maxRetries
    );
}

/**
 * サーキットブレーカー設定 / Cấu hình Circuit Breaker / Circuit Breaker Configuration
 */
public interface CircuitBreakerConfig {
    int getFailureThreshold();                 // 失敗閾値 / Ngưỡng thất bại
    int getSuccessThreshold();                 // 成功閾値 / Ngưỡng thành công
    long getTimeout();                         // タイムアウト / Timeout
    long getWaitDurationInOpenState();         // 開状態待機時間 / Thời gian chờ trạng thái mở
}
```

### 5.2 Kafkaプロデューサー / Producer Kafka (Kafka Producer)

```java
// Traceability: SRS-4.16, BD-5.16
package com.startx4crm.workflow.integration.messaging;

import org.springframework.kafka.core.KafkaTemplate;

/**
 * イベントパブリッシャー / Publisher Sự kiện / Event Publisher
 */
public interface EventPublisher {

    /**
     * イベント発行 / Phát sự kiện / Publish event
     */
    void publish(String topic, Event event);

    /**
     * 非同期イベント発行 / Phát sự kiện bất đồng bộ / Publish event asynchronously
     */
    CompletableFuture<SendResult<String, Event>> publishAsync(String topic, Event event);

    /**
     * トランザクショナルイベント発行 / Phát sự kiện transactional / Publish event transactionally
     */
    void publishTransactional(String topic, Event event);
}

/**
 * イベントインターフェース / Giao diện Sự kiện / Event Interface
 */
public interface Event {
    String getEventId();                       // イベントID / ID sự kiện
    String getEventType();                     // イベントタイプ / Loại sự kiện
    LocalDateTime getTimestamp();              // タイムスタンプ / Thời gian
    String getSource();                        // ソース / Nguồn
    Object getPayload();                       // ペイロード / Dữ liệu
}

/**
 * ワークフローイベント / Sự kiện Workflow / Workflow Event
 */
public class WorkflowEvent implements Event {
    private String eventId;
    private String eventType;                  // CREATED, UPDATED, DELETED, STATE_CHANGED
    private LocalDateTime timestamp;
    private String source;
    private WorkflowEventPayload payload;
}

/**
 * ワークフローイベントペイロード / Dữ liệu Sự kiện Workflow / Workflow Event Payload
 */
public class WorkflowEventPayload {
    private Long workflowId;                   // ワークフローID / ID workflow
    private String workflowName;               // ワークフロー名 / Tên workflow
    private WorkflowState oldState;            // 旧状態 / Trạng thái cũ
    private WorkflowState newState;            // 新状態 / Trạng thái mới
    private String changedBy;                  // 変更者 / Người thay đổi
}
```

### 5.3 Kafkaコンシューマー / Consumer Kafka (Kafka Consumer)

```java
// Traceability: SRS-4.17, BD-5.17
package com.startx4crm.workflow.integration.messaging;

/**
 * イベントハンドラー / Xử lý Sự kiện / Event Handler
 */
public interface EventHandler<T extends Event> {

    /**
     * イベント処理 / Xử lý sự kiện / Handle event
     */
    void handle(T event);

    /**
     * 処理可能か判定 / Kiểm tra xử lý được / Check if can handle
     */
    boolean canHandle(Event event);

    /**
     * イベントタイプ取得 / Lấy loại sự kiện / Get event type
     */
    String getEventType();
}

/**
 * ワークフローイベントハンドラー / Xử lý Sự kiện Workflow / Workflow Event Handler
 */
public interface WorkflowEventHandler extends EventHandler<WorkflowEvent> {
    // Specific workflow event handling methods
}
```

### 5.4 統合パターン / Mẫu Tích hợp (Integration Patterns)

```java
// Traceability: SRS-4.18, BD-5.18
/**
 * 統合パターン / Mẫu Tích hợp / Integration Patterns
 *
 * 1. Request-Response Pattern / リクエスト-レスポンスパターン / Mẫu Request-Response
 *    - 外部APIとの同期通信 / Giao tiếp đồng bộ với API bên ngoài
 *    - REST API呼び出し / Gọi REST API
 *
 * 2. Event-Driven Pattern / イベント駆動パターン / Mẫu Sự kiện
 *    - Kafkaによる非同期メッセージング / Messaging bất đồng bộ với Kafka
 *    - イベントソーシング / Event Sourcing
 *
 * 3. Circuit Breaker Pattern / サーキットブレーカーパターン / Mẫu Circuit Breaker
 *    - 障害耐性 / Khả năng chịu lỗi
 *    - フォールバック処理 / Xử lý dự phòng
 *
 * 4. Retry Pattern / リトライパターン / Mẫu Retry
 *    - 再試行ロジック / Logic thử lại
 *    - バックオフ戦略 / Chiến lược backoff
 */
```

---

**Checkpoint C5 Validation / チェックポイントC5検証 / Xác thực điểm kiểm tra C5**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Integration patterns traced to BD
2. [ ] Kafka producer/consumer interfaces defined
3. [ ] Circuit breaker configuration specified
4. [ ] Event structures defined
5. [ ] Bilingual format (≥60%)
6. [ ] No implementation logic
7. [ ] Checkpoint C5 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Integration Interface Generation*
