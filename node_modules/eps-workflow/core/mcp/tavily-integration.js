#!/usr/bin/env node

/**
 * Tavily MCP Integration
 * Tavily MCP統合
 * Tích Hợp Tavily MCP
 *
 * Purpose: Integrate Tavily API for deep web search with academic and official sources
 *
 * Features:
 * - Tavily API authentication and rate limiting
 * - Web search with depth control (basic/advanced)
 * - Source quality assessment (authority scoring)
 * - Domain filtering (include/exclude specific domains)
 * - Result parsing and formatting (convert Tavily format → evidence schema)
 * - Error handling (API failures, rate limits, timeouts)
 *
 * @version 3.8.0
 * @date 2025-12-24
 */

/**
 * Tavily MCP Client
 * Provides deep web search with academic and official source prioritization
 */
class TavilyIntegration {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.TAVILY_API_KEY;
    this.baseURL = options.baseURL || 'https://api.tavily.com/search';

    this.defaultOptions = {
      search_depth: 'basic',  // 'basic' or 'advanced'
      max_results: 5,
      include_images: false,
      include_answer: false
    };

    // Rate limiting
    this.rateLimiter = {
      maxRequestsPerMinute: options.maxRequestsPerMinute || 60,
      requests: [],
      lastReset: Date.now()
    };

    // Domain configuration by research phase
    this.domainSets = {
      RESEARCH_SRS: [
        '*.gov',
        '*.gov.vn',
        'sbv.gov.vn',
        '*.edu',
        'ieeexplore.ieee.org'
      ],
      RESEARCH_BD: [
        'spring.io',
        'reactjs.org',
        'nodejs.org',
        'postgresql.org',
        'microservices.io',
        '*.edu',
        'github.com',
        'netflixtechblog.com',
        'aws.amazon.com',
        'martinfowler.com'
      ],
      RESEARCH_DD: [
        'github.com',
        'spring.io/guides',
        'reactjs.org/docs',
        'stackoverflow.com',
        '*.edu'
      ],
      ACADEMIC: [
        '*.edu',
        'ieee.org',
        'acm.org',
        'arxiv.org',
        'scholar.google.com'
      ],
      OFFICIAL: [
        '*.gov',
        'spring.io',
        'reactjs.org',
        'nodejs.org',
        'postgresql.org'
      ]
    };

    this.excludeDomains = [
      '*.blogspot.com',
      '*.wordpress.com',
      '*.wix.com',
      'pinterest.com',
      'facebook.com',
      'twitter.com'
    ];

