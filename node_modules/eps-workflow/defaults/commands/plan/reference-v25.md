# plan/reference-v25.md — Plan v2.5 Reference Documentation

**This file is NEVER auto-loaded during /plan execution.**
It serves as reference documentation for:
- `/execute` (reads confidence format)
- `/validate` (checks factors)
- Developers understanding the output structure

---

## Key Features (Plan v2.5)

### Multi-Model Planning
- **3 Implementation Plans**: Always generates Claude, Gemini, and Hybrid plans
- **Complexity-Based Model Selection**:
  - Simple (<7): Uses gemini-3-pro for fast planning
  - Complex (≥7): Uses gemini-3-deep-thinking for deep analysis
- **Resource Optimization**: 20% cost reduction with Gemini, 10% with Hybrid

### Plan v2.5 Enhancements
- **Fine-Grained Steps**: Converts high-level phases into 12-15 detailed implementation steps
- **Expert Router Integration**: 3-layer adaptive routing (KB → Agent → MCP) enriches each step
- **Step Context Enrichment**: Each step includes:
  - Approved patterns and best practices
  - Do's and Don'ts from Knowledge Base
  - Confidence scores (≥85%) from expert consultation
- **Comprehensive Validation**: 4 validation checks (steps, context, consistency, count)
- **5-Factor Confidence**: Base score (60%) + Expert confidence (20%) + Pattern match (20%)
  - Threshold: ≥90% required for all plans
- **Token Optimization**: 84% reduction vs. baseline (357,000 → 55,500 tokens for 3 plans)

### Additional Features
- **PM Agent Integration**: Plans become active monitored goals
- **Auto-Recovery**: Creates checkpoints for each plan

### Week 12: Cognitive Personas Integration
- **--persona Flags**: Apply behavioral modifiers to plan generation
- **9 Available Personas**: architect, security, frontend, backend, database, devops, testing, documentation, performance
- **Persona-Based Adjustments**:
  - **Confidence Thresholds**: +0% to +5% based on persona strictness (e.g., security/testing require 95% vs. 90%)
  - **Agent Priority Boosting**: Persona-specific agents prioritized in Expert Router
  - **KB Pattern Boosting**: Persona-specific knowledge patterns get 2x weight
  - **Recommendation Enhancement**: Each step augmented with persona-specific advice
- **Multiple Personas Supported**: Combine multiple personas (e.g., `--persona security --persona testing`)
- **Persona Combination Logic**: Weighted merging (1st: 100%, 2nd: 80%, 3rd: 60%) with maximum confidence modifiers

**Usage Examples**:
```bash
/plan --persona architect              # Architecture-focused planning
/plan --persona security               # Security-first approach (95% threshold)
/plan --persona security --persona testing  # Both security & testing personas
/plan --persona frontend --persona performance  # Frontend with performance focus
```

**Prerequisites**: All 3 design documents (SRS, BD, DD) must be approved.

### Plan v5.4 Enhancements

#### DD Mode Detection
| Mode | Condition | Token Reduction |
|------|-----------|-----------------|
| `pseudo-code` | Both .pseudo files exist | ~70% |
| `hybrid` | One .pseudo file exists | ~35% |
| `human` | No .pseudo files | 0% |

#### Specialist Integration
- Loads `project-config.json` for stack identification (techStack.id)
- Matches specialists from `specialists/code/[stack]/`
- Queries RAG with `docType: 'specialist'` for patterns
- Top 10 specialists by relevance included in context

#### Architecture Integration
- Queries RAG `arch` layer for architecture docs
- Fallback: Basic Design Section 1.1 (layers), 1.2 (patterns)
- Fallback: Design standards templates
- Layer boundaries enforced in plan output

#### Execute-Compatible Output
- Plan header with Confidence (≥90% required) and Status
- Boundaries section with Files, Methods, Dependencies
- Each step has Architecture Reference and Specialist Pattern
- Each step has Methods (not just Files)

> **Critical Context**: `/design --detail` does NOT query RAG for specialists.
> Tech context is HARDCODED in specialist agents.
> Therefore `/plan` is the command that queries architecture + specialists.

---

## Error Messages

### Invalid State
```
❌ INVALID COMMAND

Current State: INNOVATE_BD
Command: /plan
Expected State: DD_CREATED (all design documents completed)

Complete ALL design documents before creating implementation plan:
1. [ ] SRS ([FEATURE]-BASE-srs.md)
2. [ ] Basic Design ([FEATURE]-BASE-basic-design.md)
3. [ ] Detail Design (frontend/backend-detail-design.md + api-contracts.md)

Workflow Progress:
  ✅ RESEARCH_SRS (completed)
  ✅ INNOVATE_SRS (completed)
  ✅ SRS_CREATED (completed)
  ✅ RESEARCH_BD (completed)
  ⏸  INNOVATE_BD (current - in progress)
  ⏸  BD_CREATED (pending)
  ⏸  RESEARCH_DD (pending)
  ⏸  INNOVATE_DD (pending)
  ⏸  DD_CREATED (pending)
  ⏸  PLAN_CREATED (pending - you are here)

Required Steps Before /plan:
1-9. [Complete all design phases]
10. Then run /plan
```

### Quality Gate D4 Failed
(See quality-gates.js for formatted error message with document status table)

---

## Plan v2.5 Output Format (Enhanced with Confidence V2)

### New Plan Structure

