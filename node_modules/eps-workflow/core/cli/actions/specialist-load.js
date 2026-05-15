"use strict";

/**
 * specialist-load — Load specialist .md file content
 * Resolves specialist directory from stack config (via StackResolver)
 * and reads a specific specialist file by name.
 *
 * Args:
 *   --type [document|code]  — specialist category (REQUIRED)
 *   --category <string>     — subfolder (document: srs, basic-design, etc. | code: test-plan, testing, etc.)
 *   --name <string>         — specialist file name without .md (REQUIRED unless --list)
 *   --stack <stackKey>      — override stack (optional)
 *   --variant <variantId>   — override variant (optional)
 *   --list                  — list available specialists for type/category
 *
 * Returns: { name, type, category, content, path, lines }
 */

const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════
// EXECUTE-VALIDATE-FIX: Source-path resolution functions
// ═══════════════════════════════════════════════════════

/**
 * Parse _INDEX.md "Source Path → Specialist Lookup" table (Tier 3)
 * @param {string} indexContent - Raw markdown content of _INDEX.md
 * @returns {Array<{ pattern: string, specialists: Array<{ name: string, patternNumbers: string[] }> }>}
 */
function parseIndexTable(indexContent) {
  const entries = [];
  const lines = indexContent.split('\n');
  let inTable = false;

  for (const line of lines) {
    if (line.includes('Source Path') && line.includes('Specialist')) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith('|---')) continue;
    if (inTable && line.startsWith('|')) {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2) {
        const pattern = cols[0];
        const specParts = cols[1].split(',').map(s => s.trim());
        const specialists = specParts.map(sp => {
          const match = sp.match(/^(.+?)\s*\(([^)]+)\)$/);
          return match
            ? { name: match[1].trim(), patternNumbers: [match[2].trim()] }
            : { name: sp, patternNumbers: [] };
        });
        entries.push({ pattern, specialists });
      }
    } else if (inTable && !line.startsWith('|')) {
      inTable = false;
    }
  }
  return entries;
}

/**
 * Match input source path against _INDEX.md patterns
 * Supports wildcard {moduleCode} and glob * patterns
 * @param {string} sourcePath - e.g. "com.example.app.application.service.customer.CustomerService"
 * @param {Array} indexEntries - parsed from parseIndexTable()
 * @returns {Array<{ name: string, patternNumbers: string[] }>} all matched specialists
 */
function matchSourcePath(sourcePath, indexEntries) {
  const matched = [];
  const normalized = sourcePath.replace(/^com\.\w+\.app\.?/, '.');

  for (const entry of indexEntries) {
    const regexStr = entry.pattern
      .replace(/\./g, '\\.')
      .replace(/\{moduleCode\}/g, '[\\w]+')
      .replace(/\*/g, '.*');
    const regex = new RegExp(regexStr);

    if (regex.test(normalized) || regex.test(sourcePath)) {
      matched.push(...entry.specialists);
    }
  }

  const unique = new Map();
  for (const spec of matched) {
    if (unique.has(spec.name)) {
      const existing = unique.get(spec.name);
      existing.patternNumbers.push(...spec.patternNumbers);
    } else {
      unique.set(spec.name, { ...spec, patternNumbers: [...spec.patternNumbers] });
    }
  }
  return [...unique.values()];
}

/**
 * Parse Architecture Metadata table from specialist .md file (Tier 4)
 * @param {string} content - Raw markdown content of specialist file
 * @returns {{ layer, package, variant, importsFrom, cannotImport, namingConvention, framework, architecture, implementationPatterns } | null}
 */
