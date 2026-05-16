# 認証 & 権限管理 — Frontend Detail Design (FDD)

## Document Information

- **Feature ID**: F8-AUTH
- **Tên feature**: 認証 & 権限管理 (Authentication & Authorization)
- **Phiên bản**: 1.0.0
- **Tác giả**: DEHA Solutions (Hanq97)
- **Ngày tạo**: 2026-05-16
- **Module**: `frontend/src/features/auth/`
- **Refs**:
  - [SRS](./F8-AUTH-BASE-srs.md)
  - [Basic Design](./F8-AUTH-BASE-basic-design.md)
  - [API Contracts](./F8-AUTH-BASE-api-contracts.md)

---

## 01 — Module Structure / Cấu trúc Module

### 1.1 Feature folder layout

```
frontend/src/
├── features/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx                 # SC-01
│   │   │   ├── TwoFaChallengePage.tsx        # SC-02
│   │   │   ├── ForgotPasswordPage.tsx        # SC-03
│   │   │   ├── ResetPasswordPage.tsx         # SC-04
│   │   │   └── AcceptInvitePage.tsx          # SC-05
│   │   ├── components/
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── PasswordInputField.tsx
│   │   │   ├── TwoFaCodeInput.tsx
│   │   │   ├── PasswordStrengthMeter.tsx
│   │   │   └── ForcedPasswordChangeBanner.tsx
│   │   ├── hooks/
│   │   │   ├── useLogin.ts
│   │   │   ├── useLogout.ts
│   │   │   ├── usePasswordReset.ts
│   │   │   └── useAcceptInvite.ts
│   │   ├── schemas/                          # Zod validation schemas
│   │   │   ├── login.schema.ts
│   │   │   ├── password.schema.ts
│   │   │   └── invite.schema.ts
│   │   └── index.ts                          # Public exports
│   │
│   ├── settings/
│   │   ├── pages/
│   │   │   ├── ProfileSettingsPage.tsx       # SC-06
│   │   │   ├── TwoFaSettingsPage.tsx         # SC-07
│   │   │   └── SessionsPage.tsx              # SC-08
│   │   ├── components/
│   │   │   ├── TwoFaEnrollmentFlow.tsx
│   │   │   ├── BackupCodesDisplay.tsx
│   │   │   └── SessionCard.tsx
│   │   └── hooks/
│   │       ├── use2FAEnrollment.ts
│   │       └── useSessions.ts
│   │
│   └── user-management/                      # F8-02 admin features
│       ├── pages/
│       │   ├── UsersListPage.tsx             # SC-09
│       │   ├── UserDetailPage.tsx
│       │   └── UserInvitePage.tsx
│       ├── components/
│       │   ├── UsersTable.tsx
│       │   ├── RoleSelector.tsx
│       │   ├── UserStatusBadge.tsx
│       │   ├── InviteUserForm.tsx
│       │   └── EmergencyUnlockButton.tsx
│       ├── hooks/
│       │   ├── useUsers.ts
│       │   ├── useInviteUser.ts
│       │   └── useUserMutations.ts
│       └── schemas/
│           └── invite.schema.ts
│
├── shared/
│   ├── api/
│   │   ├── client.ts                         # Axios instance
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts           # 401 → refresh
│   │   │   └── error.interceptor.ts          # Map error code → toast
│   │   └── types.ts                          # ApiError, AuthUser types
│   │
│   ├── stores/
│   │   └── authStore.ts                      # Zustand auth state
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   └── useDebounce.ts
│   │
│   ├── components/
│   │   ├── guards/
│   │   │   ├── AuthGuard.tsx                 # SC-10
│   │   │   ├── RoleGuard.tsx
│   │   │   └── PublicOnly.tsx
│   │   └── feedback/
│   │       ├── ErrorBoundary.tsx
│   │       └── ToastProvider.tsx
│   │
│   └── utils/
│       ├── error-mapper.ts                   # Map error codes → ja_JP messages
│       └── token-storage.ts                  # (Phase 1: no-op, cookies handle)
│
└── app/
    ├── App.tsx
    ├── routes.tsx
    └── providers.tsx                         # QueryClient + Theme + Auth
```

### 1.2 Module Dependencies

| Module | Imports |
|---|---|
| `features/auth` | `shared/api`, `shared/stores`, `shared/components` |
| `features/settings` | `shared/api`, `shared/stores`, `features/auth/components` |
| `features/user-management` | `shared/api`, `shared/stores`, `shared/components` |
| `shared/*` | (no internal feature deps) |

**Rule**: features không import lẫn nhau (chỉ qua `shared/`). Tránh cyclic deps.

---

## 02 — Page Components / Trang chi tiết

### 2.1 LoginPage (SC-01)

#### Component Signature

