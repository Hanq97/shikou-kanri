# gRPC Service Definition Specialist
# gRPCサービス定義スペシャリスト
# Chuyên Gia Định Nghĩa Service gRPC

**Role**: Expert in Protocol Buffers service definitions and proto3 syntax
**Focus**: Proto file structure, gRPC service patterns, message definitions
**Patterns**: 25 service definition patterns
**Stack**: nestjs-blockchain (gRPC)

---

## 🎯 EXPERTISE

This specialist handles:
- Proto3 syntax and file structure
- Service and RPC method definitions
- Message and field type definitions
- Enum patterns with _UNSPECIFIED convention
- Naming conventions (PascalCase services, snake_case fields)
- Package versioning (domain.v1 pattern)

---

## 📋 PATTERNS (25 total)

### Pattern 1: proto3-syntax
**Category**: Core
**Description**: Proto3 syntax declaration (required first line)

```protobuf
syntax = "proto3";

package loan.v1;

// ✅ REQUIRED: Use proto3 (NOT proto2)
// Proto3 simplifies syntax, removes required keyword, improves compatibility
```

---

### Pattern 2: service-definition
**Category**: Service
**Description**: gRPC service declaration with RPC methods

```protobuf
syntax = "proto3";
package loan.v1;

service LoanService {
  // Unary RPC: single request → single response
  rpc CreateLoan(CreateLoanRequest) returns (CreateLoanResponse);

  // Server streaming: single request → stream of responses
  rpc WatchLoanStatus(WatchLoanStatusRequest) returns (stream LoanStatusUpdate);

  // Client streaming: stream of requests → single response
  rpc UploadDocuments(stream DocumentChunk) returns (UploadDocumentsResponse);

  // Bidirectional streaming: stream ↔ stream
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

---

### Pattern 3: rpc-method-definition
**Category**: RPC
**Description**: RPC method patterns (unary, server, client, bidirectional)

```protobuf
service UserService {
  // 1. UNARY (most common)
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
  rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse);
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse);

  // 2. SERVER STREAMING (watch/subscribe patterns)
  rpc WatchUsers(WatchUsersRequest) returns (stream UserEvent);

  // 3. CLIENT STREAMING (bulk upload)
  rpc BulkCreateUsers(stream CreateUserRequest) returns (BulkCreateUsersResponse);

  // 4. BIDIRECTIONAL STREAMING (real-time chat)
  rpc ChatWithSupport(stream ChatMessage) returns (stream ChatMessage);
}
```

---

### Pattern 4: message-definition
**Category**: Message
**Description**: Protocol Buffers message structure

```protobuf
// Request message with multiple fields
message CreateLoanRequest {
  string user_id = 1;
  double amount = 2;
  int32 duration_months = 3;
  LoanType type = 4;
}

// Response message with nested message
message CreateLoanResponse {
  Loan loan = 1;
  string message = 2;
}

// Entity message
message Loan {
  string id = 1;
  string user_id = 2;
  double amount = 3;
  int32 duration_months = 4;
  LoanType type = 5;
  LoanStatus status = 6;
  int64 created_at = 7; // Unix timestamp
  int64 updated_at = 8;
}
```

---

### Pattern 5: field-types-scalar
**Category**: Field Types
**Description**: Proto3 scalar types (string, int, double, bool, bytes)

```protobuf
message UserProfile {
  // String types
  string id = 1;
  string name = 2;
  string email = 3;

  // Numeric types
  int32 age = 4;           // 32-bit integer
  int64 created_at = 5;    // 64-bit integer (timestamps)
  double balance = 6;      // 64-bit float
  float rating = 7;        // 32-bit float

  // Boolean
  bool is_verified = 8;
  bool is_active = 9;

  // Bytes (for binary data)
  bytes avatar = 10;       // Image, files, etc.
}
```

---

### Pattern 6: field-types-complex
**Category**: Field Types
**Description**: Complex types (nested messages, enums, maps)

```protobuf
message Loan {
  string id = 1;

  // Nested message
  User borrower = 2;

  // Enum
  LoanStatus status = 3;

  // Map (key-value pairs)
  map<string, string> metadata = 4;

  // Repeated (array)
  repeated Document documents = 5;
}

message User {
  string id = 1;
  string name = 2;
}

enum LoanStatus {
  LOAN_STATUS_UNSPECIFIED = 0;
  LOAN_STATUS_PENDING = 1;
  LOAN_STATUS_APPROVED = 2;
}
```

---

### Pattern 7: repeated-fields
**Category**: Arrays
**Description**: Repeated fields for arrays/lists

```protobuf
message GetLoansResponse {
  // Array of loans
  repeated Loan loans = 1;

  // Array of strings
  repeated string tags = 2;

  // Array of nested messages
  repeated Payment payments = 3;
}

