# Column Customization Feature (Pattern 12.33)

**Role**: Dynamic column visibility, reordering, and customization handler
**Focus**: Drag-and-drop column reordering, visibility toggle, width adjustment
**Technology**: React 19, TypeScript, @dnd-kit/core, Zustand
**Domain**: Vietnamese P2P insurance & lending table customization
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST ColumnCustomizationFeature {
  ROLE: "Dynamic column visibility, ordering, and customization management"

  RESPONSIBILITIES: [
    "Render column customization dropdown with drag-and-drop reordering",
    "Toggle column visibility (show/hide columns)",
    "Manage column order persistence",
    "Handle drag-and-drop operations with accessibility",
    "Validate column configuration before applying changes",
    "Persist user preferences to localStorage"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    libraries: ["@dnd-kit/core", "@dnd-kit/sortable", "lucide-react", "zustand"],
    patterns: ["Drag-and-Drop", "State Management", "Persistence"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Column", "ColumnDef", "ColumnOrder", "UserPreferences"]
  }
}
```

---

## Pattern 12.33: ColumnCustomizationFeature

### Overview

```pseudo
PATTERN ColumnCustomizationFeature {
  PURPOSE: "Allow users to customize table columns: visibility, ordering, and width"

  PROBLEM: |
    Data tables often display many columns, but users need to:
    - Hide irrelevant columns (reduce visual clutter)
    - Reorder columns to match their workflow
    - Resize columns for better readability
    - Save preferences across sessions
    - Access customization without disrupting workflow

  SOLUTION: |
    Implement column customization via dropdown menu with:
    - Drag-and-drop interface for reordering (@dnd-kit)
    - Toggle buttons for visibility (eye/eye-off icons)
    - Settings button that opens customization menu
    - Keyboard navigation support (Tab, Enter, arrow keys)
    - Automatic persistence to localStorage
    - Validation of column configuration

  USE_CASES: [
    "User hides non-essential columns to focus on key data",
    "User reorders columns to match their preferred workflow",
    "User restores column visibility after hiding",
    "User reopens table and previous column settings are applied",
    "User exports data respecting column customization"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW ColumnCustomizationFeature_Workflow {
  INPUT: {
    columns: Array<ColumnDef>,
    onColumnsChange: Function,
    options?: CustomizationOptions
  }

  PRECONDITIONS: [
    "columns array must not be empty",
    "each column must have unique id",
    "each column must have label property",
    "onColumnsChange must be callable",
    "visible columns must be >= 1"
  ]

  STEPS: {
    STEP_1_INITIALIZE_STATE: {
      description: "Initialize column state from props and localStorage"
      logic: |
        savedConfig = LOAD_FROM_STORAGE("column_config")

        IF savedConfig.isValid() THEN
          items = MERGE(columns, savedConfig)
        ELSE
          items = CLONE(columns)
        END IF

        validators = INITIALIZE_DRAG_VALIDATORS()
        sensors = INITIALIZE_SENSORS(["pointer", "keyboard"])
    }

    STEP_2_RENDER_CUSTOMIZATION_DROPDOWN: {
      description: "Render settings button and dropdown menu"
      logic: |
        RENDER DropdownMenu {
          TRIGGER = Settings2Icon

          CONTENT {
            LABEL = "Tùy chỉnh cột (Customize columns)"

            DndContext {
              sensors: sensors,
              collisionDetection: closestCenter,
              onDragEnd: handleDragEnd
            } {
              FOR EACH column IN items:
                RENDER SortableColumn {
                  column: column,
                  isDragging: isDragging,
                  onToggle: toggleVisibility,
                  draggableProps: getSortableProps()
                }
              END FOR
            }
          }
        }
    }

    STEP_3_HANDLE_DRAG_AND_DROP: {
      description: "Process drag-and-drop reordering"
      logic: |
        FUNCTION handleDragEnd(event) {
          SET {active, over} = event

          IF over AND active.id != over.id THEN
            oldIndex = FIND_INDEX(active.id, items)
            newIndex = FIND_INDEX(over.id, items)

            newOrder = ARRAY_MOVE(items, oldIndex, newIndex)
            SET items = newOrder

            CALL onColumnsChange(newOrder)
            SAVE_TO_STORAGE("column_config", {
              order: newOrder,
              timestamp: NOW()
            })
          END IF
        }
    }

    STEP_4_TOGGLE_VISIBILITY: {
      description: "Toggle column visibility"
      logic: |
        FUNCTION toggleVisibility(columnId) {
          visibleCount = COUNT(items WHERE visible == true)

          IF items[columnId].visible == true AND visibleCount <= 1 THEN
            SHOW_TOAST("Phải có ít nhất một cột hiển thị")
            RETURN
          END IF

          updated = items.map((col) =>
            col.id == columnId ? {...col, visible: !col.visible} : col
          )

          SET items = updated
          CALL onColumnsChange(updated)
          SAVE_TO_STORAGE("column_config", updated)
        }
    }

    STEP_5_VALIDATE_CONFIGURATION: {
      description: "Validate column configuration"
      logic: |
        IF COUNT(items WHERE visible == true) == 0 THEN
          THROW ERROR "At least one column must be visible"
        END IF

        FOR EACH column IN items:
          IF column.id IS_NULL OR column.label IS_NULL THEN
            THROW ERROR "Column missing required properties"
          END IF
        END FOR
    }
  }

  ERROR_HANDLING: {
    DragError: "Revert to previous order, show error toast",
    ValidationError: "Prevent change, show validation message",
    PersistenceError: "Cache in memory, retry persistence on next action"
  }

  OUTPUT: {
    success: boolean,
    columns: Array<ColumnDef>,
    state: {
      dragActive: boolean,
      visibleCount: number,
      userPreferences: ColumnConfig
    }
  }

  POSTCONDITIONS: [
    "Column order is updated in parent component",
    "At least one column remains visible",
    "Changes are persisted to localStorage",
    "UI reflects current column state"
  ]
}
```

### Key Interfaces

```typescript
// Column definition
interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
  sortable?: boolean;
  resizable?: boolean;
}

// Component props
interface ColumnCustomizationProps {
  columns: ColumnDef[];
  onColumnsChange: (columns: ColumnDef[]) => void;
  allowResize?: boolean;
  allowReorder?: boolean;
}

// Drag event type
interface DragEvent {
  active: { id: string };
  over: { id: string };
}

// Configuration persistence
interface ColumnConfig {
  columns: ColumnDef[];
  timestamp: number;
  version: number;
}

// Helper function signatures (no implementation)
function validateColumnConfig(columns: ColumnDef[]): boolean;
function mergeWithSavedConfig(columns: ColumnDef[], saved: ColumnConfig): ColumnDef[];
export function ColumnCustomization(props: ColumnCustomizationProps): JSX.Element;
```

### Integration Points

```pseudo
INTEGRATION ColumnCustomizationFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["Button (Settings2 icon)", "DropdownMenuTrigger"],
    displays: ["DropdownMenuContent", "SortableContext", "DndContext"]
  }

  STATE_MANAGEMENT: {
    client_state: "Local useState for drag state",
    preferences: "Zustand store for column preferences",
    persistence: "LocalStorage (column_config key)"
  }

  API_INTEGRATION: {
    save_preferences: "PUT /api/v1/user/column-preferences",
    load_preferences: "GET /api/v1/user/column-preferences",
    sync_on_login: "Load preferences when user authenticates"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/dropdown-menu", "@/shared/ui/button"],
    external: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities", "lucide-react"]
  }

  ERROR_HANDLING: {
    drag_error: "Show toast, revert to previous order",
    invalid_config: "Prevent save, show validation error",
    persistence_error: "Keep in memory, sync on next opportunity",
    api_error: "Fall back to localStorage"
  }

  EVENTS: {
    emits: ["onColumnsChange", "onDragStart", "onDragEnd", "onVisibilityChange"],
    listens: ["onTableRefresh", "onUserPreferencesLoad"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User customizes visible columns and reorders them"

  FLOW: {
    STEP_1: |
      User clicks Settings icon on table header
      System opens ColumnCustomization dropdown
      Shows all columns with visibility toggles and drag handles

    STEP_2: |
      User hides "Status" column by clicking eye-off icon
      System CALLS onColumnsChange with updated columns
      System saves to localStorage immediately
      "Status" column disappears from table

    STEP_3: |
      User drags "Email" column above "Name" column
      System detects drag event
      System reorders items array
      System CALLS onColumnsChange with new order
      Table header updates to reflect new column order

    STEP_4: |
      User closes dropdown menu
      System persists final configuration
      User refreshes page
      Column customization is restored from localStorage
  }

  PSEUDO_CODE: |
    // In table component
    CONST [columns, setColumns] = useState(defaultColumns)

    FUNCTION handleColumnsChange(newColumns) {
      SET columns = newColumns

      // Persist to storage
      SAVE_TO_STORAGE("column_config", {
        columns: newColumns,
        timestamp: NOW()
      })

      // Optional: sync to server
      IF userLoggedIn THEN
        CALL apiClient.put("/user/preferences", {
          columns: newColumns
        })
      END IF
    }

    RETURN (
      Table {
        columns: columns.filter(c => c.visible),
        data: tableData,
        footer: (
          ColumnCustomization {
            columns: columns,
            onColumnsChange: handleColumnsChange
          }
        )
      }
    )
}
```

### Accessibility Features

```pseudo
ACCESSIBILITY ColumnCustomizationFeature_Accessibility {
  KEYBOARD_NAVIGATION: {
    tab: "Move focus through column items",
    enter: "Toggle visibility of focused column",
    space: "Activate drag handle",
    arrow_up: "Move column up in order",
    arrow_down: "Move column down in order",
    escape: "Close dropdown menu"
  }

  SCREEN_READER_SUPPORT: {
    labels: "Each column has aria-label with name and visibility status",
    descriptions: "Drag handle has aria-description",
    live_regions: "Announce reorder actions with aria-live",
    role_definitions: "DndContext has proper ARIA roles"
  }

  FOCUS_MANAGEMENT: {
    initial_focus: "First column item",
    trap_focus: "Keep focus within dropdown",
    restore_focus: "Return to trigger button after close"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.30 - DataTableFeature",
    relationship: "Provides column definitions to DataTable",
    integration: "DataTable applies column visibility and order"
  },
  {
    pattern: "Pattern 12.32 - PaginationFeature",
    relationship: "Coordinates column width with pagination spacing",
    integration: "May adjust pagination when columns change"
  },
  {
    pattern: "Pattern 12.34 - SavedFiltersFeature",
    relationship: "Can include column config in filter presets",
    integration: "Restore columns along with filters"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **DnD Library**: [dnd-kit Documentation](https://docs.dndkit.com)
- **React Documentation**: [React 19 Hooks](https://react.dev)
- **Accessibility**: [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Pattern Classification**: UI Component | Drag-and-Drop | User Customization
**Complexity Level**: HIGH
**Estimated Implementation Time**: 4-5 hours
**Test Coverage Target**: 90%+
**Bundle Size**: ~15KB (with @dnd-kit dependencies)

