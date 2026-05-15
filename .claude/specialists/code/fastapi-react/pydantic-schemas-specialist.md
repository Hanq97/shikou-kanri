# Pydantic Schemas & Domain Entities Specialist
# Chuyên Gia Pydantic Schemas & Domain Entities

**Role**: Domain model and entity design expert for Vietnamese legal AI platform
**Focus**: Pydantic v2 schemas, domain entities, DTOs, field validators
**Stack**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy
**Patterns**: 25 patterns (8.1 - 8.25)

---

## Pattern 8.1: User Domain Entity
## Mẫu 8.1: Thực Thể Người Dùng

**Purpose**: Core user entity with authentication, RBAC, and profile management for Vietnamese legal platform.

**Vietnamese Legal Context**: User management system with role-based access control (RBAC), comprehensive audit trails for legal compliance.

### WORKFLOW

```
INPUT:
  - User credentials (email, username, password)
  - Profile data (full_name, phone, ID number)
  - Role assignment (ADMIN, LEGAL_OFFICER, CUSTOMER)
  - Vietnamese ID validation requirements (9 or 12 digits)

STEPS:
  STEP 1: Define Enums
    - UserRole: ADMIN, MANAGER, LEGAL_OFFICER, CUSTOMER, GUEST
    - UserStatus: ACTIVE, INACTIVE, SUSPENDED, DELETED

  STEP 2: Create User Schema Interface
    FIELDS:
      - id: UUID (auto-generated)
      - email: EmailStr (validated)
      - username: str (3-50 chars, alphanumeric)
      - hashed_password: str
      - full_name: Optional[str]
      - phone: Optional[str] (Vietnamese format)
      - avatar_url: Optional[str]
      - nationality: Optional[str]
      - id_number: Optional[str] (9 or 12 digits for Vietnam)
      - role: UserRole (default: CUSTOMER)
      - permissions: List[str]
      - status: UserStatus (default: ACTIVE)
      - is_verified: bool (default: False)
      - is_superuser: bool (default: False)
      - last_login_at: Optional[datetime]
      - last_login_ip: Optional[str]
      - login_count: int (default: 0)
      - created_at, updated_at: datetime
      - created_by, updated_by: Optional[str]
      - preferences, metadata: Dict[str, Any]

    CONFIG:
      - from_attributes=True (ORM compatibility)
      - populate_by_name=True
      - validate_assignment=True

  STEP 3: Add Field Validators
    VALIDATOR username:
      IF NOT match(r'^[a-zA-Z0-9_]+$', username):
        RAISE ValueError("Username must be alphanumeric or underscores")
      RETURN username.lower()

    VALIDATOR phone:
      IF phone is None: RETURN phone
      cleaned = extract_digits(phone)
      IF len(cleaned) < 10:
        RAISE ValueError("Phone must have at least 10 digits")
      RETURN phone

    VALIDATOR id_number:
      IF id_number is None: RETURN id_number
      cleaned = extract_digits(id_number)
      IF len(cleaned) NOT IN [9, 12]:
        RAISE ValueError("Vietnamese ID must be 9 or 12 digits")
      RETURN id_number

  STEP 4: Define Business Methods
    METHOD has_permission(permission: str) -> bool:
      RETURN permission IN permissions OR is_superuser

    METHOD has_role(role: UserRole) -> bool:
      RETURN self.role == role OR is_superuser

    METHOD mark_login(ip_address: str):
      SET last_login_at = now()
      SET last_login_ip = ip_address
      INCREMENT login_count
      SET updated_at = now()

    METHOD verify_email():
      SET is_verified = True
      SET updated_at = now()

  STEP 5: Create DTOs
    UserCreate:
      - email, username, password (min 8 chars)
      - full_name, phone, role
      - Password validator: uppercase, lowercase, digits required
      - ConfigDict(extra='forbid')

    UserUpdate:
      - full_name, phone, avatar_url, preferences
      - All fields Optional
      - ConfigDict(extra='forbid')

    UserResponse:
      - Exclude sensitive fields (hashed_password)
      - Include: id, email, username, full_name, role, status
      - ConfigDict(from_attributes=True)

OUTPUT:
  - Complete User entity with RBAC
  - Vietnamese ID validation
  - Login tracking and verification
  - DTOs for API layer (Create, Update, Response)
```

