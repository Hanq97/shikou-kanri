# Frontend Detail Design — F2 見積管理

**Feature ID**: F2-QUOTE
**Version**: BASE (Phase 1 MVP)
**Date**: 2026-05-17
**Tech stack**: React 18 + Vite 5 + TypeScript strict + Ant Design 5 + Tailwind 3 + React Hook Form + Zod + TanStack Query + Zustand
**Reference**: SRS, BD, `.claude/rules/frontend-react.md`, F1 implementation patterns

---

## 1. Overview

### 1.1 Mục đích
Define FE architecture for F2 quote module: routes, pages, components, state management, mobile responsive patterns, forms.

### 1.2 Folder structure
```
frontend/src/features/quote/
├── pages/
│   ├── QuotesListPage.tsx              # List with filter + create
│   ├── QuoteFormPage.tsx               # Create/edit (with line item editor)
│   ├── QuoteDetailPage.tsx             # Detail header + actions + lines + versions tab
│   └── UnitPricesListPage.tsx          # Admin master CRUD
├── components/
│   ├── QuoteStatusTag.tsx              # 8 status colors
│   ├── QuoteLineEditor.tsx             # Array editor wrapping useFieldArray
│   ├── QuoteLineTableDesktop.tsx       # Desktop ≥sm table view
│   ├── QuoteLineCardMobile.tsx         # Mobile <sm card view
│   ├── QuoteTotalsPanel.tsx            # Sticky panel with subtotal/tax/total
│   ├── UnitPriceMasterPickerModal.tsx  # Select line from master
│   ├── ApprovalModal.tsx               # Confirm approve with tier display
│   ├── RejectModal.tsx                 # Reason input ≥5 chars
│   ├── CloneQuoteModal.tsx             # Confirm clone with name override
│   ├── CreateVersionModal.tsx          # Reason for v2 of sent quote
│   ├── QuotePdfDownloadButton.tsx      # Async loading state
│   ├── QuoteVersionsTab.tsx            # Read-only history
│   ├── QuoteListTab.tsx                # Embedded in ProjectDetailPage
│   ├── ProjectTransitionPromptModal.tsx # After won → suggest project status change
│   └── UnitPriceFormModal.tsx          # Admin master add/edit
└── schemas/
    ├── quote.schema.ts                  # Zod for quote form
    ├── quote-line.schema.ts             # Zod for line item
    └── unit-price.schema.ts             # Zod for master
```

---

## 2. Routes (add to app/routes.tsx)

```tsx
// F2: Quotes (admin/manager/employee, no invited)
{
  path: '/quotes',
  element: <AuthGuard><RoleGuard deny={['invited']}><QuotesListPage /></RoleGuard></AuthGuard>,
},
{
  path: '/quotes/new',
  element: <AuthGuard><RoleGuard deny={['invited']}><QuoteFormPage /></RoleGuard></AuthGuard>,
},
{
  path: '/quotes/:id',
  element: <AuthGuard><RoleGuard deny={['invited']}><QuoteDetailPage /></RoleGuard></AuthGuard>,
},
{
  path: '/quotes/:id/edit',
  element: <AuthGuard><RoleGuard deny={['invited']}><QuoteFormPage /></RoleGuard></AuthGuard>,
},

// F2: Unit Prices Master (admin only)
{
  path: '/admin/unit-prices',
  element: <AuthGuard><RoleGuard roles={['system_admin']}><UnitPricesListPage /></RoleGuard></AuthGuard>,
},
```

### 2.1 Nav update (AppLayout)
```tsx
// Add to NAV_DEFS — see frontend/src/shared/components/layout/AppLayout.tsx
{
  key: 'quotes',
  to: '/quotes',
  icon: <FileText size={18} />,
  roles: ['system_admin', 'manager', 'employee'],
},
```

(Note: `estimates` placeholder nav item từ F1 có thể remove hoặc keep separate.)

---

## 3. State Management

### 3.1 Server state (TanStack Query)
| Query key | Endpoint | Used by |
|---|---|---|
| `['quotes', 'list', filters]` | `GET /quotes?...` | QuotesListPage |
| `['quotes', 'detail', id]` | `GET /quotes/:id` | QuoteDetailPage, QuoteFormPage |
| `['quotes', 'versions', id]` | `GET /quotes/:id/versions` | QuoteVersionsTab |
| `['projects', projectId, 'quotes']` | `GET /quotes?projectId=X` | QuoteListTab (in ProjectDetailPage) |
| `['unit-prices', 'list', filters]` | `GET /unit-prices` | UnitPricesListPage, picker |
| `['users', 'picker']` | `GET /users` | reused from F1 (for approver display) |
| `['customers', 'picker', search]` | `GET /customers` | reused from F1 (for project context) |

