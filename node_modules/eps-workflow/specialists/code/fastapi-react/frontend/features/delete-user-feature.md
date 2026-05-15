# Pattern 12.3: DeleteUserFeature

**Role**: User deletion feature with confirmation dialog
**Focus**: Safe deletion with warning and error handling
**Technology**: React 19, TypeScript 5, TanStack Query v5, AlertDialog
**Domain**: Vietnamese legal platform (Người Dùng)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE DeleteUserFeature {
  PURPOSE: "Safely delete users with confirmation and related data cleanup"

  RESPONSIBILITIES: [
    "Display confirmation dialog with warnings",
    "Prevent accidental deletion with clear messaging",
    "Handle deletion mutation",
    "Invalidate user queries on success",
    "Show appropriate error messages"
  ]

  TECH_STACK: {
    primary: "TanStack Query mutations",
    ui_components: "Shadcn/ui AlertDialog",
    domain: "User entity deletion with cascading cleanup"
  }

  DOMAIN_CONTEXT: {
    entities: ["Người Dùng (User)"],
    operations: ["Delete (irreversible)", "Cascading cleanup"],
    warnings: ["Related data will be deleted", "Action cannot be undone"]
  }
}
```

---

## Workflow: DeleteUserFeature_Workflow

```pseudo
WORKFLOW DeleteUserFeature {
  INPUT: {
    user: User,
    open: boolean,
    onOpenChange: (open: boolean) => void
  }

  PRECONDITIONS: [
    "User data is available",
    "User is not current logged-in user",
    "User has delete permission"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_DISPLAY_CONFIRMATION {
  description: "Show delete confirmation dialog with warnings"
  logic: |
    RENDER AlertDialog {
      Title: "Xóa Người Dùng / Delete User?",
      Description: "Hành động này không thể hoàn tác. {user.name} sẽ bị xóa vĩnh viễn. / This action cannot be undone. {user.name} will be permanently deleted.",
      WarningBox: "Cảnh báo / Warning: Tất cả dữ liệu liên quan sẽ bị xóa. / All related data will be deleted."
    }
}

STEP_2_SETUP_MUTATION {
  description: "Configure deletion mutation"
  logic: |
    MUTATION = useMutation({
      mutationFn: () => CALL deleteUser(user.id),

      onSuccess: () => {
        SHOW_TOAST({
          title: "Đã xóa / Deleted",
          message: "{user.name} đã được xóa / has been deleted"
        })

        INVALIDATE_QUERY(['users'])
        CLOSE_DIALOG()
      },

      onError: (error: Error) => {
        SHOW_TOAST({
          title: "Lỗi / Error",
          message: error.message,
          variant: "destructive"
        })
      }
    })

    RETURN MUTATION
}

STEP_3_HANDLE_CONFIRM {
  description: "Handle delete confirmation click"
  logic: |
    ON_CONFIRM_CLICK = () => {
      IF MUTATION.isPending THEN
        LOG("Already deleting, ignore")
        RETURN
      END IF

      MUTATION.mutate()
    }
}

STEP_4_HANDLE_CANCEL {
  description: "Handle cancel click"
  logic: |
    ON_CANCEL_CLICK = () => {
      CLOSE_DIALOG()
    }
}

STEP_5_UPDATE_BUTTON_STATES {
  description: "Disable buttons during deletion"
  logic: |
    isLoading = MUTATION.isPending

    DELETE_BUTTON = {
      disabled: isLoading,
      loading_text: "Đang xóa... / Deleting...",
      normal_text: "Xóa / Delete",
      style: "destructive (red)"
    }

    CANCEL_BUTTON = {
      disabled: isLoading,
      text: "Hủy / Cancel"
    }
}
```

---

## Key Interfaces

```typescript
interface DeleteUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'luatsu' | 'user' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
}
```

---

## Integration Points

```pseudo
INTEGRATION DeleteUserFeature {
  UI_COMPONENTS: {
    triggers: ["DeleteButton in UserActions"],
    displays: ["AlertDialog"],
    feedback: ["useToast()"]
  }

  STATE_MANAGEMENT: {
    mutation_state: "TanStack Query",
    dialog_state: "Parent state (open prop)"
  }

  API_ENDPOINTS: {
    primary: "DELETE /api/v1/users/{id}"
  }

  QUERY_INVALIDATION: [
    "['users']",
    "['user-count']",
    "['user', user.id]"
  ]

  ERROR_HANDLING: {
    PermissionError: "Show 'You do not have permission' message",
    NotFoundError: "Show 'User already deleted' message",
    ValidationError: "Show 'Cannot delete this user' with reason",
    NetworkError: "Retry logic with toast notification"
  }

  CASCADING_EFFECTS: {
    on_success: [
      "Delete from users list",
      "Update user count",
      "Clear user details cache",
      "Close any open user editing dialogs"
    ]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  MESSAGES: {
    title: "Xóa Người Dùng / Delete User?",
    description: "Hành động này không thể hoàn tác. {name} sẽ bị xóa vĩnh viễn.",
    warning: "Cảnh báo: Tất cả dữ liệu liên quan sẽ bị xóa.",
    delete_button: "Xóa / Delete",
    cancel_button: "Hủy / Cancel",
    success_toast: "Đã xóa / Deleted",
    success_message: "{name} đã được xóa thành công",
    error_toast: "Lỗi / Error",
    deleting_text: "Đang xóa... / Deleting..."
  }

  VALIDATION: {
    cannot_delete_self: "Cannot delete your own account",
    cannot_delete_admin: "Cannot delete last admin user",
    cannot_delete_with_active_cases: "Cannot delete user with active cases"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.1 - CreateUserFeature",
    relationship: "Inverse operation",
    integration: "Query invalidation coordination"
  },
  {
    pattern: "12.6 - UserFiltersFeature",
    relationship: "Removes user from filtered list",
    integration: "Query key coordination"
  }
]
```

---

## Error Scenarios

```pseudo
ERROR_SCENARIOS {
  SCENARIO_1_PERMISSION_DENIED: |
    User clicks delete but lacks permission
    SYSTEM shows error: "Bạn không có quyền xóa người dùng này / You do not have permission"
    Dialog remains open for retry

  SCENARIO_2_USER_NOT_FOUND: |
    User was already deleted by another session
    SYSTEM shows error: "Người dùng không tồn tại / User not found"
    Close dialog and refresh list

  SCENARIO_3_HAS_DEPENDENCIES: |
    User has active cases or documents
    SYSTEM shows error: "Không thể xóa người dùng có vụ án đang hoạt động / Cannot delete user with active cases"
    Suggest archive instead

  SCENARIO_4_NETWORK_ERROR: |
    Network error during deletion
    SYSTEM shows error with retry button
    Keep dialog open for manual retry
}
```

---

## Safety Features

```pseudo
SAFETY {
  CONFIRMATION_REQUIRED: "Must show dialog before deletion",
  WARNING_MESSAGE: "Clear about irreversible action",
  BUTTON_STYLING: "Red/destructive color for delete button",
  BUTTON_DISABLING: "Disable buttons during operation",
  TOAST_NOTIFICATION: "Always show confirmation or error toast",
  NO_UNDO: "No undo mechanism (by design)"
}
```

---

**End of Pattern 12.3**

*Feature component pattern for user deletion*
*Confirmation dialog with safety features*
