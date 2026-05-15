# Section 03: Data Flow - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Data Flow sections (3.1, 3.2, 3.3) for Basic Design document.

This section shows use cases, main data flows, and event patterns.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Real-time** | SignalR (1-second updates) |
| **Integration** | Hokuto CSV, it-Concrete API |
| **Format** | Tables + ASCII flow diagrams |

---

## Constraints

### MUST Include

1. **Section 3.1**: Use Case Overview (5-15 use cases)
2. **Section 3.2**: Main Data Flows (3-5 flows with ASCII diagrams)
3. **Section 3.3**: Event Flow (sync vs async operations)
4. **FR References**: Each use case maps to ≥1 FR
5. **Components**: Use names from Section 2.1

### MUST Exclude

- ❌ Implementation code or method calls
- ❌ API endpoint paths (POST /api/v1/...)
- ❌ Request/response JSON payloads
- ❌ Database queries
- ❌ English-only content (Vietnamese ≥60%)

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 03-dataflow.md
# PURPOSE: Generate Sections 3.1, 3.2, 3.3 for Basic Design
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load reasoning.json
    reasoning_file = f".claude/memory-bank/master/{feature_code}-{sub_code}/reasoning.json"
    context.reasoning = json.load(reasoning_file)

    # Load SRS for FR references
    srs_file = f"documents/features/{feature_code}-{sub_code}/{feature_code}-{sub_code}-srs.md"
    context.srs = read_file(srs_file)
    context.frs = extract_frs(context.srs)

    # Load Section 2.1 for component names
    context.components = context.reasoning.components

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE USE CASE OVERVIEW (3.1)
# ────────────────────────────────────────────────────────────

FUNCTION generate_use_case_overview(context):
    output = []

    output.append("### 3.1 Use Case Overview\n\n")
    output.append("| UC ID | Use Case | Actor | Trigger | SRS Reference |\n")
    output.append("|-------|----------|-------|---------|---------------|\n")

    # Derive use cases from FRs
    uc_number = 1
    FOR fr IN context.frs:
        uc_id = f"UC-{uc_number:02d}"
        use_case_name = derive_use_case_name(fr)
        actor = derive_actor(fr)
        trigger = derive_trigger(fr)

        output.append(f"| {uc_id} | {use_case_name} | {actor} | {trigger} | {fr.id} |\n")
        uc_number += 1

    output.append("\n")

    RETURN "".join(output)

FUNCTION derive_actor(fr):
    # Actor types based on FR description
    IF contains(fr.description, "User") OR contains(fr.description, "Engineer"):
        RETURN "User"
    ELIF contains(fr.description, "Admin"):
        RETURN "Admin"
    ELIF contains(fr.description, "scheduled") OR contains(fr.description, "automatic"):
        RETURN "System (auto)"
    ELIF contains(fr.description, "registration") OR contains(fr.description, "auto"):
        RETURN "User (auto)"
    ELSE:
        RETURN "User"

FUNCTION derive_trigger(fr):
    IF contains(fr.description, "scheduled"):
        RETURN "Scheduled job"
    ELIF contains(fr.description, "event") OR contains(fr.description, "trigger"):
        RETURN "Event"
    ELIF contains(fr.description, "registration"):
        RETURN "User registration"
    ELSE:
        RETURN "User request"

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE MAIN DATA FLOWS (3.2)
# ────────────────────────────────────────────────────────────

FUNCTION generate_main_data_flows(context):
    output = []

    output.append("### 3.2 Main Data Flows\n\n")

    # Select 3-5 most important flows
    important_flows = select_important_flows(context)

    flow_number = 1
    FOR flow IN important_flows:
        output.append(f"#### 3.2.{flow_number} {flow.name}\n\n")

        # Use Case Details table
        output.append("**Use Case Details:**\n\n")
        output.append("| UC ID | Use Case | Actor | Trigger | Communication | SRS Reference |\n")
        output.append("|-------|----------|-------|---------|---------------|---------------|\n")
        output.append(f"| {flow.uc_id} | {flow.name} | {flow.actor} | {flow.trigger} | {flow.communication} | {flow.fr_id} |\n")
        output.append("\n")

        # Flow Diagram
        output.append("**Flow Diagram:**\n\n")
        output.append("```\n")
        output.append(generate_flow_diagram(flow, context))
        output.append("```\n\n")

        output.append("---\n\n")
        flow_number += 1

    RETURN "".join(output)

