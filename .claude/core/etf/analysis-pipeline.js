'use strict';

/**
 * analysis-pipeline.js — 6-step sequential code analysis pipeline.
 *
 * Layer: L6 ENGINE
 * Pattern: Pipeline — sequential chain [BD Pattern 2]
 *
 * Steps: discover → extractAPI → extractModel → extractRules → buildDeps → score
 * Write-on-Complete: scan-result.json + raw/ intermediates
 * Graceful degradation: RAG/Claude/Gemini unavailable → MINIMAL mode
 */

const fs = require('fs');
const path = require('path');

const STEPS = ['queryDD', 'discover', 'extractAPI', 'extractModel', 'extractRules', 'buildDeps', 'score'];

class AnalysisPipeline {
  /**
   * @param {string} moduleId - Module identifier (e.g., 'CST', 'SFA')
   * @param {object} [options]
   * @param {string} [options.pkgRoot] - Package root directory
   * @param {boolean} [options.ragEnabled] - Enable RAG discovery
   * @param {boolean} [options.claudeEnabled] - Enable Claude analysis
   * @param {boolean} [options.geminiEnabled] - Enable Gemini edge cases
   * @param {string} [options.cacheDir] - Cache directory path
   */
  constructor(moduleId, options) {
    options = options || {};
    this.moduleId = moduleId;
    this.pkgRoot = options.pkgRoot || process.cwd();
    this.ragEnabled = options.ragEnabled || false;
    this.claudeEnabled = options.claudeEnabled || false;
    this.geminiEnabled = options.geminiEnabled || false;
    this.cacheDir = options.cacheDir || path.join(this.pkgRoot, '.claude', 'cache', 'etf', moduleId);
    this.rawDir = path.join(this.cacheDir, 'raw');

    // DD enhancement options (from mode-detector)
    this.ddMetadata = options.ddMetadata || null;
    this.dbDesignMetadata = options.dbDesignMetadata || null;
    this.dbEnabled = options.dbEnabled || false;
    this.dbConfig = options.dbConfig || null;

    this._discovery = null;
    this._extractor = null;
    this._dbReader = null;
  }

  /**
   * Run full 6-step pipeline.
   * Each step writes intermediate results to raw/ for resume capability.
   *
   * @returns {object} ScanResult (from schemas.js)
   */
  async analyze() {
    return this.resumeFrom(STEPS[0]);
  }

  /**
   * Resume pipeline from a specific step.
   *
   * @param {string} stepName - Step to resume from
   * @returns {object} ScanResult
   */
  async resumeFrom(stepName) {
    const startIdx = STEPS.indexOf(stepName);
    if (startIdx === -1) {
      throw new Error('Unknown step: ' + stepName + '. Valid: ' + STEPS.join(', '));
    }

    // Ensure directories exist
    if (!fs.existsSync(this.rawDir)) {
      fs.mkdirSync(this.rawDir, { recursive: true });
    }

    // Load lazy dependencies
    this._loadDependencies();

    // Pipeline state accumulator
    let state = this._loadIntermediates(startIdx);

    // Execute steps sequentially
    for (let i = startIdx; i < STEPS.length; i++) {
      const step = STEPS[i];
      try {
        state = await this._executeStep(step, state);
        this._saveIntermediate(step, state);
      } catch (err) {
        // Save partial state for resume
        this._saveIntermediate(step + '_error', { error: err.message, state });
        throw new Error('Pipeline failed at step "' + step + '": ' + err.message);
      }
    }

    // Build final ScanResult (matches SP-1 schema)
    const schemas = require('./schemas.js');
    const scanResult = schemas.createScanResult({
      moduleId: this.moduleId,
      mode: state.ddMetadata ? 'DD_FIRST' : 'CODE_FIRST',
      apiContracts: state.apiContracts || [],
      entities: state.entities || [],
      businessRules: state.businessRules || [],
      dependencies: state.dependencies || [],
      ragChunksUsed: state.ragChunksUsed || 0,
      qualityLevel: this._determineTier(state),
      ddMetadata: state.ddMetadata || null,
      dbDesignMetadata: state.dbDesignMetadata || null,
      dbSchemaMetadata: state.dbSchemaMetadata || null,
      crossValidation: state.crossValidation || null,
      ragCrossRef: state.ragCrossRef || null,
      ragQuality: state.ragQuality || 0,
    });

    // Write enriched result with pipeline metadata
    const enriched = Object.assign({}, scanResult, {
      components: state.components || {},
      confidenceScore: state.confidenceScore || 0,
      ragQuality: state.ragQuality || 0,
    });

    // Write-on-Complete
    this._writeFinalResult(enriched);

    return enriched;
  }

