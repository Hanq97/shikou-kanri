---
paths:
  - "backend/**/*.java"
  - "backend/**/*.xml"
  - "backend/**/pom.xml"
---
# Java Backend Rules
## Architecture
- Clean Architecture + Hexagonal pattern
- Reactive stack: R2DBC + WebFlux (NOT JPA, NOT Servlet)
- Spring Boot 3.4.4, Java 21
## Naming
- Domain prefix: CmnM*, CmnT*, SfaM*, SfaT*, CtmM*, TntM*
- Controllers: core-manager/ (59) or sfa-manager/ (22)
## Code Generation
- Use EPS framework, NOT JHipster CLI
- Entity → DAO → Repository → Service → Handler → Router
## Module Structure
- common/ (87 entities, shared library)
- core-manager/ (59 controllers, core business)
- sfa-manager/ (22 controllers, SFA)
- gateway/ (API routing, auth)
