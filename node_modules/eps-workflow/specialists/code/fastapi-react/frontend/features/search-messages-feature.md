# Pattern 12.22: SearchMessagesFeature

**Role**: Full-text search within conversations
**Focus**: Debounced search with fuzzy matching
**Technology**: React 19, TypeScript 5, TanStack Query v5
**Domain**: Vietnamese legal platform (Tin Nhắn)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE SearchMessagesFeature {
  PURPOSE: "Enable full-text search within conversation messages"

  RESPONSIBILITIES: [
    "Capture search input with debouncing",
    "Query messages based on search term",
    "Display search results with context",
    "Highlight matching terms in results",
    "Show result count",
    "Handle empty search state"
  ]

  TECH_STACK: {
    primary: "TanStack Query v5 with debouncing",
    ui_components: "Input, custom result display",
    search_engine: "Backend fuzzy search API",
    patterns: ["debounced-search", "result-highlighting"]
  }

  DOMAIN_CONTEXT: {
    entities: ["Tin Nhắn (Message)", "Cuộc Hội Thoại (Conversation)"],
    search_fields: ["content", "sender", "attachments"],
    display_fields: ["content", "sender.name", "createdAt", "highlighted_snippet"]
  }
}
```

---

## Workflow: SearchMessagesFeature_Workflow

```pseudo
WORKFLOW SearchMessagesFeature {
  INPUT: {
    conversationId: string,
    onResultsChange?: (results: SearchResult[]) => void
  }

  PRECONDITIONS: [
    "Conversation is open",
    "Search API available",
    "useDebouncedValue hook available"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_STATE {
  description: "Setup search input state"
  logic: |
    search = useState('')

    RETURN search
}

STEP_2_DEBOUNCE_SEARCH_INPUT {
  description: "Debounce search with 300ms delay"
  logic: |
    debouncedSearch = useDebouncedValue(search, 300)

    // Only query if minimum length met
    isValidSearch = debouncedSearch.length >= 2

    RETURN { debouncedSearch, isValidSearch }
}

STEP_3_FETCH_SEARCH_RESULTS {
  description: "Query messages matching search term"
  logic: |
    QUERY = useQuery({
      queryKey: ['messages-search', conversationId, debouncedSearch],
      queryFn: () =>
        searchMessages(conversationId, debouncedSearch),
      enabled: isValidSearch // Only query if >= 2 chars
    })

    results = QUERY.data || []
    isLoading = QUERY.isLoading

    RETURN { results, isLoading }
}

STEP_4_HANDLE_SEARCH_CHANGE {
  description: "Update state on input change"
  logic: |
    ON_SEARCH_CHANGE = (value: string) => {
      setSearch(value)
      onResultsChange?.(results) // Callback with results
    }
}

STEP_5_RENDER_SEARCH_INPUT {
  description: "Render search input with icon"
  logic: |
    RENDER Div className="relative":
      SearchIcon className="absolute left-2 top-1/2 h-4 w-4":
        // Icon positioning

      Input {
        placeholder: "Tìm tin nhắn... / Search messages...",
        value: search,
        onChange: (e) => ON_SEARCH_CHANGE(e.target.value),
        className: "pl-8"
      }
}

STEP_6_DISPLAY_SEARCH_RESULTS {
  description: "Show search results with count"
  logic: |
    IF search AND isValidSearch THEN
      RENDER Div className="mt-1":
        P className="text-xs text-gray-500":
          "Tìm thấy {results.length} tin nhắn / Found {results.length} messages"

        IF results.length > 0 THEN
          RENDER ResultsList:
            FOR EACH result IN results:
              ResultItem {
                sender: result.sender.name,
                timestamp: formatDate(result.createdAt),
                snippet: highlightMatches(result.content, debouncedSearch),
                onClick: () => scrollToMessage(result.id)
              }
            END FOR
        ELSE
          RENDER EmptyState:
            "Không tìm thấy tin nhắn / No messages found"
        END IF
    END IF
}

STEP_7_HIGHLIGHT_MATCHES {
  description: "Highlight search term in results"
  logic: |
    FUNCTION highlightMatches(text, searchTerm) {
      // Replace matching text with <mark> tag
      regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi')
      highlighted = text.replace(
        regex,
        '<mark className="bg-yellow-200">$1</mark>'
      )

      // Return first 100 chars with ellipsis
      IF highlighted.length > 100 THEN
        RETURN highlighted.substring(0, 100) + "..."
      END IF

      RETURN highlighted
    }
}

STEP_8_SCROLL_TO_MESSAGE {
  description: "Scroll to selected message"
  logic: |
    FUNCTION scrollToMessage(messageId) {
      element = document.getElementById(`message-${messageId}`)

      IF element THEN
        element.scrollIntoView({ behavior: 'smooth' })
        element.classList.add('highlight-animation')
      END IF
    }
}
```

---

## Key Interfaces

```typescript
interface SearchMessagesProps {
  conversationId: string;
  onResultsChange?: (results: SearchResult[]) => void;
}

interface SearchResult {
  id: string;
  conversationId: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  attachments?: AttachmentInfo[];
  snippet?: string; // Context around match
  highlightedContent?: string; // HTML with highlights
}

interface SearchRequest {
  conversationId: string;
  query: string;
  limit?: number;
  offset?: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
}

// Hook for pagination
interface UsePaginatedSearchResult {
  results: SearchResult[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
}
```

---

## Integration Points

```pseudo
INTEGRATION SearchMessagesFeature {
  UI_COMPONENTS: {
    triggers: ["Input focus/change"],
    displays: ["Results list", "Empty state", "Loading indicator"]
  }

  STATE_MANAGEMENT: {
    local_state: "useState(search)",
    server_state: "TanStack Query cache",
    debounce: "useDebouncedValue(search, 300)"
  }

  API_ENDPOINTS: {
    primary: "GET /api/v1/conversations/{id}/messages/search?q={query}",
    fuzzy_search: "Backend implements fuzzy matching"
  }

  SEARCH_OPTIONS: {
    min_chars: 2,
    debounce_delay: "300ms",
    max_results: 50,
    snippet_length: "100 characters"
  }

  HIGHLIGHTING: {
    method: "Client-side HTML highlighting",
    style: "bg-yellow-200 background",
    animation: "Pulse on selection"
  }

  PARENT_INTEGRATION: {
    placement: "Message list header or sidebar",
    results_display: "Overlay or separate panel",
    scroll_coordination: "Scroll to selected result"
  }

  ERROR_HANDLING: {
    NetworkError: "Show retry-able error",
    InvalidQuery: "Show validation message",
    NoResults: "Show helpful empty state"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  LABELS: {
    placeholder: "Tìm tin nhắn... / Search messages...",
    found_results: "Tìm thấy {n} tin nhắn / Found {n} messages",
    found_one: "Tìm thấy 1 tin nhắn / Found 1 message",
    no_results: "Không tìm thấy tin nhắn / No messages found",
    min_chars: "Nhập ít nhất 2 ký tự / Enter at least 2 characters"
  }

  SEARCH_RESULTS: {
    result_sender: "Từ / From: {name}",
    result_date: "{date} lúc {time}",
    result_snippet: "...{snippet}...",
    has_attachments: "Có {n} tệp đính kèm / Has {n} attachments"
  }

  HIGHLIGHTING: {
    highlight_color: "Vàng / Yellow",
    match_indicator: "In đậm / Bold"
  }

  SEARCH_FIELDS: {
    message_content: "Nội dung tin nhắn / Message content",
    sender_name: "Tên người gửi / Sender name",
    date: "Ngày gửi / Send date",
    attachment: "Tên tệp đính kèm / Attachment name"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.17 - SendMessageFeature",
    relationship: "Search finds sent messages",
    integration: "Message content indexed"
  },
  {
    pattern: "12.21 - MarkAsReadFeature",
    relationship: "Search results show read status",
    integration: "Display consistent indicators"
  }
]
```

---

## Performance Considerations

```pseudo
PERFORMANCE {
  OPTIMIZATIONS: {
    debouncing: "300ms reduces API load",
    min_chars: "2 character minimum",
    caching: "TanStack Query caches results",
    lazy_rendering: "Virtualized list for large results",
    pagination: "Load more button for scalability"
  }

  BENCHMARKS: {
    debounce_delay: "300ms",
    search_latency: "< 500ms for typical queries",
    max_results_display: "First 50 results",
    highlight_performance: "< 50ms for client-side highlighting"
  }

  OPTIMIZATIONS_DETAILED: {
    fuzzy_search: "Backend implements Levenshtein distance",
    indexing: "Full-text index on message content",
    pagination: "Infinite scroll or load more button"
  }
}
```

---

## Advanced Features

```pseudo
ADVANCED_FEATURES {
  FILTER_BY_SENDER: |
    "from:username" search syntax
    Filter results by message sender

  FILTER_BY_DATE: |
    "after:2024-01-01" search syntax
    Filter results by date range

  FILTER_BY_TYPE: |
    "has:attachment" search syntax
    Filter messages with attachments

  COMBINED_SEARCH: |
    "from:username after:2024-01-01 contract"
    Combine multiple filters and keywords
}
```

---

## Search Algorithm

```pseudo
SEARCH_ALGORITHM {
  STEP_1_TOKENIZE: "Break query into tokens"

  STEP_2_FUZZY_MATCH: "Use Levenshtein distance for typo tolerance"

  STEP_3_RANK_RESULTS: "Rank by relevance score"
    - Exact match: score 100
    - Fuzzy match (1 char diff): score 80
    - Fuzzy match (2 char diff): score 60
    - Contains match: score 40

  STEP_4_SORT: "Sort by relevance, then by date (newest first)"

  STEP_5_LIMIT: "Return top 50 results"

  STEP_6_HIGHLIGHT: "Client-side highlight matching terms"
}
```

---

**End of Pattern 12.22**

*Feature component pattern for message search*
*Debounced fuzzy search with result highlighting*