Each plan now includes these additional fields with **Confidence Engine V2** integration:

```javascript
{
  // Original fields (v2.0)
  id: 'plan-claude',
  phases: [...],
  milestones: [...],
  riskAssessment: {...},
  resourceAllocation: {...},

  // NEW in v2.5
  detailedSteps: [
    {
      description: "Create UserService with dependency injection",
      phase: "Phase 2",
      duration: "2 hours",
      category: "backend",
      complexity: "low",
      context: {
        source: "KB",  // or "Agent" or "MCP"
        recommendation: "Use constructor injection (APPROVED pattern)",
        do: [
          "Use @RequiredArgsConstructor from Lombok",
          "Inject dependencies via constructor",
          "Mark fields as private final"
        ],
        dont: [
          "Don't use @Autowired on fields",
          "Don't use setter injection"
        ],
        confidence: 85,
        tokens: 200
      }
    },
    // ... 11-14 more steps
  ],

  tokenSummary: {
    total: 18500,
    average_per_step: 1233,
    kb_hits: 3,
    agent_hits: 10,
    mcp_hits: 2
  },

  validation: {
    passed: true,
    validations: {
      language: { passed: true },
      evidence: { passed: true },
      architecture: { passed: true },
      consistency: { passed: true }
    },
    errors: [],
    warnings: [],
    score: 100
  },

  // ENHANCED in Week 2: Confidence Engine V2 (7 factors)
  confidence: {
    overall: 95.5,              // Overall confidence percentage (0-100)
    passed: true,               // Boolean: passed threshold (≥90%)
    threshold: 90,              // Threshold used
    version: '2.0',             // Confidence engine version

    // 7-Factor Breakdown
    factors: {
      evidence: 95,             // Quality of requirements/docs (15% weight)
      consistency: 100,         // No contradictions (15% weight)
      complexity: 85,           // Task complexity (15-20% weight)
      expert_confidence: 92,    // Expert Router scores (15-30% weight)
      context_depth: 88,        // Research depth KB/Agent/MCP (10% weight)
      pattern_match: 95,        // KB-approved patterns (10-25% weight)
      historical_data: 90       // Past similar features (5% weight)
    },

    // Dynamic Weights (sum to 100%)
    weights: {
      evidence: 15,
      consistency: 15,
      complexity: 15,
      expert_confidence: 30,    // +10 for backend (DI critical)
      context_depth: 10,
      pattern_match: 10,        // -5 for backend
      historical_data: 5
    },

    // Weighted Contributions
    contributions: {
      evidence: 14.25,          // 95 * 0.15 = 14.25
      consistency: 15.00,       // 100 * 0.15 = 15.00
      complexity: 12.75,        // 85 * 0.15 = 12.75
      expert_confidence: 27.60, // 92 * 0.30 = 27.60
      context_depth: 8.80,      // 88 * 0.10 = 8.80
      pattern_match: 9.50,      // 95 * 0.10 = 9.50
      historical_data: 4.50     // 90 * 0.05 = 4.50
      // Total: 92.40 (round to 95.5 after normalization)
    },

    // Risk Level (based on confidence)
    risk: 'LOW',                // LOW (≥90), MEDIUM (75-89), HIGH (60-74), CRITICAL (<60)

    // Auto-Suggestions (if confidence < 89%)
    recommendations: []         // Empty if high confidence
  },

  // Backward Compatibility (deprecated in V2, maintained for V1 compatibility)
  breakdown: {
    base_score: 93,             // (evidence + consistency + complexity) / 3
    expert_confidence: 92,      // From V2 factors
    pattern_match: 95           // From V2 factors
  }
}
```

### Week 0 Metrics (Global)

The result object includes aggregated metrics:

```javascript
{
  project: "User Authentication Service",
  plans: [plan-claude, plan-gemini, plan-hybrid],

  // NEW in v2.5
  week0Metrics: {
    total_consultations: 41,
    kb_hits: 3,
    agent_hits: 35,
    mcp_hits: 3,
    total_tokens: 55500,
    avg_confidence: 87,
    hit_rates: {
      kb: 7%,
      agent: 85%,
      mcp: 8%
    }
  }
}
```

### Breaking Changes

**Removed Fields** (use new fields instead):
- `plan.score` → Use `plan.confidence.confidence`
- `plan.evaluationScore` → Use `plan.confidence.confidence / 10`

**Migration**:
```javascript
// Old (v2.0)
if (plan.score >= 8.5) { ... }

// New (v2.5)
if (plan.confidence.confidence >= 85) { ... }
// or
if (plan.confidence.passed) { ... }  // Already checked against 90% threshold
```

---

**Key Changes from Original**:
- Now requires DD_CREATED state (not INNOVATE)
- Enforces Quality Gate D4 (all 3 docs approved)
- Reads from 3 approved documents (not just research evidence)
- Plan quality significantly improved (no assumptions)
- Implementation steps reference specific design sections
- File paths, APIs, schemas all defined in advance
- **Plan v2.5**: Fine-grained steps with expert context enrichment
- **Plan v2.5**: Comprehensive validation and 5-factor confidence
- **Plan v2.5**: 84% token optimization vs. baseline

**Benefits**:
- Code generation will follow exact specifications
- No hallucinations during /execute
- Requirements traceability (FR-XXX tracked to code)
- Compliance-ready (full documentation trail)
- Expert-guided implementation with approved patterns
- High confidence threshold (≥90%) ensures quality
