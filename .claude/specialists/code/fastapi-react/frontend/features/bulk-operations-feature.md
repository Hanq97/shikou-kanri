# Pattern 12.28: BulkOperationsFeature

**Role**: Multi-select operations handler with batch execution
**Focus**: Selection state, action execution, progress tracking, error handling
**Technology**: React 19, Zustand, TypeScript
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST BulkOperationsFeature {
  ROLE: "Execute batch operations on selected items with progress tracking"

  RESPONSIBILITIES: [
    "Manage multi-item selection state",
    "Execute bulk actions (approve, reject, delete, etc.)",
    "Track operation progress and failures",
    "Handle rollback and error recovery",
    "Provide operation confirmation UI"
  ]

  TECH_STACK: {
    primary: "React 19, TypeScript, Zustand",
    libraries: ["lucide-react", "@radix-ui/"],
    patterns: ["Zustand Store", "Client Component", "Dialog/Modal"]
  }

  DOMAIN_CONTEXT: {
    industry: "P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["BulkOperation", "BulkAction", "SelectionState"]
  }
}
```

---

## Pattern 12.28: BulkOperationsFeature

### Overview

```pseudo
PATTERN BulkOperationsFeature {
  PURPOSE: "Enable batch operations on multiple selected items"

  PROBLEM: "Users need to perform same action on many items with progress visibility"

  SOLUTION: "Multi-select UI with confirmation, batch execution, progress tracking"

  USE_CASES: [
    "Approve multiple loan applications",
    "Reject multiple insurance claims",
    "Delete multiple customer records",
    "Send notifications to multiple users",
    "Reassign multiple cases to different handlers"
  ]

  COMPLEXITY: "MEDIUM-HIGH"
}
```

### Workflow

```pseudo
WORKFLOW BulkOperationsFeature_Workflow {
  INPUT: {
    selectedIds: Set<string>,
    action: BulkActionType,
    confirmationRequired: boolean,
    onAction: (action, ids) => Promise<void>
  }

  PRECONDITIONS: [
    "At least one item is selected",
    "Action is valid BulkActionType",
    "onAction callback is provided"
  ]

  STEPS: {
    STEP_1_DISPLAY_SELECTION: {
      description: "Show selected items count and action bar"
      logic: |
        selectedCount = selectedIds.size

        IF selectedCount == 0 THEN
          HIDE action bar
          RETURN
        END IF

        SHOW action bar WITH {
          text: selectedCount + " mục được chọn",
          actions_dropdown: BULK_ACTIONS
        }
    }

    STEP_2_VALIDATE_ACTION: {
      description: "Validate selected action is available"
      logic: |
        IF action IS_NULL THEN
          THROW ERROR "Action not selected"
        END IF

        action_config = FIND action IN BULK_ACTIONS

        IF action_config IS_NULL THEN
          THROW ERROR "Invalid action: " + action
        END IF
    }

    STEP_3_REQUEST_CONFIRMATION: {
      description: "Show confirmation dialog if required"
      logic: |
        action_config = FIND action IN BULK_ACTIONS

        IF action_config.requiresConfirmation THEN
          SHOW AlertDialog {
            title: action_config.label + " - Xác nhận",
            description: "Bạn có chắc chắn muốn " + action + " " + selectedCount + " mục?",
            actions: ["Cancel", "Confirm"]
          }

          IF user_clicks_cancel THEN
            RETURN
          END IF
        END IF
    }

    STEP_4_START_OPERATION: {
      description: "Initialize bulk operation and show progress"
      logic: |
        SET bulkStore.startOperation(action)
        SET bulkStore.total = selectedIds.size

        SHOW BulkProgress Dialog WITH {
          title: action + " - Đang xử lý",
          progress_bar: 0%,
          status: "processing"
        }
    }

    STEP_5_EXECUTE_BATCH: {
      description: "Execute action on each item with progress updates"
      logic: |
        completed = 0
        failed = 0
        errors = []

        FOR EACH id IN selectedIds:
          TRY:
            CALL onAction(action, [id])
            completed = completed + 1
          CATCH error:
            failed = failed + 1
            errors.APPEND({
              id: id,
              action: action,
              error: error.message,
              timestamp: NOW()
            })
          END TRY

          CALL bulkStore.updateProgress(completed, selectedIds.size)
        END FOR
    }

    STEP_6_HANDLE_RESULTS: {
      description: "Display completion status with error summary"
      logic: |
        total = selectedIds.size

        IF failed == 0 THEN
          SHOW TOAST {
            title: "Thành công (Success)",
            description: total + " mục đã được " + action,
            variant: "success"
          }
        ELSE:
          SHOW TOAST {
            title: "Hoàn thành với lỗi",
            description: completed + " thành công, " + failed + " thất bại",
            variant: "warning"
          }

          SHOW error summary WITH {
            first_3_errors: errors.slice(0, 3),
            total_errors: errors.length
          }
        END IF

        CLOSE progress dialog
        CLEAR selection
        CLEAR errors
    }
  }

  ERROR_HANDLING: {
    ValidationError: "Show toast with validation message",
    NetworkError: "Add to error list and continue with next item",
    AuthorizationError: "Stop operation and show auth error",
    TimeoutError: "Retry with exponential backoff (max 3 attempts)"
  }

  OUTPUT: {
    success: boolean,
    action: BulkActionType,
    processed: number,
    completed: number,
    failed: number,
    errors: BulkOperationError[],
    duration: number
  }

  POSTCONDITIONS: [
    "Selection is cleared after operation",
    "Errors are reported to user",
    "Progress bar is removed",
    "UI is updated with operation results"
  ]
}
```

### Key Interfaces

```typescript
// Action types
type BulkActionType =
  | 'delete' | 'approve' | 'reject' | 'activate' | 'deactivate'
  | 'export' | 'sendNotification' | 'reassign' | 'updateStatus';

