# BD Document Info Micro-Agent / 文書情報マイクロエージェント

**Responsibility**: Generate Section 0 (Document Information) of Basic Design
**Output Lines**: 30-40 lines
**Dependencies**: SRS Document (for requirements traceability)

---

## Input Requirements

- Evidence file path (absolute)
- SRS file path (for linking)
- Feature name (e.g., "CMN015002")
- Sub-feature name (e.g., "Workflow Designer")
- Developer name (Vietnamese format)

---

## Processing Logic

### Step 1: Load Evidence and SRS Reference

```pseudocode
evidence = read_file(evidence_file_path)
srs_reference = read_file(srs_file_path)
metadata = extract_metadata_section(evidence)
srs_version = extract_version_from_srs(srs_reference)
```

**Extract:**
- Feature code and name
- Creation date
- Developer information
- SRS document reference
- Version control data

### Step 2: Extract Document Information

**From Evidence:**
- Document title (Japanese + Vietnamese)
- Feature identifier
- Version number
- Author name
- Creation/update dates
- Approval workflow status

**Default Values:**
- Version: 1.0 (for new documents)
- Status: Draft / ドラフト / Bản nháp
- Organization: StarX Co., Ltd.

**SRS Linkage:**
- Reference SRS document number
- SRS version being implemented
- Requirements traceability

### Step 3: Generate Document Header

**Format:**
```
文書番号 / Số tài liệu: BD-[FEATURE_CODE]-[YYYYMMDD]
タイトル / Tiêu đề: [Japanese] / [Vietnamese]
バージョン / Phiên bản: [X.Y]
作成日 / Ngày tạo: [YYYY-MM-DD]
作成者 / Người tạo: [Developer Name]
関連SRS / SRS liên quan: SRS-[FEATURE_CODE]-[DATE]
```

**Bilingual Requirements:**
- Document title: Japanese / Vietnamese
- Status labels: 3 languages (English/Japanese/Vietnamese)
- Technical terms: Keep in English

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] Feature code from evidence file?
- [ ] Developer name from evidence?
- [ ] Dates match evidence creation date?
- [ ] SRS reference from evidence?
- [ ] All metadata has source reference?

**Q2: Consistency?**
- [ ] Document ID format: BD-[CODE]-[DATE]?
- [ ] Version format: X.Y (e.g., 1.0)?
- [ ] Date format: YYYY-MM-DD?
- [ ] SRS document ID matches format?
- [ ] No conflicts with naming conventions?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] All labels bilingual (日本語 / Vietnamese)?
- [ ] Technical terms preserved in English?
- [ ] Feature name bilingual if available?
- [ ] Minimum 60% content in both languages?

**Q4: No Prohibited Content?**
- [ ] No implementation code?
- [ ] No SQL queries or scripts?
- [ ] No technical implementation details?
- [ ] Only metadata and document control info?

---

## Output Template

```markdown
# 基本設計書 / Thiết kế cơ bản
## [Feature Name Japanese] / [Feature Name Vietnamese]

---

## 文書情報 / Thông tin tài liệu

| 項目 / Mục | 内容 / Nội dung |
|------------|----------------|
| 文書番号 / Số tài liệu | BD-[FEATURE_CODE]-[YYYYMMDD] |
| タイトル / Tiêu đề | [Feature Name JP] / [Feature Name VN] - 基本設計書 / Thiết kế cơ bản |
| バージョン / Phiên bản | 1.0 |
| ステータス / Trạng thái | Draft / ドラフト / Bản nháp |
| 作成日 / Ngày tạo | [YYYY-MM-DD] |
| 作成者 / Người tạo | [Developer Name] |
| 最終更新日 / Ngày cập nhật | [YYYY-MM-DD] |
| 組織 / Tổ chức | StarX Co., Ltd. |

---

## 関連文書 / Tài liệu liên quan

| 文書種別 / Loại tài liệu | 文書番号 / Số tài liệu | バージョン / Phiên bản | 参照 / Tham chiếu |
|---------------------|-------------------|-------------------|----------------|
| SRS | SRS-[FEATURE_CODE]-[DATE] | [X.Y] | 要求仕様書 / Đặc tả yêu cầu |
| Architecture Document | [If applicable] | [X.Y] | アーキテクチャ文書 / Tài liệu kiến trúc |

**トレーサビリティ / Traceability:**
- この基本設計書は SRS-[FEATURE_CODE]-[DATE] v[X.Y] に基づいて作成されました
- Thiết kế cơ bản này được tạo dựa trên SRS-[FEATURE_CODE]-[DATE] v[X.Y]

---

## 改訂履歴 / Lịch sử sửa đổi

| バージョン / Phiên bản | 日付 / Ngày | 作成者 / Người tạo | 変更内容 / Nội dung thay đổi |
|----------------------|------------|------------------|---------------------------|
| 1.0 | [YYYY-MM-DD] | [Developer Name] | 初版作成 / Tạo phiên bản đầu tiên |

---

## 承認ワークフロー / Quy trình phê duyệt

| 役割 / Vai trò | 氏名 / Tên | 日付 / Ngày | 署名 / Chữ ký |
|---------------|----------|------------|--------------|
| 作成者 / Người tạo | [Developer Name] | [YYYY-MM-DD] | |
| 設計レビュー担当者 / Người đánh giá thiết kế | | | |
| 技術リード / Technical Lead | | | |
| 承認者 / Người phê duyệt | | | |

---

## 配布先 / Danh sách phân phối

- [ ] 開発チーム / Development Team
- [ ] QAチーム / QA Team
- [ ] プロジェクトマネージャー / Project Manager
- [ ] 技術リード / Technical Lead
- [ ] アーキテクト / Architect

---

## 設計範囲 / Phạm vi thiết kế

**含まれる内容 / Nội dung bao gồm:**
- [ ] アーキテクチャ設計 / Thiết kế kiến trúc
- [ ] コンポーネント設計 / Thiết kế component
- [ ] データ設計 / Thiết kế dữ liệu
- [ ] インターフェース設計 / Thiết kế giao diện
- [ ] セキュリティ設計 / Thiết kế bảo mật

**対象外 / Ngoài phạm vi:**
- [ ] 詳細設計 (Detailed Design)
- [ ] テストケース (Test Cases)
- [ ] 運用手順 (Operation Procedures)

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- SRS Reference: `[srs_file_path]`
- Section: Metadata & Feature Information
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Example Output

```markdown
# 基本設計書 / Thiết kế cơ bản
## ワークフロー設計機能 / Tính năng thiết kế workflow

