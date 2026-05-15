import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import viVN from 'antd/locale/vi_VN';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '@/shared/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

const ANTD_LOCALES: Record<string, typeof jaJP> = {
  ja: jaJP,
  en: enUS,
  vi: viVN,
};

const theme = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#1689e4',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',

    colorBgLayout: '#fafafa',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',

    colorText: '#18181b',
    colorTextSecondary: '#52525b',
    colorTextTertiary: '#71717a',
    colorTextQuaternary: '#a1a1aa',

    colorBorder: '#e4e4e7',
    colorBorderSecondary: '#f4f4f5',

    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,

    fontFamily:
      'Inter, "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
    fontSize: 14,

    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
    boxShadowSecondary:
      '0 4px 8px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',

    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 30,

    wireframe: false,
  },
  components: {
    Form: { itemMarginBottom: 18, labelFontSize: 13 },
    Button: {
      controlHeight: 38,
      fontWeight: 500,
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Input: { paddingBlock: 8 },
    Card: { paddingLG: 24, boxShadowTertiary: 'none' },
    Layout: {
      bodyBg: '#fafafa',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      headerHeight: 56,
      headerPadding: '0 24px',
    },
    Menu: {
      itemBorderRadius: 6,
      itemHeight: 36,
      itemMarginInline: 8,
      itemMarginBlock: 2,
    },
    Table: { headerBg: '#fafafa', rowHoverBg: '#f4f4f5' },
  },
};

export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  const { i18n } = useTranslation();
  const antdLocale = useMemo(() => ANTD_LOCALES[i18n.language] ?? jaJP, [i18n.language]);

  return (
    <ConfigProvider locale={antdLocale} theme={theme}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
