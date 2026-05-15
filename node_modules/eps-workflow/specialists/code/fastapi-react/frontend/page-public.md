# Frontend Public Pages Specialist
**Next.js 15 Feature-Sliced Design (FSD) - Public Marketing Pages**

**Version**: 1.0.0
**Last Updated**: 2026-01-02
**Scope**: Public-facing pages (home, about, pricing, contact, blog)
**Patterns Covered**: 10.1-10.5 (5 patterns)

---

## SPECIALIST IDENTITY

### Role Definition
**Frontend Public Pages Specialist** - Manages public-facing marketing pages in Next.js 15 applications:

- Static page generation with optimal caching
- SEO optimization and metadata configuration
- Marketing-focused layouts and content
- Conversion tracking and analytics
- Social sharing optimization
- Public content presentation

### Core Responsibilities

1. **Design Home/Landing Pages with Hero Sections**
2. **Create About Pages with Company Information**
3. **Implement Pricing Pages with Comparison Tables**
4. **Build Contact Pages with Form Handling**
5. **Design Blog List Pages with Pagination**

---

## PATTERN IMPLEMENTATIONS

### Pattern 10.1: Home Page (Marketing Landing)

**Purpose**: Public-facing home page with marketing sections and SEO optimization

**File**: `src/app/page.tsx`

```pseudo
WORKFLOW HomePage_Pattern_10_1 {
  INPUT: {
    metadata: {
      title: "StarX4CRM - Nền Tảng CRM Cho Pháp Luật Việt Nam",
      description: "Quản lý khách hàng, hợp đồng và vụ việc",
      keywords: ["CRM pháp luật", "quản lý hợp đồng", "CRM Việt Nam"]
    }
  }

  STEPS: {
    STEP generate_static_metadata:
      DEFINE metadata_object WITH:
        - title (bilingual Vietnamese/English)
        - description (marketing focused)
        - openGraph tags (1200x630 images)
        - twitter card metadata
        - canonical URL
        - locale settings (vi_VN primary)
      END DEFINE

    STEP create_json_ld_schema:
      DEFINE organization_schema WITH:
        - @context: "https://schema.org"
        - @type: "Organization"
        - name, url, logo
        - contactPoint (phone, email, languages)
        - address (Vietnamese location)
        - sameAs (social media links)
      END DEFINE

    STEP compose_page_sections:
      SECTION hero (critical_path):
        - Gradient background (blue)
        - Value proposition headline
        - CTA buttons (primary/secondary)
        - Hero image/illustration
      END SECTION

      SECTION features (suspense_boundary):
        - Feature grid (3-4 columns)
        - Icon + title + description
        - Fallback skeleton loader
      END SECTION

      SECTION benefits (suspense_boundary):
        - Benefit cards with icons
        - Vietnamese legal domain focus
        - Customer pain points addressed
      END SECTION

      SECTION testimonials (suspense_boundary):
        - Customer quotes
        - Company logos
        - Star ratings
      END SECTION

      SECTION cta_final:
        - Call-to-action section
        - Sign-up form or button
        - Trust indicators
      END SECTION

      SECTION footer:
        - Company information
        - Quick links navigation
        - Contact details
        - Legal links (privacy, terms)
      END SECTION
    END compose_page_sections

    STEP apply_performance_optimization:
      - Static generation (force-cache)
      - Image optimization (Next.js Image)
      - Font optimization (display: swap)
      - Suspense for non-critical content
      - Progressive enhancement
    END STEP
  }

  OUTPUT: {
    page_type: "Server Component",
    caching: "Static Generation",
    revalidation: "None (fully static)",
    performance: {
      LCP: "< 2.5s",
      CLS: "< 0.1",
      FID: "< 100ms"
    }
  }
}
```

**Technology Interface**:
```typescript
// src/app/page.tsx
export const metadata: Metadata;
export async function generateMetadata(): Promise<Metadata>;
export default function HomePage(): JSX.Element;
```

---

### Pattern 10.2: About Page

**Purpose**: Company information and team presentation

**File**: `src/app/about/page.tsx`

