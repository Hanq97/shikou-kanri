/**
 * PatternExtractor - Extracts reusable patterns from successful plans
 * Week 6 Day 2: Pattern Extraction Engine
 *
 * Analyzes successful plan files to extract:
 * - Architecture patterns (micro-agent, orchestrator, layered, KB-first)
 * - Backend patterns (DI, migration, data access, config)
 * - Frontend patterns (Server Components, state management, data fetching)
 * - Testing patterns (checkpoint validation, test organization, pass rate)
 * - Implementation patterns (5-day sprint, evidence-based, token optimization)
 */

const fs = require('fs');
const path = require('path');

class PatternExtractor {
    constructor(options = {}) {
        this.minFrequency = options.minFrequency || 3; // Minimum occurrences
        this.minConfidence = options.minConfidence || 0.90; // Minimum plan confidence
        this.patterns = new Map(); // Collected patterns: key -> pattern object
        this.taxonomy = this.loadTaxonomy();
    }

    /**
     * Load pattern taxonomy from Day 1 analysis
     */
    loadTaxonomy() {
        const taxonomyFile = path.join(
            __dirname,
            '../memory-bank/eps-enhancement/week-6/context/pattern-taxonomy.md'
        );

        try {
            const content = fs.readFileSync(taxonomyFile, 'utf-8');

            // Parse taxonomy structure from markdown
            // Expected format: ### Pattern X.Y: Pattern Name
            const taxonomy = {
                architecture: [],
                backend: [],
                frontend: [],
                testing: [],
                implementation: []
            };

            const lines = content.split('\n');
            let currentCategory = null;

            for (const line of lines) {
                // Detect category headers
                if (line.includes('ARCHITECTURE PATTERNS')) currentCategory = 'architecture';
                else if (line.includes('BACKEND PATTERNS')) currentCategory = 'backend';
                else if (line.includes('FRONTEND PATTERNS')) currentCategory = 'frontend';
                else if (line.includes('TESTING PATTERNS')) currentCategory = 'testing';
                else if (line.includes('IMPLEMENTATION PATTERNS')) currentCategory = 'implementation';

                // Extract pattern names (format: "### Pattern X.Y: Pattern Name")
                const patternMatch = line.match(/###\s+Pattern\s+\d+\.\d+:\s+(.+)/);
                if (patternMatch && currentCategory) {
                    const patternName = patternMatch[1].replace(/⭐/g, '').trim();
                    taxonomy[currentCategory].push(patternName);
                }
            }

            return taxonomy;
        } catch (error) {
            console.warn('Warning: Could not load taxonomy file:', error.message);
            return {
                architecture: [],
                backend: [],
                frontend: [],
                testing: [],
                implementation: []
            };
        }
    }

    /**
     * Load plan from file path
     */
    loadPlan(planPath) {
        try {
            const content = fs.readFileSync(planPath, 'utf-8');

            // Extract metadata from plan
            const plan = {
                path: planPath,
                content: content,
                confidence: this.extractConfidence(content),
                success: this.extractSuccess(content),
                testPassRate: this.extractTestPassRate(content),
                category: this.extractCategory(planPath),
                metadata: {}
            };

            return plan;
        } catch (error) {
            throw new Error(`Failed to load plan ${planPath}: ${error.message}`);
        }
    }

    /**
     * Extract confidence score from plan content
     */
    extractConfidence(content) {
        // Look for confidence score patterns
        const patterns = [
            /confidence[:\s]+(\d+\.?\d*)%/i,
            /confidence[:\s]+(\d+\.?\d*)/i,
            /(\d+\.?\d*)%\s+confidence/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                const confidence = parseFloat(match[1]);
                return confidence > 1 ? confidence / 100 : confidence;
            }
        }

        // Default to high confidence if success indicators present
        if (content.includes('✅') || content.includes('COMPLETE')) {
            return 0.95;
        }

        return 0.90; // Default
    }

    /**
     * Extract success status from plan content
     */
    extractSuccess(content) {
        // Success indicators
        const successIndicators = ['✅', 'COMPLETE', 'SUCCESS', 'PASS'];
        const failIndicators = ['❌', 'FAILED', 'ERROR', 'INCOMPLETE'];

        const successCount = successIndicators.filter(ind => content.includes(ind)).length;
        const failCount = failIndicators.filter(ind => content.includes(ind)).length;

        return successCount > failCount;
    }

