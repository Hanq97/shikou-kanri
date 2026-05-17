# F1-CUSTOMER — Frontend Detail Design (FDD)

**Feature**: F1 顧客・案件管理
**Version**: BASE — 2026-05-16
**Author**: hanq97
**SRS**: `F1-CUSTOMER-BASE-srs.md`
**BD**: `F1-CUSTOMER-BASE-basic-design.md`

---

## 1. Tổng quan

Frontend F1 thêm 2 feature folder (`features/customer/`, `features/project/`) extend từ design system + i18n stack đã có ở F8. Stack: React 18 + Vite + Antd + Tailwind + Lucide + i18next + TanStack Query + Zustand + React Hook Form + Zod.

---

## 2. Folder structure chi tiết

### 2.1 features/customer/

```
features/customer/
├── pages/
│   ├── CustomersListPage.tsx              # /customers
│   ├── CustomerDetailPage.tsx             # /customers/:id (tabs)
│   ├── CustomerFormPage.tsx               # /customers/new + /customers/:id/edit
│   └── CustomerImportPage.tsx             # /admin/customer-import
├── components/
│   ├── CustomerSearchBar.tsx
│   ├── CustomerTypeTag.tsx                # 個人 / 法人 pill
│   ├── ObBadge.tsx                        # OB顧客 highlight
│   ├── CustomerOverviewTab.tsx
│   ├── PropertyListTab.tsx
│   ├── PropertyCard.tsx                   # display item
│   ├── PropertyFormModal.tsx              # create/edit modal
│   ├── PhotoUploadField.tsx               # client-side resize
│   ├── HistoryTab.tsx                     # F1-04 timeline
│   ├── DuplicateCustomerConfirmModal.tsx
│   └── CsvImportDropzone.tsx
└── schemas/
    ├── customer.schema.ts                  # Zod
    └── property.schema.ts
```

### 2.2 features/project/

```
features/project/
├── pages/
│   ├── ProjectsListPage.tsx               # /projects
│   ├── ProjectDetailPage.tsx              # /projects/:id (tabs)
│   └── ProjectFormPage.tsx                # /projects/new + edit
├── components/
│   ├── ProjectStatusTag.tsx
│   ├── ProjectTypeTag.tsx
│   ├── ProjectsTable.tsx
│   ├── ProjectBoardKanban.tsx             # @dnd-kit
│   ├── DroppableColumn.tsx                # Kanban column
│   ├── SortableProjectCard.tsx            # Draggable card
│   ├── ConfirmStatusChangeModal.tsx
│   ├── ReverseStatusModal.tsx             # admin only
│   ├── ProjectFiltersPanel.tsx
│   ├── SaveSearchModal.tsx
│   ├── SavedSearchesDropdown.tsx
│   ├── ProjectOverviewTab.tsx
│   ├── ProjectMembersTab.tsx
│   ├── AddMemberModal.tsx                 # 2 tab (pick / invite)
│   ├── MemberRow.tsx
│   ├── ProjectFoldersTab.tsx              # Phase 1 read-only
│   └── ProjectFormFields.tsx              # shared form (create + edit)
└── schemas/
    └── project.schema.ts
```

---

## 3. Pages — Chi tiết

### 3.1 CustomersListPage

**Route**: `/customers` — wrapped in `<AuthGuard>` (any auth user except `invited`)

**Layout** (Tailwind):
```
AppLayout > main > div max-w-7xl mx-auto
  Header: h1 "顧客管理" + button "顧客を新規登録" (right)
  Filter bar (card): SearchBar + Select (OB filter) + RefreshButton
  Table card: Antd Table với columns:
    - 顧客名 (name + name_kana subline)
    - タイプ (CustomerTypeTag)
    - 電話番号
    - 住所 (ellipsis)
    - OB (ObBadge if true)
    - 最終更新日 (dayjs format)
    - Actions (Dropdown menu: 表示/編集/削除)
  Pagination: 50/page default, showSizeChanger
```

**State**:
- `filters: ListCustomersParams` — useState, default `{ sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 50 }`
- `searchInput: string` — local input, debounce 300ms before set filter
- TanStack Query: `useQuery({ queryKey: ['customers', 'list', filters], queryFn: () => customersApi.list(filters) })`

**Permissions per row**:
- 表示: all
- 編集: admin/manager any, employee own only
- 削除: admin only, with confirmation modal

### 3.2 CustomerDetailPage

**Route**: `/customers/:id` — `<AuthGuard>` (deny invited)

