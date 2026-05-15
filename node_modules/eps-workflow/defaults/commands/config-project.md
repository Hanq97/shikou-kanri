---
description: Configure EPS Framework for project (auto-detect, validate, RAG status)
---

# /config-project Command - Project Configuration v3.0

## Purpose

Configure EPS Framework for the current project with:
1. **Auto-analysis** of project structure, tech stack, and architecture
2. **Interactive validation** with user confirmation
3. **RAG status** display and health check
4. **Configuration update** via unified `project-config.json`

---

## Configuration File Structure (v3.0 — sourceRoots-centric)

The configuration is stored in a single file: `.claude/config/project-config.json`

```json
{
  "projectId": "string",           // REQUIRED — RAG project identification
  "name": "string",                // REQUIRED — Project name (English)
  "nameJa": "string",              // Optional — Japanese name
  "nameVi": "string",              // Optional — Vietnamese name
  "domain": "string",              // REQUIRED — Business domain
  "description": "string",         // Optional — Project description
  "documentsPath": "documents",    // Path to design documents

  "sourceRoots": [                 // REQUIRED — Source code locations (single source of truth)
    {
      "path": "string",            // Filesystem path relative to project root
      "label": "backend|frontend", // Root identifier
      "stackKey": "string",        // Maps to stacks/{stackKey}.json
      "variant": "string",         // Stack variant (e.g., "reactive", "clean-modulith")
      "language": "string",        // Programming language
      "framework": "string",       // Framework name
      "architecture": "string",    // Architecture pattern (normalized key)
      "modules": ["string"],       // Module list
      "patterns": {                // Pattern config (only consumed sub-fields)
        "orm": "string",           // ORM/data access pattern
        "api": "string",           // API pattern
        "uiLibrary": "string"      // UI library (frontend only)
      },
      "conventions": {}            // Naming conventions
    }
  ],

  "infrastructure": {},            // Shared infrastructure (database, cache, messaging, auth)
  "businessModules": {},           // Business module definitions
  "performanceRequirements": {},   // SLA requirements
  "excludeDirs": ["string"]        // Directories to exclude from scanning
}
```

**REMOVED in v3.0** (no consumers):
- `techStack` top-level object — replaced by `sourceRoots[]`
- `stackId` / `variant` top-level — use `sourceRoots[0].stackKey` / `.variant`
- `specialists` — lives in `stacks/{stackKey}.json`
- `testing` top-level — not actively consumed
- `domainMapping` — not actively consumed

---

## Workflow

### Phase 0: Current Configuration Status

**Step 0.1: Load Current Config**

```bash
PROJECT_CONFIG=".claude/config/project-config.json"
```

Display current configuration summary:

```markdown
## Current Project Configuration

| Setting | Value |
|---------|-------|
| **Project** | [name] |
| **Domain** | [domain] |

### Source Roots

| Label | Path | Stack | Variant | Language | Framework |
|-------|------|-------|---------|----------|-----------|
| [sourceRoots[0].label] | [.path] | [.stackKey] | [.variant] | [.language] | [.framework] |
| [sourceRoots[1].label] | [.path] | [.stackKey] | [.variant] | [.language] | [.framework] |
```

**Step 0.2: Check RAG Status**

```bash
RAG_URL=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('.claude/config/hipporag-config.json','utf8')).url)}catch{console.log('http://localhost:8000')}")
curl -s -m 5 ${RAG_URL}/health 2>/dev/null || echo '{"status":"unavailable"}'
```

Display RAG status:

```markdown
## RAG System Status

| Service | URL | Status |
|---------|-----|--------|
| HippoRAG Server | [from config] | [Healthy / Unavailable] |
| Embedding Server | [from config] | [OK / Unavailable] |
```

---

### Phase 1: Auto-Analysis (HUMAN CHECKPOINT 1)

**Step 1.1: Detect Tech Stack**

Analyze project files to detect technology stack. Results go directly into `sourceRoots[]` format:

