#!/usr/bin/env node

/**
 * Sub-Feature Manager - Auto-detect and create sub-feature structure
 *
 * Purpose:
 * - Read research findings from memory-bank/sessions
 * - Extract sub-feature definitions automatically
 * - Create folder structure for all sub-features
 * - Generate sub-feature registry for tracking
 *
 * Usage:
 *   node .claude/utils/subfeature-manager.js detect
 *   node .claude/utils/subfeature-manager.js create
 *   node .claude/utils/subfeature-manager.js list
 */

const fs = require('fs');
const path = require('path');
const { ConventionManager } = require('../lib/convention-manager');
const { SmartCodeGenerator } = require('../lib/code-generator');
const { FeatureLookup } = require('../lib/abbreviation-dict');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const featureLookup = new FeatureLookup();

/**
 * Get current git branch
 */
function getCurrentBranch() {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_ROOT })
      .toString()
      .trim();
  } catch (error) {
    return 'master';
  }
}

/**
 * Parse research session to extract sub-features
 */
function detectSubFeatures(featureName) {
  const branch = getCurrentBranch();
  console.log(`📍 Feature: ${featureName}`);
  console.log(`🌿 Branch: ${branch}`);

  // Try current branch first
  let sessionPath = path.join(PROJECT_ROOT, `.claude/memory-bank/${branch}/sessions`);

  if (!fs.existsSync(sessionPath)) {
    // Fallback to master
    console.log(`⚠️  Branch "${branch}" has no sessions, trying master...`);
    sessionPath = path.join(PROJECT_ROOT, '.claude/memory-bank/master/sessions');

    if (!fs.existsSync(sessionPath)) {
      console.error(`❌ No sessions directory found`);
      return null;
    }
  }

  console.log(`📂 Session path: ${sessionPath}`);

  // Find most recent session file for this feature
  // Pattern: YYYYMMDD-<feature>-subfeatures-research.md
  const featureLower = featureName.toLowerCase();
  const sessionFiles = fs.readdirSync(sessionPath)
    .filter(f => {
      // Must contain 'subfeatures-research'
      if (!f.includes('subfeatures-research')) return false;

      // Must start with date pattern and contain feature name
      // Examples: 20251118-aut-subfeatures-research.md, 20251118-admin-subfeatures-research.md
      const pattern = new RegExp(`^\\d{8}-${featureLower}-subfeatures-research\\.md$`, 'i');
      return pattern.test(f);
    })
    .sort()
    .reverse();

  if (sessionFiles.length === 0) {
    console.error(`❌ No research session found for feature: "${featureName}"`);
    const availableFiles = fs.readdirSync(sessionPath);
    console.error(`   Available files in ${sessionPath}:`);
    availableFiles.slice(0, 5).forEach(f => console.error(`   - ${f}`));
    if (availableFiles.length > 5) {
      console.error(`   ... and ${availableFiles.length - 5} more files`);
    }
    return null;
  }

  console.log(`✅ Found session: ${sessionFiles[0]}`);
  const sessionFile = path.join(sessionPath, sessionFiles[0]);
  const content = fs.readFileSync(sessionFile, 'utf-8');

  // Extract sub-features from research findings
  const subFeatures = [];

  // Pattern 1: Full metadata table
  // | **AUT-LGIN** | Login/Logout & Token Management | High | MUST HAVE | 800 | Yes |
  const fullTableRegex = /\|\s*\*\*([A-Z]{3,4}-[A-Z]{3,4})\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*(\d+)\s*\|\s*([^|]+)\|/g;
  let match;

  while ((match = fullTableRegex.exec(content)) !== null) {
    const code = match[1].trim();
    const name = match[2].trim();
    const complexity = match[3].trim();
    const priority = match[4].trim();
    const locEstimate = parseInt(match[5].trim());
    const critical = match[6].trim();

    const [featureCode, subCode] = code.split('-');

    if (!subFeatures.find(sf => sf.code === code)) {
      subFeatures.push({
        code: code,
        featureCode: featureCode,
        subCode: subCode,
        name: name,
        complexity: complexity,
        priority: priority,
        locEstimate: locEstimate,
        critical: critical,
        description: extractDescription(content, code),
        functionalRequirements: extractFRs(content, code),
        dependencies: extractDependencies(content, code)
      });
    }
  }

  // Pattern 2: Simple table format (fallback if no metadata)
  const simpleTableRegex = /\|?\s*\*\*([A-Z]{3,4}-[A-Z]{3,4})\*\*\s*\|\s*([^|]+)\|/g;
  let match2;

  while ((match2 = simpleTableRegex.exec(content)) !== null) {
    const code = match2[1].trim();
    const name = match2[2].trim();
    const [featureCode, subCode] = code.split('-');

    if (!subFeatures.find(sf => sf.code === code)) {
      subFeatures.push({
        code: code,
        featureCode: featureCode,
        subCode: subCode,
        name: name,
        complexity: 'Medium',
        priority: 'SHOULD HAVE',
        locEstimate: 500,
        critical: 'No',
        description: extractDescription(content, code),
        functionalRequirements: extractFRs(content, code),
        dependencies: extractDependencies(content, code)
      });
    }
  }

  // Pattern 2: Markdown headers (#### 1. AUT-LGIN (...))
  const headerRegex = /####\s+\d+\.\s+([A-Z]{3,4}-[A-Z]{3,4})\s+\(([^)]+)\)/g;

  while ((match = headerRegex.exec(content)) !== null) {
    const code = match[1].trim();
    const name = match[2].trim();
    const [featureCode, subCode] = code.split('-');

    if (!subFeatures.find(sf => sf.code === code)) {
      subFeatures.push({
        code: code,
        featureCode: featureCode,
        subCode: subCode,
        name: name,
        description: extractDescription(content, code)
      });
    }
  }

  // Pattern 3: File structure (├── AUT-LGIN-srs.md (Name))
  const fileRegex = /├──\s+([A-Z]{3,4}-[A-Z]{3,4})-[a-z-]+\.md\s+\(([^)]+)\)/g;

  while ((match = fileRegex.exec(content)) !== null) {
    const code = match[1].trim();
    const name = match[2].trim();
    const [featureCode, subCode] = code.split('-');

    if (!subFeatures.find(sf => sf.code === code)) {
      subFeatures.push({
        code: code,
        featureCode: featureCode,
        subCode: subCode,
        name: name,
        description: extractDescription(content, code)
      });
    }
  }

  const detectedFeatureCode = subFeatures.length > 0
    ? subFeatures[0].featureCode
    : featureName.toUpperCase().substring(0, 3);

  return {
    feature: detectedFeatureCode,
    subFeatures: subFeatures,
    sessionFile: sessionFiles[0],
    detectedAt: new Date().toISOString()
  };
}

