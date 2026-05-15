import { AppError } from './app-error';

export class AuthInvalidCredentialsError extends AppError {
  constructor() {
    super('AUTH_INVALID_CREDENTIALS', 401, 'メールアドレスまたはパスワードが正しくありません');
  }
}

export class Auth2FaRequiredError extends AppError {
  constructor() {
    super('AUTH_2FA_REQUIRED', 401, '2要素認証が必要です');
  }
}

export class Auth2FaInvalidError extends AppError {
  constructor() {
    super('AUTH_2FA_INVALID', 401, '認証コードが正しくありません');
  }
}

export class AuthTokenExpiredError extends AppError {
  constructor() {
    super('AUTH_TOKEN_EXPIRED', 401, 'セッションの有効期限が切れました。再度ログインしてください。');
  }
}

export class AuthTokenInvalidError extends AppError {
  constructor() {
    super('AUTH_TOKEN_INVALID', 401, '認証情報が無効です');
  }
}

export class AuthRefreshInvalidError extends AppError {
  constructor() {
    super('AUTH_REFRESH_INVALID', 401, 'リフレッシュトークンが無効です');
  }
}

export class AuthRefreshReuseDetectedError extends AppError {
  constructor() {
    super(
      'AUTH_REFRESH_REUSE_DETECTED',
      401,
      'セッションの不正利用が検出されました。すべてのセッションを無効化しました。',
    );
  }
}

export class AuthInsufficientPermissionError extends AppError {
  constructor(message?: string) {
    super(
      'AUTH_INSUFFICIENT_PERMISSION',
      403,
      message ?? 'この操作を実行する権限がありません',
    );
  }
}

export class AuthAccountSuspendedError extends AppError {
  constructor() {
    super('AUTH_ACCOUNT_SUSPENDED', 403, 'アカウントが停止されています。管理者にお問い合わせください。');
  }
}

export class AuthAccountLockedError extends AppError {
  constructor(unlockAt: Date, requiresAdminUnlock = false) {
    super(
      'AUTH_ACCOUNT_LOCKED',
      423,
      requiresAdminUnlock
        ? 'アカウントがロックされました。管理者にお問い合わせください。'
        : 'アカウントがロックされました。しばらくしてから再試行してください。',
      { unlockAt: unlockAt.toISOString(), requiresAdminUnlock },
    );
  }
}

export class Auth2FaEnrollmentRequiredError extends AppError {
  constructor() {
    super(
      'AUTH_2FA_ENROLLMENT_REQUIRED',
      403,
      '管理者は2要素認証の設定が必要です。設定後に再度お試しください。',
    );
  }
}

export class AuthForcePasswordChangeError extends AppError {
  constructor() {
    super(
      'AUTH_FORCE_PASSWORD_CHANGE',
      403,
      'パスワードの変更が必要です。新しいパスワードを設定してください。',
    );
  }
}

export class AuthInvitationExpiredError extends AppError {
  constructor() {
    super('AUTH_INVITATION_EXPIRED', 410, '招待リンクの有効期限が切れています。');
  }
}

export class AuthInvitationUsedError extends AppError {
  constructor() {
    super('AUTH_INVITATION_USED', 410, 'この招待リンクは既に使用されました。');
  }
}

export class AuthInvitationInvalidError extends AppError {
  constructor() {
    super('AUTH_INVITATION_INVALID', 404, '招待リンクが無効です。');
  }
}

export class AuthPasswordResetExpiredError extends AppError {
  constructor() {
    super('AUTH_PASSWORD_RESET_EXPIRED', 410, 'パスワードリセットリンクの有効期限が切れています。');
  }
}

export class AuthPasswordResetInvalidError extends AppError {
  constructor() {
    super('AUTH_PASSWORD_RESET_INVALID', 404, 'パスワードリセットリンクが無効です。');
  }
}

export class AuthPasswordWeakError extends AppError {
  constructor(failures: Array<{ rule: string; message: string }>) {
    super('AUTH_PASSWORD_WEAK', 400, 'パスワードがポリシーを満たしていません', { failures });
  }
}

export class AuthUserExistsError extends AppError {
  constructor() {
    super('AUTH_USER_EXISTS', 409, 'このメールアドレスは既に登録されています。');
  }
}

export class AuthLastAdminError extends AppError {
  constructor() {
    super(
      'AUTH_LAST_ADMIN',
      409,
      '最後の管理者を変更または削除することはできません。',
    );
  }
}

export class AuthRateLimitedError extends AppError {
  constructor() {
    super('AUTH_RATE_LIMITED', 429, '操作が多すぎます。しばらくしてから再試行してください。');
  }
}
