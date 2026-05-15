import { Avatar, Dropdown, type MenuProps } from 'antd';
import {
  Bell,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText,
  HardHat,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  User,
  UserCircle,
  Users,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

type NavItem = {
  key: string;
  to: string;
  label: string;
  icon: ReactNode;
  roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { key: 'home', to: '/home', label: 'ホーム', icon: <Home size={18} /> },
  { key: 'projects', to: '/projects', label: '案件管理', icon: <Briefcase size={18} /> },
  { key: 'estimates', to: '/estimates', label: '見積管理', icon: <FileText size={18} /> },
  { key: 'customers', to: '/customers', label: '顧客管理', icon: <Users size={18} /> },
  {
    key: 'users',
    to: '/admin/users',
    label: 'ユーザー管理',
    icon: <ShieldCheck size={18} />,
    roles: ['system_admin', 'manager'],
  },
];

const ROLE_DISPLAY: Record<string, string> = {
  system_admin: 'システム管理者',
  manager: 'マネージャー',
  employee: '社員',
  invited: '招待ユーザー',
};

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): JSX.Element {
  const { user, logout, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const visibleNav = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || hasAnyRole(item.roles as never)),
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
      label: <Link to="/settings/profile">プロフィール設定</Link>,
    },
    {
      key: '2fa',
      icon: <ShieldCheck size={14} />,
      label: <Link to="/settings/2fa">2要素認証</Link>,
    },
    {
      key: 'sessions',
      icon: <Settings size={14} />,
      label: <Link to="/settings/sessions">セッション管理</Link>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogOut size={14} />,
      label: 'ログアウト',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } shrink-0 bg-white border-r border-zinc-200/70 flex flex-col transition-[width] duration-200 sticky top-0 h-screen relative`}
      >
        {/* Brand */}
        <div
          className={`h-14 flex items-center border-b border-zinc-200/70 ${
            collapsed ? 'justify-center px-2' : 'px-4'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500 text-white grid place-items-center shrink-0">
            <HardHat size={18} strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="ml-2.5 overflow-hidden">
              <p className="m-0 text-sm font-semibold text-zinc-900 leading-tight">施工管理</p>
              <p className="m-0 text-[11px] text-zinc-500 leading-tight">藤和建設様</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const active =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.key}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Floating collapse toggle — half-outside, modern Linear/Notion style */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
          className="absolute top-[52px] -right-3 w-6 h-6 rounded-full bg-white border border-zinc-200 shadow-sm grid place-items-center text-zinc-400 hover:text-brand-600 hover:border-brand-300 hover:shadow hover:scale-110 transition-all cursor-pointer z-20"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-zinc-200/70 flex items-center justify-between px-6 sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer relative"
              aria-label="通知"
            >
              <Bell size={18} />
            </button>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <button
                type="button"
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-lg hover:bg-zinc-100 transition-colors bg-transparent border-0 cursor-pointer"
              >
                <Avatar size={32} icon={<User size={16} />} className="!bg-brand-500" />
                <div className="text-left leading-tight hidden sm:block">
                  <p className="m-0 text-sm font-medium text-zinc-900">{user.name}</p>
                  <p className="m-0 text-[11px] text-zinc-500">
                    {ROLE_DISPLAY[user.role] ?? user.role}
                  </p>
                </div>
              </button>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
