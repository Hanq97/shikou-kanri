#!/usr/bin/env node
/**
 * Tech Stack Context - Shared utility for stack-aware operations
 *
 * Provides tech stack context for Research, Innovate, and other phases.
 * Handles two scenarios:
 * 1. STACK_DEFINED: Project has chosen a tech stack → focus on that stack
 * 2. STACK_SELECTION: No stack chosen yet → compare all available stacks
 *
 * @version 1.0.0
 * @date 2026-01-04
 */

const StackManager = require('./stack-manager');

class TechStackContext {
  constructor() {
    this.mode = null; // 'STACK_DEFINED' or 'STACK_SELECTION'
    this.techStack = null;
    this.availableStacks = null;
    this.searchKeywords = null;
    this.loaded = false;
  }

  /**
   * Load tech stack context from project-config.json
   */
  async load() {
    if (this.loaded) return this;

    try {
      const sm = new StackManager();
      await sm.loadStacks();
      const defaults = sm.getDefaults();

      if (defaults.stackId && defaults.stackId !== 'unknown') {
        // SCENARIO 1: Tech stack đã chọn
        this.mode = 'STACK_DEFINED';
        const stackConfig = sm.getVariantConfig(defaults.stackId, defaults.variantId);

        this.techStack = {
          stackId: defaults.stackId,
          variantId: defaults.variantId,
          backend: stackConfig.backend,
          frontend: stackConfig.frontend,
          database: stackConfig.database,
          patterns: stackConfig.patterns || {}
        };

        this.searchKeywords = this._generateSearchKeywords();

        console.log(`📦 Tech Stack: ${defaults.stackId} (DEFINED)`);
        console.log(`   Mode: Research/Innovate will focus on this stack`);
      } else {
        // SCENARIO 2: Tech stack chưa chọn
        this.mode = 'STACK_SELECTION';
        this.availableStacks = sm.stacks?.available_stacks || {};

        console.log(`⚠️ Tech Stack: NOT DEFINED`);
        console.log(`   Mode: Research/Innovate will compare available stacks`);
        console.log(`   Available: ${Object.keys(this.availableStacks).join(', ')}`);
      }

      this.loaded = true;
      return this;
    } catch (err) {
      console.warn(`⚠️ Could not load tech stack context: ${err.message}`);
      this.mode = 'STACK_SELECTION';
      this.loaded = true;
      return this;
    }
  }

  /**
   * Generate search keywords based on tech stack
   */
  _generateSearchKeywords() {
    if (!this.techStack) return null;

    const backend = this.techStack.backend || '';
    const frontend = this.techStack.frontend || '';
    const database = this.techStack.database || '';

    // Detect backend language
    let lang = 'unknown';
    if (backend.includes('C#') || backend.includes('ASP.NET')) {
      lang = 'csharp';
    } else if (backend.includes('Java') || backend.includes('Spring')) {
      lang = 'java';
    } else if (backend.includes('Python') || backend.includes('FastAPI')) {
      lang = 'python';
    } else if (backend.includes('NestJS') || backend.includes('Node')) {
      lang = 'nodejs';
    }

    const keywords = {
      csharp: {
        language: 'csharp',
        backend: ['C#', 'ASP.NET Core', '.NET 8', 'Entity Framework Core', 'EF Core'],
        patterns: ['Clean Architecture C#', 'Repository Pattern C#', 'CQRS .NET', 'MediatR'],
        libraries: ['FluentValidation', 'AutoMapper', 'Serilog', 'SignalR'],
        frontend: ['React', 'TypeScript', 'React Query', 'Axios', 'Ant Design'],
        database: ['SQL Server', 'T-SQL', 'EF Core migrations', 'Dapper'],
        package: ['NuGet', 'dotnet add package'],
        testing: ['xUnit', 'NSubstitute', 'FluentAssertions'],
        exclude: ['Spring', 'Java', 'Maven', 'Hibernate', 'JPA', 'Gradle']
      },
      java: {
        language: 'java',
        backend: ['Java', 'Spring Boot', 'Spring Data JPA', 'Hibernate'],
        patterns: ['Hexagonal Architecture', 'Repository Pattern Spring', 'Service Layer'],
        libraries: ['Lombok', 'MapStruct', 'Spring Security'],
        frontend: ['Next.js', 'React 19', 'Server Components', 'Zustand'],
        database: ['PostgreSQL', 'Flyway', 'JPA', 'Liquibase'],
        package: ['Maven', 'Gradle', 'pom.xml'],
        testing: ['JUnit', 'Mockito', 'TestContainers'],
        exclude: ['C#', 'ASP.NET', 'NuGet', 'Entity Framework', '.NET']
      },
      python: {
        language: 'python',
        backend: ['Python', 'FastAPI', 'Pydantic', 'SQLAlchemy'],
        patterns: ['Repository Pattern Python', 'Service Layer Python'],
        libraries: ['LangChain', 'LangGraph', 'Celery', 'Redis'],
        frontend: ['React', 'Next.js', 'TypeScript'],
        database: ['PostgreSQL', 'Alembic', 'asyncpg', 'Neo4j', 'Qdrant'],
        package: ['pip', 'poetry', 'requirements.txt'],
        testing: ['pytest', 'pytest-asyncio', 'httpx'],
        exclude: ['C#', 'Java', 'Spring', 'NuGet', 'Maven']
      },
      nodejs: {
        language: 'nodejs',
        backend: ['Node.js', 'NestJS', 'TypeORM', 'Express'],
        patterns: ['Microservices NestJS', 'Repository Pattern TypeORM'],
        libraries: ['class-validator', 'class-transformer', 'RxJS'],
        frontend: ['React', 'Redux Toolkit', 'Material-UI'],
        database: ['PostgreSQL', 'TypeORM migrations', 'Prisma'],
        package: ['npm', 'yarn', 'package.json'],
        testing: ['Jest', 'supertest', 'e2e testing'],
        exclude: ['C#', 'Java', 'Spring', 'Python', 'Maven', 'NuGet']
      }
    };

    return keywords[lang] || null;
  }

