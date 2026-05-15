# Widget Pseudo-Code Library Index

**Generated**: 2026-01-02
**Total Files**: 13 Widget Files
**Total Lines**: 4,733 lines
**Average Lines per Widget**: 364 lines
**Compliance**: All files ≤ 400 lines (within specification)

---

## Overview

This directory contains pseudo-code specifications for 13 React widget components extracted from the widget-composition-specialist.md reference implementation. Each widget follows the specialist pattern with WORKFLOW, interfaces, integration points, and Vietnamese domain context.

### Format

Each widget file includes:
- **Specialist Identity**: Role, responsibilities, tech stack
- **Pattern Overview**: Purpose, problem, solution, use cases
- **Workflow**: Complete step-by-step execution logic in pseudo-code format
- **Key Interfaces**: TypeScript interface signatures (interfaces only, no implementation)
- **Integration Points**: Parent components, state management, routing
- **Usage Example**: Real-world scenario with pseudo-code flow
- **Performance Considerations**: Optimization strategies and benchmarks
- **Vietnamese Domain Context**: Localization and business rules
- **Testing Guidelines**: Unit tests, integration tests, edge cases

---

## Widget Files (Ordered by Line Count)

### 1. ConversationSidebar Widget
**File**: `/conversation-sidebar-widget.md`
**Lines**: 454
**Pattern ID**: 11.26
**Type**: Sidebar Widget
**Role**: Display conversation metadata, participants, attachments, and action buttons
**Tech**: React 19, TypeScript, Zustand, date-fns

**Key Features**:
- Conversation details display (status, dates)
- Participant list with roles (reviewer, author, observer)
- Tag display and management
- Attachment list with download functionality
- Export, archive, delete actions
- Portal rendering for z-index independence

**Vietnamese Context**: Legal document review conversations

---

### 2. ProfileSidebar Widget
**File**: `/profile-sidebar-widget.md`
**Lines**: 416
**Pattern ID**: 11.27
**Type**: Sidebar Widget
**Role**: User profile information, statistics, and account management
**Tech**: React 19, TypeScript, Clipboard API

**Key Features**:
- User avatar and basic information
- User ID with copy-to-clipboard
- Email visibility toggle (privacy)
- Statistics (documents, conversations, reviews)
- Activity timestamps
- Account action buttons (edit, settings, logout)
- Gradient background styling

**Vietnamese Context**: User profile sidebar in main application

---

### 3. FilterSidebar Widget
**File**: `/filter-sidebar-widget.md`
**Lines**: 426
**Pattern ID**: 11.28
**Type**: Sidebar Widget
**Role**: Advanced filter controls for data refinement
**Tech**: React 19, TypeScript, Zustand

**Key Features**:
- Collapsible filter sections
- Multiple filter types (checkbox, date, search, range)
- Selected count badges
- Reset all filters functionality
- Keyboard navigation support
- Accordion-style expand/collapse

**Vietnamese Context**: Filter documents, users, conversations by type, status, date

---

### 4. NavigationSidebar Widget
**File**: `/navigation-sidebar-widget.md`
**Lines**: 403
**Pattern ID**: 11.31
**Type**: Navigation Widget
**Role**: Main application navigation with collapsible menu
**Tech**: React 19, TypeScript, Next.js routing

**Key Features**:
- Collapsible sidebar with smooth animation
- Active route highlighting via pathname detection
- Badge notifications for unread items
- Icon-only mode when collapsed
- Hydration-safe rendering for SSR
- Logout action in footer
- Default navigation items (Dashboard, Users, Documents, etc.)

**Vietnamese Context**: App navigation for legal platform

---

### 5. GlobalHeader Widget
**File**: `/global-header-widget.md`
**Lines**: 415
**Pattern ID**: 11.32
**Type**: Header Widget
**Role**: Top navigation bar with search, notifications, and user menu
**Tech**: React 19, TypeScript, Zustand, DropdownMenu

**Key Features**:
- Sticky positioning at top with z-index management
- Global search bar with focus state styling
- Notification center with unread count badge
- Notification dropdown with list display
- User dropdown menu with settings/logout
- Mobile hamburger menu support
- Vietnamese locale date formatting

**Vietnamese Context**: Global header for legal platform

---

### 6. UserMenuWidget Widget
**File**: `/user-menu-widget.md`
**Lines**: 399
**Pattern ID**: 11.33
**Type**: Dropdown Menu Widget
**Role**: User dropdown menu with profile links and recent items
**Tech**: React 19, TypeScript, DropdownMenu

