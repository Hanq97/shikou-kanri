import { Alert, App, Button, Form, Input, Modal } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import { usersApi, type UserSummary } from '@/shared/api/users.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface Props {
  open: boolean;
  user: UserSummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmergencyDisable2FaModal({ open, user, onClose, onSuccess }: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(): Promise<void> {
    if (!user || reason.trim().length < 10) return;
    setSubmitting(true);
    try {
      await usersApi.emergencyDisable2Fa(user.id, reason.trim());
      message.success(t('users.emergencyDisable2Fa.success'));
      setReason('');
      onSuccess();
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={t('users.emergencyDisable2Fa.title')}
      onCancel={() => {
        setReason('');
        onClose();
      }}
      footer={null}
      destroyOnClose
    >
      <Alert
        type="warning"
        message={t('users.emergencyDisable2Fa.auditWarning')}
        description={t('users.emergencyDisable2Fa.auditDescription')}
        showIcon
        className="!mb-4"
      />
      <p className="text-sm text-zinc-600 mb-2">
        {t('users.emergencyDisable2Fa.target')}:{' '}
        <strong className="text-zinc-900">{user?.email}</strong>
      </p>
      <Form layout="vertical" onFinish={onSubmit}>
        <Form.Item label={t('users.emergencyDisable2Fa.labelReason')} required>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('users.emergencyDisable2Fa.reasonPlaceholder')}
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setReason('');
              onClose();
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            danger
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={reason.trim().length < 10}
          >
            {t('users.emergencyDisable2Fa.submit')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
