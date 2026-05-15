# React Composition Specialist — Generic
# Reactコンポジションスペシャリスト — 汎用
# Chuyên Gia Composition React — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 95.1–95.8 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
Component composition patterns: avoiding boolean prop explosion, compound components, state/UI decoupling, context interfaces, providers, and React 19 APIs. Source: Vercel composition-patterns.

## Patterns

### Pattern 95.1: Avoid Boolean Prop Proliferation (CRITICAL)
```tsx
// ❌ Each boolean doubles possible states (2^n combinations)
<Button primary large disabled loading />

// ✅ Explicit variant components
<Button variant="primary" size="lg" state="loading" />
// Or separate components:
<PrimaryButton size="lg" />, <GhostButton size="sm" />
```

### Pattern 95.2: Compound Components (HIGH)
```tsx
// Shared context via createContext. No prop drilling
function Tabs({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0)
  return <TabsContext value={{ active, setActive }}>{children}</TabsContext>
}
Tabs.List = TabList      // Namespaced exports
Tabs.Panel = TabPanel
// Usage: <Tabs><Tabs.List>...</Tabs.List><Tabs.Panel>...</Tabs.Panel></Tabs>
```

### Pattern 95.3: Decouple State from UI (MEDIUM)
```tsx
// Provider owns state logic. UI depends on context interface only
// Same UI, different state sources (local, server, mock)
<LocalCartProvider><CartUI /></LocalCartProvider>    // dev
<ServerCartProvider><CartUI /></ServerCartProvider>  // prod
```

### Pattern 95.4: Generic Context Interfaces (HIGH)
```tsx
// Standard contract: { state, actions, meta }
interface CartContext {
  state: { items: Item[]; total: number }
  actions: { add(item: Item): void; remove(id: string): void }
  meta: { loading: boolean; error: Error | null }
}
// Multiple providers implement same interface → dependency injection
```

### Pattern 95.5: Lift State into Providers (HIGH)
```tsx
// Hoist shared state to provider boundary
// Siblings share via context — no callback chains or ref hacks
<FormProvider>
  <FormFields />    {/* reads form state */}
  <FormActions />   {/* dispatches form actions */}
  <FormPreview />   {/* reads form state (different view) */}
</FormProvider>
```

### Pattern 95.6: Explicit Component Variants (MEDIUM)
```tsx
// Named variant components are self-documenting
// Each variant composes only the pieces it needs
function AlertBanner({ message }: Props) { return <div className="alert-banner">...</div> }
function AlertInline({ message }: Props) { return <span className="alert-inline">...</span> }
// NOT: <Alert type="banner" /> <Alert type="inline" />
```

### Pattern 95.7: Children Over Render Props (MEDIUM)
```tsx
// ✅ children for composition
<Card><CardHeader /><CardBody /></Card>

// Reserve render props ONLY for parent→child data injection
<DataLoader render={(data) => <Display data={data} />} />
```

### Pattern 95.8: React 19 APIs (MEDIUM)
```tsx
// ref as regular prop (no forwardRef needed)
function Input({ ref, ...props }: { ref?: Ref<HTMLInputElement> }) { ... }

// use() replaces useContext()
const theme = use(ThemeContext)

// Conditional use() is supported (unlike hooks)
const data = condition ? use(dataPromise) : fallback
```

## Common Mistakes
- Boolean prop explosion creating 2^n state combinations
- Prop drilling through 4+ levels instead of using context
- Tightly coupling state management to UI components
- Using render props when children composition suffices
- Still using forwardRef in React 19 (ref is a regular prop now)

## Related Specialists
- 94.x react-perf-rendering — Re-render optimization
- 85.x provider-composition — Project-specific provider nesting (variant overlay)
- 50.x clean-architecture — Project-specific component organization (variant overlay)
