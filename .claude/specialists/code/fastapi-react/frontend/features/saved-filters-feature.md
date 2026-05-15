# Saved Filters Feature (Pattern 12.34)

**Role**: Manage, save, restore, and share filter presets
**Focus**: Filter persistence, preset management, team collaboration
**Technology**: React 19, TypeScript, TanStack Query, Zustand
**Domain**: Vietnamese P2P insurance & lending filter management
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST SavedFiltersFeature {
  ROLE: "Filter preset management with persistence and sharing capabilities"

  RESPONSIBILITIES: [
    "Display list of saved filter presets",
    "Allow users to select and apply saved filters",
    "Enable saving current filter configuration as preset",
    "Handle filter deletion and modification",
    "Manage default filter designation",
    "Support filter sharing with team members",
    "Persist filters to server and localStorage"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    libraries: ["lucide-react", "zustand", "@tanstack/react-query"],
    patterns: ["State Management", "API Integration", "Caching"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["SavedFilter", "FilterGroup", "FilterRule", "UserPermissions"]
  }
}
```

---

## Pattern 12.34: SavedFiltersFeature

### Overview

```pseudo
PATTERN SavedFiltersFeature {
  PURPOSE: "Provide users with reusable filter presets to quickly apply common data queries"

  PROBLEM: |
    Users frequently apply the same filter combinations repeatedly:
    - Manually recreating filters is time-consuming
    - Complex filter combinations are error-prone
    - Teams need consistent filter definitions
    - Users work across devices and sessions
    - Filter organization becomes difficult with many presets

  SOLUTION: |
    Implement saved filters management system with:
    - Save current filter configuration as named preset
    - Display dropdown of all saved filters
    - Quick apply filters with single click
    - Mark filter as default (auto-apply on table load)
    - Delete unwanted filters
    - Share filters with team members
    - Sync filters across user devices
    - Organize filters by category (optional)

  USE_CASES: [
    "User saves 'Active Cases' filter for quick access",
    "User applies 'High Priority' filter from dropdown",
    "User sets 'My Cases' as default filter",
    "User deletes outdated filter preset",
    "User shares 'Urgent Documents' filter with team",
    "User browser remembers filter preferences"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW SavedFiltersFeature_Workflow {
  INPUT: {
    filters: Array<SavedFilter>,
    onSelectFilter: Function,
    onDeleteFilter: Function,
    onSetDefault?: Function,
    onShareFilter?: Function
  }

  PRECONDITIONS: [
    "filters array must be valid",
    "callbacks must be async or sync functions",
    "each filter must have id, name, rules",
    "user must have permission to modify filters",
    "at most one filter can be default"
  ]

  STEPS: {
    STEP_1_LOAD_FILTERS: {
      description: "Load saved filters from API or cache"
      logic: |
        // Load from TanStack Query cache
        CONST filters = USE_QUERY({
          queryKey: ["user_filters"],
          queryFn: () => API.get("/user/filters"),
          staleTime: 5 * 60 * 1000  // 5 minutes
        })

        // Find default filter
        defaultFilter = FIND(filters WHERE isDefault == true)

        IF defaultFilter NOT_FOUND THEN
          SET defaultFilter = NULL
        END IF
    }

    STEP_2_RENDER_FILTER_LIST: {
      description: "Render dropdown with filter list"
      logic: |
        RENDER DropdownMenu {
          TRIGGER = Button("Bộ lọc đã lưu ({filters.length})")

          CONTENT {
            IF filters.length == 0 THEN
              RENDER EmptyState "Chưa có bộ lọc nào (No saved filters)"
            ELSE
              // Show default filter first
              IF defaultFilter THEN
                RENDER Section "Mặc định (Default)" {
                  RENDER FilterItem {
                    icon: Star (yellow),
                    label: defaultFilter.name,
                    onClick: () => onSelectFilter(defaultFilter)
                  }
                }
              END IF

              // Show all filters
              RENDER Section "Tất cả bộ lọc (All filters)" {
                FOR EACH filter IN filters:
                  RENDER FilterItem {
                    label: filter.name,
                    onClick: () => onSelectFilter(filter),
                    actions: [
                      Button("Set Default", onClick: handleSetDefault),
                      Button("Delete", onClick: handleDelete)
                    ]
                  }
                END FOR
              }
            END IF
          }
        }
    }

    STEP_3_SELECT_FILTER: {
      description: "Apply selected filter to table"
      logic: |
        ASYNC FUNCTION onSelectFilter(filter) {
          TRY:
            // Validate filter rules
            IF NOT validateFilterRules(filter.rules) THEN
              SHOW_TOAST("Bộ lọc không hợp lệ")
              RETURN
            END IF

            // Apply filter to table
            SET tableFilters = filter.rules
            SET filterState = {
              selectedFilterId: filter.id,
              appliedAt: NOW()
            }

            // Fetch filtered data
            CALL fetchTableData({
              filters: filter.rules,
              page: 1  // Reset to page 1
            })

            SHOW_TOAST("Áp dụng bộ lọc '{filter.name}'")

          CATCH error:
            SHOW_TOAST("Lỗi: " + error.message, variant: "destructive")
          END TRY
        }
    }

    STEP_4_DELETE_FILTER: {
      description: "Delete saved filter"
      logic: |
        ASYNC FUNCTION handleDelete(filterId) {
          IF NOT confirmDelete("Xóa bộ lọc này?") THEN
            RETURN
          END IF

          TRY:
            CALL onDeleteFilter(filterId)

            SHOW_TOAST("Đã xóa bộ lọc")

            // If deleted filter was selected, clear selection
            IF selectedFilterId == filterId THEN
              SET selectedFilterId = NULL
              CALL clearTableFilters()
            END IF

            // Refresh filter list
            INVALIDATE_QUERY("user_filters")

          CATCH error:
            SHOW_TOAST("Không thể xóa: " + error.message)
          END TRY
        }
    }

    STEP_5_SET_DEFAULT_FILTER: {
      description: "Set filter as default"
      logic: |
        ASYNC FUNCTION handleSetDefault(filterId) {
          TRY:
            AWAIT onSetDefault(filterId)

            // Update store
            SET defaultFilter = filters.find(f => f.id == filterId)

            // Persist to localStorage
            SAVE_TO_STORAGE("default_filter", filterId)

            SHOW_TOAST("Đã đặt bộ lọc mặc định")

            INVALIDATE_QUERY("user_filters")

          CATCH error:
            SHOW_TOAST("Lỗi: " + error.message)
          END TRY
        }
    }

    STEP_6_APPLY_DEFAULT_ON_LOAD: {
      description: "Auto-apply default filter on table load"
      logic: |
        USE_EFFECT(() => {
          defaultFilterId = LOAD_FROM_STORAGE("default_filter")

          IF defaultFilterId AND isTableReady THEN
            defaultFilter = FIND(filters WHERE id == defaultFilterId)

            IF defaultFilter THEN
              CALL onSelectFilter(defaultFilter)
            END IF
          END IF
        }, [isTableReady, filters])
    }
  }

  ERROR_HANDLING: {
    InvalidFilter: "Show validation error, prevent application",
    DeleteError: "Show error toast, keep filter in list",
    PermissionError: "Show 'Access denied' message, disable actions",
    NetworkError: "Show offline message, use cached filters"
  }

  OUTPUT: {
    success: boolean,
    selected_filter?: SavedFilter,
    state: {
      filters: Array<SavedFilter>,
      defaultFilter: SavedFilter | null,
      isLoading: boolean,
      error?: Error
    }
  }

  POSTCONDITIONS: [
    "Selected filter is applied to table data",
    "Default filter is persisted",
    "Filter list is up-to-date",
    "User receives confirmation feedback"
  ]
}
```

### Key Interfaces

```typescript
// Filter types
interface FilterRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
  label: string;
}

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  rules: FilterRule[];
  isDefault: boolean;
  owner: {
    id: string;
    name: string;
  };
  sharedWith?: Array<{
    userId: string;
    permission: 'view' | 'edit';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface FilterGroup {
  id: string;
  name: string;
  filters: SavedFilter[];
  isPublic: boolean;
}

// Component props
interface SavedFiltersListProps {
  filters: SavedFilter[];
  onSelectFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
  onShareFilter?: (id: string, userId: string) => Promise<void>;
}

// Helper function signatures
function validateFilterRules(rules: FilterRule[]): boolean;
function applyFilterToQuery(rules: FilterRule[]): QueryParams;
export function SavedFiltersList(props: SavedFiltersListProps): JSX.Element;
```

### Integration Points

```pseudo
INTEGRATION SavedFiltersFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["Button", "DropdownMenuTrigger"],
    displays: ["DropdownMenuContent", "DropdownMenuItem", "Icon"],
    dialogs: ["ConfirmDialog (for delete)", "ShareDialog"]
  }

  STATE_MANAGEMENT: {
    server_state: "TanStack Query (user filters)",
    client_state: "Zustand (selected filter, editing state)",
    persistence: "localStorage (default filter ID, recent filters)"
  }

  API_ENDPOINTS: {
    list_filters: "GET /api/v1/user/filters",
    save_filter: "POST /api/v1/user/filters",
    update_filter: "PUT /api/v1/user/filters/{id}",
    delete_filter: "DELETE /api/v1/user/filters/{id}",
    set_default: "PATCH /api/v1/user/filters/{id}/default",
    share_filter: "POST /api/v1/user/filters/{id}/share"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/dropdown-menu", "@/shared/ui/button", "useTableStore"],
    external: ["@tanstack/react-query", "lucide-react", "zod"]
  }

  ERROR_HANDLING: {
    api_error: "Show error toast, enable retry button",
    validation_error: "Display inline validation messages",
    permission_error: "Disable edit/delete buttons",
    network_offline: "Use cached data from localStorage"
  }

  EVENTS: {
    emits: ["onFilterApplied", "onFilterDeleted", "onFilterShared", "onDefaultFilterChanged"],
    listens: ["onTableDataChange", "onUserPermissionsChange"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User applies saved filter to find specific cases"

  FLOW: {
    STEP_1: |
      User opens data table for insurance cases
      System loads default filter (if set) from storage
      Table displays pre-filtered data

    STEP_2: |
      User clicks "Bộ lọc đã lưu (Saved Filters)" button
      Dropdown shows:
        - "My Active Cases" (marked as default with star)
        - "High Priority"
        - "Pending Review"

    STEP_3: |
      User clicks "High Priority"
      System CALLS onSelectFilter(highPriorityFilter)
      Table refetches data with rules:
        - priority >= 'high'
        - status != 'closed'

    STEP_4: |
      User wants to create new filter
      User modifies current filters in table UI
      User clicks "Save as Filter" button
      System prompts for filter name: "My Custom Filter"
      System saves filter via API

    STEP_5: |
      User refreshes page
      Default filter is auto-applied
      Table shows consistent data
  }

  PSEUDO_CODE: |
    // In table component
    CONST { filters } = USE_QUERY({
      queryKey: ["user_filters"],
      queryFn: API.getFilters
    })

    CONST [selectedFilter, setSelectedFilter] = useState(null)

    USE_EFFECT(() => {
      defaultFilter = LOAD_FROM_STORAGE("default_filter")
      IF defaultFilter THEN
        setSelectedFilter(defaultFilter)
      END IF
    }, [])

    ASYNC FUNCTION applyFilter(filter) {
      SET selectedFilter = filter

      newData = AWAIT API.getTableData({
        filters: filter.rules
      })

      SET tableData = newData
    }

    RETURN (
      <>
        SavedFiltersList {
          filters: filters,
          onSelectFilter: applyFilter
        }

        Table {
          data: tableData
        }
      </>
    )
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.30 - DataTableFeature",
    relationship: "Applies filters to table data",
    integration: "Receives filter rules from SavedFilters"
  },
  {
    pattern: "Pattern 12.31 - AdvancedFilterFeature",
    relationship: "Builds filters that can be saved",
    integration: "Creates rules that SavedFilters stores"
  },
  {
    pattern: "Pattern 12.32 - PaginationFeature",
    relationship: "Resets pagination when filter changes",
    integration: "Sets page=1 after filter application"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Server State**: [TanStack Query v5](https://tanstack.com/query)
- **Client State**: [Zustand](https://github.com/pmndrs/zustand)
- **Technology Docs**: [React 19](https://react.dev)

---

**Pattern Classification**: Feature | State Management | API Integration
**Complexity Level**: MEDIUM
**Estimated Implementation Time**: 3-4 hours
**Test Coverage Target**: 85%+
**Backend API Required**: Yes (filter CRUD endpoints)

