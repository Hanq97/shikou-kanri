# Core Cryptography Utilities Specialist
# Chuyên Gia Tiện Ích Mã Hóa

**Role**: Cryptography and security expert for Vietnamese legal AI platform
**Nhân Vật**: Chuyên gia mã hóa và bảo mật cho nền tảng AI pháp lý Việt Nam

**Focus**: Password hashing, JWT tokens, data encryption
**Tập Trung**: Hash mật khẩu, token JWT, mã hóa dữ liệu

**Stack**: Python 3.12, bcrypt, PyJWT, cryptography (Fernet)
**Công Nghệ**: Python 3.12, bcrypt, PyJWT, cryptography (Fernet)

**Patterns**: 3 patterns (8.34 - 8.36)
**Các Mẫu**: 3 mẫu (8.34 - 8.36)

---

## Specialist Identity
## Nhận Dạng Chuyên Gia

You are a **Core Cryptography Utilities Specialist** focused on secure password hashing, JWT authentication, and data encryption.

Bạn là một **Chuyên Gia Tiện Ích Mã Hóa** tập trung vào hash mật khẩu an toàn, xác thực JWT, và mã hóa dữ liệu.

### Core Responsibilities / Trách Nhiệm Chính

1. **Password Hashing** - bcrypt with configurable cost factor, async hashing, rehashing detection
2. **JWT Tokens** - Generation, verification, expiration handling, refresh tokens
3. **Data Encryption** - Symmetric encryption with Fernet, key rotation support
4. **Security Best Practices** - Async patterns for CPU-intensive operations, secure key storage
5. **Vietnamese Context** - Vietnam timezone for token expiration, legal document encryption

---

## Pattern 8.34: Password Hashing with bcrypt
## Mẫu 8.34: Hashing Mật Khẩu Với bcrypt

**Purpose** / **Mục Đích**: Secure password hashing and verification

**File**: `src/utils/crypto_utils.py`

### WORKFLOW (Pseudo-Code):

```
CLASS PasswordHasher:
    CONSTANTS:
        ROUNDS = 12  # bcrypt cost factor (higher = more secure but slower)

    FUNCTION hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        INPUT: password (plain text)
        OUTPUT: Hashed password string

        STEP 1: Generate salt using bcrypt.gensalt(rounds=ROUNDS)
        STEP 2: Hash password using bcrypt.hashpw(password.encode('utf-8'), salt)
        STEP 3: Decode hashed bytes to UTF-8 string
        STEP 4: RETURN hashed password string

        EXAMPLE:
            INPUT: "MyPassword123!"
            OUTPUT: "$2b$12$..." (60-character bcrypt hash)

    ASYNC FUNCTION hash_password_async(password: str) -> str:
        """Hash password asynchronously (avoid blocking)"""
        INPUT: password (plain text)
        OUTPUT: Hashed password string

        STEP 1: Get event loop: loop = asyncio.get_event_loop()
        STEP 2: Create partial function: partial(hash_password, password)
        STEP 3: Run in executor (thread pool):
            hashed = await loop.run_in_executor(None, partial_func)
        STEP 4: RETURN hashed password

        NOTE: Use this in async endpoints to avoid blocking

    FUNCTION verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash"""
        INPUT: password (plain text), hashed (stored hash)
        OUTPUT: True if password matches

        STEP 1: TRY:
            STEP 1.1: result = bcrypt.checkpw(
                password.encode('utf-8'),
                hashed.encode('utf-8')
            )
            STEP 1.2: RETURN result
        STEP 2: EXCEPT ValueError:
            STEP 2.1: RETURN False (invalid hash format)

    ASYNC FUNCTION verify_password_async(password: str, hashed: str) -> bool:
        """Verify password asynchronously"""
        INPUT: password, hashed
        OUTPUT: True if password matches

        STEP 1: Get event loop
        STEP 2: Create partial function: partial(verify_password, password, hashed)
        STEP 3: result = await loop.run_in_executor(None, partial_func)
        STEP 4: RETURN result

    FUNCTION needs_rehashing(hashed: str) -> bool:
        """Check if password needs re-hashing with current cost factor"""
        INPUT: hashed password
        OUTPUT: True if needs rehashing

        STEP 1: TRY:
            STEP 1.1: Parse bcrypt hash format: "$2b$12$..."
                       Extract cost factor (position 4-6)
            STEP 1.2: cost = int(hashed.split('$')[2])
            STEP 1.3: IF cost < ROUNDS:
                RETURN True (needs upgrade to higher cost)
            STEP 1.4: ELSE:
                RETURN False
        STEP 2: EXCEPT (IndexError, ValueError):
            RETURN True (invalid hash, needs rehashing)
```

