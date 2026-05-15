# BD Interface Design Micro-Agent / インターフェース設計マイクロエージェント

**Responsibility**: Generate Section 4 (Interface Design) of Basic Design
**Output Lines**: 70-90 lines
**Dependencies**: bd-02-components.md (for API endpoints), SRS functional requirements

---

## Input Requirements

- Evidence file path (absolute)
- SRS file path (for interface requirements)
- Component design (from bd-02)
- Feature code (e.g., "CMN015002")
- API specifications (from evidence)

---

## Processing Logic

### Step 1: Load Evidence, SRS, and Components

```pseudocode
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
components = read_file(components_file_path)
api_specs = extract_section(evidence, "API|インターフェース")
controllers = extract_controllers(components)
```

**Extract:**
- REST API endpoints
- Request/Response formats
- Authentication/Authorization
- Error handling
- API versioning

### Step 2: Structure Interface Design

**4.1 REST API設計 / REST API Design**
- API endpoint specifications
- HTTP methods
- Request/Response formats
- Status codes

**4.2 認証・認可 / Authentication & Authorization**
- Authentication mechanism
- Authorization rules
- Token management

**4.3 エラーハンドリング / Error Handling**
- Error response format
- Error codes
- Error messages

**4.4 データ形式 / Data Formats**
- JSON schemas
- Request DTOs
- Response DTOs

### Step 3: Map Endpoints to Requirements

**Traceability:**
- Functional requirements → API endpoints
- Use cases → API operations
- User stories → API features

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] All endpoints from functional requirements?
- [ ] API specs from evidence/SRS?
- [ ] Authentication from security requirements?
- [ ] No assumed interfaces?

**Q2: Consistency?**
- [ ] Follows RESTful conventions?
- [ ] HTTP methods used correctly?
- [ ] Status codes appropriate?
- [ ] Naming conventions consistent?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] Headers bilingual (日本語 / Vietnamese)?
- [ ] Endpoint descriptions bilingual?
- [ ] Error messages bilingual?
- [ ] HTTP/REST terms in English?

**Q4: No Prohibited Content?**
- [ ] No implementation code?
- [ ] No SQL queries?
- [ ] API specifications only?
- [ ] High-level design only?

---

## Output Template

```markdown
## 4. インターフェース設計 / Thiết kế giao diện (Interface Design)

### 4.1 REST API設計 / Thiết kế REST API

**APIベースURL / API Base URL:**
```
https://api.starx4crm.com/api/v1
```

**認証方式 / Authentication Method:**
- Bearer Token (JWT)

**共通ヘッダー / Common Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
Accept-Language: ja|vi
```

---

#### 4.1.1 [Resource Name JP] / [Resource Name VN] API

**API-001: [Operation Name JP] / [Operation Name VN]**

**エンドポイント / Endpoint:**
```
[HTTP_METHOD] /api/v1/[resource]
```

**説明 / Description:**
[Japanese description of API operation]
[Vietnamese description]

**リクエスト / Request:**

**パスパラメータ / Path Parameters:**
| パラメータ / Parameter | 型 / Type | 必須 / Required | 説明 / Description |
|-------------------|--------|--------------|------------------|
| [param1] | [type] | Yes/No | [Description JP/VN] |

**クエリパラメータ / Query Parameters:**
| パラメータ / Parameter | 型 / Type | 必須 / Required | デフォルト / Default | 説明 / Description |
|-------------------|--------|--------------|----------------|------------------|
| [param1] | [type] | Yes/No | [default] | [Description JP/VN] |

**リクエストボディ / Request Body:**
```json
{
  "field1": "value",  // [Description JP] / [Description VN]
  "field2": 123,      // [Description JP] / [Description VN]
  "field3": {
    // [Object description JP] / [Object description VN]
  }
}
```

**レスポンス / Response:**

