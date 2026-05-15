# Frontend Conversation & Settings Pages Specialist
**Next.js 15 Feature-Sliced Design (FSD) - Real-time Messaging and Configuration Pages**

**Version**: 1.0.0
**Last Updated**: 2026-01-02
**Scope**: Conversation/messaging pages, document management, workflow pages, settings
**Patterns Covered**: 10.21-10.26 (6 patterns)

---

## SPECIALIST IDENTITY

### Role Definition
**Frontend Conversation & Settings Pages Specialist** - Manages real-time messaging and configuration pages:

- Real-time conversation interfaces with streaming
- Message list with polling/WebSocket updates
- Document management and viewing
- Workflow designer and automation
- User settings and preferences
- Configuration management

### Core Responsibilities

1. **Design Conversation/Message Pages with Streaming**
2. **Create Document List and Viewer Pages**
3. **Implement Workflow Management Pages**
4. **Build Settings Pages with Form Validation**
5. **Configure User Preferences and Account Management**

---

## PATTERN IMPLEMENTATIONS

### Pattern 10.21: Conversation/Message Detail Page (Streaming)

**Purpose**: Real-time messaging with streaming and progressive loading

**File**: `src/app/(dashboard)/conversations/[id]/page.tsx`

```pseudo
WORKFLOW ConversationPage_Pattern_10_21 {
  INPUT: {
    params: {
      id: string
    },
    search_params: {
      search: string (optional)
    }
  }

  STEPS: {
    STEP authenticate_user:
      session = AWAIT getAuthSession()
      IF NOT session:
        REDIRECT TO `/login?callbackUrl=/conversations/${params.id}`
      END IF
    END STEP

    STEP fetch_conversation_data:
      conversation = AWAIT getConversationData(params.id, userId)

      IF NOT conversation:
        CALL notFound()
      END IF

      CHECK user_is_participant(conversation, userId)
    END STEP

    STEP generate_dynamic_metadata:
      RETURN {
        title: `${conversation.title || "Cuộc Trò Chuyện"} - StarX4CRM`,
        description: "Xem tin nhắn và thảo luận",
        robots: "noindex, nofollow"  // Private conversations
      }
    END STEP

    STEP render_conversation_layout:
      LAYOUT split_view:
        // Main conversation area (left)
        SECTION message_area (flex-1):
          HEADER conversation_header:
            - Conversation title
            - Participant avatars
            - Online status indicators
            - Actions (mute, archive, leave)
          END HEADER

          MAIN messages_container (scrollable):
            SUSPENSE:
              <MessageList
                conversationId={params.id}
                userId={userId}
                searchQuery={search_params.search}
              />
            END SUSPENSE
          END MAIN

          FOOTER message_input:
            CLIENT_COMPONENT:
              <MessageInput
                conversationId={params.id}
                userId={userId}
              />
            END CLIENT_COMPONENT
          END FOOTER
        END SECTION

        // Conversation info sidebar (right)
        SECTION info_sidebar (width: 320px):
          SUSPENSE:
            <ConversationInfo
              conversation={conversation}
              userId={userId}
            />
          END SUSPENSE
        END SECTION
      END LAYOUT
    END STEP

    STEP implement_message_list_client_component:
      CLIENT_COMPONENT MessageList:
        QUERY messages WITH:
          queryKey: ["messages", conversationId, searchQuery]
          queryFn: FETCH `/api/conversations/${conversationId}/messages?search=${searchQuery}`
          refetchInterval: 3000  // Poll every 3 seconds
          staleTime: 2000
        END QUERY

        RENDER:
          FOR EACH message IN messages:
            <MessageBubble
              message={message}
              isOwn={message.sender_id === userId}
            />
          END FOR

          AUTO_SCROLL_TO_BOTTOM on new messages
        END RENDER
      END CLIENT_COMPONENT
    END STEP

    STEP implement_message_input_client_component:
      CLIENT_COMPONENT MessageInput:
        STATE:
          content: string
          attachments: File[]
          isSending: boolean
        END STATE

        ON_SUBMIT:
          SET isSending = TRUE

          SERVER_ACTION sendMessage:
            VALIDATE content (not empty, max 5000 chars)
            UPLOAD attachments (if any)
            CREATE message IN database
            REVALIDATE messages query
            TRIGGER real-time notification
          END SERVER_ACTION

          SET isSending = FALSE
          CLEAR form
          SCROLL_TO_BOTTOM
        END ON_SUBMIT

        FEATURES:
          - Rich text editor
          - File attachment (drag-and-drop)
          - Emoji picker
          - @mention autocomplete
          - Send on Enter (Shift+Enter for new line)
        END FEATURES
      END CLIENT_COMPONENT
    END STEP

    STEP apply_caching_strategy:
      conversation: cache = "no-store" (real-time data)
      messages: Client-side polling with React Query
    END STEP
  }

  OUTPUT: {
    page_type: "Server Component with Client Message List",
    caching: "no-store (real-time)",
    updates: "Polling (3s interval) or WebSocket",
    suspense: "Message list + sidebar",
    features: "Search, attachments, real-time updates"
  }
}
```

