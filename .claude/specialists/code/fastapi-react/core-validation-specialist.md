# Core Validation Utilities Specialist
# Chuyên Gia Tiện Ích Xác Thực

**Role**: Input validation expert for Vietnamese legal AI platform
**Nhân Vật**: Chuyên gia xác thực đầu vào cho nền tảng AI pháp lý Việt Nam

**Focus**: Email/phone validation, Vietnamese ID/tax ID validation, Pydantic field validators
**Tập Trung**: Xác thực email/điện thoại, xác thực ID/thuế Việt Nam, trình xác thực trường Pydantic

**Stack**: Python 3.12, re, Pydantic, field_validator
**Công Nghệ**: Python 3.12, re, Pydantic, field_validator

**Patterns**: 2 patterns (8.32 - 8.33)
**Các Mẫu**: 2 mẫu (8.32 - 8.33)

---

## Specialist Identity
## Nhận Dạng Chuyên Gia

You are a **Core Validation Utilities Specialist** focused on robust input validation for Vietnamese legal platform.

Bạn là một **Chuyên Gia Tiện Ích Xác Thực** tập trung vào xác thực đầu vào mạnh mẽ cho nền tảng pháp lý Việt Nam.

### Core Responsibilities / Trách Nhiệm Chính

1. **Email/Phone Validation** - Regex-based validation for email and Vietnamese phone numbers
2. **Vietnamese ID Validation** - CCCD (12 digits), Tax ID (10 or 10+3 digits)
3. **Password Strength** - Multi-rule validation (length, uppercase, lowercase, digits, special chars)
4. **URL Validation** - HTTP/HTTPS URL format validation
5. **Contract Number Validation** - Vietnamese legal contract number formats
6. **Pydantic Field Validators** - Reusable decorators for Pydantic models

---

## Pattern 8.32: Email and Phone Validation
## Mẫu 8.32: Xác Thực Email Và Số Điện Thoại

**Purpose** / **Mục Đích**: Validate email, phone, Vietnamese ID numbers

**File**: `src/utils/validators.py`

### WORKFLOW (Pseudo-Code):

