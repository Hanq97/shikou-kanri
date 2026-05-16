import { create } from 'zustand';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import type { AuthUser } from '@/shared/api/types';

interface PendingTwoFa {
  intermediateToken: string;
  expiresAt: number;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  pendingTwoFa: PendingTwoFa | null;

  // actions
  setUser: (user: AuthUser | null) => void;
  loadCurrentUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<'success' | 'requires2fa'>;
  verifyTwoFa: (code: string, useBackupCode: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearPendingTwoFa: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  pendingTwoFa: null,

  setUser: (user) => set({ user }),

  async loadCurrentUser() {
    set({ isLoading: true });
    try {
      const res = await authApi.me();
      set({ user: res.user, isLoading: false, isInitialized: true });
    } catch {
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },

  async login(email, password) {
    set({ isLoading: true });
    try {
      const res = await authApi.login(email, password);
      if (res.requires2fa) {
        set({
          pendingTwoFa: {
            intermediateToken: res.intermediateToken,
            expiresAt: Date.now() + res.expiresIn * 1000,
          },
          isLoading: false,
        });
        return 'requires2fa';
      }
      set({ user: res.user, isLoading: false, pendingTwoFa: null });
      return 'success';
    } catch (err) {
      set({ isLoading: false });
      throw extractApiError(err);
    }
  },

  async verifyTwoFa(code, useBackupCode) {
    const pending = get().pendingTwoFa;
    if (!pending) throw new Error('No pending 2FA challenge');
    set({ isLoading: true });
    try {
      const res = await authApi.verify2Fa(pending.intermediateToken, code, useBackupCode);
      set({ user: res.user, pendingTwoFa: null, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw extractApiError(err);
    }
  },

  async logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear state anyway
    }
    set({ user: null, pendingTwoFa: null });
  },

  clearPendingTwoFa: () => set({ pendingTwoFa: null }),
}));
