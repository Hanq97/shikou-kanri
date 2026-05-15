# Core Utilities Index
# Chỉ Mục Tiện Ích Cốt Lõi

**Created**: 2026-01-03
**Domain**: Vietnamese Legal AI Platform - Core Utilities
**Total Patterns**: 20 patterns (8.26 - 8.45)
**Total Files**: 5 specialist files

---

## Specialist Files Overview
## Tổng Quan Tệp Chuyên Gia

| File | Lines | Patterns | Description |
|------|-------|----------|-------------|
| core-datetime-specialist.md | 428 | 8.26-8.28 | DateTime utilities, timezone handling, Vietnamese calendar |
| core-string-specialist.md | 430 | 8.29-8.31 | String manipulation, slugification, Vietnamese text processing |
| core-validation-specialist.md | 456 | 8.32-8.33 | Input validation, Vietnamese ID/tax validation, Pydantic validators |
| core-crypto-specialist.md | 473 | 8.34-8.36 | Password hashing, JWT tokens, data encryption |
| core-http-logging-specialist.md | 583 | 8.37-8.43 | HTTP utilities, file upload, structured logging, performance tracking |

**Total Lines**: 2,370 lines
**Compliance**: 100% (all files ≤800 lines)

---

## File 1: core-datetime-specialist.md (428 lines)
## Tệp 1: core-datetime-specialist.md (428 dòng)

### Patterns / Mẫu
- **Pattern 8.26**: DateTime Utilities with Timezone Support
- **Pattern 8.27**: Advanced Date Parsing with Validation
- **Pattern 8.28**: Duration Calculator for Legal Documents

### Responsibilities / Trách Nhiệm
1. Timezone Handling (Asia/Ho_Chi_Minh)
2. Date Parsing (Vietnamese formats)
3. Duration Calculation (business days, humanized durations)
4. Vietnamese Localization (legal date strings)

### Key Functions / Hàm Chính
- `now()`, `vietnam_now()`, `to_timezone()`
- `parse_datetime()`, `parse_vietnamese_date()`
- `calculate_duration()`, `add_business_days()`
- `humanize_duration()`, `get_business_days()`

---

## File 2: core-string-specialist.md (430 lines)
## Tệp 2: core-string-specialist.md (430 dòng)

### Patterns / Mẫu
- **Pattern 8.29**: String Utilities and Slugification
- **Pattern 8.30**: Template Rendering
- **Pattern 8.31**: Text Processing and Analysis

### Responsibilities / Trách Nhiệm
1. Slugification (Vietnamese diacritics removal)
2. HTML Sanitization (XSS prevention)
3. Template Rendering (conditional sections, legal contracts)
4. Text Processing (article extraction, Vietnamese analysis)

### Key Functions / Hàm Chính
- `slugify()`, `sanitize_html()`, `truncate()`
- `camel_to_snake()`, `snake_to_camel()`
- `render_simple()`, `render_conditional()`, `render_legal_contract()`
- `extract_articles()`, `extract_parties()`, `extract_amounts()`

---

## File 3: core-validation-specialist.md (456 lines)
## Tệp 3: core-validation-specialist.md (456 dòng)

### Patterns / Mẫu
- **Pattern 8.32**: Email and Phone Validation
- **Pattern 8.33**: Custom Field Validators

### Responsibilities / Trách Nhiệm
1. Email/Phone Validation (Vietnamese phone formats)
2. Vietnamese ID Validation (CCCD: 12 digits)
3. Tax ID Validation (10 or 10+3 digits)
4. Password Strength Validation (multi-rule)
5. Pydantic Field Validators (reusable decorators)

### Key Functions / Hàm Chính
- `validate_email()`, `validate_phone()`
- `validate_national_id()`, `validate_tax_id()`
- `validate_password_strength()`, `validate_contract_number()`
- `LegalFieldValidators.*_validator()` (Pydantic decorators)

### Validation Patterns / Mẫu Xác Thực
- Email: `r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'`
- Phone: `r'^(\+84|0)[0-9]{9,10}$'`
- CCCD: `r'^\d{12}$'`
- Tax ID: `r'^\d{10}(-\d{3})?$'`

