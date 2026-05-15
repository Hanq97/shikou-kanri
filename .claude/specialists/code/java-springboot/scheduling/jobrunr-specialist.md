# JobRunr Background Job Specialist

**Role**: Background Job Scheduling Expert
**Technology Stack**: JobRunr 7.4.0, PostgreSQL SQL backend, Spring Boot
**Integration**: StarX4CRM batch-common / core-manager
**Version**: JobRunr 7.4.0, Spring Boot 3.4.4

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (Batch) |
| **Package** | `{rootPackage}.infrastructure.config`, `{rootPackage}.infrastructure.jobs` |
| **Maven Module** | `common` + `batch-*` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 41.1–41.3 |
| **Source Paths** | `{sourceRoot}/infrastructure/config/JobRunrDataSourceConfiguration.java` |
| **File Count** | ~5 JobRunr files |
| **Naming Convention** | `JobRunr*Configuration.java`, `*Job.java` |
| **Base Class** | N/A (JobRunr annotations) |
| **Imports From** | Application (Services) |
| **Cannot Import** | `rest.*`, Domain directly |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **JobRunr Configuration**: Worker pool, poll interval, SQL backend
2. **Job Definition**: @Job annotation, job labels, recurring jobs
3. **Lifecycle Management**: Succeeded deletion (1 day), permanent deletion (7 days)
4. **Dashboard**: Monitoring at port 8000
5. **Tenant-Aware Jobs**: Passing tenantId into job context

---

## Pattern Index

