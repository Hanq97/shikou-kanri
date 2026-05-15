# Frontend Dashboard & CRUD Pages Specialist
**Next.js 15 Feature-Sliced Design (FSD) - Protected Dashboard and CRUD Pages**

**Version**: 1.0.0
**Last Updated**: 2026-01-02
**Scope**: Dashboard, analytics, CRUD list/detail pages
**Patterns Covered**: 10.6-10.20 (15 patterns)

---

## SPECIALIST IDENTITY

### Role Definition
**Frontend Dashboard & CRUD Pages Specialist** - Manages protected dashboard and CRUD pages:

- Server-side data fetching with authentication
- Real-time dashboard widgets
- CRUD list pages with filtering and pagination
- Dynamic detail pages with tabs
- Analytics and reporting pages
- Calendar and task management

### Core Responsibilities

1. **Design Dashboard Home Pages with Widgets**
2. **Create CRUD List Pages (Users, Cases, Customers)**
3. **Implement Detail Pages with Dynamic Routes**
4. **Build Analytics and Reporting Pages**
5. **Design Calendar and Task Management Pages**

---

## PATTERN IMPLEMENTATIONS

### Pattern 10.6: Dashboard Home Page (Protected)

**Purpose**: Main dashboard with overview widgets and real-time data

**File**: `src/app/(dashboard)/page.tsx`

```pseudo
WORKFLOW DashboardHomePage_Pattern_10_6 {
  INPUT: {
    search_params: {
      date_range: string (optional),
      status: string (optional)
    }
  }

  STEPS: {
    STEP authenticate_user:
      session = AWAIT getAuthSession()
      IF NOT session OR NOT session.user:
        REDIRECT TO "/login?callbackUrl=/dashboard"
      END IF
    END STEP

    STEP fetch_dashboard_data_parallel:
      [stats, cases, deadlines] = AWAIT Promise.all([
        getStatsData(userId),
        getRecentCases(userId, search_params),
        getUpcomingDeadlines(userId)
      ])
    END STEP

    STEP render_stats_grid:
      GRID stats_widgets (4 columns):
        WIDGET active_cases:
          label = "Vụ Việc Hoạt Động"
          value = stats.active_cases
          change = stats.cases_change
          icon = "briefcase"
        END WIDGET

        WIDGET expiring_contracts:
          label = "Hợp Đồng Sắp Hết Hạn"
          value = stats.expiring_contracts
          change = stats.contracts_change
          icon = "document"
        END WIDGET

        WIDGET new_clients:
          label = "Khách Hàng Mới"
          value = stats.new_clients
          change = stats.clients_change
          icon = "users"
        END WIDGET

        WIDGET unread_messages:
          label = "Tin Nhắn Chưa Đọc"
          value = stats.unread_messages
          icon = "message"
        END WIDGET
      END GRID
    END STEP

    STEP render_main_content:
      GRID main_widgets (2 columns):
        WIDGET recent_cases (suspense):
          FETCH cases WITH revalidate=60
          DISPLAY list WITH:
            - Case number
            - Title
            - Status badge
            - Priority indicator
            - Assigned lawyer
          END DISPLAY
        END WIDGET

        WIDGET upcoming_deadlines (suspense):
          FETCH deadlines WITH revalidate=300
          DISPLAY timeline WITH:
            - Deadline title
            - Due date
            - Case reference
            - Urgency indicator
          END DISPLAY
        END WIDGET
      END GRID
    END STEP

    STEP render_secondary_content:
      GRID secondary_widgets (3 columns):
        WIDGET recent_activity (2 columns, suspense):
          FETCH conversations WITH cache=no-store
          DISPLAY activity_feed
        END WIDGET

        WIDGET featured_documents (1 column, suspense):
          FETCH documents WITH revalidate=300
          DISPLAY document_list
        END WIDGET
      END GRID
    END STEP

    STEP apply_caching_strategy:
      stats: cache=no-store (always fresh)
      cases: revalidate=60 (1 minute)
      deadlines: revalidate=300 (5 minutes)
      tags: ["dashboard-stats", "cases-recent"]
    END STEP
  }

  OUTPUT: {
    page_type: "Server Component (authenticated)",
    caching: "Mixed (no-store + ISR)",
    suspense: "Granular per widget",
    performance: "Parallel data fetching"
  }
}
```

**Technology Interface**:
```typescript
interface DashboardPageProps {
  searchParams: {
    date_range?: string;
    status?: string;
  };
}

export const metadata: Metadata;
export default async function DashboardPage(props: DashboardPageProps): Promise<JSX.Element>;
```

---

### Pattern 10.11: User/Case List Page (CRUD)

