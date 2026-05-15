# React State Management Specialist
# React 状態管理 スペシャリスト
# Chuyên Gia Quản Lý State React

**Version**: 1.0.0
**Stack**: React 19 + TypeScript 5
**Architecture**: Context API + useReducer
**Integration**: C# ASP.NET Core Backend
**Last Updated**: 2025-12-31

---

## 🎯 PURPOSE

This specialist provides **30 React state management patterns** using Context API and useReducer for integrating with C# ASP.NET Core backends. Focus on client-side state management WITHOUT Redux.

**Key Constraints**:
- ✅ **Context API for global state**
- ✅ **useReducer for complex state**
- ✅ **Custom hooks for state encapsulation**
- ✅ **State persistence with localStorage**
- ❌ **NO Redux** (use Context API)
- ❌ **NO Zustand** (use React built-in)
- ❌ **NO MobX** (use Context API + useReducer)

---

## 📚 PATTERN INDEX (30 Patterns)

### **Context API Patterns** (10 patterns)
1. context-provider
2. use-context-hook
3. multiple-contexts
4. context-composition
5. context-with-reducer
6. context-default-values
7. context-consumer-pattern
8. context-optimization
9. context-separation
10. context-with-typescript

### **useReducer Patterns** (10 patterns)
11. basic-reducer
12. action-creators
13. reducer-with-typescript
14. async-reducer
15. reducer-middleware
16. reducer-error-handling
17. reducer-state-normalization
18. reducer-immer-integration
19. reducer-logging
20. reducer-undo-redo

### **Custom Hooks** (5 patterns)
21. use-local-storage
22. use-auth-state
23. use-form-state
24. use-async-state
25. use-debounce-state

### **Performance Optimization** (5 patterns)
26. memoized-context-value
27. context-splitting
28. selector-pattern
29. lazy-context-initialization
30. context-state-normalization

---

## 📖 PATTERN DETAILS

### Pattern 1: context-provider
**Category**: Context API Patterns
**Description**: Basic Context API provider setup

```typescript
// contexts/AppContext.tsx
import { createContext, ReactNode, useState } from 'react';

interface AppState {
  theme: 'light' | 'dark';
  language: 'en' | 'ja' | 'vi';
  user: User | null;
}

interface AppContextType {
  state: AppState;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'ja' | 'vi') => void;
  setUser: (user: User | null) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>({
    theme: 'light',
    language: 'en',
    user: null,
  });

  const setTheme = (theme: 'light' | 'dark') => {
    setState((prev) => ({ ...prev, theme }));
  };

  const setLanguage = (language: 'en' | 'ja' | 'vi') => {
    setState((prev) => ({ ...prev, language }));
  };

  const setUser = (user: User | null) => {
    setState((prev) => ({ ...prev, user }));
  };

  return (
    <AppContext.Provider value={{ state, setTheme, setLanguage, setUser }}>
      {children}
    </AppContext.Provider>
  );
}
```

**Why This Pattern**:
- ✅ Global state without Redux
- ✅ TypeScript type safety
- ✅ Clean API for state updates

---

### Pattern 2: use-context-hook
**Category**: Context API Patterns
**Description**: Custom hook to consume context