### 3.2 Mutation patterns
```tsx
const createMutation = useMutation({
  mutationFn: (input: CreateQuoteInput) => quotesApi.create(input),
  onSuccess: (quote) => {
    message.success(t('quote.messages.created'));
    qc.invalidateQueries({ queryKey: ['quotes'] });
    navigate(`/quotes/${quote.id}`);
  },
  onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
});
```

### 3.3 Form state (React Hook Form + Zod)
- All forms use `useForm` + `zodResolver`
- Line items array → `useFieldArray`
- Validation messages → Zod `superRefine` using i18n

---

## 4. Page Specifications

### 4.1 QuotesListPage

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│ 見積管理                              [+ 新規見積]        │
│ 見積書の作成・承認・PDF出力                              │
├──────────────────────────────────────────────────────────┤
│ [search input...] [status▼] [save filter] [export CSV?]  │
│ [advanced filters collapse: from-to / amount / project]  │
├──────────────────────────────────────────────────────────┤
│ Q-2026-00001 │ 山田様邸... │ ¥1,500,000 │ 提出済 │ ⋯  │
│ Q-2026-00002 │ 田中様邸... │ ¥850,000   │ 下書き │ ⋯  │
│ Q-2026-00003 │ ...        │ ...        │ 受注    │ ⋯  │
│                                                          │
│ Pagination: 20 / page                                    │
└──────────────────────────────────────────────────────────┘
```

**Filters supported**:
- Search (combined notes + counter_party tsvector)
- Status multi-select (8 values)
- Date range (issued_at from/to)
- Amount range (minAmount/maxAmount)
- Project ID (optional, from query param)

**Columns** (desktop):
| Column | Width | Render |
|---|---|---|
| 見積番号 | 130 | Link to detail |
| 顧客 (counter_party_name) | 200 | Truncate |
| 金額 (amount_total) | 150 | formatJpy |
| ステータス | 130 | QuoteStatusTag |
| 発行日 (issued_at) | 120 | dayjs format |
| 版 (version_no) | 60 | text |
| 更新日時 | 150 | dayjs |
| Actions | 50 | MoreVertical menu |

**Row menu actions** (per role):
- Edit (draft/rejected only)
- Clone
- View detail
- PDF download
- Delete (admin only)

**Mobile (<sm)**: ResponsiveTable card view với code, name, amount, status visible

### 4.2 QuoteFormPage

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│ ← 戻る                                                    │
│ 新規見積 (or 編集) — Project: [山田様邸 浴室リフォーム]  │
├──────────────────────────────────────────────────────────┤
│ Meta section:                                            │
│   [取引先 (snapshot)]: 山田 太郎                          │
│   [発行日]: 2026-05-17  [有効期限]: 2026-06-15            │
│   [登録番号 (任意)]: T1234567890123                       │
├──────────────────────────────────────────────────────────┤
│ 明細項目 (Line items editor):                            │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Desktop ≥sm: editable table                        │  │
│ │ │drag│ 項目名     │ 単位 │数量│ 単価     │ 金額    │  │
│ │ │ ⋮  │外壁塗装    │ m²  │100 │¥3,000   │¥300,000│  │
│ │ │ ⋮  │足場設置    │ 式  │1   │¥80,000  │¥80,000 │  │
│ │ [+ 明細追加]  [マスタから選択]                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Mobile <sm: card view per line                          │
├──────────────────────────────────────────────────────────┤
│ オプション明細 (separate section):                       │
│   [+ オプション項目追加]                                │
├──────────────────────────────────────────────────────────┤
│ 備考 (notes textarea)                                    │
├──────────────────────────────────────────────────────────┤
│ Totals (sticky bottom panel):                            │
│ ┌────────────────────────────────────────────┐          │
│ │ 小計: ¥380,000   消費税: ¥38,000   合計: ¥418,000 │   │
│ │ (オプション小計: ¥50,000)                  │          │
│ └────────────────────────────────────────────┘          │
│                                                          │
│ [Cancel]  [Save Draft]                                   │
└──────────────────────────────────────────────────────────┘
```