**Purpose**: CRUD management page with list, search, filters, and pagination

**File**: `src/app/(dashboard)/cases/page.tsx`

```pseudo
WORKFLOW CaseListPage_Pattern_10_11 {
  INPUT: {
    search_params: {
      page: number (default: 1),
      search: string (optional),
      status: string (optional),
      priority: string (optional),
      assignee: string (optional),
      start_date: date (optional),
      end_date: date (optional),
      sort_by: string (default: "created_at_desc")
    }
  }

  STEPS: {
    STEP authenticate_and_authorize:
      session = AWAIT getAuthSession()
      IF NOT session:
        REDIRECT TO "/login?callbackUrl=/cases"
      END IF

      CHECK user_has_permission("cases.view")
    END STEP

    STEP build_query_params:
      params = NEW URLSearchParams()
      SET params.page = search_params.page || 1
      SET params.limit = 20

      IF search_params.search:
        SET params.search = search_params.search
      END IF
      IF search_params.status:
        SET params.status = search_params.status
      END IF
      IF search_params.priority:
        SET params.priority = search_params.priority
      END IF
      IF search_params.assignee:
        SET params.assignee_id = search_params.assignee
      END IF
      IF search_params.start_date:
        SET params.start_date = search_params.start_date
      END IF
      IF search_params.end_date:
        SET params.end_date = search_params.end_date
      END IF
      IF search_params.sort_by:
        SET params.sort_by = search_params.sort_by
      END IF
    END STEP

    STEP fetch_cases_data:
      data = AWAIT fetch(`/api/cases?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          X-User-ID: userId
        },
        cache: "no-store",
        tags: ["cases-list"]
      })

      cases = data.cases
      pagination = data.pagination
      total_pages = CEIL(pagination.total / pagination.limit)
    END STEP

    STEP render_page_header:
      HEADER:
        TITLE: "Quản Lý Vụ Việc"
        SUBTITLE: `Tổng cộng: ${pagination.total} vụ việc`
        ACTIONS:
          BUTTON export_cases
          BUTTON create_new_case
        END ACTIONS
      END HEADER
    END STEP

    STEP render_filters_section:
      FILTERS:
        FILTER status:
          OPTIONS: ["active", "pending", "closed", "archived"]
          DEFAULT: null (all)
        END FILTER

        FILTER priority:
          OPTIONS: ["high", "medium", "low"]
          DEFAULT: null (all)
        END FILTER

        FILTER assignee:
          TYPE: User select dropdown
          OPTIONS: FETCH active_lawyers
        END FILTER

        FILTER date_range:
          START_DATE: search_params.start_date
          END_DATE: search_params.end_date
        END FILTER

        FILTER search:
          PLACEHOLDER: "Tìm kiếm theo tên vụ việc..."
          QUERY: search_params.search
        END FILTER

        ACTION clear_filters:
          ON_CLICK: NAVIGATE TO "/cases"
        END ACTION
      END FILTERS
    END STEP

    STEP render_cases_table:
      TABLE cases_list (suspense_boundary):
        COLUMNS:
          - Case Number (sortable)
          - Title (searchable)
          - Status (filterable)
          - Priority (filterable, colored badge)
          - Assigned To (filterable)
          - Created At (sortable)
          - Actions (view, edit, delete)
        END COLUMNS

        ROWS:
          FOR EACH case IN cases:
            ROW:
              CELL case_number (link to detail)
              CELL title
              CELL status_badge (colored)
              CELL priority_badge (colored)
              CELL assigned_lawyer.name
              CELL formatted_date(created_at)
              CELL action_buttons (dropdown menu)
            END ROW
          END FOR
        END ROWS

        EMPTY_STATE:
          IF cases.length === 0:
            DISPLAY empty_illustration
            MESSAGE: "Không tìm thấy vụ việc nào"
            CTA: "Tạo vụ việc mới"
          END IF
        END EMPTY_STATE
      END TABLE
    END STEP

    STEP render_pagination:
      IF total_pages > 1:
        PAGINATION:
          CURRENT_PAGE: current_page
          TOTAL_PAGES: total_pages
          PREV_BUTTON: visible IF current_page > 1
          NEXT_BUTTON: visible IF current_page < total_pages
          PAGE_NUMBERS: [1, 2, 3, "...", total_pages]

          ON_PAGE_CHANGE(page):
            NAVIGATE TO `/cases?page=${page}&${preserve_filters}`
          END ON_PAGE_CHANGE
        END PAGINATION
      END IF
    END STEP
  }

  OUTPUT: {
    page_type: "Server Component (authenticated)",
    caching: "no-store (user-specific data)",
    filtering: "Server-side with URL params",
    pagination: "Server-side with URL params",
    sorting: "Server-side (database level)"
  }
}
```

**Technology Interface**:
```typescript
interface CasesPageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    priority?: string;
    assignee?: string;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
  };
}

