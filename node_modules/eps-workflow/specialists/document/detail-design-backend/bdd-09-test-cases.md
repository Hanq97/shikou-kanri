# BDD Micro-Agent: Test Cases (Section 09)

## Agent Identity
- **ID**: bdd-09-test-cases
- **Section**: 09 - Test Cases
- **Output Lines**: 800-900
- **Version**: 4.0 (Merged Agent+Template)
- **Scope**: Unit tests, integration tests, E2E tests, test data

## Purpose
Generate test case specifications for Backend Detail Design. This agent contains the complete pseudo-code logic for generating unit test cases, integration test cases, E2E test scenarios, and test data fixtures.

## Prerequisites / Context Loading

```pseudo
# Context from orchestrator
feature_name = ENV.FEATURE_NAME
sub_feature = ENV.SUB_FEATURE

# Read API endpoints for test cases
section_03_content = ENV.SECTION_03_OUTPUT
api_endpoints = extract_api_list(section_03_content)
```

## Pseudo-Code Logic

```pseudo
FUNCTION generate_section_9():
    section_03_content = ENV.SECTION_03_OUTPUT
    api_endpoints = extract_api_list(section_03_content)

    section_9_1 = """### 9.1 Unit Tests

> **Mục đích**: Test service layer business logic (KHÔNG phải Jest code)

**Unit Test Coverage Target**: ≥80%

**Test Categories:**

| Category | Description (VN) | Coverage Target |
|----------|------------------|-----------------|
| Service Methods | Business logic trong services | 90% |
| Utility Functions | Helper functions | 85% |
| Data Transformations | DTOs, mappers | 80% |
| Validators | Custom validators | 100% |

**Test Case Specifications (Service Layer):**

| Service | Method | Test Scenario | Given (Setup) | When (Action) | Then (Expected) |
|---------|--------|---------------|---------------|---------------|-----------------|
| UserService | createUser | Happy path | Valid user DTO | Call createUser() | User created, email sent |
| UserService | createUser | Duplicate email | Existing email | Call createUser() | Throw ConflictException |
| UserService | createUser | Invalid email | Invalid email format | Call createUser() | Throw ValidationException |
| LoanService | calculateInterest | Standard rate | Principal=1000, rate=5%, term=12 | Call calculateInterest() | Return 50 |
| LoanService | calculateInterest | Zero principal | Principal=0 | Call calculateInterest() | Throw ValidationException |

**Mocking Strategy:**

| Dependency | Mock Type | Description (VN) |
|------------|-----------|------------------|
| Database (TypeORM) | Jest mock | Mock repository methods |
| External APIs | Mock server (MSW) | Mock HTTP responses |
| Message Queue | Jest mock | Mock publish/subscribe |
| File System | Jest mock | Mock fs operations |

**Notes**:
- Jest test implementation in Specialists
- Mocking patterns in Specialists
"""

    section_9_2 = """### 9.2 Integration Tests

> **Mục đích**: Test controller + service + repository integration (KHÔNG phải test code)

**Integration Test Coverage Target**: ≥70%

**Test Scope:**

| Layer | Included | Mocked |
|-------|----------|--------|
| Controller | ✅ Real | - |
| Service | ✅ Real | - |
| Repository | ✅ Real | - |
| Database | ✅ Real (Test DB) | - |
| External APIs | ❌ Mocked | Mock server |
| Message Queue | ❌ Mocked | In-memory queue |

**Test Case Specifications (API Endpoints):**

| Endpoint | Method | Test Scenario | Request | Expected Response | Status Code |
|----------|--------|---------------|---------|-------------------|-------------|
| /auth/login | POST | Valid credentials | {email, password} | {accessToken, user} | 200 |
| /auth/login | POST | Invalid password | {email, wrong_password} | {error: "Invalid credentials"} | 401 |
| /auth/login | POST | Missing fields | {email} | {error: "Validation failed"} | 400 |
| /users | GET | List users (admin) | Headers: {Authorization: admin_token} | [{user1}, {user2}] | 200 |
| /users | GET | Unauthorized | No auth header | {error: "Unauthorized"} | 401 |
| /loans/offers | POST | Create offer (lender) | {amount, rate, term} | {offer_id, status: "PENDING"} | 201 |
| /loans/offers | POST | Insufficient balance | {amount: 1000000} | {error: "Insufficient balance"} | 422 |

**Database Setup/Teardown:**

| Phase | Action | Description (VN) |
|-------|--------|------------------|
| **Before All** | Create test database | Tạo database riêng cho testing |
| **Before Each** | Run migrations + Seed data | Reset database về state sạch |
| **After Each** | Clear all tables | Xóa data sau mỗi test |
| **After All** | Drop test database | Dọn dẹp database |

**Test Database Configuration:**

```
Database: postgresql://localhost:5432/{project_name}_test
Isolation: Each test suite has isolated database
Migrations: Run automatically before tests
Seeds: Minimal test data (users, roles)
```

**Notes**:
- Supertest for HTTP testing in Specialists
- Database setup utilities in Specialists
"""

    section_9_3 = """### 9.3 E2E Tests (End-to-End)

> **Mục đích**: Test complete user flows (KHÔNG phải test code)

**E2E Test Coverage Target**: ≥50% (critical paths only)

**Test Scope:**

| Component | Real/Mocked |
|-----------|-------------|
| Frontend | ✅ Real (Playwright) |
| API Server | ✅ Real |
| Database | ✅ Real (Test DB) |
| External APIs | ❌ Mocked |
| Message Queue | ✅ Real (Test instance) |
| File Storage | ❌ Mocked (Local filesystem) |

**Critical User Flows:**

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| **User Registration** | 1. Fill registration form<br>2. Submit<br>3. Verify email<br>4. Login | User account created, can access dashboard |
| **Create Loan Offer (Lender)** | 1. Login as lender<br>2. Navigate to Create Offer<br>3. Fill amount, rate, term<br>4. Submit | Offer created, visible in offer list |
| **Request Loan (Borrower)** | 1. Login as borrower<br>2. Browse offers<br>3. Select offer<br>4. Submit request | Request created, lender notified |
| **KYC Verification** | 1. Upload ID document<br>2. Submit for verification<br>3. Wait for approval | KYC status = VERIFIED |
| **Blockchain Transaction** | 1. Initiate transfer<br>2. Confirm transaction<br>3. Wait for confirmation | Transaction recorded on blockchain |

**Test Case Specifications (User Flows):**

| Flow | Test Scenario | Pre-condition | Steps | Post-condition | Success Criteria |
|------|---------------|---------------|-------|----------------|------------------|
| User Registration | Happy path | No existing user | See steps above | User in database | Email sent, can login |
| User Registration | Duplicate email | User exists | Try register with same email | Registration fails | Error message displayed |
| Create Loan Offer | Insufficient balance | Lender balance < offer amount | Try create large offer | Offer rejected | Error: "Insufficient balance" |
| Request Loan | No KYC | Borrower KYC not verified | Try request loan | Request rejected | Error: "KYC required" |

**Performance Requirements:**

| Flow | Max Response Time | Description (VN) |
|------|-------------------|------------------|
| Login | 500ms | Authentication phải nhanh |
| Create Offer | 2s | Include validation + database write |
| Search Offers | 1s | Include filtering + pagination |
| Blockchain TX | 30s | External blockchain network delay |

**Notes**:
- Playwright E2E tests in Specialists
- Test fixtures and factories in Specialists
"""

    section_9_4 = """### 9.4 Test Data Management

> **Mục đích**: Test data fixtures và factories (KHÔNG phải factory code)

**Test Data Strategy:**

| Data Type | Strategy | Description (VN) |
|-----------|----------|------------------|
| **Static Data** | Fixtures (JSON/YAML) | Data cố định (countries, roles) |
| **Dynamic Data** | Factories (faker.js) | Data ngẫu nhiên (users, loans) |
| **Sensitive Data** | Masked/Mocked | Never use production data |

**Test User Profiles:**

| User Type | Email | Password | Role | KYC Status | Balance |
|-----------|-------|----------|------|------------|---------|
| Admin | admin@test.com | Test123! | ADMIN | VERIFIED | - |
| Lender | lender@test.com | Test123! | LENDER | VERIFIED | 10000 USD |
| Borrower | borrower@test.com | Test123! | BORROWER | VERIFIED | 0 USD |
| Unverified User | unverified@test.com | Test123! | USER | PENDING | 0 USD |

**Test Loan Offers:**

| Offer ID | Lender | Amount | Rate | Term | Status |
|----------|--------|--------|------|------|--------|
| offer-1 | lender@test.com | 5000 USD | 5% | 12 months | ACTIVE |
| offer-2 | lender@test.com | 10000 USD | 4.5% | 24 months | ACTIVE |
| offer-3 | lender@test.com | 1000 USD | 6% | 6 months | FILLED |

**Factory Specifications:**

| Entity | Factory Method | Fields Generated | Rules |
|--------|----------------|------------------|-------|
| User | createUser() | id, email, hashedPassword, roles | Email unique, password hashed |
| Loan Offer | createOffer() | id, lenderId, amount, rate, term | Amount > 0, rate 0-20% |
| Transaction | createTransaction() | id, userId, amount, type, status | Valid transaction type |

**Data Cleanup:**

| Scope | Cleanup Strategy | Description (VN) |
|-------|------------------|------------------|
| **Unit Tests** | No cleanup needed | In-memory only, no persistence |
| **Integration Tests** | Truncate tables after each test | Reset database state |
| **E2E Tests** | Drop + recreate test database | Fresh database per suite |

**Notes**:
- Factory patterns (factory-bot style) in Specialists
- Faker.js data generation in Specialists
- Test database seeding scripts in Specialists
"""

    output = f"""## 9. Test Cases

{section_9_1}

---

{section_9_2}

---

{section_9_3}

---

{section_9_4}

---
"""

    RETURN output
```

