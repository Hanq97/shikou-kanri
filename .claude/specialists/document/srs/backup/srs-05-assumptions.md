# SRS Assumptions Micro-Agent / 前提条件マイクロエージェント

**Responsibility**: Generate Section 5 (Assumptions & Dependencies) of SRS
**Output Lines**: 30-50 lines
**Dependencies**: srs-04-constraints.md (for constraint context)

---

## Input Requirements

- Evidence file path (absolute)
- Feature code (e.g., "CMN015002")
- Assumptions (from evidence)
- Dependencies (from evidence)
- External factors (from evidence)

---

## Processing Logic

### Step 1: Load Evidence File

```pseudocode
evidence = read_file(evidence_file_path)
assumptions = extract_section(evidence, "Assumptions|前提条件|Giả định")
dependencies = extract_section(evidence, "Dependencies|依存関係|Phụ thuộc")
external_systems = extract_section(evidence, "External Systems|外部システム")
risks = extract_section(evidence, "Risks|リスク|Rủi ro")
```

**Extract:**
- Technical assumptions
- Business assumptions
- Dependencies on other systems
- Dependencies on external services
- Dependencies on third-party libraries

### Step 2: Structure Assumptions & Dependencies

**5.1 前提条件 / Assumptions**
- Technical assumptions (infrastructure, tools)
- Business assumptions (user behavior, data availability)
- Environmental assumptions (network, hardware)

**5.2 依存関係 / Dependencies**
- Internal system dependencies
- External system dependencies
- Third-party service dependencies
- Library/framework dependencies

**5.3 外部要因 / External Factors**
- External services availability
- Third-party API stability
- Network connectivity
- Data source availability

### Step 3: Categorize by Impact

**Impact Level:**
- **High**: Critical to project success
- **Medium**: Important but workarounds possible
- **Low**: Minor impact if assumption invalid

**Validity:**
- **Verified**: Confirmed through evidence
- **Assumed**: Based on reasonable assumption
- **To be validated**: Requires verification

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] Assumptions from evidence file?
- [ ] Dependencies identified in evidence?
- [ ] External systems listed in evidence?
- [ ] No invented assumptions?
- [ ] Evidence sources cited?

**Q2: Consistency?**
- [ ] Assumptions align with constraints (Section 4)?
- [ ] Dependencies match technical requirements?
- [ ] No conflicts with functional requirements (Section 2)?
- [ ] Impact levels realistic?
- [ ] IDs unique and follow format?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] Headers bilingual (日本語 / Vietnamese)?
- [ ] Assumption descriptions bilingual?
- [ ] Dependency descriptions bilingual?
- [ ] Technical terms in English?
- [ ] System names in original language?

**Q4: No Prohibited Content?**
- [ ] No implementation code?
- [ ] No SQL queries?
- [ ] No detailed API specifications?
- [ ] No infrastructure diagrams (high-level only)?
- [ ] Only assumptions and dependencies?

---

## Output Template