message Payment {
  string id = 1;
  double amount = 2;
  int64 date = 3;
}
```

---

### Pattern 8: optional-fields
**Category**: Fields
**Description**: Optional fields (proto3 supports optional keyword)

```protobuf
message UpdateUserRequest {
  string id = 1; // Required

  // Optional fields (can be omitted)
  optional string name = 2;
  optional string email = 3;
  optional int32 age = 4;
}

// In proto3, all fields are optional by default
// Use 'optional' keyword only when you need to distinguish between
// "not set" vs "set to default value"
```

---

### Pattern 9: enum-definition
**Category**: Enum
**Description**: Enum patterns with _UNSPECIFIED = 0 convention

```protobuf
// ✅ CORRECT: First value is _UNSPECIFIED = 0
enum LoanStatus {
  LOAN_STATUS_UNSPECIFIED = 0; // Always first!
  LOAN_STATUS_PENDING = 1;
  LOAN_STATUS_APPROVED = 2;
  LOAN_STATUS_REJECTED = 3;
  LOAN_STATUS_DISBURSED = 4;
  LOAN_STATUS_REPAID = 5;
}

enum UserRole {
  USER_ROLE_UNSPECIFIED = 0; // Always first!
  USER_ROLE_ADMIN = 1;
  USER_ROLE_BORROWER = 2;
  USER_ROLE_LENDER = 3;
}

// ❌ WRONG: Missing _UNSPECIFIED = 0
enum BadStatus {
  PENDING = 1; // Don't do this!
  APPROVED = 2;
}
```

---

### Pattern 10: nested-messages
**Category**: Structure
**Description**: Nested message definitions

```protobuf
message CreateLoanRequest {
  string user_id = 1;
  double amount = 2;

  // Nested message (only used here)
  message LoanTerms {
    int32 duration_months = 1;
    double interest_rate = 2;
    string repayment_schedule = 3;
  }

  LoanTerms terms = 3;
}
```

---

### Pattern 11: oneof-fields
**Category**: Union Types
**Description**: Use oneof for mutually exclusive fields

```protobuf
message SearchRequest {
  string query = 1;

  // Only ONE of these can be set
  oneof filter {
    string user_id = 2;
    string email = 3;
    string phone = 4;
  }
}

message PaymentMethod {
  oneof method {
    CreditCard credit_card = 1;
    BankAccount bank_account = 2;
    Wallet wallet = 3;
  }
}
```

---

### Pattern 12: map-fields
**Category**: Maps
**Description**: Map fields for key-value pairs

```protobuf
message Loan {
  string id = 1;

  // Map of metadata (key: string, value: string)
  map<string, string> metadata = 2;

  // Map of documents (key: string, value: Document)
  map<string, Document> documents = 3;
}

message UserPreferences {
  // Map of settings
  map<string, bool> features = 1;
  map<string, int32> limits = 2;
}
```

---

### Pattern 13: reserved-fields
**Category**: Evolution
**Description**: Reserve field numbers/names for future use

```protobuf
message User {
  reserved 2, 15, 9 to 11; // Reserved field numbers
  reserved "foo", "bar";   // Reserved field names

  string id = 1;
  string name = 3;
  string email = 4;

  // Cannot use field numbers 2, 9, 10, 11, 15
  // Cannot use field names "foo", "bar"
}
```

---

### Pattern 14: package-declaration
**Category**: Organization
**Description**: Package naming with versioning

```protobuf
syntax = "proto3";

// Versioned package: domain.version
package loan.v1;

// Alternative patterns:
// package user.v1;
// package payment.v1;
// package common.v1;
```

---

### Pattern 15: import-proto-files
**Category**: Organization
**Description**: Import other proto files

```protobuf
syntax = "proto3";
package loan.v1;

// Import common messages
import "common/common.proto";

// Import Google protobuf types
import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

service LoanService {
  rpc CreateLoan(CreateLoanRequest) returns (CreateLoanResponse);
  rpc GetLoan(common.GetByIdRequest) returns (Loan);
  rpc DeleteLoan(common.GetByIdRequest) returns (google.protobuf.Empty);
}
```

---

### Pattern 16: service-naming-conventions
**Category**: Naming
**Description**: Service naming: PascalCase

```protobuf
// ✅ CORRECT: PascalCase
service LoanService {}
service UserService {}
service PaymentService {}
service NotificationService {}

