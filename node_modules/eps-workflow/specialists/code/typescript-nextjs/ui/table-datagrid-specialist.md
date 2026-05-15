# Table/DataGrid Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 83.1–83.7 |
| **Source Paths** | `src/presentation/ui/modules/*/blocks/` (table blocks), `src/presentation/ui/components/` |
| **File Count** | 50+ table implementations across modules |
| **Naming Convention** | Within Block components |
| **Barrel Export** | N/A (inline in blocks) |
| **Imports From** | Infrastructure: store hooks; Domain: entities |
| **Imported By** | Presentation: list page blocks |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

Tables use IColumn[] metadata from backend, rendered dynamically via useMemo, cells dispatched through renderByType(). Custom fields in addition_data JSON need separate parsing.

---

## Key Concepts

### 83.1 — Dynamic Column Building from IColumn[]

```typescript
const tableOptions = useMemo<ColumnsType<any>>(() =>
  columns?.map((x) => {
    let valueDataField = null;
    if (x.dataSource) {
      const ds = JSON.parse(x.dataSource.toString());
      valueDataField = listDataField.find((f) => f.id == ds.data_field_id);
    }
    return {
      title: x.titleName,
      dataIndex: valueDataField?.dataFieldName ?? null,
      render: (_, record) => {
        let value;
        if (valueDataField?.dataFieldType === 'Customize') {
          const additionData = record.addition_data ? JSON.parse(record.addition_data) : null;
          value = mapValue(additionData, valueDataField);
        } else {
          value = mapValue(record, valueDataField);
        }
        return renderByType(value, valueDataField);
      },
    };
  })
, [columns, listDataField]);
```

### 83.2 — renderByType() Function

| Data Type | Rendering |
|-----------|-----------|
| `Image` | `<Avatar>` with presigned URL via `getFileByIdsFactory()` |
| `Date` | `dayjs(value).format('YYYY/MM/DD')` |
| `DateTime` | `dayjs(value).format('YYYY/MM/DD HH:mm')` |
| `Number` | `format()` locale-aware |
| `Customize` | Parse `addition_data` JSON → `mapValue()` |
| `Text` | Raw string (default) |

### 83.3 — Customize Field (addition_data JSON)

```typescript
if (valueDataField?.dataFieldType === 'Customize') {
  const additionData = record.addition_data ? JSON.parse(record.addition_data) : null;
  value = mapValue(additionData, valueDataField);
}
```

### 83.4 — Multi-Field Sorting

```typescript
sort_fields: [
  { key: 'created_date', order: 'DESC', field_type: 'Standard', data_type: 'DateTime' },
  { key: 'customer_name', order: 'ASC', field_type: 'Standard', data_type: 'Text' }
]
```

### 83.5 — Row Selection

```typescript
const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
<Table rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} />
```

### 83.6 — Double-Click Navigation

```typescript
onRow={(record) => ({
  onDoubleClick: (e) => {
    if (e.target instanceof HTMLInputElement) return;
    router.push(`/${tenant_key}/${prefix}/${editAppKey}?id=${record.id}`);
  }
})}
```

### 83.7 — Presigned URL for Image Columns

```typescript
const [url, setUrl] = useState<string | null>(null);
useEffect(() => {
  if (value?.file_id) {
    getFileByIdsFactory([value.file_id]).then(([file]) => setUrl(file.presignedUrl));
  }
}, [value?.file_id]);
return url ? <Avatar src={url} /> : <Avatar icon={<UserOutlined />} />;
```

---

## Anti-Patterns

- Hardcoding table columns (MUST use IColumn[])
- Ignoring `dataFieldType === 'Customize'` (breaks custom fields)
- Using `<img>` instead of `<Avatar>` with presigned URL
- Single-field sorting only (project supports multi-field)
- Missing HTMLInputElement guard on double-click
- Not wrapping column builder in useMemo

---

## Related Specialists

- `crud-page-patterns-specialist.md` (82.x) — List page integration
- `data-fetching-specialist.md` (62.x) — searchEntityFactory
- `antd-form-specialist.md` (55.x) — ControlMap for inline edit
- `block-screen-specialist.md` (56.x) — IColumn metadata
