# Pagination Feature (Pattern 12.32)

**Role**: Manage table pagination and page navigation
**Focus**: Page size selection, navigation controls, state persistence
**Technology**: React 19, TypeScript, Zustand (state management)
**Domain**: Vietnamese P2P insurance & lending table UI
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST PaginationFeature {
  ROLE: "Pagination handler for data tables with navigation and state persistence"

  RESPONSIBILITIES: [
    "Calculate pagination metadata (current page, total pages, row ranges)",
    "Handle page navigation (next, previous, page selection)",
    "Manage page size selection (10, 25, 50, 100 items)",
    "Persist pagination state across user sessions",
    "Display user-friendly pagination information"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    libraries: ["lucide-react", "zustand", "@shared/ui/button", "@shared/ui/select"],
    patterns: ["State Management", "Component Composition", "Event Handling"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["TableData", "PageInfo", "UserPreferences"]
  }
}
```

---

## Pattern 12.32: PaginationFeature

### Overview

```pseudo
PATTERN PaginationFeature {
  PURPOSE: "Provide intuitive page navigation for large data tables with customizable page sizes"

  PROBLEM: |
    Display data tables with hundreds/thousands of rows requires:
    - Efficient pagination without loading entire dataset
    - User control over page size (10, 25, 50, 100 items)
    - Visual feedback on current page position
    - Navigation buttons (previous, next, page numbers)
    - State persistence across user sessions

  SOLUTION: |
    Implement pagination component that:
    - Calculates page info (total pages, current range) based on page/pageSize/total
    - Provides dropdown for page size selection
    - Shows navigation buttons (previous/next) with disabled states
    - Displays current page info (e.g., "Trang 2/10")
    - Persists pageSize in localStorage
    - Notifies parent component of changes via callbacks

  USE_CASES: [
    "User navigates between pages in data table",
    "User changes items per page (10 → 25 items)",
    "User returns to table and previous page size is restored",
    "System disables previous button on page 1, next button on last page"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW PaginationFeature_Workflow {
  INPUT: {
    page: number,           // Current page (1-based)
    pageSize: number,       // Items per page (10/25/50/100)
    total: number,          // Total items in dataset
    onPageChange: Function, // Callback for page changes
    onPageSizeChange: Function  // Callback for size changes
  }

  PRECONDITIONS: [
    "page must be >= 1",
    "pageSize must be in [10, 25, 50, 100]",
    "total must be >= 0",
    "Callbacks must be functions"
  ]

  STEPS: {
    STEP_1_VALIDATE_INPUTS: {
      description: "Validate pagination inputs"
      logic: |
        IF page IS_NULL OR page < 1 THEN
          SET page = 1
        END IF

        IF pageSize NOT_IN [10, 25, 50, 100] THEN
          THROW ERROR "pageSize must be 10, 25, 50, or 100"
        END IF

        IF total < 0 THEN
          SET total = 0
        END IF
    }

    STEP_2_CALCULATE_METADATA: {
      description: "Calculate pagination info"
      logic: |
        totalPages = CEIL(total / pageSize)

        IF page > totalPages THEN
          SET page = MAX(1, totalPages)
        END IF

        startRow = (page - 1) * pageSize + 1
        endRow = MIN(page * pageSize, total)
    }

    STEP_3_RENDER_PAGINATION: {
      description: "Render pagination UI"
      logic: |
        RENDER Container {
          RENDER RowInfo "Hiển thị {startRow} đến {endRow} trong {total}"

          RENDER PageSizeDropdown {
            VALUE = pageSize.toString()
            OPTIONS = ["10", "25", "50", "100"]
            ON_CHANGE: (value) => onPageSizeChange(Number(value))
          }

          RENDER PreviousButton {
            DISABLED = (page === 1)
            ON_CLICK: () => onPageChange(page - 1)
            ICON = ChevronLeft
          }

          RENDER PageInfo "Trang {page} / {totalPages}"

          RENDER NextButton {
            DISABLED = (page === totalPages)
            ON_CLICK: () => onPageChange(page + 1)
            ICON = ChevronRight
          }
        }
    }

    STEP_4_PERSIST_STATE: {
      description: "Save pagination state"
      logic: |
        SAVE_TO_STORAGE("pagination_state", {
          pageSize: pageSize,
          timestamp: NOW()
        })
    }
  }

  ERROR_HANDLING: {
    InvalidPage: "Reset to page 1",
    InvalidPageSize: "Reset to default 25",
    InvalidTotal: "Use 0 as default",
    CallbackError: "Log error, continue rendering"
  }

  OUTPUT: {
    success: boolean,
    pagination_info: {
      currentPage: number,
      totalPages: number,
      startRow: number,
      endRow: number,
      pageSize: number
    }
  }

  POSTCONDITIONS: [
    "All buttons are properly disabled based on pagination state",
    "Page info is correctly displayed in Vietnamese",
    "Page size is persisted to localStorage"
  ]
}
```

### Key Interfaces

```typescript
// Input types
interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// Output types
interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  startRow: number;
  endRow: number;
  itemsShown: number;
}

// Component signature (no implementation)
export function Pagination(props: PaginationProps): JSX.Element;

// Helper function signatures
function calculateTotalPages(total: number, pageSize: number): number;
function calculateRowRange(page: number, pageSize: number, total: number): [number, number];
function isPageValid(page: number, totalPages: number): boolean;
```

### Integration Points

```pseudo
INTEGRATION PaginationFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["Button", "Select", "DropdownMenu"],
    displays: ["Text", "Icon", "Badge"]
  }

  STATE_MANAGEMENT: {
    client_state: "Zustand store (pagination state)",
    server_state: "TanStack Query (cached data with pagination)",
    persistence: "LocalStorage (page size preference)"
  }

  API_ENDPOINTS: {
    primary: "GET /api/v1/data?page={page}&pageSize={pageSize}",
    caching: "TanStack Query with staleTime: 5min"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/button", "@/shared/ui/select"],
    external: ["lucide-react", "zustand"]
  }

  ERROR_HANDLING: {
    navigation_error: "Show warning toast, keep current page",
    size_change_error: "Reset to previous pageSize, show toast",
    api_error: "Disable buttons, show error message"
  }

  EVENTS: {
    emits: ["onPageChange", "onPageSizeChange", "onPaginationStateChange"],
    listens: ["onDataRefresh", "onTableReset"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User navigates data table with 150 items"

  FLOW: {
    STEP_1: |
      User opens data table
      System loads first 25 items (default page size)
      PaginationFeature renders with page=1, pageSize=25, total=150

    STEP_2: |
      User clicks next button
      System CALLS onPageChange(2)
      Table fetches items 26-50

    STEP_3: |
      User changes page size to 50
      System CALLS onPageSizeChange(50)
      SAVES pageSize to localStorage
      Table refreshes with 50 items per page

    STEP_4: |
      User clicks previous button
      System CALLS onPageChange(1)
      Table displays items 1-50
  }

  PSEUDO_CODE: |
    // In table component
    FUNCTION handlePageChange(newPage) {
      IF newPage < 1 OR newPage > totalPages THEN
        RETURN
      END IF

      SET currentPage = newPage
      CALL fetchTableData({
        page: newPage,
        pageSize: pageSize
      })
    }

    FUNCTION handlePageSizeChange(newSize) {
      IF newSize NOT_IN [10, 25, 50, 100] THEN
        RETURN
      END IF

      SET pageSize = newSize
      SAVE_TO_LOCALSTORAGE("pageSize", newSize)
      SET currentPage = 1
      CALL fetchTableData({
        page: 1,
        pageSize: newSize
      })
    }
}
```

### Performance Considerations

```pseudo
PERFORMANCE PaginationFeature_Performance {
  OPTIMIZATION_STRATEGIES: {
    rendering: "Memoize pagination component (React.memo)",
    calculation: "Cache totalPages calculation",
    events: "Debounce page change callbacks (100ms)",
    persistence: "Batch localStorage writes (10s)"
  }

  BENCHMARKS: {
    render_time: "< 50ms",
    calculation_time: "< 5ms",
    button_response: "< 200ms"
  }

  MONITORING: {
    metrics: ["page_change_latency", "render_time", "state_persistence_time"],
    alerts: [
      "IF render_time > 100ms THEN investigate",
      "IF api_call > 1s THEN show loading state"
    ]
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.30 - DataTableFeature",
    relationship: "Works with data table to provide pagination control",
    integration: "Receives table data and total count from parent"
  },
  {
    pattern: "Pattern 12.33 - ColumnCustomizationFeature",
    relationship: "Coordinates with column settings when page size changes",
    integration: "May need to refresh column layout on size change"
  },
  {
    pattern: "Pattern 12.31 - SortDataFeature",
    relationship: "Interacts with sorting to maintain consistency",
    integration: "Resets to page 1 when sort order changes"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [React 19](https://react.dev), [Zustand](https://github.com/pmndrs/zustand)
- **UI Library**: [Shadcn UI Select](https://ui.shadcn.com/docs/components/select)

---

**Pattern Classification**: UI Component | State Management | Data Presentation
**Complexity Level**: MEDIUM
**Estimated Implementation Time**: 2-3 hours
**Test Coverage Target**: 85%+

