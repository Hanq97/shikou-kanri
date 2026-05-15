# 06 — Security Architecture

**Version**: 1.0 — 2026-05-15
**Refer to**: ADR-015 (Identity), ADR-016 (2FA), ADR-017 (電帳法), Stakeholder Roles Catalog

---

## 1. Mục đích

Mô tả strategy bảo mật: authentication, authorization, encryption, compliance, threat model, operational security.

---

## 2. Threat model (highlights)

| Threat | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Stolen user credential | Account takeover | Med | Strong password + 2FA admin-mandatory; rate limit; alert on suspicious login |
| Insider misuse | Data exfiltration | Low-Med | Audit log; role separation; access review quarterly |
| SQL injection | DB compromise | Low | Prisma ORM parameterized; no raw SQL with user input |
| XSS | Session hijack | Low-Med | Output encoding by React; CSP header; HttpOnly cookies for token |
| CSRF | Unauthorized actions | Low | Token in Authorization header (not cookie alone); SameSite cookie |
| Stolen mobile device with offline data | Local data exfiltration | Low | Local app PIN (Phase 2+ option); short session timeout |
| 招待ユーザー privilege escalation | Cross-project data access | Med | Per-project ACL strictly enforced at service layer; resource-based authorization tests |
| API rate abuse | DoS / cost | Med | Rate limit per IP + per user; WAF rules |
| Public link leakage (signed URL) | Sensitive file access | Low | Short TTL (5min-1h); single-use option for very sensitive docs |
| Supply chain compromise (npm) | Backdoor | Med | npm audit weekly; Snyk; lockfile; private npm proxy considered |
| Stolen AWS credential | Infrastructure compromise | Low | OIDC for CI/CD (no long-lived keys); IAM least-privilege; GuardDuty |
| Region failure | Service unavailable | Low | DR per ADR-013 |
| Prompt injection (Phase 3) | AI misuse | Med | Input sanitization; tool restriction; human-in-loop |

---

## 3. Authentication (Phase 1 → Phase 2)

### 3.1 Phase 1: Email + Password
- Password requirements (per ADR-015): min 12 chars, upper+lower+digit+symbol
- Hash: Argon2id (preferred) or bcrypt cost 12+
- Account lockout: 5 failed attempts → 15-min lockout + alert
- Password reset: signed email link, 1h expiry, single-use, invalidates current sessions

### 3.2 Phase 2: SSO addition
- Google Workspace (assumed) via OIDC
- Account linking: existing user with verified Google email auto-link on first SSO
- Local password fallback retained for break-glass
- Admin policy: can force user to SSO-only (disable local password)

### 3.3 Session management
- Access token: JWT, RS256-signed, 30-min lifetime (per doc §4.3)
- Refresh token: opaque + DB-stored (hashed), 7-day lifetime, rotates on use, revocable
- Token storage: HttpOnly Secure SameSite=Lax cookie (preferred over localStorage)
- Token revocation: stored revocation list; checked on each refresh

### 3.4 2FA (TOTP per ADR-016)
- Required for `system_admin` role
- Optional for other roles
- Backup codes: 10 one-time-use codes generated at enrollment
- Lost device recovery: admin-assisted (out-of-band identity verification)

---

## 4. Authorization

### 4.1 Tiered model (per ADR-001 + stakeholder catalog)

**Tier 1 — Role-based (RBAC)**
- 4 roles: `system_admin`, `manager`, `employee`, `invited`
- Decorator: `@Roles('system_admin', 'manager')`
- Checked at controller via `RolesGuard`

**Tier 2 — Resource-based**
- Per-project ACL for 招待ユーザー
- `@ProjectMembership('projectId')` guard checks `project_members` table
- Service-layer additional check: `await this.canAccess(user, resource)` for fine-grained logic

**Tier 3 — Folder visibility**
- Within project, folders have `is_public_for_invited` flag (F3-06)
- Photo/drawing queries filter by folder visibility for invited users

### 4.2 Permission matrix
See `stakeholder-roles.md` catalog for full matrix.

### 4.3 Implementation pattern
```typescript
@Get('projects/:projectId/photos')
@UseGuards(AuthGuard, RolesGuard, ProjectMembershipGuard)
@Roles('system_admin', 'manager', 'employee', 'invited')
async listPhotos(
  @Param('projectId') projectId: string,
  @CurrentUser() user: AuthenticatedUser,
): Promise<PhotoDto[]> {
  // Service applies folder visibility filter for invited
  return this.photoService.listForProject(projectId, user);
}
```

