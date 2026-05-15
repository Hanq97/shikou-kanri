# BDD Micro-Agent: Performance (Section 07)

## Agent Identity
- **ID**: bdd-07-performance
- **Section**: 07 - Performance & Optimization
- **Output Lines**: 800-900
- **Version**: 4.0 (Merged Agent+Template)
- **Scope**: Performance requirements, caching, optimization, monitoring

## Purpose
Generate performance specifications for Backend Detail Design. This agent contains the complete pseudo-code logic for generating SLA targets, caching strategies, query optimization techniques, and monitoring metrics.

## Prerequisites / Context Loading

```pseudo
# Context from orchestrator
feature_name = ENV.FEATURE_NAME
sub_feature = ENV.SUB_FEATURE

# Read API endpoints for performance requirements
section_03_content = ENV.SECTION_03_OUTPUT
api_list = extract_api_list(section_03_content)
```

## Pseudo-Code Logic

```pseudo
# FUNCTION: generate_section_7()
# Purpose: Generate complete Section 7 with 5 subsections (SPECIFICATIONS ONLY)
# Input: Section 03 (API endpoints for optimization), Section 04 (database entities)
# Returns: Section 7.1-7.5 (NO cache client code, NO implementation)

FUNCTION generate_section_7():
    section_7_1 = generate_section_7_1()  # Caching Strategy
    section_7_2 = generate_section_7_2()  # Database Optimization
    section_7_3 = generate_section_7_3()  # Async Processing
    section_7_4 = generate_section_7_4()  # Rate Limiting
    section_7_5 = generate_section_7_5()  # Scalability Design

    output = f"""## 7. Performance & Scalability

{section_7_1}

---

{section_7_2}

---

{section_7_3}

---

{section_7_4}

---

{section_7_5}

---
"""

    IF contains_cache_client_code(output):
        raise Error("Q4 FAIL: Found cache client code - use specifications only")

    RETURN output

FUNCTION generate_section_7_1():
    RETURN """### 7.1 Caching Strategy

> **Mục đích**: Định nghĩa caching layers và strategies (KHÔNG phải cache client code)

**Caching Layers:**

| Layer | Technology | TTL | Use Case (VN) | Invalidation Strategy |
|-------|------------|-----|---------------|----------------------|
| **L1: Application Cache** | In-memory Map | 5 min | Static data (countries, currencies) | Time-based expiration |
| **L2: Distributed Cache** | Redis | 1 hour | User sessions, API responses | Time-based + event-based |
| **L3: CDN Cache** | CloudFront | 24 hours | Static assets (images, CSS, JS) | Cache-Control headers |
| **L4: Database Query Cache** | PostgreSQL | 10 min | Frequently accessed queries | Query result change detection |

**Caching Strategies by Data Type:**

| Data Type | Strategy | TTL | Invalidation (VN) |
|-----------|----------|-----|-------------------|
| User Profile | Write-through | 1 hour | Update event → invalidate cache |
| Product List | Cache-aside (Lazy loading) | 30 min | Product update → invalidate pattern |
| Exchange Rates | Refresh-ahead | 15 min | Scheduled refresh mỗi 10 phút |
| Static Config | Write-through | 24 hours | Config change → full cache clear |
| Session Data | Write-through | 30 min | Logout event → delete key |

**Cache Key Naming Convention:**

```
Format: {service}:{entity}:{identifier}:{version}

Examples:
- user:profile:123:v1
- loan:offer:456:v2
- exchange:rate:USD-VND:v1
```

**Notes**:
- Redis client implementation in Specialists
"""

FUNCTION generate_section_7_2():
    RETURN """### 7.2 Database Optimization

> **Mục đích**: Query optimization và index strategies (KHÔNG phải query code)

**Index Strategy:**

| Table | Index Type | Columns | Purpose (VN) | Cardinality |
|-------|------------|---------|--------------|-------------|
| users | B-tree | email | Login lookup (unique) | High |
| users | B-tree | created_at | Time-range queries | Medium |
| loans | B-tree | status, created_at | Filter active loans | Medium |
| transactions | B-tree | user_id, timestamp | User transaction history | High |
| loans | GIN | metadata (JSONB) | Search trong JSON fields | Low |

**Query Optimization Techniques:**

| Technique | Use Case (VN) | Impact |
|-----------|---------------|--------|
| **Index Covering** | SELECT chỉ indexed columns | 10x faster |
| **Partial Index** | Index WHERE status = 'ACTIVE' only | 50% storage reduction |
| **Composite Index** | WHERE user_id = X AND status = Y | 5x faster than 2 indexes |
| **JSONB GIN Index** | WHERE metadata @> '{"key":"value"}' | Enable JSON queries |
| **Materialized View** | Complex aggregations | Real-time → 1min delay |

**Connection Pooling:**

| Parameter | Value | Description (VN) |
|-----------|-------|------------------|
| Min Connections | 5 | Số connections tối thiểu |
| Max Connections | 20 | Số connections tối đa |
| Idle Timeout | 30s | Đóng connection không dùng sau 30s |
| Connection Timeout | 5s | Timeout khi tạo connection mới |

**Notes**:
- Query optimization patterns in Specialists
"""

FUNCTION generate_section_7_3():
    RETURN """### 7.3 Async Processing

> **Mục đích**: Background jobs và queue strategies (KHÔNG phải worker code)

**Async Operations:**

| Operation | Queue Technology | Priority | Retry | Description (VN) |
|-----------|-----------------|----------|-------|------------------|
| Email Sending | BullMQ (Redis) | Normal | 3 times | Gửi email không block API response |
| Report Generation | BullMQ | Low | 1 time | Generate PDF reports |
| KYC Verification | RabbitMQ | High | 0 times | Call external KYC API |
| Blockchain Transaction | RabbitMQ | Critical | 0 times | Submit transaction (idempotent) |
| Data Export | BullMQ | Low | 2 times | Export large datasets |

**Queue Configuration:**

| Parameter | Value | Description (VN) |
|-----------|-------|------------------|
| Concurrency | 5 workers | Số workers xử lý đồng thời |
| Job Timeout | 60s | Timeout cho mỗi job |
| Rate Limit | 100 jobs/min | Giới hạn processing rate |
| Failed Job TTL | 7 days | Giữ failed jobs 7 ngày |

**Notes**:
- Worker implementation in Specialists
"""

FUNCTION generate_section_7_4():
    RETURN """### 7.4 Rate Limiting

> **Mục đích**: API rate limiting strategies (KHÔNG phải rate limiter code)

**Rate Limit Tiers:**

| User Tier | Requests/min | Burst | Description (VN) |
|-----------|--------------|-------|------------------|
| Anonymous | 10 | 20 | Chưa login |
| Basic User | 60 | 100 | User thường |
| Premium User | 300 | 500 | User trả phí |
| Admin | 1000 | 2000 | Quản trị viên |
| System | Unlimited | - | Internal service calls |

**Rate Limit Algorithm:** Token Bucket

**Rate Limit Headers:**

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706345678
```

