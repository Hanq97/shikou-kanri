# Section 03: Non-Functional Requirements - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Non-Functional Requirements section (Section 3) for SRS document.

This section defines HOW WELL the system must perform - quality attributes including Performance, Security, Reliability, and Scalability with measurable targets.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Domain** | Civil Engineering / Tunnel Construction |
| **Focus** | Quality attributes with measurable targets |
| **Traceability** | NFR → Basic Design Technical Strategies |

---

## Constraints

### MUST Include

1. **NFR ID Format**: `NFR-[CATEGORY]-[###]` (e.g., NFR-PERF-001)
2. **4 Categories Required**: Performance, Security, Reliability, Scalability
3. **Each NFR has**: Description, Measurable Target, Measurement Method, Rationale
4. **Measurable Targets**: Specific numbers (response time, uptime %, etc.)

### MUST Exclude

- ❌ Implementation solutions (HOW to achieve)
- ❌ Technology stack (Redis for caching, etc.)
- ❌ Architecture patterns (Load balancer, etc.)
- ❌ Infrastructure specs (CPU, RAM, etc.)
- ❌ Source code or configuration

### NFR Count by Scope Level

| Scope | PERF | SEC | REL | SCAL | Total |
|-------|------|-----|-----|------|-------|
| **Core** | 2-3 | 2-3 | 1-2 | 1-2 | 5-8 |
| **Full** | 4-6 | 4-6 | 3-4 | 2-3 | 12-18 |
| **Premium** | 8-10 | 8-10 | 5-6 | 4-5 | 25+ |

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 03-non-functional-requirements.md
# PURPOSE: Generate Non-Functional Requirements section
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load innovation results for scope level
    innovation = read_file(f".claude/memory-bank/master/{feature_code}/innovation.md")
    context.scope_level = extract_scope_level(innovation)

    # Load evidence for NFR targets
    evidence = read_file(f".claude/memory-bank/master/{feature_code}/evidence.md")
    context.nfr_requirements = extract_nfr_requirements(evidence)

    # Determine NFR count based on scope
    nfr_counts = {
        "Core": {"total": 5-8, "perf": 2-3, "sec": 2-3, "rel": 1-2, "scal": 1-2},
        "Full": {"total": 12-18, "perf": 4-6, "sec": 4-6, "rel": 3-4, "scal": 2-3},
        "Premium": {"total": 25+, "perf": 8-10, "sec": 8-10, "rel": 5-6, "scal": 4-5}
    }
    context.nfr_targets = nfr_counts[context.scope_level]

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE NFRs BY CATEGORY
# ────────────────────────────────────────────────────────────

FUNCTION generate_nfr(nfr_number, category, requirement):
    nfr_id = f"NFR-{category}-{nfr_number:03d}"

    nfr = {
        "id": nfr_id,
        "title": requirement.title,
        "description": generate_description(requirement),
        "target": requirement.measurable_target,
        "measurement": requirement.measurement_method,
        "rationale": requirement.rationale
    }

    RETURN nfr

FUNCTION generate_description(requirement):
    # Vietnamese-first format
    description = f"Hệ thống phải {requirement.capability_vi} ({requirement.capability_en})."
    RETURN description

# ────────────────────────────────────────────────────────────
# STEP 3: FORMAT OUTPUT
# ────────────────────────────────────────────────────────────

FUNCTION format_section(nfrs_by_category):
    output = []

    output.append("## 3. Yêu cầu Phi Chức năng (Non-Functional Requirements)\n\n")

    # 3.1 Performance
    output.append("### 3.1 Yêu cầu Hiệu năng (Performance Requirements)\n\n")
    FOR nfr IN nfrs_by_category["PERF"]:
        output.append(format_nfr(nfr))

    # 3.2 Security
    output.append("### 3.2 Yêu cầu Bảo mật (Security Requirements)\n\n")
    FOR nfr IN nfrs_by_category["SEC"]:
        output.append(format_nfr(nfr))

    # 3.3 Reliability
    output.append("### 3.3 Yêu cầu Độ tin cậy (Reliability Requirements)\n\n")
    FOR nfr IN nfrs_by_category["REL"]:
        output.append(format_nfr(nfr))

    # 3.4 Scalability
    output.append("### 3.4 Yêu cầu Khả năng mở rộng (Scalability Requirements)\n\n")
    FOR nfr IN nfrs_by_category["SCAL"]:
        output.append(format_nfr(nfr))

    RETURN "".join(output)

