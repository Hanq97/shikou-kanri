# Web Design Guidelines Specialist — Generic
# Webデザインガイドラインスペシャリスト — 汎用
# Chuyên Gia Hướng Dẫn Thiết Kế Web — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 96.1–96.12 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
100+ UI/UX rules covering accessibility, focus management, forms, animation, typography, performance, navigation, touch interaction, dark mode, and anti-patterns. Source: Vercel web-interface-guidelines.

## Patterns

### Pattern 96.1: Accessibility (10 rules)
```
- aria-label on ALL icon-only buttons and links
- <label> with htmlFor on ALL form inputs
- Keyboard handlers: onKeyDown with onClick (Enter + Space)
- Semantic HTML: <nav>, <main>, <article>, <aside>, <header>, <footer>
- Heading hierarchy: h1 → h2 → h3 (never skip levels)
- Skip links: "Skip to content" as first focusable element
- scroll-margin-top on anchor targets (account for sticky headers)
- Alt text: descriptive for content images, alt="" for decorative
- role="alert" for live error messages
- aria-live="polite" for dynamic content updates
```

### Pattern 96.2: Focus Management (4 rules)
```
- focus-visible:ring for keyboard-only focus indicators
- NEVER remove outlines without replacement (outline: none → custom ring)
- :focus-visible > :focus (avoids mouse click focus rings)
- :focus-within for compound interactive elements (search box + button)
```

### Pattern 96.3: Forms UX (11 rules)
```
- autocomplete + name attributes on all inputs
- Correct type + inputMode (type="email", inputMode="numeric" for OTP)
- NEVER block paste on password/confirmation fields
- Clickable labels (htmlFor or wrapping <label>)
- spellCheck={false} for emails, URLs, codes
- Submit button: always enabled → spinner on submit (never disable)
- Inline errors below field (not toast/modal)
- Placeholders with "…" suffix (Search…, Enter email…)
- Warn on unsaved changes (beforeunload + in-app confirmation)
- Tab order follows visual order
- Multi-step: progress indicator + save state between steps
```

### Pattern 96.4: Animation (6 rules)
```
- prefers-reduced-motion: reduce → disable non-essential animations
- Only animate transform and opacity (GPU-accelerated, no layout thrash)
- NEVER use transition: all (triggers unintended transitions)
- Correct transform-origin for scale/rotate
- SVG: transform-box: fill-box for proper origin
- Interruptible animations (user can cancel mid-animation)
```

### Pattern 96.5: Typography & Content (8 rules)
```
- Ellipsis … (not ...). Curly quotes "" (not ""). tabular-nums for number columns
- text-wrap: balance headings, pretty body. line-clamp multi-line truncation
- flex items: min-w-0 for text truncation. Handle empty states with CTA
- Test short (1 char) AND long (500 chars) inputs
```

### Pattern 96.6: Performance & Navigation (8 rules)
```
- Virtualize lists >50 items. Batch DOM reads/writes. preconnect CDN origins
- URL reflects UI state (filters, tabs, pagination). Deep-link stateful UI
- Links use <a>/<Link> NOT <div onClick>. Confirmation for destructive actions
- touch-action:manipulation. overscroll-behavior:contain on modals
```

### Pattern 96.7: Dark Mode & Locale (6 rules)
```
- color-scheme:dark on <html>. meta theme-color. Explicit bg+color on <select>
- Intl.DateTimeFormat/NumberFormat (never hardcode). Detect via Accept-Language
```

### Pattern 96.8: Anti-patterns (12 flags)
```
❌ user-scalable=no | onPaste preventDefault | transition:all
❌ outline:none without replacement | <div onClick> navigation | images without dimensions
❌ .map() >50 items without virtualization | inputs without <label>
❌ icon buttons without aria-label | hardcoded date/number | unjustified autoFocus
❌ disabled submit buttons (use enabled + validation feedback)
```

## Common Mistakes
- Removing outline without focus-visible replacement
- transition:all instead of specific properties
- Missing aria-label on icon-only buttons

## Related Specialists
- 92.x nextjs-assets-optimization — Image/font optimization
- 94.x react-perf-rendering — Client-side rendering performance
- 59.x theme — Project-specific theme system (variant overlay)