---

## File 4: core-crypto-specialist.md (473 lines)
## Tệp 4: core-crypto-specialist.md (473 dòng)

### Patterns / Mẫu
- **Pattern 8.34**: Password Hashing with bcrypt
- **Pattern 8.35**: JWT Token Generation and Verification
- **Pattern 8.36**: Data Encryption with Fernet

### Responsibilities / Trách Nhiệm
1. Password Hashing (bcrypt, cost factor 12)
2. JWT Tokens (generation, verification, refresh)
3. Data Encryption (Fernet symmetric encryption)
4. Async Operations (non-blocking hashing/encryption)

### Key Functions / Hàm Chính
- `hash_password()`, `verify_password()`, `needs_rehashing()`
- `hash_password_async()`, `verify_password_async()`
- `generate_token()`, `verify_token()`, `refresh_token()`
- `encrypt()`, `decrypt()`, `encrypt_dict()`, `decrypt_dict()`
- `rotate_key()` (key rotation support)

### Security Features / Tính Năng Bảo Mật
- bcrypt cost factor: 12 (configurable)
- JWT algorithm: HS256
- Fernet: AES-128 symmetric encryption
- Async support for CPU-intensive operations

---

## File 5: core-http-logging-specialist.md (583 lines)
## Tệp 5: core-http-logging-specialist.md (583 dòng)

### Patterns / Mẫu
- **Pattern 8.37**: File Upload Validation
- **Pattern 8.38**: HTTP Request/Response Utilities
- **Pattern 8.39**: Error Handler Middleware
- **Pattern 8.40**: Structured JSON Logging
- **Pattern 8.41**: Request Tracking Middleware
- **Pattern 8.42**: Performance Metrics Tracker
- **Pattern 8.43**: Testing Utilities

### Responsibilities / Trách Nhiệm
1. File Upload Validation (MIME type, size, extensions)
2. HTTP Response Formatting (success, error, pagination)
3. Error Handling (middleware, exception handlers)
4. Structured Logging (JSON format, context propagation)
5. Request Tracking (unique IDs, duration logging)
6. Performance Metrics (operation timing, slow detection)

### Key Functions / Hàm Chính
- `validate_file()`, `get_mime_type()`, `generate_safe_filename()`
- `success_response()`, `error_response()`, `paginated_response()`
- `error_handler_middleware()`, `setup_error_handlers()`
- `StructuredLogger.info()`, `StructuredLogger.error()`
- `request_tracking_middleware()` (request ID, duration)
- `PerformanceTracker.track_operation()` (context manager)

### Allowed File Types / Loại Tệp Được Phép
- PDF (.pdf)
- Word (.docx, .doc)
- Excel (.xlsx, .xls)
- Text (.txt)
- Max size: 50MB

---

## Pattern Distribution / Phân Phối Mẫu

### DateTime & Calendar (3 patterns)
- 8.26: DateTime with timezone
- 8.27: Date parsing (Vietnamese formats)
- 8.28: Duration calculator

### String Processing (3 patterns)
- 8.29: Slugification & sanitization
- 8.30: Template rendering
- 8.31: Text analysis (legal documents)

### Validation (2 patterns)
- 8.32: Email/phone/ID validation
- 8.33: Pydantic field validators

### Cryptography (3 patterns)
- 8.34: Password hashing (bcrypt)
- 8.35: JWT tokens
- 8.36: Data encryption (Fernet)

### HTTP & Logging (7 patterns)
- 8.37: File upload validation
- 8.38: HTTP utilities
- 8.39: Error handling
- 8.40: Structured logging
- 8.41: Request tracking
- 8.42: Performance metrics
- 8.43: Testing utilities

---

## Vietnamese Legal Platform Context
## Ngữ Cảnh Nền Tảng Pháp Lý Việt Nam

### Timezone / Múi Giờ
- Default: Asia/Ho_Chi_Minh (GMT+7)
- All datetime operations use Vietnam timezone

