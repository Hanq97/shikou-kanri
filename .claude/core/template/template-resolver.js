#!/usr/bin/env node
/**
 * Template Resolver - Dynamic template selection based on tech stack
 *
 * This module resolves the correct code templates based on the project's
 * configured tech stack (from project-config.json).
 *
 * Supported Backend Stacks:
 * - C# 12 + ASP.NET Core 8 (csharp-react-mssql)
 * - Java 21 + Spring Boot 3.4 (java-spring-react)
 *
 * Supported Frontend Stacks:
 * - React 18 + TypeScript + React Query (csharp-react-mssql)
 * - React 19 + Next.js 15 (java-spring-react)
 */

const path = require('path');
const fs = require('fs');

class TemplateResolver {
  constructor(techStack) {
    this.techStack = techStack;
    this.stackId = techStack?.stackId || 'unknown';
  }

  /**
   * Detect backend language from tech stack
   */
  getBackendLanguage() {
    const backend = this.techStack?.backend || '';

    if (backend.includes('C#') || backend.includes('ASP.NET')) {
      return 'csharp';
    }
    if (backend.includes('Java') || backend.includes('Spring')) {
      return 'java';
    }
    if (backend.includes('Python') || backend.includes('FastAPI') || backend.includes('Django')) {
      return 'python';
    }
    if (backend.includes('Node') || backend.includes('NestJS') || backend.includes('Express')) {
      return 'nodejs';
    }

    console.warn(`⚠️ Unknown backend: ${backend}, defaulting to java`);
    return 'java';
  }

  /**
   * Detect frontend framework from tech stack
   */
  getFrontendFramework() {
    const frontend = this.techStack?.frontend || '';

    if (frontend.includes('React 18')) {
      return 'react18';
    }
    if (frontend.includes('React 19') || frontend.includes('Next.js')) {
      return 'react19';
    }
    if (frontend.includes('Vue')) {
      return 'vue';
    }
    if (frontend.includes('Angular')) {
      return 'angular';
    }

    console.warn(`⚠️ Unknown frontend: ${frontend}, defaulting to react18`);
    return 'react18';
  }

  /**
   * Detect database from tech stack
   */
  getDatabase() {
    const database = this.techStack?.database || '';

    if (database.includes('SQL Server') || database.includes('MSSQL')) {
      return 'mssql';
    }
    if (database.includes('PostgreSQL')) {
      return 'postgresql';
    }
    if (database.includes('MySQL')) {
      return 'mysql';
    }
    if (database.includes('MongoDB')) {
      return 'mongodb';
    }

    console.warn(`⚠️ Unknown database: ${database}, defaulting to postgresql`);
    return 'postgresql';
  }

