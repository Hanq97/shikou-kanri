# AWS Integration Specialist

**Role**: AWS Services Integration Expert
**Technology Stack**: AWS SDK for Java v2, Spring Boot
**Integration**: StarX4CRM File Storage, Analytics, Notifications
**Version**: AWS SDK 2.x, Spring Boot 3.4.4, Region: ap-northeast-1

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.s3`, `{rootPackage}.infrastructure.config` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 38.1–38.4 |
| **Source Paths** | `{sourceRoot}/infrastructure/s3/`, `{sourceRoot}/infrastructure/config/` |
| **File Count** | ~5 AWS files |
| **Naming Convention** | `S3*Service.java`, `Aws*Configuration.java` |
| **Base Class** | `S3AsyncClient`, `S3Presigner` |
| **Imports From** | Application (Services) |
| **Cannot Import** | `rest.*`, Domain directly |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **S3AsyncClient**: Non-blocking file upload/download for reactive pipelines
2. **S3Presigner**: Pre-signed URLs for secure client-direct uploads/downloads
3. **QuickSightClient**: Analytics dashboard embedding
4. **Credential Management**: StaticCredentialsProvider, IAM roles, environment variables

---

## Pattern Index

- [Pattern 38.1: S3AsyncClient Configuration](#pattern-381-s3asyncclient-configuration)
- [Pattern 38.2: S3 File Operations](#pattern-382-s3-file-operations)
- [Pattern 38.3: S3Presigner for Pre-signed URLs](#pattern-383-s3presigner-for-pre-signed-urls)
- [Pattern 38.4: QuickSightClient for Dashboard Embedding](#pattern-384-quicksightclient-for-dashboard-embedding)

---

## Pattern 38.1: S3AsyncClient Configuration

**Use Case**: Configure AWS S3 async client with region and credentials from environment/config.

```java
// config/AwsConfig.java
@Configuration
public class AwsConfig {

    @Value("${aws.region:ap-northeast-1}")
    private String region;

    @Value("${aws.access-key-id:}")
    private String accessKeyId;

    @Value("${aws.secret-access-key:}")
    private String secretAccessKey;

