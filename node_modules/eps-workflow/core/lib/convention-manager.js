// core/lib/convention-manager.js
// Convention manager - orchestrates convention automation

const fs = require('fs');
const path = require('path');
const { SmartCodeGenerator } = require('./code-generator');
const { FeatureStructureDetector } = require('./structure-detector');

class ConventionManager {
  constructor() {
    this.codeGenerator = new SmartCodeGenerator();
    this.structureDetector = new FeatureStructureDetector();
    this.configPath = 'config/feature-codes.json';
  }

  /**
   * Detect feature context from Enhanced Workflow context
   */
  async detect(workflowContext) {
    const {
      featureName,      // e.g., "banking", "banking/account-management"
      developerName,
      currentState
    } = workflowContext;

    // Load existing feature codes
    const existingCodes = this.loadFeatureCodes();

    // Parse feature name to detect main vs sub-feature
    // Example: "banking" → main feature
    //          "banking/account-management" → sub-feature
    const parts = featureName.split('/');
    const isSubFeature = parts.length > 1;

    let result;

    if (!isSubFeature) {
      // Main feature
      result = await this.detectMainFeature(parts[0], existingCodes);
    } else {
      // Sub-feature
      result = await this.detectSubFeature(parts[0], parts[1], existingCodes);
    }

    return result;
  }

  async detectMainFeature(featureName, existingCodes) {
    // Generate feature code (3-4 chars)
    const featureCode = this.generateFeatureCode(featureName, existingCodes);

    // Detect feature type (SIMPLE vs COMPLEX)
    const featureType = await this.structureDetector.detectFeatureType(
      `documents/features/${featureCode}-${featureName}`
    );

    return {
      feature_type: featureType,
      feature_code: featureCode,
      feature_name: featureName,
      is_main_feature: true,
      is_sub_feature: false,
      sub_feature_code: null,
      sub_feature_name: null,
      parent_code: null
    };
  }

  async detectSubFeature(mainFeatureName, subFeatureName, existingCodes) {
    // Get main feature code (must exist)
    const mainFeatureCode = this.findFeatureCode(mainFeatureName, existingCodes);

    if (!mainFeatureCode) {
      throw new Error(`Main feature "${mainFeatureName}" not found. Create main feature first.`);
    }

    // Generate sub-feature code (4 chars using smart algorithm)
    const subFeatureCode = this.codeGenerator.generateSubFeatureCode(
      subFeatureName,
      mainFeatureCode,
      existingCodes
    );

    return {
      feature_type: 'COMPLEX',  // Main feature is complex if it has sub-features
      feature_code: mainFeatureCode,
      feature_name: mainFeatureName,
      is_main_feature: false,
      is_sub_feature: true,
      sub_feature_code: subFeatureCode,
      sub_feature_name: subFeatureName,
      parent_code: mainFeatureCode
    };
  }

  generateFeatureCode(featureName, existingCodes) {
    // Generate 3-4 character feature code
    // Example: "banking" → "BNK", "lending" → "LND"
    const baseCode = featureName.substring(0, 3).toUpperCase();

    // Check if already assigned
    const existing = Object.keys(existingCodes).find(
      code => existingCodes[code].name === featureName
    );

    if (existing) {
      return existing;
    }

    // Check conflicts
    let finalCode = baseCode;
    let counter = 2;

    while (existingCodes[finalCode]) {
      finalCode = baseCode.substring(0, 2) + counter;
      counter++;
    }

    return finalCode;
  }

  findFeatureCode(featureName, existingCodes) {
    return Object.keys(existingCodes).find(
      code => existingCodes[code].name === featureName
    );
  }

  buildFilename(convention, docType) {
    const {
      feature_code,
      feature_name,
      is_sub_feature,
      sub_feature_code,
      sub_feature_name
    } = convention;

    let filename, outputPath;

    if (!is_sub_feature) {
      // Main feature: BNK-BASE-srs.md or BNK-COMM-api-contracts.md
      const code = this.getMainFeatureDocCode(docType);
      filename = `${feature_code}-${code}-${docType}.md`;
      outputPath = `documents/features/${feature_code}-${feature_name}/`;
    } else {
      // Sub-feature: BNK-ACCT-srs.md
      filename = `${feature_code}-${sub_feature_code}-${docType}.md`;
      outputPath = `documents/features/${feature_code}-${feature_name}/${feature_code}-${sub_feature_name}/`;
    }

    return {
      filename,
      output_path: outputPath,
      full_path: outputPath + filename
    };
  }

  getMainFeatureDocCode(docType) {
    // Main feature docs use BASE or COMM
    const sharedDocs = ['api-contracts', 'test-plan'];
    return sharedDocs.includes(docType) ? 'COMM' : 'BASE';
  }

  hasConflict(featureCode, subCode) {
    const codes = this.loadFeatureCodes();
    return codes[featureCode]?.[subCode] !== undefined;
  }

  async register(metadata) {
    const {
      feature_code,
      feature_name,
      sub_feature_code,
      sub_feature_name,
      algorithm
    } = metadata;

    const codes = this.loadFeatureCodes();

    if (!codes[feature_code]) {
      codes[feature_code] = {
        name: feature_name,
        created: new Date().toISOString().split('T')[0]
      };
    }

    if (sub_feature_code) {
      codes[feature_code][sub_feature_code] = {
        name: sub_feature_name,
        algorithm: algorithm || 'smart-abbrev',
        created: new Date().toISOString().split('T')[0]
      };
    }

    this.saveFeatureCodes(codes);
  }

  async moveToFinal(wipPath, convention, docType) {
    const { full_path, output_path } = this.buildFilename(convention, docType);

    // Create directory if needed
    if (!fs.existsSync(output_path)) {
      fs.mkdirSync(output_path, { recursive: true });
    }

    // Copy file
    fs.copyFileSync(wipPath, full_path);

    // Register code
    await this.register({
      feature_code: convention.feature_code,
      feature_name: convention.feature_name,
      sub_feature_code: convention.sub_feature_code,
      sub_feature_name: convention.sub_feature_name,
      algorithm: 'smart-abbrev'
    });

    return full_path;
  }

  loadFeatureCodes() {
    if (!fs.existsSync(this.configPath)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
  }

  saveFeatureCodes(codes) {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(codes, null, 2), 'utf-8');
  }
}

module.exports = { ConventionManager };