**Notes**:
- Rate limiter implementation in Specialists
"""

FUNCTION generate_section_7_5():
    RETURN """### 7.5 Scalability Design

> **Mục đích**: Horizontal scaling và load balancing strategies

**Scaling Strategy:**

| Component | Scaling Type | Trigger | Max Instances |
|-----------|--------------|---------|---------------|
| API Server | Horizontal | CPU > 70% | 10 |
| Worker | Horizontal | Queue depth > 1000 | 20 |
| Database | Vertical + Read Replicas | Load > 80% | 1 master + 3 replicas |
| Cache (Redis) | Horizontal (Cluster) | Memory > 80% | 6 nodes |

**Load Balancing:**

| Type | Algorithm | Health Check |
|------|-----------|--------------|
| API Server | Round Robin | GET /health every 10s |
| Database | Weighted (Master: 0%, Replicas: 100% for reads) | TCP check |
| Cache | Consistent Hashing | PING every 5s |

**Notes**:
- Kubernetes deployment configs in Infrastructure repo
"""

FUNCTION contains_cache_client_code(output):
    patterns = ["redis.get(", "cache.set(", "new Redis("]
    FOR each pattern IN patterns:
        IF pattern IN output:
            RETURN True
    RETURN False
```

---

## Validation (Q1-Q4)

### Q1: Evidence-Based?
- [ ] SLA targets specified for each API?
- [ ] Caching strategy defined with TTL and invalidation?
- [ ] Index strategy justified by query patterns?

### Q2: Consistency?
- [ ] Cache keys consistent with entity naming from Section 4?
- [ ] Performance targets achievable given architecture?
- [ ] Rate limits consistent across tiers?

### Q3: Vietnamese >=60%?
- [ ] Use case descriptions in Vietnamese
- [ ] Strategy descriptions in Vietnamese
- [ ] Configuration descriptions in Vietnamese

### Q4: No Prohibited Content?
- [ ] **ZERO** Redis client code?
- [ ] **ZERO** query optimization code?
- [ ] **ZERO** worker implementation code?
- [ ] **ONLY** specification tables, strategy descriptions?

---

## Output Format

```markdown
## 7. Performance & Optimization
### 7.1 Performance Requirements (SLA)
### 7.2 Multi-Layer Caching Strategy
### 7.3 Database Optimization
### 7.4 Background Processing
### 7.5 Monitoring & Metrics
```

---

## Error Handling

| Error Condition | Action | Fallback |
|-----------------|--------|----------|
| Section 03 missing API list | Generate generic performance targets | Use industry defaults |
| Q4 validation fails (code detected) | Raise error, regenerate without code | Strip code blocks |
| Section 04 missing entity info | Generate generic index strategy | Use common patterns |

---

## Notes

**Key Principle**: Describe performance strategy, NOT implement it.

**Allowed**:
- Caching strategy **tables** (layers, TTL, invalidation)
- Index strategy **tables** (type, columns, purpose)
- Queue configuration **tables**
- Rate limiting **tables**
- Scalability design **tables**

**Prohibited**:
- Redis client code
- Query optimization code
- Worker implementation code
- Rate limiter code

**Where to find implementation code**:
- Redis client: `specialists/code/nestjs-blockchain/redis.md`
- Query optimization: `specialists/code/nestjs-blockchain/typeorm.md`
- Worker patterns: `specialists/code/nestjs-blockchain/bullmq.md`

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (`bdd-07-performance.md`) and template (`07-performance.md`) into single file
- Removed JIT Template Loading section (dead path)
- All pseudo-code logic now inline in agent

**v3.1 (2026-01-27)**:
- Updated to use Template v2.0 (NO CODE philosophy)
- Removed code examples, only specifications and tables
- Strengthened Q4 validation (no decorators, no implementation code)
- Templates expanded from stubs to full specifications

**v3.0 (2025-12-13)**: Migrated to JIT template loading, agent size reduced to ~220 lines (from ~561 lines in v2.0)

---

*BDD Micro-Agent: Performance - v4.0 | Merged Agent+Template*
