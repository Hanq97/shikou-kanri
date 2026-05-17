import { AppError } from './app-error';

export class QuoteNotFoundError extends AppError {
  constructor(id?: string) {
    super('QUOTE_NOT_FOUND', 404, '見積が見つかりません。', { id });
  }
}

export class QuoteConflictError extends AppError {
  constructor(id?: string) {
    super(
      'QUOTE_CONFLICT',
      409,
      '他のユーザーが編集しました。再読み込みしてください。',
      { id },
    );
  }
}

export class QuoteInvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      'QUOTE_INVALID_STATUS_TRANSITION',
      400,
      `${from} から ${to} への遷移は許可されていません。`,
      { from, to },
    );
  }
}

export class QuoteTier2RequiresAdminError extends AppError {
  constructor() {
    super(
      'QUOTE_TIER2_REQUIRES_ADMIN',
      403,
      '管理者の承認が必要です (¥10,000,000超)。',
    );
  }
}

export class QuoteRejectReasonRequiredError extends AppError {
  constructor() {
    super('QUOTE_REJECT_REASON_REQUIRED', 400, '却下理由は5文字以上必要です。');
  }
}

export class QuoteDeleteReasonRequiredError extends AppError {
  constructor() {
    super('QUOTE_DELETE_REASON_REQUIRED', 400, '削除理由は5文字以上必要です。');
  }
}

export class QuoteLockedError extends AppError {
  constructor(currentStatus: string) {
    super(
      'QUOTE_LOCKED',
      400,
      `ステータス「${currentStatus}」の見積は編集できません。`,
      { currentStatus },
    );
  }
}

export class QuoteCanOnlyCreateVersionFromSentError extends AppError {
  constructor() {
    super(
      'QUOTE_CAN_ONLY_VERSION_FROM_SENT',
      400,
      '送付済以降の見積のみ新規版作成できます。',
    );
  }
}

export class QuoteVersionReasonRequiredError extends AppError {
  constructor() {
    super(
      'QUOTE_VERSION_REASON_REQUIRED',
      400,
      '変更理由は5文字以上必要です。',
    );
  }
}

export class QuoteAnotherWonExistsError extends AppError {
  constructor(projectId: string) {
    super(
      'QUOTE_ANOTHER_WON_EXISTS',
      409,
      'この案件にはすでに受注見積があります。管理者の承認が必要です。',
      { projectId },
    );
  }
}

export class QuoteAtLeastOneRequiredLineError extends AppError {
  constructor() {
    super(
      'QUOTE_AT_LEAST_ONE_REQUIRED_LINE',
      400,
      '少なくとも1つの必須項目が必要です (オプションのみ不可)。',
    );
  }
}

export class UnitPriceNotFoundError extends AppError {
  constructor(id?: string) {
    super('UNIT_PRICE_NOT_FOUND', 404, '単価マスタが見つかりません。', { id });
  }
}

export class UnitPriceCodeExistsError extends AppError {
  constructor(code: string) {
    super(
      'UNIT_PRICE_CODE_EXISTS',
      409,
      `単価コード「${code}」はすでに存在します。`,
      { code },
    );
  }
}

export class PdfGenerationFailedError extends AppError {
  constructor(reason?: string) {
    super('PDF_GENERATION_FAILED', 500, 'PDFの生成に失敗しました。', {
      reason,
    });
  }
}
