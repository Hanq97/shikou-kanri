'use strict';

/**
 * module-discovery.js — RAG-powered module component discovery.
 *
 * Layer: L6 ENGINE
 * Pattern: RAG-first with filesystem fallback [E-BD-04, E-BD-15]
 *
 * Discovers controllers, services, repositories, entities, DTOs,
 * and frontend components for a given module ID.
 */

const fs = require('fs');
const path = require('path');

class ModuleDiscovery {
  /**
   * @param {string} pkgRoot - Package root directory
   * @param {object|null} ragService - RAG service instance (null = filesystem only)
   */
  constructor(pkgRoot, ragService) {
    this.pkgRoot = pkgRoot;
    this.ragService = ragService;
  }

  /**
   * Discover module components. RAG first, filesystem fallback.
   *
   * @param {string} moduleId - Module identifier (e.g., 'CST', 'SFA', 'cmn001000')
   * @returns {Promise<{controllers: string[], services: string[], repositories: string[], entities: string[], dtos: string[], frontendComponents: string[]}>}
   */
  async discover(moduleId) {
    if (this.ragService) {
      try {
        const result = await this.discoverFromRAG(moduleId);
        if (_hasComponents(result)) return result;
      } catch {
        // RAG unavailable, fall through to filesystem
      }
    }

    return this.discoverFromFilesystem(moduleId, this.pkgRoot);
  }

  /**
   * Discover via RAG query on 'code' layer.
   *
   * @param {string} moduleId
   * @returns {Promise<object>}
   */
  async discoverFromRAG(moduleId) {
    if (!this.ragService) return _emptyResult();

    const query = moduleId + ' controller service repository entity';
    const chunks = await this.ragService.query(query, { layer: 'code', topK: 20 });

    const result = _emptyResult();

    for (const chunk of (chunks || [])) {
      const filePath = chunk.metadata && chunk.metadata.filePath;
      if (!filePath) continue;

      if (_isController(filePath)) result.controllers.push(filePath);
      else if (_isService(filePath)) result.services.push(filePath);
      else if (_isRepository(filePath)) result.repositories.push(filePath);
      else if (_isEntity(filePath)) result.entities.push(filePath);
      else if (_isDTO(filePath)) result.dtos.push(filePath);
      else if (_isFrontend(filePath)) result.frontendComponents.push(filePath);
    }

    return result;
  }

  /**
   * Discover via filesystem scan using project-config.json source paths.
   *
   * @param {string} moduleId
   * @param {string} projectRoot
   * @returns {object}
   */
  discoverFromFilesystem(moduleId, projectRoot) {
    const result = _emptyResult();

    // Load project-config for source paths
    const config = _loadProjectConfig(projectRoot);
    const sourcePaths = config && config.sourcePaths;

    if (!sourcePaths) return result;

    // Scan backend paths
    const bePaths = sourcePaths.backend || [];
    for (const basePath of bePaths) {
      const absBase = path.resolve(projectRoot, basePath);
      if (!fs.existsSync(absBase)) continue;

      const files = _walkDir(absBase).filter(f =>
        f.endsWith('.java') && _matchesModule(f, moduleId)
      );

      for (const file of files) {
        if (_isController(file)) result.controllers.push(file);
        else if (_isService(file)) result.services.push(file);
        else if (_isRepository(file)) result.repositories.push(file);
        else if (_isEntity(file) || _isEntityByContent(file)) result.entities.push(file);
        else if (_isDTO(file)) result.dtos.push(file);
      }
    }

    // Scan frontend paths
    const fePaths = sourcePaths.frontend || [];
    for (const basePath of fePaths) {
      const absBase = path.resolve(projectRoot, basePath);
      if (!fs.existsSync(absBase)) continue;

      const files = _walkDir(absBase).filter(f =>
        (f.endsWith('.tsx') || f.endsWith('.ts')) && _matchesModule(f, moduleId)
      );

      for (const file of files) {
        result.frontendComponents.push(file);
      }
    }

    return result;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _emptyResult() {
  return {
    controllers: [],
    services: [],
    repositories: [],
    entities: [],
    dtos: [],
    frontendComponents: [],
  };
}

function _hasComponents(result) {
  return (
    result.controllers.length > 0 ||
    result.services.length > 0 ||
    result.repositories.length > 0 ||
    result.entities.length > 0
  );
}

function _isController(filePath) {
  return /Controller\b/.test(filePath) || /Resource\b/.test(filePath);
}

function _isService(filePath) {
  return /Service\b/.test(filePath) && !/ServiceTest/.test(filePath);
}

function _isRepository(filePath) {
  return /Repository\b/.test(filePath);
}

function _isEntity(filePath) {
  return /\/domain\//.test(filePath) || /\/entity\//.test(filePath) || /Entity\b/.test(filePath);
}

function _isEntityByContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return /@Entity\b/.test(content) || /@Table\b/.test(content);
  } catch {
    return false;
  }
}

function _isDTO(filePath) {
  return /DTO\b/.test(filePath) || /Dto\b/.test(filePath) || /\/dto\//.test(filePath);
}

function _isFrontend(filePath) {
  return filePath.endsWith('.tsx') || filePath.endsWith('.ts');
}

function _matchesModule(filePath, moduleId) {
  // Normalize: moduleId can be uppercase code (CST) or folder pattern (cmn001000)
  const lower = filePath.toLowerCase();
  const modLower = moduleId.toLowerCase();

  // Direct folder match
  if (lower.includes('/' + modLower + '/') || lower.includes('/' + modLower)) return true;

  // Domain prefix match (e.g., 'CST' matches CmnMCustomer via module mapping)
  // Simple heuristic: any file in project matches if containing module keyword
  if (lower.includes(modLower)) return true;

  return false;
}

function _loadProjectConfig(projectRoot) {
  const configPaths = [
    path.join(projectRoot, '.claude', 'config', 'project-config.json'),
    path.join(projectRoot, 'project-config.json'),
  ];

  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      try {
        const config = JSON.parse(fs.readFileSync(p, 'utf8'));
        // Normalize: convert sourceRoots[] to sourcePaths{} if needed
        if (!config.sourcePaths && Array.isArray(config.sourceRoots)) {
          config.sourcePaths = _sourceRootsToSourcePaths(config.sourceRoots);
        }
        return config;
      } catch {
        continue;
      }
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

function _walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip common non-source directories
        if (['node_modules', '.git', 'build', 'target', 'dist'].includes(entry.name)) continue;
        results.push(..._walkDir(fullPath));
      } else {
        results.push(fullPath);
      }
    }
  } catch {
    // Permission error or similar — skip
  }

  return results;
}

module.exports = { ModuleDiscovery };
