# SRS Constraints Micro-Agent / 制約条件マイクロエージェント

**Responsibility**: Generate Section 4 (Constraints) of SRS
**Output Lines**: 40-60 lines
**Dependencies**: srs-03-non-functional-req.md (for technical context)

---

## Input Requirements

- Evidence file path (absolute)
- Feature code (e.g., "CMN015002")
- Technical constraints (from evidence)
- Business constraints (from evidence)
- Regulatory constraints (from evidence)

---

## Processing Logic

### Step 1: Load Evidence File

```pseudocode
evidence = read_file(evidence_file_path)
tech_constraints = extract_section(evidence, "Technical Constraints|技術制約")
business_constraints = extract_section(evidence, "Business Constraints|ビジネス制約")
regulatory = extract_section(evidence, "Regulatory|規制|Quy định")
timeline = extract_section(evidence, "Timeline|スケジュール|Lịch trình")
budget = extract_section(evidence, "Budget|予算|Ngân sách")
```

**Extract:**
- Technology stack limitations
- Platform requirements
- Regulatory compliance requirements
- Budget constraints
- Timeline constraints
- Resource constraints

### Step 2: Structure Constraints

**4.1 技術的制約 / Technical Constraints**
- Mandatory technology stack
- Platform and infrastructure requirements
- Integration constraints
- Legacy system compatibility

**4.2 ビジネス制約 / Business Constraints**
- Budget limitations
- Timeline and delivery dates
- Resource availability
- Organizational policies

**4.3 規制・法令制約 / Regulatory & Legal Constraints**
- Data protection laws (GDPR, PDPA)
- Industry regulations
- Compliance requirements
- Audit requirements

**4.4 その他の制約 / Other Constraints**
- Operational constraints
- Maintenance windows
- Training requirements
- Documentation requirements

### Step 3: Categorize and Prioritize

**Constraint Impact:**
- **Critical**: Must comply (non-negotiable)
- **High**: Should comply (strong preference)
- **Medium**: Could comply (negotiable)

**Constraint Type:**
- **Mandatory**: Cannot be changed
- **Preferred**: Preferred but flexible
- **Guideline**: Recommended best practice

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] All constraints from evidence?
- [ ] Technology choices from evidence?
- [ ] Timeline from evidence/project plan?
- [ ] Budget from evidence?
- [ ] No assumed constraints?

**Q2: Consistency?**
- [ ] No conflicts with functional requirements (Section 2)?
- [ ] Aligned with non-functional requirements (Section 3)?
- [ ] Technology stack consistent throughout?
- [ ] Regulatory requirements realistic?
- [ ] Timeline achievable?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] Headers bilingual (日本語 / Vietnamese)?
- [ ] Constraint descriptions bilingual?
- [ ] Category names bilingual?
- [ ] Technical terms in English?
- [ ] Regulatory names in original language?

**Q4: No Prohibited Content?**
- [ ] No implementation code?
- [ ] No SQL queries?
- [ ] No detailed architecture (only high-level constraints)?
- [ ] No specific vendor solutions (unless mandated)?
- [ ] Only constraints and limitations?

---

## Output Template

