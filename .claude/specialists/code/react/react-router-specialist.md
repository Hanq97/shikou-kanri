# React Router Specialist
**Version**: 1.0.0
**Technology**: Next.js 15.3.0 App Router + React 19
**Integration**: C# ASP.NET Core Backend
**Created**: 2025-12-31
**Specialist Type**: React Frontend - Routing & Navigation

---

## 🎯 SPECIALIST OVERVIEW

This specialist enforces Next.js App Router patterns for:
- File-based routing with App Router
- Server and Client Components routing
- Dynamic routes and route groups
- Protected routes with middleware
- Navigation with `<Link>` and `useRouter`
- Route handlers (API routes)
- Parallel routes and intercepting routes
- Loading and error UI patterns

**Next.js App Router replaces React Router** - this specialist focuses on Next.js-specific patterns.

---

## 📋 ROUTING PATTERNS (20 Total)

### Pattern 1: file-based-routing
**Category**: Basic Routing
**Description**: File-based routing with App Router directory structure

```typescript
// app/layout.tsx (Root Layout)
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StarX4CRM',
  description: 'P2P Insurance & Lending Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

```typescript
// app/page.tsx (Home Page - route: /)
export default function HomePage() {
  return (
    <div>
      <h1>Welcome to StarX4CRM</h1>
      <p>P2P Insurance & Lending Platform</p>
    </div>
  );
}
```

```typescript
// app/users/page.tsx (Users List - route: /users)
async function fetchUsers() {
  const response = await fetch('http://localhost:5000/api/users', {
    next: { revalidate: 60 },
  });
  return response.json();
}

export default async function UsersPage() {
  const users = await fetchUsers();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Directory Structure**:
```
app/
├── layout.tsx          → / (root layout)
├── page.tsx            → / (home page)
├── users/
│   ├── page.tsx        → /users (users list)
│   └── [id]/
│       └── page.tsx    → /users/:id (user detail)
└── dashboard/
    ├── layout.tsx      → /dashboard (dashboard layout)
    ├── page.tsx        → /dashboard (dashboard home)
    └── settings/
        └── page.tsx    → /dashboard/settings
```

**Why This Pattern**:
- ✅ File system = routing structure
- ✅ Co-locate components with routes
- ✅ Automatic code splitting per route

---

### Pattern 2: dynamic-routes
**Category**: Basic Routing
**Description**: Dynamic route segments with params

```typescript
// app/users/[id]/page.tsx
interface UserDetailPageProps {
  params: {
    id: string;
  };
}

async function fetchUser(id: string) {
  const response = await fetch(`http://localhost:5000/api/users/${id}`);
  if (!response.ok) throw new Error('User not found');
  return response.json();
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const user = await fetchUser(params.id);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}

// Generate static params at build time (optional)
export async function generateStaticParams() {
  const users = await fetch('http://localhost:5000/api/users').then((res) =>
    res.json()
  );

  return users.map((user: any) => ({
    id: user.id,
  }));
}
```

**Why This Pattern**:
- ✅ SEO-friendly dynamic URLs
- ✅ Type-safe params with TypeScript
- ✅ Optional static generation

---

### Pattern 3: nested-layouts
**Category**: Layout Patterns
**Description**: Nested layouts for shared UI across routes

```typescript
// app/dashboard/layout.tsx
import { DashboardNav } from '@/components/DashboardNav';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <DashboardNav />
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
```

```typescript
// app/dashboard/page.tsx (inherits dashboard layout)
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard Overview</h1>
      {/* DashboardNav will be visible due to parent layout */}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Shared layout components (nav, sidebar, footer)
- ✅ Layout persists across route changes
- ✅ Authentication logic in layout

---

### Pattern 4: route-groups
**Category**: Layout Patterns
**Description**: Route groups for organizing routes without affecting URL structure

```typescript
// app/(auth)/layout.tsx (Parentheses exclude from URL)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-logo">
          <img src="/logo.svg" alt="StarX4CRM" />
        </div>
        {children}
      </div>
    </div>
  );
}
```

```typescript
// app/(auth)/login/page.tsx → route: /login (NOT /(auth)/login)
'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const result = await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}
```