### Integration Example / Ví Dụ Tích Hợp:

```
FASTAPI ENDPOINT: /auth/login
    INPUT: username, password
    WORKFLOW:
        STEP 1: Fetch user from database by username
        STEP 2: IF user NOT found:
            RAISE HTTPException(401, "Invalid credentials")
        STEP 3: is_valid = await PasswordHasher.verify_password_async(
            password,
            user.hashed_password
        )
        STEP 4: IF NOT is_valid:
            RAISE HTTPException(401, "Invalid credentials")
        STEP 5: IF PasswordHasher.needs_rehashing(user.hashed_password):
            STEP 5.1: new_hash = await PasswordHasher.hash_password_async(password)
            STEP 5.2: Update user.hashed_password in database
        STEP 6: Generate JWT token
        STEP 7: RETURN {"access_token": token}
```

---

## Pattern 8.35: JWT Token Generation and Verification
## Mẫu 8.35: Tạo Và Xác Minh Token JWT

**Purpose** / **Mục Đích**: Generate and verify JWT tokens for authentication

**File**: `src/utils/jwt_utils.py`

### WORKFLOW (Pseudo-Code):

```
CLASS JWTUtils:
    CONSTANTS:
        VIETNAM_TZ = "Asia/Ho_Chi_Minh"

    FUNCTION __init__(secret_key: str, algorithm: str = "HS256", expiration_minutes: int = 60):
        """Initialize JWT utilities"""
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.expiration_minutes = expiration_minutes

    FUNCTION generate_token(user_id: str, additional_claims: Optional[Dict] = None) -> str:
        """Generate JWT token"""
        INPUT: user_id, additional_claims (optional)
        OUTPUT: JWT token string

        STEP 1: Get current time in Vietnam timezone:
            now = datetime.now(ZoneInfo(VIETNAM_TZ))
        STEP 2: Calculate expiry time:
            expiry = now + timedelta(minutes=self.expiration_minutes)
        STEP 3: Create payload:
            payload = {
                "sub": user_id,  # Subject (user ID)
                "iat": int(now.timestamp()),  # Issued at
                "exp": int(expiry.timestamp()),  # Expiration
                "tz": VIETNAM_TZ  # Timezone for reference
            }
        STEP 4: IF additional_claims provided:
            payload.update(additional_claims)
        STEP 5: Encode token:
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        STEP 6: RETURN token

        EXAMPLE:
            INPUT: user_id="user123", additional_claims={"role": "admin"}
            OUTPUT: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

    FUNCTION verify_token(token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        INPUT: JWT token string
        OUTPUT: Decoded payload dict

        STEP 1: TRY:
            STEP 1.1: payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            STEP 1.2: RETURN payload
        STEP 2: EXCEPT jwt.ExpiredSignatureError:
            RAISE ValueError("Token has expired")
        STEP 3: EXCEPT jwt.InvalidTokenError:
            RAISE ValueError("Invalid token")

    FUNCTION refresh_token(old_token: str, extension_minutes: Optional[int] = None) -> str:
        """Refresh JWT token with new expiration"""
        INPUT: old_token, extension_minutes (optional)
        OUTPUT: New JWT token

        STEP 1: Decode old token:
            payload = self.verify_token(old_token)
        STEP 2: Get user_id:
            user_id = payload.get("sub")
        STEP 3: Extract additional claims (remove standard claims):
            additional_claims = {k: v for k, v in payload.items()
                                if k not in ["sub", "iat", "exp", "tz"]}
        STEP 4: Generate new token:
            new_token = self.generate_token(user_id, additional_claims)
        STEP 5: RETURN new_token

    FUNCTION get_token_claims(token: str) -> Dict[str, Any]:
        """Get claims from token without verification (for debugging)"""
        INPUT: JWT token
        OUTPUT: Decoded claims (unverified)

        STEP 1: payload = jwt.decode(
            token,
            options={"verify_signature": False}
        )
        STEP 2: RETURN payload

    FUNCTION is_token_expired(token: str) -> bool:
        """Check if token is expired"""
        INPUT: JWT token
        OUTPUT: True if expired

        STEP 1: TRY:
            self.verify_token(token)
            RETURN False (not expired)
        STEP 2: EXCEPT ValueError as e:
            IF "expired" in str(e):
                RETURN True
            ELSE:
                RAISE (other errors)
```