**Form schema** (Zod):
```typescript
const QuoteSchema = z.object({
  issuedAt: z.string(),  // ISO date
  validUntil: z.string().optional().or(z.literal('')),
  qualifiedInvoiceNumber: z.string().max(20).optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
  lines: z.array(QuoteLineSchema).min(1, '少なくとも1つの明細が必要'),
}).superRefine((data, ctx) => {
  // Validation: at least 1 required line (not all optional)
  const requiredLines = data.lines.filter(l => !l.isOptional);
  if (requiredLines.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: t('quote.errors.atLeastOneRequiredLine'),
      path: ['lines'],
    });
  }
});

const QuoteLineSchema = z.object({
  category: z.string().max(50).optional().or(z.literal('')),
  itemName: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  unit: z.string().min(1).max(20),
  quantity: z.coerce.number().refine(n => n !== 0, '数量は0以外'),
  unitPrice: z.coerce.number().int(),  // JPY no decimals
  taxRate: z.coerce.number().min(0).max(1),
  isOptional: z.boolean().default(false),
  unitPriceMasterId: z.string().uuid().optional().or(z.literal('')),
});
```

**Computed values** (debounced 300ms):
- `subtotal = sum(line.amount where !isOptional)`
- `tax = round(sum(line.amount * line.taxRate where !isOptional))`
- `total = subtotal + tax`
- `optionalSubtotal = sum(line.amount where isOptional)`

### 4.3 QuoteDetailPage

**Header card**:
```
┌──────────────────────────────────────────────────────────┐
│ Q-2026-00001 v1                       [PDFダウンロード]  │
│ 山田様邸 浴室リフォーム見積                              │
│ [提出済] [新築] · 山田 太郎 · ¥1,500,000                │
├──────────────────────────────────────────────────────────┤
│ Action buttons (per role + status):                      │
│ - draft: [Submit] [Edit] [Clone] [Delete]                │
│ - submitted: [Approve] [Reject] (manager/admin)          │
│ - pending_admin: [Approve] [Reject] (admin only)         │
│ - approved: [Send] [Reject (recall)] [Clone] [Edit notes]│
│ - sent: [Won] [Lost] [Create v2] [Clone]                 │
│ - won/lost: [Clone] (terminal)                           │
│ - rejected: [Edit] [Resubmit] [Clone]                    │
└──────────────────────────────────────────────────────────┘

Tabs:
[概要] [明細] [版履歴] [監査ログ (admin)]
```

**Tab 1 概要 (Overview)**:
- Quote meta info table (dl/dt/dd pattern)
- Project link → ProjectDetailPage
- Counter party info
- Issued at / Valid until / Sent at / Approved by / Approved at

**Tab 2 明細 (Lines)**:
- Read-only line items table
- Section A (required) + Section B (optional)
- Totals panel at bottom

**Tab 3 版履歴 (Versions)**:
- List of versions (newest first)
- Each row: version_no, change_type, change_reason, changed_by, changed_at
- "Compare" button (Phase 2) defer

### 4.4 UnitPricesListPage (admin)

**Layout**: similar to F1 customer/users list pattern
- Search + filter by category + active/inactive toggle
- Table: code | category | item_name | unit | default_unit_price | supplier | active | actions
- Add button → modal form
- Edit → modal form
- Soft delete via toggle is_active

### 4.5 QuoteListTab (embedded in ProjectDetailPage)

**Pattern**: similar to PropertyListTab from F1
- Lists all quotes for current project
- Action: Create new quote (links to `/quotes/new?projectId=X`)
- Click row → navigate to quote detail
- Status badge per row

---

## 5. Component Specifications

### 5.1 QuoteStatusTag
```tsx
const STYLES: Record<QuoteStatus, string> = {
  draft:         'bg-zinc-50 text-zinc-700 ring-zinc-200',
  submitted:     'bg-blue-50 text-blue-700 ring-blue-200',
  pending_admin: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected:      'bg-red-50 text-red-700 ring-red-200',
  sent:          'bg-brand-50 text-brand-700 ring-brand-200',
  won:           'bg-emerald-100 text-emerald-800 ring-emerald-300',
  lost:          'bg-red-100 text-red-800 ring-red-300',
};
```

### 5.2 QuoteLineEditor

**API**:
```tsx
interface Props {
  control: Control<QuoteFormValues>;
  errors: FieldErrors<QuoteFormValues>;
  isOptional: boolean;  // filter view: required vs optional section
  readonly?: boolean;   // for view-only mode (e.g., approved quote)
  onTotalsChange?: (totals: Totals) => void;
}
```