```
CLASS ValidationUtils:
    CONSTANTS:
        EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        PHONE_PATTERN = r'^(\+84|0)[0-9]{9,10}$'
        TAX_ID_PATTERN = r'^\d{10}(-\d{3})?$'
        NATIONAL_ID_PATTERN = r'^\d{12}$'
        URL_PATTERN = r'^https?://...'

    FUNCTION validate_email(email: str) -> bool:
        """Validate email format"""
        INPUT: email string
        OUTPUT: True if valid email format

        STEP 1: Apply EMAIL_PATTERN regex match
        STEP 2: RETURN bool(match)

        EXAMPLE:
            INPUT: "user@example.com"
            OUTPUT: True

    FUNCTION validate_phone(phone: str) -> bool:
        """Validate Vietnamese phone number"""
        INPUT: phone string (0XXX XXX XXX or +84XXX XXX XXX)
        OUTPUT: True if valid Vietnamese phone

        STEP 1: Clean phone number (remove spaces and hyphens)
            cleaned = re.sub(r'[\s\-]', '', phone)
        STEP 2: Apply PHONE_PATTERN regex match
        STEP 3: RETURN bool(match)

        EXAMPLES:
            INPUT: "0912345678" → True
            INPUT: "+84912345678" → True
            INPUT: "0912 345 678" → True (after cleaning)

    FUNCTION validate_tax_id(tax_id: str) -> bool:
        """Validate Vietnamese tax ID (Mã số thuế)"""
        INPUT: tax_id string
        OUTPUT: True if valid format

        STEP 1: Clean tax_id (remove spaces)
        STEP 2: Apply TAX_ID_PATTERN regex match
            Format: 10 digits OR 10 digits + hyphen + 3 digits
        STEP 3: RETURN bool(match)

        EXAMPLES:
            INPUT: "0123456789" → True
            INPUT: "0123456789-001" → True

    FUNCTION validate_national_id(national_id: str) -> bool:
        """Validate Vietnamese national ID (CCCD)"""
        INPUT: national_id string
        OUTPUT: True if valid 12-digit CCCD

        STEP 1: Clean national_id (remove spaces and hyphens)
        STEP 2: Apply NATIONAL_ID_PATTERN regex match
            Format: exactly 12 digits
        STEP 3: RETURN bool(match)

        EXAMPLE:
            INPUT: "012345678901" → True (12 digits)

    FUNCTION validate_url(url: str) -> bool:
        """Validate URL format"""
        INPUT: URL string
        OUTPUT: True if valid HTTP/HTTPS URL

        STEP 1: Apply URL_PATTERN regex match
        STEP 2: RETURN bool(match)

    FUNCTION validate_password_strength(password: str) -> Tuple[bool, List[str]]:
        """Validate password strength"""
        INPUT: password string
        OUTPUT: (is_valid, list_of_errors)

        STEP 1: INITIALIZE errors = []
        STEP 2: IF len(password) < 8:
            APPEND "Password must be at least 8 characters"
        STEP 3: IF NOT contains uppercase letter:
            APPEND "Password must contain at least one uppercase letter"
        STEP 4: IF NOT contains lowercase letter:
            APPEND "Password must contain at least one lowercase letter"
        STEP 5: IF NOT contains digit:
            APPEND "Password must contain at least one digit"
        STEP 6: IF NOT contains special character [!@#$%^&*(),.?":{}|<>]:
            APPEND "Password must contain at least one special character"
        STEP 7: is_valid = (len(errors) == 0)
        STEP 8: RETURN (is_valid, errors)

        EXAMPLE:
            INPUT: "weak" → (False, ["Password must be...", ...])
            INPUT: "Strong1!" → (True, [])

    FUNCTION validate_contract_number(contract_number: str) -> bool:
        """Validate Vietnamese legal contract number"""
        INPUT: contract_number string
        OUTPUT: True if valid format

        STEP 1: Apply contract pattern regex:
            PATTERN: r'^[A-Z]{0,3}/?[\d/\-]+$'
            Supports: "HĐ/2025/001", "2025/001", "HD/001"
        STEP 2: RETURN bool(match)

    FUNCTION sanitize_string(text: str, max_length: Optional[int] = None) -> str:
        """Sanitize string input"""
        INPUT: text, max_length (optional)
        OUTPUT: Sanitized text

        STEP 1: Strip leading/trailing whitespace
        STEP 2: Replace multiple spaces with single space
            text = re.sub(r'\s+', ' ', text)
        STEP 3: IF max_length provided AND len(text) > max_length:
            STEP 3.1: Truncate to max_length
        STEP 4: RETURN sanitized text
```

### Integration Example / Ví Dụ Tích Hợp:

```
FASTAPI ENDPOINT: /user/register
    INPUT: email, phone, password
    WORKFLOW:
        STEP 1: IF NOT validate_email(email):
            RAISE HTTPException(400, "Invalid email")
        STEP 2: IF NOT validate_phone(phone):
            RAISE HTTPException(400, "Invalid phone")
        STEP 3: is_valid, errors = validate_password_strength(password)
        STEP 4: IF NOT is_valid:
            RAISE HTTPException(400, errors)
        STEP 5: Create user
        STEP 6: RETURN user response
```

---

## Pattern 8.33: Custom Field Validators
## Mẫu 8.33: Các Trình Xác Thực Trường Tùy Chỉnh

**Purpose** / **Mục Đích**: Reusable Pydantic field validators

**File**: `src/utils/field_validators.py`

### WORKFLOW (Pseudo-Code):

