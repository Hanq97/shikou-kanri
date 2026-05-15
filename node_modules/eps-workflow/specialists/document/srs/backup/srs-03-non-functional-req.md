# SRS Non-Functional Requirements Micro-Agent / 非機能要件マイクロエージェント

**Responsibility**: Generate Section 3 (Non-Functional Requirements) of SRS
**Output Lines**: 80-100 lines
**Dependencies**: srs-02-functional-req.md (for functional context)

---

## Input Requirements

- Evidence file path (absolute)
- Feature code (e.g., "CMN015002")
- Performance requirements (from evidence)
- Security requirements (from evidence)
- Quality attributes (from evidence)

---

## Processing Logic

### Step 1: Load Evidence File

```pseudocode
evidence = read_file(evidence_file_path)
performance = extract_section(evidence, "Performance|性能|Hiệu năng")
security = extract_section(evidence, "Security|セキュリティ|Bảo mật")
usability = extract_section(evidence, "Usability|使いやすさ|Khả năng sử dụng")
reliability = extract_section(evidence, "Reliability|信頼性|Độ tin cậy")
scalability = extract_section(evidence, "Scalability|拡張性|Khả năng mở rộng")
```

**Extract:**
- Performance metrics (response time, throughput)
- Security requirements (authentication, authorization)
- Usability requirements (UI/UX)
- Reliability requirements (availability, MTBF)
- Scalability requirements (concurrent users, data volume)

### Step 2: Structure Non-Functional Requirements

**3.1 パフォーマンス要件 / Performance Requirements**
- Response time targets
- Throughput requirements
- Resource utilization limits
- Load handling capacity

**3.2 セキュリティ要件 / Security Requirements**
- Authentication mechanisms
- Authorization and access control
- Data encryption requirements
- Audit logging requirements

**3.3 使いやすさ要件 / Usability Requirements**
- User interface standards
- Accessibility requirements (WCAG)
- Internationalization (i18n)
- User training requirements

**3.4 信頼性要件 / Reliability Requirements**
- Availability targets (uptime %)
- MTBF (Mean Time Between Failures)
- MTTR (Mean Time To Recovery)
- Backup and recovery requirements

**3.5 拡張性要件 / Scalability Requirements**
- Concurrent user capacity
- Data volume capacity
- Horizontal/vertical scaling
- Future growth projections

**3.6 互換性要件 / Compatibility Requirements**
- Browser compatibility
- Mobile device support
- API version compatibility
- Database compatibility

### Step 3: Generate Measurable Requirements

**SMART Criteria:**
- **S**pecific: Clear and precise
- **M**easurable: Quantifiable metrics
- **A**chievable: Technically feasible
- **R**elevant: Aligned with business needs
- **T**ime-bound: With target dates if applicable

**ID Format:**
- NFR-[CATEGORY]-[CODE]-[NUMBER]
- Categories: PERF, SEC, USA, REL, SCAL, COMP

### Step 4: Validate Output (Q1-Q4)

**Q1: Evidence-Based?**
- [ ] All NFRs from evidence file?
- [ ] Performance metrics from evidence?
- [ ] Security requirements from evidence?
- [ ] No assumed requirements?
- [ ] Evidence sources cited?

**Q2: Consistency?**
- [ ] IDs unique and follow format?
- [ ] No conflicts with functional requirements?
- [ ] Metrics are measurable?
- [ ] Priorities aligned?
- [ ] Scope matches Section 1.2?

**Q3: Japanese + Vietnamese ≥60%?**
- [ ] Headers bilingual (日本語 / Vietnamese)?
- [ ] Requirement descriptions bilingual?
- [ ] Category names bilingual?
- [ ] Technical metrics in standard units?
- [ ] Technical terms in English?

**Q4: No Prohibited Content?**
- [ ] No implementation code?
- [ ] No SQL queries?
- [ ] No specific technology choices (unless in evidence)?
- [ ] No infrastructure details (unless required)?
- [ ] Only requirements and constraints?

---

## Output Template