**Behavior**:
- Uses `useFieldArray({ name: 'lines' })`
- Render different sections based on `isOptional`
- Subtotal computed debounced 300ms
- Mobile (<sm): renders `<QuoteLineCardMobile>` per item
- Desktop (≥sm): renders `<QuoteLineTableDesktop>` with inline edit
- Drag-drop reorder via @dnd-kit/core (reuse from F1)

### 5.3 QuoteLineTableDesktop (desktop ≥sm)

**Columns**:
| Col | Width | Component |
|---|---|---|
| Drag handle | 32px | GripVertical icon, @dnd-kit useDraggable |
| 項目名 | 250 | Input |
| 単位 | 80 | Select with common units (m², kg, 式, 個, etc.) |
| 数量 | 100 | InputNumber, formatter for decimals |
| 単価 | 130 | InputNumber, formatter `¥X,XXX,XXX`, parser strips ¥/, |
| 金額 (computed) | 130 | Text, computed = quantity × unitPrice |
| 税率 | 80 | Select 10%/8% |
| オプション | 80 | Switch |
| Actions | 60 | MoreVertical: pick from master, delete |

**Inline edit**: changes trigger form value update → debounced totals recompute

### 5.4 QuoteLineCardMobile (<sm)

**Card layout**:
```
┌──────────────────────────────────────┐
│ #1  外壁塗装               [⋯]  [▼] │
│ 100 m² × ¥3,000 = ¥300,000           │
│ 税率: 10%   [□ オプション項目]        │
│                                      │
│ (expanded: full edit form)            │
└──────────────────────────────────────┘
```

**Touch targets**: All inputs ≥38px height per project rule

### 5.5 QuoteTotalsPanel

**Sticky bottom panel** (desktop) hoặc bottom of form (mobile):
```tsx
<div className="sticky bottom-0 bg-white border-t border-zinc-200/70 p-3 sm:p-4">
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
    <div>小計: <span className="font-mono">{formatJpy(subtotal)}</span></div>
    <div>消費税: <span className="font-mono">{formatJpy(tax)}</span></div>
    <div className="font-semibold">合計: <span className="font-mono">{formatJpy(total)}</span></div>
  </div>
  {optionalSubtotal > 0 && (
    <div className="mt-1 text-xs text-zinc-500">
      オプション小計: <span className="font-mono">{formatJpy(optionalSubtotal)}</span>
    </div>
  )}
</div>
```

### 5.6 UnitPriceMasterPickerModal

**Open from**: "マスタから選択" button in QuoteLineEditor

**Behavior**:
- Debounced search input (300ms)
- List of unit_prices with category filter
- Click row → modal closes, line item appended với:
  - itemName, unit, unitPrice from master defaults
  - quantity = 1 (user edits)
  - unitPriceMasterId set for reference

### 5.7 ApprovalModal

**Open from**: "承認" button on QuoteDetailPage

**Content**:
```tsx
<Modal title="見積を承認しますか?" okText="承認" cancelText="キャンセル">
  <div className="space-y-3">
    <p>承認後、見積は編集ロックされます。</p>
    <div className="bg-zinc-50 rounded-lg p-3">
      <div>見積番号: {quote.quoteNumber}</div>
      <div>金額: {formatJpy(quote.amountTotal)}</div>
      <div>承認層: {tier === 2 ? '管理者承認 (>¥10M)' : '一般承認'}</div>
    </div>
  </div>
</Modal>
```

### 5.8 RejectModal

```tsx
<Modal title="見積を却下" okText="却下" okType="danger">
  <Form>
    <Form.Item label="却下理由 (5文字以上)" required validateStatus={errors.reason ? 'error' : ''} help={errors.reason}>
      <Input.TextArea value={reason} onChange={...} rows={3} maxLength={1000} />
    </Form.Item>
  </Form>
</Modal>
```

### 5.9 CloneQuoteModal

```tsx
<Modal title="見積をコピー" okText="コピー作成">
  <Form>
    <Form.Item label="新しい見積名 (任意)">
      <Input value={newName} placeholder={`${original.title} (コピー)`} />
    </Form.Item>
    <p className="text-xs text-zinc-500">
      新規見積番号が発行されます (例: Q-2026-00010)。ステータスは「下書き」になります。
    </p>
  </Form>
</Modal>
```

### 5.10 CreateVersionModal

```tsx
<Modal title="新規版作成" okText="版を作成">
  <Form>
    <Form.Item label="変更理由 (5文字以上, 電帳法)" required>
      <Input.TextArea rows={3} placeholder="例: 顧客要望により単価変更" />
    </Form.Item>
    <Alert message="送付済みの見積は変更できません。新しい版として下書きを作成します。" type="info" />
  </Form>
</Modal>
```

