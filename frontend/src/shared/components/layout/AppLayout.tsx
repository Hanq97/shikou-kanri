import { Avatar, Drawer, Dropdown, Grid, type MenuProps } from 'antd';
import {
  Bell,
  Briefcase,
  FileText,
  HardHat,
  Home,
  KeyRound,
  LogOut,
  Menu as MenuIcon,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  User,
  UserCircle,
  Users,
  Wrench,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { LanguageSwitcher } from './LanguageSwitcher';

type NavKey =
  | 'home'
  | 'projects'
  | 'estimates'
  | 'customers'
  | 'aftercare'
  | 'users'
  | 'unitPrices';

interface NavDef {
  key: NavKey;
  to: string;
  icon: ReactNode;
  roles?: string[];
}

const NAV_DEFS: NavDef[] = [
  { key: 'home', to: '/home', icon: <Home size={18} /> },
  {
    key: 'customers',
    to: '/customers',
    icon: <Users size={18} />,
    roles: ['system_admin', 'manager', 'employee'],
  },
  { key: 'projects', to: '/projects', icon: <Briefcase size={18} /> },
  {
    key: 'estimates',
    to: '/estimates',
    icon: <FileText size={18} />,
    roles: ['system_admin', 'manager', 'employee'],
  },
  {
    key: 'aftercare',
    to: '/aftercare/ob-customers',
    icon: <Wrench size={18} />,
    roles: ['system_admin', 'manager', 'employee'],
  },
  {
    key: 'unitPrices',
    to: '/admin/unit-prices',
    icon: <HardHat size={18} />,
    roles: ['system_admin'],
  },
  {
    key: 'users',
    to: '/admin/users',
    icon: <ShieldCheck size={18} />,
    roles: ['system_admin', 'manager'],
  },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): JSX.Element {
  const { t } = useTranslation();
  const { user, logout, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleNav = useMemo(
    () => NAV_DEFS.filter((item) => !item.roles || hasAnyRole(item.roles as never)),
    [hasAnyRole],
  );

  if (!user) return <></>;

  async function handleLogout(): Promise<void> {
    await logout();
    navigate('/login', { replace: true });
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserCircle size={14} />,
      label: <Link to="/settings/profile">{t('userMenu.profile')}</Link>,
    },
    {
      key: 'password',
      icon: <KeyRound size={14} />,
      label: <Link to="/settings/password">{t('userMenu.password')}</Link>,
    },
    {
      key: '2fa',
      icon: <ShieldCheck size={14} />,
      label: <Link to="/settings/2fa">{t('userMenu.twoFa')}</Link>,
    },
    {
      key: 'sessions',
      icon: <Monitor size={14} />,
      label: <Link to="/settings/sessions">{t('userMenu.sessions')}</Link>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogOut size={14} />,
      label: t('userMenu.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ];

  function renderBrand(forceExpanded: boolean): JSX.Element {
    const expanded = forceExpanded || !collapsed;
    return (
      <div
        className={`h-14 flex items-center border-b border-zinc-200/70 ${
          expanded ? 'px-4' : 'justify-center px-2'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-500 text-white grid place-items-center shrink-0">
          <HardHat size={18} strokeWidth={2.2} />
        </div>
        {expanded && (
          <div className="ml-2.5 overflow-hidden">
            <p className="m-0 text-sm font-semibold text-zinc-900 leading-tight">
              {t('brand.appNameShort')}
            </p>
            <p className="m-0 text-[11px] text-zinc-500 leading-tight">{t('brand.clientName')}</p>
          </div>
        )}
      </div>
    );
  }

  function renderNav(forceExpanded: boolean, onItemClick?: () => void): JSX.Element {
    const expanded = forceExpanded || !collapsed;
    return (
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const active =
            location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          const label = t(`nav.${item.key}`);
          return (
            <Link
              key={item.key}
              to={item.to}
              title={!expanded ? label : undefined}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              } ${!expanded ? 'justify-center' : ''}`}
            >
              <span className="shrink-0">{item.icon}</span>
              {expanded && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Desktop sidebar (≥sm) */}
      {!isMobile && (
        <aside
          className={`${
            collapsed ? 'w-16' : 'w-60'
          } shrink-0 bg-white border-r border-zinc-200/70 flex flex-col transition-[width] duration-200 sticky top-0 h-screen relative`}
        >
          {renderBrand(false)}
          {renderNav(false)}
        </aside>
      )}

      {/* Mobile drawer (<sm) */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={260}
          closable={false}
          styles={{ body: { padding: 0 }, header: { display: 'none' } }}
        >
          <div className="h-full flex flex-col bg-white">
            {renderBrand(true)}
            {renderNav(true, () => setDrawerOpen(false))}
          </div>
        </Drawer>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-zinc-200/70 flex items-center justify-between px-3 sm:px-4 sticky top-0 z-10">
          <button
            type="button"
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed((v) => !v))}
            aria-label={
              isMobile
                ? t('nav.sidebarOpen')
                : collapsed
                  ? t('nav.sidebarExpand')
                  : t('nav.sidebarCollapse')
            }
            className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer"
          >
            {isMobile ? (
              <MenuIcon size={18} />
            ) : collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <button
              type="button"
              className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer relative"
              aria-label={t('nav.notifications')}
            >
              <Bell size={18} />
            </button>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <button
                type="button"
                className="flex items-center gap-2.5 pl-1 pr-2 sm:pr-3 py-1 rounded-lg hover:bg-zinc-100 transition-colors bg-transparent border-0 cursor-pointer ml-1"
              >
                <Avatar size={32} icon={<User size={16} />} className="!bg-brand-500" />
                <div className="text-left leading-tight hidden md:block">
                  <p className="m-0 text-sm font-medium text-zinc-900">{user.name}</p>
                  <p className="m-0 text-[11px] text-zinc-500">{t(`users.roles.${user.role}`)}</p>
                </div>
              </button>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
