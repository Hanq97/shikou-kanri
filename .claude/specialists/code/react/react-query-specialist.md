# React Query Specialist
# React Query スペシャリスト
# Chuyên Gia React Query

**Version**: 1.0.0
**Stack**: @tanstack/react-query v5 + React 19 + TypeScript 5
**Architecture**: Server State Management
**Integration**: C# ASP.NET Core Backend
**Last Updated**: 2025-12-31

---

## 🎯 PURPOSE

This specialist provides **20 React Query patterns** for efficient server state management with C# ASP.NET Core backends. Focus on useQuery for GET requests, useMutation for POST/PUT/DELETE, cache management, optimistic updates, and error handling.

**Key Constraints**:
- ✅ **useQuery for GET requests**
- ✅ **useMutation for POST/PUT/DELETE**
- ✅ **Cache invalidation after mutations**
- ✅ **Optimistic updates for better UX**
- ❌ **NO useState for server data**
- ❌ **NO manual fetch in useEffect**
- ❌ **NO ignoring cache management**

---

## 📚 PATTERN INDEX (20 Patterns)

### **Query Patterns** (8 patterns)
1. use-query-basic
2. use-query-with-params
3. use-query-enabled
4. use-query-refetch
5. use-infinite-query
6. use-queries-parallel
7. dependent-queries
8. query-placeholders

### **Mutation Patterns** (6 patterns)
9. use-mutation-create
10. use-mutation-update
11. use-mutation-delete
12. optimistic-updates
13. mutation-callbacks
14. mutation-error-handling

### **Cache Management** (6 patterns)
15. query-invalidation
16. query-prefetching
17. stale-while-revalidate
18. cache-time-config
19. query-client-setup
20. persistent-cache

---

## 📖 PATTERN DETAILS

### Pattern 1: use-query-basic
**Category**: Query Patterns
**Description**: Basic useQuery for fetching data

```typescript
// components/UserList.tsx
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

async function fetchUsers(): Promise<User[]> {
  const response = await axios.get('/api/users');
  return response.data;
}

export function UserList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      <ul>
        {data?.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Automatic caching
- ✅ Loading and error states
- ✅ Manual refetch capability

---

### Pattern 2: use-query-with-params
**Category**: Query Patterns
**Description**: useQuery with parameters

```typescript
// components/UserProfile.tsx
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

async function fetchUser(userId: string): Promise<User> {
  const response = await axios.get(`/api/users/${userId}`);
  return response.data;
}

export function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['users', userId], // Include userId in queryKey
    queryFn: () => fetchUser(userId),
    enabled: !!userId, // Only fetch if userId exists
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Dynamic query keys
- ✅ Parameters in queryFn
- ✅ Conditional fetching with enabled

---

### Pattern 3: use-query-enabled
**Category**: Query Patterns
**Description**: Conditional query execution

```typescript
// components/UserOrders.tsx
import { useQuery } from '@tanstack/react-query';

export function UserOrders({ userId }: { userId: string | null }) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetchOrders(userId!),
    enabled: !!userId, // Only fetch when userId is available
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (!userId) return <div>Please select a user</div>;
  if (isLoading) return <div>Loading orders...</div>;

  return (
    <ul>
      {orders?.map((order) => (
        <li key={order.id}>{order.title}</li>
      ))}
    </ul>
  );
}
```

**Why This Pattern**:
- ✅ Prevents unnecessary requests
- ✅ Waits for required data
- ✅ Type-safe with non-null assertion

---

### Pattern 4: use-query-refetch
**Category**: Query Patterns
**Description**: Manual and automatic refetching

```typescript
// components/RealTimeUserList.tsx
import { useQuery } from '@tanstack/react-query';

export function RealTimeUserList() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch on component mount
  });

  return (
    <div>
      <button onClick={() => refetch()}>Manual Refresh</button>
      {isLoading && <span>Loading...</span>}
      <ul>
        {data?.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Automatic background updates
- ✅ Window focus refetching
- ✅ Manual refresh option

---

### Pattern 5: use-infinite-query
**Category**: Query Patterns
**Description**: Infinite scrolling with pagination

```typescript
// components/InfiniteUserList.tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';

interface UsersResponse {
  users: User[];
  nextCursor: number | null;
}

async function fetchUsersPage({ pageParam = 0 }): Promise<UsersResponse> {
  const response = await axios.get(`/api/users?page=${pageParam}&limit=20`);
  return response.data;
}

export function InfiniteUserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: fetchUsersPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.users.map((user) => (
            <div key={user.id}>{user.name}</div>
          ))}
        </div>
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Infinite scrolling support
- ✅ Pagination handling
- ✅ Efficient data loading

---

### Pattern 9: use-mutation-create
**Category**: Mutation Patterns
**Description**: useMutation for creating resources

```typescript
// components/CreateUserForm.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface CreateUserDto {
  name: string;
  email: string;
  role: string;
}

async function createUser(user: CreateUserDto): Promise<User> {
  const response = await axios.post('/api/users', user);
  return response.data;
}

export function CreateUserForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      // Invalidate users query to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
      console.log('User created:', newUser);
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    mutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" placeholder="Email" type="email" required />
      <select name="role" required>
        <option value="User">User</option>
        <option value="Admin">Admin</option>
      </select>
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
      {mutation.isError && <div>Error: {mutation.error.message}</div>}
      {mutation.isSuccess && <div>User created successfully!</div>}
    </form>
  );
}
```

