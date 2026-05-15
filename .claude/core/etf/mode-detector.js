'use strict';

/**
 * mode-detector.js — Detect test generation mode based on available artifacts.
 *
 * Layer: L5 SKILL
 * Pattern: Strategy [BD D5]
 *
 * Modes:
 *   DD_FIRST  — Detail Design document found → use as primary input
 *   CODE_FIRST — Source code found but no DD → reverse-engineer from code
 *   BLOCKED   — Neither DD nor source found → cannot proceed
 */

const fs = require('fs');
const path = require('path');

class ModeDetector {
  /**
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  /**
   * Detect mode for a module.
   * Enhanced: Query RAG for DD content, return DDMetadata.
   * Fallback: read .md file if RAG returns empty.
   *
   * @param {string} moduleId - Module identifier
   * @param {string|null} [userOverride] - 'dd-first' or 'code-first'
   * @returns {Promise<{ mode: string, ddPath?: string, ddMetadata?: object, dbDesignMetadata?: object, sourcePaths?: string[], error?: string }>}
   */
  async detect(moduleId, userOverride) {
    const schemas = require('./schemas.js');
    let ddMetadata = null;
    let dbDesignMetadata = null;

    // 1. Query RAG for DD content (primary)
    try {
      const ragResponse = await this._queryRAG('DD content for ' + moduleId);
      if (ragResponse && !ragResponse.empty) {
        ddMetadata = schemas.createDDMetadata({
          ...ragResponse,
          moduleId,
          source: 'rag',
        });
      }
    } catch {
      // RAG unavailable — will fallback to file below
    }

    // 2. Find DD file path (existing logic)
    const ddPath = this.findDDDocument(moduleId);

    // 3. Fallback: read .md file if RAG returned empty/null
    if (!ddMetadata && ddPath) {
      try {
        const fileContent = fs.readFileSync(ddPath, 'utf8');
        const parsed = this._parseDDFile(fileContent, moduleId);
        ddMetadata = schemas.createDDMetadata({
          ...parsed,
          moduleId,
          source: 'file',
        });
      } catch {
        // File read failed — ddMetadata stays null
      }
    }

    // 4. Query RAG for DB Design (optional)
    try {
      const dbDesignResponse = await this._queryRAG('DB Design for ' + moduleId);
      if (dbDesignResponse && !dbDesignResponse.empty) {
        dbDesignMetadata = dbDesignResponse;
      }
    } catch {
      // Skip DB Design — optional
    }

    // 5. Resolve source paths (existing)
    const sourcePaths = this.resolveSourcePaths(moduleId);
    const hasDD = ddMetadata !== null;
    const hasSource = sourcePaths.length > 0;

    // 6. User override (preserve existing logic)
    if (userOverride === 'dd-first') {
      if (!hasDD) {
        return { mode: 'BLOCKED', error: 'User requested dd-first but no DD available for ' + moduleId };
      }
      return { mode: 'DD_FIRST', ddPath, ddMetadata, dbDesignMetadata, sourcePaths };
    }
    if (userOverride === 'code-first') {
      if (!hasSource) {
        return { mode: 'BLOCKED', error: 'User requested code-first but no source code found for ' + moduleId };
      }
      return { mode: 'CODE_FIRST', sourcePaths };
    }

    // 7. Auto-detect
    if (hasDD) {
      return { mode: 'DD_FIRST', ddPath, ddMetadata, dbDesignMetadata, sourcePaths };
    }
    if (hasSource) {
      return { mode: 'CODE_FIRST', sourcePaths };
    }
    return { mode: 'BLOCKED', error: 'No DD document or source code found for ' + moduleId };
  }

  /**
   * Query RAG via service interface.
   * @param {string} query - RAG query string
   * @returns {Promise<object|null>} RAG response or null
   */
  async _queryRAG(query) {
    try {
      const ragService = this._getRAGService();
      if (!ragService) return null;
      const result = await ragService.query(query);
      return result;
    } catch {
      return null;
    }
  }