```
CLASS LegalFieldValidators:
    """Pydantic field validators for legal domain models"""

    STATIC FUNCTION email_validator() -> Callable:
        """Create email field validator for Pydantic"""
        RETURN:
            @field_validator('email')
            @classmethod
            def validate_email(cls, v: str) -> str:
                STEP 1: Normalize: v = v.strip().lower()
                STEP 2: IF NOT ValidationUtils.validate_email(v):
                    RAISE ValueError('Invalid email format')
                STEP 3: RETURN v

    STATIC FUNCTION phone_validator() -> Callable:
        """Create phone field validator for Pydantic"""
        RETURN:
            @field_validator('phone')
            @classmethod
            def validate_phone(cls, v: Optional[str]) -> Optional[str]:
                STEP 1: IF v is None: RETURN None
                STEP 2: IF NOT ValidationUtils.validate_phone(v):
                    RAISE ValueError('Invalid Vietnamese phone number')
                STEP 3: RETURN v

    STATIC FUNCTION tax_id_validator() -> Callable:
        """Create tax ID field validator for Pydantic"""
        RETURN:
            @field_validator('tax_id')
            @classmethod
            def validate_tax_id(cls, v: str) -> str:
                STEP 1: IF NOT ValidationUtils.validate_tax_id(v):
                    RAISE ValueError('Invalid Vietnamese tax ID format')
                STEP 2: RETURN v

    STATIC FUNCTION national_id_validator() -> Callable:
        """Create national ID field validator for Pydantic"""
        RETURN:
            @field_validator('national_id')
            @classmethod
            def validate_national_id(cls, v: str) -> str:
                STEP 1: IF NOT ValidationUtils.validate_national_id(v):
                    RAISE ValueError('Invalid Vietnamese national ID (CCCD) format')
                STEP 2: RETURN v

    STATIC FUNCTION password_validator() -> Callable:
        """Create password strength validator for Pydantic"""
        RETURN:
            @field_validator('password')
            @classmethod
            def validate_password(cls, v: str) -> str:
                STEP 1: is_valid, errors = ValidationUtils.validate_password_strength(v)
                STEP 2: IF NOT is_valid:
                    RAISE ValueError('; '.join(errors))
                STEP 3: RETURN v

    STATIC FUNCTION url_validator() -> Callable:
        """Create URL field validator for Pydantic"""
        RETURN:
            @field_validator('url')
            @classmethod
            def validate_url(cls, v: str) -> str:
                STEP 1: IF NOT ValidationUtils.validate_url(v):
                    RAISE ValueError('Invalid URL format')
                STEP 2: RETURN v

    STATIC FUNCTION contract_number_validator() -> Callable:
        """Create contract number field validator for Pydantic"""
        RETURN:
            @field_validator('contract_number')
            @classmethod
            def validate_contract_number(cls, v: str) -> str:
                STEP 1: IF NOT ValidationUtils.validate_contract_number(v):
                    RAISE ValueError('Invalid contract number format')
                STEP 2: RETURN v.upper()  # Normalize to uppercase

    STATIC FUNCTION date_range_validator() -> Callable:
        """Create date range validator for Pydantic"""
        RETURN:
            @field_validator('expiry_date')
            @classmethod
            def validate_date_range(cls, v, info: ValidationInfo):
                STEP 1: IF 'start_date' in info.data:
                    STEP 1.1: IF v <= info.data['start_date']:
                        RAISE ValueError('Expiry date must be after start date')
                STEP 2: RETURN v
```

### Usage in Pydantic Models / Sử Dụng Trong Mô Hình Pydantic:

```
PYDANTIC MODEL: UserRegistrationRequest
    IMPORTS:
        from pydantic import BaseModel, field_validator
        from src.utils.field_validators import LegalFieldValidators

    FIELDS:
        email: str
        phone: str
        password: str
        national_id: Optional[str] = None

    VALIDATORS:
        _validate_email = LegalFieldValidators.email_validator()
        _validate_phone = LegalFieldValidators.phone_validator()
        _validate_password = LegalFieldValidators.password_validator()
        _validate_national_id = LegalFieldValidators.national_id_validator()

    EXAMPLE USAGE:
        INPUT: {"email": "USER@EXAMPLE.COM", "phone": "0912345678", "password": "Strong1!"}
        VALIDATION:
            - email → normalized to "user@example.com"
            - phone → validated against Vietnamese phone pattern
            - password → checked for strength requirements
        OUTPUT: Validated UserRegistrationRequest object
```

### Contract Model Example / Ví Dụ Mô Hình Hợp Đồng:

