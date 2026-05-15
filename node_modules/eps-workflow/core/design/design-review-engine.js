/**
 * Design Review Engine v1.0
 * Programmatic quality review for Detail Design documents (BDD + FDD)
 *
 * Architecture: 4-phase review flow [E1]
 *   Phase 1: Validate & Parse (DesignParser)
 *   Phase 2: Hard Gates (Q4 Interface Purity + Q2 Duplicate IDs)
 *   Phase 3: Soft Scores (Q1 Evidence 35% + Q3 Bilingual 25% + Q5 Alignment 40%)
 *   Phase 4: Aggregate & Report
 *
 * Scoring: 3-layer model [L7]
 *   Layer 1: Hard Gates (binary pass/fail) — any fail = overall FAIL
 *   Layer 2: Soft Scores (weighted, threshold >= 90%)
 *   Layer 3: Informational (Q2 naming — reported, no gate)
 *
 * Based on: DD v1.2, plan-review-engine.js (813 lines)
 */

const fs = require('fs')
const path = require('path')

// ============================================================================
// DesignParser — Parse DD markdown into structured design object [DD §2.2]
// ============================================================================

class DesignParser {
  // Type configs [E3, E4, E9]
  static CONFIGS = {
    bdd: {
      idPatterns: [
        /SVC-\d{3}/g, /API-\d{3}/g, /DTO-\d{3}/g, /BR-\d{3}/g,
        /ENT-\d{3}/g, /ERR-\d{3}/g, /TC-\d{3}/g, /INT-\d{3}/g,
        /EVT-\d{3}/g, /PERF-\d{3}/g, /SEC-\d{3}/g
      ],
      sectionNames: [
        'Document Info', 'Service Overview', 'Business Logic',
        'API Endpoints', 'Data & Database', 'Integration',
        'Error Handling', 'Performance', 'Security', 'Test Cases'
      ],
      expectedSections: 10
    },
    fdd: {
      idPatterns: [
        /CMP-\d{3}/g, /SCR-\d{3}/g, /STM-\d{3}/g,
        /FLW-\d{3}/g, /VLD-\d{3}/g
      ],
      sectionNames: [
        'Document Info', 'Overview', 'Business Flow', 'Screens',
        'State', 'Data Integration', 'Error', 'Responsive',
        'Performance', 'Visual Design'
      ],
      expectedSections: 10
    }
  }

  // [N2 fix] typeOverride = explicit --type flag, auto-detect as fallback [L1]
  parse(ddPath, typeOverride = null) {
    const content = fs.readFileSync(ddPath, 'utf8')

    // [L1] --type flag override first, then auto-detect from filename
    let type = typeOverride
    if (!type) {
      if (ddPath.includes('backend-detail-design')) type = 'bdd'
      else if (ddPath.includes('frontend-detail-design')) type = 'fdd'
    }

    if (!type) {
      // [N3 fix] Set error.code for _handleError matching
      const err = new Error('Cannot detect DD type from filename. Use --type flag.')
      err.code = 'TYPE_ERROR'
      throw err
    }

    const config = DesignParser.CONFIGS[type]

    // Parse structure
    const sections = this._parseSections(content)
    const ids = this._extractIds(content, config.idPatterns)
    const evidenceRefs = this._extractEvidenceRefs(content)
    const codeBlocks = this._extractCodeBlocks(content)

    return {
      path: ddPath,
      name: path.basename(ddPath),
      type,
      config,
      content,
      sections,
      ids,
      evidenceRefs,
      codeBlocks,
      wordCount: this._countWords(content),
      sectionCount: sections.length
    }
  }

  // Parse ## N. Title headers [E9]
  _parseSections(content) {
    const headerRegex = /^##\s+(\d+)\.?\s+(.+)$/gm
    const sections = []
    let match
    const lines = content.split('\n')

    while ((match = headerRegex.exec(content)) !== null) {
      const lineStart = content.substring(0, match.index).split('\n').length
      sections.push({
        index: parseInt(match[1]),
        title: match[2].trim(),
        lineStart,
        content: ''
      })
    }

    // Fill content between sections
    for (let i = 0; i < sections.length; i++) {
      const start = sections[i].lineStart
      const end = i + 1 < sections.length ? sections[i + 1].lineStart - 1 : lines.length
      sections[i].content = lines.slice(start - 1, end).join('\n')
      sections[i].lineEnd = end
    }

    return sections
  }

