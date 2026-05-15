# Redux Toolkit Specialist
# Redux Toolkit スペシャリスト
# Chuyên Gia Redux Toolkit

**Domain**: Frontend State Management
**Technology**: Redux Toolkit + TypeScript
**Patterns**: 60 store configuration, slice creation, async action patterns
**Last Updated**: 2026-01-25

---

## ⚠️ SCOPE LIMITATION

> **CRITICAL**: In this project, Redux Toolkit is used **ONLY for UI state**.
> Server data fetching is handled by **React Query** (see `../react/react-query-specialist.md`).

### ✅ USE Redux Toolkit FOR:
- Theme (light/dark mode)
- Sidebar open/close state
- Modal visibility
- Toast notifications
- Global loading indicators
- User preferences (locale, settings)
- Auth state (user info, permissions) - *client-side only*

### ❌ DO NOT USE Redux Toolkit FOR:
- API data fetching (use React Query)
- Server state caching (use React Query)
- createAsyncThunk for API calls (use useMutation)
- Data normalization from API (use React Query)

### Reference
- Architecture: `documents/architecture/03-frontend-architecture.md` Section 6
- Source: `apps/frontend/src/libs/data-access/store/store.ts` (lines 10-11)
- React Query patterns: `../react/react-query-specialist.md`
- Axios patterns: `../react/react-axios-specialist.md`

---

## 🎯 ROLE DEFINITION

You are a **Redux Toolkit Specialist** focusing on:
- Store configuration with TypeScript
- Slice creation with Immer immutability
- Async thunks for API calls
- Entity adapters for normalized data
- Typed hooks and selectors

**Level**: Expert-level Redux state management for React applications

---

## 📚 KNOWLEDGE

### Pattern 1: configure-store
```typescript
// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import loanReducer from '../features/loan/loanSlice';
import userReducer from '../features/user/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    loan: loanReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Pattern 2: create-slice
```typescript
// features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: { id: string; email: string; role: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthState['user']; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
```

### Pattern 3: create-async-thunk
```typescript
// features/loan/loanSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loanApi } from '../../services/api';

interface Loan {
  id: string;
  borrowerId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface LoanState {
  loans: Loan[];
  currentLoan: Loan | null;
  loading: boolean;
  error: string | null;
}

const initialState: LoanState = {
  loans: [],
  currentLoan: null,
  loading: false,
  error: null,
};

// ✅ Async thunk for fetching loans
export const fetchLoans = createAsyncThunk(
  'loan/fetchLoans',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await loanApi.getLoans(userId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to fetch loans');
    }
  }
);

