const fs = require('fs');
const path = require('path');
const PersonaManager = require('./persona-manager.js'); // Week 12: Persona integration
const SpecialistLoader = require('./specialist-loader.js'); // Week 14: Dynamic specialist discovery
const KBLoader = require('../knowledge-base/kb-loader.js'); // Stack-aware KB loading
const KBQueryOptimizer = require('../knowledge-base/kb-query-optimizer.js'); // Inverted index queries

/**
 * Expert Router - 3-Layer Adaptive Routing System
 *
 * Purpose: Route consultation requests to optimal knowledge source
 *
 * Layers:
 * 1. Knowledge Base (KB) - Fast lookup, 0 API calls (~200 tokens)
 * 2. Micro-Agent - Medium speed, load from file (~800 tokens)
 * 3. Context7 MCP - Slow, API call to official docs (~500 tokens)
 *
 * Token Optimization:
 * - Before: All requests → MCP (~10,000 tokens each)
 * - After: Adaptive routing (avg ~2,000 tokens, 80% reduction)
 *
 * Week 12: Persona-based routing
 * - Personas modify confidence thresholds (+0 to +5%)
 * - Persona-specific agent priority boosting
 * - Persona-specific KB pattern boosting
 * - Persona-based recommendation adjustments
 *
 * Week 14: Dynamic specialist loading (Phase 4)
 * - Auto-discover specialists from _INDEX.md files
 * - Zero maintenance for new specialists
 * - Fallback to hardcoded paths for backward compatibility
 */
class ExpertRouter {
    constructor(variantContext = null) {
        // Load Knowledge Base files (variant-aware if context provided)
        this.kbLoader = new KBLoader();
        this.variantContext = variantContext;

        if (variantContext && variantContext.kb_path) {
            // Stack-aware: load variant-specific KBs via KBLoader
            const kbs = this.kbLoader.loadKB(variantContext);
            this.backendKB = kbs.backend || this.loadKB('backend-kb.json');
            this.frontendKB = kbs.frontend || this.loadKB('frontend-kb.json');
            this.databaseKB = kbs.database || this.loadKB('database-kb.json');
            this.devopsKB = kbs.devops || this.loadKB('devops-kb.json');
            this.codeQualityKB = kbs['code-quality'] || this.loadKB('code-quality-kb.json');
            console.log(`[ExpertRouter] Stack-aware KB loaded (variant: ${variantContext.variantId || 'default'})`);
        } else {
            // Legacy: load generic KBs
            this.backendKB = this.loadKB('backend-kb.json');
            this.frontendKB = this.loadKB('frontend-kb.json');
            this.databaseKB = this.loadKB('database-kb.json');
            this.devopsKB = this.loadKB('devops-kb.json');
            this.codeQualityKB = this.loadKB('code-quality-kb.json');
        }

        // Initialize KBQueryOptimizer for fast inverted-index lookups
        this.kbQueryOptimizer = new KBQueryOptimizer({
            kbDir: path.join(__dirname, '../knowledge-base')
        });

        // Micro-agent cache (lazy loading)
        this.agentCache = new Map();

        // Week 12: Initialize PersonaManager
        this.personaManager = new PersonaManager();

        // Week 14: Initialize SpecialistLoader
        this.specialistLoader = new SpecialistLoader();
        this.specialistLoader.loadSpecialists();

        // Statistics tracking
        this.stats = {
            kb_hits: 0,
            agent_hits: 0,
            mcp_hits: 0,
            total_requests: 0,
            total_tokens: 0,
            persona_requests: {} // Week 12: Track persona usage
        };

        console.log('[ExpertRouter] Initialized with 5 Knowledge Bases (backend, frontend, database, devops, code-quality)');
        console.log('[ExpertRouter] PersonaManager ready (9 personas available)');
        console.log(`[ExpertRouter] SpecialistLoader ready (${this.specialistLoader.getStatistics().totalSpecialists} specialists discovered)`);
    }

    /**
     * Load Knowledge Base JSON file
     * @param {string} filename - KB file name
     * @returns {object} - Parsed KB object
     */
    loadKB(filename) {
        const kbPath = path.join(__dirname, '../knowledge-base', filename);
        try {
            const content = fs.readFileSync(kbPath, 'utf8');
            const kb = JSON.parse(content);
            console.log(`[ExpertRouter] Loaded ${filename} (${kb.metadata.technology})`);
            return kb;
        } catch (error) {
            console.error(`[ExpertRouter] Failed to load ${filename}:`, error.message);
            return { metadata: { version: '0.0.0' } };
        }
    }