  // ── Step Implementations ────────────────────────────────────────────────

  async _executeStep(step, state) {
    switch (step) {
      case 'queryDD':
        return this._stepQueryDD(state);
      case 'discover':
        return this._stepDiscover(state);
      case 'extractAPI':
        return this._stepExtractAPI(state);
      case 'extractModel':
        return this._stepExtractModel(state);
      case 'extractRules':
        return this._stepExtractRules(state);
      case 'buildDeps':
        return this._stepBuildDeps(state);
      case 'score':
        return this._stepScore(state);
      default:
        throw new Error('Unimplemented step: ' + step);
    }
  }

  /**
   * Step 0: Query DD data (from mode-detector or RAG).
   * Optionally enrich with DB schema.
   */
  async _stepQueryDD(state) {
    // 1. Use ddMetadata from options (passed by mode-detector) or query RAG
    if (this.ddMetadata) {
      state.ddMetadata = this.ddMetadata;
      state.dbDesignMetadata = this.dbDesignMetadata;
    } else if (this.ragEnabled) {
      try {
        const hippoService = this._getHippoRAGService();
        if (hippoService) {
          const graphResult = await hippoService.queryDDEntities(this.moduleId);
          if (graphResult.graphNodeCount > 0) {
            const schemas = require('./schemas.js');
            state.ddMetadata = schemas.createDDMetadata({
              moduleId: this.moduleId,
              entities: graphResult.entities,
              apiSpecs: graphResult.apiSpecs,
              workflows: graphResult.workflows,
              errorCodes: graphResult.errorCodes,
              businessRules: graphResult.businessRules,
              source: graphResult.source === 'error' ? 'file' : 'rag',
            });
            state.ragChunksUsed = graphResult.graphNodeCount;
          }
          // DB Design query (still uses adapter for chunk-based retrieval)
          const ragService = this._createRAGService();
          if (ragService) {
            const dbDesignResponse = await ragService.query('DB Design for ' + this.moduleId);
            if (dbDesignResponse && !dbDesignResponse.empty) {
              state.dbDesignMetadata = dbDesignResponse;
            }
          }
        }
      } catch {
        // RAG unavailable — continue without DD
      }
    }

    // 2. Optional: DB Schema enrichment
    if (this.dbEnabled && state.ddMetadata) {
      try {
        const reader = this._getDBSchemaReader();
        state.dbSchemaMetadata = await reader.readSchema(this.moduleId);
        state.crossValidation = reader.crossValidate(state.ddMetadata, state.dbSchemaMetadata);
      } catch {
        state.dbSchemaMetadata = null;
        state.crossValidation = null;
      }
    }

    // 3. RAG cross-reference (code <-> DD traceability)
    if (this.ragEnabled && state.ddMetadata) {
      try {
        const ragService = this._createRAGService();
        if (ragService) {
          state.ragCrossRef = await ragService.query('impact analysis code for ' + this.moduleId);
        }
      } catch {
        state.ragCrossRef = null;
      }
    }

    return state;
  }

  async _stepDiscover(state) {
    const discovery = this._getDiscovery();
    const components = await discovery.discover(this.moduleId);
    return { ...state, components };
  }

  async _stepExtractAPI(state) {
    const extractor = this._getExtractor();
    const controllerPaths = (state.components && state.components.controllers) || [];
    const apiContracts = await extractor.extractApiContracts(controllerPaths);
    return { ...state, apiContracts };
  }

  async _stepExtractModel(state) {
    const extractor = this._getExtractor();
    const entityPaths = (state.components && state.components.entities) || [];
    const entities = await extractor.extractDataModel(entityPaths);
    return { ...state, entities };
  }

  async _stepExtractRules(state) {
    const extractor = this._getExtractor();
    const servicePaths = (state.components && state.components.services) || [];
    const businessRules = await extractor.extractBusinessRules(servicePaths, {
      claudeEnabled: this.claudeEnabled,
      geminiEnabled: this.geminiEnabled,
    });
    return { ...state, businessRules };
  }

  async _stepBuildDeps(state) {
    const extractor = this._getExtractor();
    const components = state.components || {};
    const allPaths = [
      ...(components.controllers || []),
      ...(components.services || []),
      ...(components.repositories || []),
    ];
    const dependencies = await extractor.buildDependencyGraph(allPaths);
    return { ...state, dependencies };
  }