FUNCTION format_nfr(nfr):
    output = []

    # Header
    output.append(f"#### {nfr.id}: {nfr.title}\n\n")

    # Description
    output.append(f"**Mô tả (Description):**\n")
    output.append(f"{nfr.description}\n\n")

    # Measurable Target
    output.append(f"**Chỉ tiêu (Target):** {nfr.target}\n\n")

    # Measurement Method
    output.append(f"**Phương pháp đo (Measurement):** {nfr.measurement}\n\n")

    # Rationale
    output.append(f"**Lý do (Rationale):** {nfr.rationale}\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: NFR count matches scope level?
    nfr_count = count_nfrs(result)
    IF nfr_count < context.nfr_targets.total.min:
        issues.append(f"NFR count {nfr_count} below minimum")

    # Q1: All 4 categories present?
    categories = ["3.1 Yêu cầu Hiệu năng", "3.2 Yêu cầu Bảo mật",
                  "3.3 Yêu cầu Độ tin cậy", "3.4 Yêu cầu Khả năng mở rộng"]
    FOR category IN categories:
        IF NOT contains(result, category):
            issues.append(f"Missing category: {category}")

    # Q2: Each NFR has measurable target?
    FOR nfr IN extract_nfrs(result):
        IF NOT has_measurable_target(nfr):
            issues.append(f"{nfr.id} missing measurable target")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content (implementation solutions)?
    prohibited = [
        "Redis", "PostgreSQL", "MongoDB", "SQL Server",
        "NestJS", "React", "SignalR", "Hangfire",
        "Load balancer", "Auto-scaling", "Kubernetes",
        "connection pool", "thread pool",
        "class ", "function ", "interface "
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains implementation detail: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
## 3. Yêu cầu Phi Chức năng (Non-Functional Requirements)

### 3.1 Yêu cầu Hiệu năng (Performance Requirements)

#### NFR-PERF-001: Thời gian Phản hồi Dashboard

**Mô tả (Description):**
Hệ thống phải hiển thị dashboard giám sát đổ bê tông (monitoring dashboard) trong thời gian phản hồi chấp nhận được.

**Chỉ tiêu (Target):** Response time ≤ 1 giây (P95)

**Phương pháp đo (Measurement):** Đo thời gian từ request đến render hoàn tất, tính percentile 95

**Lý do (Rationale):** Người dùng cần thấy dữ liệu real-time để giám sát quá trình đổ bê tông hiệu quả

---

#### NFR-PERF-002: Cập nhật Real-time

**Mô tả (Description):**
Hệ thống phải cập nhật dữ liệu giám sát (monitoring data) theo thời gian thực với độ trễ tối thiểu.

**Chỉ tiêu (Target):** Update interval = 1 giây, latency ≤ 500ms

**Phương pháp đo (Measurement):** Đo thời gian từ data change đến UI update

**Lý do (Rationale):** Đảm bảo người dùng thấy dữ liệu mới nhất để đưa ra quyết định kịp thời

---

#### NFR-PERF-003: Concurrent Users

**Mô tả (Description):**
Hệ thống phải hỗ trợ nhiều người dùng đồng thời (concurrent users) mà không giảm hiệu năng.

**Chỉ tiêu (Target):** Support ≥ 50 concurrent users

**Phương pháp đo (Measurement):** Load test với 50+ simulated users, đo response time

**Lý do (Rationale):** Nhiều kỹ sư và quản lý có thể giám sát cùng lúc trong giờ cao điểm

---

### 3.2 Yêu cầu Bảo mật (Security Requirements)

#### NFR-SEC-001: Xác thực Bắt buộc

**Mô tả (Description):**
Tất cả API và màn hình quản lý phải yêu cầu xác thực người dùng (user authentication).

**Chỉ tiêu (Target):** 100% protected endpoints

**Phương pháp đo (Measurement):** Security audit, penetration testing

**Lý do (Rationale):** Bảo vệ dữ liệu dự án khỏi truy cập trái phép

---

#### NFR-SEC-002: Audit Log

**Mô tả (Description):**
Hệ thống phải ghi nhận audit log cho mọi thay đổi dữ liệu quan trọng (critical data changes).

**Chỉ tiêu (Target):** 100% critical operations logged

**Phương pháp đo (Measurement):** Log analysis, audit report

**Lý do (Rationale):** Đáp ứng yêu cầu kiểm toán và truy xuất nguồn gốc

---

### 3.3 Yêu cầu Độ tin cậy (Reliability Requirements)

#### NFR-REL-001: System Uptime

**Mô tả (Description):**
Hệ thống phải duy trì độ khả dụng cao (high availability) trong giờ làm việc.

**Chỉ tiêu (Target):** Uptime ≥ 99.9% (measured monthly)

**Phương pháp đo (Measurement):** Monitoring system, uptime report

**Lý do (Rationale):** Quá trình đổ bê tông không thể dừng, cần hệ thống luôn available

---

#### NFR-REL-002: Data Integrity

**Mô tả (Description):**
Hệ thống phải đảm bảo tính toàn vẹn dữ liệu (data integrity) cho tất cả giao dịch.

**Chỉ tiêu (Target):** 0 data corruption incidents

**Phương pháp đo (Measurement):** Data validation checks, integrity reports

**Lý do (Rationale):** Dữ liệu chất lượng bê tông cần chính xác cho báo cáo và kiểm định

---

### 3.4 Yêu cầu Khả năng mở rộng (Scalability Requirements)

#### NFR-SCAL-001: Data Volume Growth

**Mô tả (Description):**
Hệ thống phải xử lý được khối lượng dữ liệu tăng trưởng (data volume growth) theo thời gian dự án.

**Chỉ tiêu (Target):** Support ≥ 1 triệu records/năm

**Phương pháp đo (Measurement):** Performance test với large dataset

**Lý do (Rationale):** Dự án dài hạn sẽ tích lũy nhiều dữ liệu casting và testing

---
```

---

## Traceability to Basic Design

| SRS Section 3 Element | Maps to Basic Design |
|----------------------|---------------------|
| NFR-PERF-001 | → Performance Design Strategy |
| NFR-SEC-001 | → Security Architecture |
| NFR-REL-001 | → Reliability Design |
| NFR-SCAL-001 | → Scalability Strategy |

---

*Section 03: Non-Functional Requirements - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