/**
 * Extract description for a sub-feature from content
 */
function extractDescription(content, code) {
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedCode}[^\\n]*\\n\\*\\*Scope:\\*\\*\\s*\\n([^\\n]+(?:\\n-[^\\n]+)*)`, 'i');
  const match = content.match(pattern);

  if (match) {
    return match[1].trim().replace(/^- /, '').split('\n-')[0].trim();
  }

  return '';
}

/**
 * Extract functional requirements for a sub-feature
 */
function extractFRs(content, code) {
  const frs = [];
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Pattern: **Functional Requirements:**
  // - FR-001: ...
  // - FR-002: ...
  const frSectionPattern = new RegExp(
    `${escapedCode}[\\s\\S]*?\\*\\*Functional Requirements:\\*\\*[\\s\\S]*?(?:(?:\\n-\\s*FR-\\d+:[^\\n]+)+)`,
    'i'
  );

  const sectionMatch = content.match(frSectionPattern);
  if (sectionMatch) {
    const frPattern = /FR-(\d+):\s*([^\n]+)/g;
    let frMatch;

    while ((frMatch = frPattern.exec(sectionMatch[0])) !== null) {
      frs.push({
        id: `FR-${frMatch[1]}`,
        description: frMatch[2].trim()
      });
    }
  }

  return frs;
}

/**
 * Extract dependencies for a sub-feature
 */
function extractDependencies(content, code) {
  const dependencies = [];
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Pattern 1: Dependencies section
  // **Dependencies:**
  // - AUT-LGIN (authentication required)
  // - AUT-SESS (session management)
  const depSectionPattern = new RegExp(
    `${escapedCode}[\\s\\S]*?\\*\\*Dependencies:\\*\\*[\\s\\S]*?(?:(?:\\n-\\s*[A-Z]{3,4}-[A-Z]{3,4}[^\\n]*)+)`,
    'i'
  );

  const sectionMatch = content.match(depSectionPattern);
  if (sectionMatch) {
    const depPattern = /([A-Z]{3,4}-[A-Z]{3,4})(?:\s*\(([^)]+)\))?/g;
    let depMatch;

    while ((depMatch = depPattern.exec(sectionMatch[0])) !== null) {
      const depCode = depMatch[1];
      if (depCode !== code) { // Don't include self-dependency
        dependencies.push({
          code: depCode,
          reason: depMatch[2] ? depMatch[2].trim() : ''
        });
      }
    }
  }

  // Pattern 2: Inline dependencies in table
  // | Dependencies | AUT-LGIN, AUT-SESS |
  const inlinePattern = new RegExp(
    `${escapedCode}[\\s\\S]{0,200}\\|[^|]*Dependencies[^|]*\\|\\s*([^|]+)\\|`,
    'i'
  );

  const inlineMatch = content.match(inlinePattern);
  if (inlineMatch && dependencies.length === 0) {
    const depCodes = inlineMatch[1].split(/[,;]/).map(d => d.trim());
    depCodes.forEach(depCode => {
      const codeMatch = depCode.match(/([A-Z]{3,4}-[A-Z]{3,4})/);
      if (codeMatch && codeMatch[1] !== code) {
        dependencies.push({
          code: codeMatch[1],
          reason: ''
        });
      }
    });
  }

  return dependencies;
}

/**
 * Generate convention codes for sub-features from function list names
 *
 * Called during /innovate Step 5.5 when function list is finalized.
 * Converts plain function names (e.g., "Login/Logout", "Session Management")
 * into convention codes (e.g., "LGIN", "SESS") using SmartCodeGenerator.
 *
 * @param {string} featureName - Main feature name (e.g., "authentication", "lending")
 * @param {Array} functionList - Array of {name, description, priority, complexity}
 * @returns {Object} detection-compatible object with generated codes
 */
function generateSubFeatureCodes(featureName, functionList) {
  const conventionManager = new ConventionManager();
  const codeGenerator = new SmartCodeGenerator();

  // Generate main feature code
  const existingCodes = conventionManager.loadFeatureCodes();
  const featureCode = conventionManager.generateFeatureCode(featureName, existingCodes);

  console.log(`📋 Generating convention codes for: ${featureName} → ${featureCode}`);

  const subFeatures = [];

  for (const func of functionList) {
    // Normalize function name to hyphenated format
    // "Login/Logout & Token Management" → "login-logout"
    // "Session Management" → "session-management"
    // "Multi-Factor Authentication" → "multi-factor-authentication"
    const normalized = func.name
      .split(/[/&,]+/)[0]  // Take first part before separators
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    // Generate sub-feature code using SmartCodeGenerator
    const subCode = codeGenerator.generateSubFeatureCode(
      normalized,
      featureCode,
      existingCodes
    );

    const fullCode = `${featureCode}-${subCode}`;

    // Track generated code to avoid conflicts in same batch
    if (!existingCodes[featureCode]) {
      existingCodes[featureCode] = { name: featureName };
    }
    existingCodes[featureCode][subCode] = { name: normalized };

    subFeatures.push({
      code: fullCode,
      featureCode: featureCode,
      subCode: subCode,
      name: func.name,
      description: func.description || '',
      complexity: func.complexity || 'Medium',
      priority: func.priority || 'SHOULD HAVE',
      locEstimate: func.locEstimate || 500,
      critical: func.critical || 'No',
      functionalRequirements: func.functionalRequirements || [],
      dependencies: func.dependencies || []
    });

    console.log(`  ├─ ${fullCode}: ${func.name}`);
  }

  // Register all generated codes in feature-codes.json
  conventionManager.register({
    feature_code: featureCode,
    feature_name: featureName
  });

  for (const sf of subFeatures) {
    conventionManager.register({
      feature_code: featureCode,
      feature_name: featureName,
      sub_feature_code: sf.subCode,
      sub_feature_name: sf.name,
      algorithm: 'smart-abbrev'
    });
  }

  console.log(`\n✅ Generated ${subFeatures.length} convention codes for ${featureCode}`);
  console.log(`📁 Feature directory: ${featureCode}-${featureName}`);

  return {
    feature: featureCode,
    featureName: featureName,
    featureDir: `${featureCode}-${featureName}`,
    subFeatures: subFeatures,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Create folder structure for sub-features
 */
function createFolderStructure(detection) {
  const { feature, subFeatures } = detection;

  // Determine feature directory name from existing structure
  const featuresDir = path.join(PROJECT_ROOT, 'documents/features');

  // Create features directory if it doesn't exist
  if (!fs.existsSync(featuresDir)) {
    fs.mkdirSync(featuresDir, { recursive: true });
  }

  let featureDirs = fs.readdirSync(featuresDir).filter(d => {
    return d.startsWith(feature + '-');
  });

  // If no existing directory found but we have featureDir from generation, create it
  if (featureDirs.length === 0 && detection.featureDir) {
    const newDir = path.join(featuresDir, detection.featureDir);
    fs.mkdirSync(newDir, { recursive: true });
    featureDirs = [detection.featureDir];
    console.log(`📁 Created feature directory: ${detection.featureDir}`);
  } else if (featureDirs.length === 0) {
    console.error(`❌ No feature directory found for ${feature}`);
    return false;
  }

  const featureDir = path.join(featuresDir, featureDirs[0]);
  console.log(`📁 Feature Directory: ${featureDirs[0]}`);

  for (const subFeature of subFeatures) {
    // Use FeatureLookup to get proper folder name from dictionary
    const folderName = featureLookup.getFolderName(subFeature.featureCode, subFeature.subCode);

    if (folderName) {
      // Create subfolder for sub-feature
      // Pattern: documents/features/USR-user/USR-authentication/
      const subFolder = path.join(featureDir, `${subFeature.featureCode}-${folderName}`);
      if (!fs.existsSync(subFolder)) {
        fs.mkdirSync(subFolder, { recursive: true });
        console.log(`  📁 Created: ${subFeature.featureCode}-${folderName}/`);
      }
      console.log(`  ├─ ${subFeature.code}: ${subFeature.name} → ${subFeature.featureCode}-${folderName}/`);
    } else {
      // No folder mapping in dictionary, warn user
      console.log(`  ├─ ${subFeature.code}: ${subFeature.name}`);
      console.log(`     ⚠️  No folder mapping in feature-dictionary.json for ${subFeature.featureCode}.${subFeature.subCode}`);
    }
  }

  // Save sub-feature registry
  const registryPath = path.join(featureDir, '.subfeatures.json');
  const registry = {
    feature: feature,
    featureDir: featureDirs[0],

    // BASE metadata fields (will be populated by base-analyzer.ts)
    baseNeeded: undefined,      // boolean - true if BASE needed, false otherwise
    baseType: null,              // 'core-library' | 'foundation' | 'orchestrator' | 'manual' | null
    baseRationale: undefined,    // string - Why BASE needed/not needed (from analyzer or manual override)
    baseComponents: [],          // string[] - List of shared components if BASE needed

    subFeatures: subFeatures.map(sf => {
      // Use FeatureLookup to get proper folder name from dictionary
      const folderName = featureLookup.getFolderName(sf.featureCode, sf.subCode);
      const subFolder = folderName ? `${sf.featureCode}-${folderName}` : null;

      // Build srsPath with proper folder structure
      // Pattern: {MODULE}-{readable-folder}/{CODE}-srs.md
      // Example: USR-authentication/USR-AUTH-srs.md
      const srsPath = subFolder
        ? `${subFolder}/${sf.code}-srs.md`
        : `${sf.code}-srs.md`;

      return {
        code: sf.code,
        subCode: sf.subCode,
        name: sf.name,
        description: sf.description,
        complexity: sf.complexity || 'Medium',
        priority: sf.priority || 'SHOULD HAVE',
        locEstimate: sf.locEstimate || 500,
        critical: sf.critical || 'No',
        functionalRequirements: sf.functionalRequirements || [],
        dependencies: sf.dependencies || [],
        // Store folder info for later use
        folder: subFolder,
        srsPath: srsPath,
        documents: {
          srs: srsPath,
          basicDesign: subFolder ? `${subFolder}/${sf.code}-basic-design.md` : `${sf.code}-basic-design.md`,
          frontendDetail: subFolder ? `${subFolder}/${sf.code}-frontend-detail-design.md` : `${sf.code}-frontend-detail-design.md`,
          backendDetail: subFolder ? `${subFolder}/${sf.code}-backend-detail-design.md` : `${sf.code}-backend-detail-design.md`,
          apiContracts: subFolder ? `${subFolder}/${sf.code}-api-contracts.md` : `${sf.code}-api-contracts.md`,
          testPlan: subFolder ? `${subFolder}/${sf.code}-test-plan.md` : `${sf.code}-test-plan.md`
        }
      };
    }),
    createdAt: new Date().toISOString(),
    totalDocuments: subFeatures.length * 6, // Will be updated if BASE needed (add +6 docs)
    metadata: {
      totalLOC: subFeatures.reduce((sum, sf) => sum + (sf.locEstimate || 500), 0),
      criticalCount: subFeatures.filter(sf => sf.critical === 'Yes').length,
      complexityBreakdown: {
        high: subFeatures.filter(sf => sf.complexity === 'High' || sf.complexity === 'Very High').length,
        medium: subFeatures.filter(sf => sf.complexity === 'Medium').length,
        low: subFeatures.filter(sf => sf.complexity === 'Low').length
      }
    }
  };

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`\n✅ Sub-feature registry created: ${registryPath}`);
  console.log(`📊 Total sub-features: ${subFeatures.length}`);
  console.log(`📄 Total documents expected: ${registry.totalDocuments}`);
  console.log(`📈 Total LOC estimate: ${registry.metadata.totalLOC}`);
  console.log(`⚠️  Critical sub-features: ${registry.metadata.criticalCount}`);
  console.log(`🔧 Complexity: High=${registry.metadata.complexityBreakdown.high}, Med=${registry.metadata.complexityBreakdown.medium}, Low=${registry.metadata.complexityBreakdown.low}`);

  return true;
}

/**
 * List detected sub-features
 */
function listSubFeatures(featureName) {
  const detection = detectSubFeatures(featureName);

  if (!detection || detection.subFeatures.length === 0) {
    console.log('❌ No sub-features detected');
    return;
  }

  console.log(`\n📋 Sub-Features for ${detection.feature}:\n`);
  console.log(`Source: ${detection.sessionFile}`);
  console.log(`Detected: ${detection.detectedAt}\n`);

  console.log('┌─────────────┬──────────────────────────────────┬────────────┬──────────┬─────────┐');
  console.log('│ Code        │ Name                             │ Complexity │ Priority │ LOC Est │');
  console.log('├─────────────┼──────────────────────────────────┼────────────┼──────────┼─────────┤');

  detection.subFeatures.forEach(sf => {
    const code = sf.code.padEnd(11);
    const name = sf.name.substring(0, 32).padEnd(32);
    const complexity = (sf.complexity || 'Medium').substring(0, 10).padEnd(10);
    const priority = (sf.priority || 'SHOULD').substring(0, 8).padEnd(8);
    const loc = String(sf.locEstimate || 500).padEnd(7);
    const critical = sf.critical === 'Yes' ? ' ⚠️' : '';
    console.log(`│ ${code} │ ${name} │ ${complexity} │ ${priority} │ ${loc} │${critical}`);
  });

  console.log('└─────────────┴──────────────────────────────────┴────────────┴──────────┴─────────┘');

  const totalLOC = detection.subFeatures.reduce((sum, sf) => sum + (sf.locEstimate || 500), 0);
  const criticalCount = detection.subFeatures.filter(sf => sf.critical === 'Yes').length;

  console.log(`\nTotal: ${detection.subFeatures.length} sub-features`);
  console.log(`Expected documents: ${detection.subFeatures.length * 6}`);
  console.log(`Total LOC estimate: ${totalLOC}`);
  if (criticalCount > 0) {
    console.log(`⚠️  Critical sub-features: ${criticalCount}`);
  }
  console.log('');
}

/**
 * Update BASE fields in registry after base-analyzer.ts runs
 *
 * This function is called by base-analyzer.ts to populate BASE metadata
 *
 * @param {string} registryPath - Path to .subfeatures.json
 * @param {object} baseAnalysisResult - Result from BASE analyzer
 * @param {boolean} baseAnalysisResult.baseNeeded - Whether BASE is needed
 * @param {string|null} baseAnalysisResult.baseType - Type of BASE (core-library/foundation/orchestrator/manual)
 * @param {string} baseAnalysisResult.rationale - Why BASE needed/not needed
 * @param {string[]} baseAnalysisResult.baseComponents - List of shared components
 */
function updateBaseFields(registryPath, baseAnalysisResult) {
  if (!fs.existsSync(registryPath)) {
    console.error(`❌ Registry not found: ${registryPath}`);
    return false;
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

  // Update BASE metadata
  registry.baseNeeded = baseAnalysisResult.baseNeeded;
  registry.baseType = baseAnalysisResult.baseType;
  registry.baseRationale = baseAnalysisResult.rationale;
  registry.baseComponents = baseAnalysisResult.baseComponents || [];

  // Update document count if BASE needed
  if (registry.baseNeeded) {
    // Add 6 documents for BASE (srs, basic-design, frontend-dd, backend-dd, api-contracts, test-plan)
    registry.totalDocuments = (registry.subFeatures.length + 1) * 6;
  }

  // Write updated registry
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

  console.log(`✅ BASE fields updated in registry`);
  console.log(`   baseNeeded: ${registry.baseNeeded}`);
  if (registry.baseNeeded) {
    console.log(`   baseType: ${registry.baseType}`);
    console.log(`   Total documents: ${registry.totalDocuments} (including BASE)`);
  } else {
    console.log(`   Total documents: ${registry.totalDocuments} (sub-features only)`);
  }

  return true;
}

/**
 * Get current feature context
 */
function getCurrentContext() {
  const contextPath = path.join(PROJECT_ROOT, '.claude/memory-bank/CONTEXT.md');

  if (!fs.existsSync(contextPath)) {
    return null;
  }

  const content = fs.readFileSync(contextPath, 'utf-8');
  const featureMatch = content.match(/Feature:\s*([^\s]+)/);
  const developerMatch = content.match(/Developer:\s*([^\s]+)/);

  return {
    feature: featureMatch ? featureMatch[1] : null,
    developer: developerMatch ? developerMatch[1] : null
  };
}

// CLI Interface - only run when executed directly
if (require.main === module) {

const command = process.argv[2];
const featureArg = process.argv[3];
const developerArg = process.argv[4];

// Get context
const context = getCurrentContext();
const feature = featureArg || (context && context.feature);

// Auto-detect developer from git config if not provided
let developer = developerArg || (context && context.developer);
if (!developer) {
  try {
    const { execSync } = require('child_process');
    const gitUser = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    if (gitUser) {
      developer = gitUser.toLowerCase().replace(/\s+/g, '-');
      console.log(`ℹ️  Auto-detected developer from git: ${developer}`);
    }
  } catch (error) {
    // Git config not available or failed
  }

  // If still no developer, prompt user (synchronous)
  if (!developer) {
    console.log('');
    console.log('⚠️  Could not auto-detect developer name from git config');
    console.log('');
    console.log('ℹ️  Using default developer name: cuong');
    developer = 'cuong';
  }
}

// Validate feature is provided
if (!feature) {
  console.error('❌ No feature specified');
  console.error('');
  console.error('Usage:');
  console.error('  node .claude/utils/subfeature-manager.js <command> <feature> [developer]');
  console.error('');
  console.error('Example:');
  console.error('  node .claude/utils/subfeature-manager.js detect admin');
  console.error('  node .claude/utils/subfeature-manager.js create banking');
  console.error('');
  console.error('Or run from a feature context (CONTEXT.md must exist with Feature field)');
  process.exit(1);
}

switch (command) {
  case 'detect':
  case 'list':
    listSubFeatures(feature, developer);
    break;

  case 'create':
    console.log(`🔍 Detecting sub-features for: ${feature}...\n`);
    const detection = detectSubFeatures(feature, developer);

    if (!detection) {
      process.exit(1);
    }

    console.log(`✅ Detected ${detection.subFeatures.length} sub-features\n`);
    createFolderStructure(detection);
    break;

  case 'generate':
    // Generate convention codes from function list JSON
    // Usage: node subfeature-manager.js generate <feature> <functionListJsonPath>
    // Or:    node subfeature-manager.js generate <feature> --stdin (reads JSON from stdin)
    const funcListPath = process.argv[4];

    if (!funcListPath) {
      console.error('Usage: node subfeature-manager.js generate <feature> <functionListJsonPath>');
      console.error('Example: node subfeature-manager.js generate authentication functions.json');
      console.error('');
      console.error('functions.json format:');
      console.error('  [{"name": "Login/Logout", "priority": "MUST HAVE", "complexity": "High"}]');
      process.exit(1);
    }

    let functionList;
    try {
      const funcContent = fs.readFileSync(funcListPath, 'utf-8');
      functionList = JSON.parse(funcContent);
    } catch (err) {
      console.error(`❌ Failed to read function list: ${err.message}`);
      process.exit(1);
    }

    const generated = generateSubFeatureCodes(feature, functionList);
    if (generated && generated.subFeatures.length > 0) {
      createFolderStructure(generated);
    }
    break;

  case 'update-base':
    // Update BASE fields in existing registry
    // Usage: node subfeature-manager.js update-base <registryPath> <baseNeeded> <baseType> <rationale>
    const registryPath = process.argv[3];
    const baseNeeded = process.argv[4] === 'true';
    const baseType = process.argv[5];
    const rationale = process.argv[6];

    if (!registryPath || process.argv[4] === undefined) {
      console.error('Usage: node subfeature-manager.js update-base <registryPath> <baseNeeded> <baseType> <rationale>');
      process.exit(1);
    }

    const result = {
      baseNeeded: baseNeeded,
      baseType: baseNeeded ? baseType : null,
      rationale: rationale || '',
      baseComponents: []
    };

    updateBaseFields(registryPath, result);
    break;

  default:
    console.log('Usage:');
    console.log('  node .claude/utils/subfeature-manager.js detect [feature] [developer]');
    console.log('  node .claude/utils/subfeature-manager.js create [feature] [developer]');
    console.log('  node .claude/utils/subfeature-manager.js generate <feature> <functionList.json>');
    console.log('  node .claude/utils/subfeature-manager.js list [feature] [developer]');
    console.log('  node .claude/utils/subfeature-manager.js update-base <registryPath> <baseNeeded> <baseType> <rationale>');
    console.log('');
    console.log('Commands:');
    console.log('  detect/list  - Show detected sub-features from research');
    console.log('  create       - Create folder structure and registry');
    console.log('  generate     - Generate convention codes from function list (called by /innovate)');
    console.log('  update-base  - Update BASE fields in registry (called by base-analyzer.ts)');
    console.log('');
    console.log('If no feature/developer provided, uses current context');
    process.exit(1);
}

} // end if (require.main === module)

// Export for use by other modules (e.g., base-analyzer.ts, innovate workflow)
module.exports = {
  updateBaseFields,
  detectSubFeatures,
  generateSubFeatureCodes,
  createFolderStructure,
  listSubFeatures
};