    /**
     * Extract test pass rate from plan content
     */
    extractTestPassRate(content) {
        // Look for test pass rate patterns: "53/54 tests", "98.1% pass rate"
        const patterns = [
            /(\d+)\/(\d+)\s+tests?\s+pass/i,
            /(\d+\.?\d*)%\s+pass\s+rate/i,
            /pass\s+rate:\s*(\d+\.?\d*)%/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                if (match[2]) {
                    // Format: 53/54
                    return parseInt(match[1]) / parseInt(match[2]);
                } else {
                    // Format: 98.1%
                    const rate = parseFloat(match[1]);
                    return rate > 1 ? rate / 100 : rate;
                }
            }
        }

        return 0.95; // Default
    }

    /**
     * Extract category from plan path
     */
    extractCategory(planPath) {
        const pathLower = planPath.toLowerCase();

        if (pathLower.includes('backend') || pathLower.includes('java') || pathLower.includes('spring')) {
            return 'backend';
        }
        if (pathLower.includes('frontend') || pathLower.includes('react') || pathLower.includes('next')) {
            return 'frontend';
        }
        if (pathLower.includes('database') || pathLower.includes('postgres') || pathLower.includes('sql')) {
            return 'database';
        }
        if (pathLower.includes('test')) {
            return 'testing';
        }

        return 'general';
    }

    /**
     * Extract patterns from a single plan
     */
    extractFromPlan(planPath) {
        const plan = this.loadPlan(planPath);

        if (plan.confidence < this.minConfidence) {
            return {
                skipped: true,
                reason: `Low confidence: ${(plan.confidence * 100).toFixed(1)}% < ${(this.minConfidence * 100)}%`,
                planPath
            };
        }

        const extractedPatterns = [];

        // Extract architecture patterns
        const archPatterns = this.extractArchitecturePatterns(plan);
        extractedPatterns.push(...archPatterns);

        // Extract backend patterns
        const backendPatterns = this.extractBackendPatterns(plan);
        extractedPatterns.push(...backendPatterns);

        // Extract frontend patterns
        const frontendPatterns = this.extractFrontendPatterns(plan);
        extractedPatterns.push(...frontendPatterns);

        // Extract implementation patterns
        const implPatterns = this.extractImplementationPatterns(plan);
        extractedPatterns.push(...implPatterns);

        // Extract testing patterns
        const testPatterns = this.extractTestingPatterns(plan);
        extractedPatterns.push(...testPatterns);

        return {
            planPath,
            patternsFound: extractedPatterns.length,
            patterns: extractedPatterns,
            confidence: plan.confidence
        };
    }

    /**
     * Extract architecture patterns
     */
    extractArchitecturePatterns(plan) {
        const patterns = [];
        const content = plan.content;

        // Pattern 1: Micro-Agent Architecture
        if (this.hasMicroAgentArchitecture(content)) {
            patterns.push({
                type: 'architecture',
                name: 'Micro-Agent Architecture',
                category: 'Single-Responsibility Agents',
                evidence: this.extractMicroAgentEvidence(content),
                source: plan.path
            });
        }

        // Pattern 2: Orchestrator Coordination
        if (this.hasOrchestratorPattern(content)) {
            patterns.push({
                type: 'architecture',
                name: 'Orchestrator Coordination Pattern',
                category: 'Agent Coordination',
                evidence: this.extractOrchestratorEvidence(content),
                source: plan.path
            });
        }

        // Pattern 3: Layered Architecture
        if (this.hasLayeredArchitecture(content)) {
            patterns.push({
                type: 'architecture',
                name: 'Layered Architecture',
                category: 'Controller-Service-Repository',
                evidence: this.extractLayeredEvidence(content),
                source: plan.path
            });
        }

        // Pattern 4: KB-First Pattern
        if (this.hasKBFirstPattern(content)) {
            patterns.push({
                type: 'architecture',
                name: 'Knowledge Base First Pattern',
                category: 'Planning Strategy',
                evidence: this.extractKBFirstEvidence(content),
                source: plan.path
            });
        }

        return patterns;
    }

    /**
     * Extract backend patterns
     */
    extractBackendPatterns(plan) {
        const patterns = [];
        const content = plan.content;

        // Pattern 1: Constructor Injection
        if (this.usesConstructorInjection(content)) {
            patterns.push({
                type: 'backend',
                name: 'Constructor Injection',
                category: 'Dependency Injection',
                examples: this.extractDIExamples(content),
                source: plan.path
            });
        }

        // Pattern 2: Flyway Migration
        if (this.usesFlywayMigration(content)) {
            patterns.push({
                type: 'backend',
                name: 'Flyway Migration Pattern',
                category: 'Database Migration',
                examples: this.extractFlywayExamples(content),
                source: plan.path
            });
        }

        // Pattern 3: JPA Repository
        if (this.usesJPARepository(content)) {
            patterns.push({
                type: 'backend',
                name: 'JPA Repository with Query Methods',
                category: 'Data Access',
                examples: this.extractJPAExamples(content),
                source: plan.path
            });
        }

        // Pattern 4: Dynamic Configuration
        if (this.usesDynamicConfig(content)) {
            patterns.push({
                type: 'backend',
                name: 'Dynamic Configuration',
                category: 'Configuration Management',
                examples: this.extractConfigExamples(content),
                source: plan.path
            });
        }

        return patterns;
    }

    /**
     * Extract frontend patterns
     */
    extractFrontendPatterns(plan) {
        const patterns = [];
        const content = plan.content;

        // Pattern 1: Server Components First
        if (this.usesServerComponents(content)) {
            patterns.push({
                type: 'frontend',
                name: 'Server Component First',
                category: 'Component Architecture',
                examples: this.extractServerComponentExamples(content),
                source: plan.path
            });
        }

        // Pattern 2: Zustand for Global State
        if (this.usesZustand(content)) {
            patterns.push({
                type: 'frontend',
                name: 'Zustand for Global State',
                category: 'State Management',
                examples: this.extractZustandExamples(content),
                source: plan.path
            });
        }

        // Pattern 3: Parallel Data Fetching
        if (this.usesParallelFetching(content)) {
            patterns.push({
                type: 'frontend',
                name: 'Parallel Data Fetching',
                category: 'Data Fetching',
                examples: this.extractParallelFetchingExamples(content),
                source: plan.path
            });
        }

        return patterns;
    }

    /**
     * Extract implementation patterns
     */
    extractImplementationPatterns(plan) {
        const patterns = [];
        const content = plan.content;

        // Pattern 1: 5-Day Sprint Structure
        if (this.has5DaySprint(content)) {
            patterns.push({
                type: 'implementation',
                name: '5-Day Sprint Structure',
                category: 'Project Management',
                evidence: this.extract5DaySprintEvidence(content),
                source: plan.path
            });
        }

        // Pattern 2: Evidence-Based Implementation
        if (this.hasEvidenceBasedApproach(content)) {
            patterns.push({
                type: 'implementation',
                name: 'Evidence-Based Implementation',
                category: 'Requirements',
                evidence: this.extractEvidenceBasedProof(content),
                source: plan.path
            });
        }

        // Pattern 3: Token Optimization
        if (this.hasTokenOptimization(content)) {
            patterns.push({
                type: 'implementation',
                name: 'Token Optimization',
                category: 'Performance',
                evidence: this.extractTokenOptimizationProof(content),
                source: plan.path
            });
        }

        return patterns;
    }

    /**
     * Extract testing patterns
     */
    extractTestingPatterns(plan) {
        const patterns = [];
        const content = plan.content;

        // Pattern 1: Checkpoint Validation
        if (this.hasCheckpointValidation(content)) {
            patterns.push({
                type: 'testing',
                name: 'Checkpoint Validation Pattern',
                category: 'Validation',
                examples: this.extractCheckpointExamples(content),
                source: plan.path
            });
        }

        // Pattern 2: 3-Category Test Organization
        if (this.has3CategoryTests(content)) {
            patterns.push({
                type: 'testing',
                name: '3-Category Test Organization',
                category: 'Test Structure',
                examples: this.extractTestOrgExamples(content),
                source: plan.path
            });
        }

        // Pattern 3: ≥95% Pass Rate Requirement
        if (plan.testPassRate >= 0.95) {
            patterns.push({
                type: 'testing',
                name: 'High Test Pass Rate',
                category: 'Quality Assurance',
                passRate: plan.testPassRate,
                source: plan.path
            });
        }

        return patterns;
    }

    // ========================================
    // PATTERN DETECTION HELPERS
    // ========================================

    hasMicroAgentArchitecture(content) {
        return /micro[- ]agent/i.test(content) ||
               /single[- ]responsibility\s+agent/i.test(content) ||
               (/agent/i.test(content) && /200[- ]300\s+lines/i.test(content));
    }

    hasOrchestratorPattern(content) {
        return /orchestrat/i.test(content) && (/coordinat/i.test(content) || /sequenc/i.test(content));
    }

    hasLayeredArchitecture(content) {
        return /@RestController|@Service|@Repository/.test(content) ||
               /Controller.*Service.*Repository/.test(content);
    }

    hasKBFirstPattern(content) {
        return /knowledge\s+base|KB/i.test(content) && /load.*before|first/i.test(content);
    }

    usesConstructorInjection(content) {
        return /@RequiredArgsConstructor/.test(content) ||
               /private final.*Repository|Service/.test(content);
    }

    usesFlywayMigration(content) {
        return /Flyway|V\d+__.*\.sql/.test(content);
    }

    usesJPARepository(content) {
        return /JpaRepository|findBy/.test(content);
    }

    usesDynamicConfig(content) {
        return /dynamic.*config|category.*weight|override.*default/i.test(content);
    }

    usesServerComponents(content) {
        return /Server Component|async function.*Page|export default async/.test(content);
    }

    usesZustand(content) {
        return /zustand|create\(.*set\)/i.test(content);
    }

    usesParallelFetching(content) {
        return /Promise\.all|parallel.*fetch/i.test(content);
    }

    has5DaySprint(content) {
        return /Day 1.*Day 2.*Day 3.*Day 4.*Day 5/.test(content) ||
               /5[- ]day.*sprint/i.test(content);
    }

    hasEvidenceBasedApproach(content) {
        return /evidence[- ]based|FR[- ]\d+|AC[- ]\d+/i.test(content);
    }

    hasTokenOptimization(content) {
        return /token.*optimiz|token.*reduc|%\s+reduction/i.test(content);
    }

    hasCheckpointValidation(content) {
        return /checkpoint|C\d+.*validat/i.test(content);
    }

    has3CategoryTests(content) {
        return /unit.*test|integration.*test|edge.*case/i.test(content) &&
               content.match(/test/gi)?.length >= 5;
    }

    // ========================================
    // EVIDENCE EXTRACTION HELPERS
    // ========================================

    extractMicroAgentEvidence(content) {
        const lines = content.split('\n');
        const evidence = [];
        for (let i = 0; i < lines.length; i++) {
            if (/micro[- ]agent|specialist\.md|agent.*\d+.*lines/i.test(lines[i])) {
                evidence.push(lines.slice(Math.max(0, i - 1), i + 3).join('\n'));
                if (evidence.length >= 2) break;
            }
        }
        return evidence.join('\n---\n');
    }

    extractOrchestratorEvidence(content) {
        const match = content.match(/class.*Orchestrat.*\{[\s\S]{0,300}\}/);
        return match ? match[0] : 'Orchestrator pattern detected';
    }

    extractLayeredEvidence(content) {
        const match = content.match(/@(RestController|Service|Repository)[\s\S]{0,150}/);
        return match ? match[0] : 'Layered architecture detected';
    }

    extractKBFirstEvidence(content) {
        const match = content.match(/load.*KB|loadKnowledgeBase[\s\S]{0,200}/i);
        return match ? match[0] : 'KB-First pattern detected';
    }

    extractDIExamples(content) {
        const examples = [];
        const matches = content.matchAll(/@RequiredArgsConstructor[\s\S]{0,300}?}/g);
        for (const match of matches) {
            examples.push(match[0]);
            if (examples.length >= 2) break;
        }
        return examples;
    }

    extractFlywayExamples(content) {
        const examples = [];
        const matches = content.matchAll(/V\d+__[^.]+\.sql/g);
        for (const match of matches) {
            examples.push(match[0]);
            if (examples.length >= 3) break;
        }
        return examples;
    }

    extractJPAExamples(content) {
        const examples = [];
        const matches = content.matchAll(/findBy\w+/g);
        for (const match of matches) {
            examples.push(match[0]);
            if (examples.length >= 3) break;
        }
        return examples;
    }

    extractConfigExamples(content) {
        const match = content.match(/categoryWeights.*\{[\s\S]{0,300}\}/);
        return match ? [match[0]] : [];
    }

    extractServerComponentExamples(content) {
        const examples = [];
        const matches = content.matchAll(/export default async function \w+\([\s\S]{0,200}?\}/g);
        for (const match of matches) {
            examples.push(match[0]);
            if (examples.length >= 2) break;
        }
        return examples;
    }

    extractZustandExamples(content) {
        const match = content.match(/create\(\(set\)[\s\S]{0,300}\)\)/);
        return match ? [match[0]] : [];
    }

    extractParallelFetchingExamples(content) {
        const match = content.match(/Promise\.all\(\[[\s\S]{0,200}\]\)/);
        return match ? [match[0]] : [];
    }

    extract5DaySprintEvidence(content) {
        const match = content.match(/Day 1.*Day 5[\s\S]{0,500}/);
        return match ? match[0] : '5-day sprint structure detected';
    }

    extractEvidenceBasedProof(content) {
        const match = content.match(/(FR[- ]\d+|AC[- ]\d+|evidence)[\s\S]{0,200}/i);
        return match ? match[0] : 'Evidence-based approach detected';
    }

    extractTokenOptimizationProof(content) {
        const match = content.match(/token.*\d+%.*reduction|before.*after.*tokens/i);
        return match ? match[0] : 'Token optimization detected';
    }

    extractCheckpointExamples(content) {
        const examples = [];
        const matches = content.matchAll(/C\d+.*validat[\s\S]{0,150}/gi);
        for (const match of matches) {
            examples.push(match[0]);
            if (examples.length >= 2) break;
        }
        return examples;
    }

    extractTestOrgExamples(content) {
        const match = content.match(/(unit.*test|integration.*test|edge.*case)[\s\S]{0,300}/i);
        return match ? [match[0]] : [];
    }

    /**
     * Extract patterns from multiple plans
     */
    async extractFromMultiplePlans(planPaths) {
        const results = [];

        for (const planPath of planPaths) {
            try {
                const result = this.extractFromPlan(planPath);
                results.push(result);

                // Aggregate pattern frequency
                if (!result.skipped) {
                    this.aggregatePatterns(result.patterns);
                }
            } catch (error) {
                console.error(`Error extracting from ${planPath}:`, error.message);
                results.push({
                    skipped: true,
                    reason: `Error: ${error.message}`,
                    planPath
                });
            }
        }

        return {
            totalPlansAnalyzed: results.length,
            plansProcessed: results.filter(r => !r.skipped).length,
            plansSkipped: results.filter(r => r.skipped).length,
            patternsExtracted: this.patterns.size,
            patterns: Array.from(this.patterns.values())
        };
    }

    /**
     * Aggregate patterns across plans (count frequency)
     */
    aggregatePatterns(patterns) {
        for (const pattern of patterns) {
            const key = `${pattern.type}:${pattern.name}`;

            if (this.patterns.has(key)) {
                const existing = this.patterns.get(key);
                existing.frequency += 1;
                existing.sources = existing.sources || [];
                existing.sources.push(pattern.source);

                // Merge examples
                if (pattern.examples) {
                    existing.examples = existing.examples || [];
                    existing.examples.push(...pattern.examples);
                }

                // Merge evidence
                if (pattern.evidence) {
                    existing.evidence = existing.evidence || '';
                    existing.evidence += '\n---\n' + pattern.evidence;
                }
            } else {
                this.patterns.set(key, {
                    ...pattern,
                    frequency: 1,
                    sources: [pattern.source],
                    examples: pattern.examples || [],
                    evidence: pattern.evidence || ''
                });
            }
        }
    }

    /**
     * Get high-frequency patterns (for KB addition)
     */
    getHighFrequencyPatterns() {
        return Array.from(this.patterns.values())
            .filter(p => p.frequency >= this.minFrequency)
            .sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Get patterns by type
     */
    getPatternsByType(type) {
        return Array.from(this.patterns.values())
            .filter(p => p.type === type)
            .sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const allPatterns = Array.from(this.patterns.values());

        return {
            total: allPatterns.length,
            highFrequency: allPatterns.filter(p => p.frequency >= this.minFrequency).length,
            byType: {
                architecture: this.getPatternsByType('architecture').length,
                backend: this.getPatternsByType('backend').length,
                frontend: this.getPatternsByType('frontend').length,
                testing: this.getPatternsByType('testing').length,
                implementation: this.getPatternsByType('implementation').length
            },
            averageFrequency: allPatterns.reduce((sum, p) => sum + p.frequency, 0) / allPatterns.length || 0
        };
    }
}

module.exports = { PatternExtractor };
