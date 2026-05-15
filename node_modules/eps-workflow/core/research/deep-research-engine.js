#!/usr/bin/env node

/**
 * Deep Research Engine
 * ディープリサーチエンジン
 * Động Cơ Nghiên Cứu Sâu
 *
 * Purpose: 5-iteration deep research with progressive depth and Tavily integration
 *
 * Features:
 * - 5-iteration research flow (progressive depth: broad → narrow → deep → validate → refine)
 * - Progressive depth strategy (iteration 1: surface → iteration 5: comprehensive)
 * - Stopping condition evaluation (convergence, time limit, evidence saturation)
 * - Evidence accumulation across iterations (dedupe, merge with previous)
 * - Iteration planning (what to research next based on gaps)
 * - Tavily MCP integration for deep web search
 *
 * @version 3.8.0
 * @date 2025-12-24
 */

const IterationStrategies = require('./iteration-strategies');
const TavilyIntegration = require('../mcp/tavily-integration');
const ResearchSynthesizer = require('./research-synthesizer');
const EvidenceAggregator = require('./evidence-aggregator');
const { getTechStackContext } = require('../state/tech-stack-context');

/**
 * Deep Research Engine
 * Orchestrates 5-iteration progressive deep research
 *
 * Tech Stack Aware:
 * - STACK_DEFINED: Focus research on specific tech (C#, Java, etc.)
 * - STACK_SELECTION: Compare all available tech stacks
 */
class DeepResearchEngine {
  constructor(options = {}) {
    this.options = {
      maxIterations: options.maxIterations || 5,
      maxTime: options.maxTime || 60000, // 60 seconds
      minQualityImprovement: options.minQualityImprovement || 5,
      ...options
    };

    // Initialize components
    this.strategies = new IterationStrategies(this.options);
    this.tavily = new TavilyIntegration(options.tavily || {});
    this.synthesizer = new ResearchSynthesizer();
    this.aggregator = new EvidenceAggregator();

    // Tech stack context - loaded before research
    this.techStackContext = null;

    // Research state
    this.state = {
      iterations: [],
      allEvidence: [],
      startTime: null,
      stopped: false,
      stoppingReasons: []
    };

    // Metrics
    this.metrics = {
      totalIterations: 0,
      totalEvidence: 0,
      totalTime: 0,
      avgQualityPerIteration: [],
      avgDepthPerIteration: [],
      convergenceIteration: null
    };
  }