function parseArchMetadata(content) {
  const metaMatch = content.match(/## Architecture Metadata[\s\S]*?\r?\n\r?\n---/);
  if (!metaMatch) return null;

  const block = metaMatch[0];
  const fields = {};
  const rows = block.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Field'));

  for (const row of rows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      const key = cols[0].toLowerCase().replace(/[\s*]+/g, '');
      const value = cols[1];
      if (key === 'layer') fields.layer = value;
      else if (key === 'package') fields.package = value;
      else if (key === 'variant') fields.variant = value;
      else if (key.includes('importsfrom')) fields.importsFrom = value.split(',').map(s => s.trim());
      else if (key.includes('cannotimport')) fields.cannotImport = value.split(',').map(s => s.trim());
      else if (key.includes('naming')) fields.namingConvention = value;
      // 5-dimension model fields (BD D5)
      else if (key === 'framework') fields.framework = value;
      else if (key === 'architecture') fields.architecture = value;
      else if (key.includes('implementationpatterns')) {
        fields.implementationPatterns = value && value !== 'N/A'
          ? value.split(',').map(s => s.trim()).filter(Boolean)
          : [];
      }
    }
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

/**
 * Check variant compatibility between specialist and project (Gap G2)
 * @param {object} metadata - parsed Architecture Metadata
 * @param {string} projectVariant - from StackResolver (e.g. "reactive", "default")
 * @returns {string|null} warning message if mismatch, null if compatible
 */
function checkVariantCompat(metadata, projectVariant) {
  if (!metadata || !metadata.variant) return null;

  const variantMap = {
    'default': 'Standard (JPA)',
    'standard': 'Standard (JPA)',
    'reactive': 'Reactive (WebFlux)',
  };

  const expected = variantMap[projectVariant];
  if (!expected) return null;

  if (!metadata.variant.includes(expected.split(' ')[0])) {
    return `Specialist variant '${metadata.variant}' does not match project variant '${projectVariant}'`;
  }
  return null;
}

/**
 * Extract target architecture layer from source path
 * @param {string} sourcePath
 * @returns {string|null} "Domain" | "Application" | "Infrastructure" | "Presentation" | null
 */
function extractTargetLayer(sourcePath) {
  if (sourcePath.includes('.domain.')) return 'Domain';
  if (sourcePath.includes('.application.service.') || sourcePath.includes('.application.port.')) return 'Application';
  if (sourcePath.includes('.infrastructure.')) return 'Infrastructure';
  if (sourcePath.includes('.presentation.') || sourcePath.includes('.controller.')) return 'Presentation';
  return null;
}

/**
 * Rank specialists by 3 criteria: variant match (50%), layer specificity (30%), pattern count (20%)
 * @param {Array} specialists - with metadata and patternNumbers
 * @param {string} projectVariant - from StackResolver
 * @param {string|null} targetLayer - from extractTargetLayer
 * @returns {{ specialists: Array, primarySpecialist: string|null }}
 */
function rankSpecialists(specialists, projectVariant, targetLayer) {
  const ranked = specialists.map(spec => {
    let score = 0;
    const reasons = [];

    // Criterion 1: Variant match (50%)
    if (spec.metadata && spec.metadata.variant) {
      const warning = checkVariantCompat(spec.metadata, projectVariant);
      if (!warning) { score += 50; reasons.push('variant:match(50)'); }
      else { reasons.push('variant:mismatch(0)'); }
    } else {
      score += 25; reasons.push('variant:neutral(25)');
    }

    // Criterion 2: Layer specificity (30%)
    if (spec.metadata && spec.metadata.layer && targetLayer) {
      if (spec.metadata.layer === targetLayer) { score += 30; reasons.push('layer:exact(30)'); }
      else { score += 5; reasons.push('layer:different(5)'); }
    } else {
      score += 15; reasons.push('layer:generic(15)');
    }

    // Criterion 3: Pattern count (20%)
    const patternCount = (spec.patternNumbers || []).length;
    const patternScore = Math.min(patternCount * 10, 20);
    score += patternScore;
    reasons.push(`patterns:${patternCount}(${patternScore})`);

    return {
      ...spec,
      rankScore: score,
      rankRole: score >= 70 ? 'primary' : 'supplementary',
      rankReason: reasons.join(' + '),
    };
  });

  ranked.sort((a, b) => b.rankScore - a.rankScore);

  return {
    specialists: ranked,
    primarySpecialist: ranked.find(s => s.rankRole === 'primary')?.name || null,
  };
}

// Export parseArchMetadata for use by stack-resolver.js _scanSpecialists()
module.exports = {
  parseArchMetadata,
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const type = args.type;
    if (!type || !["document", "code"].includes(type)) {
      return { error: "--type must be 'document' or 'code'" };
    }

    // EXECUTE-VALIDATE-FIX: --source-path flow (Tier 3+4 resolution)
    if (args.sourcePath && type === "code") {
      try {
        const { StackResolver } = require(path.join(pkgRoot, "core/state/stack-resolver"));
        const resolver = new StackResolver();
        await resolver.loadStacks();

        const defaults = resolver.getDefaults();
        const stackKey = args.stack || (defaults.primary && defaults.primary.stackKey) || null;
        const variantId = args.variant || (defaults.primary && defaults.primary.variantId) || null;

        if (!stackKey) {
          return { ok: false, error: "No stack key found. Use --stack or set project-config.json" };
        }

        const specialistDirName = resolver.getSpecialistDir(stackKey, variantId);
        const indexPath = path.join(pkgRoot, "specialists/code", specialistDirName, "_INDEX.md");

        if (!fs.existsSync(indexPath)) {
          return { ok: false, error: `_INDEX.md not found at ${indexPath}` };
        }

        const indexContent = fs.readFileSync(indexPath, "utf8");
        const indexEntries = parseIndexTable(indexContent);
        const matchedSpecs = matchSourcePath(args.sourcePath, indexEntries);

        if (matchedSpecs.length === 0) {
          return { ok: true, specialists: [], matchCount: 0, note: "No specialists matched" };
        }

        const specBaseDir = path.join(pkgRoot, "specialists/code", specialistDirName);
        const results = [];

        for (const specRef of matchedSpecs) {
          const specPath = path.join(specBaseDir, `${specRef.name}.md`);
          if (!fs.existsSync(specPath)) continue;

          const content = fs.readFileSync(specPath, "utf8");
          const entry = {
            name: specRef.name, content, path: specPath,
            lines: content.split("\n").length,
            patternNumbers: specRef.patternNumbers,
          };

          if (args.parseMetadata) {
            entry.metadata = parseArchMetadata(content);
          }

          if (args.filterVariant && entry.metadata) {
            entry.variantWarning = checkVariantCompat(entry.metadata, variantId);
          }

          results.push(entry);
        }

        const targetLayer = extractTargetLayer(args.sourcePath);
        const ranked = rankSpecialists(results, variantId, targetLayer);

        return {
          ok: true, type: "code", stackKey, variantId,
          sourcePath: args.sourcePath,
          specialists: ranked.specialists,
          primarySpecialist: ranked.primarySpecialist,
          matchCount: ranked.specialists.length,
        };
      } catch (err) {
        return { ok: false, error: `Source-path resolution failed: ${err.message}` };
      }
    }

    let specDir;
    let stackKey, variantId, specialistDirName;

    if (type === "document") {
      const category = args.category;
      if (!category && !args.list) {
        return { error: "--category is required for document type" };
      }
      specDir = path.join(pkgRoot, "specialists/document", category || "");
    } else {
      // code type — resolve via StackResolver
      try {
        const { StackResolver } = require(path.join(pkgRoot, "core/state/stack-resolver"));
        const resolver = new StackResolver();
        await resolver.loadStacks();

        const defaults = resolver.getDefaults();
        stackKey = args.stack || (defaults.primary && defaults.primary.stackKey) || null;
        variantId = args.variant || (defaults.primary && defaults.primary.variantId) || null;

        if (!stackKey) {
          return { error: "No stack key found. Use --stack or set project-config.json" };
        }

        specialistDirName = resolver.getSpecialistDir(stackKey, variantId);
        specDir = path.join(pkgRoot, "specialists/code", specialistDirName);

        // Append --category subdirectory if provided (e.g., test-plan, testing)
        if (args.category) {
          specDir = path.join(specDir, args.category);
        }

        // For --list mode on code type
        if (args.list) {
          if (args.category) {
            // List files in category subdirectory
            if (!fs.existsSync(specDir)) {
              return { error: `Directory not found: ${specDir}`, type, category: args.category };
            }
            const files = fs.readdirSync(specDir).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
            return {
              type,
              stackKey,
              variantId,
              specialistDir: specialistDirName,
              category: args.category,
              specialists: files.map((f) => f.replace(".md", "")),
              count: files.length,
            };
          }
          // No category: use resolver's top-level specialist list
          const specialists = resolver.getSpecialists(stackKey, variantId);
          return {
            type,
            stackKey,
            variantId,
            specialistDir: specialistDirName,
            specialists,
            count: specialists.length,
          };
        }
      } catch (err) {
        return { error: `StackResolver failed: ${err.message}` };
      }
    }

    // --list mode for document type
    if (args.list) {
      if (!fs.existsSync(specDir)) {
        return { error: `Directory not found: ${specDir}`, type, category: args.category };
      }
      const files = fs.readdirSync(specDir).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
      return {
        type,
        category: args.category,
        specialists: files.map((f) => f.replace(".md", "")),
        count: files.length,
      };
    }

    // --name is required for non-list mode
    const name = args.name;
    if (!name) {
      return { error: "--name is required (specialist file name without .md)" };
    }

    // Read specialist file
    const specPath = path.join(specDir, `${name}.md`);
    if (!fs.existsSync(specPath)) {
      return {
        error: `Specialist not found: ${specPath}`,
        name,
        type,
        category: args.category || specialistDirName,
      };
    }

    const content = fs.readFileSync(specPath, "utf8");

    return {
      name,
      type,
      category: args.category || specialistDirName,
      content,
      path: specPath,
      lines: content.split("\n").length,
    };
  },
};
