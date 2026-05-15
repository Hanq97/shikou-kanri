import { Avatar, Button, Card, Col, Layout, Row, Statistic, Tag, Typography } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  system_admin: { label: 'システム管理者', color: 'red' },
  manager: { label: 'マネージャー', color: 'gold' },
  employee: { label: '社員', color: 'blue' },
  invited: { label: '招待ユーザー', color: 'default' },
};

export function HomePage(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <></>;

  const roleInfo = ROLE_DISPLAY[user.role] ?? { label: user.role, color: 'default' };

  async function handleLogout(): Promise<void> {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            施工管理システム
          </Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar icon={<UserOutlined />} style={{ background: '#1890ff' }} />
          <div style={{ lineHeight: 1.2 }}>
            <Text strong>{user.name}</Text>
            <br />
            <Tag color={roleInfo.color} style={{ marginRight: 0 }}>
              {roleInfo.label}
            </Tag>
          </div>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f2f5' }}>
        <Title level={3} style={{ marginTop: 0 }}>
          ようこそ、{user.name}様
        </Title>
        <Text type="secondary">
          施工管理システムへログインしました。下記はダッシュボードのプレースホルダーです。
        </Text>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="進行中の案件" value={0} suffix="件" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="今月の見積" value={0} suffix="件" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="アフター通知（14日以内）" value={0} suffix="件" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="OB顧客" value={0} suffix="名" />
            </Card>
          </Col>
        </Row>

        <Card style={{ marginTop: 24 }} title="アカウント情報">
          <Row gutter={[16, 8]}>
            <Col span={8}>
              <Text type="secondary">メールアドレス</Text>
            </Col>
            <Col span={16}>
              <Text>{user.email}</Text>
            </Col>
            <Col span={8}>
              <Text type="secondary">ロール</Text>
            </Col>
            <Col span={16}>
              <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
            </Col>
            <Col span={8}>
              <Text type="secondary">2要素認証</Text>
            </Col>
            <Col span={16}>
              <Tag color={user.twoFaEnabled ? 'green' : 'default'}>
                {user.twoFaEnabled ? '有効' : '無効'}
              </Tag>
            </Col>
          </Row>
        </Card>

        <Text type="secondary" style={{ display: 'block', marginTop: 24, textAlign: 'center', fontSize: 12 }}>
          F8-AUTH MVP — Phase 1 ダッシュボードは順次実装予定です
        </Text>
      </Content>
    </Layout>
  );
}