```pseudo
SET detected = {
  sourceRoots: [],
  infrastructure: {}
}

// ── Java/Spring Boot Detection ──
IF EXISTS "pom.xml" OR EXISTS "build.gradle":
  SET root = { label: "backend", language: "java" }

  IF EXISTS "pom.xml":
    SET pom = READ "pom.xml"
    IF pom CONTAINS "spring-boot":
      root.framework = "spring-boot"
      root.stackKey = "java-spring-boot"

    // Detect variant
    IF pom CONTAINS "spring-boot-starter-webflux" AND pom CONTAINS "r2dbc":
      root.variant = "reactive"
      root.patterns = { orm: "R2DBC", api: "REST" }
    ELSE IF pom CONTAINS "spring-modulith" OR pom CONTAINS "spring-data-jdbc":
      root.variant = "clean-modulith"
      root.patterns = { orm: "spring-data-jdbc", api: "REST" }
    ELSE IF pom CONTAINS "spring-boot-starter-data-jpa":
      root.variant = "standard"
      root.patterns = { orm: "JPA", api: "REST" }
    ELSE:
      root.variant = "standard"

  SET backendModules = LIST_DIRS("backend")
  root.path = "backend"
  root.modules = backendModules
  detected.sourceRoots.push(root)

// ── Node.js/TypeScript Detection ──
IF EXISTS "package.json":
  SET pkg = READ "package.json"

  IF pkg.dependencies HAS "next":
    SET root = {
      label: "frontend",
      language: "typescript",
      framework: "nextjs",
      stackKey: "typescript-nextjs",
      variant: "default",
      patterns: {}
    }

    IF pkg.dependencies HAS "antd":
      root.patterns.uiLibrary = "antd:" + pkg.dependencies["antd"]
    IF pkg.dependencies HAS "@reduxjs/toolkit":
      root.patterns.stateManagement = "redux-toolkit"

    SET frontendPath = FIND_DIR("**/src/app") OR "frontend"
    root.path = frontendPath
    detected.sourceRoots.push(root)

  ELSE IF pkg.dependencies HAS "@nestjs/core":
    detected.sourceRoots.push({
      label: "backend",
      language: "typescript",
      framework: "nestjs",
      stackKey: "typescript-nestjs",
      variant: "default",
      path: "src"
    })

// ── .NET Core Detection ──
IF EXISTS "*.csproj" OR EXISTS "*.sln":
  detected.sourceRoots.push({
    label: "backend",
    language: "csharp",
    framework: "dotnet",
    stackKey: "csharp-aspnet",
    variant: "default",
    path: "src"
  })

// ── Python Detection ──
IF EXISTS "requirements.txt" OR EXISTS "pyproject.toml":
  SET requirements = READ "requirements.txt" OR "pyproject.toml"
  SET fw = "unknown"
  IF requirements CONTAINS "fastapi": fw = "fastapi"
  ELSE IF requirements CONTAINS "django": fw = "django"

  detected.sourceRoots.push({
    label: "backend",
    language: "python",
    framework: fw,
    stackKey: "python-" + fw,
    variant: "default",
    path: "src" OR "app"
  })

// ── Infrastructure Detection (from docker-compose) ──
IF EXISTS "docker-compose.yml":
  SET compose = READ "docker-compose.yml"
  detected.infrastructure = {}

  IF compose CONTAINS "postgres":
    detected.infrastructure.database = { type: "postgresql" }
  IF compose CONTAINS "redis":
    detected.infrastructure.cache = { type: "redis" }
  IF compose CONTAINS "elasticsearch":
    detected.infrastructure.search = { type: "elasticsearch" }
  IF compose CONTAINS "kafka":
    detected.infrastructure.messaging = { type: "kafka" }
  IF compose CONTAINS "keycloak":
    detected.infrastructure.auth = { type: "keycloak" }

// ── Architecture Detection ──
FOR EACH root IN detected.sourceRoots:
  root.architecture = AUTO_DETECT_ARCHITECTURE(root.path)
  // Returns: "clean-architecture", "hexagonal", "layered", "vertical-slices", etc.
```

**Step 1.2: Display Analysis Results**

