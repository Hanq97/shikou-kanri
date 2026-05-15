# Frontend Page Components Specialist - INDEX

**Split Date**: 2026-01-02
**Original File**: `page-components-specialist.md` (1,937 lines)
**Split Result**: 3 specialized files (all ≤800 lines)
**Format**: Pseudo-code WORKFLOW format

---

## File Structure

### 1. page-public.md (661 lines)
**Patterns**: 10.1-10.5 (Public Marketing Pages)

**Contains**:
- Pattern 10.1: Home Page (Marketing Landing)
- Pattern 10.2: About Page
- Pattern 10.3: Pricing Page
- Pattern 10.4: Contact Page
- Pattern 10.5: Blog List Page

**Focus**:
- Static generation for marketing pages
- SEO optimization and metadata
- Conversion-focused CTAs
- Bilingual Vietnamese/English content
- JSON-LD schemas for rich snippets

**Use Cases**:
- Public-facing landing pages
- Company information pages
- Pricing and product pages
- Contact forms with server actions
- Blog content with ISR

---

### 2. page-dashboard-crud.md (666 lines)
**Patterns**: 10.6-10.20 (Dashboard and CRUD Pages)

**Contains**:
- Pattern 10.6: Dashboard Home Page (Protected)
- Pattern 10.11: User/Case List Page (CRUD)
- Pattern 10.16: Case/User Detail Page (Dynamic Route)
- Patterns 10.7-10.10: Analytics, Reports, Calendar, Tasks
- Patterns 10.12-10.15: User management, Teams, Roles
- Patterns 10.17-10.20: Customers, Products (list + detail)

**Focus**:
- Server-side authenticated pages
- CRUD operations with filtering/pagination
- Dynamic routes with tab navigation
- Real-time dashboard widgets
- Vietnamese legal domain models (cases, clients, documents)

**Use Cases**:
- Protected dashboard pages
- List pages with search/filter/sort
- Detail pages with related data
- Analytics and reporting
- Management interfaces

---

### 3. page-conversation-settings.md (660 lines)
**Patterns**: 10.21-10.26 (Real-time and Configuration Pages)

**Contains**:
- Pattern 10.21: Conversation/Message Detail Page (Streaming)
- Pattern 10.26: Settings/Configuration Page (Form-based)
- Pattern 10.22: Conversation List Page
- Pattern 10.23: Document List Page
- Pattern 10.24: Document Viewer Page
- Pattern 10.25: Workflow List Page

**Focus**:
- Real-time messaging with polling/WebSocket
- Multi-section settings forms
- Document management and viewing
- Auto-save preferences
- Security settings and danger zones

**Use Cases**:
- Messaging and conversations
- User account settings
- Document upload/preview
- Workflow automation
- Preference management

---

## Pattern Coverage Summary

| Pattern | Page Type | File | Line Count |
|---------|-----------|------|------------|
| 10.1-10.5 | Public Pages | page-public.md | 661 |
| 10.6-10.20 | Dashboard & CRUD | page-dashboard-crud.md | 666 |
| 10.21-10.26 | Conversation & Settings | page-conversation-settings.md | 660 |

**Total**: 26 patterns, 1,987 lines (3 files, all compliant)

---

## Technology Stack

### Next.js 15.3.0 Features
- **Server Components**: Default for all page components
- **Metadata API**: Static and dynamic metadata generation
- **Server Actions**: Form submissions and mutations
- **Dynamic Routes**: `[id]` parameters with `generateStaticParams()`
- **Suspense**: Progressive loading with fallback UI
- **ISR**: Incremental Static Regeneration with revalidation

### React 19 Features
- **Server Components**: Async components with direct data fetching
- **Suspense**: Streaming and progressive enhancement
- **useActionState**: Form state management with server actions
- **useOptimistic**: Optimistic UI updates

### TypeScript 5
- **Strict Mode**: Full type safety across all patterns
- **Generic Props**: Type-safe page and component props
- **Interface Exports**: Public API contracts

---

## Vietnamese Legal Domain Context

### Core Entities
```pseudo
Case: {
  case_number: string,      // VN format: "HS-2024-0001"
  type: "civil" | "commercial" | "criminal" | "administrative",
  status: "active" | "pending" | "closed" | "archived",
  priority: "high" | "medium" | "low",
  assigned_to: User,
  clients: Client[],
  documents: Document[],
  deadlines: Deadline[]
}

Document: {
  type: "contract" | "evidence" | "submission" | "court_order",
  category: "Hợp Đồng" | "Chứng Cứ" | "Hồ Sơ Nộp Tòa"
}
```

### Vietnamese Labels
```pseudo
LABELS = {
  dashboard: "Bảng Điều Khiển",
  cases: "Vụ Việc",
  clients: "Khách Hàng",
  documents: "Tài Liệu",
  conversations: "Cuộc Trò Chuyện",
  settings: "Cài Đặt"
}
```

