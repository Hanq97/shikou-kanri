# ADR-003: Frontend Framework

## Status
**ACCEPTED** — 2026-05-15

## Context

Doc đề xuất "React / TypeScript — モダンSPA / PWA対応". Cần chốt FE framework cho web + mobile-via-PWA (ADR-010).

Yêu cầu:
- SPA cho desktop user (経営層, 営業, 工程管理者)
- PWA cho mobile (現場監督, 職人) Phase 2
- Rich components: Gantt chart, PDF viewer (図面), file upload, chat UI
- 日本語 UI support
- Offline capability (Phase 2, photo queue)

## Options

### Option A: React + TypeScript (Vite build) — Chosen
- **Pros**: 
  - Doc baseline; team familiarity
  - Rich library ecosystem cho Gantt (gantt-task-react, syncfusion), PDF (react-pdf, pdf.js)
  - PWA support tốt với Vite + vite-plugin-pwa
  - Type sharing với NestJS qua shared package
- **Cons**: Bundle size cần care; SSR không essential ở đây nên không cần Next.js complexity

### Option B: Next.js (React + SSR)
- **Pros**: SSR/SSG; SEO; file-based routing
- **Cons**: SEO không cần (internal tool); SSR overhead; PWA support phức tạp hơn

### Option C: Vue 3 / Angular
- **Pros**: Vue đơn giản hơn React; Angular opinionated
- **Cons**: Team chưa quen; ecosystem cho construction-specific component (Gantt) nghèo hơn React

## Decision

**Option A — React 18 + TypeScript + Vite**.

### Stack details:
- **Framework**: React 18 (StrictMode on)
- **Build**: Vite 5+
- **Language**: TypeScript strict mode
- **Routing**: React Router 6+
- **State**: Zustand cho global state (lightweight); TanStack Query cho server state
- **UI Component Library**: **Ant Design 5** (rich JP-friendly components; well-suited cho enterprise admin UI). Alternative: MUI 5 nếu team prefer.
- **Form**: React Hook Form + Zod
- **PWA**: vite-plugin-pwa + Workbox (Phase 2)
- **Charts (Phase 3 dashboard)**: Recharts hoặc Apache ECharts
- **Gantt (Phase 1)**: gantt-task-react hoặc syncfusion (paid)
- **PDF viewer**: react-pdf (Phase 2 cho 図面)
- **i18n**: react-i18next (UI tiếng Nhật; có thể add EN/VI sau)

## Consequences

### Positive
- Fast build (Vite); fast dev experience
- Type-safe end-to-end với BE (shared types)
- Ant Design rich → giảm UI dev time cho enterprise screens

### Negative
- Bundle size cần monitoring (Ant Design large; cần tree-shaking)
- Vite vs Next.js: nếu sau cần SSR cho landing page → migrate cost

### Performance targets (per doc §4.1)
- Initial load p95 < 2s on 3G fast — needs code splitting per route
- Search result p95 < 3s — pagination + virtual list cho large dataset

## References

- Assessment Topic 1, Q3.1 (PWA)
- Domain KB §4.3
- Related: ADR-002 (NestJS), ADR-010 (Mobile PWA)
