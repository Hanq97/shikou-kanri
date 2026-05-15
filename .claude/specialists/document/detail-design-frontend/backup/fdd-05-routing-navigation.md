# Routing Navigation Micro-Agent / ルーティング・ナビゲーションマイクロエージェント / Micro-Agent Định tuyến và Điều hướng

**Responsibility / 責任 / Trách nhiệm**: Generate route definitions, navigation patterns, and middleware specifications
**Output Lines / 出力行数 / Số dòng đầu ra**: ~80-120 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (navigation), BD (routing architecture)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C5

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - Navigation flow requirements
2. **SRS File Path** - Navigation and access control requirements
3. **Basic Design File Path** - Routing architecture decisions

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 5. ルーティング・ナビゲーション / Định tuyến và Điều hướng (Routing & Navigation)

### 5.1 ルート設定 / Cấu hình Route (Route Configuration)

```typescript
// Traceability: SRS-3.11, BD-4.11
interface RouteConfig {
  path: string;                         // パス / Đường dẫn
  component: React.ComponentType;       // コンポーネント / Component
  guards?: RouteGuard[];                // ガード / Bảo vệ
  meta?: RouteMeta;                     // メタ情報 / Thông tin meta
  children?: RouteConfig[];             // 子ルート / Route con
}

interface RouteMeta {
  requiresAuth: boolean;                // 認証必須 / Yêu cầu xác thực
  roles?: string[];                     // 必要な役割 / Vai trò cần thiết
  title: string;                        // タイトル / Tiêu đề
  breadcrumb?: string;                  // パンくず / Breadcrumb
}
```

### 5.2 ナビゲーションガード / Bảo vệ Điều hướng (Navigation Guards)

```typescript
// Traceability: SRS-3.12, BD-4.12
interface RouteGuard {
  canActivate(context: RouteContext): boolean | Promise<boolean>;
}

interface RouteContext {
  route: RouteConfig;                   // ルート情報 / Thông tin route
  user: UserProfile | null;             // ユーザー / Người dùng
  params: Record<string, string>;       // パラメータ / Tham số
}

// Auth Guard / 認証ガード / Bảo vệ Xác thực
interface AuthGuard extends RouteGuard {
  canActivate(context: RouteContext): boolean;
}

// Permission Guard / 権限ガード / Bảo vệ Quyền
interface PermissionGuard extends RouteGuard {
  requiredPermissions: string[];        // 必要な権限 / Quyền cần thiết
  canActivate(context: RouteContext): boolean;
}
```

### 5.3 ナビゲーションフック / Hook Điều hướng (Navigation Hooks)

```typescript
// Traceability: SRS-3.13, BD-4.13
interface UseNavigationReturn {
  navigate: (path: string, options?: NavigateOptions) => void;
  goBack: () => void;
  replace: (path: string) => void;
  currentPath: string;
  params: Record<string, string>;
  searchParams: URLSearchParams;
}

function useNavigation(): UseNavigationReturn;

interface NavigateOptions {
  replace?: boolean;                    // 履歴置換 / Thay thế lịch sử
  scroll?: boolean;                     // スクロール / Cuộn
  state?: any;                          // 状態 / Trạng thái
}
```

---

**Checkpoint C5 Validation / チェックポイントC5検証 / Xác thực điểm kiểm tra C5**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Route definitions traced to SRS
2. [ ] Guards follow BD security architecture
3. [ ] Next.js 15 App Router conventions used
4. [ ] Bilingual format (≥60%)
5. [ ] No implementation code
6. [ ] Checkpoint C5 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: Routing and Navigation Interface Generation*