  // Extract all IDs and track duplicates [E9]
  _extractIds(content, patterns) {
    const all = []
    const byType = {}
    const seen = new Set()
    const duplicates = []

    for (const pattern of patterns) {
      pattern.lastIndex = 0
      const matches = content.match(pattern) || []
      const prefix = pattern.source.match(/^([A-Z]+)/)?.[1] || 'UNKNOWN'
      byType[prefix] = matches

      for (const id of matches) {
        if (seen.has(id)) {
          if (!duplicates.includes(id)) duplicates.push(id)
        } else {
          seen.add(id)
        }
        all.push(id)
      }
    }

    return { all: [...new Set(all)], byType, duplicates }
  }

  // [H1+H2 fix] Extract evidence refs with dedup and narrow regex
  _extractEvidenceRefs(content) {
    const refs = []
    const seen = new Set()

    const patterns = [
      { regex: /FR-\d{3}/g, type: 'FR' },
      { regex: /NFR-\d{3}/g, type: 'NFR' },
      { regex: /BR-\d{3}/g, type: 'BR' },
      // Evidence: bracketed form [E1] first, then standalone E1
      { regex: /\[E(\d{1,2})\]/g, type: 'Evidence' },
      // [H2 fix] Negative lookbehind: exclude "Excel", "Enterprise" etc.
      // \d{1,2} limits to E1-E99 (actual evidence IDs)
      { regex: /(?<![a-zA-Z])E(\d{1,2})(?!\d)(?!\w*[a-z])/g, type: 'Evidence' }
    ]

    for (const { regex, type } of patterns) {
      let match
      while ((match = regex.exec(content)) !== null) {
        const id = match[0].replace(/[\[\]]/g, '') // Normalize: [E1] → E1
        const key = `${type}:${id}`
        if (!seen.has(key)) {
          seen.add(key)
          refs.push({ id, type, raw: match[0] })
        }
      }
    }

    return refs
  }

  // Extract code blocks (for Q4 checking)
  _extractCodeBlocks(content) {
    const blocks = []
    const regex = /```(\w*)\n([\s\S]*?)```/g
    let match

    while ((match = regex.exec(content)) !== null) {
      const lineStart = content.substring(0, match.index).split('\n').length
      blocks.push({
        lang: match[1] || 'unknown',
        content: match[2],
        lineStart,
        lineEnd: lineStart + match[2].split('\n').length
      })
    }

    return blocks
  }

  // Count words (excluding code blocks and markdown) [E1 pattern]
  _countWords(content) {
    const clean = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*_\-|[\]]/g, ' ')
    return clean.split(/\s+/).filter(w => w.length > 0).length
  }
}

// ============================================================================
// Hard Gate: InterfacePurityAnalyzer (Q4) [DD §2.3]
// ============================================================================

class InterfacePurityAnalyzer {
  analyze(design) {
    // Delegate to type-specific checker [L5]
    const checker = design.type === 'bdd'
      ? new BDDPurityChecker()
      : new FDDPurityChecker()
    return checker.check(design)
  }
}

class BDDPurityChecker {
  // Patterns from [E10] BDD Prohibited
  static PATTERNS = [
    { regex: /@Entity|@Table|@Column|@ManyToOne|@OneToMany|@JoinColumn|@Id|@GeneratedValue/g,
      category: 'ORM Decorators', severity: 'critical' },
    { regex: /CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|CREATE\s+INDEX/gi,
      category: 'SQL DDL', severity: 'critical' },
    // [N7 fix] SQL DML from E10
    { regex: /SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM/gi,
      category: 'SQL DML', severity: 'critical' },
    { regex: /@Service|@Repository|@Controller|@RestController|@Component|@Autowired|@Bean/g,
      category: 'Spring Annotations', severity: 'critical' },
    { regex: /EntityManager|SessionFactory|DataSource|JdbcTemplate/g,
      category: 'Concrete Implementations', severity: 'high' },
    { regex: /R2dbcEntityTemplate|DatabaseClient\.sql|ConnectionFactory/g,
      category: 'R2DBC Specifics', severity: 'high' }
  ]