**Tabs**: `概要` / `物件` / `履歴`

**Header card** (above tabs):
```tsx
<div className="bg-white border rounded-xl p-6 shadow-card flex justify-between">
  <div>
    <CustomerTypeTag type={customer.customerType} />
    {customer.isOb && <ObBadge />}
    <h1 className="text-2xl font-semibold mt-2">{customer.name}</h1>
    <p className="text-zinc-500">{customer.nameKana}</p>
    <div className="mt-3 flex gap-4 text-sm">
      <span><Phone size={14} /> {customer.phone}</span>
      <span><Mail size={14} /> {customer.email ?? '—'}</span>
      <span><MapPin size={14} /> {customer.address}</span>
    </div>
  </div>
  <div>
    <Button onClick={navigate('edit')}>編集</Button>
    {isAdmin && <Button danger onClick={confirmDelete}>削除</Button>}
  </div>
</div>
```

**Tab content**:
- **概要**: notes, acquired_at, created_at, created_by — read-only display
- **物件** (PropertyListTab): list của properties + button "物件を追加" → PropertyFormModal
- **履歴** (HistoryTab): Antd Timeline với projects sort desc

### 3.3 CustomerFormPage (create + edit)

**Routes**: `/customers/new` + `/customers/:id/edit`

**Form** (React Hook Form + Zod + Antd Form layout="vertical"):
```
Card với fields:
- customer_type: Select (個人 / 法人)
- name: Input (label dynamic: "氏名" cho 個人, "会社名" cho 法人)
- name_kana: Input (フリガナ)
- phone: Input + auto-format on blur (strip dashes)
- email: Input type=email (optional)
- address: Input.TextArea rows=2
- is_ob: Checkbox "OB顧客"
- acquired_at: DatePicker (optional)
- notes: Input.TextArea rows=3 (optional)

Footer: Cancel | Save
```

**Submit flow**:
1. Submit → `customersApi.create/update(values)`
2. **Duplicate response**: `200 { duplicateOf: { id, name, address } }` → show `<DuplicateCustomerConfirmModal>`:
   - "Same phone number registered: {duplicateOf.name} ({duplicateOf.address}). Continue?"
   - Confirm → retry with `?force=true`
3. Success → message.success + navigate `/customers/:id`
4. Error → display via error-mapper

### 3.4 CustomerImportPage

**Route**: `/admin/customer-import` — `<RoleGuard roles={['system_admin']}>`

**UI flow**:
1. Drag-drop zone (or click to select file)
2. Preview first 10 rows in Antd Table
3. Submit button (large primary)
4. Loading spinner during upload
5. Result card:
   - ✅ Created: N
   - ⚠️ Skipped (duplicates): M
   - ❌ Errors: K → download error CSV button

### 3.5 ProjectsListPage

**Route**: `/projects` — `<AuthGuard>`

**Layout**: View toggle (Table / Board) at top right.

**Table view**: similar to CustomersListPage. Columns:
- 案件番号 (project_code, mono font)
- 案件名 + customer.name subline
- 種別 (ProjectTypeTag)
- ステータス (ProjectStatusTag)
- 担当 (owner.name + avatar)
- 着工日 (schedule_start)
- 受注額 (formatted Yen)
- Actions

**Board view** (`<ProjectBoardKanban>`): 6 cột, see §4.1.

**Filter panel** (collapsible): all SRS multi-criteria filters + saved searches dropdown.

### 3.6 ProjectDetailPage

**Tabs**: `概要` / `メンバー` / `フォルダ`

**Header**:
- Top breadcrumb: 顧客 → 案件
- project_code (mono), name (h1), ProjectTypeTag, ProjectStatusTag
- Actions: 編集 | ステータス変更 (dropdown) | (admin only) Advanced > Reverse status

**Tab content**:
- **概要**: 2-column display of fields
- **メンバー** (ProjectMembersTab): list + button "メンバー追加"
- **フォルダ** (ProjectFoldersTab): 6 folder cards (Phase 1 read-only — clicking shows "Phase 2で実装")

### 3.7 ProjectFormPage

**Form fields**:
- customer: Select (autocomplete from /customers) OR Checkbox "土地仕入れ中（顧客未確定）" → ẩn customer picker
- property: Select (autocomplete from /properties?customerId=, disabled if pre-acq)
- project_type: Radio buttons với icon
- name: Input
- description: TextArea
- owner: Select (autocomplete from /users — admin/manager/employee only)
- schedule_start, schedule_end: RangePicker
- (edit only) status: ProjectStatusTag display (change via separate UI)

