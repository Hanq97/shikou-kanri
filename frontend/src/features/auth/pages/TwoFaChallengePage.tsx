import { Alert, Button, Form, Input } from 'antd';
import { ShieldCheck, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { ApiError } from '@/shared/api/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AuthLayout } from '../components/AuthLayout';

export function TwoFaChallengePage(): JSX.Element {
  const navigate = useNavigate();
  const { verifyTwoFa } = useAuth();
  const pendingTwoFa = useAuthStore((s) => s.pendingTwoFa);
  const clearPending = useAuthStore((s) => s.clearPendingTwoFa);

  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!pendingTwoFa) return;
    function tick(): void {
      const remaining = Math.max(0, Math.floor((pendingTwoFa!.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearPending();
        navigate('/login');
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingTwoFa, clearPending, navigate]);

  if (!pendingTwoFa) {
    return <Navigate to="/login" replace />;
  }

  async function onSubmit(): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await verifyTwoFa(code, useBackupCode);
      navigate('/home', { replace: true });
    } catch (err) {
      setErrorMessage(mapErrorMessage(err as ApiError));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  const expectedLength = useBackupCode ? 10 : 6;
  const expiringSoon = secondsLeft <= 60;

  return (
    <AuthLayout
      title="2要素認証"
      subtitle={
        useBackupCode
          ? 'バックアップコードを入力してください'
          : '認証アプリの6桁コードを入力してください'
      }
    >
      <Form layout="vertical" onFinish={onSubmit}>
        <Form.Item label={useBackupCode ? 'バックアップコード' : '認証コード'}>
          <Input
            size="large"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={useBackupCode ? '10文字のコード' : '6桁の数字'}
            maxLength={expectedLength}
            autoFocus
            prefix={<ShieldCheck size={16} className="text-zinc-400" />}
            className="!font-mono !text-lg !tracking-widest"
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
          disabled={code.length !== expectedLength}
        >
          確認
        </Button>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode((v) => !v);
              setCode('');
              setErrorMessage(null);
            }}
            className="text-sm text-brand-600 hover:text-brand-700 hover:underline bg-transparent border-0 cursor-pointer p-0"
          >
            {useBackupCode ? '認証コードで確認' : 'バックアップコードを使用'}
          </button>
        </div>

        <div
          className={`flex items-center justify-center gap-1.5 mt-4 text-xs ${
            expiringSoon ? 'text-amber-600' : 'text-zinc-500'
          }`}
        >
          <Timer size={12} />
          <span>残り時間: {secondsLeft}秒</span>
        </div>
      </Form>
    </AuthLayout>
  );
}