```pseudo
WORKFLOW AboutPage_Pattern_10_2 {
  INPUT: {
    company_info: {
      name: "StarX4CRM",
      founded: "2024",
      mission: "Empower legal professionals with AI-powered CRM",
      team_size: number,
      locations: ["Vietnam", "Singapore"]
    }
  }

  STEPS: {
    STEP define_metadata:
      SET title = "About StarX4CRM - Company Information"
      SET description = "Learn about our mission to transform legal CRM"
      SET openGraph WITH company_logo and description
    END STEP

    STEP create_page_sections:
      SECTION company_overview:
        - Company mission statement
        - Core values
        - Vision for future
      END SECTION

      SECTION team_showcase:
        - Leadership team profiles
        - Team photos
        - Roles and expertise
      END SECTION

      SECTION company_history:
        - Timeline component
        - Key milestones
        - Growth metrics
      END SECTION

      SECTION office_locations:
        - Map integration
        - Address details
        - Contact information per location
      END SECTION
    END create_page_sections

    STEP apply_caching:
      cache_strategy = "force-cache"  // Static content
      revalidate_interval = NONE      // Updates via deployment
    END STEP
  }

  OUTPUT: {
    page_type: "Static Page",
    caching: "Permanent (until redeploy)",
    suspense: "Optional for team photos"
  }
}
```

**Technology Interface**:
```typescript
export const metadata: Metadata;
export default function AboutPage(): JSX.Element;
```

---

### Pattern 10.3: Pricing Page

**Purpose**: Product pricing with comparison table

**File**: `src/app/pricing/page.tsx`

```pseudo
WORKFLOW PricingPage_Pattern_10_3 {
  INPUT: {
    pricing_tiers: [
      {
        name: "Starter",
        price_vnd: 500000,
        price_usd: 25,
        features: string[],
        cta: "Bắt đầu miễn phí"
      },
      {
        name: "Professional",
        price_vnd: 1500000,
        price_usd: 75,
        features: string[],
        cta: "Dùng thử 14 ngày"
      },
      {
        name: "Enterprise",
        price_vnd: null,  // Contact for pricing
        features: string[],
        cta: "Liên hệ bán hàng"
      }
    ]
  }

  STEPS: {
    STEP generate_pricing_metadata:
      SET title = "Pricing - StarX4CRM Plans"
      SET description = "Choose the perfect plan for your legal practice"
      ADD json_ld_schema FOR "Product" type
    END STEP

    STEP create_comparison_table:
      TABLE pricing_comparison:
        COLUMNS: ["Feature", "Starter", "Professional", "Enterprise"]
        ROWS:
          - User limits
          - Case management
          - Document storage
          - API access
          - Support level
          - Custom integrations
      END TABLE

      HIGHLIGHT recommended_plan = "Professional"
    END create_comparison_table

    STEP add_pricing_cards:
      FOR EACH tier IN pricing_tiers:
        RENDER card WITH:
          - Tier name and price
          - Feature checklist
          - CTA button
          - Highlight if recommended
        END RENDER
      END FOR
    END STEP

    STEP include_faq_section:
      FAQ items:
        - Billing cycle options
        - Refund policy
        - Plan upgrades/downgrades
        - Payment methods
        - Currency support
    END STEP

    STEP apply_caching:
      cache_strategy = "force-cache"
      revalidate_on_deploy = TRUE
    END STEP
  }

  OUTPUT: {
    page_type: "Static Page",
    caching: "Static with rare updates",
    conversion_tracking: "GA4 events on CTA clicks"
  }
}
```

**Technology Interface**:
```typescript
export const metadata: Metadata;
export default function PricingPage(): JSX.Element;
```

---

### Pattern 10.4: Contact Page

**Purpose**: Contact form with server action

**File**: `src/app/contact/page.tsx`

