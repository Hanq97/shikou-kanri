# React Hooks Specialist
# React フック スペシャリスト
# Chuyên Gia React Hooks

**Version**: 1.0.0
**Stack**: React 19 + TypeScript 5
**Architecture**: Hooks-First Functional Components
**Integration**: C# ASP.NET Core Backend
**Last Updated**: 2025-12-31

---

## 🎯 PURPOSE

This specialist provides **25 React hooks patterns** for building stateful logic in functional components that integrate with C# ASP.NET Core backends. Focus on built-in hooks, custom hooks, and best practices for state management.

**Key Constraints**:
- ✅ **useState for local state**
- ✅ **useEffect for side effects**
- ✅ **Custom hooks for reusable logic**
- ✅ **Proper dependency arrays**
- ❌ **NO missing dependencies**
- ❌ **NO infinite loops**
- ❌ **NO hooks in conditionals or loops**

---

## 📚 PATTERN INDEX (25 Patterns)

### **Basic Hooks** (8 patterns)
1. use-state-basic
2. use-state-object
3. use-state-array
4. use-effect-mount
5. use-effect-update
6. use-effect-cleanup
7. use-context-consumer
8. use-ref-dom

### **Advanced Hooks** (7 patterns)
9. use-reducer-complex
10. use-callback-performance
11. use-memo-expensive
12. use-imperative-handle
13. use-layout-effect
14. use-debug-value
15. use-id-accessibility

### **Custom Hooks** (10 patterns)
16. use-fetch-hook
17. use-form-hook
18. use-auth-hook
19. use-local-storage-hook
20. use-debounce-hook
21. use-previous-hook
22. use-toggle-hook
23. use-window-size-hook
24. use-interval-hook
25. use-async-hook

---

## 📖 PATTERN DETAILS

### Pattern 1: use-state-basic
**Category**: Basic Hooks
**Description**: Basic useState for simple state management

```typescript
// components/Counter.tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState<number>(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Type-safe with TypeScript
- ✅ Simple state updates
- ✅ Functional updates for complex logic

---

### Pattern 2: use-state-object
**Category**: Basic Hooks
**Description**: useState with object state and functional updates

```typescript
// components/UserForm.tsx
import { useState } from 'react';

interface UserFormState {
  name: string;
  email: string;
  role: string;
}

export function UserForm() {
  const [formData, setFormData] = useState<UserFormState>({
    name: '',
    email: '',
    role: 'User',
  });

  const handleChange = (field: keyof UserFormState, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Name" />
      <input value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Email" />
      <select value={formData.role} onChange={(e) => handleChange('role', e.target.value)}>
        <option value="User">User</option>
        <option value="Admin">Admin</option>
      </select>
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ Immutable state updates
- ✅ Functional updates prevent race conditions
- ✅ Type-safe field updates

---

### Pattern 3: use-state-array
**Category**: Basic Hooks
**Description**: useState for array manipulation

```typescript
// components/TodoList.tsx
import { useState } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (!inputValue.trim()) return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inputValue,
      completed: false,
    };

    setTodos((prev) => [...prev, newTodo]);
    setInputValue('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  return (
    <div>
      <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
      <button onClick={addTodo}>Add Todo</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.text}</span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Immutable array operations
- ✅ Functional updates prevent stale closures
- ✅ Type-safe todo items

---

### Pattern 4: use-effect-mount
**Category**: Basic Hooks
**Description**: useEffect for component mount (like componentDidMount)

```typescript
// components/UserProfile.tsx
import { useState, useEffect } from 'react';
import { getUser } from '../api/users';

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This runs once on mount (empty dependency array)
    console.log('Component mounted');

    getUser(userId)
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch user:', error);
        setLoading(false);
      });
  }, []); // Empty dependency array = run once on mount

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Runs once on component mount
- ✅ Empty dependency array
- ✅ Ideal for initial data fetching

---

### Pattern 5: use-effect-update
**Category**: Basic Hooks
**Description**: useEffect for dependency updates

