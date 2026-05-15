/**
 * Architecture Validator
 *
 * Real-time architecture validation during /plan and /execute phases
 * Checks code snippets, file structures, and design decisions against standards
 *
 * Usage:
 *   const validator = new ArchitectureValidator();
 *   const result = validator.validateCodeSnippet(code, { pattern: 'clean-architecture', layer: 'domain' });
 */

const fs = require('fs');
const path = require('path');

class ArchitectureValidator {
  constructor() {
    this.rules = this.loadRules();
  }

  loadRules() {
    return {
      backend: {
        'clean-architecture': {
          layers: ['domain', 'application', 'infrastructure', 'presentation'],
          forbidden: {
            domain: [
              { pattern: /from.*infrastructure/, message: 'Domain layer cannot import Infrastructure' },
              { pattern: /from.*presentation/, message: 'Domain layer cannot import Presentation' },
              { pattern: /import.*TypeORM/, message: 'Domain layer cannot use ORM directly (use repository interfaces)' },
            ],
            application: [
              { pattern: /from.*presentation/, message: 'Application layer cannot import Presentation' },
              { pattern: /import.*express|@nestjs\/common/, message: 'Application layer cannot use framework-specific code' },
            ],
          },
          required: {
            domain: [
              { pattern: /class.*Entity|class.*ValueObject/, message: 'Domain should define Entities or Value Objects' },
            ],
            application: [
              { pattern: /class.*UseCase|async execute/, message: 'Application should define Use Cases with execute() method' },
            ],
          },
        },
        'layered-architecture': {
          layers: ['controllers', 'services', 'repositories'],
          forbidden: {
            controllers: [
              { pattern: /import.*repositories/, message: 'Controllers cannot import repositories directly (use services)' },
              { pattern: /extends Repository|implements Repository/, message: 'Controllers cannot extend/implement repositories' },
            ],
            services: [
              { pattern: /import.*@nestjs\/common.*Controller/, message: 'Services cannot import controllers' },
            ],
          },
          required: {
            services: [
              { pattern: /@Injectable\(\)|@Service\(\)/, message: 'Services must be decorated with @Injectable()' },
            ],
            controllers: [
              { pattern: /@Controller\(/, message: 'Controllers must be decorated with @Controller()' },
            ],
          },
        },
      },
      frontend: {
        'pages-features': {
          forbidden: {
            global: [
              { pattern: /@reduxjs\/toolkit\/query|rtk-query/, message: 'Frontend cannot use RTK Query (use Axios + React Query)' },
              { pattern: /from.*shared\/|from.*entities\/|from.*widgets\/|from.*processes\//, message: 'Frontend cannot use FSD layers (use pages/ + features/)' },
            ],
            features: [
              { pattern: /createSlice|configureStore/, message: 'Redux slices cannot be in features/ (only in store/)' },
            ],
          },
          required: {
            hooks: [
              { pattern: /useQuery|useMutation/, message: 'API hooks should use React Query (useQuery, useMutation)' },
            ],
            services: [
              { pattern: /apiClient\.|axios\./, message: 'Services should use Axios for HTTP calls' },
            ],
          },
        },
      },
    };
  }

  /**
   * Validate code snippet against architecture rules
   *
   * @param {string} code - Code snippet to validate
   * @param {object} context - Validation context
   * @param {string} context.scope - 'backend' or 'frontend'
   * @param {string} context.pattern - Architecture pattern (e.g., 'clean-architecture', 'pages-features')
   * @param {string} context.layer - Layer name (e.g., 'domain', 'services', 'features')
   * @param {string} context.fileType - File type (e.g., 'entity', 'controller', 'component')
   *
   * @returns {object} Validation result
   */
  validateCodeSnippet(code, context) {
    const { scope, pattern, layer, fileType } = context;

    const result = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Get rules for this scope and pattern
    const rules = this.rules[scope]?.[pattern];
    if (!rules) {
      result.warnings.push(`No validation rules found for ${scope}/${pattern}`);
      return result;
    }

    // Check forbidden patterns
    const forbiddenRules = [
      ...(rules.forbidden?.global || []),
      ...(rules.forbidden?.[layer] || []),
    ];

    for (const rule of forbiddenRules) {
      if (rule.pattern.test(code)) {
        result.valid = false;
        result.errors.push({
          type: 'forbidden-pattern',
          message: rule.message,
          pattern: rule.pattern.toString(),
        });
      }
    }

    // Check required patterns (only for specific file types)
    const requiredRules = rules.required?.[layer] || [];
    for (const rule of requiredRules) {
      if (!rule.pattern.test(code)) {
        result.warnings.push({
          type: 'missing-pattern',
          message: rule.message,
          pattern: rule.pattern.toString(),
        });
      }
    }

    return result;
  }

  /**
   * Validate file structure against architecture pattern
   *
   * @param {string} projectPath - Path to project
   * @param {string} pattern - Architecture pattern
   * @param {string} scope - 'backend' or 'frontend'
   *
   * @returns {object} Validation result
   */
  validateFileStructure(projectPath, pattern, scope) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const rules = this.rules[scope]?.[pattern];
    if (!rules) {
      result.warnings.push(`No validation rules found for ${scope}/${pattern}`);
      return result;
    }

    // Check if required layers exist
    if (rules.layers) {
      const srcPath = path.join(projectPath, 'src');
      if (fs.existsSync(srcPath)) {
        const existingDirs = fs.readdirSync(srcPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        const missingLayers = rules.layers.filter(layer => !existingDirs.includes(layer));
        if (missingLayers.length > 0) {
          result.warnings.push({
            type: 'missing-layers',
            message: `Missing expected layers: ${missingLayers.join(', ')}`,
            layers: missingLayers,
          });
        }

        // Check for unexpected FSD layers (frontend only)
        if (scope === 'frontend') {
          const fsdLayers = ['app', 'shared', 'entities', 'widgets', 'processes'];
          const foundFsdLayers = existingDirs.filter(dir => fsdLayers.includes(dir));
          if (foundFsdLayers.length > 0) {
            result.valid = false;
            result.errors.push({
              type: 'forbidden-structure',
              message: `Found FSD layers (not allowed): ${foundFsdLayers.join(', ')}`,
              layers: foundFsdLayers,
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Validate design decision against architecture standards
   *
   * @param {object} decision - Design decision to validate
   * @param {string} decision.description - Description of the decision
   * @param {string} decision.scope - 'backend' or 'frontend'
   * @param {string} decision.category - Category (e.g., 'state-management', 'api-layer', 'architecture-pattern')
   *
   * @returns {object} Validation result
   */
  validateDesignDecision(decision) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    const { description, scope, category } = decision;
    const lowerDescription = description.toLowerCase();

    // Frontend validations
    if (scope === 'frontend') {
      // Check state management
      if (category === 'state-management' || lowerDescription.includes('state') || lowerDescription.includes('redux')) {
        if (lowerDescription.includes('rtk query') || lowerDescription.includes('rtk-query')) {
          result.valid = false;
          result.errors.push({
            type: 'forbidden-technology',
            message: 'RTK Query is not allowed. Use Axios + React Query for API data fetching.',
            suggestion: 'Replace RTK Query with: Axios (HTTP client) + React Query (data fetching/caching)',
          });
        }

        if (lowerDescription.includes('api') && lowerDescription.includes('redux')) {
          result.warnings.push({
            type: 'design-smell',
            message: 'Consider using React Query for API data instead of Redux',
            suggestion: 'Redux should only manage UI state (theme, modals, sidebar). Use React Query for server state.',
          });
        }
      }

      // Check architecture structure
      if (category === 'architecture-pattern' || lowerDescription.includes('structure') || lowerDescription.includes('folder')) {
        if (lowerDescription.includes('fsd') || lowerDescription.includes('feature-sliced')) {
          result.valid = false;
          result.errors.push({
            type: 'forbidden-pattern',
            message: 'Feature-Sliced Design (FSD) is not allowed for this project',
            suggestion: 'Use simplified pages/ + features/ structure instead (better for team size and project complexity)',
          });
        }
      }
    }

    // Backend validations
    if (scope === 'backend') {
      // Check service complexity
      if (category === 'architecture-pattern') {
        const isComplexService = lowerDescription.includes('lending') ||
                                 lowerDescription.includes('risk') ||
                                 lowerDescription.includes('insurance') ||
                                 lowerDescription.includes('banking');

        const isSimpleService = lowerDescription.includes('auth') ||
                                lowerDescription.includes('notification') ||
                                lowerDescription.includes('reporting') ||
                                lowerDescription.includes('blockchain');

        if (isComplexService && !lowerDescription.includes('clean architecture')) {
          result.warnings.push({
            type: 'architecture-recommendation',
            message: 'Consider using Clean Architecture for compliance-critical services',
            suggestion: 'Lending, Risk, Insurance, Banking services should use Clean Architecture (DDD) for better testability and audit trails',
          });
        }

        if (isSimpleService && lowerDescription.includes('clean architecture')) {
          result.suggestions.push({
            type: 'over-engineering',
            message: 'Layered Architecture might be sufficient for this simple service',
            suggestion: 'Auth, Notification, Reporting, Blockchain services can use simpler Layered Architecture (faster development)',
          });
        }
      }
    }

    return result;
  }

  /**
   * Generate validation report
   */
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter(r => r.valid).length,
        failed: results.filter(r => !r.valid).length,
        warnings: results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0),
      },
      results,
    };

    return report;
  }
}

module.exports = ArchitectureValidator;

// Example usage:
if (require.main === module) {
  const validator = new ArchitectureValidator();

  // Example 1: Validate code snippet
  const domainCode = `
    import { Column, Entity } from 'typeorm';

    class LoanEntity {
      @Column()
      amount: number;
    }
  `;

  const result1 = validator.validateCodeSnippet(domainCode, {
    scope: 'backend',
    pattern: 'clean-architecture',
    layer: 'domain',
    fileType: 'entity',
  });

  console.log('Validation Result 1:', JSON.stringify(result1, null, 2));

  // Example 2: Validate design decision
  const decision = {
    description: 'Use RTK Query for API data fetching in investor portal',
    scope: 'frontend',
    category: 'state-management',
  };

  const result2 = validator.validateDesignDecision(decision);
  console.log('Validation Result 2:', JSON.stringify(result2, null, 2));
}
