# plan/context-loading.md — Steps 2.5–2.10: RAG, patterns, evidence, DD mode, specialists, architecture

## Step 2.5: RAG Source Code Context (Auto)

Automatically check staleness, re-index if needed, and query RAG for source code context.

```javascript
const path = require('path');
const StalenessChecker = require('./core/feedback/staleness-checker.js');

const branch = require('child_process').execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();

// 1. Check staleness
const checker = new StalenessChecker(branch);
const report = checker.getStalenessReport();

if (report.neverIndexed) {
  console.log('ℹ️  Source code not indexed. RAG context may be limited.');
  console.log('   Continuing with design documents only.\n');
} else if (report.stale) {
  console.log(`⚠️  Source code index is stale:`);
  console.log(`   ${report.filesChanged} files changed, ${report.commitsBehind} commits behind`);
  if (report.changedFiles.length > 0) {
    console.log(`   Changed: ${report.changedFiles.slice(0, 5).join(', ')}${report.changedFiles.length > 5 ? '...' : ''}`);
  }
  console.log('');
} else {
  console.log('✅ Source code index is up-to-date\n');
}

// 2. Mark current commit as indexed
if (report.stale) {
  checker.markIndexed();
}

// 5. Query RAG for source code patterns (available to plan generation)
let ragContext = { codePatterns: [], graphConstraints: [] };

try {
  const HippoRAGService = require('./core/rag/hipporag-service.js');

  // Get feature from context
  const sm = require('./core/state/state-manager.js');
  const ctx = sm.findActiveContext();
  const contextFile = `${ctx}/context.md`;
  const fs = require('fs');
  let feature = 'ALL';
  if (fs.existsSync(contextFile)) {
    const content = fs.readFileSync(contextFile, 'utf8');
    const match = content.match(/Module:\s*(\w+)/);
    if (match) feature = match[1];
  }

  // Query HippoRAG with graph-aware search
  const ragService = HippoRAGService.getInstance(feature, branch);
  const ragResult = await ragService.getContext(
    `${feature} service repository controller patterns`,
    { name: 'plan-agent', agent: 'plan' },
    { topK: 10, graphDepth: 2 }
  );

  // Extract code patterns from RAG chunks
  ragContext.codePatterns = ragResult.chunks.map(c => ({
    content: c.content || '',
    filePath: c.metadata?.filePath || '',
    chunkType: c.metadata?.chunkType || '',
    score: c.score,
  }));

  // Graph constraints from RAG 2.0 pipeline (already traversed)
  ragContext.graphConstraints = (ragResult.graph?.nodes || []).slice(0, 30).map(n => ({
    type: n.attributes?.type || 'NODE',
    source: n.id,
    target: n.attributes?.label || n.id,
  }));

  if (ragContext.codePatterns.length > 0 || ragContext.graphConstraints.length > 0) {
    console.log(`📊 RAG 2.0 Context: ${ragContext.codePatterns.length} code patterns, ${ragContext.graphConstraints.length} graph constraints`);
    console.log(`   Mode: ${ragResult.mode}, Layers: ${layers.join(', ')}`);
  }
} catch (err) {
  // Non-blocking: RAG unavailable doesn't stop planning
  console.log(`ℹ️  RAG context unavailable (${err.message}). Using design documents only.`);
}

console.log('');
```

**Non-blocking**: All errors are caught. Planning continues with design documents alone if RAG is unavailable.

**RAG context is passed to plan generation** as additional input:
```
=== SOURCE CODE CONTEXT (RAG) ===
[ragContext.codePatterns - existing implementation patterns]
[ragContext.graphConstraints - class→component relationships]
```

---

## Step 2.6: Load Pattern Effectiveness (Auto)

Query the feedback system for pattern effectiveness metrics to boost confident patterns.

