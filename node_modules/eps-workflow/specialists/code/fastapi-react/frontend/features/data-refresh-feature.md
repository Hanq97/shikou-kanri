# Pattern 12.30: DataRefreshFeature

**Role**: Manual data refresh with cache invalidation
**Focus**: TanStack Query integration, loading states, stale-while-revalidate
**Technology**: React 19, TanStack Query, TypeScript
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST DataRefreshFeature {
  ROLE: "Provide manual data refresh with cache management"

  RESPONSIBILITIES: [
    "Invalidate query cache",
    "Trigger data refetch",
    "Manage loading states",
    "Show refresh feedback",
    "Handle refresh errors"
  ]

  TECH_STACK: {
    primary: "React 19, TypeScript, TanStack Query",
    libraries: ["lucide-react", "@tanstack/react-query"],
    patterns: ["Client Component", "Hook Pattern"]
  }

  DOMAIN_CONTEXT: {
    industry: "P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["QueryClient", "QueryKey"]
  }
}
```

---

## Pattern 12.30: DataRefreshFeature

### Overview

```pseudo
PATTERN DataRefreshFeature {
  PURPOSE: "Allow users to manually refresh data with visual feedback"

  PROBLEM: "Data may become stale and users need way to get latest version"

  SOLUTION: "Manual refresh button that invalidates cache and refetches data"

  USE_CASES: [
    "Refresh loan list after approving item",
    "Refresh claim status after update",
    "Refresh user data after profile change",
    "Force latest data instead of cached version"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW DataRefreshFeature_Workflow {
  INPUT: {
    queryKey: (string | number | boolean | object)[],
    disabled?: boolean,
    variant?: 'default' | 'outline' | 'ghost'
  }

  PRECONDITIONS: [
    "queryKey is valid array",
    "TanStack QueryClient is initialized",
    "Query with this key exists"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Setup refresh button with initial state"
      logic: |
        queryClient = GET_CURRENT_QUERY_CLIENT()
        toast = GET_TOAST_CONTEXT()
        isRefreshing = false

        IF queryKey IS_NULL OR queryKey.length == 0 THEN
          THROW ERROR "queryKey must be provided"
        END IF
    }

    STEP_2_HANDLE_REFRESH_CLICK: {
      description: "User clicks refresh button"
      logic: |
        IF isRefreshing OR disabled THEN
          RETURN (do nothing)
        END IF

        SET isRefreshing = true
        SHOW spinning animation on button
    }

    STEP_3_INVALIDATE_CACHE: {
      description: "Invalidate the query cache"
      logic: |
        TRY:
          AWAIT queryClient.invalidateQueries({
            queryKey: queryKey
          })
        CATCH error:
          SHOW TOAST {
            title: "Lỗi (Error)",
            description: "Không thể làm mới dữ liệu",
            variant: "destructive"
          }
          RETURN
        END TRY
    }

    STEP_4_REFETCH_DATA: {
      description: "Fetch latest data from server"
      logic: |
        TRY:
          result = AWAIT queryClient.refetchQueries({
            queryKey: queryKey
          })
        CATCH error:
          SHOW TOAST {
            title: "Lỗi (Error)",
            description: "Không thể làm mới dữ liệu",
            variant: "destructive"
          }
          RETURN
        END TRY
    }

    STEP_5_SHOW_SUCCESS: {
      description: "Show success feedback to user"
      logic: |
        SHOW TOAST {
          title: "Làm mới (Refresh)",
          description: "Dữ liệu đã được cập nhật",
          variant: "success"
        }
    }

    STEP_6_RESET_STATE: {
      description: "Reset button to initial state"
      logic: |
        SET isRefreshing = false
        REMOVE spinning animation
        ENABLE button (if not disabled)
    }
  }

  ERROR_HANDLING: {
    QueryNotFoundError: "Show error toast, button remains enabled",
    NetworkError: "Show error toast, allow retry",
    TimeoutError: "Show timeout error, allow retry",
    AuthError: "Redirect to login if unauthorized"
  }

  OUTPUT: {
    success: boolean,
    data?: any,
    error?: {
      code: string,
      message: string
    }
  }

  POSTCONDITIONS: [
    "Cache is invalidated",
    "Fresh data is fetched from server",
    "User sees success or error feedback",
    "Button returns to initial state"
  ]
}
```

### Key Interfaces

```typescript
// Props type
interface DataRefreshProps {
  queryKey: (string | number | boolean | object)[];
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
}

// Query client type
type QueryClient = ReturnType<typeof useQueryClient>;

// Refresh result
interface RefreshResult {
  success: boolean;
  timestamp: string;
  dataUpdated: boolean;
  error?: {
    code: string;
    message: string;
  };
}

// Function signatures
function handleRefresh(
  queryClient: QueryClient,
  queryKey: (string | number | boolean | object)[]
): Promise<RefreshResult>;

function getQueryKey(
  resource: string,
  filters?: Record<string, any>
): (string | number | boolean | object)[];
```

### Integration Points

```pseudo
INTEGRATION DataRefreshFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["Refresh button in table header", "Refresh button in card"],
    displays: ["Spinning icon", "Toast notification"]
  }

  STATE_MANAGEMENT: {
    client_state: "Local isRefreshing boolean",
    server_state: "TanStack Query cache (managed by QueryClient)",
    persistence: "None (ephemeral refresh state)"
  }

  API_ENDPOINTS: {
    primary: "GET /api/v1/[resource] (refetch with same queryKey)",
    fallback: "Use cached data if refetch fails"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/button", "@/shared/ui/use-toast"],
    external: ["@tanstack/react-query", "lucide-react"]
  }

  ERROR_HANDLING: {
    network_errors: "Show toast, allow retry",
    timeout_errors: "Show timeout message",
    auth_errors: "Redirect to login",
    server_errors: "Show error toast with message"
  }

  EVENTS: {
    emits: ["onRefreshStart", "onRefreshSuccess", "onRefreshError"],
    listens: ["onQueryInvalidated", "onDataStale"]
  }
}
```

### Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    DataRefresh: {
      vietnamese_term: "Làm mới dữ liệu",
      triggers: ["User action", "Manual click"],
      feedback: "Toast notification"
    }
  }

  BUSINESS_RULES: {
    cache_invalidation: "Clears cache for specific query key",
    refetch_strategy: "Fetch latest data from server",
    user_feedback: "Always show success or error message",
    button_state: "Disabled during refresh operation"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    button_label: "Làm mới (Refresh)",
    success_message: "Dữ liệu đã được cập nhật",
    error_message: "Không thể làm mới dữ liệu"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.29 - AdvancedFilterFeature",
    relationship: "Filters and refresh work together in data views",
    integration: "Refresh applies to filtered data"
  },
  {
    pattern: "Pattern 12.31 - SortDataFeature",
    relationship: "Refresh maintains current sort state",
    integration: "Both work on same data table"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [TanStack Query v5](https://tanstack.com/query), [React 19](https://react.dev)
- **Caching Patterns**: [Stale-While-Revalidate](https://web.dev/stale-while-revalidate/)

**End of Pattern 12.30**