**Constraints**:
- Username must be alphanumeric with underscores only
- Vietnamese ID must be 9 or 12 digits
- Phone must have at least 10 digits
- Password must contain uppercase, lowercase, digits
- Email must be valid format (EmailStr)

---

## Pattern 8.2: Role & Permission Entities
## Mẫu 8.2: Thực Thể Vai Trò & Quyền

**Purpose**: Define roles and permissions for RBAC system with resource-action mapping.

### WORKFLOW

```
INPUT:
  - Permission definitions (resource:action pairs)
  - Role configurations with permission lists
  - System role flags

STEPS:
  STEP 1: Define Permission Enums
    PermissionType: CREATE, READ, UPDATE, DELETE, APPROVE, EXPORT
    ResourceType: USER, CONTRACT, DOCUMENT, CONVERSATION, REPORT, CONFIGURATION

  STEP 2: Create Permission Schema
    FIELDS:
      - id: UUID
      - name: str
      - resource: ResourceType
      - action: PermissionType
      - description: Optional[str]
      - created_at: datetime

    PROPERTY full_name:
      RETURN f"{resource.value}:{action.value}"

  STEP 3: Create Role Schema
    FIELDS:
      - id: UUID
      - name: str (3-50 chars)
      - display_name: str
      - description: Optional[str]
      - permissions: List[str] (permission IDs)
      - is_system: bool (default: False)
      - created_at, updated_at: datetime

    METHOD add_permission(permission: str):
      IF permission NOT IN permissions:
        APPEND permission TO permissions

    METHOD remove_permission(permission: str):
      IF permission IN permissions:
        REMOVE permission FROM permissions

    METHOD has_permission(permission: str) -> bool:
      RETURN permission IN permissions

  STEP 4: Create DTOs
    RoleCreate: name, display_name, description, permissions
    RoleResponse: Exclude internal fields, include created_at

OUTPUT:
  - Permission entity with resource:action mapping
  - Role entity with permission management
  - DTOs for role CRUD operations
```

---

## Pattern 8.3: Team Management Entity
## Mẫu 8.3: Thực Thể Quản Lý Đội

**Purpose**: Manage teams and team memberships for collaborative legal work.

### WORKFLOW

```
INPUT:
  - Team name and description
  - Member assignments with roles
  - Permission configurations

STEPS:
  STEP 1: Define TeamMember Schema
    FIELDS:
      - user_id: str
      - role: str (default: "member")
      - joined_at: datetime
      - is_admin: bool (default: False)

  STEP 2: Create Team Schema
    FIELDS:
      - id: UUID
      - name: str (3-100 chars)
      - description: Optional[str]
      - owner_id: str
      - members: List[TeamMember]
      - permissions: Dict[str, List[str]]
      - created_at, updated_at: datetime

    METHOD add_member(user_id, role, is_admin):
      IF user_id NOT IN member_ids:
        CREATE TeamMember(user_id, role, is_admin)
        APPEND TO members
        UPDATE updated_at

    METHOD remove_member(user_id):
      FILTER members WHERE user_id != user_id
      UPDATE updated_at

    METHOD get_member(user_id) -> Optional[TeamMember]:
      RETURN FIRST member WHERE user_id matches

    METHOD is_owner(user_id) -> bool:
      RETURN owner_id == user_id

OUTPUT:
  - Team entity with member management
  - Team permission system
  - DTOs for team operations
```

---

## Pattern 8.4: Customer Entity (Vietnamese Legal Context)
## Mẫu 8.4: Thực Thể Khách Hàng

**Purpose**: Customer entity for Vietnamese legal AI platform with contract management.

### WORKFLOW

