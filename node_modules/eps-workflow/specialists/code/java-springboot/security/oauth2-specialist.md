# OAuth2 Provider Specialist

**Role**: OAuth2 Multi-Provider Integration Expert
**Technology Stack**: Spring WebFlux, Spring Security OAuth2 Client, WebClient
**Integration**: StarX4CRM Core-Manager / Gateway OAuth2 flow
**Version**: Spring Boot 3.4.4, Spring Security 6.x

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application + Infrastructure |
| **Package** | `{rootPackage}.application.service.oauth2`, `{rootPackage}.infrastructure.config`, `{rootPackage}.rest` |
| **Maven Module** | `common` + `core-manager` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 39.1–39.4 |
| **Source Paths** | `{sourceRoot}/application/service/oauth2/`, `{sourceRoot}/rest/` |
| **File Count** | ~10 OAuth2 files |
| **Naming Convention** | `OAuth2*Service.java`, `OAuth2*Controller.java`, `*ProviderService.java` |
| **Base Class** | `OAuth2ProviderService` (interface) |
| **Imports From** | Application (Services), Domain (Entities), Infrastructure (Config) |
| **Cannot Import** | N/A (cross-cutting OAuth2 spans layers) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **Service Locator Pattern**: Map<String, OAuth2ProviderService> for multi-provider support
2. **Supported Providers**: Google, Outlook, Gmail, Microsoft (Azure AD)
3. **OAuth2 Flow**: /api/oauth/connect → redirect → /api/oauth/callback → token exchange
4. **Token Management**: Access token storage, refresh token rotation, revocation detection
5. **Reactive Implementation**: All operations return Mono/Flux

---

## Pattern Index

