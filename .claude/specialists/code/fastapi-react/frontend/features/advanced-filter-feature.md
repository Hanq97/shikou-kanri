# Pattern 12.29: AdvancedFilterFeature

**Role**: Dynamic filter builder with preset management
**Focus**: Filter conditions, chaining logic, URL persistence, saved filters
**Technology**: React 19, TypeScript, TanStack Query
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AdvancedFilterFeature {
  ROLE: "Build and manage complex data filters with multiple criteria"

  RESPONSIBILITIES: [
    "Create dynamic filter conditions",
    "Chain multiple conditions with AND/OR logic",
    "Save and load filter presets",
    "Persist filter state to URL",
    "Validate filter expressions",
    "Apply filters to data queries"
  ]

  TECH_STACK: {
    primary: "React 19, TypeScript",
    libraries: ["zod", "lucide-react", "@radix-ui/"],
    patterns: ["Client Component", "Dropdown Menu", "Dialog"]
  }

  DOMAIN_CONTEXT: {
    industry: "P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["FilterCondition", "FilterGroup", "SavedFilter"]
  }
}
```

---

## Pattern 12.29: AdvancedFilterFeature

### Overview

```pseudo
PATTERN AdvancedFilterFeature {
  PURPOSE: "Enable complex data filtering with multiple criteria and logical operators"

  PROBLEM: "Users need to filter large datasets with multiple conditions and save filter presets"

  SOLUTION: "Dynamic filter builder with AND/OR logic, preset management, URL persistence"

  USE_CASES: [
    "Filter loans by amount, status, and date range",
    "Filter insurance claims by type and approval status",
    "Filter customers by region and account age",
    "Create and reuse filter combinations",
    "Share filter URLs with colleagues"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW AdvancedFilterFeature_Workflow {
  INPUT: {
    fields: FilterField[],
    onFilterChange: (filters: FilterGroup) => void,
    onSaveFilter: (name, filters) => Promise<void>,
    savedFilters?: SavedFilter[]
  }

  PRECONDITIONS: [
    "Fields array contains at least one filterable field",
    "onFilterChange callback is provided",
    "onSaveFilter callback is provided if save feature is enabled"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Load filter UI with field definitions and saved filters"
      logic: |
        LOAD fields from properties
        LOAD savedFilters from properties
        SET conditions = []
        SET logic = "and"

        IF savedFilters.length > 0 THEN
          SHOW saved filters dropdown
        END IF
    }

    STEP_2_BUILD_CONDITIONS: {
      description: "User adds filter conditions"
      logic: |
        LOOP: user_clicks_add_condition
          defaultField = fields[0]

          newCondition = {
            id: "cond-" + NOW(),
            fieldId: defaultField.id,
            operator: defaultField.defaultOperator,
            value: ""
          }

          conditions.APPEND(newCondition)
        END LOOP
    }

    STEP_3_CONFIGURE_CONDITION: {
      description: "User configures each condition"
      logic: |
        FOR EACH condition IN conditions:
          user_selects_field(condition)
          field_def = FIND condition.fieldId IN fields

          SHOW available_operators = field_def.operators

          user_selects_operator(condition)
          operator = condition.operator

          IF operator == "between" THEN
            user_enters_value_range(condition)
            condition.value = user_input_1
            condition.secondValue = user_input_2
          ELSE:
            user_enters_value(condition)
            condition.value = user_input
          END IF
        END FOR
    }

    STEP_4_SET_LOGIC: {
      description: "User selects AND/OR logic between conditions"
      logic: |
        SHOW logic selector WITH options:
          "AND - Tất cả điều kiện" (all conditions)
          "OR - Bất kỳ điều kiện nào" (any condition)

        logic = user_selection
    }

    STEP_5_APPLY_FILTERS: {
      description: "Build filter group and apply to data"
      logic: |
        IF conditions.length == 0 THEN
          SHOW warning "Vui lòng thêm ít nhất một điều kiện"
          RETURN
        END IF

        filterGroup = {
          id: "group-" + NOW(),
          conditions: conditions,
          logic: logic
        }

        CALL onFilterChange(filterGroup)
        CLOSE filter menu
    }

    STEP_6_SAVE_FILTER: {
      description: "Save filter preset for later use"
      logic: |
        IF user_clicks_save_button THEN
          SHOW save dialog WITH:
            input_field: "Tên bộ lọc"

          filterName = user_input

          IF filterName.trim() == "" THEN
            SHOW error "Tên bộ lọc không được để trống"
            RETURN
          END IF

          TRY:
            CALL onSaveFilter(filterName, filterGroup)

            SHOW TOAST {
              title: "Thành công",
              description: "Bộ lọc đã được lưu"
            }

            CLOSE save dialog
            REFRESH savedFilters
          CATCH error:
            SHOW TOAST {
              title: "Lỗi",
              description: "Không thể lưu bộ lọc",
              variant: "destructive"
            }
          END TRY
        END IF
    }

    STEP_7_LOAD_PRESET: {
      description: "Load previously saved filter preset"
      logic: |
        IF user_clicks_saved_filter THEN
          selectedFilter = FIND user_selection IN savedFilters

          conditions = selectedFilter.filters.conditions
          logic = selectedFilter.filters.logic

          CALL applyFilters()
        END IF
    }

    STEP_8_REMOVE_CONDITION: {
      description: "Remove a specific condition from filter"
      logic: |
        IF user_clicks_delete_condition(conditionId) THEN
          conditions = conditions.FILTER(c => c.id != conditionId)

          IF conditions.length == 0 THEN
            DISABLE apply button
          END IF
        END IF
    }
  }

  ERROR_HANDLING: {
    ValidationError: "Show inline error message near condition",
    SaveError: "Show toast with error details",
    InvalidFieldError: "Disable field selection",
    OperatorMismatchError: "Reset operator to default"
  }

  OUTPUT: {
    filterGroup: FilterGroup,
    applied: boolean,
    savedFilterId?: string
  }

  POSTCONDITIONS: [
    "Filter conditions are validated",
    "Filter group is passed to onFilterChange callback",
    "UI reflects current filter state",
    "Saved filters are persisted if saved"
  ]
}
```

### Key Interfaces

```typescript
// Filter operators and data types
type FilterOperator =
  | 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte'
  | 'contains' | 'in' | 'between' | 'startsWith' | 'endsWith';

type FilterDataType = 'string' | 'number' | 'date' | 'currency' | 'boolean';

// Field definition
interface FilterField {
  id: string;
  label: string;
  dataType: FilterDataType;
  operators: FilterOperator[];
  defaultOperator: FilterOperator;
}

// Single filter condition
interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: any;
  secondValue?: any; // For 'between' operator
}