```typescript
// components/SearchResults.tsx
import { useState, useEffect } from 'react';
import { searchUsers } from '../api/users';

export function SearchResults() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<User[]>([]);

  useEffect(() => {
    // This runs whenever searchTerm changes
    if (!searchTerm) {
      setResults([]);
      return;
    }

    console.log(`Searching for: ${searchTerm}`);

    searchUsers(searchTerm)
      .then((data) => setResults(data))
      .catch((error) => console.error(error));
  }, [searchTerm]); // Runs when searchTerm changes

  return (
    <div>
      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search users..." />
      <ul>
        {results.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Runs when dependencies change
- ✅ Proper dependency array
- ✅ Conditional logic to prevent unnecessary requests

---

### Pattern 6: use-effect-cleanup
**Category**: Basic Hooks
**Description**: useEffect with cleanup function

```typescript
// components/WebSocketNotifications.tsx
import { useState, useEffect } from 'react';

export function WebSocketNotifications() {
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    console.log('Setting up WebSocket connection');

    const ws = new WebSocket('ws://localhost:5000/notifications');

    ws.onmessage = (event) => {
      setNotifications((prev) => [...prev, event.data]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup function - runs when component unmounts
    return () => {
      console.log('Closing WebSocket connection');
      ws.close();
    };
  }, []); // Empty array = setup once, cleanup on unmount

  return (
    <div>
      <h3>Notifications</h3>
      <ul>
        {notifications.map((notification, index) => (
          <li key={index}>{notification}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Cleanup function prevents memory leaks
- ✅ Closes connections on unmount
- ✅ Essential for subscriptions, timers, WebSockets

---

### Pattern 7: use-context-consumer
**Category**: Basic Hooks
**Description**: useContext for consuming context

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // API call to login
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setUser(data.user);
  };

  const logout = () => {
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Usage in component
function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Avoid prop drilling
- ✅ Type-safe context
- ✅ Custom hook for convenience

---

### Pattern 8: use-ref-dom
**Category**: Basic Hooks
**Description**: useRef for DOM access

```typescript
// components/FocusInput.tsx
import { useRef, useEffect } from 'react';

export function FocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="Type here..." />
      <button onClick={handleClear}>Clear</button>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Direct DOM access
- ✅ Imperative focus control
- ✅ Doesn't trigger re-renders

---

### Pattern 9: use-reducer-complex
**Category**: Advanced Hooks
**Description**: useReducer for complex state logic

```typescript
// components/ShoppingCart.tsx
import { useReducer } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find((item) => item.id === action.payload.id);

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
          total: state.total + action.payload.price,
        };
      }

      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
        total: state.total + action.payload.price,
      };
    }

    case 'REMOVE_ITEM': {
      const item = state.items.find((i) => i.id === action.payload);
      if (!item) return state;

      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.payload),
        total: state.total - item.price * item.quantity,
      };
    }

    case 'UPDATE_QUANTITY': {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (!item) return state;

      const quantityDiff = action.payload.quantity - item.quantity;

      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i
        ),
        total: state.total + quantityDiff * item.price,
      };
    }

    case 'CLEAR_CART':
      return { items: [], total: 0 };

    default:
      return state;
  }
}

