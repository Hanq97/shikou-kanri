# CKEditor Integration Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 64.1–64.5 |
| **Source Paths** | Rich text components using CKEditor |
| **File Count** | 2-3 components that use CKEditor |
| **Naming Convention** | Standard component naming |
| **Imports From** | `@ckeditor/ckeditor5-react`, `ckeditor5` |
| **Imported By** | Form blocks that need rich text editing |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

The application uses CKEditor 5 (v46.1.0, GPL license) for rich text editing in information management and email composition. The editor MUST be loaded via `next/dynamic` with `ssr: false` because CKEditor accesses `window` and `document` at import time.

---

## Key Concepts

### 64.1 — SSR-Safe Dynamic Import (CKEditorWrapper)

```typescript
// File: src/presentation/ui/components/CKEditorWrapper.tsx (25 lines)
import dynamic from 'next/dynamic';

const CKEditorWrapper = dynamic(
  () => import('./CKEditorClient'),
  {
    ssr: false,           // REQUIRED: CKEditor uses window/document
    loading: () => <div>Loading editor...</div>,
  }
);

export default CKEditorWrapper;
```

ALWAYS use `CKEditorWrapper` in pages — NEVER import `CKEditorClient` directly.

### 64.2 — CKEditorClient Configuration (96 lines)

File: `src/presentation/ui/components/CKEditorClient.tsx`

- **License**: GPL (not commercial — affects distribution)
- **18 Plugins**: Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough, BlockQuote, Link, List, Indent, Alignment, FontFamily, FontColor, Image, ImageToolbar, ImageCaption, ImageStyle, MediaEmbed, ImageInsertUI, Code
- **Toolbar order**: `['undo', 'redo', '|', 'fontFamily', 'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', '|', 'blockQuote', 'fontColor', 'link', 'code', '|', 'alignment', '|', 'bulletedList', 'numberedList', 'outdent', 'indent']`

### 64.3 — Props Interface

```typescript
interface CKEditorProps {
  onReady?: (editor: ClassicEditor) => void;
  onChange?: (data: string) => void;
  initialData?: string;
}
```

### 64.4 — Ant Design Form Integration

- CKEditorWrapper used inside `Form.Item`
- Value passed via `initialData` prop (CKEditor is UNCONTROLLED — not form-controlled)
- `onChange` fires with HTML string content
- Do NOT use `value` prop (unlike standard Ant Design form controls)

### 64.5 — Usage Locations (3 files)

1. `cmn012000/cmn012002_information_create_update/EditInformationTemplate.tsx`
2. `cmn012000/cmn012002_information_create_update/InformationForm.tsx`
3. `cmn009000/cmn009003_mail_server_email_management/FormSendEmail.tsx`

---

## Anti-Patterns

- Importing `CKEditorClient` directly (MUST use `CKEditorWrapper` with `ssr: false`)
- Using `<CKEditor>` from `@ckeditor/ckeditor5-react` without dynamic import
- Treating CKEditor as controlled component (it is UNCONTROLLED)
- Adding plugins not in the 18-plugin list without checking GPL compatibility
- Forgetting `loading` fallback in dynamic import

---

## Related Specialists

- `antd-form-specialist.md` (55.x) — Form.Item integration
- `theme-specialist.md` (59.x) — Dark mode CSS for editor
- `perf-specialist.md` (66.x) — next/dynamic pattern
