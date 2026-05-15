# Frontend Entities Layer - Specialist Index

**Architecture**: Feature-Sliced Design (FSD)
**Layer**: Entities Layer (Business domain models and entity UI components)
**Total Specialists**: 2
**Total Patterns**: 35 (13.1-13.35)
**Format**: Workflow as Code (Pseudo-code)
**Domain**: Vietnamese Legal P2P Insurance & Lending Platform

---

## Specialist Categories

### Entity UI Components (1 specialist)

1. **[entity-components-specialist.md](./entity-components-specialist.md)** (711 lines - ✅ compliant)
   - Patterns 13.1-13.21 (User, Conversation, Message entities)
   - Entity card components, avatars, badges, list items
   - Technologies: React 19, TypeScript 5, Shadcn/ui, Tailwind CSS
   - Keywords: user-card, conversation-card, message-bubble, avatar, badge, entity-ui

### Entity Type System (1 specialist)

2. **[entity-models-specialist.md](./entity-models-specialist.md)** (867 lines - ⚠️ within buffer)
   - Patterns 13.29-13.35 (Generic entity templates)
   - TypeScript types, Zod validation, utility types, formatters
   - Technologies: TypeScript 5, Zod
   - Keywords: entity-types, zod-validation, utility-types, formatters, entity-templates, generic-components

---

## Pattern Coverage

### User Entity (Patterns 13.1-13.7)
**Specialist**: [entity-components-specialist.md](./entity-components-specialist.md)

- Pattern 13.1: User Entity Model
- Pattern 13.2: User Avatar Component
- Pattern 13.3: User Badge Component
- Pattern 13.4: User List Item Component
- Pattern 13.5: User Selector Component
- Pattern 13.6: User Profile Display
- Pattern 13.7: User Status Indicator

**Key Features**:
- User types (id, name, email, role, status, department, phone)
- UserCard with avatar, badges, contact info
- UserAvatar with online status indicator
- Role-based styling (admin, user, viewer)
- Status badges (active, inactive, pending)

---

### Conversation Entity (Patterns 13.8-13.14)
**Specialist**: [entity-components-specialist.md](./entity-components-specialist.md)

- Pattern 13.8: Conversation Entity Model
- Pattern 13.9: Conversation Card Component
- Pattern 13.10: Conversation List Item
- Pattern 13.11: Conversation Header
- Pattern 13.12: Conversation Metadata
- Pattern 13.13: Conversation Status
- Pattern 13.14: Conversation Participants

**Key Features**:
- Conversation types (id, title, participants, lastMessage, unreadCount)
- ConversationCard with participant avatars, last message preview
- Unread count badge
- Participant avatar group (max 3 shown)
- Status indicators (active, archived, deleted)

---

### Message Entity (Patterns 13.15-13.21)
**Specialist**: [entity-components-specialist.md](./entity-components-specialist.md)

- Pattern 13.15: Message Entity Model
- Pattern 13.16: Message Bubble Component
- Pattern 13.17: Message Attachment Display
- Pattern 13.18: Message Timestamp
- Pattern 13.19: Message Status Indicator
- Pattern 13.20: Message Reactions
- Pattern 13.21: Message Thread

**Key Features**:
- Message types (id, sender, content, attachments, reactions, status)
- MessageBubble with sender-based alignment (own vs other)
- Attachment display (image, file, audio, video)
- Status icons (sent, delivered, read)
- Reaction badges with emoji and count
- Vietnamese timestamp formatting

---

### Product Entity (Patterns 13.22-13.28)
**Specialist**: [entity-components-specialist.md](./entity-components-specialist.md)

- Pattern 13.22: Product Entity Model
- Pattern 13.23: Product Card Component
- Pattern 13.24: Product Image Display
- Pattern 13.25: Product Price Formatter
- Pattern 13.26: Product Status Badge
- Pattern 13.27: Product Category Badge
- Pattern 13.28: Product Inventory Display

**Key Features**:
- Product types (id, name, price, inventory, status, category)
- ProductCard with image, name, price in VND
- Price formatting (1.500.000 ₫)
- Status badges (available, out_of_stock, discontinued)
- Inventory count with low-stock warning (<10 items)

---

### Generic Entity Templates (Patterns 13.29-13.35)
**Specialist**: [entity-models-specialist.md](./entity-models-specialist.md)

- Pattern 13.29: Generic Entity Card Template
- Pattern 13.30: Generic Entity List Template
- Pattern 13.31: Generic Entity Badge
- Pattern 13.32: Entity Utility Types
- Pattern 13.33: Entity Validation Schemas (Zod)
- Pattern 13.34: Entity Formatters
- Pattern 13.35: Entity Constants

**Key Features**:
- Generic EntityCard<T> with render props
- Generic EntityListTemplate<T> with loading/empty states
- Configurable EntityBadge with status variants
- TypeScript utility types (Pick, Omit, Partial, Required)
- Zod schemas for runtime validation
- Vietnamese formatters (VND, phone, date, relative time)
- Entity constants (pagination, validation rules, colors)

---

## Technology Stack

**Frontend Framework**:
- React 19 (Client Components)
- TypeScript 5 (strict mode)
- Next.js 15 (App Router)

**UI Components**:
- Shadcn/ui (Card, Avatar, Badge)
- Radix UI (primitives)
- Tailwind CSS (styling)
- Lucide React (icons)

**Validation & Types**:
- Zod (schema validation)
- TypeScript utility types

**State Management**:
- React hooks (useState, useCallback, useMemo)
- React.memo for optimization

---