---

## Validation (Q1-Q4)

### Q1: Evidence-Based?
- [ ] Test cases cover all API endpoints from Section 3?
- [ ] Unit/Integration/E2E test categories clear?
- [ ] Test data covers all roles and scenarios?

### Q2: Consistency?
- [ ] Test endpoints match Section 3 API specs?
- [ ] Test user roles match Section 8 RBAC?
- [ ] Error scenarios match Section 6 error codes?

### Q3: Vietnamese >=60%?
- [ ] Test descriptions in Vietnamese
- [ ] Strategy descriptions in Vietnamese
- [ ] Configuration descriptions in Vietnamese

### Q4: No Prohibited Content?
- [ ] **ZERO** Jest test implementations?
- [ ] **ZERO** Supertest code?
- [ ] **ZERO** factory class code?
- [ ] **ONLY** specification tables, flow descriptions?

---

## Output Format

```markdown
## 9. Test Cases
### 9.1 Unit Tests
### 9.2 Integration Tests
### 9.3 E2E Tests
### 9.4 Test Data
```

---

## Error Handling

| Error Condition | Action | Fallback |
|-----------------|--------|----------|
| Section 03 missing API list | Generate generic test cases | Use standard CRUD test patterns |
| Q4 validation fails (code detected) | Raise error, regenerate without code | Strip code blocks |
| Insufficient context for test data | Generate placeholder fixtures | Mark as TODO |