### 5.11 QuotePdfDownloadButton

```tsx
const [loading, setLoading] = useState(false);

function download() {
  setLoading(true);
  const url = `${apiClient.defaults.baseURL}/quotes/${quoteId}/pdf`;
  // Use direct browser navigation (cookie auth carried)
  window.open(url, '_blank');
  // Reset loading after delay (no callback from browser)
  setTimeout(() => setLoading(false), 2000);
}

<Button icon={<Download />} loading={loading} onClick={download}>
  PDFダウンロード
</Button>
```

### 5.12 ProjectTransitionPromptModal

**Open after**: successful POST /quotes/:id/won

**Content**:
```tsx
<Modal title="案件のステータスを変更しますか?" okText="受注へ変更">
  <p>見積「{quote.quoteNumber}」が受注になりました。</p>
  <p>関連する案件「{project.name}」のステータスを「受注」に変更しますか?</p>
  <div className="bg-zinc-50 p-3 rounded mt-2">
    <div>案件番号: {project.projectCode}</div>
    <div>受注金額 (自動設定): {formatJpy(quote.amountTotal)}</div>
  </div>
</Modal>
```

On confirm: call `projectsApi.changeStatus(projectId, { status: 'received', amountTotal })`

### 5.13 QuoteVersionsTab

```tsx
<List
  dataSource={versions}
  renderItem={(v) => (
    <List.Item>
      <List.Item.Meta
        avatar={<Badge>{v.versionNo}</Badge>}
        title={<>v{v.versionNo} - {t(`quote.changeType.${v.changeType}`)}</>}
        description={
          <>
            <div>{v.changeReason}</div>
            <div className="text-xs text-zinc-500">
              by {v.changedBy.name} · {dayjs(v.changedAt).format('YYYY/MM/DD HH:mm')}
            </div>
          </>
        }
      />
    </List.Item>
  )}
/>
```

---

## 6. Mobile-First Patterns

### 6.1 Breakpoint usage (per project rule)
- Default (<640px): mobile
- sm (≥640px): tablet landscape / small desktop
- md (≥768px): tablet / small laptop
- lg (≥1024px): laptop / desktop
- xl (≥1280px): wide desktop

### 6.2 Layout patterns (F2-specific)

| Component | Mobile (<sm) | Desktop (≥sm) |
|---|---|---|
| QuotesListPage table | ResponsiveTable card view | Antd Table |
| QuoteFormPage layout | single column stack | meta + lines + totals stacked vertically |
| QuoteLineEditor | Card per line | Inline editable table |
| QuoteTotalsPanel | Bottom of form | Sticky bottom OR sidebar |
| QuoteDetailPage tabs | Top horizontal scroll | Default Antd tabs |
| ApprovalModal | width 100% | width 480px |
| Action buttons | Stack column-reverse + block | Inline row |

### 6.3 Touch targets
- All inputs/buttons ≥38px height
- Drag handles for line reorder ≥40px tap area
- Quote line card expand/collapse button ≥38px

### 6.4 Performance on mobile
- Virtualize line editor table if >50 lines
- Debounce subtotal recalc 300ms
- Lazy-load QuoteVersionsTab content only when tab clicked

---

## 7. API Integration

### 7.1 New API client modules

```
frontend/src/shared/api/
├── quotes.api.ts                # Existing pattern from projects.api.ts
└── unit-prices.api.ts           # CRUD master
```

### 7.2 quotes.api.ts surface

```typescript
export const quotesApi = {
  list(params): Promise<ListQuotesResponse>,
  get(id): Promise<QuoteSummary>,
  getVersions(id): Promise<QuoteVersion[]>,
  create(input): Promise<QuoteSummary>,
  update(id, input, version): Promise<QuoteSummary>,  // optimistic lock
  softDelete(id, reason): Promise<void>,
  clone(id, newName?): Promise<QuoteSummary>,
  submit(id): Promise<QuoteSummary>,
  approve(id): Promise<QuoteSummary>,
  reject(id, reason): Promise<QuoteSummary>,
  send(id): Promise<QuoteSummary>,
  won(id): Promise<QuoteSummary>,
  lost(id): Promise<QuoteSummary>,
  createVersion(id, reason): Promise<QuoteSummary>,  // create v2 from sent
};

export const quotePdfApi = {
  url(quoteId): string,  // For window.open
};
```

### 7.3 unit-prices.api.ts surface

