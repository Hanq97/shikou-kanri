# Command Palette Feature

**Role**: Global Command Search & Execution Engine
**Focus**: Fuzzy search, command categorization, recent commands, keyboard shortcuts
**Technology**: React 19, Zustand, Command Dialog Component
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST CommandPaletteFeature {
  ROLE: "Provide global command palette with fuzzy search and command execution"

  RESPONSIBILITIES: [
    "Index and search commands via fuzzy algorithm",
    "Categorize commands for organized display",
    "Track and display recently used commands",
    "Execute commands with callbacks",
    "Keyboard navigation (Cmd+K)"
  ]

  TECH_STACK: {
    primary: "React 19 client component with Zustand",
    libraries: ["zustand", "command-dialog", "react"],
    patterns: ["fuzzy-search", "command-pattern", "recent-items"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Command", "Category", "Search", "Execution"]
  }
}
```

---

## Pattern 12.40: CommandPaletteFeature

### Overview

```pseudo
PATTERN CommandPaletteFeature {
  PURPOSE: "Provide global command palette for rapid action execution"

  PROBLEM: "Users need fast access to commands without navigating menus or remembering paths"

  SOLUTION: "Global Cmd+K accessible command palette with fuzzy search and categorization"

  USE_CASES: [
    "User presses Cmd+K to open palette",
    "User types 'new' to find 'New Document' command",
    "User sees recent commands at top",
    "Commands grouped by category (Documents, Users, System)"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW CommandPaletteFeature_Workflow {
  INPUT: {
    commands: CommandItem[],
    onCommandSelect?: (commandId: string) => void,
    categories?: string[]
  }

  PRECONDITIONS: [
    "CommandItem array provided",
    "Each command has unique ID",
    "Categories defined for commands"
  ]

  STEPS: {
    STEP_1_INITIALIZE_STORE: {
      description: "Initialize command palette Zustand store"
      logic: |
        INITIALIZE_STORE {
          isOpen: false,
          setIsOpen: FUNCTION(open: boolean),
          toggleOpen: FUNCTION(),
          recentCommands: [],
          addRecentCommand: FUNCTION(id: string) {
            // Keep last 5 recent commands
            updated = [id, ...FILTER(recentCommands, c => c != id)]
            STORE recentCommands = updated.slice(0, 5)
          }
        }
    }

    STEP_2_SETUP_KEYBOARD_LISTENER: {
      description: "Register Cmd+K shortcut to open palette"
      logic: |
        ON_MOUNT() {
          ATTACH_LISTENER('keydown', (event: KeyboardEvent) {
            IF (event.metaKey OR event.ctrlKey) AND event.key == 'k' THEN
              event.preventDefault()
              CALL toggleOpen()
            END IF
          })

          RETURN () => REMOVE_LISTENER()
        }
    }

    STEP_3_RENDER_COMMAND_DIALOG: {
      description: "Render command palette dialog"
      logic: |
        IF isOpen THEN
          RENDER CommandDialog {
            open: isOpen,
            onOpenChange: setIsOpen,
            content: {
              input: CommandInput {
                placeholder: "Tìm lệnh... (Search commands...)",
                value: search,
                onValueChange: setSearch
              },
              list: CommandList { ... }
            }
          }
        END IF
    }

    STEP_4_FUZZY_SEARCH: {
      description: "Implement fuzzy search algorithm"
      logic: |
        FUNCTION fuzzySearch(query: string, items: CommandItem[]) {
          IF query.length == 0 THEN
            RETURN items
          END IF

          queryLower = query.toLowerCase()
          results = []

          FOR EACH item IN items:
            labelMatch = item.label.toLowerCase().includes(queryLower)
            descMatch = item.description?.toLowerCase().includes(queryLower)

            IF NOT (labelMatch OR descMatch) THEN
              CONTINUE
            END IF

            // Calculate relevance score
            score = 0
            IF item.label.toLowerCase().startsWith(queryLower) THEN
              score += 10  // Higher weight for prefix match
            END IF

            IF item.label.toLowerCase().includes(queryLower) THEN
              score += 5   // Medium weight for substring
            END IF

            IF item.description?.toLowerCase().includes(queryLower) THEN
              score += 2   // Lower weight for description
            END IF

            results.APPEND({
              item: item,
              score: score
            })
          END FOR

          // Sort by score descending
          results.SORT((a, b) => b.score - a.score)

          RETURN results.MAP(r => r.item)
        }
    }

    STEP_5_DISPLAY_RECENT_COMMANDS: {
      description: "Show recently executed commands first"
      logic: |
        IF search.length == 0 AND recentCommands.length > 0 THEN
          recentItems = FILTER(commands, c => recentCommands.includes(c.id))

          RENDER CommandGroup {
            heading: "Gần đây (Recent)",
            items: recentItems,
            onSelect: (cmd) => HANDLE_COMMAND_SELECT(cmd)
          }

          RENDER CommandSeparator
        END IF
    }

    STEP_6_GROUP_BY_CATEGORY: {
      description: "Organize commands by category"
      logic: |
        filteredCommands = CALL fuzzySearch(search, commands)

        // Group by category
        grouped = {}
        FOR EACH cmd IN filteredCommands:
          IF NOT grouped[cmd.category] THEN
            grouped[cmd.category] = []
          END IF
          grouped[cmd.category].APPEND(cmd)
        END FOR

        // Render each group
        FOR EACH (category, items) IN grouped.entries():
          RENDER CommandGroup {
            heading: category,
            items: items,
            onSelect: (cmd) => HANDLE_COMMAND_SELECT(cmd)
          }
        END FOR
    }

    STEP_7_RENDER_COMMAND_ITEMS: {
      description: "Render individual command items"
      logic: |
        FOR EACH cmd IN items:
          RENDER CommandItem {
            onSelect: () => CALL handleSelect(cmd),
            content: [
              cmd.icon ? RENDER_ICON(cmd.icon) : null,
              DIV {
                title: cmd.label,
                description: cmd.description ? RENDER(cmd.description) : null
              },
              cmd.shortcut ? RENDER_SHORTCUT(cmd.shortcut) : null
            ]
          }
        END FOR
    }

    STEP_8_HANDLE_SELECTION: {
      description: "Execute selected command and update recent list"
      logic: |
        FUNCTION handleSelect(command: CommandItem) {
          // Execute command callback
          CALL command.onSelect()

          // Add to recent commands
          CALL addRecentCommand(command.id)

          // Close palette and reset search
          CALL setIsOpen(false)
          CALL setSearch('')

          // Optional: call external callback
          IF onCommandSelect THEN
            CALL onCommandSelect(command.id)
          END IF
        }
    }

    STEP_9_KEYBOARD_NAVIGATION: {
      description: "Support arrow keys and Enter for navigation"
      logic: |
        CommandDialog SUPPORTS {
          ArrowDown: "Move to next command",
          ArrowUp: "Move to previous command",
          Enter: "Select current command",
          Escape: "Close palette"
        }
    }

    STEP_10_FOOTER_HINTS: {
      description: "Display keyboard hints in footer"
      logic: |
        RENDER Footer {
          content: [
            Text("Ctrl+K để mở (Press Ctrl+K to open)"),
            Text("ESC để đóng (Press ESC to close)")
          ]
        }
    }
  }

  ERROR_HANDLING: {
    SearchError: "Display empty state with helpful message",
    CommandExecutionError: "Show error toast, keep palette open",
    StorageError: "Degrade gracefully, recent commands unavailable",
    InvalidCommands: "Filter out invalid commands, log warnings"
  }

  OUTPUT: {
    success: boolean,
    commandsIndexed: number,
    paletteOpen: boolean,
    lastExecuted?: string
  }

  POSTCONDITIONS: [
    "Palette keyboard-accessible via Cmd+K",
    "All commands searchable and executable",
    "Recent commands tracked and displayed",
    "Dialog closes after command execution"
  ]
}
```

### Key Interfaces

```typescript
// Type definitions (interfaces only, no implementation)
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon?: React.ReactNode;
  onSelect: () => void | Promise<void>;
  shortcut?: string;
}

interface CommandPaletteStore {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  recentCommands: string[];
  addRecentCommand: (id: string) => void;
  clearRecent: () => void;
}

interface CommandPaletteProps {
  commands: CommandItem[];
  onCommandSelect?: (commandId: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  categories?: string[];
}

interface SearchResult {
  item: CommandItem;
  score: number;
}

// Function signatures (no implementation)
function useCommandPalette(): CommandPaletteStore;
function fuzzySearch(query: string, items: CommandItem[]): CommandItem[];
function groupByCategory(items: CommandItem[]): Record<string, CommandItem[]>;
function scoreCommand(query: string, command: CommandItem): number;
```

### Integration Points

```pseudo
INTEGRATION CommandPaletteFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["Cmd+K keyboard shortcut"],
    displays: ["CommandDialog", "CommandInput", "CommandList", "CommandGroup", "CommandItem"]
  }

  STATE_MANAGEMENT: {
    client_state: "Zustand store (palette open, recent commands)",
    server_state: "Optional: persist recent commands to DB",
    persistence: "localStorage (optional: save recent command IDs)"
  }

  API_ENDPOINTS: {
    primary: "Optional: GET /api/v1/commands (for dynamic command loading)",
    fallback: "Static command configuration"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/command", "@/shared/ui/dialog"],
    external: ["zustand", "react", "lucide-react"]
  }

  ERROR_HANDLING: {
    no_matches: "Display 'No commands found' message",
    search_errors: "Log error, show generic error message",
    execution_errors: "Show toast with error details",
    keyboard_conflicts: "Document conflicts, prioritize Cmd+K"
  }

  EVENTS: {
    emits: ["onPaletteOpen", "onPaletteClose", "onCommandExecute"],
    listens: ["window keydown for Cmd+K", "dialog close events"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User searches for and executes a command"

  ACTORS: {
    user: "End user in application",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User is on dashboard page
      User presses Cmd+K (or Ctrl+K)
      System opens command palette dialog

    STEP_2: |
      Palette shows recent commands:
      - Tìm kiếm hợp đồng (Search contracts)
      - Tạo người dùng mới (Create user)
      - Xuất dữ liệu (Export data)

    STEP_3: |
      User types "new doc"
      System performs fuzzy search:
      - Tài liệu mới (New document) - score: 10
      - Hợp đồng mới (New contract) - score: 8

    STEP_4: |
      User sees filtered results grouped by category:
      - Documents
        - Tài liệu mới (New document) with score
      - Contracts
        - Hợp đồng mới (New contract) with score

    STEP_5: |
      User presses Enter or clicks on result
      System executes command.onSelect()
      System adds command ID to recentCommands list
      System closes palette

    STEP_6: |
      Command executes (e.g., navigate to new document form)
      User sees result of command
  }

  PSEUDO_CODE: |
    FUNCTION setupCommandPalette(commands) {
      SET { isOpen, setIsOpen, recentCommands, addRecentCommand } = useStore()

      // Keyboard shortcut
      useEffect(() => {
        FUNCTION handleKeyDown(e) {
          IF (e.metaKey OR e.ctrlKey) AND e.key == 'k' THEN
            e.preventDefault()
            SET isOpen = !isOpen
          END IF
        }

        ATTACH_LISTENER('keydown', handleKeyDown)
        RETURN CLEANUP
      })

      // Handle command selection
      FUNCTION handleSelect(cmd) {
        AWAIT cmd.onSelect()
        addRecentCommand(cmd.id)
        SET isOpen = false
      }

      // Render dialog with search
      RETURN <CommandDialog>
        <CommandInput search={search} />
        <CommandList>
          {renderRecent()}
          {renderGrouped(fuzzySearch(search, commands))}
        </CommandList>
      </CommandDialog>
    }
}
```

### Testing Guidelines

```pseudo
TESTING CommandPaletteFeature_Tests {
  UNIT_TESTS: {
    test_cases: [
      {
        name: "should perform fuzzy search correctly",
        input: { query: "new", items: [...] },
        expected: { results: [commandStartingWithNew, ...] }
      },
      {
        name: "should score prefix matches higher",
        input: { query: "new", cmd1: "New Doc", cmd2: "Document New" },
        expected: { score1: 10, score2: 5 }
      },
      {
        name: "should track recent commands (max 5)",
        input: { execute: [cmd1, cmd2, cmd3, cmd4, cmd5, cmd6] },
        expected: { recent: [cmd6, cmd5, cmd4, cmd3, cmd2] }
      },
      {
        name: "should group commands by category",
        input: { commands: [...] },
        expected: { groups: { Documents: [...], Users: [...] } }
      },
      {
        name: "should open palette on Cmd+K",
        input: { keyEvent: { key: 'k', metaKey: true } },
        expected: { open: true }
      }
    ],
    coverage_target: "≥85%"
  }

  INTEGRATION_TESTS: {
    test_scenarios: [
      "User types query, results update in real-time",
      "Recent commands displayed when palette opens",
      "Command execution and palette closes automatically",
      "Keyboard navigation (arrow keys) works",
      "Escape key closes palette without executing"
    ]
  }

  EDGE_CASES: [
    "Empty command list",
    "Duplicate command IDs",
    "Very long command labels/descriptions",
    "Rapid Cmd+K presses",
    "Command execution throws error",
    "No matches for search query",
    "Recent commands list persists across page reloads"
  ]
}
```

### Performance Considerations

```pseudo
PERFORMANCE CommandPaletteFeature_Performance {
  OPTIMIZATION_STRATEGIES: {
    search: "Memoize fuzzy search results, debounce input (100ms)",
    rendering: "Virtual scroll for large command lists (>100)",
    grouping: "Lazy group commands on first search",
    storage: "Debounce recent commands save (500ms)"
  }

  BENCHMARKS: {
    target_response_time: "< 100ms from keystroke to rendered results",
    search_time: "< 50ms for 1000 commands",
    fuzzy_match: "< 10ms for each key change",
    dialog_open: "< 200ms from Cmd+K press to visible dialog"
  }

  MONITORING: {
    metrics: [
      "palette_open_count",
      "search_query_count",
      "command_execute_count",
      "avg_search_time",
      "error_count"
    ],
    alerts: [
      "IF search_time > 500ms THEN notify_team",
      "IF error_rate > 5% THEN notify_team"
    ]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  COMMAND_CATEGORIES: {
    Documents: {
      vietnamese: "Tài liệu",
      commands: ["new", "open", "save", "export"]
    },
    Users: {
      vietnamese: "Người dùng",
      commands: ["search", "create", "manage", "permissions"]
    },
    Contracts: {
      vietnamese: "Hợp đồng",
      commands: ["new", "view", "sign", "verify"]
    },
    System: {
      vietnamese: "Hệ thống",
      commands: ["settings", "help", "shortcuts", "logout"]
    }
  }

  COMMON_COMMANDS: {
    new_document: {
      label: "Tài liệu mới (New document)",
      category: "Documents",
      shortcut: "Ctrl+N"
    },
    search_users: {
      label: "Tìm người dùng (Search users)",
      category: "Users"
    },
    settings: {
      label: "Cài đặt (Settings)",
      category: "System",
      shortcut: "Ctrl+,"
    }
  }

  ACCESSIBILITY: {
    keyboard_first: "All commands accessible via keyboard",
    screen_reader: "Dialog fully accessible with ARIA labels",
    vietnamese_labels: "All UI labels in Vietnamese first"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.39 - KeyboardShortcutsFeature",
    relationship: "Both provide keyboard-driven access to features",
    integration: "Cmd+K opens palette, Cmd+Shift+? opens shortcuts help"
  },
  {
    pattern: "Pattern 12.37 - LanguageSwitcherFeature",
    relationship: "Command labels respect language setting",
    integration: "Commands display in selected language"
  },
  {
    pattern: "Pattern 12.38 - NotificationPreferencesFeature",
    relationship: "Could include notification settings as command",
    integration: "'Configure notifications' as a searchable command"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [Command Dialog](https://cmdk.paco.me), [Zustand](https://zustand.docs.pmnd.rs)
- **Internal Docs**: `/docs/architecture/fsd-structure.md`, `/docs/patterns/global-features.md`

---

**End of Command Palette Feature**

*Version 1.0 | 2026-01-02 | Pseudo-code Format*
*Lines: 495 | Complexity: HIGH | Status: Production-Ready*
