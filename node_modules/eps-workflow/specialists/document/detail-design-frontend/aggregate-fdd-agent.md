# Aggregate FDD Agent (Document B)

## Purpose

Micro-agent for generating Aggregate FDD sections (B.00-B.08). Single source of truth for shared technical concerns across all sub-features.

**Sections**: CB.00 - CB.08
**Pattern**: A+B+C FDD Pattern

---

## Input Context

The agent receives:
- `feature`: Feature code (e.g., 'ADM', 'OPS')
- `sub`: 'AGGREGATE' (fixed for this agent)
- `basicDesign`: Basic Design document content
- `srs`: SRS document content
- `evidence`: Evidence files
- `portalFDD`: Document A content (Portal FDD)
- `techStack`: Technology stack configuration
- `graphContext`: GraphRAG context
- `ragContext`: Vector search context

---

## Section Definitions

### CB.00: Document Info
- **Title (Vi)**: Thong tin tai lieu
- **Min Lines**: 15 | **Max Lines**: 40
- **Content**:
  - Feature metadata
  - Related documents links (Portal FDD, Screens FDDs)
  - Version info

### CB.01: App Shell
- **Title (Vi)**: App Shell
- **Min Lines**: 40 | **Max Lines**: 120
- **Validation**: has_ascii_layout, has_route_table
- **Content**:
  - Desktop layout (ASCII diagram)
  - Mobile layout (ASCII diagram)
  - Navigation structure (Mermaid)
  - Route definitions table
  - Navigation items

### CB.02: Shared Components
- **Title (Vi)**: Shared Components
- **Min Lines**: 80 | **Max Lines**: 300
- **Validation**: has_sc_ids, has_props_table
- **Content**:
  - Component catalog (SC-XXX format)
  - Component specifications with Props tables
  - Slots/children
  - Events

### CB.03: State Architecture
- **Title (Vi)**: Kien truc State
- **Min Lines**: 60 | **Max Lines**: 200
- **Validation**: has_state_definition
- **Content**:
  - Root store structure (TypeScript interface)
  - Shared slices (authSlice, uiSlice)
  - Context providers
  - React Query config

### CB.04: Error Handling
- **Title (Vi)**: Xu ly loi
- **Min Lines**: 40 | **Max Lines**: 120
- **Validation**: has_error_boundary
- **Content**:
  - Error boundaries hierarchy
  - Fallback components (ASCII)
  - Error types and handling
  - Toast notifications
  - Retry strategy

### CB.05: Responsive Design
- **Title (Vi)**: Responsive Design
- **Min Lines**: 40 | **Max Lines**: 100
- **Validation**: has_responsive_breakpoints
- **Content**:
  - Breakpoint table
  - Responsive patterns
  - Touch targets
  - Mobile-first approach

### CB.06: Performance
- **Title (Vi)**: Hieu nang
- **Min Lines**: 30 | **Max Lines**: 100
- **Content**:
  - Bundle size limits
  - Lazy loading strategy
  - Caching strategy
  - Performance metrics

### CB.07: Visual Design
- **Title (Vi)**: Thiet ke giao dien
- **Min Lines**: 60 | **Max Lines**: 150
- **Validation**: has_color_palette
- **Content**:
  - Color palette (light/dark)
  - Typography scale
  - Spacing system
  - Elevation/shadows
  - Border radius

### CB.08: Technical Concerns
- **Title (Vi)**: Technical Concerns
- **Min Lines**: 40 | **Max Lines**: 120
- **Content**:
  - TC-SECURITY: XSS, CSRF, Auth
  - TC-A11Y: WCAG compliance
  - TC-I18N: Internationalization

---

## Generation Rules

### DO
- Focus on SHARED aspects across all sub-features
- Define App Shell ONCE for entire feature
- Use shared component IDs: SC-DataTable, SC-FilterPanel, etc.
- Define root store with shared + dynamic slices
- Include ASCII diagrams for layouts
- Write Vietnamese content >= 60%

### DO NOT
- Design individual screens (Document C responsibility)
- Define workflows (Document A responsibility)
- Include implementation code (interfaces only)
- Reference specific sub-feature screens

---

## Validation Checks

```javascript
const checks = {
  'has_ascii_layout': (content) => /[┌┐└┘│─╔╗╚╝║═\+\-\|]/.test(content),
  'has_route_table': (content) => /\|.*(?:Route|Path|Component|Screen).*\|/i.test(content),
  'has_sc_ids': (content) => (content.match(/SC-[A-Z][A-Za-z]+/g) || []).length >= 3,
  'has_props_table': (content) => /\|.*(?:Props|Prop|Type|Required).*\|/i.test(content),
  'has_state_definition': (content) => /(?:interface\s+\w+State|Redux|Slice|Zustand|useState)/i.test(content),
  'has_error_boundary': (content) => /(?:Error Boundary|ErrorBoundary|fallback|error state)/i.test(content),
  'has_responsive_breakpoints': (content) => /(?:breakpoint|mobile|tablet|desktop|@media|sm:|md:|lg:)/i.test(content),
  'has_color_palette': (content) => /#[A-Fa-f0-9]{6}/.test(content),
};
```

---

## Self-Critique Questions

Before completing each section, verify:

1. **Q1**: Is each shared component used by >= 2 sub-features?
2. **Q2**: Is state architecture complete (shared + dynamic slices)?
3. **Q3**: Are all technical concerns addressed (Security, A11Y, I18N)?
4. **Q4**: Vietnamese content >= 60%?
5. **Q5**: Are error boundaries properly hierarchical?

---

## Output Format

```markdown
## B.0X [Section Title]

### B.0X.1 [Subsection]

[Vietnamese content]

[Tables, ASCII diagrams, TypeScript interfaces as needed]

---
```

---

*Aggregate FDD Agent v1.0*
*Part of A+B+C FDD Pattern*
