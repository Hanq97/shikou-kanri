# Section 06: Constraints - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Constraints section (Section 6) for SRS document.

This section defines system limitations, restrictions, and boundaries - what the system CANNOT do or MUST comply with.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Domain** | Civil Engineering / Tunnel Construction |
| **Focus** | System limitations and boundaries |
| **Categories** | Technical, Business, Operational |

---

## Constraints

### MUST Include

1. **Constraint ID Format**: `CON-[TYPE]-[###]` (e.g., CON-TECH-001)
2. **3 Categories**: Technical (TECH), Business (BIZ), Operational (OPS)
3. **For each constraint**: Description, Impact, Rationale, Mitigation
4. **Evidence-based**: Derived from project requirements
5. **Grouped by category**

### MUST Exclude

- ❌ Implementation details
- ❌ Solutions (belongs in Basic Design)
- ❌ Vague constraints ("may have issues")
- ❌ Assumptions (separate from constraints)
- ❌ English-only content (Vietnamese ≥60%)

### Constraint Count by Scope Level

| Scope | Total Constraints | Focus |
|-------|-------------------|-------|
| **Core** | 5-8 | Critical limitations only |
| **Full** | 10-15 | Comprehensive coverage |
| **Premium** | 15-20 | Detailed + regulatory |

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 06-constraints.md
# PURPOSE: Generate Constraints section with categories
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load innovation for scope level
    innovation = read_file(f".claude/memory-bank/master/{feature_code}/innovation.md")
    context.scope_level = extract_scope_level(innovation)

    # Load evidence for constraints
    evidence_files = glob(f".claude/memory-bank/master/{feature_code}/evidence-*.md")
    context.evidence = merge_evidence(evidence_files)

    # Determine constraint targets
    constraint_counts = {
        "Core": {"min": 5, "max": 8},
        "Full": {"min": 10, "max": 15},
        "Premium": {"min": 15, "max": 20}
    }
    context.constraint_targets = constraint_counts[context.scope_level]

    # Define constraint categories
    context.categories = [
        {"code": "TECH", "name": "Technical Constraints", "name_vi": "Ràng buộc Kỹ thuật"},
        {"code": "BIZ", "name": "Business Constraints", "name_vi": "Ràng buộc Nghiệp vụ"},
        {"code": "OPS", "name": "Operational Constraints", "name_vi": "Ràng buộc Vận hành"}
    ]

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: IDENTIFY CONSTRAINTS FROM EVIDENCE
# ────────────────────────────────────────────────────────────

FUNCTION identify_constraints(context):
    constraints = {
        "TECH": [],
        "BIZ": [],
        "OPS": []
    }

    # Technical constraints
    technical_patterns = [
        "database_size_limit",
        "api_rate_limit",
        "concurrent_user_limit",
        "file_size_limit",
        "integration_limitations",
        "technology_restrictions"
    ]

    FOR pattern IN technical_patterns:
        IF found_in_evidence(context.evidence, pattern):
            constraints["TECH"].append(extract_constraint(pattern))

    # Business constraints
    business_patterns = [
        "regulatory_requirements",
        "minimum_thresholds",
        "approval_requirements",
        "data_retention_policies",
        "user_eligibility"
    ]

    FOR pattern IN business_patterns:
        IF found_in_evidence(context.evidence, pattern):
            constraints["BIZ"].append(extract_constraint(pattern))

    # Operational constraints
    operational_patterns = [
        "support_hours",
        "maintenance_windows",
        "backup_schedules",
        "deployment_restrictions",
        "monitoring_limitations"
    ]

    FOR pattern IN operational_patterns:
        IF found_in_evidence(context.evidence, pattern):
            constraints["OPS"].append(extract_constraint(pattern))

    RETURN constraints

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE CONSTRAINT DETAILS
# ────────────────────────────────────────────────────────────