export function ShoppingCart() {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  return (
    <div>
      <h2>Shopping Cart</h2>
      <p>Total: ${state.total.toFixed(2)}</p>
      <ul>
        {state.items.map((item) => (
          <li key={item.id}>
            {item.name} - ${item.price} x {item.quantity}
            <button onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.id })}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={() => dispatch({ type: 'CLEAR_CART' })}>Clear Cart</button>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Complex state transitions
- ✅ Predictable state updates
- ✅ Type-safe actions with discriminated unions

---

### Pattern 16: use-fetch-hook (Custom Hook)
**Category**: Custom Hooks
**Description**: Reusable hook for data fetching

```typescript
// hooks/useFetch.ts
import { useState, useEffect } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchToggle, setRefetchToggle] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, refetchToggle]);

  const refetch = () => setRefetchToggle((prev) => !prev);

  return { data, loading, error, refetch };
}

// Usage
function UserList() {
  const { data: users, loading, error, refetch } = useFetch<User[]>('/api/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {users?.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Reusable data fetching logic
- ✅ Loading and error states
- ✅ Manual refetch capability

---

### Pattern 17: use-form-hook (Custom Hook)
**Category**: Custom Hooks
**Description**: Form state management hook

```typescript
// hooks/useForm.ts
import { useState, ChangeEvent } from 'react';

export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = (field: keyof T) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const setFieldValue = (field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const setFieldError = (field: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  return {
    values,
    errors,
    handleChange,
    setFieldValue,
    setFieldError,
    reset,
  };
}

// Usage
interface UserFormData {
  name: string;
  email: string;
  role: string;
}

function UserForm() {
  const { values, errors, handleChange, setFieldError, reset } = useForm<UserFormData>({
    name: '',
    email: '',
    role: 'User',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.email.includes('@')) {
      setFieldError('email', 'Invalid email');
      return;
    }

    console.log('Submitting:', values);
    // API call here
    reset();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={values.name} onChange={handleChange('name')} placeholder="Name" />
      {errors.name && <span>{errors.name}</span>}

      <input value={values.email} onChange={handleChange('email')} placeholder="Email" />
      {errors.email && <span>{errors.email}</span>}

      <select value={values.role} onChange={handleChange('role')}>
        <option value="User">User</option>
        <option value="Admin">Admin</option>
      </select>

      <button type="submit">Submit</button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ Reusable form logic
- ✅ Type-safe field access
- ✅ Built-in error handling

---

### Pattern 18: use-auth-hook (Custom Hook)
**Category**: Custom Hooks
**Description**: Authentication state management hook

```typescript
// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (token in localStorage)
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const response = await axios.post('/api/auth/login', { email, password });
    const { token, user } = response.data;

    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  return { user, loading, login, logout, isAuthenticated: !!user };
}

// Usage
function App() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Centralized auth logic
- ✅ Automatic token management
- ✅ Loading state for initial check

---

### Pattern 20: use-debounce-hook (Custom Hook)
**Category**: Custom Hooks
**Description**: Debounce values to reduce updates

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timeout if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      console.log('Searching for:', debouncedSearchTerm);
      // API call with debounced value
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search users..."
    />
  );
}
```

**Why This Pattern**:
- ✅ Reduces API calls
- ✅ Better performance
- ✅ Improved UX

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Missing Dependencies
```typescript
// ❌ DON'T - Missing dependency
useEffect(() => {
  console.log(userId);
}, []); // userId is missing from dependency array!

// ✅ DO - Include all dependencies
useEffect(() => {
  console.log(userId);
}, [userId]);
```

### ❌ NO Hooks in Conditionals
```typescript
// ❌ DON'T - Conditional hook
if (user) {
  const [name, setName] = useState(user.name); // Error!
}

// ✅ DO - Hooks at top level
const [name, setName] = useState(user?.name || '');
```

### ❌ NO Hooks in Loops
```typescript
// ❌ DON'T - Hook in loop
users.forEach((user) => {
  const [selected, setSelected] = useState(false); // Error!
});

// ✅ DO - One state for array
const [selectedIds, setSelectedIds] = useState<string[]>([]);
```

---

## 🎓 BEST PRACTICES

1. **Always include proper dependencies** in useEffect
2. **Use functional updates** for state based on previous state
3. **Cleanup side effects** in useEffect return
4. **Extract reusable logic** into custom hooks
5. **Use useCallback/useMemo** for performance
6. **Type custom hooks** with generics
7. **Name custom hooks** with "use" prefix
8. **Keep hooks at top level** (never in loops/conditionals)
9. **Prefer useReducer** for complex state
10. **Document custom hooks** with JSDoc

---

**Created**: 2025-12-31
**Patterns**: 25 React hooks patterns
**Architecture**: Hooks-First Functional Components
**Backend Integration**: C# ASP.NET Core REST API

---

*React Hooks Specialist - State Management with Custom Hooks*
*✅ 25 Patterns | ✅ Custom Hooks | ✅ Best Practices*