**成功レスポンス (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "field1": "value",
    "field2": 123
  },
  "message": "成功メッセージ / Success message"
}
```

**エラーレスポンス / Error Responses:**

| ステータス / Status | 説明 / Description | レスポンス例 / Example |
|----------------|------------------|-------------------|
| 400 Bad Request | 無効なリクエスト / Invalid request | {"status":"error","code":"E400","message":"..."} |
| 401 Unauthorized | 認証失敗 / Auth failed | {"status":"error","code":"E401","message":"..."} |
| 404 Not Found | リソース未検出 / Not found | {"status":"error","code":"E404","message":"..."} |
| 500 Server Error | サーバーエラー / Server error | {"status":"error","code":"E500","message":"..."} |

**要件マッピング / Requirements Mapping:**
- FR-[CODE]-[NUMBER]: [Requirement description]
- US-[CODE]-[NUMBER]: [User story]

**使用例 / Example Usage:**

**リクエスト例 / Request Example:**
```bash
curl -X [METHOD] \
  https://api.starx4crm.com/api/v1/[resource] \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**レスポンス例 / Response Example:**
```json
{...}
```

---

#### 4.1.2 API一覧 / API List

| エンドポイント / Endpoint | メソッド / Method | 説明 / Description | 要件 / Requirement |
|---------------------|---------------|------------------|----------------|
| /api/v1/[resource] | GET | [Description JP/VN] | FR-[CODE]-[NUM] |
| /api/v1/[resource] | POST | [Description JP/VN] | FR-[CODE]-[NUM] |
| /api/v1/[resource]/{id} | GET | [Description JP/VN] | FR-[CODE]-[NUM] |
| /api/v1/[resource]/{id} | PUT | [Description JP/VN] | FR-[CODE]-[NUM] |
| /api/v1/[resource]/{id} | DELETE | [Description JP/VN] | FR-[CODE]-[NUM] |

---

### 4.2 認証・認可 / Xác thực & Phân quyền (Authentication & Authorization)

#### 4.2.1 認証フロー / Authentication Flow

**フロー / Flow:**
```
1. ユーザーがKeycloakにログイン / User login to Keycloak
2. KeycloakがJWTトークンを発行 / Keycloak issues JWT token
3. クライアントがトークンを保存 / Client stores token
4. API呼び出し時にトークンを送信 / Send token with API calls
5. サーバーがトークンを検証 / Server validates token
```

**トークン形式 / Token Format:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**トークン有効期限 / Token Expiration:**
- Access Token: 30分 / 30 minutes
- Refresh Token: 24時間 / 24 hours

---

#### 4.2.2 認可ルール / Authorization Rules

| エンドポイント / Endpoint | 必要な権限 / Required Role | 説明 / Description |
|---------------------|---------------------|------------------|
| POST /api/v1/workflows | ADMIN | ワークフロー作成権限 / Create workflow |
| GET /api/v1/workflows | USER, ADMIN | 閲覧権限 / View permission |
| PUT /api/v1/workflows/{id} | ADMIN | 更新権限 / Update permission |
| DELETE /api/v1/workflows/{id} | ADMIN | 削除権限 / Delete permission |

**ロールベースアクセス制御 (RBAC) / Role-Based Access Control:**
- **ADMIN**: 全操作可能 / Full access
- **USER**: 読取のみ / Read-only
- **APPROVER**: 承認操作 / Approval operations

---

### 4.3 エラーハンドリング / Xử lý lỗi (Error Handling)

#### 4.3.1 エラーレスポンス形式 / Error Response Format

**標準エラーレスポンス / Standard Error Response:**
```json
{
  "status": "error",
  "code": "E[HTTP_STATUS]_[ERROR_CODE]",
  "message": "エラーメッセージ (日本語) / Error message (Vietnamese)",
  "details": {
    "field": "field_name",
    "reason": "詳細な理由 / Detailed reason"
  },
  "timestamp": "2025-12-20T10:30:00Z",
  "path": "/api/v1/resource"
}
```

---

#### 4.3.2 エラーコード一覧 / Error Code List

