import { Alert, App, Button, Form, Input, Modal } from 'antd';
import { AlertTriangle, Copy, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { SettingsLayout } from '../components/SettingsLayout';

type EnrollState =
  | { stage: 'idle' }
  | { stage: 'qr'; secret: string; qrCodeDataUrl: string }
  | { stage: 'verifying'; secret: string; qrCodeDataUrl: string }
  | { stage: 'backup'; backupCodes: string[] };

export function TwoFaPage(): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const reload = useAuthStore((s) => s.loadCurrentUser);
  const [enroll, setEnroll] = useState<EnrollState>({ stage: 'idle' });
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  if (!user) return <></>;

  const forceFlow = user.forceTwoFaEnrollment;

  async function startEnroll(): Promise<void> {
    setSubmitting(true);
    try {
      const res = await authApi.start2FaEnroll();
      setEnroll({ stage: 'qr', secret: res.secret, qrCodeDataUrl: res.qrCodeDataUrl });
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyEnroll(): Promise<void> {
    setSubmitting(true);
    try {
      const res = await authApi.verify2FaEnroll(code);
      setEnroll({ stage: 'backup', backupCodes: res.backupCodes });
      await reload();
      setCode('');
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  function copyBackupCodes(codes: string[]): void {
    navigator.clipboard.writeText(codes.join('\n')).then(() => {
      message.success(t('settings.twoFa.backupCopiedMessage'));
    });
  }

  // ===== ENABLED — show disable button =====
  if (user.twoFaEnabled && enroll.stage === 'idle') {
    return (
      <SettingsLayout
        title={t('settings.twoFa.title')}
        description={t('settings.twoFa.descriptionEnabled')}
      >
        <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-6">
          <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="m-0 text-sm font-medium text-emerald-900">
              {t('settings.twoFa.enabledMessage')}
            </p>
            <p className="m-0 mt-0.5 text-sm text-emerald-700">{t('settings.twoFa.enabledHint')}</p>
          </div>
        </div>

        <div className="border border-zinc-200/70 rounded-lg p-4">
          <h3 className="m-0 text-sm font-semibold text-zinc-900">
            {t('settings.twoFa.disableTitle')}
          </h3>
          <p className="m-0 mt-1 text-sm text-zinc-500">{t('settings.twoFa.disableHint')}</p>
          <Button
            danger
            icon={<ShieldOff size={14} />}
            onClick={() => setDisableOpen(true)}
            className="!mt-3"
          >
            {t('settings.twoFa.disableButton')}
          </Button>
        </div>

        <DisableTwoFaModal
          open={disableOpen}
          onClose={() => setDisableOpen(false)}
          onSuccess={async () => {
            setDisableOpen(false);
            await reload();
            message.success(t('settings.twoFa.disableSuccess'));
          }}
        />
      </SettingsLayout>
    );
  }

  // ===== DISABLED — enrollment flow =====
  return (
    <SettingsLayout
      title={t('settings.twoFa.title')}
      description={t('settings.twoFa.description')}
    >
      {forceFlow && enroll.stage === 'idle' && (
        <Alert type="warning" message={t('settings.twoFa.forceMessage')} showIcon className="!mb-5" />
      )}

      {enroll.stage === 'idle' && (
        <>
          <p className="m-0 mt-0 mb-4 text-sm text-zinc-600 leading-relaxed">
            {t('settings.twoFa.intro')}
          </p>
          <Button
            type="primary"
            icon={<ShieldCheck size={14} />}
            loading={submitting}
            onClick={startEnroll}
          >
            {t('settings.twoFa.startButton')}
          </Button>
        </>
      )}

      {(enroll.stage === 'qr' || enroll.stage === 'verifying') && (
        <div className="space-y-5">
          <div>
            <p className="m-0 text-sm text-zinc-600 mb-3">{t('settings.twoFa.step1Title')}</p>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <img
                src={enroll.qrCodeDataUrl}
                alt="2FA QR Code"
                className="w-44 h-44 border border-zinc-200/70 rounded-lg p-2 bg-white"
              />
              <div className="flex-1 w-full">
                <p className="m-0 text-xs text-zinc-500 mb-1">{t('settings.twoFa.secretLabel')}</p>
                <code className="block bg-zinc-50 border border-zinc-200/70 rounded px-3 py-2 text-sm font-mono break-all">
                  {enroll.secret}
                </code>
              </div>
            </div>
          </div>

          <div>
            <p className="m-0 text-sm text-zinc-600 mb-2">{t('settings.twoFa.step2Title')}</p>
            <div className="flex gap-2">
              <Input
                size="large"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('settings.twoFa.codePlaceholder')}
                maxLength={6}
                className="!font-mono !tracking-widest !text-lg"
                style={{ maxWidth: 200 }}
              />
              <Button
                type="primary"
                size="large"
                loading={submitting}
                disabled={code.length !== 6}
                onClick={verifyEnroll}
              >
                {t('settings.twoFa.verifyButton')}
              </Button>
              <Button size="large" onClick={() => setEnroll({ stage: 'idle' })}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {enroll.stage === 'backup' && (
        <div className="space-y-5">
          <Alert
            type="success"
            message={t('settings.twoFa.backupTitle')}
            description={t('settings.twoFa.backupSubtitle')}
            showIcon
          />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="m-0 text-sm text-amber-900 leading-relaxed">
              {t('settings.twoFa.backupWarning')}
            </p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/70 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {enroll.backupCodes.map((c) => (
                <div key={c} className="bg-white border border-zinc-200/70 rounded px-3 py-1.5">
                  {c}
                </div>
              ))}
            </div>
            <Button
              icon={<Copy size={14} />}
              onClick={() => copyBackupCodes(enroll.backupCodes)}
              className="!mt-4"
            >
              {t('common.copyAll')}
            </Button>
          </div>
          <Button type="primary" onClick={() => setEnroll({ stage: 'idle' })}>
            {t('settings.twoFa.doneButton')}
          </Button>
        </div>
      )}
    </SettingsLayout>
  );
}

interface DisableModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function DisableTwoFaModal({ open, onClose, onSuccess }: DisableModalProps): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(): Promise<void> {
    setSubmitting(true);
    try {
      await authApi.disable2Fa(password, code, useBackup);
      onSuccess();
      setPassword('');
      setCode('');
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={t('settings.twoFa.disableModalTitle')}
      onCancel={() => {
        onClose();
        setPassword('');
        setCode('');
      }}
      footer={null}
      destroyOnClose
    >
      <p className="text-sm text-zinc-500 mb-4">{t('settings.twoFa.disableModalIntro')}</p>
      <Form layout="vertical" onFinish={onSubmit}>
        <Form.Item label={t('settings.twoFa.labelPassword')}>
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            size="large"
          />
        </Form.Item>
        <Form.Item label={useBackup ? t('auth.twoFa.labelBackup') : t('auth.twoFa.labelTotp')}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, useBackup ? 10 : 6))}
            placeholder={
              useBackup ? t('auth.twoFa.placeholderBackup') : t('auth.twoFa.placeholderTotp')
            }
            size="large"
            className="!font-mono !tracking-widest"
          />
        </Form.Item>
        <button
          type="button"
          onClick={() => {
            setUseBackup((v) => !v);
            setCode('');
          }}
          className="text-sm text-brand-600 hover:underline bg-transparent border-0 cursor-pointer p-0 mb-4"
        >
          {useBackup ? t('settings.twoFa.useTotp') : t('settings.twoFa.useBackup')}
        </button>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onClose();
              setPassword('');
              setCode('');
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            danger
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={!password || code.length !== (useBackup ? 10 : 6)}
          >
            {t('settings.twoFa.disableButton')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
