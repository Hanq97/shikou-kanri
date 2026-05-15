/**
 * Execute Multi-Stack Integration
 * Week 15 - Day 7: Multi-Stack Support (Week 14 Integration)
 *
 * Integrates Week 14 Multi-Stack support with /execute command.
 * Supports 4 stacks: java-nextjs, csharp-react, nestjs-blockchain, fastapi-react
 */

const fs = require('fs');
const path = require('path');
const { getTechStack } = require('../state/project-config');
const { getStackResolver } = require('../state/stack-resolver');
const KBLoader = require('../knowledge-base/kb-loader');

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const SUPPORTED_STACKS = [
  'java-nextjs-postgres',
  'csharp-react-mssql',
  'nestjs-blockchain',
  'fastapi-react-postgres'
];

const STACK_SPECIALIST_MAP = {
  'java-nextjs-postgres': {
    backend: {
      domain: 'java-domain-specialist',
      service: 'java-service-specialist',
      repository: 'java-repository-specialist',
      controller: 'java-controller-specialist',
      dto: 'java-dto-specialist'
    },
    frontend: {
      component: 'react-component-specialist',
      page: 'react-component-specialist',
      layout: 'react-component-specialist'
    }
  },
  'csharp-react-mssql': {
    backend: {
      domain: 'csharp-domain-specialist',
      service: 'csharp-service-specialist',
      repository: 'csharp-repository-specialist',
      controller: 'csharp-api-specialist'
    },
    frontend: {
      component: 'react-component-specialist',
      hook: 'react-hooks-specialist',
      context: 'react-state-specialist'
    }
  },
  'nestjs-blockchain': {
    backend: {
      module: 'nestjs-module-specialist',
      service: 'nestjs-service-specialist',
      controller: 'nestjs-controller-specialist',
      smart_contract: 'chaincode-core-specialist'
    },
    frontend: {
      component: 'redux-toolkit-specialist',
      hook: 'react-hooks-specialist',
      slice: 'redux-toolkit-specialist'
    }
  },
  'fastapi-react-postgres': {
    backend: {
      router: 'fastapi-router-specialist',
      service: 'core-services-specialist',
      model: 'pydantic-schemas-specialist',
      schema: 'pydantic-schemas-specialist',
      repository: 'fastapi-base-repository',
      postgres_repository: 'fastapi-postgres-repository',
      neo4j_repository: 'fastapi-neo4j-repository',
      qdrant_repository: 'fastapi-qdrant-repository',
      redis_uow: 'fastapi-redis-uow',
      validation: 'core-validation-specialist',
      crypto: 'core-crypto-specialist',
      http_logging: 'core-http-logging-specialist',
      llm: 'llm-providers-specialist',
      vlm: 'vlm-providers-specialist',
      voice_stt: 'voice-stt-specialist',
      voice_tts: 'voice-tts-specialist',
      orchestrator: 'orchestrator-specialist',
      langgraph: 'langgraph-builder-specialist',
      embeddings: 'embeddings-providers-specialist',
      storage: 'storage-specialist',
      websocket: 'websocket-middleware-specialist',
      e2e_test: 'e2e-testing-specialist'
    },
    frontend: {
      component: 'ui-components-specialist',
      entity_component: 'entity-components-specialist',
      widget: 'widget-components-specialist',
      hook: 'api-hooks-specialist',
      model: 'entity-models-specialist',
      utilities: 'utilities-specialist',
      provider: 'app-provider-composition',
      router_config: 'app-router-config',
      router_guard: 'app-router-guards',
      router_loader: 'app-router-loaders',
      auth_provider: 'app-auth-provider',
      layout: 'app-layouts',
      navigation: 'app-navigation',
      theme: 'app-ui-theme-providers',
      query_provider: 'app-query-state-providers',
      page_auth: 'page-auth',
      page_dashboard: 'page-dashboard-crud',
      page_error: 'page-error-states',
      page_public: 'page-public',
      page_performance: 'page-performance',
      feature_filter: 'advanced-filter-feature',
      feature_bulk: 'bulk-operations-feature',
      feature_export: 'export-data-feature',
      feature_import: 'import-data-feature',
      feature_search: 'user-search-feature',
      feature_pagination: 'pagination-feature',
      feature_sort: 'sort-data-feature',
      feature_keyboard: 'keyboard-shortcuts-feature',
      feature_theme: 'theme-toggle-feature',
      feature_language: 'language-switcher-feature',
      feature_notification: 'notification-preferences-feature',
      feature_command: 'command-palette-feature',
      feature_create: 'create-user-feature',
      feature_edit: 'edit-user-feature',
      feature_delete: 'delete-user-feature',
      feature_login: 'login-feature',
      feature_register: 'register-feature',
      feature_send_message: 'send-message-feature',
      feature_search_message: 'search-messages-feature',
      feature_create_conversation: 'create-conversation-feature'
    }
  }
};

