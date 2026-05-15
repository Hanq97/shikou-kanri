# Language Switcher Feature

**Role**: i18n Integration & User Language Preference Management
**Focus**: Global language switching with persistent preferences
**Technology**: Next.js 15.3, React 19, Zustand, next-intl
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST LanguageSwitcherFeature {
  ROLE: "Manage global application language switching"

  RESPONSIBILITIES: [
    "Detect and display current language",
    "Switch application language across all pages",
    "Persist user language preference",
    "Support multilingual UI (Vi, Ja, En)"
  ]

  TECH_STACK: {
    primary: "React 19 client component",
    libraries: ["next-intl", "zustand", "lucide-react"],
    patterns: ["dropdown-menu", "persistent-storage", "global-state"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Language", "User", "Preference", "Locale"]
  }
}
```

---

## Pattern 12.37: LanguageSwitcherFeature

### Overview

```pseudo
PATTERN LanguageSwitcherFeature {
  PURPOSE: "Switch application language dynamically with persistent preferences"

  PROBLEM: "Users need to change application language and have preference remembered"

  SOLUTION: "Global dropdown menu with Zustand persistence store"

  USE_CASES: [
    "User switches from Vietnamese to Japanese",
    "User preference persists across sessions",
    "Language displayed in native names"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW LanguageSwitcherFeature_Workflow {
  INPUT: {
    currentLocale: 'vi' | 'ja' | 'en',
    router: NextRouter,
    pathname: string
  }

  PRECONDITIONS: [
    "User is on a locale-prefixed route",
    "Language store is initialized",
    "Dropdown menu component available"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize language store with persisted preference"
      logic: |
        useLanguageStore = CREATE_STORE({
          language: READ_FROM_STORAGE('language-storage') OR 'vi',
          setLanguage: FUNCTION(lang) {
            SET_STORAGE('language-storage', lang)
            SET state.language = lang
          }
        })

        CURRENT_LANGUAGE = FIND_IN_LANGUAGES(currentLocale)
    }

    STEP_2_RENDER_TRIGGER: {
      description: "Render language switcher button"
      logic: |
        RENDER Button {
          variant: "ghost",
          size: "icon",
          icon: Globe,
          accessibility: "Chuyển đổi ngôn ngữ"
        }
    }

    STEP_3_HANDLE_SELECTION: {
      description: "Process language change"
      logic: |
        ON_LANGUAGE_SELECTED(newLanguage) {
          CALL setLanguage(newLanguage)

          oldPathname = pathname
          newPathname = REPLACE_LOCALE(oldPathname, currentLocale, newLanguage)

          CALL router.push(newPathname)
        }
    }

    STEP_4_RENDER_MENU: {
      description: "Display dropdown with language options"
      logic: |
        RENDER DropdownMenu {
          FOR EACH lang IN LANGUAGES:
            RENDER CheckboxItem {
              checked: (currentLocale == lang.code),
              label: lang.nativeLabel,
              onSelect: () => HANDLE_LANGUAGE_CHANGE(lang.code)
            }
          END FOR
        }
    }

    STEP_5_UPDATE_NAVIGATION: {
      description: "Update route to new language"
      logic: |
        IF newPathname CHANGES THEN
          AWAIT router.push(newPathname)
          WAIT_FOR_LOCALE_CHANGE()
        END IF
    }
  }

  ERROR_HANDLING: {
    InvalidLanguage: "Reject unknown language code, use default",
    NavigationFail: "Log error, retry push navigation",
    StorageError: "Gracefully degrade without persistence"
  }

  OUTPUT: {
    success: boolean,
    newLocale?: 'vi' | 'ja' | 'en',
    navigated?: boolean
  }

  POSTCONDITIONS: [
    "Current locale displayed in button",
    "User language preference persisted",
    "Page redirected to new locale path"
  ]
}
```

### Key Interfaces

```typescript
// Type definitions (interfaces only, no implementation)
interface Language {
  code: 'vi' | 'ja' | 'en';
  label: string;
  nativeLabel: string;
}

interface LanguageStore {
  language: 'vi' | 'ja' | 'en';
  setLanguage: (lang: 'vi' | 'ja' | 'en') => void;
}

// Function signatures (no implementation)
function useLanguageStore(): LanguageStore;
function getAvailableLanguages(): Language[];
function switchLanguage(lang: 'vi' | 'ja' | 'en'): Promise<void>;
```

### Integration Points

```pseudo
INTEGRATION LanguageSwitcherFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["DropdownMenuTrigger (Globe button)"],
    displays: ["DropdownMenuContent", "DropdownMenuCheckboxItem"]
  }

  STATE_MANAGEMENT: {
    client_state: "Zustand store (selected language)",
    server_state: "next-intl locale context",
    persistence: "Browser localStorage (language-storage)"
  }

  API_ENDPOINTS: {
    primary: "No API call - client-only operation"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/dropdown-menu", "@/shared/ui/button"],
    external: ["next-intl", "zustand", "lucide-react", "next/navigation"]
  }

  ERROR_HANDLING: {
    storage_errors: "Ignore, use in-memory state only",
    navigation_errors: "Log warning, allow manual retry"
  }

  EVENTS: {
    emits: ["onLanguageChange", "onNavigationStart"],
    listens: ["locale change from next-intl"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User switches from Vietnamese to Japanese"

  ACTORS: {
    user: "End user in settings header",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User visits page at /vi/dashboard
      System detects locale: 'vi'

    STEP_2: |
      User clicks Globe icon (language switcher)
      System opens dropdown menu

    STEP_3: |
      User sees options: "Tiếng Việt", "日本語", "English"
      User clicks "日本語"

    STEP_4: |
      System CALLS handleLanguageChange('ja')
      System CALLS setLanguage('ja') in Zustand
      System CALLS router.push('/ja/dashboard')

    STEP_5: |
      System saves 'ja' to localStorage
      Page navigates to Japanese locale
      All UI text updates via next-intl
  }

  PSEUDO_CODE: |
    FUNCTION handleLanguageChange(newLang: Language) {
      oldLocale = useLocale()
      setLanguage(newLang)

      newPath = pathname.replace(`/${oldLocale}`, `/${newLang}`)
      AWAIT router.push(newPath)
    }
}
```

### Testing Guidelines

```pseudo
TESTING LanguageSwitcherFeature_Tests {
  UNIT_TESTS: {
    test_cases: [
      {
        name: "should initialize with persisted language",
        input: { localStorage: { 'language-storage': 'ja' } },
        expected: { language: 'ja' }
      },
      {
        name: "should update locale in pathname",
        input: { pathname: '/vi/dashboard', newLang: 'ja' },
        expected: { newPathname: '/ja/dashboard' }
      },
      {
        name: "should persist language to storage",
        input: { newLang: 'en' },
        expected: { localStorage['language-storage']: 'en' }
      }
    ],
    coverage_target: "≥85%"
  }

  INTEGRATION_TESTS: {
    test_scenarios: [
      "User selects language and page updates",
      "Language persists after page reload",
      "Multiple tabs sync language change"
    ]
  }

  EDGE_CASES: [
    "Invalid language code in pathname",
    "localStorage disabled in browser",
    "Rapid language switching clicks"
  ]
}
```

### Performance Considerations

```pseudo
PERFORMANCE LanguageSwitcherFeature_Performance {
  OPTIMIZATION_STRATEGIES: {
    state_management: "Zustand (minimal re-renders)",
    rendering: "Memoize language options list",
    persistence: "Use localStorage (zero latency)"
  }

  BENCHMARKS: {
    target_response_time: "< 500ms for language switch",
    storage_write: "< 10ms",
    navigation_time: "< 1s (includes page load)"
  }

  MONITORING: {
    metrics: ["language_switch_count", "storage_errors", "navigation_failures"],
    alerts: [
      "IF navigation_failure_rate > 2% THEN notify_team"
    ]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  LANGUAGES: {
    Vietnamese: {
      code: 'vi',
      name: 'Tiếng Việt',
      region: 'Vietnam',
      primary_audience: "Vietnamese users"
    },
    Japanese: {
      code: 'ja',
      name: '日本語',
      region: 'Japan',
      primary_audience: "Japanese investors"
    },
    English: {
      code: 'en',
      name: 'English',
      region: 'Global',
      primary_audience: "International users"
    }
  }

  LOCALIZATION: {
    date_format: "DD/MM/YYYY (Vietnamese preference)",
    currency: "VND (Vietnamese default)",
    timezone: "Asia/Ho_Chi_Minh"
  }

  BUSINESS_RULES: {
    legal_documents: "Vietnamese version is official",
    contracts: "Bilingual Vietnamese/English legally binding",
    communication: "Vietnamese primary, English fallback"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.38 - NotificationPreferencesFeature",
    relationship: "Both persist user preferences to localStorage",
    integration: "Share Zustand store structure"
  },
  {
    pattern: "Pattern 12.39 - KeyboardShortcutsFeature",
    relationship: "Global UI features with accessibility",
    integration: "Can include keyboard shortcut for language switch"
  },
  {
    pattern: "Pattern 12.40 - CommandPaletteFeature",
    relationship: "Command palette can include language commands",
    integration: "List languages as available commands"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [next-intl](https://next-intl-docs.vercel.app), [Zustand](https://zustand.docs.pmnd.rs)
- **Internal Docs**: `/docs/architecture/fsd-structure.md`

---

**End of Language Switcher Feature**

*Version 1.0 | 2026-01-02 | Pseudo-code Format*
*Lines: 300 | Complexity: MEDIUM | Status: Production-Ready*
