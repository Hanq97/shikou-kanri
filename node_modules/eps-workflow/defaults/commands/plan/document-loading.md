# plan/document-loading.md — Step 3: Load Approved Documents (Mode-Aware v5.4)

**Prerequisite**: `ddConfig` object from Step 2.8 (context-loading.md) must be available.

**Note**: This step is ONLY for feature workflows. Lightweight and bugfix workflows skip this file entirely.

---

## Step 3: Load Approved Documents (Mode-Aware v5.4)

Load design documents based on `ddConfig` from Step 2.8.

**v5.4 Enhancement**: Uses ddConfig.mode to determine loading strategy:
- `pseudo-code` mode: Parse structured sections (META, TRACE_MATRIX, COMPONENTS)
- `hybrid` mode: Parse pseudo where available, load human DD for rest
- `human` mode: Load traditional markdown documents

```javascript
const fs = require('fs');
const path = require('path');

// Uses ddConfig from Step 2.8
// ddConfig = { mode, paths, tokenReduction, coverage, feature, docsDir }

console.log('📚 Loading Design Documents (v5.4)...');

// Load SRS and Basic Design (always human-readable)
const srsPath = path.join(ddConfig.docsDir, `${ddConfig.feature}-srs.md`);
const bdPath = path.join(ddConfig.docsDir, `${ddConfig.feature}-basic-design.md`);

const srsContent = fs.existsSync(srsPath) ? fs.readFileSync(srsPath, 'utf8') : '';
const bdContent = fs.existsSync(bdPath) ? fs.readFileSync(bdPath, 'utf8') : '';

console.log(`  ✅ SRS: ${srsContent ? srsContent.split('\n').length + ' lines' : 'not found'}`);
console.log(`  ✅ Basic Design: ${bdContent ? bdContent.split('\n').length + ' lines' : 'not found'}`);

// Load Detail Design based on ddConfig.mode
const fddContent = fs.existsSync(ddConfig.paths.fdd) ? fs.readFileSync(ddConfig.paths.fdd, 'utf8') : '';
const bddContent = fs.existsSync(ddConfig.paths.bdd) ? fs.readFileSync(ddConfig.paths.bdd, 'utf8') : '';

console.log(`  ✅ Frontend DD (${ddConfig.mode}): ${fddContent.split('\n').length} lines`);
console.log(`  ✅ Backend DD (${ddConfig.mode}): ${bddContent.split('\n').length} lines`);

// Parse pseudo-code sections if applicable
let fddParsed = null;
let bddParsed = null;

function parsePseudoCode(content) {
  if (!content.includes('## META') || !content.includes('TRACE_MATRIX')) {
    return null;
  }

  const sections = {};

  // Parse META
  const metaMatch = content.match(/## META\n([\s\S]*?)(?=\n##|\n---)/);
  if (metaMatch) {
    sections.meta = {};
    const lines = metaMatch[1].split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        sections.meta[key.trim()] = valueParts.join(':').trim();
      }
    });
  }

  // Parse TRACE_MATRIX
  const traceMatch = content.match(/## TRACE_MATRIX\n([\s\S]*?)(?=\n##|\n---)/);
  if (traceMatch) {
    const coverageMatch = traceMatch[1].match(/COVERAGE:\s*(\d+)%/);
    const mappings = traceMatch[1].match(/\w+-\d+\s*->\s*[\w.]+/g) || [];
    sections.traceMatrix = {
      coverage: coverageMatch ? parseInt(coverageMatch[1]) : null,
      mappings: mappings
    };
  }

  // Parse COMPONENTS
  const componentMatches = [...content.matchAll(/^COMPONENT\s+([\w.]+)\n([\s\S]*?)(?=\nCOMPONENT|\n##|\n---)/gm)];
  sections.components = componentMatches.map(m => ({
    name: m[1],
    content: m[2].trim()
  }));

  return sections;
}

if (ddConfig.mode !== 'human') {
  if (ddConfig.paths.fdd.endsWith('.pseudo')) {
    fddParsed = parsePseudoCode(fddContent);
    if (fddParsed) {
      console.log(`  📊 FDD Components: ${fddParsed.components?.length || 0}`);
    }
  }
  if (ddConfig.paths.bdd.endsWith('.pseudo')) {
    bddParsed = parsePseudoCode(bddContent);
    if (bddParsed) {
      console.log(`  📊 BDD Components: ${bddParsed.components?.length || 0}`);
    }
  }
}

// Load API contracts (optional)
const apiPath = path.join(ddConfig.docsDir, `${ddConfig.feature}-api-contracts.md`);
const apiContent = fs.existsSync(apiPath) ? fs.readFileSync(apiPath, 'utf8') : '';
if (apiContent) {
  console.log(`  ✅ API Contracts: ${apiContent.split('\n').length} lines`);
}

console.log('');
console.log(`📊 Token Optimization: ${ddConfig.mode} mode (~${ddConfig.tokenReduction}% reduction)`);
console.log('');

// Build designDocs object for Step 4
const designDocs = {
  srs: srsContent,
  basicDesign: bdContent,
  frontendDD: fddContent,
  backendDD: bddContent,
  apiContracts: apiContent,
  fddParsed: fddParsed,
  bddParsed: bddParsed,
  mode: ddConfig.mode,
  splitMode: ddConfig.splitMode,
  bddSectionMap: ddConfig.sectionMap,
  bddSectionFiles: ddConfig.sectionFiles
};

if (ddConfig.splitMode === "multi-file") {
  console.log(`  📂 BDD multi-file: master loaded, ${Object.keys(ddConfig.sectionFiles).length} section files available for Step 4`);
}
```

