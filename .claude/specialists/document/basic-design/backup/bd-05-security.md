# BD Security Design Micro-Agent / セキュリティ設計マイクロエージェント

**Responsibility**: Generate Section 5 (Security Design) of Basic Design
**Output Lines**: 60-80 lines
**Dependencies**: SRS security requirements, bd-04-interface-design.md

---

## Input Requirements

- Evidence file path (absolute)
- SRS file path (for security requirements)
- Interface design (from bd-04)
- Feature code (e.g., "CMN015002")
- Security specifications (from evidence)

---

## Processing Logic

### Step 1: Load Evidence, SRS, and Interface Design

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
interface_design = read_file(interface_file_path)
security_reqs = extract_security_requirements(srs)
auth_specs = extract_authentication(interface_design)
```

**Extract:**
- Authentication mechanisms
- Authorization rules
- Data encryption
- Security compliance
- Audit logging

### Step 2: Structure Security Design

**5.1 認証設計 / Authentication Design**
- Authentication mechanism
- SSO integration
- Session management

**5.2 認可設計 / Authorization Design**
- Role-based access control (RBAC)
- Permission management
- Resource-level authorization

**5.3 データ保護 / Data Protection**
- Data encryption (at rest & in transit)
- Sensitive data handling
- PII protection

**5.4 セキュリティ監査 / Security Audit**
- Audit logging
- Security monitoring
- Compliance tracking

**5.5 セキュリティ対策 / Security Measures**
- OWASP Top 10 mitigation
- Input validation
- Output encoding

### Step 3: Map Security Requirements

**Traceability:**
- NFR security requirements → Security measures
- Regulatory constraints → Compliance controls
- OWASP guidelines → Implementation

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] All security measures from SRS NFRs?
- [ ] Authentication from evidence/constraints?
- [ ] Compliance requirements from regulatory section?
- [ ] No assumed security measures?

**Q2: Consistency?**
- [ ] Aligns with interface authentication (Section 4)?
- [ ] Follows security best practices?
- [ ] Meets regulatory requirements?
- [ ] No security conflicts?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] Headers bilingual (日本語 / Vietnamese)?
- [ ] Security measure descriptions bilingual?
- [ ] Threat descriptions bilingual?
- [ ] Security terms in English?

**Q4: No Prohibited Content?**
- [ ] No actual encryption keys/secrets?
- [ ] No detailed implementation code?
- [ ] Security design only?
- [ ] High-level measures only?

---

## Output Template

```markdown
## 5. セキュリティ設計 / Thiết kế bảo mật (Security Design)

### 5.1 認証設計 / Thiết kế xác thực (Authentication Design)

#### 5.1.1 認証メカニズム / Authentication Mechanism

**方式 / Method:**
OAuth 2.0 / OpenID Connect (Keycloak)

**フロー / Flow:**
```
1. ユーザーがログインページにアクセス / User access login page
2. Keycloakにリダイレクト / Redirect to Keycloak
3. ユーザーが認証情報入力 / User enter credentials
4. Keycloakがトークン発行 / Keycloak issue token
5. アプリケーションがトークン受取 / App receive token
6. トークンでAPI呼出 / Call API with token
```

**トークンタイプ / Token Types:**
- **Access Token**: JWT形式、有効期限30分 / JWT format, 30 min expiry
- **Refresh Token**: 有効期限24時間 / 24 hour expiry
- **ID Token**: ユーザー情報含む / Contains user info

**トークン検証 / Token Validation:**
- 署名検証 (RS256) / Signature validation
- 有効期限チェック / Expiration check
- 発行者検証 / Issuer validation

---

#### 5.1.2 SSO統合 / SSO Integration

**SSO方式 / SSO Method:**
Keycloak Single Sign-On

**サポート認証プロバイダー / Supported Auth Providers:**
- Keycloak (Primary)
- LDAP/AD (Enterprise)
- SAML 2.0 (Future)

**セッション管理 / Session Management:**
- セッションタイムアウト: 30分 / Session timeout: 30 min
- アイドルタイムアウト: 15分 / Idle timeout: 15 min
- Remember Me: 7日間 / 7 days

---

### 5.2 認可設計 / Thiết kế phân quyền (Authorization Design)

#### 5.2.1 ロールベースアクセス制御 (RBAC)

**ロール定義 / Role Definition:**

| ロール / Role | 説明 / Description | 権限 / Permissions |
|-------------|------------------|----------------|
| ADMIN / 管理者 / Quản trị viên | システム管理者 / System administrator | 全機能アクセス / Full access |
| USER / ユーザー / Người dùng | 一般ユーザー / Regular user | 読取・実行 / Read & execute |
| APPROVER / 承認者 / Người phê duyệt | 承認担当者 / Approver | 承認操作 / Approval operations |
| VIEWER / 閲覧者 / Người xem | 閲覧のみ / View only | 読取のみ / Read only |