  /**
   * Get backend code templates
   */
  getBackendTemplates() {
    const lang = this.getBackendLanguage();
    const db = this.getDatabase();

    const templates = {
      csharp: {
        // Service Interface
        serviceInterface: `
public interface I{ServiceName}Service
{
    Task<{EntityName}Dto> GetByIdAsync(int id);
    Task<PagedResult<{EntityName}Dto>> GetAllAsync(PageRequest request);
    Task<{EntityName}Dto> CreateAsync(Create{EntityName}Request request);
    Task<{EntityName}Dto> UpdateAsync(int id, Update{EntityName}Request request);
    Task DeleteAsync(int id);
}`,
        // Service Implementation
        serviceImplementation: `
public class {ServiceName}Service : I{ServiceName}Service
{
    private readonly IRepository<{EntityName}> _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<{ServiceName}Service> _logger;

    public {ServiceName}Service(
        IRepository<{EntityName}> repository,
        IMapper mapper,
        ILogger<{ServiceName}Service> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<{EntityName}Dto> GetByIdAsync(int id)
    {
        // Interface only - implementation details
    }
}`,
        // Controller
        controller: `
[ApiController]
[Route("api/[controller]")]
public class {EntityName}Controller : ControllerBase
{
    private readonly I{ServiceName}Service _service;

    public {EntityName}Controller(I{ServiceName}Service service)
    {
        _service = service;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<{EntityName}Dto>> GetById(int id)
    {
        // Interface only
    }

    [HttpPost]
    public async Task<ActionResult<{EntityName}Dto>> Create([FromBody] Create{EntityName}Request request)
    {
        // Interface only
    }
}`,
        // Entity
        entity: `
[Table("{TableName}")]
public class {EntityName}
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}`,
        // Repository
        repository: `
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
}`,
        // DTO
        dto: `
public class {EntityName}Dto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Create{EntityName}Request
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; }
}

public class Update{EntityName}Request
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; }
}`,
        // Package Structure
        packageStructure: `
{ProjectName}/
├── Controllers/                    # コントローラ層 / Tầng Controller
│   └── {EntityName}Controller.cs
├── Services/                       # サービス層 / Tầng Service
│   ├── I{ServiceName}Service.cs    # インターフェース / Interface
│   └── {ServiceName}Service.cs     # 実装 / Implementation
├── Repositories/                   # リポジトリ層 / Tầng Repository
│   └── {EntityName}Repository.cs
├── Models/                         # ドメインモデル / Model Domain
│   ├── Entities/
│   │   └── {EntityName}.cs
│   └── DTOs/
│       ├── {EntityName}Dto.cs
│       └── {EntityName}Requests.cs
└── Data/                           # データコンテキスト / Data Context
    └── ApplicationDbContext.cs`
      },

      java: {
        // Service Interface
        serviceInterface: `
public interface {ServiceName}Service {
    {EntityName}DTO findById(Long id);
    Page<{EntityName}DTO> findAll(Pageable pageable);
    {EntityName}DTO create(Create{EntityName}Request request);
    {EntityName}DTO update(Long id, Update{EntityName}Request request);
    void delete(Long id);
}`,
        // Service Implementation
        serviceImplementation: `
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class {ServiceName}ServiceImpl implements {ServiceName}Service {
    private final {EntityName}Repository repository;
    private final {EntityName}Mapper mapper;

    @Override
    public {EntityName}DTO findById(Long id) {
        // Interface only - no implementation
    }

    @Override
    @Transactional
    public {EntityName}DTO create(Create{EntityName}Request request) {
        // Interface only - no implementation
    }
}`,
        // Controller
        controller: `
@RestController
@RequestMapping("/api/v1/{entities}")
@RequiredArgsConstructor
public class {EntityName}Controller {
    private final {ServiceName}Service service;

    @GetMapping("/{id}")
    public ResponseEntity<{EntityName}DTO> getById(@PathVariable Long id) {
        // spec only
    }

    @PostMapping
    public ResponseEntity<{EntityName}DTO> create(
        @Valid @RequestBody Create{EntityName}Request request
    ) {
        // spec only
    }
}`,
        // Entity
        entity: `
@Entity
@Table(name = "{table_name}")
@Getter
@Setter
@NoArgsConstructor
public class {EntityName} {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}`,
        // Repository
        repository: `
@Repository
public interface {EntityName}Repository extends JpaRepository<{EntityName}, Long> {
    Optional<{EntityName}> findByName(String name);
    Page<{EntityName}> findByStatus(String status, Pageable pageable);
}`,
        // Package Structure
        packageStructure: `
com.{company}.{project}/
├── controller/                     # コントローラ層 / Tầng Controller
│   └── {EntityName}Controller.java
├── service/                        # サービス層 / Tầng Service
│   ├── {ServiceName}Service.java   # インターフェース / Interface
│   └── impl/
│       └── {ServiceName}ServiceImpl.java
├── repository/                     # リポジトリ層 / Tầng Repository
│   └── {EntityName}Repository.java
├── domain/                         # ドメインモデル / Model Domain
│   ├── entity/
│   │   └── {EntityName}.java
│   └── valueobject/
├── dto/                            # DTO
│   ├── request/
│   └── response/
└── mapper/                         # マッパー / Mapper
    └── {EntityName}Mapper.java`
      }
    };

    return templates[lang] || templates.java;
  }

