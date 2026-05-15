# Security Implementation Micro-Agent / セキュリティ実装マイクロエージェント / Micro-Agent Triển khai Bảo mật

**Responsibility / 責任 / Trách nhiệm**: Generate authentication, authorization, encryption, and audit logging specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~100-120 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (security requirements), BD (security architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C6

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Security requirements
2. **SRS File Path** - Security specifications
3. **Basic Design File Path** - Security architecture

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 6. セキュリティ実装 / Triển khai Bảo mật (Security Implementation)

### 6.1 認証サービス / Dịch vụ Xác thực (Authentication Service)

```java
// Traceability: SRS-4.19, BD-5.19
package com.startx4crm.workflow.security.authentication;

/**
 * 認証サービスインターフェース / Giao diện Dịch vụ Xác thực / Authentication Service Interface
 */
public interface AuthenticationService {

    /**
     * 認証 / Xác thực / Authenticate
     */
    AuthenticationResult authenticate(Credentials credentials);

    /**
     * トークン更新 / Làm mới token / Refresh token
     */
    TokenPair refreshToken(String refreshToken);

    /**
     * ログアウト / Đăng xuất / Logout
     */
    void logout(String token);

    /**
     * トークン検証 / Xác thực token / Validate token
     */
    boolean validateToken(String token);
}

/**
 * 認証情報 / Thông tin Xác thực / Credentials
 */
public interface Credentials {
    String getUsername();                      // ユーザー名 / Tên người dùng
    String getPassword();                      // パスワード / Mật khẩu
}

/**
 * 認証結果 / Kết quả Xác thực / Authentication Result
 */
public class AuthenticationResult {
    private boolean success;                   // 成功フラグ / Cờ thành công
    private TokenPair tokens;                  // トークンペア / Cặp token
    private UserPrincipal principal;           // ユーザー情報 / Thông tin người dùng
    private String message;                    // メッセージ / Thông báo
}

/**
 * トークンペア / Cặp Token / Token Pair
 */
public class TokenPair {
    private String accessToken;                // アクセストークン / Access token
    private String refreshToken;               // リフレッシュトークン / Refresh token
    private long expiresIn;                    // 有効期限 / Thời gian hết hạn
}
```

### 6.2 認可サービス / Dịch vụ Phân quyền (Authorization Service)

```java
// Traceability: SRS-4.20, BD-5.20
package com.startx4crm.workflow.security.authorization;

/**
 * 認可サービスインターフェース / Giao diện Dịch vụ Phân quyền / Authorization Service Interface
 */
public interface AuthorizationService {

    /**
     * 権限チェック / Kiểm tra quyền / Check permission
     */
    boolean hasPermission(UserPrincipal user, Permission permission);

    /**
     * リソースアクセスチェック / Kiểm tra truy cập tài nguyên / Check resource access
     */
    boolean canAccess(UserPrincipal user, Resource resource, Action action);

    /**
     * ロールチェック / Kiểm tra vai trò / Check role
     */
    boolean hasRole(UserPrincipal user, String role);

    /**
     * 複数権限チェック / Kiểm tra nhiều quyền / Check multiple permissions
     */
    boolean hasAllPermissions(UserPrincipal user, Permission... permissions);

    boolean hasAnyPermission(UserPrincipal user, Permission... permissions);
}

/**
 * 権限 / Quyền / Permission
 */
public enum Permission {
    WORKFLOW_CREATE,                           // ワークフロー作成 / Tạo workflow
    WORKFLOW_READ,                             // ワークフロー参照 / Đọc workflow
    WORKFLOW_UPDATE,                           // ワークフロー更新 / Cập nhật workflow
    WORKFLOW_DELETE,                           // ワークフロー削除 / Xóa workflow
    WORKFLOW_PUBLISH,                          // ワークフロー公開 / Công bố workflow
    WORKFLOW_APPROVE                           // ワークフロー承認 / Phê duyệt workflow
}

/**
 * アクション / Hành động / Action
 */
public enum Action {
    CREATE,                                    // 作成 / Tạo
    READ,                                      // 参照 / Đọc
    UPDATE,                                    // 更新 / Cập nhật
    DELETE                                     // 削除 / Xóa
}
```

### 6.3 暗号化サービス / Dịch vụ Mã hóa (Encryption Service)

```java
// Traceability: SRS-4.21, BD-5.21
package com.startx4crm.workflow.security.encryption;

/**
 * 暗号化サービスインターフェース / Giao diện Dịch vụ Mã hóa / Encryption Service Interface
 */
public interface EncryptionService {

    /**
     * 暗号化 / Mã hóa / Encrypt
     */
    String encrypt(String plainText);

    /**
     * 復号化 / Giải mã / Decrypt
     */
    String decrypt(String cipherText);

    /**
     * ハッシュ化 / Hash / Hash
     */
    String hash(String input);

    /**
     * パスワードハッシュ化 / Hash mật khẩu / Hash password
     */
    String hashPassword(String password);

    /**
     * パスワード検証 / Xác thực mật khẩu / Verify password
     */
    boolean verifyPassword(String password, String hashedPassword);
}
```

### 6.4 監査ログ / Nhật ký Kiểm toán (Audit Logging)

```java
// Traceability: SRS-4.22, BD-5.22
package com.startx4crm.workflow.security.audit;

/**
 * 監査ログサービス / Dịch vụ Nhật ký Kiểm toán / Audit Log Service
 */
public interface AuditLogService {

    /**
     * 監査ログ記録 / Ghi nhật ký kiểm toán / Log audit event
     */
    void log(AuditEvent event);

    /**
     * 監査ログ検索 / Tìm kiếm nhật ký / Search audit logs
     */
    Page<AuditLog> search(AuditSearchCriteria criteria, Pageable pageable);
}

/**
 * 監査イベント / Sự kiện Kiểm toán / Audit Event
 */
public class AuditEvent {
    private String eventType;                  // イベントタイプ / Loại sự kiện
    private String userId;                     // ユーザーID / ID người dùng
    private String resource;                   // リソース / Tài nguyên
    private String action;                     // アクション / Hành động
    private String ipAddress;                  // IPアドレス / Địa chỉ IP
    private LocalDateTime timestamp;           // タイムスタンプ / Thời gian
    private String details;                    // 詳細 / Chi tiết
}

/**
 * 監査ログ / Nhật ký Kiểm toán / Audit Log
 */
public class AuditLog {
    private Long id;
    private String eventType;
    private String userId;
    private String resource;
    private String action;
    private String ipAddress;
    private LocalDateTime timestamp;
    private String details;
}
```

---

**Checkpoint C6 Validation / チェックポイントC6検証 / Xác thực điểm kiểm tra C6**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Security requirements traced to SRS
2. [ ] Authentication/Authorization interfaces defined
3. [ ] Encryption service specified
4. [ ] Audit logging interface defined
5. [ ] Bilingual format (≥60%)
6. [ ] No implementation logic
7. [ ] Checkpoint C6 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Security Interface Generation*
