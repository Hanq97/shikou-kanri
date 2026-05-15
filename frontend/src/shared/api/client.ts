import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// === Refresh-on-401 interceptor (singleton refresh) ===

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshPromise: Promise<void> | null = null;

const RETRY_SKIP_PATHS = ['/auth/login', '/auth/refresh', '/auth/invitations'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as RetryConfig | undefined;
    if (!original) return Promise.reject(error);
    if (error.response?.status !== 401) return Promise.reject(error);
    if (original._retried) return Promise.reject(error);
    if (RETRY_SKIP_PATHS.some((p) => original.url?.includes(p))) return Promise.reject(error);

    original._retried = true;

    if (!refreshPromise) {
      refreshPromise = apiClient
        .post('/auth/refresh')
        .then(() => undefined)
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      return await apiClient(original);
    } catch {
      return Promise.reject(error);
    }
  },
);

export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.code) return data;
    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'ネットワークエラーが発生しました',
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: (error as Error)?.message ?? '不明なエラーが発生しました',
  };
}
