/* 텔레그램 WebApp SDK 헬퍼 */

// 텔레그램 WebApp 타입 선언
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme: "light" | "dark";
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          isVisible: boolean;
        };
        HapticFeedback: {
          impactOccurred: (style: "light" | "medium" | "heavy") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
        };
        isExpanded: boolean;
        platform: string;
      };
    };
  }
}

/** 텔레그램 WebApp 인스턴스 (없으면 null) */
export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
}

/** SDK 초기화: ready + expand */
export function initTelegram() {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    if (!tg.isExpanded) {
      tg.expand();
    }
  }
}

/** initData 문자열 (인증 헤더용) */
export function getInitData(): string {
  return getTelegramWebApp()?.initData ?? "";
}

/** 텔레그램 사용자 이름 */
export function getTelegramUserName(): string | null {
  const user = getTelegramWebApp()?.initDataUnsafe?.user;
  if (!user) return null;
  const parts = [user.first_name];
  if (user.last_name) parts.push(user.last_name);
  return parts.join(" ");
}

/** 다크모드 여부 */
export function isDarkMode(): boolean {
  return getTelegramWebApp()?.colorScheme === "dark";
}

/** 뒤로가기 버튼 제어 */
export function showBackButton(onBack: () => void) {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.BackButton.onClick(onBack);
    tg.BackButton.show();
  }
  return () => {
    if (tg) {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
    }
  };
}

/** 햅틱 피드백 */
export function hapticFeedback(type: "light" | "medium" | "heavy" = "light") {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(type);
}
