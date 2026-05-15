# FDD Micro-Agent: Error Handling (Section 06) - v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-06-error
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 6 - Error Handling
- **Output**: Section 6.1-6.9 (Error classification, HTTP mapping, Error messages, Display components, Recovery, Boundaries, Logging, Network, Flow)
- **Language**: Vietnamese >=60%
- **Renamed From**: fdd-09-error-handling.md

---

## Purpose

Generate **Section 6: Error Handling** for Frontend Detail Design document, including:
- **6.1**: Phan loai Loi (Error classification with severity)
- **6.2**: HTTP Status Code Mapping (Error codes -> User messages)
- **6.3**: Error Messages (Vietnamese user-friendly messages)
- **6.4**: Error Display Components (Toast, inline, banner, modal, error page, boundary)
- **6.5**: Error Recovery Actions (Retry, redirect, manual fix, contact support)
- **6.6**: Error Boundaries (React error boundaries strategy)
- **6.7**: Logging & Monitoring (Log levels, Sentry reporting)
- **6.8**: Network Error Handling (Offline scenarios, sync)
- **6.9**: Error Flow Diagram (Mermaid flowchart)

**CRITICAL**:
- NO React code (Error Boundary components)
- User messages MUST be Vietnamese
- Only error handling specifications

---

## Prerequisites / Context Loading

**From Orchestrator (via environment)**:
```javascript
ENV = {
  FEATURE_NAME: "LND",        // Feature code
  SUB_FEATURE: "BASE",        // Sub-feature code
  DEVELOPER: "Developer Name",
  REASONING_JSON: {...},      // Reasoning output (if available)
  SECTION_00_OUTPUT: "...",   // Section 00 output (Document Info)
  SECTION_01_OUTPUT: "...",   // Section 01 output (Overview)
  SECTION_02_OUTPUT: "...",   // Section 02 output (Business Flow)
  SECTION_03_OUTPUT: "...",   // Section 03 output (Screen Design)
  SECTION_04_OUTPUT: "...",   // Section 04 output (State Management)
  SECTION_05_OUTPUT: "...",   // Section 05 output (Data Integration)
}
```

**Auto-Read Files**:
1. **Section 05 Output**: Data Integration (for API error types)
2. **Section 03 Output**: Screen Design (for form validation errors)

**Context Loading Logic**:
```pseudo
FUNCTION load_context():
    context = {
        "feature": ENV["FEATURE_NAME"],
        "sub": ENV["SUB_FEATURE"],
        "reasoning": ENV["REASONING_JSON"]
    }

    # Load dependencies
    section_07 = READ_SECTION("07")  # Server State - API error responses
    section_08 = READ_SECTION("08")  # Form Handling - validation errors
    section_05 = READ_SECTION("05")  # Routing - navigation errors

    errors = context.reasoning.errors IF exists ELSE infer_common_errors()
    components = context.reasoning.components
    screens = context.reasoning.screens

    RETURN {context, errors, components, screens, section_07, section_08, section_05}
```

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: Section 06 - Xu ly Loi (Error Handling)
# PURPOSE: Generate error handling specifications
# INPUT: reasoning.json (errors, components, screens)
# OUTPUT: Markdown section (150-300 lines)
# ============================================================

# STEP 1: GENERATE ERROR CLASSIFICATION (6.1)
FUNCTION generate_error_classification():
    output = []
    output.append("## 06. Xu ly Loi (Error Handling)\n\n")
    output.append("### 6.1 Phan loai Loi\n\n")

    output.append("| Loai | Mo ta | Muc do | HTTP Status | Xu ly | User Impact |\n")
    output.append("|------|-------|--------|-------------|-------|-------------|\n")

    error_categories = [
        {"type": "Network", "desc": "Khong ket noi duoc server", "severity": "Critical", "status": "-", "handling": "Retry + Offline mode", "impact": "Cannot perform actions"},
        {"type": "Authentication", "desc": "Token het han/khong hop le", "severity": "Critical", "status": "401", "handling": "Redirect to login", "impact": "Forced logout"},
        {"type": "Authorization", "desc": "Khong co quyen truy cap", "severity": "High", "status": "403", "handling": "Show 403 page", "impact": "Access denied"},
        {"type": "Validation", "desc": "Du lieu khong hop le", "severity": "Medium", "status": "400", "handling": "Show inline errors", "impact": "Cannot submit"},
        {"type": "Not Found", "desc": "Resource khong ton tai", "severity": "Medium", "status": "404", "handling": "Show 404 page", "impact": "Content unavailable"},
        {"type": "Server Error", "desc": "Loi server", "severity": "High", "status": "500, 502, 503", "handling": "Toast + Support contact", "impact": "Temporary failure"},
        {"type": "Business Logic", "desc": "Vi pham business rule", "severity": "Medium", "status": "409, 422", "handling": "Toast + Guidance", "impact": "Rule violation"},
        {"type": "Rate Limit", "desc": "Too many requests", "severity": "Low", "status": "429", "handling": "Retry with backoff", "impact": "Temporary throttle"},
        {"type": "Render Error", "desc": "Component crash", "severity": "Critical", "status": "-", "handling": "Error boundary", "impact": "UI broken"}
    ]

    FOR category IN error_categories:
        output.append(f"| **{category.type}** | {category.desc} | {category.severity} | {category.status} | {category.handling} | {category.impact} |\n")

    output.append("\n")
    RETURN "".join(output)

