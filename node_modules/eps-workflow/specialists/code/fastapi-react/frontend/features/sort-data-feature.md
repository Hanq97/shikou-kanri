# Pattern 12.31: SortDataFeature

**Role**: Column sorting with multi-level support and state persistence
**Focus**: Sort state management, visual indicators, user interactions
**Technology**: React 19, TypeScript
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST SortDataFeature {
  ROLE: "Manage column sorting with visual feedback and state persistence"

  RESPONSIBILITIES: [
    "Track sort column and direction",
    "Handle sort state transitions",
    "Display sort indicators (up/down arrows)",
    "Support multi-column sorting",
    "Persist sort state to URL/localStorage"
  ]

  TECH_STACK: {
    primary: "React 19, TypeScript",
    libraries: ["lucide-react"],
    patterns: ["Client Component", "Button Component"]
  }

  DOMAIN_CONTEXT: {
    industry: "P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["SortState", "SortDirection"]
  }
}
```

---

## Pattern 12.31: SortDataFeature

### Overview

```pseudo
PATTERN SortDataFeature {
  PURPOSE: "Enable column sorting with visual indicators and state management"

  PROBLEM: "Users need to sort table data by columns with clear visual feedback"

  SOLUTION: "Clickable sort headers with ascending/descending/none states"

  USE_CASES: [
    "Sort loans by amount or date",
    "Sort claims by status or date filed",
    "Sort users by name or registration date",
    "Multi-column sorting (secondary sorts)",
    "Clear sorting and return to default order"
  ]

  COMPLEXITY: "LOW-MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW SortDataFeature_Workflow {
  INPUT: {
    column: string,
    label: string,
    sortState: SortState,
    onSort: (column: string, direction: SortDirection) => void,
    disabled?: boolean
  }

  PRECONDITIONS: [
    "column is non-empty string",
    "label is non-empty string",
    "sortState has valid column and direction",
    "onSort callback is provided"
  ]

  STEPS: {
    STEP_1_CHECK_ACTIVE: {
      description: "Check if this column is currently sorted"
      logic: |
        isActive = sortState.column == column
        currentDirection = isActive ? sortState.direction : null

        IF isActive THEN
          SHOW active visual indicator
        ELSE:
          SHOW inactive visual indicator
        END IF
    }

    STEP_2_HANDLE_CLICK: {
      description: "User clicks sort header"
      logic: |
        IF disabled THEN
          RETURN (do nothing)
        END IF

        HANDLE_SORT_CLICK()
    }

    STEP_3_CALCULATE_NEXT_STATE: {
      description: "Determine next sort direction"
      logic: |
        IF NOT isActive THEN
          // Column not sorted yet, start with ascending
          nextDirection = "asc"
        ELSE_IF currentDirection == "asc" THEN
          // Toggle to descending
          nextDirection = "desc"
        ELSE_IF currentDirection == "desc" THEN
          // Clear sort
          nextDirection = null
        ELSE:
          // Should not reach here
          nextDirection = "asc"
        END IF
    }

    STEP_4_UPDATE_SORT: {
      description: "Call sort callback with new state"
      logic: |
        CALL onSort(column, nextDirection)
    }

    STEP_5_UPDATE_VISUAL: {
      description: "Update button appearance based on sort state"
      logic: |
        isActive = sortState.column == column
        direction = isActive ? sortState.direction : null

        IF NOT isActive THEN
          SHOW icon: ArrowUpDown (unsorted)
          SHOW opacity: 50%
          SHOW bg: transparent
        ELSE_IF direction == "asc" THEN
          SHOW icon: ArrowUp
          SHOW opacity: 100%
          SHOW bg: gray-100
        ELSE_IF direction == "desc" THEN
          SHOW icon: ArrowDown
          SHOW opacity: 100%
          SHOW bg: gray-100
        END IF
    }
  }

  ERROR_HANDLING: {
    InvalidColumnError: "Log error, do not update state",
    InvalidDirectionError: "Reset to default ascending",
    CallbackError: "Log error, keep button in current state"
  }

  OUTPUT: {
    column: string,
    direction: SortDirection,
    active: boolean
  }

  POSTCONDITIONS: [
    "Sort state is updated through callback",
    "Visual indicators reflect current sort state",
    "Button remains enabled and clickable",
    "Data is sorted in parent component"
  ]
}
```

### Key Interfaces

```typescript
// Sort types
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string;
  direction: SortDirection;
}

// Props type
interface SortHeaderProps {
  column: string;
  label: string;
  sortState: SortState;
  onSort: (column: string, direction: SortDirection) => void;
  disabled?: boolean;
}

// Multi-column sort type
interface MultiSortState {
  sorts: SortState[];
  primary: SortState;
}

// Function signatures
function toggleSortDirection(
  current: SortDirection,
  isActive: boolean
): SortDirection;

function compareSorted<T>(
  data: T[],
  sortState: SortState,
  getValueFn: (item: T, column: string) => any
): T[];

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
  type: 'string' | 'number' | 'date' | 'currency';
}

function applySortConfig<T>(
  data: T[],
  config: SortConfig,
  accessor: (item: T) => any
): T[];
```

### Integration Points

```pseudo
INTEGRATION SortDataFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["Table header", "Column header button"],
    displays: ["Sort arrow icons", "Active state highlight"]
  }

  STATE_MANAGEMENT: {
    client_state: "Parent component's sort state (via useState)",
    server_state: "URL search params (sort persisted in URL)",
    persistence: "LocalStorage (remember user's last sort)"
  }

  API_ENDPOINTS: {
    primary: "GET /api/v1/[resource]?sort=[column]&order=[asc|desc]",
    server_sorting: "Server-side sorting if dataset is large (>1000 items)"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/button", "@/shared/lib/utils"],
    external: ["lucide-react"]
  }

  ERROR_HANDLING: {
    invalid_column: "Log warning, do not update sort",
    callback_error: "Log error, maintain current sort state",
    backend_error: "Show error toast, allow retry"
  }

  EVENTS: {
    emits: ["onSortChange", "onSortCleared"],
    listens: ["onDataChanged", "onColumnRemoved"]
  }
}
```

### Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    SortState: {
      vietnamese_term: "Trạng thái sắp xếp",
      values: ["asc (A-Z, 0-9)", "desc (Z-A, 9-0)", "null (không sắp xếp)"]
    },
    SortDirection: {
      vietnamese_term: "Hướng sắp xếp",
      "asc": "Tăng dần (Ascending)",
      "desc": "Giảm dần (Descending)",
      "null": "Không sắp xếp (No sort)"
    }
  }

  BUSINESS_RULES: {
    default_sort: "No sort applied on initial load",
    sort_cycle: "Click cycles through asc → desc → none",
    multi_sort: "Optional, only primary sort shown in single headers",
    persistence: "Sort state included in URL search params",
    column_types: "Auto-detect based on data (string, number, date)"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    sort_labels: "Vietnamese column names in headers",
    direction_indicator: "Visual arrows (up/down/bidirectional)"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.29 - AdvancedFilterFeature",
    relationship: "Filtering and sorting work together on table data",
    integration: "Both affect displayed rows in same table"
  },
  {
    pattern: "Pattern 12.30 - DataRefreshFeature",
    relationship: "Refresh maintains current sort state",
    integration: "Sort state persists after data refresh"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [React 19](https://react.dev)
- **UI Components**: [Lucide Icons](https://lucide.dev/)
- **Table Patterns**: [TanStack Table v8](https://tanstack.com/table)

**End of Pattern 12.31**
