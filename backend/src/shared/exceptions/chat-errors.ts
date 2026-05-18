import { AppError } from './app-error';

export class ChatMessageNotFoundError extends AppError {
  constructor(id?: string) {
    super('CHAT_MESSAGE_NOT_FOUND', 404, 'メッセージが見つかりません。', {
      id,
    });
  }
}

export class ChatForbiddenError extends AppError {
  constructor() {
    super(
      'CHAT_FORBIDDEN',
      403,
      'この案件のチャットを閲覧する権限がありません。',
    );
  }
}

export class ChatAttachmentTooLargeError extends AppError {
  constructor(sizeBytes: number, limitBytes: number) {
    super(
      'CHAT_ATTACHMENT_TOO_LARGE',
      400,
      `添付ファイルが大きすぎます（${(sizeBytes / 1_048_576).toFixed(1)}MB / 上限 ${(limitBytes / 1_048_576).toFixed(0)}MB）`,
      { sizeBytes, limitBytes },
    );
  }
}

export class ChatAttachmentTooManyError extends AppError {
  constructor(limit: number) {
    super(
      'CHAT_ATTACHMENT_TOO_MANY',
      400,
      `添付ファイルは${limit}個までです。`,
      { limit },
    );
  }
}

export class ChatAttachmentMimeNotAllowedError extends AppError {
  constructor(mime: string) {
    super(
      'CHAT_ATTACHMENT_MIME_NOT_ALLOWED',
      400,
      `このファイル形式は許可されていません: ${mime}`,
      { mime },
    );
  }
}