---

## Usage Guidelines

### When to Use Each File

#### page-public.md
- Building public-facing marketing pages
- Implementing SEO-optimized content
- Creating conversion-focused landing pages
- Static content that updates via deployment

#### page-dashboard-crud.md
- Creating protected dashboard pages
- Implementing CRUD operations
- Building analytics and reporting pages
- Managing user-specific data with authentication

#### page-conversation-settings.md
- Real-time messaging features
- User settings and preferences
- Document management systems
- Workflow automation pages

---

## Caching Strategies

### Static Generation (force-cache)
- Public pages (home, about, pricing)
- Marketing content
- Blog posts (with ISR)

### ISR (Incremental Static Regeneration)
```typescript
{ next: { revalidate: 60 } }    // 1 minute
{ next: { revalidate: 300 } }   // 5 minutes
{ next: { revalidate: 3600 } }  // 1 hour
```

### No Caching (no-store)
- Dashboard pages
- User-specific data
- Real-time conversations
- Settings pages

### Tag-Based Revalidation
```typescript
{ next: { tags: ['cases', 'case-123'] } }
// Invalidate: revalidateTag('case-123')
```

---

## Best Practices

### Performance
1. ✅ Server Components by default (95% of pages)
2. ✅ Parallel data fetching with `Promise.all()`
3. ✅ Suspense boundaries for progressive loading
4. ✅ Image optimization with Next.js Image
5. ✅ Code splitting for client components

### SEO
1. ✅ Unique title and description per page
2. ✅ OpenGraph and Twitter Card metadata
3. ✅ JSON-LD structured data
4. ✅ Canonical URLs
5. ✅ Sitemap inclusion for public pages

### Security
1. ✅ Authentication checks before rendering
2. ✅ Permission verification per page
3. ✅ CSRF protection for forms
4. ✅ Input validation (client + server)
5. ✅ Rate limiting on sensitive operations

### Accessibility
1. ✅ Semantic HTML structure
2. ✅ ARIA labels for interactive elements
3. ✅ Keyboard navigation support
4. ✅ Color contrast (WCAG 2.1 AA)
5. ✅ Screen reader compatibility

---

## Migration Notes

### From Original File
1. ✅ All 26 patterns preserved
2. ✅ TypeScript implementations converted to pseudo-code WORKFLOW format
3. ✅ Vietnamese legal domain context maintained
4. ✅ Technology stack documentation retained
5. ✅ Best practices consolidated

### Format Changes
- ❌ **Removed**: Full TypeScript implementations
- ✅ **Added**: Pseudo-code WORKFLOW structure
- ✅ **Added**: Clear INPUT/STEPS/OUTPUT sections
- ✅ **Retained**: TypeScript interface signatures
- ✅ **Retained**: Vietnamese legal terminology

---

## Related Files

### Companion Specialists
- `app-router-specialist.md` → Split into 5 files (router config, guards, loaders, navigation, layouts)
- `app-providers-specialist.md` → Split into 4 files (query/state, UI/theme, auth, composition)
- `widget-components-specialist.md` → Single file (under limit)

### INDEX Files
- `app-router_INDEX.md` - Router specialist index
- `app-providers_INDEX.md` - Providers specialist index
- `page-components_INDEX.md` - This file

---

## Quick Reference

### File Selection Matrix

| Need | File to Use |
|------|-------------|
| Public marketing page | page-public.md |
| SEO-optimized content | page-public.md |
| Dashboard with widgets | page-dashboard-crud.md |
| CRUD list/detail pages | page-dashboard-crud.md |
| Real-time messaging | page-conversation-settings.md |
| User settings/config | page-conversation-settings.md |
| Document management | page-conversation-settings.md |

### Common Patterns Reference

| Pattern | Description | File | Lines |
|---------|-------------|------|-------|
| 10.1 | Home Page (Marketing) | page-public.md | ~150 |
| 10.6 | Dashboard Home | page-dashboard-crud.md | ~180 |
| 10.11 | CRUD List Page | page-dashboard-crud.md | ~200 |
| 10.16 | Detail Page with Tabs | page-dashboard-crud.md | ~160 |
| 10.21 | Conversation/Messaging | page-conversation-settings.md | ~240 |
| 10.26 | Settings Page | page-conversation-settings.md | ~280 |

---

**Original File**: `page-components-specialist.md` (1,937 lines)
**Split Result**: 3 files, 1,987 total lines (all ≤800 lines)
**Compliance**: 100% (3/3 files compliant)
**Format**: Pseudo-code WORKFLOW
**Vietnamese Context**: Preserved

*Frontend Page Components Specialist - INDEX v1.0*
*Created: 2026-01-02*
*StarX4CRM - Next.js 15 Specialist Suite*