FUNCTION generate_flow_diagram(flow, context):
    # Template-based flow diagrams
    diagrams = {
        "Hokuto CSV Import": """
┌─────────────────────┐
│  Hokuto CSV File    │
│  (External Source)  │
└────────┬────────────┘
         │ 1-second polling
         ▼
┌─────────────────────────────────────┐
│    EXTERNAL_INTEGRATION             │
│    (File Watcher + Parser)          │
└────────┬────────────────────────────┘
         │
         │ 1. Parse CSV data
         │ 2. Validate format
         │ 3. Transform to domain
         ▼
┌─────────────────────────────────────┐
│    CASTING_MANAGEMENT               │
│    (Process casting data)           │
└────────┬────────────────────────────┘
         │
         │ 4. Save to database
         │ 5. Trigger SignalR event
         ▼
┌─────────────────────────────────────┐
│    SQL Server + SignalR Hub         │
│    (Persist + Broadcast)            │
└─────────────────────────────────────┘
""",
        "Real-time Dashboard Update": """
┌─────────────────────┐
│  New Casting Data   │
│  (From Integration) │
└────────┬────────────┘
         │ Event trigger
         ▼
┌─────────────────────────────────────┐
│    CASTING_MANAGEMENT               │
│    (Data saved to DB)               │
└────────┬────────────────────────────┘
         │
         │ 1. Publish event to SignalR
         ▼
┌─────────────────────────────────────┐
│    SignalR Hub                      │
│    (Broadcast to clients)           │
└────────┬────────────────────────────┘
         │
         │ 2. Push to all connected clients
         ▼
┌─────────────────────────────────────┐
│    Browser Clients (50+)            │
│    (React Dashboard)                │
└─────────────────────────────────────┘
         │
         │ 3. Update UI < 1 second
         ▼
      [Dashboard Updated]
""",
        "Quality Test Recording": """
┌─────────────────────┐
│  Engineer           │
│  (Input test data)  │
└────────┬────────────┘
         │ Submit test results
         ▼
┌─────────────────────────────────────┐
│    QUALITY_TESTING                  │
│    (Validate + Record)              │
└────────┬────────────────────────────┘
         │
         │ 1. Validate slump, air, temp values
         │ 2. Check against specifications
         ▼
┌─────────────────────────────────────┐
│    Validation Check                 │
└────────┬────────────────────────────┘
         │
         ├── PASS ──► Save to DB ──► Success Response
         │
         └── FAIL ──► Return validation errors
                      (Highlight out-of-spec values)
"""
    }

    RETURN diagrams.get(flow.name, generate_default_flow_diagram(flow))

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE EVENT FLOW (3.3)
# ────────────────────────────────────────────────────────────

