# App Router Specialist Files - Index
# Chỉ Mục Các Tệp Chuyên Gia App Router

**Date**: 2026-01-02
**Original File**: app-router-specialist.md (2,933 lines - SPLIT INTO 5 FILES)
**Total Patterns**: 20 patterns (9.21 - 9.40)
**Split Strategy**: Logical grouping by functionality

---

## File Summary

### 1. app-router-config.md (766 lines)
**Patterns**: 9.21-9.22
**Focus**: Router configuration and type-safe routing
**Contents**:
- Pattern 9.21: RouterProvider - Next.js 15 App Router Configuration
- Pattern 9.22: RouteConfig - Route Configuration with Type Safety

**Key Topics**:
- Root layout with Vietnamese font support
- SEO metadata (bilingual)
- Provider hierarchy
- Route groups (auth, dashboard, legal, public)
- Type-safe route configuration
- Helper functions for route operations

---

### 2. app-router-guards.md (791 lines)
**Patterns**: 9.23, 9.31-9.35
**Focus**: Route protection and access control
**Contents**:
- Pattern 9.23: RouteGuards - Route Protection & Middleware
- Pattern 9.31-9.35: Route Guards - Multi-Level Access Control

**Key Topics**:
- Middleware-based route protection (server-side)
- JWT token verification
- Client-side guard components (AuthGuard, RoleGuard, PermissionGuard, SubscriptionGuard)
- Role-based access control (RBAC)
- Permission-based authorization
- Subscription-tier access control
- Compositional guards

---

### 3. app-router-loaders.md (536 lines)
**Patterns**: 9.24-9.25
**Focus**: Data loading and error handling
**Contents**:
- Pattern 9.24: RouteLoader - Data Loading with Suspense
- Pattern 9.25: RouteErrorBoundary - Route-Level Error Handling

**Key Topics**:
- loading.tsx files for Suspense boundaries
- Skeleton UI components
- Server-side data fetching
- generateMetadata for SEO
- ISR (Incremental Static Regeneration)
- error.tsx files for error boundaries
- Error recovery with reset()
- Bilingual error messages

---

### 4. app-navigation.md (498 lines)
**Patterns**: 9.26-9.30
**Focus**: Navigation components
**Contents**:
- Pattern 9.26: NavigationBar - Top Navigation Component
- Pattern 9.27: Sidebar - Side Navigation Component
- Pattern 9.28: Breadcrumbs - Breadcrumb Navigation
- Pattern 9.29: TabNavigation - Tab-Based Navigation
- Pattern 9.30: MobileNav - Mobile Navigation

**Key Topics**:
- NavigationBar with logo, user menu, notifications
- Collapsible sidebar with active states
- Hierarchical breadcrumb navigation
- Tabbed interfaces for sub-pages
- Responsive mobile navigation drawer
- Touch gestures and body scroll lock
- Accessibility (ARIA labels, keyboard nav)

---

### 5. app-layouts.md (593 lines)
**Patterns**: 9.36-9.40
**Focus**: Layout components and global styling
**Contents**:
- Pattern 9.36: RootLayout - Global App Shell
- Pattern 9.37: DashboardLayout - Dashboard Shell
- Pattern 9.38: AuthLayout - Authentication Layout
- Pattern 9.39: LegalLayout - Legal Workflows Layout
- Pattern 9.40: ThemeProvider - Dark/Light Mode

**Key Topics**:
- RootLayout with metadata and providers
- DashboardLayout with sidebar + navbar
- AuthLayout with centered auth forms
- LegalLayout with legal workflows sidebar
- ThemeProvider with dark/light mode
- Tailwind CSS configuration
- Layout composition and hierarchy

---

## Pattern Distribution

| File | Patterns | Lines | Focus Area |
|------|----------|-------|-----------|
| app-router-config.md | 9.21-9.22 | 766 | Configuration & Routing |
| app-router-guards.md | 9.23, 9.31-9.35 | 791 | Protection & Access Control |
| app-router-loaders.md | 9.24-9.25 | 536 | Loading & Error Handling |
| app-navigation.md | 9.26-9.30 | 498 | Navigation Components |
| app-layouts.md | 9.36-9.40 | 593 | Layouts & Styling |
| **TOTAL** | **20 patterns** | **3,184** | **All 5 files ≤800 lines** |

---

## Usage Guide

### When to use each file:

**app-router-config.md**:
- Setting up new Next.js 15 project
- Configuring root layout and metadata
- Defining route structure
- Creating type-safe navigation

**app-router-guards.md**:
- Implementing authentication middleware
- Adding role-based access control
- Creating permission guards
- Setting up subscription-based features

**app-router-loaders.md**:
- Creating loading states
- Implementing error boundaries
- Setting up data fetching
- Generating SEO metadata

**app-navigation.md**:
- Building navigation components
- Creating responsive menus
- Implementing breadcrumbs
- Adding tabbed interfaces

**app-layouts.md**:
- Defining layout structure
- Setting up theme system
- Creating dashboard shells
- Implementing auth layouts

---

## Technology Stack

- **Framework**: Next.js 15.3.0 with App Router
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **State**: Zustand (navigation, auth state)
- **Server State**: TanStack Query v5
- **Icons**: lucide-react
- **Theme**: next-themes
- **Authentication**: jose (JWT)
- **Fonts**: Inter (Vietnamese support), JetBrains Mono

---

## Vietnamese Domain Context

### Key Entities:
- **Hợp Đồng** (Contract)
- **Tài Liệu Pháp Lý** (Legal Document)
- **Vụ Án** (Legal Case)
- **Người Dùng** (User)

### User Roles:
- **Quản Trị Viên** (Admin)
- **Quản Lý** (Manager)
- **Luật Sư** (Lawyer)
- **Trợ Lý Pháp Lý** (Paralegal)
- **Khách Hàng** (Client)

---

## Related Documentation

- **Architecture**: Feature-Sliced Design (FSD)
- **Workflow**: EPS (Enhanced Productivity System) v3.0
- **Quality Gates**: Q1-Q4 validation
- **Internal Docs**: `/docs/architecture/app-router-structure.md`

---

## Compliance

✅ All files ≤800 lines
✅ Pseudo-code WORKFLOW format
✅ Vietnamese domain context included
✅ TypeScript interfaces (signatures only)
✅ No full implementation code
✅ Integration points documented

---

**Split Status**: COMPLETE
**Files Created**: 5
**Original File**: Backed up to `.backups/app-router-specialist.md.backup`
**Date**: 2026-01-02