```javascript
const { EffectivenessQuery } = require('./.claude/utils/feedback');

let patternEffectiveness = { available: false, patterns: [], summary: null };

try {
  const query = EffectivenessQuery.getInstance();

  if (query.hasData()) {
    // Get top active patterns
    const activePatterns = query.getActivePatterns({
      minConfidence: 70,
      limit: 20,
      sortBy: 'currentConfidence',
      sortOrder: 'desc'
    });

    // Get deprecated patterns to avoid
    const deprecatedPatterns = query.getDeprecatedPatterns();

    patternEffectiveness = {
      available: true,
      patterns: activePatterns.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        confidence: p.currentConfidence,
        boostFactor: query.getBoostFactor(p.id),
        usageCount: p.usageCount
      })),
      deprecated: deprecatedPatterns.map(p => p.id),
      summary: query.getSummary(),
      lastAggregatedAt: query.getLastAggregatedAt()
    };

    console.log('📊 Pattern Effectiveness Loaded');
    console.log(`   Active patterns: ${patternEffectiveness.patterns.length}`);
    console.log(`   Deprecated (avoid): ${deprecatedPatterns.length}`);
    if (patternEffectiveness.lastAggregatedAt) {
      console.log(`   Last aggregated: ${patternEffectiveness.lastAggregatedAt.split('T')[0]}`);
    }
  } else {
    console.log('ℹ️  Pattern effectiveness data not available yet');
    console.log('   Will be populated after first /validate cycle');
  }
} catch (err) {
  console.log(`ℹ️  Pattern effectiveness unavailable (${err.message})`);
}

console.log('');
```

**Pattern Effectiveness Context** (passed to plan generation):
```
=== PATTERN EFFECTIVENESS ===
[Recommended patterns with boost factors]
[Deprecated patterns to avoid]
```

**Query-Time Boosting**: Patterns with high effectiveness get priority in plan generation.

---

## Step 2.7: Evidence Context Loading (Auto)

Load evidence.md from the active context directory. Evidence contains research findings AND innovate/design decisions (enriched by Post-Save steps in each phase).

```javascript
const fs = require('fs');
const path = require('path');
const sm = require('./core/state/state-manager.js');
const ctx = sm.findActiveContext();

console.log('📋 Loading evidence context...');

const evidencePath = `${ctx}/evidence.md`;
let evidenceContent = null;

if (fs.existsSync(evidencePath)) {
  evidenceContent = fs.readFileSync(evidencePath, 'utf8');
  console.log(`  ✅ evidence.md (${evidenceContent.split('\n').length} lines)`);
} else {
  console.log('ℹ️  No evidence.md found');
}
console.log('');
```

**Evidence context is passed to plan generation** as additional input:
```
=== EVIDENCE CONTEXT (enriched — contains research + innovate decisions + design summaries) ===
[evidenceContent — if available]
```

**Note**: Evidence.md is a living document enriched by each phase:
- §1: Research findings (from /research)
- §2.1-2.3: Innovate decisions (from /innovate SRS/BD/DD Post-Save)
- §3.1-3.3: Design summaries (from /design Post-Workflow)
- §4: Impact analysis (updated each phase)

**CONTEXT PRIORITY** (instruction for plan generation):
```
CONTEXT PRIORITY (highest to lowest):
1. Approved Design Documents (SRS, BD, DD) — primary when available
2. Evidence — research findings, innovate decisions, design summaries (living document)
3. RAG Source Code Context — existing implementation patterns
4. Pattern Effectiveness — historical pattern confidence

When design docs exist, they are authoritative.
When design docs are absent (lightweight/bugfix), evidence.md
(which contains innovate decisions inline) is the primary source.
```

---

## Step 2.7.5: Evidence Fusion

Invoke the **evidence-fusion** skill:
- Merges evidence from:
  - memory-bank evidence.md (loaded in Step 2.7)
  - RAG query results (from Step 2.5, if available)
  - Innovate decisions (embedded in evidence.md §2)
- Output: Synthesized evidence context for plan generation
- Non-blocking: if skill unavailable, use raw evidence from Step 2.7

---

## Step 2.8: Detect DD Mode & Validate (v5.4)

> **Note**: Skip this step for lightweight workflows (no design documents). Only applies to feature workflows.

Determine optimal document format for token optimization. This step creates `ddConfig` object used by subsequent steps.

