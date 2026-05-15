# Section 06: NFR Design - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate NFR Design sections (6.1, 6.2, 6.3) for Basic Design document.

This section covers Performance, Security, and Reliability design strategies.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Backend** | C# 12 + ASP.NET Core 8 |
| **Database** | SQL Server 2022 |
| **Real-time** | SignalR (50+ concurrent users) |

---

## Constraints

### MUST Include

1. **Section 6.1**: Performance Design (3-4 strategies)
2. **Section 6.2**: Security Design (3-4 strategies)
3. **Section 6.3**: Reliability Design (3-4 strategies)
4. **SRS References**: Each strategy must reference NFR IDs
5. **Pattern Alignment**: Match patterns from reasoning.json

### MUST Exclude

- ❌ Exact configuration values (pool size: 20, TTL: 300)
- ❌ SQL statements (CREATE INDEX, CREATE POLICY)
- ❌ Implementation code (C#, TypeScript)
- ❌ Algorithm details (AES-256-GCM specifics)
- ❌ English-only content (Vietnamese ≥60%)

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 06-nfr.md
# PURPOSE: Generate Sections 6.1, 6.2, 6.3 for Basic Design
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load reasoning.json for patterns
    reasoning_file = f".claude/memory-bank/master/{feature_code}-{sub_code}/reasoning.json"
    context.reasoning = json.load(reasoning_file)

    # Load SRS for NFR references
    srs_file = f"documents/features/{feature_code}-{sub_code}/{feature_code}-{sub_code}-srs.md"
    context.nfrs = extract_nfrs(read_file(srs_file))

    # Categorize NFRs
    context.perf_nfrs = filter(context.nfrs, category="PERF")
    context.sec_nfrs = filter(context.nfrs, category="SEC")
    context.rel_nfrs = filter(context.nfrs, category="REL")

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE PERFORMANCE DESIGN (6.1)
# ────────────────────────────────────────────────────────────

FUNCTION generate_performance_design(context):
    output = []

    output.append("### 6.1 Performance Design\n\n")

    # Strategy 1: Caching
    output.append("#### 6.1.1 Caching Strategy\n\n")
    output.append("**Mục đích:** Đảm bảo response time < 1 giây cho dashboard queries\n\n")
    output.append("**Configuration:**\n\n")
    output.append("- **Cache Layer**: SQL Server Memory Cache / IMemoryCache\n")
    output.append("- **Cache Targets**: Dashboard summaries, Master data, Lookup tables\n")
    output.append("- **Invalidation**: Event-driven (SignalR) + TTL-based\n\n")
    output.append("**Operations Affected:**\n\n")
    output.append("- Dashboard load: Database query → Cached query (< 100ms)\n")
    output.append("- Master data lookup: Always from cache (< 10ms)\n\n")
    output.append("**SRS Reference:** NFR-PERF-001 (Response time < 1 second)\n\n")
    output.append("---\n\n")

    # Strategy 2: SignalR Optimization
    output.append("#### 6.1.2 Real-time Performance (SignalR)\n\n")
    output.append("**Mục đích:** Hỗ trợ 50+ concurrent users với update latency < 1 giây\n\n")
    output.append("**Configuration:**\n\n")
    output.append("- **Transport**: WebSocket (preferred), fallback to Server-Sent Events\n")
    output.append("- **Hub Groups**: Organize clients by dashboard type\n")
    output.append("- **Message Size**: Minimal payload, delta updates only\n\n")
    output.append("**Operations Affected:**\n\n")
    output.append("- Dashboard update: Push-based, no polling overhead\n")
    output.append("- Alert notification: Real-time delivery to all clients\n\n")
    output.append("**SRS Reference:** NFR-PERF-002 (50+ concurrent users)\n\n")
    output.append("---\n\n")

    # Strategy 3: Database Optimization
    output.append("#### 6.1.3 Database Query Optimization\n\n")
    output.append("**Mục đích:** Đảm bảo query performance cho large datasets\n\n")
    output.append("**Configuration:**\n\n")
    output.append("- **Indexing**: Indexes on frequently queried columns\n")
    output.append("- **Pagination**: Server-side pagination cho large result sets\n")
    output.append("- **Eager Loading**: Include related entities to avoid N+1\n\n")
    output.append("**Operations Affected:**\n\n")
    output.append("- Casting list: Paginated với filter → < 500ms\n")
    output.append("- Quality test search: Indexed query → < 200ms\n\n")
    output.append("**SRS Reference:** NFR-PERF-003 (Query response < 500ms)\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE SECURITY DESIGN (6.2)
# ────────────────────────────────────────────────────────────

FUNCTION generate_security_design(context):
    output = []

    output.append("### 6.2 Security Design\n\n")

    # Strategy 1: Authentication
    output.append("#### 6.2.1 JWT Authentication\n\n")
    output.append("**Mục đích:** Xác thực user và cấp quyền truy cập\n\n")
    output.append("**Mechanism:**\n\n")
    output.append("- **Layer**: Application (ASP.NET Core Identity)\n")
    output.append("- **Token Type**: JWT với refresh token\n")
    output.append("- **Storage**: HttpOnly cookies (XSS protection)\n\n")
    output.append("**Policy:**\n\n")
    output.append("- Token expiry: Short-lived access token + Long-lived refresh token\n")
    output.append("- Role-based: Engineer, Manager, Admin, Supervisor\n")
    output.append("- Revocation: Blacklist trong cache\n\n")
    output.append("**SRS Reference:** NFR-SEC-001 (User authentication)\n\n")
    output.append("---\n\n")

    # Strategy 2: Authorization
    output.append("#### 6.2.2 Role-Based Access Control (RBAC)\n\n")
    output.append("**Mục đích:** Kiểm soát quyền truy cập theo role\n\n")
    output.append("**Mechanism:**\n\n")
    output.append("- **Layer**: Application (Authorization policies)\n")
    output.append("- **Enforcement**: Attribute-based trên controllers/actions\n")
    output.append("- **Granularity**: Feature-level và Data-level\n\n")
    output.append("**Policy:**\n\n")
    output.append("- Engineer: View/Edit casting data trong assigned projects\n")
    output.append("- Manager: View all, Approve quality test failures\n")
    output.append("- Admin: Full access, User management\n")
    output.append("- Supervisor: View all, Alert management, Quality approval\n\n")
    output.append("**SRS Reference:** NFR-SEC-002 (Role-based access)\n\n")
    output.append("---\n\n")

    # Strategy 3: Audit Trail
    output.append("#### 6.2.3 Audit Trail\n\n")
    output.append("**Mục đích:** Ghi lại tất cả thay đổi cho compliance và troubleshooting\n\n")
    output.append("**Mechanism:**\n\n")
    output.append("- **Layer**: Infrastructure (Entity Framework interceptors)\n")
    output.append("- **Storage**: Dedicated audit table\n")
    output.append("- **Scope**: All CRUD operations trên sensitive entities\n\n")
    output.append("**Policy:**\n\n")
    output.append("- Captured: User, Timestamp, Action, Before/After values\n")
    output.append("- Retention: Theo data retention policy (5 năm)\n")
    output.append("- Access: Admin và Auditor roles only\n\n")
    output.append("**SRS Reference:** NFR-SEC-003 (Audit trail)\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE RELIABILITY DESIGN (6.3)
# ────────────────────────────────────────────────────────────

FUNCTION generate_reliability_design(context):
    output = []

    output.append("### 6.3 Reliability Design\n\n")

    # Strategy 1: ACID Transactions
    output.append("#### 6.3.1 ACID Transactions\n\n")
    output.append("**Mục đích:** Đảm bảo data integrity cho casting records và quality tests\n\n")
    output.append("**Mechanism:**\n\n")
    output.append("- **Technology**: SQL Server transactions\n")
    output.append("- **Scope**: All write operations to related entities\n")
    output.append("- **Isolation**: Read Committed (default), Serializable for critical ops\n\n")
    output.append("**Flow:**\n\n")
    output.append("```\n")
    output.append("Transaction Start\n")
    output.append("  → Insert CastingRecord\n")
    output.append("  → Insert TruckLoads\n")
    output.append("  → Insert QualityTests\n")
    output.append("  → Update volume calculations\n")
    output.append("  → Commit (success) / Rollback (failure)\n")
    output.append("```\n\n")
    output.append("**SRS Reference:** NFR-REL-001 (Data integrity)\n\n")
    output.append("---\n\n")

    # Strategy 2: Optimistic Locking
    output.append("#### 6.3.2 Optimistic Locking\n\n")
    output.append("**Mục đích:** Xử lý concurrent updates không làm mất dữ liệu\n\n")
    output.append("**Mechanism:**\n\n")
    output.append("- **Technology**: Version column (RowVersion/Timestamp)\n")
    output.append("- **Scope**: All mutable entities\n")
    output.append("- **Detection**: Compare version on update\n\n")
    output.append("**Flow:**\n\n")
    output.append("```\n")
    output.append("User A reads entity (version: 1)\n")
    output.append("User B reads entity (version: 1)\n")
    output.append("User A updates → version: 2 (success)\n")
    output.append("User B updates → version mismatch → Conflict error\n")
    output.append("User B resolves conflict → retry with version: 2\n")
    output.append("```\n\n")
    output.append("**SRS Reference:** NFR-REL-002 (Concurrent update handling)\n\n")
    output.append("---\n\n")

    # Strategy 3: Retry Mechanisms
    output.append("#### 6.3.3 Retry Mechanisms\n\n")
    output.append("**Mục đích:** Xử lý transient failures từ external services\n\n")
    output.append("**Mechanism:**\n\n")
    output.append("- **Pattern**: Exponential backoff with jitter\n")
    output.append("- **Scope**: Hokuto CSV read, it-Concrete API calls\n")
    output.append("- **Circuit Breaker**: Stop retrying after threshold\n\n")
    output.append("**Flow:**\n\n")
    output.append("```\n")
    output.append("Request → Failure\n")
    output.append("  → Wait (exponential)\n")
    output.append("  → Retry 1 → Failure\n")
    output.append("  → Wait (longer)\n")
    output.append("  → Retry 2 → Success\n")
    output.append("OR\n")
    output.append("  → Max retries reached → Circuit open → Fallback/Alert\n")
    output.append("```\n\n")
    output.append("**SRS Reference:** NFR-REL-003 (Transient failure handling)\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: All 3 sections present with 3-4 strategies each?
    IF count_section_6_1_strategies(result) < 3:
        issues.append("Section 6.1 needs at least 3 strategies")
    IF count_section_6_2_strategies(result) < 3:
        issues.append("Section 6.2 needs at least 3 strategies")
    IF count_section_6_3_strategies(result) < 3:
        issues.append("Section 6.3 needs at least 3 strategies")

    # Q1: Each strategy has SRS Reference?
    IF count_srs_references(result) < 9:  # 3 strategies * 3 sections
        issues.append("Some strategies missing SRS references")

    # Q2: Strategies match patterns from reasoning.json?
    FOR pattern IN context.reasoning.patterns:
        IF pattern.category IN ["Performance", "Security", "Reliability"]:
            IF NOT contains(result, pattern.name):
                issues.append(f"Missing pattern from reasoning.json: {pattern.name}")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "pool_size:", "TTL:",
        "CREATE INDEX", "CREATE POLICY",
        "AES-256", "SHA-256",
        "class ", "public void",
        "connection string"
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
### 6.1 Performance Design

#### 6.1.1 Caching Strategy

**Mục đích:** Đảm bảo response time < 1 giây cho dashboard queries

**Configuration:**

- **Cache Layer**: SQL Server Memory Cache / IMemoryCache
- **Cache Targets**: Dashboard summaries, Master data
- **Invalidation**: Event-driven + TTL-based

**Operations Affected:**

- Dashboard load: Database query → Cached query (< 100ms)
- Master data lookup: Always from cache (< 10ms)

**SRS Reference:** NFR-PERF-001 (Response time < 1 second)

---

### 6.2 Security Design

#### 6.2.1 JWT Authentication

**Mục đích:** Xác thực user và cấp quyền truy cập

**Mechanism:**

- **Layer**: Application (ASP.NET Core Identity)
- **Token Type**: JWT với refresh token
- **Storage**: HttpOnly cookies

**Policy:**

- Engineer: View/Edit trong assigned projects
- Manager: View all, Approve failures
- Admin: Full access

**SRS Reference:** NFR-SEC-001 (User authentication)

---

### 6.3 Reliability Design

#### 6.3.1 ACID Transactions

**Mục đích:** Đảm bảo data integrity cho casting records

**Flow:**

```
Transaction Start
  → Insert CastingRecord
  → Insert TruckLoads
  → Commit / Rollback
```

**SRS Reference:** NFR-REL-001 (Data integrity)
```

---

*Section 06: NFR Design - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