**Directory Structure**:
```
app/
├── (auth)/               → Group (excluded from URL)
│   ├── layout.tsx        → Auth layout
│   ├── login/
│   │   └── page.tsx      → /login
│   └── register/
│       └── page.tsx      → /register
└── (dashboard)/          → Group (excluded from URL)
    └── dashboard/
        └── page.tsx      → /dashboard
```

**Why This Pattern**:
- ✅ Organize routes without affecting URLs
- ✅ Different layouts for different route groups
- ✅ Cleaner folder structure

---

### Pattern 5: navigation-link
**Category**: Navigation
**Description**: Client-side navigation with `<Link>` component

```typescript
// components/UserList.tsx
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {/* Prefetch on hover, client-side navigation */}
            <Link href={`/users/${user.id}`} prefetch={true}>
              {user.name}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/users/new">Create New User</Link>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Client-side navigation (no full page reload)
- ✅ Automatic prefetching on hover
- ✅ Better performance than `<a>` tag

---

### Pattern 6: programmatic-navigation
**Category**: Navigation
**Description**: Programmatic navigation with `useRouter` hook

```typescript
// components/CreateUserForm.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CreateUserForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const userData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
    };

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const user = await response.json();
        // Navigate to user detail page
        router.push(`/users/${user.id}`);
        // Or refresh current route
        // router.refresh();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <select name="role">
        <option value="User">User</option>
        <option value="Admin">Admin</option>
      </select>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create User'}
      </button>
      <button type="button" onClick={() => router.back()}>
        Cancel
      </button>
    </form>
  );
}
```

**useRouter Methods**:
- `router.push('/path')` - Navigate to route
- `router.replace('/path')` - Replace current history entry
- `router.refresh()` - Refresh current route
- `router.back()` - Navigate back
- `router.forward()` - Navigate forward
- `router.prefetch('/path')` - Prefetch route

**Why This Pattern**:
- ✅ Navigate after form submission
- ✅ Redirect after authentication
- ✅ Navigate based on user actions

---

### Pattern 7: protected-routes-middleware
**Category**: Authentication & Authorization
**Description**: Protected routes with Next.js middleware

```typescript
// middleware.ts (root level)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register');

  // Redirect authenticated users away from auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthPage && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (request.nextUrl.pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Specify which routes to protect
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
```

**Why This Pattern**:
- ✅ Centralized authentication logic
- ✅ Runs before route rendering
- ✅ Role-based access control

---

### Pattern 8: route-handlers-api
**Category**: API Routes
**Description**: API route handlers for backend integration

```typescript
// app/api/users/route.ts (GET /api/users)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Forward request to C# backend
    const response = await fetch('http://localhost:5000/api/users', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const users = await response.json();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const response = await fetch('http://localhost:5000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const user = await response.json();
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/users/[id]/route.ts (GET /api/users/:id)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `http://localhost:5000/api/users/${params.id}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = await response.json();
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
```

**API Route Directory Structure**:
```
app/api/
├── users/
│   ├── route.ts           → GET/POST /api/users
│   └── [id]/
│       └── route.ts       → GET/PUT/DELETE /api/users/:id
└── auth/
    └── [...nextauth]/
        └── route.ts       → NextAuth endpoints
```

**Why This Pattern**:
- ✅ BFF (Backend for Frontend) pattern
- ✅ Hide backend URLs from client
- ✅ Add authentication layer

---

### Pattern 9: loading-ui
**Category**: Loading & Error States
**Description**: Loading UI with `loading.tsx`

```typescript
// app/users/loading.tsx (Automatic loading state for /users)
export default function UsersLoading() {
  return (
    <div className="users-loading">
      <h1>Users</h1>
      <div className="skeleton-list">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-item">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-text"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```typescript
// app/users/page.tsx (Suspense boundary automatically applied)
export default async function UsersPage() {
  // This async operation will show loading.tsx while fetching
  const users = await fetchUsers();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Automatic Suspense boundary
- ✅ Better UX during data fetching
- ✅ No manual Suspense wrapper needed

---

### Pattern 10: error-handling-ui
**Category**: Loading & Error States
**Description**: Error UI with `error.tsx`

```typescript
// app/users/error.tsx (Automatic error boundary for /users)
'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function UsersError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Users page error:', error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>Something went wrong loading users!</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try Again</button>
    </div>
  );
}
```

```typescript
// app/error.tsx (Global error boundary)
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Application Error</h2>
        <p>Something went wrong!</p>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

**Why This Pattern**:
- ✅ Automatic error boundary
- ✅ Isolate errors to specific routes
- ✅ Reset functionality built-in

---

### Pattern 11: not-found-ui
**Category**: Loading & Error States
**Description**: Custom 404 pages with `not-found.tsx`

```typescript
// app/not-found.tsx (Global 404)
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link href="/">Go Home</Link>
    </div>
  );
}
```

```typescript
// app/users/[id]/page.tsx (Trigger not-found programmatically)
import { notFound } from 'next/navigation';

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const response = await fetch(`http://localhost:5000/api/users/${params.id}`);

  if (!response.ok) {
    notFound(); // Triggers not-found.tsx
  }

  const user = await response.json();

  return (
    <div>
      <h1>{user.name}</h1>
    </div>
  );
}
```

```typescript
// app/users/[id]/not-found.tsx (Custom 404 for user detail)
export default function UserNotFound() {
  return (
    <div>
      <h2>User Not Found</h2>
      <p>The user you are looking for does not exist.</p>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Custom 404 pages per route
- ✅ Better UX than generic errors
- ✅ Programmatic control with `notFound()`

---

### Pattern 12: parallel-routes
**Category**: Advanced Routing
**Description**: Parallel routes for rendering multiple pages simultaneously

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  team,
  analytics,
}: {
  children: React.ReactNode;
  team: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div className="dashboard">
      <div className="main-content">{children}</div>
      <div className="sidebar">
        <div className="team-section">{team}</div>
        <div className="analytics-section">{analytics}</div>
      </div>
    </div>
  );
}
```

**Directory Structure**:
```
app/dashboard/
├── layout.tsx
├── page.tsx              → children prop
├── @team/
│   └── page.tsx          → team prop
└── @analytics/
    └── page.tsx          → analytics prop
