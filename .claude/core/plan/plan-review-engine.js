/**
 * Plan Review Engine - Implementation Plan Quality Analysis
 * 計画レビューエンジン - 実装計画品質分析
 * Công Cụ Đánh Giá Kế Hoạch - Phân tích chất lượng kế hoạch triển khai
 *
 * Purpose: Automated plan quality assessment with 5 dimensions
 * Supports: Implementation plans (WHY/HOW/Context pattern from /plan command)
 * Version: 3.0.0
 * Created: 2025-12-24
 * Updated: 2026-02-15 (Removed legacy daily-plan support, unified to implementation-plan format)
 */

const fs = require('fs').promises;
const path = require('path');

class PlanReviewEngine {
    constructor(options = {}) {
        this.threshold = options.threshold || 95;
        this.verbose = options.verbose || false;

        // Scoring weights for 5 dimensions
        this.weights = {
            completeness: 0.25,  // 25% - All required sections present
            feasibility: 0.25,   // 25% - Realistic scope, dependencies documented
            clarity: 0.20,       // 20% - Clear structure, code examples
            risk: 0.15,          // 15% - Risk management, error handling
            consistency: 0.15    // 15% - Format consistency, file references
        };

        // Lazy initialization of analyzers
        this._analyzers = null;
    }

    get analyzers() {
        if (!this._analyzers) {
            this._analyzers = {
                completeness: new CompletenessAnalyzer(),
                feasibility: new FeasibilityAnalyzer(),
                clarity: new ClarityAnalyzer(),
                risk: new RiskAnalyzer(),
                consistency: new ConsistencyAnalyzer()
            };
        }
        return this._analyzers;
    }

    /**
     * Main review method
     * メインレビューメソッド
     * Phương thức đánh giá chính
     */
    async review(planPath, options = {}) {
        const startTime = Date.now();

        try {
            // Phase 1: Validate & Parse
            const plan = await this._validateAndParse(planPath);

            // Phase 2: Analyze all dimensions in parallel
            const dimensionScores = await this._analyzeAllDimensions(plan);

            // Phase 3: Aggregate & Report
            const review = this._aggregateResults(dimensionScores, plan);
            const improvements = this._generateImprovements(review);

            review.improvements = improvements;
            review.executionTime = Date.now() - startTime;
            review.readyForExecution = review.overall >= this.threshold;
            review.format = 'implementation-plan';

            return review;

        } catch (error) {
            return this._handleError(error, planPath);
        }
    }

    /**
     * Validate input and parse plan file
     * 入力検証と計画ファイル解析
     * Xác thực đầu vào và phân tích tập tin kế hoạch
     */
    async _validateAndParse(planPath) {
        if (!planPath || typeof planPath !== 'string') {
            throw new Error('Invalid planPath parameter');
        }

        try {
            await fs.access(planPath);
        } catch (error) {
            const err = new Error(`Plan file not found: ${planPath}`);
            err.code = 'ENOENT';
            throw err;
        }

        const parser = new PlanParser();
        return await parser.parse(planPath);
    }

    /**
     * Run all analyzers in parallel
     * すべてのアナライザーを並列実行
     * Chạy tất cả bộ phân tích song song
     */
    async _analyzeAllDimensions(plan) {
        const [completeness, feasibility, clarity, risk, consistency] =
            await Promise.all([
                this.analyzers.completeness.analyze(plan),
                this.analyzers.feasibility.analyze(plan),
                this.analyzers.clarity.analyze(plan),
                this.analyzers.risk.analyze(plan),
                this.analyzers.consistency.analyze(plan)
            ]);

        return { completeness, feasibility, clarity, risk, consistency };
    }

    /**
     * Aggregate dimension scores into overall confidence
     * 次元スコアを全体信頼度に集約
     * Tổng hợp điểm số các chiều thành độ tin cậy tổng thể
     */
    _aggregateResults(dimensionScores, plan) {
        const overall = Object.entries(dimensionScores).reduce((sum, [dim, result]) => {
            return sum + (result.score * this.weights[dim]);
        }, 0);

        return {
            overall: Math.round(overall * 10) / 10,
            threshold: this.threshold,
            passed: overall >= this.threshold,
            dimensions: dimensionScores,
            planMetadata: {
                path: plan.path,
                name: plan.name,
                wordCount: plan.wordCount,
                tokenEstimate: Math.round(plan.wordCount * 1.3),
                contextId: plan.contextId,
                confidence: plan.confidence,
                status: plan.status,
                stepCount: plan.stepCount,
                phaseCount: plan.phaseCount
            }
        };
    }