```markdown
## Auto-Analysis Results

### Detected Source Roots

| Label | Path | Stack | Variant | Language | Framework | Architecture |
|-------|------|-------|---------|----------|-----------|--------------|
| [root.label] | [root.path] | [root.stackKey] | [root.variant] | [root.language] | [root.framework] | [root.architecture] |

### Infrastructure

| Component | Detected |
|-----------|----------|
| Database | [infrastructure.database.type] |
| Cache | [infrastructure.cache.type] |
| Messaging | [infrastructure.messaging.type] |
| Auth | [infrastructure.auth.type] |
```

**Step 1.3: User Confirmation (HUMAN CHECKPOINT)**

```markdown
---

Is this analysis correct?

| Response | Action |
|----------|--------|
| `yes` / `ok` | Proceed with detected values |
| `edit` | Manually adjust detected values |
| `cancel` | Abort configuration |

[WAIT FOR USER RESPONSE]
```

---

### Phase 2: Interactive Configuration (HUMAN CHECKPOINT 2)

**Step 2.1: Validate/Edit Configuration**

If user chose `edit`, display editable configuration:

```markdown
## Edit Configuration

Current values shown below. Reply with changes in format:
`field: new_value` or `sourceRoots[0].field: new_value`

### Project Info
| Field | Current Value |
|-------|---------------|
| `name` | [name] |
| `nameJa` | [nameJa] |
| `domain` | [domain] |
| `description` | [description] |

### Source Root: Backend
| Field | Current Value |
|-------|---------------|
| `sourceRoots[0].path` | [path] |
| `sourceRoots[0].stackKey` | [stackKey] |
| `sourceRoots[0].variant` | [variant] |
| `sourceRoots[0].language` | [language] |
| `sourceRoots[0].framework` | [framework] |
| `sourceRoots[0].architecture` | [architecture] |

### Source Root: Frontend
| Field | Current Value |
|-------|---------------|
| `sourceRoots[1].path` | [path] |
| `sourceRoots[1].stackKey` | [stackKey] |
| `sourceRoots[1].framework` | [framework] |

**Available stackKey values** (maps to stacks/{stackKey}.json):
- `java-spring-boot` — Java + Spring Boot
- `typescript-nextjs` — TypeScript + Next.js
- `csharp-aspnet` — C# + ASP.NET Core
- `python-fastapi` — Python + FastAPI
- `typescript-nestjs` — TypeScript + NestJS

---

Enter changes or `done` to proceed:

[WAIT FOR USER RESPONSE]
```

---

### Phase 3: Apply Configuration

**Step 3.1: Show Final Configuration**

Display the full `project-config.json` that will be written, using the v3.0 schema.
NO `techStack` top-level block. All stack info lives in `sourceRoots[]`.

**Step 3.2: User Confirmation (HUMAN CHECKPOINT)**

```markdown
Apply this configuration?

| Response | Action |
|----------|--------|
| `apply` / `save` | Write configuration file |
| `cancel` | Abort without saving |

[WAIT FOR USER RESPONSE]
```

**Step 3.3: Write Configuration**

Use the Write tool to save `.claude/config/project-config.json`.

---

### Phase 4: Post-Configuration

```markdown
## Configuration Complete

### Summary

| Setting | Value |
|---------|-------|
| **Project** | [name] |

### Source Roots

| Label | Path | Stack | Variant |
|-------|------|-------|---------|
| [label] | [path] | [stackKey] | [variant] |

### Files Updated

- `.claude/config/project-config.json`

**Next Commands:**
- `/scan` — Index source code into RAG
- `/research` — Start new feature research
- `/guide` — View EPS workflow guide
```

---

## Guidelines

**DO:**
- Auto-detect tech stack from project files (pom.xml, package.json, etc.)
- Output detection directly into `sourceRoots[]` format
- Support multi-root detection (backend + frontend as separate roots)
- Show current configuration first
- Display RAG system health
- Wait for user confirmation at checkpoints

**DON'T:**
- Auto-save without user confirmation
- Override existing config without showing diff
- Use deprecated `techStack` top-level block
- Use composite stackKey like `java-nextjs-postgres` (use per-root stackKey)

---

*EPS /config-project Command v3.0*
*Schema: sourceRoots-centric (no techStack top-level)*
*Updated: 2026-03-09*
