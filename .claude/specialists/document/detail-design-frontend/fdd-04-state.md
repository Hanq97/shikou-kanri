# FDD-04: State Management v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-04-state
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 4 - State Management
- **Output**: Section 4.1-4.4 (State classification, Redux slices, local states, state flows)
- **Language**: Vietnamese >=60%
- **Renamed From**: fdd-06-ui-state.md

---

## Purpose

Generate **Section 4: State Management** for Frontend Detail Design document, including:
- **4.1**: Phan loai State (Local, Shared, Global, Server)
- **4.2**: Redux Slice Specifications (UI state management)
- **4.3**: Local State Patterns (Component-specific states)
- **4.4**: State Flow Diagrams (State transitions)

**CRITICAL**:
- NO Redux code (slices, reducers, actions)
- NO TypeScript interfaces
- Only state specifications and patterns

---

## Prerequisites / Context Loading

**From Orchestrator (via environment)**:

| Parameter | Source | Example |
|-----------|--------|---------|
| FEATURE_NAME | ENV | "LND" |
| SUB_FEATURE | ENV | "BASE" |
| DEVELOPER | ENV | "Developer Name" |
| SECTION_03_OUTPUT | ENV | Section 03 output (screen design) |

**Auto-Read Files**:
1. **Section 03 Output**: Screen Design (for component state needs)
2. **Basic Design**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-basic-design.md`
   - Section 2: Component Overview (for state architecture)

### State Management Stack

| Aspect | Technology | Purpose | Scope | When to Use |
|--------|------------|---------|-------|-------------|
| **Global State** | Redux Toolkit | UI state, user preferences | Application-wide | Auth, theme, notifications |
| **Server State** | React Query | API data, caching, sync | Data fetching | Lists, details, mutations |
| **Local State** | useState/useReducer | Component-specific state | Single component | Modal open, input value |
| **Form State** | React Hook Form | Form values, validation | Form components | Create/edit forms |
| **URL State** | React Router (searchParams) | Navigation, filters, pagination | Route-based | Shareable/bookmarkable state |

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: Section 04 - State Management
# PURPOSE: Generate UI state management specifications
# INPUT: reasoning.json (states, components, screens)
# OUTPUT: Markdown section (200-350 lines)
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context():
    context = {
        "feature": ENV["FEATURE_NAME"],
        "sub": ENV["SUB_FEATURE"],
        "reasoning": ENV["REASONING_JSON"]
    }

    section_03 = READ_FILE(f"documents/features/{context.feature}/{context.sub}-frontend-detail-design.md")
    components = context.reasoning.components
    screens = context.reasoning.screens
    states = context.reasoning.states IF exists ELSE infer_from_components(components)

    RETURN {context, components, screens, states, section_03}

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE STATE CLASSIFICATION (4.1)
# ────────────────────────────────────────────────────────────

FUNCTION generate_state_classification(states, components, screens):
    output = []
    output.append("## 4. State Management\n\n")
    output.append("### 4.1 Phan loai State (State Classification)\n\n")

    # Classification table
    output.append("| Loai | Pham vi | Vi du | Pattern | Ly do chon |\n")
    output.append("|------|---------|-------|---------|------------|\n")
    output.append("| Local State | Component | Form input, modal open/close | useState | Chi 1 component can |\n")
    output.append("| Shared State | Module | Current filters, selected items | Redux Slice | Nhieu components chia se |\n")
    output.append("| Global State | Application | User info, theme, notifications | Redux Store | Toan app can access |\n")
    output.append("| Server State | API Data | List items, detail data | React Query | Data tu server |\n\n")

    # Examples section
    output.append("**Examples:**\n\n")

    output.append("**Local State** (Component-specific):\n")
    local_states = filter_states(states, scope="component")
    FOR state IN local_states[:3]:
        output.append(f"- `{state.name}`: {state.type} - {state.description_vi} (chi {state.component} component can)\n")

    output.append("\n**Shared State** (Module/Feature-specific):\n")
    shared_states = filter_states(states, scope="module")
    FOR state IN shared_states[:3]:
        components_using = get_components_using_state(state, components)
        output.append(f"- `{state.name}`: {state.type} - {state.description_vi} ({', '.join(components_using)})\n")

    output.append("\n**Global State** (Application-wide):\n")
    global_states = filter_states(states, scope="global")
    FOR state IN global_states[:3]:
        output.append(f"- `{state.name}`: {state.type} - {state.description_vi} ({state.usage_context})\n")

    output.append("\n**Server State** (API-driven):\n")
    server_states = infer_server_states(screens, components)
    FOR state IN server_states[:3]:
        output.append(f"- `{state.name}`: {state.type} - {state.description_vi} (cached by React Query)\n")
    output.append("\n")

    # Decision criteria
    output.append("**Decision Criteria:**\n\n")
    output.append("| Question | Answer | State Type |\n")
    output.append("|----------|--------|------------|\n")
    output.append("| Chi 1 component can? | Yes | Local State |\n")
    output.append("| Nhieu components trong module can? | Yes | Shared State (Redux) |\n")
    output.append("| Toan app can? | Yes | Global State (Redux) |\n")
    output.append("| Data tu API? | Yes | Server State (React Query) |\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE REDUX SLICE SPECS (4.2)
# ────────────────────────────────────────────────────────────

FUNCTION generate_redux_slice_specs(feature, sub, states, screens):
    output = []
    output.append("### 4.2 Redux Slice Specifications (SPECS ONLY - NO CODE)\n\n")

    slice_name = f"{feature}{sub}UISlice"
    output.append(f"#### {slice_name}\n\n")
    output.append(f"**Purpose:** Quan ly UI state cho module {feature}-{sub} (filters, selections, view modes)\n\n")

    # State properties table
    output.append("| State Property | Type | Default Value | Description | When to Update |\n")
    output.append("|----------------|------|---------------|-------------|----------------|\n")

    ui_states = filter_states(states, scope="module", type="ui")
    FOR state IN ui_states:
        output.append(f"| {state.name} | {state.type} | {state.default} | {state.description_vi} | {state.update_trigger} |\n")

    IF len(ui_states) == 0:
        output.append("| isFilterExpanded | boolean | true | Bo loc mo/dong | User clicks toggle |\n")
        output.append("| selectedIds | string[] | [] | Cac items duoc chon | User selects/deselects |\n")
        output.append("| viewMode | 'table' \\| 'grid' | 'table' | Che do hien thi | User clicks view toggle |\n")
        output.append("| sortColumn | string | 'createdAt' | Cot dang sap xep | User clicks column header |\n")
        output.append("| sortDirection | 'asc' \\| 'desc' | 'desc' | Huong sap xep | User clicks sort |\n")
        output.append("| currentPage | number | 1 | Trang hien tai | User navigates pages |\n")
        output.append("| pageSize | 10 \\| 20 \\| 50 | 20 | So items moi trang | User changes page size |\n")

    output.append("\n")

    # Actions table
    output.append("#### Actions (Describe WHAT, not HOW)\n\n")
    output.append("| Action Name | Payload | Description | When Triggered |\n")
    output.append("|-------------|---------|-------------|----------------|\n")

    actions = infer_actions_from_states(ui_states)
    FOR action IN actions:
        output.append(f"| {action.name} | {action.payload} | {action.description_vi} | {action.trigger} |\n")

    output.append("\n")

    # Selectors
    output.append("#### Selectors (Derived States)\n\n")
    output.append("| Selector Name | Computed From | Return Type | Description | Example Usage |\n")
    output.append("|---------------|---------------|-------------|-------------|---------------|\n")
    output.append("| hasSelection | selectedIds.length > 0 | boolean | Co item nao duoc chon | Enable bulk actions |\n")
    output.append("| isAllSelected | selectedIds.length === items.length | boolean | Tat ca items duoc chon | \"Select All\" checkbox |\n")
    output.append("| canSubmit | !isSubmitting && isDirty && isValid | boolean | Form co the submit | Enable submit button |\n")
    output.append("| isEmpty | items.length === 0 && !isLoading | boolean | Khong co data | Show empty state |\n")
    output.append("| hasFilters | Object.keys(filters).length > 0 | boolean | Co filter nao active | Show \"Clear filters\" |\n")
    output.append("| totalPages | Math.ceil(totalItems / pageSize) | number | So trang tong cong | Pagination control |\n\n")

    # Form UI Slice (if has forms)
    has_forms = any(screen.type == "Form" for screen in screens)
    IF has_forms:
        output.append(f"#### {feature}{sub}FormUISlice (for wizards/multi-step forms)\n\n")
        output.append("**Purpose:** Quan ly UI state cho forms phuc tap (wizard, multi-step)\n\n")
        output.append("| State Property | Type | Default Value | Description |\n")
        output.append("|----------------|------|---------------|-------------|\n")
        output.append("| isDirty | boolean | false | Form co thay doi chua save |\n")
        output.append("| isSubmitting | boolean | false | Dang submit form |\n")
        output.append("| activeStep | number | 0 | Buoc hien tai (wizard) |\n")
        output.append("| completedSteps | number[] | [] | Cac buoc da hoan thanh |\n")
        output.append("| showAdvanced | boolean | false | Hien thi options nang cao |\n")
        output.append("| validationErrors | Record<string, string> | {} | Loi validation theo field |\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE LOCAL STATE PATTERNS (4.3)
# ────────────────────────────────────────────────────────────

FUNCTION generate_local_state_patterns(state_classification):
    output = []
    output.append("### 4.3 Local State Patterns\n\n")

    output.append("**Common Local States:**\n\n")
    output.append("| Pattern | Hook | Use Case | Example |\n")
    output.append("|---------|------|----------|---------||\n")
    output.append("| Boolean toggle | useState | Modal, dropdown, accordion | isOpen: boolean |\n")
    output.append("| Input value | useState | Form fields, search box | query: string |\n")
    output.append("| Multi-step wizard | useState | Step counter | step: number |\n")
    output.append("| Complex form | useReducer | Multi-field forms | state with dispatch |\n\n")

    output.append("**useState vs useReducer:**\n\n")
    output.append("| Criteria | useState | useReducer |\n")
    output.append("|----------|----------|------------|\n")
    output.append("| **Complexity** | Simple (1-3 fields) | Complex (>3 related fields) |\n")
    output.append("| **State Updates** | Independent | Related/cascading updates |\n")
    output.append("| **Logic** | Simple toggle/set | Complex state transitions |\n")
    output.append("| **Example** | Modal open/close | Multi-step wizard with validation |\n\n")

    output.append("**Form State Management:**\n\n")
    output.append("Technology: **React Hook Form + Zod**\n\n")
    output.append("| Aspect | Specification |\n")
    output.append("|--------|---------------|\n")
    output.append("| **State Location** | Form library (not Redux) |\n")
    output.append("| **Validation** | Zod schema (type-safe) |\n")
    output.append("| **Performance** | Uncontrolled inputs (minimal re-renders) |\n")
    output.append("| **Error Display** | Inline (field-level) + Toast (form-level) |\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: GENERATE STATE FLOW DIAGRAMS (4.4)
# ────────────────────────────────────────────────────────────

FUNCTION generate_state_flow_diagrams(screens, feature):
    output = []
    output.append("### 4.4 State Flow Diagrams\n\n")

    # Loading state transitions
    output.append("#### Loading State Transitions\n\n")
    output.append("```mermaid\n")
    output.append("stateDiagram-v2\n")
    output.append("    [*] --> Idle\n")
    output.append("    Idle --> Loading: User action / Component mount\n")
    output.append("    Loading --> Success: Data loaded successfully\n")
    output.append("    Loading --> Error: Fetch failed\n")
    output.append("    Success --> Idle: User resets\n")
    output.append("    Success --> Loading: User refreshes\n")
    output.append("    Error --> Loading: User retries\n")
    output.append("    Error --> Idle: User dismisses error\n\n")
    output.append("    note right of Loading: Show skeleton/spinner\n")
    output.append("    note right of Success: Display data\n")
    output.append("    note right of Error: Show error message + retry button\n")
    output.append("```\n\n")

    # Transition rules
    output.append("**Transition Rules:**\n\n")
    output.append("| From State | To State | Trigger | Side Effects | User Feedback |\n")
    output.append("|------------|----------|---------|--------------|---------------|\n")
    output.append("| Idle | Loading | User clicks button / Component mounts | Show loading indicator | Disable submit buttons |\n")
    output.append("| Loading | Success | API returns 200 OK | Hide loading, populate data | Show success message |\n")
    output.append("| Loading | Error | API returns error / Network fails | Hide loading, show error | Show error toast + retry |\n")
    output.append("| Error | Loading | User clicks \"Retry\" | Clear error, show loading | Re-enable retry button after delay |\n")
    output.append("| Success | Idle | User clicks \"Reset\" | Clear data | Return to initial state |\n\n")

    # Form state transitions (if has forms)
    has_forms = any(screen.type == "Form" for screen in screens)
    IF has_forms:
        output.append("#### Form State Transitions\n\n")
        output.append("```mermaid\n")
        output.append("stateDiagram-v2\n")
        output.append("    [*] --> Pristine\n")
        output.append("    Pristine --> Dirty: User modifies field\n")
        output.append("    Dirty --> Validating: User triggers validation\n")
        output.append("    Validating --> Invalid: Validation fails\n")
        output.append("    Validating --> Valid: Validation passes\n")
        output.append("    Invalid --> Dirty: User fixes errors\n")
        output.append("    Valid --> Submitting: User submits\n")
        output.append("    Submitting --> Success: Submit successful\n")
        output.append("    Submitting --> Error: Submit failed\n")
        output.append("    Success --> [*]\n")
        output.append("    Error --> Dirty: User retries\n\n")
        output.append("    note right of Pristine: No changes, submit disabled\n")
        output.append("    note right of Dirty: Has changes, enable save\n")
        output.append("    note right of Invalid: Show errors, disable submit\n")
        output.append("    note right of Valid: All OK, enable submit\n")
        output.append("```\n\n")

    # Filter Flow
    output.append("#### Filter Flow\n\n")
    output.append("```mermaid\n")
    output.append("graph TD\n")
    output.append("    A[User changes filter] --> B[Dispatch setFilter action]\n")
    output.append("    B --> C[Redux updates currentFilters]\n")
    output.append("    C --> D[React Query invalidates cache]\n")
    output.append("    D --> E[Refetch with new filters]\n")
    output.append("    E --> F[Update UI with new data]\n")
    output.append("```\n\n")

    # Selection Flow
    output.append("#### Selection Flow\n\n")
    output.append("```mermaid\n")
    output.append("graph TD\n")
    output.append("    A[User clicks checkbox] --> B{Select or Deselect?}\n")
    output.append("    B -->|Select| C[Dispatch setSelectedIds with new ID]\n")
    output.append("    B -->|Deselect| D[Dispatch setSelectedIds without ID]\n")
    output.append("    C --> E[Redux updates selectedIds]\n")
    output.append("    D --> E\n")
    output.append("    E --> F{Any selected?}\n")
    output.append("    F -->|Yes| G[Enable bulk actions]\n")
    output.append("    F -->|No| H[Disable bulk actions]\n")
    output.append("```\n\n")

    # Sort Flow
    output.append("#### Sort Flow\n\n")
    output.append("```mermaid\n")
    output.append("graph TD\n")
    output.append("    A[User clicks column header] --> B[Dispatch setSorting]\n")
    output.append("    B --> C{Same column?}\n")
    output.append("    C -->|Yes| D[Toggle asc/desc]\n")
    output.append("    C -->|No| E[Set new column, default desc]\n")
    output.append("    D --> F[Redux updates sortBy, sortOrder]\n")
    output.append("    E --> F\n")
    output.append("    F --> G[React Query refetch with new sort]\n")
    output.append("    G --> H[Update table with sorted data]\n")
    output.append("```\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 6: ASSEMBLE COMPLETE OUTPUT
# ────────────────────────────────────────────────────────────

FUNCTION main():
    data = load_context()
    output = []

    output.append(generate_state_classification(data.states, data.components, data.screens))
    output.append(generate_redux_slice_specs(data.context.feature, data.context.sub, data.states, data.screens))
    output.append(generate_local_state_patterns(data.states))
    output.append(generate_state_flow_diagrams(data.screens, data.context.feature))

    result = "".join(output)

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
    IF "4.1 Phan loai State" NOT IN output:
        errors.append("Missing state classification section")
    IF "4.2 Redux Slice" NOT IN output:
        errors.append("Missing Redux slice specs")
    IF "4.3 Local State" NOT IN output:
        errors.append("Missing local state patterns")
    IF "4.4 State Flow" NOT IN output:
        errors.append("Missing state flow diagrams")

    # Q2: Consistency?
    IF data.screens contains Form screens AND "FormUISlice" NOT IN output:
        errors.append("Form screens exist but FormUISlice not defined")

    # Q3: Vietnamese >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(output)
    IF vietnamese_ratio < 0.60:
        errors.append(f"Vietnamese ratio {vietnamese_ratio:.0%} < 60%")

    # Q4: No Prohibited Content?
    prohibited_patterns = ["createSlice", "configureStore", "useSelector", "useDispatch", "interface ", "type ", "const "]
    FOR pattern IN prohibited_patterns:
        IF pattern IN output:
            errors.append(f"Contains prohibited content: {pattern}")

    RETURN errors
```

---

## Output Format

Returns Section 4 markdown content (200-350 lines) to orchestrator for assembly.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **Section 03 not found** | Screen Design missing | Generate Section 03 first |
| **No states classified** | Screen Design incomplete | Check Section 03 has interactive elements |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |
| **Missing state flows** | Diagrams not generated | Ensure >=2 Mermaid diagrams |
| **Redux code detected** | Prohibited content | Remove createSlice/configureStore code |

---

## Notes

### Constraints

**MUST Include**: State Classification (4.1), Redux Slice Specs (4.2), Local State Patterns (4.3), State Flow Diagrams with Mermaid (4.4)

**MUST Exclude**: Redux Toolkit code, TypeScript interfaces, React hooks implementation, Component code

**Format**: 200-350 lines, Vietnamese >=60%, JSON for initial state examples, >=2 Mermaid diagrams

### State Persistence Strategy

| State | Persist To | Restore When | TTL |
|-------|-----------|--------------|-----|
| viewMode | localStorage | Page reload | Indefinite |
| pageSize | localStorage | Page reload | Indefinite |
| filters | URL params | Page reload / Share link | Session |
| sortColumn | URL params | Page reload / Share link | Session |
| theme | localStorage + Cookie | Page reload | 1 year |

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-04-state.md) and template (04-state.md) into single file
- Removed JIT template loading (dead path)
- Consolidated pseudo-code logic from template into agent
- Incorporated loading/error state patterns, derived states, persistence strategy from template
- Removed Integration with Orchestrator, Best Practices, Template Version Compatibility sections

**v3.0 (2025-12-12)**:
- Renamed from fdd-06-ui-state.md -> fdd-04-state.md
- Switched to JIT template loading pattern
- Updated to match new 04-state.md template
- Added 4 subsections (4.1-4.4) structure
- Enhanced validation (Q1-Q4)
- Vietnamese content requirements enforced

**v2.0 (2025-12-11)**:
- Hybrid version with guideline loading
- Enhanced state classification

**v1.0 (2025-11-20)**:
- Initial version

---

*FDD-04: State Management v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x + Redux Toolkit + React Query*
