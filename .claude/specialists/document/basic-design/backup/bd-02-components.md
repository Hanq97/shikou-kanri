# BD Components Micro-Agent / コンポーネント設計マイクロエージェント

**Responsibility**: Generate Section 2 (Component Design) of Basic Design
**Output Lines**: 100-120 lines
**Dependencies**: bd-01-architecture.md (for component context), SRS functional requirements

---

## Input Requirements

- Evidence file path (absolute)
- SRS file path (for functional requirements)
- Architecture design (from bd-01)
- Feature code (e.g., "CMN015002")
- Component specifications (from evidence)

---

## Processing Logic

### Step 1: Load Evidence, SRS, and Architecture

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
architecture = read_file(architecture_file_path)
functional_reqs = extract_functional_requirements(srs)
components = extract_section(evidence, "Components|コンポーネント")
```

**Extract:**
- Frontend components (UI components, pages, layouts)
- Backend components (services, controllers, repositories)
- Shared components (utilities, helpers)
- Component responsibilities
- Component interactions

### Step 2: Structure Component Design

**2.1 フロントエンドコンポーネント / Frontend Components**
- Page components
- UI components
- Layout components
- Hook components

**2.2 バックエンドコンポーネント / Backend Components**
- Controllers (API endpoints)
- Services (Business logic)
- Repositories (Data access)
- DTOs (Data transfer objects)
- Entities (Domain models)

**2.3 共通コンポーネント / Shared Components**
- Utility functions
- Constants
- Type definitions
- Validation schemas

**2.4 コンポーネント間インタラクション / Component Interactions**
- Data flow
- Component dependencies
- Communication patterns

### Step 3: Map Requirements to Components

**Traceability:**
- Functional requirements → Components
- User stories → Pages/Features
- Use cases → Service methods

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] All components derived from functional requirements?
- [ ] Component responsibilities from evidence?
- [ ] No invented components?
- [ ] Component interactions from architecture?

**Q2: Consistency?**
- [ ] Aligns with architecture design (Section 1)?
- [ ] Follows project naming conventions?
- [ ] Component responsibilities clear and focused?
- [ ] No duplication of functionality?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] Headers bilingual (日本語 / Vietnamese)?
- [ ] Component descriptions bilingual?
- [ ] Responsibility descriptions bilingual?
- [ ] Technical terms in English?

**Q4: No Prohibited Content?**
- [ ] No detailed implementation code?
- [ ] No SQL queries?
- [ ] No specific algorithms (high-level only)?
- [ ] Component-level design only?

---

## Output Template

```markdown
## 2. コンポーネント設計 / Thiết kế component (Component Design)

### 2.1 フロントエンドコンポーネント / Frontend Components

#### 2.1.1 ページコンポーネント / Page Components

**COMP-FE-PAGE-001: [Page Name JP] / [Page Name VN]**

**ファイルパス / File Path:** `app/[path]/page.tsx`

**責任 / Responsibility:**
[Japanese description of page responsibility]
[Vietnamese description]

**Props:**
```typescript
interface [PageName]Props {
  // Props definition (interface only, no implementation)
}
```

**主要機能 / Key Features:**
- [Feature 1 JP] / [Feature 1 VN]
- [Feature 2 JP] / [Feature 2 VN]

**使用コンポーネント / Used Components:**
- [Component 1]
- [Component 2]

**要件マッピング / Requirements Mapping:**
- FR-[CODE]-[NUMBER]: [Requirement name]

---

#### 2.1.2 UIコンポーネント / UI Components

**COMP-FE-UI-001: [Component Name JP] / [Component Name VN]**

**ファイルパス / File Path:** `components/[path]/[name].tsx`

**責任 / Responsibility:**
[Japanese description]
[Vietnamese description]

**Props Interface:**
```typescript
interface [ComponentName]Props {
  // Props definition
}
```

**状態管理 / State Management:**
- [State 1 JP] / [State 1 VN]
- [State 2 JP] / [State 2 VN]

**イベント / Events:**
- [Event 1 JP] / [Event 1 VN]
- [Event 2 JP] / [Event 2 VN]

**要件マッピング / Requirements Mapping:**
- FR-[CODE]-[NUMBER]: [Requirement name]

---

#### 2.1.3 Hooksコンポーネント / Custom Hooks

**COMP-FE-HOOK-001: [Hook Name]**

**ファイルパス / File Path:** `hooks/[name].ts`

**責任 / Responsibility:**
[Japanese description]
[Vietnamese description]

**戻り値 / Return Value:**
```typescript
interface [HookName]Return {
  // Return type definition
}
```

**使用例 / Usage:**
[Usage description JP] / [Usage description VN]

---

### 2.2 バックエンドコンポーネント / Backend Components

#### 2.2.1 コントローラー / Controllers

**COMP-BE-CTRL-001: [Controller Name JP] / [Controller Name VN]**

**ファイルパス / File Path:** `src/main/java/[package]/controller/[Name]Controller.java`

**責任 / Responsibility:**
[Japanese description of controller responsibility]
[Vietnamese description]

**エンドポイント / Endpoints:**

| メソッド / Method | パス / Path | 説明 / Description | 要件 / Requirement |
|---------------|----------|------------------|----------------|
| GET | /api/[resource] | [Description JP/VN] | FR-[CODE]-[NUM] |
| POST | /api/[resource] | [Description JP/VN] | FR-[CODE]-[NUM] |
| PUT | /api/[resource]/{id} | [Description JP/VN] | FR-[CODE]-[NUM] |
| DELETE | /api/[resource]/{id} | [Description JP/VN] | FR-[CODE]-[NUM] |

