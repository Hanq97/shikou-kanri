import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Form, Input } from 'antd';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      message.success(t('settings.password.successMessage'));
      reset();
      if (forceFlow) navigate('/home', { replace: true });
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsLayout
      title={t('settings.password.title')}
      description={t('settings.password.description')}
    >
      {forceFlow && (
        <Alert
          type="warning"
          message={t('settings.password.forceMessage')}
          showIcon
          className="!mb-5"
        />
      )}

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item
          label={t('settings.password.labelOld')}
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
          label={t('settings.password.labelNew')}
          validateStatus={errors.password ? 'error' : ''}
          help={errors.password?.message ?? t('auth.resetPassword.policyHint')}
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
          label={t('settings.password.labelNewConfirm')}
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
            {t('settings.password.submit')}
          </Button>
        </div>
      </Form>
    </SettingsLayout>
  );
}
