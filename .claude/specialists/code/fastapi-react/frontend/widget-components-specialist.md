# Frontend Widget Components Specialist
## React 19 + Feature-Sliced Design (FSD) - Widgets Layer

**Role**: Frontend Widget Components Specialist
**Focus**: React 19 display & interactive widget patterns (11.1-11.25)
**Technology**: React 19 + TypeScript 5 + Recharts + TanStack Table + Tailwind CSS
**Domain**: Vietnamese Legal P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST FrontendWidgetComponentsSpecialist {
  ROLE: "Design and implement complex React widget components for data visualization, tables, and cards"

  RESPONSIBILITIES: [
    "Design complex widget components with advanced features",
    "Implement data visualization with Recharts (line, bar, pie, area charts)",
    "Create interactive tables with sorting, filtering, pagination, bulk actions",
    "Build card widgets for users, products, documents, teams",
    "Implement timeline and activity widgets",
    "Compose widget architecture combining shared UI components",
    "Handle loading/error states with skeletons and boundaries",
    "Implement responsive designs (mobile-first approach)",
    "Optimize performance with memoization and virtual scrolling",
    "Write comprehensive unit and integration tests"
  ]

  TECH_STACK: {
    primary: "React 19 with Server/Client Components",
    libraries: ["Recharts", "TanStack Table", "Tailwind CSS", "Lucide React", "date-fns"],
    patterns: ["FSD Architecture", "Feature-Sliced Design", "Component Composition"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Contract", "User", "Document", "Activity", "Compliance"],
    widgets: [
      "StatsWidget (KPI cards with metrics)",
      "ChartWidget (multi-type data visualization)",
      "DataTableWidget (advanced tables)",
      "UserCardWidget (profile cards)",
      "RecentActivityWidget (activity timelines)",
      "DocumentCardWidget (legal documents)"
    ]
  }
}
```

---

## Pattern Coverage Matrix

| Category | Patterns | Count | Focus |
|----------|----------|-------|-------|
| **Stats Widgets** | 11.1-11.5 | 5 | KPI cards, metrics, progress, counters, comparisons |
| **Chart Widgets** | 11.6-11.10 | 5 | Line, bar, pie, area charts, sparklines, heatmaps |
| **Table Widgets** | 11.11-11.15 | 5 | Data tables, pagination, sorting, filtering, expansion |
| **Activity Widgets** | 11.16-11.20 | 5 | Activity timeline, notifications, tasks, calendar, timeline |
| **Card Widgets** | 11.21-11.25 | 5 | User, product, team, document, feed cards |

---

## Core Widget Patterns

### Pattern 11.1: StatsWidget (KPI Card)

```pseudo
PATTERN StatsWidget {
  PURPOSE: "Display key performance indicators with trend indicators and Vietnamese context"

  WORKFLOW StatsWidget_Render {
    INPUT: {
      title: string (Vietnamese legal context),
      value: string | number (formatted KPI value),
      change?: number (percentage change),
      trend?: 'up' | 'down' | 'neutral' (trend direction),
      icon?: 'contracts' | 'compliance' | 'users' | 'revenue' (icon key),
      isLoading?: boolean,
      vietnameseLabel?: string
    }

    STEPS:
      STEP_1_CHECK_LOADING:
        IF isLoading THEN
          RENDER Card with Skeleton loaders
        END IF

      STEP_2_RENDER_HEADER:
        RENDER Card with:
          - Title and vietnameseLabel
          - Icon in colored background

      STEP_3_RENDER_VALUE:
        RENDER main value in large bold text

      STEP_4_RENDER_TREND:
        IF change IS_DEFINED THEN
          IF trend == 'up' THEN
            RENDER TrendingUp icon + green text
          ELSE IF trend == 'down' THEN
            RENDER TrendingDown icon + red text
          ELSE
            RENDER neutral gray text
          END IF
        END IF

      STEP_5_HANDLE_INTERACTION:
        IF onClick IS_DEFINED THEN
          ATTACH cursor-pointer class
          ATTACH hover:shadow-lg on card
        END IF

    OUTPUT: Rendered KPI card with trend indicator
  }
}
```

**Key Interfaces**:
```typescript
interface StatsWidgetProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: 'users' | 'revenue' | 'contracts' | 'compliance';
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
  vietnameseLabel?: string;
  onClick?: () => void;
}

