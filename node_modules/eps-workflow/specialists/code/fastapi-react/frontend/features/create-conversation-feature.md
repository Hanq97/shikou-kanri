# Pattern 12.16: CreateConversationFeature

**Role**: Conversation creation with multi-select participants
**Focus**: Dialog with combobox participant picker and avatar display
**Technology**: React 19, TypeScript 5, React Hook Form, Zod, TanStack Query v5
**Domain**: Vietnamese legal platform (Cuộc Hội Thoại)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE CreateConversationFeature {
  PURPOSE: "Create new conversations with multiple participants"

  RESPONSIBILITIES: [
    "Capture conversation title and description",
    "Multi-select participants with combobox",
    "Display selected participants as badges",
    "Submit conversation creation",
    "Redirect to conversation details",
    "Invalidate conversations list query"
  ]

  TECH_STACK: {
    primary: "React Hook Form + Zod validation",
    state_management: "TanStack Query mutations",
    ui_components: "Dialog, Command, Avatar, Badge",
    participant_selection: "Combobox with multi-select"
  }

  DOMAIN_CONTEXT: {
    entities: ["Cuộc Hội Thoại (Conversation)", "Người Tham Gia (Participant)"],
    operations: ["Create conversation", "Add participants"],
    constraints: ["Min 1 participant", "Max N participants"]
  }
}
```

---

## Workflow: CreateConversationFeature_Workflow

```pseudo
WORKFLOW CreateConversationFeature {
  INPUT: {
    open: boolean,
    onOpenChange: (open: boolean) => void
  }

  PRECONDITIONS: [
    "Dialog is open",
    "Users list available",
    "Create permission granted"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_FORM {
  description: "Setup conversation form with validation"
  logic: |
    SCHEMA = CreateConversationSchema {
      title: required, max 200 chars,
      description: optional, max 500 chars,
      participantIds: array, min 1 item
    }

    FORM = useForm({
      resolver: zodResolver(SCHEMA),
      defaultValues: { participantIds: [] }
    })

    RETURN form
}

STEP_2_FETCH_USERS {
  description: "Load available users for selection"
  logic: |
    USERS_QUERY = useQuery({
      queryKey: ['users-for-conversation'],
      queryFn: getUsers
    })

    users = USERS_QUERY.data || []

    RETURN users
}

STEP_3_MANAGE_PARTICIPANT_SELECTION {
  description: "Handle participant multi-select"
  logic: |
    participantIds = watch('participantIds')

    TOGGLE_PARTICIPANT = (userId) => {
      IF participantIds.includes(userId) THEN
        // Remove participant
        setValue(
          'participantIds',
          participantIds.filter(id => id != userId)
        )
      ELSE
        // Add participant
        setValue('participantIds', [...participantIds, userId])
      END IF
    }

    selectedUsers = users.filter(user =>
      participantIds.includes(user.id)
    )

    RETURN { TOGGLE_PARTICIPANT, selectedUsers }
}

STEP_4_RENDER_FORM {
  description: "Render conversation creation form"
  logic: |
    RENDER Dialog {
      Header: "Tạo Cuộc Hội Thoại Mới / Create New Conversation"

      Body: Form [
        {
          name: "title",
          label: "Tiêu Đề / Title",
          type: "text",
          required: true,
          error: errors.title?.message,
          placeholder: "Vụ Án XX / Case Discussion"
        },
        {
          name: "description",
          label: "Mô Tả / Description",
          type: "textarea",
          required: false,
          rows: 3,
          error: errors.description?.message,
          placeholder: "Mô tả mục đích / Describe the purpose"
        },
        {
          label: "Người Tham Gia / Participants",
          required: true,
          component: ParticipantMultiSelect {
            combobox: true,
            searchable: true,
            button_text: "{count} người tham gia được chọn",
            max_height: "256px"
          }
        }
      ]

      Footer: [
        CancelButton,
        CreateButton(disabled: isLoading)
      ]
    }
}

STEP_5_RENDER_PARTICIPANT_COMBOBOX {
  description: "Display participant picker with avatars"
  logic: |
    RENDER Popover {
      Trigger: Button {
        text: selectedUsers.length > 0 ?
          "{selectedUsers.length} người tham gia được chọn" :
          "Chọn người tham gia / Select participants"
      }

      Content: Command {
        CommandInput: "Tìm người dùng / Search users..."
        CommandEmpty: "Không tìm thấy người dùng / No users found"
        CommandGroup max-height-64:
          FOR EACH user IN users:
            CommandItem {
              onClick: () => TOGGLE_PARTICIPANT(user.id)
              content: [
                Avatar(user.avatar),
                Div [
                  P className="font-medium": user.name,
                  P className="text-xs text-gray-500": user.email
                ],
                Check(visible: IF user in selectedUsers)
              ]
            }
          END FOR
      }
    }

    // Display selected participants as badges
    IF selectedUsers.length > 0 THEN
      RENDER Div className="flex flex-wrap gap-2 mt-3":
        FOR EACH user IN selectedUsers:
          Badge {
            text: user.name,
            closeButton: (onClick) => TOGGLE_PARTICIPANT(user.id),
            disabled: isLoading
          }
        END FOR
    END IF
}

STEP_6_SUBMIT_FORM {
  description: "Submit conversation creation"
  logic: |
    ON_SUBMIT = (data) => {
      TRY:
        MUTATION.mutate(data)
      CATCH error:
        LOG_ERROR(error)
      END TRY
    }

    MUTATION = useMutation({
      mutationFn: createConversation,

      onSuccess: (conversationData) => {
        SHOW_TOAST({
          title: "Cuộc Hội Thoại Được Tạo / Conversation Created",
          message: "Cuộc hội thoại mới đã được tạo / New conversation created"
        })

        INVALIDATE_QUERY(['conversations'])
        RESET_FORM()
        CLOSE_DIALOG()

        router.push(`/conversations/${conversationData.id}`)
      },

      onError: (error: Error) => {
        SHOW_TOAST({
          title: "Lỗi / Error",
          message: error.message,
          variant: "destructive"
        })
      }
    })
}
```

---

## Key Interfaces

```typescript
interface CreateConversationFormData {
  title: string;
  description?: string;
  participantIds: string[];
}

interface CreateConversationRequest {
  title: string;
  description?: string;
  participantIds: string[];
}

interface CreateConversationResponse {
  id: string;
  title: string;
  description?: string;
  participants: User[];
  createdAt: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

---

## Integration Points

```pseudo
INTEGRATION CreateConversationFeature {
  UI_COMPONENTS: {
    triggers: ["Create Conversation button"],
    displays: ["Dialog", "Popover", "Command", "Avatar", "Badge"]
  }

  STATE_MANAGEMENT: {
    form_state: "React Hook Form",
    participant_state: "watch('participantIds')",
    mutation_state: "TanStack Query"
  }

  API_ENDPOINTS: {
    create: "POST /api/v1/conversations",
    get_users: "GET /api/v1/users"
  }

  QUERY_INVALIDATION: [
    "['conversations']",
    "['conversation-count']"
  ]

  NAVIGATION: {
    on_success: "router.push(`/conversations/{id}`)"
  }

  ERROR_HANDLING: {
    ValidationError: "Show field-level errors",
    NoParticipants: "Require at least 1 participant",
    PermissionError: "Show 'No permission' message",
    NetworkError: "Show retry-able connection error"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  MESSAGES: {
    title: "Tạo Cuộc Hội Thoại Mới / Create New Conversation",
    subtitle: "Khởi tạo một cuộc hội thoại mới / Start a new conversation",
    participants_label: "Người Tham Gia / Participants",
    participants_selected: "{n} người tham gia được chọn / participants selected",
    participants_placeholder: "Chọn người tham gia / Select participants",
    search_placeholder: "Tìm người dùng / Search users...",
    title_label: "Tiêu Đề / Title",
    title_placeholder: "Vụ Án XX / Case Discussion",
    description_label: "Mô Tả / Description",
    description_placeholder: "Mô tả mục đích / Describe the purpose",
    create_button: "Tạo / Create",
    creating_button: "Đang tạo... / Creating...",
    cancel_button: "Hủy / Cancel",
    success_title: "Cuộc Hội Thoại Được Tạo / Conversation Created",
    success_message: "Cuộc hội thoại mới đã được tạo / New conversation created",
    no_users_found: "Không tìm thấy người dùng / No users found"
  }

  VALIDATION: {
    title_required: "Tiêu đề là bắt buộc / Title is required",
    title_too_long: "Tiêu đề không được vượt quá 200 ký tự / Title exceeds 200 characters",
    description_too_long: "Mô tả không được vượt quá 500 ký tự / Description exceeds 500 characters",
    participants_required: "Chọn ít nhất một người tham gia / Select at least one participant"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.17 - SendMessageFeature",
    relationship: "Send messages in created conversation",
    integration: "Displays in same conversation context"
  },
  {
    pattern: "12.7 - UserSearchFeature",
    relationship: "Similar user search and selection",
    integration: "Share searchUsers API and avatars"
  }
]
```

---

**End of Pattern 12.16**

*Feature component pattern for conversation creation*
*Multi-select participants with combobox UI*
