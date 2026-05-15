# Pattern 12.6: UserFiltersFeature

**Role**: Advanced filtering for user list with URL state persistence
**Focus**: Multi-criteria filter panel with sheet-based UI
**Technology**: React 19, TypeScript 5, Next.js routing, Shadcn/ui Sheet
**Domain**: Vietnamese legal platform (Người Dùng)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE UserFiltersFeature {
  PURPOSE: "Enable advanced filtering with multiple criteria and persistent URL state"

  RESPONSIBILITIES: [
    "Display filter panel in sheet component",
    "Capture filter criteria (search, role, department, status, date range)",
    "Apply filters and update URL query parameters",
    "Show active filter count badge",
    "Clear all filters with single click"
  ]

  TECH_STACK: {
    primary: "URL query parameters for state",
    state_management: "useState + useRouter + useSearchParams",
    ui_components: "Shadcn/ui Sheet, Badge, Select, Input",
    navigation: "Next.js navigation"
  }

  DOMAIN_CONTEXT: {
    entities: ["Người Dùng (User)", "Vai Trò (Role)", "Bộ Phận (Department)"],
    filter_criteria: ["search", "role", "department", "status", "createdFrom", "createdTo"]
  }
}
```

---

## Workflow: UserFiltersFeature_Workflow

```pseudo
WORKFLOW UserFiltersFeature {
  INPUT: {
    onFilterChange?: (filters: UserFilters) => void
  }

  PRECONDITIONS: [
    "Route supports query parameters",
    "useSearchParams and useRouter available"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_FILTERS {
  description: "Load filters from URL parameters"
  logic: |
    searchParams = useSearchParams()

    FILTERS = {
      search: searchParams.get('search') || '',
      role: searchParams.get('role') || '',
      department: searchParams.get('department') || '',
      status: searchParams.get('status') || '',
      createdFrom: searchParams.get('createdFrom') || '',
      createdTo: searchParams.get('createdTo') || ''
    }

    RETURN FILTERS
}

STEP_2_CALCULATE_ACTIVE_FILTERS {
  description: "Count active filter criteria"
  logic: |
    activeCount = 0

    FOR EACH key IN FILTERS:
      IF FILTERS[key] != empty THEN
        activeCount = activeCount + 1
      END IF
    END FOR

    RETURN activeCount
}

STEP_3_RENDER_FILTER_PANEL {
  description: "Display filter options in sheet"
  logic: |
    RENDER Sheet {
      Trigger: Button with "Bộ Lọc / Filters" text and activeCount badge

      Content: FilterPanel [
        {
          label: "Tìm kiếm / Search",
          type: "text",
          value: FILTERS.search,
          placeholder: "Tên hoặc email / Name or email..."
        },
        {
          label: "Vai Trò / Role",
          type: "select",
          value: FILTERS.role,
          options: ROLE_OPTIONS,
          placeholder: "Tất cả vai trò / All roles"
        },
        {
          label: "Trạng Thái / Status",
          type: "select",
          value: FILTERS.status,
          options: STATUS_OPTIONS,
          placeholder: "Tất cả trạng thái / All statuses"
        },
        {
          label: "Bộ Phận / Department",
          type: "text",
          value: FILTERS.department,
          placeholder: "Pháp Lý, Kỹ Thuật... / Legal, Engineering..."
        },
        {
          label: "Ngày Tạo / Creation Date",
          type: "daterange",
          from: FILTERS.createdFrom,
          to: FILTERS.createdTo
        }
      ]

      Footer: [
        ApplyButton,
        ClearButton
      ]
    }
}

STEP_4_HANDLE_FILTER_CHANGE {
  description: "Update filter state on field change"
  logic: |
    ON_FIELD_CHANGE = (key, value) => {
      FILTERS = {
        ...FILTERS,
        [key]: value
      }
    }
}

STEP_5_APPLY_FILTERS {
  description: "Update URL and call callback"
  logic: |
    ON_APPLY = () => {
      params = new URLSearchParams()

      FOR EACH key IN FILTERS:
        IF FILTERS[key] != empty THEN
          params.set(key, FILTERS[key])
        END IF
      END FOR

      ROUTER.push(`/users?${params.toString()}`)
      onFilterChange?.(FILTERS)
      CLOSE_SHEET()
    }
}

STEP_6_CLEAR_FILTERS {
  description: "Reset all filters"
  logic: |
    ON_CLEAR = () => {
      FILTERS = {}
      ROUTER.push('/users')
      onFilterChange?.({})
      CLOSE_SHEET()
    }
}
```

---

## Key Interfaces

```typescript
interface UserFilters {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
}

interface UserFiltersProps {
  onFilterChange?: (filters: UserFilters) => void;
}

interface RoleOption {
  value: string;
  label: string;
}

interface StatusOption {
  value: string;
  label: string;
}

interface FilterFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  type: 'text' | 'select' | 'date';
}
```

---

## Integration Points

```pseudo
INTEGRATION UserFiltersFeature {
  UI_COMPONENTS: {
    triggers: ["Filter icon button"],
    displays: ["Sheet component"],
    feedback: ["Badge for active count"]
  }

  STATE_MANAGEMENT: {
    local_state: "useState(filters)",
    url_state: "URLSearchParams",
    callback: "onFilterChange prop"
  }

  NAVIGATION: {
    read_from: "useSearchParams()",
    write_to: "router.push()"
  }

  OPTIONS_CONSTANTS: {
    ROLE_OPTIONS: [
      { value: 'admin', label: 'Quản trị viên / Admin' },
      { value: 'luatsu', label: 'Luật sư / Lawyer' },
      { value: 'user', label: 'Người dùng / User' },
      { value: 'viewer', label: 'Người xem / Viewer' }
    ],
    STATUS_OPTIONS: [
      { value: 'active', label: 'Hoạt động / Active' },
      { value: 'inactive', label: 'Không hoạt động / Inactive' },
      { value: 'pending', label: 'Đang chờ / Pending' }
    ]
  }

  PARENT_INTEGRATION: {
    expects: "List component reads filters from URL",
    provides: "Filter state via URL parameters",
    callback: "onFilterChange with filter object"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  FILTER_LABELS: {
    search: "Tìm kiếm / Search",
    role: "Vai Trò / Role",
    department: "Bộ Phận / Department",
    status: "Trạng Thái / Status",
    createdFrom: "Từ / From",
    createdTo: "Đến / To",
    creation_date: "Ngày Tạo / Creation Date"
  }

  PLACEHOLDERS: {
    search: "Tên hoặc email / Name or email...",
    department: "Pháp Lý, Kỹ Thuật... / Legal, Engineering...",
    role: "Tất cả vai trò / All roles",
    status: "Tất cả trạng thái / All statuses"
  }

  BUTTON_LABELS: {
    apply: "Áp Dụng / Apply",
    clear: "Xóa / Clear",
    filters: "Bộ Lọc / Filters"
  }

  ROLE_MAPPING: {
    admin: { vi: "Quản trị viên", en: "Admin" },
    luatsu: { vi: "Luật sư", en: "Lawyer" },
    user: { vi: "Người dùng", en: "User" },
    viewer: { vi: "Người xem", en: "Viewer" }
  }

  STATUS_MAPPING: {
    active: { vi: "Hoạt động", en: "Active" },
    inactive: { vi: "Không hoạt động", en: "Inactive" },
    pending: { vi: "Đang chờ", en: "Pending" }
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.7 - UserSearchFeature",
    relationship: "Complements search with advanced filtering",
    integration: "Both modify URL and affect list display"
  },
  {
    pattern: "12.1 - CreateUserFeature",
    relationship: "Filter shows users created by this pattern",
    integration: "Query invalidation coordination"
  }
]
```

---

## Performance Considerations

```pseudo
PERFORMANCE {
  OPTIMIZATIONS: {
    url_state_persistence: "Filters survive page refresh",
    callback_debouncing: "Not needed (URL updates on apply only)",
    memoization: "Useless render prevention"
  }

  USER_EXPERIENCE: {
    sheet_animation: "Smooth slide-in transition",
    badge_feedback: "Visual count of active filters",
    clear_action: "One-click to reset all"
  }
}
```

---

**End of Pattern 12.6**

*Feature component pattern for user filtering*
*URL-based state persistence with multi-criteria filters*
