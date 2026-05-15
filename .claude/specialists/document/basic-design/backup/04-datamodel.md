# Section 04: Data Model - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Data Model sections (4.1 and 4.2) for Basic Design document.

This section shows entity relationships and business rules.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Database** | SQL Server 2022 |
| **ORM** | Entity Framework Core |
| **Format** | ASCII ERD + Entity descriptions |

---

## Constraints

### MUST Include

1. **Section 4.1**: Entity Relationship Diagram (ASCII ERD, 3-6 entities)
2. **Section 4.2**: Entity Descriptions (purpose, enums, status flows, business rules)
3. **Standard Fields**: id, createdAt, updatedAt, version for all entities
4. **Relationships**: Cardinality notation (1:1, 1:N, N:M)
5. **Business Rules**: 3-5 rules per entity from SRS

### MUST Exclude

- ❌ CREATE TABLE statements
- ❌ Index definitions
- ❌ Foreign key constraint syntax
- ❌ Field-by-field descriptions (Detail Design)
- ❌ English-only content (Vietnamese ≥60%)

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 04-datamodel.md
# PURPOSE: Generate Sections 4.1 and 4.2 for Basic Design
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load SRS for data requirements and business rules
    srs_file = f"documents/features/{feature_code}-{sub_code}/{feature_code}-{sub_code}-srs.md"
    context.srs = read_file(srs_file)

    # Extract entities from SRS
    context.entities = extract_entities(context.srs)

    # Extract business rules
    context.business_rules = extract_business_rules(context.srs)

    # Load Section 3 for entities mentioned in flows
    context.flow_entities = extract_entities_from_flows(section3)

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE ERD (4.1)
# ────────────────────────────────────────────────────────────

FUNCTION generate_erd(context):
    output = []

    output.append("### 4.1 Entity Relationship Diagram\n\n")
    output.append("```\n")

    # Draw entity boxes
    FOR entity IN context.entities:
        output.append(draw_entity_box(entity))
        output.append("\n")

    # Draw relationships
    FOR relationship IN context.relationships:
        output.append(draw_relationship(relationship))

    output.append("```\n\n")

    # Relationship descriptions
    output.append("**Relationships:**\n\n")
    FOR rel IN context.relationships:
        output.append(f"- **{rel.from_entity}** → **{rel.to_entity}**: {rel.cardinality} ({rel.description_vi})\n")

    output.append("\n")

    # Cardinality notation
    output.append("**Cardinality Notation:**\n\n")
    output.append("- 1-to-1: `│ 1 ──── 1 │`\n")
    output.append("- 1-to-many: `│ 1 ──── * │`\n")
    output.append("- many-to-many: `│ * ──── * │`\n")

    RETURN "".join(output)

FUNCTION draw_entity_box(entity):
    box = []
    box.append(f"┌{'─' * 30}┐\n")
    box.append(f"│{entity.name:^30}│\n")
    box.append(f"├{'─' * 30}┤\n")

    # Standard fields
    box.append(f"│ PK: id (GUID)                │\n")

    # Key fields only
    FOR field IN entity.key_fields[:4]:
        box.append(f"│ {field.name}: {field.type:<15}│\n")

    # Status if applicable
    IF entity.has_status:
        box.append(f"│ status (Enum)                │\n")

    # Standard timestamps
    box.append(f"│ createdAt (DateTime)         │\n")
    box.append(f"│ updatedAt (DateTime)         │\n")
    box.append(f"│ version (Int)                │\n")

    box.append(f"└{'─' * 30}┘\n")

    RETURN "".join(box)

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE ENTITY DESCRIPTIONS (4.2)
# ────────────────────────────────────────────────────────────

FUNCTION generate_entity_descriptions(context):
    output = []

    output.append("### 4.2 Entity Descriptions\n\n")

    FOR entity IN context.entities:
        output.append(f"#### {entity.name}\n\n")

        # Purpose
        output.append(f"**Mục đích (Purpose):** {entity.purpose_vi}\n\n")

        # Enum values if applicable
        IF entity.enums:
            FOR enum IN entity.enums:
                output.append(f"**{enum.name} Values:**\n\n")
                FOR value IN enum.values:
                    output.append(f"- **{value.name}**: {value.description_vi}\n")
                output.append("\n")

        # Status flow if stateful
        IF entity.has_status:
            output.append("**Status Flow:**\n\n")
            output.append("```\n")
            output.append(generate_status_flow(entity))
            output.append("```\n\n")

        # Business rules
        output.append("**Business Rules:**\n\n")
        rules = get_rules_for_entity(context.business_rules, entity)
        FOR rule IN rules:
            output.append(f"- {rule.description_vi}\n")

        output.append("\n---\n\n")

    RETURN "".join(output)

FUNCTION generate_status_flow(entity):
    # Entity-specific status flows
    status_flows = {
        "CastingRecord": """
PENDING ────► ACTIVE ────► COMPLETED
    │                          │
    │                          ▼
    └────────────────────► CANCELLED
""",
        "QualityTest": """
PENDING ────► PASSED
    │
    └────────► FAILED ────► RETESTED ────► PASSED/FAILED
""",
        "TruckLoad": """
LOADING ────► IN_TRANSIT ────► ARRIVED ────► UNLOADED
    │                              │
    └──────────────────────────────┴────► CANCELLED
"""
    }

    RETURN status_flows.get(entity.name, "ACTIVE ────► INACTIVE")