```javascript
const fs = require('fs');
const path = require('path');
const sm = require('./core/state/state-manager.js');
const ctx = sm.findActiveContext();
const context = sm.loadContext(ctx);
const { findDocumentsDir } = require('./guards/gates/quality-gates.js');

const feature = context.featureName;
const docsDir = findDocumentsDir(feature, ctx);

console.log('📄 Detecting DD Mode (v5.4)...');

// Check for pseudo-code files
const fddPseudo = path.join(docsDir, `${feature}-frontend-detail-design.pseudo`);
const bddPseudo = path.join(docsDir, `${feature}-backend-detail-design.pseudo`);
const fddMd = path.join(docsDir, `${feature}-frontend-detail-design.md`);
const bddMd = path.join(docsDir, `${feature}-backend-detail-design.md`);

const hasFddPseudo = fs.existsSync(fddPseudo);
const hasBddPseudo = fs.existsSync(bddPseudo);

// Priority: pseudo-code > hybrid > human
let ddConfig = {
  mode: 'human',
  tokenReduction: 0,
  paths: { fdd: fddMd, bdd: bddMd },
  coverage: null,
  feature: feature,
  docsDir: docsDir
};

if (hasFddPseudo && hasBddPseudo) {
  ddConfig.mode = 'pseudo-code';
  ddConfig.tokenReduction = 70;
  ddConfig.paths = { fdd: fddPseudo, bdd: bddPseudo };
  console.log('  🎯 Mode: pseudo-code (BOTH .pseudo files found)');
} else if (hasFddPseudo || hasBddPseudo) {
  ddConfig.mode = 'hybrid';
  ddConfig.tokenReduction = 35;
  ddConfig.paths = {
    fdd: hasFddPseudo ? fddPseudo : fddMd,
    bdd: hasBddPseudo ? bddPseudo : bddMd
  };
  console.log(`  🔀 Mode: hybrid (${hasFddPseudo ? 'FDD' : 'BDD'} pseudo-code)`);
} else {
  console.log('  📝 Mode: human (no .pseudo files)');
}

// Validate TRACE_MATRIX coverage if pseudo-code
if (ddConfig.mode !== 'human') {
  try {
    const pseudoContent = fs.readFileSync(ddConfig.paths.fdd, 'utf8');
    const coverageMatch = pseudoContent.match(/COVERAGE:\s*(\d+)%/);
    ddConfig.coverage = coverageMatch ? parseInt(coverageMatch[1]) : null;

    if (ddConfig.coverage !== null && ddConfig.coverage < 100) {
      console.log(`  ⚠️ TRACE_MATRIX coverage: ${ddConfig.coverage}% (recommend 100%)`);
    } else if (ddConfig.coverage !== null) {
      console.log(`  ✅ TRACE_MATRIX coverage: ${ddConfig.coverage}%`);
    }
  } catch (e) {
    console.log('  ⚠️ Could not validate TRACE_MATRIX coverage');
  }
}

// Detect multi-file pseudo (SP-1 output: SPLIT_MODE marker)
ddConfig.splitMode = "single";
ddConfig.sectionMap = null;
ddConfig.sectionFiles = {};

if (hasBddPseudo) {
  const bddPseudoContent = fs.readFileSync(bddPseudo, 'utf8');
  if (bddPseudoContent.includes("SPLIT_MODE: multi-file")) {
    const { parsePseudoMeta } = require('./core/plan/auto-split.js');
    const parsed = parsePseudoMeta(bddPseudoContent);
    ddConfig.splitMode = "multi-file";
    ddConfig.sectionMap = parsed.sectionMap;
    for (const [sectionId, info] of parsed.sectionMap) {
      const sectionPath = path.join(docsDir, info.pseudoFile);
      if (fs.existsSync(sectionPath)) {
        ddConfig.sectionFiles[sectionId] = sectionPath;
      }
    }
    console.log(`  📂 Multi-file BDD: ${parsed.sectionMap.size} sections detected`);
  }
}

console.log(`  📊 Token Reduction: ~${ddConfig.tokenReduction}%`);
console.log('');

// Export ddConfig for subsequent steps
// ddConfig = { mode, paths, tokenReduction, coverage, feature, docsDir, splitMode, sectionMap, sectionFiles }
```

**Output**: `ddConfig` object with mode detection results.

---

## Step 2.9: Load Stack Specialists (v7.0 — EXECUTABLE)

> **Note**: For lightweight workflows, load top-3 specialists by step keywords only.
> For feature workflows, load all matched specialists from DD component extraction.

### 2.9.1: Get specialist list for current stack

```bash
# List available code specialists for project stack
node core/cli/ops.js specialist-load --type code --list
SPECIALIST_LIST=$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const d=r.data||{};
  if(d.error) { console.log('ERROR:'+d.error); process.exit(0); }
  console.log(JSON.stringify({
    stackKey: d.stackKey||'unknown',
    variantId: d.variantId||'default',
    count: d.count||0,
    specialists: (d.specialists||[]).slice(0,10)
  }));
")
echo "📦 Stack specialists: $SPECIALIST_LIST"
```

### 2.9.2: Preload top-3 specialists for plan generation context

