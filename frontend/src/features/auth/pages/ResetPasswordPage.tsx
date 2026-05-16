import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Result } from 'antd';
import { ArrowLeft, Lock } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AuthLayout } from '../components/AuthLayout';
import { ResetPasswordSchema, type ResetPasswordFormValues } from '../schemas/password.schema';

export function ResetPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  if (!token) {
    return (
      <AuthLayout title={t('auth.resetPassword.invalidTitle')}>
        <Result
          status="error"
          title={t('auth.resetPassword.invalidTitle')}
          subTitle={t('auth.resetPassword.invalidSubtitle')}
          extra={
            <Link to="/forgot-password">
              <Button type="primary">{t('auth.resetPassword.resendLink')}</Button>
            </Link>
          }
        />
      </AuthLayout>
    );
  }

  async function onSubmit(values: ResetPasswordFormValues): Promise<void> {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await authApi.resetPassword(token!, values.password);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setErrorMessage(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title={t('auth.resetPassword.successTitle')}>
        <Result
          status="success"
          title={t('auth.resetPassword.successTitle')}
          subTitle={t('auth.resetPassword.successSubtitle')}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.resetPassword.title')} subtitle={t('auth.resetPassword.subtitle')}>
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item
          label={t('auth.resetPassword.newPassword')}
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
                autoFocus
                prefix={<Lock size={16} className="text-zinc-400" />}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('auth.resetPassword.newPasswordConfirm')}
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

        {errorMessage && (
          <Alert
            type="error"
            message={errorMessage}
            closable
            onClose={() => setErrorMessage(null)}
            className="!mb-4"
          />
        )}

        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          {t('auth.resetPassword.submit')}
        </Button>

        <div className="text-center mt-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={14} />
            {t('common.backToLogin')}
          </Link>
        </div>
      </Form>
    </AuthLayout>
  );
}
