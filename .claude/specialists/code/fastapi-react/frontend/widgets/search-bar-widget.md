# Widget 11.34: SearchBarWidget

**Type**: Input Widget
**Role**: Global search with autocomplete and search history
**Technology**: React 19, TypeScript, Zustand
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET SearchBarWidget {
  ROLE: "Global search input with suggestions and history"

  RESPONSIBILITIES: [
    "Capture search queries",
    "Display autocomplete suggestions",
    "Show recent searches",
    "Handle keyboard navigation",
    "Manage loading state",
    "Support type-specific icons and labels"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    state_management: "React hooks (useState, useCallback, useRef, useEffect)",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react",
    utilities: "Ref-based DOM manipulation"
  }

  DOMAIN_CONTEXT: {
    use_case: "Platform-wide search for documents, users, conversations",
    result_types: ["document", "user", "conversation"],
    vietnamese_labels: {
      search: "Tìm kiếm",
      recent_searches: "Tìm kiếm gần đây",
      no_results: "Không tìm thấy kết quả",
      searching: "Đang tìm kiếm..."
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN SearchBarWidget_Widget {
  PURPOSE: "Provide global search with autocomplete and recent searches"

  PROBLEM: "Users need quick, intuitive search without page navigation"

  SOLUTION: "Dropdown search with real-time suggestions and search history"

  USE_CASES: [
    "Search documents across platform",
    "Find users by name or email",
    "Locate conversations",
    "Quick navigation via search",
    "See recent search history"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW SearchBarWidget_Workflow {
  INPUT: {
    onSearch?: Function,
    onSelectResult?: Function,
    suggestions?: SearchResult[],
    recentSearches?: string[],
    isLoading?: boolean,
    placeholder?: string
  }

  PRECONDITIONS: [
    "onSearch callback should debounce input",
    "suggestions must include id, title, type"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize search state"
      logic: |
        SET query = ""
        SET isOpen = false
        SET isFocused = false
        CREATE containerRef and inputRef
    }

    STEP_2_RENDER_SEARCH_INPUT: {
      description: "Render search input with icon"
      logic: |
        RENDER input container with dynamic border colors
        SHOW Search icon
        RENDER input element with placeholder
        ON input change:
          SET query = value
          CALL onSearch(value)
        ON focus:
          SET isFocused = true
          SET isOpen = true
        ON blur:
          SET isFocused = false

        IF query.length > 0 THEN
          SHOW clear button (X icon)
          ON click:
            SET query = ""
            FOCUS input
        END IF
    }

    STEP_3_HANDLE_KEYBOARD: {
      description: "Handle keyboard navigation"
      logic: |
        ON Escape key:
          SET isOpen = false
          CLEAR query
        ON Enter key:
          IF suggestions.length > 0 THEN
            SELECT first suggestion
            CALL onSelectResult(suggestions[0])
          END IF
    }

    STEP_4_DETECT_OUTSIDE_CLICK: {
      description: "Close dropdown when clicking outside"
      logic: |
        USE useEffect with mousedown listener
        IF click outside container THEN
          SET isOpen = false
        END IF
    }

    STEP_5_RENDER_SUGGESTIONS_DROPDOWN: {
      description: "Display suggestions or recent searches"
      logic: |
        IF showSuggestions THEN
          RENDER dropdown with suggestions

          IF isLoading THEN
            SHOW "Đang tìm kiếm..." (Searching...)
          ELSE IF suggestions.length > 0 THEN
            SHOW results section header
            FOR EACH result IN suggestions:
              RENDER result item with type icon
              SHOW title
              SHOW description (if available)
              SHOW type badge
              ON click:
                CALL onSelectResult(result)
          ELSE IF query == "" AND recentSearches.length > 0 THEN
            SHOW "Tìm kiếm gần đây" (Recent Searches) header
            FOR EACH search IN recentSearches:
              RENDER recent search item
              ON click:
                CALL onSearch(search)
          ELSE
            SHOW "Không tìm thấy kết quả" (No Results)
        END IF
    }

    STEP_6_RENDER_RESULT_ICONS: {
      description: "Show type-specific icons"
      logic: |
        FOR EACH result IN suggestions:
          IF result.type == "document" THEN
            SHOW FileText icon
          ELSE IF result.type == "user" THEN
            SHOW Users icon
          ELSE IF result.type == "conversation" THEN
            SHOW MessageSquare icon
          END IF
    }
  }

  ERROR_HANDLING: {
    SearchError: "Show error message in dropdown",
    NoResults: "Show empty state",
    ClickOutsideError: "Fallback to blur event"
  }

  OUTPUT: {
    rendered_component: SearchInputWithDropdown,
    width: "max-w-2xl full responsive",
    dropdown_zindex: 50
  }

  POSTCONDITIONS: [
    "Search input captures queries",
    "Suggestions render correctly",
    "Keyboard navigation works",
    "Recent searches display when appropriate"
  ]
}
```

---

## Key Interfaces

```typescript
// Search Result
interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'user' | 'conversation';
  description?: string;
  avatar?: string;
}

// Component Props
interface SearchBarWidgetProps {
  onSearch?: (query: string) => void;
  onSelectResult?: (result: SearchResult) => void;
  suggestions?: SearchResult[];
  recentSearches?: string[];
  isLoading?: boolean;
  placeholder?: string;
}

// Component Signature
function SearchBarWidget(props: SearchBarWidgetProps): JSX.Element
```

---

## Integration Points

```pseudo
INTEGRATION SearchBarWidget_Integration {
  PARENT_COMPONENTS: [
    "GlobalHeader (main search bar)",
    "SearchPage (search results page)",
    "DashboardPage"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for query, focus, visibility",
    global_state: "Zustand for recent searches",
    server_state: "TanStack Query for suggestions"
  }

  API_ENDPOINTS: {
    search: "GET /api/v1/search?q=query&limit=10",
    suggestions: "GET /api/v1/search/suggestions?q=query"
  }

  STYLING: {
    theme: "Tailwind CSS",
    dropdown: "Max-h-96 overflow-y-auto",
    colors: "Blue focus state, gray for suggestions"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE SearchBarWidget {
  SCENARIO: "User searches for a document"

  ACTORS: {
    user: "Lawyer searching for document",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User clicks search bar
      System shows "Tìm kiếm gần đây" (Recent Searches) section

    STEP_2: |
      User types "Hợp đồng ABC"
      System calls onSearch("Hợp đồng ABC")

    STEP_3: |
      System shows loading state "Đang tìm kiếm..."
      Backend returns matching results:
        - Document: "Hợp đồng ABC Corp 2024.pdf"
        - Conversation: "Thảo luận về hợp đồng ABC..."

    STEP_4: |
      User sees results with type badges
      User clicks on document result
      System calls onSelectResult(documentResult)
      Dropdown closes

    STEP_5: |
      User navigates to document page
      Dropdown closes automatically
  }
}
```

---

## Performance Considerations

```pseudo
PERFORMANCE SearchBarWidget_Performance {
  OPTIMIZATION_STRATEGIES: {
    debounce: "Debounce search input by 300ms",
    memoization: "Memoize suggestion items",
    rendering: "Virtual scroll for large result sets",
    event_handling: "Use useCallback for callbacks"
  }

  BENCHMARKS: {
    target_render_time: "< 100ms",
    search_response: "< 300ms (with debounce)",
    suggestion_display: "< 50ms",
    keyboard_response: "< 100ms"
  }

  BEST_PRACTICES: [
    "Debounce search by 300ms",
    "Limit suggestions to 8-10",
    "Virtual scroll for large lists",
    "Use useCallback for handlers",
    "Cache recent searches in localStorage"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  SEARCHABLE_ENTITIES: {
    document: "Tài liệu",
    user: "Người dùng",
    conversation: "Hội thoại"
  }

  SEARCH_SCENARIOS: {
    document_search: "Search by name, type, owner",
    user_search: "Search by name or email",
    conversation_search: "Search by title or participants"
  }

  LOCALIZATION: {
    language: "Vietnamese",
    search_placeholder: "Tìm kiếm tài liệu, người dùng...",
    recent_searches: "Tìm kiếm gần đây",
    no_results: "Không tìm thấy kết quả",
    searching: "Đang tìm kiếm..."
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING SearchBarWidget_Tests {
  UNIT_TESTS: [
    "Should render search input",
    "Should show recent searches when empty",
    "Should display suggestions on input",
    "Should show loading state",
    "Should show 'No results' message",
    "Should clear query on Escape",
    "Should select first result on Enter"
  ]

  INTEGRATION_TESTS: [
    "Search input debounces correctly",
    "Results render with correct types",
    "Click outside closes dropdown",
    "Recent searches persist",
    "Navigation works on result click"
  ]

  EDGE_CASES: [
    "Very long query",
    "Special characters in search",
    "Rapid sequential searches",
    "Many results (>100)",
    "Search with spaces only"
  ]
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 340
**Status**: Completed
