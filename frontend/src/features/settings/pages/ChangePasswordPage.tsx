import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Form, Input } from 'antd';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import {
  ChangePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/schemas/password.schema';
import { SettingsLayout } from '../components/SettingsLayout';

export function ChangePasswordPage(): JSX.Element {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const reload = useAuthStore((s) => s.loadCurrentUser);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { oldPassword: '', password: '', passwordConfirm: '' },
  });

  const forceFlow = user?.forcePasswordChange ?? false;

  async function onSubmit(values: ChangePasswordFormValues): Promise<void> {
    setSubmitting(true);
    try {
      await authApi.changePassword(values.oldPassword, values.password);
      await reload();
      message.success('パスワードを変更しました');
      reset();
      if (forceFlow) navigate('/home', { replace: true });
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsLayout title="パスワード変更" description="安全のため定期的に変更してください">
      {forceFlow && (
        <Alert
          type="warning"
          message="初回ログインのため、パスワード変更が必要です。"
          showIcon
          className="!mb-5"
        />
      )}

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item
          label="現在のパスワード"
          validateStatus={errors.oldPassword ? 'error' : ''}
          help={errors.oldPassword?.message}
        >
          <Controller
            name="oldPassword"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                size="large"
                prefix={<Lock size={16} className="text-zinc-400" />}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="新しいパスワード"
          validateStatus={errors.password ? 'error' : ''}
          help={errors.password?.message ?? '12文字以上 + 大文字 + 小文字 + 数字 + 記号'}
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                size="large"
                prefix={<Lock size={16} className="text-zinc-400" />}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="新しいパスワード（確認）"
          validateStatus={errors.passwordConfirm ? 'error' : ''}
          help={errors.passwordConfirm?.message}
        >
          <Controller
            name="passwordConfirm"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                size="large"
                prefix={<Lock size={16} className="text-zinc-400" />}
              />
            )}
          />
        </Form.Item>

        <div className="flex justify-end">
          <Button type="primary" htmlType="submit" loading={submitting}>
            パスワードを変更
          </Button>
        </div>
      </Form>
    </SettingsLayout>
  );
}