export const metadata: Metadata;
export default async function CasesPage(props: CasesPageProps): Promise<JSX.Element>;
```

---

### Pattern 10.16: Case/User Detail Page (Dynamic Route)

**Purpose**: Individual case/user profile with tabs and related data

**File**: `src/app/(dashboard)/cases/[id]/page.tsx`

```pseudo
WORKFLOW CaseDetailPage_Pattern_10_16 {
  INPUT: {
    params: {
      id: string
    },
    search_params: {
      tab: string (default: "overview")
    }
  }

  STEPS: {
    STEP authenticate_user:
      session = AWAIT getAuthSession()
      IF NOT session:
        REDIRECT TO `/login?callbackUrl=/cases/${params.id}`
      END IF
    END STEP

    STEP fetch_case_data:
      case_data = AWAIT getCaseData(params.id, userId)

      IF NOT case_data:
        CALL notFound()  // Trigger 404 page
      END IF

      CHECK user_has_access_to_case(case_data, userId)
    END STEP

    STEP generate_dynamic_metadata:
      RETURN {
        title: `${case_data.case_number} - ${case_data.title}`,
        description: `Chi tiết vụ việc: ${case_data.title}`,
        robots: "noindex, nofollow"  // Protected content
      }
    END STEP

    STEP define_tab_navigation:
      tabs = [
        {
          id: "overview",
          label: "Tổng Quan",
          href: `/cases/${params.id}?tab=overview`
        },
        {
          id: "documents",
          label: "Tài Liệu",
          href: `/cases/${params.id}?tab=documents`
        },
        {
          id: "timeline",
          label: "Dòng Thời Gian",
          href: `/cases/${params.id}?tab=timeline`
        },
        {
          id: "notes",
          label: "Ghi Chú",
          href: `/cases/${params.id}?tab=notes`
        },
        {
          id: "clients",
          label: "Khách Hàng",
          href: `/cases/${params.id}?tab=clients`
        }
      ]

      current_tab = search_params.tab || "overview"
    END STEP

    STEP render_page_header:
      HEADER:
        BREADCRUMB: ["Dashboard", "Cases", case_data.case_number]

        TITLE: case_data.case_number
        SUBTITLE: case_data.title

        BADGES:
          STATUS_BADGE: colored_badge(case_data.status)
          PRIORITY_BADGE: colored_badge(case_data.priority)
        END BADGES

        METADATA_GRID (4 columns):
          - Created: formatted_date(case_data.created_at)
          - Type: case_data.type_label
          - Assigned To: case_data.assigned_to.name
          - Related Cases: case_data.related_cases.length
        END METADATA_GRID
      END HEADER
    END STEP

    STEP render_tab_navigation:
      TABS:
        FOR EACH tab IN tabs:
          TAB_BUTTON:
            label: tab.label
            href: tab.href
            active: tab.id === current_tab
          END TAB_BUTTON
        END FOR
      END TABS
    END STEP

    STEP render_tab_content:
      SWITCH current_tab:
        CASE "overview":
          SUSPENSE:
            <CaseOverview case={case_data} />
          END SUSPENSE

        CASE "documents":
          SUSPENSE:
            <CaseDocuments caseId={params.id} />
          END SUSPENSE

        CASE "timeline":
          SUSPENSE:
            <CaseTimeline caseId={params.id} />
          END SUSPENSE

        CASE "notes":
          SUSPENSE:
            <CaseNotes caseId={params.id} />
          END SUSPENSE

        CASE "clients":
          SUSPENSE:
            <CaseClients caseId={params.id} />
          END SUSPENSE
      END SWITCH
    END STEP

    STEP implement_static_params_generation:
      // Pre-generate top 100 cases
      GENERATE_STATIC_PARAMS:
        cases = FETCH `/api/cases?limit=100`
        RETURN cases.map(c => ({ id: c.id }))
      END GENERATE_STATIC_PARAMS
    END STEP
  }

  OUTPUT: {
    page_type: "Server Component (authenticated)",
    caching: "revalidate: 60 (1 minute ISR)",
    tabs: "URL-based (?tab=X)",
    suspense: "Per-tab content",
    static_generation: "Top 100 cases pre-rendered"
  }
}
```

**Technology Interface**:
```typescript
interface CaseDetailPageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export async function generateMetadata(props: CaseDetailPageProps): Promise<Metadata>;
export async function generateStaticParams(): Promise<Array<{ id: string }>>;
export default async function CaseDetailPage(props: CaseDetailPageProps): Promise<JSX.Element>;
```

---

## ADDITIONAL PATTERNS (10.7-10.15, 10.17-10.20)

### Summary Table

| Pattern | Page | Purpose | Caching |
|---------|------|---------|---------|
| 10.7 | Analytics | Dashboard with charts and metrics | revalidate: 300 |
| 10.8 | Reports | Report generation and scheduling | no-store |
| 10.9 | Calendar | Calendar view for events/deadlines | no-store |
| 10.10 | Tasks | Kanban board for task management | no-store |
| 10.12 | User Create | Multi-step user creation form | no-store |
| 10.13 | User Edit | Edit user details and permissions | revalidate: 60 |
| 10.14 | Teams | Team management and member listing | revalidate: 300 |
| 10.15 | Roles | RBAC configuration with permission matrix | revalidate: 600 |
| 10.17 | Customers | Customer list with CRM features | no-store |
| 10.18 | Customer Detail | Profile with interaction history (tabs) | revalidate: 60 |
| 10.19 | Products | Product catalog with filters | revalidate: 300 |
| 10.20 | Product Detail | Product specs and availability | revalidate: 300 |

All patterns follow the same core structure as Patterns 10.6, 10.11, and 10.16 with:
- Authentication checks via `getAuthSession()`
- Server-side data fetching with appropriate caching
- Suspense boundaries for progressive loading
- Vietnamese legal domain context
- TypeScript interfaces for type safety

---

## VIETNAMESE LEGAL DOMAIN MODELS

```pseudo
DOMAIN_MODELS = {
  Case: {
    id: string,
    case_number: string,  // VN format: "HS-2024-0001"
    title: string,
    type: "civil" | "commercial" | "criminal" | "administrative",
    status: "active" | "pending" | "closed" | "archived",
    priority: "high" | "medium" | "low",
    created_at: Date,
    assigned_to: User,
    clients: Client[],
    documents: Document[],
    related_cases: Case[],
    deadlines: Deadline[]
  },

  Client: {
    id: string,
    name: string,
    type: "individual" | "organization",
    tax_id: string,  // Mã số thuế
    phone: string,
    email: string,
    address: string
  },

  Document: {
    id: string,
    case_id: string,
    title: string,
    type: "contract" | "evidence" | "submission" | "court_order",
    file_url: string,
    uploaded_by: User,
    created_at: Date,
    version: number
  },

  Deadline: {
    id: string,
    case_id: string,
    title: string,
    due_date: Date,
    type: "court_submission" | "payment" | "response" | "evidence",
    status: "pending" | "completed" | "overdue",
    assigned_to: User
  }
}
```

---

## BEST PRACTICES

### Authentication & Authorization
1. **Session Validation**: Check authentication on every protected page
2. **Permission Checks**: Verify user permissions before rendering
3. **Redirect Handling**: Include callback URLs for post-login redirects
4. **Token Refresh**: Handle expired tokens gracefully
5. **Audit Logging**: Track user actions for sensitive operations

### Data Fetching Strategies
1. **Parallel Fetching**: Use `Promise.all()` for independent queries
2. **Appropriate Caching**: Match cache strategy to data freshness needs
3. **Tag-Based Revalidation**: Invalidate specific cache tags on updates
4. **Error Handling**: Throw errors to trigger error boundaries
5. **Loading States**: Implement Suspense for async content

### Performance Optimization
1. **Server Components**: Default to server components
2. **Code Splitting**: Lazy load heavy components
3. **Image Optimization**: Use Next.js Image component
4. **Database Indexing**: Ensure proper indexes on filtered/sorted columns
5. **Pagination**: Limit query result sets

---

## SUMMARY

This **Frontend Dashboard & CRUD Pages Specialist** provides:

1. **15 Comprehensive Patterns**: Dashboard, CRUD, Analytics, Reports, etc.
2. **Authentication Integration**: Session-based auth with redirects
3. **Advanced Filtering**: Multi-field server-side filtering
4. **Dynamic Routing**: Detail pages with tab navigation
5. **Vietnamese Legal Domain**: Case management, legal document handling

**Technology Stack**: Next.js 15.3.0, React 19, TypeScript 5
**Code Quality**: Production-ready pseudo-code, fully typed
**Documentation**: Comprehensive with Vietnamese legal context

---

*Frontend Dashboard & CRUD Pages Specialist v1.0*
*Created: 2026-01-02*
*Patterns 10.6-10.20 Coverage*
*StarX4CRM - Next.js 15 Specialist Suite*