    /**
     * Generate improvement suggestions based on failed dimensions
     * 失敗した次元に基づいて改善提案を生成
     * Tạo gợi ý cải thiện dựa trên các chiều thất bại
     */
    _generateImprovements(review) {
        const improvements = [];

        for (const [dimension, result] of Object.entries(review.dimensions)) {
            if (result.score < this.threshold) {
                const dimImprovements = result.improvements || [];
                improvements.push(...dimImprovements.map(imp => ({
                    dimension,
                    ...imp
                })));
            }
        }

        return improvements.sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                return severityOrder[a.severity] - severityOrder[b.severity];
            }
            return (b.impact || 0) - (a.impact || 0);
        });
    }

    /**
     * Error handling with user-friendly messages
     */
    _handleError(error, planPath) {
        const errorMap = {
            'ENOENT': {
                error: 'FileNotFound',
                message: `Plan file not found at path: ${planPath}`,
                suggestion: 'Verify file path and try again',
                severity: 'high'
            },
            'EACCES': {
                error: 'FileNotReadable',
                message: 'Plan file cannot be read',
                suggestion: 'Check file permissions',
                severity: 'high'
            }
        };

        const errorCode = error.code || 'UNKNOWN';
        return errorMap[errorCode] || {
            error: 'UnknownError',
            message: error.message,
            suggestion: 'Contact support or check logs for details',
            severity: 'medium'
        };
    }
}

// ============================================================================
// IMPLEMENTATION PLAN ANALYZERS
// 実装計画アナライザー
// Bộ phân tích kế hoạch triển khai
// ============================================================================

/**
 * Completeness Analyzer - Dimension 1
 * Checks: Header metadata, Plan Boundaries, Steps with WHY/HOW, Implementation Details, Acceptance Criteria
 */