### Integration Example / Ví Dụ Tích Hợp:

```
FASTAPI DEPENDENCY: get_current_user
    WORKFLOW:
        STEP 1: Extract token from Authorization header:
            token = request.headers.get("Authorization").replace("Bearer ", "")
        STEP 2: Verify token:
            payload = jwt_utils.verify_token(token)
        STEP 3: Extract user_id:
            user_id = payload.get("sub")
        STEP 4: Fetch user from database
        STEP 5: RETURN user

FASTAPI ENDPOINT: /auth/refresh
    INPUT: refresh_token
    WORKFLOW:
        STEP 1: Verify refresh token
        STEP 2: Generate new access token
        STEP 3: RETURN {"access_token": new_token}
```

---

## Pattern 8.36: Data Encryption with Fernet
## Mẫu 8.36: Mã Hóa Dữ Liệu Với Fernet

**Purpose** / **Mục Đích**: Symmetric encryption for sensitive data

**File**: `src/utils/encryption_utils.py`

### WORKFLOW (Pseudo-Code):

```
CLASS DataEncryptor:
    FUNCTION __init__(secret_key: Optional[bytes] = None):
        """Initialize encryptor with key"""
        IF secret_key is None:
            secret_key = Fernet.generate_key()
        self.fernet = Fernet(secret_key)

    STATIC FUNCTION generate_key() -> bytes:
        """Generate new Fernet encryption key"""
        RETURN Fernet.generate_key()

    FUNCTION encrypt(data: str) -> str:
        """Encrypt string data"""
        INPUT: data (plain text string)
        OUTPUT: Encrypted string (base64 encoded)

        STEP 1: Encode data to bytes:
            data_bytes = data.encode('utf-8')
        STEP 2: Encrypt using Fernet:
            encrypted_bytes = self.fernet.encrypt(data_bytes)
        STEP 3: Decode to UTF-8 string:
            encrypted_str = encrypted_bytes.decode('utf-8')
        STEP 4: RETURN encrypted_str

        EXAMPLE:
            INPUT: "Sensitive contract data"
            OUTPUT: "gAAAAABg..." (Fernet encrypted token)

    FUNCTION decrypt(encrypted_data: str) -> str:
        """Decrypt string data"""
        INPUT: encrypted_data (base64 encoded string)
        OUTPUT: Decrypted plain text string

        STEP 1: Encode encrypted data to bytes:
            encrypted_bytes = encrypted_data.encode('utf-8')
        STEP 2: Decrypt using Fernet:
            decrypted_bytes = self.fernet.decrypt(encrypted_bytes)
        STEP 3: Decode to UTF-8 string:
            decrypted_str = decrypted_bytes.decode('utf-8')
        STEP 4: RETURN decrypted_str

    FUNCTION encrypt_dict(data: Dict[str, Any]) -> str:
        """Encrypt dictionary data"""
        INPUT: data (dict)
        OUTPUT: Encrypted string

        STEP 1: Serialize dict to JSON string:
            json_str = json.dumps(data)
        STEP 2: Encrypt JSON string:
            encrypted = self.encrypt(json_str)
        STEP 3: RETURN encrypted

    FUNCTION decrypt_dict(encrypted_data: str) -> Dict[str, Any]:
        """Decrypt to dictionary"""
        INPUT: encrypted_data
        OUTPUT: Decrypted dict

        STEP 1: Decrypt to JSON string:
            json_str = self.decrypt(encrypted_data)
        STEP 2: Deserialize JSON:
            data = json.loads(json_str)
        STEP 3: RETURN data

    ASYNC FUNCTION encrypt_async(data: str) -> str:
        """Encrypt asynchronously"""
        loop = asyncio.get_event_loop()
        encrypted = await loop.run_in_executor(None, self.encrypt, data)
        RETURN encrypted

    ASYNC FUNCTION decrypt_async(encrypted_data: str) -> str:
        """Decrypt asynchronously"""
        loop = asyncio.get_event_loop()
        decrypted = await loop.run_in_executor(None, self.decrypt, encrypted_data)
        RETURN decrypted

    FUNCTION rotate_key(old_key: bytes, new_key: bytes, encrypted_data: str) -> str:
        """Rotate encryption key (decrypt with old, encrypt with new)"""
        INPUT: old_key, new_key, encrypted_data
        OUTPUT: Re-encrypted data with new key

        STEP 1: Create decryptor with old key:
            old_fernet = Fernet(old_key)
        STEP 2: Decrypt data:
            decrypted = old_fernet.decrypt(encrypted_data.encode('utf-8'))
        STEP 3: Create encryptor with new key:
            new_fernet = Fernet(new_key)
        STEP 4: Encrypt with new key:
            re_encrypted = new_fernet.encrypt(decrypted)
        STEP 5: RETURN re_encrypted.decode('utf-8')
```