```typescript
// frontend/src/features/auth/pages/LoginPage.tsx

interface LoginPageProps {} // No external props (router-driven)

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginPageState {
  // Internal state managed via useLogin hook
}

export function LoginPage(): JSX.Element;
```

#### Layout Structure (JSX skeleton)

```
<AuthLayout>
  <Card title="施工管理システム ログイン">
    <Form onFinish={handleSubmit(onSubmit)}>
      <FormItem label="メールアドレス" error={errors.email}>
        <Input type="email" {...register('email')} autoFocus />
      </FormItem>
      
      <FormItem label="パスワード" error={errors.password}>
        <PasswordInputField {...register('password')} />
      </FormItem>
      
      <Button type="primary" htmlType="submit" loading={isLoading} block>
        ログイン
      </Button>
      
      <Divider />
      
      <Link to="/forgot-password">パスワードを忘れた場合</Link>
    </Form>
    
    {errorMessage && <Alert type="error" message={errorMessage} closable />}
  </Card>
</AuthLayout>
```

#### Behavior Specification

| Event | Behavior |
|---|---|
| Mount | Focus email input; if user already authenticated → redirect to `/home` |
| Submit | Call `useLogin` hook → on success: redirect to `/home` or `/login/2fa` (if 2FA required) or `/settings/profile` (if force_password_change) |
| Server returns 401 | Display error "メールアドレスまたはパスワードが正しくありません" |
| Server returns 423 (locked) | Display error with `unlockAt` timestamp |
| Server returns 429 (rate limited) | Display error "操作が多すぎます。後でお試しください。" |
| Network error | Display error "ネットワークエラー。接続を確認してください。" |
| Server returns 200 with `requires2fa=true` | Navigate to `/login/2fa` (state: intermediate token) |
| Server returns 200 with `forcePasswordChange=true` | Navigate to `/settings/profile?force=true` |

#### Form Validation (Zod schema)

```typescript
// frontend/src/features/auth/schemas/login.schema.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string()
    .min(1, 'メールアドレスを入力してください')
    .email('メールアドレスの形式が正しくありません'),
  password: z.string()
    .min(1, 'パスワードを入力してください'),
  // Min 1 only (real validation server-side)
});

export type LoginFormValues = z.infer<typeof LoginSchema>;
```

#### Accessibility

- `<form>` semantic; submit on Enter
- Labels associated với inputs (htmlFor + id)
- Error messages có aria-live="polite"
- Focus management: error focuses on first invalid field
- Color contrast ≥4.5:1 cho text

#### Test Cases (cross-ref test plan)

- TC-FDD-LOGIN-001: Happy path login → redirect home
- TC-FDD-LOGIN-002: Wrong password → display generic error
- TC-FDD-LOGIN-003: Locked account → display unlock time
- TC-FDD-LOGIN-004: 2FA required → redirect /login/2fa
- TC-FDD-LOGIN-005: Force password change → redirect with banner

---

### 2.2 TwoFaChallengePage (SC-02)

#### Component Signature

```typescript
interface TwoFaChallengePageProps {}

interface TwoFaFormValues {
  code: string;        // 6-digit TOTP OR backup code
  useBackupCode: boolean;
}

export function TwoFaChallengePage(): JSX.Element;
```

#### Layout Structure

```
<AuthLayout>
  <Card title="2要素認証">
    <Text type="secondary">
      {useBackupCode 
        ? "バックアップコードを入力してください" 
        : "認証アプリの6桁コードを入力してください"}
    </Text>
    
    <Form onFinish={handleSubmit(onSubmit)}>
      <FormItem label={useBackupCode ? "バックアップコード" : "認証コード"}>
        <TwoFaCodeInput 
          value={code} 
          onChange={setValue} 
          length={useBackupCode ? 10 : 6}
        />
      </FormItem>
      
      <Button type="primary" htmlType="submit" loading={isLoading} block>
        確認
      </Button>
      
      <Divider />
      
      <Link onClick={toggleBackupCode}>
        {useBackupCode ? "認証コードで確認" : "バックアップコードを使用"}
      </Link>
    </Form>
    
    <Text type="secondary">
      残り時間: {intermediateTokenCountdown}秒
    </Text>
  </Card>
</AuthLayout>
```

#### Behavior

| Event | Behavior |
|---|---|
| Mount | Check intermediateToken from router state; if missing → redirect /login. Start 5-min countdown. |
| TOTP code submit | Call `verifyTwoFa` action → success redirect /home, failure show error |
| Backup code submit | Same as TOTP but flag `useBackupCode=true` |
| Countdown reach 0 | Redirect /login với message "セッションが期限切れです" |
| Wrong code (401 AUTH_2FA_INVALID) | Clear input, focus, show "コードが正しくありません" |
| Toggle backup code | Reset input, update placeholder, adjust input length |

#### TwoFaCodeInput Component