  _calculateRAGQuality(state) {
    if (!state.ddMetadata) return 0;
    const dd = state.ddMetadata;
    const entityCount =
      (dd.entities || []).length +
      (dd.apiSpecs || []).length +
      (dd.businessRules || []).length +
      (dd.workflows || []).length;
    const entityScore = Math.min(1, entityCount / 10);
    const chunksUsed = state.ragChunksUsed || 0;
    const chunkScore = Math.min(1, chunksUsed / 5);
    const source = dd.source || '';
    const sourceScore = source === 'rag' ? 1.0 : source === 'file' ? 0.7 : 0;
    return Math.round((entityScore * 0.4 + chunkScore * 0.3 + sourceScore * 0.3) * 100) / 100;
  }

  async _stepScore(state) {
    const ragQuality = this._calculateRAGQuality(state);
    const apiCount = (state.apiContracts || []).length;
    const entityCount = (state.entities || []).length;
    const ruleCount = (state.businessRules || []).length;
    const depCount = (state.dependencies || []).length;
    const extracted = (state.businessRules || []).filter(r => r.source === 'EXTRACTED').length;
    const extractionRatio = ruleCount > 0 ? extracted / ruleCount : 0.5;

    const confidenceScore = Math.round(
      (Math.min(1, apiCount / 5) * 0.20 +
       Math.min(1, entityCount / 3) * 0.20 +
       extractionRatio * 0.25 +
       Math.min(1, depCount / 5) * 0.15 +
       ragQuality * 0.20) * 100
    ) / 100;

    return { ...state, confidenceScore, ragQuality };
  }

  // ── Intermediate Storage ────────────────────────────────────────────────

  _loadIntermediates(startIdx) {
    let state = {};

    // Load intermediates from completed steps before startIdx
    for (let i = 0; i < startIdx; i++) {
      const file = path.join(this.rawDir, STEPS[i] + '.json');
      if (fs.existsSync(file)) {
        const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
        state = { ...state, ...loaded };
      }
    }

    return state;
  }

  _saveIntermediate(stepName, state) {
    const file = path.join(this.rawDir, stepName + '.json');
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  }

  _writeFinalResult(scanResult) {
    const file = path.join(this.cacheDir, 'scan-result.json');
    fs.writeFileSync(file, JSON.stringify(scanResult, null, 2));
  }

  // ── Lazy Dependency Loading ─────────────────────────────────────────────

  _loadDependencies() {
    // Dependencies loaded lazily on first use via getters
  }

  _getDiscovery() {
    if (!this._discovery) {
      const { ModuleDiscovery } = require('./module-discovery.js');
      this._discovery = new ModuleDiscovery(this.pkgRoot, this.ragEnabled ? this._createRAGService() : null);
    }
    return this._discovery;
  }

  _getExtractor() {
    if (!this._extractor) {
      const { ASTExtractor } = require('./ast-extractor.js');
      this._extractor = new ASTExtractor(this.pkgRoot);
    }
    return this._extractor;
  }

  _getDBSchemaReader() {
    if (!this._dbReader) {
      const { DBSchemaReader } = require('./db-schema-reader.js');
      this._dbReader = new DBSchemaReader(this.dbConfig);
    }
    return this._dbReader;
  }

  /**
   * Determine quality tier based on available data.
   */
  _determineTier(state) {
    const hasRAG = !!(state.ddMetadata && state.ddMetadata.source === 'rag');
    const hasDD = !!state.ddMetadata;

    if (hasRAG) return 'FULL';
    if (hasDD) return 'DEGRADED';
    return 'MINIMAL';
  }

  _getHippoRAGService() {
    try {
      const HippoRAGService = require(path.join(__dirname, '..', 'rag', 'hipporag-service'));
      let branch = 'main';
      try { branch = require('child_process').execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch {}
      return HippoRAGService.getInstance(this.moduleId, branch);
    } catch {
      return null;
    }
  }

  _createRAGService() {
    try {
      const HippoRAGService = require(path.join(__dirname, '..', 'rag', 'hipporag-service'));
      let branch = 'main';
      try { branch = require('child_process').execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch {}
      const instance = HippoRAGService.getInstance(this.moduleId, branch);
      // Adapter: expose .query() that maps to .getContext()
      // Query layers 'code' and 'db' (available on HippoRAG server)
      return {
        query: async (queryStr) => {
          const result = await instance.getContext(queryStr, { name: 'etf-scan' }, { topK: 10, layers: ['docs', 'code', 'db'] });
          if (!result.chunks || result.chunks.length === 0) return { empty: true };
          return {
            empty: false,
            chunks: result.chunks,
            graph: result.graph,
            mode: result.mode,
          };
        },
      };
    } catch {
      return null;
    }
  }
}

module.exports = { AnalysisPipeline, STEPS };