// ❌ WRONG
service loan_service {}  // snake_case
service loanService {}   // camelCase
```

---

### Pattern 17: message-naming-conventions
**Category**: Naming
**Description**: Message naming: PascalCase, Request/Response suffix

```protobuf
// ✅ CORRECT: PascalCase with Request/Response suffix
message CreateLoanRequest {}
message CreateLoanResponse {}
message GetUserRequest {}
message GetUserResponse {}

// Entity messages (no suffix)
message Loan {}
message User {}
message Payment {}
```

---

### Pattern 18: rpc-naming-conventions
**Category**: Naming
**Description**: RPC naming: PascalCase, verb-first

```protobuf
service LoanService {
  // ✅ CORRECT: Verb + Noun (PascalCase)
  rpc CreateLoan(...) returns (...);
  rpc GetLoan(...) returns (...);
  rpc UpdateLoan(...) returns (...);
  rpc DeleteLoan(...) returns (...);
  rpc ListLoans(...) returns (...);
  rpc WatchLoanStatus(...) returns (...);
}

// ❌ WRONG
service BadService {
  rpc loan_create(...) returns (...); // snake_case
  rpc loanGet(...) returns (...);     // camelCase
}
```

---

### Pattern 19: field-naming-conventions
**Category**: Naming
**Description**: Field naming: snake_case

```protobuf
message Loan {
  // ✅ CORRECT: snake_case
  string id = 1;
  string user_id = 2;
  double amount = 3;
  int32 duration_months = 4;
  int64 created_at = 5;
  int64 updated_at = 6;

  // ❌ WRONG
  // string userId = 2;      // camelCase
  // string UserId = 2;      // PascalCase
  // int32 DurationMonths = 4; // PascalCase
}
```

---

### Pattern 20: request-response-pattern
**Category**: Pattern
**Description**: Standard request-response message pairs

```protobuf
// CREATE
message CreateLoanRequest {
  string user_id = 1;
  double amount = 2;
  int32 duration_months = 3;
}
message CreateLoanResponse {
  Loan loan = 1;
  string message = 2;
}

// GET
message GetLoanRequest {
  string id = 1;
}
message GetLoanResponse {
  Loan loan = 1;
}

// UPDATE
message UpdateLoanRequest {
  string id = 1;
  optional double amount = 2;
  optional int32 duration_months = 3;
}
message UpdateLoanResponse {
  Loan loan = 1;
}

// DELETE
message DeleteLoanRequest {
  string id = 1;
}
message DeleteLoanResponse {
  bool success = 1;
  string message = 2;
}
```

---

### Pattern 21: empty-message-pattern
**Category**: Pattern
**Description**: Use google.protobuf.Empty for empty responses

```protobuf
import "google/protobuf/empty.proto";

service LoanService {
  // Empty response
  rpc DeleteLoan(DeleteLoanRequest) returns (google.protobuf.Empty);

  // Empty request
  rpc GetServerHealth(google.protobuf.Empty) returns (HealthResponse);
}
```

---

### Pattern 22: pagination-pattern
**Category**: Pattern
**Description**: Standard pagination request/response

```protobuf
message PageRequest {
  int32 page = 1;
  int32 page_size = 2;
  string sort_by = 3;
  string order = 4; // "asc" or "desc"
}

message PageResponse {
  int32 page = 1;
  int32 page_size = 2;
  int32 total_pages = 3;
  int64 total_items = 4;
}

message ListLoansRequest {
  PageRequest page_request = 1;
  optional string user_id = 2;
}

message ListLoansResponse {
  repeated Loan loans = 1;
  PageResponse page_response = 2;
}
```

---

### Pattern 23: filter-pattern
**Category**: Pattern
**Description**: Filtering and search patterns

```protobuf
message FilterRequest {
  string field = 1;
  string operator = 2; // "eq", "gt", "lt", "gte", "lte", "like"
  string value = 3;
}

message SearchLoansRequest {
  repeated FilterRequest filters = 1;
  PageRequest page_request = 2;
}

message SearchLoansResponse {
  repeated Loan loans = 1;
  PageResponse page_response = 2;
}
```

---

### Pattern 24: timestamp-pattern
**Category**: Pattern
**Description**: Use google.protobuf.Timestamp for timestamps

```protobuf
import "google/protobuf/timestamp.proto";