  /**
   * Get frontend code templates
   */
  getFrontendTemplates() {
    const framework = this.getFrontendFramework();

    const templates = {
      react18: {
        // Component Interface (React 18 with TypeScript)
        componentInterface: `
interface {ComponentName}Props {
  id: string;                           // ID / ID
  data?: {DataType};                    // データ / Dữ liệu
  loading?: boolean;                    // 読み込み中 / Đang tải
  onSubmit?: (data: {DataType}) => void; // 送信イベント / Sự kiện gửi
  onCancel?: () => void;                // キャンセル / Hủy bỏ
}

export const {ComponentName}: React.FC<{ComponentName}Props> = (props) => {
  // Interface only - no implementation
};`,
        // Hook Interface (React Query)
        hookInterface: `
interface Use{EntityName}Options {
  id?: string;
  enabled?: boolean;
}

interface Use{EntityName}Return {
  data: {EntityName}Dto | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function use{EntityName}(options: Use{EntityName}Options): Use{EntityName}Return {
  // Uses React Query useQuery
  // Interface only
}

export function use{EntityName}Mutation() {
  // Uses React Query useMutation
  // Interface only
}`,
        // API Service
        apiService: `
// API Service using axios/fetch
const API_BASE = '/api';

export const {entityName}Api = {
  getById: (id: string): Promise<{EntityName}Dto> => {
    // GET {API_BASE}/{entities}/{id}
  },
  getAll: (params: PageRequest): Promise<PagedResult<{EntityName}Dto>> => {
    // GET {API_BASE}/{entities}
  },
  create: (data: Create{EntityName}Request): Promise<{EntityName}Dto> => {
    // POST {API_BASE}/{entities}
  },
  update: (id: string, data: Update{EntityName}Request): Promise<{EntityName}Dto> => {
    // PUT {API_BASE}/{entities}/{id}
  },
  delete: (id: string): Promise<void> => {
    // DELETE {API_BASE}/{entities}/{id}
  }
};`,
        // State Management (Context or Redux)
        stateManagement: `
// Using React Context + useReducer
interface {EntityName}State {
  items: {EntityName}Dto[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

type {EntityName}Action =
  | { type: 'SET_ITEMS'; payload: {EntityName}Dto[] }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string };

const {EntityName}Context = React.createContext<{
  state: {EntityName}State;
  dispatch: React.Dispatch<{EntityName}Action>;
} | undefined>(undefined);`,
        // Component Structure
        componentStructure: `
src/
├── components/                      # コンポーネント / Component
│   ├── {FeatureName}/
│   │   ├── {ComponentName}.tsx      # メインコンポーネント / Component chính
│   │   ├── {ComponentName}.test.tsx # テスト / Test
│   │   └── index.ts                 # エクスポート / Export
│   └── common/                      # 共通コンポーネント / Component chung
├── hooks/                           # カスタムフック / Custom hooks
│   └── use{EntityName}.ts
├── services/                        # APIサービス / API services
│   └── {entityName}Api.ts
├── types/                           # 型定義 / Type definitions
│   └── {entityName}.types.ts
└── contexts/                        # コンテキスト / Context
    └── {EntityName}Context.tsx`
      },

      react19: {
        // Server Component (React 19 / Next.js 15)
        serverComponent: `
// Server Component (default in React 19 / Next.js 15)
interface {ComponentName}Props {
  params: { id: string };
}

export default async function {ComponentName}({ params }: {ComponentName}Props) {
  const data = await fetch{EntityName}(params.id);

  return (
    <Suspense fallback={<Loading />}>
      <{ComponentName}Content data={data} />
    </Suspense>
  );
}`,
        // Client Component
        clientComponent: `
'use client';

interface {ComponentName}Props {
  data: {DataType};
  onUpdate?: (data: {DataType}) => void;
}

export function {ComponentName}({ data, onUpdate }: {ComponentName}Props) {
  // Client-side interactivity
  // Interface only
}`,
        // Server Action
        serverAction: `
'use server';

export async function create{EntityName}(formData: FormData) {
  // Server action - runs on server
  // Interface only
}

export async function update{EntityName}(id: string, formData: FormData) {
  // Server action
  // Interface only
}`,
        // Component Structure (App Router)
        componentStructure: `
app/
├── {feature-name}/
│   ├── page.tsx                     # サーバーコンポーネント / Server Component
│   ├── layout.tsx                   # レイアウト / Layout
│   ├── loading.tsx                  # ローディング / Loading
│   ├── error.tsx                    # エラー / Error
│   └── [id]/
│       └── page.tsx                 # 詳細ページ / Detail page
├── components/
│   ├── {ComponentName}.tsx          # クライアントコンポーネント / Client Component
│   └── {ComponentName}Form.tsx
└── actions/
    └── {entityName}Actions.ts       # サーバーアクション / Server Actions`
      }
    };

    return templates[framework] || templates.react18;
  }