```markdown
## 5. 前提条件と依存関係 / Giả định và phụ thuộc (Assumptions & Dependencies)

### 5.1 前提条件 / Giả định (Assumptions)

#### ASM-[CODE]-001: [Assumption Title JP] / [Title VN]

**説明 / Mô tả:**
[Detailed assumption description in Japanese]

[Detailed assumption description in Vietnamese]

**カテゴリ / Category:** Technical / Business / Environmental

**影響度 / Impact:** High / Medium / Low

**妥当性 / Validity:** Verified / Assumed / To be validated

**検証方法 / Verification Method:**
[How to verify this assumption JP] / [How to verify VN]

**無効時の対応 / Mitigation if Invalid:**
[Contingency plan JP] / [Contingency plan VN]

---

### 5.2 依存関係 / Phụ thuộc (Dependencies)

#### DEP-[CODE]-001: [Dependency Title JP] / [Title VN]

**説明 / Mô tả:**
[Dependency description in Japanese]

[Dependency description in Vietnamese]

**タイプ / Type:** Internal System / External System / Third-party Service / Library

**影響度 / Impact:** High / Medium / Low

**依存先 / Dependent On:**
- システム/サービス名 / System/Service name: [Name]
- バージョン / Version: [Version]
- 利用可能性 / Availability: [SLA or availability info]

**代替案 / Alternative:**
[Alternative solution if dependency unavailable JP/VN]

**リスク / Risk:**
[Risk if dependency fails JP] / [Risk VN]

---

### 5.3 外部要因 / Yếu tố bên ngoài (External Factors)

#### EXT-[CODE]-001: [External Factor Title JP] / [Title VN]

**説明 / Mô tả:**
[External factor description in Japanese]

[External factor description in Vietnamese]

**影響度 / Impact:** High / Medium / Low

**制御可能性 / Controllability:** Controllable / Partially Controllable / Uncontrollable

**モニタリング方法 / Monitoring Method:**
[How to monitor this factor JP] / [How to monitor VN]

**対応策 / Response Strategy:**
[Strategy if factor changes JP] / [Strategy VN]

---

### 5.4 前提条件・依存関係サマリー / Summary

| カテゴリ / Category | High影響 / High Impact | Medium影響 / Medium Impact | Low影響 / Low Impact | Total |
|------------------|---------------------|------------------------|-------------------|-------|
| 前提条件 / Assumptions | [X] | [Y] | [Z] | [Total] |
| 依存関係 / Dependencies | [X] | [Y] | [Z] | [Total] |
| 外部要因 / External Factors | [X] | [Y] | [Z] | [Total] |

**検証済み (Verified) / Đã xác minh:** [Count]
**要検証 (To be validated) / Cần xác minh:** [Count]

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- Sections: Assumptions, Dependencies, External Systems, Risks
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Example Output

```markdown
## 5. 前提条件と依存関係 / Giả định và phụ thuộc (Assumptions & Dependencies)

### 5.1 前提条件 / Giả định (Assumptions)

#### ASM-CMN015002-001: ブラウザサポート / Hỗ trợ trình duyệt

**説明 / Mô tả:**
すべてのユーザーがモダンブラウザ（Chrome、Firefox、Safari、Edge）を使用していることを前提とします。

Giả định rằng tất cả người dùng sử dụng trình duyệt hiện đại (Chrome, Firefox, Safari, Edge).

**カテゴリ / Category:** Technical

**影響度 / Impact:** High

**妥当性 / Validity:** Verified

**検証方法 / Verification Method:**
既存ユーザーのブラウザ利用状況分析により、98%がモダンブラウザを使用していることを確認済み。
Đã xác minh qua phân tích sử dụng trình duyệt: 98% người dùng hiện tại dùng trình duyệt hiện đại.

**無効時の対応 / Mitigation if Invalid:**
IE11サポートが必要な場合、polyfillの追加とUIの簡素化を実施。
Nếu cần hỗ trợ IE11, thêm polyfill và đơn giản hóa UI.

---

#### ASM-CMN015002-002: ネットワーク接続 / Kết nối mạng

**説明 / Mô tả:**
ユーザーは安定したインターネット接続（最低1Mbps）を持つことを前提とします。

Giả định người dùng có kết nối internet ổn định (tối thiểu 1Mbps).

**カテゴリ / Category:** Environmental

**影響度 / Impact:** Medium

**妥当性 / Validity:** Assumed

**検証方法 / Verification Method:**
ユーザー環境調査を実施し、平均接続速度を測定。
Khảo sát môi trường người dùng và đo tốc độ kết nối trung bình.

**無効時の対応 / Mitigation if Invalid:**
データ圧縮、ネットワークエラーの適切な処理。
Nén dữ liệu, xử lý lỗi mạng phù hợp.

---

### 5.2 依存関係 / Phụ thuộc (Dependencies)

#### DEP-CMN015002-001: User Management Service / Dịch vụ quản lý người dùng

**説明 / Mô tả:**
ワークフロー設計機能は、認証・認可のためにUser Management Serviceに依存します。

Chức năng thiết kế workflow phụ thuộc vào User Management Service để xác thực và phân quyền.

**タイプ / Type:** Internal System

**影響度 / Impact:** High

**依存先 / Dependent On:**
- システム/サービス名 / System/Service name: User Management Service
- バージョン / Version: v2.0+
- 利用可能性 / Availability: 99.9% SLA

**代替案 / Alternative:**
一時的にローカル認証を使用し、後でUser Management Serviceと同期。
Sử dụng xác thực local tạm thời, đồng bộ với UMS sau.

**リスク / Risk:**
User Management Serviceが停止すると、ログインと権限確認が不可能になる。
Nếu UMS ngừng hoạt động, không thể đăng nhập và kiểm tra quyền.

---