---

#### 5.2.2 権限マトリックス / Permission Matrix

| リソース / Resource | ADMIN | USER | APPROVER | VIEWER |
|------------------|-------|------|----------|--------|
| Workflow作成 / Create | ✅ | ❌ | ❌ | ❌ |
| Workflow編集 / Edit | ✅ | ❌ | ❌ | ❌ |
| Workflow閲覧 / View | ✅ | ✅ | ✅ | ✅ |
| Workflow実行 / Execute | ✅ | ✅ | ✅ | ❌ |
| Workflow削除 / Delete | ✅ | ❌ | ❌ | ❌ |
| 承認操作 / Approve | ✅ | ❌ | ✅ | ❌ |

---

#### 5.2.3 リソースレベル認可 / Resource-Level Authorization

**実装方式 / Implementation:**
- Spring Security Method Security
- アノテーションベース / Annotation-based

**認可チェック / Authorization Check:**
```java
// Example structure (no implementation)
@PreAuthorize("hasRole('ADMIN')")
@PreAuthorize("hasPermission(#id, 'Workflow', 'WRITE')")
```

**所有権チェック / Ownership Check:**
- ユーザーは自分のワークフローのみ編集可能 / User can edit only own workflows
- 管理者は全ワークフローを編集可能 / Admin can edit all workflows

---

### 5.3 データ保護 / Bảo vệ dữ liệu (Data Protection)

#### 5.3.1 データ暗号化 / Data Encryption

**転送中の暗号化 / Encryption in Transit:**
- **プロトコル / Protocol**: TLS 1.3
- **暗号スイート / Cipher Suite**: ECDHE-RSA-AES256-GCM-SHA384
- **証明書 / Certificate**: Let's Encrypt (Auto-renewal)

**保存時の暗号化 / Encryption at Rest:**
- **データベース / Database**: PostgreSQL Transparent Data Encryption (TDE)
- **アルゴリズム / Algorithm**: AES-256
- **キー管理 / Key Management**: AWS KMS / Cloud KMS

**フィールドレベル暗号化 / Field-Level Encryption:**
- 個人情報 (PII): 氏名、メールアドレス / Name, email
- 機密情報: パスワードハッシュ / Password hash

---

#### 5.3.2 機密データ処理 / Sensitive Data Handling

**PII (個人識別情報) / Personally Identifiable Information:**

| データ種類 / Data Type | 暗号化 / Encryption | マスキング / Masking | 保持期間 / Retention |
|-------------------|----------------|-----------------|-----------------|
| 氏名 / Name | ✅ | ❌ | 5年 / 5 years |
| メールアドレス / Email | ✅ | 部分 / Partial | 5年 / 5 years |
| 電話番号 / Phone | ✅ | 部分 / Partial | 5年 / 5 years |
| IPアドレス / IP Address | ❌ | ✅ | 1年 / 1 year |

**データマスキング / Data Masking:**
```
Email: user@example.com → u***@example.com
Phone: 090-1234-5678 → 090-****-5678
```

---

#### 5.3.3 データ削除・匿名化 / Data Deletion & Anonymization

**削除ポリシー / Deletion Policy:**
- 論理削除 (Soft Delete): deleted_at フラグ / flag
- 物理削除: 保持期間経過後 / After retention period
- 完全削除リクエスト: GDPR/PDPA準拠 / GDPR/PDPA compliant

**匿名化 / Anonymization:**
- 個人情報の仮名化 / Pseudonymization
- 統計データ作成時 / For statistical data

---

### 5.4 セキュリティ監査 / Kiểm toán bảo mật (Security Audit)

#### 5.4.1 監査ログ / Audit Logging

**ログ対象イベント / Logged Events:**

| イベント / Event | ログレベル / Level | 保存内容 / Content |
|---------------|---------------|---------------|
| ログイン成功/失敗 / Login success/failure | INFO/WARN | ユーザーID、IP、時刻 / User ID, IP, timestamp |
| データ作成/更新/削除 / CRUD operations | INFO | ユーザー、リソース、変更内容 / User, resource, changes |
| 権限エラー / Authorization error | WARN | ユーザー、リソース、試行操作 / User, resource, attempted action |
| システムエラー / System error | ERROR | エラー内容、スタックトレース / Error, stack trace |