Load the top-3 most relevant specialists based on feature keywords, so their patterns are available during plan generation:

```bash
# Parse specialist list from 2.9.1 and load top-3 by relevance
# The specialist names come from SPECIALIST_LIST (2.9.1 output)
LOADED_SPECIALISTS=""

for SPEC_NAME in $(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const specs = (r.data?.specialists || []).slice(0, 3);
  specs.forEach(s => console.log(s.name || s));
"); do
  node core/cli/ops.js specialist-load --type code --name "$SPEC_NAME"
  SPEC_CONTENT=$(node -e "
    const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
    const d=r.data||{};
    if(d.error) { console.log(''); process.exit(0); }
    console.log(d.content||'');
  ")
  if [ -n "$SPEC_CONTENT" ]; then
    LOADED_SPECIALISTS="${LOADED_SPECIALISTS}\n--- Specialist: ${SPEC_NAME} ---\n${SPEC_CONTENT}"
    echo "✅ Loaded specialist: $SPEC_NAME ($(echo "$SPEC_CONTENT" | wc -c) chars)"
  fi
done

echo "📦 Preloaded $(echo "$LOADED_SPECIALISTS" | grep -c '--- Specialist:') specialists for plan context"
```

**IMPORTANT**: The preloaded specialist content (`LOADED_SPECIALISTS`) MUST be included in the plan generation context (Step 4). This ensures the AI generates implementation steps with correct specialist patterns.

### 2.9.3: Per-step specialist loading (during generation)

For each implementation step in the plan, load the most relevant specialist on demand:

```bash
# Load a specific code specialist by name
# (called per-step during plan generation)
SPEC_NAME="java-domain-specialist"  # determined by keyword matching
node core/cli/ops.js specialist-load --type code --name "$SPEC_NAME"
SPEC_CONTENT=$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const d=r.data||{};
  if(d.error) { console.log(''); process.exit(0); }
  console.log(d.content||'');
")
```

**Instruction to Claude**: When generating plan steps, use the preloaded specialists from 2.9.2 plus on-demand loading via 2.9.3. Match by keywords:
- Step mentions "domain", "entity" → load `java-domain-specialist`
- Step mentions "repository", "R2DBC" → load `java-r2dbc-specialist`
- Step mentions "controller", "API" → load `java-webflux-specialist`
- Step mentions "service" → load `java-service-specialist`
- Step mentions "test" → load `java-testing-specialist`

**Output**: Top-3 specialist content preloaded in `LOADED_SPECIALISTS`, additional specialists loaded on demand via `cache/ops-result.json`.

---

## Step 2.9.5: Pattern Analysis

Invoke the **pattern-analyzer** skill:
- Analyze loaded specialist patterns against project conventions
- Check for conflicts between specialist recommendations and existing codebase
- Output: Pattern alignment report — flag any mismatches for plan consideration
- Non-blocking: informational only

---

## Step 2.10: Load Architecture Context (v5.4) - CRITICAL

> **Note**: Skip this step for lightweight workflows (no Basic Design document available).

Load architecture context for plan compliance. Ensures generated code respects layer boundaries and design patterns.

