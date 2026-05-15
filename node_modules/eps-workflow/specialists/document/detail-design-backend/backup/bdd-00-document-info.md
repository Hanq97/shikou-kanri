# Document Info Micro-Agent / ドキュメント情報マイクロエージェント / Micro-Agent Thông tin Tài liệu

**Responsibility / 責任 / Trách nhiệm**: Generate Backend Detail Design document header with metadata, revision history, and approval workflow
**Output Lines / 出力行数 / Số dòng đầu ra**: ~50-80 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS document, Basic Design document
**Checkpoint / チェックポイント / Điểm kiểm tra**: C0

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Research findings and requirements
2. **SRS File Path** - Software Requirements Specification
3. **Basic Design File Path** - Basic Design document
4. **Feature Code** - Feature identifier (e.g., CMN015002)
5. **Feature Name** - Japanese, Vietnamese, English names

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Same as FDD-00, but generates BDD document ID]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
# バックエンド詳細設計書 / Tài liệu Thiết kế Chi tiết Backend
**Backend Detail Design (BDD)**

## ドキュメント情報 / Thông tin Tài liệu (Document Information)

| 項目 / Mục / Item | 内容 / Nội dung / Content |
|-------------------|---------------------------|
| **ドキュメントID / Document ID / Mã tài liệu** | BDD-[FEATURE_CODE]-[YYYYMMDD] |
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
| 1.0 | [YYYY-MM-DD HH:MM:SS] | Claude (bdd-00 agent) | 初版作成 / Tạo phiên bản đầu tiên / Initial creation |

---

## トレーサビリティ / Khả năng Truy xuất (Traceability)

### 要件仕様書リンク / Liên kết SRS (SRS References)

| 項目 / Item / Mục | 内容 / Content / Nội dung |
|-------------------|---------------------------|
| **Document ID** | [SRS_DOC_ID] |
| **Version / バージョン / Phiên bản** | [SRS_VERSION] |
| **Date / 日付 / Ngày** | [SRS_DATE] |

### 基本設計書リンク / Liên kết BD (BD References)

| 項目 / Item / Mục | 内容 / Content / Nội dung |
|-------------------|---------------------------|
| **Document ID** | [BD_DOC_ID] |
| **Version / バージョン / Phiên bản** | [BD_VERSION] |
| **Date / 日付 / Ngày** | [BD_DATE] |

---

## 承認ワークフロー / Quy trình Phê duyệt (Approval Workflow)

| 役割 / Role / Vai trò | 名前 / Name / Tên | 日付 / Date / Ngày | ステータス / Status / Trạng thái |
|----------------------|-------------------|-------------------|--------------------------------|
| 作成者 / Author / Người tạo | Claude (bdd-00 agent) | [YYYY-MM-DD HH:MM:SS] | 完了 / Complete / Hoàn thành |
| レビュー担当者 / Reviewer / Người đánh giá | TBD | - | 保留中 / Pending / Chờ xử lý |
| 承認者 / Approver / Người phê duyệt | TBD | - | 保留中 / Pending / Chờ xử lý |

---

**Checkpoint C0 Validation / チェックポイントC0検証 / Xác thực điểm kiểm tra C0**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Document ID format: BDD-[FEATURE_CODE]-[YYYYMMDD]
2. [ ] All dates use current system datetime
3. [ ] Traceability links established
4. [ ] Bilingual format (≥60%)
5. [ ] Checkpoint C0 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Backend Detail Design Document Header Generation*
