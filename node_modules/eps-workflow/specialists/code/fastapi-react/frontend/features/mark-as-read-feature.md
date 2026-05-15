# Pattern 12.21: MarkAsReadFeature

**Role**: Mark messages as read with optimistic state updates
**Focus**: Mutation hook for read status updates
**Technology**: React 19, TypeScript 5, TanStack Query v5
**Domain**: Vietnamese legal platform (Tin Nhắn)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE MarkAsReadFeature {
  PURPOSE: "Mark messages or conversations as read with optimistic updates"

  RESPONSIBILITIES: [
    "Update read status for messages",
    "Optimistically update UI before server confirmation",
    "Refetch on error rollback",
    "Invalidate message and conversation queries",
    "Call success callback on completion"
  ]

  TECH_STACK: {
    primary: "TanStack Query mutations",
    state_management: "Query cache optimization",
    patterns: ["optimistic-updates", "custom-hook"]
  }

  DOMAIN_CONTEXT: {
    entities: ["Tin Nhắn (Message)", "Trạng Thái (Status)"],
    operations: ["Mark as read", "Bulk read status update"],
    constraints: ["One or multiple messages"]
  }
}
```

---

## Workflow: MarkAsReadFeature_Workflow

```pseudo
WORKFLOW MarkAsReadFeature {
  INPUT: {
    conversationId: string,
    messageIds: string[],
    onSuccess?: () => void
  }

  PRECONDITIONS: [
    "Message IDs are valid",
    "Conversation is open",
    "Messages exist in cache"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_SETUP_HOOK {
  description: "Initialize custom hook for marking as read"
  logic: |
    FUNCTION useMarkAsRead({
      conversationId,
      messageIds,
      onSuccess
    }) {
      queryClient = useQueryClient()

      RETURN useMutation({
        // Step 2 and beyond follow
      })
    }
}

STEP_2_CONFIGURE_MUTATION {
  description: "Setup mutation function"
  logic: |
    MUTATION = useMutation({
      mutationFn: () =>
        markMessageAsRead({
          conversationId: conversationId,
          messageIds: messageIds
        }),

      // Continue to onMutate
    })
}

STEP_3_HANDLE_OPTIMISTIC_UPDATE {
  description: "Update UI optimistically"
  logic: |
    onMutate: () => {
      // Update messages in query cache
      queryClient.setQueryData(
        ['messages', conversationId],
        (old: any) =>
          old?.map((msg: any) =>
            messageIds.includes(msg.id)
              ? { ...msg, isRead: true }
              : msg
          )
      )

      // Update conversation last read
      queryClient.setQueryData(
        ['conversations', conversationId],
        (old: any) =>
          IF old THEN
            { ...old, lastReadAt: NOW() }
          ELSE
            old
          END IF
      )
    }
}

STEP_4_HANDLE_SUCCESS {
  description: "Handle successful read update"
  logic: |
    onSuccess: () => {
      // Call user callback
      onSuccess?.()

      // Conversation badge might update
      INVALIDATE_QUERY(['conversations'])
    }
}

STEP_5_HANDLE_ERROR {
  description: "Handle mutation error"
  logic: |
    onError: (error: Error) => {
      SHOW_TOAST({
        title: "Lỗi / Error",
        message: "Không thể cập nhật trạng thái đọc / Failed to update read status",
        variant: "destructive"
      })

      // Cache will auto-rollback due to React Query
    }
}

STEP_6_HANDLE_SETTLED {
  description: "Refetch after mutation settles"
  logic: |
    onSettled: () => {
      // Refetch messages to sync
      INVALIDATE_QUERY(['messages', conversationId])

      // Refetch conversation for unread count
      INVALIDATE_QUERY(['conversations', conversationId])
    }
}

STEP_7_USAGE_IN_COMPONENT {
  description: "Example usage in message list component"
  logic: |
    COMPONENT MessageList({ conversationId, messages }) {
      markAsRead = useMarkAsRead({
        conversationId: conversationId,
        messageIds: messages
          .filter((m) => !m.isRead)
          .map((m) => m.id),
        onSuccess: () => {
          LOG("Messages marked as read")
        }
      })

      // Trigger on mount or visibility
      useEffect(() => {
        IF messages.some(m => !m.isRead) THEN
          markAsRead.mutate()
        END IF
      }, [messages])

      RENDER MessageListUI(messages)
    }
}
```

---

## Key Interfaces

```typescript
interface MarkAsReadProps {
  conversationId: string;
  messageIds: string[];
  onSuccess?: () => void;
}

interface MarkAsReadRequest {
  conversationId: string;
  messageIds: string[];
}

interface MarkAsReadResponse {
  success: boolean;
  updatedCount: number;
  timestamp: Date;
}

interface Message {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
  };
}

// Hook return type
interface UseMarkAsReadReturn extends UseMutationResult {
  mutate: () => void;
  isPending: boolean;
}
```

---

## Integration Points

```pseudo
INTEGRATION MarkAsReadFeature {
  UI_COMPONENTS: {
    triggers: ["useInView hook on message", "Page visibility change"],
    displays: ["Visual read status change (opacity)"]
  }

  STATE_MANAGEMENT: {
    optimistic_state: "Query cache update",
    server_state: "TanStack Query mutation",
    refetch: "Auto-refetch on settle"
  }

  API_ENDPOINTS: {
    primary: "PATCH /api/v1/conversations/{id}/messages/mark-read",
    method: "PATCH (idempotent)"
  }

  QUERY_UPDATES: {
    on_mutate: [
      "['messages', conversationId]",
      "['conversations', conversationId]"
    ],
    on_settle: [
      "['messages', conversationId]",
      "['conversations', conversationId]",
      "['unread-count']"
    ]
  }

  PARENT_INTEGRATION: {
    calls_from: "MessageList component",
    triggers: "Page visibility, message scroll into view",
    callback: "onSuccess for analytics"
  }

  ERROR_HANDLING: {
    NetworkError: "Show toast, rollback cache",
    PermissionError: "Log error silently",
    ServerError: "Retry with toast"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  UI_UPDATES: {
    unread_message: "Message appears with full opacity",
    read_message: "Message appears with reduced opacity (60%)",
    read_timestamp: "Show 'Đã đọc / Read' indicator"
  }

  VISIBILITY: {
    unread_badge: "Show unread count in conversation list",
    read_state: "No badge when all messages read",
    last_read_indicator: "Optional visual separator"
  }

  ERROR_MESSAGES: {
    error_title: "Lỗi / Error",
    error_message: "Không thể cập nhật trạng thái đọc / Failed to update read status"
  }

  STATUS_LABELS: {
    unread: "Chưa đọc / Unread",
    read: "Đã đọc / Read",
    reading: "Đang đọc... / Marking as read..."
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.17 - SendMessageFeature",
    relationship: "Messages sent become unread for recipients",
    integration: "Query cache coordination"
  },
  {
    pattern: "12.22 - SearchMessagesFeature",
    relationship: "Search results include read status",
    integration: "Display consistent read indicators"
  }
]
```

---

## Performance Considerations

```pseudo
PERFORMANCE {
  OPTIMIZATIONS: {
    optimistic_update: "No UI lag when marking as read",
    bulk_operation: "Mark multiple messages in one call",
    auto_refetch: "Sync with server without manual refresh",
    debounce: "Optional: batch read updates every 1 second"
  }

  BENCHMARKS: {
    mutation_latency: "< 500ms typical",
    cache_update: "< 100ms (instant UI update)",
    refetch_time: "< 1s after server confirmation"
  }

  CACHING_STRATEGY: {
    optimistic: "Update immediately",
    fallback: "Keep cached version if error",
    refetch: "Resync after settle"
  }
}
```

---

## Batch Read Example

```pseudo
BATCH_MARK_AS_READ {
  SCENARIO: "User opens conversation with 10 unread messages"

  STEP_1: useMarkAsRead hook initialized with all 10 message IDs

  STEP_2: Single mutation call with [id1, id2, ..., id10]

  STEP_3: Optimistically update all 10 in cache

  STEP_4: API marks all 10 as read in database

  STEP_5: Refetch to confirm and sync

  BENEFIT: Efficient batch operation vs individual calls
}
```

---

**End of Pattern 12.21**

*Feature component pattern for marking messages as read*
*Optimistic updates with mutation hook pattern*
