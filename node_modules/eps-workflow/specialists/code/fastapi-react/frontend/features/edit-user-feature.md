# Pattern 12.2: EditUserFeature

**Role**: User editing feature with pre-filled data and optimistic updates
**Focus**: Dialog-based user editing with dirty state detection
**Technology**: React 19, TypeScript 5, React Hook Form, Zod, TanStack Query v5
**Domain**: Vietnamese legal platform (Người Dùng)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE EditUserFeature {
  PURPOSE: "Edit existing users with pre-filled data and optimistic UI updates"

  RESPONSIBILITIES: [
    "Load user data into form fields",
    "Detect form changes (isDirty)",
    "Handle optimistic updates for instant feedback",
    "Rollback on error with server data",
    "Invalidate related queries on success"
  ]

  TECH_STACK: {
    primary: "React Hook Form + Zod validation",
    state_management: "TanStack Query mutations with optimistic updates",
    ui_components: "Shadcn/ui Dialog",
    patterns: ["optimistic-updates", "dirty-state-detection"]
  }

  DOMAIN_CONTEXT: {
    entities: ["Người Dùng (User)", "Vai Trò (Role)"],
    operations: ["Update", "Rollback"],
    key_fields: ["name", "email", "role", "department", "phone"]
  }
}
```

---

## Workflow: EditUserFeature_Workflow

```pseudo
WORKFLOW EditUserFeature {
  INPUT: {
    user: User,
    open: boolean,
    onOpenChange: (open: boolean) => void
  }

  PRECONDITIONS: [
    "User data is available and valid",
    "Dialog is mounted",
    "User has edit permission"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_LOAD_USER_DATA {
  description: "Initialize form with user data"
  logic: |
    USER_DATA = {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      phone: user.phone || ''
    }

    FORM = useForm({
      resolver: zodResolver(createUserSchema),
      defaultValues: USER_DATA
    })

    RETURN FORM
}

STEP_2_RESET_ON_USER_CHANGE {
  description: "Reset form when user prop changes"
  logic: |
    useEffect(() => {
      IF open THEN
        FORM.reset({
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || '',
          phone: user.phone || ''
        })
      END IF
    }, [user, open])
}

STEP_3_SETUP_OPTIMISTIC_MUTATION {
  description: "Configure mutation with optimistic updates"
  logic: |
    MUTATION = useMutation({
      mutationFn: (data) => CALL editUser(user.id, data),

      onMutate: async (newData) => {
        // Cancel outgoing queries
        AWAIT queryClient.cancelQueries(['users', user.id])

        // Snapshot previous data
        previousUser = queryClient.getQueryData(['users', user.id])

        // Optimistically update UI
        queryClient.setQueryData(['users', user.id], {
          ...user,
          ...newData
        })

        RETURN { previousUser }
      },

      onError: (error, _, context) => {
        // Rollback on error
        IF context?.previousUser THEN
          queryClient.setQueryData(['users', user.id], context.previousUser)
        END IF

        SHOW_TOAST({
          title: "Lỗi / Error",
          message: error.message,
          variant: "destructive"
        })
      },

      onSuccess: () => {
        SHOW_TOAST({
          title: "Thành công / Success",
          message: "Người dùng đã được cập nhật / User updated"
        })
        CLOSE_DIALOG()
      },

      onSettled: () => {
        // Refetch to sync with server
        INVALIDATE_QUERY(['users'])
      }
    })

    RETURN MUTATION
}

STEP_4_HANDLE_FORM_SUBMISSION {
  description: "Submit edited data"
  logic: |
    ON_SUBMIT = (data) => {
      IF NOT isDirty THEN
        SHOW_MESSAGE("No changes made")
        RETURN
      END IF

      MUTATION.mutate(data)
    }
}

STEP_5_RENDER_DIALOG {
  description: "Render edit dialog with form"
  logic: |
    FORM_FIELDS = [
      { name: "name", label: "Tên / Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "role", label: "Vai Trò / Role", type: "select" },
      { name: "department", label: "Bộ Phận / Department", type: "text" },
      { name: "phone", label: "Số Điện Thoại / Phone", type: "tel" }
    ]

    RENDER Dialog {
      Header: "Chỉnh Sửa Người Dùng / Edit User",
      Body: RenderFormFields(FORM_FIELDS),
      Footer: [
        CancelButton(disabled: isLoading),
        SaveButton(disabled: isLoading || !isDirty)
      ]
    }
}
```

---

## Key Interfaces

```typescript
interface EditUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'luatsu' | 'user' | 'viewer';
  department?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateUserInput {
  name: string;
  email: string;
  role: 'admin' | 'luatsu' | 'user' | 'viewer';
  department?: string;
  phone?: string;
}

// Mutation context
interface OptimisticUpdateContext {
  previousUser: User;
}
```

---

## Integration Points

```pseudo
INTEGRATION EditUserFeature {
  UI_COMPONENTS: {
    triggers: ["EditButton in UserCard"],
    displays: ["EditUserDialog"]
  }

  STATE_MANAGEMENT: {
    form_state: "React Hook Form (local + dirty)",
    query_data: "TanStack Query cache",
    optimistic_state: "In-memory cache snapshot"
  }

  API_ENDPOINTS: {
    primary: "PATCH /api/v1/users/{id}",
    get_single: "GET /api/v1/users/{id}"
  }

  ERROR_HANDLING: {
    ValidationError: "Show field-level errors",
    OptimisticRollback: "Restore previous user data",
    NetworkError: "Retry with exponential backoff",
    ConflictError: "Show 'User was updated by another user' message"
  }

  QUERY_KEYS: [
    "['users', user.id]",
    "['users']"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  UI_LABELS: {
    vi: {
      title: "Chỉnh Sửa Người Dùng",
      save_button: "Lưu Thay Đổi",
      cancel_button: "Hủy",
      success_message: "Người dùng đã được cập nhật",
      no_changes: "Không có thay đổi nào",
      error_message: "Không thể cập nhật người dùng"
    },
    en: {
      title: "Edit User",
      save_button: "Save Changes",
      cancel_button: "Cancel",
      success_message: "User updated successfully",
      no_changes: "No changes made",
      error_message: "Failed to update user"
    }
  }

  FORM_LABELS: {
    name: "Tên / Name",
    email: "Email",
    role: "Vai Trò / Role",
    department: "Bộ Phận / Department",
    phone: "Số Điện Thoại / Phone"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.1 - CreateUserFeature",
    relationship: "Share same schema and validation",
    integration: "Use same createUserSchema"
  },
  {
    pattern: "12.3 - DeleteUserFeature",
    relationship: "Both modify user data",
    integration: "Coordinate query invalidation"
  }
]
```

---

## Performance Considerations

```pseudo
PERFORMANCE {
  OPTIMIZATIONS: {
    optimistic_updates: "Immediate UI feedback before server",
    dirty_state_detection: "Disable save button if no changes",
    query_caching: "Snapshot + restore on error",
    form_lazy_validation: "Blur + submit only"
  }

  ROLLBACK_STRATEGY: {
    on_error: "Restore previous user data from snapshot",
    user_feedback: "Show error toast with reason",
    retry: "Manual retry through form submission"
  }
}
```

---

**End of Pattern 12.2**

*Feature component pattern for user editing*
*Optimistic updates with error rollback*