```pseudo
WORKFLOW ContactPage_Pattern_10_4 {
  INPUT: {
    contact_methods: {
      email: "support@starx4crm.vn",
      phone: "+84 28 1234 5678",
      address: "123 Đường Trần Hưng Đạo, Hà Nội",
      social: {
        facebook: "https://facebook.com/starx4crm",
        linkedin: "https://linkedin.com/company/starx4crm"
      }
    }
  }

  STEPS: {
    STEP define_metadata:
      SET title = "Contact Us - StarX4CRM Support"
      SET description = "Get in touch with our team for support or sales inquiries"
      SET robots = "index, follow"
    END STEP

    STEP create_contact_form:
      FORM contact_submission:
        FIELDS:
          - name (required, max 100 chars)
          - email (required, email validation)
          - phone (optional, Vietnamese format)
          - subject (required, select dropdown)
          - message (required, textarea, max 1000 chars)
        END FIELDS

        VALIDATION:
          - Client-side: HTML5 + React Hook Form
          - Server-side: Zod schema validation
        END VALIDATION

        SUBMISSION:
          METHOD: Server Action
          ACTION: submitContactForm(formData)
          ON_SUCCESS: Show thank you message
          ON_ERROR: Display error banner
        END SUBMISSION
      END FORM
    END create_contact_form

    STEP add_contact_info_sidebar:
      SECTION contact_details:
        - Office hours
        - Phone number (clickable tel: link)
        - Email (clickable mailto: link)
        - Office address with map
      END SECTION

      SECTION social_links:
        - Facebook page
        - LinkedIn company page
        - Twitter/X account
      END SECTION
    END STEP

    STEP implement_server_action:
      SERVER_ACTION submitContactForm(formData):
        VALIDATE formData WITH zod_schema
        IF validation_fails:
          RETURN error_response
        END IF

        SEND email TO support_team
        STORE submission IN database
        TRIGGER notification TO sales_team

        RETURN success_response
      END SERVER_ACTION
    END STEP

    STEP apply_caching:
      cache_strategy = "no-store"  // Form page, no caching
    END STEP
  }

  OUTPUT: {
    page_type: "Server Component with Client Form",
    caching: "no-store (dynamic form)",
    form_validation: "Client + Server",
    spam_protection: "reCAPTCHA v3 (optional)"
  }
}
```

**Technology Interface**:
```typescript
export const metadata: Metadata;
export default function ContactPage(): JSX.Element;

// Server Action
export async function submitContactForm(
  formData: FormData
): Promise<{ success: boolean; message: string }>;
```

---

### Pattern 10.5: Blog List Page

**Purpose**: Blog post listing with pagination

**File**: `src/app/blog/page.tsx`

```pseudo
WORKFLOW BlogListPage_Pattern_10_5 {
  INPUT: {
    search_params: {
      page: number (default: 1),
      category: string (optional),
      search: string (optional)
    }
  }

  STEPS: {
    STEP generate_dynamic_metadata:
      IF page > 1:
        SET title = `Blog - Page ${page} - StarX4CRM`
      ELSE:
        SET title = "Blog - StarX4CRM Legal CRM Insights"
      END IF

      SET description = "Latest articles on legal CRM best practices"
      SET canonical_url WITH pagination param
    END STEP

    STEP fetch_blog_posts:
      QUERY posts FROM cms_or_database:
        WHERE category = search_params.category (if provided)
        WHERE title MATCHES search_params.search (if provided)
        ORDER BY published_at DESC
        LIMIT 10 OFFSET (page - 1) * 10
      END QUERY

      FETCH total_count FOR pagination
    END STEP

    STEP render_post_grid:
      FOR EACH post IN posts:
        RENDER post_card WITH:
          - Featured image (optimized)
          - Post title
          - Excerpt (150 chars)
          - Author and date
          - Category tags
          - Read more link
        END RENDER
      END FOR
    END STEP

    STEP add_category_filter:
      CATEGORIES = ["Legal Tech", "CRM Tips", "Case Studies", "Product Updates"]

      RENDER category_buttons:
        FOR EACH category:
          BUTTON active_if(search_params.category === category)
          ON_CLICK: Navigate to `/blog?category=${category}`
        END FOR
      END RENDER
    END STEP

    STEP implement_pagination:
      total_pages = CEIL(total_count / 10)

      PAGINATION:
        PREV_BUTTON: visible IF page > 1
        NEXT_BUTTON: visible IF page < total_pages
        PAGE_NUMBERS: Show pages (1, 2, 3, ..., total_pages)
      END PAGINATION
    END STEP

    STEP add_search_functionality:
      SEARCH_FORM:
        INPUT search_query
        ON_SUBMIT: Navigate to `/blog?search=${search_query}`
      END SEARCH_FORM
    END STEP

    STEP apply_caching:
      cache_strategy = "revalidate: 3600"  // 1 hour ISR
      tags = ["blog-posts"]
    END STEP

    STEP add_json_ld_schema:
      SCHEMA "Blog" type:
        - Blog name
        - Blog posts list
        - Pagination metadata
      END SCHEMA
    END STEP
  }

  OUTPUT: {
    page_type: "Server Component",
    caching: "ISR (1 hour revalidation)",
    pagination: "URL-based (?page=N)",
    filtering: "Server-side category + search",
    performance: "Optimized images, Suspense"
  }
}
```

