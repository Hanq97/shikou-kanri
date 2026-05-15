---
memory: project
---
# .NET Core (Clean Architecture) Specialists INDEX
# .NET Core（クリーンアーキテクチャ）スペシャリストINDEX
# .NET Core (Clean Architecture) Specialists INDEX

> **Total**: 27 specialists (9 generic-language + 6 technology + 4 architecture + 8 variant)
> **Stack**: .NET 8+ / ASP.NET Core 8.x | C# 12-14
> **Variants**: simplified-clean, clean-no-repo, clean-cqrs, clean-minimal-api
> **Architecture**: Clean Architecture (all variants)

## Quick Reference: Which Specialist?

| Task | Specialist | Pattern | Layer | Variant |
|------|-----------|---------|-------|---------|
| **A: Language / Framework (Generic)** | | | | |
| C# fundamentals, records, patterns | csharp-fundamentals | 60.x | ALL | ALL |
| Async, channels, concurrency | csharp-concurrency | 61.x | ALL | ALL |
| API design, sealed, CRAP | csharp-code-quality | 62.x | ALL | ALL |
| Minimal APIs, TypedResults | aspnet-apis | 63.x | Presentation | ALL |
| DI, Options, Keyed Services | aspnet-di-configuration | 65.x | Infra+Cross | ALL |
| JWT, auth, OWASP, CORS | aspnet-security | 66.x | Infra+Cross | ALL |
| Polly v8, retry, circuit breaker | aspnet-resilience | 68.x | Infra+Cross | ALL |
| xUnit, WebAppFactory, Testcontainers | dotnet-testing | 67.x | Test | ALL |
| Performance, Span, ValueTask | dotnet-performance | 69.x | ALL | ALL |
| **B: Technology-Specific** | | | | |
| EF Core, DbContext, queries | ef-core | 64.x | Infrastructure | ALL |
| Migrations, scripts, MigrationService | ef-migrations | 64.5x | Infrastructure | ALL |
| N+1, row limits, CQRS data layer | mssql | 64.8x | Infrastructure | ALL |
| Docker, CI/CD, GitHub Actions | dotnet-cicd | 72.x | Infrastructure | ALL |
| Aspire, AppHost, service discovery | dotnet-aspire | 71.x | Infrastructure | ALL |
| SignalR, hubs, real-time | signalr | 14.x | Pres+Infra | ALL |
| **C: Architecture (Clean Architecture)** | | | | |
| Aggregates, value objects, events | domain | 1.x | Domain | ALL (CA) |
| Bounded contexts, DDD advanced | ddd-patterns | 70.x | Domain | ALL (CA) |
| DTO records, explicit mapping | dto-mapper | 5.x | App+Pres | ALL (CA) |
| Project structure, DI registration | infrastructure | 19.x | Infrastructure | ALL (CA) |
| **D: Variant-Specific** | | | | |
| Application services (non-CQRS) | service | 2.x | Application | simplified, no-repo, minimal-api |
| Repository (aggregate persistence) | repository | 3.x | Infrastructure | simplified-clean |
| Controllers (non-Minimal API) | controller | 4.x | Presentation | simplified, no-repo, cqrs |
| Command handlers (MediatR) | command-handler | 10.x | Application | clean-cqrs |
| Query handlers (MediatR) | query-handler | 11.x | Application | clean-cqrs |
| Pipeline behaviors (MediatR) | pipeline-behavior | 12.x | Application | clean-cqrs |
| Minimal API endpoints | endpoint | 15.x | Presentation | clean-minimal-api |
| Endpoint filters | endpoint-filter | 15.5x | Presentation | clean-minimal-api |

## Pattern Number Registry

### Category A: Language / Framework (Generic, ALL variants)
| Range | Specialist | Folder |
|-------|-----------|--------|
| 60.x | csharp-fundamentals | language/ |
| 61.x | csharp-concurrency | language/ |
| 62.x | csharp-code-quality | language/ |
| 63.x | aspnet-apis | aspnet-core/ |
| 65.x | aspnet-di-configuration | aspnet-core/ |
| 66.x | aspnet-security | aspnet-core/ |
| 67.x | dotnet-testing | quality/ |
| 68.x | aspnet-resilience | aspnet-core/ |
| 69.x | dotnet-performance | quality/ |

