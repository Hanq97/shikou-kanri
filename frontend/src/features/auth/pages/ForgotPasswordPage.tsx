import { Alert, Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AuthLayout } from '../components/AuthLayout';

const { Text } = Typography;

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
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/login">
            <Text>ログインに戻る</Text>
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
          />
        </Form.Item>

        {errorMessage && (
          <Alert type="error" message={errorMessage} closable onClose={() => setErrorMessage(null)} style={{ marginBottom: 16 }} />
        )}

        <Button type="primary" htmlType="submit" size="large" block loading={submitting} disabled={!email}>
          リセットリンクを送信
        </Button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login">
            <Text type="secondary">ログインに戻る</Text>
          </Link>
        </div>
      </Form>
    </AuthLayout>
  );
}
