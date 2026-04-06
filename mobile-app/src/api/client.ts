// n8n API Gateway HTTP 클라이언트
// 모든 API 호출은 이 클라이언트를 통해 n8n으로 전달됨
// 메이크샵/NocoDB API키는 n8n에만 보관 — 앱에 노출 안 됨

import * as SecureStore from 'expo-secure-store';
import type { ApiResponse } from '../types';

const TOKEN_KEY = 'pressco21_jwt';

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer \${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP \${response.status}: \${errorText}` };
    }

    const data = await response.json();
    return { success: true, data: data as T };
  } catch (error) {
    const message = error instanceof Error ? error.message : '네트워크 오류가 발생했습니다';
    return { success: false, error: message };
  }
}

export function apiGet<T>(url: string) {
  return apiCall<T>(url, { method: 'GET' });
}

export function apiPost<T>(url: string, body: unknown) {
  return apiCall<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