  /**
   * Get database-specific templates
   */
  getDatabaseTemplates() {
    const db = this.getDatabase();
    const lang = this.getBackendLanguage();

    const templates = {
      mssql: {
        csharp: {
          dbContext: `
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<{EntityName}> {EntityName}s { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}`,
          connectionString: `"Server={server};Database={database};Trusted_Connection=True;TrustServerCertificate=True;"`,
          migration: `
// Entity Framework Core Migration
public partial class Add{EntityName}Table : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "{TableName}",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(maxLength: 100, nullable: false),
                CreatedAt = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_{TableName}", x => x.Id);
            });
    }
}`
        }
      },
      postgresql: {
        java: {
          datasource: `
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/{database}
    username: {username}
    password: {password}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect`,
          migration: `
-- Flyway Migration: V1__{EntityName}.sql
CREATE TABLE {table_name} (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_{table_name}_name ON {table_name}(name);`
        }
      }
    };

    return templates[db]?.[lang] || {};
  }

  /**
   * Get architecture templates for Basic Design
   */
  getArchitectureTemplates() {
    const lang = this.getBackendLanguage();
    const frontend = this.getFrontendFramework();
    const db = this.getDatabase();

    const templates = {
      csharp: {
        pattern: 'Clean Architecture with CQRS',
        layerDiagram: `
┌──────────────────────────────────────────────────┐
│  Presentation Layer / Tầng giao diện             │
│  React 18 + TypeScript + React Query + Ant Design│
└──────────────────────────────────────────────────┘
                    ↕ REST API (JSON)
┌──────────────────────────────────────────────────┐
│  API Layer / Tầng API                            │
│  ASP.NET Core 8 Web API Controllers             │
└──────────────────────────────────────────────────┘
                    ↕ MediatR Commands/Queries
┌──────────────────────────────────────────────────┐
│  Application Layer / Tầng ứng dụng               │
│  CQRS Handlers + FluentValidation               │
└──────────────────────────────────────────────────┘
                    ↕ Domain Services
┌──────────────────────────────────────────────────┐
│  Domain Layer / Tầng miền                        │
│  Entities + Value Objects + Domain Events       │
└──────────────────────────────────────────────────┘
                    ↕ Repository Interfaces
┌──────────────────────────────────────────────────┐
│  Infrastructure Layer / Tầng hạ tầng             │
│  Entity Framework Core 8 + Repositories         │
└──────────────────────────────────────────────────┘
                    ↕ ADO.NET / EF Core
┌──────────────────────────────────────────────────┐
│  Data Layer / Tầng dữ liệu                       │
│  SQL Server 2022                                │
└──────────────────────────────────────────────────┘`,
        techStackTable: `
| カテゴリ / Category | 技術 / Technology | バージョン / Version | 用途 / Purpose |
|-----------------|---------------|------------------|------------|
| Framework | ASP.NET Core | 8 | Backend Web API |
| Language | C# | 12 | Programming language |
| ORM | Entity Framework Core | 8 | Data access |
| Validation | FluentValidation | 11.x | Request validation |
| Mediator | MediatR | 12.x | CQRS pattern |
| Real-time | SignalR | 8 | WebSocket communication |
| Background Jobs | Hangfire | 1.8.x | Job scheduling |
| Cache | SQL Server Cache | - | Distributed caching |`,
        designPatterns: [
          'Clean Architecture',
          'CQRS (Command Query Responsibility Segregation)',
          'Repository Pattern',
          'Unit of Work',
          'Mediator Pattern',
          'Dependency Injection (Built-in)',
          'Options Pattern'
        ],
        projectStructure: `
{ProjectName}/
├── src/
│   ├── {ProjectName}.Api/                 # API Layer
│   │   ├── Controllers/
│   │   ├── Filters/
│   │   └── Program.cs
│   ├── {ProjectName}.Application/         # Application Layer
│   │   ├── Commands/
│   │   ├── Queries/
│   │   ├── Validators/
│   │   └── DTOs/
│   ├── {ProjectName}.Domain/              # Domain Layer
│   │   ├── Entities/
│   │   ├── ValueObjects/
│   │   ├── Events/
│   │   └── Interfaces/
│   └── {ProjectName}.Infrastructure/      # Infrastructure Layer
│       ├── Data/
│       │   └── ApplicationDbContext.cs
│       ├── Repositories/
│       └── Services/
├── tests/
│   ├── {ProjectName}.UnitTests/
│   └── {ProjectName}.IntegrationTests/
└── frontend/                              # React Frontend
    ├── src/
    │   ├── components/
    │   ├── hooks/
    │   ├── services/
    │   └── pages/
    └── package.json`
      },

      java: {
        pattern: 'Hexagonal Architecture (Ports & Adapters)',
        layerDiagram: `
┌──────────────────────────────────────────────────┐
│  Presentation Layer / Tầng giao diện             │
│  Next.js 15.3.0 + React 19 + TypeScript 5       │
└──────────────────────────────────────────────────┘
                    ↕ REST API / GraphQL
┌──────────────────────────────────────────────────┐
│  Application Layer / Tầng ứng dụng               │
│  Spring Boot 3.4.4 + Java 21                    │
└──────────────────────────────────────────────────┘
                    ↕ JPA/Hibernate
┌──────────────────────────────────────────────────┐
│  Data Layer / Tầng dữ liệu                       │
│  PostgreSQL 14+ + Redis                         │
└──────────────────────────────────────────────────┘`,
        techStackTable: `
| カテゴリ / Category | 技術 / Technology | バージョン / Version | 用途 / Purpose |
|-----------------|---------------|------------------|------------|
| Framework | Spring Boot | 3.4.4 | Backend framework |
| Language | Java | 21 | Programming language |
| ORM | Hibernate | 6.x | JPA implementation |
| Cache | Redis | 7.x | Distributed caching |
| Message Queue | Kafka | 3.x | Event streaming |`,
        designPatterns: [
          'Hexagonal Architecture',
          'Repository Pattern',
          'Service Layer Pattern',
          'DTO Pattern',
          'Constructor Injection',
          'Factory Pattern'
        ],
        projectStructure: `
com.{company}.{project}/
├── adapter/
│   ├── in/
│   │   └── web/
│   │       └── {EntityName}Controller.java
│   └── out/
│       └── persistence/
│           └── {EntityName}PersistenceAdapter.java
├── application/
│   ├── port/
│   │   ├── in/
│   │   │   └── {EntityName}UseCase.java
│   │   └── out/
│   │       └── {EntityName}Port.java
│   └── service/
│       └── {EntityName}Service.java
└── domain/
    └── {EntityName}.java`
      }
    };

    return templates[lang] || templates.java;
  }

