import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return configured ?? 'http://localhost:3000';
}

const API_URL = resolveApiUrl();

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // envia o cookie httpOnly de refresh token
  headers: { 'Content-Type': 'application/json' },
});

// ---- Access token mantido em memória (não em localStorage) ----
let accessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setOnAuthFailure(handler: (() => void) | null): void {
  onAuthFailure = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Em 401, tenta renovar o access token uma única vez via /auth/refresh.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        setAccessToken(null);
        onAuthFailure?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// ---- Healthcheck (público) ----
export interface HealthResponse {
  status: string;
  service: string;
  version?: string;
  timestamp: string;
  database: 'up' | 'down';
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health');
  return data;
}

/** Extrai mensagem de erro amigável de respostas do backend. */
export function extractApiError(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}