```markdown
## 3. 非機能要件 / Yêu cầu phi chức năng (Non-Functional Requirements)

### 3.1 パフォーマンス要件 / Yêu cầu hiệu năng (Performance Requirements)

#### NFR-PERF-[CODE]-001: [Performance Requirement Title JP] / [Title VN]

**説明 / Mô tả:**
[Detailed description in Japanese]

[Detailed description in Vietnamese]

**メトリクス / Metrics:**
| 項目 / Mục | 目標値 / Giá trị mục tiêu | 測定方法 / Phương pháp đo |
|---------|----------------------|---------------------|
| レスポンスタイム / Response Time | ≤ [X] ms | [Measurement method JP/VN] |
| スループット / Throughput | ≥ [Y] req/sec | [Measurement method JP/VN] |
| CPU使用率 / CPU Usage | ≤ [Z]% | [Measurement method JP/VN] |

**優先度 / Priority:** High / Medium / Low

---

### 3.2 セキュリティ要件 / Yêu cầu bảo mật (Security Requirements)

#### NFR-SEC-[CODE]-001: [Security Requirement Title JP] / [Title VN]

**説明 / Mô tả:**
[Detailed security requirement in Japanese]

[Detailed security requirement in Vietnamese]

**セキュリティ対策 / Security Measures:**
- [Measure 1 JP] / [Measure 1 VN]
- [Measure 2 JP] / [Measure 2 VN]
- [Measure 3 JP] / [Measure 3 VN]

**準拠基準 / Compliance Standards:**
- [Standard 1: e.g., OWASP Top 10]
- [Standard 2: e.g., GDPR, PDPA]

**優先度 / Priority:** High / Medium / Low

---

### 3.3 使いやすさ要件 / Yêu cầu khả năng sử dụng (Usability Requirements)

#### NFR-USA-[CODE]-001: [Usability Requirement Title JP] / [Title VN]

**説明 / Mô tả:**
[Usability requirement description in Japanese]

[Usability requirement description in Vietnamese]

**ユーザビリティ基準 / Usability Criteria:**
- [Criterion 1 JP] / [Criterion 1 VN]
- [Criterion 2 JP] / [Criterion 2 VN]

**アクセシビリティ / Accessibility:**
- WCAG 2.1 Level [A/AA/AAA] 準拠 / Tuân thủ

**優先度 / Priority:** High / Medium / Low

---

### 3.4 信頼性要件 / Yêu cầu độ tin cậy (Reliability Requirements)

#### NFR-REL-[CODE]-001: [Reliability Requirement Title JP] / [Title VN]

**説明 / Mô tả:**
[Reliability requirement description in Japanese]

[Reliability requirement description in Vietnamese]

**信頼性メトリクス / Reliability Metrics:**
| 項目 / Mục | 目標値 / Giá trị mục tiêu |
|---------|----------------------|
| 可用性 / Availability | [X]% (例: 99.9%) |
| MTBF | [Y] hours |
| MTTR | [Z] minutes |
| データ整合性 / Data Integrity | [100]% |

**バックアップ要件 / Backup Requirements:**
- [Backup requirement 1 JP] / [Backup requirement 1 VN]
- [Backup requirement 2 JP] / [Backup requirement 2 VN]

**優先度 / Priority:** High / Medium / Low

---

### 3.5 拡張性要件 / Yêu cầu khả năng mở rộng (Scalability Requirements)

#### NFR-SCAL-[CODE]-001: [Scalability Requirement Title JP] / [Title VN]

**説明 / Mô tả:**
[Scalability requirement description in Japanese]

[Scalability requirement description in Vietnamese]

**スケーラビリティメトリクス / Scalability Metrics:**
| 項目 / Mục | 現在 / Hiện tại | 1年後 / Sau 1 năm | 3年後 / Sau 3 năm |
|---------|-------------|---------------|---------------|
| 同時ユーザー数 / Concurrent Users | [X] | [Y] | [Z] |
| データ量 / Data Volume | [A] GB | [B] GB | [C] GB |
| トランザクション数 / Transactions/day | [D] | [E] | [F] |

**スケーリング戦略 / Scaling Strategy:**
- [Strategy JP] / [Strategy VN]

**優先度 / Priority:** High / Medium / Low

---

### 3.6 互換性要件 / Yêu cầu tương thích (Compatibility Requirements)

#### NFR-COMP-[CODE]-001: [Compatibility Requirement Title JP] / [Title VN]

**説明 / Mô tả:**
[Compatibility requirement description in Japanese]

[Compatibility requirement description in Vietnamese]

**サポート環境 / Supported Environments:**

**ブラウザ / Browser:**
- Chrome (最新版から2世代前まで / 2 phiên bản gần nhất)
- Firefox (最新版から2世代前まで / 2 phiên bản gần nhất)
- Safari (最新版 / Phiên bản mới nhất)
- Edge (最新版 / Phiên bản mới nhất)

**モバイルデバイス / Mobile Devices:**
- iOS [version] 以上 / trở lên
- Android [version] 以上 / trở lên

**API互換性 / API Compatibility:**
- [API version compatibility requirements]

**優先度 / Priority:** High / Medium / Low

---

### 3.7 非機能要件サマリー / NFR Summary

| カテゴリ / Category | 要件数 / Count | High優先度 / High Priority |
|------------------|-------------|------------------------|
| パフォーマンス / Performance | [X] | [Y] |
| セキュリティ / Security | [X] | [Y] |
| 使いやすさ / Usability | [X] | [Y] |
| 信頼性 / Reliability | [X] | [Y] |
| 拡張性 / Scalability | [X] | [Y] |
| 互換性 / Compatibility | [X] | [Y] |

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `[evidence_file_path]`
- Sections: Performance, Security, Usability, Reliability, Scalability
- Extracted: [YYYY-MM-DD HH:MM:SS]

---
```

