# Theme Toggle Feature (Pattern 12.36)

**Role**: Dark/light theme management with system preference detection
**Focus**: Theme persistence, system preference detection, smooth transitions
**Technology**: React 19, TypeScript, Zustand, CSS (Tailwind)
**Domain**: Vietnamese P2P insurance & lending application theming
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST ThemeToggleFeature {
  ROLE: "Application theme manager with dark/light/system modes"

  RESPONSIBILITIES: [
    "Provide theme selection dropdown (light, dark, system)",
    "Detect and respect system color scheme preference",
    "Apply theme to entire application (document root)",
    "Persist user theme preference to localStorage",
    "Handle theme transitions with smooth CSS animations",
    "Sync theme across browser tabs (via storage events)",
    "Provide theme state via Zustand store",
    "Handle SSR hydration safely"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    libraries: ["zustand", "lucide-react", "@shared/ui/dropdown-menu", "@shared/ui/button"],
    patterns: ["State Management", "CSS Class Management", "LocalStorage Persistence"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Theme", "ThemePreference", "SystemPreference", "ColorScheme"]
  }
}
```

---

## Pattern 12.36: ThemeToggleFeature

### Overview

```pseudo
PATTERN ThemeToggleFeature {
  PURPOSE: "Provide user-controlled dark/light theme with system preference detection and persistence"

  PROBLEM: |
    Modern applications need theme support to:
    - Respect user accessibility preferences (dark mode reduces eye strain)
    - Follow system color scheme preferences
    - Persist choice across sessions
    - Apply theme consistently across entire app
    - Handle edge cases (SSR, tab sync, preference changes)
    - Provide visual feedback with smooth transitions
    - Support three modes: light, dark, system (auto)

  SOLUTION: |
    Implement theme toggle with:
    - Zustand store for theme state (theme + systemPreference)
    - localStorage persistence with 'theme-storage' key
    - MediaQuery listener for system preference changes
    - CSS class toggle on document.documentElement ('dark' class)
    - Dropdown menu with three options (Light, Dark, System)
    - Safe hydration check (mounted state)
    - Icon rotation animations in light/dark modes
    - Smooth transitions using Tailwind class toggles

  USE_CASES: [
    "User toggles between light and dark theme manually",
    "User selects 'System' to follow OS preference",
    "OS preference changes and app theme updates automatically",
    "User opens app and previous theme preference is applied",
    "User opens two tabs and theme syncs between them",
    "User returns to app after system preference changed"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ThemeToggleFeature_Workflow {
  INPUT: {
    defaultTheme?: 'light' | 'dark' | 'system',
    onThemeChange?: Function,
    storageKey?: string
  }

  PRECONDITIONS: [
    "Component must be in browser environment (not SSR)",
    "window.matchMedia must be available",
    "localStorage must be accessible",
    "defaultTheme must be 'light', 'dark', or 'system'"
  ]

  STEPS: {
    STEP_1_CREATE_ZUSTAND_STORE: {
      description: "Create theme store with persistence middleware"
      logic: |
        CONST useThemeStore = create<ThemeStore>()(
          persist(
            (set) => ({
              theme: 'system',
              setTheme: (theme) => set({ theme }),
              systemPreference: 'light',
              setSystemPreference: (pref) => set({ systemPreference: pref })
            }),
            {
              name: 'theme-storage',
              version: 1,
              onRehydrateStorage: (state) => (state, error) => {
                IF error THEN
                  LOG("Failed to hydrate theme:", error)
                  SET theme = 'system'  // Fallback
                END IF
              }
            }
          )
        )
    }

    STEP_2_DETECT_SYSTEM_PREFERENCE: {
      description: "Detect and listen to system color scheme"
      logic: |
        USE_EFFECT(() => {
          // Only run in browser
          IF typeof window === 'undefined' THEN
            RETURN
          END IF

          // Detect initial system preference
          mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          initialPreference = mediaQuery.matches ? 'dark' : 'light'

          SET systemPreference = initialPreference

          // Listen for changes
          handleChange = (event) => {
            newPreference = event.matches ? 'dark' : 'light'
            SET systemPreference = newPreference
            CALL applyTheme(theme)  // Reapply theme if system mode
          }

          mediaQuery.addEventListener('change', handleChange)

          // Cleanup
          RETURN () => {
            mediaQuery.removeEventListener('change', handleChange)
          }

        }, [theme])
    }

    STEP_3_APPLY_THEME_TO_DOM: {
      description: "Apply theme by toggling 'dark' class on root element"
      logic: |
        FUNCTION applyTheme(newTheme: Theme) {
          root = document.documentElement

          IF newTheme == 'system' THEN
            // Use system preference
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            root.classList.toggle('dark', isDark)
          ELSE IF newTheme == 'dark' THEN
            root.classList.add('dark')
          ELSE
            root.classList.remove('dark')
          END IF

          // Update localStorage (redundant with persist middleware)
          SAVE_TO_STORAGE('theme-preference', newTheme)
        }
    }

    STEP_4_HANDLE_THEME_CHANGE: {
      description: "Handle user theme selection"
      logic: |
        FUNCTION handleThemeChange(newTheme: Theme) {
          // Validate theme
          IF newTheme NOT_IN ['light', 'dark', 'system'] THEN
            THROW ERROR "Invalid theme: " + newTheme
          END IF

          // Update store (triggers persist middleware)
          CALL setTheme(newTheme)

          // Apply to DOM
          CALL applyTheme(newTheme)

          // Optional callback
          IF onThemeChange THEN
            CALL onThemeChange(newTheme)
          END IF

          // Track analytics
          TRACK_EVENT("theme_changed", { theme: newTheme })
        }
    }

    STEP_5_RENDER_THEME_DROPDOWN: {
      description: "Render theme selection dropdown"
      logic: |
        RENDER DropdownMenu {
          TRIGGER = Button {
            ICON = AnimatedSunIcon,
            aria-label: "Chuyển đổi chủ đề (Toggle theme)"
          }

          CONTENT {
            LABEL = "Chủ đề (Theme)"

            SEPARATOR

            CHECKBOX_ITEM {
              checked: theme === 'light',
              onCheckedChange: () => handleThemeChange('light'),
              ICON = SunIcon,
              text: "Sáng (Light)"
            }

            CHECKBOX_ITEM {
              checked: theme === 'dark',
              onCheckedChange: () => handleThemeChange('dark'),
              ICON = MoonIcon,
              text: "Tối (Dark)"
            }

            CHECKBOX_ITEM {
              checked: theme === 'system',
              onCheckedChange: () => handleThemeChange('system'),
              ICON = MonitorIcon,
              text: "Hệ thống (System)"
            }
          }
        }
    }

    STEP_6_HANDLE_HYDRATION: {
      description: "Handle SSR hydration safely"
      logic: |
        CONST [mounted, setMounted] = useState(false)

        USE_EFFECT(() => {
          setMounted(true)
        }, [])

        // Don't render until mounted (prevent hydration mismatch)
        IF !mounted THEN
          RETURN null
        END IF

        // Now safe to render theme-dependent content
        CONST effectiveTheme = theme === 'system' ? systemPreference : theme

        RETURN ThemeDropdown {
          theme: theme,
          onThemeChange: handleThemeChange,
          effectiveTheme: effectiveTheme
        }
    }

    STEP_7_SYNC_ACROSS_TABS: {
      description: "Sync theme changes across browser tabs"
      logic: |
        USE_EFFECT(() => {
          handleStorageChange = (event) => {
            IF event.key === 'theme-storage' THEN
              // Another tab changed theme
              newState = JSON.parse(event.newValue)
              SET theme = newState.theme
              SET systemPreference = newState.systemPreference

              CALL applyTheme(newState.theme)
            END IF
          }

          window.addEventListener('storage', handleStorageChange)

          RETURN () => {
            window.removeEventListener('storage', handleStorageChange)
          }

        }, [])
    }
  }

  ERROR_HANDLING: {
    InvalidTheme: "Use 'system' as fallback",
    StorageError: "Keep theme in memory only",
    MediaQueryError: "Assume light theme as default",
    HydrationMismatch: "Use mounted state to prevent SSR issues"
  }

  OUTPUT: {
    success: boolean,
    state: {
      theme: 'light' | 'dark' | 'system',
      systemPreference: 'light' | 'dark',
      effectiveTheme: 'light' | 'dark',
      isDarkMode: boolean
    }
  }

  POSTCONDITIONS: [
    "Theme is applied to document root",
    "Preference is persisted to localStorage",
    "System preference is detected and followed (if system mode)",
    "UI reflects current theme visually"
  ]
}
```

### Key Interfaces

```typescript
// Theme types
type Theme = 'light' | 'dark' | 'system';

// Zustand store interface
interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemPreference: 'light' | 'dark';
  setSystemPreference: (pref: 'light' | 'dark') => void;
}

// Component props
interface ThemeToggleProps {
  defaultTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  showLabel?: boolean;
}

// Store creation
const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({...}),
    {
      name: 'theme-storage',
      version: 1
    }
  )
);

