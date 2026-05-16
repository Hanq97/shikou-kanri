import { App, Form, Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import { projectsApi, type ProjectStatus } from '@/shared/api/projects.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

type ReverseTarget = 'quoting' | 'received' | 'construction' | 'completed';

interface Props {
  open: boolean;
  projectId: string;
  currentStatus: ProjectStatus;
  onClose: () => void;
  onSuccess: () => void;
}

const ALL_TARGETS: ReverseTarget[] = ['quoting', 'received', 'construction', 'completed'];

export function ReverseStatusModal({
  open,
  projectId,
  currentStatus,
  onClose,
  onSuccess,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [target, setTarget] = useState<ReverseTarget | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTarget(null);
      setReason('');
    }
  }, [open]);

  const targets = ALL_TARGETS.filter((s) => s !== currentStatus);

  async function submit(): Promise<void> {
    if (!target) {
      message.error(t('project.actions.reverseTarget'));
      return;
    }
    if (reason.trim().length < 5) {
      message.error(t('project.actions.reverseReason'));
      return;
    }
    setSubmitting(true);
    try {
      await projectsApi.reverseStatus(projectId, {
        status: target,
        reason: reason.trim(),
      });
      message.success(t('project.messages.statusReversed'));
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
      title={t('project.actions.reverseTitle')}
      onCancel={onClose}
      onOk={submit}
      okText={t('project.actions.reverseSubmit')}
      okButtonProps={{ danger: true }}
      cancelText={t('common.cancel')}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form layout="vertical">
        <Form.Item label={t('project.actions.reverseTarget')} required>
          <Select
            value={target}
            onChange={(v: ReverseTarget) => setTarget(v)}
            options={targets.map((s) => ({
              value: s,
              label: t(`project.status.${s}`),
            }))}
          />
        </Form.Item>
        <Form.Item label={t('project.actions.reverseReason')} required>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
