# Testing Strategy Micro-Agent / テスト戦略マイクロエージェント / Micro-Agent Chiến lược Kiểm thử

**Responsibility / 責任 / Trách nhiệm**: Generate test structure, test patterns, and coverage requirements
**Output Lines / 出力行数 / Số dòng đầu ra**: ~80-120 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (test scenarios), BD (test architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C7

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Test scenarios and acceptance criteria
2. **SRS File Path** - Testing requirements and coverage targets
3. **Basic Design File Path** - Test architecture and tooling decisions

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 7. テスト戦略 / Chiến lược Kiểm thử (Testing Strategy)

### 7.1 テストファイル構成 / Cấu trúc Tệp Test (Test File Organization)

```typescript
// Traceability: SRS-3.18, BD-4.18
// Component Test / コンポーネントテスト / Test Component
// File: components/WorkflowCanvas/WorkflowCanvas.test.tsx
interface ComponentTestSuite {
  describe(description: string, tests: () => void): void;
  it(description: string, test: () => void | Promise<void>): void;
  beforeEach(setup: () => void | Promise<void>): void;
  afterEach(teardown: () => void | Promise<void>): void;
}
```

### 7.2 テストパターン / Mẫu Test (Test Patterns)

```typescript
// Traceability: SRS-3.19, BD-4.19
// Unit Test Interface / ユニットテストインターフェース / Giao diện Unit Test
interface UnitTest {
  testName: string;                     // テスト名 / Tên test
  setup?: () => void | Promise<void>;   // セットアップ / Thiết lập
  execute: () => void | Promise<void>;  // 実行 / Thực thi
  assert: () => void;                   // アサーション / Khẳng định
  teardown?: () => void | Promise<void>; // クリーンアップ / Dọn dẹp
}

// Integration Test Interface / 統合テストインターフェース / Giao diện Integration Test
interface IntegrationTest {
  testName: string;
  dependencies: string[];               // 依存関係 / Phụ thuộc
  mockData: any;                        // モックデータ / Dữ liệu giả
  execute: () => Promise<void>;
  assert: () => void;
}

// E2E Test Interface / E2Eテストインターフェース / Giao diện E2E Test
interface E2ETest {
  testName: string;
  scenario: TestScenario;               // シナリオ / Kịch bản
  steps: TestStep[];                    // ステップ / Bước
  expectedResult: any;                  // 期待結果 / Kết quả mong đợi
}

interface TestScenario {
  description: string;                  // 説明 / Mô tả
  preconditions: string[];              // 前提条件 / Điều kiện tiên quyết
  postconditions: string[];             // 事後条件 / Điều kiện sau
}

interface TestStep {
  action: string;                       // アクション / Hành động
  input?: any;                          // 入力 / Đầu vào
  expectedOutput?: any;                 // 期待出力 / Đầu ra mong đợi
}
```

### 7.3 モック・スタブインターフェース / Giao diện Mock/Stub (Mock & Stub Interfaces)

```typescript
// Traceability: SRS-3.20, BD-4.20
interface MockConfig<T> {
  target: T;                            // モック対象 / Đối tượng mock
  methods: Partial<Record<keyof T, any>>; // メソッド / Phương thức
  returnValues?: Record<string, any>;   // 戻り値 / Giá trị trả về
}

interface StubConfig<T> {
  target: T;
  behavior: Record<keyof T, (...args: any[]) => any>;
}

// API Mock / APIモック / Mock API
interface ApiMock {
  mockGetWorkflows(response: GetWorkflowsResponse): void;
  mockCreateWorkflow(response: CreateWorkflowResponse): void;
  mockError(error: ApiError): void;
  reset(): void;                        // リセット / Đặt lại
}
```

### 7.4 カバレッジ目標 / Mục tiêu Coverage (Coverage Targets)

```typescript
// Traceability: SRS-3.21, BD-4.21
interface CoverageTargets {
  statements: number;                   // 文カバレッジ / Coverage câu lệnh (≥80%)
  branches: number;                     // 分岐カバレッジ / Coverage nhánh (≥75%)
  functions: number;                    // 関数カバレッジ / Coverage hàm (≥80%)
  lines: number;                        // 行カバレッジ / Coverage dòng (≥80%)
}

interface TestReport {
  totalTests: number;                   // 総テスト数 / Tổng số test
  passed: number;                       // 成功 / Thành công
  failed: number;                       // 失敗 / Thất bại
  skipped: number;                      // スキップ / Bỏ qua
  coverage: CoverageTargets;            // カバレッジ / Coverage
  duration: number;                     // 実行時間(ms) / Thời gian (ms)
}
```

---

**Checkpoint C7 Validation / チェックポイントC7検証 / Xác thực điểm kiểm tra C7**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Test patterns match BD test architecture
2. [ ] Coverage targets from SRS included
3. [ ] Mock/Stub interfaces defined
4. [ ] Bilingual format (≥60%)
5. [ ] No implementation code
6. [ ] Checkpoint C7 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Testing Strategy Interface Generation*