## Vietnamese Localization

**Translations**:
- User roles: admin → "Quản trị viên", user → "Người dùng", viewer → "Người xem"
- User status: active → "Hoạt động", inactive → "Không hoạt động", pending → "Chờ xác nhận"
- Message status: sent → "Đã gửi", delivered → "Đã nhận", read → "Đã đọc"
- Product status: available → "Còn hàng", out_of_stock → "Hết hàng"

**Formatters**:
- Date: DD/MM/YYYY (Vietnamese format)
- Time: HH:mm (24-hour)
- Currency: VND with dots (1.500.000 ₫)
- Phone: +84 987 654 321 or 0987 654 321
- Relative time: "Vừa xong", "2 phút trước", "3 giờ trước"

**Timezone**: Asia/Ho_Chi_Minh

---

## File Size Summary

```pseudo
METRICS = {
  total_specialists: 2,
  total_lines: 1578,
  avg_lines_per_file: 789,
  min_lines: 711 (entity-components-specialist.md),
  max_lines: 867 (entity-models-specialist.md),
  strict_compliance_≤800: 1/2 (50%),
  buffer_compliance_≤900: 2/2 (100%)
}

SIZE_DISTRIBUTION = {
  "700-800 lines": 1 file,
  "800-900 lines": 1 file
}
```

---

## Integration Pattern

Entities are consumed by Features, Widgets, and Pages:

```typescript
// Import entity types
import { User, UserRole, UserStatus } from '@/entities/user/model/types';

// Import entity UI components
import { UserCard } from '@/entities/user/ui/UserCard';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';

// Import entity utilities
import { formatVND } from '@/entities/user/lib/formatters';
import { UserSchema } from '@/entities/user/model/validation';

// Use in Features
export function CreateUserFeature() {
  const [user, setUser] = useState<User | null>(null);

  const handleSubmit = (data: unknown) => {
    const validated = UserSchema.parse(data);
    // ...
  };

  return (
    <div>
      {user && <UserCard user={user} />}
    </div>
  );
}
```

---

## Optimization Strategies

**Performance**:
- React.memo for entity cards (compare by id and updatedAt)
- useMemo for expensive formatters (VND, relative time)
- Virtualization for lists >50 items (react-window)

**Type Safety**:
- Strict TypeScript mode
- Zod runtime validation
- Generic types with constraints

**Accessibility**:
- Semantic HTML (article, section)
- Alt text for images
- Keyboard navigation
- ARIA labels

---

## Testing

**Unit Tests**:
- Component rendering (UserCard, ConversationCard, MessageBubble)
- Props validation
- Event handlers (onClick)
- Conditional rendering (status badges, avatars)

**Type Tests**:
- TypeScript compiler tests
- Zod schema validation
- Utility type correctness

**Integration Tests**:
- Entity components with real data
- Formatter functions with Vietnamese locale
- Generic templates with different entity types

---

## Usage Examples

### User Entity

```typescript
// Display user card
<UserCard
  user={user}
  onClick={(u) => router.push(`/users/${u.id}`)}
/>

// Show user avatar with status
<UserAvatar
  user={user}
  size="lg"
  showStatus={true}
/>

// User status badge
<EntityBadge
  status={user.status}
  statusConfig={USER_STATUS_CONFIG}
/>
```

### Conversation Entity

```typescript
// Conversation list item
<ConversationCard
  conversation={conversation}
  showUnreadBadge={true}
  onClick={handleOpenConversation}
/>

// Participant avatars
<ConversationParticipants
  participants={conversation.participants}
  max={3}
/>
```

### Message Entity

```typescript
// Message bubble
<MessageBubble
  message={message}
  currentUserId={currentUser.id}
  showTimestamp={true}
  showReactions={true}
/>

// Message attachment
<MessageAttachment
  attachment={message.attachments[0]}
/>
```

### Generic Templates

```typescript
// Generic entity card
<EntityCard
  entity={product}
  renderHeader={(p) => <h3>{p.name}</h3>}
  renderContent={(p) => <p>{formatVND(p.price)}</p>}
  onClick={(p) => console.log(p)}
/>

// Generic entity list
<EntityListTemplate
  entities={users}
  renderItem={(user) => <UserListItem user={user} />}
  loading={isLoading}
  emptyState={<p>Không có người dùng</p>}
/>
```

---

## Source Files

**Pattern Definition**: [fsd-entities-layer-patterns.md](../../../../memory-bank/eps-enhancement/week-14/days/phase-4/day-12/patterns/fsd-entities-layer-patterns.md) (1,206 lines)

**Planning Documents**:
- [PLAN.md](../../../../memory-bank/eps-enhancement/week-14/days/phase-4/day-12/PLAN.md)
- [CONTEXT_ENGINEERING.md](../../../../memory-bank/eps-enhancement/week-14/days/phase-4/day-12/CONTEXT_ENGINEERING.md)
- [INSTRUCTION_HELPER.md](../../../../memory-bank/eps-enhancement/week-14/days/phase-4/day-12/INSTRUCTION_HELPER.md)

---

## Related Layers

**Dependencies** (imports from):
- Shared Layer: UI components (Avatar, Badge, Card), utilities

**Dependents** (used by):
- Features Layer: User actions (create, edit, delete)
- Widgets Layer: Complex UI blocks (chat window, user list)
- Pages Layer: Route-level composition

---

**Last Updated**: 2026-01-03
**Status**: COMPLETE
**Compliance**: 50% strict (≤800), 100% buffer (≤900)
**Day**: 12 of 15 (Phase 4)