**Technology Interface**:
```typescript
interface ConversationPageProps {
  params: { id: string };
  searchParams: { search?: string };
}

export async function generateMetadata(props: ConversationPageProps): Promise<Metadata>;
export default async function ConversationPage(props: ConversationPageProps): Promise<JSX.Element>;

// Client Components
export function MessageList(props: {
  conversationId: string;
  userId: string;
  searchQuery?: string;
}): JSX.Element;

export function MessageInput(props: {
  conversationId: string;
  userId: string;
}): JSX.Element;
```

---

### Pattern 10.26: Settings/Configuration Page (Form-based)

**Purpose**: User settings with multiple form sections

**File**: `src/app/(dashboard)/settings/page.tsx`

```pseudo
WORKFLOW SettingsPage_Pattern_10_26 {
  INPUT: {
    // No search params (single settings page)
  }

  STEPS: {
    STEP authenticate_user:
      session = AWAIT getAuthSession()
      IF NOT session:
        REDIRECT TO "/login?callbackUrl=/settings"
      END IF
    END STEP

    STEP fetch_user_data_parallel:
      [user, preferences] = AWAIT Promise.all([
        getCurrentUser(userId),
        getUserPreferences(userId)
      ])
    END STEP

    STEP define_metadata:
      RETURN {
        title: "Cài Đặt - StarX4CRM",
        description: "Quản lý cài đặt tài khoản của bạn",
        robots: "noindex, nofollow"
      }
    END STEP

    STEP render_page_header:
      HEADER:
        TITLE: "Cài Đặt"
        SUBTITLE: "Quản lý cài đặt tài khoản và sở thích của bạn"
      END HEADER
    END STEP

    STEP render_settings_sections:
      SECTION profile_settings (suspense):
        CARD:
          TITLE: "Thông Tin Hồ Sơ"
          DESCRIPTION: "Cập nhật tên, email và ảnh đại diện của bạn"
          FORM:
            CLIENT_COMPONENT ProfileSettingsForm:
              FIELDS:
                - name (text, required)
                - email (email, required)
                - phone (tel, optional, Vietnamese format)
                - avatar (file upload, max 2MB)
              END FIELDS

              ON_SUBMIT:
                SERVER_ACTION updateProfile(formData)
                SHOW success_message
              END ON_SUBMIT
            END CLIENT_COMPONENT
          END FORM
        END CARD
      END SECTION

      SECTION security_settings (suspense):
        CARD:
          TITLE: "Bảo Mật"
          DESCRIPTION: "Quản lý mật khẩu và xác thực hai yếu tố"
          FORM:
            CLIENT_COMPONENT SecuritySettingsForm:
              FIELDS:
                - current_password (password, required)
                - new_password (password, required, min 8 chars)
                - confirm_password (password, required, must match)
                - enable_2fa (toggle)
              END FIELDS

              VALIDATION:
                - Password strength meter
                - Confirm password match
                - Current password verification
              END VALIDATION

              ON_SUBMIT:
                SERVER_ACTION updateSecuritySettings(formData)
                IF password_changed:
                  LOG_OUT all_sessions
                  REDIRECT TO "/login"
                END IF
              END ON_SUBMIT
            END CLIENT_COMPONENT
          END FORM
        END CARD
      END SECTION

      SECTION notification_settings (suspense):
        CARD:
          TITLE: "Thông Báo"
          DESCRIPTION: "Cấu hình cách bạn nhận thông báo"
          FORM:
            CLIENT_COMPONENT NotificationSettingsForm:
              FIELDS:
                - email_notifications (toggle group):
                  - New messages
                  - Case updates
                  - Deadline reminders
                  - System announcements
                - push_notifications (toggle group):
                  - Same as email
                - notification_frequency (select):
                  - Immediate
                  - Daily digest
                  - Weekly summary
              END FIELDS

              ON_CHANGE:
                AUTO_SAVE preferences
                SHOW save_indicator
              END ON_CHANGE
            END CLIENT_COMPONENT
          END FORM
        END CARD
      END SECTION

      SECTION preferences_settings (suspense):
        CARD:
          TITLE: "Sở Thích"
          DESCRIPTION: "Tùy chỉnh giao diện và hành vi ứng dụng"
          FORM:
            CLIENT_COMPONENT PreferencesSettingsForm:
              FIELDS:
                - language (select: Vietnamese, English)
                - theme (select: Light, Dark, System)
                - timezone (select: Vietnam timezone)
                - date_format (select: DD/MM/YYYY, MM/DD/YYYY)
                - items_per_page (number: 10, 20, 50, 100)
              END FIELDS

              ON_CHANGE:
                AUTO_SAVE preferences
                APPLY_IMMEDIATELY (theme, language)
              END ON_CHANGE
            END CLIENT_COMPONENT
          END FORM
        END CARD
      END SECTION

      SECTION danger_zone (suspense):
        CARD variant="danger":
          TITLE: "Vùng Nguy Hiểm"
          DESCRIPTION: "Các hành động không thể hoàn tác"
          ACTIONS:
            BUTTON delete_account (requires_confirmation):
              MODAL confirm_deletion:
                WARNING: "This action cannot be undone"
                INPUT: Type email to confirm
                ON_CONFIRM:
                  SERVER_ACTION deleteAccount(userId)
                  REDIRECT TO "/goodbye"
                END ON_CONFIRM
              END MODAL
            END BUTTON
          END ACTIONS
        END CARD
      END SECTION
    END STEP

    STEP implement_save_indicator:
      GLOBAL_SAVE_INDICATOR (hidden by default):
        ON_SAVE_SUCCESS:
          SHOW "Cài đặt đã được lưu" (green banner)
          AUTO_HIDE after 3 seconds
        END ON_SAVE_SUCCESS

        ON_SAVE_ERROR:
          SHOW error_message (red banner)
          PERSIST until dismissed
        END ON_SAVE_ERROR
      END GLOBAL_SAVE_INDICATOR
    END STEP

    STEP apply_caching:
      user_data: cache = "no-store"
      preferences: cache = "no-store"
    END STEP
  }

  OUTPUT: {
    page_type: "Server Component with Client Forms",
    caching: "no-store (user-specific)",
    forms: "Client components with Server Actions",
    validation: "Client + Server",
    auto_save: "Preferences only"
  }
}
```

