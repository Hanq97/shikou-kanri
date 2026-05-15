# CRUD Page Patterns Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 82.1–82.9 |
| **Source Paths** | `src/presentation/ui/modules/*/` (26 modules × 3 page types) |
| **File Count** | 100+ CRUD pages across all modules |
| **Naming Convention** | `{Entity}List.tsx`, `CreateUpdate{Entity}.tsx`, `Detail{Entity}.tsx` |
| **Barrel Export** | Per-module `index.ts` |
| **Imports From** | Core: DI containers, constants; Presentation: hooks |
| **Imported By** | App: `[application]/page.tsx` mapApplication |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

The application follows a strict CRUD page structure for all 26 feature modules. Each module has 3 page types: List (search + table), Create/Edit (combined), and Detail (read-only tabs). Deviating from these patterns WILL break consistency.

---

## Key Concepts

### 82.1 — Standard Module Directory Structure

```
moduleXXX000/
├── moduleXXX001_entity_create_update/  → Create + Edit (combined)
│   ├── CreateUpdateEntity.tsx           → Main page
│   └── components/                      → Local sub-components
├── moduleXXX002_entity_list/           → List + Search
│   ├── ListEntity.tsx                   → Main (search + table + pagination)
│   └── style.scss                       → Optional styles
├── moduleXXX003_entity_detail/         → Read-only detail
│   └── DetailEntity.tsx                 → Main (tabs + breadcrumb)
└── index.ts                             → Barrel exports
```

### 82.2 — List Page Pattern

```typescript
// 1. Filter state is LOCAL useState (NOT Redux)
const [filterState, setFilterState] = useState({ keyword: '', status: 'all', category: '0' });
const [currentPage, setCurrentPage] = useState(1);

// 2. Search ALWAYS resets pagination
const handleSearch = () => { setCurrentPage(1); fetchData(1, pageSize, sort); };

// 3. page_index is 0-BASED!
const params = { page_index: currentPage - 1, page_size: pageSize, sort_by: sort, keyword: filterState.keyword };

// 4. Response structure
const result = await searchEntityFactory(params);
// result.content = T[], result.total_elements = number

// 5. Permission guard
const permission = usePermission(APPLICATION_KEY.ENTITY_SEARCH);
{permission.canCreate && <Button>新規登録</Button>}
```

### 82.3 — Create/Edit Combined Page Pattern

```typescript
const id = searchParams.get('id');
const screenRef = useRef<RefScreenFormProps>(null);
const screen = await getScreenFactory({ screen_code: 'S00003' });

const handleSave = async () => {
  const values = await screenRef.current.getFieldsValue();
  const payload = { ...convertToSnakeCase(values), id: id || null };
  const res = id ? await updateFactory(payload) : await createFactory(payload);
  const params = new URLSearchParams(searchParams.toString());
  params.set('id', res.id);
  router.replace(`/${tenant_key}/${APPLICATION_KEY.ENTITY_EDIT}?${params.toString()}`);
};
```

### 82.4 — Detail Page Pattern

```typescript
const id = searchParams.get('id');
dispatch(setListBreacrumb([{
  title: APPLICATION_NAME[APPLICATION_KEY.ENTITY_DETAIL],
  path: `/${tenant_key}/${prefix}/${APPLICATION_KEY.ENTITY_DETAIL}?id=${id}`
}]));
const sortedTabs = [...tabs].sort((a, b) => a.displayOrder - b.displayOrder);
const onChange = (key: string) => dispatch(updateDetailScreen({ currentTab, key: application }));
```

### 82.5 — URL Navigation Pattern

```
/{tenant_key}/{prefix}/{application_key}?id={uuid}
Example: /acme-corp/cmn/cmn001003_customer_detail?id=550e8400-...
```

### 82.6 — Double-Click Table Navigation

```typescript
onRow={(record) => ({
  onDoubleClick: (e) => {
    if (e.target instanceof HTMLInputElement) return;
    router.push(`/${tenant_key}/${prefix}/${editAppKey}?id=${record.id}`);
  }
})}
```

### 82.7 — Permission Guards on Buttons

```typescript
const permission = usePermission(APPLICATION_KEY.ENTITY_SEARCH);
{permission.canCreate && <Button onClick={handleCreate}>新規登録</Button>}
{permission.canUpdate && <Button onClick={handleEdit}>編集</Button>}
{permission.canDelete && <Button danger onClick={handleDelete}>削除</Button>}
```

### 82.8 — Search Bar with Local Filter State

```typescript
const [filterState, setFilterState] = useState({ keyword: '', status: 'all', category: '0' });
const handleSearch = () => { setCurrentPage(1); fetchData(1, pageSize, sort, filterState); };
const handleReset = () => {
  setFilterState({ keyword: '', status: 'all', category: '0' });
  setCurrentPage(1);
  fetchData(1, pageSize, sort);
};
```

### 82.9 — Batch Delete Pattern

```typescript
const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

const handleDelete = async () => {
  if (selectedRowKeys.length === 0) return;
  const payload = { ids: selectedRowKeys };
  await deleteMultiFactory(payload);
  notification.success();
  setSelectedRowKeys([]);
  fetchData(currentPage, pageSize, sort);
};

{permission.canDelete && selectedRowKeys.length > 0 && (
  <Button danger onClick={handleDelete}>
    削除 ({selectedRowKeys.length})
  </Button>
)}
```

---

## Anti-Patterns

- Storing filter state in Redux (MUST be local useState)
- Using page number directly as page_index (MUST subtract 1)
- Creating separate Create and Edit pages (MUST be combined)
- Hardcoding table columns (MUST use IColumn[] — see 83.x)
- Using path params for entity ID (MUST use query param `?id=`)
- Forgetting convertToSnakeCase before API call
- Using router.push instead of router.replace after save
- Not resetting pagination when searching

---

## Related Specialists

- `table-datagrid-specialist.md` (83.x) — Dynamic columns, renderByType
- `permission-specialist.md` (57.x) — usePermission for button guards
- `antd-form-specialist.md` (55.x) — ScreenForm ref, ControlMap
- `data-fetching-specialist.md` (62.x) — Factory function chain
- `layout-appshell-specialist.md` (69.x) — Breadcrumb, navigation