---

## 4. Key components

### 4.1 ProjectBoardKanban (F1-03 highlight)

```tsx
function ProjectBoardKanban({ projects, onStatusChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [pendingChange, setPendingChange] = useState<{ project, newStatus } | null>(null);

  const projectsByStatus = useMemo(() => groupBy(projects, 'status'), [projects]);

  function handleDragStart(e: DragStartEvent) {
    setActiveProject(projects.find(p => p.id === e.active.id) || null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveProject(null);
    if (!e.over) return;
    const project = projects.find(p => p.id === e.active.id);
    const newStatus = e.over.id as ProjectStatus;
    if (project.status === newStatus) return;
    setPendingChange({ project, newStatus });  // open confirm modal
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map(status => (
            <DroppableColumn key={status} id={status} count={projectsByStatus[status]?.length || 0}>
              <SortableContext items={projectsByStatus[status] || []} strategy={verticalListSortingStrategy}>
                {(projectsByStatus[status] || []).map(p => <SortableProjectCard key={p.id} project={p} />)}
              </SortableContext>
            </DroppableColumn>
          ))}
        </div>
        <DragOverlay>{activeProject && <ProjectCard project={activeProject} />}</DragOverlay>
      </DndContext>
      {pendingChange && (
        <ConfirmStatusChangeModal
          project={pendingChange.project}
          newStatus={pendingChange.newStatus}
          onConfirm={() => { onStatusChange(pendingChange.project.id, pendingChange.newStatus); setPendingChange(null); }}
          onCancel={() => setPendingChange(null)}
        />
      )}
    </>
  );
}
```

### 4.2 PhotoUploadField

Client-side resize trước upload:
```tsx
async function resizeAndEncode(file: File): Promise<string> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const maxW = 800;
  const ratio = Math.min(maxW / img.width, 1);
  canvas.width = img.width * ratio;
  canvas.height = img.height * ratio;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);  // ≤100KB typically
}
```

Component:
```tsx
<div className="grid grid-cols-3 gap-2">
  {photos.map((photo, i) => (
    <div key={i} className="relative">
      <img src={photo} className="w-full h-32 object-cover rounded-lg" />
      <button onClick={() => removePhoto(i)} className="absolute top-1 right-1">
        <X size={14} />
      </button>
    </div>
  ))}
  {photos.length < 3 && (
    <label className="border-2 border-dashed rounded-lg h-32 grid place-items-center cursor-pointer">
      <input type="file" accept="image/*" onChange={onFileSelect} className="hidden" />
      <Plus size={20} />
    </label>
  )}
</div>
```

### 4.3 ConfirmStatusChangeModal

```tsx
<Modal open title="ステータス変更" onCancel={onCancel} footer={null}>
  <p className="mb-4">
    案件「<strong>{project.name}</strong>」のステータスを変更しますか？
  </p>
  <div className="flex items-center gap-2 mb-4">
    <ProjectStatusTag status={project.status} />
    <ArrowRight size={16} />
    <ProjectStatusTag status={newStatus} />
  </div>
  {newStatus === 'received' && !project.amountTotal && (
    <Form.Item label="受注額" required>
      <InputNumber value={amountTotal} onChange={setAmountTotal} addonAfter="円" min={0} />
    </Form.Item>
  )}
  <div className="flex justify-end gap-2 mt-4">
    <Button onClick={onCancel}>キャンセル</Button>
    <Button type="primary" onClick={() => onConfirm({ amountTotal })}>変更する</Button>
  </div>
</Modal>
```

### 4.4 ProjectStatusTag color mapping

```tsx
const STATUS_CLASS: Record<ProjectStatus, string> = {
  quoting:     'bg-zinc-100 text-zinc-700 ring-zinc-200',
  received:    'bg-blue-50 text-blue-700 ring-blue-200',
  construction:'bg-amber-50 text-amber-700 ring-amber-200',
  completed:   'bg-violet-50 text-violet-700 ring-violet-200',
  handed_over: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled:   'bg-red-50 text-red-700 ring-red-200',
};
```

### 4.5 AddMemberModal (2-tab)