```typescript
// hooks/useApp.ts
import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

export function useApp() {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
}

// Usage in component
function UserProfile() {
  const { state, setUser } = useApp();

  return (
    <div>
      <p>Theme: {state.theme}</p>
      <p>Language: {state.language}</p>
      {state.user && <p>User: {state.user.name}</p>}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Type-safe context consumption
- ✅ Error handling for missing provider
- ✅ Clean component code

---

### Pattern 3: multiple-contexts
**Category**: Context API Patterns
**Description**: Multiple context providers for separation of concerns

```typescript
// contexts/AuthContext.tsx
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    const user = await authService.login(credentials);
    setUser(user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// contexts/ThemeContext.tsx
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// App.tsx
<AuthProvider>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</AuthProvider>
```

**Why This Pattern**:
- ✅ Separation of concerns
- ✅ Independent state management
- ✅ Easier testing and maintenance

---

### Pattern 4: context-composition
**Category**: Context API Patterns
**Description**: Composing multiple providers

```typescript
// contexts/Providers.tsx
import { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { NotificationProvider } from './NotificationContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

// App.tsx
<Providers>
  <App />
</Providers>
```

**Why This Pattern**:
- ✅ Clean composition
- ✅ Single provider wrapper
- ✅ Easy to add/remove providers

---

### Pattern 5: context-with-reducer
**Category**: Context API Patterns
**Description**: Context with useReducer for complex state

```typescript
// contexts/CartContext.tsx
import { createContext, useReducer, ReactNode } from 'react';

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

const initialState: CartState = {
  items: [],
  total: 0,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload],
        total: state.total + action.payload.price,
      };
    case 'REMOVE_ITEM':
      const itemToRemove = state.items.find((item) => item.id === action.payload);
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
        total: state.total - (itemToRemove?.price || 0),
      };
    case 'CLEAR_CART':
      return initialState;
    default:
      return state;
  }
}

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}
```

**Why This Pattern**:
- ✅ Complex state logic centralized
- ✅ Type-safe actions
- ✅ Predictable state updates

---

### Pattern 11: basic-reducer
**Category**: useReducer Patterns
**Description**: Basic useReducer pattern

```typescript
// hooks/useCounter.ts
import { useReducer } from 'react';

interface CounterState {
  count: number;
}

type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET' }
  | { type: 'SET'; payload: number };

const initialState: CounterState = { count: 0 };

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    case 'RESET':
      return initialState;
    case 'SET':
      return { count: action.payload };
    default:
      return state;
  }
}

export function useCounter(initialCount = 0) {
  const [state, dispatch] = useReducer(counterReducer, { count: initialCount });

  const increment = () => dispatch({ type: 'INCREMENT' });
  const decrement = () => dispatch({ type: 'DECREMENT' });
  const reset = () => dispatch({ type: 'RESET' });
  const set = (count: number) => dispatch({ type: 'SET', payload: count });

  return {
    count: state.count,
    increment,
    decrement,
    reset,
    set,
  };
}
```

**Why This Pattern**:
- ✅ Clean action creators
- ✅ Type-safe dispatch
- ✅ Encapsulated logic

---

### Pattern 12: action-creators
**Category**: useReducer Patterns
**Description**: Action creators for type safety

```typescript
// actions/userActions.ts
import { User } from '../types/user';

export const UserActions = {
  setUser: (user: User) => ({ type: 'SET_USER' as const, payload: user }),
  clearUser: () => ({ type: 'CLEAR_USER' as const }),
  updateUser: (updates: Partial<User>) => ({ type: 'UPDATE_USER' as const, payload: updates }),
};

export type UserAction = ReturnType<typeof UserActions[keyof typeof UserActions]>;

// reducers/userReducer.ts
import { User } from '../types/user';
import { UserAction } from '../actions/userActions';

interface UserState {
  user: User | null;
}

const initialState: UserState = { user: null };

export function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.payload };
    case 'CLEAR_USER':
      return { user: null };
    case 'UPDATE_USER':
      return { user: state.user ? { ...state.user, ...action.payload } : null };
    default:
      return state;
  }
}