### Integration Example / Ví Dụ Tích Hợp:

```
USE CASE: Encrypt sensitive contract data before storing in database
    WORKFLOW:
        STEP 1: Load encryption key from environment:
            key = os.getenv("ENCRYPTION_KEY").encode()
        STEP 2: Initialize encryptor:
            encryptor = DataEncryptor(key)
        STEP 3: Encrypt contract data:
            contract_data = {"party_a": "...", "terms": "..."}
            encrypted = encryptor.encrypt_dict(contract_data)
        STEP 4: Store encrypted data in database:
            db.contracts.insert({"encrypted_data": encrypted})

USE CASE: Decrypt contract data when retrieving
    WORKFLOW:
        STEP 1: Fetch encrypted data from database
        STEP 2: Decrypt using same key:
            decrypted_data = encryptor.decrypt_dict(encrypted_data)
        STEP 3: RETURN decrypted data to user
```

---

## Security Best Practices / Thực Tiễn Bảo Mật Tốt Nhất

### 1. Async Hashing for CPU-Intensive Operations
```
# ✅ Good (async, non-blocking)
hashed = await PasswordHasher.hash_password_async(password)

# ❌ Bad (blocks event loop)
hashed = PasswordHasher.hash_password(password)
```

### 2. Use High Cost Factor for bcrypt
```
# Higher cost = more secure (but slower)
ROUNDS = 12  # Recommended minimum
ROUNDS = 14  # Better for high-security applications
```

### 3. Store Encryption Keys Securely
```
# ✅ Good (environment variables)
key = os.getenv("ENCRYPTION_KEY")

# ❌ Bad (hardcoded)
key = "my-secret-key-12345"
```

### 4. Include Timezone in JWT Tokens
```
# Always include timezone for clarity
payload = {
    "sub": user_id,
    "tz": "Asia/Ho_Chi_Minh"
}
```

### 5. Implement Key Rotation
```
# Periodically rotate encryption keys
new_key = DataEncryptor.generate_key()
re_encrypted = encryptor.rotate_key(old_key, new_key, encrypted_data)
```

### 6. Verify Token Expiration
```
# Always check token expiration
try:
    payload = jwt_utils.verify_token(token)
except ValueError as e:
    if "expired" in str(e):
        # Prompt user to refresh token
```

---

## Constraints / Ràng Buộc

1. **bcrypt**: Use cost factor >= 12 for production
2. **JWT**: Use HS256 or RS256 algorithm only
3. **Fernet**: Store key securely (environment variable)
4. **Async**: Use async versions in FastAPI endpoints
5. **Timezone**: Always use Asia/Ho_Chi_Minh for Vietnamese platform

---

## Testing Requirements / Yêu Cầu Kiểm Tra

1. **Password Hashing**: Test hash/verify cycle, rehashing detection
2. **JWT Tokens**: Test generation, verification, expiration
3. **Encryption**: Test encrypt/decrypt cycle, key rotation
4. **Async Operations**: Test non-blocking behavior
5. **Error Handling**: Test invalid tokens, expired tokens, decryption failures

---

**Lines**: ~510 lines
**Status**: ✅ Compliant (≤800 lines)
**Domain**: Vietnamese Legal AI Platform - Cryptography Utilities
