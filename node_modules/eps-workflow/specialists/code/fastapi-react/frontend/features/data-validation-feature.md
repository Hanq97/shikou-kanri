# Data Validation Feature (Pattern 12.35)

**Role**: Real-time input validation with error messaging
**Focus**: Field-level validation, schema validation, error display
**Technology**: React 19, TypeScript, Zod, Zustand
**Domain**: Vietnamese P2P insurance & lending form validation
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST DataValidationFeature {
  ROLE: "Real-time data validation with inline error messages and field rules"

  RESPONSIBILITIES: [
    "Validate input against multiple rules in real-time",
    "Display validation errors inline with visual feedback",
    "Support Zod schema validation",
    "Support custom validation rules",
    "Track field validity state",
    "Notify parent component of validation changes",
    "Provide accessible error messages"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    libraries: ["zod", "lucide-react", "@shared/ui/input", "@shared/ui/label"],
    patterns: ["Form Validation", "Real-time Feedback", "Error Handling"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["FormField", "ValidationRule", "ErrorMessage", "FormState"]
  }
}
```

---

## Pattern 12.35: DataValidationFeature

### Overview

```pseudo
PATTERN DataValidationFeature {
  PURPOSE: "Provide real-time validation with immediate user feedback for form inputs"

  PROBLEM: |
    Forms require robust validation to:
    - Prevent invalid data from being submitted
    - Give immediate feedback to users
    - Reduce API errors from bad input
    - Improve user experience with clear error messages
    - Support multiple validation approaches (schema + custom rules)
    - Handle Vietnamese-specific validation (phone, ID number, etc.)

  SOLUTION: |
    Implement ValidatedInput component with:
    - Support for Zod schema validation
    - Support for custom ValidationRule functions
    - Real-time validation on input change
    - Visual feedback (red border = error, green = valid)
    - Icon indicators (X for error, checkmark for valid)
    - Clear error messages in Vietnamese
    - Optional debouncing for expensive validation
    - Accessibility with aria-invalid, aria-describedby

  USE_CASES: [
    "User enters email and invalid format is caught immediately",
    "User enters Vietnamese phone number with validation",
    "User enters contract amount with numeric validation",
    "User sees success checkmark when validation passes",
    "User submits form only when all fields are valid"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW DataValidationFeature_Workflow {
  INPUT: {
    label: string,
    rules?: Array<ValidationRule>,
    schema?: z.ZodSchema,
    onValidationChange?: Function,
    debounceMs?: number
  }

  PRECONDITIONS: [
    "label must not be empty",
    "either rules or schema must be provided (or both)",
    "validation rules must be functions",
    "onValidationChange must be callable",
    "debounceMs must be >= 0"
  ]

  STEPS: {
    STEP_1_INITIALIZE_STATE: {
      description: "Initialize validation state"
      logic: |
        SET value = ""
        SET error = undefined
        SET isValid = false
        SET isDirty = false
        SET debounceTimer = null

        SET validationConfig = {
          rules: rules || [],
          schema: schema,
          debounceMs: debounceMs || 0
        }
    }

    STEP_2_ON_VALUE_CHANGE: {
      description: "Handle input value change"
      logic: |
        FUNCTION handleChange(event) {
          newValue = event.target.value

          SET value = newValue
          SET isDirty = true

          // Clear previous debounce timer
          IF debounceTimer THEN
            CLEAR_TIMEOUT(debounceTimer)
          END IF

          // Set new debounce timer
          IF validationConfig.debounceMs > 0 THEN
            debounceTimer = SET_TIMEOUT(
              () => validateValue(newValue),
              validationConfig.debounceMs
            )
          ELSE
            CALL validateValue(newValue)
          END IF
        }
    }

    STEP_3_VALIDATE_WITH_SCHEMA: {
      description: "Validate input against Zod schema"
      logic: |
        FUNCTION validateValue(val) {
          error = undefined
          isValid = false

          // Schema validation (highest priority)
          IF validationConfig.schema THEN
            TRY:
              validationConfig.schema.parse(val)
              // Schema passed, continue to rules
            CATCH zodError:
              IF zodError instanceof ZodError THEN
                error = zodError.issues[0]?.message || "Không hợp lệ"
                isValid = false

                CALL notifyParent({
                  isValid: false,
                  error: error,
                  value: val
                })
                RETURN
              END IF
            END TRY
          END IF

          // Rule validation
          CALL validateWithRules(val)
        }
    }

    STEP_4_VALIDATE_WITH_RULES: {
      description: "Validate input against custom rules"
      logic: |
        FUNCTION validateWithRules(val) {
          FOR EACH rule IN validationConfig.rules:
            result = CALL rule.validate(val)

            IF result === false THEN
              SET error = rule.message
              SET isValid = false
              CALL notifyParent({
                isValid: false,
                error: rule.message,
                value: val
              })
              RETURN
            END IF

            IF typeof result === "string" THEN
              SET error = result
              SET isValid = false
              CALL notifyParent({
                isValid: false,
                error: result,
                value: val
              })
              RETURN
            END IF
          END FOR

          // All validations passed
          SET error = undefined
          SET isValid = true
          CALL notifyParent({
            isValid: true,
            value: val
          })
        }
    }

    STEP_5_RENDER_INPUT: {
      description: "Render input with validation feedback"
      logic: |
        RENDER Container {
          RENDER Label(label)

          RENDER RelativeDiv {
            RENDER Input {
              value: value,
              onChange: handleChange,
              className: APPLY_CLASSES({
                "border-red-500": error != undefined,
                "border-green-500": isValid AND !error,
                "pr-10": true  // Space for icon
              }),
              aria-invalid: error != undefined,
              aria-describedby: "error-" + label
            }

            // Error icon
            IF error THEN
              RENDER AlertCircle {
                className: "absolute right-3 top-2.5 h-5 w-5 text-red-500"
              }
            END IF

            // Success icon
            IF isValid AND !error THEN
              RENDER CheckCircle {
                className: "absolute right-3 top-2.5 h-5 w-5 text-green-500"
              }
            END IF
          }

          // Error message
          IF error THEN
            RENDER ErrorText {
              id: "error-" + label,
              text: error,
              className: "text-sm text-red-600"
            }
          END IF
        }
    }

    STEP_6_NOTIFY_PARENT: {
      description: "Notify parent component of validation state"
      logic: |
        FUNCTION notifyParent(state) {
          IF onValidationChange THEN
            CALL onValidationChange(
              state.isValid,
              state.error,
              state.value
            )
          END IF
        }
    }
  }

  ERROR_HANDLING: {
    SchemaError: "Display schema error message",
    RuleError: "Display rule error message",
    ValidationTimeout: "Treat as invalid, show timeout message",
    CallbackError: "Log error, continue validation"
  }

  OUTPUT: {
    success: boolean,
    state: {
      value: string,
      isValid: boolean,
      error?: string,
      isDirty: boolean
    }
  }

  POSTCONDITIONS: [
    "Error messages are accurate and helpful",
    "Valid state is correctly determined",
    "Parent component is notified of changes",
    "UI reflects validation state visually"
  ]
}
```

### Key Interfaces

```typescript
// Validation rule definition
interface ValidationRule {
  validate: (value: any) => boolean | string;
  message: string;
}

// Component props
interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  rules?: ValidationRule[];
  schema?: z.ZodSchema;
  onValidationChange?: (isValid: boolean, error?: string, value?: string) => void;
  debounceMs?: number;
}

// Validation state
interface ValidationState {
  value: string;
  error?: string;
  isValid: boolean;
  isDirty: boolean;
  schema?: z.ZodSchema;
}

// Helper function signatures
function createPhoneValidationRule(country: string): ValidationRule;
function createEmailValidationRule(): ValidationRule;
function createMinLengthRule(min: number): ValidationRule;
function createPatternRule(pattern: RegExp, message: string): ValidationRule;
export function ValidatedInput(props: ValidatedInputProps): JSX.Element;
```

### Common Validation Rules

```pseudo
VALIDATION_RULES {
  EMAIL: {
    validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    message: "Email không hợp lệ (Invalid email)"
  }

  VIETNAMESE_PHONE: {
    validate: (val) => /^(?:\+84|0)(?:9[0-9]|8[0-9]|7[0-9]|6[0-9]|5[0-9]|3[0-9]|2[0-9])[0-9]{7}$/.test(val),
    message: "Số điện thoại không hợp lệ (Invalid phone number)"
  }

  VIETNAMESE_ID: {
    validate: (val) => /^([0-9]{9}|[0-9]{12})$/.test(val),
    message: "Số CMND/CCCD không hợp lệ (Invalid ID number)"
  }

  CURRENCY: {
    validate: (val) => /^[0-9]+(\.[0-9]{1,2})?$/.test(val) AND Number(val) > 0,
    message: "Số tiền không hợp lệ (Invalid amount)"
  }

  REQUIRED: {
    validate: (val) => val != null AND val.trim().length > 0,
    message: "Trường này là bắt buộc (Required field)"
  }

  MIN_LENGTH: (min) => {
    return {
      validate: (val) => val.length >= min,
      message: `Ít nhất ${min} ký tự (At least ${min} characters)`
    }
  }

  MAX_LENGTH: (max) => {
    return {
      validate: (val) => val.length <= max,
      message: `Tối đa ${max} ký tự (At most ${max} characters)`
    }
  }
}
```

### Integration Points

```pseudo
INTEGRATION DataValidationFeature_Integration {
  UI_COMPONENTS: {
    wrappers: ["Input", "Label", "div (relative container)"],
    indicators: ["AlertCircle (error icon)", "CheckCircle (success icon)"],
    messages: ["ErrorText (error message display)"]
  }

  STATE_MANAGEMENT: {
    local_state: "useState for value, error, isValid, isDirty",
    form_context: "Pass validation state to form context",
    callback_notification: "onValidationChange callback to parent"
  }

  SCHEMA_VALIDATION: {
    library: "Zod",
    features: ["Compose multiple schemas", "Custom transformations", "Async validation"]
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/input", "@/shared/ui/label"],
    external: ["zod", "lucide-react"]
  }

  ERROR_HANDLING: {
    schema_errors: "Parse ZodError and extract first message",
    rule_errors: "Use rule.message or custom error string",
    callback_errors: "Log to console, continue validation",
    async_errors: "Show timeout message after 5s"
  }

  EVENTS: {
    emits: ["onValidationChange", "onValueChange", "onBlur"],
    listens: ["externalValidationReset", "formSubmitAttempt"]
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User fills form with email and phone validation"

  FLOW: {
    STEP_1: |
      Form renders ValidatedInput for email
      Schema: z.string().email()
      User types "invalid-email"
      System shows: "Email không hợp lệ" (red border, X icon)

    STEP_2: |
      User corrects: "user@company.com"
      Schema validation passes
      System shows: green border, checkmark icon
      onValidationChange(true) called

    STEP_3: |
      Form renders ValidatedInput for Vietnamese phone
      Rules: [phoneNumberRule]
      User types "09123456"
      System shows: "Số điện thoại không hợp lệ" (8 digits, needs 10)

    STEP_4: |
      User corrects: "0912345678"
      Validation passes
      System shows: green checkmark
      Form enables submit button

    STEP_5: |
      User submits form
      All fields are validated
      Backend receives clean, validated data
  }

  PSEUDO_CODE: |
    // In form component
    CONST [formData, setFormData] = useState({
      email: "",
      phone: "",
      amount: ""
    })

    CONST [formValid, setFormValid] = useState(false)

    FUNCTION handleValidation(field, isValid) {
      SET validationState = {
        ...validationState,
        [field]: isValid
      }

      SET formValid = EVERY(field => validationState[field] == true)
    }

    RETURN (
      Form {
        ValidatedInput {
          label: "Email",
          schema: z.string().email(),
          onValidationChange: (isValid) => handleValidation("email", isValid)
        }

        ValidatedInput {
          label: "Số điện thoại (Phone)",
          rules: [VIETNAMESE_PHONE_RULE],
          onValidationChange: (isValid) => handleValidation("phone", isValid)
        }

        ValidatedInput {
          label: "Số tiền (Amount)",
          rules: [CURRENCY_RULE, createMinRule(1000)],
          onValidationChange: (isValid) => handleValidation("amount", isValid)
        }

        Button {
          "Gửi (Submit)",
          disabled: !formValid
        }
      }
    )
}
```

### Accessibility Features

```pseudo
ACCESSIBILITY DataValidationFeature_Accessibility {
  SEMANTIC_HTML: {
    label: "Associated with input via htmlFor",
    input: "aria-invalid reflects validation state",
    error_message: "aria-describedby points to error text"
  }

  VISUAL_INDICATORS: {
    color: "Red for error (+ pattern for colorblind users)",
    icons: "X for error, checkmark for valid (text alternative)",
    text: "Always include error message text (not just icon)"
  }

  KEYBOARD_NAVIGATION: {
    tab: "Can tab to input field",
    enter: "Can submit form from input",
    escape: "Can clear field (optional)"
  }

  SCREEN_READERS: {
    announcements: "aria-live regions for error messages",
    descriptions: "aria-describedby links error message",
    labels: "Clear, descriptive labels for each field"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.1 - FormHandlingFeature",
    relationship: "Used within form to validate individual fields",
    integration: "Contributes to overall form validity"
  },
  {
    pattern: "Pattern 12.31 - AdvancedFilterFeature",
    relationship: "Validates filter values during creation",
    integration: "Prevents invalid filter rules"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Schema Validation**: [Zod Documentation](https://zod.dev)
- **React Hooks**: [React 19](https://react.dev)
- **Accessibility**: [WCAG 2.1 Form Validation](https://www.w3.org/WAI/tutorials/forms/validation/)

---

**Pattern Classification**: Form Control | Validation | User Feedback
**Complexity Level**: MEDIUM
**Estimated Implementation Time**: 3-4 hours
**Test Coverage Target**: 90%+
**Vietnamese Support**: Full (phone, ID, email validation rules)