```tsx
<Modal open title="メンバー追加" footer={null}>
  <Tabs>
    <Tabs.TabPane key="pick" tab="既存ユーザーを選択">
      <Select
        showSearch
        placeholder="名前またはメールで検索"
        options={users.map(u => ({ label: `${u.name} (${u.email})`, value: u.id }))}
        onChange={setSelectedUserId}
      />
      <Select label="案件での役割" value={role} onChange={setRole}>
        <Option value="contributor">担当者</Option>
        <Option value="inspector">検査担当</Option>
        <Option value="invited_worker">招待ユーザー（職人/協力業者）</Option>
      </Select>
      <Button type="primary" onClick={handleAdd}>追加</Button>
    </Tabs.TabPane>
    <Tabs.TabPane key="invite" tab="新規ユーザーを招待">
      <Alert message="ユーザーがまだアカウントを持っていない場合、まず招待を送信してアカウントを作成してください。" />
      <Link to="/admin/users">
        <Button icon={<UserPlus size={14} />}>F8 招待画面へ</Button>
      </Link>
    </Tabs.TabPane>
  </Tabs>
</Modal>
```

---

## 5. Zod schemas (validation)

### 5.1 customer.schema.ts

```ts
export const CustomerSchema = z.object({
  customerType: z.enum(['individual', 'corporate']),
  name: z.string().min(1, 'required').max(200),
  nameKana: z.string().max(200).optional().or(z.literal('')),
  phone: z.string().regex(/^[\d\-\s()]+$/, 'invalid').max(20).optional().or(z.literal('')),
  email: z.string().email('invalid').max(255).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  isOb: z.boolean().default(false),
  acquiredAt: z.string().date().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});
export type CustomerFormValues = z.infer<typeof CustomerSchema>;
```

### 5.2 property.schema.ts

```ts
export const PropertySchema = z.object({
  address: z.string().min(1).max(500),
  propertyType: z.enum(['new_construction', 'remodel', 'single_family', 'multi_family', 'commercial', 'other']),
  structure: z.enum(['wood', 'steel', 'rc', 'other']),
  yearBuilt: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  handoverDate: z.string().date().optional().or(z.literal('')),
  floorAreaSqm: z.number().positive().optional(),
  photoUrls: z.array(z.string().max(150_000)).max(3).default([]),
  notes: z.string().max(2000).optional().or(z.literal('')),
});
export type PropertyFormValues = z.infer<typeof PropertySchema>;
```

### 5.3 project.schema.ts

```ts
export const ProjectCreateSchema = z.object({
  customerId: z.string().uuid().optional(),
  preAcquisition: z.boolean().default(false),
  propertyId: z.string().uuid().optional(),
  projectType: z.enum(['new_construction', 'remodel', 'repair', 'aftercare']),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  ownerUserId: z.string().uuid(),
  scheduleStart: z.string().date().optional().or(z.literal('')),
  scheduleEnd: z.string().date().optional().or(z.literal('')),
}).refine(
  data => data.preAcquisition || data.customerId,
  { message: '顧客を選択するか、土地仕入れフラグを設定してください', path: ['customerId'] }
);
export type ProjectCreateFormValues = z.infer<typeof ProjectCreateSchema>;
```

---

## 6. i18n keys (extension)

Thêm vào `frontend/src/locales/{ja,en,vi}.json`. Highlight key sets (full list trong implementation):