  _getRAGService() {
    if (this._ragService !== undefined) return this._ragService;
    try {
      const HippoRAGService = require(path.join(__dirname, '..', 'rag', 'hipporag-service'));
      let branch = 'main';
      try { branch = require('child_process').execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch {}
      const instance = HippoRAGService.getInstance('_global', branch);
      // Adapter: expose .query() that maps to .getContext()
      // Query layers 'code' and 'db' (available on HippoRAG server)
      this._ragService = {
        query: async (queryStr) => {
          const result = await instance.getContext(queryStr, { name: 'etf-mode-detector' }, { topK: 10, layers: ['docs', 'code', 'db'] });
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
      this._ragService = null;
    }
    return this._ragService;
  }

  /**
   * Parse DD markdown file into structured data (fallback when RAG empty).
   * @param {string} content - Raw markdown content
   * @param {string} moduleId
   * @returns {object} Partial DDMetadata fields
   */
  _parseDDFile(content, moduleId) {
    const sections = content.split(/^## /m).filter(Boolean);
    const entities = [];
    const apiSpecs = [];
    const workflows = [];
    const errorCodes = [];
    const businessRules = [];

    for (const section of sections) {
      const lowerSection = section.toLowerCase();

      // Extract entities from data model sections
      if (lowerSection.includes('データモデル') || lowerSection.includes('data model') || lowerSection.includes('entity')) {
        const tableRows = section.match(/\|[^|]+\|[^|]+\|[^|]+\|/g) || [];
        const nameMatch = section.match(/^([^\n]+)/);
        if (nameMatch && tableRows.length > 2) {
          entities.push({
            name: nameMatch[1].replace(/^[\d.]+\s*/, '').trim(),
            fields: tableRows.slice(2).map(row => {
              const cells = row.split('|').map(c => c.trim()).filter(Boolean);
              return { name: cells[0] || '', type: cells[1] || '', constraints: cells[2] || '' };
            }),
          });
        }
      }

      // Extract API specs
      if (lowerSection.includes('api') || lowerSection.includes('endpoint')) {
        const apiRows = section.match(/\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|[^|]+\|/gi) || [];
        for (const row of apiRows) {
          const cells = row.split('|').map(c => c.trim()).filter(Boolean);
          if (cells.length >= 2) {
            apiSpecs.push({ method: cells[0], path: cells[1], request: null, response: null });
          }
        }
      }

      // Extract error codes
      if (lowerSection.includes('error') || lowerSection.includes('エラー')) {
        const errorRows = section.match(/\|\s*[A-Z_]+\d*\s*\|[^|]+\|/g) || [];
        for (const row of errorRows) {
          const cells = row.split('|').map(c => c.trim()).filter(Boolean);
          if (cells.length >= 2) {
            errorCodes.push({ code: cells[0], message: cells[1], httpStatus: cells[2] || '' });
          }
        }
      }
    }

    return {
      ddType: content.includes('frontend') ? 'frontend' : 'backend',
      sections: sections.map(s => s.substring(0, 200)),
      entities,
      apiSpecs,
      workflows,
      errorCodes,
      businessRules,
    };
  }

  /**
   * Search for DD document by module ID.
   *
   * Search order:
   * 1. documents/features/{feature}/*-detail-design.md
   * 2. documents/features/{feature}/*-backend-detail-design.md
   * 3. documents/Detail_Design/{moduleId}/
   *
   * @param {string} moduleId
   * @returns {string|null} Path to DD document or null
   */
  findDDDocument(moduleId) {
    const root = this.projectRoot;
    const modLower = moduleId.toLowerCase();

    // Search 1: documents/features/
    const featuresDir = path.join(root, 'documents', 'features');
    if (fs.existsSync(featuresDir)) {
      const found = _searchDir(featuresDir, modLower, [
        '-detail-design.md',
        '-backend-detail-design.md',
        '-frontend-detail-design.md',
      ]);
      if (found) return found;
    }

    // Search 2: documents/Detail_Design/
    const ddDir = path.join(root, 'documents', 'Detail_Design', moduleId);
    if (fs.existsSync(ddDir)) {
      const files = fs.readdirSync(ddDir).filter(f => f.endsWith('.md'));
      if (files.length > 0) return path.join(ddDir, files[0]);
    }

    // Search 3: documents/infrastructure/ (for EPS modules)
    const infraDir = path.join(root, 'documents', 'infrastructure');
    if (fs.existsSync(infraDir)) {
      const found = _searchDir(infraDir, modLower, ['-detail-design.md']);
      if (found) return found;
    }

    return null;
  }

  /**
   * Resolve source code paths for a module using project-config.json.
   *
   * @param {string} moduleId
   * @returns {string[]} Resolved source paths that exist
   */
  resolveSourcePaths(moduleId) {
    const config = _loadConfig(this.projectRoot);
    if (!config || !config.sourcePaths) return [];

    const paths = [];
    const allPaths = [
      ...(config.sourcePaths.backend || []),
      ...(config.sourcePaths.frontend || []),
    ];

    for (const basePath of allPaths) {
      const abs = path.resolve(this.projectRoot, basePath);
      if (fs.existsSync(abs)) {
        // Check if module-related files exist under this path
        const hasModuleFiles = _hasFilesMatching(abs, moduleId);
        if (hasModuleFiles) {
          paths.push(abs);
        }
      }
    }

    return paths;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _searchDir(dir, modLower, suffixes) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase().includes(modLower)) {
          // Search inside matching directory
          const subDir = path.join(dir, entry.name);
          const files = fs.readdirSync(subDir);
          for (const suffix of suffixes) {
            const match = files.find(f => f.endsWith(suffix));
            if (match) return path.join(subDir, match);
          }
          // Return first .md file if no suffix match
          const anyMd = files.find(f => f.endsWith('.md') && !f.startsWith('_'));
          if (anyMd) return path.join(subDir, anyMd);
        }
        // Recurse into subdirectories
        const found = _searchDir(path.join(dir, entry.name), modLower, suffixes);
        if (found) return found;
      }
    }
  } catch {
    // Permission error — skip
  }
  return null;
}

function _loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, '.claude', 'config', 'project-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // Normalize: convert sourceRoots[] to sourcePaths{} if needed
      if (!config.sourcePaths && Array.isArray(config.sourceRoots)) {
        config.sourcePaths = _sourceRootsToSourcePaths(config.sourceRoots);
      }
      return config;
    } catch {
      return null;
    }
  }
  return null;
}

function _sourceRootsToSourcePaths(sourceRoots) {
  const result = { backend: [], frontend: [] };
  for (const root of sourceRoots) {
    const type = (root.type || '').toLowerCase();
    if (type === 'backend') {
      result.backend.push(root.path);
    } else if (type === 'frontend') {
      result.frontend.push(root.path);
    }
  }
  return result;
}

function _hasFilesMatching(dir, moduleId) {
  const modLower = moduleId.toLowerCase();
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.toLowerCase().includes(modLower)) return true;
      if (entry.isDirectory() && !['node_modules', '.git', 'build', 'target'].includes(entry.name)) {
        if (_hasFilesMatching(path.join(dir, entry.name), moduleId)) return true;
      }
    }
  } catch {
    // Permission error
  }
  return false;
}

module.exports = { ModeDetector };