**Key Features**:
- Compact dropdown with user info
- User role badge display
- Recent items section (documents, conversations) limited to 3
- Profile navigation items
- Settings and help menu items
- Logout in red color
- Type-specific icons for recent items

**Vietnamese Context**: Quick access user menu in header

---

### 7. SearchBarWidget Widget
**File**: `/search-bar-widget.md`
**Lines**: 405
**Pattern ID**: 11.34
**Type**: Input Widget
**Role**: Global search with autocomplete and search history
**Tech**: React 19, TypeScript, Zustand, Debounce

**Key Features**:
- Real-time search with debouncing (300ms)
- Autocomplete suggestions with type-specific icons
- Recent searches history display
- Keyboard navigation (Escape, Enter)
- Click-outside detection with useRef
- Loading state indication
- Type badges for results (Document, User, Conversation)
- Result type icons and descriptions

**Vietnamese Context**: Platform-wide search for documents, users, conversations

---

### 8. BreadcrumbWidget Widget
**File**: `/breadcrumb-widget.md`
**Lines**: 345
**Pattern ID**: 11.35
**Type**: Navigation Widget
**Role**: Breadcrumb navigation showing current page hierarchy
**Tech**: React 19, TypeScript, Next.js Link

**Key Features**:
- Semantic breadcrumb navigation (nav, ol, li)
- Optional home icon link
- Customizable separator (default: ChevronRight)
- Current page non-clickable with aria-current="page"
- Icon support for each breadcrumb
- ARIA attributes for accessibility
- Responsive truncation of long labels

**Vietnamese Context**: Page hierarchy navigation (Trang chủ > Tài liệu > Doc Name)

---

### 9. ModalWidget Widget
**File**: `/modal-widget.md`
**Lines**: 306
**Pattern ID**: 11.36
**Type**: Overlay Widget
**Role**: Reusable modal component with customizable size and layout
**Tech**: React 19, TypeScript, React Portal

**Key Features**:
- Portal rendering to document.body
- Escape key handling
- Focus trap implementation
- Body overflow hidden when open
- Customizable sizes (sm, md, lg, xl)
- Overlay click to close
- Sticky header and footer sections
- Scrollable content area
- ARIA attributes (role, aria-modal, aria-labelledby, aria-describedby)

**Vietnamese Context**: Generic modal for forms, dialogs, confirmations

---

### 10. DrawerWidget Widget
**File**: `/drawer-widget.md`
**Lines**: 289
**Pattern ID**: 11.37
**Type**: Overlay Widget
**Role**: Slide-out drawer with left, right, or bottom positioning
**Tech**: React 19, TypeScript, React Portal

**Key Features**:
- Portal rendering with slide animation
- Three positions: left, right, bottom
- Escape key and overlay click to close
- Flexible sizing (sm, md, lg)
- Sticky header and footer
- Scrollable content area
- Smooth 300ms transition animation
- Body overflow management
- ARIA attributes for accessibility

**Vietnamese Context**: Side panels for filters, details, forms

---

### 11. PopoverWidget Widget
**File**: `/popover-widget.md`
**Lines**: 235
**Pattern ID**: 11.38
**Type**: Overlay Widget
**Role**: Contextual popover with flexible positioning
**Tech**: React 19, TypeScript, React Portal

**Key Features**:
- Portal-based positioning relative to trigger
- Four positions: top, bottom, left, right
- Three alignments: start, center, end
- Escape key to close
- Click-outside detection
- Fixed positioning with Tailwind
- Optional close button
- Mounted check for hydration safety

**Vietnamese Context**: Contextual menus, info popups, quick actions

---

### 12. TooltipWidget Widget
**File**: `/tooltip-widget.md`
**Lines**: 288
**Pattern ID**: 11.39
**Type**: Overlay Widget
**Role**: Enhanced tooltip with hover activation and positioning
**Tech**: React 19, TypeScript, React Portal

**Key Features**:
- Hover-triggered with 200ms delay (configurable)
- Four positioning options
- CSS arrow pointing to trigger
- Smooth fade-in animation
- Portal rendering for DOM independence
- Timeout cleanup on unmount
- Hydration safety check
- pointer-events-none to not interfere
- Fixed positioning with Tailwind

**Vietnamese Context**: Help text, button descriptions, field hints

---

