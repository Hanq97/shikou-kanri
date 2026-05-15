# React Component Specialist
# React コンポーネント スペシャリスト
# Chuyên Gia React Component

**Version**: 1.0.0
**Stack**: React 19 + TypeScript 5
**Architecture**: Functional Components Only
**Integration**: C# ASP.NET Core Backend
**Last Updated**: 2025-12-31

---

## 🎯 PURPOSE

This specialist provides **30 React component patterns** for building functional components that integrate with C# ASP.NET Core backends. Focus on functional components, TypeScript, props handling, composition, and performance optimization.

**Key Constraints**:
- ✅ **Functional components ONLY** (NO class components)
- ✅ **TypeScript for type safety**
- ✅ **Props validation with interfaces**
- ✅ **Component composition patterns**
- ❌ **NO class components**
- ❌ **NO prop drilling** (use Context API)
- ❌ **NO default exports** (use named exports)

---

## 📚 PATTERN INDEX (30 Patterns)

### **Component Fundamentals** (10 patterns)
1. functional-component
2. props-interface
3. children-prop
4. default-props
5. component-composition
6. conditional-rendering
7. list-rendering
8. fragment-wrapper
9. error-boundary-wrapper
10. forward-ref-pattern

### **Performance Optimization** (10 patterns)
11. react-memo
12. use-callback-optimization
13. use-memo-computation
14. lazy-loading
15. code-splitting
16. virtual-scrolling
17. debounce-input
18. throttle-scroll
19. key-prop-optimization
20. component-splitting

### **TypeScript Integration** (10 patterns)
21. props-typing
22. children-typing
23. event-handler-typing
24. ref-typing
25. generic-components
26. discriminated-unions
27. render-props-typing
28. component-export-typing
29. props-with-defaults
30. optional-props-pattern

---

## 📖 PATTERN DETAILS

### Pattern 1: functional-component
**Category**: Component Fundamentals
**Description**: Basic functional component structure with TypeScript

```typescript
// components/UserCard.tsx
interface UserCardProps {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function UserCard({ id, name, email, role, isActive }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{name}</h3>
      <p>{email}</p>
      <span className={`role ${role.toLowerCase()}`}>{role}</span>
      {isActive && <span className="status-active">Active</span>}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Clear, functional approach
- ✅ TypeScript interface for props
- ✅ Named export for better tree-shaking
- ✅ Destructured props for readability

---

### Pattern 2: props-interface
**Category**: Component Fundamentals
**Description**: Separate interface definition for reusable props

```typescript
// types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User' | 'Manager';
  createdAt: Date;
}

// components/UserList.tsx
import { User } from '../types/user';

