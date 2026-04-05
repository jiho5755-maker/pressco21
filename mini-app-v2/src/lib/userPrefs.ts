/* 사용자 설정 localStorage 관리 */

const MY_NAME_KEY = "pressco21-my-name";

export function getStoredMyName(): string | null {
  try {
    return localStorage.getItem(MY_NAME_KEY);
  } catch {
    return null;
  }
}

export function setStoredMyName(name: string): void {
  try {
    localStorage.setItem(MY_NAME_KEY, name);
  } catch {
    // localStorage 사용 불가 환경
  }
}

export function clearStoredMyName(): void {
  try {
    localStorage.removeItem(MY_NAME_KEY);
  } catch {
    // ignore
  }
}