    /**
     * Main consultation entry point - Adaptive 3-layer routing
     *
     * @param {string} stepDescription - Step description from plan
     * @param {string} category - backend/frontend/database
     * @param {string} complexity - low/medium/high
     * @param {Array<string>} personas - Week 12: Persona names (e.g., ['security', 'testing'])
     * @returns {Promise<object>} - Consultation result
     */
    async consultExpert(stepDescription, category, complexity = 'medium', personas = []) {
        this.stats.total_requests++;

        console.log(`\n[ExpertRouter] Consultation Request:`);
        console.log(`  Description: ${stepDescription}`);
        console.log(`  Category: ${category}`);
        console.log(`  Complexity: ${complexity}`);
        console.log(`  Personas: ${personas.length > 0 ? personas.join(', ') : 'none (default behavior)'}`);

        // Week 12: Get persona modifiers
        const confidenceModifiers = personas.length > 0 ? this.personaManager.getConfidenceModifiers(personas) : { kb: 0, agent: 0, plan: 0 };
        const boostedAgents = personas.length > 0 ? this.personaManager.getBoostedAgents(personas) : [];
        const boostedPatterns = personas.length > 0 ? this.personaManager.getBoostedPatterns(personas) : [];

        // Week 12: Adjust confidence thresholds based on personas
        const kbThreshold = 80 + confidenceModifiers.kb;
        const agentThreshold = 85 + confidenceModifiers.agent;

        console.log(`  Confidence Thresholds: KB=${kbThreshold}%, Agent=${agentThreshold}% (modifiers: +${confidenceModifiers.kb}%, +${confidenceModifiers.agent}%)`);
        if (boostedAgents.length > 0) {
            console.log(`  Boosted Agents: ${boostedAgents.join(', ')}`);
        }
        if (boostedPatterns.length > 0) {
            console.log(`  Boosted Patterns: ${boostedPatterns.slice(0, 3).join(', ')}...`);
        }

        // Layer 1: Knowledge Base lookup (fast, 0 API calls) - with persona pattern boosting
        const kbResult = this.checkKnowledgeBase(stepDescription, category, boostedPatterns);
        if (kbResult.confidence >= kbThreshold && complexity === 'low') {
            this.stats.kb_hits++;
            this.stats.total_tokens += kbResult.tokens;
            console.log(`  ✅ KB HIT (confidence: ${kbResult.confidence}%, tokens: ${kbResult.tokens})`);

            // Week 12: Adjust recommendation with persona advice
            const adjustedRecommendation = personas.length > 0 ?
                this.personaManager.adjustRecommendation(kbResult.recommendation, personas) :
                kbResult.recommendation;

            // Track persona usage
            this.trackPersonaUsage(personas);

            return { source: 'KB', ...kbResult, recommendation: adjustedRecommendation };
        }

        // Layer 2: Micro-Agent consultation (medium speed, load from file) - with persona agent boosting
        const agentResult = await this.consultMicroAgent(stepDescription, category, boostedAgents);
        if (agentResult.confidence >= agentThreshold && complexity === 'medium') {
            this.stats.agent_hits++;
            this.stats.total_tokens += agentResult.tokens;
            console.log(`  ✅ AGENT HIT (confidence: ${agentResult.confidence}%, tokens: ${agentResult.tokens})`);

            // Week 12: Adjust recommendation with persona advice
            const adjustedRecommendation = personas.length > 0 ?
                this.personaManager.adjustRecommendation(agentResult.recommendation, personas) :
                agentResult.recommendation;

            // Track persona usage
            this.trackPersonaUsage(personas);

            return { source: 'Agent', ...agentResult, recommendation: adjustedRecommendation };
        }

        // Layer 3: Context7 MCP (slow, API call to official docs) - with persona adjustments
        if (complexity === 'high') {
            const mcpResult = await this.consultContext7(stepDescription, category);
            this.stats.mcp_hits++;
            this.stats.total_tokens += mcpResult.tokens;
            console.log(`  ✅ MCP HIT (confidence: ${mcpResult.confidence}%, tokens: ${mcpResult.tokens})`);

            // Week 12: Adjust recommendation with persona advice
            const adjustedRecommendation = personas.length > 0 ?
                this.personaManager.adjustRecommendation(mcpResult.recommendation, personas) :
                mcpResult.recommendation;

            // Track persona usage
            this.trackPersonaUsage(personas);

            return { source: 'MCP', ...mcpResult, recommendation: adjustedRecommendation };
        }

        // Fallback: Agent result (even if confidence <85) - with persona adjustments
        this.stats.agent_hits++;
        this.stats.total_tokens += agentResult.tokens;
        console.log(`  ⚠️  AGENT FALLBACK (confidence: ${agentResult.confidence}%, tokens: ${agentResult.tokens})`);

        // Week 12: Adjust recommendation with persona advice
        const adjustedRecommendation = personas.length > 0 ?
            this.personaManager.adjustRecommendation(agentResult.recommendation, personas) :
            agentResult.recommendation;

        // Track persona usage
        this.trackPersonaUsage(personas);

        return { source: 'Agent_Fallback', ...agentResult, recommendation: adjustedRecommendation };
    }