  check(design) {
    const violations = []
    // Check content OUTSIDE pseudo/mermaid code blocks [E10]
    const contentOutsideAllowed = this._stripAllowedBlocks(design.content)

    for (const pattern of BDDPurityChecker.PATTERNS) {
      pattern.regex.lastIndex = 0
      const matches = contentOutsideAllowed.match(pattern.regex) || []
      for (const match of matches) {
        violations.push({
          pattern: match,
          category: pattern.category,
          severity: pattern.severity
        })
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      violationCount: violations.length,
      details: {
        type: 'bdd',
        patternsChecked: BDDPurityChecker.PATTERNS.length,
        contentLinesChecked: contentOutsideAllowed.split('\n').length
      }
    }
  }

  _stripAllowedBlocks(content) {
    return content
      .replace(/```pseudo[\s\S]*?```/g, '')
      .replace(/```mermaid[\s\S]*?```/g, '')
  }
}

class FDDPurityChecker {
  // Patterns from [E10] FDD Prohibited
  static PATTERNS = [
    { regex: /import\s+.*\s+from|export\s+(default\s+)?function|export\s+(default\s+)?const/g,
      category: 'JS Import/Export', severity: 'critical' },
    { regex: /useState|useEffect|useCallback|useMemo|useRef|useContext/g,
      category: 'React Hooks', severity: 'critical' },
    { regex: /React\.createElement|<[A-Z][a-zA-Z]+/g,
      category: 'JSX/React', severity: 'critical' },
    { regex: /@media|\.module\.css|styled\-components|className=/g,
      category: 'CSS/Styling', severity: 'critical' },
    { regex: /interface\s+\w+\s*\{|type\s+\w+\s*=/g,
      category: 'TypeScript Types', severity: 'high' },
    { regex: /webpack|vite\.config|next\.config|tsconfig/g,
      category: 'Build Config', severity: 'high' }
  ]

  check(design) {
    const violations = []
    const contentOutsideAllowed = this._stripAllowedBlocks(design.content)

    for (const pattern of FDDPurityChecker.PATTERNS) {
      pattern.regex.lastIndex = 0
      const matches = contentOutsideAllowed.match(pattern.regex) || []
      for (const match of matches) {
        violations.push({
          pattern: match,
          category: pattern.category,
          severity: pattern.severity
        })
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      violationCount: violations.length,
      details: {
        type: 'fdd',
        patternsChecked: FDDPurityChecker.PATTERNS.length,
        contentLinesChecked: contentOutsideAllowed.split('\n').length
      }
    }
  }

  _stripAllowedBlocks(content) {
    return content
      .replace(/```pseudo[\s\S]*?```/g, '')
      .replace(/```mermaid[\s\S]*?```/g, '')
  }
}

// ============================================================================
// ConsistencyAnalyzer (Q2 — Hard Gate + Soft Score) [DD §2.4, H5 fix]
// ============================================================================

class ConsistencyAnalyzer {
  // === HARD GATE: Duplicate IDs ===
  checkDuplicateIds(design) {
    const duplicates = design.ids.duplicates
    return {
      passed: duplicates.length === 0,
      duplicates,
      details: {
        totalUniqueIds: design.ids.all.length,
        duplicateCount: duplicates.length,
        duplicateList: duplicates
      }
    }
  }

  // === SOFT SCORE: Naming Convention ===
  analyzeNamingConvention(design) {
    const config = design.config
    const totalIds = design.ids.all.length
    let validIds = 0

    for (const id of design.ids.all) {
      // [H5 fix] pattern.lastIndex = 0 before each .test()
      // RegExp with /g flag retains lastIndex between calls → false negative if not reset
      const isValid = config.idPatterns.some(pattern => {
        pattern.lastIndex = 0
        return pattern.test(id)
      })
      if (isValid) validIds++
    }

    const score = totalIds > 0 ? Math.round((validIds / totalIds) * 100) : 100

    const improvements = []
    if (score < 100) {
      const invalidIds = design.ids.all.filter(id =>
        !config.idPatterns.some(p => { p.lastIndex = 0; return p.test(id) })
      )
      improvements.push({
        severity: 'medium',
        message: `${invalidIds.length} IDs don't match expected naming: ${invalidIds.slice(0, 5).join(', ')}${invalidIds.length > 5 ? '...' : ''}`,
        impact: 5
      })
    }

    return { score, details: { totalIds, validIds }, improvements }
  }
}

// ============================================================================
// Soft Score: EvidenceTraceabilityAnalyzer (Q1, weight 35%) [DD §2.5]
// ============================================================================

class EvidenceTraceabilityAnalyzer {
  async analyze(design) {
    let sectionsWithRefs = 0
    const sectionDetails = []

    for (const section of design.sections) {
      // Skip section 0 (document info) — metadata, no evidence needed
      if (section.index === 0) continue

      const refs = design.evidenceRefs.filter(ref =>
        section.content.includes(ref.id)
      )

      const hasRef = refs.length > 0
      if (hasRef) sectionsWithRefs++

      sectionDetails.push({
        section: section.index,
        title: section.title,
        refCount: refs.length,
        refs: refs.map(r => r.id),
        hasRef
      })
    }

    const reviewableSections = design.sections.filter(s => s.index > 0).length
    const coverage = reviewableSections > 0
      ? (sectionsWithRefs / reviewableSections) * 100
      : 0

    const score = Math.round(coverage)

    const improvements = sectionDetails
      .filter(s => !s.hasRef)
      .map(s => ({
        severity: 'high',
        message: `Section ${s.section} "${s.title}" has no evidence references (FR-XXX, BR-XXX, E-XXX)`,
        impact: 10
      }))

    return { score, details: sectionDetails, improvements }
  }
}

// ============================================================================
// Soft Score: BilingualAnalyzer (Q3, weight 25%) [DD §2.6, C1 fix]
// ============================================================================

class BilingualAnalyzer {
  async analyze(design) {
    // Import existing validator [L4]
    let LanguageValidator
    try {
      LanguageValidator = require('../design-validators/language-validator')
    } catch (e) {
      // If import fails, return 0% score
      return {
        score: 0,
        details: { error: 'Cannot import language-validator.js' },
        improvements: [{
          severity: 'high',
          message: 'Cannot import language-validator.js — Q3 will score 0%',
          impact: 25
        }]
      }
    }

    // [C1 fix] Do NOT call validator.validate() — it returns exit code (0/1),
    // calls console.log() everywhere, and process.exit(1) on read error.
    // Use countWords() + validateHeading() directly — public methods, no side effects.
    const validator = new LanguageValidator(design.path, 0.60)

    // countWords() per line — same logic validate() uses internally
    const lines = design.content.split('\n')
    for (const line of lines) {
      const { vnCount, enCount, totalCount } = validator.countWords(line)
      validator.stats.vietnameseWords += vnCount
      validator.stats.englishWords += enCount
      validator.stats.totalWords += totalCount
    }

    // Compute ratio
    if (validator.stats.totalWords > 0) {
      validator.stats.ratio = validator.stats.vietnameseWords / validator.stats.totalWords
    }

    // Heading violations — validateHeading() pushes to this.violations, no console
    for (let i = 0; i < lines.length; i++) {
      validator.validateHeading(lines[i], i + 1)
    }

    const score = Math.min(Math.round(validator.stats.ratio * 100), 100)

    const improvements = []
    if (validator.stats.ratio < 0.60) {
      improvements.push({
        severity: 'high',
        message: `Vietnamese ratio ${score}% below 60% threshold. Found ${validator.stats.vietnameseWords} VN / ${validator.stats.totalWords} total words`,
        impact: 15
      })
    }
    if (validator.violations.length > 0) {
      improvements.push({
        severity: 'medium',
        message: `${validator.violations.length} heading format violations`,
        impact: 5
      })
    }

    return {
      score,
      details: {
        ratio: validator.stats.ratio,
        vietnameseWords: validator.stats.vietnameseWords,
        englishWords: validator.stats.englishWords,
        totalWords: validator.stats.totalWords,
        headingViolations: validator.violations
      },
      improvements
    }
  }
}

// ============================================================================
// Soft Score: DecisionAlignmentAnalyzer (Q5, weight 40%) [DD §2.7]
// ============================================================================

class DecisionAlignmentAnalyzer {
  async analyze(design, contextFiles) {
    const checklist = []

    // Step 1: EXTRACT checklist from upstream docs [L6]

    // 1a: From innovate-bd-selection.md — architecture decisions
    if (contextFiles.innovateBdSelectionPath && fs.existsSync(contextFiles.innovateBdSelectionPath)) {
      const bdSelection = fs.readFileSync(contextFiles.innovateBdSelectionPath, 'utf8')
      const decisions = this._extractDecisions(bdSelection)
      decisions.forEach(d => checklist.push({
        source: 'innovate-bd-selection',
        type: 'architecture_decision',
        name: d.name,
        context: d.context,
        required: true
      }))
    }

    // 1a-bis: From innovate-dd-selection.md — technical choices [H4 fix]
    if (contextFiles.innovateDdSelectionPath && fs.existsSync(contextFiles.innovateDdSelectionPath)) {
      const ddSelection = fs.readFileSync(contextFiles.innovateDdSelectionPath, 'utf8')
      const techChoices = this._extractDecisions(ddSelection)
      techChoices.forEach(d => checklist.push({
        source: 'innovate-dd-selection',
        type: 'technical_choice',
        name: d.name,
        context: d.context,
        required: true
      }))
    }

    // 1b: From BD — components
    if (contextFiles.bdPath && fs.existsSync(contextFiles.bdPath)) {
      const bd = fs.readFileSync(contextFiles.bdPath, 'utf8')
      const components = this._extractComponents(bd)
      components.forEach(c => checklist.push({
        source: 'basic-design',
        type: 'component',
        name: c,
        context: null,
        required: true
      }))
    }

    // 1c: From SRS — functional requirements
    if (contextFiles.srsPath && fs.existsSync(contextFiles.srsPath)) {
      const srs = fs.readFileSync(contextFiles.srsPath, 'utf8')
      const frs = (srs.match(/FR-\d{3}/g) || [])
      ;[...new Set(frs)].forEach(fr => checklist.push({
        source: 'srs',
        type: 'requirement',
        name: fr,
        context: null,
        required: true
      }))
    }

    // Step 2: VERIFY each item in DD content [L6]
    // [H3 fix] FOUND / MISSING / CONTRADICTED
    let found = 0
    let missing = 0
    let contradicted = 0
    const details = []
    const contentLower = design.content.toLowerCase()

    for (const item of checklist) {
      let status = 'MISSING'
      const nameLower = item.name.toLowerCase()

      if (item.type === 'requirement') {
        status = contentLower.includes(nameLower) ? 'FOUND' : 'MISSING'

      } else if (item.type === 'architecture_decision' || item.type === 'technical_choice') {
        if (contentLower.includes(nameLower)) {
          status = 'FOUND'
        } else if (item.context && contentLower.includes(item.context.toLowerCase())) {
          // DD mentions CATEGORY but with DIFFERENT value → CONTRADICTED
          status = 'CONTRADICTED'
        } else {
          status = 'MISSING'
        }

      } else if (item.type === 'component') {
        status = contentLower.includes(nameLower) ? 'FOUND' : 'MISSING'
      }

      if (status === 'FOUND') found++
      else if (status === 'MISSING') missing++
      else if (status === 'CONTRADICTED') contradicted++

      details.push({ ...item, status })
    }

    // Step 3: SCORE [L6]
    const total = checklist.length
    const score = total > 0 ? Math.round((found / total) * 100) : 100

    // Improvements
    const improvements = details
      .filter(d => d.status !== 'FOUND')
      .map(d => ({
        severity: d.status === 'CONTRADICTED' ? 'critical' :
                  (d.type === 'architecture_decision' ? 'critical' : 'high'),
        message: d.status === 'CONTRADICTED'
          ? `${d.type} "${d.context}" contradicts approved decision "${d.name}" from ${d.source}`
          : `${d.type} "${d.name}" from ${d.source} not found in DD`,
        impact: d.status === 'CONTRADICTED' ? 20 :
                (d.type === 'architecture_decision' ? 15 : 10)
      }))

    return { score, details, improvements, summary: { found, missing, contradicted } }
  }

  // [N4 fix] 2-phase parsing: only extract from decision sections
  _extractDecisions(selectionContent) {
    const decisions = []
    const lines = selectionContent.split('\n')

    let inDecisionSection = false
    const decisionSectionHeaders = [
      /^##\s+Technical Decisions/i,
      /^##\s+Inherited/i,
      /^###\s+L\d+/i,
      /^###\s+D\d+/i
    ]
    const metadataSectionHeaders = [
      /^##\s+Selection Summary/i,
      /^##\s+Implementation Files/i,
      /^##\s+User Feedback/i
    ]

    for (const line of lines) {
      if (decisionSectionHeaders.some(h => h.test(line))) {
        inDecisionSection = true
        continue
      }
      if (metadataSectionHeaders.some(h => h.test(line))) {
        inDecisionSection = false
        continue
      }

      if (!inDecisionSection) continue

      // Match: "**Decision**: Single DesignParser class ..."
      const kvMatch = line.match(/\*\*(.+?)\*\*:\s*(.+)/)
      if (kvMatch) {
        const context = kvMatch[1].trim()
        const name = kvMatch[2].trim()
        if (!['Field', 'Value', 'File', 'Action', 'Estimated Lines'].includes(context)) {
          decisions.push({ name, context })
        }
        continue
      }
      // Match: "- D1: Clean Architecture"
      const dMatch = line.match(/[-*]\s*\*?\*?D\d+\*?\*?:\s*(.+)/i)
      if (dMatch) {
        decisions.push({ name: dMatch[1].trim(), context: null })
      }
    }
    return decisions
  }

  // Extract component names from BD tables
  _extractComponents(bdContent) {
    const components = []
    const match = bdContent.match(/\|\s*Component\s*\|[\s\S]*?(?=\n\n|\n##)/i)
    if (match) {
      const rows = match[0].split('\n').filter(r => r.includes('|') && !r.includes('---'))
      rows.slice(1).forEach(row => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c)
        if (cells[0]) components.push(cells[0])
      })
    }
    return components
  }
}

// ============================================================================
// DesignReviewEngine — Main orchestrator class [DD §2.1]
// 4-phase review: Parse → Hard Gates → Soft Scores → Aggregate
// ============================================================================

class DesignReviewEngine {
  constructor(options = {}) {
    this.softThreshold = options.threshold || 90
    this.verbose = options.verbose || false
    this._analyzers = null // Lazy-loaded

    // Context files for Q5 Traceability Matrix
    this.contextDir = options.contextDir || null
    // [N8 fix] Removed evidencePath — no analyzer uses it directly
    this.bdPath = options.bdPath || null
    this.srsPath = options.srsPath || null
    // [H4 fix] Separate BD selection and DD selection — L6 requires both
    this.innovateBdSelectionPath = options.innovateBdSelectionPath || null
    this.innovateDdSelectionPath = options.innovateDdSelectionPath || null
  }

  // Lazy analyzer initialization [E1 pattern]
  get analyzers() {
    if (!this._analyzers) {
      this._analyzers = {
        evidenceTraceability: new EvidenceTraceabilityAnalyzer(),
        consistency: new ConsistencyAnalyzer(),
        bilingual: new BilingualAnalyzer(),
        interfacePurity: new InterfacePurityAnalyzer(),
        decisionAlignment: new DecisionAlignmentAnalyzer()
      }
    }
    return this._analyzers
  }

  // Main review method — 4-phase [E1]
  // [N2 fix] options.type passed through to parser for --type flag override [L1]
  async review(ddPath, options = {}) {
    const startTime = Date.now()

    try {
      // Phase 1: Validate & Parse
      const design = await this._validateAndParse(ddPath, options.type)

      // Phase 2: Hard Gates (Q4 + Q2 duplicates) [L7]
      const hardGateResult = await this._checkHardGates(design)
      if (!hardGateResult.passed) {
        return this._buildFailResult(design, hardGateResult, startTime)
      }

      // Phase 3: Soft Scores (Q1, Q3, Q5, Q2 naming) [L7]
      const softScores = await this._calculateSoftScores(design)

      // Phase 4: Aggregate & Report
      return this._aggregateResults(design, hardGateResult, softScores, startTime)

    } catch (error) {
      return this._handleError(error, ddPath)
    }
  }

  // [N1 fix] Phase 1: Validate file exists, parse with DesignParser
  async _validateAndParse(ddPath, typeOverride = null) {
    if (!ddPath || typeof ddPath !== 'string') {
      const err = new Error('Invalid ddPath parameter')
      err.code = 'TYPE_ERROR'
      throw err
    }

    if (!fs.existsSync(ddPath)) {
      const err = new Error(`DD file not found: ${ddPath}`)
      err.code = 'ENOENT'
      throw err
    }

    const parser = new DesignParser()
    return parser.parse(ddPath, typeOverride)
  }

  // Phase 2: Hard Gates [L7]
  async _checkHardGates(design) {
    const q4Result = this.analyzers.interfacePurity.analyze(design)
    const q2DupResult = this.analyzers.consistency.checkDuplicateIds(design)

    const gates = {
      q4_purity: q4Result,
      q2_duplicates: q2DupResult
    }

    return {
      passed: q4Result.passed && q2DupResult.passed,
      gates,
      failures: Object.entries(gates)
        .filter(([_, v]) => !v.passed)
        .map(([k, v]) => ({ gate: k, ...v }))
    }
  }

  // Phase 3: Soft Scores [L7]
  async _calculateSoftScores(design) {
    // Parallel execution [E1 pattern]
    const [q1, q3, q5, q2naming] = await Promise.all([
      this.analyzers.evidenceTraceability.analyze(design),
      this.analyzers.bilingual.analyze(design),
      this.analyzers.decisionAlignment.analyze(design, {
        innovateBdSelectionPath: this.innovateBdSelectionPath,
        innovateDdSelectionPath: this.innovateDdSelectionPath,
        bdPath: this.bdPath,
        srsPath: this.srsPath
      }),
      this.analyzers.consistency.analyzeNamingConvention(design)
    ])

    // Weighted score [L7]: Q1=35%, Q3=25%, Q5=40%
    // Q2 naming is informational (not weighted)
    const weighted = (q1.score * 0.35) + (q3.score * 0.25) + (q5.score * 0.40)
    const overall = Math.round(weighted * 10) / 10

    return {
      overall,
      passed: overall >= this.softThreshold,
      dimensions: {
        evidenceTraceability: { ...q1, weight: 0.35 },
        bilingual: { ...q3, weight: 0.25 },
        decisionAlignment: { ...q5, weight: 0.40 },
        namingConvention: { ...q2naming, weight: 0, informational: true }
      }
    }
  }

  // Phase 4: Aggregate [E1 pattern]
  _aggregateResults(design, hardGates, softScores, startTime) {
    const allImprovements = []

    // Collect hard gate improvements
    for (const failure of hardGates.failures) {
      allImprovements.push({
        severity: 'critical',
        dimension: failure.gate,
        message: failure.gate === 'q4_purity'
          ? `${failure.violationCount} interface purity violations found`
          : `${failure.details.duplicateCount} duplicate IDs found: ${failure.duplicates.join(', ')}`,
        impact: 50
      })
    }

    // Collect soft score improvements
    for (const [dim, result] of Object.entries(softScores.dimensions)) {
      if (result.improvements) {
        result.improvements.forEach(imp => allImprovements.push({
          ...imp,
          dimension: dim
        }))
      }
    }

    // Sort: critical → high → medium → low, then by impact [E1]
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    allImprovements.sort((a, b) =>
      (severityOrder[a.severity] - severityOrder[b.severity]) || (b.impact - a.impact)
    )

    return {
      passed: hardGates.passed && softScores.passed,
      overall: hardGates.passed ? softScores.overall : 0,
      threshold: this.softThreshold,

      hardGates: {
        passed: hardGates.passed,
        gates: hardGates.gates
      },
      softScores: {
        passed: softScores.passed,
        overall: softScores.overall,
        dimensions: softScores.dimensions
      },

      designMetadata: {
        path: design.path,
        name: design.name,
        type: design.type,
        wordCount: design.wordCount,
        sectionCount: design.sectionCount,
        idCount: design.ids.all.length
      },

      improvements: allImprovements,
      executionTime: Date.now() - startTime,
      readyForPlanning: hardGates.passed && softScores.passed
    }
  }

  // [C2 fix] Hard gate fail → skip soft scores → return complete ReviewResult
  _buildFailResult(design, hardGateResult, startTime) {
    const improvements = hardGateResult.failures.map(failure => ({
      severity: 'critical',
      dimension: failure.gate,
      message: failure.gate === 'q4_purity'
        ? `${failure.violationCount} interface purity violations: ${failure.violations.slice(0, 5).map(v => v.pattern).join(', ')}${failure.violations.length > 5 ? '...' : ''}`
        : `${failure.details.duplicateCount} duplicate IDs: ${failure.duplicates.join(', ')}`,
      impact: 50
    }))

    return {
      passed: false,
      overall: 0,
      threshold: this.softThreshold,

      hardGates: {
        passed: false,
        gates: hardGateResult.gates
      },

      softScores: {
        skipped: true,
        reason: 'Hard gate failed — soft scores not evaluated',
        passed: false,
        overall: 0,
        dimensions: {}
      },

      designMetadata: {
        path: design.path,
        name: design.name,
        type: design.type,
        wordCount: design.wordCount,
        sectionCount: design.sectionCount,
        idCount: design.ids.all.length
      },

      improvements,
      executionTime: Date.now() - startTime,
      readyForPlanning: false
    }
  }

  // [C3 fix] Structured error response — caller always gets consistent ReviewResult
  _handleError(error, ddPath) {
    const errorMap = {
      'ENOENT': {
        code: 'ENOENT',
        message: `DD file not found: ${ddPath}`,
        severity: 'high'
      },
      'TYPE_ERROR': {
        code: 'TYPE_ERROR',
        message: error.message,
        severity: 'high'
      }
    }

    const mapped = errorMap[error.code] || {
      code: 'UNKNOWN',
      message: `Unexpected error reviewing ${ddPath}: ${error.message}`,
      severity: 'high'
    }

    return {
      passed: false,
      overall: 0,
      threshold: this.softThreshold,
      error: mapped,
      hardGates: { passed: false, gates: {} },
      softScores: {
        skipped: true,
        reason: mapped.message,
        passed: false,
        overall: 0,
        dimensions: {}
      },
      designMetadata: {
        path: ddPath,
        name: ddPath ? path.basename(ddPath) : 'unknown'
      },
      improvements: [{
        severity: mapped.severity,
        dimension: 'system',
        message: mapped.message,
        impact: 100
      }],
      executionTime: 0,
      readyForPlanning: false
    }
  }
}

// ============================================================================
// DesignReviewReporter — extends ReviewReporter [DD §3.4, N5+N6 fix]
// Override formatCLI/formatMarkdown for 2-layer (hard gates + soft scores) output
// ============================================================================

const { ReviewReporter } = require('../validate/review-reporter')

class DesignReviewReporter extends ReviewReporter {
  formatCLI(result) {
    const output = []

    // Header
    output.push('╔══════════════════════════════════════════════════════════════╗')
    output.push('║                   DESIGN REVIEW REPORT                       ║')
    output.push('╚══════════════════════════════════════════════════════════════╝')
    output.push('')

    // Design metadata
    if (result.designMetadata) {
      output.push(`📄 Design: ${result.designMetadata.name}`)
      output.push(`   Type: ${(result.designMetadata.type || '?').toUpperCase()} | ${result.designMetadata.sectionCount || '?'} sections | ${result.designMetadata.wordCount || '?'} words | ${result.designMetadata.idCount || '?'} IDs`)
      output.push('')
    }

    // Error case
    if (result.error) {
      output.push(`❌ ERROR: ${result.error.message}`)
      return output.join('\n')
    }

    // Hard Gates section
    output.push('🔒 HARD GATES:')
    if (result.hardGates && result.hardGates.gates) {
      const q4 = result.hardGates.gates.q4_purity
      const q2 = result.hardGates.gates.q2_duplicates
      if (q4) output.push(`   Q4 Interface Purity: ${q4.passed ? '✅ PASS' : '❌ FAIL'} (${q4.violationCount || 0} violations)`)
      if (q2) output.push(`   Q2 Duplicate IDs:    ${q2.passed ? '✅ PASS' : '❌ FAIL'} (${q2.details?.duplicateCount || 0} duplicates)`)
    }
    output.push('')

    // Soft Scores section
    if (result.softScores?.skipped) {
      output.push(`📊 SOFT SCORES: ⏭ SKIPPED (${result.softScores.reason})`)
    } else {
      const ss = result.softScores
      output.push(`📊 SOFT SCORES: ${ss?.overall || 0}% ${ss?.passed ? '✅ PASS' : '❌ FAIL'} (threshold: ${result.threshold}%)`)
      output.push('')
      if (ss?.dimensions) {
        for (const [name, dim] of Object.entries(ss.dimensions)) {
          const bar = this._progressBar(dim.score, 10)
          const label = dim.informational ? 'ℹ️ ' : '   '
          const suffix = dim.informational ? ' (informational)' : ` (${Math.round(dim.weight * 100)}%)`
          output.push(`${label}${this._padRight(name, 28)}: ${bar} ${dim.score}%${suffix}`)
        }
      }
    }
    output.push('')

    // Improvements
    if (result.improvements?.length > 0) {
      output.push(`📝 IMPROVEMENTS (${result.improvements.length}):`)
      for (const imp of result.improvements) {
        const icon = imp.severity === 'critical' ? '🔴' :
                     imp.severity === 'high' ? '⚠️ ' :
                     imp.severity === 'medium' ? 'ℹ️ ' : '💡'
        output.push(`   ${icon} [${imp.severity}] ${imp.message}`)
      }
      output.push('')
    }

    output.push(`⏱  Execution time: ${result.executionTime}ms`)
    return output.join('\n')
  }

  formatMarkdown(result) {
    const output = []
    output.push('# Design Review Report')
    output.push('')

    if (result.designMetadata) {
      output.push(`**Design**: ${result.designMetadata.name}`)
      output.push(`**Type**: ${(result.designMetadata.type || '?').toUpperCase()}`)
      output.push(`**Result**: ${result.passed ? '✅ PASS' : '❌ FAIL'} (${result.overall}% / ${result.threshold}%)`)
      output.push('')
    }

    // Hard Gates table
    output.push('## Hard Gates')
    output.push('| Gate | Status | Details |')
    output.push('|------|--------|---------|')
    if (result.hardGates?.gates) {
      for (const [name, gate] of Object.entries(result.hardGates.gates)) {
        output.push(`| ${name} | ${gate.passed ? 'PASS' : 'FAIL'} | ${gate.violationCount || gate.details?.duplicateCount || 0} issues |`)
      }
    }
    output.push('')

    // Soft Scores table
    output.push('## Soft Scores')
    if (result.softScores?.skipped) {
      output.push(`*Skipped: ${result.softScores.reason}*`)
    } else if (result.softScores?.dimensions) {
      output.push('| Dimension | Weight | Score | Status |')
      output.push('|-----------|--------|-------|--------|')
      for (const [name, dim] of Object.entries(result.softScores.dimensions)) {
        output.push(`| ${name} | ${dim.informational ? 'info' : Math.round(dim.weight * 100) + '%'} | ${dim.score}% | ${dim.score >= 60 ? 'OK' : 'LOW'} |`)
      }
    }
    output.push('')

    // Improvements
    if (result.improvements?.length > 0) {
      output.push('## Improvements')
      for (const imp of result.improvements) {
        output.push(`- **[${imp.severity}]** ${imp.message}`)
      }
    }

    return output.join('\n')
  }

  _progressBar(score, width = 10) {
    const filled = Math.round((score / 100) * width)
    return '█'.repeat(filled) + '░'.repeat(width - filled)
  }

  _padRight(str, len) {
    return str.length >= len ? str : str + ' '.repeat(len - str.length)
  }
}

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {
  DesignReviewEngine,
  DesignReviewReporter,
  DesignParser,
  InterfacePurityAnalyzer,
  ConsistencyAnalyzer,
  EvidenceTraceabilityAnalyzer,
  BilingualAnalyzer,
  DecisionAlignmentAnalyzer
}
