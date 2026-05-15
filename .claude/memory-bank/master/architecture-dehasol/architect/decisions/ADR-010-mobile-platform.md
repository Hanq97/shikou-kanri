# ADR-010: Mobile Platform

## Status
**ACCEPTED** — 2026-05-15 (Implementation Phase 2)

## Context

Doc đề "レスポンシブまたはPWA" với option ネイティブアプリ化を検討. Mobile users primarily:
- 現場監督: photo capture, inspection, schedule check, chat
- 職人: schedule view, photo upload, chat
- 経営層 (occasional): dashboard view

Phase 2 launches mobile features. Phase 1 desktop-only acceptable for back-office user.

## Options

### Option A: PWA only — Chosen for Phase 2
- **Pros**: 1 codebase React (ADR-003); no app store friction; auto-update; cost-effective
- **Cons**: iOS PWA limitations:
  - Web Push only iOS 16.4+ (March 2023); pre-16.4 device cannot receive push
  - "Add to Home Screen" UX clunky
  - Background sync limited

### Option B: PWA Phase 2 + Native wrap (Capacitor) Phase 3
- **Pros**: Single codebase; native distribution channel; full push
- **Cons**: +2-3 sprint Phase 3; app store review cycles

### Option C: Native (React Native / Flutter) từ đầu
- **Pros**: Best UX; full native API
- **Cons**: Separate codebase; +30-50% effort

## Decision

**Option A — PWA only for Phase 2**. Native wrap option remains open for Phase 3+ if pain points emerge.

### PWA implementation

**Tech**:
- vite-plugin-pwa + Workbox
- Service worker với precaching cho app shell + runtime caching cho API
- Web App Manifest with icons (multiple sizes), screenshots, theme color
- Background Sync API cho photo upload queue (ADR-011)

**Features supported**:
- Install to home screen (Android Chrome, iOS Safari)
- Offline app shell (cached UI shell loads even offline)
- Photo capture via `<input type="file" accept="image/*" capture="environment">`
- GPS via Geolocation API (request on-demand, not on load)
- Camera direct via getUserMedia (electronic chalkboard composition Phase 2)

**Push notification approach**:
- **Android Chrome**: Web Push (VAPID) → full support
- **iOS 16.4+**: Web Push supported
- **iOS <16.4**: Email fallback (don't promise push to user)
- Towa target audience: iOS minimum 15 per doc, but most likely 16+ in 2026 → coverage acceptable

### Browser support per doc
- Chrome latest + 1 prev: ✅ full PWA
- Edge latest + 1 prev: ✅ (Chromium-based)
- Safari latest + 1 prev (iOS 15+): ⚠️ limited PWA on iOS <16.4
- Android 10+: ✅

## Consequences

### Positive
- Single codebase, single deploy
- No app store review friction
- Auto-update by reload

### Negative
- iOS PWA experience inferior to native (acknowledged)
- Native API gaps: deep camera control, NFC, background geo not available

### Future trigger to revisit native
- If Towa demands App Store presence
- If iOS PWA limitations block field user adoption
- If push notification reliability becomes critical

### Phase 1 impact
- Service worker / PWA setup NOT needed Phase 1 (desktop-only Phase 1)
- Plan PWA infra during Phase 2 sprint 1

## References

- Doc §4.6, §5.5
- Assessment Q3.1
- Related: ADR-003 (React), ADR-011 (Offline)