# STEP 2: GENERATE HTTP STATUS CODE MAPPING (6.2)
FUNCTION generate_http_status_mapping():
    output = []
    output.append("### 6.2 HTTP Status Code Mapping\n\n")

    # Client errors (4xx)
    output.append("**Client Errors (4xx):**\n\n")
    output.append("| Status | Ten | Nguyen nhan | Message (User) | Recovery Action |\n")
    output.append("|--------|-----|-------------|----------------|-----------------||\n")

    client_errors = [
        {"status": "400", "name": "Bad Request", "cause": "Du lieu request khong hop le", "message": "Du lieu khong hop le. Vui long kiem tra lai.", "recovery": "Fix validation errors"},
        {"status": "401", "name": "Unauthorized", "cause": "Token het han hoac khong co", "message": "Phien dang nhap da het han. Vui long dang nhap lai.", "recovery": "Redirect to /login"},
        {"status": "403", "name": "Forbidden", "cause": "Khong co quyen truy cap", "message": "Ban khong co quyen truy cap tinh nang nay.", "recovery": "Show 403 page"},
        {"status": "404", "name": "Not Found", "cause": "Resource khong ton tai", "message": "Khong tim thay {resource} yeu cau.", "recovery": "Show 404 page"},
        {"status": "409", "name": "Conflict", "cause": "Duplicate hoac vi pham constraint", "message": "{Resource} nay da ton tai trong he thong.", "recovery": "Change input"},
        {"status": "422", "name": "Unprocessable Entity", "cause": "Business rule violation", "message": "Khong the thuc hien do: {reason}", "recovery": "Follow guidance"},
        {"status": "429", "name": "Too Many Requests", "cause": "Rate limit exceeded", "message": "Ban dang thao tac qua nhanh. Vui long cho {seconds}s.", "recovery": "Wait and retry"}
    ]

    FOR error IN client_errors:
        output.append(f"| {error.status} | {error.name} | {error.cause} | \"{error.message}\" | {error.recovery} |\n")

    output.append("\n")

    # Server errors (5xx)
    output.append("**Server Errors (5xx):**\n\n")
    output.append("| Status | Ten | Nguyen nhan | Message (User) | Recovery Action |\n")
    output.append("|--------|-----|-------------|----------------|-----------------||\n")

    server_errors = [
        {"status": "500", "name": "Internal Server Error", "cause": "Loi logic server", "message": "Da xay ra loi he thong. Vui long thu lai sau.", "recovery": "Retry / Contact support"},
        {"status": "502", "name": "Bad Gateway", "cause": "Gateway timeout", "message": "May chu dang ban. Vui long thu lai.", "recovery": "Retry with backoff"},
        {"status": "503", "name": "Service Unavailable", "cause": "Server dang bao tri", "message": "He thong dang bao tri. Vui long quay lai sau.", "recovery": "Show maintenance page"},
        {"status": "504", "name": "Gateway Timeout", "cause": "Request timeout", "message": "Yeu cau qua lau. Vui long thu lai.", "recovery": "Retry"}
    ]

    FOR error IN server_errors:
        output.append(f"| {error.status} | {error.name} | {error.cause} | \"{error.message}\" | {error.recovery} |\n")

    output.append("\n")
    RETURN "".join(output)