```markdown
## 4. 制約条件 / Ràng buộc (Constraints)

### 4.1 技術的制約 / Ràng buộc kỹ thuật (Technical Constraints)

#### CON-TECH-[CODE]-001: [Constraint Title JP] / [Title VN]

**説明 / Mô tả:**
[Detailed constraint description in Japanese]

[Detailed constraint description in Vietnamese]

**影響度 / Impact:** Critical / High / Medium

**タイプ / Type:** Mandatory / Preferred / Guideline

**詳細 / Details:**
- [Detail 1 JP] / [Detail 1 VN]
- [Detail 2 JP] / [Detail 2 VN]

**理由 / Reason:**
[Rationale for this constraint JP] / [Rationale VN]

---

### 4.2 ビジネス制約 / Ràng buộc nghiệp vụ (Business Constraints)

#### CON-BIZ-[CODE]-001: [Constraint Title JP] / [Title VN]

**説明 / Mô tả:**
[Business constraint description in Japanese]

[Business constraint description in Vietnamese]

**影響度 / Impact:** Critical / High / Medium

**タイプ / Type:** Mandatory / Preferred / Guideline

**詳細 / Details:**
- [Detail 1 JP] / [Detail 1 VN]
- [Detail 2 JP] / [Detail 2 VN]

**期限 / Deadline:** [YYYY-MM-DD] (if applicable)

**予算 / Budget:** [Amount] (if applicable)

---

### 4.3 規制・法令制約 / Ràng buộc quy định & pháp lý (Regulatory & Legal Constraints)

#### CON-REG-[CODE]-001: [Regulation Title JP] / [Title VN]

**説明 / Mô tả:**
[Regulatory constraint description in Japanese]

[Regulatory constraint description in Vietnamese]

**影響度 / Impact:** Critical / High / Medium

**タイプ / Type:** Mandatory

**準拠法令 / Compliance Laws:**
- [Law/Regulation 1]
- [Law/Regulation 2]

**コンプライアンス要件 / Compliance Requirements:**
- [Requirement 1 JP] / [Requirement 1 VN]
- [Requirement 2 JP] / [Requirement 2 VN]

**監査要件 / Audit Requirements:**
- [Audit requirement JP] / [Audit requirement VN]

---

### 4.4 その他の制約 / Các ràng buộc khác (Other Constraints)

#### CON-OTH-[CODE]-001: [Constraint Title JP] / [Title VN]

**説明 / Mô tả:**
[Other constraint description in Japanese]

[Other constraint description in Vietnamese]

**影響度 / Impact:** Critical / High / Medium

**タイプ / Type:** Mandatory / Preferred / Guideline

**詳細 / Details:**
- [Detail 1 JP] / [Detail 1 VN]
- [Detail 2 JP] / [Detail 2 VN]

---

### 4.5 制約条件サマリー / Constraints Summary

| カテゴリ / Category | Critical | High | Medium | Total |
|------------------|----------|------|--------|-------|
| 技術的制約 / Technical | [X] | [Y] | [Z] | [Total] |
| ビジネス制約 / Business | [X] | [Y] | [Z] | [Total] |
| 規制・法令 / Regulatory | [X] | [Y] | [Z] | [Total] |
| その他 / Other | [X] | [Y] | [Z] | [Total] |

**必須制約 (Mandatory) / Ràng buộc bắt buộc:** [Count]
**推奨制約 (Preferred) / Ràng buộc đề xuất:** [Count]
**ガイドライン (Guideline) / Hướng dẫn:** [Count]

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- Sections: Technical Constraints, Business Constraints, Regulatory, Timeline, Budget
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Example Output

```markdown
## 4. 制約条件 / Ràng buộc (Constraints)

### 4.1 技術的制約 / Ràng buộc kỹ thuật (Technical Constraints)

#### CON-TECH-CMN015002-001: 技術スタック / Technology Stack

**説明 / Mô tả:**
フロントエンドはNext.js 15.3.0とReact 19を使用する必要があります。これは既存システムとの一貫性を保つための必須要件です。

Frontend phải sử dụng Next.js 15.3.0 và React 19. Đây là yêu cầu bắt buộc để duy trì tính nhất quán với hệ thống hiện tại.

**影響度 / Impact:** Critical

**タイプ / Type:** Mandatory

**詳細 / Details:**
- Next.js 15.3.0 (App Router使用) / (Sử dụng App Router)
- React 19 (Server Components優先) / (Ưu tiên Server Components)
- TypeScript 5 必須 / Bắt buộc
- TailwindCSS for styling

**理由 / Reason:**
既存のCRMシステムと技術スタックを統一し、保守性を向上させるため / Thống nhất stack công nghệ với hệ thống CRM hiện tại để cải thiện khả năng bảo trì

---

#### CON-TECH-CMN015002-002: ブラウザ互換性 / Tương thích trình duyệt

**説明 / Mô tả:**
モダンブラウザの最新版から2世代前までをサポートする必要があります。IE11はサポート対象外です。

Cần hỗ trợ 2 phiên bản gần nhất của các trình duyệt hiện đại. Không hỗ trợ IE11.

**影響度 / Impact:** High

**タイプ / Type:** Mandatory

**詳細 / Details:**
- Chrome 最新-2世代 / 2 phiên bản gần nhất
- Firefox 最新-2世代 / 2 phiên bản gần nhất
- Safari 最新版のみ / Chỉ phiên bản mới nhất
- Edge 最新版のみ / Chỉ phiên bản mới nhất

**理由 / Reason:**
モダンWeb技術の活用とセキュリティ確保のため / Tận dụng công nghệ web hiện đại và đảm bảo bảo mật

---

### 4.2 ビジネス制約 / Ràng buộc nghiệp vụ (Business Constraints)

#### CON-BIZ-CMN015002-001: 開発期間 / Thời gian phát triển

**説明 / Mô tả:**
Phase 1の開発は2025年1月末までに完了する必要があります。

Phát triển Phase 1 cần hoàn thành trước cuối tháng 1/2025.

**影響度 / Impact:** Critical

**タイプ / Type:** Mandatory

**詳細 / Details:**
- 要件定義: 2週間 / Định nghĩa yêu cầu: 2 tuần
- 設計: 2週間 / Thiết kế: 2 tuần
- 実装: 4週間 / Triển khai: 4 tuần
- テスト: 2週間 / Kiểm thử: 2 tuần

**期限 / Deadline:** 2025-01-31

---

#### CON-BIZ-CMN015002-002: リソース制約 / Ràng buộc nguồn lực

**説明 / Mô tả:**
開発チームは最大3名まで、フロントエンド2名とバックエンド1名の構成とします。

Đội phát triển tối đa 3 người: 2 frontend và 1 backend.