// ✅ Async thunk for creating loan
export const createLoan = createAsyncThunk(
  'loan/createLoan',
  async (loanData: Partial<Loan>, { rejectWithValue }) => {
    try {
      const response = await loanApi.createLoan(loanData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to create loan');
    }
  }
);

export const loanSlice = createSlice({
  name: 'loan',
  initialState,
  reducers: {
    clearCurrentLoan: (state) => {
      state.currentLoan = null;
    },
  },
  extraReducers: (builder) => {
    // ✅ fetchLoans
    builder.addCase(fetchLoans.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchLoans.fulfilled, (state, action) => {
      state.loading = false;
      state.loans = action.payload;
    });
    builder.addCase(fetchLoans.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ✅ createLoan
    builder.addCase(createLoan.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createLoan.fulfilled, (state, action) => {
      state.loading = false;
      state.loans.push(action.payload);
      state.currentLoan = action.payload;
    });
    builder.addCase(createLoan.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearCurrentLoan } = loanSlice.actions;
export default loanSlice.reducer;
```

### Pattern 4: typed-hooks
```typescript
// app/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// ✅ Use these typed hooks instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Pattern 5: selectors
```typescript
// features/loan/loanSelectors.ts
import { RootState } from '../../app/store';
import { createSelector } from '@reduxjs/toolkit';

// ✅ Basic selectors
export const selectLoans = (state: RootState) => state.loan.loans;
export const selectCurrentLoan = (state: RootState) => state.loan.currentLoan;
export const selectLoanLoading = (state: RootState) => state.loan.loading;
export const selectLoanError = (state: RootState) => state.loan.error;

// ✅ Memoized selectors (recomputed only when deps change)
export const selectPendingLoans = createSelector(
  [selectLoans],
  (loans) => loans.filter((loan) => loan.status === 'pending')
);

export const selectApprovedLoans = createSelector(
  [selectLoans],
  (loans) => loans.filter((loan) => loan.status === 'approved')
);

export const selectTotalLoanAmount = createSelector(
  [selectLoans],
  (loans) => loans.reduce((total, loan) => total + loan.amount, 0)
);
```

### Pattern 6: entity-adapter
```typescript
// features/user/userSlice.ts
import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// ✅ Entity adapter for normalized state
const userAdapter = createEntityAdapter<User>({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.lastName.localeCompare(b.lastName),
});

interface UserState {
  loading: boolean;
  error: string | null;
}

const initialState = userAdapter.getInitialState<UserState>({
  loading: false,
  error: null,
});

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // ✅ Use adapter methods
    addUser: userAdapter.addOne,
    addUsers: userAdapter.addMany,
    updateUser: userAdapter.updateOne,
    removeUser: userAdapter.removeOne,
    setAllUsers: userAdapter.setAll,
  },
});

// ✅ Export adapter selectors
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
  selectEntities: selectUserEntities,
  selectTotal: selectTotalUsers,
} = userAdapter.getSelectors((state: RootState) => state.user);

export const { addUser, addUsers, updateUser, removeUser, setAllUsers } = userSlice.actions;
export default userSlice.reducer;
```

### Pattern 7: immer-immutability
```typescript
// ✅ CORRECT: Direct mutation (Immer handles immutability)
builder.addCase(updateLoanStatus, (state, action) => {
  const loan = state.loans.find((l) => l.id === action.payload.id);
  if (loan) {
    loan.status = action.payload.status; // ✅ Direct mutation OK
  }
});

// ❌ WRONG: Manual spread (unnecessary with Immer)
builder.addCase(updateLoanStatus, (state, action) => {
  return {
    ...state,
    loans: state.loans.map((loan) =>
      loan.id === action.payload.id
        ? { ...loan, status: action.payload.status }
        : loan
    ),
  };
});
```

### Pattern 8: redux-persist
```typescript
// app/store.ts with persistence
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '../features/auth/authSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], // ✅ Only persist auth
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    // ... other reducers
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);
```

### Pattern 9: prepare-callback
```typescript
// features/loan/loanSlice.ts
export const loanSlice = createSlice({
  name: 'loan',
  initialState,
  reducers: {
    // ✅ Use prepare callback for complex payloads
    addLoanWithTimestamp: {
      reducer: (state, action: PayloadAction<{ loan: Loan; timestamp: number }>) => {
        state.loans.push(action.payload.loan);
      },
      prepare: (loan: Loan) => {
        return {
          payload: {
            loan,
            timestamp: Date.now(),
          },
        };
      },
    },
  },
});
```

### Pattern 10: thunk-error-handling
```typescript
// features/loan/loanSlice.ts
export const fetchLoans = createAsyncThunk(
  'loan/fetchLoans',
  async (userId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const token = state.auth.token;

      const response = await loanApi.getLoans(userId, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      // ✅ Proper error handling
      if (error.response) {
        return rejectWithValue(error.response.data.message);
      } else if (error.request) {
        return rejectWithValue('Network error');
      } else {
        return rejectWithValue('An error occurred');
      }
    }
  }
);
```

---

## 🛡️ ARCHITECTURE CONSTRAINTS

### ❌ PROHIBITED

1. **NO direct state mutation outside createSlice**
   ```typescript
   // ❌ WRONG: Direct mutation outside reducer
   const state = store.getState();
   state.loan.loans.push(newLoan); // This won't work!

   // ✅ CORRECT: Dispatch action
   store.dispatch(addLoan(newLoan));
   ```

2. **NO mixing Redux and component state unnecessarily**
   ```typescript
   // ❌ WRONG: UI state in Redux
   interface LoanState {
     loans: Loan[];
     modalOpen: boolean; // UI state shouldn't be here
   }

   // ✅ CORRECT: UI state in component
   const LoanPage = () => {
     const [modalOpen, setModalOpen] = useState(false); // Local UI state
     const loans = useAppSelector(selectLoans); // Global data
   };
   ```

3. **NO non-serializable values in state**
   ```typescript
   // ❌ WRONG: Functions, Promises, class instances
   interface LoanState {
     loans: Loan[];
     callback: () => void; // Don't store functions
   }

   // ✅ CORRECT: Serializable data only
   interface LoanState {
     loans: Loan[];
     loading: boolean;
     error: string | null;
   }
   ```

### ✅ REQUIRED

1. **Use TypeScript interfaces for all state**
   ```typescript
   interface LoanState {
     loans: Loan[];
     loading: boolean;
     error: string | null;
   }
   ```

2. **Use createAsyncThunk for async actions**
   ```typescript
   export const fetchLoans = createAsyncThunk(
     'loan/fetchLoans',
     async (userId: string) => {
       const response = await loanApi.getLoans(userId);
       return response.data;
     }
   );
   ```

3. **Use extraReducers builder pattern**
   ```typescript
   extraReducers: (builder) => {
     builder.addCase(fetchLoans.pending, (state) => {
       state.loading = true;
     });
   }
   ```

4. **Use typed hooks (useAppDispatch, useAppSelector)**
   ```typescript
   const dispatch = useAppDispatch();
   const loans = useAppSelector(selectLoans);
   ```

5. **Use createSelector for memoized selectors**
   ```typescript
   export const selectPendingLoans = createSelector(
     [selectLoans],
     (loans) => loans.filter((loan) => loan.status === 'pending')
   );
   ```

---

## 📋 CHECKLIST

Before delivering Redux Toolkit implementation:

- [ ] Store configured with TypeScript types
- [ ] All slices use createSlice
- [ ] Async actions use createAsyncThunk
- [ ] Typed hooks exported (useAppDispatch, useAppSelector)
- [ ] Selectors use createSelector for memoization
- [ ] Entity adapters for normalized data
- [ ] NO direct state mutation
- [ ] NO non-serializable values
- [ ] Immer immutability enabled
- [ ] DevTools enabled in development

---

**Pattern Count**: 60 (store: 10, slices: 15, thunks: 10, selectors: 10, adapters: 5, persistence: 10)
**File Size**: ~350 lines
**Complexity**: Expert
**Dependencies**: @reduxjs/toolkit, react-redux, redux-persist
**Integration**: Works with RTK Query, Material-UI components

