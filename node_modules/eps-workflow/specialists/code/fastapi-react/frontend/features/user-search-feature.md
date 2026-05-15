# Pattern 12.7: UserSearchFeature

**Role**: Real-time user search with debouncing and result display
**Focus**: Popover-based search component with avatar display
**Technology**: React 19, TypeScript 5, TanStack Query v5, Shadcn/ui Command
**Domain**: Vietnamese legal platform (Người Dùng)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE UserSearchFeature {
  PURPOSE: "Enable real-time user search with debounced API calls"

  RESPONSIBILITIES: [
    "Capture search input with debouncing",
    "Query users based on search term",
    "Display search results in popover",
    "Handle user selection callback",
    "Show empty state when no results"
  ]

  TECH_STACK: {
    primary: "TanStack Query v5 with debouncing",
    ui_components: "Shadcn/ui Popover, Command, Avatar",
    patterns: ["debounced-search", "combobox-ui"]
  }

  DOMAIN_CONTEXT: {
    entities: ["Người Dùng (User)"],
    search_fields: ["name", "email"],
    display: ["avatar", "name", "email"]
  }
}
```

---

## Workflow: UserSearchFeature_Workflow

```pseudo
WORKFLOW UserSearchFeature {
  INPUT: {
    onSelect?: (userId: string) => void,
    placeholder?: string
  }

  PRECONDITIONS: [
    "searchUsers API available",
    "useDebouncedValue hook available"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_STATE {
  description: "Initialize search and UI state"
  logic: |
    search = useState('')
    open = useState(false)

    RETURN { search, open }
}

STEP_2_DEBOUNCE_SEARCH {
  description: "Debounce search input"
  logic: |
    debouncedSearch = useDebouncedValue(search, 300)

    // Only query when debounced value changes and length >= 2
    IF debouncedSearch.length < 2 THEN
      results = []
    ELSE
      results = AWAIT searchUsers(debouncedSearch)
    END IF
}

STEP_3_FETCH_SEARCH_RESULTS {
  description: "Query for users matching search term"
  logic: |
    QUERY = useQuery({
      queryKey: ['users-search', debouncedSearch],
      queryFn: () => searchUsers(debouncedSearch),
      enabled: debouncedSearch.length >= 2
    })

    results = QUERY.data || []

    RETURN results
}

STEP_4_RENDER_SEARCH_INPUT {
  description: "Render search input with icon"
  logic: |
    RENDER Popover {
      Trigger:
        DIV className="relative":
          SearchIcon left-aligned
          Input value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
    }
}

STEP_5_RENDER_RESULTS {
  description: "Display search results"
  logic: |
    IF NOT search THEN
      RETURN empty (no popover)
    END IF

    IF search AND debouncedSearch.length >= 2 THEN
      RENDER PopoverContent {
        Command {
          CommandEmpty: "Không tìm thấy / No users found"

          CommandGroup classname="max-h-64 overflow-auto":
            FOR EACH user IN results:
              CommandItem {
                Avatar: user.avatar
                Name: user.name (bold)
                Email: user.email (gray, small)
              }
            END FOR
        }
      }
    END IF
}

STEP_6_HANDLE_SELECTION {
  description: "Handle user selection"
  logic: |
    ON_SELECT = (userId) => {
      onSelect?.(userId)
      setSearch('')
      setOpen(false)
    }
}
```

---

## Key Interfaces

```typescript
interface UserSearchProps {
  onSelect?: (userId: string) => void;
  placeholder?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// API function
async function searchUsers(query: string): Promise<User[]>;
```

---

## Integration Points

```pseudo
INTEGRATION UserSearchFeature {
  UI_COMPONENTS: {
    triggers: ["Input focus"],
    displays: ["Popover", "Command", "Avatar"],
    feedback: ["Empty state message"]
  }

  STATE_MANAGEMENT: {
    local_state: "useState(search, open)",
    server_state: "TanStack Query cache",
    debounce: "useDebouncedValue(search, 300ms)"
  }

  API_ENDPOINTS: {
    primary: "GET /api/v1/users/search?q={query}"
  }

  BEHAVIOR: {
    open_trigger: "Input focus OR text change",
    close_trigger: "Selection OR Escape key",
    min_chars: 2,
    debounce_delay: "300ms"
  }

  CALLBACKS: {
    onSelect: "Called with userId when user clicks result"
  }

  PARENT_INTEGRATION: {
    expected_placement: "User list toolbar or form",
    side_effect: "Optional navigation or form update"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  UI_LABELS: {
    placeholder: "Tìm người dùng / Search users...",
    empty_state: "Không tìm thấy / No users found",
    min_chars: "Nhập ít nhất 2 ký tự / Enter at least 2 characters"
  }

  RESULT_FIELDS: {
    avatar: "User profile image",
    name: "Tên Người Dùng / User Name",
    email: "Địa chỉ Email / Email Address"
  }

  USER_ROLES: {
    admin: "Quản trị viên / Admin",
    luatsu: "Luật sư / Lawyer",
    user: "Người dùng / User",
    viewer: "Người xem / Viewer"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.6 - UserFiltersFeature",
    relationship: "Complements advanced filtering",
    integration: "Both affect user list display"
  },
  {
    pattern: "12.16 - CreateConversationFeature",
    relationship: "Uses similar user search component",
    integration: "Shares searchUsers API and UI patterns"
  }
]
```

---

## Performance Considerations

```pseudo
PERFORMANCE {
  OPTIMIZATIONS: {
    debouncing: "300ms debounce reduces API calls",
    min_chars: "2 character minimum reduces irrelevant results",
    query_caching: "TanStack Query caches search results",
    lazy_loading: "Results only load when search >= 2 chars"
  }

  BENCHMARKS: {
    debounce_delay: "300ms (user typing speed)",
    max_results_display: "Unlimited (virtualized list)",
    search_response_time: "< 500ms for typical queries"
  }

  USER_EXPERIENCE: {
    instant_feedback: "Clear input immediately",
    empty_state_clear: "No results message is helpful",
    selection_closes: "Auto-close popover after selection"
  }
}
```

---

## Accessibility

```pseudo
ACCESSIBILITY {
  ARIA_LABELS: {
    input: "Search users input field",
    popover: "Search results list",
    no_results: "No users found message"
  }

  KEYBOARD_SUPPORT: {
    arrow_up_down: "Navigate results",
    enter: "Select highlighted result",
    escape: "Close popover",
    tab: "Move to next element"
  }

  SCREEN_READERS: {
    result_count: "Announce 'X users found'",
    selected_user: "Announce selected user name"
  }
}
```

---

**End of Pattern 12.7**

*Feature component pattern for user search*
*Debounced real-time search with popover results*