```typescript
export const unitPricesApi = {
  list(params): Promise<ListUnitPricesResponse>,
  get(id): Promise<UnitPriceSummary>,
  create(input): Promise<UnitPriceSummary>,
  update(id, input): Promise<UnitPriceSummary>,
  softDelete(id): Promise<void>,
};
```

### 7.4 Error handling
- Use existing `extractApiError` + `mapErrorMessage` pattern
- New error codes to map:
  - `QUOTE_NOT_FOUND` → "見積が見つかりません"
  - `QUOTE_CONFLICT` → "他のユーザーが編集しました。再読み込みしてください。"
  - `QUOTE_INVALID_STATUS_TRANSITION` → dynamic message
  - `QUOTE_TIER2_APPROVAL_REQUIRED` → "管理者の承認が必要です (¥10M超)"
  - `QUOTE_REJECT_REASON_REQUIRED` → "却下理由は5文字以上必要です"
  - `QUOTE_LOCKED_AFTER_SENT` → "送付後は版を新規作成してください"
  - `UNIT_PRICE_NOT_FOUND` → "単価マスタが見つかりません"

---

## 8. i18n Keys (~200)

### 8.1 Namespace structure
```json
{
  "quote": {
    "title": "見積管理",
    "subtitle": "...",
    "empty": "...",
    "createButton": "...",
    "columns": {...},
    "status": {
      "draft": "下書き",
      "submitted": "提出済",
      "pending_admin": "管理者承認待ち",
      "approved": "承認済",
      "rejected": "却下",
      "sent": "送付済",
      "won": "受注",
      "lost": "失注"
    },
    "actions": {
      "submit": "提出",
      "approve": "承認",
      "reject": "却下",
      "send": "送付",
      "won": "受注",
      "lost": "失注",
      "clone": "コピー",
      "createVersion": "新規版作成",
      "pdfDownload": "PDFダウンロード"
    },
    "form": {...},
    "detail": {...},
    "validation": {...},
    "errors": {...},
    "messages": {...},
    "confirms": {...},
    "changeType": {
      "correction": "訂正",
      "deletion": "削除",
      "status_change": "ステータス変更"
    },
    "tier": {
      "1": "一般承認",
      "2": "管理者承認 (¥10M超)"
    }
  },
  "unitPrice": {
    "title": "単価マスタ",
    "columns": {...},
    "form": {...}
  }
}
```

### 8.2 Estimated keys count
- quote.status.*: 8
- quote.changeType.*: 3
- quote.tier.*: 2
- quote.columns.*: ~10
- quote.actions.*: ~10
- quote.form.*: ~30
- quote.detail.*: ~15
- quote.validation.*: ~15
- quote.errors.*: ~10
- quote.messages.*: ~10
- quote.confirms.*: ~10
- quote.tabs.*: 4
- unitPrice.*: ~30
- **Total: ~160 keys × 3 langs = ~480 lines locale**

---

## 9. Accessibility (A11y)

- Form labels properly associated (`aria-label` or `<label for>`)
- Status colors NOT sole indicator (also text)
- Modal keyboard-trap focused
- Drag-drop has keyboard alternative (move up/down buttons)
- PDF download button: `aria-label` describes action
- Approval buttons: `aria-disabled` when not applicable per role

---

## 10. Performance

### 10.1 Bundle size impact
- F2 adds ~50KB gzipped to main bundle (mostly form components)
- @dnd-kit reused from F1 (no new dep)
- Lazy-load UnitPricesListPage (admin only) via React.lazy

### 10.2 Render optimization
- Memoize line items table rows (useMemo + React.memo)
- Debounce subtotal recompute (300ms)
- Virtualize line table if >50 rows

### 10.3 Query optimization
- Disable refetch on window focus for detail page (avoid stale UI flicker)
- Stale time 30s for list query

---

## 11. Test Strategy (FE — defer to Phase 9 integration tests)

- Defer Vitest setup to Phase 9 per architecture
- Component snapshot tests for QuoteStatusTag, QuoteLineCardMobile
- Form submission integration tests via React Testing Library

---

## 12. Out of Scope

- Inline calculator for complex line items
- Bulk edit selected lines
- Drag-drop reorder via touch on mobile (use up/down buttons for accessibility)
- Quote template library UI (only clone existing)
- PDF preview in browser (download only MVP)
- Real-time collaborative editing
- Quote comparison view (compare 2 versions side-by-side)

---

*FE Detail Design — F2 見積管理 v1.0 — Components, routes, state, mobile patterns*