```javascript
const fs = require('fs');
const path = require('path');

console.log('📐 Loading Architecture Context (v5.4)...');

let archContext = {
  source: 'none',
  patterns: [],
  layerBoundaries: [],
  constraints: []
};

// Priority 1: Query RAG arch layer
try {
  const ragService = require('./core/rag/hipporag-service.js');
  const feature = ddConfig.feature;

  ragService.getContext(
    `${feature} architecture patterns layer boundaries clean architecture`,
    { layers: ['arch'], topK: 5 }
  ).then(ragResult => {
    if (ragResult && ragResult.chunks && ragResult.chunks.length > 0) {
      archContext.source = 'rag';

      // Extract patterns from RAG results
      ragResult.chunks.forEach(chunk => {
        const patternMatches = chunk.content.match(/Pattern:\s*([^\n]+)/gi) || [];
        patternMatches.forEach(match => {
          archContext.patterns.push({
            name: match.replace(/Pattern:\s*/i, '').trim(),
            source: chunk.metadata?.source || 'rag',
            appliedTo: 'From RAG'
          });
        });

        // Extract layer definitions
        const layerMatches = chunk.content.match(/(Presentation|Application|Domain|Infrastructure|UI|API|Service|Repository)/gi) || [];
        archContext.layerBoundaries = [...new Set([
          ...archContext.layerBoundaries,
          ...layerMatches.map(l => l.trim())
        ])];
      });

      console.log(`  ✅ Architecture from RAG: ${archContext.patterns.length} patterns`);
    }
  }).catch(() => {
    console.warn('  ⚠️ RAG arch query failed, trying fallback');
  });
} catch (err) {
  console.warn('  ⚠️ RAG arch query failed, trying fallback');
}

// Priority 2: Basic Design Section 1.1, 1.2 (fallback)
if (archContext.patterns.length === 0) {
  const bdPath = path.join(ddConfig.docsDir, `${ddConfig.feature}-basic-design.md`);

  if (fs.existsSync(bdPath)) {
    const bdContent = fs.readFileSync(bdPath, 'utf8');

    // Extract Section 1.1 (System Architecture)
    const section11Match = bdContent.match(/##\s*1\.1[^\n]*\n([\s\S]*?)(?=\n##\s*1\.[2-9]|\n##\s*2\.)/);
    if (section11Match) {
      // Extract layers from ASCII diagram
      const asciiLayers = section11Match[1].match(/│\s*([A-Za-z\s]+Layer)\s*│/gi) || [];
      archContext.layerBoundaries = asciiLayers.map(l =>
        l.replace(/[│\s]/g, '').replace('Layer', '')
      );
    }

    // Extract Section 1.2 (Design Patterns)
    const section12Match = bdContent.match(/##\s*1\.2[^\n]*\n([\s\S]*?)(?=\n##\s*1\.[3-9]|\n##\s*2\.)/);
    if (section12Match) {
      // Parse pattern table
      const tableRows = section12Match[1].match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g) || [];
      tableRows.slice(2).forEach(row => { // Skip header rows
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 2 && !cells[0].includes('---')) {
          archContext.patterns.push({
            name: cells[0],
            appliedTo: cells[1],
            source: 'basic-design'
          });
        }
      });
    }

    if (archContext.patterns.length > 0) {
      archContext.source = 'basic-design';
      console.log(`  ✅ Architecture from Basic Design: ${archContext.patterns.length} patterns`);
    }
  }
}

// Priority 3: Design Standards Template (last resort)
if (archContext.patterns.length === 0) {
  archContext.source = 'design-standards';
  archContext.patterns = [
    { name: 'Clean Architecture', appliedTo: 'All layers', source: 'template' },
    { name: 'Repository Pattern', appliedTo: 'Data access', source: 'template' },
    { name: 'CQRS', appliedTo: 'Command/Query separation', source: 'template' },
    { name: 'Domain Events', appliedTo: 'Cross-boundary communication', source: 'template' }
  ];
  archContext.layerBoundaries = ['Presentation', 'Application', 'Domain', 'Infrastructure'];
  console.log(`  ⚠️ Using default architecture patterns`);
}

// Add constraints (always)
archContext.constraints = [
  'DO: Follow pattern assignments from Basic Design',
  'DO: Respect layer boundaries (no cross-layer direct calls)',
  'DO: Use dependency injection for cross-layer dependencies',
  "DON'T: Cross layer boundaries without abstraction",
  "DON'T: Add new patterns not in Basic Design without justification",
  "DON'T: Put business logic in Infrastructure layer"
];

console.log(`  📐 Architecture source: ${archContext.source}`);
console.log(`  📐 Layers: ${archContext.layerBoundaries.join(' -> ')}`);
console.log('');

// Export archContext for Step 4
// archContext = { source, patterns[], layerBoundaries[], constraints[] }
```

**Output**: `archContext` object with architecture patterns and constraints.

---

## Step 2.10.5: Architecture Compliance Check

Invoke the **architecture-analyzer** skill:
- Detect potential duplicate components in proposed plan
- Validate plan against project tech stack and layer boundaries
- Output: Architecture compliance report
- Non-blocking: informational, but flag violations prominently
- Skip for lightweight workflows (no Basic Design available)

---

## NEXT: Chain to Document Loading or Generation

**For feature workflows** (coming from `feature-workflow.md`):
→ Use the **Read tool** to load `commands/plan/document-loading.md` and follow its instructions completely.

**For lightweight workflows** (coming from `lightweight.md`):
→ Skip `document-loading.md` (no design docs). Use the **Read tool** to load `commands/plan/generation.md` and follow its instructions completely.

<!-- Next: plan/document-loading.md (feature) OR plan/generation.md (lightweight) -->
