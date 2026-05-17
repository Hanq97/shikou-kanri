import { App, Form, Input, InputNumber, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import { projectsApi, type ChangeStatusInput, type ProjectStatus } from '@/shared/api/projects.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { ProjectStatusTag } from './ProjectStatusTag';

interface Props {
  open: boolean;
  projectId: string;
  from: ProjectStatus;
  to: Exclude<ProjectStatus, 'quoting'>;
  needsAmount: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangeStatusModal({
  open,
  projectId,
  from,
  to,
  needsAmount,
  onClose,
  onSuccess,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [amountTotal, setAmountTotal] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountTotal(null);
      setReason('');
    }
  }, [open]);

  const requireReason = to === 'cancelled';

  async function submit(): Promise<void> {
    if (needsAmount && (amountTotal === null || amountTotal < 0)) {
      message.error(t('project.actions.amountTotalRequired'));
      return;
    }
    if (requireReason && reason.trim().length < 5) {
      message.error(t('project.actions.cancelReason'));
      return;
    }
    setSubmitting(true);
    try {
      const input: ChangeStatusInput = { status: to };
      if (needsAmount && amountTotal !== null) input.amountTotal = amountTotal;
      if (requireReason) input.reason = reason.trim();
      await projectsApi.changeStatus(projectId, input);
      message.success(t('project.messages.statusChanged'));
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
      title={t('project.actions.confirmTransitionTitle')}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={submitting}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      destroyOnClose
    >
      <p className="m-0 mb-3 text-sm text-zinc-600">
        <ProjectStatusTag status={from} />
        <span className="mx-2">→</span>
        <ProjectStatusTag status={to} />
      </p>

      <Form layout="vertical">
        {needsAmount && (
          <Form.Item label={t('project.actions.amountTotal')} required>
            <InputNumber
              value={amountTotal}
              onChange={(v) => setAmountTotal(typeof v === 'number' ? v : null)}
              min={0}
              max={999_999_999_999}
              step={10000}
              style={{ width: '100%' }}
              formatter={(value) =>
                value !== undefined && value !== null
                  ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  : ''
              }
              parser={(v) => (v ? Number((v + '').replace(/[^\d]/g, '')) : 0)}
            />
          </Form.Item>
        )}
        {requireReason && (
          <Form.Item label={t('project.actions.cancelReason')} required>
            <Input.TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