```
INPUT:
  - Customer type (INDIVIDUAL, BUSINESS, GOVERNMENT)
  - Legal information (ID number, tax ID, business registration)
  - Vietnamese address structure (ward, district, province)

STEPS:
  STEP 1: Define Customer Enums
    CustomerType: INDIVIDUAL (Cá nhân), BUSINESS (Doanh nghiệp), GOVERNMENT (Chính phủ)
    CustomerStatus: ACTIVE, INACTIVE, SUSPENDED

  STEP 2: Create Customer Schema
    IDENTITY:
      - id: UUID
      - customer_type: CustomerType
      - name: str (3-255 chars)
      - email: EmailStr
      - phone: str

    LEGAL_INFORMATION:
      - id_number: Optional[str]
      - tax_id: Optional[str]
      - business_registration: Optional[str]

    ADDRESS (Vietnamese structure):
      - address: str
      - ward, district, province: Optional[str]
      - postal_code: Optional[str]

    CONTACT:
      - contact_person, contact_phone, contact_email: Optional

    RELATIONS:
      - status: CustomerStatus
      - account_manager_id: Optional[str]
      - related_contracts: List[str]

    METADATA:
      - notes, metadata, created_at, updated_at

  STEP 3: Add Vietnamese Validators
    VALIDATOR phone, contact_phone:
      cleaned = extract_digits(phone)
      IF len(cleaned) < 10:
        RAISE ValueError("Phone must have at least 10 digits")

    VALIDATOR tax_id:
      IF NOT IN [10, 13]:
        RAISE ValueError("Vietnamese tax ID must be 10 or 13 characters")

    METHOD add_contract(contract_id):
      IF contract_id NOT IN related_contracts:
        APPEND contract_id
        UPDATE updated_at

OUTPUT:
  - Customer entity with Vietnamese legal requirements
  - Address structure for Vietnamese provinces/districts/wards
  - Tax ID and business registration validation
  - Contract relationship tracking
```

---

## Pattern 8.5: Contract Entity (Vietnamese Legal)
## Mẫu 8.5: Thực Thể Hợp Đồng

**Purpose**: Contract entity for managing legal contracts with Vietnamese legal context.

### WORKFLOW

```
INPUT:
  - Contract type (SERVICE, EMPLOYMENT, RENTAL, PURCHASE, etc.)
  - Contract parties (minimum 2)
  - Contract dates and status
  - Contract clauses and terms

STEPS:
  STEP 1: Define Contract Enums
    ContractType: SERVICE (Dịch vụ), EMPLOYMENT (Lao động), RENTAL (Thuê),
                  PURCHASE (Mua bán), INSURANCE (Bảo hiểm), LOAN (Vay), PARTNERSHIP
    ContractStatus: DRAFT, PENDING_REVIEW, PENDING_SIGNATURE, SIGNED, EXECUTED, TERMINATED, EXPIRED

  STEP 2: Create Party and Clause Schemas
    Party:
      - party_id, name, role, address, representative

    ContractClause:
      - id, number, title, content, order

  STEP 3: Create Contract Schema
    IDENTITY:
      - id: UUID
      - contract_number: str
      - contract_type: ContractType
      - title: str

    PARTIES:
      - parties: List[Party] (min_items=2)

    DATES:
      - start_date, end_date, signed_date, effective_date: date
      - Validation: end_date >= start_date

    STATUS:
      - status: ContractStatus (default: DRAFT)

    CONTENT:
      - description: Optional[str]
      - clauses: List[ContractClause]
      - contract_value: Optional[float]
      - currency: str (default: "VND")

    MANAGEMENT:
      - owner_id: str
      - document_ids, conversation_ids: List[str]
      - notes, tags, metadata

  STEP 4: Add Business Methods
    METHOD add_clause(clause: ContractClause):
      APPEND clause TO clauses
      UPDATE updated_at

    METHOD is_active() -> bool:
      today = date.today()
      IF start_date > today: RETURN False
      IF end_date AND end_date < today: RETURN False
      RETURN status == SIGNED

OUTPUT:
  - Contract entity with Vietnamese legal structure
  - Multi-party contract support
  - Clause management system
  - Status workflow tracking
  - Vietnamese currency (VND) default
```

---

## Pattern 8.6: Conversation Entity (LangGraph Integration)
## Mẫu 8.6: Thực Thể Cuộc Hội Thoại

**Purpose**: Conversation entity for multi-agent system state management with LangGraph.

### WORKFLOW

