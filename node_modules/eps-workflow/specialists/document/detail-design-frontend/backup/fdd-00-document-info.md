# Document Info Micro-Agent / ドキュメント情報マイクロエージェント / Micro-Agent Thông tin Tài liệu

**Responsibility / 責任 / Trách nhiệm**: Generate Frontend Detail Design document header with metadata, revision history, and approval workflow
**Output Lines / 出力行数 / Số dòng đầu ra**: ~50-80 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS document, Basic Design document
**Checkpoint / チェックポイント / Điểm kiểm tra**: C0

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** / エビデンスファイルパス / Đường dẫn tệp bằng chứng
   - Absolute path to evidence markdown file
   - Contains research findings and requirements
   - Example: `.claude/memory-bank/evidence/CMN015002_workflow_designer.md`

2. **SRS File Path** / SRSファイルパス / Đường dẫn tệp SRS
   - Absolute path to Software Requirements Specification
   - Contains functional and non-functional requirements
   - Example: `{PROJECT_ROOT}/documents/features/CMN015002/CMN015002-SRS.md`

3. **Basic Design File Path** / 基本設計ファイルパス / Đường dẫn tệp Thiết kế Cơ bản
   - Absolute path to Basic Design document
   - Contains architecture decisions
   - Example: `{PROJECT_ROOT}/documents/features/CMN015002/CMN015002-BD.md`

4. **Feature Code** / 機能コード / Mã tính năng
   - Feature identifier (e.g., CMN015002)
   - Used for document ID generation

5. **Feature Name** / 機能名 / Tên tính năng
   - Japanese: ワークフローデザイナー
   - Vietnamese: Trình thiết kế Workflow
   - English: Workflow Designer

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1: Load Context / コンテキスト読み込み / Tải ngữ cảnh

```pseudocode
# Read input files
evidence = read_file(evidence_file_path)
srs = read_file(srs_file_path)
basic_design = read_file(basic_design_file_path)

# Get current system datetime
current_datetime = system_datetime()  # Format: YYYY-MM-DD HH:MM:SS

# Extract metadata from inputs
feature_code = extract_feature_code(evidence, srs)
feature_name_jp = extract_feature_name_japanese(srs)
feature_name_vn = extract_feature_name_vietnamese(srs)
feature_name_en = extract_feature_name_english(srs)
```

### Step 2: Extract Requirements / 要件抽出 / Trích xuất yêu cầu

```pseudocode
# Extract document metadata
srs_version = extract_version(srs)
bd_version = extract_version(basic_design)
srs_doc_id = extract_document_id(srs)
bd_doc_id = extract_document_id(basic_design)

# Extract authors and dates
srs_author = extract_author(srs)
bd_author = extract_author(basic_design)
srs_date = extract_creation_date(srs)
bd_date = extract_creation_date(basic_design)

# Build traceability links
traceability_links = {
    "SRS": {
        "document_id": srs_doc_id,
        "version": srs_version,
        "date": srs_date,
        "author": srs_author
    },
    "BD": {
        "document_id": bd_doc_id,
        "version": bd_version,
        "date": bd_date,
        "author": bd_author
    }
}
```

### Step 3: Generate Design / 設計生成 / Tạo thiết kế

```pseudocode
# Generate document ID
document_id = f"FDD-{feature_code}-{format_date(current_datetime, 'YYYYMMDD')}"

# Create document header
header = generate_bilingual_header(
    document_id=document_id,
    feature_code=feature_code,
    feature_name_jp=feature_name_jp,
    feature_name_vn=feature_name_vn,
    feature_name_en=feature_name_en,
    version="1.0",
    created_date=current_datetime,
    status="Draft"
)

# Create revision history table
revision_history = create_revision_table(
    version="1.0",
    date=current_datetime,
    author="Claude (fdd-00-document-info agent)",
    description="Initial FDD document creation"
)

# Create traceability section
traceability = create_traceability_section(traceability_links)

# Create approval workflow
approval_workflow = create_approval_table(
    author="Claude (fdd-00 agent)",
    author_date=current_datetime,
    reviewer="TBD",
    approver="TBD"
)

# Combine sections
output = header + revision_history + traceability + approval_workflow
```

### Step 4: Validate Output (Q1-Q4) / 出力検証 / Xác thực đầu ra

#### Q1: Traceable to SRS/BD? / SRS/BDに追跡可能か？ / Có truy xuất được đến SRS/BD không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] Document ID references feature code from SRS?
- [ ] Traceability section includes SRS document ID and version?
- [ ] Traceability section includes BD document ID and version?
- [ ] No orphan metadata elements?

