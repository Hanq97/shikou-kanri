# /architect Phase 4: Architecture Documents

> **EXECUTION CONSTRAINTS**
>
> 1. INLINE conversation only.
> 2. Generate documents SEQUENTIALLY — each references previous ones.
> 3. Save each document after user approval.
> 4. Update architect-state.json after each document.
> 5. Final document (00-overview) generated LAST.

---

## Purpose

Generate Architecture Documents based on ADRs, Assessment, and Feature Map.
Documents are the FINAL OUTPUT of /architect — baseline for all future features.

**Input**: `architect/assessment.md`, `architect/decisions/`, `architect/feature-map.md`, `architect/catalogs/`
**Output**: `documents/architecture/NN-[title].md`

---

## Step 0: Load Context

Read using Read tool:
- `{context-dir}/architect/assessment.md`
- All `{context-dir}/architect/decisions/ADR-*.md`
- `{context-dir}/architect/feature-map.md`
- All `{context-dir}/architect/catalogs/*.md` (if any)

---

## Step 1: Propose Document List

AI analyzes project complexity to propose documents.

Standard document set (not all required — AI selects based on project):

| # | Document | When needed |
|---|----------|-------------|
| 01 | System Architecture | Always |
| 02 | Service/Component Architecture | Multi-service or modular systems |
| 03 | Frontend Architecture | Projects with UI |
| 04 | Database Design | Projects with persistent data |
| 05 | API Specifications | Projects with APIs |
| 06 | Backend Architecture | Projects with backend logic |
| 07 | Security Architecture | Projects with auth, sensitive data |
| 08 | Deployment Architecture | Production deployment needed |
| 09 | Domain-specific | Blockchain, ML, IoT — if applicable |
| 00 | Overview | Always (generated last) |

Display proposed list:

```
Proposed Architecture Documents: [N] documents

  01-system-architecture.md — [brief description]
  02-service-architecture.md — [brief description]
  ...
  00-overview.md — Generated last (summary of all)

Simple project: 4-5 documents
Complex project: 8-10 documents

Confirm this list? You can add/remove. (confirm/edit)
```

WAIT user confirm.
Update architect-state.json: `documents.docList = [...]`, `documents.totalDocs = N`.

---

## Step 2: Document Generation Loop

FOR each document in confirmed order (EXCEPT 00-overview):

### 2.1 Display Progress

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document [current/total]: [title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.2 Load Reference Context

For this document, load:
- Relevant ADR decisions (AI selects which ADRs apply)
- Relevant assessment sections
- Relevant catalogs
- ALL previously generated documents (in documents/architecture/)

### 2.3 Generate Draft

AI generates document following architecture document conventions:
- Clear section structure with headings
- Reference ADRs by ID: "Per ADR-001, we chose [X]"
- Reference previous documents: "As defined in 01-system-architecture.md"
- Include diagrams where helpful (ASCII)
- Bilingual if configured (primary language + technical English terms)

### 2.4 User Review

Display full document draft.

Ask: "Review this document. (approve / feedback / regenerate)"
WAIT user response.

- **approve** → save and continue
- **feedback** → AI revises based on feedback → display revised → WAIT again
- **regenerate** → AI generates new draft → display → WAIT again

### 2.5 Gap Detection

During generation, if AI discovers missing information:

```
Gap detected: [description]
This information was not covered in the interview.

Question: [supplementary question]
```

WAIT user answer.
Append answer to assessment.md (Section: "Supplementary — Phase 4").
Continue document generation with new info.

### 2.6 ADR Revision Check

If generating this document reveals that a previous ADR decision should change:

```
Potential ADR revision detected:
  ADR-[NNN]: [title]
  Current decision: [X]
  Issue: [why it should change]
  Suggested: [new decision]

Options:
  1. Create new ADR superseding ADR-[NNN]
  2. Keep current ADR (note concern)
  3. Skip for now
```

WAIT user.
If option 1 → generate new ADR → save to decisions/ → mark old as SUPERSEDED.

### 2.7 Catalog Check

If this document reveals need for a new catalog:
- Ask user confirm
- Generate catalog → save to `architect/catalogs/[name].md`

### 2.8 Save Document

Save to `documents/architecture/[NN]-[title].md`.

Update architect-state.json:
```
documents.completedDocs += "[NN]-[title]"
```

Display: "Document [title] saved. [remaining] left."

END FOR

---

## Step 3: Generate Overview (00-overview.md)

This is ALWAYS the last document.

Read ALL generated documents from `documents/architecture/`.

Generate overview containing:
- Executive summary of the architecture
- Document index with brief descriptions
- Key decisions summary (from ADRs)
- Feature summary (from feature map)
- Technology stack overview
- Deployment overview

Display to user.
WAIT approve.
Save `documents/architecture/00-overview.md`.

---

## Step 4: Finalize

Display all documents created:

```
Architecture Documents Complete!

documents/architecture/
  00-overview.md
  01-system-architecture.md
  [list all]

Total: [N] documents
Working artifacts: [M] ADRs, [K] catalogs
```

Update architect-state.json:
```
documents.status = "completed"
currentPhase = "estimation"
```

Display: "Phase 4 complete. [N] architecture documents created."

**RETURN** control to router.

---

**/architect Phase 4: Architecture Documents v1.0**
*Sequential Generation with Gap Detection + ADR Revision*
*EPS Framework v8.0*