  /**
   * Execute deep research with 5-iteration flow
   *
   * @param {string} query - Research query
   * @param {Object} context - Research context
   * @returns {Promise<Object>} Research results
   */
  async executeDeepResearch(query, context = {}) {
    // Load tech stack context FIRST
    this.techStackContext = await getTechStackContext();
    const stackSummary = this.techStackContext.getSummary();

    console.log(`\n🔍 Starting Deep Research: "${query}"`);
    console.log(`  Max Iterations: ${this.options.maxIterations}`);
    console.log(`  Max Time: ${this.options.maxTime}ms`);
    console.log(`  Tech Stack: ${stackSummary.status === 'DEFINED' ? stackSummary.stack : 'NOT DEFINED (comparing options)'}`);

    // Enhance query with tech stack context
    const enhancedQuery = this.techStackContext.enhanceQuery(query);
    if (enhancedQuery !== query) {
      console.log(`  Enhanced Query: "${enhancedQuery}"`);
    }

    this.state.startTime = Date.now();
    this.state.iterations = [];
    this.state.allEvidence = [];
    this.state.originalQuery = query;
    this.state.enhancedQuery = enhancedQuery;
    this.state.stopped = false;
    this.state.stoppingReasons = [];

    try {
      for (let i = 1; i <= this.options.maxIterations; i++) {
        console.log(`\n📊 Iteration ${i}/${this.options.maxIterations}`);

        // Plan iteration
        const plan = this.strategies.planIteration(i, {
          originalQuery: query,
          previousResults: this._getPreviousResults(i - 1),
          allEvidence: this.state.allEvidence
        });

        console.log(`  Goal: ${plan.goal}`);
        console.log(`  Query: ${plan.query}`);
        console.log(`  Sources: ${plan.sources.join(', ')}`);

        if (!plan.query) {
          console.log(`  ⚠️  No query generated (gaps filled), stopping early`);
          this.state.stopped = true;
          this.state.stoppingReasons.push('No gaps to fill');
          break;
        }

        // Execute iteration
        const iterationResults = await this._executeIteration(i, plan, context);

        // Store iteration results
        this.state.iterations.push({
          iteration: i,
          plan: plan,
          results: iterationResults.evidence,
          metrics: iterationResults.metrics
        });

        // Accumulate evidence
        this.state.allEvidence = this._accumulateEvidence(
          this.state.allEvidence,
          iterationResults.evidence
        );

        console.log(`  ✅ Iteration ${i} complete: ${iterationResults.evidence.length} new pieces`);
        console.log(`  Total evidence: ${this.state.allEvidence.length} pieces`);

        // Check stopping conditions
        const stoppingDecision = this.strategies.shouldStop(i, {
          previousIteration: this.state.iterations[i - 2], // Previous iteration (i-1 is current)
          currentResults: iterationResults.evidence,
          allEvidence: this.state.allEvidence,
          startTime: this.state.startTime
        });

        if (stoppingDecision.shouldStop) {
          console.log(`\n🛑 Stopping early at iteration ${i}:`);
          stoppingDecision.reasons.forEach(reason => console.log(`  - ${reason}`));

          this.state.stopped = true;
          this.state.stoppingReasons = stoppingDecision.reasons;
          this.metrics.convergenceIteration = i;
          break;
        }
      }

      // Calculate final metrics
      this.metrics.totalIterations = this.state.iterations.length;
      this.metrics.totalEvidence = this.state.allEvidence.length;
      this.metrics.totalTime = Date.now() - this.state.startTime;
      this.metrics.avgQualityPerIteration = this.state.iterations.map(iter =>
        this._calculateAvgQuality(iter.results)
      );
      this.metrics.avgDepthPerIteration = this.state.iterations.map(iter =>
        this._calculateAvgDepth(iter.results)
      );

      // Assess depth progression
      const depthProgression = this.strategies.assessDepthProgression(
        this.state.iterations.map(iter => iter.results)
      );

      // Aggregate final results
      const aggregated = await this.aggregator.aggregate(this.state.allEvidence);

      console.log(`\n✅ Deep Research Complete:`);
      console.log(`  Total Iterations: ${this.metrics.totalIterations}`);
      console.log(`  Total Evidence: ${this.metrics.totalEvidence} pieces`);
      console.log(`  Total Time: ${this.metrics.totalTime}ms`);
      console.log(`  Avg Quality: ${this._calculateAvgQuality(this.state.allEvidence).toFixed(1)}%`);
      console.log(`  Depth Progression: ${depthProgression.isProgressing ? '✅ Improving' : '⚠️  Not improving'}`);

      return {
        query: query,
        iterations: this.state.iterations,
        evidence: aggregated.evidence,
        aggregated: aggregated,
        depthProgression: depthProgression,
        stopped: this.state.stopped,
        stoppingReasons: this.state.stoppingReasons,
        metrics: this.metrics
      };

    } catch (error) {
      console.error(`\n❌ Deep research failed:`, error.message);
      throw error;
    }
  }

  /**
   * Execute single iteration
   * @private
   */
  async _executeIteration(iterationNumber, plan, context) {
    const startTime = Date.now();
    let evidence = [];

    try {
      // Execute based on sources
      if (plan.sources.includes('WebSearch')) {
        // Mock WebSearch results (simplified)
        const webResults = this._mockWebSearch(plan.query, 3);
        evidence = [...evidence, ...webResults];
      }

      if (plan.sources.includes('TavilyBasic')) {
        const tavilyResults = await this.tavily.search({
          query: plan.query,
          search_depth: 'basic',
          max_results: 2,
          researchPhase: context.researchPhase
        });
        evidence = [...evidence, ...tavilyResults.evidence];
      }

      if (plan.sources.includes('TavilyAdvanced')) {
        const tavilyResults = await this.tavily.search({
          query: plan.query,
          search_depth: 'advanced',
          max_results: 3,
          researchPhase: context.researchPhase
        });
        evidence = [...evidence, ...tavilyResults.evidence];
      }

      if (plan.sources.includes('GitHub')) {
        // Mock GitHub search (simplified)
        const githubResults = this._mockGitHubSearch(plan.query, 1);
        evidence = [...evidence, ...githubResults];
      }

      if (plan.sources.includes('CaseStudies')) {
        // Mock case study search (simplified)
        const caseStudyResults = this._mockCaseStudySearch(plan.query, 1);
        evidence = [...evidence, ...caseStudyResults];
      }

      if (plan.sources.includes('ExpertBlogs') || plan.sources.includes('OfficialDocs')) {
        // Mock expert/official search (simplified)
        const expertResults = this._mockExpertSearch(plan.query, 1);
        evidence = [...evidence, ...expertResults];
      }

      const executionTime = Date.now() - startTime;

      return {
        evidence: evidence,
        metrics: {
          executionTime: executionTime,
          evidenceCount: evidence.length,
          avgQuality: this._calculateAvgQuality(evidence),
          avgDepth: this._calculateAvgDepth(evidence)
        }
      };

    } catch (error) {
      console.error(`  ❌ Iteration ${iterationNumber} failed:`, error.message);
      return {
        evidence: [],
        metrics: {
          executionTime: Date.now() - startTime,
          evidenceCount: 0,
          avgQuality: 0,
          avgDepth: 0,
          error: error.message
        }
      };
    }
  }