**ログ形式 / Log Format:**
```json
{
  "timestamp": "2025-12-20T10:30:00Z",
  "userId": "user123",
  "action": "CREATE_WORKFLOW",
  "resource": "workflows/123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "result": "SUCCESS",
  "details": {...}
}
```

**ログ保存期間 / Log Retention:**
- 監査ログ / Audit logs: 1年 / 1 year
- アクセスログ / Access logs: 3ヶ月 / 3 months
- エラーログ / Error logs: 6ヶ月 / 6 months

---

#### 5.4.2 セキュリティモニタリング / Security Monitoring

**監視項目 / Monitoring Items:**
- 不正ログイン試行 / Failed login attempts
- 異常なAPIアクセスパターン / Abnormal API access patterns
- 権限昇格の試み / Privilege escalation attempts
- データ流出の兆候 / Data exfiltration signs

**アラート設定 / Alert Configuration:**
- ログイン失敗5回以上 / 5+ failed logins → アカウントロック / Account lock
- 異常なデータ量転送 / Abnormal data transfer → 管理者通知 / Admin notification

---

### 5.5 セキュリティ対策 / Các biện pháp bảo mật (Security Measures)

#### 5.5.1 OWASP Top 10対策 / OWASP Top 10 Mitigation

| 脆弱性 / Vulnerability | 対策 / Mitigation | 実装方法 / Implementation |
|-------------------|--------------|---------------------|
| A01: アクセス制御の不備 / Broken Access Control | RBAC実装 / RBAC implementation | Spring Security |
| A02: 暗号化の失敗 / Cryptographic Failures | TLS 1.3、AES-256 | TLS config, DB encryption |
| A03: インジェクション / Injection | パラメータ化クエリ / Parameterized queries | JPA, PreparedStatement |
| A04: 安全でない設計 / Insecure Design | セキュリティレビュー / Security review | Design review process |
| A05: セキュリティ設定ミス / Security Misconfiguration | セキュリティヘッダー / Security headers | Spring Security config |
| A07: 認証の失敗 / Identification and Authentication Failures | 多要素認証 (MFA) / Multi-factor auth | Keycloak MFA |
| A08: データ整合性の不備 / Software and Data Integrity Failures | 署名検証 / Signature validation | JWT signature verification |
| A09: ログ・監視の不備 / Security Logging and Monitoring Failures | 監査ログ / Audit logging | Centralized logging |
| A10: SSRF | URL検証 / URL validation | Whitelist validation |

---

#### 5.5.2 入力検証 / Input Validation

**検証項目 / Validation Items:**
- 型チェック / Type validation
- 長さチェック / Length validation
- 形式チェック / Format validation (Regex)
- 許可リスト / Whitelist validation

**サニタイゼーション / Sanitization:**
- HTMLエスケープ / HTML escape
- SQLインジェクション対策 / SQL injection prevention
- XSS対策 / XSS prevention

---

#### 5.5.3 セキュリティヘッダー / Security Headers

**HTTPセキュリティヘッダー / HTTP Security Headers:**
```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

### 5.6 コンプライアンス / Tuân thủ (Compliance)

**準拠法規 / Compliance Standards:**
- GDPR (General Data Protection Regulation)
- PDPA (Personal Data Protection Act) - Vietnam
- OWASP Top 10
- ISO 27001 (Future)

**データ保護要件 / Data Protection Requirements:**
- データ主体の権利 / Data subject rights
- 同意管理 / Consent management
- データポータビリティ / Data portability
- 忘れられる権利 / Right to be forgotten

---

### 5.7 セキュリティ設計サマリー / Security Design Summary

| 項目 / Item | 実装 / Implementation | 準拠 / Compliance |
|---------|------------------|----------------|
| 認証 / Authentication | OAuth 2.0/OIDC | ✅ |
| 認可 / Authorization | RBAC | ✅ |
| 暗号化 (転送中) / Encryption in transit | TLS 1.3 | ✅ |
| 暗号化 (保存時) / Encryption at rest | AES-256 | ✅ |
| 監査ログ / Audit logging | 実装済 / Implemented | ✅ |
| OWASP Top 10 | 対策済 / Mitigated | ✅ |

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- SRS Reference: `[srs_file_path]` (NFR Security section)
- Interface Reference: `[interface_file_path]`
- Sections: Security Requirements, Regulatory Constraints
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All security measures from SRS NFRs
2. [ ] Authentication aligns with interface design
3. [ ] Authorization (RBAC) clearly defined
4. [ ] Encryption standards specified
5. [ ] OWASP Top 10 addressed
6. [ ] Compliance requirements met
7. [ ] Bilingual format ≥60% of content
8. [ ] No actual keys/secrets included
9. [ ] Evidence sources cited

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: BD Section 5 - Security Design*