**Technology Interface**:
```typescript
export const metadata: Metadata;
export default async function SettingsPage(): Promise<JSX.Element>;

// Server Actions
export async function updateProfile(formData: FormData): Promise<ActionResult>;
export async function updateSecuritySettings(formData: FormData): Promise<ActionResult>;
export async function deleteAccount(userId: string): Promise<ActionResult>;

// Client Components
export function ProfileSettingsForm(props: { user: User }): JSX.Element;
export function SecuritySettingsForm(props: { userId: string }): JSX.Element;
export function NotificationSettingsForm(props: {
  userId: string;
  currentSettings: NotificationPreferences;
}): JSX.Element;
export function PreferencesSettingsForm(props: {
  userId: string;
  preferences: UserPreferences;
}): JSX.Element;
```

---

## ADDITIONAL PATTERNS (10.22-10.25)

### Summary Table

| Pattern | Page | Purpose | Features | Caching |
|---------|------|---------|----------|---------|
| 10.22 | Conversation List | Messaging inbox | Search, filters, unread indicators | no-store |
| 10.23 | Document List | Document management | Upload, categorization, version control | revalidate: 60 |
| 10.24 | Document Viewer | View/edit documents | Preview, annotations, version history | revalidate: 60 |
| 10.25 | Workflow List | Workflow management | Create, edit, delete workflows | revalidate: 300 |

