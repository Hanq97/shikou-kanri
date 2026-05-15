# App Query & State Providers Specialist

**Role**: Query and state management configuration expert
**Focus**: TanStack Query v5, Zustand stores, server/client state synchronization
**Technology**: Next.js 15.3.0, React 19, TanStack Query v5, Zustand
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppQueryStateProviders {
  ROLE: "Query and state management configuration expert for Vietnamese legal platform"

  RESPONSIBILITIES: [
    "Configure TanStack Query v5 with optimized defaults",
    "Manage query keys with type safety",
    "Setup Zustand stores with persistence",
    "Synchronize server and client state",
    "Handle optimistic updates for legal documents"
  ]

  TECH_STACK: {
    primary: "TanStack Query v5 + Zustand",
    libraries: ["@tanstack/react-query", "zustand", "immer"],
    patterns: ["query-provider", "store-provider", "persistence"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["User", "LegalDocument", "Conversation", "Contract", "Compliance"]
  }
}
```

---

## Pattern 9.1: QueryProvider (TanStack Query v5)

### Overview

```pseudo
PATTERN QueryProvider {
  PURPOSE: "Global React Query configuration with optimized defaults for legal platform"

  PROBLEM: "Need centralized server state management with caching, retry, and refetch strategies"

  SOLUTION: "TanStack Query v5 provider with Vietnamese legal platform optimizations"

  USE_CASES: [
    "Fetch legal documents with automatic caching",
    "Retry failed API requests with exponential backoff",
    "Synchronize server state across components",
    "Optimistic updates for contract approvals"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW QueryProvider_Configuration {
  INPUT: {
    children: ReactNode,
    options?: QueryClientOptions
  }

  PRECONDITIONS: [
    "App is wrapped in client component boundary",
    "API endpoints are configured"
  ]

  STEPS: {
    STEP_1_CREATE_QUERY_CLIENT: {
      description: "Initialize QueryClient with optimized defaults"
      logic: |
        queryClient = NEW QueryClient({
          defaultOptions: {
            queries: {
              staleTime: 5 * 60 * 1000,      // 5 minutes fresh
              gcTime: 10 * 60 * 1000,         // 10 minutes cache
              retry: 3,                        // Retry 3 times
              retryDelay: EXPONENTIAL_BACKOFF,
              refetchOnWindowFocus: PRODUCTION_ONLY,
              refetchOnReconnect: true,
              refetchOnMount: "stale"
            },
            mutations: {
              retry: 1,
              onError: LOG_AND_NOTIFY
            }
          }
        })
    }

    STEP_2_WRAP_CHILDREN: {
      description: "Provide query client to component tree"
      logic: |
        RETURN (
          <QueryClientProvider client={queryClient}>
            {children}
            {SHOW_DEVTOOLS_IF_DEVELOPMENT}
          </QueryClientProvider>
        )
    }
  }

  ERROR_HANDLING: {
    QueryFailure: "Retry with exponential backoff (max 3 attempts)",
    MutationFailure: "Log error and show toast notification",
    NetworkError: "Refetch when network reconnects"
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Global query client context"
  }

  POSTCONDITIONS: [
    "All child components can use useQuery/useMutation",
    "DevTools available in development mode"
  ]
}
```

### Query Keys Configuration

```pseudo
WORKFLOW QueryKeys_TypeSafe {
  DESCRIPTION: "Pre-configured query keys for Vietnamese legal platform"

  QUERY_KEY_STRUCTURE: {
    auth: {
      user: () => ["auth", "user"],
      session: () => ["auth", "session"],
      profile: () => ["auth", "profile"]
    },

    users: {
      all: () => ["users"],
      lists: () => ["users", "list"],
      list: (filters) => ["users", "list", filters],
      detail: (id) => ["users", "detail", id],
      role: (role) => ["users", "role", role]
    },

    documents: {
      all: () => ["documents"],
      lists: () => ["documents", "list"],
      list: (filters) => ["documents", "list", filters],
      detail: (id) => ["documents", "detail", id],
      analysis: (id) => ["documents", "analysis", id]
    },

    conversations: {
      all: () => ["conversations"],
      lists: () => ["conversations", "list"],
      detail: (id) => ["conversations", "detail", id],
      messages: (conversationId) => ["conversations", conversationId, "messages"],
      legal: (conversationId) => ["conversations", conversationId, "legal"]
    },

    contracts: {
      all: () => ["contracts"],
      lists: () => ["contracts", "list"],
      list: (filters) => ["contracts", "list", filters],
      detail: (id) => ["contracts", "detail", id],
      templates: () => ["contracts", "templates"]
    },

    compliance: {
      all: () => ["compliance"],
      check: (documentId) => ["compliance", "check", documentId],
      history: (documentId) => ["compliance", "history", documentId]
    }
  }

  BENEFITS: [
    "Type-safe query keys",
    "Consistent cache invalidation",
    "Easy debugging with query devtools",
    "Prevents key collision"
  ]
}
```

### Key Interfaces

```typescript
// QueryProvider props
interface QueryProviderProps {
  children: ReactNode;
}

// Query client options (TanStack Query v5)
interface QueryClientOptions {
  defaultOptions?: {
    queries?: QueryOptions;
    mutations?: MutationOptions;
  };
}

// Legal document query hook
function useUserDetails(userId: string): UseQueryResult<User>;
function useLegalDocumentAnalysis(documentId: string): UseQueryResult<Analysis>;
function useConversationMessages(conversationId: string): UseQueryResult<Message[]>;

// Mutation hooks
function useUpdateUserProfile(): UseMutationResult<User, Error, UpdateUserRequest>;
function useAnalyzeLegalDocument(): UseMutationResult<Analysis, Error, AnalyzeRequest>;
```

### Integration Points

```pseudo
INTEGRATION QueryProvider_Integration {
  UI_COMPONENTS: {
    triggers: ["DocumentUploadButton", "AnalyzeButton", "RefreshDataButton"],
    displays: ["DocumentList", "AnalysisResult", "UserProfile"]
  }

  STATE_MANAGEMENT: {
    server_state: "TanStack Query (legal documents, user data, contracts)",
    client_state: "Zustand (UI state, filters, selections)",
    persistence: "Query cache (in-memory) + LocalStorage (Zustand)"
  }

  API_ENDPOINTS: {
    primary: "/api/v1/*",
    fallback: "/api/v1/cache/*"
  }

  DEPENDENCIES: {
    internal: ["@/shared/api", "@/shared/types"],
    external: ["@tanstack/react-query", "@tanstack/react-query-devtools"]
  }

  ERROR_HANDLING: {
    network_errors: "Retry with exponential backoff, show toast on final failure",
    validation_errors: "Display inline errors in forms",
    auth_errors: "Redirect to login page"
  }

  EVENTS: {
    emits: ["onQuerySuccess", "onQueryError", "onMutationSuccess"],
    listens: ["onAuthStateChanged", "onNetworkReconnect"]
  }
}
```

---

## Pattern 9.6: StoreProvider (Zustand)

### Overview

```pseudo
PATTERN StoreProvider {
  PURPOSE: "Global client state management with Zustand and persistence"

  PROBLEM: "Need local UI state management (sidebar, theme, filters) with localStorage sync"

  SOLUTION: "Zustand stores with immer, devtools, and persistence middleware"

  USE_CASES: [
    "Persist theme preference across sessions",
    "Manage sidebar open/closed state",
    "Track current conversation in legal chat",
    "Store selected document filters"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW AuthStore_Management {
  INPUT: {
    user: User | null,
    token: string | null
  }

  STEPS: {
    STEP_1_INITIALIZE_STORE: {
      description: "Create Zustand store with persistence"
      logic: |
        authStore = CREATE_STORE(
          WITH_DEVTOOLS(
            WITH_PERSIST(
              WITH_IMMER((set) => ({
                user: null,
                token: null,
                isAuthenticated: false,

                setUser: (user) => SET(state => {
                  state.user = user
                  state.isAuthenticated = !!user
                }),

                setToken: (token) => SET(state => {
                  state.token = token
                }),

                logout: () => SET(state => {
                  state.user = null
                  state.token = null
                  state.isAuthenticated = false
                })
              })),
              {
                name: "auth-storage",
                storage: localStorage,
                partialize: (state) => ({
                  token: state.token,
                  user: state.user
                })
              }
            ),
            { name: "AuthStore" }
          )
        )
    }

    STEP_2_HYDRATE_FROM_STORAGE: {
      description: "Load persisted state from localStorage"
      logic: |
        IF localStorage.HAS("auth-storage") THEN
          persistedState = localStorage.GET("auth-storage")
          authStore.setState(persistedState)
        END IF
    }
  }

  ERROR_HANDLING: {
    StorageQuotaExceeded: "Clear old data, retry with minimal state",
    InvalidJSON: "Reset to default state, log error"
  }

  OUTPUT: {
    type: "ZustandStore",
    provides: "Global auth state with persistence"
  }
}
```

### UI Store Configuration

```pseudo
WORKFLOW UIStore_Management {
  DESCRIPTION: "Manage UI state (sidebar, theme, language)"

  STATE_STRUCTURE: {
    sidebarOpen: boolean,
    theme: "light" | "dark" | "system",
    language: "vi" | "en"
  }

  ACTIONS: {
    setSidebarOpen: (open: boolean) => void,
    toggleSidebar: () => void,
    setTheme: (theme: Theme) => void,
    setLanguage: (language: Language) => void
  }

  PERSISTENCE: {
    storage: "localStorage",
    key: "ui-storage",
    partialize: ALL_STATE
  }

  DEFAULT_VALUES: {
    sidebarOpen: true,
    theme: "system",
    language: "vi"  // Default to Vietnamese for legal platform
  }
}
```

### Conversation Store Configuration

```pseudo
WORKFLOW ConversationStore_Management {
  DESCRIPTION: "Manage legal conversation state"

  STATE_STRUCTURE: {
    currentConversationId: string | null,
    conversations: Conversation[]
  }

  ACTIONS: {
    setCurrentConversation: (id: string | null) => {
      STEP_1: SET currentConversationId = id
      STEP_2: MARK conversation as "read" IF exists
    },

    addConversation: (conversation: Conversation) => {
      STEP_1: VALIDATE conversation has required fields
      STEP_2: APPEND to conversations array
      STEP_3: SORT by updatedAt DESC
    },

    updateConversation: (id: string, updates: Partial<Conversation>) => {
      STEP_1: FIND conversation by id
      STEP_2: IF found THEN MERGE updates
      STEP_3: UPDATE updatedAt timestamp
    },

    removeConversation: (id: string) => {
      STEP_1: FILTER out conversation with id
      STEP_2: IF currentConversationId == id THEN SET null
    }
  }

  PERSISTENCE: NO  // Conversations loaded from server
}
```

### Document Store Configuration

```pseudo
WORKFLOW DocumentStore_Management {
  DESCRIPTION: "Manage legal document selection and analysis results"

  STATE_STRUCTURE: {
    selectedDocumentId: string | null,
    documents: Document[],
    analysisResults: Record<string, AnalysisResult>
  }

  ACTIONS: {
    setSelectedDocument: (id: string | null) => void,

    addDocument: (document: Document) => {
      STEP_1: VALIDATE document structure
      STEP_2: CHECK for duplicates
      STEP_3: APPEND to documents array
    },

    setAnalysisResult: (documentId: string, result: AnalysisResult) => {
      STEP_1: VALIDATE documentId exists
      STEP_2: STORE result in analysisResults map
      STEP_3: EMIT "analysisComplete" event
    }
  }

  CACHE_STRATEGY: {
    documents: "Keep in memory, refetch from server on mount",
    analysisResults: "Keep until document removed, max 50 results"
  }
}
```

### Key Interfaces

```typescript
// Auth store interface
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

// UI store interface
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'vi' | 'en';
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'vi' | 'en') => void;
}

// Conversation store interface
interface ConversationState {
  currentConversationId: string | null;
  conversations: Conversation[];
  setCurrentConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
}

// Document store interface
interface DocumentState {
  selectedDocumentId: string | null;
  documents: Document[];
  analysisResults: Record<string, AnalysisResult>;
  setSelectedDocument: (id: string | null) => void;
  addDocument: (document: Document) => void;
  setAnalysisResult: (documentId: string, result: AnalysisResult) => void;
}

// Store hooks
function useAuthStore(): AuthState;
function useUIStore(): UIState;
function useConversationStore(): ConversationState;
function useDocumentStore(): DocumentState;
```

### Integration Points

```pseudo
INTEGRATION StoreProvider_Integration {
  UI_COMPONENTS: {
    triggers: ["SidebarToggle", "ThemeSwitch", "LanguageSelect"],
    displays: ["Sidebar", "Header", "Footer", "ConversationPanel"]
  }

  STATE_MANAGEMENT: {
    client_state: "Zustand (UI preferences, selections, filters)",
    server_state: "TanStack Query (user data, documents, conversations)",
    persistence: "LocalStorage (auth, UI preferences)"
  }

  DEPENDENCIES: {
    internal: ["@/shared/types"],
    external: ["zustand", "zustand/middleware"]
  }

  ERROR_HANDLING: {
    storage_quota_exceeded: "Clear old data, show warning toast",
    invalid_state: "Reset to defaults, log error"
  }

  EVENTS: {
    emits: ["onSidebarToggle", "onThemeChange", "onLanguageChange"],
    listens: ["onAuthStateChanged", "onDocumentSelected"]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    User: {
      roles: ["admin", "lawyer", "paralegal", "client"],
      vietnamese_term: "Người Dùng"
    },
    LegalDocument: {
      types: ["contract", "evidence", "court_filing", "compliance_report"],
      vietnamese_term: "Tài Liệu Pháp Lý"
    },
    Conversation: {
      types: ["legal_consultation", "case_discussion", "contract_review"],
      vietnamese_term: "Cuộc Hội Thoại Pháp Lý"
    },
    Contract: {
      types: ["insurance_contract", "loan_contract", "service_agreement"],
      vietnamese_term: "Hợp Đồng"
    },
    AnalysisResult: {
      types: ["compliance_check", "risk_assessment", "legal_summary"],
      vietnamese_term: "Kết Quả Phân Tích"
    }
  }

  BUSINESS_RULES: {
    legal_document_retention: "Legal documents retained for 10 years",
    contract_approval: "Requires 2 lawyers + 1 admin approval",
    data_privacy: "GDPR compliance + Vietnam data localization laws",
    compliance_check: "Mandatory before contract finalization"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    date_format: "DD/MM/YYYY",
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.2 - ThemeProvider",
    relationship: "UIStore manages theme preference, ThemeProvider applies it",
    integration: "useUIStore() → setTheme() → next-themes"
  },
  {
    pattern: "Pattern 9.3 - AuthProvider",
    relationship: "AuthStore persists auth state, AuthProvider manages JWT",
    integration: "useAuthStore() syncs with AuthProvider context"
  },
  {
    pattern: "Pattern 9.4 - I18nProvider",
    relationship: "UIStore manages language preference",
    integration: "useUIStore() → setLanguage() → next-intl"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [TanStack Query v5](https://tanstack.com/query), [Zustand](https://docs.pmnd.rs/zustand)
- **Internal Docs**: `/docs/architecture/state-management.md`

---

**Total Patterns**: 2 (9.1, 9.6)
**Line Count**: ~570 lines
**Compliance**: ✅ ≤800 lines
**Date**: 2026-01-02