  /**
   * Accumulate evidence with deduplication
   * @private
   */
  _accumulateEvidence(existingEvidence, newEvidence) {
    const combined = [...existingEvidence];

    for (const newEv of newEvidence) {
      // Check if duplicate (simple URL comparison)
      const isDuplicate = existingEvidence.some(existing =>
        existing.source?.url === newEv.source?.url ||
        existing.title === newEv.title
      );

      if (!isDuplicate) {
        combined.push(newEv);
      }
    }

    return combined;
  }

  /**
   * Get previous iteration results
   * @private
   */
  _getPreviousResults(iterationIndex) {
    if (iterationIndex < 0 || iterationIndex >= this.state.iterations.length) {
      return [];
    }

    return this.state.iterations[iterationIndex].results || [];
  }

  /**
   * Mock WebSearch (simplified)
   * @private
   */
  _mockWebSearch(query, count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push({
        id: `web-${Date.now()}-${i}`,
        title: `${query} - Web Result ${i + 1}`,
        content: `Mock web search content for ${query}. General overview and introduction.`,
        source: {
          url: `https://example.com/web-${i}`,
          type: 'blog',
          authority: 70 + (i * 2),
          publicationDate: new Date().toISOString()
        },
        quality: {
          overall: 70 + (i * 2),
          sourceAuthority: 70 + (i * 2),
          recency: 85,
          relevance: 75,
          depth: 60,
          accuracy: 75
        },
        metadata: {
          discoveredBy: 'websearch',
          mockData: true
        }
      });
    }
    return results;
  }

  /**
   * Mock GitHub search (simplified)
   * @private
   */
  _mockGitHubSearch(query, count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push({
        id: `github-${Date.now()}-${i}`,
        title: `${query} - GitHub Repository ${i + 1}`,
        content: `Mock GitHub repository for ${query}. Working code example with production usage.`,
        source: {
          url: `https://github.com/example/repo-${i}`,
          type: 'oss',
          authority: 88 + i,
          publicationDate: new Date().toISOString(),
          stars: 1000 + (i * 100)
        },
        quality: {
          overall: 88 + i,
          sourceAuthority: 88 + i,
          recency: 80,
          relevance: 90,
          depth: 85,
          accuracy: 90
        },
        metadata: {
          discoveredBy: 'github',
          mockData: true
        }
      });
    }
    return results;
  }

  /**
   * Mock case study search (simplified)
   * @private
   */
  _mockCaseStudySearch(query, count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push({
        id: `casestudy-${Date.now()}-${i}`,
        title: `${query} - Production Case Study ${i + 1}`,
        content: `Mock case study for ${query}. Real-world production implementation and lessons learned.`,
        source: {
          url: `https://engineering.example.com/casestudy-${i}`,
          type: 'blog',
          authority: 85 + i,
          publicationDate: new Date().toISOString()
        },
        quality: {
          overall: 85 + i,
          sourceAuthority: 85 + i,
          recency: 75,
          relevance: 88,
          depth: 90,
          accuracy: 88
        },
        metadata: {
          discoveredBy: 'casestudy',
          mockData: true
        }
      });
    }
    return results;
  }

  /**
   * Mock expert/official search (simplified)
   * @private
   */
  _mockExpertSearch(query, count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push({
        id: `expert-${Date.now()}-${i}`,
        title: `${query} - Expert Guide ${i + 1}`,
        content: `Mock expert guide for ${query}. Best practices, edge cases, and performance considerations.`,
        source: {
          url: `https://spring.io/guides/expert-${i}`,
          type: 'official',
          authority: 92 + i,
          publicationDate: new Date().toISOString()
        },
        quality: {
          overall: 92 + i,
          sourceAuthority: 92 + i,
          recency: 90,
          relevance: 85,
          depth: 92,
          accuracy: 95
        },
        metadata: {
          discoveredBy: 'expert',
          mockData: true
        }
      });
    }
    return results;
  }

  /**
   * Calculate average quality
   * @private
   */
  _calculateAvgQuality(evidence) {
    if (!evidence || evidence.length === 0) return 0;
    const sum = evidence.reduce((acc, e) => acc + (e.quality?.overall || 0), 0);
    return sum / evidence.length;
  }

  /**
   * Calculate average depth
   * @private
   */
  _calculateAvgDepth(evidence) {
    if (!evidence || evidence.length === 0) return 0;
    const sum = evidence.reduce((acc, e) => acc + (e.quality?.depth || 0), 0);
    return sum / evidence.length;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      tavilyMetrics: this.tavily.getMetrics(),
      avgIterationsToConvergence: this.metrics.convergenceIteration || this.metrics.totalIterations
    };
  }
}

module.exports = DeepResearchEngine;
