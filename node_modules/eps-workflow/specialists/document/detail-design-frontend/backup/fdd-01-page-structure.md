# Page Structure Micro-Agent / ページ構造マイクロエージェント / Micro-Agent Cấu trúc Trang

**Responsibility / 責任 / Trách nhiệm**: Generate page hierarchy, routing structure, and layout component specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~100-150 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (screen definitions), BD (architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C1

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** / エビデンスファイルパス / Đường dẫn tệp bằng chứng
   - Contains screen flow and page requirements

2. **SRS File Path** / SRSファイルパス / Đường dẫn tệp SRS
   - Contains screen definitions and navigation requirements
   - Section: UI/UX requirements, screen list

3. **Basic Design File Path** / 基本設計ファイルパス / Đường dẫn tệp Thiết kế Cơ bản
   - Contains frontend architecture decisions
   - Section: Page structure, routing approach

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1: Load Context / コンテキスト読み込み / Tải ngữ cảnh

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
basic_design = read_file(basic_design_file_path)

# Extract screen/page information
screens = extract_screens(srs, section="UI Requirements")
navigation_flow = extract_navigation_flow(evidence)
architecture_decisions = extract_architecture(basic_design, section="Frontend Architecture")
```

### Step 2: Extract Requirements / 要件抽出 / Trích xuất yêu cầu

```pseudocode
# Extract page hierarchy from SRS
page_list = []
FOR each screen in screens:
    page_info = {
        "screen_id": screen.id,
        "screen_name_jp": screen.name_japanese,
        "screen_name_vn": screen.name_vietnamese,
        "screen_name_en": screen.name_english,
        "route_path": screen.route,
        "parent_page": screen.parent,
        "page_type": screen.type  # list, detail, form, dashboard
    }
    page_list.append(page_info)
END FOR

# Extract routing requirements from BD
routing_approach = extract_routing_approach(basic_design)  # App Router, Pages Router
layout_strategy = extract_layout_strategy(basic_design)
```

### Step 3: Generate Design / 設計生成 / Tạo thiết kế

```pseudocode
# Generate page tree structure
page_tree = build_page_hierarchy(page_list)

# Generate route definitions
route_definitions = []
FOR each page in page_list:
    route = generate_route_interface(
        path=page.route_path,
        page_type=page.page_type,
        layout=determine_layout(page, layout_strategy)
    )
    route_definitions.append(route)
END FOR

# Generate layout component interfaces
layout_interfaces = generate_layout_interfaces(layout_strategy)

# Generate page component signatures
page_components = []
FOR each page in page_list:
    component = generate_page_component_interface(
        name=page.screen_name_en,
        props=determine_page_props(page),
        params=extract_route_params(page.route_path),
        search_params=determine_search_params(page)
    )
    page_components.append(component)
END FOR

# Combine into output
output = {
    "page_hierarchy": page_tree,
    "route_definitions": route_definitions,
    "layout_interfaces": layout_interfaces,
    "page_component_signatures": page_components
}
```

### Step 4: Validate Output (Q1-Q4) / 出力検証 / Xác thực đầu ra

#### Q1: Traceable to SRS/BD? / SRS/BDに追跡可能か？ / Có truy xuất được đến SRS/BD không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] Each page maps to screen definition in SRS?
- [ ] Route structure follows BD architecture decisions?
- [ ] Layout strategy matches BD specifications?
- [ ] No orphan pages without SRS reference?

```pseudocode
FOR each page in page_list:
    ASSERT exists_in_srs(page.screen_id, srs)
    ASSERT route_follows_architecture(page.route_path, routing_approach)
END FOR

ASSERT layout_strategy in basic_design
ASSERT no_orphan_pages(page_list, srs)
```

#### Q2: Implementation Details Correct? / 実装詳細は正しいか？ / Chi tiết triển khai đúng không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] Page component interfaces use Next.js 15 conventions?
- [ ] Route paths follow App Router structure?
- [ ] Props definitions use TypeScript correctly?
- [ ] Async components for server-side pages?

```pseudocode
FOR each page_component in page_components:
    ASSERT uses_nextjs_15_conventions(page_component)
    ASSERT has_typescript_interface(page_component.props)
    IF page_component.type == "server":
        ASSERT is_async_component(page_component)
    END IF
END FOR

ASSERT route_paths_valid(route_definitions)
```

#### Q3: Japanese + Vietnamese ≥60%? / 日本語+ベトナム語≥60%か？ / Tiếng Nhật + tiếng Việt ≥60% không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] All section headers bilingual?
- [ ] Page names in Japanese + Vietnamese?
- [ ] Table headers bilingual?
- [ ] Combined JP+VN ≥60%?

```pseudocode
content = serialize_output(output)
bilingual_ratio = calculate_bilingual_ratio(content)

ASSERT bilingual_ratio >= 60
ASSERT all_page_names_trilingual(page_list)
ASSERT all_headers_bilingual(content)
```

#### Q4: Interfaces Only (No Implementation)? / インターフェースのみ（実装なし）か？ / Chỉ interface (không có implementation) không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] Only TypeScript interfaces and type definitions?
- [ ] No function implementations?
- [ ] No component logic?
- [ ] Only signatures and structure?

```pseudocode
code_blocks = extract_code_blocks(output)

FOR each code_block in code_blocks:
    ASSERT is_interface_or_type_definition(code_block)
    ASSERT NOT contains_function_body(code_block)
    ASSERT NOT contains_component_logic(code_block)
    ASSERT only_signatures(code_block)
END FOR
```

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 1. ページ構造 / Cấu trúc Trang (Page Structure)

### 1.1 ページ階層 / Phân cấp Trang (Page Hierarchy)

```
app/
├── (auth)/                          # 認証グループ / Nhóm xác thực / Auth group
│   ├── login/                       # ログインページ / Trang đăng nhập / Login page
│   │   └── page.tsx
│   └── layout.tsx
├── (dashboard)/                     # ダッシュボードグループ / Nhóm dashboard / Dashboard group
│   ├── layout.tsx
│   ├── page.tsx                     # ダッシュボード / Dashboard / Dashboard
│   └── [feature]/                   # 機能ページ / Trang tính năng / Feature pages
│       ├── page.tsx                 # 一覧ページ / Trang danh sách / List page
│       ├── [id]/                    # 詳細ページ / Trang chi tiết / Detail page
│       │   └── page.tsx
│       └── create/                  # 作成ページ / Trang tạo mới / Create page
│           └── page.tsx
└── layout.tsx                       # ルートレイアウト / Layout gốc / Root layout
```

### 1.2 ルート定義 / Định nghĩa Route (Route Definitions)

| Route Path | ページ名 / Tên trang / Page Name | Type | Layout |
|------------|-------------------------------|------|--------|
| `/login` | ログイン / Đăng nhập / Login | Client | Auth |
| `/dashboard` | ダッシュボード / Dashboard / Dashboard | Server | Dashboard |
| `/dashboard/workflow` | ワークフロー一覧 / Danh sách Workflow / Workflow List | Server | Dashboard |
| `/dashboard/workflow/[id]` | ワークフロー詳細 / Chi tiết Workflow / Workflow Detail | Server | Dashboard |
| `/dashboard/workflow/create` | ワークフロー作成 / Tạo Workflow / Create Workflow | Client | Dashboard |

### 1.3 レイアウトコンポーネント / Component Layout (Layout Components)

#### Root Layout Interface / ルートレイアウトインターフェース / Giao diện Layout Gốc

```typescript
// app/layout.tsx
interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  // Interface only - no implementation
}
```

#### Dashboard Layout Interface / ダッシュボードレイアウトインターフェース / Giao diện Layout Dashboard

```typescript
// app/(dashboard)/layout.tsx
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Interface only - no implementation
}
```

#### Auth Layout Interface / 認証レイアウトインターフェース / Giao diện Layout Xác thực

```typescript
// app/(auth)/layout.tsx
interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // Interface only - no implementation
}
```

### 1.4 ページコンポーネントインターフェース / Giao diện Component Trang (Page Component Interfaces)

#### List Page Interface / 一覧ページインターフェース / Giao diện Trang Danh sách

```typescript
// app/(dashboard)/workflow/page.tsx
interface WorkflowListPageProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
  };
}

