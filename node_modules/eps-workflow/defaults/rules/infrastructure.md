---
paths:
  - "docker-compose*.yml"
  - "k8s/**"
  - "*.Dockerfile"
  - "Dockerfile*"
  - ".github/**"
---
# Infrastructure Rules
- PostgreSQL 17, Redis 7.4, Elasticsearch 8.17
- Kafka 3.9, Keycloak 26.x, Consul 1.20
- Docker 27.x, Kubernetes 1.32
- Multi-tenant isolation at DB schema level