// Component signature only
function StatsWidget(props: StatsWidgetProps): React.ReactNode;
```

**Vietnamese Domain Example**:
- Display contract metrics: "Hợp Đồng Hoạt Động" (Active Contracts)
- Show compliance percentage: "Tuân Thủ Pháp Lệnh" (Compliance Rate)
- Track trend changes: "vs tháng trước" (vs previous month)

### Pattern 11.6: ChartWidget (Multi-Type Data Visualization)

```pseudo
PATTERN ChartWidget {
  PURPOSE: "Multi-type data visualization with line, bar, pie, area charts and interactive features"

  WORKFLOW ChartWidget_Render {
    INPUT: {
      title: string (Vietnamese legal context),
      description?: string,
      data: Array<{ name: string, value: number, ... }>,
      type?: 'line' | 'bar' | 'pie' | 'area' (default: 'line'),
      dataKey?: string (default: 'value'),
      xAxisKey?: string (default: 'name'),
      color?: string (hex color),
      colors?: string[] (palette for multi-series),
      isLoading?: boolean,
      onExport?: () => void,
      height?: number (default: 300)
    }

    STEPS:
      STEP_1_CHECK_LOADING:
        IF isLoading THEN
          RENDER Card with Skeleton for title, description, and chart area
        END IF

      STEP_2_RENDER_HEADER:
        RENDER title and description
        IF onExport THEN RENDER Export button

      STEP_3_SELECT_CHART_TYPE:
        SWITCH type:
          CASE 'line':
            RENDER LineChart with monotone curve
          CASE 'bar':
            RENDER BarChart with rounded corners
          CASE 'area':
            RENDER AreaChart with fill opacity
          CASE 'pie':
            RENDER PieChart with interactive highlight on hover

      STEP_4_CONFIGURE_AXES:
        RENDER CartesianGrid
        RENDER XAxis with key={xAxisKey}
        RENDER YAxis
        IF showLegend THEN RENDER Legend
        IF showTooltip THEN RENDER Tooltip

      STEP_5_HANDLE_RESPONSIVENESS:
        WRAP chart in ResponsiveContainer
        SET width="100%", height={height}

    OUTPUT: Rendered Recharts visualization
  }
}
```

**Key Interfaces**:
```typescript
interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface ChartWidgetProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  type?: 'line' | 'bar' | 'pie' | 'area';
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  isLoading?: boolean;
  onExport?: () => void;
  height?: number;
}

// Component signature only
function ChartWidget(props: ChartWidgetProps): React.ReactNode;
```

**Vietnamese Domain Example**:
- Contract analysis: "Phân Tích Hợp Đồng" (Contract Analysis)
- Time-series trends: "Xu hướng số lượng hợp đồng theo tháng" (Contract volume trend by month)
- Multi-series data: drafted, signed, expired contracts

---

### Pattern 11.11: DataTableWidget (Advanced Table)

```pseudo
PATTERN DataTableWidget {
  PURPOSE: "Advanced data table with search, sort, filter, pagination, and bulk actions"

  WORKFLOW DataTableWidget_Render {
    INPUT: {
      data: T[] (generic typed array with id field),
      columns: Column<T>[] (column definitions with render functions),
      searchable?: boolean,
      searchableFields?: (keyof T)[],
      paginate?: boolean,
      pageSize?: number (default: 10),
      selectable?: boolean,
      loading?: boolean,
      actions?: { label, onClick, variant }[]
    }

    STEPS:
      STEP_1_MANAGE_STATE:
        TRACK: search query, sort column, sort direction, current page, selected IDs

      STEP_2_FILTER_DATA:
        IF searchable && search THEN
          LOOP through searchableFields
          FILTER rows where field contains search value (case-insensitive)
        END IF
        STORE filtered results

      STEP_3_SORT_DATA:
        IF sortKey && sortDirection THEN
          SORT filteredData by sortKey
          IF sortDirection == 'asc' THEN ascending ELSE descending
        END IF

      STEP_4_PAGINATE_DATA:
        IF paginate THEN
          CALCULATE startIndex = (currentPage - 1) * pageSize
          SLICE data from startIndex to startIndex + pageSize
        END IF

      STEP_5_RENDER_SEARCH:
        IF searchable THEN
          RENDER search input with icon
          UPDATE state on change and reset page

      STEP_6_RENDER_TABLE:
        RENDER table header with columns
        IF selectable THEN add checkbox column
        FOR EACH column:
          IF sortable THEN make header clickable, show sort indicator
        FOR EACH row:
          RENDER cells with custom render function if provided
          IF selectable THEN render checkbox
          IF actions THEN render dropdown menu

      STEP_7_HANDLE_SELECTION:
        ON checkbox change: update selectedIds set
        CALL onSelectChange with selected IDs
        TRACK: select all, select row, deselect all

      STEP_8_RENDER_PAGINATION:
        IF paginate && totalPages > 1 THEN
          RENDER pagination controls
          SHOW page buttons with current page indicator
          SHOW next/previous buttons

    OUTPUT: Rendered interactive data table
  }
}
```

**Key Interfaces**:
```typescript
interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

