# Next.js Assets Optimization Specialist — Generic
# Next.jsアセット最適化スペシャリスト — 汎用
# Chuyên Gia Tối Ưu Assets Next.js — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 92.1–92.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
Image, font, script, bundling optimization, metadata, and OG image generation patterns for Next.js.

## Patterns

### Pattern 92.1: Image Optimization
```tsx
import Image from 'next/image'
// Remote images: explicit width+height OR fill
<Image src="/hero.jpg" width={800} height={400} alt="Hero" priority />
<Image src={url} fill sizes="(max-width: 768px) 100vw, 50vw" alt="..." />

Rules:
- next/image mandatory (auto WebP, lazy load, srcset)
- remotePatterns in next.config for external images
- sizes prop CRITICAL for responsive (prevents layout shift)
- priority for LCP (Largest Contentful Paint) images
- placeholder="blur" for perceived speed
```

### Pattern 92.2: Font Optimization
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
// Apply in root layout: <body className={inter.variable}>

Rules:
- next/font/google or next/font/local (zero layout shift)
- CSS variables for multiple fonts
- Variable fonts preferred (single file, all weights)
- subset optimization (latin, latin-ext)
- NEVER import fonts in multiple components — centralize in layout
- NEVER use @import in CSS files
```

### Pattern 92.3: Script Optimization
```tsx
import Script from 'next/script'
<Script src="https://analytics.example.com/script.js" strategy="lazyOnload" />

Strategies:
- afterInteractive (default): after hydration
- lazyOnload: during idle time
- beforeInteractive: root layout only, before any code
- worker: experimental, off main thread
- Inline scripts MUST have id prop
- Use @next/third-parties for GA/GTM
```

### Pattern 92.4: Bundling & Dynamic Imports
```tsx
// Heavy libraries: dynamic import with ssr: false
const Chart = dynamic(() => import('./Chart'), { ssr: false, loading: () => <Skeleton /> })

Rules:
- Server-incompatible packages: dynamic(ssr: false) or serverExternalPackages
- CSS: import directly in components (NOT <link> tags)
- transpilePackages for ESM/CJS compatibility issues
- Bundle analysis: next experimental-analyze (16.1+)
- Turbopack: check package compat, some loaders differ from webpack
```

### Pattern 92.5: Metadata
```tsx
// Static metadata (Server Components only)
export const metadata: Metadata = { title: 'Page', description: '...' }
// Dynamic metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> { ... }

Rules:
- Only Server Components can export metadata
- Title templates: { template: '%s | Site Name', default: 'Site Name' }
- Viewport must be separate export (not in metadata)
- File conventions: favicon.ico, opengraph-image.png, sitemap.xml, robots.txt
- React cache() for dedup between generateMetadata and page
```

### Pattern 92.6: OG Image Generation
```tsx
// app/og/route.tsx
import { ImageResponse } from 'next/og'
export async function GET(request: Request) {
  return new ImageResponse(<div style={{ display: 'flex' }}>...</div>)
}
// Flexbox ONLY (no Grid). Route params (NOT searchParams for caching)
// Custom fonts: fs.readFile in Node.js runtime
```

## Common Mistakes
- Using `<img>` instead of `next/image` (no optimization)
- Missing sizes prop on responsive images (downloads full-size)
- Importing fonts in every component instead of centralizing in layout
- Using `<script>` instead of `next/script` (blocks rendering)
- CSS Grid in OG images (only Flexbox supported)

## Related Specialists
- 93.x react-perf-critical — Bundle size elimination patterns
- 96.x web-design-guidelines — Image accessibility rules
- 66.x perf — Project-specific performance inventory (variant overlay)
