import { AppError } from './app-error';

export class ProjectNotFoundError extends AppError {
  constructor(id?: string) {
    super('PROJECT_NOT_FOUND', 404, '案件が見つかりません。', { id });
  }
}

export class ProjectInvalidOwnerError extends AppError {
  constructor() {
    super(
      'PROJECT_INVALID_OWNER',
      400,
      '案件オーナーは社内ユーザーである必要があります。',
    );
  }
}

export class ProjectCustomerRequiredError extends AppError {
  constructor() {
    super('PROJECT_CUSTOMER_REQUIRED', 400, '顧客の指定が必要です。');
  }
}

export class ProjectInvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      'PROJECT_INVALID_STATUS_TRANSITION',
      400,
      `${from} から ${to} への遷移は許可されていません。`,
      { from, to },
    );
  }
}

export class ProjectMissingFieldForTransitionError extends AppError {
  constructor(field: string) {
    super(
      'PROJECT_MISSING_FIELD_FOR_TRANSITION',
      400,
      `この遷移には ${field} が必要です。`,
      { field },
    );
  }
}

export class ProjectMissingPropertyForHandoverError extends AppError {
  constructor() {
    super(
      'PROJECT_MISSING_PROPERTY_FOR_HANDOVER',
      400,
      '引渡しには物件情報が必要です。',
    );
  }
}

export class ProjectMissingHandoverDateError extends AppError {
  constructor() {
    super(
      'PROJECT_MISSING_HANDOVER_DATE',
      400,
      '物件の引渡日が設定されていません。',
    );
  }
}

export class ProjectCancelReasonRequiredError extends AppError {
  constructor() {
    super(
      'PROJECT_CANCEL_REASON_REQUIRED',
      400,
      'キャンセル理由は5文字以上で入力してください。',
    );
  }
}

export class ProjectReverseReasonRequiredError extends AppError {
  constructor() {
    super(
      'PROJECT_REVERSE_REASON_REQUIRED',
      400,
      '差戻しには理由（5文字以上）が必要です。',
    );
  }
}