Custom component: 6 hoặc 10 input boxes side-by-side, auto-advance trên character input, paste full string distributes ký tự, backspace returns previous box.

```typescript
interface TwoFaCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length: number;
  autoFocus?: boolean;
}
```

---

### 2.3 ForgotPasswordPage (SC-03)

#### Component Signature

```typescript
interface ForgotPasswordFormValues {
  email: string;
}

export function ForgotPasswordPage(): JSX.Element;
```

#### Behavior

- Form: email only
- Submit → API call `requestPasswordReset(email)`
- LUÔN hiển thị success message dù email tồn tại hay không (chống enumeration):
  > "登録されたメールアドレスの場合、パスワードリセットリンクをお送りしました。メールをご確認ください。"
- Link "ログインに戻る" → /login

---

### 2.4 ResetPasswordPage (SC-04)

#### Component Signature

```typescript
interface ResetPasswordFormValues {
  password: string;
  passwordConfirm: string;
}

export function ResetPasswordPage(): JSX.Element;
```

#### Behavior

- Query param `token` extract qua `useSearchParams`
- On mount: call `verifyResetToken(token)` → if invalid (404/410) → display error + redirect /forgot-password
- Form: password + password confirm
- Password field hiển thị PasswordStrengthMeter realtime
- Validation: password must match policy (xem `password.schema.ts`); passwordConfirm phải khớp
- Submit → API call `resetPassword(token, password)` → on success: show toast "パスワードを変更しました" + redirect /login
- Errors: token expired/used/invalid → display error message, suggest request new

#### Password Validation Schema

```typescript
// frontend/src/features/auth/schemas/password.schema.ts
export const PasswordSchema = z.string()
  .min(12, '12文字以上必要です')
  .regex(/[A-Z]/, '大文字を含める必要があります')
  .regex(/[a-z]/, '小文字を含める必要があります')
  .regex(/[0-9]/, '数字を含める必要があります')
  .regex(/[^A-Za-z0-9]/, '記号を含める必要があります');

export const ResetPasswordSchema = z.object({
  password: PasswordSchema,
  passwordConfirm: z.string(),
}).refine(data => data.password === data.passwordConfirm, {
  message: 'パスワードが一致しません',
  path: ['passwordConfirm'],
});
```

---

### 2.5 AcceptInvitePage (SC-05)

#### Component Signature

```typescript
interface AcceptInviteFormValues {
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;  // Optional Phase 1 — defer
}

export function AcceptInvitePage(): JSX.Element;
```

#### Behavior

- Query param `token` extract
- On mount: call `verifyInvitationToken(token)` → display invite info:
  > "{inviterName}様より、{email}として{roleDisplay}ロールで招待されました。"
- Token invalid → error + suggest contact admin
- Form: same as ResetPasswordPage (password validation)
- Submit → API `acceptInvitation(token, password)` → server auto-login + cookies set → redirect /home
- Welcome toast + tour onboarding (Phase 2)

---

### 2.6 ProfileSettingsPage (SC-06)

#### Component Signature

```typescript
interface ProfileFormValues {
  name: string;
  nameKana?: string;
}

interface PasswordChangeFormValues {
  oldPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export function ProfileSettingsPage(): JSX.Element;
```

#### Layout Structure

```
<AppLayout>
  <Tabs>
    <TabPane key="profile" tab="プロフィール">
      <Form onFinish={updateProfile}>
        <FormItem label="メールアドレス">
          <Input value={user.email} disabled />
          <Text type="secondary">メール変更は管理者に依頼してください。</Text>
        </FormItem>
        <FormItem label="氏名"><Input {...register('name')} /></FormItem>
        <FormItem label="フリガナ"><Input {...register('nameKana')} /></FormItem>
        <Button htmlType="submit">保存</Button>
      </Form>
    </TabPane>
    
    <TabPane key="password" tab="パスワード変更">
      <Form onFinish={changePassword}>
        <FormItem label="現在のパスワード"><PasswordInputField {...register('oldPassword')} /></FormItem>
        <FormItem label="新しいパスワード"><PasswordInputField {...register('newPassword')} /></FormItem>
        <FormItem label="新しいパスワード（確認）"><PasswordInputField {...register('newPasswordConfirm')} /></FormItem>
        <Button htmlType="submit">変更</Button>
      </Form>
    </TabPane>
  </Tabs>
  
  {/* Force banner if user came here for forced change */}
  {forcePasswordChange && (
    <ForcedPasswordChangeBanner />
  )}
</AppLayout>
```

#### Behavior

- 2 tabs: profile + password change
- If `?force=true` query → show forced change banner, lock profile tab
- Profile save → mutation; show success toast
- Password change → mutation; show success toast + emit security event + (no logout, current session kept)

---

### 2.7 TwoFaSettingsPage (SC-07)

#### Behavior — 2FA Enrollment Wizard

