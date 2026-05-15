# Software Requirements Specification (SRS) Standard
*Version: 1.0 | Created: 2025-11-22*

## 📋 Overview

This directory contains template standards cho **Software Requirements Specification (SRS)** trong EPS Framework v2.5+.

**Purpose:**
- Provide modular, focused templates cho mỗi section của SRS
- Minimize context usage by splitting into small, focused files
- Ensure consistency và compliance across all SRS documents
- Làm cơ sở chặt chẽ cho Basic Design generation

---

## 📁 Cấu trúc File

### Section 0: Document Header
- `00-document-information.md` - Document metadata, purpose, scope level

### Section 1: Tổng quan (4 files)
- `01-overview.md` - **Core overview** + language rules
- `01-purpose.md` - **Section 1.1** - Mục đích và giá trị nghiệp vụ
- `01-scope.md` - **Section 1.2** - Trong phạm vi / Ngoài phạm vi
- `01-definitions.md` - **Section 1.3** - Định nghĩa & Viết tắt
- `01-references.md` - **Section 1.4** - Tài liệu tham khảo

### Section 2: Functional Requirements (2 files)
- `02-functional-requirements.md` - **Core overview** + FR format rules
- `02-functional-areas.md` - **Functional area grouping** + examples

### Section 3: Non-Functional Requirements (5 files)
- `03-non-functional-requirements.md` - **Core overview**
- `03-performance-requirements.md` - **Section 3.1** - Performance NFRs
- `03-security-requirements.md` - **Section 3.2** - Security NFRs
- `03-reliability-requirements.md` - **Section 3.3** - Reliability NFRs
- `03-scalability-requirements.md` - **Section 3.4** - Scalability NFRs

### Section 4: User Stories (2 files)
- `04-user-stories.md` - **Core overview** + US format rules
- `04-user-roles.md` - **User role definitions** + examples

### Section 5: Acceptance Criteria (2 files)
- `05-acceptance-criteria.md` - **Core overview** + AC format (Given-When-Then)
- `05-ac-traceability.md` - **US → AC mapping** rules

### Section 6: Constraints (4 files)
- `06-constraints.md` - **Core overview**
- `06-technical-constraints.md` - **Section 6.1** - Technical constraints
- `06-business-constraints.md` - **Section 6.2** - Business constraints
- `06-operational-constraints.md` - **Section 6.3** - Operational constraints

---

## 🎯 Usage

### For Agents (Automated Document Generation)

**Step 1: Read Core Overview**
```bash
# Start with section overview file
Read .claude/docs/design-standards/srs/[XX]-[section-name].md
```

**Step 2: Read Detail Files**
```bash
# Read specific sub-section files as needed
Read .claude/docs/design-standards/srs/[XX]-[sub-section].md
```

**Step 3: Generate Content**
- Follow template format from detail files
- Apply validation rules
- Reference examples from BNK-ACCT SRS

### For Humans (Manual Document Creation)

**Navigate by section:**
1. Choose section to work on (1-6)
2. Read core overview file (`XX-[section-name].md`)
3. Read detail files for sub-sections
4. Follow template format
5. Validate using checklist

---

## ✅ Key Principles

### 1. Modular Design
- **One file per sub-section** - Minimize context usage
- **Core + Detail pattern** - Overview file + detail files
- **Focused content** - Each file ~150-300 lines

### 2. Template-Driven
- **Strict format** - Templates MUST be followed exactly
- **Placeholders** - `[FEATURE]`, `[SUB]`, `FR-XXX`, `NFR-XXX`
- **Examples** - Reference BNK-ACCT for patterns

### 3. Language Rules
- **Vietnamese + English** - `[Tiếng Việt] ([English technical term])`
- **Consistency** - Same format throughout
- **Technical terms** - Keep in English (authentication, JWT, ACID, etc.)