- [Pattern 39.1: OAuth2ProviderService Interface & Service Locator](#pattern-391-oauth2providerservice-interface--service-locator)
- [Pattern 39.2: Google OAuth2 Provider Implementation](#pattern-392-google-oauth2-provider-implementation)
- [Pattern 39.3: OAuth2 Flow Controller (Connect & Callback)](#pattern-393-oauth2-flow-controller-connect--callback)
- [Pattern 39.4: Token Refresh & Revocation Handling](#pattern-394-token-refresh--revocation-handling)

---

## Pattern 39.1: OAuth2ProviderService Interface & Service Locator

**Use Case**: Support multiple OAuth2 providers via a unified interface and bean-name lookup.

```java
// oauth2/OAuth2ProviderService.java
public interface OAuth2ProviderService {

    /**
     * Returns the provider name (used as Map key): "google", "outlook", "gmail", "microsoft"
     */
    String providerName();

    /**
     * Build the OAuth2 authorization redirect URL.
     */
    String buildAuthorizationUrl(String tenantId, String userId, String state);

    /**
     * Exchange authorization code for access + refresh tokens.
     */
    Mono<OAuth2TokenResponse> exchangeCode(String code, String redirectUri);

    /**
     * Refresh access token using refresh token.
     */
    Mono<OAuth2TokenResponse> refreshToken(String refreshToken);

    /**
     * Revoke all tokens for this user/provider connection.
     */
    Mono<Void> revokeToken(String accessToken);
}

// oauth2/OAuth2ProviderRegistry.java
@Component
public class OAuth2ProviderRegistry {

    // Spring injects all OAuth2ProviderService beans
    private final Map<String, OAuth2ProviderService> providers;

    public OAuth2ProviderRegistry(List<OAuth2ProviderService> providerList) {
        this.providers = providerList.stream()
            .collect(Collectors.toMap(
                OAuth2ProviderService::providerName,
                p -> p
            ));
    }

    public OAuth2ProviderService getProvider(String providerName) {
        var provider = providers.get(providerName.toLowerCase());
        if (provider == null) {
            throw new UnsupportedOAuth2ProviderException(
                "Unsupported OAuth2 provider: " + providerName +
                ". Supported: " + providers.keySet()
            );
        }
        return provider;
    }
}
```

---

## Pattern 39.2: Google OAuth2 Provider Implementation

**Use Case**: Google OAuth2 PKCE flow implementation.

```java
// oauth2/provider/GoogleOAuth2ProviderService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleOAuth2ProviderService implements OAuth2ProviderService {

    private final WebClient webClient;

    @Value("${oauth2.google.client-id}")
    private String clientId;

    @Value("${oauth2.google.client-secret}")
    private String clientSecret;

    @Value("${oauth2.google.redirect-uri}")
    private String redirectUri;

    private static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String REVOKE_URL = "https://oauth2.googleapis.com/revoke";
    private static final String SCOPE = "https://www.googleapis.com/auth/gmail.readonly " +
        "https://www.googleapis.com/auth/calendar.readonly " +
        "openid email profile";

    @Override
    public String providerName() { return "google"; }

    @Override
    public String buildAuthorizationUrl(String tenantId, String userId, String state) {
        return UriComponentsBuilder.fromHttpUrl(AUTH_URL)
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("response_type", "code")
            .queryParam("scope", SCOPE)
            .queryParam("access_type", "offline")
            .queryParam("prompt", "consent") // force refresh token issuance
            .queryParam("state", state)      // state = JWT with tenantId+userId for callback
            .build().toUriString();
    }

    @Override
    public Mono<OAuth2TokenResponse> exchangeCode(String code, String callbackRedirectUri) {
        return webClient.post()
            .uri(TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .bodyValue(buildTokenExchangeBody(code, callbackRedirectUri))
            .retrieve()
            .onStatus(status -> status.is4xxClientError(),
                resp -> resp.bodyToMono(String.class)
                    .map(body -> new OAuth2TokenExchangeException("Google token exchange failed: " + body)))
            .bodyToMono(GoogleTokenResponse.class)
            .map(this::toOAuth2TokenResponse);
    }

    @Override
    public Mono<OAuth2TokenResponse> refreshToken(String refreshToken) {
        var body = "client_id=" + clientId +
            "&client_secret=" + clientSecret +
            "&refresh_token=" + refreshToken +
            "&grant_type=refresh_token";

        return webClient.post().uri(TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(GoogleTokenResponse.class)
            .map(this::toOAuth2TokenResponse);
    }

    @Override
    public Mono<Void> revokeToken(String accessToken) {
        return webClient.post()
            .uri(REVOKE_URL + "?token=" + accessToken)
            .retrieve()
            .bodyToMono(Void.class);
    }

    private String buildTokenExchangeBody(String code, String callbackRedirectUri) {
        return "code=" + code +
            "&client_id=" + clientId +
            "&client_secret=" + clientSecret +
            "&redirect_uri=" + callbackRedirectUri +
            "&grant_type=authorization_code";
    }

    private OAuth2TokenResponse toOAuth2TokenResponse(GoogleTokenResponse g) {
        return OAuth2TokenResponse.builder()
            .accessToken(g.getAccessToken())
            .refreshToken(g.getRefreshToken())
            .expiresInSeconds(g.getExpiresIn())
            .tokenType(g.getTokenType())
            .scope(g.getScope())
            .build();
    }
}
```

---

## Pattern 39.3: OAuth2 Flow Controller (Connect & Callback)

**Use Case**: Initiate OAuth2 flow and handle authorization code callback.

```java
// controller/OAuth2Controller.java
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/oauth")
@Slf4j
public class OAuth2Controller {

    private final OAuth2ProviderRegistry providerRegistry;
    private final OAuth2StateService stateService; // generates/validates CSRF state
    private final OAuth2TokenStore tokenStore;

    /**
     * Step 1: Initiate connection
     * GET /api/oauth/connect?provider=google
     * Returns redirect URL for frontend to navigate to.
     */
    @GetMapping("/connect")
    public Mono<RedirectResponse> connect(
            @RequestParam String provider,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        String tenantId = jwt.getClaimAsString("tenantId");

        return stateService.generateState(userId, tenantId, provider)
            .map(state -> {
                var authUrl = providerRegistry.getProvider(provider)
                    .buildAuthorizationUrl(tenantId, userId, state);
                return new RedirectResponse(authUrl);
            });
    }

    /**
     * Step 2: OAuth2 callback from provider
     * GET /api/oauth/callback?code=...&state=...
     */
    @GetMapping("/callback")
    public Mono<OAuth2ConnectResult> callback(
            @RequestParam String code,
            @RequestParam String state) {
        return stateService.validateAndConsumeState(state)
            .flatMap(stateData -> {
                var providerService = providerRegistry.getProvider(stateData.getProvider());
                return providerService.exchangeCode(code, buildRedirectUri())
                    .flatMap(tokens -> tokenStore.store(
                        stateData.getUserId(), stateData.getTenantId(),
                        stateData.getProvider(), tokens
                    ))
                    .thenReturn(OAuth2ConnectResult.success(stateData.getProvider()));
            })
            .onErrorResume(ex -> {
                log.error("OAuth2 callback failed: state={}", state, ex);
                return Mono.just(OAuth2ConnectResult.failed(ex.getMessage()));
            });
    }

    /**
     * Disconnect / revoke tokens
     * DELETE /api/oauth/disconnect?provider=google
     */
    @DeleteMapping("/disconnect")
    public Mono<Void> disconnect(
            @RequestParam String provider,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return tokenStore.getAccessToken(userId, provider)
            .flatMap(token -> providerRegistry.getProvider(provider).revokeToken(token))
            .then(tokenStore.delete(userId, provider));
    }

    private String buildRedirectUri() {
        return "/api/oauth/callback";
    }
}
```

---

## Pattern 39.4: Token Refresh & Revocation Handling

**Use Case**: Transparently refresh expired tokens; detect and handle revocation.

```java
// oauth2/OAuth2TokenRefreshService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2TokenRefreshService {

    private final OAuth2ProviderRegistry providerRegistry;
    private final OAuth2TokenStore tokenStore;

    /**
     * Get a valid access token, refreshing if expired.
     */
    public Mono<String> getValidAccessToken(String userId, String tenantId, String provider) {
        return tokenStore.getTokenData(userId, provider)
            .flatMap(tokenData -> {
                if (!tokenData.isExpired()) {
                    return Mono.just(tokenData.getAccessToken());
                }
                // Token expired — refresh
                return providerRegistry.getProvider(provider)
                    .refreshToken(tokenData.getRefreshToken())
                    .flatMap(newTokens -> tokenStore.updateTokens(userId, provider, newTokens)
                        .thenReturn(newTokens.getAccessToken()))
                    .onErrorResume(OAuth2TokenRevokedException.class, ex -> {
                        log.warn("Token revoked for userId={}, provider={}", userId, provider);
                        return tokenStore.delete(userId, provider)
                            .then(Mono.error(new OAuth2ReconnectRequiredException(provider)));
                    });
            });
    }
}
```

---

## Anti-Patterns

- NO storing OAuth2 tokens in browser cookies — use server-side token store (Redis/DB)
- NO returning access tokens in API responses — clients request data through your API, not directly
- NO reusing state parameter across multiple OAuth2 flows — generate unique state per initiation
- NO skipping refresh token rotation — update stored refresh token after each refresh

---

## Related Specialists

- `cache/cache-specialist.md` - Redis-based token store for short-lived access tokens
- `gateway/gateway-specialist.md` - Gateway extracts JWT and forwards to downstream services
- `security/java-security-specialist.md` - Integration with Spring Security OAuth2 resource server
- `multitenancy/multitenancy-specialist.md` - tenantId in JWT state payload for callback routing