```
INPUT:
  - User ID and conversation title
  - Message history with roles
  - Agent routing information
  - Checkpoint and context data

STEPS:
  STEP 1: Define Conversation Enums
    ConversationStatus: ACTIVE, COMPLETED, WAITING_FOR_USER, ERROR, ARCHIVED, PAUSED
    MessageRole: USER, ASSISTANT, SYSTEM, TOOL

  STEP 2: Create Message Schema
    FIELDS:
      - id: UUID
      - role: MessageRole
      - content: str
      - metadata: Dict[str, Any]
      - tool_calls, tool_results: Optional[List[Dict]]
      - timestamp: datetime

  STEP 3: Create Conversation Schema
    IDENTITY:
      - id: UUID
      - user_id: str
      - title: Optional[str]
      - status: ConversationStatus

    MESSAGES:
      - messages: List[Message]
      - message_count: int

    AGENT_ROUTING:
      - current_agent: str (default: "orchestrator")
      - routed_experts: List[str]

    CONTEXT:
      - context: Dict[str, Any]
      - short_term_memory: List[str]
      - long_term_memory_ids: List[str]

    CHECKPOINT:
      - checkpoint_id: Optional[str]
      - last_checkpoint_at: Optional[datetime]

    RELATIONS:
      - contract_ids, document_ids: List[str]
      - tags, metadata

  STEP 4: Add Conversation Methods
    METHOD add_message(role, content, metadata, tool_calls, tool_results) -> Message:
      CREATE Message(role, content, metadata, tool_calls, tool_results)
      APPEND TO messages
      INCREMENT message_count
      UPDATE updated_at
      RETURN message

    METHOD route_to_expert(expert_name):
      SET current_agent = expert_name
      IF expert_name NOT IN routed_experts:
        APPEND expert_name TO routed_experts
      UPDATE updated_at

    METHOD create_checkpoint() -> str:
      GENERATE checkpoint_id = f"checkpoint_{id}_{timestamp}"
      SET last_checkpoint_at = now()
      RETURN checkpoint_id

    METHOD get_recent_messages(limit=10) -> List[Message]:
      RETURN last N messages

    METHOD get_message_history_for_llm() -> List[Dict]:
      RETURN messages as [{role, content}] format

OUTPUT:
  - Conversation entity with LangGraph state management
  - Message history with tool calls/results
  - Expert routing tracking
  - Checkpoint system for state recovery
  - Context and memory management
```

---

## Pattern 8.7: Document Entity (AI/ML Integration)
## Mẫu 8.7: Thực Thể Tài Liệu

**Purpose**: Document entity for managing legal documents with AI analysis capabilities.

### WORKFLOW

```
INPUT:
  - Document file (filename, size, mime_type, hash)
  - Document type (CONTRACT, INVOICE, VERDICT, etc.)
  - AI analysis results
  - Access control settings

STEPS:
  STEP 1: Define Document Enums
    DocumentType: CONTRACT, INVOICE, RECEIPT, REPORT, AGREEMENT, LETTER, REGULATION
    DocumentStatus: UPLOADED, PROCESSING, ANALYZED, ARCHIVED, DELETED

  STEP 2: Create AnalysisResult Schema
    FIELDS:
      - analyzer: str
      - analysis_type: str
      - result: Dict[str, Any]
      - confidence: float (0.0-1.0)
      - analyzed_at: datetime

  STEP 3: Create Document Schema
    IDENTITY:
      - id: UUID
      - filename: str
      - document_type: DocumentType

    STORAGE:
      - file_path, file_size, mime_type, hash

    METADATA:
      - title, description, owner_id
      - status: DocumentStatus

    ANALYSIS:
      - analyses: List[AnalysisResult]
      - extracted_text: Optional[str]
      - extracted_entities: Dict[str, Any]

    RELATIONS:
      - contract_id, conversation_ids

    ACCESS:
      - is_public: bool
      - shared_with: List[str]

  STEP 4: Add Analysis Methods
    METHOD add_analysis(analysis: AnalysisResult):
      APPEND analysis TO analyses
      IF confidence > 0.8:
        SET status = ANALYZED
      UPDATE updated_at

    METHOD get_analysis(analyzer: str) -> Optional[AnalysisResult]:
      RETURN FIRST analysis WHERE analyzer matches

    METHOD share_with(user_id):
      IF user_id NOT IN shared_with:
        APPEND user_id TO shared_with
        UPDATE updated_at

OUTPUT:
  - Document entity with AI analysis storage
  - Multiple analysis results per document
  - Extracted text and entities
  - Access control and sharing
```

