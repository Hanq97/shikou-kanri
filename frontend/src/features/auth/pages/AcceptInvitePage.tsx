import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Descriptions, Form, Input, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, type InvitationInfo } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AuthLayout } from '../components/AuthLayout';
import { ResetPasswordSchema, type ResetPasswordFormValues } from '../schemas/password.schema';

const ROLE_DISPLAY: Record<string, string> = {
  system_admin: 'システム管理者',
  manager: 'マネージャー',
  employee: '社員',
  invited: '招待ユーザー（職人・協力業者）',
};

export function AcceptInvitePage(): JSX.Element {
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
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin size="large" />
        </div>
      </AuthLayout>
    );
  }

  if (loadError || !invitation) {
    return (
      <AuthLayout title="招待リンクエラー">
        <Result
          status="error"
          title={mapErrorMessage(loadError ?? 'AUTH_INVITATION_INVALID')}
          subTitle="招待者にご確認のうえ、新しい招待をリクエストしてください。"
          extra={
            <Link to="/login">
              <Button type="primary">ログイン画面へ</Button>
            </Link>
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="アカウントの有効化" subtitle="パスワードを設定してアカウントを有効化してください">
      <Descriptions size="small" column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="メールアドレス">{invitation.email}</Descriptions.Item>
        <Descriptions.Item label="ロール">{ROLE_DISPLAY[invitation.role] ?? invitation.role}</Descriptions.Item>
      </Descriptions>

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item
          label="パスワード"
          validateStatus={errors.password ? 'error' : ''}
          help={errors.password?.message ?? '12文字以上 + 大文字 + 小文字 + 数字 + 記号'}
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => <Input.Password {...field} size="large" autoFocus />}
          />
        </Form.Item>

        <Form.Item
          label="パスワード（確認）"
          validateStatus={errors.passwordConfirm ? 'error' : ''}
          help={errors.passwordConfirm?.message}
        >
          <Controller
            name="passwordConfirm"
            control={control}
            render={({ field }) => <Input.Password {...field} size="large" />}
          />
        </Form.Item>

        {submitError && (
          <Alert type="error" message={submitError} closable onClose={() => setSubmitError(null)} style={{ marginBottom: 16 }} />
        )}

        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          アカウントを有効化
        </Button>
      </Form>
    </AuthLayout>
  );
}
