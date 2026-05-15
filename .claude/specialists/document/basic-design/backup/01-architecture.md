# Section 01: Architecture - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Architecture sections (1.1 and 1.2) for Basic Design document.

This section visualizes system architecture and documents architectural patterns.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Backend** | C# 12 + ASP.NET Core 8 |
| **Database** | SQL Server 2022 |
| **Real-time** | SignalR |
| **Format** | ASCII diagrams + Pattern descriptions |

---

## Constraints

### MUST Include

1. **Section 1.1**: System Architecture Diagram (ASCII, 150 chars max per line)
2. **Section 1.2**: Architectural Patterns (4-6 patterns with ASCII diagrams)
3. **Components**: From reasoning.json (EXACT names)
4. **Technologies**: From reasoning.json (PostgreSQL → SQL Server for this project)
5. **Pattern Justification**: NFR references from reasoning.json

### MUST Exclude

- ❌ New components not in reasoning.json
- ❌ New patterns not in reasoning.json
- ❌ Implementation code (SQL, C#, TypeScript)
- ❌ Exceed 150 chars per line in ASCII diagrams
- ❌ English-only content (Vietnamese ≥60%)

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 01-architecture.md
# PURPOSE: Generate Sections 1.1 and 1.2 for Basic Design
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load reasoning.json
    reasoning_file = f".claude/memory-bank/master/{feature_code}-{sub_code}/reasoning.json"
    context.reasoning = json.load(reasoning_file)

    # Extract components, patterns, technologies
    context.components = context.reasoning.components
    context.patterns = context.reasoning.patterns
    context.technologies = context.reasoning.technologies

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE SYSTEM ARCHITECTURE DIAGRAM (1.1)
# ────────────────────────────────────────────────────────────

FUNCTION generate_architecture_diagram(context):
    output = []

    output.append("### 1.1 System Architecture Diagram\n\n")
    output.append("```\n")

    # Service box header
    service_name = f"{context.feature_code}-{context.sub_code} Service"
    output.append(f"┌{'─' * 78}┐\n")
    output.append(f"│{'':^78}│\n")
    output.append(f"│{service_name:^78}│\n")
    output.append(f"│{'':^78}│\n")

    # Component boxes (from reasoning.json)
    component_width = 20
    FOR i, component IN enumerate(context.components):
        # Draw component box
        output.append(draw_component_box(component, component_width))

    # Technology boxes
    output.append("\n")
    FOR tech IN context.technologies:
        output.append(draw_technology_box(tech))

    output.append(f"└{'─' * 78}┘\n")
    output.append("```\n\n")

    # Component descriptions (Vietnamese)
    output.append("**Mô tả kiến trúc (Architecture Description):**\n\n")
    FOR component IN context.components:
        output.append(f"- **{component.name}**: {component.responsibility}\n")

    output.append("\n")

    # Technology descriptions
    output.append("**Technologies:**\n\n")
    FOR tech IN context.technologies:
        output.append(f"- **{tech.name}**: {tech.purpose}\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE ARCHITECTURAL PATTERNS (1.2)
# ────────────────────────────────────────────────────────────

FUNCTION generate_architectural_patterns(context):
    output = []

    output.append("### 1.2 Architectural Patterns\n\n")

    FOR i, pattern IN enumerate(context.patterns):
        output.append(f"#### Pattern {i+1}: {pattern.name}\n\n")

        # Pattern metadata
        output.append(f"**Category:** {pattern.category}\n\n")

        # Purpose (Vietnamese)
        output.append(f"**Mục đích:** {generate_purpose_vi(pattern)}\n\n")

        # ASCII diagram for pattern flow
        output.append("**Cách hoạt động:**\n\n")
        output.append("```\n")
        output.append(generate_pattern_diagram(pattern))
        output.append("```\n\n")

        # Rationale with NFR references
        output.append("**Lý do chọn:**\n\n")
        FOR nfr IN pattern.nfrs:
            output.append(f"- {nfr}: {generate_nfr_reason(nfr, pattern)}\n")

        output.append("\n---\n\n")

    RETURN "".join(output)

FUNCTION generate_pattern_diagram(pattern):
    # Pattern-specific diagrams
    diagrams = {
        "Cache-Aside Pattern": """
Client Request
    │
    ▼
┌─────────────┐    ┌─────────────┐
│   Service   │───►│    Cache    │
└─────────────┘    └─────────────┘
    │ MISS              │ HIT
    ▼                   │
┌─────────────┐         │
│  Database   │         │
└─────────────┘         │
    │                   │
    └───────────────────┘
         Response
""",
        "Real-time SignalR Updates": """
Data Source (Hokuto CSV)
    │
    ▼ (1-second polling)
┌─────────────────────┐
│  Background Service │
│    (Hangfire)       │
└─────────────────────┘
    │
    ▼ (SignalR Hub)
┌─────────────────────┐
│   SignalR Server    │
└─────────────────────┘
    │
    ▼ (WebSocket)
┌─────────────────────┐
│  Browser Clients    │
│   (50+ concurrent)  │
└─────────────────────┘
""",
        "ACID Transactions": """
Transaction Start
    │
    ▼
┌─────────────────────┐
│  Operation 1        │
│  (Write to Table A) │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Operation 2        │
│  (Write to Table B) │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Validation Check   │
└─────────────────────┘
    │
    ├── Success ──► COMMIT
    │
    └── Failure ──► ROLLBACK
""",
        "Event-Driven Architecture": """
┌─────────────────────┐
│  Producer Service   │
│  (Casting Service)  │
└─────────────────────┘
    │
    ▼ Publish Event
┌─────────────────────┐
│   Message Queue     │
│   (SignalR/Memory)  │
└─────────────────────┘
    │
    ▼ Consume Event
┌─────────────────────┐
│  Consumer Service   │
│  (Dashboard/Report) │
└─────────────────────┘
""",
        "Clean Architecture with DDD": """
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (Controllers, ViewModels)        │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│        Application Layer            │
│    (Use Cases, DTOs, Mappers)       │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│          Domain Layer               │
│    (Entities, Value Objects)        │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      Infrastructure Layer           │
│    (Repositories, External APIs)    │
└─────────────────────────────────────┘
"""
    }

    RETURN diagrams.get(pattern.name, generate_default_diagram(pattern))

# ────────────────────────────────────────────────────────────
# STEP 4: FORMAT OUTPUT
# ────────────────────────────────────────────────────────────

FUNCTION format_section(context):
    output = []

    # Section 1.1
    output.append(generate_architecture_diagram(context))

    # Section 1.2
    output.append(generate_architectural_patterns(context))

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: All components from reasoning.json included?
    FOR component IN context.components:
        IF NOT contains(result, component.name):
            issues.append(f"Missing component: {component.name}")

    # Q1: All technologies from reasoning.json included?
    FOR tech IN context.technologies:
        IF NOT contains(result, tech.name):
            issues.append(f"Missing technology: {tech.name}")

    # Q2: All patterns from reasoning.json described?
    FOR pattern IN context.patterns:
        IF NOT contains(result, pattern.name):
            issues.append(f"Missing pattern: {pattern.name}")

    # Q2: Each pattern has ASCII diagram?
    pattern_count = count_patterns(result)
    diagram_count = count_ascii_blocks(result)
    IF diagram_count < pattern_count + 1:  # +1 for architecture diagram
        issues.append("Some patterns missing ASCII diagrams")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "CREATE TABLE", "ALTER TABLE", "SELECT ",
        "class ", "public void", "private ",
        "import ", "using System",
        "connection string", "password"
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited content: {pattern}")

    # Q4: ASCII diagram line length ≤150?
    FOR line IN result.split("\n"):
        IF len(line) > 150:
            issues.append(f"Line too long: {len(line)} chars")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
### 1.1 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CST-BASE Service Architecture                         │
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │ CASTING_        │   │ QUALITY_        │   │ MONITORING_     │           │
│  │ MANAGEMENT      │   │ TESTING         │   │ DASHBOARD       │           │
│  │                 │   │                 │   │                 │           │
│  │ - Casting entry │   │ - Slump test    │   │ - Real-time     │           │
│  │ - Truck track   │   │ - Air content   │   │ - Alerts        │           │
│  │ - Volume calc   │   │ - Temperature   │   │ - Charts        │           │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘           │
│           │                     │                     │                     │
│           └──────────┬──────────┴──────────┬──────────┘                     │
│                      │                     │                                │
│           ┌──────────▼─────────┐  ┌────────▼─────────┐  ┌──────────────┐  │
│           │   SQL Server       │  │   SignalR Hub    │  │  Hangfire    │  │
│           │   (ACID Storage)   │  │   (Real-time)    │  │  (Jobs)      │  │
│           └────────────────────┘  └──────────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘

External Dependencies:
- Hokuto CSV: Dữ liệu từ xe trộn bê tông (1-second polling)
- it-Concrete API: Dữ liệu dự án từ hệ thống quản lý
```

**Mô tả kiến trúc (Architecture Description):**

- **CASTING_MANAGEMENT**: Quản lý thông tin đổ bê tông và xe trộn
- **QUALITY_TESTING**: Quản lý kiểm tra chất lượng bê tông (slump, air, temp)
- **MONITORING_DASHBOARD**: Hiển thị real-time dashboard và alerts
- **EXTERNAL_INTEGRATION**: Tích hợp với Hokuto CSV và it-Concrete API

**Technologies:**

- **SQL Server 2022**: Primary database with ACID compliance
- **SignalR**: Real-time updates (1-second polling)
- **Hangfire**: Background jobs for CSV polling

---

### 1.2 Architectural Patterns

#### Pattern 1: Real-time SignalR Updates

**Category:** Integration

**Mục đích:** Cung cấp cập nhật real-time cho 50+ concurrent users với latency < 1 giây

**Cách hoạt động:**

```
Data Source (Hokuto CSV)
    │
    ▼ (1-second polling)
┌─────────────────────┐
│  Background Service │
│    (Hangfire)       │
└─────────────────────┘
    │
    ▼ (SignalR Hub)
┌─────────────────────┐
│   SignalR Server    │
└─────────────────────┘
    │
    ▼ (WebSocket)
┌─────────────────────┐
│  Browser Clients    │
│   (50+ concurrent)  │
└─────────────────────┘
```

**Lý do chọn:**

- NFR-PERF-001: Yêu cầu update latency < 1 giây cho dashboard
- NFR-PERF-002: Hỗ trợ 50+ concurrent users
- NFR-INT-001: Tích hợp với Hokuto CSV real-time

---

#### Pattern 2: ACID Transactions

**Category:** Reliability

**Mục đích:** Đảm bảo tính toàn vẹn dữ liệu cho casting records và quality tests

**Cách hoạt động:**

```
Transaction Start
    │
    ▼
┌─────────────────────┐
│  Insert Casting     │
│  Record             │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Insert Quality     │
│  Test Results       │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Update Volume      │
│  Calculations       │
└─────────────────────┘
    │
    ├── Success ──► COMMIT (All changes saved)
    │
    └── Failure ──► ROLLBACK (No changes)
```

**Lý do chọn:**

- NFR-REL-001: Yêu cầu data integrity cho casting records
- NFR-REL-002: Không được mất dữ liệu quality test

---
```

---

*Section 01: Architecture - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
