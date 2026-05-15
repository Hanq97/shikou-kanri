# ADR-015: Identity Provider

## Status
**ACCEPTED** — 2026-05-15

## Context

Doc requires: email/password + SSO (OAuth 2.0 / OIDC) + 2FA optional. For MVP Phase 1, user chose simpler: email/password only; SSO defer Phase 2.

## Options

### Option A: Email/password Phase 1 → SSO Phase 2 — Chosen
- Phase 1 simple; faster MVP
- Phase 2: integrate Google Workspace (likely, given Towa uses Google Drive)

### Option B: Google Workspace SSO Phase 1
- +2-3 days effort
- Risk: if Towa doesn't use Google → rework

### Option C: 3rd party IDP service (Auth0, AWS Cognito)
- Managed; rich features
- Cost; extra service to operate

## Decision

**Option A — Phase 1: Email/password native; Phase 2: SSO integration**.

### Phase 1 implementation

**Stack**:
- NestJS `@nestjs/passport` + custom `LocalStrategy` (email/pw)
- JWT via `@nestjs/jwt` for session token
- Refresh token rotation (separate table, hashed, revocable)

**Password policy**:
- Minimum 12 characters
- Must include: uppercase + lowercase + digit + symbol
- Stored: Argon2id (preferred) or bcrypt cost 12
- Reset flow: signed email link, 1h expiry, single-use

**Session strategy**:
- Access token: JWT, 30-min lifetime (doc §4.3 session timeout)
- Refresh token: 7-day lifetime, rotates on use, revocable on logout/password change
- Storage: HttpOnly secure cookie (preferred over localStorage for XSS)

**Account lifecycle**:
- Admin creates user → invitation email với set-password link (24h expiry)
- User self-reset password
- Admin disable / reactivate account (soft-delete pattern)
- No self-signup (closed system; Towa-controlled)

### Phase 2 SSO addition (planned)

**Provider**: Google Workspace (assumed; confirm with Towa)

**Implementation**:
- NestJS `@nestjs/passport` + `passport-google-oauth20` strategy
- Add OIDC flow alongside local strategy
- User table: `auth_provider` column (`local` | `google`), `external_id`
- Account linking: existing user with Google email auto-link on first SSO (with email verification)
- Fallback: local password remains for break-glass

**Configurable per-user**: admin can require SSO for specific user (no local pw login)

### 2FA
- See ADR-016 (separate decision)

## Consequences

### Positive
- Faster Phase 1 delivery (no SSO integration risk)
- Battle-tested patterns
- Phase 2 SSO additive, not disruptive

### Negative
- Users have separate password (some find it inconvenient)
- More UI surface (login, reset, change pw screens)

### Phase 2 risks
- If Towa doesn't use Google Workspace → swap to Microsoft 365 (Azure AD) — passport strategy swap, not big

## References

- Doc §4.3
- Assessment Q5.1
- Related: ADR-016 (2FA), ADR-014 (deployment ownership = DEHA manages)
