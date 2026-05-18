import { AppError } from './app-error';

export class MaintenanceScheduleNotFoundError extends AppError {
  constructor(id?: string) {
    super(
      'MAINTENANCE_SCHEDULE_NOT_FOUND',
      404,
      '点検スケジュールが見つかりません。',
      { id },
    );
  }
}

export class MaintenanceScheduleInvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      'MAINTENANCE_SCHEDULE_INVALID_TRANSITION',
      409,
      `スケジュールのステータスを ${from} から ${to} に変更できません。`,
      { from, to },
    );
  }
}

export class AftercareRecordNotFoundError extends AppError {
  constructor(id?: string) {
    super('AFTERCARE_RECORD_NOT_FOUND', 404, 'アフター履歴が見つかりません。', {
      id,
    });
  }
}

export class PropertyHasNoHandoverDateError extends AppError {
  constructor(propertyId: string) {
    super(
      'PROPERTY_HAS_NO_HANDOVER_DATE',
      400,
      '引渡日が未設定のため、点検スケジュールを生成できません。',
      { propertyId },
    );
  }
}