**Flow** (state machine with 3 steps):

```
[Not enrolled]
    ↓ click "Enable 2FA"
[Step 1: QR display]
    - Call API enroll-start → get { secret, otpauthUri, qrCodeDataUrl }
    - Display QR code + manual entry secret (text)
    - Display instruction in Japanese
    - Button "次へ"
    ↓
[Step 2: Verify first code]
    - 6-digit code input
    - Submit → API enroll-verify
    - On error: retry
    - On success: proceed
    ↓
[Step 3: Backup codes display]
    - Show 10 codes in grid
    - "Download as txt" button
    - "Print" button
    - "Copy all" button
    - Checkbox "I've saved them safely"
    - Submit → mark complete, show success
```

#### Disable 2FA Flow

```
[Enrolled]
    ↓ click "Disable 2FA"
[Confirmation Modal]
    - Input: current password
    - Input: current TOTP (OR backup code toggle)
    - Submit → API disable
    - On success: show toast, refetch user
    - Admin role: refuse với message "Admin role requires 2FA"
```

---

### 2.8 SessionsPage (SC-08)

#### Behavior

- Fetch active sessions: `useSessions()` hook
- Display list cards: each card shows {device/browser, IP, last_seen, location?, current?}
- "Revoke" button per session (except current)
- "Revoke all" button at top
- Confirm modal trước khi revoke

#### Session Card Display

```
┌─────────────────────────────────────────┐
│ 📱 Chrome on Mac           [現在]        │
│ IP: 203.0.113.42                        │
│ 最終アクセス: 5分前                       │
│ 場所: 東京都 (推定)                       │
│                                         │
│              [このセッションは現在]      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💻 Safari on iPhone                     │
│ IP: 198.51.100.10                       │
│ 最終アクセス: 2時間前                     │
│ 場所: 大阪府 (推定)                       │
│                                         │
│                            [取消]        │
└─────────────────────────────────────────┘
```

---

### 2.9 UsersListPage (SC-09)

#### Component Signature

```typescript
interface UsersListFilters {
  search?: string;        // search trên name/email
  role?: UserRole;
  status?: UserStatus;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export function UsersListPage(): JSX.Element;
```

#### Layout

```
<AppLayout>
  <PageHeader title="ユーザー管理" extra={
    <Button type="primary" onClick={() => navigate('/users/new')}>
      新規招待
    </Button>
  } />
  
  <Card>
    <UsersFilterPanel value={filters} onChange={setFilters} />
    
    <UsersTable 
      data={data?.users || []}
      loading={isLoading}
      onRowClick={user => navigate(`/users/${user.id}`)}
      onAction={handleAction}
    />
    
    <Pagination 
      current={filters.page} 
      total={data?.total} 
      pageSize={filters.pageSize}
      onChange={setPage}
    />
  </Card>
</AppLayout>
```

#### UsersTable Columns

| Column | Source | Render |
|---|---|---|
| 氏名 | user.name | Text + Tooltip nameKana |
| メール | user.email | Text |
| ロール | user.role | `<Tag color={roleColor[role]}>{roleLabel[role]}</Tag>` |
| ステータス | user.status | `<UserStatusBadge status={status} />` |
| 最終ログイン | user.lastLoginAt | Relative time (dayjs) |
| 操作 | actions | Dropdown menu: Detail / Change role / Suspend / Unlock / Delete |

#### Row-level Permissions

```typescript
function canManage(currentUser: AuthUser, targetUser: User): boolean {
  if (currentUser.role !== 'system_admin') return false;
  if (targetUser.role === 'system_admin' && countAdmins === 1) return false; // last admin protection
  return true;
}
```

---

### 2.10 UserDetailPage

#### Behavior

- Path: `/users/:id`
- Fetch user via `useUser(id)`
- Display sections:
  - **Profile**: name, email, role, status, created_at, last_login
  - **Sessions**: number of active sessions (link to admin sessions view — defer Phase 2)
  - **Audit log**: recent activities of this user (Phase F8-03)
- Actions (admin only):
  - Change role (with confirm modal)
  - Change status (suspend/activate/disable)
  - Manual unlock
  - Emergency disable 2FA (with reason input + audit)
  - Soft delete (with confirm modal)
- Validation: cannot demote/delete last admin (server enforces too, UI hides)

---

### 2.11 UserInvitePage

#### Component Signature

```typescript
interface InviteFormValues {
  email: string;
  role: UserRole;
  name?: string;  // Optional pre-fill for display
}

export function UserInvitePage(): JSX.Element;
```

#### Behavior