**依存サービス / Dependencies:**
- [Service 1]
- [Service 2]

---

#### 2.2.2 サービス / Services

**COMP-BE-SVC-001: [Service Name JP] / [Service Name VN]**

**ファイルパス / File Path:** `src/main/java/[package]/service/[Name]Service.java`

**責任 / Responsibility:**
[Japanese description of service responsibility]
[Vietnamese description]

**主要メソッド / Key Methods:**

| メソッド名 / Method | 入力 / Input | 出力 / Output | 説明 / Description |
|----------------|----------|-----------|---------------|
| [methodName1] | [Input type] | [Output type] | [Description JP/VN] |
| [methodName2] | [Input type] | [Output type] | [Description JP/VN] |

**ビジネスルール / Business Rules:**
- [Rule 1 JP] / [Rule 1 VN]
- [Rule 2 JP] / [Rule 2 VN]

**依存関係 / Dependencies:**
- [Repository 1]
- [External Service 1]

---

#### 2.2.3 リポジトリ / Repositories

**COMP-BE-REPO-001: [Repository Name JP] / [Repository Name VN]**

**ファイルパス / File Path:** `src/main/java/[package]/repository/[Name]Repository.java`

**責任 / Responsibility:**
[Japanese description]
[Vietnamese description]

**主要クエリメソッド / Key Query Methods:**

| メソッド名 / Method | 戻り値 / Return | 説明 / Description |
|----------------|-------------|---------------|
| findById | Optional<[Entity]> | [Description JP/VN] |
| findAll | List<[Entity]> | [Description JP/VN] |
| save | [Entity] | [Description JP/VN] |
| delete | void | [Description JP/VN] |

---

#### 2.2.4 エンティティ / Entities

**COMP-BE-ENT-001: [Entity Name JP] / [Entity Name VN]**

**ファイルパス / File Path:** `src/main/java/[package]/entity/[Name].java`

**責任 / Responsibility:**
[Japanese description]
[Vietnamese description]

**主要属性 / Key Attributes:**

| 属性名 / Attribute | 型 / Type | 必須 / Required | 説明 / Description |
|----------------|--------|--------------|---------------|
| [attribute1] | [Type] | Yes/No | [Description JP/VN] |
| [attribute2] | [Type] | Yes/No | [Description JP/VN] |

**関連 / Relationships:**
- [Relationship 1 JP] / [Relationship 1 VN]

---

#### 2.2.5 DTO / Data Transfer Objects

**COMP-BE-DTO-001: [DTO Name JP] / [DTO Name VN]**

**ファイルパス / File Path:** `src/main/java/[package]/dto/[Name]DTO.java`

**責任 / Responsibility:**
[Japanese description]
[Vietnamese description]

**フィールド / Fields:**

| フィールド名 / Field | 型 / Type | バリデーション / Validation | 説明 / Description |
|-----------------|--------|----------------------|---------------|
| [field1] | [Type] | [Validation rules] | [Description JP/VN] |
| [field2] | [Type] | [Validation rules] | [Description JP/VN] |

---

### 2.3 共通コンポーネント / Shared Components

#### 2.3.1 ユーティリティ / Utilities

**COMP-UTIL-001: [Utility Name JP] / [Utility Name VN]**

**ファイルパス / File Path:** `utils/[name].ts` or `src/main/java/[package]/util/[Name]Util.java`

**責任 / Responsibility:**
[Japanese description]
[Vietnamese description]

**主要関数 / Key Functions:**
- [Function 1 JP] / [Function 1 VN]: [Description]
- [Function 2 JP] / [Function 2 VN]: [Description]

---

#### 2.3.2 定数 / Constants

**COMP-CONST-001: [Constants Group JP] / [Constants Group VN]**

**ファイルパス / File Path:** `constants/[name].ts` or `src/main/java/[package]/constant/[Name]Constants.java`

**内容 / Content:**
- [Constant group description JP] / [Constant group description VN]

---

### 2.4 コンポーネント間インタラクション / Component Interactions

**データフロー / Data Flow:**

```
[User] → [Page Component] → [UI Component] → [API Call]
                                                   ↓
                                           [Controller]
                                                   ↓
                                            [Service]
                                                   ↓
                                          [Repository]
                                                   ↓
                                           [Database]
```

**通信パターン / Communication Patterns:**
- [Pattern 1 JP] / [Pattern 1 VN]: [Description]
- [Pattern 2 JP] / [Pattern 2 VN]: [Description]

---

### 2.5 コンポーネントサマリー / Component Summary

| レイヤー / Layer | コンポーネント数 / Count | 主要技術 / Key Technology |
|--------------|-------------------|---------------------|
| Frontend Pages | [X] | Next.js App Router |
| Frontend UI | [Y] | React 19 + TypeScript |
| Frontend Hooks | [Z] | React Hooks |
| Backend Controllers | [A] | Spring Web |
| Backend Services | [B] | Spring Boot |
| Backend Repositories | [C] | Spring Data JPA |
| Backend Entities | [D] | JPA |
| Backend DTOs | [E] | Java Records |

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- SRS Reference: `[srs_file_path]`
- Architecture Reference: `[architecture_file_path]`
- Sections: Components, Functional Requirements, Architecture
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All components derived from requirements
2. [ ] Component responsibilities clear and focused
3. [ ] File paths follow project conventions
4. [ ] Requirements traceability established
5. [ ] Bilingual format ≥60% of content
6. [ ] No implementation code (interfaces only)
7. [ ] Component interactions documented
8. [ ] Evidence sources cited

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: BD Section 2 - Component Design*
