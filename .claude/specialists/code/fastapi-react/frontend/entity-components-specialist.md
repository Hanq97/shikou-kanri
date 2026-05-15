# Frontend Entity Components Specialist

**Role**: Entity UI component design expert
**Focus**: Entity cards, avatars, badges, list items for React 19 applications
**Technology**: React 19, TypeScript 5, Shadcn/ui, Tailwind CSS
**Domain**: Vietnamese Legal P2P Insurance & Lending Platform
**Patterns**: 13.1-13.21 (User, Conversation, Message entities)
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST EntityComponentsSpecialist {
  ROLE: "Frontend entity UI component design expert for Feature-Sliced Design"

  RESPONSIBILITIES: [
    "Design entity card components (User, Conversation, Message, Product)",
    "Create entity avatar components with status indicators",
    "Build entity badge components for role/status display",
    "Implement entity list item components",
    "Create entity selector components",
    "Build entity profile display components",
    "Handle entity state visualization",
    "Optimize entity component performance with memoization"
  ]

  TECH_STACK: {
    framework: "React 19 (Client Components)",
    language: "TypeScript 5",
    ui_library: "Shadcn/ui (Card, Avatar, Badge)",
    styling: "Tailwind CSS",
    icons: "Lucide React",
    architecture: "Feature-Sliced Design (FSD)"
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["User", "Conversation", "Message", "Product", "Contract", "Case"],
    localization: "Vietnamese primary, English fallback"
  }
}
```

---

## Pattern 13.1: User Entity Model

### Overview

```pseudo
PATTERN UserEntityModel {
  PURPOSE: "TypeScript types and UI components for User entity with Vietnamese legal context"

  PROBLEM: "Need consistent user representation across application with role-based styling"

  SOLUTION: "Create reusable User types and composable UI components (Card, Avatar, Badge)"

  USE_CASES: [
    "Display user profile in admin dashboard",
    "Show user list in team management",
    "Render user info in conversation header",
    "Display user selector in assignment forms"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW UserCard_Component {
  INPUT: {
    user: User,
    onClick?: (user: User) => void,
    className?: string
  }

  FILE_STRUCTURE: |
    entities/user/
    ├── model/types.ts              # User, UserRole, UserStatus types
    ├── ui/UserCard.tsx             # Main card component
    ├── ui/UserAvatar.tsx           # Avatar with fallback
    ├── ui/UserBadge.tsx            # Status/role badge
    └── index.ts                     # Public API

  STEPS: {
    STEP_1_RENDER_CARD: {
      description: "Render Card container with hover effects"
      logic: |
        RENDER Card WITH {
          className: MERGE("hover:shadow-md transition-shadow cursor-pointer", props.className),
          onClick: () => props.onClick(user)
        }
    }

    STEP_2_RENDER_HEADER: {
      description: "Render CardHeader with Avatar and User info"
      logic: |
        RENDER CardHeader WITH FlexRow {
          LEFT: Avatar {
            src: user.avatar,
            fallback: user.name.substring(0, 2).toUpperCase(),
            size: "h-12 w-12"
          },

          RIGHT: FlexColumn {
            name: user.name + Badge(user.status),
            role: user.role AS secondary_text
          }
        }
    }

    STEP_3_RENDER_CONTENT: {
      description: "Render CardContent with contact info"
      logic: |
        RENDER CardContent WITH {
          email: Icon(Mail) + user.email,
          phone: IF user.phone THEN Icon(Phone) + user.phone,
          department: IF user.department THEN "Department: " + user.department
        }
    }

    STEP_4_APPLY_STATUS_STYLING: {
      description: "Apply conditional styling based on user status"
      logic: |
        badge_variant = MATCH user.status {
          "active" => "default",
          "inactive" => "secondary",
          "pending" => "outline"
        }
    }
  }

  OUTPUT: {
    component: "React.FC<UserCardProps>",
    display: "User card with avatar, name, role, status badge, email, phone, department"
  }
}
```

### Type Definitions

```pseudo
TYPES UserEntity {
  User: {
    id: string,
    name: string,
    email: string,
    avatar?: string,
    role: UserRole,
    status: UserStatus,
    department?: string,
    phone?: string,
    createdAt: string,
    updatedAt: string
  }

  UserRole: ENUM {
    ADMIN = "admin",
    USER = "user",
    VIEWER = "viewer"
  }

  UserStatus: ENUM {
    ACTIVE = "active",
    INACTIVE = "inactive",
    PENDING = "pending"
  }

  UserResponse: {
    user: User,
    stats?: {
      totalConversations: number,
      totalMessages: number,
      lastActive: string
    }
  }

  UserListResponse: {
    users: User[],
    pagination: PaginationMeta
  }
}
```

---

## Pattern 13.2: User Avatar Component

### Workflow

```pseudo
WORKFLOW UserAvatar_Component {
  INPUT: {
    user: User | UserPreview,
    size?: "sm" | "md" | "lg",
    showStatus?: boolean
  }

  STEPS: {
    STEP_1_CALCULATE_SIZE: {
      description: "Map size prop to Tailwind classes"
      logic: |
        size_class = MATCH size {
          "sm" => "h-8 w-8",
          "md" => "h-12 w-12",
          "lg" => "h-16 w-16",
          DEFAULT => "h-10 w-10"
        }
    }

    STEP_2_RENDER_AVATAR: {
      description: "Render Avatar with image and fallback"
      logic: |
        RENDER Avatar WITH {
          AvatarImage: { src: user.avatar, alt: user.name },
          AvatarFallback: user.name.substring(0, 2).toUpperCase()
        }
    }

    STEP_3_RENDER_STATUS_INDICATOR: {
      description: "Conditionally render online status indicator"
      logic: |
        IF showStatus AND user.status == "active" THEN
          RENDER <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
        END IF
    }
  }

  OUTPUT: {
    component: "React.FC<UserAvatarProps>",
    display: "User avatar with optional status indicator"
  }
}
```

---

## Pattern 13.8: Conversation Entity Model

### Workflow

```pseudo
WORKFLOW ConversationCard_Component {
  INPUT: {
    conversation: Conversation,
    onClick?: (conversation: Conversation) => void,
    showUnreadBadge?: boolean
  }

  FILE_STRUCTURE: |
    entities/conversation/
    ├── model/types.ts                      # Conversation, Message types
    ├── ui/ConversationCard.tsx             # Main card
    ├── ui/ConversationListItem.tsx         # List item variant
    ├── ui/ConversationParticipants.tsx     # Avatar group
    └── index.ts

  STEPS: {
    STEP_1_RENDER_HEADER: {
      description: "Render conversation title and participants"
      logic: |
        RENDER CardHeader WITH {
          title: conversation.title,
          participants: AvatarGroup(conversation.participants, max: 3)
        }
    }

    STEP_2_RENDER_LAST_MESSAGE: {
      description: "Show preview of last message"
      logic: |
        IF conversation.lastMessage THEN
          preview = TRUNCATE(conversation.lastMessage.content, 100)
          timestamp = FORMAT_RELATIVE_TIME(conversation.lastMessage.createdAt)

          RENDER <p className="text-sm text-gray-600">{preview}</p>
          RENDER <p className="text-xs text-gray-400">{timestamp}</p>
        END IF
    }

    STEP_3_RENDER_UNREAD_BADGE: {
      description: "Show unread count badge if applicable"
      logic: |
        IF showUnreadBadge AND conversation.unreadCount > 0 THEN
          RENDER Badge WITH {
            variant: "destructive",
            content: conversation.unreadCount
          }
        END IF
    }
  }

  OUTPUT: {
    component: "React.FC<ConversationCardProps>",
    display: "Conversation card with participants, last message preview, unread count"
  }
}
```

### Type Definitions

```pseudo
TYPES ConversationEntity {
  Conversation: {
    id: string,
    title: string,
    participants: User[],
    lastMessage?: Message,
    unreadCount: number,
    status: ConversationStatus,
    createdAt: string,
    updatedAt: string
  }

  ConversationStatus: ENUM {
    ACTIVE = "active",
    ARCHIVED = "archived",
    DELETED = "deleted"
  }
}
```

---

## Pattern 13.15: Message Entity Model

### Workflow

```pseudo
WORKFLOW MessageBubble_Component {
  INPUT: {
    message: Message,
    currentUserId: string,
    showTimestamp?: boolean,
    showReactions?: boolean
  }

  FILE_STRUCTURE: |
    entities/message/
    ├── model/types.ts                  # Message, Attachment types
    ├── ui/MessageBubble.tsx            # Bubble component
    ├── ui/MessageAttachment.tsx        # Attachment display
    ├── ui/MessageReactions.tsx         # Reaction badges
    └── index.ts

  STEPS: {
    STEP_1_DETERMINE_ALIGNMENT: {
      description: "Align message based on sender"
      logic: |
        isOwnMessage = (message.senderId == currentUserId)
        alignment = IF isOwnMessage THEN "flex-row-reverse" ELSE "flex-row"
        bubble_color = IF isOwnMessage THEN "bg-blue-500 text-white" ELSE "bg-gray-200"
    }

    STEP_2_RENDER_BUBBLE: {
      description: "Render message bubble with content"
      logic: |
        RENDER <div className={alignment}> {
          Avatar(message.sender),

          <div className={bubble_color + " rounded-lg p-3"}> {
            message.content,

            IF message.attachments.length > 0 THEN
              FOR EACH attachment IN message.attachments:
                RENDER MessageAttachment(attachment)
              END FOR
            END IF
          }
        }
    }

    STEP_3_RENDER_METADATA: {
      description: "Show timestamp and status"
      logic: |
        IF showTimestamp THEN
          timestamp = FORMAT_TIME(message.createdAt, "HH:mm")
          RENDER <span className="text-xs text-gray-400">{timestamp}</span>
        END IF

        IF isOwnMessage THEN
          status_icon = MATCH message.status {
            "sent" => CheckIcon,
            "delivered" => CheckCheckIcon,
            "read" => CheckCheckIcon WITH color="blue"
          }
          RENDER status_icon
        END IF
    }

    STEP_4_RENDER_REACTIONS: {
      description: "Show reaction badges"
      logic: |
        IF showReactions AND message.reactions.length > 0 THEN
          RENDER <div className="flex gap-1"> {
            FOR EACH reaction IN message.reactions:
              RENDER <Badge variant="outline">{reaction.emoji} {reaction.count}</Badge>
            END FOR
          }
        END IF
    }
  }

  OUTPUT: {
    component: "React.FC<MessageBubbleProps>",
    display: "Message bubble with sender-based styling, attachments, timestamp, status, reactions"
  }
}
```

### Type Definitions

```pseudo
TYPES MessageEntity {
  Message: {
    id: string,
    conversationId: string,
    senderId: string,
    sender: User,
    content: string,
    attachments: Attachment[],
    reactions: Reaction[],
    status: MessageStatus,
    createdAt: string,
    updatedAt: string
  }

  MessageStatus: ENUM {
    SENDING = "sending",
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read",
    FAILED = "failed"
  }

  Attachment: {
    id: string,
    type: "image" | "file" | "audio" | "video",
    url: string,
    filename: string,
    size: number,
    mimeType: string
  }

  Reaction: {
    emoji: string,
    count: number,
    userIds: string[]
  }
}
```

---

## Pattern 13.22: Product Entity Model

### Workflow

```pseudo
WORKFLOW ProductCard_Component {
  INPUT: {
    product: Product,
    onClick?: (product: Product) => void,
    showInventory?: boolean
  }

  FILE_STRUCTURE: |
    entities/product/
    ├── model/types.ts              # Product, ProductStatus types
    ├── ui/ProductCard.tsx          # Main card
    ├── ui/ProductImage.tsx         # Image with fallback
    ├── lib/formatPrice.ts          # Price formatter (VND)
    └── index.ts

  STEPS: {
    STEP_1_RENDER_IMAGE: {
      description: "Render product image with fallback"
      logic: |
        RENDER <div className="aspect-square overflow-hidden"> {
          IF product.image THEN
            <Image src={product.image} alt={product.name} fill />
          ELSE
            <div className="bg-gray-200 flex items-center justify-center">
              <PackageIcon className="h-16 w-16 text-gray-400" />
            </div>
          END IF
        }
    }

    STEP_2_RENDER_DETAILS: {
      description: "Render product name, category, price"
      logic: |
        RENDER CardContent WITH {
          name: <h3 className="font-semibold">{product.name}</h3>,
          category: <p className="text-sm text-gray-600">{product.category}</p>,
          price: <p className="text-lg font-bold">{FORMAT_VND(product.price)}</p>
        }
    }

    STEP_3_RENDER_STATUS_BADGE: {
      description: "Show product status badge"
      logic: |
        badge_variant = MATCH product.status {
          "available" => "default",
          "out_of_stock" => "destructive",
          "discontinued" => "secondary"
        }

        RENDER Badge WITH {
          variant: badge_variant,
          content: TRANSLATE(product.status)  # Vietnamese translation
        }
    }

    STEP_4_RENDER_INVENTORY: {
      description: "Conditionally show inventory count"
      logic: |
        IF showInventory THEN
          color = IF product.inventory < 10 THEN "text-red-500" ELSE "text-gray-600"
          RENDER <p className={color + " text-sm"}>
            Tồn kho: {product.inventory} sản phẩm
          </p>
        END IF
    }
  }

  OUTPUT: {
    component: "React.FC<ProductCardProps>",
    display: "Product card with image, name, price in VND, status, optional inventory"
  }
}
```

### Type Definitions

```pseudo
TYPES ProductEntity {
  Product: {
    id: string,
    name: string,
    description: string,
    category: string,
    price: number,           # In VND
    image?: string,
    inventory: number,
    status: ProductStatus,
    createdAt: string,
    updatedAt: string
  }

  ProductStatus: ENUM {
    AVAILABLE = "available",
    OUT_OF_STOCK = "out_of_stock",
    DISCONTINUED = "discontinued"
  }
}
```

---

## Optimization Patterns

### Memoization Strategy

```pseudo
WORKFLOW OptimizeEntityComponents {
  TECHNIQUES: {
    MEMO_COMPONENTS: {
      description: "Use React.memo for expensive components"
      logic: |
        // Wrap components that render frequently
        export const UserCard = React.memo(UserCardComponent, (prev, next) => {
          RETURN prev.user.id == next.user.id AND prev.user.updatedAt == next.user.updatedAt
        })
    }

    MEMO_FORMATTERS: {
      description: "Memoize expensive formatting functions"
      logic: |
        const formattedPrice = useMemo(() => {
          RETURN FORMAT_VND(product.price)
        }, [product.price])
    }

    VIRTUALIZE_LISTS: {
      description: "Use virtualization for long entity lists"
      logic: |
        // For lists with >50 items, use react-window
        import { FixedSizeList } from 'react-window'

        RENDER FixedSizeList WITH {
          itemCount: users.length,
          itemSize: 80,  # Height of UserListItem
          Row: ({ index }) => <UserListItem user={users[index]} />
        }
    }
  }
}
```

---

## Vietnamese Localization

```pseudo
WORKFLOW VietnameseEntityLabels {
  TRANSLATIONS: {
    user_roles: {
      admin: "Quản trị viên",
      user: "Người dùng",
      viewer: "Người xem"
    },

    user_status: {
      active: "Hoạt động",
      inactive: "Không hoạt động",
      pending: "Chờ xác nhận"
    },

    conversation_status: {
      active: "Đang hoạt động",
      archived: "Đã lưu trữ",
      deleted: "Đã xóa"
    },

    message_status: {
      sending: "Đang gửi",
      sent: "Đã gửi",
      delivered: "Đã nhận",
      read: "Đã đọc",
      failed: "Gửi thất bại"
    },

    product_status: {
      available: "Còn hàng",
      out_of_stock: "Hết hàng",
      discontinued: "Ngừng kinh doanh"
    }
  }

  DATE_FORMAT: "DD/MM/YYYY",
  TIME_FORMAT: "HH:mm",
  CURRENCY: "VND",
  TIMEZONE: "Asia/Ho_Chi_Minh"
}
```

---

## Testing Strategy

```pseudo
WORKFLOW TestEntityComponents {
  UNIT_TESTS: {
    test_user_card_rendering: |
      DESCRIBE "UserCard" {
        IT "renders user name and email" {
          user = { id: "1", name: "Nguyen Van A", email: "a@example.com", ... }
          RENDER <UserCard user={user} />

          EXPECT screen.getByText("Nguyen Van A").toBeInTheDocument()
          EXPECT screen.getByText("a@example.com").toBeInTheDocument()
        }

        IT "applies correct status badge variant" {
          active_user = { ...user, status: "active" }
          RENDER <UserCard user={active_user} />

          badge = screen.getByText("active")
          EXPECT badge.classList.contains("badge-default")
        }

        IT "calls onClick when card is clicked" {
          onClick = jest.fn()
          RENDER <UserCard user={user} onClick={onClick} />

          CLICK screen.getByRole("article")
          EXPECT onClick.toHaveBeenCalledWith(user)
        }
      }
  }

  ACCESSIBILITY_TESTS: {
    test_semantic_html: |
      EXPECT <UserCard /> to use <article> or <div role="article">
      EXPECT images to have alt text
      EXPECT interactive elements to be keyboard accessible
  }
}
```

---

## Reference Patterns

**Full Implementation**: See `/tmp/day12-context/fsd-entities-layer-patterns.md`

**Additional Patterns**:
- Pattern 13.3-13.7: User Badge, List Item, Selector, Profile
- Pattern 13.9-13.14: Conversation Header, Metadata, Status, Participants
- Pattern 13.16-13.21: Message Timestamp, Status, Reactions, Thread
- Pattern 13.23-13.28: Product Price, Status, Category, Inventory
- Pattern 13.29-13.35: Generic Entity Templates (covered in entity-models-specialist.md)

---

**End of Entity Components Specialist**
