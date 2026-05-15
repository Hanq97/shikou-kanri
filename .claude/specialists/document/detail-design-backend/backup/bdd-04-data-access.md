# Data Access Micro-Agent / データアクセスマイクロエージェント / Micro-Agent Truy cập Dữ liệu

**Responsibility / 責任 / Trách nhiệm**: Generate repository interfaces, entity mappings, and query specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~120-150 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (data requirements), BD (data architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C4

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Data requirements
2. **SRS File Path** - Data specifications
3. **Basic Design File Path** - Data model and persistence architecture

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 4. データアクセス / Truy cập Dữ liệu (Data Access)

### 4.1 エンティティ定義 / Định nghĩa Entity (Entity Definitions)

```java
// Traceability: SRS-4.11, BD-5.11
package com.startx4crm.workflow.domain.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * ワークフローエンティティ / Entity Workflow / Workflow Entity
 */
@Entity
@Table(name = "workflows")
@Data
@EqualsAndHashCode(callSuper = true)
public class Workflow extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                               // ID

    @Column(nullable = false, length = 255)
    private String name;                           // ワークフロー名 / Tên workflow

    @Column(length = 1000)
    private String description;                    // 説明 / Mô tả

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WorkflowStatus status;                 // ステータス / Trạng thái

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkflowNode> nodes;              // ノード / Node

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkflowConnection> connections;  // 接続 / Kết nối

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;               // 作成日時 / Thời gian tạo

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;               // 更新日時 / Thời gian cập nhật

    @Column(name = "created_by", length = 100)
    private String createdBy;                      // 作成者 / Người tạo

    @Column(name = "updated_by", length = 100)
    private String updatedBy;                      // 更新者 / Người cập nhật
}

/**
 * ワークフローノードエンティティ / Entity Node Workflow / Workflow Node Entity
 */
@Entity
@Table(name = "workflow_nodes")
@Data
public class WorkflowNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "node_id", nullable = false, length = 100)
    private String nodeId;                         // ノードID / ID node

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;                     // ワークフロー / Workflow

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NodeType type;                         // タイプ / Loại

    @Column(nullable = false, length = 255)
    private String label;                          // ラベル / Nhãn

    @Column(name = "position_x", nullable = false)
    private Integer positionX;                     // X座標 / Tọa độ X

    @Column(name = "position_y", nullable = false)
    private Integer positionY;                     // Y座標 / Tọa độ Y

    @Column(columnDefinition = "TEXT")
    private String config;                         // 設定（JSON） / Cấu hình (JSON)
}
```

### 4.2 リポジトリインターフェース / Giao diện Repository (Repository Interfaces)

```java
// Traceability: SRS-4.12, BD-5.12
package com.startx4crm.workflow.repository;

import com.startx4crm.workflow.domain.entity.Workflow;
import com.startx4crm.workflow.domain.entity.WorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ワークフローリポジトリ / Repository Workflow / Workflow Repository
 */
@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, Long> {

    /**
     * 名前でワークフロー検索 / Tìm workflow theo tên / Find workflow by name
     */
    Optional<Workflow> findByName(String name);

    /**
     * ステータスでワークフロー検索 / Tìm workflow theo trạng thái / Find workflows by status
     */
    List<Workflow> findByStatus(WorkflowStatus status);

    /**
     * 名前検索（部分一致） / Tìm kiếm tên (khớp một phần) / Search by name (partial match)
     */
    Page<Workflow> findByNameContaining(String name, Pageable pageable);

    /**
     * 複合検索 / Tìm kiếm kết hợp / Complex search
     */
    @Query("SELECT w FROM Workflow w WHERE " +
           "(:name IS NULL OR w.name LIKE %:name%) AND " +
           "(:status IS NULL OR w.status = :status)")
    Page<Workflow> search(
        @Param("name") String name,
        @Param("status") WorkflowStatus status,
        Pageable pageable
    );

    /**
     * ノードを含むワークフロー取得 / Lấy workflow với node / Get workflow with nodes
     */
    @Query("SELECT w FROM Workflow w LEFT JOIN FETCH w.nodes WHERE w.id = :id")
    Optional<Workflow> findByIdWithNodes(@Param("id") Long id);

    /**
     * 作成者でワークフロー検索 / Tìm workflow theo người tạo / Find workflows by creator
     */
    List<Workflow> findByCreatedBy(String createdBy);
}

/**
 * ワークフローノードリポジトリ / Repository Node Workflow / Workflow Node Repository
 */
@Repository
public interface WorkflowNodeRepository extends JpaRepository<WorkflowNode, Long> {

    /**
     * ノードID検索 / Tìm theo ID node / Find by node ID
     */
    Optional<WorkflowNode> findByNodeId(String nodeId);

    /**
     * ワークフローIDでノード検索 / Tìm node theo ID workflow / Find nodes by workflow ID
     */
    List<WorkflowNode> findByWorkflowId(Long workflowId);

    /**
     * タイプでノード検索 / Tìm node theo loại / Find nodes by type
     */
    List<WorkflowNode> findByType(NodeType type);
}
```

### 4.3 カスタムクエリ仕様 / Đặc tả Query Tùy chỉnh (Custom Query Specifications)

```java
// Traceability: SRS-4.13, BD-5.13
package com.startx4crm.workflow.repository.specification;

import com.startx4crm.workflow.domain.entity.Workflow;
import org.springframework.data.jpa.domain.Specification;

/**
 * ワークフロー検索仕様 / Đặc tả Tìm kiếm Workflow / Workflow Search Specifications
 */
public class WorkflowSpecifications {

    /**
     * 名前で検索 / Tìm theo tên / Search by name
     */
    public static Specification<Workflow> nameContains(String name);

    /**
     * ステータスで検索 / Tìm theo trạng thái / Search by status
     */
    public static Specification<Workflow> hasStatus(WorkflowStatus status);

    /**
     * 作成者で検索 / Tìm theo người tạo / Search by creator
     */
    public static Specification<Workflow> createdBy(String createdBy);

    /**
     * 日付範囲で検索 / Tìm theo khoảng thời gian / Search by date range
     */
    public static Specification<Workflow> createdBetween(LocalDateTime start, LocalDateTime end);
}
```

### 4.4 トランザクション境界 / Ranh giới Transaction (Transaction Boundaries)

```java
// Traceability: SRS-4.14, BD-5.14
/**
 * トランザクション戦略 / Chiến lược Transaction / Transaction Strategy
 *
 * - Service層でトランザクション管理 / Quản lý transaction ở tầng Service
 * - @Transactional(readOnly = true) をデフォルト / Mặc định readOnly = true
 * - 更新操作のみ @Transactional / Chỉ thao tác cập nhật dùng @Transactional
 * - 例外発生時は自動ロールバック / Tự động rollback khi có exception
 */
```

---

**Checkpoint C4 Validation / チェックポイントC4検証 / Xác thực điểm kiểm tra C4**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Entity mappings follow JPA conventions
2. [ ] Repository methods traced to SRS
3. [ ] Query specifications defined
4. [ ] Transaction boundaries specified
5. [ ] Bilingual format (≥60%)
6. [ ] No implementation logic
7. [ ] Checkpoint C4 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Data Access Interface Generation*
