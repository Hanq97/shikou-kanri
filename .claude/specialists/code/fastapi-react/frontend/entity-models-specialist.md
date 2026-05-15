# Frontend Entity Models Specialist

**Role**: Entity type system and domain model expert
**Focus**: TypeScript types, enums, utility types, generic entity templates
**Technology**: TypeScript 5, Zod validation, React 19
**Domain**: Vietnamese Legal P2P Insurance & Lending Platform
**Patterns**: 13.29-13.35 (Generic entity templates)
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST EntityModelsSpecialist {
  ROLE: "Frontend entity type system and domain model expert"

  RESPONSIBILITIES: [
    "Define TypeScript types for domain entities",
    "Create enums for entity properties (role, status, etc.)",
    "Build utility types (Pick, Omit, Partial, Required)",
    "Implement generic entity templates (EntityCard, EntityList)",
    "Create entity utility functions (formatters, validators)",
    "Design entity validation schemas with Zod",
    "Build entity constants and configuration",
    "Optimize type definitions for type safety",
    "Document entity models with JSDoc comments"
  ]

  TECH_STACK: {
    language: "TypeScript 5 (strict mode)",
    validation: "Zod",
    framework: "React 19",
    architecture: "Feature-Sliced Design (FSD)"
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["User", "Conversation", "Message", "Product", "Contract", "LegalCase"],
    localization: "Vietnamese primary, English fallback",
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh"
  }
}
```

---

## Pattern 13.29: Generic Entity Card Template

### Overview

```pseudo
PATTERN GenericEntityCard {
  PURPOSE: "Reusable card template for any entity type with flexible slots"

  PROBLEM: "Duplicated card structure across User, Product, Conversation entities"

  SOLUTION: "Generic card component with TypeScript generics and render props"

  USE_CASES: [
    "Display any entity in card format",
    "Reduce code duplication across entity components",
    "Provide consistent card styling"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW EntityCard_GenericComponent {
  INPUT: {
    entity: T,                           # Generic entity type
    renderHeader: (entity: T) => ReactNode,
    renderContent: (entity: T) => ReactNode,
    renderFooter?: (entity: T) => ReactNode,
    onClick?: (entity: T) => void,
    className?: string
  }

  FILE_STRUCTURE: |
    shared/ui/entity/
    ├── EntityCard.tsx                   # Generic card template
    ├── EntityListTemplate.tsx           # Generic list template
    ├── EntityBadge.tsx                  # Generic badge
    ├── EntityStatus.tsx                 # Generic status indicator
    └── EntitySkeleton.tsx               # Loading skeleton

  STEPS: {
    STEP_1_DEFINE_GENERIC_TYPE: {
      description: "Define TypeScript generic for entity type"
      logic: |
        interface EntityCardProps<T> {
          entity: T,
          renderHeader: (entity: T) => ReactNode,
          renderContent: (entity: T) => ReactNode,
          renderFooter?: (entity: T) => ReactNode,
          onClick?: (entity: T) => void,
          className?: string
        }

        function EntityCard<T>({ entity, renderHeader, renderContent, renderFooter, onClick, className }: EntityCardProps<T>) {
          # Implementation
        }
    }

    STEP_2_RENDER_CARD_STRUCTURE: {
      description: "Render Card with slots"
      logic: |
        RENDER Card WITH {
          className: MERGE("hover:shadow-md transition-shadow", className),
          onClick: () => onClick?.(entity),

          CardHeader: renderHeader(entity),
          CardContent: renderContent(entity),
          CardFooter: IF renderFooter THEN renderFooter(entity)
        }
    }

    STEP_3_USAGE_EXAMPLE: {
      description: "Example usage with User entity"
      logic: |
        <EntityCard
          entity={user}
          renderHeader={(u) => (
            <div className="flex items-center gap-4">
              <UserAvatar user={u} />
              <h3>{u.name}</h3>
            </div>
          )}
          renderContent={(u) => (
            <div>
              <p>{u.email}</p>
              <p>{u.department}</p>
            </div>
          )}
          onClick={(u) => router.push(`/users/${u.id}`)}
        />
    }
  }

  OUTPUT: {
    component: "React.FC<EntityCardProps<T>>",
    display: "Generic card with customizable header, content, footer slots"
  }
}
```

---

## Pattern 13.30: Generic Entity List Template

### Workflow

```pseudo
WORKFLOW EntityListTemplate_Component {
  INPUT: {
    entities: T[],
    renderItem: (entity: T, index: number) => ReactNode,
    emptyState?: ReactNode,
    loading?: boolean,
    onLoadMore?: () => void,
    hasMore?: boolean
  }

  STEPS: {
    STEP_1_HANDLE_LOADING: {
      description: "Show skeleton when loading"
      logic: |
        IF loading THEN
          RENDER Array(5).map(() => <EntitySkeleton />)
          RETURN
        END IF
    }

    STEP_2_HANDLE_EMPTY: {
      description: "Show empty state when no entities"
      logic: |
        IF entities.length == 0 THEN
          RENDER emptyState OR <DefaultEmptyState />
          RETURN
        END IF
    }

    STEP_3_RENDER_LIST: {
      description: "Render entity list"
      logic: |
        RENDER <div className="space-y-4"> {
          FOR EACH (entity, index) IN entities:
            RENDER <div key={entity.id || index}>
              {renderItem(entity, index)}
            </div>
          END FOR
        }
    }

    STEP_4_RENDER_LOAD_MORE: {
      description: "Show load more button if applicable"
      logic: |
        IF hasMore AND onLoadMore THEN
          RENDER <Button
            onClick={onLoadMore}
            variant="outline"
            className="w-full mt-4"
          >
            Tải thêm
          </Button>
        END IF
    }
  }

  OUTPUT: {
    component: "React.FC<EntityListTemplateProps<T>>",
    display: "Generic list with loading, empty state, load more"
  }
}
```

---

## Pattern 13.31: Generic Entity Badge

### Workflow

```pseudo
WORKFLOW EntityBadge_Component {
  INPUT: {
    status: string,
    statusConfig: StatusConfig,
    size?: "sm" | "md" | "lg"
  }

  TYPE_DEFINITIONS: {
    StatusConfig: {
      [key: string]: {
        label: string,           # Vietnamese label
        variant: BadgeVariant,
        icon?: ReactNode
      }
    }
  }

  STEPS: {
    STEP_1_GET_STATUS_CONFIG: {
      description: "Lookup status configuration"
      logic: |
        config = statusConfig[status] OR {
          label: status,
          variant: "secondary"
        }
    }

    STEP_2_RENDER_BADGE: {
      description: "Render Badge with configured variant"
      logic: |
        RENDER Badge WITH {
          variant: config.variant,
          size: size,
          children: (
            config.icon ? <Icon className="h-3 w-3 mr-1" /> : null,
            config.label
          )
        }
    }
  }

  USAGE_EXAMPLE: {
    user_status_badge: |
      const USER_STATUS_CONFIG = {
        active: { label: "Hoạt động", variant: "default", icon: CheckCircle },
        inactive: { label: "Không hoạt động", variant: "secondary", icon: XCircle },
        pending: { label: "Chờ xác nhận", variant: "outline", icon: Clock }
      }

      <EntityBadge status={user.status} statusConfig={USER_STATUS_CONFIG} />
  }

  OUTPUT: {
    component: "React.FC<EntityBadgeProps>",
    display: "Generic badge with configurable status variants"
  }
}
```

---

## Pattern 13.32: Entity Utility Types

### Type Definitions

```pseudo
TYPES EntityUtilityTypes {
  // Generic entity with ID
  Entity: {
    id: string,
    createdAt: string,
    updatedAt: string
  }

  // Generic API response wrapper
  ApiResponse<T>: {
    success: boolean,
    data?: T,
    error?: ApiError,
    meta?: ResponseMeta
  }

  ApiError: {
    code: string,
    message: string,
    details?: any
  }

  ResponseMeta: {
    timestamp: string,
    requestId: string
  }

  // Paginated response
  PaginatedResponse<T>: {
    data: T[],
    pagination: PaginationMeta
  }

  PaginationMeta: {
    page: number,
    pageSize: number,
    total: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }

  // Generic list filter
  ListFilter: {
    search?: string,
    status?: string[],
    sortBy?: string,
    sortOrder?: "asc" | "desc",
    page?: number,
    pageSize?: number
  }

  // Generic entity state
  EntityState<T>: {
    data: T | null,
    loading: boolean,
    error: Error | null,
    lastFetch: Date | null
  }
}
```

### Utility Type Functions

```pseudo
WORKFLOW CreateUtilityTypes {
  PICK_UTILITY: {
    description: "Extract subset of entity fields"
    example: |
      // User preview with only id, name, avatar
      type UserPreview = Pick<User, "id" | "name" | "avatar">
  }

  OMIT_UTILITY: {
    description: "Exclude specific entity fields"
    example: |
      // User without sensitive fields
      type PublicUser = Omit<User, "password" | "apiKey">
  }

  PARTIAL_UTILITY: {
    description: "Make all fields optional (for updates)"
    example: |
      // Update user with partial data
      type UpdateUserPayload = Partial<User> & { id: string }
  }

  REQUIRED_UTILITY: {
    description: "Make optional fields required"
    example: |
      // User with all fields required
      type CompleteUser = Required<User>
  }

  READONLY_UTILITY: {
    description: "Make fields immutable"
    example: |
      // Immutable user entity
      type ImmutableUser = Readonly<User>
  }
}
```

---

## Pattern 13.33: Entity Validation Schemas (Zod)

### Workflow

```pseudo
WORKFLOW EntityValidationSchemas {
  USER_SCHEMA: {
    definition: |
      import { z } from 'zod'

      export const UserSchema = z.object({
        id: z.string().uuid(),
        name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
        email: z.string().email("Email không hợp lệ"),
        avatar: z.string().url().optional(),
        role: z.enum(["admin", "user", "viewer"]),
        status: z.enum(["active", "inactive", "pending"]),
        department: z.string().optional(),
        phone: z.string().regex(/^\+84\d{9,10}$/, "Số điện thoại không hợp lệ").optional(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime()
      })

    validation_example: |
      // Validate user data
      const result = UserSchema.safeParse(userData)

      IF result.success THEN
        validated_user = result.data
        // Proceed with validated data
      ELSE
        errors = result.error.format()
        // Handle validation errors
      END IF
  }

  CONVERSATION_SCHEMA: {
    definition: |
      export const ConversationSchema = z.object({
        id: z.string().uuid(),
        title: z.string().min(1, "Tiêu đề không được để trống"),
        participants: z.array(UserSchema).min(2, "Cần ít nhất 2 người tham gia"),
        lastMessage: MessageSchema.optional(),
        unreadCount: z.number().int().nonnegative(),
        status: z.enum(["active", "archived", "deleted"]),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime()
      })
  }

  MESSAGE_SCHEMA: {
    definition: |
      export const MessageSchema = z.object({
        id: z.string().uuid(),
        conversationId: z.string().uuid(),
        senderId: z.string().uuid(),
        sender: UserSchema,
        content: z.string().min(1, "Nội dung không được để trống").max(5000),
        attachments: z.array(AttachmentSchema).max(10),
        reactions: z.array(ReactionSchema),
        status: z.enum(["sending", "sent", "delivered", "read", "failed"]),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime()
      })

      export const AttachmentSchema = z.object({
        id: z.string().uuid(),
        type: z.enum(["image", "file", "audio", "video"]),
        url: z.string().url(),
        filename: z.string(),
        size: z.number().int().positive().max(10 * 1024 * 1024), // Max 10MB
        mimeType: z.string()
      })
  }

  PRODUCT_SCHEMA: {
    definition: |
      export const ProductSchema = z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "Tên sản phẩm không được để trống"),
        description: z.string(),
        category: z.string(),
        price: z.number().int().positive("Giá phải lớn hơn 0"),
        image: z.string().url().optional(),
        inventory: z.number().int().nonnegative(),
        status: z.enum(["available", "out_of_stock", "discontinued"]),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime()
      })
  }
}
```

---

## Pattern 13.34: Entity Formatters

### Workflow

```pseudo
WORKFLOW EntityFormatters {
  PRICE_FORMATTER: {
    description: "Format price in Vietnamese Dong"
    logic: |
      function formatVND(amount: number): string {
        RETURN new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(amount)
      }

      // Example: formatVND(1500000) => "1.500.000 ₫"
  }

  DATE_FORMATTER: {
    description: "Format date in Vietnamese format"
    logic: |
      function formatDate(date: string | Date): string {
        date_obj = IF typeof date == "string" THEN new Date(date) ELSE date

        RETURN date_obj.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      }

      // Example: formatDate("2024-01-15") => "15/01/2024"
  }

  RELATIVE_TIME_FORMATTER: {
    description: "Format relative time in Vietnamese"
    logic: |
      function formatRelativeTime(date: string | Date): string {
        date_obj = IF typeof date == "string" THEN new Date(date) ELSE date
        now = new Date()
        diff_ms = now.getTime() - date_obj.getTime()

        diff_minutes = Math.floor(diff_ms / 60000)
        diff_hours = Math.floor(diff_minutes / 60)
        diff_days = Math.floor(diff_hours / 24)

        MATCH true {
          diff_minutes < 1 => "Vừa xong",
          diff_minutes < 60 => `${diff_minutes} phút trước`,
          diff_hours < 24 => `${diff_hours} giờ trước`,
          diff_days < 7 => `${diff_days} ngày trước`,
          DEFAULT => formatDate(date_obj)
        }
      }

      // Example: formatRelativeTime("2024-01-15T10:00:00") => "2 giờ trước"
  }

  PHONE_FORMATTER: {
    description: "Format Vietnamese phone number"
    logic: |
      function formatPhone(phone: string): string {
        cleaned = phone.replace(/\D/g, '')

        IF cleaned.startsWith('84') THEN
          RETURN '+84 ' + cleaned.substring(2, 5) + ' ' + cleaned.substring(5, 8) + ' ' + cleaned.substring(8)
        ELSE IF cleaned.startsWith('0') THEN
          RETURN cleaned.substring(0, 4) + ' ' + cleaned.substring(4, 7) + ' ' + cleaned.substring(7)
        ELSE
          RETURN phone
        END IF
      }

      // Example: formatPhone("0987654321") => "0987 654 321"
      // Example: formatPhone("+84987654321") => "+84 987 654 321"
  }

  NAME_FORMATTER: {
    description: "Get initials from Vietnamese name"
    logic: |
      function getInitials(name: string): string {
        words = name.trim().split(/\s+/)

        IF words.length == 1 THEN
          RETURN words[0].substring(0, 2).toUpperCase()
        ELSE
          first_initial = words[0][0]
          last_initial = words[words.length - 1][0]
          RETURN (first_initial + last_initial).toUpperCase()
        END IF
      }

      // Example: getInitials("Nguyen Van A") => "NA"
      // Example: getInitials("Tran") => "TR"
  }
}
```

---

## Pattern 13.35: Entity Constants

### Constants Definition

```pseudo
CONSTANTS EntityConstants {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE: 1
  }

  VALIDATION_RULES: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,
    MIN_PASSWORD_LENGTH: 8,
    MAX_MESSAGE_LENGTH: 5000,
    MAX_FILE_SIZE: 10 * 1024 * 1024,  # 10MB
    MAX_ATTACHMENTS: 10
  }

  AVATAR_SIZES: {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-24 w-24"
  }

  STATUS_COLORS: {
    user_status: {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800"
    },

    message_status: {
      sending: "text-gray-400",
      sent: "text-gray-600",
      delivered: "text-blue-600",
      read: "text-blue-800",
      failed: "text-red-600"
    },

    product_status: {
      available: "bg-green-100 text-green-800",
      out_of_stock: "bg-red-100 text-red-800",
      discontinued: "bg-gray-100 text-gray-800"
    }
  }

  ROLE_PERMISSIONS: {
    admin: ["read", "write", "delete", "manage_users"],
    user: ["read", "write"],
    viewer: ["read"]
  }
}
```

---

## Generic Entity Hook Pattern

### Workflow

```pseudo
WORKFLOW UseEntity_Hook {
  PURPOSE: "Generic hook for fetching and managing entity state"

  IMPLEMENTATION: |
    function useEntity<T>(
      entityId: string,
      fetchFn: (id: string) => Promise<T>,
      options?: UseEntityOptions
    ) {
      const [state, setState] = useState<EntityState<T>>({
        data: null,
        loading: true,
        error: null,
        lastFetch: null
      })

      STEP_1_FETCH: {
        logic: |
          useEffect(() => {
            async function fetch() {
              setState(prev => ({ ...prev, loading: true }))

              TRY {
                data = await fetchFn(entityId)
                setState({
                  data,
                  loading: false,
                  error: null,
                  lastFetch: new Date()
                })
              } CATCH (error) {
                setState(prev => ({
                  ...prev,
                  loading: false,
                  error: error as Error
                }))
              }
            }

            fetch()
          }, [entityId])
      }

      STEP_2_REFETCH: {
        logic: |
          const refetch = useCallback(() => {
            // Re-trigger fetch by updating dependency
          }, [entityId])
      }

      RETURN {
        data: state.data,
        loading: state.loading,
        error: state.error,
        refetch
      }
    }

  USAGE_EXAMPLE: |
    // Fetch user entity
    const { data: user, loading, error, refetch } = useEntity(
      userId,
      (id) => apiClient.get(`/users/${id}`).then(res => res.data)
    )

    // Fetch product entity
    const { data: product, loading, error } = useEntity(
      productId,
      fetchProduct
    )
}
```

---

## Testing Strategy

```pseudo
WORKFLOW TestEntityModels {
  TYPE_TESTS: {
    test_type_safety: |
      // TypeScript compiler tests
      DESCRIBE "Entity Types" {
        IT "enforces required fields" {
          // @ts-expect-error - missing required field
          const invalid_user: User = { id: "1", name: "Test" }
        }

        IT "allows optional fields to be omitted" {
          const valid_user: User = {
            id: "1",
            name: "Test",
            email: "test@example.com",
            role: "user",
            status: "active",
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01"
            // department, phone, avatar are optional
          }
        }
      }
  }

  VALIDATION_TESTS: {
    test_zod_schemas: |
      DESCRIBE "Zod Schemas" {
        IT "validates correct user data" {
          const valid_user = { id: "...", name: "Nguyen Van A", ... }
          const result = UserSchema.safeParse(valid_user)

          EXPECT result.success toBe true
        }

        IT "rejects invalid email" {
          const invalid_user = { ...valid_user, email: "not-an-email" }
          const result = UserSchema.safeParse(invalid_user)

          EXPECT result.success toBe false
          EXPECT result.error.issues[0].path toEqual ["email"]
        }

        IT "rejects invalid Vietnamese phone number" {
          const invalid_user = { ...valid_user, phone: "123456" }
          const result = UserSchema.safeParse(invalid_user)

          EXPECT result.success toBe false
        }
      }
  }

  FORMATTER_TESTS: {
    test_formatters: |
      DESCRIBE "Entity Formatters" {
        IT "formats VND price correctly" {
          EXPECT formatVND(1500000) toBe "1.500.000 ₫"
        }

        IT "formats Vietnamese phone number" {
          EXPECT formatPhone("0987654321") toBe "0987 654 321"
        }

        IT "gets initials from Vietnamese name" {
          EXPECT getInitials("Nguyen Van A") toBe "NA"
        }
      }
  }
}
```

---

## Reference Patterns

**Full Implementation**: See `/tmp/day12-context/fsd-entities-layer-patterns.md`

**Related Patterns**:
- Pattern 13.1-13.28: Entity-specific components (covered in entity-components-specialist.md)
- Pattern 13.29-13.35: Generic entity templates and utilities (this file)

---

## Integration with Entity Components

```pseudo
WORKFLOW IntegrateModelsWithComponents {
  EXAMPLE: |
    // Define types in entity-models
    export interface User {
      id: string,
      name: string,
      email: string,
      role: UserRole,
      status: UserStatus,
      ...
    }

    export const UserSchema = z.object({ ... })

    // Use types in entity-components
    import { User, UserSchema } from '@/entities/user/model/types'

    interface UserCardProps {
      user: User,  // Type from entity-models
      onClick?: (user: User) => void
    }

    export function UserCard({ user, onClick }: UserCardProps) {
      // Validate at runtime if needed
      const validated = UserSchema.parse(user)

      // Render component
      return <Card>...</Card>
    }

  BENEFITS: [
    "Type safety across components",
    "Single source of truth for entity types",
    "Runtime validation with Zod",
    "Reusable formatters and utilities"
  ]
}
```

---

**End of Entity Models Specialist**
