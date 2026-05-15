import { Alert, Button, Form, Input } from 'antd';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AuthLayout } from '../components/AuthLayout';

export function ForgotPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(): Promise<void> {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await authApi.requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title={t('auth.forgotPassword.sentTitle')}>
        <Alert type="success" message={t('auth.forgotPassword.sentMessage')} showIcon />
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={14} />
            {t('common.backToLogin')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.forgotPassword.title')} subtitle={t('auth.forgotPassword.subtitle')}>
      <Form layout="vertical" onFinish={onSubmit}>
        <Form.Item label={t('auth.forgotPassword.email')}>
          <Input
            type="email"
            size="large"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.login.emailPlaceholder')}
            autoFocus
            required
            prefix={<Mail size={16} className="text-zinc-400" />}
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

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={submitting}
          disabled={!email}
        >
          {t('auth.forgotPassword.submit')}
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
