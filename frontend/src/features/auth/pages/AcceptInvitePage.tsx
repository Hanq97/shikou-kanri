import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Result, Spin } from 'antd';
import { Lock, Mail, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, type InvitationInfo } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AuthLayout } from '../components/AuthLayout';
import { ResetPasswordSchema, type ResetPasswordFormValues } from '../schemas/password.schema';

export function AcceptInvitePage(): JSX.Element {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  useEffect(() => {
    if (!token) {
      setLoadError('AUTH_INVITATION_INVALID');
      setLoading(false);
      return;
    }
    authApi
      .getInvitation(token)
      .then((info) => setInvitation(info))
      .catch((err) => setLoadError(extractApiError(err).code))
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(values: ResetPasswordFormValues): Promise<void> {
    if (!token) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await authApi.acceptInvitation(token, values.password);
      setUser(res.user);
      navigate('/home', { replace: true });
    } catch (err) {
      setSubmitError(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      </AuthLayout>
    );
  }

  if (loadError || !invitation) {
    return (
      <AuthLayout title={t('auth.invite.errorTitle')}>
        <Result
          status="error"
          title={mapErrorMessage(loadError ?? 'AUTH_INVITATION_INVALID')}
          subTitle={t('auth.invite.errorSubtitle')}
          extra={
            <Link to="/login">
              <Button type="primary">{t('auth.invite.toLogin')}</Button>
            </Link>
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.invite.title')} subtitle={t('auth.invite.subtitle')}>
      <div className="bg-zinc-50 border border-zinc-200/70 rounded-lg p-4 mb-6 space-y-2.5">
        <div className="flex items-center gap-2.5 text-sm">
          <Mail size={15} className="text-zinc-400 shrink-0" />
          <span className="text-zinc-500 w-24">{t('auth.invite.labelEmail')}</span>
          <span className="text-zinc-900 font-medium truncate">{invitation.email}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <UserCog size={15} className="text-zinc-400 shrink-0" />
          <span className="text-zinc-500 w-24">{t('auth.invite.labelRole')}</span>
          <span className="text-zinc-900 font-medium">
            {t(`users.roles.${invitation.role}`, { defaultValue: invitation.role })}
          </span>
        </div>
      </div>

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item
          label={t('auth.invite.labelPassword')}
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
          label={t('auth.invite.labelPasswordConfirm')}
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

        {submitError && (
          <Alert
            type="error"
            message={submitError}
            closable
            onClose={() => setSubmitError(null)}
            className="!mb-4"
          />
        )}

        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          {t('auth.invite.submit')}
        </Button>
      </Form>
    </AuthLayout>
  );
}