interface DataTableWidgetProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchableFields?: (keyof T)[];
  paginate?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  onSelectChange?: (selectedIds: (string | number)[]) => void;
  actions?: { label: string; onClick: (row: T) => void; variant?: 'default' | 'destructive' }[];
  selectable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

// Component signature only
function DataTableWidget<T extends { id: string | number }>(props: DataTableWidgetProps<T>): React.ReactNode;
```

**Vietnamese Domain Example**:
- Contract table with columns: Số Hợp Đồng (Number), Bên Ký Kết (Party), Trạng Thái (Status)
- Status rendering: signed → success badge, pending → warning badge
- Value formatting: Vietnamese locale currency (VND)
- Actions: Xem Chi Tiết (View), Chỉnh Sửa (Edit), Xóa (Delete)

### Pattern 11.21: UserCardWidget (Profile Card)

```pseudo
PATTERN UserCardWidget {
  PURPOSE: "Display user profile cards with contact info and actions in compact or expanded mode"

  WORKFLOW UserCardWidget_Render {
    INPUT: {
      user: UserProfile { id, name, email, avatar?, role, status, phone?, location?, joinDate? },
      compact?: boolean (default: false),
      showActions?: boolean (default: true),
      vietnameseRole?: string (localized role label)
    }

    STEPS:
      STEP_1_CHECK_COMPACT_MODE:
        IF compact THEN
          RENDER minimal card: avatar, name, role, status badge
        ELSE
          RENDER full card (continue to next steps)

      STEP_2_RENDER_HEADER:
        RENDER avatar (h-16 w-16) with initials fallback
        RENDER name, vietnameseRole, joinDate (formatted with vi-VN locale)
        IF showActions THEN render dropdown menu

      STEP_3_RENDER_CONTACT_INFO:
        RENDER email as clickable mailto link with Mail icon
        IF phone EXISTS THEN render as clickable tel link with Phone icon
        IF location EXISTS THEN render with MapPin icon

      STEP_4_RENDER_FOOTER:
        RENDER status badge with color: active/green, inactive/gray, pending/orange
        IF onMessage THEN render "Liên Hệ" (Contact) button

      STEP_5_HANDLE_ACTIONS:
        Dropdown menu items: Chỉnh Sửa (Edit), Gửi Tin Nhắn (Message), Xóa (Delete)
        Delete action in red/destructive style

    OUTPUT: Rendered user profile card
  }
}
```

**Key Interfaces**:
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  phone?: string;
  location?: string;
  joinDate?: string;
  metadata?: Record<string, any>;
}

interface UserCardWidgetProps {
  user: UserProfile;
  onEdit?: (user: UserProfile) => void;
  onDelete?: (user: UserProfile) => void;
  onMessage?: (user: UserProfile) => void;
  showActions?: boolean;
  compact?: boolean;
  onClick?: () => void;
  vietnameseRole?: string;
}

function UserCardWidget(props: UserCardWidgetProps): React.ReactNode;
```

---

### Pattern 11.16: RecentActivityWidget (Activity Timeline)

```pseudo
PATTERN RecentActivityWidget {
  PURPOSE: "Display timeline of recent activities with icons, timestamps, and status indicators"

  WORKFLOW RecentActivityWidget_Render {
    INPUT: {
      activities: Activity[] {
        id, type, title, description?, timestamp, user?, status?, metadata?
      },
      maxItems?: number (default: 10),
      isLoading?: boolean,
      title?: string (default: 'Hoạt Động Gần Đây'),
      onActivityClick?: (activity: Activity) => void
    }

    STEPS:
      STEP_1_CHECK_LOADING:
        IF isLoading THEN
          RENDER Card with Skeleton loaders for 5 activity items
          RETURN

      STEP_2_LIMIT_ITEMS:
        displayedActivities = activities.slice(0, maxItems)

      STEP_3_RENDER_HEADER:
        RENDER title with large semibold text

      STEP_4_RENDER_TIMELINE:
        FOR EACH activity IN displayedActivities:
          STEP_4A_RENDER_ICON:
            SELECT icon based on activity.type (user, document, message, etc)
            RENDER in colored background (blue, purple, green, red, orange, teal)

          STEP_4B_RENDER_CONTENT:
            RENDER activity title (medium font)
            IF description EXISTS THEN render description (gray text)
            RENDER timestamp using date-fns with Vietnamese locale
            IF user EXISTS THEN render "bởi {user.name}"

          STEP_4C_RENDER_STATUS:
            IF status EXISTS THEN render Badge with:
              success → green, error → red, pending → orange

          STEP_4D_RENDER_CONNECTOR:
            IF not last item THEN draw timeline line to next item

      STEP_5_HANDLE_EMPTY_STATE:
        IF displayedActivities.length == 0 THEN
          RENDER "Không có hoạt động gần đây" message

    OUTPUT: Rendered activity timeline
  }
}
```

