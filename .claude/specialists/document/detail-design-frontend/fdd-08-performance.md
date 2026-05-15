# FDD Micro-Agent: Performance & UX (Section 08) - v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-08-performance
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 8 - Performance & UX (Special Requirements Only)
- **Output**: Section 8.1-8.3 (High-performance screens, Real-time data, Large datasets) OR Skip section
- **Language**: Vietnamese >=60%

---

## Purpose

Generate **Section 8: Performance & UX** (Special Requirements Only) for Frontend Detail Design document.

**CRITICAL**: This section is **OPTIONAL** - only include if feature has special performance needs.

**When to Generate**:
- Any screen has >1000 items
- Real-time updates needed (WebSocket/SSE)
- Complex interactions (heavy calculations, animations)
- Large dataset handling (virtualization, infinite scroll)

**When to Skip**:
- Standard CRUD operations only
- No large datasets
- No real-time requirements
- Generic performance covered in coding standards

**Output Structure** (if needed):
- **8.1**: High-Performance Screens (optimization techniques)
- **8.2**: Real-time Data Requirements (WebSocket/SSE)
- **8.3**: Large Dataset Handling (virtualization, pagination)

**NO implementation code** - only performance specifications.

---

## Prerequisites / Context Loading

**From Orchestrator (via environment)**:
```javascript
ENV = {
  FEATURE_NAME: "LND",        // Feature code
  SUB_FEATURE: "BASE",        // Sub-feature code
  DEVELOPER: "Developer Name",
  REASONING_JSON: {...},      // Reasoning output (if available)
  SECTION_00_OUTPUT: "...",   // Section 00 output (Document Info)
  SECTION_01_OUTPUT: "...",   // Section 01 output (Overview)
  SECTION_02_OUTPUT: "...",   // Section 02 output (Business Flow)
  SECTION_03_OUTPUT: "...",   // Section 03 output (Screen Design)
  SECTION_05_OUTPUT: "...",   // Section 05 output (Data Integration)
}
```

**Auto-Read Files**:
1. **Section 03 Output**: Screen Design (for performance-critical screens)
2. **Section 05 Output**: Data Integration (for API performance needs)

**Context Loading Logic**:
```pseudo
FUNCTION load_context():
    result = node.run("core/state/state-manager.js", ["get"])
    context = json.parse(result.stdout)
    feature_id = f"{context.feature}-{context.sub}"

    # READ: Previous sections
    fdd_path = f"documents/features/{feature_id}/{feature_id}-frontend-detail-design.md"
    section_03 = extract_section(fdd_path, "3. Thiet ke man hinh chi tiet")
    section_05 = extract_section(fdd_path, "5. Data Integration")

    # ANALYZE: Performance requirements
    screens = extract_screens_from_section(section_03)
    apis = extract_apis_from_section(section_05)

    performance_needs = analyze_performance_requirements(screens, apis)

    RETURN {feature_id, screens, apis, performance_needs}

FUNCTION analyze_performance_requirements(screens, apis):
    needs = {
        "high_performance_screens": [],
        "real_time_data": [],
        "large_datasets": []
    }

    # CHECK: Each screen for performance needs
    FOR screen IN screens:
        # High-performance check
        IF screen.type == "list" AND estimated_item_count(screen) > 1000:
            needs.high_performance_screens.append(screen)

        # Real-time check
        IF has_real_time_requirement(screen, apis):
            needs.real_time_data.append(screen)

        # Large dataset check
        IF requires_virtualization(screen) OR has_infinite_scroll(screen):
            needs.large_datasets.append(screen)

    RETURN needs
```

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: 08-performance.md
# PURPOSE: Generate Performance & UX section (special requirements only)
# ============================================================

# STEP 1: DECIDE IF SECTION IS NEEDED
FUNCTION should_generate_section(performance_needs):
    total_needs = (
        len(performance_needs.high_performance_screens) +
        len(performance_needs.real_time_data) +
        len(performance_needs.large_datasets)
    )

    # ONLY generate if there are special requirements
    IF total_needs == 0:
        RETURN False

    RETURN True