### Category B: Technology-Specific (Generic, ALL variants)
| Range | Specialist | Folder |
|-------|-----------|--------|
| 64.x | ef-core | data-access/ |
| 64.5x | ef-migrations | data-access/ |
| 64.8x | mssql | data-access/ |
| 71.x | dotnet-aspire | devops/ |
| 72.x | dotnet-cicd | devops/ |
| 14.x | signalr | realtime/ |

### Category C: Architecture (Clean Architecture, ALL variants)
| Range | Specialist | Folder |
|-------|-----------|--------|
| 1.x | domain | domain/ |
| 5.x | dto-mapper | domain/ |
| 19.x | infrastructure | application/ |
| 70.x | ddd-patterns | domain/ |

### Category D: Variant-Specific
| Range | Specialist | Folder | Variant(s) |
|-------|-----------|--------|-----------|
| 2.x | service | application/ | simplified, no-repo, minimal-api |
| 3.x | repository | application/ | simplified-clean |
| 4.x | controller | presentation/ | simplified, no-repo, cqrs |
| 10.x | command-handler | application/ | clean-cqrs |
| 11.x | query-handler | application/ | clean-cqrs |
| 12.x | pipeline-behavior | application/ | clean-cqrs |
| 15.x | endpoint | presentation/ | clean-minimal-api |
| 15.5x | endpoint-filter | presentation/ | clean-minimal-api |

## Source Path → Specialist Lookup

| Source Path Pattern | Primary Specialist | Secondary |
|--------------------|--------------------|-----------|
| `**/Domain/**`, `**/Entities/**` | domain (1.x) | ddd-patterns (70.x) |
| `**/ValueObjects/**` | domain (1.x) | csharp-fundamentals (60.x) |
| `**/Application/Services/**` | service (2.x) | — |
| `**/Application/Commands/**` | command-handler (10.x) | pipeline-behavior (12.x) |
| `**/Application/Queries/**` | query-handler (11.x) | — |
| `**/Repositories/**` | repository (3.x) | ef-core (64.x) |
| `**/Controllers/**` | controller (4.x) | aspnet-apis (63.x) |
| `**/Endpoints/**` | endpoint (15.x) | endpoint-filter (15.5x) |
| `**/Hubs/**` | signalr (14.x) | — |
| `**/Infrastructure/**` | infrastructure (19.x) | aspnet-di-configuration (65.x) |
| `**/Persistence/**`, `**/Data/**` | ef-core (64.x) | ef-migrations (64.5x) |
| `**/Migrations/**` | ef-migrations (64.5x) | — |
| `**/*.Tests/**` | dotnet-testing (67.x) | — |
| `**/DTOs/**`, `**/Responses/**` | dto-mapper (5.x) | — |
| `**/Filters/**` | endpoint-filter (15.5x) | aspnet-security (66.x) |
| `**/Program.cs` | aspnet-apis (63.x) | aspnet-di-configuration (65.x) |
| `**/Dockerfile` | dotnet-cicd (72.x) | — |
| `**/AppHost/**` | dotnet-aspire (71.x) | — |
| `**/.github/workflows/**` | dotnet-cicd (72.x) | — |

## Variant → Specialist Mapping

| Variant | Specialists Loaded |
|---------|--------------------|
| **simplified-clean** | ALL generics (A+B) + ALL arch (C) + service, repository, controller |
| **clean-no-repo** | ALL generics (A+B) + ALL arch (C) + service, controller |
| **clean-cqrs** | ALL generics (A+B) + ALL arch (C) + controller, command-handler, query-handler, pipeline-behavior |
| **clean-minimal-api** | ALL generics (A+B) + ALL arch (C) + service, endpoint, endpoint-filter |

---

*Generated: 2026-03-21*
*.NET Core Specialists v1.0 — 27 files across 9 concern-based folders*
