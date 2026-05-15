# BD Data Design Micro-Agent / データ設計マイクロエージェント

**Responsibility**: Generate Section 3 (Data Design) of Basic Design
**Output Lines**: 80-100 lines
**Dependencies**: bd-02-components.md (for entity references), SRS data requirements

---

## Input Requirements

- Evidence file path (absolute)
- SRS file path (for data requirements)
- Component design (from bd-02)
- Feature code (e.g., "CMN015002")
- Data model specifications (from evidence)

---

## Processing Logic

### Step 1: Load Evidence, SRS, and Components

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
components = read_file(components_file_path)
data_requirements = extract_data_requirements(srs)
entities = extract_entities(components)
```

**Extract:**
- Database schema
- Entity relationships
- Data types and constraints
- Indexes and keys
- Data migration requirements

### Step 2: Structure Data Design

**3.1 データモデル概要 / Data Model Overview**
- ER diagram (text-based)
- Entity list
- Relationship summary

**3.2 テーブル設計 / Table Design**
- Table definitions
- Column specifications
- Primary keys / Foreign keys
- Indexes
- Constraints

**3.3 データ型定義 / Data Type Definitions**
- Standard data types
- Custom types (ENUM, JSONB)
- Type mappings (DB ↔ Application)

**3.4 データ関連性 / Data Relationships**
- One-to-One
- One-to-Many
- Many-to-Many
- Relationship constraints

**3.5 データ整合性 / Data Integrity**
- Referential integrity
- Business rules
- Validation constraints
- Triggers (if applicable)

### Step 3: Map Entities to Requirements

**Traceability:**
- Functional requirements → Tables/Entities
- Data requirements → Columns/Attributes
- Business rules → Constraints

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] All tables derived from entities in components?
- [ ] Data types from evidence/requirements?
- [ ] Relationships from domain model?
- [ ] No assumed data structures?

**Q2: Consistency?**
- [ ] Aligns with component entities (Section 2)?
- [ ] Follows database naming conventions?
- [ ] Data types consistent across tables?
- [ ] No redundant data?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] Headers bilingual (日本語 / Vietnamese)?
- [ ] Table descriptions bilingual?
- [ ] Column descriptions bilingual?
- [ ] Technical SQL terms in English?

**Q4: No Prohibited Content?**
- [ ] No detailed SQL queries (DDL only)?
- [ ] No DML statements (INSERT/UPDATE)?
- [ ] No stored procedures?
- [ ] Schema design only?

---

## Output Template

```markdown
## 3. データ設計 / Thiết kế dữ liệu (Data Design)

### 3.1 データモデル概要 / Tổng quan mô hình dữ liệu

**ER図 / ER Diagram (概要 / Overview):**

```
[workflow_definitions] 1──N [workflow_nodes]
         │
         │ 1
         │
         N
[workflow_executions]
```

**エンティティ一覧 / Entity List:**

| エンティティ名 / Entity | テーブル名 / Table | 説明 / Description | 要件 / Requirement |
|-------------------|---------------|------------------|----------------|
| [Entity 1 JP/VN] | [table_name] | [Description JP/VN] | FR-[CODE]-[NUM] |
| [Entity 2 JP/VN] | [table_name] | [Description JP/VN] | FR-[CODE]-[NUM] |

---

### 3.2 テーブル設計 / Thiết kế bảng (Table Design)

#### 3.2.1 [table_name]: [Table Name JP] / [Table Name VN]

**目的 / Purpose:**
[Japanese description of table purpose]
[Vietnamese description]

**テーブル定義 / Table Definition:**

| カラム名 / Column | データ型 / Data Type | NULL許可 / Nullable | デフォルト / Default | 説明 / Description |
|---------------|------------------|------------------|----------------|------------------|
| id | BIGSERIAL | NOT NULL | - | 主キー / Primary key |
| [column2] | [Type] | NOT NULL / NULL | [Default] | [Description JP/VN] |
| [column3] | [Type] | NOT NULL / NULL | [Default] | [Description JP/VN] |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 / Ngày tạo |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 / Ngày cập nhật |

**キー制約 / Key Constraints:**
- **PRIMARY KEY**: `id`
- **FOREIGN KEY**: `[column_name]` → `[referenced_table](id)`
- **UNIQUE**: `[column_name]` (if applicable)

**インデックス / Indexes:**
- `idx_[table]_[column]` ON `[column]` (説明 / Description: [JP/VN])
- `idx_[table]_[column1]_[column2]` ON `[column1, column2]`

**制約 / Constraints:**
- CHECK: `[column] > 0` (例 / Example)
- CHECK: `[status] IN ('ACTIVE', 'INACTIVE', 'DELETED')`

**要件マッピング / Requirements Mapping:**
- FR-[CODE]-[NUMBER]: [Requirement description]

---

#### 3.2.2 [table_name_2]: [Table Name JP] / [Table Name VN]

[Repeat format for each table]

---

### 3.3 データ型定義 / Định nghĩa kiểu dữ liệu (Data Type Definitions)

#### 3.3.1 標準データ型 / Standard Data Types

| データ型 / Data Type | PostgreSQL型 / PG Type | Java型 / Java Type | 説明 / Description |
|------------------|------------------|-----------------|------------------|
| ID | BIGSERIAL | Long | 主キー / Primary key |
| テキスト / Text | VARCHAR(255) | String | 文字列 / String |
| 長文 / Long Text | TEXT | String | 長文テキスト / Long text |
| 数値 / Number | INTEGER | Integer | 整数 / Integer |
| 金額 / Amount | DECIMAL(19,4) | BigDecimal | 金額 / Amount |
| 日時 / DateTime | TIMESTAMP | LocalDateTime | 日時 / Date & time |
| 真偽値 / Boolean | BOOLEAN | Boolean | true/false |