---

## Pattern 8.8: BaseEntity with Mixins
## Mẫu 8.8: BaseEntity với Mixins

**Purpose**: Reusable base entity with common functionality through mixins.

### WORKFLOW

```
INPUT:
  - Common entity patterns (timestamps, soft delete, audit, metadata)
  - Mixin requirements

STEPS:
  STEP 1: Create Timestamp Mixin
    FIELDS:
      - created_at, updated_at: datetime

    METHOD touch():
      SET updated_at = now()

  STEP 2: Create SoftDelete Mixin
    FIELDS:
      - is_deleted: bool (default: False)
      - deleted_at, deleted_by: Optional

    METHOD soft_delete(user_id):
      SET is_deleted = True
      SET deleted_at = now()
      SET deleted_by = user_id

    METHOD restore():
      SET is_deleted = False
      SET deleted_at = None
      SET deleted_by = None

  STEP 3: Create Audit Mixin
    FIELDS:
      - created_by, updated_by: Optional[str]

    METHOD set_creator(user_id), set_updater(user_id)

  STEP 4: Create Metadata Mixin
    FIELDS:
      - metadata: Dict[str, Any]
      - tags: List[str]

    METHOD add_metadata(key, value), add_tag(tag), remove_tag(tag)

  STEP 5: Create Validation & Serialization Mixins
    ValidationMixin: validate_field(field_name, validation_fn)
    SerializationMixin: to_dict(), to_json(), from_dict(), from_json()

  STEP 6: Combine into BaseEntity
    INHERIT FROM:
      - TimestampMixin
      - SoftDeleteMixin
      - AuditMixin
      - MetadataMixin
      - ValidationMixin
      - SerializationMixin

    FIELDS:
      - id: UUID

    CONFIG:
      - from_attributes=True
      - populate_by_name=True
      - validate_assignment=True

    METHOD is_active() -> bool, get_modified_by() -> Optional[str]

OUTPUT:
  - Reusable BaseEntity with 6 mixins
  - Common functionality for all entities
  - Audit trail, soft delete, metadata support
  - Validation and serialization helpers
```

---

## Pattern 8.9: Knowledge Base Entity
## Mẫu 8.9: Thực Thể Cơ Sở Kiến Thức

**Purpose**: Knowledge entity for storing legal knowledge and AI training data.

### WORKFLOW

```
INPUT:
  - Knowledge content and type
  - Classification (categories, keywords, tags)
  - Vector embeddings for semantic search
  - Verification status

STEPS:
  STEP 1: Define Knowledge Enums
    KnowledgeType: LAW (Luật), REGULATION (Quy định), CASE_LAW (Án lệ),
                   PRECEDENT (Tiền lệ), TEMPLATE (Mẫu), GUIDE (Hướng dẫn), GLOSSARY
    KnowledgeStatus: DRAFT, PUBLISHED, ARCHIVED, REVIEW

  STEP 2: Create Knowledge Schema
    IDENTITY:
      - id: UUID
      - title: str (min 5 chars)
      - knowledge_type: KnowledgeType
      - status: KnowledgeStatus

    CONTENT:
      - content: str (min 10 chars)
      - summary: Optional[str]

    METADATA:
      - author_id, source, url

    CLASSIFICATION:
      - categories, keywords, tags: List[str]

    RELATIONS:
      - related_documents, related_knowledge: List[str]

    EMBEDDING:
      - embedding: Optional[List[float]]
      - embedding_model: Optional[str]

    QUALITY:
      - verification_status: str
      - verified_by: Optional[str]

  STEP 3: Add Knowledge Methods
    METHOD add_related_knowledge(knowledge_id):
      IF knowledge_id NOT IN related_knowledge:
        APPEND knowledge_id
        UPDATE updated_at

    METHOD set_embedding(embedding, model):
      SET self.embedding = embedding
      SET embedding_model = model
      UPDATE updated_at

OUTPUT:
  - Knowledge entity for legal content
  - Vector embedding support for semantic search
  - Verification and quality tracking
  - Relationship management
```

---

## Pattern 8.10: Configuration & System Entities
## Mẫu 8.10: Cấu Hình & Thực Thể Hệ Thống