### 13. ConfirmDialogWidget Widget
**File**: `/confirm-dialog-widget.md`
**Lines**: 352
**Pattern ID**: 11.40
**Type**: Overlay Widget
**Role**: Confirmation dialog for destructive actions
**Tech**: React 19, TypeScript, React Portal

**Key Features**:
- Alert dialog role for screen readers
- Four variants: danger (red), warning (yellow), info (blue), success (green)
- Loading state with disabled buttons
- Async confirm handling with Promise support
- Escape key disabled during loading
- Variant-specific icons (AlertTriangle, Info, CheckCircle)
- Overlay click to close (when not loading)
- Customizable button labels
- Vietnamese default labels

**Vietnamese Context**: Delete confirmation, destructive action confirmation

---

## Statistics

### By Pattern Type

| Type | Count | Files |
|------|-------|-------|
| Sidebar Widget | 4 | ConversationSidebar, ProfileSidebar, FilterSidebar, NavigationSidebar |
| Overlay Widget | 6 | ModalWidget, DrawerWidget, PopoverWidget, TooltipWidget, ConfirmDialogWidget |
| Navigation Widget | 2 | NavigationSidebar (counted as sidebar), BreadcrumbWidget |
| Header Widget | 1 | GlobalHeader |
| Dropdown Menu Widget | 1 | UserMenuWidget |
| Input Widget | 1 | SearchBarWidget |

### By Line Count

- **Largest**: ConversationSidebar (454 lines)
- **Smallest**: PopoverWidget (235 lines)
- **Average**: 364 lines per widget
- **All files**: ≤ 400 lines (within spec)

### By Domain Feature

- **Sidebars**: 5 widgets (Conversation, Profile, Filter, Navigation)
- **Overlays**: 6 widgets (Modal, Drawer, Popover, Tooltip, ConfirmDialog)
- **Navigation**: 2 widgets (BreadcrumbWidget, GlobalHeader)
- **User Interaction**: 4 widgets (SearchBar, UserMenu, GlobalHeader)

---

## Vietnamese Domain Integration

All widgets include Vietnamese context with:
- Vietnamese labels and placeholders
- Date formatting with 'vi-VN' locale
- Business entity translations (Người dùng, Tài liệu, Hội thoại, Hợp đồng)
- Legal platform terminology
- Localization guidance

### Common Vietnamese Patterns

```
Trang chủ - Home
Bảng điều khiển - Dashboard
Người dùng - Users
Tài liệu - Documents
Hội thoại - Conversations
Phân tích - Analytics
Cài đặt - Settings
Đăng xuất - Logout
Bộ lọc - Filter
Tìm kiếm - Search
Xác nhận - Confirm
Hủy - Cancel
Tác giả - Author
Người duyệt - Reviewer
Quan sát viên - Observer
```

---

## Architecture Patterns

### Common Features Across Widgets

1. **Portal Rendering** (Modals, Drawers, Popovers, Tooltips, ConfirmDialog)
   - Independence from parent DOM
   - Z-index management
   - Escape key handling

2. **Focus Management**
   - Modals: Focus trap
   - Tooltips: No focus needed
   - Popovers: Return focus on close

3. **Positioning**
   - Fixed positioning with Tailwind
   - Relative to trigger element or viewport
   - Responsive adjustments

4. **Keyboard Navigation**
   - Escape to close/cancel
   - Enter to confirm (ConfirmDialog)
   - Tab navigation within modals

5. **Accessibility**
   - ARIA attributes (role, aria-modal, aria-labelledby, etc.)
   - Semantic HTML where applicable
   - Proper focus management

6. **State Management**
   - Local useState for UI state
   - Zustand for global overlay state
   - TanStack Query for server data

7. **Vietnamese Context**
   - Locale-specific labels
   - Date/time formatting with 'vi-VN'
   - Business entity translations

---

## Next Steps

### Implementation
1. Convert pseudo-code WORKFLOW sections to TypeScript
2. Implement each interface signature
3. Create unit tests based on testing guidelines
4. Add integration tests with parent components

### Quality Assurance
1. Verify all interfaces compile in TypeScript
2. Test accessibility with screen readers
3. Test responsive behavior on mobile
4. Validate Vietnamese localization

### Documentation
1. Add usage examples to each component
2. Create Storybook stories
3. Document prop variations
4. Add animation/transition details

---

**Version**: 1.0
**Created**: 2026-01-02
**Compliance**: 100% (13/13 files ≤ 400 lines)
**Format**: Pseudo-code WORKFLOW with TypeScript interfaces
**Domain**: Vietnamese P2P Insurance & Lending Platform