# ────────────────────────────────────────────────────────────
# STEP 4: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: Entity count in range?
    entity_count = count_entities(result)
    IF entity_count < 3 OR entity_count > 6:
        issues.append(f"Entity count out of range: {entity_count} (need 3-6)")

    # Q1: All entities from flows included?
    FOR entity IN context.flow_entities:
        IF NOT contains(result, entity):
            issues.append(f"Missing entity from flows: {entity}")

    # Q2: All entities have standard fields?
    standard_fields = ["id", "createdAt", "updatedAt", "version"]
    FOR field IN standard_fields:
        IF NOT contains(result, field):
            issues.append(f"Missing standard field: {field}")

    # Q2: All entities in 4.1 described in 4.2?
    entities_in_erd = extract_entities_from_erd(result)
    entities_in_desc = extract_entities_from_descriptions(result)
    FOR entity IN entities_in_erd:
        IF entity NOT IN entities_in_desc:
            issues.append(f"Entity in ERD but not described: {entity}")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "CREATE TABLE", "ALTER TABLE", "CREATE INDEX",
        "REFERENCES", "FOREIGN KEY", "PRIMARY KEY",
        "DEFAULT", "CHECK", "CONSTRAINT",
        "nvarchar", "varchar", "decimal("
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited SQL: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
### 4.1 Entity Relationship Diagram

```
┌──────────────────────────────┐
│        CastingRecord         │
├──────────────────────────────┤
│ PK: id (GUID)                │
│ castingDate (DateTime)       │
│ locationCode (String)        │
│ totalVolume (Decimal)        │
│ status (Enum)                │
│ createdAt (DateTime)         │
│ updatedAt (DateTime)         │
│ version (Int)                │
└──────────────┬───────────────┘
               │ 1
               │ has many
               │ *
┌──────────────▼───────────────┐
│         TruckLoad            │
├──────────────────────────────┤
│ PK: id (GUID)                │
│ FK: castingRecordId          │
│ truckNumber (String)         │
│ volume (Decimal)             │
│ arrivalTime (DateTime)       │
│ status (Enum)                │
│ createdAt (DateTime)         │
│ updatedAt (DateTime)         │
│ version (Int)                │
└──────────────┬───────────────┘
               │ 1
               │ has many
               │ *
┌──────────────▼───────────────┐
│        QualityTest           │
├──────────────────────────────┤
│ PK: id (GUID)                │
│ FK: truckLoadId              │
│ slumpValue (Decimal)         │
│ airContent (Decimal)         │
│ temperature (Decimal)        │
│ status (Enum)                │
│ createdAt (DateTime)         │
│ updatedAt (DateTime)         │
│ version (Int)                │
└──────────────────────────────┘
```

**Relationships:**

- **CastingRecord** → **TruckLoad**: 1-to-many (Một lô đổ có nhiều chuyến xe)
- **TruckLoad** → **QualityTest**: 1-to-many (Một chuyến xe có nhiều bài test)

**Cardinality Notation:**

- 1-to-1: `│ 1 ──── 1 │`
- 1-to-many: `│ 1 ──── * │`
- many-to-many: `│ * ──── * │`

---

### 4.2 Entity Descriptions

#### CastingRecord

**Mục đích (Purpose):** Lưu trữ thông tin về một lô đổ bê tông, bao gồm ngày đổ, vị trí, và tổng khối lượng.

**Status Values:**

- **PENDING**: Lô đổ đang được chuẩn bị
- **ACTIVE**: Đang trong quá trình đổ
- **COMPLETED**: Đã hoàn thành đổ bê tông
- **CANCELLED**: Đã hủy lô đổ

**Status Flow:**

```
PENDING ────► ACTIVE ────► COMPLETED
    │                          │
    │                          ▼
    └────────────────────► CANCELLED
```

**Business Rules:**

- Một CastingRecord phải có ít nhất một TruckLoad
- TotalVolume được tính tự động từ tổng volume của các TruckLoad
- Không thể CANCEL nếu đã có TruckLoad ở trạng thái UNLOADED
- LocationCode phải valid trong master data

---

#### TruckLoad

**Mục đích (Purpose):** Lưu trữ thông tin về một chuyến xe trộn bê tông trong lô đổ.

**Status Values:**

- **LOADING**: Xe đang load bê tông
- **IN_TRANSIT**: Xe đang di chuyển
- **ARRIVED**: Xe đã đến công trường
- **UNLOADED**: Đã đổ xong
- **CANCELLED**: Chuyến xe bị hủy

**Status Flow:**

```
LOADING ────► IN_TRANSIT ────► ARRIVED ────► UNLOADED
    │                              │
    └──────────────────────────────┴────► CANCELLED
```

**Business Rules:**

- Dữ liệu TruckLoad được import từ Hokuto CSV mỗi 1 giây
- TruckNumber phải unique trong cùng một CastingRecord
- Volume không được vượt quá capacity của xe (từ master data)
- Thời gian từ LOADING đến UNLOADED không quá 90 phút (cảnh báo nếu vượt)

---

#### QualityTest

**Mục đích (Purpose):** Lưu trữ kết quả kiểm tra chất lượng bê tông cho mỗi chuyến xe.

**Status Values:**

- **PENDING**: Chưa test
- **PASSED**: Test đạt specification
- **FAILED**: Test không đạt
- **RETESTED**: Đã test lại

**Status Flow:**

```
PENDING ────► PASSED
    │
    └────────► FAILED ────► RETESTED ────► PASSED/FAILED
```

**Business Rules:**

- Mỗi TruckLoad phải có ít nhất một QualityTest trước khi UNLOADED
- SlumpValue phải trong range 8-18 cm (cảnh báo nếu ngoài)
- AirContent phải trong range 3-6% (cảnh báo nếu ngoài)
- Temperature phải trong range 10-30°C (cảnh báo nếu ngoài)
- Nếu FAILED, cần approval từ Supervisor để continue
```

---

*Section 04: Data Model - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
