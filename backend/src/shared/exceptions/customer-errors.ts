import { AppError } from './app-error';

export class CustomerNotFoundError extends AppError {
  constructor(id?: string) {
    super('CUSTOMER_NOT_FOUND', 404, '顧客が見つかりません。', { id });
  }
}

export class CustomerHasActiveProjectsError extends AppError {
  constructor(
    count: number,
    projects: Array<{
      id: string;
      projectCode: string;
      name: string;
      status: string;
    }>,
  ) {
    super(
      'CUSTOMER_HAS_ACTIVE_PROJECTS',
      409,
      `${count}件のアクティブな案件があるため削除できません。`,
      { count, projects },
    );
  }
}

export class PropertyNotFoundError extends AppError {
  constructor(id?: string) {
    super('PROPERTY_NOT_FOUND', 404, '物件が見つかりません。', { id });
  }
}

export class PropertyPhotoTooManyError extends AppError {
  constructor() {
    super('PROPERTY_PHOTO_TOO_MANY', 400, '写真は3枚までです。');
  }
}

export class PropertyPhotoTooLargeError extends AppError {
  constructor() {
    super('PROPERTY_PHOTO_TOO_LARGE', 400, '写真サイズが大きすぎます。');
  }
}
