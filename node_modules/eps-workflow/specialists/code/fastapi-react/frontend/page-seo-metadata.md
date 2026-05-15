# Page SEO & Metadata Specialist
# Chuyên Gia SEO & Siêu Dữ Liệu Trang

**Role**: Next.js 15 SEO optimization and metadata specialist for Vietnamese legal AI platform
**Focus**: Dynamic metadata, sitemap generation, robots.txt, JSON-LD structured data
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, Metadata API
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST PageSEOMetadata {
  ROLE: "Next.js 15 SEO optimization and metadata implementation specialist"

  RESPONSIBILITIES: [
    "Implement dynamic metadata for content pages",
    "Generate XML sitemaps with priority and frequency",
    "Configure robots.txt with crawler directives",
    "Create JSON-LD structured data schemas",
    "Optimize OpenGraph and Twitter Card metadata"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "next/navigation"],
    patterns: ["Metadata API", "Dynamic Generation", "Structured Data"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Contract/Hợp Đồng", "Document/Tài Liệu", "Case/Vụ Án"]
  }
}
```

---

## Pattern 10.39: Dynamic Metadata Generation
## Pattern 10.39: Tạo Siêu Dữ Liệu Động

### Overview

```pseudo
PATTERN DynamicMetadata {
  PURPOSE: "Generate metadata based on page content and user data for Vietnamese legal documents"

  PROBLEM: "Need dynamic, content-specific metadata for SEO with bilingual support and legal domain context"

  SOLUTION: "Async generateMetadata function fetching contract/document data and generating OpenGraph, Twitter, and locale-specific metadata"

  USE_CASES: [
    "Contract detail pages with Vietnamese/English metadata",
    "Document pages with dynamic titles and descriptions",
    "Case pages with legal entity structured data",
    "User profile pages with dynamic metadata",
    "Blog/article pages with author and publish date"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW DynamicMetadata_Generate {
  INPUT: {
    params: {
      id: string
    }
    searchParams: {
      version?: string
      view?: string
    }
  }

  PRECONDITIONS: [
    "Contract/Document API endpoints are available",
    "Vietnamese/English content exists",
    "OpenGraph images are generated or available"
  ]

  STEPS: {
    STEP_1_FETCH_CONTRACT_DATA: {
      description: "Fetch contract data from API with version support"
      logic: |
        FUNCTION getContract(id: string, version?: string):
          url = API_URL + '/api/contracts/' + id
          IF version:
            url = url + '?version=' + version

          response = AWAIT FETCH(url, {
            next: {
              revalidate: 300,
              tags: ['contracts', 'contract-' + id]
            }
          })

          IF NOT response.ok:
            IF response.status == 404:
              RETURN null
            THROW Error('Failed to fetch contract')

          RETURN AWAIT response.json()
    }

    STEP_2_GENERATE_METADATA: {
      description: "Generate metadata from contract data"
      logic: |
        ASYNC FUNCTION generateMetadata({ params, searchParams }):
          contract = AWAIT getContract(params.id, searchParams.version)

          IF NOT contract:
            RETURN {
              title: 'Contract Not Found',
              description: 'The contract you are looking for does not exist.',
              robots: 'noindex, nofollow'
            }

          // Extract bilingual content
          vietnameseName = contract.name_vi || contract.name
          vietnameseDescription = contract.description_vi || contract.description
          imageUrl = contract.thumbnail_url || '/og-contract-default.png'

          RETURN {
            title: vietnameseName + ' - StarX4CRM Contracts',
            description: vietnameseDescription.substring(0, 160),
            keywords: [
              'Hợp đồng',
              'Contract',
              'Legal',
              contract.type,
              contract.status
            ],
            openGraph: {
              title: vietnameseName,
              description: vietnameseDescription.substring(0, 160),
              type: 'website',
              url: 'https://starx4crm.com/contracts/' + contract.id,
              images: [
                {
                  url: imageUrl,
                  width: 1200,
                  height: 630,
                  alt: vietnameseName
                }
              ],
              locale: 'vi_VN',
              alternateLocale: ['en_US']
            },
            twitter: {
              card: 'summary_large_image',
              title: vietnameseName,
              description: vietnameseDescription.substring(0, 160),
              images: [imageUrl]
            },
            alternates: {
              canonical: 'https://starx4crm.com/contracts/' + contract.id,
              languages: {
                'vi': 'https://starx4crm.com/contracts/' + contract.id + '?lang=vi',
                'en': 'https://starx4crm.com/contracts/' + contract.id + '?lang=en'
              }
            }
          }
    }

    STEP_3_RENDER_DYNAMIC_PAGE: {
      description: "Render page with breadcrumb and document schemas"
      logic: |
        ASYNC FUNCTION ContractPage({ params, searchParams }):
          contract = AWAIT getContract(params.id, searchParams.version)

          IF NOT contract:
            notFound()

          RETURN (
            <div className="space-y-6">
              // Breadcrumb Navigation
              <nav className="flex items-center space-x-2 text-sm">
                <a href="/contracts">Contracts</a>
                <span>/</span>
                <span className="font-medium">{contract.name_vi}</span>
              </nav>

              // Contract Metadata
              <ContractMetadata contract={contract} />

              // Main Contract Viewer
              <ContractViewer
                contract={contract}
                selectedVersion={searchParams.version}
              />

              // Related Contracts
              <RelatedContracts contractId={contract.id} />

              // JSON-LD Schema for Contract
              <script type="application/ld+json">
                {JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'Document',
                  name: contract.name_vi || contract.name,
                  description: contract.description_vi || contract.description,
                  url: 'https://starx4crm.com/contracts/' + contract.id,
                  dateModified: contract.updated_at,
                  author: {
                    '@type': 'Organization',
                    name: contract.author_organization
                  },
                  inLanguage: ['vi', 'en'],
                  keywords: [contract.type, contract.status].join(','),
                  fileFormat: 'application/pdf'
                })}
              </script>

              // Breadcrumb Schema
              <script type="application/ld+json">
                {JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    {
                      '@type': 'ListItem',
                      position: 1,
                      name: 'Home',
                      item: 'https://starx4crm.com'
                    },
                    {
                      '@type': 'ListItem',
                      position: 2,
                      name: 'Contracts',
                      item: 'https://starx4crm.com/contracts'
                    },
                    {
                      '@type': 'ListItem',
                      position: 3,
                      name: contract.name_vi || contract.name,
                      item: 'https://starx4crm.com/contracts/' + contract.id
                    }
                  ]
                })}
              </script>
            </div>
          )
    }

    STEP_4_GENERATE_STATIC_PARAMS: {
      description: "Pre-generate static pages for popular contracts"
      logic: |
        ASYNC FUNCTION generateStaticParams():
          // Generate static pages for top 100 contracts
          response = AWAIT FETCH(
            API_URL + '/api/contracts?limit=100',
            {
              next: { revalidate: 86400 } // Revalidate daily
            }
          )

          IF NOT response.ok:
            RETURN []

          contracts = AWAIT response.json()

          RETURN contracts.map((contract) => ({
            id: contract.id
          }))
    }
  }

  OUTPUT: {
    component: "ContractPage",
    type: "Server Component",
    features: [
      "Dynamic metadata from contract data",
      "Bilingual Vietnamese/English support",
      "OpenGraph and Twitter Card metadata",
      "Canonical URLs and alternate languages",
      "JSON-LD structured data (Document + Breadcrumb)",
      "Static generation for popular contracts"
    ]
  }

  VALIDATION: [
    "Metadata must be generated from actual data",
    "Vietnamese content must be prioritized",
    "OpenGraph images must be 1200x630px",
    "Canonical URLs must be unique",
    "JSON-LD schemas must be valid"
  ]
}
```

### Interface Signatures

```pseudo
INTERFACE ContractPageProps {
  params: {
    id: string
  }
  searchParams: {
    version?: string
    view?: string
  }
}

