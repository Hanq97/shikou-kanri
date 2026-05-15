# Frontend Utilities Specialist

**Role**: Utility functions and helper methods expert
**Focus**: Formatters, validators, helpers, pure testable functions
**Technology**: TypeScript 5, date-fns, Intl API, clsx, tailwind-merge, CVA
**Domain**: Vietnamese Legal P2P Insurance & Lending Platform
**Patterns**: 14.21-14.40 (Utilities - 20 patterns)
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST UtilitiesSpecialist {
  ROLE: "Utility functions expert for pure, testable, reusable helpers"

  RESPONSIBILITIES: [
    "Implement styling utilities (cn, cva, tailwind-merge)",
    "Create date/time formatters with date-fns",
    "Build currency and number formatters with Intl API",
    "Implement validators (email, phone, URL, Vietnamese formats)",
    "Create helper functions (debounce, throttle, cloneDeep, omit, pick)",
    "Write pure, side-effect-free functions",
    "Optimize for performance and type safety",
    "Ensure Vietnamese locale support"
  ]

  TECH_STACK: {
    language: "TypeScript 5 (strict mode)",
    date_library: "date-fns",
    styling: "clsx + tailwind-merge",
    variants: "class-variance-authority (CVA)",
    localization: "Intl API (Vietnamese locale)"
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    currency: "VND",
    date_format: "DD/MM/YYYY",
    timezone: "Asia/Ho_Chi_Minh",
    phone_format: "+84 or 0xxx xxx xxx"
  }
}
```

---

## Pattern 14.21: cn Utility (Class Names Merger)

### Overview

```pseudo
PATTERN CNUtility {
  PURPOSE: "Combine clsx + tailwind-merge for conflict-free class merging"

  PROBLEM: "Tailwind classes can conflict (e.g., 'p-4 p-2' applies p-2, but we want proper merging)"

  SOLUTION: "clsx for conditional classes + tailwind-merge for conflict resolution"

  USE_CASES: [
    "Merge component classes with prop classes",
    "Conditional class application",
    "Resolve Tailwind conflicts (padding, margin, etc.)"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW CN_Utility {
  INPUT: {
    classes: ClassValue[]  # Can be string, object, array, undefined
  }

  FILE_STRUCTURE: |
    shared/lib/
    ├── utils.ts                # cn, cva utilities
    ├── formatters.ts           # Date, currency, number formatters
    ├── validators.ts           # Validation helpers
    └── helpers.ts              # debounce, throttle, cloneDeep

  STEPS: {
    STEP_1_COMBINE_CLASSES: {
      description: "Use clsx to handle conditionals and arrays"
      logic: |
        combined = clsx(...classes)
        // clsx("p-4", isActive && "bg-blue-500", ["text-white", undefined])
        // → "p-4 bg-blue-500 text-white"
    }

    STEP_2_MERGE_CONFLICTS: {
      description: "Use tailwind-merge to resolve Tailwind class conflicts"
      logic: |
        merged = twMerge(combined)
        // twMerge("p-4 p-2 px-3")
        // → "px-3 py-2" (px-3 wins, py-2 wins)
    }

    STEP_3_EXPORT: {
      description: "Export as cn utility"
      logic: |
        export const cn = (...inputs: ClassValue[]) => {
          RETURN twMerge(clsx(inputs))
        }
    }
  }

  USAGE_EXAMPLES: [
    "cn('base-class', isActive && 'active-class', className)",
    "cn({ 'p-4': !compact, 'p-2': compact })",
    "cn(['flex', 'items-center'], props.className)"
  ]

  OUTPUT: {
    function: "(...inputs: ClassValue[]) => string",
    description: "Merged class string with conflicts resolved"
  }
}
```

---

## Pattern 14.26-14.30: Formatters

### Workflow

```pseudo
WORKFLOW Formatters_Group {
  PATTERN_14_26_FORMAT_DATE: {
    purpose: "Format dates in Vietnamese locale (DD/MM/YYYY)"
    library: "date-fns"

    workflow: |
      FUNCTION formatDate(date: string | Date, format?: string): string {
        INPUT: date (ISO string or Date object), format (default: "dd/MM/yyyy")

        STEPS: {
          STEP_1_PARSE: dateObj = IF typeof date == "string" THEN parseISO(date) ELSE date
          STEP_2_FORMAT: RETURN format(dateObj, format, { locale: vi })
        }

        EXAMPLES: [
          "formatDate('2025-12-29') → '29/12/2025'",
          "formatDate('2025-12-29', 'dd MMM yyyy') → '29 Th12 2025'"
        ]
      }
  }

  PATTERN_14_27_FORMAT_CURRENCY: {
    purpose: "Format currency in Vietnamese Dong (VND)"
    library: "Intl.NumberFormat"

    workflow: |
      FUNCTION formatCurrency(amount: number, currency = 'VND', locale = 'vi-VN'): string {
        STEPS: {
          STEP_1_CREATE_FORMATTER: |
            formatter = new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: currency
            })

          STEP_2_FORMAT: RETURN formatter.format(amount)
        }

        EXAMPLES: [
          "formatCurrency(1500000) → '1.500.000 ₫'",
          "formatCurrency(1234.56, 'USD', 'en-US') → '$1,234.56'"
        ]
      }
  }

  PATTERN_14_28_FORMAT_NUMBER: {
    purpose: "Format numbers with thousands separators"

    workflow: |
      FUNCTION formatNumber(num: number, locale = 'vi-VN'): string {
        RETURN new Intl.NumberFormat(locale).format(num)

        // Example: formatNumber(1234567) → "1.234.567"
      }
  }

  PATTERN_14_29_FORMAT_RELATIVE_TIME: {
    purpose: "Human-readable relative time in Vietnamese"
    library: "date-fns/formatDistanceToNow"

    workflow: |
      FUNCTION formatRelativeTime(date: string | Date): string {
        dateObj = IF typeof date == "string" THEN parseISO(date) ELSE date

        RETURN formatDistanceToNow(dateObj, {
          addSuffix: true,
          locale: vi
        })

        // Examples:
        // "vừa xong" (just now)
        // "2 phút trước" (2 minutes ago)
        // "3 giờ trước" (3 hours ago)
        // "5 ngày trước" (5 days ago)
      }
  }

  PATTERN_14_30_FORMAT_BYTES: {
    purpose: "Human-readable file sizes"

    workflow: |
      FUNCTION formatBytes(bytes: number, decimals = 2): string {
        IF bytes == 0 THEN RETURN "0 Bytes"

        k = 1024
        sizes = ["Bytes", "KB", "MB", "GB", "TB"]
        i = Math.floor(Math.log(bytes) / Math.log(k))

        value = (bytes / Math.pow(k, i)).toFixed(decimals)
        RETURN `${value} ${sizes[i]}`

        // Examples:
        // formatBytes(1024) → "1.00 KB"
        // formatBytes(1536000) → "1.46 MB"
      }
  }
}
```

---

## Pattern 14.31-14.35: Validators

### Workflow

```pseudo
WORKFLOW Validators_Group {
  PATTERN_14_31_IS_VALID_EMAIL: {
    workflow: |
      FUNCTION isValidEmail(email: string): boolean {
        regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        RETURN regex.test(email)
      }
  }

  PATTERN_14_32_IS_VALID_PHONE: {
    purpose: "Validate Vietnamese phone numbers (+84 or 0xxx)"

    workflow: |
      FUNCTION isValidPhone(phone: string): boolean {
        // Formats: +84987654321 or 0987654321
        regex = /^(\+84|0)[0-9]{9,10}$/

        RETURN regex.test(phone.replace(/\s/g, ''))
      }
  }

  PATTERN_14_33_IS_VALID_URL: {
    workflow: |
      FUNCTION isValidURL(url: string): boolean {
        TRY {
          new URL(url)
          RETURN true
        } CATCH {
          RETURN false
        }
      }
  }

  PATTERN_14_34_PARSE_JWT: {
    purpose: "Parse JWT token to extract payload"

    workflow: |
      FUNCTION parseJWT(token: string): Record<string, any> | null {
        TRY {
          parts = token.split('.')
          IF parts.length != 3 THEN RETURN null

          payload = parts[1]
          decoded = Buffer.from(payload, 'base64').toString('utf-8')
          RETURN JSON.parse(decoded)
        } CATCH {
          RETURN null
        }
      }
  }

  PATTERN_14_35_SANITIZE_HTML: {
    purpose: "Remove dangerous HTML tags/attributes"
    library: "DOMPurify"

    workflow: |
      FUNCTION sanitizeHTML(html: string): string {
        RETURN DOMPurify.sanitize(html, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
          ALLOWED_ATTR: ['href', 'target']
        })
      }
  }
}
```

---

## Pattern 14.36-14.40: Helper Functions

### Workflow

```pseudo
WORKFLOW Helpers_Group {
  PATTERN_14_36_DEBOUNCE: {
    purpose: "Delay function execution until after wait time"

    workflow: |
      FUNCTION debounce<T extends Function>(func: T, wait: number): T {
        STATE: { timeout: NodeJS.Timeout | null = null }

        RETURN (...args) => {
          IF timeout THEN clearTimeout(timeout)

          timeout = setTimeout(() => {
            timeout = null
            func(...args)
          }, wait)
        }

        // Usage: const debouncedSearch = debounce(searchAPI, 300)
      }
  }

  PATTERN_14_37_THROTTLE: {
    purpose: "Limit function execution to once per time period"

    workflow: |
      FUNCTION throttle<T extends Function>(func: T, limit: number): T {
        STATE: { inThrottle: boolean = false }

        RETURN (...args) => {
          IF !inThrottle THEN {
            func(...args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
          }
        }

        // Usage: const throttledScroll = throttle(handleScroll, 100)
      }
  }

  PATTERN_14_38_CLONE_DEEP: {
    purpose: "Deep clone objects (avoiding reference issues)"

    workflow: |
      FUNCTION cloneDeep<T>(obj: T): T {
        RETURN JSON.parse(JSON.stringify(obj))

        // Note: Loses functions, Date objects, undefined values
        // Alternative: Use structuredClone() for complex objects
      }
  }

  PATTERN_14_39_OMIT: {
    purpose: "Create object without specified keys"

    workflow: |
      FUNCTION omit<T extends object, K extends keyof T>(
        obj: T,
        keys: K[]
      ): Omit<T, K> {
        result = { ...obj }

        FOR EACH key IN keys:
          DELETE result[key]
        END FOR

        RETURN result
      }

      // Example: omit(user, ['password', 'apiKey'])
  }

  PATTERN_14_40_PICK: {
    purpose: "Create object with only specified keys"

    workflow: |
      FUNCTION pick<T extends object, K extends keyof T>(
        obj: T,
        keys: K[]
      ): Pick<T, K> {
        result = {}

        FOR EACH key IN keys:
          IF obj.hasOwnProperty(key) THEN
            result[key] = obj[key]
          END IF
        END FOR

        RETURN result
      }

      // Example: pick(user, ['id', 'name', 'email'])
  }
}
```

---

## Vietnamese Localization Utilities

```pseudo
WORKFLOW VietnameseUtilities {
  PHONE_FORMATTER: {
    description: "Format Vietnamese phone numbers with spaces"

    logic: |
      FUNCTION formatPhoneVN(phone: string): string {
        cleaned = phone.replace(/\D/g, '')

        IF cleaned.startsWith('84') THEN
          // +84 format
          RETURN `+84 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`
        ELSE IF cleaned.startsWith('0') THEN
          // 0xxx format
          RETURN `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`
        ELSE
          RETURN phone
        END IF
      }

      // Examples:
      // formatPhoneVN('0987654321') → '0987 654 321'
      // formatPhoneVN('+84987654321') → '+84 987 654 321'
  }

  CCCD_VALIDATOR: {
    description: "Validate Vietnamese Citizen ID (CCCD - 12 digits)"

    logic: |
      FUNCTION isValidCCCD(cccd: string): boolean {
        cleaned = cccd.replace(/\s/g, '')
        RETURN /^[0-9]{12}$/.test(cleaned)
      }
  }

  VIETNAMESE_SLUG: {
    description: "Convert Vietnamese text to URL-friendly slug"

    logic: |
      FUNCTION toSlug(text: string): string {
        // Remove accents
        normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

        // Replace đ with d
        normalized = normalized.replace(/đ/g, 'd').replace(/Đ/g, 'D')

        // Lowercase and replace spaces with hyphens
        slug = normalized.toLowerCase().replace(/\s+/g, '-')

        // Remove special characters
        slug = slug.replace(/[^a-z0-9-]/g, '')

        RETURN slug
      }

      // Example: toSlug('Hợp đồng bảo hiểm') → 'hop-dong-bao-hiem'
  }
}
```

---

## Performance Optimization

```pseudo
WORKFLOW OptimizeUtilities {
  MEMOIZATION: {
    description: "Cache expensive function results"

    technique: |
      cache = new Map()

      FUNCTION memoize<T extends Function>(fn: T): T {
        RETURN (...args) => {
          key = JSON.stringify(args)

          IF cache.has(key) THEN
            RETURN cache.get(key)
          ELSE
            result = fn(...args)
            cache.set(key, result)
            RETURN result
          END IF
        }
      }

      // Usage:
      const expensiveFormatter = memoize(formatComplexData)
  }

  PURE_FUNCTIONS: {
    rules: [
      "No side effects (no mutations, no API calls)",
      "Same input → same output (deterministic)",
      "No external dependencies",
      "Easy to test and compose"
    ]

    example: |
      // ✅ Pure
      const formatPrice = (price: number) => `${price.toLocaleString()} ₫`

      // ❌ Impure (depends on Date.now())
      const getTimestamp = () => Date.now()
  }
}
```

---

## Testing Strategy

```pseudo
WORKFLOW TestUtilities {
  UNIT_TESTS: {
    test_formatters: |
      DESCRIBE "formatters" {
        IT "formats VND currency correctly" {
          EXPECT formatCurrency(1500000) toBe "1.500.000 ₫"
        }

        IT "formats date in Vietnamese format" {
          EXPECT formatDate('2025-12-29') toBe "29/12/2025"
        }

        IT "formats relative time in Vietnamese" {
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
          EXPECT formatRelativeTime(twoHoursAgo) toBe "2 giờ trước"
        }
      }

    test_validators: |
      DESCRIBE "validators" {
        IT "validates Vietnamese phone numbers" {
          EXPECT isValidPhone('+84987654321') toBe true
          EXPECT isValidPhone('0987654321') toBe true
          EXPECT isValidPhone('123') toBe false
        }

        IT "validates CCCD" {
          EXPECT isValidCCCD('001234567890') toBe true
          EXPECT isValidCCCD('12345') toBe false
        }
      }

    test_helpers: |
      DESCRIBE "helpers" {
        IT "debounces function calls" {
          const fn = jest.fn()
          const debounced = debounce(fn, 100)

          debounced()
          debounced()
          debounced()

          jest.advanceTimersByTime(99)
          EXPECT fn.toHaveBeenCalledTimes(0)

          jest.advanceTimersByTime(1)
          EXPECT fn.toHaveBeenCalledTimes(1)
        }

        IT "clones objects deeply" {
          const obj = { a: { b: { c: 1 } } }
          const cloned = cloneDeep(obj)

          cloned.a.b.c = 2
          EXPECT obj.a.b.c toBe 1  // Original unchanged
        }
      }
  }

  PROPERTY_BASED_TESTS: {
    test_pure_functions: |
      // Test that same input always produces same output
      PROPERTY "formatDate is deterministic" {
        FORALL date IN [valid_dates] {
          result1 = formatDate(date)
          result2 = formatDate(date)
          EXPECT result1 toBe result2
        }
      }
  }
}
```

---

## Reference Patterns

**Full Implementation**: See `/tmp/day13-context/fsd-shared-layer-patterns.md`

**Related Patterns**:
- Patterns 14.1-14.20: UI Components (covered in ui-components-specialist.md)
- Patterns 14.41-14.50: API Clients (covered in api-hooks-specialist.md)
- Patterns 14.51-14.55: Custom Hooks (covered in api-hooks-specialist.md)

---

**End of Utilities Specialist**