  /**
   * Enhance search query with tech stack context
   */
  enhanceQuery(query) {
    if (this.mode === 'STACK_DEFINED' && this.searchKeywords) {
      // Add primary tech keywords
      const techTerms = this.searchKeywords.backend.slice(0, 2).join(' ');
      return `${query} ${techTerms}`;
    } else if (this.mode === 'STACK_SELECTION') {
      // Add comparison context
      return `${query} comparison best practices`;
    }
    return query;
  }

  /**
   * Get exclusion terms for filtering irrelevant results
   */
  getExclusionTerms() {
    if (this.mode === 'STACK_DEFINED' && this.searchKeywords) {
      return this.searchKeywords.exclude || [];
    }
    return [];
  }

  /**
   * Get context for LLM prompts
   */
  getPromptContext() {
    if (this.mode === 'STACK_DEFINED') {
      return {
        mode: 'STACK_DEFINED',
        instruction: `IMPORTANT: This project uses ${this.techStack.backend} for backend, ${this.techStack.frontend} for frontend, and ${this.techStack.database} for database.

All research, patterns, and suggestions MUST be specific to this tech stack.
DO NOT suggest patterns from other ecosystems (${this.searchKeywords?.exclude?.slice(0, 3).join(', ') || 'other frameworks'}).`,
        techStack: this.techStack,
        keywords: this.searchKeywords
      };
    } else {
      return {
        mode: 'STACK_SELECTION',
        instruction: `This project has NOT yet chosen a tech stack.

Research should COMPARE available options and help the team make an informed decision.
Available stacks: ${Object.keys(this.availableStacks || {}).join(', ')}`,
        availableStacks: this.availableStacks
      };
    }
  }

  /**
   * Filter evidence to match tech stack (for STACK_DEFINED mode)
   */
  filterEvidence(evidenceList) {
    if (this.mode !== 'STACK_DEFINED' || !this.searchKeywords) {
      return evidenceList;
    }

    const exclude = this.searchKeywords.exclude || [];

    return evidenceList.filter(evidence => {
      const content = (evidence.content || evidence.summary || '').toLowerCase();

      // Check if content contains excluded terms
      for (const term of exclude) {
        if (content.includes(term.toLowerCase())) {
          // Check if it's a comparison article (OK to include)
          if (content.includes('vs') || content.includes('comparison')) {
            return true;
          }
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get summary for display
   */
  getSummary() {
    if (this.mode === 'STACK_DEFINED') {
      return {
        status: 'DEFINED',
        stack: this.techStack.stackId,
        backend: this.techStack.backend,
        frontend: this.techStack.frontend,
        database: this.techStack.database,
        searchFocus: this.searchKeywords?.backend?.slice(0, 3) || []
      };
    } else {
      return {
        status: 'NOT_DEFINED',
        availableStacks: Object.keys(this.availableStacks || {}),
        searchFocus: ['comparison', 'best practices', 'pros and cons']
      };
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create TechStackContext singleton
 */
async function getTechStackContext() {
  if (!instance) {
    instance = new TechStackContext();
    await instance.load();
  }
  return instance;
}

/**
 * Reset singleton (for testing)
 */
function resetTechStackContext() {
  instance = null;
}

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('=== Tech Stack Context Test ===\n');

    const ctx = await getTechStackContext();

    console.log('\n--- Summary ---');
    console.log(JSON.stringify(ctx.getSummary(), null, 2));

    console.log('\n--- Query Enhancement ---');
    const original = 'how to implement caching';
    const enhanced = ctx.enhanceQuery(original);
    console.log(`Original: ${original}`);
    console.log(`Enhanced: ${enhanced}`);

    console.log('\n--- Prompt Context ---');
    const promptCtx = ctx.getPromptContext();
    console.log(`Mode: ${promptCtx.mode}`);
    console.log(`Instruction: ${promptCtx.instruction.substring(0, 100)}...`);
  })();
}

module.exports = {
  TechStackContext,
  getTechStackContext,
  resetTechStackContext
};
