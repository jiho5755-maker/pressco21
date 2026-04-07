// n8n API Gateway HTTP 클라이언트
// 메이크샵/NocoDB API키는 n8n에만 보관 — 앱에 노출 안 됨

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'pressco21_jwt';

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function apiGet<T = any>(url: string): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const res = await fetch(url, { headers });
  return res.json();
}

export async function apiPost<T = any>(url: string, body: unknown): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}
