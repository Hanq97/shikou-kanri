# Next.js Security Specialist — Generic
# Next.jsセキュリティスペシャリスト — 汎用
# Chuyên Gia Bảo Mật Next.js — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 100.1–100.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
Web security for Next.js applications: XSS prevention, CSP headers, CSRF protection, environment secrets, Server Action validation, auth middleware, and dependency security.

## Patterns

### Pattern 100.1: XSS Prevention
```tsx
// React auto-escapes JSX expressions by default ✅
<p>{userInput}</p>  // Safe: auto-escaped

// ❌ DANGEROUS: bypasses auto-escaping
<div dangerouslySetInnerHTML={{ __html: userContent }} />
// If unavoidable: sanitize with DOMPurify
import DOMPurify from 'isomorphic-dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// Also sanitize: href="javascript:...", src attributes from user input
```

### Pattern 100.2: CSP Headers
```ts
// middleware.ts (or next.config.js headers)
const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'nonce-${nonce}'`,
  `style-src 'self' 'unsafe-inline'`,  // Required for many CSS-in-JS libs
  `img-src 'self' data: https:`,
  `connect-src 'self' https://api.example.com`,
].join('; ')
// Pass nonce to components via headers() for inline scripts
```

### Pattern 100.3: CSRF Protection
```
Server Actions: Built-in CSRF protection (POST + Origin header check) ✅
Route Handlers: Implement manually:
  - SameSite=Lax/Strict cookies
  - Verify Origin header matches allowed origins
  - CSRF token in custom header for AJAX requests
  - Double-submit cookie pattern for traditional forms
```

### Pattern 100.4: Environment Secrets
```
NEXT_PUBLIC_* → Exposed to browser bundle. NEVER put secrets here
Server-only:   → process.env.SECRET_KEY (only in Server Components, Actions, Route Handlers)

// Enforce server-only access:
import 'server-only'  // Throws at build time if imported in Client Component
export const config = { apiKey: process.env.API_KEY }

// Build-time vs runtime:
// Build-time: Inlined at next build. Runtime: Read from process.env at request time
// Use runtime for secrets that rotate: env.DYNAMIC_SECRET
```

### Pattern 100.5: Server Action Validation
```tsx
'use server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

async function createUser(formData: FormData) {
  // 1. Validate input (NEVER trust client data)
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }

  // 2. Authenticate (check session)
  const session = await getSession()
  if (!session) redirect('/login')

  // 3. Authorize (check permissions)
  if (!session.user.canCreateUsers) return { error: 'Forbidden' }

  // 4. Rate limit (prevent abuse)
  // 5. Execute business logic
}
```

### Pattern 100.6: Auth Middleware
```ts
// middleware.ts — runs BEFORE every matched request
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  // Verify JWT/session token. Reject expired tokens
  // Set security headers on response
}

export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] }
```

### Pattern 100.7: Dependency Security
```
- npm audit regularly. Fix critical/high vulnerabilities
- Lock file integrity: verify package-lock.json in CI
- Minimize dependencies: audit unused packages
- Pin major versions: avoid ^major auto-upgrades
- Review new dependencies before adding (check maintainers, last update, size)
- Supply chain: use npm provenance, verify signatures when available
```

## Common Mistakes
- Using NEXT_PUBLIC_ prefix for secret API keys (exposed to browser)
- Trusting client-side form data without server validation
- Missing auth check in Server Actions (they're public POST endpoints)
- dangerouslySetInnerHTML without DOMPurify sanitization
- Overly permissive CSP (script-src 'unsafe-eval' 'unsafe-inline')

## Related Specialists
- 99.x nextjs-error-handling — Error handling without exposing internals
- 90.x nextjs-rsc-patterns — Server Action authentication patterns
- 57.x permission — Project-specific permission system (variant overlay)