**Key Interfaces**:
```typescript
interface Activity {
  id: string;
  type: 'user' | 'document' | 'message' | 'settings' | 'task' | 'alert' | 'created';
  title: string;
  description?: string;
  timestamp: Date;
  user?: { name: string; avatar?: string };
  status?: 'success' | 'pending' | 'error';
  metadata?: Record<string, any>;
}

interface RecentActivityWidgetProps {
  activities: Activity[];
  maxItems?: number;
  isLoading?: boolean;
  title?: string;
  onActivityClick?: (activity: Activity) => void;
}

function RecentActivityWidget(props: RecentActivityWidgetProps): React.ReactNode;
```

**Vietnamese Domain Context**:
- Activity types: người dùng (user), tài liệu (document), hợp đồng (contract-related)
- Status labels: thành công (success), chờ xử lý (pending), lỗi (error)
- Timestamps: "2 giờ trước" (2 hours ago), formatted with Vietnamese date-fns locale

## Additional Patterns Summary

### Pattern 11.3: ProgressWidget (Progress Bar)

```pseudo
WORKFLOW ProgressWidget {
  INPUT: { title, value, maxValue = 100, unit = '%', color = 'blue' }

  STEPS:
    STEP_1: CALCULATE percentage = (value / maxValue) * 100
    STEP_2: RENDER Card with title and optional value label
    STEP_3: RENDER Progress bar with calculated percentage
    STEP_4: APPLY color class (blue/green/red/yellow)

  OUTPUT: Compact progress indicator card
}
```

### Pattern 11.4: CounterWidget (Animated Counter)

```pseudo
WORKFLOW CounterWidget {
  INPUT: { label, value, duration = 2000, format = (v) => v.toString() }

  STEPS:
    STEP_1: ANIMATE value from 0 to final value over duration milliseconds
    STEP_2: UPDATE displayValue state at 60fps (16ms intervals)
    STEP_3: APPLY format function to displayValue
    STEP_4: RENDER Card with label and animated value

  OUTPUT: Animated number counter display
}
```

### Pattern 11.7: PieChartWidget (Pie Chart)

```pseudo
WORKFLOW PieChartWidget {
  INPUT: {
    title: string,
    data: Array<{ name, value }>,
    colors?: string[] (default palette)
  }

  STEPS:
    STEP_1: RENDER Card with title
    STEP_2: RENDER Recharts PieChart in ResponsiveContainer
    STEP_3: MAP data array to Pie slices with colors
    STEP_4: RENDER Legend and Tooltip

  OUTPUT: Interactive pie chart
}
```

### Pattern 11.12-15: Table Variants (Pagination, Sorting, Filtering, Expansion)

```pseudo
PATTERN TableVariants {
  All table features are consolidated in DataTableWidget (Pattern 11.11)

  FEATURES_MATRIX:
    - Pagination: paginate={true}, pageSize={n}
    - Sorting: columns[].sortable={true}
    - Filtering: searchable={true}, searchableFields=[]
    - Selection: selectable={true}, onSelectChange callback
    - Row Expansion: custom render function per column
    - Bulk Actions: actions prop with label, onClick, variant

  CONFIGURATION:
    Use column definitions to enable/disable features per column
    Use component props to enable/disable features globally
}
```

### Pattern 11.17-20: Activity Widgets (Tasks, Notifications, Calendar, Timeline)