// ============================================
// STACK RESOLUTION
// ============================================

/**
 * Resolve stack configuration from context
 *
 * @param {Object} context - Validated context from Day 2
 * @returns {Object} - Stack configuration
 */
async function resolveStackConfiguration(context) {
  const ts = getTechStack();
  const resolver = getStackResolver();

  // Use context stack or first sourceRoot as default
  const stackId = context.stack?.stack || ts.sourceRoots[0]?.stack;
  const variant = context.stack?.variant || ts.sourceRoots[0]?.variant || "default";

  if (!stackId) {
    throw new Error("No stack configured in sourceRoots");
  }

  const stackConfig = resolver.getStack(stackId);
  if (!stackConfig) {
    throw new Error(`Stack configuration not found: ${stackId}`);
  }

  const variantConfig = resolver.getVariant(stackId, variant);
  if (!variantConfig) {
    throw new Error(`Variant not found: ${stackId}/${variant}`);
  }

  return {
    id: stackId,
    name: stackConfig.name,
    backend: stackConfig.backend,
    frontend: stackConfig.frontend,
    database: stackConfig.database,
    variant: variant,
    variantConfig: variantConfig,
    specialists: resolver.resolveSpecialists(),
    kbPath: variantConfig.kb_path || {},
    patterns: variantConfig.patterns || {}
  };
}

/**
 * Get stack display name
 */
function getStackDisplayName(stackId) {
  const stackNames = {
    'java-nextjs-postgres': 'Java Spring Boot + Next.js',
    'csharp-react-mssql': 'C# ASP.NET Core + React',
    'nestjs-blockchain': 'NestJS + Blockchain',
    'fastapi-react-postgres': 'FastAPI + React'
  };

  return stackNames[stackId] || stackId;
}

// ============================================
// SPECIALIST SELECTION
// ============================================

/**
 * Select specialist based on stack, layer, and type
 *
 * @param {Object} step - Step definition
 * @param {Object} stackConfig - Stack configuration
 * @returns {string} - Specialist name
 */
function selectSpecialistByStack(step, stackConfig) {
  const stackId = stackConfig.id;
  const layer = step.layer || 'backend';
  const type = step.type || 'service';

  // Tier 1: Explicit STACK_SPECIALIST_MAP lookup
  const specialistMap = STACK_SPECIALIST_MAP[stackId];

  if (specialistMap) {
    const layerSpecialists = specialistMap[layer];
    if (layerSpecialists && layerSpecialists[type]) {
      return layerSpecialists[type];
    }
  }

  // Tier 2: Convention-based resolution
  const resolved = resolveByConvention(type, stackId);
  if (resolved) {
    return resolved;
  }

  // Tier 3: Return null (caller uses keyword fallback)
  return null;
}

/**
 * Resolve specialist by naming convention
 * Tries common suffixes: -specialist, -feature, -widget, direct name
 *
 * @param {string} type - Step type (e.g. 'export_data', 'breadcrumb')
 * @param {string} stackId - Stack identifier
 * @returns {string|null} - Specialist name or null
 */
