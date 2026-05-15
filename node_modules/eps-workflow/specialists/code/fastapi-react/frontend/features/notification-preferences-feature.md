# Notification Preferences Feature

**Role**: Notification Channel & Preference Configuration
**Focus**: Configure notification channels (email, push, SMS) with granular preferences
**Technology**: React 19, Zustand, UI Components (Checkbox, Label, Dropdown)
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST NotificationPreferencesFeature {
  ROLE: "Manage user notification channels and preferences"

  RESPONSIBILITIES: [
    "Configure notification channels (email, push, SMS)",
    "Set notification frequency (instant, daily, weekly)",
    "Toggle notification categories per channel",
    "Persist preferences to persistent storage"
  ]

  TECH_STACK: {
    primary: "React 19 client component",
    libraries: ["zustand", "lucide-react", "UI components"],
    patterns: ["dropdown-menu", "checkbox-list", "nested-state"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["User", "Notification", "Channel", "Preference"]
  }
}
```

---

## Pattern 12.38: NotificationPreferencesFeature

### Overview

```pseudo
PATTERN NotificationPreferencesFeature {
  PURPOSE: "Allow users to configure notification delivery channels and categories"

  PROBLEM: "Users need fine-grained control over notification channels and content types"

  SOLUTION: "Nested preference structure with per-channel toggles and category filters"

  USE_CASES: [
    "User disables email notifications but keeps push enabled",
    "User filters orders notifications only in email",
    "User marks SMS for critical alerts only"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW NotificationPreferencesFeature_Workflow {
  INPUT: {
    preferences?: NotificationPreferences,
    onSave?: (prefs: NotificationPreferences) => void
  }

  PRECONDITIONS: [
    "User is authenticated",
    "Notification store initialized",
    "Default preferences loaded"
  ]

  STEPS: {
    STEP_1_LOAD_PREFERENCES: {
      description: "Load or initialize notification preferences"
      logic: |
        preferences = READ_FROM_STORAGE('notification-preferences')

        IF preferences IS_NULL THEN
          preferences = {
            email: { enabled: true, frequency: 'daily', categories: {...} },
            push: { enabled: true, categories: {...} },
            sms: { enabled: false, critical: false }
          }
        END IF

        INITIALIZE_STORE(preferences)
    }

    STEP_2_RENDER_DROPDOWN: {
      description: "Render notification preferences dropdown"
      logic: |
        RENDER Button {
          icon: Bell,
          label: "Tùy chỉnh thông báo",
          onClick: () => TOGGLE_DROPDOWN()
        }

        RENDER DropdownMenuContent {
          width: "w-80"
        }
    }

    STEP_3_EMAIL_SECTION: {
      description: "Render email channel configuration"
      logic: |
        RENDER Section {
          title: "Email",
          content: [
            Checkbox(enabled: preferences.email.enabled) ->
              ON_TOGGLE() CALL toggleChannel('email')
          ]

          IF preferences.email.enabled THEN
            RENDER SubOptions {
              frequency: SELECT ['instant', 'daily', 'weekly'],
              categories: [
                Checkbox('orders'),
                Checkbox('payments'),
                Checkbox('system'),
                Checkbox('marketing')
              ]
            }
          END IF
        }
    }

    STEP_4_PUSH_SECTION: {
      description: "Render push notification configuration"
      logic: |
        RENDER Section {
          title: "Thông báo (Push Notifications)",
          content: [
            Checkbox(enabled: preferences.push.enabled) ->
              ON_TOGGLE() CALL toggleChannel('push')
          ]

          IF preferences.push.enabled THEN
            RENDER Categories {
              categories: ['orders', 'payments', 'system']
            }
          END IF
        }
    }

    STEP_5_SMS_SECTION: {
      description: "Render SMS channel configuration"
      logic: |
        RENDER Section {
          title: "SMS",
          content: [
            Checkbox(enabled: preferences.sms.enabled) ->
              ON_TOGGLE() CALL toggleChannel('sms'),

            IF preferences.sms.enabled THEN
              Checkbox(critical: preferences.sms.critical) ->
                LABEL: "Critical alerts only"
            END IF
          ]
        }
    }

    STEP_6_PERSIST_CHANGES: {
      description: "Save preference changes to storage"
      logic: |
        ON_ANY_TOGGLE() {
          updated = GET_CURRENT_STATE()
          CALL setPreferences(updated)
          SAVE_TO_STORAGE('notification-preferences', updated)

          IF onSave CALLBACK EXISTS THEN
            CALL onSave(updated)
          END IF
        }
    }
  }

  ERROR_HANDLING: {
    StorageError: "Log warning, allow in-memory state only",
    InvalidPrefs: "Validate against schema, revert to defaults",
    SyncError: "Retry save with exponential backoff"
  }

  OUTPUT: {
    success: boolean,
    preferences?: NotificationPreferences,
    error?: string
  }

  POSTCONDITIONS: [
    "Preferences updated in store",
    "Changes persisted to storage",
    "UI reflects new state"
  ]
}
```

### Key Interfaces

```typescript
// Type definitions (interfaces only, no implementation)
interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'instant' | 'daily' | 'weekly';
    categories: {
      orders: boolean;
      payments: boolean;
      system: boolean;
      marketing: boolean;
    };
  };
  push: {
    enabled: boolean;
    categories: {
      orders: boolean;
      payments: boolean;
      system: boolean;
    };
  };
  sms: {
    enabled: boolean;
    critical: boolean;
  };
}

interface NotificationStore {
  preferences: NotificationPreferences;
  setPreferences: (prefs: NotificationPreferences) => void;
  toggleChannel: (channel: keyof NotificationPreferences) => void;
  toggleCategory: (channel: string, category: string) => void;
  updateFrequency: (frequency: 'instant' | 'daily' | 'weekly') => void;
}

// Function signatures (no implementation)
function useNotificationPreferences(): NotificationStore;
function loadDefaultPreferences(): NotificationPreferences;
function validatePreferences(prefs: any): boolean;
```

### Integration Points

```pseudo
INTEGRATION NotificationPreferencesFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["DropdownMenuTrigger (Bell button)"],
    displays: ["DropdownMenuContent", "Checkbox", "Label", "Select"]
  }

  STATE_MANAGEMENT: {
    client_state: "Zustand store (preferences state)",
    server_state: "Optional: API to sync with backend",
    persistence: "Browser localStorage (notification-preferences)"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/users/notification-preferences (optional)",
    fallback: "localStorage only"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/dropdown-menu", "@/shared/ui/checkbox", "@/shared/ui/label"],
    external: ["zustand", "lucide-react", "react"]
  }

  ERROR_HANDLING: {
    validation_errors: "Show inline validation messages",
    storage_errors: "Graceful degradation to in-memory state",
    api_errors: "Retry with toast notification"
  }

  EVENTS: {
    emits: ["onPreferencesChange", "onChannelToggle", "onCategoryToggle"],
    listens: ["user preferences loaded from storage"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User customizes notification preferences"

  ACTORS: {
    user: "End user in settings",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User clicks Bell icon in header
      System opens notification preferences dropdown

    STEP_2: |
      User sees current settings:
      - Email: enabled (daily), Orders + Payments checked
      - Push: enabled, all categories checked
      - SMS: disabled

    STEP_3: |
      User disables Email notifications
      System CALLS toggleChannel('email')
      Email section collapses

    STEP_4: |
      User enables SMS for critical alerts only
      System CALLS toggleChannel('sms')
      System sets critical: true

    STEP_5: |
      All changes auto-saved to localStorage
      System notifies backend (if API available)
      Dropdown closes when user clicks elsewhere
  }

  PSEUDO_CODE: |
    FUNCTION handleChannelToggle(channel) {
      updated = { ...preferences }
      updated[channel].enabled = !updated[channel].enabled

      CALL setPreferences(updated)
      SAVE_TO_STORAGE('notification-preferences', updated)

      IF API_AVAILABLE THEN
        TRY:
          AWAIT POST_TO_API('/api/notification-preferences', updated)
        CATCH:
          LOG_WARNING("Failed to sync to backend")
        END TRY
      END IF
    }
}
```

### Testing Guidelines

```pseudo
TESTING NotificationPreferencesFeature_Tests {
  UNIT_TESTS: {
    test_cases: [
      {
        name: "should load preferences from storage",
        input: { storage: { 'notification-preferences': {...} } },
        expected: { preferences: {...} }
      },
      {
        name: "should toggle channel enabled state",
        input: { channel: 'email', enabled: true },
        expected: { preferences.email.enabled: false }
      },
      {
        name: "should toggle category in nested structure",
        input: { channel: 'email', category: 'orders' },
        expected: { preferences.email.categories.orders: toggled }
      },
      {
        name: "should validate preferences schema",
        input: { invalid: true },
        expected: { valid: false }
      }
    ],
    coverage_target: "≥85%"
  }

  INTEGRATION_TESTS: {
    test_scenarios: [
      "User enables/disables all channels",
      "Preferences persist across page reloads",
      "Multiple categories toggle independently",
      "SMS critical-only mode works"
    ]
  }

  EDGE_CASES: [
    "No storage available (private browsing)",
    "Corrupt preferences in storage",
    "Rapid clicking on toggles",
    "Very large preferences object"
  ]
}
```

### Performance Considerations

```pseudo
PERFORMANCE NotificationPreferencesFeature_Performance {
  OPTIMIZATION_STRATEGIES: {
    state_management: "Zustand (minimal re-renders with selectors)",
    rendering: "Conditional sections only render when enabled",
    storage: "Debounce storage writes (300ms)"
  }

  BENCHMARKS: {
    target_response_time: "< 100ms for toggle",
    storage_write: "< 20ms (debounced)",
    rendering: "< 50ms for UI update"
  }

  MONITORING: {
    metrics: ["preference_change_count", "storage_errors", "api_sync_failures"],
    alerts: [
      "IF storage_error_rate > 5% THEN notify_team"
    ]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  NOTIFICATION_TYPES: {
    orders: {
      vietnamese: "Đơn hàng",
      description: "Notifications about orders/contracts"
    },
    payments: {
      vietnamese: "Thanh toán",
      description: "Payment notifications"
    },
    system: {
      vietnamese: "Hệ thống",
      description: "System and security alerts"
    },
    marketing: {
      vietnamese: "Marketing",
      description: "Promotional and marketing messages"
    }
  }

  CHANNELS: {
    email: {
      vietnamese: "Email",
      supports_frequency: true
    },
    push: {
      vietnamese: "Thông báo",
      supports_frequency: false
    },
    sms: {
      vietnamese: "SMS",
      supports_frequency: false
    }
  }

  REGULATIONS: {
    spam_prevention: "User must opt-in to marketing emails",
    gdpr_compliance: "Preferences stored per-user",
    vietnam_law: "No unsolicited communication"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.37 - LanguageSwitcherFeature",
    relationship: "Both customize user experience",
    integration: "Notification text respects language setting"
  },
  {
    pattern: "Pattern 12.39 - KeyboardShortcutsFeature",
    relationship: "Both provide global preference controls",
    integration: "Can add keyboard shortcut to open preferences"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [Zustand](https://zustand.docs.pmnd.rs), [React Hooks](https://react.dev/reference/react/hooks)
- **Internal Docs**: `/docs/architecture/fsd-structure.md`

---

**End of Notification Preferences Feature**

*Version 1.0 | 2026-01-02 | Pseudo-code Format*
*Lines: 375 | Complexity: MEDIUM | Status: Production-Ready*