```pseudocode
ASSERT document_id contains feature_code from SRS
ASSERT traceability_links["SRS"]["document_id"] == srs_doc_id
ASSERT traceability_links["BD"]["document_id"] == bd_doc_id
ASSERT all metadata has source reference
```

#### Q2: Implementation Details Correct? / 実装詳細は正しいか？ / Chi tiết triển khai đúng không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] Document ID follows format: FDD-[FEATURE_CODE]-[YYYYMMDD]?
- [ ] Revision history table structure correct?
- [ ] Approval workflow table structure correct?
- [ ] All dates use current system datetime?

```pseudocode
ASSERT regex_match(document_id, r"FDD-[A-Z0-9]+-\d{8}")
ASSERT revision_history has columns: [Version, Date, Author, Description]
ASSERT approval_workflow has columns: [Role, Name, Date, Status]
ASSERT all dates == current_datetime (no hardcoded dates)
```

#### Q3: Japanese + Vietnamese ≥60%? / 日本語+ベトナム語≥60%か？ / Tiếng Nhật + tiếng Việt ≥60% không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] All section headers bilingual (JP + VN)?
- [ ] All table headers bilingual?
- [ ] Feature name in 3 languages (JP, VN, EN)?
- [ ] Combined JP+VN content ≥60% of total?

```pseudocode
content = output
japanese_chars = count_japanese_characters(content)
vietnamese_chars = count_vietnamese_characters(content)
total_chars = length(content)

bilingual_ratio = ((japanese_chars + vietnamese_chars) / total_chars) * 100

ASSERT bilingual_ratio >= 60
ASSERT all headers contain "/ 日本語 / Tiếng Việt"
```

#### Q4: Interfaces Only (No Implementation)? / インターフェースのみ（実装なし）か？ / Chỉ interface (không có implementation) không?

**Validation Rules / 検証ルール / Quy tắc xác thực**:
- [ ] No code blocks with implementation logic?
- [ ] Only metadata and table structures?
- [ ] No business logic in document info section?

```pseudocode
code_blocks = extract_code_blocks(output)

FOR each code_block in code_blocks:
    ASSERT NOT contains_implementation_logic(code_block)
    ASSERT NOT contains_function_bodies(code_block)
END FOR

# Document info should only have tables and metadata
ASSERT only_contains_metadata_and_tables(output)
```

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
# フロントエンド詳細設計書 / Tài liệu Thiết kế Chi tiết Frontend
**Frontend Detail Design (FDD)**

## ドキュメント情報 / Thông tin Tài liệu (Document Information)

| 項目 / Mục / Item | 内容 / Nội dung / Content |
|-------------------|---------------------------|
| **ドキュメントID / Document ID / Mã tài liệu** | FDD-[FEATURE_CODE]-[YYYYMMDD] |
| **機能コード / Feature Code / Mã tính năng** | [FEATURE_CODE] |
| **機能名 / Feature Name / Tên tính năng** | [JP] / [VN] / [EN] |
| **バージョン / Version / Phiên bản** | 1.0 |
| **作成日 / Created Date / Ngày tạo** | [YYYY-MM-DD HH:MM:SS] |
| **最終更新日 / Last Updated / Cập nhật lần cuối** | [YYYY-MM-DD HH:MM:SS] |
| **ステータス / Status / Trạng thái** | Draft / ドラフト / Bản nháp |

---

## 改訂履歴 / Lịch sử Sửa đổi (Revision History)

| バージョン / Version | 日付 / Date / Ngày | 作成者 / Author / Người tạo | 説明 / Description / Mô tả |
|---------------------|--------------------|-----------------------------|---------------------------|
| 1.0 | [YYYY-MM-DD HH:MM:SS] | Claude (fdd-00 agent) | 初版作成 / Tạo phiên bản đầu tiên / Initial creation |

---

## トレーサビリティ / Khả năng Truy xuất (Traceability)

### 要件仕様書リンク / Liên kết SRS (SRS References)

| 項目 / Item / Mục | 内容 / Content / Nội dung |
|-------------------|---------------------------|
| **Document ID** | [SRS_DOC_ID] |
| **Version / バージョン / Phiên bản** | [SRS_VERSION] |
| **Date / 日付 / Ngày** | [SRS_DATE] |
| **Author / 作成者 / Người tạo** | [SRS_AUTHOR] |

### 基本設計書リンク / Liên kết BD (BD References)

| 項目 / Item / Mục | 内容 / Content / Nội dung |
|-------------------|---------------------------|
| **Document ID** | [BD_DOC_ID] |
| **Version / バージョン / Phiên bản** | [BD_VERSION] |
| **Date / 日付 / Ngày** | [BD_DATE] |
| **Author / 作成者 / Người tạo** | [BD_AUTHOR] |

