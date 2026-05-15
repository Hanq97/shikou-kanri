import { App, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { extractApiError } from '@/shared/api/client';
import { usersApi } from '@/shared/api/users.api';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { SettingsLayout } from '../components/SettingsLayout';

export function ProfilePage(): JSX.Element {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const reload = useAuthStore((s) => s.loadCurrentUser);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ name: string; nameKana: string }>();

  if (!user) return <></>;

  async function onSubmit(values: { name: string; nameKana: string }): Promise<void> {
    setSubmitting(true);
    try {
      await usersApi.updateProfile(user!.id, {
        name: values.name.trim(),
        nameKana: values.nameKana?.trim() || undefined,
      });
      await reload();
      message.success('プロフィールを更新しました');
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsLayout title="プロフィール" description="氏名・ふりがな等の基本情報">
      <div className="bg-zinc-50 border border-zinc-200/70 rounded-lg px-4 py-3 mb-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="text-zinc-500">メールアドレス</div>
        <div className="text-zinc-900 font-medium">{user.email}</div>
        <div className="text-zinc-500">ロール</div>
        <div className="text-zinc-900 font-medium">{user.role}</div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: user.name, nameKana: '' }}
        onFinish={onSubmit}
      >
        <Form.Item
          label="氏名"
          name="name"
          rules={[{ required: true, message: '氏名を入力してください' }]}
        >
          <Input size="large" placeholder="山田 太郎" maxLength={100} />
        </Form.Item>

        <Form.Item label="ふりがな" name="nameKana">
          <Input size="large" placeholder="やまだ たろう" maxLength={100} />
        </Form.Item>

        <div className="flex justify-end">
          <Button type="primary" htmlType="submit" loading={submitting}>
            変更を保存
          </Button>
        </div>
      </Form>
    </SettingsLayout>
  );
}
