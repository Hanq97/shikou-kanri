# ADR-016: 2FA Policy

## Status
**ACCEPTED** — 2026-05-15

## Context

Doc allows 2FA as optional. User decision: optional for all + mandatory for システム管理者 role.

Reasoning:
- システム管理者 controls: user mgmt, role assignment, audit log access, backup restore, master data
- Compromise of admin account = catastrophic
- Other roles (社員, 招待ユーザー) lower blast radius; optional 2FA acceptable

## Options

### Option A: All optional (doc default)
- Simplest UX; risk admin compromise

### Option B: Optional all + Mandatory admin — Chosen
- Tiered protection; balance UX vs security

### Option C: Mandatory all
- Strongest; but 職人/協力業者 may struggle with TOTP setup

## Decision

**Option B — Optional cho all + Mandatory cho システム管理者**.

### Implementation

**TOTP-based** (RFC 6238):
- Compatible with: Google Authenticator, 1Password, Authy, Microsoft Authenticator
- No SMS dependency (avoids SMS cost + SIM-swap risk)

**Enrollment flow**:
1. User → Settings → Enable 2FA
2. Server generates secret + QR code (otpauth URI)
3. User scans into authenticator app
4. User confirms first TOTP code
5. Server generates 10 backup codes (one-time use); display once; user saves
6. 2FA active for that user

**Verification flow**:
- After password success → 2FA challenge if enabled
- Accept TOTP code OR backup code
- Backup code marked used after consumption

**Admin enforcement**:
- Role = system_admin → 2FA enrollment required on first login (block dashboard access until enrolled)
- Admin loses TOTP device → another admin can disable 2FA (audit logged); if last admin → email-based recovery flow with extra verification (manual DEHA support)

**Account lockout**:
- 5 failed TOTP attempts → 30-min lockout, force password re-entry
- Trigger admin notification on suspected brute force

### Phase plan
- Phase 1: Implement TOTP enrollment, verification, backup codes
- No SMS, no FIDO/WebAuthn (defer; can add Phase 2+ if needed)

### Recovery flow
- Lost device + lost backup codes → escalate to another admin or DEHA support
- DEHA can disable 2FA on user account after verifying identity (out-of-band: email + phone)

## Consequences

### Positive
- Significantly raises bar for admin account compromise
- Standard, mature technology; no vendor lock-in
- No SMS cost

### Negative
- Admins need to setup authenticator app (1-time)
- Recovery flow has manual touchpoint (acceptable for low-frequency event)

### UX consideration
- Clear messaging: "2FA is required for system administrators to protect Towa's data"
- Optional 2FA for others: prompt during onboarding but allow skip
- "Remember this device 30 days" option (cookie-based) for UX comfort

## References

- Doc §4.3
- Assessment Q5.2
- Related: ADR-015 (Identity)