**影響度 / Impact:** High

**タイプ / Type:** Mandatory

**詳細 / Details:**
- フロントエンド開発者: 2名 / Lập trình viên frontend: 2 người
- バックエンド開発者: 1名 / Lập trình viên backend: 1 người
- 専任配置 (80%以上の稼働率) / Phân công chuyên trách (≥80% thời gian)

---

### 4.3 規制・法令制約 / Ràng buộc quy định & pháp lý (Regulatory & Legal Constraints)

#### CON-REG-CMN015002-001: データ保護規制 / Quy định bảo vệ dữ liệu

**説明 / Mô tả:**
個人データの取り扱いは、GDPR（欧州）およびPDPA（ベトナム）に準拠する必要があります。

Xử lý dữ liệu cá nhân phải tuân thủ GDPR (Châu Âu) và PDPA (Việt Nam).

**影響度 / Impact:** Critical

**タイプ / Type:** Mandatory

**準拠法令 / Compliance Laws:**
- GDPR (General Data Protection Regulation)
- PDPA (Personal Data Protection Act) - Vietnam
- サイバーセキュリティ法 (ベトナム) / Luật An ninh mạng (Việt Nam)

**コンプライアンス要件 / Compliance Requirements:**
- データ暗号化必須 (AES-256) / Mã hóa dữ liệu bắt buộc
- アクセスログ記録と保管 (1年間) / Ghi log truy cập và lưu trữ (1 năm)
- データ削除権の実装 / Triển khai quyền xóa dữ liệu
- データ処理同意の取得 / Lấy đồng ý xử lý dữ liệu

**監査要件 / Audit Requirements:**
- 四半期ごとのセキュリティ監査 / Kiểm toán bảo mật hàng quý

---

### 4.4 その他の制約 / Các ràng buộc khác (Other Constraints)

#### CON-OTH-CMN015002-001: メンテナンスウィンドウ / Cửa sổ bảo trì

**説明 / Mô tả:**
システムメンテナンスは毎週日曜日の午前2時～5時（JST）に限定されます。

Bảo trì hệ thống giới hạn trong khung Chủ nhật 2:00-5:00 AM (JST) hàng tuần.

**影響度 / Impact:** Medium

**タイプ / Type:** Preferred

**詳細 / Details:**
- 定期メンテナンス: 日曜日 02:00-05:00 JST / Bảo trì định kỳ: Chủ nhật 02:00-05:00 JST
- 緊急メンテナンス: 事前通知24時間以上 / Bảo trì khẩn cấp: Thông báo trước ≥24 giờ

---

#### CON-OTH-CMN015002-002: ドキュメント要件 / Yêu cầu tài liệu

**説明 / Mô tả:**
すべての技術文書は日本語とベトナム語の両言語で作成する必要があります。

Tất cả tài liệu kỹ thuật cần được tạo bằng cả tiếng Nhật và tiếng Việt.

**影響度 / Impact:** High

**タイプ / Type:** Mandatory

**詳細 / Details:**
- SRS (Software Requirements Specification) - 両言語 / Song ngữ
- Basic Design Document - 両言語 / Song ngữ
- API Documentation - 英語可 / Có thể tiếng Anh
- User Manual - 両言語必須 / Bắt buộc song ngữ

---

### 4.5 制約条件サマリー / Constraints Summary

| カテゴリ / Category | Critical | High | Medium | Total |
|------------------|----------|------|--------|-------|
| 技術的制約 / Technical | 1 | 1 | 0 | 2 |
| ビジネス制約 / Business | 1 | 1 | 0 | 2 |
| 規制・法令 / Regulatory | 1 | 0 | 0 | 1 |
| その他 / Other | 0 | 1 | 1 | 2 |

**必須制約 (Mandatory) / Ràng buộc bắt buộc:** 6
**推奨制約 (Preferred) / Ràng buộc đề xuất:** 1
**ガイドライン (Guideline) / Hướng dẫn:** 0

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `.claude/memory-bank/evidence/CMN015002_workflow_designer.md`
- Sections: Technical Constraints, Business Constraints, Regulatory, Timeline
- Extracted: 2025-12-20 10:50:00

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All constraints from evidence file
2. [ ] Impact levels assigned (Critical/High/Medium)
3. [ ] Constraint types specified (Mandatory/Preferred/Guideline)
4. [ ] ID format: CON-[CATEGORY]-[CODE]-[NUMBER]
5. [ ] Bilingual format ≥60% of content
6. [ ] No implementation details
7. [ ] Regulatory requirements accurate
8. [ ] Timeline realistic and from evidence
9. [ ] Evidence sources cited

**Validation Commands:**
```bash
# Count constraints by category
grep -c "^#### CON-TECH" output.md
grep -c "^#### CON-BIZ" output.md
grep -c "^#### CON-REG" output.md

# Verify impact levels
grep -c "Critical\|High\|Medium" output.md
```

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: SRS Section 4 - Constraints*
