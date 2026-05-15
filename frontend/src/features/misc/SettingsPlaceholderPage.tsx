import { Alert, Button, Card, Layout, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

const { Title, Text } = Typography;

interface SettingsPlaceholderPageProps {
  /** Section identifier ('profile' | '2fa' | 'sessions'). */
  section: 'profile' | '2fa' | 'sessions';
}

const SECTION_TITLE: Record<string, string> = {
  profile: 'プロフィール設定',
  '2fa': '2要素認証設定',
  sessions: 'セッション管理',
};

export function SettingsPlaceholderPage({ section }: SettingsPlaceholderPageProps): JSX.Element {
  const { user } = useAuth();
  const isForceFlow =
    (section === 'profile' && user?.forcePasswordChange) ||
    (section === '2fa' && user?.forceTwoFaEnrollment);

  return (
    <Layout style={{ minHeight: '100vh', padding: 24, background: '#f0f2f5' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Title level={3}>{SECTION_TITLE[section]}</Title>
        {isForceFlow && (
          <Alert
            type="warning"
            message={
              section === 'profile'
                ? 'パスワードの変更が必要です（初回ログイン）。'
                : '管理者は2要素認証の設定が必要です。'
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Card>
          <Text type="secondary">
            この画面は Phase 1 では未実装です。Phase P8 で本格的に実装されます。
          </Text>
          <br />
          <Text type="secondary">
            現在は P7 (FE Auth flow) までの実装内容を確認できます。
          </Text>
          <div style={{ marginTop: 24 }}>
            <Link to="/home">
              <Button type="primary">ホームに戻る</Button>
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
