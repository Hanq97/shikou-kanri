import type { ApiError } from '@/shared/api/types';

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',
  AUTH_2FA_REQUIRED: '2要素認証が必要です',
  AUTH_2FA_INVALID: '認証コードが正しくありません',
  AUTH_2FA_ENROLLMENT_REQUIRED: '2要素認証の設定が必要です',
  AUTH_FORCE_PASSWORD_CHANGE: 'パスワードの変更が必要です',
  AUTH_TOKEN_EXPIRED: 'セッションの有効期限が切れました。再度ログインしてください。',
  AUTH_TOKEN_INVALID: '認証情報が無効です',
  AUTH_REFRESH_INVALID: 'リフレッシュトークンが無効です',
  AUTH_REFRESH_REUSE_DETECTED: 'セッションの不正利用が検出されました。すべてのセッションを無効化しました。',
  AUTH_ACCOUNT_LOCKED: 'アカウントがロックされました。しばらくしてから再試行してください。',
  AUTH_ACCOUNT_SUSPENDED: 'アカウントが停止されています。管理者にお問い合わせください。',
  AUTH_INSUFFICIENT_PERMISSION: 'この操作を実行する権限がありません',
  AUTH_INVITATION_EXPIRED: '招待リンクの有効期限が切れています',
  AUTH_INVITATION_USED: 'この招待リンクは既に使用されました',
  AUTH_INVITATION_INVALID: '招待リンクが無効です',
  AUTH_PASSWORD_RESET_EXPIRED: 'パスワードリセットリンクの有効期限が切れています',
  AUTH_PASSWORD_RESET_INVALID: 'パスワードリセットリンクが無効です',
  AUTH_PASSWORD_WEAK: 'パスワードがポリシーを満たしていません',
  AUTH_USER_EXISTS: 'このメールアドレスは既に登録されています',
  AUTH_LAST_ADMIN: '最後の管理者を変更/削除することはできません',
  AUTH_RATE_LIMITED: '操作が多すぎます。しばらくしてから再試行してください。',
  VALIDATION_ERROR: '入力内容に誤りがあります',
  NOT_FOUND: 'リソースが見つかりません',
  CONFLICT_UNIQUE: 'リソースが既に存在します',
  NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください。',
  UNKNOWN_ERROR: 'エラーが発生しました。再試行してください。',
  INTERNAL_ERROR: 'サーバーエラーが発生しました。しばらくしてから再試行してください。',
};

export function mapErrorMessage(error: ApiError | string): string {
  if (typeof error === 'string') return ERROR_MESSAGES[error] ?? error;
  return ERROR_MESSAGES[error.code] ?? error.message ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}