    // Mock mode for testing (when API key not available)
    this.mockMode = !this.apiKey || options.mockMode === true;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      totalEvidenceFound: 0,
      avgSearchTime: 0,
      searchTimes: []
    };
  }

  /**
   * Search with Tavily API
   *
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async search(params) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Check rate limit
      await this._checkRateLimit();

      const {
        query,
        search_depth = 'basic',
        include_domains = [],
        exclude_domains = [],
        max_results = 5,
        researchPhase = null
      } = params;

      // Build domain lists
      const finalIncludeDomains = this._buildDomainList(include_domains, researchPhase);
      const finalExcludeDomains = [...this.excludeDomains, ...exclude_domains];

      // Mock mode: Return simulated results
      if (this.mockMode) {
        const mockResults = this._generateMockResults(query, max_results, search_depth);
        this.metrics.successfulRequests++;
        this.metrics.totalEvidenceFound += mockResults.evidence.length;

        const searchTime = Date.now() - startTime;
        this.metrics.searchTimes.push(searchTime);
        this.metrics.avgSearchTime = this._calculateAverage(this.metrics.searchTimes);

        return mockResults;
      }

      // Real API call
      const body = {
        api_key: this.apiKey,
        query: query,
        search_depth: search_depth,
        max_results: max_results,
        include_domains: finalIncludeDomains.length > 0 ? finalIncludeDomains : undefined,
        exclude_domains: finalExcludeDomains.length > 0 ? finalExcludeDomains : undefined,
        ...this.defaultOptions
      };

      const response = await this._makeRequest(body);

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results = this._parseResults(data, query, search_depth);

      this.metrics.successfulRequests++;
      this.metrics.totalEvidenceFound += results.evidence.length;

      const searchTime = Date.now() - startTime;
      this.metrics.searchTimes.push(searchTime);
      this.metrics.avgSearchTime = this._calculateAverage(this.metrics.searchTimes);

      console.log(`  Tavily search completed: ${results.evidence.length} results in ${searchTime}ms`);

      return results;

    } catch (error) {
      this.metrics.failedRequests++;
      console.error(`Tavily search failed:`, error.message);

      // Return empty results on failure
      return {
        query: params.query,
        evidence: [],
        totalResults: 0,
        error: error.message,
        searchDepth: params.search_depth || 'basic'
      };
    }
  }

  /**
   * Make HTTP request to Tavily API
   * @private
   */
  async _makeRequest(body) {
    // Use fetch API (available in Node.js 18+)
    return await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }

  /**
   * Check rate limit before making request
   * @private
   */
  async _checkRateLimit() {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Reset counter if a minute has passed
    if (now - this.rateLimiter.lastReset > oneMinute) {
      this.rateLimiter.requests = [];
      this.rateLimiter.lastReset = now;
    }

    // Remove requests older than 1 minute
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      timestamp => now - timestamp < oneMinute
    );

    // Check if we've hit the limit
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequestsPerMinute) {
      this.metrics.rateLimitedRequests++;

      const oldestRequest = this.rateLimiter.requests[0];
      const waitTime = oneMinute - (now - oldestRequest);

      console.log(`  Rate limit reached, waiting ${waitTime}ms...`);
      await this._sleep(waitTime);

      // Reset after wait
      this.rateLimiter.requests = [];
      this.rateLimiter.lastReset = Date.now();
    }

    // Record this request
    this.rateLimiter.requests.push(now);
  }

  /**
   * Build domain list for search
   * @private
   */
  _buildDomainList(includeDomains, researchPhase) {
    let domains = [...includeDomains];

    // Add phase-specific domains
    if (researchPhase && this.domainSets[researchPhase]) {
      domains = [...domains, ...this.domainSets[researchPhase]];
    }

    // Remove duplicates
    return [...new Set(domains)];
  }

  /**
   * Parse Tavily results into evidence format
   * @private
   */
  _parseResults(data, query, searchDepth) {
    const evidence = (data.results || []).map(result => {
      const source = {
        url: result.url,
        type: this._detectSourceType(result.url),
        authority: Math.round((result.score || 0.5) * 100),
        publicationDate: result.published_date || new Date().toISOString()
      };

      const baseEvidence = {
        id: `tavily-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: result.title || 'Untitled',
        content: result.content || result.snippet || '',
        source: source
      };

      // Calculate quality score (inline)
      baseEvidence.quality = this._calculateQualityScore(baseEvidence, searchDepth);

      // Apply quality boost for academic/official sources
      this._applyQualityBoost(baseEvidence);

      // Add metadata
      baseEvidence.metadata = {
        tavilyScore: result.score || 0.5,
        searchDepth: searchDepth,
        discoveredBy: 'tavily',
        researchPhase: 'RESEARCH',
        createdAt: new Date().toISOString()
      };

      return baseEvidence;
    });

    return {
      query: query,
      evidence: evidence,
      totalResults: evidence.length,
      searchDepth: searchDepth
    };
  }

  /**
   * Detect source type from URL
   * @private
   */
  _detectSourceType(url) {
    if (!url) return 'unknown';

    const urlLower = url.toLowerCase();

    if (urlLower.match(/\.gov|\.gov\.vn/)) return 'official';
    if (urlLower.match(/\.edu|\.edu\.vn/)) return 'academic';
    if (urlLower.match(/ieee\.org|acm\.org|arxiv\.org/)) return 'academic';
    if (urlLower.match(/github\.com|gitlab\.com/)) return 'oss';
    if (urlLower.match(/spring\.io|reactjs\.org|nodejs\.org|postgresql\.org/)) return 'official';
    if (urlLower.match(/stackoverflow\.com/)) return 'community';
    if (urlLower.match(/medium\.com|dev\.to/)) return 'blog';

    return 'blog';
  }

  /**
   * Calculate quality score for evidence
   * @private
   */
  _calculateQualityScore(evidence, searchDepth) {
    const authority = evidence.source.authority || 50;
    const depthScore = searchDepth === 'advanced' ? 85 : 70;

    // Simple quality calculation
    const overall = Math.round((authority * 0.4) + (depthScore * 0.3) + (80 * 0.3));

    return {
      overall: overall,
      sourceAuthority: authority,
      recency: 85, // Assume recent for Tavily results
      relevance: 80,
      depth: depthScore,
      accuracy: 85
    };
  }

  /**
   * Apply quality boost for high-authority sources
   * @private
   */
  _applyQualityBoost(evidence) {
    const url = evidence.source.url.toLowerCase();

    // Academic sources (+10%)
    if (url.match(/\.edu|ieee\.org|acm\.org|arxiv\.org/)) {
      evidence.quality.overall = Math.min(100, evidence.quality.overall + 10);
      evidence.quality.sourceAuthority = Math.min(100, evidence.quality.sourceAuthority + 10);
    }

    // Official documentation (+15%)
    if (url.match(/\.gov|spring\.io|reactjs\.org|nodejs\.org|postgresql\.org/)) {
      evidence.quality.overall = Math.min(100, evidence.quality.overall + 15);
      evidence.quality.sourceAuthority = Math.min(100, evidence.quality.sourceAuthority + 15);
    }
  }

  /**
   * Generate mock results for testing
   * @private
   */
  _generateMockResults(query, maxResults, searchDepth) {
    const mockResults = [];
    const baseQuality = searchDepth === 'advanced' ? 85 : 75;

    for (let i = 0; i < maxResults; i++) {
      const sourceType = i % 3 === 0 ? 'official' : (i % 2 === 0 ? 'academic' : 'blog');
      const domain = sourceType === 'official' ? 'spring.io' :
                     (sourceType === 'academic' ? 'ieee.org' : 'example.com');

      const evidence = {
        id: `tavily-mock-${Date.now()}-${i}`,
        title: `${query} - Result ${i + 1}`,
        content: `Mock content for ${query}. This is result ${i + 1} from ${searchDepth} search.`,
        source: {
          url: `https://${domain}/article-${i}`,
          type: sourceType,
          authority: baseQuality + (i * 2),
          publicationDate: new Date().toISOString()
        },
        quality: {
          overall: baseQuality + (i * 2),
          sourceAuthority: baseQuality + (i * 2),
          recency: 90,
          relevance: 80,
          depth: searchDepth === 'advanced' ? 85 : 70,
          accuracy: 85
        },
        metadata: {
          tavilyScore: (baseQuality + (i * 2)) / 100,
          searchDepth: searchDepth,
          discoveredBy: 'tavily',
          mockData: true,
          createdAt: new Date().toISOString()
        }
      };

      mockResults.push(evidence);
    }

    return {
      query: query,
      evidence: mockResults,
      totalResults: mockResults.length,
      searchDepth: searchDepth,
      mockMode: true
    };
  }

  /**
   * Sleep utility
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate average
   * @private
   */
  _calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((acc, val) => acc + val, 0) / arr.length;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0
        ? Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100)
        : 0,
      rateLimitRate: this.metrics.totalRequests > 0
        ? Math.round((this.metrics.rateLimitedRequests / this.metrics.totalRequests) * 100)
        : 0
    };
  }
}

module.exports = TavilyIntegration;
