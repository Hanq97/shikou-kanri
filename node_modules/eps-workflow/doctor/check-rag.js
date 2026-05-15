'use strict';

// doctor/check-rag.js — Optional RAG Server Health Check
// Reads rag-server.json (or legacy hipporag-config.json); if missing → SKIP (not an error).
// If present: HTTP GET /health with 3s timeout.
// Read-only (NFR-INIT-05): never writes files.

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

/**
 * @typedef {Object} CheckResult
 * @property {string} name     - Check name
 * @property {boolean} ok      - Pass/fail
 * @property {string} message  - Human-readable result detail
 */

/**
 * Parse hipporag-config.json safely.
 * Returns { config, error }.
 * @param {string} configPath
 * @returns {{ config: Object|null, error: string|null }}
 */
function readHipporagConfig(configPath) {
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    return { config: null, error: err.message };
  }

  try {
    const config = JSON.parse(raw);
    return { config, error: null };
  } catch (err) {
    return { config: null, error: `Invalid JSON: ${err.message}` };
  }
}

/**
 * Build the health-check URL from config.
 * Supports: healthUrl, url, baseUrl, or server+port fields.
 * @param {Object} config
 * @returns {string|null}
 */
function buildHealthUrl(config) {
  // Explicit healthUrl
  if (config.healthUrl && typeof config.healthUrl === 'string') {
    return config.healthUrl;
  }

  // url or baseUrl field (e.g. "http://192.168.9.60:8000")
  const base = config.url || config.baseUrl;
  if (base && typeof base === 'string') {
    return base.replace(/\/+$/, '') + '/health';
  }

  // Derive from server host:port
  const server = config.server || config.host;
  if (server && typeof server === 'string') {
    const port = config.port || 8000;
    const protocol = config.tls || config.https ? 'https' : 'http';
    return `${protocol}://${server}:${port}/health`;
  }

  return null;
}

/**
 * Make an HTTP(S) GET request with a timeout.
 * Returns a Promise<{ statusCode, ok, error }>.
 *
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<{ statusCode: number|null, ok: boolean, error: string|null }>}
 */
function httpGet(url, timeoutMs) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      return resolve({ statusCode: null, ok: false, error: `Invalid URL: ${url}` });
    }

    const lib = parsed.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      timeout: timeoutMs
    };

    const req = lib.request(options, (res) => {
      // Drain response body to free socket
      res.resume();
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        resolve({ statusCode: res.statusCode, ok, error: null });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: null, ok: false, error: `Timeout after ${timeoutMs}ms` });
    });

    req.on('error', (err) => {
      resolve({ statusCode: null, ok: false, error: err.message });
    });

    req.end();
  });
}

/**
 * Optional RAG health check.
 *
 * Logic:
 *   1. Look for <projectDir>/.claude/config/rag-server.json (or legacy hipporag-config.json)
 *   2. If missing → SKIP (ok: true, message: 'SKIP: not configured')
 *   3. If present but invalid JSON → FAIL
 *   4. If present and valid → HTTP GET /health with 3s timeout
 *      - 200 OK → PASS
 *      - Non-200 or error → FAIL
 *
 * Read-only — never modifies the filesystem.
 *
 * @param {string} projectDir - Project root
 * @returns {Promise<CheckResult[]>}
 */
async function checkRag(projectDir) {
  const name = 'hipporag';

  if (!projectDir || typeof projectDir !== 'string') {
    return [{ name, ok: false, message: 'INVALID: projectDir must be a non-empty string' }];
  }

  // Try rag-server.json first, fallback to legacy hipporag-config.json
  const ragServerPath = path.join(projectDir, '.claude', 'config', 'rag-server.json');
  const legacyPath = path.join(projectDir, '.claude', 'config', 'hipporag-config.json');
  let configPath = null;
  let configTransform = null;

  if (fs.existsSync(ragServerPath)) {
    configPath = ragServerPath;
    configTransform = (raw) => raw.hipporag || raw;
  } else if (fs.existsSync(legacyPath)) {
    configPath = legacyPath;
  }

  // Step 1: config file missing → SKIP
  if (!configPath) {
    return [{
      name,
      ok: true,
      message: 'SKIP: not configured (rag-server.json not found)'
    }];
  }

  // Step 2: parse config
  let { config, error: parseError } = readHipporagConfig(configPath);
  if (!parseError && configTransform) {
    config = configTransform(config);
  }
  if (parseError) {
    return [{
      name,
      ok: false,
      message: `INVALID CONFIG: ${parseError} in ${configPath}`
    }];
  }

  // Step 3: build health URL
  const healthUrl = buildHealthUrl(config);
  if (!healthUrl) {
    return [{
      name,
      ok: false,
      message: `INVALID CONFIG: cannot derive health URL — add "server" or "baseUrl" to ${configPath}`
    }];
  }

  // Step 4: HTTP GET with 3s timeout
  let httpResult;
  try {
    httpResult = await httpGet(healthUrl, 3000);
  } catch (err) {
    return [{
      name,
      ok: false,
      message: `ERROR: health check threw: ${err.message} (url: ${healthUrl})`
    }];
  }

  if (httpResult.ok) {
    return [{
      name,
      ok: true,
      message: `OK: ${healthUrl} responded ${httpResult.statusCode}`
    }];
  }

  const detail = httpResult.error || `HTTP ${httpResult.statusCode}`;
  return [{
    name,
    ok: false,
    message: `FAIL: ${healthUrl} — ${detail}`
  }];
}

module.exports = { checkRag };
