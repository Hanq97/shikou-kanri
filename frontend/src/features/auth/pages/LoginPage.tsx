import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input } from 'antd';
import { Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ApiError } from '@/shared/api/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AuthLayout } from '../components/AuthLayout';
import { LoginSchema, type LoginFormValues } from '../schemas/login.schema';

export function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const fromPath = (location.state as { from?: string } | null)?.from ?? '/home';

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const result = await login(values.email.trim(), values.password);
      if (result === 'requires2fa') {
        navigate('/login/2fa');
      } else {
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setErrorMessage(mapErrorMessage(err as ApiError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} autoComplete="on">
        <Form.Item
          label={t('auth.login.email')}
          validateStatus={errors.email ? 'error' : ''}
          help={errors.email?.message}
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="email"
                size="large"
                autoFocus
                placeholder={t('auth.login.emailPlaceholder')}
                autoComplete="email"
                prefix={<Mail size={16} className="text-zinc-400" />}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('auth.login.password')}
          validateStatus={errors.password ? 'error' : ''}
          help={errors.password?.message}
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                size="large"
                placeholder={t('auth.login.passwordPlaceholder')}
                autoComplete="current-password"
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
          {t('auth.login.submit')}
        </Button>

        <div className="text-center mt-4">
          <Link
            to="/forgot-password"
            className="text-sm text-zinc-500 hover:text-brand-600 transition-colors"
          >
            {t('auth.login.forgotPassword')}
          </Link>
        </div>
      </Form>
    </AuthLayout>
  );
}