export default async function WorkflowListPage({ searchParams }: WorkflowListPageProps) {
  // Interface only - no implementation
}
```

#### Detail Page Interface / 詳細ページインターフェース / Giao diện Trang Chi tiết

```typescript
// app/(dashboard)/workflow/[id]/page.tsx
interface WorkflowDetailPageProps {
  params: {
    id: string;
  };
  searchParams: {
    tab?: string;
  };
}

export default async function WorkflowDetailPage({ params, searchParams }: WorkflowDetailPageProps) {
  // Interface only - no implementation
}
```

#### Create/Edit Page Interface / 作成・編集ページインターフェース / Giao diện Trang Tạo/Sửa

```typescript
// app/(dashboard)/workflow/create/page.tsx
interface WorkflowCreatePageProps {
  searchParams: {
    template?: string;
  };
}

export default function WorkflowCreatePage({ searchParams }: WorkflowCreatePageProps) {
  // Interface only - no implementation
}
```

---

**Checkpoint C1 Validation / チェックポイントC1検証 / Xác thực điểm kiểm tra C1**: ✓
```

---

## Example Output / 出力例 / Ví dụ đầu ra

```markdown
## 1. ページ構造 / Cấu trúc Trang (Page Structure)

### 1.1 ページ階層 / Phân cấp Trang (Page Hierarchy)

**機能 / Tính năng / Feature**: CMN015002 - ワークフローデザイナー / Trình thiết kế Workflow / Workflow Designer

```
app/
├── (dashboard)/
│   ├── layout.tsx
│   └── workflow/
│       ├── page.tsx                      # ワークフロー一覧 / Danh sách Workflow
│       ├── [id]/
│       │   ├── page.tsx                  # ワークフロー詳細 / Chi tiết Workflow
│       │   └── edit/
│       │       └── page.tsx              # ワークフロー編集 / Chỉnh sửa Workflow
│       └── create/
│           └── page.tsx                  # ワークフロー作成 / Tạo Workflow
```

### 1.2 ルート定義 / Định nghĩa Route (Route Definitions)

| Route Path | ページ名 / Tên trang / Page Name | Type | トレーサビリティ / Traceability |
|------------|-------------------------------|------|--------------------------------|
| `/dashboard/workflow` | ワークフロー一覧 / Danh sách Workflow / Workflow List | Server | SRS-3.2.1 |
| `/dashboard/workflow/[id]` | ワークフロー詳細 / Chi tiết Workflow / Workflow Detail | Server | SRS-3.2.2 |
| `/dashboard/workflow/[id]/edit` | ワークフロー編集 / Chỉnh sửa Workflow / Workflow Edit | Client | SRS-3.2.3 |
| `/dashboard/workflow/create` | ワークフロー作成 / Tạo Workflow / Create Workflow | Client | SRS-3.2.4 |

### 1.3 ページコンポーネントインターフェース / Giao diện Component Trang (Page Component Interfaces)

#### ワークフロー一覧ページ / Trang Danh sách Workflow (Workflow List Page)

```typescript
// Traceability: SRS-3.2.1, BD-4.1.1
interface WorkflowListPageProps {
  searchParams: {
    page?: string;           // ページ番号 / Số trang / Page number
    limit?: string;          // 表示件数 / Số lượng hiển thị / Items per page
    search?: string;         // 検索キーワード / Từ khóa tìm kiếm / Search keyword
    status?: string;         // ステータスフィルター / Bộ lọc trạng thái / Status filter
  };
}

