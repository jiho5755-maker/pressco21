import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTelegram, isDarkMode } from "@/lib/telegram";
import "./index.css";
import App from "./App";

// 텔레그램 SDK 초기화
initTelegram();

// 다크모드 감지 및 적용
if (isDarkMode()) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