// Usage
dispatch(UserActions.setUser(user));
dispatch(UserActions.clearUser());
```

**Why This Pattern**:
- ✅ Type-safe action creators
- ✅ Centralized action definitions
- ✅ Auto-completion support

---

### Pattern 21: use-local-storage
**Category**: Custom Hooks
**Description**: State persistence with localStorage

```typescript
// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Usage
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Current: {theme}
    </button>
  );
}
```

**Why This Pattern**:
- ✅ State persists across sessions
- ✅ Type-safe with generics
- ✅ Error handling

---

### Pattern 22: use-auth-state
**Category**: Custom Hooks
**Description**: Authentication state management

```typescript
// hooks/useAuthState.ts
import { useState, useEffect } from 'react';
import { User } from '../types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuthState() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const user = await response.json();
          setAuthState({ user, isAuthenticated: true, isLoading: false });
        } else {
          setAuthState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch (error) {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const user = await response.json();
      setAuthState({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      throw error;
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  };

  return { ...authState, login, logout };
}
```

**Why This Pattern**:
- ✅ Encapsulated auth logic
- ✅ Loading states
- ✅ Error handling

---

### Pattern 26: memoized-context-value
**Category**: Performance Optimization
**Description**: Memoize context value to prevent re-renders

```typescript
// contexts/UserContext.tsx
import { createContext, ReactNode, useState, useMemo } from 'react';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({ user, setUser }), [user]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

**Why This Pattern**:
- ✅ Prevents unnecessary re-renders
- ✅ Performance optimization
- ✅ Stable reference

---

### Pattern 27: context-splitting
**Category**: Performance Optimization
**Description**: Split context to minimize re-renders

```typescript
// contexts/UserStateContext.tsx
const UserStateContext = createContext<User | null>(null);
const UserDispatchContext = createContext<((user: User | null) => void) | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  return (
    <UserStateContext.Provider value={user}>
      <UserDispatchContext.Provider value={setUser}>
        {children}
      </UserDispatchContext.Provider>
    </UserStateContext.Provider>
  );
}

// Components only re-render when they use the part that changes
export function useUserState() {
  const context = useContext(UserStateContext);
  if (context === undefined) throw new Error('useUserState must be used within UserProvider');
  return context;
}

export function useUserDispatch() {
  const context = useContext(UserDispatchContext);
  if (context === undefined) throw new Error('useUserDispatch must be used within UserProvider');
  return context;
}
```

**Why This Pattern**:
- ✅ Minimize re-renders
- ✅ Components subscribe to only what they need
- ✅ Performance optimization

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Redux
```typescript
// ❌ DON'T - Redux store
import { createStore } from 'redux';
const store = createStore(reducer);

// ✅ DO - Context API + useReducer
const [state, dispatch] = useReducer(reducer, initialState);
<AppContext.Provider value={{ state, dispatch }}>
```

### ❌ NO Zustand
```typescript
// ❌ DON'T - Zustand
import create from 'zustand';
const useStore = create((set) => ({ ... }));

// ✅ DO - Context API
const AppContext = createContext<AppContextType | undefined>(undefined);
```

### ❌ NO MobX
```typescript
// ❌ DON'T - MobX
import { observable } from 'mobx';

// ✅ DO - useReducer
const [state, dispatch] = useReducer(reducer, initialState);
```

---

## 📊 INTEGRATION WITH C# BACKEND

### Pattern: Auth State with C# ASP.NET Core

```typescript
// contexts/AuthContext.tsx
import { createContext, useReducer, ReactNode } from 'react';
import axios from 'axios';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = async () => {
    await axios.post('/api/auth/logout');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 🎓 BEST PRACTICES

1. **Context API for global state** (NO Redux)
2. **useReducer for complex state logic**
3. **Custom hooks for state encapsulation**
4. **Memoize context values** to prevent re-renders
5. **Split contexts** for performance optimization
6. **Type-safe actions** with TypeScript
7. **Error boundaries** for error handling
8. **localStorage for state persistence**
9. **Action creators** for type safety
10. **Separation of concerns** with multiple contexts

---

**Created**: 2025-12-31
**Patterns**: 30 React state management patterns
**Architecture**: Context API + useReducer (NO Redux)
**Backend Integration**: C# ASP.NET Core REST API

---

*React State Management Specialist - Context API + useReducer*
*✅ 30 Patterns | ✅ NO Redux | ✅ C# Backend Integration*