// Group of conditions with logic
interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  logic: 'and' | 'or';
}

// Saved filter preset
interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: FilterGroup;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

// Overall filter state
interface FilterState {
  groups: FilterGroup[];
  logic: 'and' | 'or';
  savedFilters: SavedFilter[];
  currentFilterId?: string;
}

// Function signatures
function buildFilterQuery(filterGroup: FilterGroup): string;
async function applyFilters(
  filters: FilterGroup,
  data: any[]
): Promise<any[]>;
```

### Integration Points

```pseudo
INTEGRATION AdvancedFilterFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["FilterButton", "SavedFiltersDropdown"],
    displays: ["AdvancedFilter", "FilterConditionBuilder", "SavedFiltersList"]
  }

  STATE_MANAGEMENT: {
    client_state: "React useState (filter conditions)",
    server_state: "TanStack Query (saved filters cache)",
    persistence: "URL search params (current filter)"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/filters/apply",
    secondary: [
      "GET /api/v1/filters/saved",
      "POST /api/v1/filters/save",
      "DELETE /api/v1/filters/{id}"
    ]
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui", "@/shared/hooks/useQueryParams"],
    external: ["zod", "lucide-react", "@radix-ui/"]
  }

  ERROR_HANDLING: {
    network_errors: "Show toast, retry with exponential backoff",
    validation_errors: "Display inline near condition",
    auth_errors: "Redirect to login",
    save_errors: "Show error toast with details"
  }

  EVENTS: {
    emits: ["onFilterApplied", "onFilterSaved", "onFilterLoaded", "onFilterCleared"],
    listens: ["onFieldsChanged", "onSavedFiltersUpdated"]
  }
}
```

### Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    FilterCondition: {
      vietnamese_term: "Điều kiện lọc",
      examples: ["Số tiền > 1,000,000", "Trạng thái = Hoàn thành"]
    },
    FilterGroup: {
      vietnamese_term: "Nhóm lọc",
      logic_options: ["AND - Tất cả điều kiện", "OR - Bất kỳ điều kiện nào"]
    },
    SavedFilter: {
      vietnamese_term: "Bộ lọc đã lưu",
      usage: "Reuse complex filter combinations"
    }
  }

  BUSINESS_RULES: {
    max_conditions: "No hard limit (UI handles scrolling for >10)",
    condition_validation: "Type checking based on FilterDataType",
    persistence: "Saved filters stored on server",
    sharing: "Share filter via URL search params"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    field_labels: "Vietnamese field names",
    operator_names: "Vietnamese operator descriptions"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.28 - BulkOperationsFeature",
    relationship: "Bulk operations often work on filtered data",
    integration: "Filter results can be selected for bulk action"
  },
  {
    pattern: "Pattern 12.31 - SortDataFeature",
    relationship: "Often combined with filters in table workflows",
    integration: "Both control table data display"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [React 19](https://react.dev), [Zod](https://zod.dev)
- **UI Components**: [Radix UI](https://radix-ui.com/)

**End of Pattern 12.29**