- [Pattern 41.1: JobRunr Configuration](#pattern-411-jobrunr-configuration)
- [Pattern 41.2: Job Definition & Scheduling](#pattern-412-job-definition--scheduling)
- [Pattern 41.3: Tenant-Aware Recurring Jobs](#pattern-413-tenant-aware-recurring-jobs)

---

## Pattern 41.1: JobRunr Configuration

**Use Case**: Configure JobRunr with PostgreSQL backend, 4 workers, and custom table prefix.

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.jobrunr</groupId>
    <artifactId>jobrunr-spring-boot-3-starter</artifactId>
    <version>7.4.0</version>
</dependency>
```

```yaml
# application.yml
org:
  jobrunr:
    background-job-server:
      enabled: true
      worker-count: 4                     # 4 parallel workers
      poll-interval-in-seconds: 15        # check for new jobs every 15s
      delete-succeeded-jobs-after: P1D    # delete succeeded jobs after 1 day
      permanently-delete-deleted-jobs-after: P7D  # permanently purge after 7 days
    job-scheduler:
      enabled: true
    dashboard:
      enabled: true
      port: 8000                          # JobRunr dashboard on port 8000
    database:
      type: sql
      table-prefix: {app-prefix}_jobrunr.   # custom schema prefix
      datasource: dataSource
    jobs:
      default-number-of-retries: 10
      retry-back-off-time-seed: 3        # seconds (exponential backoff base)
```

```java
// config/JobRunrConfig.java
@Configuration
public class JobRunrConfig {

    /**
     * JobRunr uses the primary DataSource automatically via spring-boot-starter.
     * Custom configuration overrides for StorageProvider:
     */
    @Bean
    public StorageProvider storageProvider(DataSource dataSource) {
        var tablePrefix = "{app-prefix}_jobrunr.";
        return SqlStorageProviderFactory
            .using(dataSource, tablePrefix, DatabaseOptions.CREATE);
    }
}
```

**Database schema init** (Flyway migration):
```sql
-- V100__create_jobrunr_schema.sql
CREATE SCHEMA IF NOT EXISTS {app-prefix}_jobrunr;
-- JobRunr creates its own tables within this schema on startup
```

---

## Pattern 41.2: Job Definition & Scheduling

**Use Case**: Define and enqueue background jobs with labels for filtering in dashboard.

```java
// jobs/ReportGenerationJob.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportGenerationJob {

    private final ReportService reportService;
    private final S3StorageService s3StorageService;

    /**
     * Generate tenant monthly sales report.
     * @param tenantId  tenant identifier
     * @param yearMonth e.g. "2026-01"
     */
    @Job(name = "Monthly Sales Report — %1 / %2", retries = 3)
    public void generateMonthlySalesReport(String tenantId, String yearMonth) {
        log.info("START: generateMonthlySalesReport tenantId={}, period={}", tenantId, yearMonth);

        var reportData = reportService.buildMonthlySalesReport(tenantId, yearMonth);
        var bytes = reportService.renderToExcel(reportData);
        var key = tenantId + "/reports/sales/" + yearMonth + "/monthly-report.xlsx";

        s3StorageService.upload(tenantId, "reports", "monthly-sales", yearMonth + "-report.xlsx",
            bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            .block(); // JobRunr jobs are synchronous (not reactive)

        log.info("END: generateMonthlySalesReport tenantId={}, period={}", tenantId, yearMonth);
    }

    /**
     * Send notification email.
     */
    @Job(name = "Notification Email — %1", retries = 5)
    public void sendNotificationEmail(String userId, String templateId, Map<String, String> params) {
        // implementation
    }
}

// service/ReportSchedulingService.java
@Service
@RequiredArgsConstructor
public class ReportSchedulingService {

    private final JobScheduler jobScheduler;

    /**
     * Enqueue a one-time job for immediate execution.
     */
    public JobId enqueueReportGeneration(String tenantId, String yearMonth) {
        return jobScheduler.enqueue(() ->
            reportGenerationJob().generateMonthlySalesReport(tenantId, yearMonth));
    }

    /**
     * Schedule a job for future execution.
     */
    public JobId scheduleReport(String tenantId, String yearMonth, Instant runAt) {
        return jobScheduler.schedule(runAt, () ->
            reportGenerationJob().generateMonthlySalesReport(tenantId, yearMonth));
    }

    /**
     * Delete a pending/scheduled job.
     */
    public void cancelJob(UUID jobId) {
        jobScheduler.delete(jobId);
    }

    private ReportGenerationJob reportGenerationJob() {
        // Method reference requires Spring proxy — use actual bean from context
        throw new UnsupportedOperationException("Use Spring injection, not direct instantiation");
    }
}
```

---

## Pattern 41.3: Tenant-Aware Recurring Jobs

**Use Case**: Register recurring CRON jobs per tenant via JobRunr recurring job API.

```java
// jobs/TenantRecurringJobService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class TenantRecurringJobService {

    private final JobScheduler jobScheduler;
    private final DataSyncJob dataSyncJob;
    private final CleanupJob cleanupJob;

    /**
     * Register all recurring jobs for a newly provisioned tenant.
     * Called from TenantConnectionFactoryReloader when tenant is activated.
     */
    public void registerTenantJobs(String tenantId) {
        // Daily data sync at 02:00 JST (UTC+9 = 17:00 UTC prev day)
        jobScheduler.scheduleRecurrently(
            "data-sync-" + tenantId,              // unique job ID
            CronExpression.create("0 17 * * *"),   // daily 02:00 JST
            () -> dataSyncJob.syncTenantData(tenantId)
        );

        // Weekly cleanup every Sunday at 03:00 JST
        jobScheduler.scheduleRecurrently(
            "cleanup-" + tenantId,
            CronExpression.create("0 18 * * 0"),   // Sunday 03:00 JST
            () -> cleanupJob.cleanupSoftDeleted(tenantId)
        );

        log.info("Registered recurring jobs for tenant: {}", tenantId);
    }

    /**
     * Remove recurring jobs when tenant is suspended/deleted.
     */
    public void deregisterTenantJobs(String tenantId) {
        jobScheduler.delete("data-sync-" + tenantId);
        jobScheduler.delete("cleanup-" + tenantId);
        log.info("Deregistered recurring jobs for tenant: {}", tenantId);
    }
}

// jobs/DataSyncJob.java
@Service
@RequiredArgsConstructor
@Slf4j
public class DataSyncJob {

    private final CustomerRepository customerRepository;

    /**
     * IMPORTANT: JobRunr jobs must be public, non-reactive (no Mono return).
     * Use .block() only in job context (not reactive pipeline).
     */
    @Job(name = "Tenant Data Sync — %1")
    public void syncTenantData(String tenantId) {
        log.info("START: syncTenantData tenantId={}", tenantId);
        // Reactive code must be subscribed synchronously in job context
        customerRepository.findAllByTenantId(tenantId)
            .doOnNext(this::syncCustomer)
            .then()
            .block(Duration.ofMinutes(10));
        log.info("END: syncTenantData tenantId={}", tenantId);
    }

    private void syncCustomer(CmnMCustomer customer) {
        // sync logic
    }
}
```

**Monitoring Dashboard**:
```
JobRunr Dashboard URL: http://{host}:8000
- Jobs tab: queued, scheduled, processing, succeeded, failed
- Recurring Jobs tab: registered cron schedules per tenant
- Servers tab: active worker nodes
```

---

## Anti-Patterns

- NO returning Mono/Flux from job methods — JobRunr is synchronous; use `.block()` carefully
- NO using `ThreadLocal` tenant context in jobs — pass tenantId as explicit parameter
- NO registering duplicate recurring job IDs — always include tenantId in the job ID
- NO running JobRunr dashboard in production without authentication — secure port 8000
- NO setting `delete-succeeded-jobs-after` to zero — keep logs for at least 1 day

---

## Related Specialists

- `multitenancy/multitenancy-specialist.md` - tenantId passed as job parameter (not ThreadLocal)
- `messaging/kafka-specialist.md` - jobs.* Kafka topic triggers job enqueue
- `cloud/aws-specialist.md` - Report jobs upload results to S3
- `workflow/workflow-dag-specialist.md` - JOB_TRIGGER node type calls JobRunr enqueue API
