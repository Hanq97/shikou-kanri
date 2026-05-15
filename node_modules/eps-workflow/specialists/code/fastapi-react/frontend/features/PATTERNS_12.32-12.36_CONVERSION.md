# Pattern Conversion: 12.32-12.36 (Pseudo-Code Format)

**Source**: `specialists/code/fastapi-react/frontend/feature-composition-specialist.md`
**Template**: `.claude/memory-bank/eps-enhancement/week-14/days/phase-4/specialist-refactoring/PSEUDOCODE_TEMPLATE.md`
**Output Directory**: `specialists/code/fastapi-react/frontend/features/`
**Conversion Date**: 2026-01-02
**Status**: COMPLETE ✅

---

## Created Files

### 1. Pattern 12.32: PaginationFeature
**File**: `specialists/code/fastapi-react/frontend/features/pagination-feature.md`
**Lines**: 382
**Size**: 9.9K

**Content**:
- Specialist Identity (pagination handler)
- Pattern Overview (purpose, problem, solution, use cases)
- Workflow (4 steps): Validate Inputs → Calculate Metadata → Render Pagination → Persist State
- Key Interfaces: PaginationProps, PaginationMetadata
- Integration Points: UI components, state management, localStorage
- Usage Example: Table pagination workflow
- Performance Considerations: <50ms render time

**Key Features**:
- Page size selection (10, 25, 50, 100)
- Navigation controls (previous, next)
- Row range display ("Showing X to Y of Z")
- Button state management (disable at boundaries)
- localStorage persistence

**Technology Stack**:
- React 19 with TypeScript
- Zustand for state (optional)
- TanStack Query for data fetching
- lucide-react icons
- @shared/ui components

---

### 2. Pattern 12.33: ColumnCustomizationFeature
**File**: `specialists/code/fastapi-react/frontend/features/column-customization-feature.md`
**Lines**: 439
**Size**: 12K

**Content**:
- Specialist Identity (DnD column customization)
- Pattern Overview (visibility, reordering, width customization)
- Workflow (5 steps): Initialize → Render Dropdown → Handle Drag → Toggle Visibility → Validate
- Key Interfaces: ColumnDef, ColumnCustomizationProps, DragEvent, ColumnConfig
- Integration Points: @dnd-kit, localStorage, Zustand
- Usage Example: Column reordering and visibility toggle
- Accessibility Features: Keyboard navigation, screen reader support

**Key Features**:
- Drag-and-drop column reordering
- Show/hide column visibility
- Column width customization
- Validation (minimum 1 column visible)
- Cross-tab sync via localStorage

**Technology Stack**:
- React 19 with TypeScript
- @dnd-kit/core for drag-and-drop
- @dnd-kit/sortable for reordering
- Zustand for preferences
- lucide-react icons

---

### 3. Pattern 12.34: SavedFiltersFeature
**File**: `specialists/code/fastapi-react/frontend/features/saved-filters-feature.md`
**Lines**: 503
**Size**: 14K

**Content**:
- Specialist Identity (filter preset management)
- Pattern Overview (save, restore, share, organize filters)
- Workflow (6 steps): Load Filters → Render List → Select Filter → Delete Filter → Set Default → Apply on Load
- Key Interfaces: FilterRule, SavedFilter, FilterGroup
- Integration Points: TanStack Query, API endpoints, localStorage
- Usage Example: Filter application workflow
- Related Patterns: DataTableFeature, AdvancedFilterFeature

**Key Features**:
- Save current filter configuration
- Display list of saved filters
- Quick apply filters
- Mark filter as default
- Delete filters
- Share filters with team
- Server persistence via API
- localStorage for offline access

**API Endpoints**:
- GET /api/v1/user/filters
- POST /api/v1/user/filters
- PUT /api/v1/user/filters/{id}
- DELETE /api/v1/user/filters/{id}
- PATCH /api/v1/user/filters/{id}/default
- POST /api/v1/user/filters/{id}/share

**Technology Stack**:
- React 19 with TypeScript
- TanStack Query v5 for server state
- Zustand for client state
- lucide-react icons
- Zod for validation

---

### 4. Pattern 12.35: DataValidationFeature
**File**: `specialists/code/fastapi-react/frontend/features/data-validation-feature.md`
**Lines**: 574
**Size**: 16K

**Content**:
- Specialist Identity (real-time validation handler)
- Pattern Overview (schema + custom rule validation)
- Workflow (6 steps): Initialize → On Change → Schema Validation → Rule Validation → Render → Notify
- Key Interfaces: ValidationRule, ValidatedInputProps, ValidationState
- Validation Rules: Email, Phone, ID, Currency, Required, Min/Max Length
- Integration Points: Zod schemas, form context, error handling
- Usage Example: Multi-field form validation
- Accessibility Features: aria-invalid, aria-describedby, error messages

**Key Features**:
- Zod schema validation
- Custom validation rules
- Real-time validation on input
- Debounced validation (configurable)
- Visual feedback (red error, green success)
- Error icons and messages
- Vietnamese validation rules

**Vietnamese Validation Rules**:
- Email: Standard RFC format
- Phone: Vietnamese format (0912345678 or +84912345678)
- ID: 9 or 12 digits (CMND/CCCD)
- Currency: Positive numbers with decimals
- Required: Non-empty field
- Min/Max Length: Character count limits