  /**
   * Get all templates for current tech stack
   */
  getAllTemplates() {
    return {
      backend: this.getBackendTemplates(),
      frontend: this.getFrontendTemplates(),
      database: this.getDatabaseTemplates(),
      architecture: this.getArchitectureTemplates(),
      metadata: {
        stackId: this.stackId,
        backendLanguage: this.getBackendLanguage(),
        frontendFramework: this.getFrontendFramework(),
        database: this.getDatabase()
      }
    };
  }

  /**
   * Generate code from template with variable substitution
   */
  generateFromTemplate(templateName, variables) {
    const templates = this.getAllTemplates();

    // Find template in backend or frontend
    let template = templates.backend?.[templateName] || templates.frontend?.[templateName];

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Substitute variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      template = template.replace(regex, value);
    }

    return template;
  }
}

// Test if run directly
if (require.main === module) {
  const testTechStack = {
    stackId: 'csharp-react-mssql',
    backend: 'C# 12 + ASP.NET Core 8',
    frontend: 'React 18 + TypeScript + React Query',
    database: 'SQL Server 2022'
  };

  const resolver = new TemplateResolver(testTechStack);

  console.log('=== Template Resolver Test ===');
  console.log(`Backend Language: ${resolver.getBackendLanguage()}`);
  console.log(`Frontend Framework: ${resolver.getFrontendFramework()}`);
  console.log(`Database: ${resolver.getDatabase()}`);
  console.log('');

  console.log('=== Backend Templates ===');
  const backendTemplates = resolver.getBackendTemplates();
  console.log('Available templates:', Object.keys(backendTemplates));
  console.log('');

  console.log('=== Sample Service Interface (C#) ===');
  const serviceCode = resolver.generateFromTemplate('serviceInterface', {
    ServiceName: 'Workflow',
    EntityName: 'Workflow'
  });
  console.log(serviceCode);
}

module.exports = TemplateResolver;