FUNCTION generate_constraint(category, sequence, constraint_data):
    constraint_id = f"CON-{category}-{sequence:03d}"

    constraint = {
        "id": constraint_id,
        "name": constraint_data.name_vi,
        "description": constraint_data.description_vi,
        "impact": constraint_data.impact_vi,
        "rationale": constraint_data.rationale_vi,
        "mitigation": constraint_data.mitigation_vi
    }

    RETURN constraint

# ────────────────────────────────────────────────────────────
# STEP 4: FORMAT OUTPUT
# ────────────────────────────────────────────────────────────

FUNCTION format_section(constraints_by_category, context):
    output = []

    output.append("## 6. Constraints (Ràng buộc)\n\n")

    section_number = 1
    FOR category IN context.categories:
        IF constraints_by_category[category.code].length > 0:
            output.append(f"### 6.{section_number} {category.name_vi} ({category.name})\n\n")

            FOR constraint IN constraints_by_category[category.code]:
                output.append(format_constraint(constraint))

            section_number += 1

    RETURN "".join(output)

FUNCTION format_constraint(constraint):
    output = []

    # Header
    output.append(f"#### {constraint.id}: {constraint.name}\n\n")

    # Description
    output.append(f"**Mô tả (Description):**\n")
    output.append(f"{constraint.description}\n\n")

    # Impact
    output.append(f"**Impact:**\n")
    output.append(f"{constraint.impact}\n\n")

    # Rationale
    output.append(f"**Rationale:**\n")
    output.append(f"{constraint.rationale}\n\n")

    # Mitigation
    output.append(f"**Mitigation:**\n")
    output.append(f"{constraint.mitigation}\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: Constraint count meets scope level?
    constraint_count = count_constraints(result)
    IF constraint_count < context.constraint_targets.min:
        issues.append(f"Constraint count {constraint_count} below minimum {context.constraint_targets.min}")
    IF constraint_count > context.constraint_targets.max:
        issues.append(f"Constraint count {constraint_count} above maximum {context.constraint_targets.max}")

    # Q1: All constraints have required fields?
    required_fields = ["Mô tả", "Impact", "Rationale", "Mitigation"]
    FOR constraint IN extract_constraints(result):
        FOR field IN required_fields:
            IF NOT contains(constraint, field):
                issues.append(f"{constraint.id} missing field: {field}")

    # Q2: Constraint ID format correct (CON-TYPE-###)?
    con_ids = extract_constraint_ids(result)
    FOR con_id IN con_ids:
        IF NOT matches_pattern(con_id, r"CON-(TECH|BIZ|OPS)-\d{3}"):
            issues.append(f"Invalid constraint ID format: {con_id}")

    # Q2: All 3 categories present (for Full/Premium)?
    IF context.scope_level != "Core":
        FOR category IN ["TECH", "BIZ", "OPS"]:
            IF NOT has_category(result, category):
                issues.append(f"Missing constraint category: {category}")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "class ", "function ", "const ", "import ",
        "CREATE TABLE", "ALTER TABLE",
        "implementation", "code snippet"
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited content: {pattern}")

    # Q4: No vague constraints?
    vague_patterns = ["may have", "might be", "could cause", "possibly"]
    FOR pattern IN vague_patterns:
        IF contains(result, pattern):
            issues.append(f"Contains vague language: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
## 6. Constraints (Ràng buộc)

### 6.1 Ràng buộc Kỹ thuật (Technical Constraints)

#### CON-TECH-001: Giới hạn Concurrent Users (50 users)

**Mô tả (Description):**
Hệ thống hỗ trợ tối đa 50 concurrent users trên real-time dashboard. Vượt quá số này sẽ gây degradation về performance.

**Impact:**
- SignalR connections bị throttle khi > 50 users
- Dashboard update latency tăng lên > 1 giây
- Server memory usage tăng cao

**Rationale:**
- **Infrastructure**: Current server capacity optimized cho 50 users
- **Cost**: Scaling lên 100+ users yêu cầu infrastructure upgrade
- **Scope Level**: Full scope target 50 concurrent users

**Mitigation:**
- Implement connection pooling
- Auto-scale khi detect high load
- Caching strategy để reduce real-time calls
- Premium scope có thể support 200+ users

---

#### CON-TECH-002: Hokuto CSV Polling Interval (1 giây)

**Mô tả (Description):**
Dữ liệu từ xe trộn bê tông được poll mỗi 1 giây qua Hokuto CSV file watcher. Không thể giảm interval xuống thấp hơn.

**Impact:**
- Real-time data có delay tối thiểu 1 giây
- Burst data có thể bị miss nếu > 1 update/giây
- File system I/O load cao

**Rationale:**
- **External system**: Hokuto software exports CSV mỗi 1 giây
- **File system**: Polling nhanh hơn gây I/O contention
- **Network**: CSV file transfer có latency

**Mitigation:**
- Implement buffering cho burst data
- Batch processing multiple updates
- Consider WebSocket integration trong Premium scope

---

### 6.2 Ràng buộc Nghiệp vụ (Business Constraints)

#### CON-BIZ-001: Yêu cầu Approval cho Kết quả Test Ngoài Spec

**Mô tả (Description):**
Khi kết quả test chất lượng (slump, air content) ngoài specification, bắt buộc phải có approval từ Supervisor trước khi continue đổ bê tông.

**Impact:**
- Workflow bị block cho đến khi có approval
- Supervisor phải available để approve
- Delay trong quá trình đổ bê tông

**Rationale:**
- **Quality control**: Đảm bảo chất lượng bê tông theo tiêu chuẩn
- **Accountability**: Ghi nhận người chịu trách nhiệm
- **Compliance**: Yêu cầu từ quy trình thi công

**Mitigation:**
- Push notification cho Supervisor ngay lập tức
- Mobile app để approve từ xa
- Auto-escalation nếu không approval trong 15 phút

---

### 6.3 Ràng buộc Vận hành (Operational Constraints)

#### CON-OPS-001: Maintenance Window (2am-4am Chủ nhật)

**Mô tả (Description):**
Weekly maintenance window 2am-4am Chủ nhật (Vietnam time) cho system updates, database maintenance, backups.

**Impact:**
- Platform unavailable 2 tiếng/tuần
- Scheduled operations delayed
- Users không thể access hệ thống

**Rationale:**
- **System health**: Regular maintenance prevent issues
- **Performance**: Database optimization, index rebuilds
- **Low traffic**: 2am-4am Chủ nhật = lowest traffic period

**Mitigation:**
- Announce maintenance window 48 tiếng trước
- Display countdown timer trong app
- Minimize downtime (target < 1 tiếng actual)
- Critical operations avoid maintenance window

---

#### CON-OPS-002: Data Retention (5 năm)

**Mô tả (Description):**
Dữ liệu đổ bê tông và test chất lượng phải được lưu trữ tối thiểu 5 năm theo quy định pháp luật về hồ sơ công trình.

**Impact:**
- Database size tăng liên tục
- Query performance degradation cho old data
- Storage costs increase

**Rationale:**
- **Legal requirement**: Quy định về lưu trữ hồ sơ công trình
- **Audit trail**: Traceability cho inspection
- **Warranty**: Support warranty claims

**Mitigation:**
- Implement data archival strategy (yearly partitions)
- Cold storage cho data > 2 năm
- Compress archived data
- Indexed search cho archived data

---
```

---

## Constraint Categories Reference

| Category | Code | Focus Areas |
|----------|------|-------------|
| **Technical** | TECH | Performance limits, integration constraints, technology restrictions |
| **Business** | BIZ | Regulatory requirements, approval workflows, business rules |
| **Operational** | OPS | Support hours, maintenance, deployment, monitoring |

---

## Constraint → Basic Design Mapping

| Constraint Type | Maps to Basic Design |
|-----------------|---------------------|
| Technical Constraints | → Architecture constraints, scalability design |
| Business Constraints | → Business logic, validation rules |
| Operational Constraints | → Deployment strategy, monitoring design |

---

*Section 06: Constraints - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