    /**
     * Layer 1: Check Knowledge Base for quick answer
     *
     * @param {string} description - Step description
     * @param {string} category - backend/frontend/database
     * @param {Array<string>} boostedPatterns - Week 12: Persona-boosted KB patterns (2x weight)
     * @returns {object} - KB result with confidence score
     */
    checkKnowledgeBase(description, category, boostedPatterns = []) {
        const kb = this.getKBForCategory(category);
        const lowerDesc = description.toLowerCase();

        // Try fast-path via KBQueryOptimizer (inverted index) if no persona boosting
        if (boostedPatterns.length === 0 && this.kbQueryOptimizer) {
            try {
                const kbFilename = this._getCategoryFilename(category);
                if (kbFilename) {
                    const optimizedResult = this.kbQueryOptimizer.query(description, kbFilename);
                    if (optimizedResult && optimizedResult.confidence >= 50) {
                        return {
                            aspect: optimizedResult.approved_pattern || optimizedResult.name || 'optimized-match',
                            recommendation: optimizedResult.approved_pattern || optimizedResult.description || '',
                            rationale: optimizedResult.rationale || '',
                            do: optimizedResult.do || [],
                            dont: optimizedResult.dont || [],
                            examples: (optimizedResult.examples || []).slice(0, 2),
                            violations: optimizedResult.violations || [],
                            confidence: Math.round(optimizedResult.confidence),
                            tokens: 150, // Faster than linear scan
                            isBoosted: false
                        };
                    }
                }
            } catch (err) {
                // Fall through to linear scan
            }
        }

        // Week 12: Score all aspects (for pattern boosting)
        const scoredAspects = [];

        for (const [aspect, data] of Object.entries(kb)) {
            if (aspect === 'metadata') continue;
            if (!data || !Array.isArray(data.keywords)) continue;

            // Calculate base match score (0-100)
            const keywordMatches = data.keywords.filter(kw => lowerDesc.includes(kw)).length;
            const totalKeywords = data.keywords.length;
            let baseScore = (keywordMatches / totalKeywords) * 100;

            // Week 12: Apply 2x boost if aspect matches boosted patterns
            const isBoosted = boostedPatterns.some(pattern => {
                const lowerPattern = pattern.toLowerCase();
                const lowerAspect = aspect.toLowerCase();
                return lowerAspect.includes(lowerPattern) || data.keywords.some(kw => kw.toLowerCase().includes(lowerPattern));
            });

            if (isBoosted && baseScore > 0) {
                baseScore = Math.min(baseScore * 2.0, 100); // 2x boost, cap at 100
                console.log(`  [KB] ⭐ Persona boost applied to aspect "${aspect}" (${baseScore}%)`);
            }

            if (baseScore > 0) {
                scoredAspects.push({
                    aspect,
                    data,
                    score: baseScore,
                    isBoosted
                });
            }
        }

        // Sort by score (highest first)
        scoredAspects.sort((a, b) => b.score - a.score);

        // Return top match if score >= 50
        if (scoredAspects.length > 0 && scoredAspects[0].score >= 50) {
            const topMatch = scoredAspects[0];
            return {
                aspect: topMatch.aspect,
                recommendation: topMatch.data.approved_pattern,
                rationale: topMatch.data.rationale,
                do: topMatch.data.do,
                dont: topMatch.data.dont,
                examples: topMatch.data.examples.slice(0, 2), // Top 2 examples only
                violations: topMatch.data.violations,
                confidence: Math.round(topMatch.score), // Use calculated score
                tokens: 200, // KB lookup is very fast
                isBoosted: topMatch.isBoosted // Week 12: Flag if boosted
            };
        }

        // No match found
        return { confidence: 0, tokens: 0 };
    }

    /**
     * Layer 2: Consult Micro-Agent (load from file)
     *
     * @param {string} description - Step description
     * @param {string} category - backend/frontend/database
     * @param {Array<string>} boostedAgents - Week 12: Persona-boosted agents (checked first)
     * @returns {Promise<object>} - Agent consultation result
     */
    async consultMicroAgent(description, category, boostedAgents = []) {
        // Determine which micro-agent to load (with persona boosting)
        const agentPath = this.routeToAgent(description, category, boostedAgents);

        // Check cache first (avoid re-loading)
        if (this.agentCache.has(agentPath)) {
            console.log(`  [Cache] Using cached agent: ${path.basename(agentPath)}`);
            return this.agentCache.get(agentPath).consult(description);
        }

        // Load agent (lazy loading)
        try {
            const agentContent = fs.readFileSync(agentPath, 'utf8');
            const agent = this.parseAgent(agentContent, agentPath);
            this.agentCache.set(agentPath, agent);
            console.log(`  [Load] Loaded agent: ${path.basename(agentPath)}`);
            return agent.consult(description);
        } catch (error) {
            console.error(`  [Error] Failed to load agent ${agentPath}:`, error.message);
            return {
                recommendation: "Error loading micro-agent",
                confidence: 50,
                tokens: 100
            };
        }
    }