### 4. Prohibited Content
**TUYỆT ĐỐI CẤM trong SRS:**
- ❌ Source code (implementation code, pseudocode)
- ❌ SQL statements (CREATE TABLE, SELECT, etc.)
- ❌ API endpoint paths (POST /api/v1/...)
- ❌ Method signatures (createAccount(), getBalance())
- ❌ Architecture patterns (Event-Driven, Cache-Aside) - **Thuộc Basic Design**
- ❌ Technology stack (Redis, PostgreSQL) - **Thuộc Basic Design**
- ❌ Implementation details - **Thuộc Detail Design**

**Focus on:** WHAT system must do, NOT HOW to implement

---

## 🔗 Traceability to Basic Design

**CRITICAL:** SRS PHẢI là foundation cho Basic Design

### Traceability Matrix (SRS → BD)

| SRS Section | Maps to Basic Design | Purpose |
|-------------|---------------------|---------|
| **Section 1: Tổng quan** | → System Context Diagram | Feature boundaries và objectives |
| **Section 2: Functional Requirements (FR-XXX)** | → Architecture Patterns + Components | Derive patterns từ FRs |
| **Section 3: Non-Functional Requirements (NFR-XXX)** | → Architecture Patterns + NFR Design | Derive technical strategies |
| **Section 4: User Stories (US-XXX)** | → Use Case Flows + Sequence Diagrams | User workflows |
| **Section 5: Acceptance Criteria (AC-XXX)** | → Test scenarios reference | Validation criteria |
| **Section 6: Constraints** | → Architecture constraints | Boundary conditions |

### Key Mappings (Examples from BNK-ACCT)

**FR → Architecture Pattern:**
- FR-BNK-ACCT-001 (Auto-create wallet) → Event-Driven Architecture
- FR-BNK-ACCT-002 (Escrow management) → FBO Pattern
- FR-BNK-ACCT-004 (Lock escrow) → State Machine Pattern
- FR-BNK-ACCT-007 (Balance query) → Cache-Aside Pattern

**NFR → Architecture Pattern:**
- NFR-PERF-002 (P99 < 50ms) → Redis Caching Strategy
- NFR-SEC-001 (Row-level security) → RLS Policies
- NFR-REL-002 (ACID compliance) → Transaction Management
- NFR-SCAL-001 (10K concurrent users) → Database Indexes

**US → Use Case Flow:**
- US-USER-001 (View balance) → UC-02 Balance Query Flow
- US-BORROWER-001 (Request loan) → UC-06 Escrow Creation Flow

---

## 📊 File Statistics

**Total files:** 19 template files
- Section 0: 1 file
- Section 1: 4 files (1 overview + 3 details)
- Section 2: 2 files (1 overview + 1 detail)
- Section 3: 5 files (1 overview + 4 details)
- Section 4: 2 files (1 overview + 1 detail)
- Section 5: 2 files (1 overview + 1 detail)
- Section 6: 4 files (1 overview + 3 details)

**Average file size:** ~150-250 lines per file

**Benefits:**
- ✅ Focused, easy-to-read files
- ✅ Minimal context usage when generating
- ✅ Easy to update and maintain
- ✅ Clear separation of concerns
- ✅ Strong traceability to Basic Design

---

## ✓ Quality Checklist

**Before finalizing SRS document:**
- [ ] All sections (1-6) complete
- [ ] All placeholders replaced
- [ ] No prohibited content (code, SQL, architecture patterns)
- [ ] Language rules followed (Vietnamese + English)
- [ ] All FRs have IDs (FR-XXX format)
- [ ] All NFRs have measurable targets
- [ ] All User Stories have Acceptance Criteria
- [ ] Traceability to Basic Design clear

---

## 🔄 Lịch sử Phiên bản

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-22 | Initial modular SRS standard | System |

---

*Software Requirements Specification Standard v1.0*
*EPS Framework v2.5+ | Cloud-Agnostic Architecture*
*Last Updated: 2025-11-22*