# STEP 3: GENERATE ERROR MESSAGES (6.3)
FUNCTION generate_error_messages(feature, sub):
    output = []
    output.append("### 6.3 Error Messages (Vietnamese)\n\n")
    output.append("**Application Error Codes:**\n\n")
    output.append("| Error Code | HTTP | Context | Message (User) | Recovery Action |\n")
    output.append("|------------|------|---------|----------------|-----------------||\n")

    # Common errors
    common_errors = [
        {"code": "ERR_NETWORK", "http": "-", "context": "Network unavailable", "message": "Khong the ket noi den may chu. Vui long kiem tra ket noi mang.", "recovery": "Retry button"},
        {"code": "ERR_TIMEOUT", "http": "-", "context": "Request timeout", "message": "Yeu cau qua lau. Vui long thu lai.", "recovery": "Retry button"},
        {"code": "ERR_AUTH_001", "http": "401", "context": "Token expired", "message": "Phien dang nhap da het han. Vui long dang nhap lai.", "recovery": "Redirect to /login"},
        {"code": "ERR_AUTH_002", "http": "403", "context": "Permission denied", "message": "Ban khong co quyen truy cap tinh nang nay. Lien he quan tri vien neu can.", "recovery": "Show 403 page"}
    ]

    FOR error IN common_errors:
        output.append(f"| **{error.code}** | {error.http} | {error.context} | {error.message} | {error.recovery} |\n")

    # Feature-specific errors
    feature_errors = generate_feature_specific_errors(feature, sub)
    FOR error IN feature_errors:
        output.append(f"| **{error.code}** | {error.http} | {error.context} | {error.message} | {error.recovery} |\n")

    output.append("\n")
    RETURN "".join(output)

# STEP 4: GENERATE ERROR DISPLAY COMPONENTS (6.4)
FUNCTION generate_error_display():
    output = []
    output.append("### 6.4 Error Display Components\n\n")
    output.append("**Component Types:**\n\n")
    output.append("| Component | Su dung khi | Layout | Duration | Dismissable | Example |\n")
    output.append("|-----------|-------------|--------|----------|-------------|---------||\n")
    output.append("| **Toast** | Network error, Server error, Success | Top-right corner | Auto-dismiss 5s | Yes (X button) | \"Loi ket noi mang\" |\n")
    output.append("| **Inline Error** | Form validation error | Below field, red text | Persistent | No (auto-clear on fix) | \"Email khong hop le\" |\n")
    output.append("| **Alert Banner** | Business logic error | Top of form/page | Persistent | Yes (X button) | \"So tien vuot gioi han\" |\n")
    output.append("| **Modal** | Critical action confirmation | Center screen, overlay | Persistent | Yes (Cancel button) | \"Ban co chac muon xoa?\" |\n")
    output.append("| **Error Page** | 403, 404, 500 | Full page | Permanent | No (navigation only) | 404 Not Found page |\n")
    output.append("| **Error Boundary** | Render error (component crash) | Full page or component area | Permanent | No (refresh/reset only) | \"Something went wrong\" |\n\n")

    # Toast severity levels
    output.append("**Toast Severity Levels:**\n\n")
    output.append("| Level | Color | Icon | Use Case | Example |\n")
    output.append("|-------|-------|------|----------|---------||\n")
    output.append("| **success** | Green | check | Action completed | \"Tao thanh cong\" |\n")
    output.append("| **info** | Blue | info | Information | \"Dang xu ly...\" |\n")
    output.append("| **warning** | Yellow | warning | Non-critical issue | \"Mot so truong bi bo trong\" |\n")
    output.append("| **error** | Red | x | Critical error | \"Khong the ket noi may chu\" |\n\n")

    RETURN "".join(output)

