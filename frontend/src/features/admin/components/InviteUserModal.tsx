import { App, Button, Form, Input, Modal, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import type { UserRole } from '@/shared/api/types';
import { usersApi } from '@/shared/api/users.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: UserRole;
}

interface InviteFormValues {
  email: string;
  role: UserRole;
  name?: string;
}

export function InviteUserModal({
  open,
  onClose,
  onSuccess,
  currentUserRole,
}: InviteUserModalProps): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<InviteFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const invitableRoles =
    currentUserRole === 'system_admin'
      ? (['manager', 'employee', 'invited'] as UserRole[])
      : (['employee', 'invited'] as UserRole[]);

  async function onSubmit(values: InviteFormValues): Promise<void> {
    setSubmitting(true);
    try {
      await usersApi.invite({
        email: values.email.trim(),
        role: values.role,
        name: values.name?.trim() || undefined,
      });
      message.success(t('users.messages.inviteSent'));
      form.resetFields();
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
      title={t('users.invite.title')}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={null}
      destroyOnClose
    >
      <p className="text-sm text-zinc-500 mb-4">{t('users.invite.description')}</p>
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ role: 'employee' }}>
        <Form.Item
          label={t('users.invite.labelEmail')}
          name="email"
          rules={[
            { required: true, message: t('users.invite.emailRequired') },
            { type: 'email', message: t('users.invite.emailInvalid') },
          ]}
        >
          <Input size="large" autoFocus placeholder="example@example.com" />
        </Form.Item>

        <Form.Item
          label={t('users.invite.labelRole')}
          name="role"
          rules={[{ required: true, message: t('users.invite.roleRequired') }]}
        >
          <Select size="large">
            {invitableRoles.includes('manager') && (
              <Select.Option value="manager">{t('users.roles.manager')}</Select.Option>
            )}
            <Select.Option value="employee">{t('users.roles.employee')}</Select.Option>
            <Select.Option value="invited">{t('users.roles.invitedFull')}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label={t('users.invite.labelName')} name="name">
          <Input size="large" placeholder={t('settings.profile.namePlaceholder')} maxLength={100} />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            onClick={() => {
              form.resetFields();
              onClose();
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {t('users.invite.submit')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
