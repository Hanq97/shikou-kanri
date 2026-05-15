# Ant Design Form Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 55.1–55.4 |
| **Source Paths** | `src/presentation/ui/modules/*/containers/`, `src/presentation/ui/modules/*/blocks/` |
| **File Count** | 100+ form-using components across modules |
| **Naming Convention** | `{Entity}CreateContainer.tsx` / `{Entity}CreateBlock.tsx` |
| **Barrel Export** | Per-module `index.ts` |
| **Imports From** | Core: DI containers; Infrastructure: store hooks |
| **Imported By** | App: route pages import containers |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

Forms use Ant Design's `Form` component with `Form.useForm()`. For screens where multiple child components share a single form instance, `FormProvider` context provides cross-component form sharing. Dynamic field rendering maps `IDataField[]` from Redux into Ant Design field configurations.

---

## Key Concepts

### 55.1 — Form.useForm() Pattern

Each container that owns a form creates the instance with `Form.useForm()` and passes it down to the block (presentational) component.

### 55.2 — FormProvider Context

When a screen has multiple form sections (header + detail grids), `FormProvider` wraps them with named forms. Child components access their form instance by name.

### 55.3 — useSharedForm and useOptionalSharedForm

- `useSharedForm(name)`: asserts form exists, throws if not found (use in required contexts)
- `useOptionalSharedForm(name)`: returns `null` if not found (use in optional contexts)

### 55.4 — Dynamic Field Rendering with mapSearchParams

`IDataField[]` from Redux describes each field (type, label, options, validation). `mapSearchParams()` converts this array into Ant Design `Form.Item` + control configurations.

---

## Code Examples

### Basic Form Pattern (Pattern 55.1)

```typescript
// containers/CustomerCreateContainer.tsx
export function CustomerCreateContainer() {
  const [form] = Form.useForm<ICustomerFormValues>();

  const handleSubmit = async (values: ICustomerFormValues) => {
    await createCustomerFactory(values);
  };

  return <CustomerCreateBlock form={form} onSubmit={handleSubmit} />;
}

// blocks/CustomerCreateBlock.tsx
interface Props {
  form: FormInstance<ICustomerFormValues>;
  onSubmit: (values: ICustomerFormValues) => void;
}
export function CustomerCreateBlock({ form, onSubmit }: Props) {
  return (
    <Form form={form} onFinish={onSubmit} layout="vertical">
      <Form.Item name="customerName" label="顧客名" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Button htmlType="submit">保存</Button>
    </Form>
  );
}
```

### FormProvider Cross-Component Sharing (Pattern 55.2)

```typescript
// containers/CustomerEditContainer.tsx
export function CustomerEditContainer() {
  return (
    <Form.Provider
      onFormChange={(name, { changedFields }) => {
        // cross-form sync logic
      }}
    >
      <CustomerHeaderForm />
      <CustomerContactForm />
    </Form.Provider>
  );
}
```

### Shared Form Hooks (Pattern 55.3)

```typescript
// src/presentation/hooks/useSharedForm.ts
import { useFormInstance } from 'antd/es/form/context';

export function useSharedForm<T = unknown>(): FormInstance<T> {
  const form = useFormInstance<T>();
  if (!form) throw new Error('useSharedForm must be used inside a Form');
  return form;
}

export function useOptionalSharedForm<T = unknown>(): FormInstance<T> | null {
  try {
    return useFormInstance<T>();
  } catch {
    return null;
  }
}
```

### Dynamic Field Rendering (Pattern 55.4)

```typescript
// src/core/utils/mapSearchParams.ts
import type { IDataField } from '@/domain/entities/IDataField';

export function mapSearchParams(fields: IDataField[]) {
  return fields.map((field) => ({
    name: field.fieldCode,
    label: field.fieldLabel,
    component: resolveFieldComponent(field.fieldType),
    rules: field.required ? [{ required: true, message: `${field.fieldLabel}は必須です` }] : [],
  }));
}

// Usage in block
const fields = useAppSelector(selectSearchFields);
const fieldConfigs = mapSearchParams(fields);

return (
  <Form form={form}>
    {fieldConfigs.map(({ name, label, component: Component, rules }) => (
      <Form.Item key={name} name={name} label={label} rules={rules}>
        <Component />
      </Form.Item>
    ))}
  </Form>
);
```

### Dirty Tracking via onValuesChange (Pattern 55.1)

```typescript
// Container component with dirty tracking
const [form] = Form.useForm();
const [isDirty, setIsDirty] = useState(false);

<Form form={form} onValuesChange={(changed, all) => {
  setIsDirty(true);
}}>
```

### Imperative Block Ref Access (Pattern 55.3)

Page-builder uses refs to access block form values imperatively:

```typescript
// Page-builder container: access individual block form values
const blockRef = useRef<FormInstance[]>([]);

// Get values from a specific block
const values = blockRef.current[blockIndex].getFieldsValue();

// Validate specific block
await blockRef.current[blockIndex].validateFields();
```

---

## Anti-Patterns

- Using useFormInstance() as primary pattern (use Form.useForm() in container instead)
- Calling `form.getFieldsValue()` inside event handlers instead of using `onFinish`
- Sharing a single form instance across unrelated screens
- Defining field validation inline as objects instead of using Ant Design rules array
- Creating form state in Redux (form state belongs in Form.useForm, not Redux)

---

## Related Specialists

- `block-screen-specialist.md` — Block rendering context
- `redux-toolkit-specialist.md` — commonSlice provides IDataField[]
- `module-organization-specialist.md` — Container/Block file placement