# STEP 5: GENERATE ERROR RECOVERY ACTIONS (6.5)
FUNCTION generate_error_recovery():
    output = []
    output.append("### 6.5 Error Recovery Actions\n\n")
    output.append("**Action Types:**\n\n")
    output.append("| Action | Trigger | Behavior | User Flow | Example |\n")
    output.append("|--------|---------|----------|-----------|---------||\n")
    output.append("| **Retry** | Network error, 5xx error | Retry last request with exponential backoff | User clicks \"Thu lai\" -> API call -> Show result | Network timeout -> Retry 3 times |\n")
    output.append("| **Refresh** | Stale data, 404 (might be cache) | Invalidate cache + refetch | User clicks \"Lam moi\" -> Refetch data | Item not found -> Refresh list |\n")
    output.append("| **Go Back** | 404, deleted resource | Navigate to previous page or list | Auto-redirect after 3s or user clicks \"Quay lai\" | Deleted -> Go to list |\n")
    output.append("| **Login** | 401 (auth expired) | Redirect to login with return URL | Auto-redirect to /login?returnUrl={current} | Token expired -> Login -> Return |\n")
    output.append("| **Contact Support** | 500, unrecoverable error | Open support form/email | User clicks \"Lien he ho tro\" -> Open support modal/email | Server error -> Contact support |\n")
    output.append("| **Ignore** | Non-critical warnings | Dismiss error, continue | User clicks \"Bo qua\" or auto-dismiss | Warning toast -> Auto-dismiss 5s |\n")
    output.append("| **Edit** | Validation error, 400 | Focus first error field | Auto-focus field -> User fixes -> Retry submit | Form error -> Focus field |\n\n")

    # Retry strategy
    output.append("**Retry Strategy:**\n\n")
    output.append("| Error Type | Max Retries | Delay | Backoff | Stop Condition |\n")
    output.append("|------------|-------------|-------|---------|----------------|\n")
    output.append("| Network error | 3 | 1s, 2s, 4s | Exponential (2x) | Success or 3 failures |\n")
    output.append("| 5xx Server error | 3 | 2s, 4s, 8s | Exponential (2x) | Success or 3 failures |\n")
    output.append("| 429 Rate limit | 5 | From Retry-After header | Linear | Success or 5 failures |\n")
    output.append("| 4xx Client error | 0 | - | - | Don't retry (user error) |\n\n")

    RETURN "".join(output)

# STEP 6: GENERATE ERROR BOUNDARIES (6.6)
FUNCTION generate_error_boundaries(components):
    output = []
    output.append("### 6.6 Error Boundaries\n\n")
    output.append("**Boundary Hierarchy:**\n\n")
    output.append("| Boundary | Scope | Fallback UI | Reset Action | Example |\n")
    output.append("|----------|-------|-------------|--------------|---------||\n")
    output.append("| **AppErrorBoundary** | Toan app (root) | Full-page error + \"Lam moi trang\" button | window.location.reload() | Uncaught error in any component |\n")
    output.append("| **RouteErrorBoundary** | Moi route (page level) | Error message + \"Quay lai\" button | router.back() | Error in DetailPage |\n")
    output.append("| **ComponentErrorBoundary** | Critical components (modals, forms) | Placeholder + \"Thu lai\" button | Re-render component | Error in CreateModal |\n")
    output.append("| **LazyErrorBoundary** | Lazy-loaded components | Loading skeleton + retry | Retry dynamic import | Error loading Module |\n\n")

    # Fallback UI specs
    output.append("**Fallback UI Specs:**\n\n")
    output.append("| Boundary | Layout | Content | Actions |\n")
    output.append("|----------|--------|---------|---------||\n")
    output.append("| AppErrorBoundary | Full page, centered | Icon + \"Da xay ra loi\" + Error message + Stack trace (dev only) | \"Lam moi trang\" button |\n")
    output.append("| RouteErrorBoundary | Page container | Icon + \"Khong the tai trang\" + Suggested actions | \"Quay lai\" / \"Ve trang chu\" |\n")
    output.append("| ComponentErrorBoundary | Component area | Icon + \"Khong the hien thi noi dung\" | \"Thu lai\" button |\n\n")

    RETURN "".join(output)

# STEP 7: GENERATE LOGGING & MONITORING (6.7)
FUNCTION generate_logging():
    output = []
    output.append("### 6.7 Logging & Monitoring\n\n")
    output.append("**Log Levels:**\n\n")
    output.append("| Error Type | Log Level | Log to Console | Report to Sentry | Include Stack Trace | Example |\n")
    output.append("|------------|-----------|----------------|------------------|---------------------|---------||\n")
    output.append("| Network error | warn | Yes (dev only) | No | No | Network timeout |\n")
    output.append("| Auth error (401) | info | Yes (dev only) | No | No | Token expired |\n")
    output.append("| Validation error | debug | Yes (dev only) | No | No | Form validation fail |\n")
    output.append("| Server error (5xx) | error | Yes | Yes | Yes | Internal server error |\n")
    output.append("| Render error | error | Yes | Yes | Yes | Component crash |\n")
    output.append("| Business logic error | warn | Yes (dev only) | No | No | Rule violation (409, 422) |\n\n")

    # Error metadata
    output.append("**Error Metadata:**\n\n")
    output.append("| Field | Type | Description | Example |\n")
    output.append("|-------|------|-------------|---------||\n")
    output.append("| errorCode | string | Application error code | \"ERR_XXX_001\" |\n")
    output.append("| httpStatus | number | HTTP status code | 404 |\n")
    output.append("| message | string | User-friendly message (Vietnamese) | \"Khong tim thay\" |\n")
    output.append("| endpoint | string | API endpoint | \"/api/v1/resource/123\" |\n")
    output.append("| userId | string | Current user ID (if authenticated) | \"user-456\" |\n")
    output.append("| timestamp | ISO 8601 | Error occurrence time | \"2025-12-11T10:30:00Z\" |\n")
    output.append("| stack | string | Stack trace (dev/staging only) | \"Error at Component.tsx:45\" |\n")
    output.append("| userAgent | string | Browser info | \"Chrome 120.0\" |\n\n")

    RETURN "".join(output)