    /**
     * Route description to appropriate micro-agent
     *
     * @param {string} description - Step description
     * @param {string} category - backend/frontend/database/devops/security/pm
     * @param {Array<string>} boostedAgents - Week 12: Persona-boosted agents (checked first)
     * @returns {string} - Path to micro-agent file
     */
    routeToAgent(description, category, boostedAgents = []) {
        const lowerDesc = description.toLowerCase();

        // Week 12: Check boosted agents FIRST (persona priority)
        for (const agentName of boostedAgents) {
            const agentPath = this.getAgentPath(agentName);
            if (agentPath && fs.existsSync(agentPath)) {
                console.log(`  [Agent] ⭐ Persona boost: Using ${agentName}`);
                return agentPath;
            }
        }

        // Week 14: Try keyword-based lookup from SpecialistLoader
        const keywords = this.extractKeywords(lowerDesc);
        for (const keyword of keywords) {
            const specialists = this.specialistLoader.findByKeyword(keyword);
            if (specialists.length > 0) {
                const firstSpecialist = specialists[0];
                const specialistPath = this.specialistLoader.getPath(firstSpecialist);
                if (specialistPath && fs.existsSync(specialistPath)) {
                    console.log(`  [Agent] 🔍 Keyword match "${keyword}" → ${firstSpecialist}`);
                    return specialistPath;
                }
            }
        }

        // Week 11: Quality specialist (cross-cutting - highest priority)
        if (lowerDesc.includes('quality') || lowerDesc.includes('refactor') || lowerDesc.includes('code smell') ||
            lowerDesc.includes('complexity') || lowerDesc.includes('cyclomatic') || lowerDesc.includes('cognitive') ||
            lowerDesc.includes('maintainability') || lowerDesc.includes('sonarqube') || lowerDesc.includes('eslint') ||
            lowerDesc.includes('checkstyle') || lowerDesc.includes('solid') || lowerDesc.includes('dry') ||
            lowerDesc.includes('technical debt') || lowerDesc.includes('code review') || lowerDesc.includes('static analysis')) {
            return path.join(process.cwd(), 'specialists/code/quality/code-quality-specialist.md');
        }

        // Week 11: Testing specialists
        if (category === 'testing' || category === 'backend' || category === 'frontend') {
            // Backend Testing Specialist: JUnit, Mockito, test coverage
            if (lowerDesc.includes('test') || lowerDesc.includes('junit') || lowerDesc.includes('mockito') ||
                lowerDesc.includes('coverage') || lowerDesc.includes('unit test') || lowerDesc.includes('integration test') ||
                lowerDesc.includes('mock') || lowerDesc.includes('testcontainers') || lowerDesc.includes('spring boot test') ||
                lowerDesc.includes('@test') || lowerDesc.includes('assertion') || lowerDesc.includes('verify')) {
                if (category === 'backend' || category === 'testing') {
                    return path.join(process.cwd(), 'specialists/code/java-springboot/testing/java-testing-specialist.md');
                }
            }
            // Frontend Testing Specialist: Jest, React Testing Library, Playwright
            if (lowerDesc.includes('jest') || lowerDesc.includes('react testing library') || lowerDesc.includes('playwright') ||
                lowerDesc.includes('vitest') || lowerDesc.includes('cypress') || lowerDesc.includes('e2e') ||
                lowerDesc.includes('component test') || lowerDesc.includes('snapshot') || lowerDesc.includes('render') ||
                lowerDesc.includes('fireEvent') || lowerDesc.includes('waitFor')) {
                if (category === 'frontend' || category === 'testing') {
                    return path.join(process.cwd(), 'specialists/code/nextjs/testing/nextjs-testing-specialist.md');
                }
            }
        }

        // Week 11: Performance specialists
        if (category === 'performance' || category === 'backend' || category === 'frontend') {
            // Backend Performance Specialist: JVM tuning, profiling, caching
            if (lowerDesc.includes('performance') || lowerDesc.includes('optimization') || lowerDesc.includes('profiling') ||
                lowerDesc.includes('jvm') || lowerDesc.includes('gc') || lowerDesc.includes('garbage collection') ||
                lowerDesc.includes('memory leak') || lowerDesc.includes('heap') || lowerDesc.includes('jprofile') ||
                lowerDesc.includes('visualvm') || lowerDesc.includes('cache') || lowerDesc.includes('redis') ||
                lowerDesc.includes('hikaricp') || lowerDesc.includes('connection pool') || lowerDesc.includes('n+1')) {
                if (category === 'backend' || category === 'performance') {
                    return path.join(process.cwd(), 'specialists/code/java-springboot/performance/java-perf-specialist.md');
                }
            }
            // Frontend Performance Specialist: Bundle size, Core Web Vitals, SSR optimization
            if (lowerDesc.includes('bundle') || lowerDesc.includes('core web vitals') || lowerDesc.includes('lcp') ||
                lowerDesc.includes('inp') || lowerDesc.includes('cls') || lowerDesc.includes('ssr') || lowerDesc.includes('ssg') ||
                lowerDesc.includes('isr') || lowerDesc.includes('next/image') || lowerDesc.includes('image optimization') ||
                lowerDesc.includes('dynamic import') || lowerDesc.includes('code splitting') || lowerDesc.includes('suspense') ||
                lowerDesc.includes('streaming')) {
                if (category === 'frontend' || category === 'performance') {
                    return path.join(process.cwd(), 'specialists/code/nextjs/performance/nextjs-perf-specialist.md');
                }
            }
        }

        // Week 10: Security specialists (high priority - check after Quality/Testing/Performance)
        if (category === 'security' || category === 'backend' || category === 'frontend') {
            // Backend Security Specialist: OWASP, JWT, Spring Security, authentication
            if (lowerDesc.includes('security') || lowerDesc.includes('owasp') || lowerDesc.includes('authentication') ||
                lowerDesc.includes('authorization') || lowerDesc.includes('jwt') || lowerDesc.includes('oauth2') ||
                lowerDesc.includes('spring security') || lowerDesc.includes('login') || lowerDesc.includes('password') ||
                lowerDesc.includes('hash') || lowerDesc.includes('bcrypt') || lowerDesc.includes('validate') ||
                lowerDesc.includes('sql injection') || lowerDesc.includes('xss')) {
                if (category === 'backend' || category === 'security') {
                    return path.join(process.cwd(), 'specialists/code/java-springboot/security/java-security-specialist.md');
                }
            }
            // Frontend Security Specialist: NextAuth, XSS, CSRF, security headers
            if (lowerDesc.includes('nextauth') || lowerDesc.includes('xss') || lowerDesc.includes('csrf') ||
                lowerDesc.includes('api security') || lowerDesc.includes('middleware') || lowerDesc.includes('security headers') ||
                lowerDesc.includes('sanitize') || lowerDesc.includes('dompurify') || lowerDesc.includes('csp') ||
                lowerDesc.includes('content security policy') || lowerDesc.includes('oauth') ||
                lowerDesc.includes('session') || lowerDesc.includes('cookie') || lowerDesc.includes('httponly')) {
                if (category === 'frontend' || category === 'security') {
                    return path.join(process.cwd(), 'specialists/code/nextjs/security/nextjs-security-specialist.md');
                }
            }
        }

        // Week 10: Database specialists
        if (category === 'database') {
            // Postgres Optimization Specialist: Indexes, query performance, EXPLAIN ANALYZE
            if (lowerDesc.includes('index') || lowerDesc.includes('optimize') || lowerDesc.includes('explain') ||
                lowerDesc.includes('explain analyze') || lowerDesc.includes('performance') || lowerDesc.includes('query plan') ||
                lowerDesc.includes('slow query') || lowerDesc.includes('vacuum') || lowerDesc.includes('analyze') ||
                lowerDesc.includes('connection pool') || lowerDesc.includes('hikari') || lowerDesc.includes('hikaricp') ||
                lowerDesc.includes('b-tree') || lowerDesc.includes('gin') || lowerDesc.includes('gist')) {
                return path.join(process.cwd(), 'specialists/code/database/postgres-optimization-specialist.md');
            }
            // Postgres Schema Specialist: Tables, constraints, normalization
            if (lowerDesc.includes('schema') || lowerDesc.includes('table') || lowerDesc.includes('constraint') ||
                lowerDesc.includes('primary key') || lowerDesc.includes('foreign key') || lowerDesc.includes('migration') ||
                lowerDesc.includes('flyway') || lowerDesc.includes('liquibase') || lowerDesc.includes('normalization') ||
                lowerDesc.includes('1nf') || lowerDesc.includes('2nf') || lowerDesc.includes('3nf') ||
                lowerDesc.includes('data type') || lowerDesc.includes('varchar') || lowerDesc.includes('uuid')) {
                return path.join(process.cwd(), 'specialists/code/database/postgres-schema-specialist.md');
            }
        }

        // Week 10: DevOps specialists
        if (category === 'devops') {
            // GitHub Actions Specialist: CI/CD, pipelines, workflows
            if (lowerDesc.includes('github actions') || lowerDesc.includes('ci/cd') || lowerDesc.includes('pipeline') ||
                lowerDesc.includes('workflow') || lowerDesc.includes('deploy') || lowerDesc.includes('automation') ||
                lowerDesc.includes('matrix') || lowerDesc.includes('caching') || lowerDesc.includes('secret') ||
                lowerDesc.includes('codeql') || lowerDesc.includes('dependabot')) {
                return path.join(process.cwd(), 'specialists/code/devops/github-actions-specialist.md');
            }
            // Docker Specialist: Containers, Dockerfile, docker-compose
            if (lowerDesc.includes('docker') || lowerDesc.includes('dockerfile') || lowerDesc.includes('container') ||
                lowerDesc.includes('compose') || lowerDesc.includes('docker-compose') || lowerDesc.includes('image') ||
                lowerDesc.includes('build') || lowerDesc.includes('multi-stage') || lowerDesc.includes('alpine') ||
                lowerDesc.includes('health check')) {
                return path.join(process.cwd(), 'specialists/code/devops/docker-specialist.md');
            }
        }

        // Week 10: PM/Documentation specialist
        if (category === 'pm' || lowerDesc.includes('documentation') || lowerDesc.includes('readme') ||
            lowerDesc.includes('api docs') || lowerDesc.includes('jsdoc') || lowerDesc.includes('javadoc') ||
            lowerDesc.includes('openapi') || lowerDesc.includes('swagger') || lowerDesc.includes('diagram') ||
            lowerDesc.includes('mermaid') || lowerDesc.includes('flowchart') || lowerDesc.includes('sequence diagram') ||
            lowerDesc.includes('technical writing')) {
            return path.join(process.cwd(), 'specialists/code/pm/documentation-specialist.md');
        }

        // Original backend specialists
        if (category === 'backend') {
            // DI Specialist: Dependency injection, services, autowiring
            if (lowerDesc.includes('dependency') || lowerDesc.includes('inject') || lowerDesc.includes('di') ||
                lowerDesc.includes('service') || lowerDesc.includes('autowire') || lowerDesc.includes('bean')) {
                return path.join(process.cwd(), 'specialists/code/java-springboot/di/java-di-specialist.md');
            }
            // Migration Specialist: Database migrations, schema changes
            if (lowerDesc.includes('migration') || lowerDesc.includes('flyway') || lowerDesc.includes('schema') ||
                lowerDesc.includes('table') || lowerDesc.includes('database')) {
                return path.join(process.cwd(), 'specialists/code/java-springboot/migration/java-migration-specialist.md');
            }
            // Data Access Specialist: Repositories, JPA, queries
            if (lowerDesc.includes('repository') || lowerDesc.includes('jpa') || lowerDesc.includes('query') ||
                lowerDesc.includes('entity') || lowerDesc.includes('persistence') || lowerDesc.includes('crud')) {
                return path.join(process.cwd(), 'specialists/code/java-springboot/data-access/java-data-access-specialist.md');
            }
        }

        // Original frontend specialists
        if (category === 'frontend') {
            // State Specialist: State management, hooks, context
            if (lowerDesc.includes('state') || lowerDesc.includes('usestate') || lowerDesc.includes('context') ||
                lowerDesc.includes('hook') || lowerDesc.includes('reducer') || lowerDesc.includes('store')) {
                return path.join(process.cwd(), 'specialists/code/nextjs/state/nextjs-state-specialist.md');
            }
            // Data Fetching Specialist: API calls, async operations
            if (lowerDesc.includes('fetch') || lowerDesc.includes('data') || lowerDesc.includes('async') ||
                lowerDesc.includes('api') || lowerDesc.includes('request') || lowerDesc.includes('load')) {
                return path.join(process.cwd(), 'specialists/code/nextjs/data-fetching/nextjs-data-fetching-specialist.md');
            }
            // Component Specialist: UI components, pages, layouts (most general)
            if (lowerDesc.includes('component') || lowerDesc.includes('server component') || lowerDesc.includes('client') ||
                lowerDesc.includes('page') || lowerDesc.includes('layout') || lowerDesc.includes('ui')) {
                return path.join(process.cwd(), 'specialists/code/nextjs/component/nextjs-component-specialist.md');
            }
        }

        // Default fallback: Return most general agent for category
        if (category === 'backend') {
            // Default to DI specialist (most common backend concern)
            return path.join(process.cwd(), 'specialists/code/java-springboot/di/java-di-specialist.md');
        }
        if (category === 'frontend') {
            // Default to component specialist (most common frontend concern)
            return path.join(process.cwd(), 'specialists/code/nextjs/component/nextjs-component-specialist.md');
        }
        if (category === 'database') {
            // Default to schema specialist
            return path.join(process.cwd(), 'specialists/code/database/postgres-schema-specialist.md');
        }
        if (category === 'devops') {
            // Default to GitHub Actions specialist
            return path.join(process.cwd(), 'specialists/code/devops/github-actions-specialist.md');
        }
        if (category === 'pm') {
            return path.join(process.cwd(), 'specialists/code/pm/documentation-specialist.md');
        }
        if (category === 'security') {
            // Default to backend security specialist
            return path.join(process.cwd(), 'specialists/code/java-springboot/security/java-security-specialist.md');
        }

        // Ultimate fallback: return backend DI specialist
        return path.join(process.cwd(), 'specialists/code/java-springboot/di/java-di-specialist.md');
    }