### Pattern 10.22: Conversation List Page

```pseudo
WORKFLOW ConversationListPage {
  FILE: "src/app/(dashboard)/conversations/page.tsx"
  FEATURES:
    - Conversation cards with latest message preview
    - Unread message count badges
    - Search by participant or content
    - Filter by: All, Unread, Archived
    - Real-time updates (polling or WebSocket)
  CACHING: "no-store"
}
```

### Pattern 10.23: Document List Page

```pseudo
WORKFLOW DocumentListPage {
  FILE: "src/app/(dashboard)/documents/page.tsx"
  FEATURES:
    - Document cards with thumbnails
    - Upload modal (drag-and-drop)
    - Category filtering
    - Search by filename or content
    - Version control indicators
    - Bulk operations (download, delete, move)
  CACHING: "revalidate: 60"
}
```

### Pattern 10.24: Document Viewer Page

```pseudo
WORKFLOW DocumentViewerPage {
  FILE: "src/app/(dashboard)/documents/[id]/page.tsx"
  FEATURES:
    - PDF/Image viewer with zoom controls
    - Annotation tools (highlight, comment, draw)
    - Version history sidebar
    - Download and share buttons
    - Metadata panel (size, type, upload date)
  CACHING: "revalidate: 60"
}
```

### Pattern 10.25: Workflow List Page

```pseudo
WORKFLOW WorkflowListPage {
  FILE: "src/app/(dashboard)/workflows/page.tsx"
  FEATURES:
    - Workflow cards with trigger/action summary
    - Create workflow button (opens designer)
    - Enable/disable toggle per workflow
    - Edit and duplicate actions
    - Execution history and logs
  CACHING: "revalidate: 300"
}
```

---

## VIETNAMESE LEGAL DOMAIN CONTEXT

### Conversation Types
```pseudo
CONVERSATION_TYPES = {
  case_discussion: {
    label: "Thảo Luận Vụ Việc",
    participants: ["lawyers", "clients", "experts"],
    features: ["case_linking", "document_sharing"]
  },

  client_communication: {
    label: "Liên Lạc Khách Hàng",
    participants: ["lawyer", "client"],
    features: ["appointment_scheduling", "billing_discussions"]
  },

  internal_team: {
    label: "Nội Bộ Đội Ngũ",
    participants: ["team_members"],
    features: ["task_assignment", "strategy_planning"]
  }
}
```

### Document Categories
```pseudo
DOCUMENT_CATEGORIES = {
  contracts: "Hợp Đồng",
  evidence: "Chứng Cứ",
  court_submissions: "Hồ Sơ Nộp Tòa",
  court_orders: "Quyết Định Tòa",
  legal_opinions: "Ý Kiến Pháp Lý",
  client_documents: "Tài Liệu Khách Hàng"
}
```