**Technology Interface**:
```typescript
interface BlogPageProps {
  searchParams: {
    page?: string;
    category?: string;
    search?: string;
  };
}

export const metadata: Metadata;
export default async function BlogPage(props: BlogPageProps): Promise<JSX.Element>;
```

---

## TECHNOLOGY STACK

### Next.js 15.3.0 Features
- **Static Generation**: `force-cache` for marketing pages
- **ISR**: `revalidate: 3600` for blog content
- **Metadata API**: SEO optimization
- **Server Actions**: Form submissions
- **Image Optimization**: Automatic WebP conversion

### React 19 Features
- **Server Components**: Default for all pages
- **Suspense**: Progressive loading for non-critical content
- **useActionState**: Form state management

### TypeScript 5
- **Strict Mode**: Full type safety
- **Generic Props**: Type-safe page props
- **Interface Exports**: Public API contracts

---

## VIETNAMESE LEGAL DOMAIN CONTEXT

### Bilingual Content
All public pages support Vietnamese (primary) and English (secondary):

```pseudo
CONTENT_STRUCTURE:
  Vietnamese_Primary:
    - Headlines in Vietnamese
    - Body content in Vietnamese
    - CTAs in Vietnamese

  English_Secondary:
    - Alt text in English
    - Technical terms in English
    - Metadata in both languages
```

### Legal Domain Labels
```pseudo
VIETNAMESE_LABELS = {
  home: "Trang Chủ",
  about: "Về Chúng Tôi",
  pricing: "Bảng Giá",
  contact: "Liên Hệ",
  blog: "Tin Tức",
  get_started: "Bắt Đầu Ngay",
  learn_more: "Tìm Hiểu Thêm",
  contact_sales: "Liên Hệ Bán Hàng"
}
```

---

## BEST PRACTICES

### SEO Optimization
1. **Unique Title Tags**: 50-60 characters, keyword-focused
2. **Meta Descriptions**: 150-160 characters, compelling
3. **Open Graph Tags**: 1200x630 images, localized content
4. **JSON-LD Schema**: Organization, WebSite, Blog schemas
5. **Canonical URLs**: Prevent duplicate content
6. **Sitemap Inclusion**: All public pages in sitemap.xml

### Performance
1. **Static Generation**: Pre-render at build time
2. **Image Optimization**: Next.js Image with WebP
3. **Font Optimization**: Self-hosted fonts with swap
4. **Code Splitting**: Automatic route-based splitting
5. **Suspense Boundaries**: Progressive content loading

### Accessibility
1. **Semantic HTML**: Proper heading hierarchy
2. **Alt Text**: All images have descriptive alt
3. **ARIA Labels**: For interactive elements
4. **Keyboard Navigation**: Full keyboard support
5. **Color Contrast**: WCAG 2.1 AA compliance

---

## FILE ORGANIZATION

```
src/app/
├── page.tsx                    # Pattern 10.1 (Home)
├── about/
│   └── page.tsx               # Pattern 10.2 (About)
├── pricing/
│   └── page.tsx               # Pattern 10.3 (Pricing)
├── contact/
│   └── page.tsx               # Pattern 10.4 (Contact)
└── blog/
    ├── page.tsx               # Pattern 10.5 (Blog List)
    └── [slug]/
        └── page.tsx           # Individual blog post
```

---

## SUMMARY

This **Frontend Public Pages Specialist** provides comprehensive patterns for:

1. **5 Core Public Pages**: Home, About, Pricing, Contact, Blog
2. **SEO Optimization**: Metadata, OpenGraph, JSON-LD schemas
3. **Performance**: Static generation, ISR, image optimization
4. **Vietnamese Legal Domain**: Bilingual content, legal terminology
5. **Conversion Focus**: CTAs, forms, social proof

**Technology Stack**: Next.js 15.3.0, React 19, TypeScript 5
**Code Quality**: Production-ready, fully typed, optimized
**Documentation**: Comprehensive pseudo-code with Vietnamese context

---

*Frontend Public Pages Specialist v1.0*
*Created: 2026-01-02*
*Patterns 10.1-10.5 Coverage*
*StarX4CRM - Next.js 15 Specialist Suite*