class CompletenessAnalyzer {
    async analyze(plan) {
        let score = 0;
        const missingElements = [];
        const details = {};
        const content = plan.content || '';

        // 1. Header Metadata (15%)
        const hasContextId = /Context ID|Context ID\*\*:/i.test(content);
        const hasType = /Type\*\*:|Type.*:/i.test(content);
        const hasConfidence = /Confidence.*\d+%/i.test(content);
        const hasStatus = /Status\*\*:\s*(APPROVED|DRAFT|PENDING)/i.test(content);
        const hasBasedOn = /Based On\*\*:|Based On.*:/i.test(content);

        let headerScore = 0;
        if (hasContextId) headerScore += 3;
        if (hasType) headerScore += 3;
        if (hasConfidence) headerScore += 4;
        if (hasStatus) headerScore += 3;
        if (hasBasedOn) headerScore += 2;

        score += headerScore;
        details.header = { score: headerScore, hasContextId, hasType, hasConfidence, hasStatus, hasBasedOn };

        if (headerScore < 12) {
            missingElements.push({
                element: 'Header Metadata',
                severity: 'medium',
                suggestion: 'Add Context ID, Type, Confidence (%), Status, and Based On to header',
                impact: 15 - headerScore
            });
        }

        // 2. Plan Boundaries Section (15%)
        const hasPlanBoundaries = /Plan Boundaries|Problem Summary/i.test(content);
        const hasCurrentState = /Current State|Current.*:/i.test(content);
        const hasTargetState = /Target State|Target.*:/i.test(content);
        const hasFilesToCreate = /Files to Create|CREATE/i.test(content);
        const hasFilesToModify = /Files to Modify|MODIFY/i.test(content);
        const hasDependencies = /Dependencies Between|Dependencies.*:/i.test(content);

        let boundariesScore = 0;
        if (hasPlanBoundaries) boundariesScore += 3;
        if (hasCurrentState) boundariesScore += 2;
        if (hasTargetState) boundariesScore += 2;
        if (hasFilesToCreate || hasFilesToModify) boundariesScore += 4;
        if (hasDependencies) boundariesScore += 4;

        score += boundariesScore;
        details.boundaries = { score: boundariesScore, hasPlanBoundaries, hasCurrentState, hasTargetState, hasFilesToCreate, hasFilesToModify, hasDependencies };

        if (boundariesScore < 12) {
            missingElements.push({
                element: 'Plan Boundaries',
                severity: 'high',
                suggestion: 'Add Plan Boundaries with Current/Target State, Files to Create/Modify, Dependencies',
                impact: 15 - boundariesScore
            });
        }

        // 3. Steps with WHY/HOW Pattern (30% - most critical)
        const stepMatches = content.match(/#{3,4}\s+Step\s+\d+:/gi) || [];
        const stepCount = stepMatches.length;
        const whyCount = (content.match(/\*\*WHY\*\*:/g) || []).length;
        const howCount = (content.match(/\*\*HOW\*\*:/g) || []).length;
        const filesCount = (content.match(/\*\*Files\*\*:/g) || []).length;
        const contextCount = (content.match(/\*\*Context.*\*\*:/gi) || []).length;

        let stepsScore = 0;
        if (stepCount >= 3) stepsScore += 5;
        if (stepCount >= 5) stepsScore += 3;
        if (stepCount >= 7) stepsScore += 2;

        const whyHowRatio = stepCount > 0 ? Math.min(whyCount, howCount) / stepCount : 0;
        stepsScore += Math.round(whyHowRatio * 15);

        if (filesCount >= stepCount * 0.5) stepsScore += 3;
        if (contextCount >= 1) stepsScore += 2;

        score += stepsScore;
        details.steps = { score: stepsScore, stepCount, whyCount, howCount, filesCount, contextCount, whyHowRatio: Math.round(whyHowRatio * 100) };

        if (stepsScore < 25) {
            missingElements.push({
                element: 'Steps with WHY/HOW',
                severity: 'critical',
                suggestion: `Add **WHY** and **HOW** sections to all ${stepCount} steps. Current: ${whyCount} WHY, ${howCount} HOW`,
                impact: 30 - stepsScore
            });
        }

        // 4. Implementation Details with Code (20%)
        const hasImplementationDetails = /\*\*Implementation Details\*\*:/i.test(content);
        const codeBlockCount = (content.match(/```(?:javascript|js|java|typescript|ts)/gi) || []).length;
        const anyCodeBlocks = (content.match(/```/g) || []).length / 2;

        let implScore = 0;
        if (hasImplementationDetails) implScore += 5;
        if (codeBlockCount >= 3) implScore += 5;
        if (codeBlockCount >= 5) implScore += 5;
        if (anyCodeBlocks >= stepCount * 0.5) implScore += 5;

        score += implScore;
        details.implementation = { score: implScore, hasImplementationDetails, codeBlockCount, anyCodeBlocks: Math.floor(anyCodeBlocks) };

        if (implScore < 15) {
            missingElements.push({
                element: 'Implementation Details',
                severity: 'high',
                suggestion: 'Add **Implementation Details** with code blocks for each step',
                impact: 20 - implScore
            });
        }

        // 5. Acceptance Criteria (20%)
        const acceptanceSections = (content.match(/\*\*Acceptance Criteria\*\*:/gi) || []).length;
        const checkboxItems = (content.match(/- \[ \]/g) || []).length;

        let acceptanceScore = 0;
        if (acceptanceSections >= 1) acceptanceScore += 5;
        if (acceptanceSections >= stepCount * 0.5) acceptanceScore += 5;
        if (checkboxItems >= 5) acceptanceScore += 3;
        if (checkboxItems >= 10) acceptanceScore += 3;
        if (checkboxItems >= 20) acceptanceScore += 4;

        score += acceptanceScore;
        details.acceptance = { score: acceptanceScore, acceptanceSections, checkboxItems };

        if (acceptanceScore < 15) {
            missingElements.push({
                element: 'Acceptance Criteria',
                severity: 'medium',
                suggestion: `Add **Acceptance Criteria** with checkboxes. Current: ${acceptanceSections} sections, ${checkboxItems} checkboxes`,
                impact: 20 - acceptanceScore
            });
        }

        // Cap at 100
        score = Math.min(100, score);

        return {
            score: Math.round(score * 10) / 10,
            passed: score >= 90,
            missingElements,
            details,
            improvements: missingElements
        };
    }
}

/**
 * Feasibility Analyzer - Dimension 2
 * Checks: Dependencies documented, Files specified, Actions clear, Acceptance criteria
 */
class FeasibilityAnalyzer {
    async analyze(plan) {
        let score = 0;
        const issues = [];
        const content = plan.content || '';

        // 1. Dependencies documented (30%)
        const hasDependencies = /Dependencies Between|Dependencies.*:|Step \d+.*→.*Step \d+/i.test(content);
        const dependencyDiagram = /Phase \d+.*Step \d+|Step \d+.*←→.*Step \d+/i.test(content);
        const stepDependsOn = (content.match(/Depends On|depends on|DEPENDS_ON/gi) || []).length;

        if (hasDependencies) score += 15;
        if (dependencyDiagram) score += 10;
        if (stepDependsOn >= 3) score += 5;

        if (!hasDependencies && !dependencyDiagram) {
            issues.push({
                factor: 'Dependencies',
                current: 'Missing',
                target: 'Documented',
                suggestion: 'Add Dependencies Between Steps section with dependency diagram',
                severity: 'high',
                impact: 30
            });
        }

        // 2. Files specified (25%)
        const hasFilesTable = /\|\s*#\s*\|\s*File\s*\|/i.test(content) || /Files to Create|Files to Modify/i.test(content);
        const filePathCount = (content.match(/`[^`]+\.(js|ts|tsx|java|md|json)`/g) || []).length;
        const hasActions = /CREATE|MODIFY|DELETE/i.test(content);

        if (hasFilesTable) score += 10;
        if (filePathCount >= 5) score += 10;
        if (hasActions) score += 5;

        if (!hasFilesTable) {
            issues.push({
                factor: 'Files Specification',
                current: 'Missing table',
                target: 'Files to Create/Modify table',
                suggestion: 'Add Files to Create/Modify table with Action column',
                severity: 'high',
                impact: 25
            });
        }

        // 3. Phases organized (20%)
        const phaseMatches = content.match(/#{2,3}\s+Phase\s+\d+:/gi) || [];
        const phaseCount = phaseMatches.length;

        if (phaseCount >= 2) score += 10;
        if (phaseCount >= 4) score += 5;
        if (phaseCount >= 6) score += 5;

        if (phaseCount < 2) {
            issues.push({
                factor: 'Phase Organization',
                current: `${phaseCount} phases`,
                target: '≥2 phases',
                suggestion: 'Organize steps into logical phases',
                severity: 'medium',
                impact: 20
            });
        }

        // 4. Acceptance criteria actionable (25%)
        const checkboxCount = (content.match(/- \[ \]/g) || []).length;
        const hasTestCriteria = /test|verify|validate|check/i.test(content);

        if (checkboxCount >= 5) score += 10;
        if (checkboxCount >= 15) score += 10;
        if (hasTestCriteria) score += 5;

        if (checkboxCount < 5) {
            issues.push({
                factor: 'Acceptance Criteria',
                current: `${checkboxCount} checkboxes`,
                target: '≥15 checkboxes',
                suggestion: 'Add actionable acceptance criteria with checkboxes for each step',
                severity: 'medium',
                impact: 25
            });
        }

        return {
            score: Math.round(score * 10) / 10,
            passed: score >= 90,
            issues,
            details: { hasDependencies, dependencyDiagram, hasFilesTable, filePathCount, phaseCount, checkboxCount },
            improvements: issues
        };
    }
}

/**
 * Clarity Analyzer - Dimension 3
 * Checks: Structure, Code blocks, Context references
 */
class ClarityAnalyzer {
    async analyze(plan) {
        let score = 0;
        const issues = [];
        const content = plan.content || '';

        // 1. Structured sections (30%)
        const h2Count = (content.match(/^## /gm) || []).length;
        const h3Count = (content.match(/^### /gm) || []).length;
        const h4Count = (content.match(/^#### /gm) || []).length;
        const totalHeaders = h2Count + h3Count + h4Count;

        if (totalHeaders >= 10) score += 15;
        if (totalHeaders >= 20) score += 10;
        if (totalHeaders >= 30) score += 5;

        if (totalHeaders < 10) {
            issues.push({
                factor: 'Section Structure',
                current: `${totalHeaders} headers`,
                target: '≥20 headers',
                suggestion: 'Add more structured sections (Phase, Step, substeps)',
                severity: 'medium',
                impact: 30
            });
        }

        // 2. Code blocks with implementation (35%)
        const codeBlockCount = (content.match(/```/g) || []).length / 2;
        const hasLanguageSpec = /```(?:javascript|js|java|typescript|ts|python|pseudo)/i.test(content);
        const hasComments = /\/\/.*|\/\*[\s\S]*?\*\/|#.*/m.test(content);

        if (codeBlockCount >= 3) score += 10;
        if (codeBlockCount >= 7) score += 10;
        if (codeBlockCount >= 12) score += 5;
        if (hasLanguageSpec) score += 5;
        if (hasComments) score += 5;

        if (codeBlockCount < 5) {
            issues.push({
                factor: 'Implementation Code',
                current: `${Math.floor(codeBlockCount)} code blocks`,
                target: '≥7 code blocks',
                suggestion: 'Add code blocks with language specification in Implementation Details',
                severity: 'medium',
                impact: 35
            });
        }

        // 3. Context and references (20%)
        const hasArchContext = /Context.*Architecture|Architecture.*Doc|Section \d+/i.test(content);
        const hasPatternRef = /Pattern:|Design Pattern|Factory|Repository|Service/i.test(content);
        const hasModuleRef = /Module:|@module|exports/i.test(content);

        if (hasArchContext) score += 8;
        if (hasPatternRef) score += 7;
        if (hasModuleRef) score += 5;

        if (!hasArchContext && !hasPatternRef) {
            issues.push({
                factor: 'Context References',
                current: 'Missing',
                target: 'Architecture/Pattern references',
                suggestion: 'Add **Context từ Architecture Doc** or Pattern references',
                severity: 'low',
                impact: 20
            });
        }

        // 4. Clear naming (15%)
        const hasDescriptiveSteps = /Step \d+:.*[A-Z][a-z]+/g.test(content);
        const hasWhyExplanation = /\*\*WHY\*\*:[\s\S]*?-/g.test(content);

        if (hasDescriptiveSteps) score += 8;
        if (hasWhyExplanation) score += 7;

        return {
            score: Math.round(score * 10) / 10,
            passed: score >= 90,
            issues,
            details: { totalHeaders, codeBlockCount: Math.floor(codeBlockCount), hasLanguageSpec, hasArchContext, hasPatternRef },
            improvements: issues
        };
    }
}

/**
 * Risk Analyzer - Dimension 4
 * Checks: External dependencies, Error handling, Complexity
 */
class RiskAnalyzer {
    async analyze(plan) {
        let score = 100;
        const risks = [];
        const content = plan.content || '';

        // 1. External dependencies identified
        const hasExternal = /external|third-party|api|server|HippoRAG|Gemini/i.test(content);
        const hasFallback = /fallback|catch|try.*catch|error.*handling|Priority \d+:/i.test(content);

        if (hasExternal && !hasFallback) {
            score -= 15;
            risks.push({
                type: 'External Dependency',
                severity: 'medium',
                description: 'External dependencies without fallback strategy',
                suggestion: 'Add fallback/error handling for external service calls',
                impact: 15
            });
        }

        // 2. Complexity assessment
        const stepCount = (content.match(/#{3,4}\s+Step\s+\d+:/gi) || []).length;
        const fileCount = (content.match(/`[^`]+\.(js|ts|tsx|java)`/g) || []).length;