---

## 文書情報 / Thông tin tài liệu

| 項目 / Mục | 内容 / Nội dung |
|------------|----------------|
| 文書番号 / Số tài liệu | BD-CMN015002-20251220 |
| タイトル / Tiêu đề | ワークフロー設計機能 / Tính năng thiết kế workflow - 基本設計書 / Thiết kế cơ bản |
| バージョン / Phiên bản | 1.0 |
| ステータス / Trạng thái | Draft / ドラフト / Bản nháp |
| 作成日 / Ngày tạo | 2025-12-20 |
| 作成者 / Người tạo | Nguyễn Văn A |
| 最終更新日 / Ngày cập nhật | 2025-12-20 |
| 組織 / Tổ chức | StarX Co., Ltd. |

---

## 関連文書 / Tài liệu liên quan

| 文書種別 / Loại tài liệu | 文書番号 / Số tài liệu | バージョン / Phiên bản | 参照 / Tham chiếu |
|---------------------|-------------------|-------------------|----------------|
| SRS | SRS-CMN015002-20251220 | 1.0 | 要求仕様書 / Đặc tả yêu cầu |
| Architecture Document | ARCH-CMN015-2025 | 2.0 | アーキテクチャ文書 / Tài liệu kiến trúc |

**トレーサビリティ / Traceability:**
- この基本設計書は SRS-CMN015002-20251220 v1.0 に基づいて作成されました
- Thiết kế cơ bản này được tạo dựa trên SRS-CMN015002-20251220 v1.0

---

## 改訂履歴 / Lịch sử sửa đổi

| バージョン / Phiên bản | 日付 / Ngày | 作成者 / Người tạo | 変更内容 / Nội dung thay đổi |
|----------------------|------------|------------------|---------------------------|
| 1.0 | 2025-12-20 | Nguyễn Văn A | 初版作成 / Tạo phiên bản đầu tiên |

---

## 承認ワークフロー / Quy trình phê duyệt

| 役割 / Vai trò | 氏名 / Tên | 日付 / Ngày | 署名 / Chữ ký |
|---------------|----------|------------|--------------|
| 作成者 / Người tạo | Nguyễn Văn A | 2025-12-20 | |
| 設計レビュー担当者 / Người đánh giá thiết kế | | | |
| 技術リード / Technical Lead | | | |
| 承認者 / Người phê duyệt | | | |

---

## 配布先 / Danh sách phân phối

- [ ] 開発チーム / Development Team
- [ ] QAチーム / QA Team
- [ ] プロジェクトマネージャー / Project Manager
- [ ] 技術リード / Technical Lead
- [ ] アーキテクト / Architect

---

## 設計範囲 / Phạm vi thiết kế

**含まれる内容 / Nội dung bao gồm:**
- [x] アーキテクチャ設計 / Thiết kế kiến trúc
- [x] コンポーネント設計 / Thiết kế component
- [x] データ設計 / Thiết kế dữ liệu
- [x] インターフェース設計 / Thiết kế giao diện
- [x] セキュリティ設計 / Thiết kế bảo mật

**対象外 / Ngoài phạm vi:**
- [x] 詳細設計 (Detailed Design)
- [x] テストケース (Test Cases)
- [x] 運用手順 (Operation Procedures)

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `.claude/memory-bank/evidence/CMN015002_workflow_designer.md`
- SRS Reference: `/docs/srs/SRS-CMN015002-20251220.md`
- Section: Metadata & Feature Information
- Extracted: 2025-12-20 11:05:00

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All dates use current system datetime
2. [ ] Feature code matches evidence exactly
3. [ ] Document ID follows format: BD-[CODE]-[DATE]
4. [ ] SRS reference included and valid
5. [ ] Bilingual format for all labels (≥60%)
6. [ ] No implementation details included
7. [ ] Evidence source properly referenced
8. [ ] Traceability to SRS established

**Validation Commands:**
```bash
# Get current datetime
date '+%Y-%m-%d %H:%M:%S'

# Verify evidence file exists
test -f [evidence_file_path] && echo "Evidence found" || echo "Evidence missing"

# Verify SRS file exists
test -f [srs_file_path] && echo "SRS found" || echo "SRS missing"
```

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: BD Section 0 - Document Information*
