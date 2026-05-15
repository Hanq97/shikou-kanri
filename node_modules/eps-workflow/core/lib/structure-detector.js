// core/lib/structure-detector.js
// Feature structure detector - determines if feature is SIMPLE or COMPLEX

const fs = require('fs');
const path = require('path');

class FeatureStructureDetector {
  /**
   * Detect feature type based on structure
   * @param {string} featurePath - Path to feature folder
   * @returns {string} 'SIMPLE' | 'COMPLEX'
   */
  async detectFeatureType(featurePath) {
    if (!fs.existsSync(featurePath)) {
      // New feature - default to SIMPLE until proven COMPLEX
      return 'SIMPLE';
    }

    // Check for sub-feature folders
    const entries = fs.readdirSync(featurePath, { withFileTypes: true });
    const subFeatureFolders = entries.filter(e =>
      e.isDirectory() && this.isSubFeatureFolder(e.name)
    );

    if (subFeatureFolders.length > 0) {
      return 'COMPLEX';
    }

    // Check API endpoint count (heuristic)
    const apiContractsPath = path.join(featurePath, 'api-contracts.md');
    if (fs.existsSync(apiContractsPath)) {
      const content = fs.readFileSync(apiContractsPath, 'utf-8');
      const endpointCount = this.countEndpoints(content);

      // If ≥10 endpoints, suggest COMPLEX
      if (endpointCount >= 10) {
        return 'COMPLEX';
      }
    }

    return 'SIMPLE';
  }

  isSubFeatureFolder(folderName) {
    // Sub-feature folders match: [CODE]-[name] pattern
    // Example: BNK-account-management, BNK-core
    return /^[A-Z]{3,4}-[a-z-]+$/.test(folderName);
  }

  countEndpoints(apiContractContent) {
    // Count HTTP method markers (GET, POST, PUT, DELETE, PATCH)
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    let count = 0;

    methods.forEach(method => {
      const regex = new RegExp(`###\\s+${method}\\s+/`, 'g');
      const matches = apiContractContent.match(regex);
      count += matches ? matches.length : 0;
    });

    return count;
  }

  /**
   * Check if feature has core sub-feature
   */
  hasCoreSubFeature(featurePath, featureCode) {
    const coreFolder = path.join(featurePath, `${featureCode}-core`);
    return fs.existsSync(coreFolder);
  }

  /**
   * Suggest structure based on analysis
   */
  suggestStructure(featureType) {
    if (featureType === 'SIMPLE') {
      return {
        type: 'SIMPLE',
        message: 'Simple feature: Create all 5 documents at feature level',
        structure: [
          'srs.md',
          'basic-design.md',
          'backend-detail-design.md',
          'frontend-detail-design.md',
          'api-contracts.md',
          'test-plan.md'
        ]
      };
    } else {
      return {
        type: 'COMPLEX',
        message: 'Complex feature: Create container + sub-features',
        structure: [
          'Main feature: SRS, Basic Design, README, Test Plan',
          'Core sub-feature: Full 5 docs (shared logic)',
          'Specific sub-features: Full 5 docs each'
        ],
        recommendation: 'Create [CODE]-core/ for shared logic'
      };
    }
  }
}

module.exports = { FeatureStructureDetector };