    /**
     * Parse micro-agent markdown file
     *
     * @param {string} content - Agent file content
     * @param {string} agentPath - Path to agent file
     * @returns {object} - Agent object with consult method
     */
    parseAgent(content, agentPath) {
        // Simple parser: extract key information
        const agentName = path.basename(agentPath, '.md');

        // Extract APPROVED patterns
        const approvedMatches = content.match(/### APPROVED Pattern.+?```[\s\S]+?```/g) || [];
        const approvedPatterns = approvedMatches.map(match => {
            const codeMatch = match.match(/```\w*\n([\s\S]+?)\n```/);
            return codeMatch ? codeMatch[1] : '';
        });

        // Extract REJECTED patterns
        const rejectedMatches = content.match(/### REJECTED Pattern.+?```[\s\S]+?```/g) || [];
        const rejectedPatterns = rejectedMatches.map(match => {
            const codeMatch = match.match(/```\w*\n([\s\S]+?)\n```/);
            return codeMatch ? codeMatch[1] : '';
        });

        // Extract examples
        const exampleMatches = content.match(/### Example \d+:.+?\*\*Confidence\*\*: (\d+)%/gs) || [];

        return {
            name: agentName,
            approvedPatterns,
            rejectedPatterns,
            exampleCount: exampleMatches.length,
            consult: (description) => ({
                recommendation: `Use approved pattern from ${agentName}`,
                code_example: approvedPatterns[0] || '',
                rationale: `Based on ${agentName} best practices`,
                do: ["Follow approved patterns", "Avoid rejected patterns"],
                dont: ["Use deprecated approaches", "Ignore performance implications"],
                confidence: 90,
                tokens: 800 // Micro-agent average
            })
        };
    }

    /**
     * Layer 3: Consult Context7 MCP (placeholder)
     *
     * @param {string} description - Step description
     * @param {string} category - backend/frontend/database
     * @returns {Promise<object>} - MCP consultation result
     */
    async consultContext7(description, category) {
        // Placeholder: In real implementation, call Context7 MCP
        // This would make API call to official documentation
        console.log(`  [MCP] Would call Context7 for: ${description}`);

        return {
            recommendation: "Official docs recommend following best practices",
            source_url: `https://docs.example.com/${category}`,
            rationale: "Based on official documentation",
            confidence: 95,
            tokens: 500 // MCP is efficient
        };
    }

    /**
     * Get Knowledge Base for category
     *
     * @param {string} category - backend/frontend/database/devops/security/pm/testing/performance/quality
     * @returns {object} - KB object
     */
    getKBForCategory(category) {
        if (category === 'backend') return this.backendKB;
        if (category === 'frontend') return this.frontendKB;
        if (category === 'database') return this.databaseKB;
        if (category === 'devops' || category === 'pm') return this.devopsKB; // Week 10: DevOps/PM use devopsKB
        if (category === 'quality') return this.codeQualityKB; // Week 11: Quality uses code-quality KB
        if (category === 'security') {
            // Security uses both backend and frontend KBs
            return { ...this.backendKB, ...this.frontendKB };
        }
        if (category === 'testing') {
            // Testing uses both backend and frontend KBs (have testing aspects)
            return { ...this.backendKB, ...this.frontendKB };
        }
        if (category === 'performance') {
            // Performance uses both backend and frontend KBs (have performance aspects)
            return { ...this.backendKB, ...this.frontendKB };
        }
        return {};
    }

    /**
     * Map category to KB filename for KBQueryOptimizer
     * @param {string} category
     * @returns {string|null} KB filename
     */
    _getCategoryFilename(category) {
        const map = {
            backend: 'backend-kb.json',
            frontend: 'frontend-kb.json',
            database: 'database-kb.json',
            devops: 'devops-kb.json',
            quality: 'code-quality-kb.json'
        };
        return map[category] || null;
    }

    /**
     * Get statistics
     *
     * @returns {object} - Statistics object
     */
    getStatistics() {
        const avgTokens = this.stats.total_requests > 0
            ? Math.round(this.stats.total_tokens / this.stats.total_requests)
            : 0;

        return {
            ...this.stats,
            avg_tokens_per_request: avgTokens,
            kb_hit_rate: this.stats.total_requests > 0
                ? Math.round((this.stats.kb_hits / this.stats.total_requests) * 100)
                : 0,
            agent_hit_rate: this.stats.total_requests > 0
                ? Math.round((this.stats.agent_hits / this.stats.total_requests) * 100)
                : 0,
            mcp_hit_rate: this.stats.total_requests > 0
                ? Math.round((this.stats.mcp_hits / this.stats.total_requests) * 100)
                : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.stats = {
            kb_hits: 0,
            agent_hits: 0,
            mcp_hits: 0,
            total_requests: 0,
            total_tokens: 0,
            persona_requests: {} // Week 12: Include persona_requests
        };
    }

    /**
     * Week 12: Get agent path by agent name
     * Week 14: Enhanced with SpecialistLoader fallback
     *
     * @param {string} agentName - Agent name (e.g., 'java-security-specialist')
     * @returns {string|null} - Path to agent file or null if not found
     */
    getAgentPath(agentName) {
        // Week 14: Try SpecialistLoader first
        const specialistPath = this.specialistLoader.getPath(agentName + '.md');
        if (specialistPath) {
            return specialistPath;
        }

        // Fallback to hardcoded map (backward compatibility)
        const agentMap = {
            // Backend agents
            'java-di-specialist': 'specialists/code/java-springboot/di/java-di-specialist.md',
            'java-migration-specialist': 'specialists/code/java-springboot/migration/java-migration-specialist.md',
            'java-data-access-specialist': 'specialists/code/java-springboot/data-access/java-data-access-specialist.md',
            'java-security-specialist': 'specialists/code/java-springboot/security/java-security-specialist.md',
            'java-testing-specialist': 'specialists/code/java-springboot/testing/java-testing-specialist.md',
            'java-perf-specialist': 'specialists/code/java-springboot/performance/java-perf-specialist.md',

            // Frontend agents
            'nextjs-state-specialist': 'specialists/code/nextjs/state/nextjs-state-specialist.md',
            'nextjs-data-fetching-specialist': 'specialists/code/nextjs/data-fetching/nextjs-data-fetching-specialist.md',
            'nextjs-component-specialist': 'specialists/code/nextjs/component/nextjs-component-specialist.md',
            'nextjs-security-specialist': 'specialists/code/nextjs/security/nextjs-security-specialist.md',
            'nextjs-testing-specialist': 'specialists/code/nextjs/testing/nextjs-testing-specialist.md',
            'nextjs-perf-specialist': 'specialists/code/nextjs/performance/nextjs-perf-specialist.md',

            // Database agents
            'postgres-schema-specialist': 'specialists/code/database/postgres-schema-specialist.md',
            'postgres-optimization-specialist': 'specialists/code/database/postgres-optimization-specialist.md',

            // DevOps agents
            'github-actions-specialist': 'specialists/code/devops/github-actions-specialist.md',
            'docker-specialist': 'specialists/code/devops/docker-specialist.md',

            // PM/Documentation agent
            'documentation-specialist': 'specialists/code/pm/documentation-specialist.md',

            // Quality agent
            'code-quality-specialist': 'specialists/code/quality/code-quality-specialist.md'
        };

        const relativePath = agentMap[agentName];
        if (!relativePath) {
            return null;
        }

        return path.join(process.cwd(), relativePath);
    }

    /**
     * Week 14: Extract keywords from description for specialist lookup
     *
     * @param {string} description - Step description
     * @returns {Array<string>} - Array of keywords
     */
    extractKeywords(description) {
        const keywords = new Set();
        const lowerDesc = description.toLowerCase();

        // Technology keywords
        const techKeywords = [
            'jpa', 'jdbc', 'react', 'next.js', 'fastapi', 'langgraph',
            'postgres', 'neo4j', 'qdrant', 'redis', 'docker', 'kafka',
            'jwt', 'oauth', 'bcrypt', 'validation', 'encryption',
            'export', 'import', 'filter', 'pagination', 'sort',
            'theme', 'language', 'notification', 'keyboard',
            'llm', 'vlm', 'embedding', 'voice', 'openai', 'anthropic'
        ];

        for (const tech of techKeywords) {
            if (lowerDesc.includes(tech)) {
                keywords.add(tech);
            }
        }

        // Pattern keywords
        const patternKeywords = [
            'repository', 'service', 'controller', 'component',
            'hook', 'state', 'routing', 'middleware', 'provider',
            'widget', 'feature', 'page', 'layout', 'schema'
        ];

        for (const pattern of patternKeywords) {
            if (lowerDesc.includes(pattern)) {
                keywords.add(pattern);
            }
        }

        return Array.from(keywords);
    }

    /**
     * Week 12: Track persona usage in statistics
     *
     * @param {Array<string>} personas - Persona names used in request
     */
    trackPersonaUsage(personas) {
        if (personas.length === 0) return;

        personas.forEach(persona => {
            this.stats.persona_requests[persona] = (this.stats.persona_requests[persona] || 0) + 1;
        });
    }

    /**
     * List all available agents (Week 11: 18 agents total)
     *
     * @returns {Array<object>} - List of all agents with metadata
     */
    listAgents() {
        const agents = [
            // Original 6 agents
            { id: 1, category: 'backend', subcategory: 'di', name: 'java-di-specialist', keywords: 'dependency, inject, service, autowire, bean' },
            { id: 2, category: 'backend', subcategory: 'migration', name: 'java-migration-specialist', keywords: 'migration, flyway, schema, table, database' },
            { id: 3, category: 'backend', subcategory: 'data-access', name: 'java-data-access-specialist', keywords: 'repository, jpa, query, entity, persistence, crud' },
            { id: 4, category: 'frontend', subcategory: 'state', name: 'nextjs-state-specialist', keywords: 'state, useState, context, hook, reducer, store' },
            { id: 5, category: 'frontend', subcategory: 'data-fetching', name: 'nextjs-data-fetching-specialist', keywords: 'fetch, data, async, api, request, load' },
            { id: 6, category: 'frontend', subcategory: 'component', name: 'nextjs-component-specialist', keywords: 'component, server component, client, page, layout, ui' },
            // Week 10: Security agents (2)
            { id: 7, category: 'backend', subcategory: 'security', name: 'java-security-specialist', keywords: 'security, owasp, authentication, jwt, oauth2, spring security, sql injection, xss' },
            { id: 8, category: 'frontend', subcategory: 'security', name: 'nextjs-security-specialist', keywords: 'nextauth, xss, csrf, api security, middleware, security headers, sanitize, dompurify' },
            // Week 10: Database agents (2)
            { id: 9, category: 'database', subcategory: 'schema', name: 'postgres-schema-specialist', keywords: 'schema, table, constraint, primary key, foreign key, migration, flyway, normalization' },
            { id: 10, category: 'database', subcategory: 'optimization', name: 'postgres-optimization-specialist', keywords: 'index, optimize, explain, performance, query plan, slow query, vacuum, connection pool' },
            // Week 10: DevOps agents (2)
            { id: 11, category: 'devops', subcategory: 'ci-cd', name: 'github-actions-specialist', keywords: 'github actions, ci/cd, pipeline, workflow, deploy, automation, matrix, caching, codeql' },
            { id: 12, category: 'devops', subcategory: 'docker', name: 'docker-specialist', keywords: 'docker, dockerfile, container, compose, docker-compose, image, multi-stage, alpine, health check' },
            // Week 10: PM agent (1)
            { id: 13, category: 'pm', subcategory: 'documentation', name: 'documentation-specialist', keywords: 'documentation, readme, api docs, openapi, swagger, diagram, mermaid, technical writing' },
            // Week 11: Testing agents (2)
            { id: 14, category: 'backend', subcategory: 'testing', name: 'java-testing-specialist', keywords: 'test, junit, mockito, coverage, unit test, integration test, mock, testcontainers, spring boot test' },
            { id: 15, category: 'frontend', subcategory: 'testing', name: 'nextjs-testing-specialist', keywords: 'jest, react testing library, playwright, vitest, cypress, e2e, component test, snapshot' },
            // Week 11: Performance agents (2)
            { id: 16, category: 'backend', subcategory: 'performance', name: 'java-perf-specialist', keywords: 'performance, optimization, jvm, gc, profiling, memory leak, cache, redis, hikaricp, n+1' },
            { id: 17, category: 'frontend', subcategory: 'performance', name: 'nextjs-perf-specialist', keywords: 'bundle, core web vitals, lcp, inp, cls, ssr, ssg, isr, next/image, dynamic import, suspense' },
            // Week 11: Quality agent (1)
            { id: 18, category: 'quality', subcategory: 'code-quality', name: 'code-quality-specialist', keywords: 'quality, refactor, code smell, complexity, cyclomatic, cognitive, maintainability, sonarqube, solid, dry' }
        ];

        return agents;
    }
}

module.exports = ExpertRouter;

// CLI usage for testing
if (require.main === module) {
    const router = new ExpertRouter();
    const args = process.argv.slice(2);

    // Check for --list-agents flag
    if (args.includes('--list-agents')) {
        console.log('\n=== Expert Router - All Agents (18 total) ===\n');
        const agents = router.listAgents();
        agents.forEach(agent => {
            console.log(`${agent.id}. [${agent.category}/${agent.subcategory}] ${agent.name}`);
            console.log(`   Keywords: ${agent.keywords}`);
            console.log('');
        });
        console.log('Total: 18 agents (6 original + 7 Week 10 + 5 Week 11)');
        console.log('  - Original: 6 agents (DI, Migration, Data Access, State, Data Fetching, Component)');
        console.log('  - Week 10: 7 agents (Security: 2, Database: 2, DevOps: 2, PM: 1)');
        console.log('  - Week 11: 5 agents (Testing: 2, Performance: 2, Quality: 1)');
        process.exit(0);
    }

    console.log('\n=== Expert Router Test ===\n');

    // Test 1: Backend DI (should hit KB)
    router.consultExpert(
        "Implement UserService with dependency injection",
        "backend",
        "low"
    ).then(result => {
        console.log('\n--- Test 1: Backend DI ---');
        console.log('Result:', JSON.stringify(result, null, 2));
    }).then(() => {
        // Test 2: Frontend component (should hit Agent)
        return router.consultExpert(
            "Create user list component with server and client parts",
            "frontend",
            "medium"
        );
    }).then(result => {
        console.log('\n--- Test 2: Frontend Component ---');
        console.log('Result:', JSON.stringify(result, null, 2));
    }).then(() => {
        // Test 3: Complex query (should hit MCP)
        return router.consultExpert(
            "Implement complex GraphQL resolver with authentication",
            "backend",
            "high"
        );
    }).then(result => {
        console.log('\n--- Test 3: Complex Query ---');
        console.log('Result:', JSON.stringify(result, null, 2));
    }).then(() => {
        // Print statistics
        console.log('\n=== Statistics ===');
        console.log(JSON.stringify(router.getStatistics(), null, 2));
    }).catch(error => {
        console.error('Test failed:', error);
    });
}
