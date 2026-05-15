# Screens FDD Agent (Document C)

## Purpose

Micro-agent for generating Screens-Only FDD sections (C.01-C.05). Module-specific screen designs with mandatory cross-references to Document A (Portal) and Document B (Aggregate).

**Sections**: CC.01 - CC.05
**Pattern**: A+B+C FDD Pattern
**Key Principle**: No duplication of shared concerns - always reference Document B

---

## Input Context

The agent receives:
- `feature`: Feature code (e.g., 'ADM', 'OPS')
- `sub`: Sub-feature code (e.g., 'DASH', 'USER')
- `subFeature`: Full sub-feature object { code, name, ... }
- `basicDesign`: Basic Design document content
- `srs`: SRS document content
- `evidence`: Evidence files
- `portalFDD`: Document A content
- `aggregateFDD`: Document B content
- `techStack`: Technology stack configuration
- `graphContext`: GraphRAG context
- `ragContext`: Vector search context

---

## Section Definitions

### CC.01: Module Overview
- **Title (Vi)**: Tong quan Module
- **Min Lines**: 30 | **Max Lines**: 80
- **Validation**: has_cross_reference_a
- **Content**:
  - Module purpose (Vietnamese)
  - Screens table with SCR-XXX-XXX-XXX IDs
  - Links to Portal (A) workflows and user journeys
  - Dependencies with other sub-features

### CC.02: Business Flow
- **Title (Vi)**: Luong nghiep vu
- **Min Lines**: 40 | **Max Lines**: 120
- **Validation**: has_mermaid_flowchart
- **Content**:
  - Screen flow diagram (Mermaid flowchart)
  - Module-specific business rules
  - Entry/exit points

### CC.03: Screen Specs
- **Title (Vi)**: Thiet ke man hinh
- **Min Lines**: 100 | **Max Lines**: 400
- **Validation**: has_screen_id, has_ascii_wireframe, has_component_pascal_case
- **Content**:
  - Per-screen specifications
  - ASCII wireframes (desktop + mobile)
  - Component tree
  - Components used (local + shared from B.02)
  - Actions and interactions

### CC.04: State Management
- **Title (Vi)**: Quan ly State
- **Min Lines**: 40 | **Max Lines**: 150
- **Validation**: has_cross_reference_b, no_redux_implementation
- **Content**:
  - Reference to B.03 (Root Store)
  - Module slice definition
  - Local component state
  - Derived state/selectors

### CC.05: API Integration
- **Title (Vi)**: Tich hop API
- **Min Lines**: 50 | **Max Lines**: 150
- **Validation**: has_api_query_config, has_cross_reference_a
- **Content**:
  - Reference to A.04 (API Strategy)
  - API endpoints used
  - Query configurations
  - Mutation configurations
  - Error handling (reference B.04)

---

## Generation Rules

### DO
- Cross-reference Document A (Portal) for workflows, API strategy
- Cross-reference Document B (Aggregate) for shared concerns
- Use screen IDs: SCR-[FEATURE]-[SUB]-001
- Use shared components from B.02: SC-DataTable, SC-FilterPanel, etc.
- Include ASCII wireframes for BOTH desktop AND mobile
- Define local components only (not shared)
- Write Vietnamese content >= 60%

### DO NOT
- Redefine error handling (reference B.04)
- Redefine responsive design (reference B.05)
- Redefine color palette (reference B.07)
- Redefine shared components (reference B.02)
- Redefine root store (reference B.03)
- Include implementation code

---

## Validation Checks

```javascript
const checks = {
  'has_cross_reference_a': (content) => /(?:See|xem|Xem).*portal-fdd\.md/i.test(content),
  'has_cross_reference_b': (content) => /(?:See|xem|Xem).*aggregate-fdd\.md/i.test(content),
  'has_mermaid_flowchart': (content) => /```mermaid[\s\S]*?flowchart/i.test(content),
  'has_screen_id': (content) => /SCR-[A-Z]{3,4}-\d{3}/i.test(content),
  'has_ascii_wireframe': (content) => /[┌┐└┘│─╔╗╚╝║═\+\-\|]/.test(content),
  'has_component_pascal_case': (content) => /[A-Z][a-z]+[A-Z]/.test(content),
  'has_api_query_config': (content) => /(?:useQuery|useMutation|React Query|TanStack|queryKey)/i.test(content),
  'no_redux_implementation': (content) => !/(?:createSlice\(|configureStore\(|useSelector\()/i.test(content),
  'no_duplicate_b_content': (content) => !/(?:B\.04|B\.05|B\.06|B\.07|Error Handling|Responsive Design|Performance|Visual Design)\s*\n\s*###/i.test(content),
};
```

---

## Self-Critique Questions

Before completing each section, verify:

1. **Q1**: Do all shared components reference B.02?
2. **Q2**: Does error handling reference B.04?
3. **Q3**: Does responsive design reference B.05?
4. **Q4**: Are ASCII wireframes for BOTH desktop AND mobile?
5. **Q5**: Vietnamese content >= 60%?
6. **Q6**: No duplicate content from B.04-B.08?

---

## Common Mistakes to Avoid

- Defining color palette (use B.07)
- Defining breakpoints (use B.05)
- Defining error boundaries (use B.04)
- Defining shared components (use B.02)
- Redefining root store (use B.03)

---

## Output Format

```markdown
## C.0X [Section Title]

> **Cross-Reference**: See [FEATURE]-portal-fdd.md Section A.0X
> **Cross-Reference**: See [FEATURE]-aggregate-fdd.md Section B.0X

### C.0X.1 [Subsection]

[Vietnamese content]

[Tables, ASCII wireframes, TypeScript interfaces as needed]

---
```

---

*Screens FDD Agent v1.0*
*Part of A+B+C FDD Pattern*