# STEP 8: GENERATE NETWORK ERROR HANDLING (6.8)
FUNCTION generate_offline_handling():
    output = []
    output.append("### 6.8 Network Error Handling\n\n")
    output.append("**Offline Scenarios:**\n\n")
    output.append("| Scenario | Detection | Behavior | User Message | Recovery |\n")
    output.append("|----------|-----------|----------|--------------|----------|\n")
    output.append("| **Initial load offline** | navigator.onLine = false | Show cached data + offline banner | \"Dang offline. Hien thi du lieu da luu.\" | Auto-hide when online |\n")
    output.append("| **Action while offline** | API call fails + offline | Queue action in localStorage | \"Se thuc hien khi co ket noi tro lai.\" | Auto-sync when online |\n")
    output.append("| **Back online** | online event | Sync queued actions + refetch | \"Da ket noi tro lai. Dang dong bo du lieu...\" | Auto-dismiss after sync |\n")
    output.append("| **Offline for long time** | Cache expired | Show stale data warning | \"Du lieu co the da cu. Vui long ket noi mang.\" | Refetch button |\n\n")

    # Offline features
    output.append("**Offline Features:**\n\n")
    output.append("| Feature | Offline Support | Behavior | Limitation |\n")
    output.append("|---------|----------------|----------|------------|\n")
    output.append("| View list | Yes | Show cached list | May be stale |\n")
    output.append("| View detail | Yes | Show cached detail | May be stale |\n")
    output.append("| Create new | Queued | Queue for sync | Pending until online |\n")
    output.append("| Update existing | Queued | Queue for sync | Pending until online |\n")
    output.append("| Delete | Queued | Queue for sync | Pending until online |\n")
    output.append("| Search/Filter | Yes | Search in cached data | Limited to cache |\n")
    output.append("| File upload | No | Disabled | Requires network |\n\n")

    RETURN "".join(output)

# STEP 9: GENERATE ERROR FLOW DIAGRAM (6.9)
FUNCTION generate_error_flow():
    output = []
    output.append("### 6.9 Error Flow Diagram\n\n")
    output.append("**Error Handling Flow:**\n\n")
    output.append("```mermaid\n")
    output.append("flowchart TD\n")
    output.append("    A[API Call / User Action] --> B{Error Occurred?}\n")
    output.append("    B -->|No| C[Success Flow]\n")
    output.append("    B -->|Yes| D{Error Type?}\n\n")
    output.append("    D -->|Network Error| E[Toast: Khong ket noi]\n")
    output.append("    E --> F{Retry?}\n")
    output.append("    F -->|Yes| G[Retry with backoff<br/>Max 3 times]\n")
    output.append("    G -->|Success| C\n")
    output.append("    G -->|All failed| H[Show retry button]\n\n")
    output.append("    D -->|401 Auth| I[Clear auth tokens]\n")
    output.append("    I --> J[Redirect to /login<br/>?returnUrl=current]\n\n")
    output.append("    D -->|403 Forbidden| K[Show 403 Page<br/>Lien he Admin]\n\n")
    output.append("    D -->|404 Not Found| L[Show 404 Page<br/>Quay lai]\n\n")
    output.append("    D -->|400 Validation| M[Map errors to fields]\n")
    output.append("    M --> N[Show inline errors<br/>Focus first field]\n\n")
    output.append("    D -->|409 Conflict| O[Toast: Da ton tai]\n")
    output.append("    O --> P[Suggest alternative]\n\n")
    output.append("    D -->|422 Business Rule| Q[Toast: Vi pham rule]\n")
    output.append("    Q --> R[Show guidance]\n\n")
    output.append("    D -->|5xx Server Error| S[Toast: Loi he thong]\n")
    output.append("    S --> T{Retry?}\n")
    output.append("    T -->|Yes| G\n")
    output.append("    T -->|No| U[Contact Support button]\n\n")
    output.append("    D -->|Render Error| V[Error Boundary catches]\n")
    output.append("    V --> W[Show fallback UI<br/>Reset/Refresh button]\n\n")
    output.append("    style C fill:#d4edda\n")
    output.append("    style E fill:#f8d7da\n")
    output.append("    style I fill:#fff3cd\n")
    output.append("    style K fill:#f8d7da\n")
    output.append("    style L fill:#f8d7da\n")
    output.append("    style N fill:#fff3cd\n")
    output.append("    style O fill:#fff3cd\n")
    output.append("    style S fill:#f8d7da\n")
    output.append("    style V fill:#f8d7da\n")
    output.append("```\n\n")

    RETURN "".join(output)