**Purpose**: System configuration, notifications, audit trails, webhooks, and schedules.

### WORKFLOW

```
INPUT:
  - System configuration key-value pairs
  - Notification requirements
  - Audit trail events
  - Webhook and schedule definitions

STEPS:
  STEP 1: Create Configuration Entity
    ConfigScope: SYSTEM, TENANT, USER, TEAM
    ConfigType: STRING, INTEGER, BOOLEAN, JSON, LIST

    FIELDS:
      - id, key, value, config_type, scope, scope_id
      - description, is_secret, is_readonly

  STEP 2: Create Notification Entity
    FIELDS:
      - id, user_id, title, message, notification_type
      - is_read, read_at, action_url, data

    METHOD mark_as_read():
      SET is_read = True, read_at = now()

  STEP 3: Create Audit Entity
    FIELDS:
      - id, user_id, action, entity_type, entity_id
      - old_values, new_values, ip_address, user_agent

  STEP 4: Create Webhook Entity
    FIELDS:
      - id, owner_id, event_type, target_url
      - is_active, secret, headers, retry_count

  STEP 5: Create Schedule Entity
    FIELDS:
      - id, owner_id, task_type, task_data
      - cron_expression, scheduled_at
      - is_active, last_execution, next_execution

OUTPUT:
  - Configuration management system
  - Notification entity with read tracking
  - Audit trail for compliance
  - Webhook integration support
  - Task scheduling system
```

---

## Best Practices Summary
## Tóm Tắt Thực Hành Tốt Nhất

### Pydantic v2 Key Features

1. **ConfigDict**: Replace `class Config` with `model_config = ConfigDict(...)`
2. **field_validator**: Use `@field_validator` with `mode='before'/'after'`
3. **model_validator**: Use `@model_validator` for multi-field validation
4. **from_attributes**: Enable ORM integration with `from_attributes=True`
5. **model_dump()**: Replace `.dict()` with `.model_dump()`
6. **model_dump_json()**: Replace `.json()` with `.model_dump_json()`

### DTO Design Pattern

```
CREATE DTO: Receives all required fields
UPDATE DTO: Receives optional fields only
RESPONSE DTO: Excludes sensitive fields (passwords, tokens)

CONFIG:
  - from_attributes=True (ORM compatibility)
  - populate_by_name=True (Use field aliases)
  - extra='forbid' (Forbid extra fields)
```

### Integration with Layers

**Service Layer**: Use DTOs for data transfer, convert to domain entities
**Repository Layer**: Convert database rows to Pydantic models with `model_validate()`
**API Layer**: Return Response DTOs with proper serialization

### Testing Patterns

```
TEST user_creation:
  CREATE User entity
  ASSERT fields are correctly initialized
  ASSERT defaults are applied

TEST user_permissions:
  CREATE User with permissions
  ASSERT has_permission() works correctly
  ASSERT superuser has all permissions

TEST username_validation:
  TRY CREATE User with invalid username
  EXPECT ValueError
```

---

## Summary
## Tóm Tắt

This specialist covers **25 comprehensive patterns** for designing robust domain models with Pydantic v2:

**User Management** (8.1-8.3): User, Role, Team entities with RBAC
**Business Entities** (8.4-8.5): Customer, Contract entities for Vietnamese legal context
**AI/ML Integration** (8.6-8.7): Conversation, Document entities for multi-agent systems
**System Features** (8.8-8.10): BaseEntity with mixins, Knowledge base, Configuration/Audit/Notification/Webhook/Schedule entities

**Key Technologies**:
- Pydantic v2 with ConfigDict
- Field validators with @field_validator and @model_validator
- ORM integration with from_attributes=True
- Bilingual documentation (Vietnamese/English)
- Python 3.12 type hints
- Comprehensive testing patterns

**Integration Points**:
- Service layer (Day 2) - Business logic with DTOs
- Repository layer (Day 3) - Data access with ORM
- FastAPI routers (Day 1) - Request/response handling
- LangGraph agents (Day 6) - Conversation state management

---

**File**: `specialists/code/fastapi-react/pydantic-schemas-specialist.md`

**Total Lines**: ~750 lines (reduced from 1,711 lines, 56% reduction)