### Settings Categories
```pseudo
SETTINGS_LABELS = {
  profile: "Thông Tin Hồ Sơ",
  security: "Bảo Mật",
  notifications: "Thông Báo",
  preferences: "Sở Thích",
  billing: "Thanh Toán",
  integrations: "Tích Hợp",
  danger_zone: "Vùng Nguy Hiểm"
}
```

---

## TECHNOLOGY STACK

### Real-time Communication
1. **Polling**: React Query with `refetchInterval: 3000`
2. **WebSocket** (alternative): Socket.io or native WebSocket API
3. **Server-Sent Events**: For one-way server → client updates
4. **Optimistic Updates**: `useOptimistic` hook for instant UI feedback

### Form Management
1. **React Hook Form**: Client-side validation and state management
2. **Zod**: Schema validation (client + server)
3. **Server Actions**: Form submission handlers
4. **useActionState**: Form state with server actions (React 19)

### File Uploads
1. **Next.js API Routes**: Handle multipart/form-data
2. **S3/CloudFlare R2**: Object storage for files
3. **Image Optimization**: Automatic compression and format conversion
4. **Progress Tracking**: Upload progress with `XMLHttpRequest` events

---

## BEST PRACTICES

### Real-time Updates
1. **Polling Interval**: 3-5 seconds for messages, 30-60s for notifications
2. **Stale Time**: Set `staleTime` slightly less than `refetchInterval`
3. **Background Refetch**: Continue polling when tab is not focused
4. **Error Handling**: Exponential backoff on failed requests
5. **Cleanup**: Cancel polling when component unmounts

### Form Validation
1. **Client-Side First**: Instant feedback with HTML5 + React Hook Form
2. **Server-Side Always**: Never trust client validation
3. **Error Messages**: Clear, actionable, bilingual
4. **Field-Level**: Validate as user types (debounced)
5. **Form-Level**: Final validation on submit

### Security
1. **CSRF Protection**: Use Next.js built-in CSRF tokens
2. **Rate Limiting**: Limit form submissions per user/IP
3. **Input Sanitization**: Sanitize user input before storing
4. **File Upload Limits**: Max size (10MB), allowed types
5. **Password Requirements**: Min 8 chars, uppercase, lowercase, number

### Performance
1. **Code Splitting**: Lazy load rich text editors, file uploaders
2. **Debouncing**: Debounce auto-save functions (500-1000ms)
3. **Optimistic Updates**: Update UI before server response
4. **Suspense Boundaries**: Per-section loading states
5. **Image Optimization**: Compress avatars and attachments

---

## FILE ORGANIZATION

```
src/app/(dashboard)/
├── conversations/
│   ├── page.tsx                    # Pattern 10.22 (List)
│   └── [id]/
│       └── page.tsx                # Pattern 10.21 (Detail)
├── documents/
│   ├── page.tsx                    # Pattern 10.23 (List)
│   └── [id]/
│       └── page.tsx                # Pattern 10.24 (Viewer)
├── workflows/
│   └── page.tsx                    # Pattern 10.25 (List)
└── settings/
    └── page.tsx                    # Pattern 10.26 (Settings)
```

---

## SUMMARY

This **Frontend Conversation & Settings Pages Specialist** provides:

1. **6 Core Patterns**: Conversation detail, conversation list, document list/viewer, workflow list, settings
2. **Real-time Updates**: Polling-based message updates with React Query
3. **Form Management**: Multi-section settings with auto-save and validation
4. **Vietnamese Legal Domain**: Legal document categories, case-linked conversations
5. **File Management**: Upload, preview, version control for legal documents

**Technology Stack**: Next.js 15.3.0, React 19, TypeScript 5, React Query
**Code Quality**: Production-ready pseudo-code, fully typed
**Documentation**: Comprehensive with Vietnamese legal context

---

*Frontend Conversation & Settings Pages Specialist v1.0*
*Created: 2026-01-02*
*Patterns 10.21-10.26 Coverage*
*StarX4CRM - Next.js 15 Specialist Suite*