message Loan {
  string id = 1;
  string user_id = 2;
  double amount = 3;

  // ✅ RECOMMENDED: Use google.protobuf.Timestamp
  google.protobuf.Timestamp created_at = 4;
  google.protobuf.Timestamp updated_at = 5;

  // ❌ ALTERNATIVE (but less portable):
  // int64 created_at = 4; // Unix timestamp
  // int64 updated_at = 5;
}
```

---

### Pattern 25: compilation-pattern
**Category**: Compilation
**Description**: Compile proto files to TypeScript

```bash
# Install dependencies
npm install --save-dev grpc-tools ts-proto @types/google-protobuf

# Compile proto files to TypeScript (ts-proto)
protoc \
  --plugin=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./src/generated \
  --ts_proto_opt=nestJs=true \
  --proto_path=./proto \
  ./proto/**/*.proto

# Alternative: Use grpc-tools
npx grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./src/generated \
  --grpc_out=grpc_js:./src/generated \
  --proto_path=./proto \
  ./proto/**/*.proto

# Watch mode (auto-compile on changes)
nodemon --watch proto --exec "protoc ..."
```

---

## 🛡️ ARCHITECTURE CONSTRAINTS

### ✅ REQUIRED
1. **Proto3 Syntax**: Use `syntax = "proto3";` (NOT proto2)
2. **Versioned Packages**: Use `package service.v1;` pattern
3. **Enum Convention**: First value MUST be `_UNSPECIFIED = 0`
4. **Naming Conventions**:
   - Services: PascalCase (LoanService, UserService)
   - RPCs: PascalCase (CreateLoan, GetUser)
   - Messages: PascalCase (CreateLoanRequest, GetUserResponse)
   - Fields: snake_case (user_id, created_at)

### ❌ PROHIBITED
1. **NO Proto2 Syntax**: Always use proto3
2. **NO Default Enums**: Always start with `_UNSPECIFIED = 0`
3. **NO Wrong Naming**: Follow conventions strictly
4. **NO Unversioned Packages**: Always use versioned packages (v1, v2)

---

## 📝 USAGE EXAMPLES

### Complete Example: loan.proto

```protobuf
syntax = "proto3";
package loan.v1;

import "common/common.proto";
import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

service LoanService {
  rpc CreateLoan(CreateLoanRequest) returns (CreateLoanResponse);
  rpc GetLoan(GetLoanRequest) returns (GetLoanResponse);
  rpc UpdateLoan(UpdateLoanRequest) returns (UpdateLoanResponse);
  rpc DeleteLoan(DeleteLoanRequest) returns (google.protobuf.Empty);
  rpc ListLoans(ListLoansRequest) returns (ListLoansResponse);
  rpc WatchLoanStatus(WatchLoanStatusRequest) returns (stream LoanStatusUpdate);
}

message CreateLoanRequest {
  string user_id = 1;
  double amount = 2;
  int32 duration_months = 3;
  LoanType type = 4;
}

message CreateLoanResponse {
  Loan loan = 1;
  string message = 2;
}

message GetLoanRequest {
  string id = 1;
}

message GetLoanResponse {
  Loan loan = 1;
}

message UpdateLoanRequest {
  string id = 1;
  optional double amount = 2;
  optional int32 duration_months = 3;
}

message UpdateLoanResponse {
  Loan loan = 1;
}

message DeleteLoanRequest {
  string id = 1;
}

message ListLoansRequest {
  common.PageRequest page_request = 1;
  optional string user_id = 2;
}

message ListLoansResponse {
  repeated Loan loans = 1;
  common.PageResponse page_response = 2;
}

message WatchLoanStatusRequest {
  string loan_id = 1;
}

message LoanStatusUpdate {
  string loan_id = 1;
  LoanStatus status = 2;
  google.protobuf.Timestamp updated_at = 3;
}

message Loan {
  string id = 1;
  string user_id = 2;
  double amount = 3;
  int32 duration_months = 4;
  LoanType type = 5;
  LoanStatus status = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
  map<string, string> metadata = 9;
}

enum LoanType {
  LOAN_TYPE_UNSPECIFIED = 0;
  LOAN_TYPE_PERSONAL = 1;
  LOAN_TYPE_BUSINESS = 2;
  LOAN_TYPE_MORTGAGE = 3;
}

enum LoanStatus {
  LOAN_STATUS_UNSPECIFIED = 0;
  LOAN_STATUS_PENDING = 1;
  LOAN_STATUS_APPROVED = 2;
  LOAN_STATUS_REJECTED = 3;
  LOAN_STATUS_DISBURSED = 4;
  LOAN_STATUS_REPAID = 5;
}
```

---

**File Size**: ~300 lines
**Patterns Covered**: 25 gRPC service definition patterns
**Compliance**: ✅ Proto3, ✅ Naming conventions, ✅ Enum convention
**Ready for**: NestJS gRPC integration
