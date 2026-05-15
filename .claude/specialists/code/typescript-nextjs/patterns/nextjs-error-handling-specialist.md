# Next.js Error Handling Specialist — Generic
# Next.jsエラーハンドリングスペシャリスト — 汎用
# Chuyên Gia Xử Lý Lỗi Next.js — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 99.1–99.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
Error handling architecture: error boundaries, navigation errors, recovery patterns, Server Action errors, API error chains, user-facing messages, and error tracking.

## Patterns

### Pattern 99.1: Error Boundary Architecture
```
app/
├── global-error.tsx  → Root errors (MUST include <html><body>). Client Component
├── error.tsx         → Per-segment error boundary. Client Component
│                       Receives: { error: Error & { digest?: string }, reset: () => void }
└── not-found.tsx     → 404 UI. Triggered by notFound()

Rules:
- error.tsx is ALWAYS a Client Component ('use client')
- Each route segment can have its own error.tsx
- Errors bubble UP to nearest error boundary
- Layout errors are caught by PARENT layout's error.tsx (not same-level)
```

### Pattern 99.2: Navigation Error Anti-pattern (CRITICAL)
```tsx
// ❌ NEVER wrap these in try-catch — they throw INTENTIONALLY
try {
  redirect('/login')      // throws NEXT_REDIRECT
} catch (e) {
  // This catches the redirect! Navigation fails silently
}

// ✅ Let navigation functions throw freely
redirect('/login')          // 307 temporary
permanentRedirect('/new')   // 308 permanent
notFound()                  // triggers not-found.tsx
// If you MUST try-catch around code that might redirect:
import { unstable_rethrow } from 'next/navigation'
try { ... } catch (e) { unstable_rethrow(e); handleOtherError(e) }
```

### Pattern 99.3: Error Recovery
```tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>  {/* Re-renders segment */}
    </div>
  )
}
// reset() re-renders the route segment WITHOUT full page reload
// Preserve form state: store in sessionStorage before error, restore after reset
```

### Pattern 99.4: Server Action Errors
```tsx
// ✅ Return typed results — don't throw to client
'use server'
type ActionResult = { success: true; data: User } | { success: false; error: string }

async function updateUser(formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { success: false, error: parsed.error.message }
  try {
    const user = await db.user.update(...)
    revalidatePath('/users')
    return { success: true, data: user }
  } catch { return { success: false, error: 'Update failed' } }
}

// Client: useActionState for form state management
const [state, action, pending] = useActionState(updateUser, null)
```

### Pattern 99.5: API Error Chain & User Messages
```
Chain: API Client (HTTP/timeout) → Repository (domain errors) → UseCase (business) → UI (display)
User-facing: NEVER expose stack traces. Error codes for i18n. Toast=transient, Inline=field, Page=fatal
Always include action: "Try again" / "Contact support" / "Go back"
Tracking: digest (server), source maps, environment context (user, flags, route)
```

## Common Mistakes
- Wrapping redirect()/notFound() in try-catch (silently breaks navigation)
- Throwing errors from Server Actions to client (expose internals)
- Missing global-error.tsx (no root-level error handling)
- Showing raw error.message to users (may contain sensitive info)
- Not including reset/retry action in error UI

## Related Specialists
- 91.x nextjs-file-conventions — error.tsx, not-found.tsx file placement
- 90.x nextjs-rsc-patterns — Server Action patterns
- 100.x nextjs-security — Input validation, sanitization