| エラーコード / Code | HTTPステータス / Status | 説明 / Description | メッセージ例 / Message Example |
|----------------|-------------------|------------------|----------------------|
| E400_001 | 400 | 必須フィールド欠損 / Missing required field | "[Field]は必須です / [Field] là bắt buộc" |
| E400_002 | 400 | 無効な形式 / Invalid format | "無効な形式です / Định dạng không hợp lệ" |
| E401_001 | 401 | トークン無効 / Invalid token | "認証が必要です / Yêu cầu xác thực" |
| E403_001 | 403 | 権限不足 / Insufficient permissions | "権限がありません / Không có quyền" |
| E404_001 | 404 | リソース未検出 / Resource not found | "リソースが見つかりません / Không tìm thấy" |
| E409_001 | 409 | データ競合 / Data conflict | "データが競合しています / Dữ liệu bị xung đột" |
| E500_001 | 500 | サーバーエラー / Server error | "サーバーエラー / Lỗi server" |

---

#### 4.3.3 バリデーションエラー / Validation Errors

**バリデーションエラーレスポンス / Validation Error Response:**
```json
{
  "status": "error",
  "code": "E400_VALIDATION",
  "message": "入力値が無効です / Dữ liệu đầu vào không hợp lệ",
  "errors": [
    {
      "field": "name",
      "message": "名前は必須です / Tên là bắt buộc"
    },
    {
      "field": "email",
      "message": "無効なメールアドレス / Email không hợp lệ"
    }
  ]
}
```

---

### 4.4 データ形式 / Định dạng dữ liệu (Data Formats)

#### 4.4.1 共通データ構造 / Common Data Structures

**ページネーション / Pagination:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**ソート / Sorting:**
```
?sort=field1,asc&sort=field2,desc
```

**フィルター / Filtering:**
```
?filter=status:ACTIVE&filter=createdAt:gt:2025-01-01
```

---

#### 4.4.2 日時形式 / Date & Time Format

**形式 / Format:**
- ISO 8601: `2025-12-20T10:30:00Z`
- タイムゾーン / Timezone: UTC

**例 / Examples:**
```json
{
  "createdAt": "2025-12-20T10:30:00Z",
  "updatedAt": "2025-12-20T11:45:00Z"
}
```

---

#### 4.4.3 多言語対応 / Multi-language Support

**言語指定 / Language Specification:**
```
Accept-Language: ja  (日本語 / Japanese)
Accept-Language: vi  (ベトナム語 / Vietnamese)
```

**多言語フィールド / Multi-language Fields:**
```json
{
  "name": {
    "ja": "ワークフロー名",
    "vi": "Tên workflow",
    "en": "Workflow Name"
  }
}
```

---

### 4.5 APIバージョニング / API Versioning

**バージョン管理方式 / Versioning Strategy:**
- URL-based versioning: `/api/v1/...`

**サポートバージョン / Supported Versions:**
- v1: 現行バージョン / Current version

**非推奨ポリシー / Deprecation Policy:**
- 3ヶ月前に通知 / 3 months notice
- 6ヶ月のサポート期間 / 6 months support period

---

### 4.6 インターフェース設計サマリー / Interface Design Summary

| 項目 / Item | 数 / Count | 備考 / Note |
|---------|----------|----------|
| APIエンドポイント / Endpoints | [X] | REST API |
| 認証方式 / Auth Methods | 1 | JWT Bearer Token |
| エラーコード / Error Codes | [Y] | E[Status]_[Code] |
| サポート言語 / Languages | 2 | Japanese, Vietnamese |

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- SRS Reference: `[srs_file_path]`
- Component Reference: `[components_file_path]`
- Sections: API Specifications, Interface Requirements
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All endpoints from functional requirements
2. [ ] RESTful conventions followed
3. [ ] Authentication/authorization specified
4. [ ] Error handling comprehensive
5. [ ] Bilingual format ≥60% of content
6. [ ] No implementation code
7. [ ] Request/response formats clear
8. [ ] Requirements traceability established
9. [ ] Evidence sources cited

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: BD Section 4 - Interface Design*