```json
{
  "customer": {
    "title": "顧客管理",                                         // ja
    "subtitle": "顧客の登録・編集・検索",
    "createButton": "顧客を新規登録",
    "searchPlaceholder": "氏名・電話・住所で検索",
    "type": { "individual": "個人", "corporate": "法人" },
    "obBadge": "OB",
    "tabs": { "overview": "概要", "properties": "物件", "history": "履歴" },
    "form": {
      "labelName": "氏名/会社名",
      "labelNameKana": "フリガナ",
      "labelPhone": "電話番号",
      "labelEmail": "メールアドレス",
      "labelAddress": "住所",
      "labelIsOb": "OB顧客",
      "labelAcquiredAt": "初回取引日",
      "labelNotes": "備考",
      "submit": "保存"
    },
    "duplicate": {
      "title": "重複の可能性",
      "description": "同じ電話番号の顧客が存在します",
      "continueButton": "このまま登録"
    },
    "import": { ... },
    "messages": { "created": "顧客を登録しました", ... }
  },
  "property": {
    "title": "物件",
    "addButton": "物件を追加",
    "type": { "new_construction": "新築", "remodel": "リフォーム", ... },
    "structure": { "wood": "木造", "steel": "鉄骨", "rc": "RC造", ... },
    "form": { ... },
    "photo": {
      "uploadHint": "最大3枚、自動的に縮小されます",
      "tooLarge": "ファイルサイズが大きすぎます"
    }
  },
  "project": {
    "title": "案件管理",
    "code": "案件番号",
    "createButton": "案件を新規登録",
    "type": {
      "new_construction": "新築",
      "remodel": "リフォーム",
      "repair": "修繕",
      "aftercare": "アフター対応"
    },
    "status": {
      "quoting": "見積中",
      "received": "受注",
      "construction": "着工",
      "completed": "完成",
      "handed_over": "引渡済",
      "cancelled": "キャンセル"
    },
    "preAcquisition": {
      "label": "土地仕入れ中（顧客未確定）",
      "placeholder": "後で顧客情報を更新できます"
    },
    "tabs": { "overview": "概要", "members": "メンバー", "folders": "フォルダ" },
    "view": { "table": "テーブル", "board": "ボード" },
    "confirmStatusChange": {
      "title": "ステータス変更",
      "content": "案件「{{name}}」のステータスを変更しますか？",
      "needAmountTotal": "受注額を入力してください"
    },
    "members": {
      "title": "メンバー",
      "addButton": "メンバー追加",
      "roleOnProject": {
        "owner": "オーナー",
        "contributor": "担当者",
        "inspector": "検査担当",
        "invited_worker": "招待ユーザー"
      },
      "removeConfirm": "「{{name}}」をプロジェクトから外しますか？"
    },
    "filter": {
      "panelTitle": "絞り込み",
      "savedSearches": "保存した検索",
      "saveSearchButton": "現在の条件を保存",
      "exportCsv": "CSVエクスポート"
    },
    "savedSearch": {
      "name": "検索名",
      "saved": "検索条件を保存しました"
    },
    "errors": {
      "PROJECT_INVALID_STATUS_TRANSITION": "このステータス変更は許可されていません",
      "PROJECT_LAST_OWNER": "最後のオーナーは外せません"
    }
  }
}
```

Tổng ~150 keys cho F1 — viết ja primary, EN + VI dịch sau hoặc cùng lúc.

---

## 7. Routes update (src/app/routes.tsx)

```tsx
import { CustomersListPage, CustomerDetailPage, CustomerFormPage, CustomerImportPage } from '@/features/customer/pages';
import { ProjectsListPage, ProjectDetailPage, ProjectFormPage } from '@/features/project/pages';

// ... add to router config:

{ path: '/customers', element: <AuthGuard><RoleGuard deny={['invited']}><CustomersListPage /></RoleGuard></AuthGuard> },
{ path: '/customers/new', element: <AuthGuard><RoleGuard deny={['invited']}><CustomerFormPage /></RoleGuard></AuthGuard> },
{ path: '/customers/:id', element: <AuthGuard><RoleGuard deny={['invited']}><CustomerDetailPage /></RoleGuard></AuthGuard> },
{ path: '/customers/:id/edit', element: <AuthGuard><RoleGuard deny={['invited']}><CustomerFormPage /></RoleGuard></AuthGuard> },
{ path: '/admin/customer-import', element: <AuthGuard><RoleGuard roles={['system_admin']}><CustomerImportPage /></RoleGuard></AuthGuard> },

{ path: '/projects', element: <AuthGuard><ProjectsListPage /></AuthGuard> },
{ path: '/projects/new', element: <AuthGuard><RoleGuard deny={['invited']}><ProjectFormPage /></RoleGuard></AuthGuard> },
{ path: '/projects/:id', element: <AuthGuard><ProjectDetailPage /></AuthGuard> },
{ path: '/projects/:id/edit', element: <AuthGuard><RoleGuard deny={['invited']}><ProjectFormPage /></RoleGuard></AuthGuard> },
```

Note: `<RoleGuard deny={['invited']}>` is a new variant — extend existing RoleGuard or create new component. Implementation: `if (deny.includes(user.role)) → redirect /home`.

---

## 8. API client structure

### 8.1 customers.api.ts

```ts
export const customersApi = {
  list: (params) => apiClient.get('/customers', { params }).then(r => r.data),
  get: (id) => apiClient.get(`/customers/${id}`).then(r => r.data.customer),
  create: (data, force?) => apiClient.post('/customers', data, { params: force ? { force: true } : {} }).then(r => r.data),
  update: (id, data, force?) => apiClient.put(`/customers/${id}`, data, { params: force ? { force: true } : {} }).then(r => r.data.customer),
  softDelete: (id) => apiClient.delete(`/customers/${id}`),
  getProperties: (id) => apiClient.get(`/customers/${id}/properties`).then(r => r.data.data),
  getProjects: (id, params?) => apiClient.get(`/customers/${id}/projects`, { params }).then(r => r.data),
  importCsv: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return apiClient.post('/customers/import-csv', fd).then(r => r.data);
  },
};
```

