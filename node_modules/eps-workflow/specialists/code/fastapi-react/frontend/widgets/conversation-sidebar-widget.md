# Widget 11.26: ConversationSidebar

**Type**: Sidebar Widget
**Role**: Display conversation metadata, participants, attachments, and action buttons
**Technology**: React 19, TypeScript, Zustand
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET ConversationSidebar {
  ROLE: "Conversation metadata sidebar"

  RESPONSIBILITIES: [
    "Render conversation details and metadata",
    "Display participants with roles (reviewer, author, observer)",
    "Show conversation tags",
    "Manage attachments display and downloads",
    "Handle export, archive, and delete actions"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    state_management: "React useState hooks",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react",
    utilities: "date-fns with Vietnamese locale"
  }

  DOMAIN_CONTEXT: {
    use_case: "Legal document review conversations",
    entities: ["Conversation", "Participant", "Attachment"],
    roles: ["reviewer", "author", "observer"],
    vietnamese_labels: {
      participant: "Người tham gia",
      reviewer: "Người duyệt",
      author: "Tác giả",
      attachments: "Tập tin đính kèm"
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN ConversationSidebar_Widget {
  PURPOSE: "Display conversation metadata, participants, and attachments in sidebar"

  PROBLEM: "Chat/messaging interfaces need compact sidebar to show conversation details without cluttering main content"

  SOLUTION: "Collapsible sidebar with sections for metadata, participants, tags, attachments, and actions"

  USE_CASES: [
    "Display conversation details during document review",
    "Show participants and their roles",
    "Download attachments from conversation",
    "Archive or delete conversation"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW ConversationSidebar_Workflow {
  INPUT: {
    conversation: ConversationData,
    isOpen: boolean,
    callbacks: {
      onClose?: Function,
      onArchive?: Function,
      onDelete?: Function,
      onExport?: Function,
      onDownloadAttachment?: Function
    }
  }

  PRECONDITIONS: [
    "Conversation object must have required fields",
    "Participants array must not be empty",
    "Each participant must have id, name, and role"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize component state and Vietnamese labels"
      logic: |
        SET roleLabels = {
          "reviewer": "Người duyệt",
          "author": "Tác giả",
          "observer": "Quan sát viên"
        }

        SET isExporting = false
        SET sidebarWidth = isOpen ? "w-96" : "w-0"
    }

    STEP_2_RENDER_HEADER: {
      description: "Render sidebar header with title and close button"
      logic: |
        RENDER header section
        SHOW title "Chi tiết cuộc trò chuyện"
        SHOW conversation.title
        IF onClose THEN
          SHOW close button (X icon)
        END IF
    }

    STEP_3_RENDER_METADATA: {
      description: "Display conversation metadata sections"
      logic: |
        RENDER status badge
        SHOW created date with Vietnamese locale formatting

        FOR EACH participant IN conversation.participants:
          RENDER participant card
          SHOW avatar, name, role badge
        END FOR

        IF conversation.tags.length > 0 THEN
          RENDER tags section
          FOR EACH tag IN conversation.tags:
            SHOW tag badge
          END FOR
        END IF
    }

    STEP_4_RENDER_ATTACHMENTS: {
      description: "Display attachments list with download"
      logic: |
        IF conversation.attachments EXISTS AND length > 0 THEN
          RENDER attachments section
          SHOW count badge

          FOR EACH attachment IN conversation.attachments:
            RENDER attachment item
            SHOW name, size, type icon
            IF onDownloadAttachment THEN
              SHOW download button
            END IF
          END FOR
        END IF
    }

    STEP_5_RENDER_ACTIONS: {
      description: "Render action buttons"
      logic: |
        RENDER action buttons group

        IF onExport THEN
          SHOW export button
          SET loading state during export
        END IF

        IF onArchive THEN
          SHOW archive button
        END IF

        IF onDelete THEN
          SHOW delete button (red variant)
          ON click:
            SHOW confirmation dialog
            IF confirmed THEN
              CALL onDelete(conversation.id)
            END IF
        END IF
    }

    STEP_6_HANDLE_EXPORT: {
      description: "Handle conversation export"
      logic: |
        ON export button click:
          SET isExporting = true
          TRY:
            CALL onExport(conversation.id)
          FINALLY:
            SET isExporting = false
          END TRY
    }
  }

  ERROR_HANDLING: {
    ExportError: "Show error toast with message",
    DownloadError: "Retry download with exponential backoff",
    DataError: "Log error and show fallback UI"
  }

  OUTPUT: {
    rendered_component: SidebarElement,
    visible: isOpen,
    width: "w-96 or w-0",
    uses_portal: true
  }

  POSTCONDITIONS: [
    "Sidebar renders correctly when isOpen=true",
    "All action callbacks are properly wired",
    "Vietnamese labels display correctly"
  ]
}
```

---

## Key Interfaces

```typescript
// Conversation Data
interface Conversation {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'archived' | 'closed';
  created_at: Date;
  updated_at: Date;
  participants: Participant[];
  tags: string[];
  attachments?: Attachment[];
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'reviewer' | 'author' | 'observer';
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'document' | 'image' | 'video';
  url: string;
}

// Component Props
interface ConversationSidebarProps {
  conversation: Conversation;
  isOpen?: boolean;
  onClose?: () => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onExport?: (id: string) => void;
  onDownloadAttachment?: (id: string) => void;
}

// Component Signature
function ConversationSidebar(props: ConversationSidebarProps): JSX.Element | null
```

---

## Integration Points

```pseudo
INTEGRATION ConversationSidebar_Integration {
  PARENT_COMPONENTS: [
    "ConversationPage (main conversation view)",
    "MessageThread (chat interface)",
    "DocumentReviewPanel (legal document review)"
  ]

  STATE_MANAGEMENT: {
    local_state: "usestate for isExporting, visibility",
    global_state: "Zustand overlay store for open/close state",
    server_state: "TanStack Query for conversation data"
  }

  API_ENDPOINTS: {
    export: "POST /api/v1/conversations/:id/export",
    archive: "PATCH /api/v1/conversations/:id/archive",
    delete: "DELETE /api/v1/conversations/:id",
    download: "GET /api/v1/attachments/:id/download"
  }

  EVENTS: {
    emits: ["onClose", "onArchive", "onDelete", "onExport", "onDownloadAttachment"],
    triggers: ["User clicks export/archive/delete/download button"]
  }

  STYLING: {
    theme: "Tailwind CSS",
    layout: "Flex column with sticky sections",
    animations: "Smooth width transition (w-0 to w-96)",
    colors: "Gray-900 text, blue accents for actions"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE ConversationSidebar {
  SCENARIO: "Lawyer reviews conversation and exports details"

  ACTORS: {
    user: "Lawyer in document review session",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      Lawyer opens conversation in chat panel
      Lawyer clicks "Details" button

    STEP_2: |
      System CALLS ConversationSidebar({
        conversation: {
          id: "conv-123",
          title: "Contract Review - ABC Corp",
          status: "active",
          participants: [
            { id: "u1", name: "Lawyer A", role: "reviewer" },
            { id: "u2", name: "Lawyer B", role: "author" }
          ],
          tags: ["urgent", "contract"],
          attachments: [
            { id: "a1", name: "contract.pdf", size: "2.5MB", type: "document" }
          ]
        },
        isOpen: true,
        onClose: () => closeSidebar(),
        onExport: () => exportConversation(),
        onDownloadAttachment: (id) => downloadFile(id)
      })

    STEP_3: |
      Sidebar renders conversation details
      User sees participants with roles
      User sees attachments list

    STEP_4: |
      User clicks "Download" on attachment
      System downloads file

    STEP_5: |
      User clicks "Xuất hội thoại" (Export)
      System shows loading state
      System exports conversation data
      User receives download
  }
}
```

---

## Performance Considerations

```pseudo
PERFORMANCE ConversationSidebar_Performance {
  OPTIMIZATION_STRATEGIES: {
    rendering: "Memoize participant and attachment lists",
    scrolling: "Use max-h-64 overflow-y-auto for attachment lists",
    export: "Stream export for large conversations",
    avatars: "Lazy load participant avatars"
  }

  BENCHMARKS: {
    target_render_time: "< 100ms",
    attachment_list: "Handle up to 100 attachments",
    participant_list: "Handle up to 50 participants",
    export_time: "< 5 seconds for typical conversation"
  }

  BEST_PRACTICES: [
    "Memoize attachment list component",
    "Use useCallback for handlers",
    "Portal rendering for independence",
    "Avoid re-renders on participant changes"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  LEGAL_ENTITIES: {
    Conversation: "Cuộc trò chuyện",
    Participant: "Người tham gia",
    Attachment: "Tập tin đính kèm",
    ReviewRole: "Vai trò duyệt xét"
  }

  BUSINESS_RULES: {
    participant_roles: [
      { role: "reviewer", label: "Người duyệt", permissions: ["view", "comment"] },
      { role: "author", label: "Tác giả", permissions: ["view", "edit"] },
      { role: "observer", label: "Quan sát viên", permissions: ["view"] }
    ],
    attachment_types: ["document", "image", "video"],
    conversation_statuses: ["active", "archived", "closed"]
  }

  LOCALIZATION: {
    language: "Vietnamese",
    date_format: "DD/MM/YYYY HH:mm",
    timezone: "Asia/Ho_Chi_Minh",
    currency: "VND"
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING ConversationSidebar_Tests {
  UNIT_TESTS: [
    "Should render when isOpen=true",
    "Should not render when isOpen=false",
    "Should display all participants with roles",
    "Should show attachments with download buttons",
    "Should call onExport when export button clicked",
    "Should show confirmation before delete"
  ]

  INTEGRATION_TESTS: [
    "Sidebar opens/closes correctly",
    "Export functionality works end-to-end",
    "Attachment downloads trigger correctly",
    "Vietnamese labels display properly"
  ]

  EDGE_CASES: [
    "Empty participants list",
    "Many attachments (>100)",
    "Very long participant names",
    "Missing avatar URLs",
    "Export timeout"
  ]
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 367
**Status**: Completed
