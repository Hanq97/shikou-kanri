import { Button, Modal } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DuplicateOf } from '@/shared/api/customers.api';

interface Props {
  open: boolean;
  mode: 'create' | 'update';
  duplicateOf: DuplicateOf;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DuplicateCustomerConfirmModal({
  open,
  mode,
  duplicateOf,
  onCancel,
  onConfirm,
  loading,
}: Props): JSX.Element {
  const { t } = useTranslation();
  return (
    <Modal open={open} title={t('customer.duplicate.title')} onCancel={onCancel} footer={null}>
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="m-0 text-sm text-amber-900">{t('customer.duplicate.description')}</p>
      </div>
      <div className="bg-zinc-50 border border-zinc-200/70 rounded-lg p-3 mb-4">
        <p className="m-0 text-sm font-semibold text-zinc-900">{duplicateOf.name}</p>
        {duplicateOf.address && (
          <p className="m-0 mt-1 text-xs text-zinc-500">{duplicateOf.address}</p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button type="primary" onClick={onConfirm} loading={loading}>
          {mode === 'create'
            ? t('customer.duplicate.continueButton')
            : t('customer.duplicate.continueButtonUpdate')}
        </Button>
      </div>
    </Modal>
  );
}