---

## 承認ワークフロー / Quy trình Phê duyệt (Approval Workflow)

| 役割 / Role / Vai trò | 名前 / Name / Tên | 日付 / Date / Ngày | ステータス / Status / Trạng thái |
|----------------------|-------------------|-------------------|--------------------------------|
| 作成者 / Author / Người tạo | Claude (fdd-00 agent) | [YYYY-MM-DD HH:MM:SS] | 完了 / Complete / Hoàn thành |
| レビュー担当者 / Reviewer / Người đánh giá | TBD | - | 保留中 / Pending / Chờ xử lý |
| 承認者 / Approver / Người phê duyệt | TBD | - | 保留中 / Pending / Chờ xử lý |

---

**Checkpoint C0 Validation / チェックポイントC0検証 / Xác thực điểm kiểm tra C0**: ✓
```

---

## Example Output / 出力例 / Ví dụ đầu ra

```markdown
# フロントエンド詳細設計書 / Tài liệu Thiết kế Chi tiết Frontend
**Frontend Detail Design (FDD)**

## ドキュメント情報 / Thông tin Tài liệu (Document Information)

| 項目 / Mục / Item | 内容 / Nội dung / Content |
|-------------------|---------------------------|
| **ドキュメントID / Document ID / Mã tài liệu** | FDD-CMN015002-20251220 |
| **機能コード / Feature Code / Mã tính năng** | CMN015002 |
| **機能名 / Feature Name / Tên tính năng** | ワークフローデザイナー / Trình thiết kế Workflow / Workflow Designer |
| **バージョン / Version / Phiên bản** | 1.0 |
| **作成日 / Created Date / Ngày tạo** | 2025-12-20 01:45:05 |
| **最終更新日 / Last Updated / Cập nhật lần cuối** | 2025-12-20 01:45:05 |
| **ステータス / Status / Trạng thái** | Draft / ドラフト / Bản nháp |

---

## 改訂履歴 / Lịch sử Sửa đổi (Revision History)

| バージョン / Version | 日付 / Date / Ngày | 作成者 / Author / Người tạo | 説明 / Description / Mô tả |
|---------------------|--------------------|-----------------------------|---------------------------|
| 1.0 | 2025-12-20 01:45:05 | Claude (fdd-00 agent) | 初版作成 / Tạo phiên bản đầu tiên / Initial creation |

---

## トレーサビリティ / Khả năng Truy xuất (Traceability)

### 要件仕様書リンク / Liên kết SRS (SRS References)

| 項目 / Item / Mục | 内容 / Content / Nội dung |
|-------------------|---------------------------|
| **Document ID** | SRS-CMN015002-20251215 |
| **Version / バージョン / Phiên bản** | 1.0 |
| **Date / 日付 / Ngày** | 2025-12-15 10:30:00 |
| **Author / 作成者 / Người tạo** | Development Team |

### 基本設計書リンク / Liên kết BD (BD References)

| 項目 / Item / Mục | 内容 / Content / Nội dung |
|-------------------|---------------------------|
| **Document ID** | BD-CMN015002-20251218 |
| **Version / バージョン / Phiên bản** | 1.0 |
| **Date / 日付 / Ngày** | 2025-12-18 14:20:00 |
| **Author / 作成者 / Người tạo** | Architecture Team |

---

## 承認ワークフロー / Quy trình Phê duyệt (Approval Workflow)

| 役割 / Role / Vai trò | 名前 / Name / Tên | 日付 / Date / Ngày | ステータス / Status / Trạng thái |
|----------------------|-------------------|-------------------|--------------------------------|
| 作成者 / Author / Người tạo | Claude (fdd-00 agent) | 2025-12-20 01:45:05 | 完了 / Complete / Hoàn thành |
| レビュー担当者 / Reviewer / Người đánh giá | TBD | - | 保留中 / Pending / Chờ xử lý |
| 承認者 / Approver / Người phê duyệt | TBD | - | 保留中 / Pending / Chờ xử lý |

---

**Checkpoint C0 Validation / チェックポイントC0検証 / Xác thực điểm kiểm tra C0**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] All dates use current system datetime (`date '+%Y-%m-%d %H:%M:%S'`)
2. [ ] Document ID format: FDD-[FEATURE_CODE]-[YYYYMMDD]
3. [ ] Traceability links to SRS and BD established
4. [ ] Bilingual format (Japanese + Vietnamese ≥60%)
5. [ ] No code implementations (metadata only)
6. [ ] Revision history initialized
7. [ ] Approval workflow created
8. [ ] Checkpoint C0 validation marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Frontend Detail Design Document Header Generation*