FUNCTION generate_event_flow(context):
    output = []

    output.append("### 3.3 Event Flow\n\n")

    # Synchronous Operations
    output.append("**Synchronous Operations** (REST API):\n\n")
    sync_ops = [
        "Dashboard data queries (immediate response required)",
        "Quality test validation (user waiting for result)",
        "Casting record lookup (search operations)",
        "Report generation requests (user-initiated)"
    ]
    FOR op IN sync_ops:
        output.append(f"- {op}\n")

    output.append("\n")

    # Asynchronous Operations
    output.append("**Asynchronous Operations** (Events via SignalR):\n\n")
    async_ops = [
        "Hokuto CSV import (triggered by file watcher every 1 second)",
        "Real-time dashboard updates (pushed to 50+ clients)",
        "Alert notifications (quality test failures)",
        "it-Concrete data sync (background polling every 1 minute)",
        "Report generation (long-running, notify when complete)"
    ]
    FOR op IN async_ops:
        output.append(f"- {op}\n")

    output.append("\n")

    # Event Processing Details
    output.append("**Event Processing:**\n\n")
    output.append("- **Delivery**: At-Least-Once (retry on failure)\n")
    output.append("- **Idempotency**: Check timestamp/version before processing\n")
    output.append("- **Error Handling**: Log and alert on repeated failures\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: Use cases match FRs from SRS?
    uc_count = count_use_cases(result)
    IF uc_count < 5 OR uc_count > 15:
        issues.append(f"Use case count out of range: {uc_count} (need 5-15)")

    # Q1: All main FRs covered?
    FOR fr IN context.frs:
        IF NOT contains(result, fr.id):
            issues.append(f"FR not referenced: {fr.id}")

    # Q2: Data flows reference components from Section 2?
    FOR component IN context.components:
        IF NOT contains(result, component.name):
            issues.append(f"Component not in flows: {component.name}")

    # Q2: 3-5 flows present?
    flow_count = count_flow_diagrams(result)
    IF flow_count < 3 OR flow_count > 5:
        issues.append(f"Flow count out of range: {flow_count} (need 3-5)")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "POST /api", "GET /api", "PUT /api",
        "request:", "response:",
        "SELECT ", "INSERT ", "UPDATE ",
        "class ", "function ", "const "
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited content: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
### 3.1 Use Case Overview

| UC ID | Use Case | Actor | Trigger | SRS Reference |
|-------|----------|-------|---------|---------------|
| UC-01 | Import dữ liệu từ Hokuto CSV | System (auto) | 1-second polling | FR-INT-BASE-001 |
| UC-02 | Xem Dashboard Giám sát | User | User request | FR-MON-BASE-001 |
| UC-03 | Ghi nhận Kết quả Test Chất lượng | User | User request | FR-QLT-BASE-001 |
| UC-04 | Sync dữ liệu từ it-Concrete | System (auto) | 1-minute polling | FR-INT-BASE-002 |
| UC-05 | Nhận Alert khi có vấn đề | User | Event trigger | FR-MON-BASE-002 |
| UC-06 | Tạo Báo cáo Đổ bê tông | User | User request | FR-RPT-BASE-001 |
| UC-07 | Xem Chi tiết Lô Đổ | User | User request | FR-CST-BASE-003 |

---

### 3.2 Main Data Flows

#### 3.2.1 Hokuto CSV Import

**Use Case Details:**

| UC ID | Use Case | Actor | Trigger | Communication | SRS Reference |
|-------|----------|-------|---------|---------------|---------------|
| UC-01 | Import dữ liệu từ Hokuto CSV | System (auto) | 1-second polling | Async (File Watcher) | FR-INT-BASE-001 |

**Flow Diagram:**

```
┌─────────────────────┐
│  Hokuto CSV File    │
│  (External Source)  │
└────────┬────────────┘
         │ 1-second polling
         ▼
┌─────────────────────────────────────┐
│    EXTERNAL_INTEGRATION             │
│    (File Watcher + Parser)          │
└────────┬────────────────────────────┘
         │
         │ 1. Parse CSV data
         │ 2. Validate format
         │ 3. Transform to domain
         ▼
┌─────────────────────────────────────┐
│    CASTING_MANAGEMENT               │
│    (Process casting data)           │
└────────┬────────────────────────────┘
         │
         │ 4. Save to database
         │ 5. Trigger SignalR event
         ▼
┌─────────────────────────────────────┐
│    SQL Server + SignalR Hub         │
│    (Persist + Broadcast)            │
└─────────────────────────────────────┘
```

---

#### 3.2.2 Real-time Dashboard Update

**Use Case Details:**

| UC ID | Use Case | Actor | Trigger | Communication | SRS Reference |
|-------|----------|-------|---------|---------------|---------------|
| UC-02 | Xem Dashboard Giám sát | User | Event trigger | Async (SignalR) | FR-MON-BASE-001 |

**Flow Diagram:**

```
┌─────────────────────┐
│  New Casting Data   │
│  (From Integration) │
└────────┬────────────┘
         │ Event trigger
         ▼
┌─────────────────────────────────────┐
│    CASTING_MANAGEMENT               │
│    (Data saved to DB)               │
└────────┬────────────────────────────┘
         │
         │ 1. Publish event to SignalR
         ▼
┌─────────────────────────────────────┐
│    SignalR Hub                      │
│    (Broadcast to clients)           │
└────────┬────────────────────────────┘
         │
         │ 2. Push to all connected clients
         ▼
┌─────────────────────────────────────┐
│    Browser Clients (50+)            │
│    (React Dashboard)                │
└─────────────────────────────────────┘
         │
         │ 3. Update UI < 1 second
         ▼
      [Dashboard Updated]
```

---

### 3.3 Event Flow

**Synchronous Operations** (REST API):

- Dashboard data queries (immediate response required)
- Quality test validation (user waiting for result)
- Casting record lookup (search operations)
- Report generation requests (user-initiated)

**Asynchronous Operations** (Events via SignalR):

- Hokuto CSV import (triggered by file watcher every 1 second)
- Real-time dashboard updates (pushed to 50+ clients)
- Alert notifications (quality test failures)
- it-Concrete data sync (background polling every 1 minute)
- Report generation (long-running, notify when complete)

**Event Processing:**

- **Delivery**: At-Least-Once (retry on failure)
- **Idempotency**: Check timestamp/version before processing
- **Error Handling**: Log and alert on repeated failures
```

---

*Section 03: Data Flow - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
