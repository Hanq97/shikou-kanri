# Test Plan Micro-Agent: Performance Tests
# テスト計画マイクロエージェント：パフォーマンステスト
# Micro-Agent Kế Hoạch Kiểm Thử: Kiểm Thử Hiệu Năng

**Version**: 1.0.0
**Section**: 7. Kiểm thử hiệu năng (Performance Tests)
**Output Lines**: ~170 lines
**Purpose**: Generate performance test specifications for load, stress, and frontend metrics
**Specialist**: tps-java-performance.md

---

## Responsibility

Generate Section 7 of Test Plan containing:
- 7.1 Kiểm thử tải Backend (Backend Load Testing) — normal load
- 7.2 Kiểm thử stress Backend (Backend Stress Testing) — abnormal spike/soak
- 7.3 Hiệu năng Frontend (Frontend Performance) — Lighthouse metrics

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| SRS | `documents/features/{dir}/{feature}-*-srs.md` | YES |
| Backend DD | `documents/features/{dir}/{feature}-*-backend-detail-design.md` | Optional (for endpoints) |
| Stack vars | Step 0.5 (reactive stack) | YES |
| context_level | Step 2 | YES |
| test_id_counters | From tp-06 (last MT IDs) | YES |

---

## Specialist Loading

```pseudo
perf_spec = read_file("specialists/code/java-springboot/test-plan/tps-java-performance.md")
```

**WHY**: Performance specialist provides reactive-specific targets (≥2000 RPS, StepVerifier virtual time, backpressure) that differ from servlet stack (~500 RPS).

---

## RAG Integration

```pseudo
try:
    rag = HippoRAGService.getInstance(feature, branch)
    perf_rag = await rag.queryWithArchitecture(
        "performance load testing reactive webflux throughput",
        { stereotype: "Service", topK: 3 })
except:
    perf_rag = None  # non-blocking
```

**WHY**: RAG surfaces existing performance baselines and architectural patterns (connection pool sizes, cache TTL) that inform realistic test targets.

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK**:
1. What are the critical endpoints for load testing? (from DD or SRS)
2. What are the expected RPS targets? (reactive: ≥2000 RPS)
3. What response time targets? (P50 < 200ms, P95 < 500ms, P99 < 1s)
4. What stress/soak scenarios? (spike 10x, sustained 1h, memory leak)
5. What frontend metrics? (LCP, FID, CLS — Core Web Vitals)
6. What ABNORMAL scenarios? (spike, stress, memory leak, backpressure, pool exhaustion)

**REASON**:
- IF DD exists → identify high-traffic endpoints for load testing
- IF RAG found performance patterns → reuse baselines
- IF scope == "backend" → focus on API performance (skip 7.3)
- IF scope == "frontend" → focus on Lighthouse metrics (minimal 7.1/7.2)
- IF scope == "fullstack" → all 3 sub-sections

**VALIDATE CONSTRAINTS**:
- [ ] Backend targets include RPS and response time percentiles
- [ ] Frontend targets include Core Web Vitals
- [ ] Reactive-specific targets (≥2000 RPS)
- [ ] Vietnamese >= 60%

### Step 2: GENERATE SECTION

```markdown
## 7. Kiểm thử hiệu năng (Performance Tests)

### 7.1 Kiểm thử tải Backend (Backend Load Testing)

**Công cụ**: Gatling / k6
**Stack**: Reactive WebFlux (R2DBC)

| Chỉ số (Metric) | Mục tiêu (Target) | Ghi chú |
|-----------------|-------------------|---------|
| RPS (Requests Per Second) | ≥ 2,000 | Reactive stack (higher than servlet ~500) |
| Response Time P50 | < 200ms | Median response |
| Response Time P95 | < 500ms | 95th percentile |
| Response Time P99 | < 1s | 99th percentile |
| Error Rate | < 0.1% | Under normal load |
| Concurrent Users | [X] | Based on SRS NFR |

**Kịch bản tải (Load Scenarios)**:

| Loại | Kịch bản | Thời lượng | Mô tả |
|------|---------|------------|-------|
| Normal | Tải bình thường | 15 phút | [X] users, ramp-up 2 phút |
| Normal | Tải cao điểm | 15 phút | [2X] users, giờ cao điểm |

### 7.2 Kiểm thử stress Backend (Backend Stress Testing)

| Loại | Kịch bản | Thời lượng | Mô tả | Kết quả mong đợi |
|------|---------|------------|-------|-------------------|
| Abnormal | Spike 10x | 30 giây | Tải đột ngột 10x | Auto-scale, không 5xx |
| Abnormal | Stress tăng dần | 30 phút | Tăng đến điểm gãy | Xác định breaking point |
| Abnormal | Soak test | 1 giờ | 80% tải liên tục | Không memory leak (≤5% heap growth/h) |
| Abnormal | Backpressure | 10 phút | Producer > Consumer | Graceful degradation |
| Abnormal | Connection pool | 5 phút | Max pool size | Timeout, không crash |

### 7.3 Hiệu năng Frontend (Frontend Performance)

**Công cụ**: Lighthouse + Chrome DevTools

| Chỉ số (Metric) | Mục tiêu (Target) | Mô tả |
|-----------------|-------------------|-------|
| LCP (Largest Contentful Paint) | < 2.5s | Thời gian tải nội dung lớn nhất |
| FID (First Input Delay) | < 100ms | Thời gian phản hồi tương tác đầu |
| CLS (Cumulative Layout Shift) | < 0.1 | Độ ổn định layout |
| TTI (Time to Interactive) | < 3.5s | Thời gian trang sẵn sàng tương tác |
| Bundle Size | < 500KB (gzipped) | JavaScript bundle chính |
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1**: Backend targets include RPS and response time?
**Q2**: Frontend targets include Core Web Vitals (LCP, FID, CLS)?
**Q3**: Vietnamese >= 60%?
**Q4**: No implementation code (no Gatling DSL, no k6 scripts)?

### Step 4: VALIDATION

- [ ] 3 sub-sections (7.1 Load, 7.2 Stress, 7.3 Frontend) — scope-dependent
- [ ] Reactive-specific targets (≥2000 RPS, not ~500)
- [ ] Response time percentiles (P50, P95, P99)
- [ ] Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Abnormal scenarios (spike, stress, soak, backpressure)
- [ ] Memory leak detection criteria
- [ ] ≤ 170 lines

---

## Output Format

See Step 2 template above.

---

## Quality Standards

- **Completeness**: Load, stress, and frontend metrics covered
- **Accuracy**: Targets realistic for reactive stack
- **Normal/Abnormal**: Normal load + abnormal stress scenarios
- **Language**: Vietnamese-first ≥60%
- **Prohibited**: Zero implementation code (no test scripts)

---

*Test Plan Micro-Agent tp-07 | Performance Tests | EPS v3.2*