interface BulkAction {
  id: string;
  type: BulkActionType;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  color?: 'default' | 'destructive' | 'outline';
  requiresConfirmation?: boolean;
  requiresInput?: boolean;
}

// Operation state
interface BulkOperationState {
  selectedIds: Set<string>;
  isExecuting: boolean;
  currentAction?: BulkActionType;
  progress: number;
  total: number;
  completed: number;
  failed: number;
  errors: BulkOperationError[];
}

interface BulkOperationError {
  id: string;
  action: BulkActionType;
  error: string;
  timestamp: string;
}

interface BulkOperationResult {
  success: boolean;
  action: BulkActionType;
  processed: number;
  completed: number;
  failed: number;
  errors: BulkOperationError[];
  duration: number;
}

interface SelectionState {
  selectedIds: string[];
  totalCount: number;
  selectAll: boolean;
  pageSelected: boolean;
}

// Store type
interface BulkStore extends BulkOperationState {
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  startOperation: (action: string) => void;
  updateProgress: (completed: number, total: number) => void;
  addError: (id: string, action: string, error: string) => void;
  clearSelection: () => void;
}

// Function signatures
const useBulkStore: () => BulkStore;
async function executeBulkAction(
  action: BulkActionType,
  ids: string[]
): Promise<BulkOperationResult>;
```

### Integration Points

```pseudo
INTEGRATION BulkOperationsFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["BulkActionsBar", "SelectAllCheckbox"],
    displays: ["BulkProgress", "ErrorSummary", "SuccessToast"]
  }

  STATE_MANAGEMENT: {
    client_state: "Zustand store (selection, operation state)",
    server_state: "TanStack Query (operation results caching)",
    persistence: "SessionStorage (selection across page reload)"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/batch/execute",
    fallback: "Individual item endpoints called in sequence"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui", "@/shared/hooks"],
    external: ["zustand", "lucide-react", "@radix-ui/"]
  }

  ERROR_HANDLING: {
    network_errors: "Add to error list, continue with next item",
    validation_errors: "Show in error summary after operation",
    auth_errors: "Stop operation, redirect to login",
    timeout_errors: "Retry with exponential backoff (max 3 attempts)"
  }

  EVENTS: {
    emits: ["onBulkStart", "onBulkProgress", "onBulkComplete", "onBulkError"],
    listens: ["onItemSelected", "onActionConfirmed", "onOperationCancelled"]
  }
}
```

### Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    BulkAction: {
      vietnamese_term: "Hành động hàng loạt",
      examples: ["Phê duyệt (approve)", "Từ chối (reject)", "Xóa (delete)"]
    },
    SelectionState: {
      vietnamese_term: "Trạng thái chọn",
      tracks: ["Selected items", "Select all toggle", "Indeterminate state"]
    },
    BulkOperationError: {
      vietnamese_term: "Lỗi hành động hàng loạt",
      includes: ["Item ID", "Error message", "Timestamp"]
    }
  }

  BUSINESS_RULES: {
    selection_persistence: "Clear after operation completion",
    confirmation_required: "Destructive actions require confirmation",
    error_reporting: "Show error summary after operation",
    max_batch_size: "No hard limit, but UI shows progress for >10 items"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    action_labels: "Vietnamese action names with English fallback",
    error_messages: "Bilingual error reporting"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.27 - ImportDataFeature",
    relationship: "Imports data that can be bulk-operated",
    integration: "Shares BulkOperationError types"
  },
  {
    pattern: "Pattern 12.29 - AdvancedFilterFeature",
    relationship: "Filter results can be bulk-operated",
    integration: "Works together in table workflows"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Technology Docs**: [React 19](https://react.dev)

**End of Pattern 12.28**