# STEP 2: GENERATE HIGH-PERFORMANCE SCREENS (8.1)
FUNCTION generate_high_performance_screens(screens):
    output = []

    output.append("## 8. Performance & UX (Special Requirements)\n\n")
    output.append("### 8.1 High-Performance Screens\n\n")

    output.append("**Screens Requiring Optimization:**\n\n")
    output.append("| Screen ID | Ten man hinh | Performance Challenge | Solution | Target Metric |\n")
    output.append("|-----------|--------------|----------------------|----------|---------------|\n")

    FOR screen IN screens:
        challenge = identify_performance_challenge(screen)
        solution = recommend_solution(challenge)
        metric = define_target_metric(challenge)

        output.append(f"| {screen.id} | {screen.name_vi} | {challenge} | {solution} | {metric} |\n")

    output.append("\n")

    output.append("**Optimization Techniques:**\n\n")
    output.append("| Technique | When to Use | Implementation Notes | Expected Improvement |\n")
    output.append("|-----------|-------------|---------------------|---------------------|\n")
    output.append("| **Virtualization** | Lists > 1000 items | @tanstack/react-virtual | 90% render time reduction |\n")
    output.append("| **Code Splitting** | Heavy components | React.lazy + Suspense | Reduce initial bundle 30-50% |\n")
    output.append("| **Memoization** | Expensive calculations | React.memo, useMemo | Prevent unnecessary re-renders |\n")
    output.append("| **Debouncing** | Search/filter inputs | 300ms delay | Reduce API calls 70-90% |\n")
    output.append("| **Prefetching** | Predictable navigation | React Query prefetch | Instant transitions |\n")
    output.append("| **Image Optimization** | Photo-heavy screens | WebP format, lazy load | 60% image size reduction |\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 3: GENERATE REAL-TIME DATA (8.2)
FUNCTION generate_real_time_data(screens, apis):
    output = []

    output.append("### 8.2 Real-time Data Requirements\n\n")

    output.append("**Screens with Real-time Updates:**\n\n")
    output.append("| Screen ID | Data Type | Update Frequency | Technology | Fallback Strategy |\n")
    output.append("|-----------|-----------|------------------|------------|-------------------|\n")

    FOR screen IN screens:
        IF has_real_time_requirement(screen, apis):
            data_type = identify_real_time_data(screen)
            frequency = get_update_frequency(screen)
            tech = "WebSocket" IF frequency < "5s" ELSE "Server-Sent Events (SSE)"
            fallback = "Polling (30s interval)"

            output.append(f"| {screen.id} | {data_type} | {frequency} | {tech} | {fallback} |\n")

    output.append("\n")

    output.append("**Real-time Architecture:**\n\n")
    output.append("| Component | Technology | Behavior | Reconnect Strategy |\n")
    output.append("|-----------|------------|----------|--------------------|\n")
    output.append("| **Connection** | WebSocket (wss://) | Persistent connection | Exponential backoff (1s, 2s, 4s, 8s, max 30s) |\n")
    output.append("| **Events** | Server -> Client push | JSON message format | Message queue (max 100) |\n")
    output.append("| **UI Update** | React Query invalidation | Auto-refetch on event | Optimistic update |\n")
    output.append("| **Offline** | Service Worker cache | Show stale data | Toast: \"Dang ket noi lai...\" |\n\n")

    output.append("**Performance Considerations:**\n\n")
    output.append("- **Throttling**: Update UI max 60fps (16ms interval)\n")
    output.append("- **Batching**: Group multiple events into single UI update\n")
    output.append("- **Priority**: High-priority events (user actions) -> Low-priority (background stats)\n")
    output.append("- **Cleanup**: Close WebSocket on component unmount\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 4: GENERATE LARGE DATASET HANDLING (8.3)
FUNCTION generate_large_dataset_handling(screens):
    output = []

    output.append("### 8.3 Large Dataset Handling\n\n")

    output.append("**Screens with Large Datasets:**\n\n")
    output.append("| Screen ID | Dataset Size | Strategy | Page Size | Virtual Window |\n")
    output.append("|-----------|-------------|----------|-----------|----------------|\n")

    FOR screen IN screens:
        IF requires_large_dataset_handling(screen):
            size = estimate_dataset_size(screen)
            strategy = determine_strategy(size)
            page_size = recommend_page_size(size)
            virtual_window = calculate_virtual_window(size)

            output.append(f"| {screen.id} | {size} | {strategy} | {page_size} | {virtual_window} |\n")

    output.append("\n")

    output.append("**Strategies Comparison:**\n\n")
    output.append("| Strategy | Dataset Size | Pros | Cons | Use Case |\n")
    output.append("|----------|-------------|------|------|----------|\n")
    output.append("| **Pagination** | < 10,000 | Simple, SEO-friendly | Jumps between pages | List screens, reports |\n")
    output.append("| **Infinite Scroll** | 10,000-100,000 | Seamless UX | No SEO, hard to reach bottom | Social feeds, activity logs |\n")
    output.append("| **Virtualization** | > 100,000 | Constant memory usage | Complex implementation | Large tables, logs |\n")
    output.append("| **Hybrid (Pagination + Virtual)** | > 1,000,000 | Best performance | Very complex | Admin tools, analytics |\n\n")

    output.append("**Virtualization Specifications:**\n\n")
    output.append("| Parameter | Value | Reason |\n")
    output.append("|-----------|-------|--------|\n")
    output.append("| **Row height** | Fixed 56px | Predictable rendering |\n")
    output.append("| **Overscan** | 5 rows above/below | Smooth scrolling |\n")
    output.append("| **Virtual window** | 20-30 rows | Balance memory/smoothness |\n")
    output.append("| **Scroll threshold** | 80% | Trigger next page load |\n")
    output.append("| **Cache size** | 1000 items | Reduce API calls |\n\n")

    output.append("**Performance Metrics:**\n\n")
    output.append("| Metric | Target | Measurement |\n")
    output.append("|--------|--------|-------------|\n")
    output.append("| **Initial render** | < 2s | Time to First Contentful Paint (FCP) |\n")
    output.append("| **Scroll FPS** | 60fps | No jank during scroll |\n")
    output.append("| **Memory usage** | < 100MB | Chrome DevTools Memory Profiler |\n")
    output.append("| **API response time** | < 500ms | p95 latency |\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 5: ASSEMBLE SECTION (OR SKIP IF NOT NEEDED)
FUNCTION generate_section():
    data = load_context()

    # DECIDE: If section is needed
    IF NOT should_generate_section(data.performance_needs):
        output = []
        output.append("## 8. Performance & UX\n\n")
        output.append("**Note**: Feature nay khong co yeu cau dac biet ve performance.\n\n")
        output.append("Cac best practices ve performance (code splitting, lazy loading, image optimization) da duoc de cap trong:\n")
        output.append("- Coding Standards: `.claude/docs/coding-standards/frontend/`\n")
        output.append("- Section 5 (Data Integration): Caching strategies\n")
        output.append("- Section 7 (Responsive Design): Mobile optimization\n\n")
        output.append("**Skipping detailed performance section.**\n\n")
        RETURN "".join(output)

    # GENERATE: Sections based on needs
    output = []

    IF len(data.performance_needs.high_performance_screens) > 0:
        output.append(generate_high_performance_screens(data.performance_needs.high_performance_screens))

    IF len(data.performance_needs.real_time_data) > 0:
        output.append(generate_real_time_data(data.performance_needs.real_time_data, data.apis))

    IF len(data.performance_needs.large_datasets) > 0:
        output.append(generate_large_dataset_handling(data.performance_needs.large_datasets))

    result = "".join(output)
    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(result):
    issues = []

    # Q1: If not skipped, check sections
    IF NOT contains(result, "Skipping detailed performance"):
        IF NOT contains(result, "8.1") AND NOT contains(result, "8.2") AND NOT contains(result, "8.3"):
            issues.append("No performance sections generated despite special requirements")

    # Q2: Vietnamese ratio >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q3: No implementation code?
    prohibited = ["React.lazy", "Suspense", "useMemo", "React.memo", "import(", "lazy("]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited code: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format

**Generated Markdown** (150-300 lines OR short skip note):

**If NO special requirements**:
```markdown
## 8. Performance & UX

**Note**: Feature nay khong co yeu cau dac biet ve performance.

Cac best practices ve performance da duoc de cap trong Coding Standards.

**Skipping detailed performance section.**
```

**If HAS special requirements** - sections 8.1-8.3 as specified in pseudo-code above.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **Section 03 not found** | Screen Design missing | Generate Section 03 first |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |
| **React code present** | Using implementation code | Remove all React code |

---

## Notes

- **Technology Context**: React 18.x (Server Components + Streaming), SSR + CSR hybrid, React.lazy + Suspense, React Query (5 min stale time), @tanstack/react-virtual, webpack-bundle-analyzer, Web Vitals (LCP, FID, CLS)
- **Length**: 150-300 lines (or skip if no special requirements)
- **Language**: Vietnamese >=60%
- **Note**: This section is OPTIONAL - only include if feature has special performance needs

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-08-performance.md) + template (08-performance.md) into single file
- Removed JIT template loading (dead path)
- Inlined all pseudo-code logic from template

**v3.0 (2025-12-12)**:
- Initial version with JIT template loading pattern
- Implements 08-performance.md template (324 lines)
- Added optional section logic (skip if no requirements)
- Added 3 subsections (8.1-8.3) structure
- Enhanced validation (Q1-Q4)
- Vietnamese content requirements enforced

---

*FDD Micro-Agent: Performance & UX - v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x*