#### DEP-CMN015002-002: React Flow Library

**説明 / Mô tả:**
ワークフロー図の描画にReact Flow libraryを使用します。

Sử dụng thư viện React Flow để vẽ sơ đồ workflow.

**タイプ / Type:** Library

**影響度 / Impact:** High

**依存先 / Dependent On:**
- ライブラリ名 / Library name: React Flow
- バージョン / Version: ^11.10.0
- ライセンス / License: MIT

**代替案 / Alternative:**
別のdiagram library（例: D3.js, Mermaid）を使用、またはカスタム実装。
Sử dụng thư viện diagram khác (VD: D3.js, Mermaid) hoặc triển khai tùy chỉnh.

**リスク / Risk:**
ライブラリのバグや非互換性の変更によりワークフロー描画が機能しない可能性。
Lỗi hoặc thay đổi không tương thích của thư viện có thể làm vẽ workflow không hoạt động.

---

#### DEP-CMN015002-003: PostgreSQL Database

**説明 / Mô tả:**
ワークフロー定義とメタデータをPostgreSQLに保存します。

Lưu định nghĩa workflow và metadata vào PostgreSQL.

**タイプ / Type:** Internal System

**影響度 / Impact:** High

**依存先 / Dependent On:**
- データベース / Database: PostgreSQL
- バージョン / Version: 14+
- 利用可能性 / Availability: 99.95% SLA

**代替案 / Alternative:**
他のRDBMS（MySQL、MariaDB）への移行可能だが、JSONBサポートが必要。
Có thể chuyển sang RDBMS khác (MySQL, MariaDB) nhưng cần hỗ trợ JSONB.

**リスク / Risk:**
データベース障害時、ワークフロー定義の読み書きが不可能。
Khi database lỗi, không thể đọc/ghi định nghĩa workflow.

---

### 5.3 外部要因 / Yếu tố bên ngoài (External Factors)

#### EXT-CMN015002-001: Keycloak認証サービス / Dịch vụ xác thực Keycloak

**説明 / Mô tả:**
認証にKeycloakを使用するため、Keycloakサービスの可用性に依存します。

Phụ thuộc vào tính khả dụng của dịch vụ Keycloak để xác thực.

**影響度 / Impact:** High

**制御可能性 / Controllability:** Partially Controllable

**モニタリング方法 / Monitoring Method:**
Keycloakのヘルスチェックエンドポイントを定期的に監視（1分間隔）。
Giám sát endpoint health check của Keycloak định kỳ (mỗi 1 phút).

**対応策 / Response Strategy:**
Keycloak障害時は、キャッシュされたトークンで一時的に継続、復旧後に再認証。
Khi Keycloak lỗi, tiếp tục tạm thời với token đã cache, xác thực lại sau khi phục hồi.

---

### 5.4 前提条件・依存関係サマリー / Summary

| カテゴリ / Category | High影響 / High Impact | Medium影響 / Medium Impact | Low影響 / Low Impact | Total |
|------------------|---------------------|------------------------|-------------------|-------|
| 前提条件 / Assumptions | 1 | 1 | 0 | 2 |
| 依存関係 / Dependencies | 3 | 0 | 0 | 3 |
| 外部要因 / External Factors | 1 | 0 | 0 | 1 |

**検証済み (Verified) / Đã xác minh:** 1
**要検証 (To be validated) / Cần xác minh:** 1

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `.claude/memory-bank/evidence/CMN015002_workflow_designer.md`
- Sections: Assumptions, Dependencies, External Systems
- Extracted: 2025-12-20 10:55:00

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All assumptions from evidence file
2. [ ] All dependencies identified from evidence
3. [ ] Impact levels assigned (High/Medium/Low)
4. [ ] Validity status specified (Verified/Assumed/To be validated)
5. [ ] ID format: ASM/DEP/EXT-[CODE]-[NUMBER]
6. [ ] Bilingual format ≥60% of content
7. [ ] Mitigation strategies provided
8. [ ] Alternative solutions documented
9. [ ] Evidence sources cited

**Validation Commands:**
```bash
# Count assumptions
grep -c "^#### ASM-" output.md

# Count dependencies
grep -c "^#### DEP-" output.md

# Count external factors
grep -c "^#### EXT-" output.md

# Verify impact levels
grep -c "High\|Medium\|Low" output.md
```

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: SRS Section 5 - Assumptions & Dependencies*
