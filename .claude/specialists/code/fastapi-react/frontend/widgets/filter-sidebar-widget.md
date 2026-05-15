# Widget 11.28: FilterSidebar

**Type**: Sidebar Widget
**Role**: Advanced filter controls for data filtering and search refinement
**Technology**: React 19, TypeScript, Zustand
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET FilterSidebar {
  ROLE: "Advanced filter sidebar for data refinement"

  RESPONSIBILITIES: [
    "Display collapsible filter sections",
    "Support multiple filter types (checkbox, date, search, range)",
    "Track selected filters with visual feedback",
    "Reset all filters at once",
    "Show active filter count badge"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    state_management: "React useState + useCallback",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react",
    utilities: "cn (classname utility)"
  }

  DOMAIN_CONTEXT: {
    use_case: "Filter documents, users, conversations, cases",
    entities: ["FilterSection", "FilterOption"],
    vietnamese_labels: {
      filter: "Bộ lọc",
      search: "Tìm kiếm",
      date: "Ngày",
      reset: "Đặt lại"
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN FilterSidebar_Widget {
  PURPOSE: "Provide advanced filtering controls in collapsible sidebar"

  PROBLEM: "Data tables need flexible filtering without cluttering main content area"

  SOLUTION: "Accordion-style sidebar with collapsible filter sections and reset functionality"

  USE_CASES: [
    "Filter documents by type, date, owner",
    "Filter conversations by status, date, participant",
    "Filter users by role, status, join date",
    "Apply multiple filters simultaneously"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW FilterSidebar_Workflow {
  INPUT: {
    filters: FilterSection[],
    isOpen: boolean,
    activeFilterCount: number,
    callbacks: {
      onClose?: Function,
      onFilterChange: Function,
      onReset?: Function
    }
  }

  PRECONDITIONS: [
    "filters array must not be empty",
    "Each filter must have id, title, type, and options",
    "onFilterChange callback must be provided"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize expanded sections state"
      logic: |
        SET expandedSections = {} object
        FOR EACH filter IN filters:
          expandedSections[filter.id] = true (all expanded by default)
        END FOR

        SET sidebarWidth = isOpen ? "w-80" : "w-0"
    }

    STEP_2_RENDER_HEADER: {
      description: "Render filter header with count badge"
      logic: |
        RENDER header section
        SHOW "Bộ lọc" (Filter) label
        SHOW Filter icon

        IF activeFilterCount > 0 THEN
          SHOW badge with count
        END IF

        IF onClose THEN
          SHOW close button (X icon)
        END IF
    }

    STEP_3_RENDER_RESET_BUTTON: {
      description: "Show reset button only when filters active"
      logic: |
        IF activeFilterCount > 0 AND onReset THEN
          RENDER reset button
          SHOW "Đặt lại bộ lọc" (Reset Filters) label
          ON click:
            CALL onReset()
        END IF
    }

    STEP_4_RENDER_FILTER_SECTIONS: {
      description: "Render collapsible filter sections"
      logic: |
        FOR EACH section IN filters:
          RENDER collapsible section header
          SHOW section icon
          SHOW section title
          SHOW selected count badge

          ON header click:
            TOGGLE expandedSections[section.id]

          IF expandedSections[section.id] THEN
            RENDER section content based on type
          END IF
        END FOR
    }

    STEP_5_RENDER_CHECKBOX_FILTERS: {
      description: "Render checkbox-type filter options"
      logic: |
        FOR EACH option IN section.options:
          RENDER checkbox label
          SHOW checkbox input
          SHOW option label
          SHOW option count if available

          ON checkbox change:
            CALL onFilterChange(section.id, updated selected list)
        END FOR
    }

    STEP_6_RENDER_SEARCH_FILTERS: {
      description: "Render search input for search-type filters"
      logic: |
        RENDER search input section
        SHOW search icon
        SHOW input with placeholder "Tìm kiếm..."
        ON input change:
          CALL onFilterChange with search term
    }

    STEP_7_RENDER_DATE_FILTERS: {
      description: "Render date input for date-type filters"
      logic: |
        RENDER date input
        ON date select:
          CALL onFilterChange with selected date
    }
  }

  ERROR_HANDLING: {
    InvalidFilter: "Skip rendering that filter section",
    MissingCallback: "Show warning and disable interactions",
    DataError: "Show fallback with empty options"
  }

  OUTPUT: {
    rendered_component: SidebarElement,
    visible: isOpen,
    width: "w-80 or w-0",
    handles_all_types: true
  }

  POSTCONDITIONS: [
    "All filter sections render correctly",
    "Expand/collapse works smoothly",
    "Filter changes trigger callbacks",
    "Reset button works when active"
  ]
}
```

---

## Key Interfaces

```typescript
// Filter Data Types
interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterSection {
  id: string;
  title: string;
  icon: React.ElementType;
  type: 'checkbox' | 'date' | 'search' | 'range';
  options: FilterOption[];
  selected: string[];
}

// Component Props
interface FilterSidebarProps {
  filters: FilterSection[];
  isOpen?: boolean;
  onClose?: () => void;
  onFilterChange: (filterId: string, selected: string[]) => void;
  onReset?: () => void;
  activeFilterCount?: number;
}

// Component Signature
function FilterSidebar(props: FilterSidebarProps): JSX.Element | null
```

---

## Integration Points

```pseudo
INTEGRATION FilterSidebar_Integration {
  PARENT_COMPONENTS: [
    "DataTablePage (main data table view)",
    "DocumentListPage",
    "ConversationListPage",
    "UserManagementPage"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for expandedSections",
    global_state: "Zustand store for filter state",
    server_state: "TanStack Query for filtered data"
  }

  EVENTS: {
    emits: ["onFilterChange", "onReset", "onClose"],
    triggers: ["User checks/unchecks filter", "User enters search term"]
  }

  STYLING: {
    theme: "Tailwind CSS",
    layout: "Flex column with sticky header",
    animations: "ChevronDown rotate on expand",
    colors: "Gray-900 text, blue accents"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE FilterSidebar {
  SCENARIO: "User filters documents by type and date"

  ACTORS: {
    user: "Lawyer viewing document list",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User clicks filter icon on document page
      Sidebar opens showing filter options

    STEP_2: |
      System CALLS FilterSidebar({
        filters: [
          {
            id: "type",
            title: "Loại tài liệu",
            icon: FileText,
            type: "checkbox",
            selected: [],
            options: [
              { id: "contract", label: "Hợp đồng", count: 24 },
              { id: "evidence", label: "Bằng chứng", count: 18 }
            ]
          },
          {
            id: "date",
            title: "Ngày",
            icon: Calendar,
            type: "date",
            selected: [],
            options: []
          }
        ],
        activeFilterCount: 0,
        onFilterChange: (filterId, selected) => applyFilter(filterId, selected),
        onReset: () => clearAllFilters()
      })

    STEP_3: |
      User checks "Hợp đồng" checkbox
      System calls onFilterChange("type", ["contract"])
      Main table updates to show only contracts

    STEP_4: |
      User selects date range
      System filters documents by date

    STEP_5: |
      System shows "2" badge indicating 2 active filters
      User clicks reset button
      All filters clear
  }
}
```

---

## Performance Considerations

```pseudo
PERFORMANCE FilterSidebar_Performance {
  OPTIMIZATION_STRATEGIES: {
    rendering: "Use useCallback for toggle and change handlers",
    state_updates: "Debounce filter changes by 300ms",
    expansion: "Memoize filter section components",
    search: "Debounce search input to 500ms"
  }

  BENCHMARKS: {
    target_render_time: "< 100ms",
    toggle_response: "< 50ms for expand/collapse",
    filter_options: "Support 100+ options per section",
    search_response: "< 500ms for search results"
  }

  BEST_PRACTICES: [
    "Debounce search input",
    "Use useCallback for all handlers",
    "Memoize filter sections",
    "Lazy load large option lists"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  DOCUMENT_FILTERS: {
    type: ["Hợp đồng", "Bằng chứng", "Tệp đơn", "Yêu cầu"],
    status: ["Mới", "Đang xem xét", "Đã phê duyệt", "Bị từ chối"],
    date_range: "Ngày tạo, Ngày sửa đổi"
  }

  USER_FILTERS: {
    role: ["Quản trị viên", "Luật sư", "Thư ký pháp", "Khách hàng"],
    status: ["Hoạt động", "Không hoạt động", "Chờ xử lý"],
    join_date: "Ngày tham gia"
  }

  LOCALIZATION: {
    language: "Vietnamese",
    reset_label: "Đặt lại bộ lọc",
    search_placeholder: "Tìm kiếm..."
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING FilterSidebar_Tests {
  UNIT_TESTS: [
    "Should render when isOpen=true",
    "Should expand/collapse filter sections",
    "Should show selected count badge",
    "Should toggle checkboxes",
    "Should show reset button when filters active",
    "Should call onFilterChange when filter changes"
  ]

  INTEGRATION_TESTS: [
    "Filter changes update parent component",
    "Reset clears all filters",
    "Multiple filters work simultaneously",
    "Search filters work with debounce"
  ]

  EDGE_CASES: [
    "Filter with 0 options",
    "Filter with >100 options",
    "Very long option labels",
    "Rapid filter changes",
    "Search with special characters"
  ]
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 363
**Status**: Completed