```

```typescript
// app/dashboard/@team/page.tsx
async function fetchTeam() {
  const response = await fetch('http://localhost:5000/api/team');
  return response.json();
}

export default async function TeamSlot() {
  const team = await fetchTeam();

  return (
    <div>
      <h3>Team Members</h3>
      <ul>
        {team.map((member: any) => (
          <li key={member.id}>{member.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Independent loading states per slot
- ✅ Better code organization
- ✅ Parallel data fetching

---

### Pattern 13: intercepting-routes
**Category**: Advanced Routing
**Description**: Intercepting routes for modal-like UX

```typescript
// app/photos/page.tsx (Gallery view)
import Link from 'next/link';

export default function PhotosPage() {
  const photos = [1, 2, 3, 4, 5];

  return (
    <div className="photo-grid">
      {photos.map((id) => (
        <Link key={id} href={`/photos/${id}`}>
          <img src={`/photos/${id}.jpg`} alt={`Photo ${id}`} />
        </Link>
      ))}
    </div>
  );
}
```

```typescript
// app/photos/(..)photos/[id]/page.tsx (Intercept /photos/:id when navigating from /photos)
import { Modal } from '@/components/Modal';

export default function PhotoModal({ params }: { params: { id: string } }) {
  return (
    <Modal>
      <img src={`/photos/${params.id}.jpg`} alt={`Photo ${params.id}`} />
    </Modal>
  );
}
```

```typescript
// app/photos/[id]/page.tsx (Direct navigation /photos/:id)
export default function PhotoPage({ params }: { params: { id: string } }) {
  return (
    <div className="photo-detail">
      <img src={`/photos/${params.id}.jpg`} alt={`Photo ${params.id}`} />
      <p>Photo {params.id} Detail Page</p>
    </div>
  );
}
```

**Intercepting Patterns**:
- `(.)` - Same level
- `(..)` - One level up
- `(..)(..)` - Two levels up
- `(...)` - Root

**Why This Pattern**:
- ✅ Modal UX on client navigation
- ✅ Full page on direct navigation
- ✅ Better user experience

---

### Pattern 14: search-params
**Category**: URL State
**Description**: Reading and updating URL search params

```typescript
// app/users/page.tsx (Server Component - read searchParams)
interface UsersPageProps {
  searchParams: {
    role?: string;
    search?: string;
    page?: string;
  };
}

async function fetchUsers(filters: UsersPageProps['searchParams']) {
  const params = new URLSearchParams();
  if (filters.role) params.append('role', filters.role);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page);

  const response = await fetch(
    `http://localhost:5000/api/users?${params.toString()}`
  );
  return response.json();
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const users = await fetchUsers(searchParams);

  return (
    <div>
      <h1>Users</h1>
      <p>
        Filters: Role={searchParams.role || 'All'}, Search=
        {searchParams.search || 'None'}
      </p>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

```typescript
// components/UserFilters.tsx (Client Component - update searchParams)
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function UserFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleRoleChange = (role: string) => {
    const params = new URLSearchParams(searchParams);
    if (role === 'all') {
      params.delete('role');
    } else {
      params.set('role', role);
    }
    router.push(`/users?${params.toString()}`);
  };

  const handleSearchChange = (search: string) => {
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    router.push(`/users?${params.toString()}`);
  };

  return (
    <div className="filters">
      <select
        value={searchParams.get('role') || 'all'}
        onChange={(e) => handleRoleChange(e.target.value)}
      >
        <option value="all">All Roles</option>
        <option value="Admin">Admin</option>
        <option value="User">User</option>
      </select>
      <input
        type="search"
        placeholder="Search users..."
        defaultValue={searchParams.get('search') || ''}
        onChange={(e) => handleSearchChange(e.target.value)}
      />
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Shareable filtered URLs
- ✅ Browser back/forward works
- ✅ SEO-friendly filter state

---

### Pattern 15: route-metadata
**Category**: SEO & Metadata
**Description**: Static and dynamic metadata for SEO

```typescript
// app/users/[id]/page.tsx (Dynamic metadata)
import { Metadata } from 'next';

interface UserDetailPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: UserDetailPageProps): Promise<Metadata> {
  const user = await fetch(
    `http://localhost:5000/api/users/${params.id}`
  ).then((res) => res.json());

  return {
    title: `${user.name} - StarX4CRM`,
    description: `Profile page for ${user.name}`,
    openGraph: {
      title: user.name,
      description: user.email,
      images: [user.avatar],
    },
  };
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const user = await fetch(
    `http://localhost:5000/api/users/${params.id}`
  ).then((res) => res.json());

  return (
    <div>
      <h1>{user.name}</h1>
    </div>
  );
}
```

```typescript
// app/users/page.tsx (Static metadata)
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users - StarX4CRM',
  description: 'Manage users in StarX4CRM platform',
  keywords: ['users', 'management', 'CRM'],
};

export default function UsersPage() {
  return <div>Users Page</div>;
}
```

**Why This Pattern**:
- ✅ Better SEO
- ✅ Dynamic Open Graph tags
- ✅ Per-page metadata

---

### Pattern 16: redirect-permanent-temporary
**Category**: Redirects
**Description**: Permanent and temporary redirects

```typescript
// app/old-users/page.tsx (Permanent redirect)
import { redirect } from 'next/navigation';

export default function OldUsersPage() {
  redirect('/users'); // 308 permanent redirect
}
```

```typescript
// app/dashboard/page.tsx (Conditional redirect)
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login'); // 307 temporary redirect
  }

  if (session.user.role === 'ADMIN') {
    redirect('/admin/dashboard');
  }

  return <div>User Dashboard</div>;
}
```

```typescript
// next.config.js (Redirects configuration)
module.exports = {
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true, // 308 permanent
      },
      {
        source: '/api/v1/:path*',
        destination: '/api/v2/:path*',
        permanent: false, // 307 temporary
      },
    ];
  },
};
```

**Why This Pattern**:
- ✅ SEO-friendly redirects
- ✅ Migration from old URLs
- ✅ Conditional access control

---

### Pattern 17: catch-all-routes
**Category**: Advanced Routing
**Description**: Catch-all and optional catch-all routes

```typescript
// app/docs/[...slug]/page.tsx (Catch-all route)
// Matches: /docs/a, /docs/a/b, /docs/a/b/c
interface DocsPageProps {
  params: {
    slug: string[];
  };
}

