import { useAuthStore } from '@/shared/stores/authStore';
import type { UserRole } from '@/shared/api/types';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const verifyTwoFa = useAuthStore((s) => s.verifyTwoFa);

  return {
    user,
    isLoading,
    isInitialized,
    isAuthenticated: user !== null,
    hasRole: (role: UserRole) => user?.role === role,
    hasAnyRole: (roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    login,
    logout,
    verifyTwoFa,
  };
}