export default async function WorkflowListPage({ searchParams }: WorkflowListPageProps) {
  // Interface only
}
```

#### ワークフロー詳細ページ / Trang Chi tiết Workflow (Workflow Detail Page)

```typescript
// Traceability: SRS-3.2.2, BD-4.1.2
interface WorkflowDetailPageProps {
  params: {
    id: string;              // ワークフローID / ID Workflow / Workflow ID
  };
  searchParams: {
    tab?: string;            // タブ選択 / Chọn tab / Selected tab
  };
}

export default async function WorkflowDetailPage({ params, searchParams }: WorkflowDetailPageProps) {
  // Interface only
}
```

#### ワークフロー作成ページ / Trang Tạo Workflow (Workflow Create Page)

```typescript
// Traceability: SRS-3.2.4, BD-4.1.4
interface WorkflowCreatePageProps {
  searchParams: {
    template?: string;       // テンプレートID / ID mẫu / Template ID
  };
}

export default function WorkflowCreatePage({ searchParams }: WorkflowCreatePageProps) {
  // Client Component - Interface only
}
```

---

**Checkpoint C1 Validation / チェックポイントC1検証 / Xác thực điểm kiểm tra C1**: ✓

**Traceability / トレーサビリティ / Khả năng truy xuất**:
- SRS: Sections 3.2.1-3.2.4 (Screen definitions)
- BD: Sections 4.1.1-4.1.4 (Page architecture)
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] All pages traced to SRS screen definitions
2. [ ] Route structure follows Next.js 15 App Router conventions
3. [ ] Page component interfaces use correct TypeScript types
4. [ ] Server/Client components properly identified
5. [ ] Bilingual format (Japanese + Vietnamese ≥60%)
6. [ ] No implementation code (interfaces only)
7. [ ] Checkpoint C1 validation marker present
8. [ ] Traceability references included

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Page Structure and Routing Interface Generation*