        if (stepCount > 15 && fileCount > 20) {
            score -= 10;
            risks.push({
                type: 'High Complexity',
                severity: 'medium',
                description: `Plan has ${stepCount} steps and ${fileCount} files - consider splitting`,
                suggestion: 'Consider breaking into smaller, incremental plans',
                impact: 10
            });
        }

        // 3. Dependencies between steps
        const dependencyCount = (content.match(/Depends On|depends on|→|←/gi) || []).length;
        const circularRisk = /circular|cycle/i.test(content);

        if (circularRisk) {
            score -= 20;
            risks.push({
                type: 'Circular Dependency Risk',
                severity: 'high',
                description: 'Potential circular dependencies detected',
                suggestion: 'Review and resolve circular dependencies between steps',
                impact: 20
            });
        }

        // 4. Error handling in code
        const hasErrorHandling = /try\s*\{|catch\s*\(|throw\s+|error|Error/i.test(content);
        if (!hasErrorHandling && stepCount > 5) {
            score -= 5;
            risks.push({
                type: 'Error Handling',
                severity: 'low',
                description: 'No explicit error handling in code examples',
                suggestion: 'Add try/catch blocks or error handling notes',
                impact: 5
            });
        }

        // 5. Assumptions documented
        const hasAssumptions = /assumption|assume|prerequisite|require/i.test(content);
        if (!hasAssumptions) {
            score -= 5;
            risks.push({
                type: 'Undocumented Assumptions',
                severity: 'low',
                description: 'No assumptions documented',
                suggestion: 'Document assumptions and prerequisites explicitly',
                impact: 5
            });
        }

        return {
            score: Math.max(0, Math.round(score * 10) / 10),
            passed: score >= 90,
            risks,
            details: { hasExternal, hasFallback, stepCount, fileCount, dependencyCount, hasErrorHandling, hasAssumptions },
            improvements: risks
        };
    }
}

/**
 * Consistency Analyzer - Dimension 5
 * Checks: Format consistency, File references, Step numbering
 */
class ConsistencyAnalyzer {
    async analyze(plan) {
        let score = 100;
        const issues = [];
        const content = plan.content || '';

        // 1. Step numbering consistency - check header steps only (#### Step N:)
        const stepHeaderMatches = content.match(/#{3,4}\s+Step\s+(\d+):/gi) || [];
        const stepHeaderNumbers = stepHeaderMatches.map(m => parseInt(m.match(/\d+/)[0]));
        const uniqueHeaderSteps = [...new Set(stepHeaderNumbers)];
        const hasSequentialSteps = uniqueHeaderSteps.length === stepHeaderNumbers.length;

        if (!hasSequentialSteps && stepHeaderNumbers.length > 0) {
            score -= 10;
            issues.push({
                factor: 'Step Numbering',
                current: 'Duplicate or missing step numbers in headers',
                target: 'Sequential unique step numbers',
                suggestion: 'Ensure all steps have unique sequential numbers',
                severity: 'medium',
                impact: 10
            });
        }

        // 2. File path format consistency (exclude code blocks and framework names)
        // Remove code blocks before checking
        const contentNoCode = content.replace(/```[\s\S]*?```/g, '');
        const backtickPaths = (contentNoCode.match(/`[^`]+\.(js|ts|tsx|java|md|json)`/g) || []).length;
        // Filter out framework names (Next.js, Node.js, etc.) and extensions in quotes
        const barePathMatches = contentNoCode.match(/(?<![`\w])[^\s`]+\.(js|ts|tsx|java|md|json)(?![`\w])/g) || [];
        const filteredBarePaths = barePathMatches.filter(p =>
            !p.match(/^(Next|Node|Express|Nest|Vue|Angular|Nuxt)\.js$/i) && // Framework names
            !p.match(/^'\.[a-z]+$/) && // Extension patterns like '.tsx
            !p.match(/^\.[a-z]+$/) // Just extensions like .js
        );
        const barePaths = filteredBarePaths.length;

        if (barePaths > backtickPaths * 0.5) {
            score -= 10;
            issues.push({
                factor: 'File Path Format',
                current: `${barePaths} bare paths`,
                target: 'All paths in backticks',
                suggestion: 'Wrap all file paths in backticks: `path/to/file.js`',
                severity: 'low',
                impact: 10
            });
        }

        // 3. Section format consistency (WHY/HOW pattern)
        const whyCount = (content.match(/\*\*WHY\*\*:/g) || []).length;
        const howCount = (content.match(/\*\*HOW\*\*:/g) || []).length;
        const stepCount = (content.match(/#{3,4}\s+Step\s+\d+:/gi) || []).length;

        if (stepCount > 0 && Math.abs(whyCount - howCount) > stepCount * 0.2) {
            score -= 10;
            issues.push({
                factor: 'WHY/HOW Balance',
                current: `${whyCount} WHY, ${howCount} HOW`,
                target: 'Equal WHY and HOW sections',
                suggestion: 'Ensure each step has both **WHY** and **HOW** sections',
                severity: 'medium',
                impact: 10
            });
        }

        // 4. Header level consistency
        const phaseHeaders = content.match(/^##+ Phase/gm) || [];
        const stepHeaders = content.match(/^##+ Step/gm) || [];

        const phaseLevel = phaseHeaders.length > 0 ? phaseHeaders[0].match(/^#+/)[0].length : 0;
        const stepLevel = stepHeaders.length > 0 ? stepHeaders[0].match(/^#+/)[0].length : 0;

        if (phaseLevel > 0 && stepLevel > 0 && stepLevel <= phaseLevel) {
            score -= 5;
            issues.push({
                factor: 'Header Hierarchy',
                current: `Phase: h${phaseLevel}, Step: h${stepLevel}`,
                target: 'Steps should be nested under Phases',
                suggestion: 'Use lower header level for Steps than Phases (e.g., ### Phase, #### Step)',
                severity: 'low',
                impact: 5
            });
        }

        // 5. Checkbox format consistency - only check outside code blocks
        const correctCheckboxes = (contentNoCode.match(/- \[ \]/g) || []).length;
        // Incorrect: [ ] not preceded by "- " (standalone checkboxes)
        const incorrectCheckboxes = (contentNoCode.match(/(?<!- )\[ \](?!\s*\])/g) || []).length;

        if (incorrectCheckboxes > correctCheckboxes * 0.1 && incorrectCheckboxes > 2) {
            score -= 5;
            issues.push({
                factor: 'Checkbox Format',
                current: `${incorrectCheckboxes} incorrect`,
                target: 'All checkboxes as "- [ ]"',
                suggestion: 'Use consistent checkbox format: "- [ ] item"',
                severity: 'low',
                impact: 5
            });
        }

        return {
            score: Math.round(score * 10) / 10,
            passed: score >= 90,
            issues,
            details: {
                stepCount: uniqueHeaderSteps.length,
                backtickPaths,
                barePaths,
                whyCount,
                howCount,
                correctCheckboxes
            },
            improvements: issues
        };
    }
}

/**
 * Plan Parser - Implementation Plan file parser
 * プランパーサー - 実装計画ファイルパーサー
 * Bộ Phân Tích Kế Hoạch - Phân tích tập tin kế hoạch triển khai
 */
class PlanParser {
    async parse(planPath) {
        const content = await fs.readFile(planPath, 'utf-8');

        // Extract metadata from header
        const contextIdMatch = content.match(/Context ID[*]*:\s*(\S+)/i);
        const confidenceMatch = content.match(/Confidence[*]*:\s*(\d+)%/i);
        const statusMatch = content.match(/Status[*]*:\s*(\w+)/i);

        // Count steps and phases
        const stepMatches = content.match(/#{3,4}\s+Step\s+\d+:/gi) || [];
        const phaseMatches = content.match(/#{2,3}\s+Phase\s+\d+:/gi) || [];

        return {
            path: planPath,
            name: this._extractName(planPath),
            title: this._extractTitle(content),
            content: content,
            wordCount: this._countWords(content),
            contextId: contextIdMatch ? contextIdMatch[1] : null,
            confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : null,
            status: statusMatch ? statusMatch[1] : null,
            stepCount: stepMatches.length,
            phaseCount: phaseMatches.length
        };
    }

    _extractName(planPath) {
        return path.basename(planPath, '.md');
    }

    _extractTitle(content) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        return titleMatch ? titleMatch[1].trim() : '';
    }

    _countWords(content) {
        const withoutCode = content.replace(/```[\s\S]*?```/g, '');
        const withoutMarkdown = withoutCode.replace(/[#*_`\[\]]/g, '');
        return withoutMarkdown.split(/\s+/).filter(w => w.length > 0).length;
    }
}

module.exports = { PlanReviewEngine };