### Legacy Compatibility

Step 3 still supports bash-based detection for backward compatibility:

```bash
# Legacy: Find documents directory for the feature (for scripts)
node core/cli/ops.js context-detect
DOCS_DIR=$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const featureId=r.data&&r.data.featureId||'';
  const path=require('path');
  const fs=require('fs');
  // Search documents/features for directory matching featureId
  const base='documents/features';
  if(fs.existsSync(base)){
    const dirs=fs.readdirSync(base).filter(d=>d.includes(featureId));
    if(dirs.length>0) { console.log(path.join(base,dirs[0])); return; }
  }
  console.log('');
" 2>/dev/null || echo "")

FEATURE=[FEATURE-ID from context]

# Check for pseudo-code files first (v5.2)
FDD_PSEUDO="$DOCS_DIR/$FEATURE-frontend-detail-design.pseudo"
BDD_PSEUDO="$DOCS_DIR/$FEATURE-backend-detail-design.pseudo"

if [ -f "$FDD_PSEUDO" ] && [ -f "$BDD_PSEUDO" ]; then
  echo "🎯 Pseudo-code Mode: TOKEN OPTIMIZED (~70% reduction)"
  FDD_PATH="$FDD_PSEUDO"
  BDD_PATH="$BDD_PSEUDO"
  DD_MODE="pseudo-code"
elif [ -f "$FDD_PSEUDO" ]; then
  echo "🎯 Hybrid Mode: Frontend pseudo-code, Backend human DD"
  FDD_PATH="$FDD_PSEUDO"
  BDD_PATH="$DOCS_DIR/$FEATURE-backend-detail-design.md"
  DD_MODE="hybrid"
elif [ -f "$BDD_PSEUDO" ]; then
  echo "🎯 Hybrid Mode: Frontend human DD, Backend pseudo-code"
  FDD_PATH="$DOCS_DIR/$FEATURE-frontend-detail-design.md"
  BDD_PATH="$BDD_PSEUDO"
  DD_MODE="hybrid"
else
  echo "ℹ️  Human DD Mode: No pseudo-code files found (backward compatible)"
  FDD_PATH="$DOCS_DIR/$FEATURE-frontend-detail-design.md"
  BDD_PATH="$DOCS_DIR/$FEATURE-backend-detail-design.md"
  DD_MODE="human"
fi

Documents to read (Traditional Pattern):
1. $DOCS_DIR/$FEATURE-srs.md                     (SRS - always human)
2. $DOCS_DIR/$FEATURE-basic-design.md            (Basic Design - always human)
3. $FDD_PATH                                     (Frontend Detail Design - pseudo-code if available)
4. $BDD_PATH                                     (Backend Detail Design - pseudo-code if available)
5. $DOCS_DIR/$FEATURE-api-contracts.md           (API Contracts - optional)

Documents to read (A+B+C FDD Pattern - for features with ≥4 sub-features):
1. $DOCS_DIR/$FEATURE-srs.md                     (SRS)
2. $DOCS_DIR/$FEATURE-basic-design.md            (Basic Design)
3. $DOCS_DIR/$FEATURE-portal-fdd.md              (Document A: Portal/Domain FDD)
4. $DOCS_DIR/$FEATURE-aggregate-fdd.md           (Document B: Aggregate FDD)
5. $DOCS_DIR/$FEATURE-*-screens-fdd.md           (Document C: Screens FDD per sub-feature)

**Auto-detection**: Check if portal-fdd.md exists to determine pattern.
```

### Display Summary

```
✅ Loaded approved design documents:
   - SRS: [FEATURE]-srs.md ([X] lines)
   - Basic Design: [FEATURE]-basic-design.md ([X] lines)
   - Detail Design Mode: [DD_MODE] (pseudo-code | hybrid | human)
     - Frontend: [FDD_PATH] ([X] lines) [TOKEN OPTIMIZED if .pseudo]
     - Backend: [BDD_PATH] ([X] lines) [TOKEN OPTIMIZED if .pseudo]
     - API Contracts: [FEATURE]-api-contracts.md ([X] lines)
   - Detail Design (A+B+C Pattern - if applicable):
     - [FEATURE]-portal-fdd.md ([X] lines)
     - [FEATURE]-aggregate-fdd.md ([X] lines)
     - [FEATURE]-*-screens-fdd.md ([X] files)

📊 Token Optimization Summary (v5.2):
   - DD Mode: [DD_MODE]
   - Estimated Token Reduction: [70% if pseudo-code, 35% if hybrid, 0% if human]

📊 Extracting requirements...
   - Functional requirements: 23 (FR-XXX-001 to FR-XXX-023)
   - Non-functional requirements: 8
   - Use cases: 12
   - API endpoints: 8
   - Database tables: 5
```

---

**NEXT**: Use the **Read tool** to load `commands/plan/generation.md` and follow its instructions completely.

<!-- Next: plan/generation.md — Steps 4 + 4.5: Plan Generation + Auto-Split -->
