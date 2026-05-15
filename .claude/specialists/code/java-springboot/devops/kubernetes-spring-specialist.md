# Kubernetes Spring Specialist — Generic
# Kubernetes Springスペシャリスト — 汎用
# Chuyên Gia Kubernetes cho Spring — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 96.1–96.5 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `deployment.yaml`, `service.yaml` |
| **Base Class** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Kubernetes deployment for Spring Boot: manifests, ConfigMap/Secret mapping, health probes, Helm charts, and graceful shutdown.

## Patterns

### Pattern 96.1: Deployment Manifest
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # zero-downtime
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/order-service:abc123
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          envFrom:
            - configMapRef:
                name: order-service-config
            - secretRef:
                name: order-service-secrets
```
- Always set resource `requests` AND `limits`
- `maxUnavailable: 0` for zero-downtime rolling updates

### Pattern 96.2: ConfigMap & Secret Mapping
```yaml
# ConfigMap — non-sensitive config
apiVersion: v1
kind: ConfigMap
metadata:
  name: order-service-config
data:
  SPRING_PROFILES_ACTIVE: "prod"
  SERVER_PORT: "8080"
  APP_MAIL_HOST: "smtp.example.com"

# Secret — sensitive config
apiVersion: v1
kind: Secret
metadata:
  name: order-service-secrets
type: Opaque
stringData:
  SPRING_DATASOURCE_PASSWORD: "secret123"
  APP_JWT_SECRET: "jwt-secret-key"
```
```yaml
# application.yml — Spring reads env vars automatically
spring.datasource.password: ${SPRING_DATASOURCE_PASSWORD}
app.jwt.secret: ${APP_JWT_SECRET}
```
- Spring Boot relaxed binding: `APP_MAIL_HOST` → `app.mail.host`
- Prefer volume-mounted secrets over env vars (more secure, auto-rotatable)

### Pattern 96.3: Health Probes
```yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8081  # management port
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8081
  initialDelaySeconds: 10
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8081
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 30  # 30 × 5s = 150s max startup
```
```yaml
# application.yml — separate management port
management:
  server.port: 8081
  endpoint.health.probes.enabled: true
  health.livenessstate.enabled: true
  health.readinesstate.enabled: true
```
- **Liveness**: is the app alive? Restart if fails.
- **Readiness**: is the app ready for traffic? Remove from load balancer if fails.
- **Startup**: is the app still starting? Prevents liveness killing slow starters.

### Pattern 96.4: Helm Chart Structure
```
helm/order-service/
├── Chart.yaml
├── values.yaml         # defaults
├── values-staging.yaml # staging overrides
├── values-prod.yaml    # production overrides
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── ingress.yaml
    └── hpa.yaml        # auto-scaling
```
```yaml
# values.yaml
replicaCount: 2
image:
  repository: registry.example.com/order-service
  tag: latest
resources:
  requests: { cpu: 500m, memory: 512Mi }
  limits: { cpu: 1000m, memory: 1Gi }
```
- One chart per service
- Environment-specific `values-{env}.yaml` for overrides
- `helm upgrade --install order-service ./helm/order-service -f values-prod.yaml`

### Pattern 96.5: Graceful Shutdown
```yaml
# application.yml
server.shutdown: graceful
spring.lifecycle.timeout-per-shutdown-phase: 30s
```
```yaml
# Kubernetes pre-stop hook — give time for load balancer to deregister
lifecycle:
  preStop:
    exec:
      command: ["sh", "-c", "sleep 10"]
terminationGracePeriodSeconds: 60
```
- **Flow**: K8s sends SIGTERM → preStop hook (10s) → Spring graceful shutdown (30s) → SIGKILL
- `preStop sleep` ensures load balancer removes pod from rotation before app shuts down
- `terminationGracePeriodSeconds` > preStop + graceful shutdown timeout

## REJECTED Patterns
- ❌ No resource limits — causes noisy-neighbor issues
- ❌ `latest` tag in production manifests
- ❌ Liveness probe pointing to deep health check (can cause cascade restarts)
- ❌ No preStop hook — causes dropped connections during rollout
- ❌ Hardcoded secrets in manifests — use Kubernetes Secrets or Vault

## Related Specialists
- `infrastructure/docker-specialist.md` — Container build (70.x)
- `infrastructure/monitoring-specialist.md` — Prometheus/Grafana (73.x)
- `devops/ci-cd-patterns-specialist.md` — Pipeline design (95.x)