---

#### 3.3.2 カスタムデータ型 / Custom Data Types

**ENUM型 / ENUM Types:**

```sql
-- ワークフローステータス / Workflow Status
CREATE TYPE workflow_status AS ENUM (
  'DRAFT',      -- 下書き / Bản nháp
  'ACTIVE',     -- 有効 / Hoạt động
  'INACTIVE',   -- 無効 / Không hoạt động
  'ARCHIVED'    -- アーカイブ / Lưu trữ
);
```

**JSONB型 / JSONB Types:**

```sql
-- ワークフロー定義 / Workflow Definition
-- 構造 / Structure:
{
  "nodes": [...],     -- ノードリスト / Node list
  "edges": [...],     -- エッジリスト / Edge list
  "metadata": {...}   -- メタデータ / Metadata
}
```

---

#### 3.3.3 型マッピング / Type Mapping

| ビジネス概念 / Business Concept | PostgreSQL型 / PG Type | Java型 / Java Type | TypeScript型 / TS Type |
|----------------------------|------------------|-----------------|-------------------|
| ユーザーID / User ID | BIGINT | Long | number |
| ワークフロー名 / Workflow Name | VARCHAR(255) | String | string |
| ワークフロー定義 / Definition | JSONB | JsonNode | object |
| ステータス / Status | workflow_status | WorkflowStatus (enum) | WorkflowStatus (enum) |

---

### 3.4 データ関連性 / Mối quan hệ dữ liệu (Data Relationships)

#### 3.4.1 1対多 (One-to-Many) / Một-nhiều

**[parent_table] → [child_table]**

**説明 / Description:**
[Japanese description of relationship]
[Vietnamese description]

**カーディナリティ / Cardinality:** 1:N

**外部キー / Foreign Key:**
- `[child_table].[parent_id]` → `[parent_table].[id]`

**カスケード設定 / Cascade:**
- ON DELETE: [CASCADE / SET NULL / RESTRICT]
- ON UPDATE: [CASCADE / RESTRICT]

**理由 / Rationale:**
[Japanese explanation]
[Vietnamese explanation]

---

#### 3.4.2 多対多 (Many-to-Many) / Nhiều-nhiều

**[table1] ←→ [join_table] ←→ [table2]**

**説明 / Description:**
[Japanese description]
[Vietnamese description]

**中間テーブル / Join Table:** `[join_table_name]`

**外部キー / Foreign Keys:**
- `[table1_id]` → `[table1].[id]`
- `[table2_id]` → `[table2].[id]`

**複合主キー / Composite Primary Key:**
- `([table1_id], [table2_id])`

---

### 3.5 データ整合性 / Tính toàn vẹn dữ liệu (Data Integrity)

#### 3.5.1 参照整合性 / Referential Integrity

| 外部キー / Foreign Key | 参照先 / References | カスケードルール / Cascade Rule | 理由 / Reason |
|-------------------|----------------|------------------------|-----------|
| [table].[fk_column] | [ref_table].[id] | ON DELETE [ACTION] | [Reason JP/VN] |

---

#### 3.5.2 ビジネスルール制約 / Business Rule Constraints

**BR-DATA-001: [Rule Name JP] / [Rule Name VN]**

**ルール / Rule:**
[Japanese description of business rule]
[Vietnamese description]

**実装 / Implementation:**
```sql
ALTER TABLE [table_name]
ADD CONSTRAINT [constraint_name]
CHECK ([condition]);
```

**要件 / Requirement:** FR-[CODE]-[NUMBER]

---

#### 3.5.3 バリデーション制約 / Validation Constraints

| テーブル / Table | カラム / Column | 制約 / Constraint | 説明 / Description |
|--------------|-------------|----------------|------------------|
| [table_name] | [column] | NOT NULL | [Description JP/VN] |
| [table_name] | [column] | UNIQUE | [Description JP/VN] |
| [table_name] | [column] | CHECK ([condition]) | [Description JP/VN] |

---

### 3.6 データマイグレーション / Data Migration

**初期データ / Initial Data:**
- [Data type 1 JP] / [Data type 1 VN]: [Description]
- [Data type 2 JP] / [Data type 2 VN]: [Description]

**マイグレーション戦略 / Migration Strategy:**
[Strategy description JP] / [Strategy description VN]

---

### 3.7 データ設計サマリー / Data Design Summary

| 項目 / Item | 数 / Count | 備考 / Note |
|---------|----------|----------|
| テーブル数 / Tables | [X] | - |
| ENUM型 / ENUM Types | [Y] | - |
| 外部キー / Foreign Keys | [Z] | - |
| インデックス / Indexes | [A] | - |
| CHECK制約 / Constraints | [B] | - |

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- SRS Reference: `[srs_file_path]`
- Component Reference: `[components_file_path]`
- Sections: Data Model, Entities, Requirements
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All tables derived from component entities
2. [ ] Data types appropriate and consistent
3. [ ] Foreign keys and indexes defined
4. [ ] Relationships mapped correctly
5. [ ] Business rules as constraints
6. [ ] Bilingual format ≥60% of content
7. [ ] No DML queries (DDL only)
8. [ ] Requirements traceability established
9. [ ] Evidence sources cited

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: BD Section 3 - Data Design*