    @Bean
    public S3AsyncClient s3AsyncClient() {
        var builder = S3AsyncClient.builder()
            .region(Region.of(region))
            .httpClientBuilder(NettyNioAsyncHttpClient.builder()
                .maxConcurrency(100)
                .connectionTimeout(Duration.ofSeconds(10)));

        if (!accessKeyId.isEmpty()) {
            // Explicit credentials (local dev / non-IAM environments)
            builder.credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            ));
        } else {
            // IAM role / EC2 instance profile / EKS pod identity (production)
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        var builder = S3Presigner.builder().region(Region.of(region));

        if (!accessKeyId.isEmpty()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            ));
        }

        return builder.build();
    }

    @Bean
    public QuickSightClient quickSightClient() {
        return QuickSightClient.builder()
            .region(Region.of(region))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build();
    }
}
```

---

## Pattern 38.2: S3 File Operations

**Use Case**: Async upload and download for CRM attachments and exports.

```java
// storage/S3StorageService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class S3StorageService {

    private final S3AsyncClient s3Client;

    @Value("${aws.s3.bucket}")
    private String bucket;

    /**
     * Upload file content as byte array. Returns S3 key.
     * Path format: {tenantId}/attachments/{entityType}/{entityId}/{fileName}
     */
    public Mono<String> upload(String tenantId, String entityType, String entityId,
                                String fileName, byte[] content, String contentType) {
        String key = buildKey(tenantId, entityType, entityId, fileName);

        var request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .contentLength((long) content.length)
            .serverSideEncryption(ServerSideEncryption.AES256)
            .build();

        return Mono.fromFuture(
            s3Client.putObject(request, AsyncRequestBody.fromBytes(content))
        )
        .doOnNext(response -> log.debug("Uploaded to S3: key={}, versionId={}", key,
            response.versionId()))
        .thenReturn(key)
        .onErrorMap(ex -> new StorageException("S3 upload failed: " + key, ex));
    }

    /**
     * Download file content as byte array.
     */
    public Mono<byte[]> download(String key) {
        var request = GetObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build();

        return Mono.fromFuture(
            s3Client.getObject(request, AsyncResponseTransformer.toBytes())
        )
        .map(ResponseBytes::asByteArray)
        .onErrorMap(NoSuchKeyException.class, ex ->
            new FileNotFoundException("S3 object not found: " + key));
    }

    /**
     * Delete file from S3.
     */
    public Mono<Void> delete(String key) {
        var request = DeleteObjectRequest.builder().bucket(bucket).key(key).build();
        return Mono.fromFuture(s3Client.deleteObject(request)).then();
    }

    private String buildKey(String tenantId, String entityType, String entityId, String fileName) {
        return String.format("%s/attachments/%s/%s/%s", tenantId, entityType, entityId, fileName);
    }
}
```

---

## Pattern 38.3: S3Presigner for Pre-signed URLs

**Use Case**: Generate short-lived signed URLs for client-direct upload/download without streaming through server.

```java
// storage/S3PresignService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class S3PresignService {

    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket}")
    private String bucket;

    /**
     * Generate pre-signed PUT URL for client-direct upload.
     * Client POSTs file directly to S3; server never handles bytes.
     */
    public String generateUploadUrl(String key, String contentType,
                                     Duration expiration) {
        var presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(expiration)
            .putObjectRequest(PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .serverSideEncryption(ServerSideEncryption.AES256)
                .build())
            .build();

        var presignedUrl = s3Presigner.presignPutObject(presignRequest);
        log.debug("Generated upload URL: key={}, expiresIn={}", key, expiration);
        return presignedUrl.url().toString();
    }

    /**
     * Generate pre-signed GET URL for time-limited download access.
     */
    public String generateDownloadUrl(String key, Duration expiration) {
        var presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(expiration)
            .getObjectRequest(GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build())
            .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }
}
```

---

## Pattern 38.4: QuickSightClient for Dashboard Embedding

**Use Case**: Generate QuickSight embed URL for analytics dashboards in CRM UI.

```java
// analytics/QuickSightEmbedService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class QuickSightEmbedService {

    private final QuickSightClient quickSightClient;

    @Value("${aws.quicksight.account-id}")
    private String accountId;

    @Value("${aws.quicksight.namespace:default}")
    private String namespace;

    /**
     * Generate anonymous embed URL for a dashboard.
     * Used for CRM analytics embedded in the frontend.
     */
    public String generateDashboardEmbedUrl(String dashboardId, String tenantId) {
        var request = GenerateEmbedUrlForAnonymousUserRequest.builder()
            .awsAccountId(accountId)
            .namespace(namespace)
            .sessionLifetimeInMinutes(600L)
            .authorizedResourceArns(List.of(
                "arn:aws:quicksight:ap-northeast-1:" + accountId + ":dashboard/" + dashboardId
            ))
            .experienceConfiguration(cfg -> cfg
                .dashboard(dash -> dash.initialDashboardId(dashboardId))
            )
            .sessionTags(List.of(
                SessionTag.builder().key("tenantId").value(tenantId).build()
            ))
            .build();

        var response = quickSightClient.generateEmbedUrlForAnonymousUser(request);
        log.debug("Generated QuickSight embed URL for dashboard={}, tenant={}", dashboardId, tenantId);
        return response.embedUrl();
    }
}
```

---

## Anti-Patterns

- NO using synchronous `S3Client` in reactive pipelines — always use `S3AsyncClient`
- NO storing AWS credentials in source code or application.yml — use environment variables or IAM roles
- NO generating pre-signed URLs without expiration limits (max 7 days for S3)
- NO streaming large files through Spring server — use pre-signed URLs for client-direct upload

---

## Related Specialists

- `workflow/workflow-dag-specialist.md` - FILE node type uses S3AsyncClient
- `application/java-reactive-specialist.md` - Mono.fromFuture() wrapping for async SDK calls
- `multitenancy/multitenancy-specialist.md` - S3 key prefix uses tenantId for isolation
- `security/java-security-specialist.md` - Pre-signed URL generation requires auth check