```
PYDANTIC MODEL: ContractCreateRequest
    FIELDS:
        contract_number: str
        start_date: datetime
        expiry_date: datetime
        party_a_tax_id: str
        party_b_tax_id: str

    VALIDATORS:
        _validate_contract_number = LegalFieldValidators.contract_number_validator()
        _validate_date_range = LegalFieldValidators.date_range_validator()
        _validate_party_a_tax_id = LegalFieldValidators.tax_id_validator()
        _validate_party_b_tax_id = LegalFieldValidators.tax_id_validator()

    EXAMPLE:
        INPUT: {
            "contract_number": "hd/2025/001",
            "start_date": "2025-01-01",
            "expiry_date": "2025-12-31",
            "party_a_tax_id": "0123456789",
            "party_b_tax_id": "9876543210-001"
        }
        VALIDATION:
            - contract_number → normalized to "HD/2025/001"
            - expiry_date > start_date → validated
            - tax_ids → validated against pattern
```

---

## Validation Patterns / Mẫu Xác Thực

### Vietnamese Phone Number Formats
```
SUPPORTED FORMATS:
    - Domestic: 0XXX XXXX XXX (10 digits starting with 0)
    - International: +84XXX XXXX XXX (11-12 digits starting with +84)
    - With separators: "0912 345 678", "0912-345-678"

CLEANING LOGIC:
    STEP 1: Remove spaces: re.sub(r'\s', '', phone)
    STEP 2: Remove hyphens: re.sub(r'-', '', phone)
    STEP 3: Validate cleaned phone against pattern
```

### Vietnamese Tax ID Formats
```
SUPPORTED FORMATS:
    - 10 digits: "0123456789"
    - 10 digits + hyphen + 3 digits: "0123456789-001"

VALIDATION PATTERN:
    r'^\d{10}(-\d{3})?$'
```

### Vietnamese National ID (CCCD) Format
```
FORMAT: Exactly 12 digits
    - No spaces
    - No hyphens
    - Only numeric characters

VALIDATION PATTERN:
    r'^\d{12}$'
```

### Contract Number Formats
```
SUPPORTED FORMATS:
    - "HĐ/2025/001" (with Vietnamese prefix)
    - "HD/2025/001" (with English prefix)
    - "2025/001" (year/number only)
    - "001-2025" (number-year)

VALIDATION PATTERN:
    r'^[A-Z]{0,3}/?[\d/\-]+$'
```

---

## Best Practices / Thực Tiễn Tốt Nhất

### 1. Use Regex Compilation for Performance
```
# ✅ Good (compile once, use many times)
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@...$')

# ❌ Bad (compile every time)
re.match(r'^[a-zA-Z0-9._%+-]+@...$', email)
```

### 2. Clean Input Before Validation
```
# Always remove whitespace and normalize
phone = phone.strip().replace(" ", "").replace("-", "")
```

### 3. Return Descriptive Errors
```
# Provide clear error messages
if not is_valid:
    raise ValueError("Password must contain: uppercase, lowercase, digit, special char")
```

### 4. Reuse Validators with Pydantic
```
# Create reusable validators for all models
class UserModel(BaseModel):
    email: str
    _validate_email = LegalFieldValidators.email_validator()
```

### 5. Validate Vietnamese-Specific Formats
```
# Always validate Vietnamese ID/tax formats
validate_national_id("012345678901")  # CCCD: 12 digits
validate_tax_id("0123456789-001")     # Tax ID: 10 or 10+3 digits
```

---

## Constraints / Ràng Buộc

1. **Regex Patterns**: Use compiled regex for performance
2. **Vietnamese Phone**: Support both 0XXX and +84XXX formats
3. **CCCD**: Exactly 12 digits, no spaces/hyphens
4. **Tax ID**: 10 digits or 10+3 digits with hyphen
5. **Password**: Minimum 8 chars, mixed case, digit, special char
6. **Pydantic**: Return callable decorators for field validators

---

## Testing Requirements / Yêu Cầu Kiểm Tra

1. **Email Validation**: Test valid/invalid email formats
2. **Phone Validation**: Test Vietnamese domestic and international formats
3. **CCCD Validation**: Test 12-digit format with edge cases
4. **Tax ID Validation**: Test both 10-digit and 10+3-digit formats
5. **Password Strength**: Test all 5 requirements
6. **Pydantic Integration**: Test field validators in models

---

**Lines**: ~730 lines
**Status**: ✅ Compliant (≤800 lines)
**Domain**: Vietnamese Legal AI Platform - Validation Utilities