INTERFACE ContractData {
  id: string
  name: string
  name_vi: string
  description: string
  description_vi: string
  type: string
  status: string
  thumbnail_url: string | null
  author_organization: string
  updated_at: string
}

FUNCTION_SIGNATURE getContract {
  PARAMS: {
    id: string
    version?: string
  }
  RETURNS: Promise<ContractData | null>
}

FUNCTION_SIGNATURE generateMetadata {
  PARAMS: ContractPageProps
  RETURNS: Promise<Metadata>
}

FUNCTION_SIGNATURE generateStaticParams {
  RETURNS: Promise<Array<{ id: string }>>
}
```

---

## Pattern 10.40: Sitemap and SEO Configuration
## Pattern 10.40: Cấu Hình Sitemap và SEO

### Overview

```pseudo
PATTERN SitemapSEOConfig {
  PURPOSE: "Generate dynamic sitemaps and SEO configuration for search engine indexing"

  PROBLEM: "Need automated sitemap generation with priority, change frequency, and robots.txt crawler directives"

  SOLUTION: "Dynamic sitemap.ts with parallel data fetching and robots.ts with crawler rules and sitemap reference"

  USE_CASES: [
    "Generate sitemap for static and dynamic pages",
    "Set priority and change frequency per route",
    "Block admin, API, and auth routes from crawlers",
    "Disallow AI/ML crawlers (GPTBot, ChatGPT-User)",
    "Support multiple languages in sitemap"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW Sitemap_Generate {
  INPUT: {
    // No input - auto-generated
  }

  PRECONDITIONS: [
    "Contract and user API endpoints are available",
    "Static pages are defined"
  ]

  STEPS: {
    STEP_1_FETCH_DYNAMIC_DATA: {
      description: "Fetch contracts and users in parallel"
      logic: |
        ASYNC FUNCTION getContracts():
          response = AWAIT FETCH(
            API_URL + '/api/contracts?limit=50000',
            {
              next: { revalidate: 86400 } // Cache for 24 hours
            }
          )

          IF NOT response.ok:
            RETURN []

          RETURN AWAIT response.json()

        ASYNC FUNCTION getUsers():
          response = AWAIT FETCH(
            API_URL + '/api/users?limit=50000',
            {
              next: { revalidate: 86400 }
            }
          )

          IF NOT response.ok:
            RETURN []

          RETURN AWAIT response.json()

        // Parallel fetching
        [contracts, users] = AWAIT Promise.all([
          getContracts(),
          getUsers()
        ])
    }

    STEP_2_DEFINE_STATIC_PAGES: {
      description: "Define static pages with priority and frequency"
      logic: |
        staticPages = [
          {
            url: baseUrl + '/',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1
          },
          {
            url: baseUrl + '/about',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8
          },
          {
            url: baseUrl + '/pricing',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9
          },
          {
            url: baseUrl + '/blog',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7
          },
          {
            url: baseUrl + '/contact',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5
          }
        ]
    }

    STEP_3_GENERATE_DYNAMIC_PAGES: {
      description: "Generate sitemap entries for contracts and users"
      logic: |
        contractPages = contracts.map((contract) => ({
          url: baseUrl + '/contracts/' + contract.id,
          lastModified: new Date(contract.updated_at),
          changeFrequency: 'weekly',
          priority: 0.6
        }))

        userPages = users.map((user) => ({
          url: baseUrl + '/users/' + user.id,
          lastModified: new Date(user.updated_at),
          changeFrequency: 'monthly',
          priority: 0.4
        }))
    }

    STEP_4_COMBINE_AND_RETURN: {
      description: "Combine all sitemap entries"
      logic: |
        RETURN [...staticPages, ...contractPages, ...userPages]
    }
  }

  OUTPUT: {
    file: "sitemap.xml",
    type: "MetadataRoute.Sitemap",
    features: [
      "50,000 URL limit per sitemap",
      "24-hour cache revalidation",
      "Priority and change frequency per route",
      "Dynamic lastModified from data",
      "Parallel data fetching"
    ]
  }

  VALIDATION: [
    "Must not exceed 50,000 URLs per sitemap",
    "Must include lastModified dates",
    "Must set proper priority values (0-1)",
    "Must cache for 24 hours minimum"
  ]
}
```

### Robots.txt Configuration

```pseudo
WORKFLOW RobotsTxt_Generate {
  INPUT: {
    // No input - auto-generated
  }

  STEPS: {
    STEP_1_DEFINE_CRAWLER_RULES: {
      description: "Define allow/disallow rules for crawlers"
      logic: |
        RETURN {
          rules: [
            {
              userAgent: '*',
              allow: '/',
              disallow: [
                '/admin/',
                '/api/',
                '/auth/',
                '/private/',
                '/*.json$',
                '/*?*sort='
              ]
            },
            {
              userAgent: 'GPTBot',
              disallow: '/'
            },
            {
              userAgent: 'ChatGPT-User',
              disallow: '/'
            }
          ],
          sitemap: 'https://starx4crm.com/sitemap.xml',
          crawlDelay: 1
        }
    }
  }

  OUTPUT: {
    file: "robots.txt",
    type: "MetadataRoute.Robots",
    features: [
      "Allow public routes",
      "Disallow admin, API, auth routes",
      "Block AI/ML crawlers",
      "Reference sitemap",
      "Set crawl delay"
    ]
  }

  VALIDATION: [
    "Must block sensitive routes",
    "Must reference sitemap",
    "Must set reasonable crawl delay",
    "Must block AI crawlers if needed"
  ]
}
```

### Interface Signatures

```pseudo
INTERFACE SitemapEntry {
  url: string
  lastModified: Date
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number // 0-1
}

INTERFACE RobotsRule {
  userAgent: string
  allow?: string | string[]
  disallow?: string | string[]
}

INTERFACE RobotsConfig {
  rules: RobotsRule[]
  sitemap: string | string[]
  crawlDelay?: number
}

FUNCTION_SIGNATURE sitemap {
  RETURNS: Promise<SitemapEntry[]>
}

FUNCTION_SIGNATURE robots {
  RETURNS: RobotsConfig
}
```

---

## Pattern 10.41: JSON-LD Schema Implementation
## Pattern 10.41: Triển Khai Schema JSON-LD

### Overview

```pseudo
PATTERN JSONLDSchema {
  PURPOSE: "Structured data for search engines and rich snippets"

  PROBLEM: "Need standardized structured data for enhanced SERP display and voice search optimization"

  SOLUTION: "JSON-LD schema components for Organization, WebSite, BreadcrumbList, Document, and LocalBusiness"

  USE_CASES: [
    "Organization schema for company branding",
    "WebSite schema with search action",
    "BreadcrumbList for navigation hierarchy",
    "Document schema for legal contracts",
    "LocalBusiness schema for Vietnamese legal services"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW JSONLDSchema_Organization {
  INPUT: {
    // Static organization data
  }

  STEPS: {
    STEP_1_CREATE_ORGANIZATION_SCHEMA: {
      description: "Create Organization schema for company"
      logic: |
        schema = {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'StarX4CRM',
          url: 'https://starx4crm.com',
          logo: 'https://starx4crm.com/logo.png',
          description: 'AI-Powered CRM Platform for P2P Insurance & Lending',
          sameAs: [
            'https://twitter.com/starx4crm',
            'https://facebook.com/starx4crm',
            'https://linkedin.com/company/starx4crm'
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Support',
            telephone: '+84-123-456-789',
            email: 'support@starx4crm.com',
            areaServed: ['VN', 'US', 'SG'],
            availableLanguage: ['vi', 'en']
          },
          address: {
            '@type': 'PostalAddress',
            streetAddress: '123 Tech Street',
            addressLocality: 'Ho Chi Minh City',
            addressRegion: 'HCM',
            postalCode: '70000',
            addressCountry: 'VN'
          },
          foundingDate: '2024',
          areaServed: {
            '@type': 'Country',
            name: ['Vietnam', 'Singapore', 'United States']
          }
        }

        RETURN (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        )
    }
  }

  OUTPUT: {
    component: "OrganizationSchema",
    type: "Schema Component",
    features: [
      "Company branding",
      "Contact information",
      "Social media links",
      "Address and area served",
      "Multilingual support"
    ]
  }
}
```

### Website Schema

```pseudo
WORKFLOW JSONLDSchema_Website {
  INPUT: {
    // Static website data
  }

  STEPS: {
    STEP_1_CREATE_WEBSITE_SCHEMA: {
      description: "Create WebSite schema with search action"
      logic: |
        schema = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'StarX4CRM',
          url: 'https://starx4crm.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: 'https://starx4crm.com/search?q={search_term_string}'
            },
            query_input: 'required name=search_term_string'
          },
          inLanguage: ['vi', 'en']
        }

        RETURN (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        )
    }
  }

  OUTPUT: {
    component: "WebsiteSchema",
    type: "Schema Component",
    features: [
      "Website metadata",
      "Search action for site search",
      "Multilingual support",
      "Voice search optimization"
    ]
  }
}
```

### Breadcrumb Schema

```pseudo
WORKFLOW JSONLDSchema_Breadcrumb {
  INPUT: {
    items: Array<{ name: string, url: string }>
  }

  STEPS: {
    STEP_1_CREATE_BREADCRUMB_SCHEMA: {
      description: "Create BreadcrumbList schema from items"
      logic: |
        schema = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url
          }))
        }

        RETURN (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        )
    }
  }

  OUTPUT: {
    component: "BreadcrumbSchema",
    type: "Schema Component",
    features: [
      "Navigation hierarchy",
      "Position-based ordering",
      "Dynamic item generation",
      "SERP breadcrumb display"
    ]
  }
}
```

### Interface Signatures

```pseudo
COMPONENT_SIGNATURE OrganizationSchema {
  PROPS: {}
  RETURNS: ReactElement
}

