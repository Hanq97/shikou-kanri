import { App, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient, extractApiError } from '@/shared/api/client';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  email: string;
  name?: string;
}

export function InviteWorkerModal({ projectId, open, onClose, onSuccess }: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiClient.post(`/projects/${projectId}/members/invite-worker`, values),
    onSuccess: () => {
      message.success(t('project.members.inviteWorker.success'));
      form.resetFields();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      message.error(mapErrorMessage(extractApiError(err)));
    },
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      title={t('project.members.inviteWorker.title')}
      okText={t('project.members.inviteWorker.send')}
      cancelText={t('common.cancel')}
      confirmLoading={mutation.isPending}
      destroyOnClose
    >
      <p className="text-sm text-zinc-500 mb-4">{t('project.members.inviteWorker.desc')}</p>
      <Form<FormValues> form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
        <Form.Item
          name="email"
          label={t('project.members.inviteWorker.email')}
          rules={[
            { required: true, message: t('common.required') },
            { type: 'email', message: t('common.invalidEmail') },
          ]}
        >
          <Input placeholder="worker@example.com" />
        </Form.Item>
        <Form.Item name="name" label={t('project.members.inviteWorker.nameOptional')}>
          <Input placeholder="職人 太郎" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
