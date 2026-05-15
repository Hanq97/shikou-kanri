import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

const theme = {
  token: {
    colorPrimary: '#1890ff',
    fontFamily:
      '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
    borderRadius: 4,
  },
  components: {
    Form: { itemMarginBottom: 16 },
    Button: { controlHeight: 40 },
  },
};

export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ConfigProvider locale={jaJP} theme={theme}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