export default function DocsPage({ params }: DocsPageProps) {
  const path = params.slug.join('/');

  return (
    <div>
      <h1>Documentation</h1>
      <p>Path: /{path}</p>
    </div>
  );
}

export async function generateStaticParams() {
  return [
    { slug: ['getting-started'] },
    { slug: ['api', 'users'] },
    { slug: ['api', 'users', 'create'] },
  ];
}
```

```typescript
// app/shop/[[...slug]]/page.tsx (Optional catch-all route)
// Matches: /shop, /shop/electronics, /shop/electronics/laptops
interface ShopPageProps {
  params: {
    slug?: string[];
  };
}

export default function ShopPage({ params }: ShopPageProps) {
  const category = params.slug ? params.slug.join('/') : 'all';

  return (
    <div>
      <h1>Shop</h1>
      <p>Category: {category}</p>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Flexible nested routes
- ✅ Documentation sites
- ✅ Category hierarchies

---

### Pattern 18: route-prefetching
**Category**: Performance
**Description**: Manual and automatic route prefetching

```typescript
// components/UserList.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface User {
  id: string;
  name: string;
}

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  const router = useRouter();

  useEffect(() => {
    // Prefetch first 5 user detail pages
    users.slice(0, 5).forEach((user) => {
      router.prefetch(`/users/${user.id}`);
    });
  }, [users, router]);

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {/* prefetch={true} - Prefetch on hover (default) */}
          <Link href={`/users/${user.id}`} prefetch={true}>
            {user.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

**Prefetch Behavior**:
- `prefetch={true}` - Prefetch on hover (production only)
- `prefetch={false}` - No prefetch
- `router.prefetch()` - Manual prefetch

**Why This Pattern**:
- ✅ Faster navigation
- ✅ Better perceived performance
- ✅ Preload critical routes

---

### Pattern 19: streaming-suspense
**Category**: Performance
**Description**: Streaming with Suspense for progressive rendering

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { UserStats } from '@/components/UserStats';
import { RecentOrders } from '@/components/RecentOrders';
import { ActivityFeed } from '@/components/ActivityFeed';

export default function DashboardPage() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* Fast component renders immediately */}
      <Suspense fallback={<div>Loading user stats...</div>}>
        <UserStats />
      </Suspense>

      {/* Slow component doesn't block fast components */}
      <Suspense fallback={<div>Loading recent orders...</div>}>
        <RecentOrders />
      </Suspense>

      {/* Another slow component */}
      <Suspense fallback={<div>Loading activity feed...</div>}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}
```

```typescript
// components/RecentOrders.tsx (Slow async component)
async function fetchRecentOrders() {
  const response = await fetch('http://localhost:5000/api/orders/recent', {
    next: { revalidate: 60 },
  });
  // Simulate slow API
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return response.json();
}

export async function RecentOrders() {
  const orders = await fetchRecentOrders();

  return (
    <div className="recent-orders">
      <h2>Recent Orders</h2>
      <ul>
        {orders.map((order: any) => (
          <li key={order.id}>{order.id}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Progressive rendering
- ✅ Slow components don't block fast ones
- ✅ Better perceived performance

---

### Pattern 20: revalidation-caching
**Category**: Performance
**Description**: Data revalidation and caching strategies

```typescript
// app/users/page.tsx (Time-based revalidation)
async function fetchUsers() {
  const response = await fetch('http://localhost:5000/api/users', {
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });
  return response.json();
}

export default async function UsersPage() {
  const users = await fetchUsers();

  return (
    <div>
      <h1>Users (Cached for 60 seconds)</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

```typescript
// app/api/users/route.ts (On-demand revalidation)
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Create user in C# backend
  const response = await fetch('http://localhost:5000/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const user = await response.json();

  // Revalidate /users page
  revalidatePath('/users');

  // Or revalidate by tag
  // revalidateTag('users');

  return NextResponse.json(user, { status: 201 });
}
```

```typescript
// app/users/page.tsx (Tag-based revalidation)
async function fetchUsers() {
  const response = await fetch('http://localhost:5000/api/users', {
    next: { tags: ['users'] }, // Tag for revalidation
  });
  return response.json();
}
```

**Caching Strategies**:
- `{ cache: 'force-cache' }` - Cache forever (default)
- `{ cache: 'no-store' }` - Never cache
- `{ next: { revalidate: 60 } }` - Time-based revalidation
- `{ next: { tags: ['users'] } }` - Tag-based revalidation

**Why This Pattern**:
- ✅ Reduce backend load
- ✅ Faster page loads
- ✅ On-demand cache invalidation

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Client Component Async Functions
```typescript
// ❌ DON'T - Client Components cannot be async
'use client';

export default async function UsersPage() {
  const users = await fetchUsers(); // ERROR!
  return <div>{users}</div>;
}

// ✅ DO - Use Server Component or React Query
export default async function UsersPage() {
  const users = await fetchUsers(); // OK in Server Component
  return <div>{users}</div>;
}

// ✅ OR - Use React Query in Client Component
'use client';
import { useQuery } from '@tanstack/react-query';

export default function UsersPage() {
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
  return <div>{users}</div>;
}
```

### ❌ NO Waterfall Fetching
```typescript
// ❌ DON'T - Sequential fetching (slow)
const users = await fetchUsers();
const orders = await fetchOrders(); // Waits for users!

// ✅ DO - Parallel fetching
const [users, orders] = await Promise.all([fetchUsers(), fetchOrders()]);
```

### ❌ NO useEffect for Initial Data in Server Components
```typescript
// ❌ DON'T - useEffect in Server Component
export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers().then(setUsers); // Use Server Component instead!
  }, []);

  return <div>{users}</div>;
}

// ✅ DO - Server Component with async/await
export default async function UsersPage() {
  const users = await fetchUsers();
  return <div>{users}</div>;
}
```

### ❌ NO Hardcoded URLs
```typescript
// ❌ DON'T - Hardcoded URLs
<Link href="/users/123">User Detail</Link>

// ✅ DO - Dynamic URLs
<Link href={`/users/${user.id}`}>User Detail</Link>
```

### ❌ NO Missing Middleware Matcher
```typescript
// ❌ DON'T - Middleware without matcher (runs on ALL routes)
export function middleware(request: NextRequest) {
  // Runs on every request including static files!
}

// ✅ DO - Specify matcher
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

---

## ✅ BEST PRACTICES

### 1. Use Server Components by Default
- Fetch data in Server Components
- Only use Client Components for interactivity
- Keep `'use client'` boundary low

### 2. Parallel Data Fetching
- Use `Promise.all()` for parallel requests
- Avoid waterfall fetching
- Fetch at the highest level possible

### 3. Loading & Error States
- Always provide `loading.tsx` for async routes
- Use `error.tsx` for error boundaries
- Use `not-found.tsx` for 404 pages

### 4. Protected Routes
- Use middleware for authentication
- Implement role-based access control
- Redirect unauthenticated users

### 5. Metadata & SEO
- Add metadata to all pages
- Use dynamic metadata for dynamic routes
- Include Open Graph tags

### 6. Caching Strategy
- Use time-based revalidation for semi-static data
- Use on-demand revalidation after mutations
- Tag routes for targeted invalidation

### 7. Type Safety
- Define props interfaces
- Type route params
- Type search params

### 8. Navigation Performance
- Enable prefetching on critical links
- Use `router.prefetch()` for predictable navigation
- Lazy load heavy components

---

## 🔗 INTEGRATION WITH C# BACKEND

### API Route Proxy Pattern
```typescript
// app/api/[...proxy]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = params.proxy.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Backend request failed' },
      { status: 500 }
    );
  }
}
```

### Environment Variables
```bash
# .env.local
BACKEND_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

---

## 📚 QUICK REFERENCE

### Route File Conventions
- `layout.tsx` - Shared UI for route segment
- `page.tsx` - Route endpoint
- `loading.tsx` - Loading UI
- `error.tsx` - Error boundary
- `not-found.tsx` - 404 page
- `route.ts` - API route handler

### Special Files
- `middleware.ts` - Route middleware (root level)
- `next.config.js` - Next.js configuration
- `.env.local` - Environment variables (never commit)

### Navigation Hooks (Client Components Only)
- `useRouter()` - Programmatic navigation
- `useSearchParams()` - Read search params
- `useParams()` - Read dynamic params
- `usePathname()` - Read current pathname

### Server Functions
- `redirect()` - Server-side redirect
- `notFound()` - Trigger 404
- `revalidatePath()` - Revalidate route
- `revalidateTag()` - Revalidate by tag

---

**Integration**: Works with React Component Specialist, React Hooks Specialist, React Query Specialist
**Backend**: C# ASP.NET Core REST API
**Authentication**: NextAuth.js with JWT
**Version**: Next.js 15.3.0 App Router