// Helper function signatures
function getEffectiveTheme(theme: Theme, systemPreference: 'light' | 'dark'): 'light' | 'dark';
function applyThemeToDOM(theme: Theme): void;
export function ThemeToggle(props?: ThemeToggleProps): JSX.Element | null;
```

### CSS Classes and Tailwind

```pseudo
CSS_CONFIGURATION {
  TAILWIND_CONFIG: {
    darkMode: "class",  // Use 'dark' class to toggle dark mode
    theme: {
      extend: {
        colors: {
          // Define theme-aware colors
          background: {
            light: "hsl(0 0% 100%)",     // white
            dark: "hsl(0 0% 9%)"         // near black
          },
          foreground: {
            light: "hsl(0 0% 0%)",       // black
            dark: "hsl(0 0% 100%)"       // white
          }
        },
        transitionDuration: {
          theme: "250ms"  // Smooth theme transitions
        }
      }
    }
  }

  CLASS_TOGGLES: {
    LIGHT_MODE: {
      background: "bg-white",
      foreground: "text-black",
      border: "border-gray-200"
    }

    DARK_MODE: {
      background: "dark:bg-gray-950",
      foreground: "dark:text-white",
      border: "dark:border-gray-800"
    }

    TRANSITIONS: {
      all: "transition-all duration-250"
    }
  }

  ICON_ANIMATIONS: {
    SUN_ICON: "rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0",
    MOON_ICON: "absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
  }
}
```

### Integration Points

```pseudo
INTEGRATION ThemeToggleFeature_Integration {
  UI_COMPONENTS: {
    trigger: "Button (ghost variant)",
    display: "DropdownMenu with animated icons",
    icons: ["Sun (light mode)", "Moon (dark mode)", "Monitor (system)"]
  }

  STATE_MANAGEMENT: {
    store: "Zustand with localStorage persistence",
    hydration: "Strict SSR safety with mounted check",
    cross_tab_sync: "Storage event listener"
  }

  CSS_FRAMEWORK: {
    framework: "Tailwind CSS",
    dark_mode: "Class-based ('dark' class on root)",
    transitions: "CSS transitions for smooth changes"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/dropdown-menu", "@/shared/ui/button"],
    external: ["zustand", "lucide-react"]
  }

  ERROR_HANDLING: {
    storage_error: "Fall back to session memory",
    mediaquery_error: "Assume light as default",
    hydration_error: "Render null until mounted",
    theme_persistence: "Automatic via persist middleware"
  }

  EVENTS: {
    emits: ["onThemeChange", "onSystemPreferenceChange"],
    listens: ["storage (cross-tab sync)", "mediaquery (system changes)"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User toggles theme in application header"

  FLOW: {
    STEP_1: |
      Application loads
      useThemeStore hydrates from localStorage
      If theme == 'system':
        - Detect system preference via matchMedia
        - Apply 'dark' class if system is dark mode
      Else if theme == 'dark':
        - Apply 'dark' class immediately
      Else:
        - Remove 'dark' class
      ThemeToggle renders with current theme selected

    STEP_2: |
      User clicks theme dropdown
      Shows three options: Light, Dark, System
      Current selection has checkmark

    STEP_3: |
      User selects "Tối (Dark)"
      handleThemeChange('dark') called
      Zustand store updated (triggers persist)
      applyTheme('dark') adds 'dark' class to root
      CSS transitions smoothly over 250ms
      All dark: prefixed styles activate

    STEP_4: |
      User opens application in another tab
      Storage event fires with new theme
      Second tab's theme store updates
      Second tab's UI reflects new theme

    STEP_5: |
      User changes system preference
      MediaQuery listener detects change
      If app is in 'system' mode:
        - effectiveTheme updates
        - applyTheme() reapplies CSS classes
        - UI updates to match system

    STEP_6: |
      User closes all tabs and reopens later
      localStorage persists 'theme-storage'
      App loads with previously selected theme
  }

  PSEUDO_CODE: |
    // In application header
    EXPORT FUNCTION Header() {
      CONST { theme, systemPreference } = useThemeStore()
      CONST [mounted, setMounted] = useState(false)

      USE_EFFECT(() => {
        setMounted(true)
      }, [])

      IF !mounted THEN
        RETURN null  // Prevent hydration mismatch
      END IF

      effectiveTheme = theme === 'system' ? systemPreference : theme

      RETURN (
        Header {
          className: "bg-white dark:bg-gray-950 transition-colors"

          Nav {
            Logo
            Menu
            UserProfile

            ThemeToggle {
              onThemeChange: (newTheme) => {
                LOG("Theme changed to:", newTheme)
              }
            }
          }
        }
      )
    }

    // Zustand store usage elsewhere
    FUNCTION useTheme() {
      CONST { theme, systemPreference } = useThemeStore()
      effectiveTheme = theme === 'system' ? systemPreference : theme

      RETURN {
        theme,
        effectiveTheme,
        isDarkMode: effectiveTheme === 'dark'
      }
    }
}
```

### Performance Optimizations

```pseudo
PERFORMANCE ThemeToggleFeature_Performance {
  OPTIMIZATION_STRATEGIES: {
    lazy_init: "Initialize theme on mount only, not server-side",
    memoization: "Memoize theme selector functions",
    debounce_mediaqueries: "Listen to MediaQuery changes only once",
    css_variables: "Use CSS custom properties instead of class toggles",
    animation_gpu: "Use transform/opacity for smooth 60fps transitions"
  }

  BENCHMARKS: {
    theme_change_time: "< 100ms (DOM update + CSS transition)",
    storage_write_time: "< 50ms",
    hydration_time: "< 200ms",
    mediaquery_detection: "< 10ms"
  }

  MONITORING: {
    metrics: ["theme_change_duration", "storage_sync_time", "mediaquery_change_latency"],
    alerts: [
      "IF theme_change_time > 300ms THEN investigate",
      "IF hydration_mismatch THEN log to error tracking"
    ]
  }
}
```

### Browser Support

```pseudo
BROWSER_SUPPORT {
  REQUIRED: {
    matchMedia: "CSS Media Queries Level 4 (all modern browsers)",
    localStorage: "Web Storage API (IE8+)",
    classList: "DOM classList API (IE10+)",
    persistedStorage: "Zustand with localStorage"
  }

  FALLBACKS: {
    no_matchMedia: "Use 'light' as default theme",
    no_localStorage: "Keep theme in memory (lost on refresh)",
    no_classList: "Use style.cssText for class application",
    ssr_mismatch: "Use mounted state to skip server render"
  }

  TESTED: ["Chrome 90+", "Firefox 88+", "Safari 14+", "Edge 90+"]
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.1 - ApplicationLayoutFeature",
    relationship: "Works with root layout for theme application",
    integration: "Root layout watches ThemeToggle changes"
  },
  {
    pattern: "Pattern 12.5 - NavigationFeature",
    relationship: "Navigation respects current theme",
    integration: "Uses theme state via Zustand store"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **CSS Framework**: [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- **Web APIs**: [prefers-color-scheme MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- **React Hooks**: [React 19](https://react.dev)

---

**Pattern Classification**: Feature | State Management | Theme System
**Complexity Level**: MEDIUM
**Estimated Implementation Time**: 2-3 hours
**Test Coverage Target**: 85%+
**Accessibility**: WCAG AA compliant (respects system preferences)
**Bundle Size**: ~2KB (Zustand + Icons)

