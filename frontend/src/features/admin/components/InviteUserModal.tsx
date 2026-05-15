import { App, Button, Form, Input, Modal, Select } from 'antd';
import { useState } from 'react';
import { extractApiError } from '@/shared/api/client';
import type { UserRole } from '@/shared/api/types';
import { usersApi } from '@/shared/api/users.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Current user's role — restricts invitable roles */
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
      message.success('招待メールを送信しました');
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
      title="ユーザーを招待"
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={null}
      destroyOnClose
    >
      <p className="text-sm text-zinc-500 mb-4">
        招待リンクが入ったメールが送信されます。ユーザーはパスワードを設定してアカウントを有効化します。
      </p>
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ role: 'employee' }}>
        <Form.Item
          label="メールアドレス"
          name="email"
          rules={[
            { required: true, message: 'メールアドレスを入力してください' },
            { type: 'email', message: 'メールアドレス形式が不正です' },
          ]}
        >
          <Input size="large" autoFocus placeholder="example@example.com" />
        </Form.Item>

        <Form.Item
          label="ロール"
          name="role"
          rules={[{ required: true, message: 'ロールを選択してください' }]}
        >
          <Select size="large">
            {invitableRoles.includes('manager') && (
              <Select.Option value="manager">マネージャー</Select.Option>
            )}
            <Select.Option value="employee">社員</Select.Option>
            <Select.Option value="invited">招待ユーザー（職人・協力業者）</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="氏名（任意）" name="name">
          <Input size="large" placeholder="山田 太郎" maxLength={100} />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            onClick={() => {
              form.resetFields();
              onClose();
            }}
          >
            キャンセル
          </Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            招待を送信
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