### Date Formats / Định Dạng Ngày
- Legal format: "dd/mm/yyyy" (e.g., "29/12/2025")
- Vietnamese format: "Ngày {day} tháng {month} năm {year}"
- ISO format: "yyyy-mm-ddTHH:MM:SS"

### Vietnamese IDs / ID Việt Nam
- CCCD (National ID): 12 digits
- Tax ID (Mã số thuế): 10 digits or 10+3 digits
- Phone: 0XXX XXX XXX or +84XXX XXX XXX

### Legal Document Patterns / Mẫu Tài Liệu Pháp Lý
- Articles: "Điều 1", "Điều 2", ...
- Clauses: "Khoản 1", "Khoản 2", ...
- Contract numbers: "HĐ/2025/001", "2025/001"

---

## Integration Points / Điểm Tích Hợp

### 1. FastAPI Endpoints
All specialists integrate with FastAPI:
- DateTime: `/contract/{id}/deadline` (calculate deadlines)
- String: `/document/create` (generate slugs)
- Validation: `/user/register` (validate input)
- Crypto: `/auth/login` (hash/verify passwords, generate tokens)
- HTTP: All endpoints (standardized responses, error handling)

### 2. Pydantic Models
Validation specialists provide field validators:
- `UserRegistrationRequest` (email, phone, password validators)
- `ContractCreateRequest` (contract number, date range validators)

### 3. Middleware
HTTP/Logging specialists provide middleware:
- `error_handler_middleware` (global error handling)
- `request_tracking_middleware` (request IDs, duration)

### 4. Database Operations
Crypto specialists encrypt sensitive data:
- Contract data encryption before storage
- Password hashing before user creation

---

## Dependencies / Phụ Thuộc

### Python Packages
```python
# DateTime
zoneinfo
pytz
datetime

# String
unicodedata
re
html
string

# Validation
re
pydantic

# Cryptography
bcrypt
PyJWT
cryptography

# HTTP & Logging
FastAPI
structlog
python-magic
```

---

## Testing Strategy / Chiến Lược Kiểm Tra

### Unit Tests
- Each function has corresponding test
- Test Vietnamese-specific formats
- Test edge cases (leap years, special characters, etc.)

### Integration Tests
- Test FastAPI endpoints with specialists
- Test Pydantic model validation
- Test middleware integration

### Performance Tests
- Test async operations (hashing, encryption)
- Test large file uploads
- Test high-volume request logging

---

## Migration from Original File
## Di Chuyển Từ Tệp Gốc

### Original File
- **File**: `core-utilities-specialist.md`
- **Size**: 3,353 lines (4.19x over limit)
- **Issue**: LARGEST file in entire codebase

### Split Strategy
```
core-utilities-specialist.md (3,353 lines)
    ↓
├─ core-datetime-specialist.md (428 lines) ✅
├─ core-string-specialist.md (430 lines) ✅
├─ core-validation-specialist.md (456 lines) ✅
├─ core-crypto-specialist.md (473 lines) ✅
└─ core-http-logging-specialist.md (583 lines) ✅

Total: 2,370 lines (5 files, all ≤800 lines)
```

### Benefits
1. **Compliance**: 100% (all files ≤800 lines)
2. **Reduction**: 76% reduction from largest file (3,353 → 583 max)
3. **Modularity**: Each specialist has single responsibility
4. **Maintainability**: Easier to find and update specific utilities
5. **Testability**: Isolated testing for each specialist

---

## Quick Reference / Tham Khảo Nhanh

### Need DateTime utilities?
→ `core-datetime-specialist.md`

### Need String processing?
→ `core-string-specialist.md`

### Need Input validation?
→ `core-validation-specialist.md`

### Need Cryptography?
→ `core-crypto-specialist.md`

### Need HTTP/Logging?
→ `core-http-logging-specialist.md`

---

**Index Status**: ✅ Complete
**Compliance**: 100% (all files ≤800 lines)
**Domain**: Vietnamese Legal AI Platform
**Refactoring**: GROUP_5 Batch 1 Complete