function resolveByConvention(type, stackId) {
  const SpecialistLoader = require('./../../core/mcp/specialist-loader');
  const loader = new SpecialistLoader();
  loader.loadSpecialists();

  // Normalize type: underscores to hyphens
  const normalized = type.replace(/_/g, '-');

  // Convention candidates in priority order
  const candidates = [
    `${normalized}-specialist`,
    `${normalized}-feature`,
    `${normalized}-widget`,
    normalized
  ];

  for (const candidate of candidates) {
    const fileName = candidate.endsWith('.md') ? candidate : `${candidate}.md`;
    if (loader.getPath(fileName)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Get all specialists for a stack
 */
function getAllSpecialistsForStack(stackConfig) {
  const stackId = stackConfig.id;
  const specialistMap = STACK_SPECIALIST_MAP[stackId];

  if (!specialistMap) {
    return [];
  }

  const specialists = [];

  // Collect all specialists from all layers
  for (const layer of Object.keys(specialistMap)) {
    for (const type of Object.keys(specialistMap[layer])) {
      specialists.push({
        layer,
        type,
        specialist: specialistMap[layer][type]
      });
    }
  }

  return specialists;
}

// ============================================
// TEMPLATE LOADING
// ============================================

/**
 * Load template for specific stack
 *
 * @param {string} templateName - Template name
 * @param {Object} stackConfig - Stack configuration
 * @returns {string} - Template content
 */
function loadStackTemplate(templateName, stackConfig) {
  const stackId = stackConfig.id;

  // Try stack-specific template first
  const stackTemplatePath = path.join(
    '.claude',
    'templates',
    stackId,
    `${templateName}.hbs`
  );

  if (fs.existsSync(stackTemplatePath)) {
    return fs.readFileSync(stackTemplatePath, 'utf-8');
  }

  // Fall back to default template
  const defaultTemplatePath = path.join(
    '.claude',
    'templates',
    'default',
    `${templateName}.hbs`
  );

  if (fs.existsSync(defaultTemplatePath)) {
    return fs.readFileSync(defaultTemplatePath, 'utf-8');
  }

  // Return basic template if no file found
  return getBasicTemplate(templateName, stackConfig);
}

/**
 * Get basic template for stack
 */
function getBasicTemplate(templateName, stackConfig) {
  const stackId = stackConfig.id;

  // Basic templates for each stack
  const basicTemplates = {
    'java-nextjs-postgres': {
      service: `
@Service
@RequiredArgsConstructor
public class {{className}} {
    private final {{repositoryName}} {{repositoryVar}};

    public {{returnType}} {{methodName}}() {
        return {{repositoryVar}}.findAll();
    }
}`,
      controller: `
@RestController
@RequestMapping("/api/{{resource}}")
@RequiredArgsConstructor
public class {{className}} {
    private final {{serviceName}} {{serviceVar}};

    @GetMapping
    public ResponseEntity<List<{{entityName}}>> getAll() {
        return ResponseEntity.ok({{serviceVar}}.findAll());
    }
}`
    },
    'csharp-react-mssql': {
      service: `
public class {{className}} : I{{className}}
{
    private readonly {{repositoryName}} _{{repositoryVar}};

    public {{className}}({{repositoryName}} {{repositoryVar}})
    {
        _{{repositoryVar}} = {{repositoryVar}};
    }

    public async Task<IEnumerable<{{entityName}}>> {{methodName}}()
    {
        return await _{{repositoryVar}}.GetAllAsync();
    }
}`,
      controller: `
[ApiController]
[Route("api/[controller]")]
public class {{className}} : ControllerBase
{
    private readonly I{{serviceName}} _{{serviceVar}};

    public {{className}}(I{{serviceName}} {{serviceVar}})
    {
        _{{serviceVar}} = {{serviceVar}};
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<{{entityName}}>>> GetAll()
    {
        return Ok(await _{{serviceVar}}.GetAllAsync());
    }
}`
    },
    'nestjs-blockchain': {
      service: `
@Injectable()
export class {{className}} {
  constructor(
    @InjectRepository({{entityName}})
    private readonly {{repositoryName}}: Repository<{{entityName}}>,
  ) {}

  async {{methodName}}(): Promise<{{returnType}}[]> {
    return this.{{repositoryName}}.find();
  }
}`,
      controller: `
@Controller('{{resource}}')
export class {{className}} {
  constructor(private readonly {{serviceName}}: {{serviceType}}) {}

  @Get()
  async getAll(): Promise<{{entityName}}[]> {
    return this.{{serviceName}}.findAll();
  }
}`
    },
    'fastapi-react-postgres': {
      router: `
@router.get("/{{resource}}", response_model=List[{{schemaName}}])
async def get_{{resource}}(
    db: Session = Depends(get_db),
    {{serviceName}}: {{serviceType}} = Depends()
):
    return await {{serviceName}}.get_all(db)`,
      service: `
class {{className}}:
    async def get_all(self, db: Session) -> List[{{modelName}}]:
        return db.query({{modelName}}).all()

    async def get_by_id(self, db: Session, id: int) -> {{modelName}}:
        return db.query({{modelName}}).filter({{modelName}}.id == id).first()`
    }
  };

  const stackTemplates = basicTemplates[stackId] || {};
  const template = stackTemplates[templateName];

  if (template) {
    return template.trim();
  }

  // Generic fallback
  return `export class {{className}} { {{methodName}}() {} }`;
}

// ============================================
// KB PATH RESOLUTION
// ============================================

/**
 * Resolve Knowledge Base path for stack (delegates to KBLoader)
 *
 * @param {Object} stackConfig - Stack configuration
 * @param {string} kbType - KB type (backend, frontend, database)
 * @returns {string} - KB file path
 */
function resolveKBPath(stackConfig, kbType = 'backend') {
  const kbLoader = new KBLoader();
  const kbPath = stackConfig.kbPath?.[kbType];

  if (kbPath) {
    return kbLoader.resolveKBPath(kbPath);
  }

  // Fallback to default KB path
  const defaultPath = kbLoader.defaultKBPaths[kbType];
  return defaultPath ? kbLoader.resolveKBPath(defaultPath) : null;
}

/**
 * Load Knowledge Base for stack (delegates to KBLoader)
 *
 * @param {Object} stackConfig - Stack configuration with kbPath and patterns
 * @param {string} kbType - KB type (backend, frontend, database)
 * @returns {Object} - Parsed and filtered KB object
 */
function loadStackKB(stackConfig, kbType = 'backend') {
  const kbLoader = new KBLoader();

  // Build variantContext from stackConfig for KBLoader
  const variantContext = {
    kb_path: stackConfig.kbPath || {},
    patterns: stackConfig.patterns || {}
  };

  try {
    const kbs = kbLoader.loadKB(variantContext);
    return kbs[kbType] || { categories: [] };
  } catch (error) {
    console.warn(`Warning: Failed to load KB via KBLoader: ${error.message}`);
    return { categories: [] };
  }
}

// ============================================
// LANGUAGE DETECTION
// ============================================

/**
 * Get programming language for stack layer
 */
function getStackLanguage(stackConfig, layer = 'backend') {
  const languageMap = {
    'java-nextjs-postgres': {
      backend: 'java',
      frontend: 'typescript'
    },
    'csharp-react-mssql': {
      backend: 'csharp',
      frontend: 'typescript'
    },
    'nestjs-blockchain': {
      backend: 'typescript',
      frontend: 'typescript'
    },
    'fastapi-react-postgres': {
      backend: 'python',
      frontend: 'typescript'
    }
  };

  const stackId = stackConfig.id;
  const languages = languageMap[stackId];

  if (!languages) {
    return layer === 'backend' ? 'java' : 'typescript';
  }

  return languages[layer] || 'typescript';
}

/**
 * Get file extension for stack layer
 */
function getFileExtension(stackConfig, layer = 'backend') {
  const language = getStackLanguage(stackConfig, layer);

  const extensionMap = {
    java: '.java',
    csharp: '.cs',
    typescript: '.ts',
    python: '.py'
  };

  return extensionMap[language] || '.ts';
}

// ============================================
// INTEGRATION WORKFLOW
// ============================================

/**
 * Execute with multi-stack support
 * Integrates Days 3-6 with stack-specific routing
 *
 * @param {Object} step - Step definition
 * @param {Object} context - Validated context
 * @param {Object} options - Execution options
 * @returns {Object} - Execution result with stack info
 */
async function executeWithMultiStack(step, context, options = {}) {
  const result = {
    success: false,
    stack: null,
    specialist: null,
    template: null,
    language: null,
    errors: []
  };

  try {
    // Step 1: Resolve stack configuration
    const stackConfig = await resolveStackConfiguration(context);
    result.stack = {
      id: stackConfig.id,
      name: stackConfig.name,
      variant: stackConfig.variant
    };

    // Step 2: Select specialist
    const specialist = selectSpecialistByStack(step, stackConfig);
    result.specialist = specialist;

    // Step 3: Load template
    const templateName = step.template || step.type || 'service';
    const template = loadStackTemplate(templateName, stackConfig);
    result.template = templateName;

    // Step 4: Determine language
    const layer = step.layer || 'backend';
    const language = getStackLanguage(stackConfig, layer);
    result.language = language;

    // Step 5: Load KB
    const kb = loadStackKB(stackConfig, layer === 'frontend' ? 'frontend' : 'backend');
    result.kbPatterns = kb.patterns?.length || 0;

    result.success = true;
    return result;

  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Stack resolution
  resolveStackConfiguration,
  getStackDisplayName,

  // Specialist selection
  selectSpecialistByStack,
  getAllSpecialistsForStack,

  // Template loading
  loadStackTemplate,
  getBasicTemplate,

  // KB resolution
  resolveKBPath,
  loadStackKB,

  // Language detection
  getStackLanguage,
  getFileExtension,

  // Integration
  executeWithMultiStack,

  // Constants
  SUPPORTED_STACKS,
  STACK_SPECIALIST_MAP
};