# STEP 10: ASSEMBLE COMPLETE OUTPUT
FUNCTION main():
    data = load_context()
    output = []

    # Generate all sections
    output.append(generate_error_classification())
    output.append(generate_http_status_mapping())
    output.append(generate_error_messages(data.context.feature, data.context.sub))
    output.append(generate_error_display())
    output.append(generate_error_recovery())
    output.append(generate_error_boundaries(data.components))
    output.append(generate_logging())
    output.append(generate_offline_handling())
    output.append(generate_error_flow())

    result = "".join(output)

    # Validation
    errors = validate_output(result, data)
    IF errors:
        RAISE Error(f"Validation failed: {', '.join(errors)}")

    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(output, data):
    errors = []

    # Q1: Evidence-Based?
    IF "6.1 Phan loai Loi" NOT IN output:
        errors.append("Missing error classification section")
    IF "6.2 HTTP Status Code Mapping" NOT IN output:
        errors.append("Missing HTTP status mapping")
    IF "Error Boundaries" NOT IN output:
        errors.append("Missing error boundaries section")

    # Q2: Consistency?
    IF "Error Flow Diagram" NOT IN output OR "```mermaid" NOT IN output:
        errors.append("Missing error flow diagram")

    # Q3: Vietnamese >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(output)
    IF vietnamese_ratio < 0.60:
        errors.append(f"Vietnamese ratio {vietnamese_ratio:.0%} < 60%")

    # Q4: No Prohibited Content?
    prohibited_patterns = ["componentDidCatch", "getDerivedStateFromError", "axios.interceptors", "onError:", "throwOnError", "try {", "catch ("]
    FOR pattern IN prohibited_patterns:
        IF pattern IN output:
            errors.append(f"Contains prohibited implementation code: {pattern}")

    RETURN errors
```

---

## Output Format

**Generated Markdown** (200-350 lines) containing sections 6.1-6.9 as specified in pseudo-code above.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **Section 05 not found** | Data Integration missing | Generate Section 05 first |
| **User messages in English** | Not translated | Translate all user messages to Vietnamese |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |

---

## Notes

- **Error Handling Stack**: React Error Boundaries (React 18), react-hot-toast (2.x), React Query error handling (5.x), Axios interceptors (1.x), Sentry (optional)
- **Error Handling Patterns**: Error Boundaries (render errors), Toast Notifications (non-blocking), Inline Errors (form validation), Error Pages (critical 404/500), Retry Mechanisms (transient failures)
- **Length**: 150-300 lines
- **Language**: Vietnamese >=60% (error messages, descriptions), English (error codes, technical terms)
- **Line Width**: <=150 characters
- **Error Messages**: All user-facing messages in Vietnamese

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-06-error.md) + template (06-error.md) into single file
- Removed JIT template loading (dead path)
- Inlined all pseudo-code logic from template
- Expanded from 4 subsections (6.1-6.4) to 9 subsections (6.1-6.9)

**v3.0 (2025-12-12)**:
- Renamed from fdd-09-error-handling.md -> fdd-06-error.md
- Switched to JIT template loading pattern
- Updated to match new 06-error.md template
- Added 4 subsections (6.1-6.4) structure
- Enhanced validation (Q1-Q4)
- Vietnamese user message requirements enforced

---

*FDD Micro-Agent: Error Handling - v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x + React Query*