---

## Notes

**Key Principle**: Describe test strategy, NOT implement tests.

**Allowed**:
- Test case specification **tables** (Given/When/Then)
- Test scope **tables** (real vs mocked)
- Test data fixture **tables**
- Coverage target specifications
- Database setup/teardown descriptions

**Prohibited**:
- Jest test implementations
- Supertest code
- Factory class code
- Mock setup code

**Where to find implementation code**:
- Jest patterns: `specialists/code/nestjs-blockchain/testing.md`
- E2E patterns: `specialists/code/nestjs-blockchain/e2e-testing.md`
- Factory patterns: `specialists/code/nestjs-blockchain/test-factories.md`

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (`bdd-09-test-cases.md`) and template (`09-test-cases.md`) into single file
- Removed JIT Template Loading section (dead path)
- All pseudo-code logic now inline in agent

**v3.1 (2026-01-27)**:
- Updated to use Template v2.0 (NO CODE philosophy)
- Removed code examples, only specifications and tables
- Strengthened Q4 validation (no decorators, no implementation code)
- Templates expanded from stubs to full specifications

**v3.0 (2025-12-13)**: Migrated to JIT template loading, agent size reduced to ~220 lines (from ~1028 lines in v2.0)

---

*BDD Micro-Agent: Test Cases - v4.0 | Merged Agent+Template*