Similar pattern cho `propertiesApi`, `projectsApi`, `projectMembersApi`, `savedSearchesApi`.

---

## 9. TanStack Query setup

### Query keys convention
```ts
const QK = {
  customers: { list: (f) => ['customers', 'list', f], detail: (id) => ['customers', 'detail', id], properties: (id) => ['customers', id, 'properties'], projects: (id) => ['customers', id, 'projects'] },
  properties: { detail: (id) => ['properties', 'detail', id] },
  projects: { list: (f) => ['projects', 'list', f], detail: (id) => ['projects', 'detail', id], members: (id) => ['projects', id, 'members'] },
  savedSearches: (scope) => ['saved-searches', scope],
};
```

### Mutation patterns
```ts
const createCustomer = useMutation({
  mutationFn: ({ data, force }) => customersApi.create(data, force),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['customers'] });
    message.success(t('customer.messages.created'));
  },
  onError: handleApiError,
});
```

---

## 10. AppLayout updates

Sidebar nav items (existing) — chỉ enable cho role thực sự dùng được:

```tsx
const NAV_DEFS: NavDef[] = [
  { key: 'home', to: '/home', icon: <Home /> },
  { key: 'projects', to: '/projects', icon: <Briefcase /> },        // ✅ active F1
  { key: 'customers', to: '/customers', icon: <Users />, roles: ['system_admin', 'manager', 'employee'] },  // hide for invited
  // estimates: still placeholder until F2
  { key: 'users', to: '/admin/users', icon: <ShieldCheck />, roles: ['system_admin', 'manager'] },
];
```

---

## 11. Performance considerations

### 11.1 List query optimization
- Pagination strict 50/page max
- Total count: backend trả `total` qua response — TanStack Query cache
- Refetch on focus: disabled (đã set ở providers.tsx)

### 11.2 Photo display
- Customer/project list KHÔNG load `photo_urls` (BE select exclude)
- Property card chỉ load thumbnail (Phase 2: BE generate thumbnail server-side)
- Phase 1 base64 hiển thị trực tiếp qua `<img src={base64}>` — small ảnh OK

### 11.3 Kanban board
- Render virtualization KHÔNG cần Phase 1 (5K project mỗi cột ~800 cards — phân tán nên không vấn đề ở 200 cards/cột)
- Memoize cards qua `React.memo` với key === project.id + updatedAt

### 11.4 Code splitting
- Routes lazy-load (defer Phase 2 if not critical)
- Phase 1: bundle to be ~1.2MB JS (acceptable)

---

## 12. Accessibility

- Form labels via `<label htmlFor>` (Antd handles automatically when Form.Item label set)
- Kanban: @dnd-kit có keyboard sensor sẵn — Tab to focus card, Space to pick up, Arrow to move, Space to drop
- Status colors: contrast ratio ≥4.5:1 (đã check Tailwind palette)
- Modal: focus trap via Antd default
- Toast/message: screen-reader announcement (Antd App context)

---

## 13. Empty states & loading

| Page | Empty state | Loading |
|---|---|---|
| CustomersListPage | Illustration + "最初の顧客を登録" CTA | Skeleton 5 rows |
| CustomerDetailPage 物件 | "物件未登録" + Add button | Skeleton card |
| CustomerDetailPage 履歴 | "工事履歴なし" message | Skeleton timeline |
| ProjectsListPage | "最初の案件を登録" CTA | Skeleton table |
| ProjectBoardKanban | 6 cột empty với "空" placeholder | Skeleton cards in each col |
| ProjectMembersTab | "オーナーのみ" message + add button | Spin |

---

## 14. Out of scope (FDD reminder)

- ❌ Pixel-perfect wireframe — implementation reference, refine khi build
- ❌ Storybook (Phase 2)
- ❌ E2E tests (defer F9)
- ❌ A11y full audit (Phase 2)
- ❌ Print stylesheet (Phase 2)
- ❌ Service Worker / PWA (Phase 2)

---

*Generated by /design --detail (FDD part) — F1 Frontend Detail Design BASE*