---

## Example Output

```markdown
## 3. 非機能要件 / Yêu cầu phi chức năng (Non-Functional Requirements)

### 3.1 パフォーマンス要件 / Yêu cầu hiệu năng (Performance Requirements)

#### NFR-PERF-CMN015002-001: 画面レスポンス時間 / Thời gian phản hồi màn hình

**説明 / Mô tả:**
ワークフロー設計画面の操作に対するレスポンスタイムは、ユーザーの操作性を確保するため、500ms以下である必要があります。

Thời gian phản hồi cho các thao tác trên màn hình thiết kế workflow cần dưới 500ms để đảm bảo trải nghiệm người dùng.

**メトリクス / Metrics:**
| 項目 / Mục | 目標値 / Giá trị mục tiêu | 測定方法 / Phương pháp đo |
|---------|----------------------|---------------------|
| レスポンスタイム / Response Time | ≤ 500 ms | ブラウザDevToolsで測定 / Đo bằng Browser DevTools |
| スループット / Throughput | ≥ 100 req/sec | Load testingツール使用 / Dùng công cụ load testing |
| CPU使用率 / CPU Usage | ≤ 70% | システムモニタリング / Giám sát hệ thống |

**優先度 / Priority:** High

---

### 3.2 セキュリティ要件 / Yêu cầu bảo mật (Security Requirements)

#### NFR-SEC-CMN015002-001: 認証と認可 / Xác thực và phân quyền

**説明 / Mô tả:**
ワークフロー設計機能へのアクセスは、Keycloakによる認証とロールベースの認可が必要です。

Truy cập chức năng thiết kế workflow yêu cầu xác thực qua Keycloak và phân quyền dựa trên vai trò.

**セキュリティ対策 / Security Measures:**
- JWT tokenによる認証 / Xác thực bằng JWT token
- ロールベースアクセス制御(RBAC) / Kiểm soát truy cập dựa trên vai trò (RBAC)
- セッションタイムアウト: 30分 / Timeout phiên: 30 phút

**準拠基準 / Compliance Standards:**
- OWASP Top 10
- OAuth 2.0 / OpenID Connect

**優先度 / Priority:** High

---

### 3.3 使いやすさ要件 / Yêu cầu khả năng sử dụng (Usability Requirements)

#### NFR-USA-CMN015002-001: 多言語対応 / Hỗ trợ đa ngôn ngữ

**説明 / Mô tả:**
UIは日本語とベトナム語をサポートし、ユーザーの言語設定に応じて表示が切り替わる必要があります。

Giao diện người dùng cần hỗ trợ tiếng Nhật và tiếng Việt, tự động chuyển đổi theo cài đặt ngôn ngữ.

**ユーザビリティ基準 / Usability Criteria:**
- 言語切替は即座に反映 / Chuyển đổi ngôn ngữ ngay lập tức
- すべてのUI要素が翻訳済み / Tất cả phần tử UI đã được dịch

**アクセシビリティ / Accessibility:**
- WCAG 2.1 Level AA 準拠 / Tuân thủ

**優先度 / Priority:** High

---

### 3.4 信頼性要件 / Yêu cầu độ tin cậy (Reliability Requirements)

#### NFR-REL-CMN015002-001: システム可用性 / Tính khả dụng hệ thống

**説明 / Mô tả:**
ワークフロー設計機能は、営業時間中99.9%の可用性を維持する必要があります。

Chức năng thiết kế workflow cần duy trì 99.9% khả dụng trong giờ làm việc.

**信頼性メトリクス / Reliability Metrics:**
| 項目 / Mục | 目標値 / Giá trị mục tiêu |
|---------|----------------------|
| 可用性 / Availability | 99.9% |
| MTBF | 720 hours |
| MTTR | 15 minutes |
| データ整合性 / Data Integrity | 100% |

**バックアップ要件 / Backup Requirements:**
- 日次バックアップ実施 / Sao lưu hàng ngày
- リカバリーポイント目標(RPO): 24時間 / Mục tiêu điểm phục hồi: 24 giờ

**優先度 / Priority:** High

---

### 3.5 拡張性要件 / Yêu cầu khả năng mở rộng (Scalability Requirements)

#### NFR-SCAL-CMN015002-001: 同時ユーザー対応 / Hỗ trợ người dùng đồng thời

**説明 / Mô tả:**
システムは将来的な成長を見込み、同時ユーザー数の増加に対応できる必要があります。

Hệ thống cần đáp ứng tăng trưởng số người dùng đồng thời trong tương lai.

**スケーラビリティメトリクス / Scalability Metrics:**
| 項目 / Mục | 現在 / Hiện tại | 1年後 / Sau 1 năm | 3年後 / Sau 3 năm |
|---------|-------------|---------------|---------------|
| 同時ユーザー数 / Concurrent Users | 100 | 500 | 1000 |
| データ量 / Data Volume | 10 GB | 50 GB | 200 GB |
| トランザクション数 / Transactions/day | 10,000 | 50,000 | 200,000 |

**スケーリング戦略 / Scaling Strategy:**
- 水平スケーリング対応 / Hỗ trợ horizontal scaling

**優先度 / Priority:** Medium

---

### 3.6 互換性要件 / Yêu cầu tương thích (Compatibility Requirements)

#### NFR-COMP-CMN015002-001: ブラウザサポート / Hỗ trợ trình duyệt

**説明 / Mô tả:**
主要なモダンブラウザの最新版と過去2世代をサポートします。

Hỗ trợ phiên bản mới nhất và 2 phiên bản trước của các trình duyệt chính.

**サポート環境 / Supported Environments:**

**ブラウザ / Browser:**
- Chrome (最新版から2世代前まで / 2 phiên bản gần nhất)
- Firefox (最新版から2世代前まで / 2 phiên bản gần nhất)
- Safari (最新版 / Phiên bản mới nhất)
- Edge (最新版 / Phiên bản mới nhất)

**モバイルデバイス / Mobile Devices:**
- iOS 14 以上 / trở lên
- Android 10 以上 / trở lên

**優先度 / Priority:** High

---

### 3.7 非機能要件サマリー / NFR Summary

| カテゴリ / Category | 要件数 / Count | High優先度 / High Priority |
|------------------|-------------|------------------------|
| パフォーマンス / Performance | 1 | 1 |
| セキュリティ / Security | 1 | 1 |
| 使いやすさ / Usability | 1 | 1 |
| 信頼性 / Reliability | 1 | 1 |
| 拡張性 / Scalability | 1 | 0 |
| 互換性 / Compatibility | 1 | 1 |

---

**Evidence Source / 証拠ソース / Nguồn bằng chứng:**
- File: `.claude/memory-bank/evidence/CMN015002_workflow_designer.md`
- Sections: Performance, Security, Usability, Reliability, Scalability
- Extracted: 2025-12-20 10:45:00

---
```

---

## Quality Checklist

**Before Output:**
1. [ ] All NFRs derived from evidence
2. [ ] All metrics are measurable (SMART)
3. [ ] ID format: NFR-[CATEGORY]-[CODE]-[NUMBER]
4. [ ] Bilingual format ≥60% of content
5. [ ] No implementation details
6. [ ] Security requirements align with standards
7. [ ] Performance targets realistic
8. [ ] Evidence sources cited

**Validation Commands:**
```bash
# Count NFRs by category
grep -c "^#### NFR-PERF" output.md
grep -c "^#### NFR-SEC" output.md

# Verify measurable metrics
grep -c "≤\|≥\|%" output.md
```

---

*Micro-Agent v1.0 - Part of EPS Migration Week 1*
*Created: 2025-12-20*
*Single Responsibility: SRS Section 3 - Non-Functional Requirements*
