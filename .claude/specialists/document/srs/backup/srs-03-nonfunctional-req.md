# SRS Micro-Agent: Non-Functional Requirements

**Version**: 1.0.0
**Checkpoint**: C3
**Section**: 3. Non-Functional Requirements
**Output Lines**: ~200 lines
**Purpose**: Generate non-functional requirements (performance, security, reliability, scalability)

---

## Responsibility

Generate Section 3 (Non-Functional Requirements) of SRS document containing:
- NFR Categories: Performance, Security, Reliability, Scalability
- NFRs with unique IDs: NFR-[CATEGORY]-[###]
- Measurable metrics with target values
- Measurement methods

## Input Context

Required context loaded by orchestrator:
1. **Scope Level**: From Section 0 (Core/Full/Premium)
2. **Feature Code**: From environment variable `$FEATURE_CODE`
3. **Innovation Results**: From `innovation.md`
4. **Evidence Files**: From research phase
5. **Previous Sections**: Section 0-2 for context

## NFR Count by Scope Level

| Scope Level | NFR Count | Distribution |
|-------------|-----------|--------------|
| Core | 5-8 NFRs | 1-2 per category |
| Full | 12-18 NFRs | 3-5 per category |
| Premium | 25+ NFRs | 6+ per category |

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK** (Analyze before generating):
1. **Purpose**: Define measurable quality attributes (performance, security, reliability, scalability)
2. **Detail Level**: HIGH-LEVEL targets (WHAT to achieve, not HOW)
3. **Scope Level**: Check from Section 0 → determine NFR count
4. **Categories**: All 4 categories must be present (PERF, SEC, REL, SCAL)
5. **Evidence**: innovation.md, evidence files
6. **Length**: MAX 200 lines

**REASON** (Pattern Matching):
- NFRs specify TARGETS, NOT solutions
- Each NFR must be measurable with specific numbers
- Focus on quality attributes, NOT implementation technologies

**Example - CORRECT vs INCORRECT:**
```markdown
✅ NFR-PERF-001: Response time cho balance query < 50ms (P99)
   Requirement: < 50ms
   Measurement Method: P99 latency tracking

❌ NFR-PERF-001: Implement Redis caching cho balance queries
   (This is implementation detail, NOT a requirement)
```

**VALIDATE CONSTRAINTS** (Checklist):
- [ ] Purpose understood: Quality targets ✓
- [ ] Detail level: TARGETS (not solutions) ✓
- [ ] Language rules: Vietnamese-first ≥60% ✓
- [ ] Prohibited content: NO implementation details ✓
- [ ] Length target: ≤200 lines ✓
- [ ] NFR count matches scope level ✓

### Step 2: GENERATE SECTION

**Template Path:** `.claude/docs/design-standards/srs/03-non-functional-requirements.md`

Execute pseudo-code logic from template to generate section.

**Output Format:**

```markdown
## 3. Non-Functional Requirements

### 3.1 Performance Requirements

#### NFR-PERF-001: [Performance Metric Vietnamese]
**Requirement:** [Measurable target với số cụ thể]

**Measurement Method:** [Cách đo lường - tools/metrics/process]

**Target Value:** [Giá trị mục tiêu cụ thể với units]

**Context/Scope:** [Điều kiện áp dụng - load, conditions, etc.]

---

#### NFR-PERF-002: [Next performance metric...]
[...]

### 3.2 Security Requirements

#### NFR-SEC-001: [Security Requirement Vietnamese]
**Requirement:** [Tiêu chí bảo mật]

**Compliance:** [Tiêu chuẩn/Quy định - e.g., OWASP Top 10, ISO 27001]

**Measurement Method:** [Cách kiểm tra/audit]

**Context/Scope:** [Phạm vi áp dụng]

---

[More security NFRs...]

### 3.3 Reliability Requirements

#### NFR-REL-001: [Reliability Metric Vietnamese]
**Requirement:** [Tiêu chí reliability - uptime, error rate, etc.]

**Target:** [Mục tiêu cụ thể với số - e.g., 99.9% uptime]

**Measurement Method:** [Cách đo lường]

**Context/Scope:** [Điều kiện]

---

[More reliability NFRs...]

### 3.4 Scalability Requirements

#### NFR-SCAL-001: [Scalability Requirement Vietnamese]
**Requirement:** [Tiêu chí scalability - concurrent users, throughput, etc.]

**Growth Projection:** [Dự báo tăng trưởng - e.g., từ 1K → 10K users]

**Target:** [Mục tiêu cụ thể]

**Measurement Method:** [Cách đo lường]

---

[More scalability NFRs...]
```

**NFR Format Rules:**
- **ID**: NFR-[CATEGORY]-[###] (categories: PERF, SEC, REL, SCAL)
- **Title**: Vietnamese, specific metric
- **Requirement**: Measurable, specific numbers/targets
- **Measurement Method**: HOW to measure (tools, metrics, process)
- **Target Value**: Specific numbers with units (ms, %, requests/sec, etc.)

**Examples of Valid NFRs:**

**Performance:**
```markdown
NFR-PERF-001: Thời gian phản hồi cho transaction query
**Requirement:** Response time < 100ms cho 95% requests
**Measurement Method:** APM monitoring (New Relic/Datadog) - P95 latency
**Target Value:** < 100ms (P95), < 200ms (P99)
**Context/Scope:** Áp dụng cho all transaction queries với load ≤1000 req/s
```

**Security:**
```markdown
NFR-SEC-001: Mã hóa dữ liệu nhạy cảm
**Requirement:** Tất cả sensitive data phải được mã hóa at rest và in transit
**Compliance:** GDPR Article 32, ISO 27001:2013
**Measurement Method:** Security audit checklist, penetration testing
**Context/Scope:** Áp dụng cho: PII, financial data, credentials
```

**Reliability:**
```markdown
NFR-REL-001: Uptime của hệ thống
**Requirement:** Hệ thống phải available 99.9% trong tháng
**Target:** 99.9% monthly uptime (max 43 minutes downtime/month)
**Measurement Method:** Uptime monitoring tools (Pingdom/UptimeRobot)
**Context/Scope:** Measured 24/7, excluding planned maintenance windows
```

**Scalability:**
```markdown
NFR-SCAL-001: Concurrent users
**Requirement:** Hệ thống phải support 10,000 concurrent users
**Growth Projection:** Từ 1,000 users (Q1) → 10,000 users (Q4)
**Target:** 10,000 concurrent users với response time < 200ms
**Measurement Method:** Load testing (JMeter/k6) - ramp up to 10K users
```

### Step 3: SELF-CRITIQUE

**CRITICAL QUESTIONS**:

**Q1: Language Compliance?**
- [ ] ALL headings start with Vietnamese?
- [ ] Zero sentences start with English?
- **Fix**: Add Vietnamese first, move English to parentheses

**Q2: Prohibited Content?** (Implementation Details)

**CRITICAL CHECK - Targets vs Solutions:**
- [ ] Redis, PostgreSQL, MongoDB, Elasticsearch? (PROHIBITED)
- [ ] Database indexes, Query optimization strategies? (PROHIBITED)
- [ ] Caching strategies, Cache TTL values? (PROHIBITED)
- [ ] Load balancers, CDN configurations? (PROHIBITED)
- [ ] Specific frameworks/libraries? (PROHIBITED)

**Fix**: Rewrite solutions as targets:
```markdown
❌ "Implement Redis caching with 5min TTL"
✅ "Cache hit rate ≥ 90% cho frequently accessed data"

❌ "Use PostgreSQL connection pooling (max 100 connections)"
✅ "Database connection efficiency ≥ 95% (max wait time < 10ms)"

❌ "Deploy with Kubernetes horizontal pod autoscaler"
✅ "Auto-scaling response time < 60 seconds khi load tăng 50%"
```

**Q3: Measurability Check?**
- [ ] All NFRs have specific numbers/targets?
- [ ] All NFRs have measurable metrics (%, ms, req/s, etc.)?
- [ ] All NFRs have Measurement Method?
- **Fix**: Add specific numbers and measurement methods

**Q4: Content Scope?**
- [ ] All 4 categories present (PERF, SEC, REL, SCAL)?
- [ ] NFR count matches Scope Level?
- [ ] All NFRs have unique IDs (NFR-[CATEGORY]-[###])?
- [ ] Every NFR specifies WHAT to achieve (not HOW)?
- **Fix**: Add missing categories/fields, elevate HOW to WHAT

**SELF-FIX** (Iterative):
```
if violations_found:
  - Remove implementation details → measurable targets
  - Add specific numbers to vague requirements
  - Add measurement methods to all NFRs
  - Ensure all 4 categories present
  - Re-check Q1-Q4
```

### Step 4: VALIDATION

**Automated Checks**:
```bash
# Language validator
node .claude/utils/language-validator.js [DOCUMENT] --min-ratio 0.60

# Prohibited content checker
node .claude/utils/prohibited-content-checker.js [DOCUMENT] --sections 3
```

**Manual Checks**:
- [ ] NFR count trong range của Scope Level
- [ ] All 4 categories present (PERF, SEC, REL, SCAL)
- [ ] All NFRs have unique IDs (NFR-[CATEGORY]-[###])
- [ ] All NFRs have measurable metrics (Target Value với số cụ thể)
- [ ] All NFRs have Measurement Method
- [ ] Language: Vietnamese-first
- [ ] **CRITICAL**: NO implementation details (Redis caching, Database indexes, etc.)
- [ ] **CRITICAL**: Targets only, NOT solutions

**If validation FAILS**: Regenerate Section 3 (max 3 attempts)
**If validation PASSES**: ✅ Continue to Section 4

## Output Format

**Section structure** (200 lines max):
- 3.1 Performance Requirements (1-6+ NFRs depending on scope)
- 3.2 Security Requirements (1-6+ NFRs)
- 3.3 Reliability Requirements (1-6+ NFRs)
- 3.4 Scalability Requirements (1-6+ NFRs)

**NFR format**: ID, Title, Requirement, Measurement Method, Target Value, Context/Scope

## Quality Standards

- **Completeness**: All 4 categories present
- **Measurability**: All NFRs have specific numbers and measurement methods
- **NFR Count**: Matches Scope Level
- **Language**: Vietnamese-first ≥60%
- **Prohibited Content**: Zero implementation details
- **Target-Focused**: WHAT to achieve (targets), not HOW (solutions)

---

**Next Checkpoint**: C4 (Section 4: User Stories)