- Form: email, role dropdown (limited theo current user's role), optional name
- Submit → POST /users/invitations
- Success → toast "招待メールを送信しました" + redirect to /users
- Email exists error (409) → display "このメールアドレスは既に登録されています"

#### Role Selector

```typescript
function RoleSelector({ value, onChange, currentUserRole }: RoleSelectorProps) {
  const allowedRoles: UserRole[] = currentUserRole === 'system_admin'
    ? ['system_admin', 'manager', 'employee', 'invited']
    : ['manager', 'employee', 'invited']; // manager cannot invite admin
  
  return (
    <Select value={value} onChange={onChange}>
      {allowedRoles.map(role => (
        <Option key={role} value={role}>{roleLabel[role]}</Option>
      ))}
    </Select>
  );
}
```

---

## 03 — Routes Configuration

### 3.1 Route Map

```typescript
// frontend/src/app/routes.tsx

const routes: RouteObject[] = [
  // Public routes (no auth required)
  {
    element: <PublicOnly><AuthLayout /></PublicOnly>,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/login/2fa', element: <TwoFaChallengePage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/accept-invite', element: <AcceptInvitePage /> },
    ],
  },
  
  // Authenticated routes
  {
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { path: '/', element: <Navigate to="/home" /> },
      { path: '/home', element: <HomePage /> }, // BD-01 — separate feature
      
      // Settings (any authenticated user)
      { path: '/settings/profile', element: <ProfileSettingsPage /> },
      { path: '/settings/2fa', element: <TwoFaSettingsPage /> },
      { path: '/settings/sessions', element: <SessionsPage /> },
      
      // Admin/Manager routes
      {
        element: <RoleGuard roles={['system_admin', 'manager']} />,
        children: [
          { path: '/users', element: <UsersListPage /> },
          { path: '/users/new', element: <UserInvitePage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
        ],
      },
      
      // 404 fallback
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
```

### 3.2 Route Guards

#### AuthGuard (SC-10)

```typescript
interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): JSX.Element {
  // Behavior:
  // 1. Check authStore.user → if null and !isInitialized → loadCurrentUser
  // 2. If isLoading → show <FullPageLoader />
  // 3. If !user → redirect /login với from query param
  // 4. If user.forcePasswordChange → redirect /settings/profile?force=true (except if already there)
  // 5. If user.role === 'system_admin' && requires2faEnrollment → redirect /settings/2fa (except if already there)
  // 6. Else render children
}
```

#### RoleGuard

```typescript
interface RoleGuardProps {
  roles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ roles, fallback }: RoleGuardProps): JSX.Element {
  // Reads current user from useAuth()
  // If user.role NOT in roles → render fallback (default: <ForbiddenPage />)
  // Else render <Outlet /> (React Router child routes)
}
```

#### PublicOnly

```typescript
export function PublicOnly({ children }: PublicOnlyProps): JSX.Element {
  // Behavior: nếu user đã authenticated → redirect /home
  // Dùng cho login/register pages — không hiển thị lại nếu user đã login
}
```

---

## 04 — State Management Detail

### 4.1 authStore (Zustand)

```typescript
// frontend/src/shared/stores/authStore.ts

interface AuthState {
  // State
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  pendingTwoFa: {
    email: string;
    intermediateToken: string;
    expiresAt: number;
  } | null;
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setPendingTwoFa: (pending: AuthState['pendingTwoFa']) => void;
  
  // Compound actions
  loadCurrentUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyTwoFa: (code: string, useBackupCode: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearUser: () => void;
}

type LoginResult = 
  | { kind: 'success'; user: AuthUser }
  | { kind: 'requires2fa'; intermediateToken: string };
```

### 4.2 TanStack Query Keys

```typescript
// frontend/src/shared/api/queryKeys.ts

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: UsersListFilters) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', id] as const,
    sessions: (id: string) => ['users', id, 'sessions'] as const,
    invitations: ['users', 'invitations'] as const,
  },
  settings: {
    sessions: ['settings', 'sessions'] as const,
  },
};
```

### 4.3 Custom Hooks

#### useAuth

```typescript
interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn;
```

#### useLogin

```typescript
interface UseLoginReturn {
  mutate: UseMutateFunction<LoginResult, ApiError, LoginCredentials>;
  isLoading: boolean;
  error: ApiError | null;
}

export function useLogin(): UseLoginReturn;
```

#### useUsers (with filters)

```typescript
interface UseUsersOptions {
  filters: UsersListFilters;
  enabled?: boolean;
}

interface UseUsersReturn {
  data: { users: User[]; total: number } | undefined;
  isLoading: boolean;
  error: ApiError | null;
}

export function useUsers(options: UseUsersOptions): UseUsersReturn;
```

#### useUserMutations

```typescript
interface UseUserMutationsReturn {
  changeRole: UseMutateFunction<void, ApiError, { userId: string; role: UserRole }>;
  changeStatus: UseMutateFunction<void, ApiError, { userId: string; status: UserStatus }>;
  unlock: UseMutateFunction<void, ApiError, { userId: string }>;
  emergencyDisable2fa: UseMutateFunction<void, ApiError, { userId: string; reason: string }>;
  softDelete: UseMutateFunction<void, ApiError, { userId: string }>;
}

export function useUserMutations(): UseUserMutationsReturn;
```

---

## 05 — API Client & Interceptors

### 5.1 Axios Configuration

```typescript
// frontend/src/shared/api/client.ts

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,  // CRITICAL: cookies tự gửi
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

apiClient.interceptors.request.use(addRequestId);
apiClient.interceptors.response.use(undefined, authInterceptor);
apiClient.interceptors.response.use(undefined, errorInterceptor);
```

### 5.2 Auth Interceptor (401 → refresh → retry)

```typescript
// frontend/src/shared/api/interceptors/auth.interceptor.ts

let refreshPromise: Promise<void> | null = null;

export async function authInterceptor(error: AxiosError): Promise<never | AxiosResponse> {
  const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
  
  // Behavior:
  // 1. Only handle 401 + not yet retried + not auth endpoint
  // 2. Singleton refresh: cùng lúc nhiều requests fail thì chỉ 1 refresh call
  // 3. After refresh success: retry original request
  // 4. After refresh failure: clear auth state + redirect /login
  
  if (error.response?.status !== 401) return Promise.reject(error);
  if (original._retried) return Promise.reject(error);
  if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
    return Promise.reject(error);
  }
  
  original._retried = true;
  
  if (!refreshPromise) {
    refreshPromise = apiClient.post('/auth/refresh')
      .then(() => undefined)
      .finally(() => { refreshPromise = null; });
  }
  
  try {
    await refreshPromise;
    return apiClient(original);  // Retry with new cookies
  } catch {
    authStore.getState().clearUser();
    window.location.href = '/login';
    throw error;
  }
}
```

### 5.3 Error Interceptor (map code → toast)

```typescript
// frontend/src/shared/api/interceptors/error.interceptor.ts

const ERROR_MESSAGES_JA: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',
  AUTH_2FA_REQUIRED: '2要素認証が必要です',
  AUTH_2FA_INVALID: '認証コードが正しくありません',
  AUTH_ACCOUNT_LOCKED: 'アカウントがロックされました。15分後に再試行してください。',
  AUTH_ACCOUNT_SUSPENDED: 'アカウントが停止されています。管理者にお問い合わせください。',
  AUTH_INSUFFICIENT_PERMISSION: 'この操作を実行する権限がありません',
  AUTH_PASSWORD_WEAK: 'パスワードのポリシーに準拠していません',
  AUTH_INVITATION_EXPIRED: '招待リンクの有効期限が切れています。',
  AUTH_INVITATION_USED: 'この招待は既に使用されました。',
  AUTH_INVITATION_INVALID: '招待リンクが無効です。',
  AUTH_PASSWORD_RESET_EXPIRED: 'パスワードリセットリンクの有効期限が切れています。',
  AUTH_USER_EXISTS: 'このメールアドレスは既に登録されています。',
  AUTH_LAST_ADMIN: '最後の管理者を削除/変更することはできません。',
  AUTH_RATE_LIMITED: '操作が多すぎます。後でお試しください。',
  // Default
  UNKNOWN_ERROR: 'エラーが発生しました。再試行してください。',
};

export function errorInterceptor(error: AxiosError<ApiError>): Promise<never> {
  const code = error.response?.data?.code || 'UNKNOWN_ERROR';
  const message = ERROR_MESSAGES_JA[code] || error.response?.data?.message || ERROR_MESSAGES_JA.UNKNOWN_ERROR;
  
  // Show toast (except for handled cases like 401 which auth interceptor handles)
  if (error.response?.status !== 401 || error.config?.url?.includes('/auth/')) {
    toast.error(message, { duration: 5000 });
  }
  
  return Promise.reject(error);
}
```

---

## 06 — Form Schemas (Zod)

### 6.1 Login Schema

```typescript
// frontend/src/features/auth/schemas/login.schema.ts
export const LoginSchema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください').email('メールの形式が正しくありません'),
  password: z.string().min(1, 'パスワードを入力してください'),
});
```

### 6.2 Password Schema

```typescript
// frontend/src/features/auth/schemas/password.schema.ts
export const PasswordSchema = z.string()
  .min(12, '12文字以上必要です')
  .regex(/[A-Z]/, '大文字を含める必要があります')
  .regex(/[a-z]/, '小文字を含める必要があります')
  .regex(/[0-9]/, '数字を含める必要があります')
  .regex(/[^A-Za-z0-9]/, '記号を含める必要があります');
```

### 6.3 Invitation Schema

```typescript
// frontend/src/features/user-management/schemas/invite.schema.ts
export const InviteSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  role: z.enum(['system_admin', 'manager', 'employee', 'invited']),
  name: z.string().min(1, '氏名を入力してください').max(100),
});
```

### 6.4 2FA Schema

```typescript
// frontend/src/features/settings/schemas/twofa.schema.ts
export const TotpCodeSchema = z.string().regex(/^\d{6}$/, '6桁の数字を入力してください');

export const BackupCodeSchema = z.string()
  .regex(/^[A-Z0-9]{10}$/, '10文字の英数字を入力してください');

export const Verify2FaSchema = z.object({
  code: z.string(),
  useBackupCode: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.useBackupCode) {
    if (!BackupCodeSchema.safeParse(data.code).success) {
      ctx.addIssue({ code: 'custom', path: ['code'], message: '形式が正しくありません' });
    }
  } else {
    if (!TotpCodeSchema.safeParse(data.code).success) {
      ctx.addIssue({ code: 'custom', path: ['code'], message: '6桁の数字を入力してください' });
    }
  }
});
```

---

## 07 — UI Component Library Usage (Hybrid: Antd + Tailwind + Lucide)

> **Cập nhật 2026-05-16**: Đã chuyển sang UI hybrid. Xem [03-frontend-architecture.md §2.1](../../architecture/03-frontend-architecture.md) cho design system baseline.

### 7.1 Component Mapping (refined)

| Use case | Library |
|---|---|
| Forms / Inputs / Password / Select / DatePicker | **Antd** (`Form`, `Input`, `Input.Password`, `Select`, `DatePicker` — JP locale) |
| Tables / Pagination | **Antd** (`Table`) |
| Modals / Drawer / Tooltip / Popconfirm | **Antd** |
| notification / message (toast) | **Antd** |
| Spin (async loading) | **Antd** |
| Layout (sidebar / header / grid) | **Tailwind** + `AppLayout` component |
| Card / KPI stat / empty state | **Tailwind** (`bg-white border border-zinc-200/70 rounded-xl shadow-card`) |
| Badge / tag (status) | **Tailwind** pill (`bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`) |
| Buttons (primary action) | **Antd** `Button` (controlHeight 38, primary brand-500) |
| Buttons (icon-only / ghost custom) | **Tailwind** native button |
| Icons trong page content | **Lucide React** (`Mail`, `Lock`, `Home`, ...) |
| Icons trong Antd internal | **Antd default** (Form validation icons) |

### 7.2 Theme Customization (mirrors design-tokens.css)

```typescript
// frontend/src/app/providers.tsx
const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1689e4',       // brand-500 (modern blue, not Antd default)
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgLayout: '#fafafa',
    colorText: '#18181b',
    colorTextSecondary: '#52525b',
    colorBorder: '#e4e4e7',
    borderRadius: 8,                // 4 → 8 modern
    fontFamily: 'Inter, "Noto Sans JP", "Hiragino Sans", sans-serif',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)', // soft
    controlHeight: 38,
  },
  components: {
    Form: { itemMarginBottom: 18 },
    Button: { fontWeight: 500, primaryShadow: 'none' },
    Card: { boxShadowTertiary: 'none' },
    Layout: { headerBg: '#ffffff', siderBg: '#ffffff' },
    Menu: { itemBorderRadius: 6, itemHeight: 36 },
  },
};
```

### 7.3 i18n (Ant Design Locale)

```typescript
// frontend/src/app/providers.tsx
import jaJP from 'antd/locale/ja_JP';

<ConfigProvider locale={jaJP} theme={antdTheme}>
  <App>...</App>
</ConfigProvider>
```

---

## 08 — Performance Optimization

### 8.1 Code Splitting

```typescript
// frontend/src/app/routes.tsx
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const UsersListPage = lazy(() => import('@/features/user-management/pages/UsersListPage'));
// ... lazy load all pages
```

**Targets**:
- Initial bundle (login + auth) < 200KB gzip
- Main app bundle (post-login) < 400KB gzip
- Route-level chunks <50KB gzip each

### 8.2 Bundle Optimization

```typescript
// frontend/vite.config.ts (additions)
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'antd-vendor': ['antd', '@ant-design/icons'],
        'auth-features': ['./src/features/auth', './src/features/user-management'],
      },
    },
  },
},
```

### 8.3 Image Optimization

- Logo, icons: SVG only
- No heavy images on auth pages
- Lazy-load any dashboard assets

### 8.4 Performance Targets

| Metric | Target |
|---|---|
| Initial load (login page) | <2s on 4G |
| Time to Interactive | <3s |
| First Contentful Paint | <1.5s |
| Largest Contentful Paint | <2.5s |

---

## 09 — Accessibility (a11y)

### 9.1 WCAG 2.1 AA Compliance Checklist

- [ ] Color contrast ≥4.5:1 cho text, ≥3:1 cho UI components
- [ ] Keyboard navigation throughout (Tab order, Enter submit, Esc close modal)
- [ ] ARIA labels cho icon-only buttons
- [ ] Focus indicators visible
- [ ] Form errors có aria-live + aria-describedby
- [ ] Skip-to-content link
- [ ] No keyboard traps
- [ ] Heading hierarchy semantic (h1 → h2 → h3, no skip)

### 9.2 Screen Reader Support

- Labels associated with inputs
- Error messages announced (role="alert")
- Loading states announced (aria-busy)
- Modal open/close announced (focus trap + aria-modal)

### 9.3 Mobile a11y (Phase 2 PWA prep)

- Touch targets ≥44×44 px
- Font scaling support (rem units)
- Reduced motion support (`prefers-reduced-motion`)

---

## 10 — Internationalization (i18n)

### 10.1 Phase 1 Scope

- **Primary**: ja_JP only Phase 1
- **Fallback**: English (cho dev tools, error codes)
- **Future**: vi (Vietnamese) cho DEHA internal, en cho international (Phase 2+)

### 10.2 i18next Setup

```typescript
// frontend/src/app/providers.tsx
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: jaTranslations },
  },
  lng: 'ja',
  fallbackLng: 'ja',
  interpolation: { escapeValue: false },
});
```

### 10.3 Translation Files Structure

```
frontend/src/locales/
└── ja/
    ├── common.json        # 共通 (buttons, generic messages)
    ├── auth.json          # 認証 specific
    ├── users.json         # ユーザー管理 specific
    └── errors.json        # Error messages map
```

---

## 11 — Testing Approach (Frontend)

### 11.1 Test Pyramid

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit | Vitest + Testing Library | 80%+ for hooks, utils |
| Component | Vitest + Testing Library + MSW (mock API) | 75%+ for components |
| Integration | Vitest + MSW + jsdom | Critical flows (login, invite accept, password reset) |
| E2E | Playwright | 5-10 happy paths + critical error paths |

### 11.2 MSW (Mock Service Worker) Handlers

```typescript
// frontend/src/test/mocks/handlers.ts
export const handlers = [
  rest.post('/auth/login', (req, res, ctx) => {
    // Mock response based on email pattern
    if (req.body.email.startsWith('locked@')) {
      return res(ctx.status(423), ctx.json({ code: 'AUTH_ACCOUNT_LOCKED' }));
    }
    return res(ctx.status(200), ctx.json({ user: mockUser, requires2fa: false }));
  }),
  // ... other handlers
];
```

### 11.3 Test Cases (sample)

#### LoginPage Unit Test

```typescript
describe('LoginPage', () => {
  it('redirects to /home on successful login', async () => {
    render(<LoginPage />, { wrapper: TestWrapper });
    
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'user@test.com');
    await userEvent.type(screen.getByLabelText('パスワード'), 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });
  
  it('displays error for invalid credentials', async () => { ... });
  it('navigates to 2FA challenge when required', async () => { ... });
});
```

### 11.4 E2E (Playwright) — Happy Paths

```typescript
// frontend/tests/e2e/auth.e2e.spec.ts
test('full login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'admin@dev.shikou-kanri.local');
  await page.fill('[name=password]', 'DevPassword123!');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/home');
  await expect(page.locator('h1')).toContainText('ダッシュボード');
});
```

---

## 12 — Error Handling Strategy

### 12.1 Error Boundary

```typescript
// frontend/src/shared/components/feedback/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  // Catch render errors, log to monitoring, display fallback UI
  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('UI error', { error: error.message, stack: error.stack, info });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

### 12.2 Error Categories

| Source | Handler |
|---|---|
| API errors (HTTP) | Axios interceptors → toast / specific handling |
| Validation errors (Zod) | React Hook Form display errors inline |
| Render errors | ErrorBoundary → fallback UI |
| Network/timeout | Axios timeout → toast "ネットワークエラー" |
| Unexpected | window.onerror handler → log + fallback |

---

## Summary / Tóm tắt FDD

| Metric | Count |
|---|---|
| Pages (SC-*) | 10 (5 public + 3 settings + 3 admin — overlap counting) |
| Reusable components | 17 |
| Custom hooks | 12+ |
| Zod schemas | 5 (login, password, invite, 2FA, reset) |
| Route guards | 3 (AuthGuard, RoleGuard, PublicOnly) |
| API interceptors | 3 (request-id, auth-401, error-toast) |
| Test coverage target | 75-85% per layer |

**Performance**: <2s initial load, <50KB per route chunk
**Accessibility**: WCAG 2.1 AA target
**i18n**: ja_JP primary, ready for future expansion

**Refs**: SRS FRs cross-mapped to pages/hooks; ADR-003 frontend stack adhered

---

*F8-AUTH-BASE-frontend-detail-design.md*
*Frontend Detail Design — 認証 & 権限管理*
*Generated by EPS Framework /design --detail v5.0*
*DEHA Solutions, 2026-05-16*