**Technology Stack**:
- React 19 with TypeScript
- Zod for schema validation
- lucide-react for icons
- @shared/ui components
- Custom ValidationRule pattern

---

### 5. Pattern 12.36: ThemeToggleFeature
**File**: `specialists/code/fastapi-react/frontend/features/theme-toggle-feature.md`
**Lines**: 639
**Size**: 18K

**Content**:
- Specialist Identity (theme management handler)
- Pattern Overview (light/dark/system modes with preference detection)
- Workflow (7 steps): Create Store → Detect System → Apply Theme → Handle Change → Render → Hydrate → Sync Tabs
- Key Interfaces: Theme, ThemeStore, CSS configuration
- Integration Points: Zustand, localStorage, MediaQuery API
- Usage Example: Header theme toggle
- Performance Optimizations: Lazy init, GPU acceleration, debouncing
- Browser Support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

**Key Features**:
- Three theme modes: Light, Dark, System (auto)
- System preference detection via matchMedia
- Zustand store with localStorage persistence
- CSS class toggle ('dark' class on root)
- Smooth transitions (250ms)
- Cross-tab synchronization
- SSR-safe hydration (mounted check)
- Responsive to system preference changes

**CSS Integration**:
- Tailwind CSS with darkMode: 'class'
- Custom color schemes (light/dark)
- Icon animations (Sun/Moon rotation)
- Smooth transitions (250ms duration)

**Technology Stack**:
- React 19 with TypeScript
- Zustand with persist middleware
- Tailwind CSS (dark mode)
- lucide-react icons
- @shared/ui components
- MediaQuery API

---

## Quality Metrics

### File Size Compliance
| Pattern | File | Lines | % of Max | Status |
|---------|------|-------|----------|--------|
| 12.32 | pagination-feature.md | 382 | 48% | ✅ |
| 12.33 | column-customization-feature.md | 439 | 55% | ✅ |
| 12.34 | saved-filters-feature.md | 503 | 63% | ✅ |
| 12.35 | data-validation-feature.md | 574 | 72% | ✅ |
| 12.36 | theme-toggle-feature.md | 639 | 80% | ✅ |
| **TOTAL** | - | **2,537** | - | ✅ |

### Structure Completeness (100%)
- [x] Specialist Identity block
- [x] Pattern Overview (Purpose/Problem/Solution/UseCases)
- [x] Workflow pseudo-code (INPUT/STEPS/OUTPUT)
- [x] Key Interfaces (TypeScript signatures only)
- [x] Integration Points (UI, State, API, Dependencies)
- [x] Usage Examples (Pseudo-code scenarios)
- [x] Related Patterns (cross-references)
- [x] References (external documentation)

### Pseudo-Code Format Compliance
- [x] WORKFLOW/INPUT/STEPS/OUTPUT structure
- [x] IF/ELSE/FOR/WHILE control flow
- [x] No full implementation code
- [x] TypeScript interfaces only
- [x] Vietnamese domain context

### Technology Stack Consistency
- [x] React 19 with TypeScript 5
- [x] Zustand for client state
- [x] TanStack Query v5 for server state
- [x] lucide-react for icons
- [x] Zod for validation
- [x] @dnd-kit for drag-and-drop
- [x] Tailwind CSS for styling

---

## Vietnamese Domain Integration

**Language Distributions**:
- Pagination: "Hiển thị", "Trang", "trong", "của"
- Column Customization: "Tùy chỉnh cột", "Column Settings"
- Saved Filters: "Bộ lọc đã lưu", "Mặc định", "Filter Management"
- Data Validation: "Không hợp lệ", "Trường này là bắt buộc"
- Theme Toggle: "Chủ đề", "Sáng", "Tối", "Hệ thống"

**P2P Insurance & Lending Context**:
- User types: Admin, Lawyer, Paralegal, Client
- Entity types: Insurance contracts, Loan contracts, Legal cases
- Validation rules: Vietnamese phone, ID, contract amounts
- Business rules: Multi-approval workflows, document retention (10 years)

---

## Integration Ready

These files are ready for:
1. **Orchestrator Integration**: Load via pattern loader
2. **Code Generation**: Convert pseudo-code to actual implementation
3. **Documentation**: Include in API docs and architecture guides
4. **Testing**: Unit test each pattern independently
5. **Training**: Use as architecture reference for team

---

## Conversion Process

1. **ANALYZE**: Extracted TypeScript implementations from feature-composition-specialist.md
2. **CONVERT**: Generated pseudo-code from logic flows and state management
3. **EXTRACT**: Isolated interface signatures and workflow steps
4. **WRITE**: Created 5 files following PSEUDOCODE_TEMPLATE structure
5. **VALIDATE**: Verified line counts, structure, and content quality

---

## Next Steps (Optional)

1. Run orchestrator validation: `node orchestrate-fdd.js --patterns 12.32-12.36`
2. Update feature catalog in README.md
3. Generate code implementations from pseudo-code
4. Add unit tests for each pattern
5. Archive original source patterns

---

**Conversion Complete**: 2026-01-02
**All Files Ready for Production Use**
