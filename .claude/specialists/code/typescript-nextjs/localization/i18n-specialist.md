# Internationalization (i18n) Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 58.1–58.3 |
| **Source Paths** | `src/core/i18n/` (config + locale files) |
| **File Count** | ~15 files (i18n.tsx + en-US/ + ja-JP/ locale JSONs) |
| **Naming Convention** | `{namespace}.json` for locale files |
| **Barrel Export** | `src/core/i18n/i18n.tsx` exports configured instance |
| **Imports From** | N/A (leaf dependency) |
| **Imported By** | Presentation: components use `useTranslation()` hook |
| **Cannot Import** | `presentation/*`, `infrastructure/*`, `domain/*` |

---

## Description

The application supports bilingual output: Japanese (ja-JP) as the primary locale and English (en-US) as the fallback. Translations are bundled as TypeScript modules (NOT fetched via HTTP). Translation keys are nested with namespaced hierarchies. The `LocaleProvider` context wraps the application and the `useTranslation()` hook provides access in components.

---

## Key Concepts

### 58.1 — i18next Configuration

- Primary: `ja-JP` (Japanese)
- Fallback: `en-US` (English)
- Browser language detection via `i18next-browser-languagedetector`
- Translation files are TypeScript modules in `src/core/i18n/locales/`
- Bundled at compile time (no HTTP fetching)

### 58.2 — Nested Key Structure

Keys follow a hierarchical dot-notation: `{scope}.{module}.{section}.{key}`

Examples:
- `global.clientCmn.menu.name`
- `global.clientSfa.opportunity.listTitle`
- `validation.required`
- `common.button.save`

### 58.3 — LocaleProvider and useTranslation

`LocaleProvider` wraps the application with i18next and Ant Design locale providers. `useTranslation()` is the standard hook for all translation access.

---

## Code Examples

### i18next Config (Pattern 58.1)

```typescript
// src/core/i18n/i18n.tsx
import i18nInstance from 'i18next';                          // renamed import
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector'; // USED (NOT HttpBackend)
import { enUS } from './locales/en-US';                      // named export, hyphenated
import { jaJP } from './locales/ja-JP';                      // named export, hyphenated

// Translations bundled as TypeScript modules — NOT fetched via HTTP
const resources = {
  en: { translation: enUS },
  ja: { translation: jaJP },
};

i18nInstance
  .use(LanguageDetector)    // LanguageDetector IS used
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ja',     // Japanese is primary, NOT English
    supportedLngs: ['ja', 'en'],
    interpolation: { escapeValue: false },
  });

export default i18nInstance;
```

### Translation Module Structure (Pattern 58.2)

```typescript
// src/core/i18n/locales/ja-JP.ts (named export, hyphenated filename)
export const jaJP = {
  button: {
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    search: '検索',
  },
  validation: {
    required: '{{field}}は必須項目です',
    maxLength: '{{field}}は{{max}}文字以内で入力してください',
  },
  clientCmn: {
    menu: {
      name: '顧客管理',
      customer: '顧客',
      category: 'カテゴリ',
    },
  },
};
```

### LocaleProvider (Pattern 58.3)

```typescript
// src/presentation/providers/LocaleProvider.tsx
'use client';
import '@/core/i18n/i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/core/i18n/i18n';
import { ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  const antdLocale = i18nInstance.language.startsWith('ja') ? jaJP : enUS;

  return (
    <I18nextProvider i18n={i18n}>
      <ConfigProvider locale={antdLocale}>
        {children}
      </ConfigProvider>
    </I18nextProvider>
  );
}
```

### Component Usage (Pattern 58.3)

```typescript
// Any component
import { useTranslation } from 'react-i18next';

export function CustomerListHeader() {
  const { t } = useTranslation('global');
  return <h1>{t('clientCmn.menu.name')}</h1>;
}

// With interpolation
const { t } = useTranslation('common');
t('validation.required', { field: '顧客名' });
// → "顧客名は必須項目です"
```

---

## Anti-Patterns

- Hardcoding Japanese or English strings directly in components
- Using string concatenation instead of interpolation for dynamic values
- Mixing translation namespaces without declaring them in `useTranslation()`
- Storing locale in Redux instead of i18next's own language state
- Using `i18next-http-backend` to load translations (they are bundled as TS modules)
- Using `public/locales/` directory for translation files (does not exist)

---

## Related Specialists

- `theme-specialist.md` — AntdProvider includes ConfigProvider locale
- `antd-form-specialist.md` — Validation messages use i18n
- `nextjs-clean-architecture-specialist.md` — i18n config placed in core layer
