# Test Plan Micro-Agent: Security Tests
# テスト計画マイクロエージェント：セキュリティテスト
# Micro-Agent Kế Hoạch Kiểm Thử: Kiểm Thử Bảo Mật

**Version**: 1.0.0
**Section**: 8. Kiểm thử bảo mật (Security Tests)
**Output Lines**: ~170 lines
**Purpose**: Generate security test specifications for authentication, authorization, and OWASP Top 10
**Specialist**: tps-java-security.md

---

## Responsibility

Generate Section 8 of Test Plan containing:
- 8.1 Kiểm thử xác thực (Authentication Tests) — ST-AUTH-[###]
- 8.2 Kiểm thử phân quyền (Authorization Tests) — ST-AUTHZ-[###]
- 8.3 Kiểm thử injection (Input Validation Tests) — ST-INJ-[###], ST-XSS-[###]

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| SRS | `documents/features/{dir}/{feature}-*-srs.md` | YES |
| Backend DD | `documents/features/{dir}/{feature}-*-backend-detail-design.md` | Optional (auth sections) |
| Stack vars | Step 0.5 (Keycloak 26.x, Spring Security Reactive) | YES |
| context_level | Step 2 | YES |
| test_id_counters | From tp-07 (last perf IDs) | YES |

---

## Specialist Loading

```pseudo
security_spec = read_file("specialists/code/java-springboot/test-plan/tps-java-security.md")
```

**WHY**: Security specialist provides Keycloak 26.x OIDC + OWASP Top 10 + multi-tenant isolation patterns specific to reactive Spring Boot.

---

## RAG Integration

```pseudo
try:
    rag = HippoRAGService.getInstance(feature, branch)
    sec_rag = await rag.queryWithArchitecture(
        "security authentication keycloak owasp authorization multi-tenant",
        { stereotype: "Security", topK: 3 })
except:
    sec_rag = None  # non-blocking
```

**WHY**: RAG surfaces actual security configuration (SecurityWebFilterChain, Keycloak realm config, multi-tenant filter) for grounded test cases.

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK**:
1. What authentication mechanism? (Keycloak 26.x OIDC JWT)
2. What roles exist? (realm roles + client roles from SRS/DD)
3. What OWASP Top 10 categories apply? (SQL Injection, XSS, Broken Auth, etc.)
4. What multi-tenant isolation requirements? (TntMTenant scoped queries)
5. What NORMAL security checks? (valid JWT, correct roles, secure headers)
6. What ABNORMAL scenarios? (expired token, wrong role, injection, CSRF, SSRF)

**REASON**:
- IF DD has auth sections → extract role definitions and endpoint security
- IF RAG found security config → use actual SecurityWebFilterChain patterns
- IF multi-tenant → MUST include cross-tenant access test
- IF scope includes frontend → include CSRF and XSS front-end tests
- ALWAYS cover OWASP Top 10 with at least 1 test per category

**VALIDATE CONSTRAINTS**:
- [ ] ST-AUTH, ST-AUTHZ, ST-INJ, ST-XSS IDs
- [ ] OWASP Top 10 coverage
- [ ] Multi-tenant isolation tested
- [ ] Vietnamese >= 60%

### Step 2: GENERATE SECTION

```markdown
## 8. Kiểm thử bảo mật (Security Tests)

### 8.1 Kiểm thử xác thực (Authentication Tests)

**Cơ chế**: Keycloak 26.x OIDC (JWT Bearer Token)

| Test ID | Loại | Mô tả (Test Case) | Kết quả mong đợi | Ưu tiên |
|---------|------|-------------------|-------------------|---------|
| ST-AUTH-001 | Normal | Đăng nhập với token hợp lệ | 200 OK, access granted | P0 |
| ST-AUTH-002 | Abnormal | Đăng nhập không có token | 401 Unauthorized | P0 |
| ST-AUTH-003 | Abnormal | Token hết hạn | 401 Unauthorized | P0 |
| ST-AUTH-004 | Abnormal | Token bị sửa đổi (tampered) | 401 Unauthorized | P0 |
| ST-AUTH-005 | Abnormal | Brute force đăng nhập (>5 lần sai) | 429 Too Many Requests / account lock | P1 |

### 8.2 Kiểm thử phân quyền (Authorization Tests)

| Test ID | Loại | Mô tả (Test Case) | Kết quả mong đợi | Ưu tiên |
|---------|------|-------------------|-------------------|---------|
| ST-AUTHZ-001 | Normal | ADMIN truy cập API admin | 200 OK | P0 |
| ST-AUTHZ-002 | Abnormal | USER truy cập API admin | 403 Forbidden | P0 |
| ST-AUTHZ-003 | Abnormal | Tenant A truy cập dữ liệu Tenant B | 403 Forbidden / empty result | P0 |
| ST-AUTHZ-004 | Abnormal | Mass assignment (thêm role trong body) | Field bị bỏ qua | P1 |

### 8.3 Kiểm thử injection và bảo mật dữ liệu (Input Validation & Data Security)

**Tiêu chuẩn**: OWASP Top 10 (2021)

| Test ID | Loại | Lỗ hổng (Vulnerability) | Mô tả | Kết quả mong đợi | Ưu tiên |
|---------|------|------------------------|-------|-------------------|---------|
| ST-INJ-001 | Abnormal | SQL Injection | Input: `'; DROP TABLE--` | Query xử lý literal, không ảnh hưởng DB | P0 |
| ST-XSS-001 | Abnormal | XSS (Stored) | Input: `<script>alert('xss')</script>` | HTML escaped, CSP block | P0 |
| ST-INJ-002 | Abnormal | SSRF | Input: `http://localhost:8080/admin` | URL validation chặn | P1 |
| ST-INJ-003 | Abnormal | Sensitive Data Exposure | Kiểm tra logs, response | PII masked, no internal errors exposed | P0 |

**Kiểm tra header bảo mật (Security Headers)**:

| Header | Giá trị mong đợi | Ưu tiên |
|--------|-----------------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains | P0 |
| Content-Security-Policy | [appropriate policy] | P1 |
| X-Frame-Options | DENY or SAMEORIGIN | P1 |
| X-Content-Type-Options | nosniff | P1 |
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1**: All OWASP Top 10 categories covered with at least 1 test case?
**Q2**: Multi-tenant isolation tests present (cross-tenant = abnormal)?
**Q3**: Vietnamese >= 60%?
**Q4**: No implementation code?

### Step 4: VALIDATION

- [ ] 3 sub-sections (8.1 Auth, 8.2 Authz, 8.3 Input Validation)
- [ ] Keycloak 26.x OIDC referenced
- [ ] OWASP Top 10 coverage
- [ ] Multi-tenant isolation (Tenant A → Tenant B = blocked)
- [ ] Security headers checklist
- [ ] Rate limiting / brute force tested
- [ ] Normal AND Abnormal present
- [ ] ≤ 170 lines

---

## Output Format

See Step 2 template above.

---

## Quality Standards

- **Completeness**: Authentication + Authorization + OWASP covered
- **Accuracy**: Keycloak 26.x (not generic OAuth), Spring Security Reactive
- **Normal/Abnormal**: Valid access AND all attack vectors
- **Language**: Vietnamese-first ≥60%
- **Prohibited**: Zero implementation code

---

*Test Plan Micro-Agent tp-08 | Security Tests | EPS v3.2*