### 4.4 Permission audit
- Every grant/revoke of role or project membership → audit log
- Quarterly admin reviews: list all `system_admin` users; verify still needed

---

## 5. Data protection

### 5.1 Encryption at rest
- RDS: AES-256 transparent (KMS-managed key)
- S3: SSE-S3 default; SSE-KMS optional for sensitive folders (`documents/`)
- ElastiCache: in-transit + at-rest encryption enabled
- EBS volumes (if any): encrypted

### 5.2 Encryption in transit
- TLS 1.2+ everywhere (TLS 1.3 preferred)
- ACM certificates for public ALB + CloudFront
- VPC endpoints for AWS services to keep traffic in AWS network
- Internal: TLS via service mesh OR private subnet only (no internal certs Phase 1)

### 5.3 PII handling
- PII identifiers per JP APPI: 氏名, 連絡先, 住所, メール, photo of person
- DB storage: encrypted at rest (RDS); optionally column-level (post-Phase 1 if needed)
- Logs: PII fields redacted (Pino redaction config)
- Export feature: only authorized roles; logged in audit
- Right to deletion: implement on user request flow (per APPI requirement)

### 5.4 Secrets
- Storage: AWS Secrets Manager (with rotation policy where supported)
- Access: app's IAM role; no human direct access in prod
- Rotation cadence:
  - DB password: 90 days (auto-rotation supported)
  - JWT signing key: 180 days (manual; coordinate with token expiry)
  - API keys (3rd party): per vendor policy
- No secrets in:
  - Git repository
  - Build artifacts / Docker images
  - Frontend code (obviously)
  - Logs (redaction)

### 5.5 Backup encryption
- RDS snapshots: encrypted with same KMS key
- S3 cross-region replicated objects: re-encrypted in destination with destination KMS key

---

## 6. Network security

### 6.1 VPC topology
- Custom VPC, 2 AZs (ap-northeast-1a, 1c)
- Public subnets: ALB only
- Private subnets (App): ECS Fargate tasks
- Private subnets (Data): RDS, ElastiCache (no internet access)
- NAT Gateway for outbound (to SES, Bedrock, etc.)
- VPC Endpoints for: S3, ECR, Secrets Manager, CloudWatch, Bedrock (Phase 3)

### 6.2 Security groups
- Principle: deny by default, allow explicit
- ALB SG: 443 from 0.0.0.0/0
- App SG: from ALB SG only (port 3000)
- DB SG: 5432 from App SG only
- Redis SG: 6379 from App SG only

### 6.3 WAF rules (AWS WAF on ALB)
- AWS Managed Core rule set
- AWS Managed Known Bad Inputs
- Rate-based rule: 2000 requests/5min per IP → block 1h
- Geo-block: optionally allow only Japan + DEHA's Vietnam office IPs (consider if appropriate)
- Admin endpoints: additional IP allowlist (optional per doc §4.3)

### 6.4 DDoS
- AWS Shield Standard (auto-enabled for ALB + CloudFront)
- Consider Shield Advanced if Towa requires SLA on availability under attack

---

## 7. Application security

### 7.1 Input validation
- All inputs validated via DTO + class-validator/Zod
- Reject early; reject deep (validate nested structures)
- File uploads: MIME check + extension check + magic byte check + size limit

### 7.2 Output encoding
- React JSX auto-escapes HTML
- No `dangerouslySetInnerHTML` allowed (lint rule)
- API responses are structured JSON; no HTML embedded

### 7.3 CSP & security headers
- Content-Security-Policy: strict; allow self + CloudFront + Bedrock domains (Phase 3)
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY (or CSP frame-ancestors)
- Referrer-Policy: strict-origin-when-cross-origin

### 7.4 Cookie security
- HttpOnly, Secure, SameSite=Lax (Strict for sensitive)
- Domain scoped narrowly
- No long-lived persistent cookies for sensitive tokens

### 7.5 API rate limiting
- @nestjs/throttler with ElastiCache backing
- Per-IP: 100 req/min
- Per-user (authenticated): 300 req/min
- Endpoint-specific: login = 10 req/min/IP