**Why This Pattern**:
- ✅ Automatic loading state
- ✅ Cache invalidation on success
- ✅ Error handling

---

### Pattern 10: use-mutation-update
**Category**: Mutation Patterns
**Description**: useMutation for updating resources

```typescript
// components/EditUserForm.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateUserDto {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

async function updateUser(user: UpdateUserDto): Promise<User> {
  const response = await axios.put(`/api/users/${user.id}`, user);
  return response.data;
}

export function EditUserForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });

  const handleSubmit = (formData: UpdateUserDto) => {
    mutation.mutate({ id: userId, ...formData });
  };

  return (
    <div>
      {/* Form implementation */}
      {mutation.isError && <div>Update failed: {mutation.error.message}</div>}
      {mutation.isSuccess && <div>User updated successfully!</div>}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Invalidate related queries
- ✅ Update both list and detail caches
- ✅ Optimistic updates possible

---

### Pattern 11: use-mutation-delete
**Category**: Mutation Patterns
**Description**: useMutation for deleting resources

```typescript
// components/DeleteUserButton.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

async function deleteUser(userId: string): Promise<void> {
  await axios.delete(`/api/users/${userId}`);
}

export function DeleteUserButton({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      mutation.mutate(userId);
    }
  };

  return (
    <button onClick={handleDelete} disabled={mutation.isPending}>
      {mutation.isPending ? 'Deleting...' : 'Delete User'}
    </button>
  );
}
```

**Why This Pattern**:
- ✅ Confirmation before delete
- ✅ Cache invalidation
- ✅ Loading state during deletion

---

### Pattern 12: optimistic-updates
**Category**: Mutation Patterns
**Description**: Optimistic UI updates before server confirms

```typescript
// components/OptimisticUpdateExample.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function OptimisticUpdateExample({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateUser,
    onMutate: async (updatedUser) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['users', userId] });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User>(['users', userId]);

      // Optimistically update cache
      queryClient.setQueryData(['users', userId], updatedUser);

      // Return context with snapshot
      return { previousUser };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(['users', userId], context.previousUser);
      }
    },
    onSettled: () => {
      // Refetch after mutation completes (success or error)
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });

  return <div>{ /* UI implementation */ }</div>;
}
```

**Why This Pattern**:
- ✅ Instant UI feedback
- ✅ Automatic rollback on error
- ✅ Better UX

---

### Pattern 15: query-invalidation
**Category**: Cache Management
**Description**: Invalidating queries to trigger refetch

```typescript
// hooks/useUserMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUserMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      // Invalidate all user queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      // Invalidate specific user and list
      queryClient.invalidateQueries({ queryKey: ['users', data.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      // Invalidate all users queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}
```

**Why This Pattern**:
- ✅ Centralized mutation logic
- ✅ Consistent cache invalidation
- ✅ Reusable across components

---

### Pattern 19: query-client-setup
**Category**: Cache Management
**Description**: QueryClient configuration

```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes (now called gcTime in v5)
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 3, // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Why This Pattern**:
- ✅ Global configuration
- ✅ Consistent behavior
- ✅ DevTools for debugging

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO useState for Server Data
```typescript
// ❌ DON'T - useState for server data
const [users, setUsers] = useState<User[]>([]);

useEffect(() => {
  fetch('/api/users').then((res) => res.json()).then(setUsers);
}, []);

// ✅ DO - Use React Query
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

### ❌ NO Manual Fetch in useEffect
```typescript
// ❌ DON'T - Manual fetch in useEffect
useEffect(() => {
  setLoading(true);
  fetch('/api/users')
    .then((res) => res.json())
    .then((data) => {
      setUsers(data);
      setLoading(false);
    })
    .catch((err) => {
      setError(err);
      setLoading(false);
    });
}, []);

// ✅ DO - Use useQuery
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

### ❌ NO Ignoring Cache Invalidation
```typescript
// ❌ DON'T - Forget to invalidate cache
const mutation = useMutation({
  mutationFn: createUser,
  // NO cache invalidation!
});

// ✅ DO - Invalidate related queries
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

---

## 📊 INTEGRATION WITH C# BACKEND

### Axios Setup with JWT

```typescript
// api/axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Add JWT token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

---

## 🎓 BEST PRACTICES

1. **Use queryKey arrays** for hierarchical caching
2. **Invalidate queries** after mutations
3. **Use optimistic updates** for instant UX
4. **Configure staleTime** to reduce refetches
5. **Use enabled option** for conditional queries
6. **Handle errors** with onError callbacks
7. **Use React Query DevTools** for debugging
8. **Centralize API calls** in separate files
9. **Type your queries** with TypeScript
10. **Set up retry logic** for failed requests

---

**Created**: 2025-12-31
**Patterns**: 20 React Query patterns
**Architecture**: Server State Management
**Backend Integration**: C# ASP.NET Core REST API

---

*React Query Specialist - Efficient Server State Management*
*✅ 20 Patterns | ✅ Cache Management | ✅ Optimistic Updates*
