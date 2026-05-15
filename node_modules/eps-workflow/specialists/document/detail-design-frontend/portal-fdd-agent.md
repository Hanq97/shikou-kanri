# Portal FDD Agent (Document A)

## Purpose

Micro-agent for generating Portal/Domain FDD sections (A.01-A.06). Focuses on cross-feature business workflows, API orchestration strategy, and user journeys.

**Sections**: CA.01 - CA.06
**Pattern**: A+B+C FDD Pattern

---

## Input Context

The agent receives:
- `feature`: Feature code (e.g., 'ADM', 'OPS')
- `sub`: 'PORTAL' (fixed for this agent)
- `basicDesign`: Basic Design document content
- `srs`: SRS document content
- `evidence`: Evidence files
- `techStack`: Technology stack configuration
- `graphContext`: GraphRAG context (requirements, components)
- `ragContext`: Vector search context

---

## Section Definitions

### CA.01: Portal Overview
- **Title (Vi)**: Tong quan Portal
- **Min Lines**: 30 | **Max Lines**: 80
- **Content**:
  - Portal purpose (Vietnamese, 2-3 paragraphs)
  - Sub-features table (code, name, purpose)
  - Target users
  - Links to other portals

### CA.02: Business Workflows
- **Title (Vi)**: Luong nghiep vu
- **Min Lines**: 60 | **Max Lines**: 200
- **Validation**: has_mermaid_sequence
- **Content**:
  - WF-XXX-001 format for each workflow
  - Main flow table (step, actor, action, response, sub-feature)
  - Mermaid sequence diagram
  - Alternative and exception flows

### CA.03: User Journeys
- **Title (Vi)**: Hanh trinh nguoi dung
- **Min Lines**: 40 | **Max Lines**: 150
- **Validation**: has_uj_ids
- **Content**:
  - UJ-XXX-001 format for each journey
  - Journey map table
  - Pain points and mitigations
  - Success metrics

### CA.04: API Strategy
- **Title (Vi)**: Chien luoc API
- **Min Lines**: 40 | **Max Lines**: 120
- **Validation**: has_strategy_decision
- **Content**:
  - Strategy decision (Granular/BFF/Hybrid)
  - Decision rationale matrix
  - API mapping per screen
  - API standards

### CA.05: Event Architecture
- **Title (Vi)**: Kien truc su kien
- **Min Lines**: 30 | **Max Lines**: 100
- **Validation**: has_evt_ids
- **Content**:
  - Event catalog (EVT-XXX-001 format)
  - Event details with payload schema
  - Publishers and subscribers
  - Event flow diagram

### CA.06: Cross-Dependencies
- **Title (Vi)**: Phu thuoc cheo
- **Min Lines**: 20 | **Max Lines**: 80
- **Content**:
  - Dependency matrix
  - Dependency diagram (Mermaid)
  - Impact analysis

---

## Generation Rules

### DO
- Focus on CROSS-FEATURE aspects (workflows spanning multiple sub-features)
- Use workflow IDs: WF-[FEATURE]-001, WF-[FEATURE]-002
- Use user journey IDs: UJ-[FEATURE]-001
- Use event IDs: EVT-[FEATURE]-001
- Include Mermaid sequence diagrams for workflows
- Make explicit API strategy decision with rationale
- Write Vietnamese content >= 60%

### DO NOT
- Design individual screens (Document C responsibility)
- Define shared components (Document B responsibility)
- Include implementation code
- Define error handling patterns (Document B)
- Define responsive design (Document B)

---

## Validation Checks

```javascript
const checks = {
  'has_mermaid_sequence': (content) => /```mermaid[\s\S]*?sequenceDiagram/i.test(content),
  'has_uj_ids': (content) => /UJ-[A-Z]{2,4}-\d{3}/i.test(content),
  'has_strategy_decision': (content) => /(?:Selected Strategy|Quyet dinh|Chien luoc).*(?:Granular|BFF|Hybrid)/i.test(content),
  'has_evt_ids': (content) => /EVT-[A-Z]{2,4}-\d{3}/i.test(content),
};
```

---

## Self-Critique Questions

Before completing each section, verify:

1. **Q1**: Does each workflow span multiple sub-features?
2. **Q2**: Is API strategy decision justified with rationale matrix?
3. **Q3**: Are user journeys end-to-end (not screen-level)?
4. **Q4**: Vietnamese content >= 60%?
5. **Q5**: Are all sub-features referenced in scope?

---

## Output Format

```markdown
## A.0X [Section Title]

### A.0X.1 [Subsection]

[Vietnamese content]

[Tables, diagrams as needed]

---
```

---

*Portal FDD Agent v1.0*
*Part of A+B+C FDD Pattern*