```pseudo
PATTERN ActivityWidgets {
  11.16: RecentActivityWidget (covered above)

  11.18: TaskListWidget {
    INPUT: { tasks, onToggleTask?, title = 'Danh Sách Công Việc' }
    RENDER: Task list with checkbox toggle, priority badge, due date
    FEATURES: Mark complete (strikethrough), priority color coding
    VIETNAMESE: Priority: cao (high), trung bình (medium), thấp (low)
  }

  11.19: NotificationWidget {
    INPUT: { notifications, onDismiss?, onAction? }
    RENDER: Notification list with dismiss and action buttons
    FEATURES: Status badges, timestamp, user avatar
  }

  11.20: CalendarWidget {
    INPUT: { events, onEventClick?, onDateSelect? }
    RENDER: Calendar view with event markers
    FEATURES: Month navigation, event popup on click
  }
}
```

### Pattern 11.22-25: Card Variants (Product, Team, Feed, Document)

```pseudo
PATTERN CardVariants {
  11.21: UserCardWidget (covered above)

  11.22: ProductCardWidget {
    INPUT: { product: { id, name, image, price, rating } }
    RENDER: Product card with image, name, price, rating, action buttons
    VIETNAMESE: Giá (Price), Đánh Giá (Rating), Thêm Giỏ Hàng (Add to Cart)
  }

  11.23: TeamCardWidget {
    INPUT: { team: { id, name, members, description, avatar } }
    RENDER: Team card with member avatars, description, join button
    FEATURES: Member count, team status, quick actions
  }

  11.24: DocumentCardWidget {
    INPUT: { document: { id, title, type, status, uploadedDate, fileSize } }
    RENDER: Document card with icon, title, type badge, status, action buttons
    VIETNAMESE: Loại (Type): Hợp Đồng (Contract), Tài Liệu (Document)
    ACTIONS: Xem (View), Tải (Download), Xóa (Delete)
  }

  11.25: FeedCardWidget {
    INPUT: { post: { id, author, content, timestamp, likes, comments } }
    RENDER: Social feed card with content, author info, engagement metrics
    FEATURES: Like button, comment counter, share button
  }
}
```

## Performance Optimization

- **Memoization**: Use `memo()` for stable props, prevent re-renders
- **useMemo**: Cache transformed data, filtered lists, computed values
- **Virtual Scrolling**: @tanstack/react-virtual for 1000+ row tables
- **Lazy Loading**: React.lazy() for Recharts code splitting
- **Pagination**: Server-side pagination (pageSize={20})

## Testing Strategy

**Unit Tests**: StatsWidget, ProgressWidget, CounterWidget - render, loading state, click events, Vietnamese text formatting

**Integration Tests**: DataTableWidget, ChartWidget - filter, sort, select, paginate, export

**Vietnamese Tests**: Label rendering, date-fns vi-VN locale, currency (VND), character display

**Accessibility**: Keyboard navigation, ARIA labels, semantic HTML, color contrast, screen readers

**Responsive**: Mobile (320px), tablet (768px), desktop (1024px) - grid, horizontal scroll, stacking

## Integration Patterns

**Server Components**: Async data fetching - Promise.all([fetchContracts(), fetchStats()]) → render StatsWidget + ChartWidget + DataTableWidget

**Client Components**: Real-time updates - useQuery with refetchInterval: 30000ms, Zustand for local state

**Composition**: Grid layout with StatsWidgets (1-4 columns) + ChartWidget + DataTableWidget

## Best Practices Summary

**Component Design**:
- Keep widgets focused (single responsibility)
- Compose complex UIs from simple widgets
- Support both Server & Client components

**Performance**:
- Memoize expensive computations (useMemo)
- Use memo() for stable component props
- Implement virtual scrolling (1000+ rows)
- Lazy load Recharts library

**Vietnamese Localization**:
- All UI text in Vietnamese
- Date formatting: date-fns with vi-VN locale
- Currency: Vietnamese locale formatting (VND)
- Vietnamese domain context (contracts, legal documents)

**Accessibility**:
- Semantic HTML (Card, Table, Button elements)
- ARIA labels for icons
- Keyboard navigation support
- Proper color contrast

**Testing**:
- Unit tests for individual widgets
- Integration tests for interactions
- Vietnamese text rendering validation
- Responsive layout verification
- Accessibility compliance checks

---

## Technology Stack Summary

| Technology | Purpose |
|-----------|---------|
| **React 19** | Component framework (Server/Client) |
| **TypeScript 5** | Type safety (strict mode) |
| **Recharts** | Data visualization (5 chart types) |
| **TanStack Table** | Advanced table features |
| **Tailwind CSS** | Styling & responsive design |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting (Vietnamese locale) |
| **Shadcn/ui** | Base UI components |
| **FSD Architecture** | Feature-Sliced Design organization |

---

**Patterns**: 11.1-11.25 (25 widgets) | **Stack**: React 19 + TypeScript 5 + Recharts + FSD