interface UserListProps {
  users: User[];
  onUserClick: (userId: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function UserList({ users, onUserClick, loading = false, error = null }: UserListProps) {
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (users.length === 0) return <div>No users found</div>;

  return (
    <div className="user-list">
      {users.map((user) => (
        <div key={user.id} onClick={() => onUserClick(user.id)}>
          <p>{user.name}</p>
        </div>
      ))}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Reusable `User` interface across components
- ✅ Default values for optional props
- ✅ Loading and error state handling
- ✅ Type-safe event handlers

---

### Pattern 3: children-prop
**Category**: Component Fundamentals
**Description**: Components that accept children for composition

```typescript
// components/Card.tsx
import { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

// Usage
<Card title="User Details">
  <UserCard id="1" name="John Doe" email="john@example.com" role="Admin" isActive={true} />
</Card>
```

**Why This Pattern**:
- ✅ Flexible component composition
- ✅ `ReactNode` type for children
- ✅ Reusable wrapper components

---

### Pattern 4: default-props
**Category**: Component Fundamentals
**Description**: Default props using destructuring with defaults

```typescript
// components/Button.tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function Button({
  label,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

**Why This Pattern**:
- ✅ Default values in destructuring
- ✅ Type-safe variants and sizes
- ✅ Clear optional props with defaults

---

### Pattern 5: component-composition
**Category**: Component Fundamentals
**Description**: Compound components pattern for flexible composition

```typescript
// components/UserCard/index.tsx
import { ReactNode } from 'react';

interface UserCardProps {
  children: ReactNode;
}

export function UserCard({ children }: UserCardProps) {
  return <div className="user-card">{children}</div>;
}

interface UserCardHeaderProps {
  name: string;
  role: string;
}

UserCard.Header = function UserCardHeader({ name, role }: UserCardHeaderProps) {
  return (
    <div className="user-card-header">
      <h3>{name}</h3>
      <span className="role">{role}</span>
    </div>
  );
};

interface UserCardBodyProps {
  email: string;
  phone: string;
}

UserCard.Body = function UserCardBody({ email, phone }: UserCardBodyProps) {
  return (
    <div className="user-card-body">
      <p>{email}</p>
      <p>{phone}</p>
    </div>
  );
};

// Usage
<UserCard>
  <UserCard.Header name="John Doe" role="Admin" />
  <UserCard.Body email="john@example.com" phone="555-1234" />
</UserCard>
```

**Why This Pattern**:
- ✅ Flexible composition
- ✅ Self-documenting API
- ✅ Type-safe sub-components

---

### Pattern 6: conditional-rendering
**Category**: Component Fundamentals
**Description**: Conditional rendering patterns with TypeScript

```typescript
// components/UserStatus.tsx
interface UserStatusProps {
  isActive: boolean;
  isPending: boolean;
  isBanned: boolean;
}

export function UserStatus({ isActive, isPending, isBanned }: UserStatusProps) {
  // Early return pattern
  if (isBanned) {
    return <span className="status-banned">Banned</span>;
  }

  // Ternary operator
  if (isPending) {
    return <span className="status-pending">Pending Approval</span>;
  }

  // Logical AND
  return (
    <>
      {isActive && <span className="status-active">Active</span>}
      {!isActive && <span className="status-inactive">Inactive</span>}
    </>
  );
}
```

**Why This Pattern**:
- ✅ Clear conditional logic
- ✅ Early returns for edge cases
- ✅ Logical AND for simple conditions

---

### Pattern 7: list-rendering
**Category**: Component Fundamentals
**Description**: Rendering lists with proper key handling

```typescript
// components/UserTable.tsx
import { User } from '../types/user';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  return (
    <table className="user-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.role}</td>
            <td>
              <button onClick={() => onEdit(user)}>Edit</button>
              <button onClick={() => onDelete(user.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Why This Pattern**:
- ✅ Stable keys using `user.id`
- ✅ Type-safe event handlers
- ✅ Semantic HTML table structure

---

### Pattern 8: fragment-wrapper
**Category**: Component Fundamentals
**Description**: Using fragments to avoid extra DOM nodes

```typescript
// components/UserInfo.tsx
import { Fragment } from 'react';

interface UserInfoProps {
  name: string;
  email: string;
  showRole: boolean;
  role?: string;
}

export function UserInfo({ name, email, showRole, role }: UserInfoProps) {
  return (
    <>
      <h3>{name}</h3>
      <p>{email}</p>
      {showRole && role && (
        <Fragment>
          <hr />
          <span>Role: {role}</span>
        </Fragment>
      )}
    </>
  );
}
```

**Why This Pattern**:
- ✅ No extra DOM wrapper
- ✅ Clean JSX structure
- ✅ Short syntax `<>` or explicit `<Fragment>`

---

### Pattern 9: error-boundary-wrapper
**Category**: Component Fundamentals
**Description**: Error boundary wrapper for functional components

```typescript
// components/ErrorBoundary.tsx
import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}

// Usage in functional component
<ErrorBoundary fallback={<div>Error loading users</div>}>
  <UserList users={users} onUserClick={handleUserClick} />
</ErrorBoundary>
```

**Why This Pattern**:
- ✅ Graceful error handling
- ✅ Custom fallback UI
- ✅ Error logging

**Note**: Error boundaries must be class components (React limitation).

---

### Pattern 10: forward-ref-pattern
**Category**: Component Fundamentals
**Description**: Forwarding refs to child components

```typescript
// components/Input.tsx
import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="input-group">
        <label>{label}</label>
        <input ref={ref} {...props} />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Usage
import { useRef } from 'react';

const inputRef = useRef<HTMLInputElement>(null);

<Input ref={inputRef} label="Email" type="email" />
```

**Why This Pattern**:
- ✅ Ref forwarding for DOM access
- ✅ TypeScript typing for ref
- ✅ Display name for debugging

---

### Pattern 11: react-memo
**Category**: Performance Optimization
**Description**: Memoization to prevent unnecessary re-renders

```typescript
// components/UserCard.tsx
import { memo } from 'react';

interface UserCardProps {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const UserCard = memo(function UserCard({ id, name, email, role }: UserCardProps) {
  console.log(`Rendering UserCard for ${name}`);

  return (
    <div className="user-card">
      <h3>{name}</h3>
      <p>{email}</p>
      <span>{role}</span>
    </div>
  );
});

// Custom comparison function
export const UserCardOptimized = memo(
  function UserCardOptimized({ id, name, email, role }: UserCardProps) {
    return (
      <div className="user-card">
        <h3>{name}</h3>
        <p>{email}</p>
        <span>{role}</span>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if name or email changed
    return prevProps.name === nextProps.name && prevProps.email === nextProps.email;
  }
);
```

**Why This Pattern**:
- ✅ Prevents re-renders when props unchanged
- ✅ Custom comparison for fine-grained control
- ✅ Performance boost for expensive components

---

### Pattern 12: use-callback-optimization
**Category**: Performance Optimization
**Description**: Memoizing callbacks to prevent child re-renders

```typescript
// components/UserList.tsx
import { useCallback, memo } from 'react';

interface User {
  id: string;
  name: string;
}

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Without useCallback, this function is recreated every render
  // causing UserItem to re-render even with memo
  const handleUserClick = useCallback((userId: string) => {
    setSelectedId(userId);
    console.log(`User clicked: ${userId}`);
  }, []); // Empty deps - function never changes

  return (
    <div>
      {users.map((user) => (
        <UserItem key={user.id} user={user} onClick={handleUserClick} />
      ))}
    </div>
  );
}

interface UserItemProps {
  user: User;
  onClick: (userId: string) => void;
}

const UserItem = memo(function UserItem({ user, onClick }: UserItemProps) {
  console.log(`Rendering UserItem: ${user.name}`);

  return (
    <div onClick={() => onClick(user.id)}>
      {user.name}
    </div>
  );
});
```

**Why This Pattern**:
- ✅ Stable callback reference
- ✅ Prevents unnecessary child re-renders
- ✅ Works with `memo` for maximum performance

---

### Pattern 13: use-memo-computation
**Category**: Performance Optimization
**Description**: Memoizing expensive computations

```typescript
// components/UserStatistics.tsx
import { useMemo } from 'react';
import { User } from '../types/user';

interface UserStatisticsProps {
  users: User[];
}

export function UserStatistics({ users }: UserStatisticsProps) {
  // Expensive computation - only recalculate when users change
  const statistics = useMemo(() => {
    console.log('Calculating statistics...');

    return {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      admins: users.filter((u) => u.role === 'Admin').length,
      averageAge: users.reduce((sum, u) => sum + (u.age || 0), 0) / users.length,
    };
  }, [users]);

  return (
    <div className="statistics">
      <p>Total: {statistics.total}</p>
      <p>Active: {statistics.active}</p>
      <p>Admins: {statistics.admins}</p>
      <p>Average Age: {statistics.averageAge.toFixed(1)}</p>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Avoid recalculating on every render
- ✅ Only recompute when dependencies change
- ✅ Performance boost for expensive operations

---

### Pattern 14: lazy-loading
**Category**: Performance Optimization
**Description**: Code splitting with React.lazy

```typescript
// App.tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const UserDashboard = lazy(() => import('./components/UserDashboard'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

export function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        {showAdmin ? <AdminPanel /> : <UserDashboard />}
      </Suspense>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Smaller initial bundle size
- ✅ Load components on-demand
- ✅ Better performance for large apps

---

### Pattern 15: code-splitting
**Category**: Performance Optimization
**Description**: Route-based code splitting

```typescript
// App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const HomePage = lazy(() => import('./pages/HomePage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading page...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Why This Pattern**:
- ✅ Each route loads separately
- ✅ Faster initial page load
- ✅ Better UX for multi-page apps

---

### Pattern 16: virtual-scrolling
**Category**: Performance Optimization
**Description**: Virtual scrolling for large lists with react-window

```typescript
// components/VirtualUserList.tsx
import { FixedSizeList } from 'react-window';
import { User } from '../types/user';

interface VirtualUserListProps {
  users: User[];
  onUserClick: (user: User) => void;
}

export function VirtualUserList({ users, onUserClick }: VirtualUserListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const user = users[index];
    return (
      <div style={style} onClick={() => onUserClick(user)} className="user-row">
        <span>{user.name}</span>
        <span>{user.email}</span>
      </div>
    );
  };

  return (
    <FixedSizeList
      height={600}
      itemCount={users.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Why This Pattern**:
- ✅ Only renders visible items
- ✅ Handles 10,000+ items smoothly
- ✅ Constant performance regardless of list size

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Class Components
```typescript
// ❌ DON'T - Class component
class UserCard extends Component<UserCardProps> {
  render() {
    return <div>{this.props.name}</div>;
  }
}

// ✅ DO - Functional component
export function UserCard({ name }: UserCardProps) {
  return <div>{name}</div>;
}
```

### ❌ NO Default Exports
```typescript
// ❌ DON'T - Default export
export default function UserCard() { ... }

// ✅ DO - Named export
export function UserCard() { ... }
```

### ❌ NO Prop Drilling
```typescript
// ❌ DON'T - Prop drilling through 3+ levels
<Parent>
  <Child data={data}>
    <GrandChild data={data}>
      <GreatGrandChild data={data} />
    </GrandChild>
  </Child>
</Parent>

// ✅ DO - Use Context API
const DataContext = createContext<Data | null>(null);

<DataContext.Provider value={data}>
  <Parent>
    <Child>
      <GrandChild>
        <GreatGrandChild />
      </GrandChild>
    </Child>
  </Parent>
</DataContext.Provider>
```

---

## 📊 INTEGRATION WITH C# BACKEND

### Pattern: Fetching Data from ASP.NET Core API

```typescript
// api/users.ts
import axios from 'axios';
import { User } from '../types/user';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export async function getUsers(): Promise<User[]> {
  const response = await axios.get(`${API_BASE_URL}/users`);
  return response.data;
}

export async function getUserById(id: string): Promise<User> {
  const response = await axios.get(`${API_BASE_URL}/users/${id}`);
  return response.data;
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  const response = await axios.post(`${API_BASE_URL}/users`, user);
  return response.data;
}

export async function updateUser(id: string, user: Partial<User>): Promise<User> {
  const response = await axios.put(`${API_BASE_URL}/users/${id}`, user);
  return response.data;
}

export async function deleteUser(id: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/users/${id}`);
}
```

---

## 🎓 BEST PRACTICES

1. **Always use TypeScript** for type safety
2. **Named exports** for better tree-shaking
3. **Functional components ONLY** (no class components)
4. **Props interfaces** for clear contracts
5. **React.memo** for expensive components
6. **useCallback/useMemo** for performance
7. **Error boundaries** for error handling
8. **Code splitting** for large apps
9. **Semantic HTML** for accessibility
10. **Consistent naming** (PascalCase for components)

---

**Created**: 2025-12-31
**Patterns**: 30 React component patterns
**Architecture**: Functional Components + TypeScript
**Backend Integration**: C# ASP.NET Core REST API

---

*React Component Specialist - Functional Components with TypeScript*
*✅ 30 Patterns | ✅ Performance Optimization | ✅ C# Backend Integration*
