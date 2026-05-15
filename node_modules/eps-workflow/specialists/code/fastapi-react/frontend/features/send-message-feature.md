# Pattern 12.17: SendMessageFeature

**Role**: Message sending with file attachments and optimistic updates
**Focus**: Textarea-based message input with file upload support
**Technology**: React 19, TypeScript 5, TanStack Query v5, File Upload API
**Domain**: Vietnamese legal platform (Tin Nhắn)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE SendMessageFeature {
  PURPOSE: "Send messages in conversations with file attachments"

  RESPONSIBILITIES: [
    "Capture message text in textarea",
    "Handle file attachment selection",
    "Show attachment preview before sending",
    "Submit message with optimistic update",
    "Refetch messages on server confirmation",
    "Handle message send errors"
  ]

  TECH_STACK: {
    primary: "TanStack Query mutations",
    ui_components: "Textarea, Button, File input",
    attachments: "File[] handling",
    patterns: ["optimistic-updates", "file-upload"]
  }

  DOMAIN_CONTEXT: {
    entities: ["Tin Nhắn (Message)", "Tệp Đính Kèm (Attachment)", "Cuộc Hội Thoại (Conversation)"],
    file_types: ["image", "pdf", "doc", "docx"],
    keyboard_shortcuts: ["Enter to send", "Shift+Enter for newline"]
  }
}
```

---

## Workflow: SendMessageFeature_Workflow

```pseudo
WORKFLOW SendMessageFeature {
  INPUT: {
    conversationId: string,
    onMessageSent?: () => void
  }

  PRECONDITIONS: [
    "Conversation is open",
    "User has send permission",
    "Message content is not empty OR attachments exist"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_STATE {
  description: "Setup message input state"
  logic: |
    message = useState('')
    attachments = useState<File[]>([])
    textareaRef = useRef<HTMLTextAreaElement>()
    fileInputRef = useRef<HTMLInputElement>()

    RETURN { message, attachments, textareaRef, fileInputRef }
}

STEP_2_HANDLE_TEXT_INPUT {
  description: "Capture message text changes"
  logic: |
    ON_MESSAGE_CHANGE = (e) => {
      setMessage(e.target.value)
    }

    ON_KEY_DOWN = (e: KeyboardEvent) => {
      IF e.key == 'Enter' AND NOT e.shiftKey THEN
        e.preventDefault()
        IF message.trim() OR attachments.length > 0 THEN
          SEND_MESSAGE()
        END IF
      END IF
    }
}

STEP_3_HANDLE_FILE_SELECTION {
  description: "Handle file attachment selection"
  logic: |
    ON_FILE_SELECT = (e: ChangeEvent<HTMLInputElement>) => {
      IF e.target.files THEN
        files = Array.from(e.target.files)

        // Validate file count
        IF attachments.length + files.length > 5 THEN
          SHOW_TOAST("Maximum 5 attachments")
          RETURN
        END IF

        // Validate file size (max 10MB each)
        FOR EACH file IN files:
          IF file.size > 10 * 1024 * 1024 THEN
            SHOW_TOAST("File too large: {file.name}")
            RETURN
          END IF
        END FOR

        setAttachments([...attachments, ...files])
      END IF
    }

    ON_ATTACHMENT_CLICK = () => {
      fileInputRef.current?.click()
    }
}

STEP_4_RENDER_ATTACHMENTS {
  description: "Display attachment previews"
  logic: |
    IF attachments.length > 0 THEN
      RENDER Div className="space-y-2":
        FOR EACH file, index IN attachments:
          Div className="flex items-center justify-between":
            Span className="truncate": file.name
            Button onClick={() => removeAttachment(index)}: "×"
        END FOR
    END IF

    REMOVE_ATTACHMENT = (index) => {
      setAttachments(attachments.filter((_, i) => i != index))
    }
}

STEP_5_SETUP_SEND_MUTATION {
  description: "Configure message send mutation"
  logic: |
    MUTATION = useMutation({
      mutationFn: () =>
        sendMessage(conversationId, message, attachments),

      onMutate: async () => {
        // Cancel outgoing queries
        AWAIT queryClient.cancelQueries(['messages', conversationId])

        // Create optimistic message
        tempMessage = {
          id: `temp-${Date.now()}`,
          content: message,
          createdAt: new Date(),
          isTemp: true,
          attachments: attachments.map(f => f.name)
        }

        // Optimistically update cache
        queryClient.setQueryData(
          ['messages', conversationId],
          (old: any) => [...(old || []), tempMessage]
        )
      },

      onSuccess: () => {
        // Clear form
        setMessage('')
        setAttachments([])
        IF textareaRef.current THEN
          textareaRef.current.style.height = 'auto'
        END IF

        // Refetch from server
        INVALIDATE_QUERY(['messages', conversationId])

        // Callback
        onMessageSent?.()

        // Scroll to newest message (optional)
        SCROLL_TO_BOTTOM()
      },

      onError: (error: Error) => {
        SHOW_TOAST({
          title: "Lỗi gửi tin nhắn / Failed to send message",
          message: error.message,
          variant: "destructive"
        })
      }
    })

    RETURN MUTATION
}

STEP_6_SEND_MESSAGE {
  description: "Handle message send"
  logic: |
    SEND_MESSAGE = () => {
      IF NOT message.trim() AND attachments.length == 0 THEN
        RETURN
      END IF

      isLoading = MUTATION.isPending
      hasContent = message.trim().length > 0 OR attachments.length > 0

      MUTATION.mutate()
    }
}

STEP_7_RENDER_MESSAGE_INPUT {
  description: "Render message input UI"
  logic: |
    RENDER Div className="space-y-3 p-4 border-t bg-white":
      // Attachments preview
      RENDER_ATTACHMENTS()

      // Message input
      Div className="flex gap-2":
        Textarea {
          ref: textareaRef,
          value: message,
          onChange: ON_MESSAGE_CHANGE,
          onKeyDown: ON_KEY_DOWN,
          placeholder: "Nhập tin nhắn... (Shift+Enter để xuống dòng) / Type message... (Shift+Enter for newline)",
          className: "min-h-12 resize-none",
          disabled: isLoading,
          rows: 1
        }

        Div className="flex flex-col gap-2":
          Button {
            type: "button",
            variant: "outline",
            size: "icon",
            onClick: ON_ATTACHMENT_CLICK,
            disabled: isLoading,
            icon: Paperclip,
            title: "Đính kèm tệp / Attach file"
          }

          Button {
            onClick: SEND_MESSAGE,
            disabled: isLoading OR NOT hasContent,
            size: "icon",
            icon: Send,
            title: "Gửi tin nhắn / Send message"
          }

      // Hidden file input
      Input {
        ref: fileInputRef,
        type: "file",
        multiple: true,
        onChange: ON_FILE_SELECT,
        className: "hidden",
        accept: "image/*,.pdf,.doc,.docx"
      }

      // Keyboard hint
      P className="text-xs text-gray-500":
        "Nhấn Enter để gửi / Press Enter to send"
}
```

---

## Key Interfaces

```typescript
interface SendMessageProps {
  conversationId: string;
  onMessageSent?: () => void;
}

interface SendMessageRequest {
  conversationId: string;
  content: string;
  attachments?: File[];
}

interface SendMessageResponse {
  id: string;
  conversationId: string;
  content: string;
  attachments: AttachmentInfo[];
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface AttachmentInfo {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

interface OptimisticMessage {
  id: string;
  content: string;
  createdAt: Date;
  isTemp: boolean;
  attachments: string[];
}
```

---

## Integration Points

```pseudo
INTEGRATION SendMessageFeature {
  UI_COMPONENTS: {
    displays: ["Textarea", "Button", "File input preview"],
    feedback: ["useToast()"]
  }

  STATE_MANAGEMENT: {
    local_state: "useState(message, attachments)",
    mutation_state: "TanStack Query mutation",
    optimistic_state: "Query cache update"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/conversations/{id}/messages",
    upload_attachment: "POST /api/v1/conversations/{id}/attachments"
  }

  FILE_HANDLING: {
    max_file_size: "10 MB per file",
    max_attachments: "5 files per message",
    allowed_types: ["image/*", ".pdf", ".doc", ".docx"],
    upload_method: "FormData for multipart"
  }

  QUERY_INVALIDATION: [
    "['messages', conversationId]"
  ]

  CALLBACKS: {
    onMessageSent: "Called after successful send"
  }

  ERROR_HANDLING: {
    FileTooBig: "Show size validation error",
    TooManyAttachments: "Limit to 5 files",
    UploadError: "Show retry-able error",
    NetworkError: "Show connection error"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  MESSAGES: {
    placeholder: "Nhập tin nhắn... (Shift+Enter để xuống dòng) / Type message... (Shift+Enter for newline)",
    send_button: "Gửi / Send",
    attach_button: "Đính kèm / Attach",
    keyboard_hint: "Nhấn Enter để gửi / Press Enter to send",
    attach_title: "Đính kèm tệp / Attach file",
    error_title: "Lỗi gửi tin nhắn / Failed to send message",
    max_files: "Tối đa 5 tệp đính kèm / Maximum 5 attachments",
    file_too_large: "Tệp quá lớn (tối đa 10MB) / File too large (max 10MB)"
  }

  VALIDATION: {
    empty_message: "Cannot send empty message without attachments",
    file_too_large: "File exceeds 10MB limit",
    too_many_files: "Cannot attach more than 5 files"
  }

  KEYBOARD_SHORTCUTS: {
    send: "Enter (when not in compose mode)",
    newline: "Shift + Enter",
    attach: "Click button or keyboard shortcut"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.16 - CreateConversationFeature",
    relationship: "Send messages in created conversation",
    integration: "conversationId from creation"
  },
  {
    pattern: "12.21 - MarkAsReadFeature",
    relationship: "Mark received messages as read",
    integration: "Message list coordination"
  }
]
```

---

## Performance Considerations

```pseudo
PERFORMANCE {
  OPTIMIZATIONS: {
    optimistic_updates: "Show message immediately before server",
    textarea_autogrow: "Adjust height based on content",
    file_validation: "Client-side checks before upload",
    debounce: "Not needed (send on enter only)"
  }

  BENCHMARKS: {
    send_latency: "< 2s typical (optimistic shows immediately)",
    file_upload: "< 3s for 1MB files",
    max_attachment_size: "10MB per file"
  }
}
```

---

**End of Pattern 12.17**

*Feature component pattern for message sending*
*Optimistic updates with file attachment support*