### 7.6 File upload security
- Pre-signed URL for direct-to-S3 (avoids loading file through app memory)
- Server-side validation of file via S3 event → Lambda (MIME, magic byte, size)
- Quarantine pattern: upload to staging bucket, validate, then move to live bucket
- Optional: anti-virus scanning via ClamAV-based Lambda layer (Phase 2+ if needed)

---

## 8. Compliance

### 8.1 個人情報保護法 (APPI)
- Lawful basis: contractual necessity (Towa contract)
- Purpose specification: documented in privacy policy + system
- Data minimization: only necessary PII collected
- Subject rights:
  - Access: customer can request their data export (manual process Phase 1; portal Phase 3+)
  - Deletion: implement deletion workflow with retention exception for legal records
  - Correction: customer can request via Towa staff who updates in system
- Data sharing: subprocessor disclosure (AWS as processor); DPA in place
- Cross-border transfer: AWS Tokyo only — no transfer; (DEHA Vietnam team accesses for support — covered by contract)

### 8.2 電子帳簿保存法 (per ADR-017)
- Quote/contract: 訂正削除履歴 + 検索要件 (取引年月日, 金額, 取引先) implemented
- Retention: 10 years for financial records
- Immutability: append-only version table; no UPDATE
- Visibility: render any version on screen, printable

### 8.3 瑕疵担保責任 (Defect Liability Law)
- 検査記録 retained 10+ years (Phase 2 feature F5)
- Quote + contract retention covers period

### 8.4 建設業の働き方改革 (2024年問題)
- Indirectly addressed via efficiency (automation reduces overtime)
- Phase 2+: optional 工数記録 feature if Towa requests

### 8.5 Audit requirements
- All financial-related operations audited
- Audit retention: 2 years per doc (extendable)
- Audit log immutable (Phase 2+: optionally S3 Object Lock for WORM)

---

## 9. Operational security (DevSecOps)

### 9.1 Dependency management
- npm audit on every CI run
- Snyk free tier (or Dependabot) for vulnerability scanning
- Lockfile committed and verified
- Renovate bot for upgrade PRs (weekly)
- Critical CVE in production → patch within 24-48h

### 9.2 Container security
- Base image: official Node.js slim (or distroless for production)
- Non-root user in container
- Trivy scan in CI for image vulnerabilities
- ECR scan-on-push enabled

### 9.3 IaC security
- Terraform/CDK code reviewed
- tfsec / cdk-nag for misconfiguration detection
- Drift detection: weekly

### 9.4 Access management
- IAM: least-privilege per role
- No shared credentials
- MFA required for AWS Console access
- Production access: just-in-time elevation (e.g., AWS SSO + permission sets); audit logged

### 9.5 Incident response
- IR runbook documented
- Roles: incident commander, comms lead, engineer
- Communication channel: dedicated Slack channel + status page
- Forensic preservation: snapshot affected systems before remediation
- Post-incident: blameless retro + action items

---

## 10. Phase 3 AI-specific security

### 10.1 AI data handling (per ADR-019)
- All AI inference via AWS Bedrock — data within AWS network (VPC endpoint)
- DPA in place; no-training opt-out
- AI prompts logged for audit (PII redacted in logs)

### 10.2 Prompt injection mitigation
- User input sanitized before context insertion
- System prompts versioned and reviewed
- Tool/function calling restricted to safe operations
- Output schema validation (JSON mode + Zod)

### 10.3 AI output verification
- Human-in-the-loop bắt buộc for quote suggestion (per doc + ADR-021)
- Confidence threshold for OCR results (auto-accept only if high confidence)

---

## 11. Security review cadence

| Activity | Frequency | Owner |
|---|---|---|
| Dependency audit | Weekly (auto), Quarterly (manual) | Dev team |
| Pen test | Annual (per doc §7) | External vendor |
| Access review (IAM + app roles) | Quarterly | DEHA security lead |
| DR drill | Quarterly | DEHA ops |
| Security training | Annual + onboarding | Both Towa and DEHA |
| Threat model review | Major release | Architect + security |
| WAF rule review | Quarterly | Ops |

---

## 12. Related documents

- [01 — System Architecture](./01-system-architecture.md)
- [04 — Database Design](./04-database-design.md)
- [05 — Backend Architecture](./05-backend-architecture.md)
- [07 — Deployment Architecture](./07-deployment-architecture.md)
- Stakeholder Roles: `architect/catalogs/stakeholder-roles.md`
- ADRs 015, 016, 017, 019
