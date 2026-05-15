import { Alert, Button, Form, Input } from 'antd';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AuthLayout } from '../components/AuthLayout';

export function ForgotPasswordPage(): JSX.Element {
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
      <AuthLayout title="メールを送信しました">
        <Alert
          type="success"
          message="登録されたメールアドレスの場合、パスワードリセットリンクをお送りしました。メールをご確認ください。"
          showIcon
        />
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={14} />
            ログインに戻る
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="パスワードリセット"
      subtitle="登録メールアドレスを入力すると、リセットリンクをお送りします"
    >
      <Form layout="vertical" onFinish={onSubmit}>
        <Form.Item label="メールアドレス">
          <Input
            type="email"
            size="large"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@towa.example.com"
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
          リセットリンクを送信
        </Button>

        <div className="text-center mt-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={14} />
            ログインに戻る
          </Link>
        </div>
      </Form>
    </AuthLayout>
  );
}
