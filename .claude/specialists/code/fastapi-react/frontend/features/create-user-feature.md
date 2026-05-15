# Pattern 12.1: CreateUserFeature

**Role**: User creation feature with form validation and API mutation
**Focus**: Dialog-based user creation with role assignment
**Technology**: React 19, TypeScript 5, React Hook Form, Zod, TanStack Query v5
**Domain**: Vietnamese legal platform (Người Dùng)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE CreateUserFeature {
  PURPOSE: "Create new users with role assignment and department specification"

  RESPONSIBILITIES: [
    "Display create user dialog with form validation",
    "Handle form submission with API mutation",
    "Show success/error notifications",
    "Invalidate users list query on success",
    "Reset form after successful creation"
  ]

  TECH_STACK: {
    primary: "React Hook Form + Zod validation",
    state_management: "TanStack Query v5 mutations",
    ui_components: "Shadcn/ui (Dialog, Input, Select, Button)",
    domain: "User entity with role-based access control"
  }

  DOMAIN_CONTEXT: {
    entities: ["Người Dùng (User)", "Vai Trò (Role)", "Bộ Phận (Department)"],
    roles: ["admin", "luatsu", "user", "viewer"],
    key_fields: ["name", "email", "role", "department", "phone"]
  }
}
```

---

## Workflow: CreateUserFeature_Workflow

### Overview

```pseudo
WORKFLOW CreateUserFeature {
  INPUT: {
    name: string,
    email: string,
    role: 'admin' | 'luatsu' | 'user' | 'viewer',
    department?: string,
    phone?: string
  }

  PRECONDITIONS: [
    "Dialog is open and visible",
    "User has create permission",
    "Form is in initial state"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_FORM {
  description: "Initialize form with validation schema"
  logic: |
    SCHEMA = CreateUserSchema {
      name: required, 2-100 chars,
      email: required, valid email format,
      role: required, enum values,
      department: optional, max 100 chars,
      phone: optional, Vietnam phone format
    }

    FORM = useForm({
      resolver: zodResolver(SCHEMA),
      defaultValues: { role: 'user' }
    })

    RETURN form instance
}

STEP_2_HANDLE_FORM_SUBMISSION {
  description: "Submit form and call API"
  logic: |
    TRY:
      INPUT = extractFormData()

      IF NOT validateInput(INPUT) THEN
        SHOW_ERROR("Validation failed")
        RETURN
      END IF

      RESPONSE = AWAIT api.createUser(INPUT)

      RETURN RESPONSE
    CATCH error:
      LOG_ERROR(error)
      THROW error
    END TRY
}

STEP_3_MUTATION_LIFECYCLE {
  description: "Handle mutation state and callbacks"
  logic: |
    MUTATION = useMutation({
      mutationFn: createUser,

      onSuccess: (userData) => {
        SHOW_TOAST({
          title: "Thành công / Success",
          message: "Người dùng đã được tạo / User created"
        })

        INVALIDATE_QUERY(['users'])
        RESET_FORM()
        CLOSE_DIALOG()
      },

      onError: (error) => {
        SHOW_TOAST({
          title: "Lỗi / Error",
          message: error.message,
          variant: "destructive"
        })
      }
    })

    RETURN MUTATION
}

STEP_4_RENDER_FORM {
  description: "Render dialog with form fields"
  logic: |
    FORM_FIELDS = [
      {
        name: "name",
        label: "Tên / Name",
        type: "text",
        required: true,
        error: errors.name?.message
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        error: errors.email?.message
      },
      {
        name: "phone",
        label: "Số Điện Thoại / Phone",
        type: "tel",
        required: false,
        error: errors.phone?.message
      },
      {
        name: "role",
        label: "Vai Trò / Role",
        type: "select",
        required: true,
        options: ROLE_OPTIONS,
        error: errors.role?.message
      },
      {
        name: "department",
        label: "Bộ Phận / Department",
        type: "text",
        required: false,
        error: errors.department?.message
      }
    ]

    RENDER Dialog {
      Header: "Tạo Người Dùng Mới / Create New User"
      Body: RenderFormFields(FORM_FIELDS)
      Footer: [CancelButton, SubmitButton(disabled: isLoading)]
    }
}

STEP_5_HANDLE_USER_ACTIONS {
  description: "Handle button clicks and form interactions"
  logic: |
    ON_SUBMIT_CLICK => {
      CALL STEP_2_HANDLE_FORM_SUBMISSION()
      IF successful THEN
        CALL STEP_3_MUTATION_LIFECYCLE().onSuccess()
      ELSE
        CALL STEP_3_MUTATION_LIFECYCLE().onError()
      END IF
    }

    ON_CANCEL_CLICK => {
      CLOSE_DIALOG()
      RESET_FORM()
    }

    ON_FIELD_CHANGE => {
      UPDATE form state
      VALIDATE field if onBlur
    }
}
```

---

## Key Interfaces

```typescript
// Input types
interface CreateUserInput {
  name: string;
  email: string;
  role: 'admin' | 'luatsu' | 'user' | 'viewer';
  department?: string;
  phone?: string;
}

// Schema output
interface CreateUserFormData {
  name: string;
  email: string;
  role: 'admin' | 'luatsu' | 'user' | 'viewer';
  department?: string;
  phone?: string;
}

// API response
interface CreateUserResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  token?: string;
}

// Component props
interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Role options
interface RoleOption {
  value: 'admin' | 'luatsu' | 'user' | 'viewer';
  label: string;
}
```

---

## Integration Points

```pseudo
INTEGRATION CreateUserFeature {
  UI_COMPONENTS: {
    triggers: ["CreateUserButton"],
    displays: ["CreateUserDialog", "DialogContent"],
    feedback: ["useToast()", "ErrorMessage"]
  }

  STATE_MANAGEMENT: {
    form_state: "React Hook Form (local)",
    mutation_state: "TanStack Query mutation (server)",
    dialog_state: "useState(open)"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/users",
    validation: "POST /api/v1/users/validate-email"
  }

  QUERIES_TO_INVALIDATE: [
    "['users']",
    "['user-count']"
  ]

  ERROR_HANDLING: {
    ValidationError: "Show field-level errors from Zod",
    DuplicateEmailError: "Show 'Email already exists' message",
    NetworkError: "Retry and show connection error",
    PermissionError: "Redirect to unauthorized page"
  }

  EVENTS: {
    emits: ["onSuccess", "onError"],
    listens: ["openChange", "formSubmit"]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_MAPPING {
  ENTITIES: {
    User: {
      vietnamese_term: "Người Dùng",
      roles: {
        admin: "Quản trị viên",
        luatsu: "Luật sư",
        user: "Người dùng",
        viewer: "Người xem"
      }
    },
    Department: {
      vietnamese_term: "Bộ Phận",
      examples: ["Bộ Pháp Lý", "Bộ Hành Chính", "Bộ Tài Chính"]
    }
  }

  VALIDATION_MESSAGES: {
    required: "Bắt buộc / Required",
    email_invalid: "Email không hợp lệ / Invalid email",
    phone_invalid: "Số điện thoại không hợp lệ / Invalid phone",
    min_length: "Tối thiểu {n} ký tự / At least {n} characters",
    max_length: "Tối đa {n} ký tự / Maximum {n} characters"
  }

  BUSINESS_RULES: {
    role_assignment: "Admin role requires approval",
    email_uniqueness: "Duplicate email check required",
    phone_format: "Must be valid Vietnam phone (+84 or 0)"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.2 - EditUserFeature",
    relationship: "Both use same schema and validation",
    integration: "Share CreateUserSchema and ROLE_OPTIONS"
  },
  {
    pattern: "12.3 - DeleteUserFeature",
    relationship: "Deletes users created by this feature",
    integration: "Query invalidation coordination"
  },
  {
    pattern: "12.6 - UserFiltersFeature",
    relationship: "Displays created users in filtered list",
    integration: "Query key coordination"
  }
]
```

---

## Performance Considerations

```pseudo
PERFORMANCE {
  OPTIMIZATION: {
    form_validation: "Lazy validation on blur + submit",
    mutation_optimistic: "NOT implemented (safer for user creation)",
    query_invalidation: "Precise query keys to avoid over-fetching",
    debounce: "Email validation debounced 300ms"
  }

  BENCHMARKS: {
    form_load_time: "< 200ms",
    submission_response: "< 2s typical",
    query_invalidation_refresh: "< 1s"
  }
}
```

---

**End of Pattern 12.1**

*Feature component pattern for user creation*
*Pseudo-code format: Workflow/Input/Steps/Output*
*Vietnamese domain context integrated*