COMPONENT_SIGNATURE WebsiteSchema {
  PROPS: {}
  RETURNS: ReactElement
}

COMPONENT_SIGNATURE BreadcrumbSchema {
  PROPS: {
    items: Array<{ name: string, url: string }>
  }
  RETURNS: ReactElement
}

COMPONENT_SIGNATURE DocumentSchema {
  PROPS: {
    name: string
    description: string
    url: string
    dateModified: string
    author: string
    inLanguage: string[]
    keywords: string
  }
  RETURNS: ReactElement
}
```

---

## Summary

This **Page SEO & Metadata Specialist** provides comprehensive pseudo-code workflows for:

1. **Pattern 10.39 (Dynamic Metadata)**: Content-based metadata generation with bilingual support, OpenGraph, Twitter Cards, and alternate languages
2. **Pattern 10.40 (Sitemap & SEO Config)**: Dynamic sitemap with 50,000 URL limit, robots.txt with crawler directives and AI blocker
3. **Pattern 10.41 (JSON-LD Schema)**: Structured data for Organization, WebSite, BreadcrumbList, and Document schemas

**Key Features**:
- Dynamic metadata from Vietnamese legal documents
- Bilingual Vietnamese/English support
- OpenGraph and Twitter Card optimization
- XML sitemap with priority and frequency
- Robots.txt with AI crawler blocking
- JSON-LD structured data for rich snippets
- Tag-based cache revalidation

**Technology Stack**: Next.js 15.3.0, React 19, TypeScript 5, Metadata API
**Domain Context**: Vietnamese legal P2P insurance & lending platform
**Format**: Pseudo-code WORKFLOW format with interface signatures only

---

*Page SEO & Metadata Specialist v1.0*
*Created: 2026-01-02*
*Patterns 10.39-10.41 Coverage*
