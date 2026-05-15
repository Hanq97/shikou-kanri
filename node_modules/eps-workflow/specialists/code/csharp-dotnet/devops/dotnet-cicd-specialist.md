# .NET CI/CD & Docker Specialist — Generic
# .NET CI/CDとDockerスペシャリスト — 汎用
# Chuyen Gia CI/CD & Docker .NET — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: GitHub Actions, Azure DevOps, Docker, NuGet
**Aspect**: DevOps — CI/CD Pipelines, Docker Containerization, Package Publishing
**Purpose**: Consultation agent for /plan and /execute — CI/CD and Docker patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 72.1–72.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | csharp-dotnet-core |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## ROLE

**Your ONLY responsibility**: Enforce CI/CD and containerization standards — pipeline-as-code, build once deploy many, multi-stage Docker builds, non-root containers, NuGet package publishing, format checks, and health checks for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 72.1: GitHub Actions — Build + Test Pipeline
> Source: E1 ci-cd

Pipeline as code. Fast feedback. Never skip tests.

```yaml
# DO — Complete CI pipeline [E1]
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

env:
  DOTNET_VERSION: '10.0.x'
  DOTNET_NOLOGO: true

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_DB: testdb, POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres }
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '${{ env.DOTNET_VERSION }}' }
      - run: dotnet restore
      - run: dotnet build --no-restore --configuration Release
      - run: dotnet format --verify-no-changes --no-restore
      - run: dotnet test --no-build --configuration Release --logger trx
        env:
          ConnectionStrings__Default: "Host=localhost;Database=testdb;Username=postgres;Password=postgres"
```

### Pattern 72.2: Build Once, Deploy Many
> Source: E1 ci-cd

Build artifact once, promote through environments with different configuration.

```yaml
# DON'T — Build per environment [E1]
- run: dotnet publish -c Debug    # for dev
- run: dotnet publish -c Release  # for prod

# DO — Build once, deploy everywhere [E1]
- run: dotnet publish -c Release -o ./publish
# Deploy same ./publish to dev, staging, prod
```

### Pattern 72.3: Multi-Stage Dockerfile
> Source: E1 docker

Separate build (SDK) and runtime (aspnet) stages. Non-root user. Layer caching for NuGet.

```dockerfile
# DO — Multi-stage build [E1]
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first for NuGet cache
COPY ["src/MyApp.Api/MyApp.Api.csproj", "src/MyApp.Api/"]
COPY ["Directory.Build.props", "."]
COPY ["Directory.Packages.props", "."]
RUN dotnet restore "src/MyApp.Api/MyApp.Api.csproj"

COPY . .
RUN dotnet publish "src/MyApp.Api/MyApp.Api.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
USER app
COPY --from=build /app/publish .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["dotnet", "MyApp.Api.dll", "--urls", "http://localhost:8080/health/live"]
ENTRYPOINT ["dotnet", "MyApp.Api.dll"]
```

```dockerfile
# DON'T — SDK image for runtime [E1]
FROM mcr.microsoft.com/dotnet/sdk:10.0  # 900MB+!

# DON'T — Copy everything before restore (breaks layer cache) [E1]
COPY . .
RUN dotnet restore

# DON'T — Run as root [E1]
# Missing: USER app
```

### Pattern 72.4: Docker Compose for Local Dev
> Source: E1 docker

```yaml
# DO — Connection strings via environment, depends_on with health [E1]
services:
  api:
    build: { context: ., dockerfile: src/MyApp.Api/Dockerfile }
    ports: ['5000:8080']
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__Default=Host=postgres;Database=myapp;Username=postgres;Password=postgres
    depends_on:
      postgres: { condition: service_healthy }
```

### Pattern 72.5: Format Check in CI
> Source: E1 ci-cd

Always enforce code style in CI.

```yaml
# DO — Format check [E1]
- run: dotnet format --verify-no-changes --no-restore
```

### Pattern 72.6: NuGet Package Publishing
> Source: E1 ci-cd, E2 package-management

```yaml
# DO — Pack and push on tag [E1]
- run: dotnet pack src/MyLibrary -c Release -o ./nupkg --no-build
- run: dotnet nuget push ./nupkg/*.nupkg --api-key ${{ secrets.NUGET_API_KEY }} --source https://api.nuget.org/v3/index.json
```

```yaml
# DON'T — Secrets in pipeline YAML [E1]
env:
  DB_PASSWORD: "my-secret-password"  # Use ${{ secrets.DB_PASSWORD }}
```

### Pattern 72.7: .dockerignore
> Source: E1 docker

```
# DO — Exclude unnecessary files [E1]
**/.git
**/.vs
**/bin
**/obj
**/node_modules
**/Dockerfile*
**/docker-compose*
**/tests
```

| Scenario | Recommendation |
|----------|---------------|
| Open source | GitHub Actions |
| Enterprise Azure | Azure DevOps Pipelines |
| Docker deployment | Multi-stage build, push to container registry |
| NuGet library | Build -> Test -> Pack -> Push on tag |
| DB migrations in CI | Run in test stage, script for production |
| Environment promotion | Same artifact, different configuration |
| Image size | aspnet runtime image (~200MB), not SDK (~900MB) |

---

*.NET CI/CD & Docker Specialist v1.0 — Generic*
*Sources: E1 docker, E1 ci-cd, E2 package-management*
*Pattern range: 72.1–72.7*
