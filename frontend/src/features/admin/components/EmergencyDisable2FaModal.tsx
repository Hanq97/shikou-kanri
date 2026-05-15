import { Alert, App, Button, Form, Input, Modal } from 'antd';
import { useState } from 'react';
import { extractApiError } from '@/shared/api/client';
import { usersApi, type UserSummary } from '@/shared/api/users.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface Props {
  open: boolean;
  user: UserSummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmergencyDisable2FaModal({ open, user, onClose, onSuccess }: Props): JSX.Element {
  const { message } = App.useApp();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(): Promise<void> {
    if (!user || reason.trim().length < 10) return;
    setSubmitting(true);
    try {
      await usersApi.emergencyDisable2Fa(user.id, reason.trim());
      message.success('2要素認証を強制的に無効化しました');
      setReason('');
      onSuccess();
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="2要素認証を強制的に無効化"
      onCancel={() => {
        setReason('');
        onClose();
      }}
      footer={null}
      destroyOnClose
    >
      <Alert
        type="warning"
        message="この操作はAudit Logに記録されます"
        description="ユーザーが認証アプリにアクセスできない場合の緊急措置です。理由（10文字以上）を入力してください。"
        showIcon
        className="!mb-4"
      />
      <p className="text-sm text-zinc-600 mb-2">
        対象ユーザー: <strong className="text-zinc-900">{user?.email}</strong>
      </p>
      <Form layout="vertical" onFinish={onSubmit}>
        <Form.Item label="理由（必須、10文字以上）" required>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例: ユーザーがスマートフォンを紛失したため"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setReason('');
              onClose();
            }}
          >
            キャンセル
          </Button>
          <Button
            danger
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={reason.trim().length < 10}
          >
            無効化を実行
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
