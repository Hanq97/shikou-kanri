# Keyboard Shortcuts Feature

**Role**: Global Keyboard Navigation & Accessibility Control
**Focus**: Register and handle global keyboard shortcuts with help dialog
**Technology**: React 19, useEffect, Dialog Component
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST KeyboardShortcutsFeature {
  ROLE: "Manage global keyboard shortcuts and accessibility"

  RESPONSIBILITIES: [
    "Register keyboard event listeners globally",
    "Match key combinations (Ctrl/Cmd + modifier keys)",
    "Display keyboard shortcuts help dialog",
    "Support customizable keyboard bindings"
  ]

  TECH_STACK: {
    primary: "React 19 client component with useEffect",
    libraries: ["react", "lucide-react", "dialog component"],
    patterns: ["event-listener", "keyboard-binding", "help-dialog"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Shortcut", "Action", "Binding", "HelpDialog"]
  }
}
```

---

## Pattern 12.39: KeyboardShortcutsFeature

### Overview

```pseudo
PATTERN KeyboardShortcutsFeature {
  PURPOSE: "Provide global keyboard shortcuts for improved productivity"

  PROBLEM: "Users need keyboard shortcuts for common actions without hunting for menus"

  SOLUTION: "Global keyboard event listener with modular shortcut registry"

  USE_CASES: [
    "User presses Ctrl+? to open shortcuts help",
    "User presses Ctrl+S to save current work",
    "Modifiers (Ctrl, Shift, Alt) combined with key"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW KeyboardShortcutsFeature_Workflow {
  INPUT: {
    shortcuts: KeyboardShortcut[],
    onShortcutTriggered?: (id: string) => void
  }

  PRECONDITIONS: [
    "Component mounted in React app",
    "Shortcuts array provided",
    "Dialog component available"
  ]

  STEPS: {
    STEP_1_INITIALIZE_STATE: {
      description: "Initialize help dialog state"
      logic: |
        INITIALIZE {
          helpOpen: false,
          setHelpOpen: FUNCTION(open: boolean)
        }

        SHORTCUTS_LIST = INPUT.shortcuts OR []
    }

    STEP_2_REGISTER_LISTENER: {
      description: "Register global keydown event listener"
      logic: |
        ON_COMPONENT_MOUNT() {
          FUNCTION handleKeyPress(event: KeyboardEvent) {
            keyCode = event.key.toLowerCase()
            ctrlPressed = event.metaKey OR event.ctrlKey
            shiftPressed = event.shiftKey
            altPressed = event.altKey

            // Check for help shortcut (Ctrl+Shift+?)
            IF (ctrlPressed OR event.metaKey) AND shiftPressed AND keyCode == '?' THEN
              event.preventDefault()
              SET helpOpen = true
              RETURN
            END IF

            // Check registered shortcuts
            FOR EACH shortcut IN SHORTCUTS_LIST:
              IF MATCHES_SHORTCUT(event, shortcut) THEN
                event.preventDefault()
                CALL shortcut.action()
                BREAK
              END IF
            END FOR
          }

          ATTACH_LISTENER('keydown', handleKeyPress)
          RETURN CLEANUP_FUNCTION() {
            REMOVE_LISTENER('keydown', handleKeyPress)
          }
        }
    }

    STEP_3_MATCH_KEY_COMBINATION: {
      description: "Match key combination with shortcuts"
      logic: |
        FUNCTION matchesShortcut(event, shortcut) {
          // Match primary key (case-insensitive)
          keyMatch = event.key.toLowerCase() == shortcut.key.toLowerCase()

          // Match modifiers
          ctrlMatch = shortcut.ctrl ?
            (event.ctrlKey OR event.metaKey) :
            !(event.ctrlKey OR event.metaKey)

          shiftMatch = shortcut.shift ?
            event.shiftKey :
            !event.shiftKey

          altMatch = shortcut.alt ?
            event.altKey :
            !event.altKey

          RETURN keyMatch AND ctrlMatch AND shiftMatch AND altMatch
        }
    }

    STEP_4_RENDER_BUTTON: {
      description: "Render help button in UI"
      logic: |
        RENDER Button {
          variant: "ghost",
          size: "icon",
          icon: HelpCircle,
          title: "Phím tắt (Keyboard shortcuts)",
          onClick: () => SET helpOpen = true
        }
    }

    STEP_5_RENDER_HELP_DIALOG: {
      description: "Render keyboard shortcuts help dialog"
      logic: |
        IF helpOpen THEN
          RENDER Dialog {
            title: "Phím tắt (Keyboard Shortcuts)",
            content: [
              // List all shortcuts
              FOR EACH shortcut IN SHORTCUTS_LIST:
                RENDER Row {
                  label: shortcut.label,
                  keyBinding: FORMAT_KEYS(shortcut)
                }
              END FOR,

              // Show help shortcut
              SEPARATOR,

              Row {
                label: "Hiển thị trợ giúp (Show help)",
                keyBinding: "Cmd/Ctrl + Shift + ?"
              }
            ]
          }
        END IF
    }

    STEP_6_FORMAT_DISPLAY: {
      description: "Format key combination for display"
      logic: |
        FUNCTION formatKeys(shortcut) {
          parts = []

          IF shortcut.ctrl THEN
            parts.APPEND("Ctrl")
          END IF

          IF shortcut.shift THEN
            parts.APPEND("Shift")
          END IF

          IF shortcut.alt THEN
            parts.APPEND("Alt")
          END IF

          parts.APPEND(shortcut.key.toUpperCase())

          RETURN parts.JOIN("+")
        }
    }
  }

  ERROR_HANDLING: {
    InvalidShortcut: "Skip invalid shortcuts, log warning",
    DuplicateKeys: "Later registration wins, log conflict warning",
    ListenerError: "Fail silently, allow manual access to functions"
  }

  OUTPUT: {
    success: boolean,
    shortcutsRegistered: number,
    errors?: string[]
  }

  POSTCONDITIONS: [
    "Global keydown listener active",
    "Help dialog accessible",
    "All shortcuts matched and ready"
  ]
}
```

### Key Interfaces

```typescript
// Type definitions (interfaces only, no implementation)
interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  label: string;
  description?: string;
  action: () => void;
}

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  onShortcutTriggered?: (id: string) => void;
  includeHelpDialog?: boolean;
}

interface ShortcutGroup {
  category: string;
  shortcuts: KeyboardShortcut[];
}

// Function signatures (no implementation)
function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void;
function registerShortcut(shortcut: KeyboardShortcut): void;
function formatShortcutKey(shortcut: KeyboardShortcut): string;
function isShortcutActive(): boolean;
```

### Integration Points

```pseudo
INTEGRATION KeyboardShortcutsFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["HelpCircle button"],
    displays: ["Dialog", "DialogContent", "DialogHeader", "DialogTitle"]
  }

  STATE_MANAGEMENT: {
    client_state: "React useState (helpOpen dialog state)",
    server_state: "None - client-only feature",
    persistence: "Optional: save custom bindings to localStorage"
  }

  API_ENDPOINTS: {
    primary: "None - pure client-side operation"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/dialog", "@/shared/ui/button"],
    external: ["react", "lucide-react"]
  }

  ERROR_HANDLING: {
    key_conflicts: "Log warning, later binding wins",
    listener_errors: "Graceful degradation, allow manual access",
    memory_leaks: "Ensure cleanup function runs on unmount"
  }

  EVENTS: {
    emits: ["onShortcutTriggered", "onHelpOpened"],
    listens: ["window keydown events"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User opens keyboard shortcuts help dialog"

  ACTORS: {
    user: "End user in application",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User navigates to any page
      System registers global keyboard listener (on component mount)

    STEP_2: |
      User presses Ctrl+Shift+? (or Cmd+Shift+? on Mac)
      System detects key combination match

    STEP_3: |
      System prevents default browser behavior
      System opens help dialog showing:
      - Save (Ctrl+S)
      - New (Ctrl+N)
      - Find (Ctrl+F)
      - Settings (Ctrl+,)
      - Help (Cmd/Ctrl+Shift+?)

    STEP_4: |
      User clicks action or presses shortcut
      System calls corresponding action function
      Dialog closes on action

    STEP_5: |
      User presses Escape to close dialog
      Dialog closes without triggering action
  }

  PSEUDO_CODE: |
    FUNCTION setupKeyboardShortcuts(shortcuts) {
      SET helpOpen = false

      ATTACH_LISTENER('keydown', (event) => {
        // Check for help
        IF (event.ctrlKey OR event.metaKey) AND event.shiftKey AND event.key == '?' THEN
          event.preventDefault()
          SET helpOpen = true
          RETURN
        END IF

        // Check registered shortcuts
        FOR EACH sc IN shortcuts:
          IF matchShortcut(event, sc) THEN
            event.preventDefault()
            AWAIT sc.action()
            BREAK
          END IF
        END FOR
      })

      RETURN () => REMOVE_LISTENER('keydown', ...)
    }
}
```

### Testing Guidelines

```pseudo
TESTING KeyboardShortcutsFeature_Tests {
  UNIT_TESTS: {
    test_cases: [
      {
        name: "should register shortcuts correctly",
        input: { shortcuts: [{ key: 's', ctrl: true }] },
        expected: { registered: 1 }
      },
      {
        name: "should match key combination exactly",
        input: { event: KeyboardEvent(key:'s', ctrl:true), shortcut: {...} },
        expected: { matched: true }
      },
      {
        name: "should format keys for display",
        input: { shortcut: { key: 's', ctrl: true, shift: false } },
        expected: { display: "Ctrl+S" }
      },
      {
        name: "should trigger help dialog on Ctrl+Shift+?",
        input: { event: KeyboardEvent(key:'?', ctrl:true, shift:true) },
        expected: { helpOpen: true }
      }
    ],
    coverage_target: "≥80%"
  }

  INTEGRATION_TESTS: {
    test_scenarios: [
      "User presses shortcut and action executes",
      "Multiple shortcuts don't conflict",
      "Help dialog displays all shortcuts",
      "Event listener cleanup on unmount"
    ]
  }

  EDGE_CASES: [
    "Rapid shortcut pressing",
    "Shortcuts in input/textarea fields",
    "Non-English keyboard layouts",
    "Mobile devices (no keyboard)"
  ]
}
```

### Performance Considerations

```pseudo
PERFORMANCE KeyboardShortcutsFeature_Performance {
  OPTIMIZATION_STRATEGIES: {
    event_handling: "Single listener for all shortcuts (event delegation)",
    rendering: "Dialog lazy-loaded only when opened",
    memory: "Cleanup listener on component unmount"
  }

  BENCHMARKS: {
    target_response_time: "< 50ms from keypress to action",
    listener_overhead: "< 1ms per keypress check",
    memory_usage: "< 1KB per shortcut registered"
  }

  MONITORING: {
    metrics: ["shortcut_trigger_count", "help_dialog_opens", "listener_errors"],
    alerts: [
      "IF listener_error_rate > 1% THEN notify_team"
    ]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ACCESSIBILITY: {
    screen_readers: "Shortcuts help dialog fully accessible",
    keyboard_only: "All features accessible via keyboard",
    aria_labels: "All buttons have aria-labels in Vietnamese"
  }

  COMMON_SHORTCUTS: {
    save: { key: 's', ctrl: true, label: 'Lưu (Save)' },
    new: { key: 'n', ctrl: true, label: 'Tạo mới (New)' },
    find: { key: 'f', ctrl: true, label: 'Tìm kiếm (Find)' },
    settings: { key: ',', ctrl: true, label: 'Cài đặt (Settings)' },
    help: { key: '?', ctrl: true, shift: true, label: 'Trợ giúp (Help)' }
  }

  LOCALIZATION: {
    shortcuts_dialog_title: "Phím tắt (Keyboard Shortcuts)",
    help_button_tooltip: "Hiển thị phím tắt",
    modifier_labels: {
      ctrl: "Ctrl/Cmd",
      shift: "Shift",
      alt: "Alt"
    }
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.40 - CommandPaletteFeature",
    relationship: "Both provide global command access",
    integration: "Keyboard shortcuts can trigger command palette"
  },
  {
    pattern: "Pattern 12.37 - LanguageSwitcherFeature",
    relationship: "Shortcuts help text respects language setting",
    integration: "Help dialog labels multilingual"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [React Hooks](https://react.dev/reference/react/hooks), [MDN KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
- **Internal Docs**: `/docs/architecture/accessibility-standards.md`

---

**End of Keyboard Shortcuts Feature**

*Version 1.0 | 2026-01-02 | Pseudo-code Format*
*Lines: 340 | Complexity: MEDIUM | Status: Production-Ready*
