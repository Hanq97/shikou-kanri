# Section 05: State Management - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate State Management sections (5.1-5.5) for Basic Design document.

This section covers backend state, frontend state, cache, sync, and consistency.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Backend** | C# 12 + ASP.NET Core 8 |
| **Frontend** | React 18 + TypeScript + React Query |
| **Cache** | SQL Server Cache / Memory Cache |
| **Real-time** | SignalR |

---

## Constraints

### MUST Include

1. **Section 5.1**: Backend State Management (stateless services, session, events)
2. **Section 5.2**: Frontend State Management (server state, UI state, persistent)
3. **Section 5.3**: Cache Strategy (cache-aside, invalidation)
4. **Section 5.4**: Synchronization Strategy (optimistic update, event-driven)
5. **Section 5.5**: State Consistency Model (strong, eventual, weak)

### MUST Exclude

- ❌ Implementation code (C#, React hooks, SQL)
- ❌ Connection pool sizes, TTL values, connection strings
- ❌ Redux action/reducer code
- ❌ English-only content (Vietnamese ≥60%)

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 05-state.md
# PURPOSE: Generate Sections 5.1-5.5 for Basic Design
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load reasoning.json for technologies
    reasoning_file = f".claude/memory-bank/master/{feature_code}-{sub_code}/reasoning.json"
    context.reasoning = json.load(reasoning_file)

    # Load SRS for NFR references
    srs_file = f"documents/features/{feature_code}-{sub_code}/{feature_code}-{sub_code}-srs.md"
    context.nfrs = extract_nfrs(read_file(srs_file))

    # Load previous sections
    context.components = context.reasoning.components
    context.technologies = context.reasoning.technologies
    context.entities = extract_entities_from_section4()

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE BACKEND STATE (5.1)
# ────────────────────────────────────────────────────────────

FUNCTION generate_backend_state(context):
    output = []

    output.append("### 5.1 Backend State Management\n\n")

    # Architecture diagram
    output.append("**Architecture:**\n\n")
    output.append("```\n")
    output.append("""
┌─────────────────────────────────────────────────────────────┐
│                    ASP.NET Core Service                      │
│                       (Stateless)                            │
├─────────────────────────────────────────────────────────────┤
│  Controller Layer    │  Service Layer    │  Repository      │
│  (API endpoints)     │  (Business logic) │  (Data access)   │
└─────────────┬────────┴─────────┬─────────┴────────┬─────────┘
              │                  │                  │
              │ JWT Auth         │ Events           │ ACID Tx
              ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Memory Cache   │  │   SignalR Hub   │  │   SQL Server    │
│  (Session/JWT)  │  │   (Real-time)   │  │   (Persistent)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
""")
    output.append("```\n\n")

    # Design principles
    output.append("**Design Principles:**\n\n")
    output.append("- **Stateless Services**: Không lưu state trong service, scale horizontally\n")
    output.append("- **JWT Authentication**: Token-based, không cần session server\n")
    output.append("- **ACID Transactions**: SQL Server đảm bảo data integrity\n")
    output.append("- **Event-Driven**: SignalR cho real-time updates\n\n")

    # Data types per store
    output.append("**State Storage:**\n\n")
    output.append("| Store | Data Types | Lifecycle |\n")
    output.append("|-------|------------|------------|\n")
    output.append("| **SQL Server** | Casting records, Quality tests, Master data | Persistent (ACID) |\n")
    output.append("| **Memory Cache** | JWT tokens, Session data, Cached queries | TTL-based |\n")
    output.append("| **SignalR** | Real-time events, Dashboard updates | Connection-based |\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE FRONTEND STATE (5.2)
# ────────────────────────────────────────────────────────────

FUNCTION generate_frontend_state(context):
    output = []

    output.append("\n### 5.2 Frontend State Management\n\n")

    # Architecture diagram
    output.append("**Architecture:**\n\n")
    output.append("```\n")
    output.append("""
┌─────────────────────────────────────────────────────────────┐
│                    React Application                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Server State  │  │    UI State     │  │  Real-time  │ │
│  │  (React Query)  │  │   (useState)    │  │  (SignalR)  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                  │        │
│           │ API calls          │ Component        │ Events │
│           ▼                    ▼                  ▼        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Component Tree (Dashboard, Forms)          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
""")
    output.append("```\n\n")

    # State categories table
    output.append("**State Categories:**\n\n")
    output.append("| Category | Tool | Data Types | Lifecycle |\n")
    output.append("|----------|------|------------|------------|\n")
    output.append("| **Server State** | React Query | Casting data, Quality tests | API-synced (staleTime: 5min) |\n")
    output.append("| **UI State** | useState/useReducer | Form inputs, Modal visibility | Component-scoped |\n")
    output.append("| **Real-time State** | SignalR | Live updates, Notifications | Connection-based |\n")
    output.append("| **URL State** | React Router | Filters, Pagination, Selected tab | URL params |\n\n")

    # Component examples
    output.append("**Component Examples:**\n\n")
    output.append("- **Dashboard**: Server state (React Query) + Real-time (SignalR)\n")
    output.append("- **Quality Test Form**: UI state (form inputs) + Server state (submit)\n")
    output.append("- **Report Page**: Server state (paginated data) + URL state (filters)\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE CACHE STRATEGY (5.3)
# ────────────────────────────────────────────────────────────

FUNCTION generate_cache_strategy(context):
    output = []

    output.append("\n### 5.3 Cache Strategy\n\n")

    output.append("**Pattern:** Cache-Aside (Lazy Loading)\n\n")

    # Cache-aside flow
    output.append("**Cache-Aside Flow:**\n\n")
    output.append("```\n")
    output.append("""
Client Request
    │
    ▼
┌─────────────────────┐
│   Check Cache       │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
   HIT        MISS
    │           │
    │           ▼
    │   ┌─────────────────────┐
    │   │   Query SQL Server  │
    │   └─────────┬───────────┘
    │             │
    │             ▼
    │   ┌─────────────────────┐
    │   │   Store in Cache    │
    │   └─────────┬───────────┘
    │             │
    └─────────────┤
                  ▼
            Response (< 100ms for HIT, < 500ms for MISS)
""")
    output.append("```\n\n")

    # Invalidation triggers
    output.append("**Invalidation Triggers:**\n\n")
    output.append("- **Event-driven**: Khi có casting mới → invalidate dashboard cache\n")
    output.append("- **TTL-based**: Auto-expire sau N phút\n")
    output.append("- **Manual**: Admin clear cache khi cần\n\n")

    # Fallback strategy
    output.append("**Fallback Strategy:**\n\n")
    output.append("- Cache unavailable → Query SQL Server directly (degraded performance)\n")
    output.append("- SQL Server slow → Return stale cache if acceptable\n")
    output.append("- Both fail → Return error với retry mechanism\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: GENERATE SYNC STRATEGY (5.4)
# ────────────────────────────────────────────────────────────

FUNCTION generate_sync_strategy(context):
    output = []

    output.append("\n### 5.4 Synchronization Strategy\n\n")

    # Optimistic update flow
    output.append("**Optimistic Update Flow:**\n\n")
    output.append("```\n")
    output.append("""
User Action (e.g., Submit Quality Test)
    │
    ▼
1. Update UI immediately (optimistic)
    │
    ▼
2. Send mutation to backend
    │
    ├── Success ──► Invalidate cache ──► Refetch data
    │
    └── Failure ──► Rollback UI ──► Show error message
""")
    output.append("```\n\n")

    # Event-driven sync
    output.append("**Event-Driven Sync (SignalR):**\n\n")
    output.append("```\n")
    output.append("""
Backend (New Casting Data)
    │
    ▼ Publish event
┌─────────────────────┐
│   SignalR Hub       │
└─────────┬───────────┘
          │
          ▼ Broadcast to all clients
┌─────────────────────┐
│   React Clients     │
│   (50+ concurrent)  │
└─────────┬───────────┘
          │
          ▼ Invalidate affected queries
      Dashboard Updated (< 1 second)
""")
    output.append("```\n\n")

    # Conflict resolution
    output.append("**Conflict Resolution:**\n\n")
    output.append("- **Strategy**: Optimistic Locking (version-based)\n")
    output.append("- **Detection**: Compare version numbers on update\n")
    output.append("- **Resolution**: Show conflict dialog, let user choose action\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 6: GENERATE CONSISTENCY MODEL (5.5)
# ────────────────────────────────────────────────────────────

FUNCTION generate_consistency_model(context):
    output = []

    output.append("\n### 5.5 State Consistency Model\n\n")

    # 3-layer diagram
    output.append("**3-Layer Consistency:**\n\n")
    output.append("```\n")
    output.append("""
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: SQL Server (Primary)                              │
│  Consistency: STRONG (ACID Transactions)                    │
│  Latency: < 500ms                                           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Memory Cache                                      │
│  Consistency: EVENTUAL (TTL-based invalidation)             │
│  Latency: < 50ms                                            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: React Query Cache                                 │
│  Consistency: EVENTUAL (staleTime + SignalR invalidation)   │
│  Latency: < 10ms                                            │
└─────────────────────────────────────────────────────────────┘
""")
    output.append("```\n\n")

    # Consistency levels table
    output.append("**Consistency Levels:**\n\n")
    output.append("| Operation | Consistency | Latency | Trade-off |\n")
    output.append("|-----------|-------------|---------|------------|\n")
    output.append("| Read (cached) | Eventual | < 50ms | Fast but may be stale |\n")
    output.append("| Read (fresh) | Strong | < 500ms | Slow but always current |\n")
    output.append("| Write | Strong | < 500ms | ACID guaranteed |\n")
    output.append("| Real-time sync | Eventual | < 1s | Near real-time updates |\n\n")

    # Trade-offs
    output.append("**Trade-offs:**\n\n")
    output.append("- ✅ Fast reads (cache) vs ❌ Stale data risk (acceptable for dashboard)\n")
    output.append("- ✅ Strong write consistency vs ❌ Higher latency (required for quality tests)\n")
    output.append("- ✅ Real-time updates vs ❌ Network overhead (worth it for 50+ users)\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 7: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: All 5 sections present?
    required_sections = ["5.1", "5.2", "5.3", "5.4", "5.5"]
    FOR section IN required_sections:
        IF NOT contains(result, section):
            issues.append(f"Missing section: {section}")

    # Q1: Technologies match reasoning.json?
    FOR tech IN context.technologies:
        IF NOT contains(result, tech.name):
            issues.append(f"Missing technology: {tech.name}")

    # Q2: Cache strategy aligns with Section 4 entities?
    FOR entity IN context.entities:
        # At least some entities should be mentioned in cache context
        pass

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "connection.Open()", "SqlConnection",
        "useQuery(", "useState(",
        "pool_size", "TTL:",
        "connection string", "password"
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited code: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
### 5.1 Backend State Management

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ASP.NET Core Service                      │
│                       (Stateless)                            │
├─────────────────────────────────────────────────────────────┤
│  Controller Layer    │  Service Layer    │  Repository      │
└─────────────┬────────┴─────────┬─────────┴────────┬─────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Memory Cache   │  │   SignalR Hub   │  │   SQL Server    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Design Principles:**

- **Stateless Services**: Không lưu state trong service, scale horizontally
- **JWT Authentication**: Token-based, không cần session server
- **ACID Transactions**: SQL Server đảm bảo data integrity

...

### 5.5 State Consistency Model

**3-Layer Consistency:**

```
Layer 1: SQL Server     → STRONG (ACID)
Layer 2: Memory Cache   → EVENTUAL (TTL)
Layer 3: React Query    → EVENTUAL (staleTime)
```

**Trade-offs:**

- ✅ Fast reads (cache) vs ❌ Stale data risk
- ✅ Strong write consistency vs ❌ Higher latency
```

---

*Section 05: State Management - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
