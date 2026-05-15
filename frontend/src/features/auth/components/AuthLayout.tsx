import { Layout, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Title, Text } = Typography;

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps): JSX.Element {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Layout.Content
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              施工管理システム
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              藤和建設様 / Construction Management System
            </Text>
          </div>
          <div
            style={{
              background: '#fff',
              padding: 32,
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            }}
          >
            {title && (
              <Title level={4} style={{ marginTop: 0, marginBottom: subtitle ? 4 : 24 }}>
                {title}
              </Title>
            )}
            {subtitle && (
              <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                {subtitle}
              </Text>
            )}
            {children}
          </div>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 24, fontSize: 12 }}>
            © 2026 DEHA Solutions
          </Text>
        </div>
      </Layout.Content>
    </Layout>
  );
}
