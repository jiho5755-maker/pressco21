#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import hmac
import html
import os
import secrets
import subprocess
import time
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse


BIND = os.environ.get("CRM_AUTH_BIND", "127.0.0.1")
PORT = int(os.environ.get("CRM_AUTH_PORT", "9100"))
HTPASSWD_FILE = os.environ.get("CRM_AUTH_HTPASSWD_FILE", "/etc/nginx/.htpasswd-crm")
SECRET_FILE = os.environ.get("CRM_AUTH_SECRET_FILE", "/etc/pressco21-crm/auth-secret")
COOKIE_NAME = os.environ.get("CRM_AUTH_COOKIE_NAME", "pressco21_crm_session")
SESSION_TTL = int(os.environ.get("CRM_AUTH_SESSION_TTL", str(12 * 60 * 60)))
AUTOMATION_KEY_FILE = os.environ.get(
    "CRM_AUTH_AUTOMATION_KEY_FILE",
    "/etc/pressco21-crm/automation-key",
)
AUTOMATION_HEADER_NAME = (
    os.environ.get("CRM_AUTH_AUTOMATION_HEADER_NAME", "X-CRM-Automation-Key").strip()
    or "X-CRM-Automation-Key"
)
ALLOW_BASIC_AUTH = os.environ.get("CRM_AUTH_ALLOW_BASIC_AUTH", "1").strip().lower() not in {
    "0",
    "false",
    "no",
    "off",
}


def ensure_bytes_secret(file_path: str, length: int = 32) -> bytes:
    secret_dir = os.path.dirname(file_path)
    if secret_dir:
        os.makedirs(secret_dir, exist_ok=True)
    if not os.path.exists(file_path):
        with open(file_path, "wb") as file:
            file.write(secrets.token_bytes(length))
        os.chmod(file_path, 0o600)
    with open(file_path, "rb") as file:
        return file.read().strip()


def ensure_text_secret(file_path: str, length: int = 48) -> str:
    secret_dir = os.path.dirname(file_path)
    if secret_dir:
        os.makedirs(secret_dir, exist_ok=True)
    if not os.path.exists(file_path):
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(secrets.token_urlsafe(length))
        os.chmod(file_path, 0o600)
    with open(file_path, "r", encoding="utf-8") as file:
        return file.read().strip()


SECRET = ensure_bytes_secret(SECRET_FILE)
AUTOMATION_KEY = ensure_text_secret(AUTOMATION_KEY_FILE)


def sign_session(username: str, expires_at: int) -> str:
    payload = f"{username}|{expires_at}"
    signature = hmac.new(SECRET, payload.encode("utf-8"), hashlib.sha256).hexdigest()
    token = f"{username}|{expires_at}|{signature}"
    return base64.urlsafe_b64encode(token.encode("utf-8")).decode("ascii").rstrip("=")


def decode_session(token: str | None) -> str | None:
    if not token:
        return None
    padding = "=" * (-len(token) % 4)
    try:
        raw = base64.urlsafe_b64decode((token + padding).encode("ascii")).decode("utf-8")
        username, expires_at_text, signature = raw.split("|", 2)
        expires_at = int(expires_at_text)
    except Exception:
        return None

    if expires_at < int(time.time()):
        return None

    expected = hmac.new(
        SECRET,
        f"{username}|{expires_at}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    return username


def sanitize_next_path(value: str | None) -> str:
    if not value:
        return "/"
    parsed = urlparse(value)
    if parsed.scheme or parsed.netloc:
        return "/"
    if not value.startswith("/"):
        return "/"
    if value.startswith("/login") or value.startswith("/auth/"):
        return "/"
    return value


def verify_credentials(username: str, password: str) -> bool:
    if not username or not password or "\n" in username or "\r" in username:
        return False
    result = subprocess.run(
        ["htpasswd", "-vb", HTPASSWD_FILE, username, password],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.returncode == 0


def verify_basic_auth_header(header_value: str | None) -> str | None:
    if not ALLOW_BASIC_AUTH or not header_value:
        return None

    scheme, _, encoded = header_value.partition(" ")
    if scheme.lower() != "basic" or not encoded:
        return None

    try:
        decoded = base64.b64decode(encoded).decode("utf-8")
        username, password = decoded.split(":", 1)
    except Exception:
        return None

    if verify_credentials(username, password):
        return username
    return None


def build_login_page(next_path: str, error: str | None, logged_out: bool) -> str:
    error_message = ""
    info_message = ""
    if error == "invalid":
        error_message = "아이디 또는 비밀번호가 올바르지 않습니다."
    elif error == "server":
        error_message = "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    if logged_out:
        info_message = "로그아웃되었습니다."

    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PRESSCO21 CRM 로그인</title>
  <style>
    :root {{
      color-scheme: light;
      --bg: #eef4ec;
      --panel: rgba(255,255,255,0.92);
      --line: rgba(54,84,60,0.12);
      --ink: #1f2d21;
      --muted: #66756b;
      --accent: #6f8b68;
      --accent-strong: #587251;
      --danger: #c24141;
      --info: #4f6b53;
      --shadow: 0 22px 60px rgba(45, 69, 52, 0.14);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(125, 150, 117, 0.24), transparent 32%),
        radial-gradient(circle at bottom right, rgba(87, 114, 81, 0.18), transparent 28%),
        linear-gradient(135deg, #f7faf6 0%, #edf3eb 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }}
    .shell {{
      width: min(100%, 920px);
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(320px, 420px);
      border: 1px solid var(--line);
      border-radius: 28px;
      overflow: hidden;
      background: var(--panel);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }}
    .hero {{
      padding: 40px 36px 32px;
      background:
        linear-gradient(160deg, rgba(39, 63, 45, 0.92), rgba(61, 96, 72, 0.9)),
        linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0));
      color: #f8fbf6;
      position: relative;
    }}
    .hero::after {{
      content: "";
      position: absolute;
      inset: auto 24px 24px auto;
      width: 140px;
      height: 140px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%);
      pointer-events: none;
    }}
    .hero h1 {{
      margin: 0;
      font-size: 30px;
      line-height: 1.15;
      letter-spacing: -0.03em;
    }}
    .hero p {{
      margin: 14px 0 0;
      color: rgba(248, 251, 246, 0.78);
      line-height: 1.6;
      font-size: 14px;
    }}
    .hero ul {{
      margin: 28px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 12px;
    }}
    .hero li {{
      display: flex;
      gap: 10px;
      align-items: flex-start;
      color: rgba(248, 251, 246, 0.9);
      font-size: 13px;
      line-height: 1.5;
    }}
    .hero li::before {{
      content: "";
      width: 8px;
      height: 8px;
      margin-top: 6px;
      flex: none;
      border-radius: 999px;
      background: rgba(214, 233, 213, 0.9);
      box-shadow: 0 0 0 5px rgba(214, 233, 213, 0.14);
    }}
    .panel {{
      padding: 36px 32px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 18px;
    }}
    .brand {{
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}
    .brand strong {{
      font-size: 15px;
      letter-spacing: 0.04em;
      color: var(--accent-strong);
    }}
    .brand span {{
      color: var(--muted);
      font-size: 13px;
    }}
    form {{
      display: grid;
      gap: 14px;
    }}
    label {{
      display: grid;
      gap: 7px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 600;
      letter-spacing: 0.01em;
    }}
    input {{
      width: 100%;
      border: 1px solid rgba(92, 118, 95, 0.18);
      border-radius: 14px;
      background: #fbfdfb;
      padding: 14px 15px;
      font-size: 15px;
      color: var(--ink);
      outline: none;
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }}
    input:focus {{
      border-color: rgba(92, 118, 95, 0.42);
      box-shadow: 0 0 0 4px rgba(111, 139, 104, 0.12);
      background: #ffffff;
    }}
    button {{
      width: 100%;
      border: 0;
      border-radius: 14px;
      padding: 14px 16px;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: transform .12s ease, box-shadow .18s ease, opacity .18s ease;
      box-shadow: 0 14px 28px rgba(87, 114, 81, 0.24);
    }}
    button:hover {{
      transform: translateY(-1px);
    }}
    .message {{
      border-radius: 14px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.5;
    }}
    .message.error {{
      background: rgba(194, 65, 65, 0.08);
      color: var(--danger);
      border: 1px solid rgba(194, 65, 65, 0.16);
    }}
    .message.info {{
      background: rgba(79, 107, 83, 0.08);
      color: var(--info);
      border: 1px solid rgba(79, 107, 83, 0.14);
    }}
    .caption {{
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
    }}
    .caption code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: rgba(103, 124, 104, 0.08);
      padding: 2px 6px;
      border-radius: 999px;
    }}
    @media (max-width: 860px) {{
      .shell {{ grid-template-columns: 1fr; }}
      .hero {{ padding-bottom: 28px; }}
      .panel {{ padding-top: 28px; }}
    }}
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <h1>PRESSCO21 CRM<br />내부 로그인</h1>
      <p>브라우저 기본 팝업 대신 회사 내부용 로그인 화면으로 접속합니다. 기존 서버 계정을 그대로 사용하고, 로그인 후에는 세션 쿠키로 화면과 API를 함께 통과시킵니다.</p>
      <ul>
        <li>같은 도메인 안에서 화면과 데이터 요청이 같은 세션으로 처리됩니다.</li>
        <li>기존 <code>.htpasswd-crm</code> 사용자 계정을 그대로 사용합니다.</li>
        <li>작업 계정 선택은 CRM 설정의 운영 계정 기능을 그대로 유지합니다.</li>
      </ul>
    </section>
    <section class="panel">
      <div class="brand">
        <strong>PRESSCO21 CRM</strong>
        <span>회사 내부 프로그램 전용 접근 화면</span>
      </div>
      {f'<div class="message error">{html.escape(error_message)}</div>' if error_message else ''}
      {f'<div class="message info">{html.escape(info_message)}</div>' if info_message else ''}
      <form method="post" action="/auth/login">
        <input type="hidden" name="next" value="{html.escape(next_path)}" />
        <label>
          아이디
          <input name="username" autocomplete="username" required />
        </label>
        <label>
          비밀번호
          <input type="password" name="password" autocomplete="current-password" required />
        </label>
        <button type="submit">로그인</button>
      </form>
      <p class="caption">브라우저를 닫아도 일정 시간 동안 세션이 유지됩니다. 공용 PC에서는 작업 후 반드시 로그아웃 버튼을 눌러 주세요.</p>
    </section>
  </div>
</body>
</html>"""


class AuthHandler(BaseHTTPRequestHandler):
    server_version = "Pressco21CrmAuth/1.0"

    def log_message(self, format: str, *args) -> None:
        return

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def read_form(self) -> dict[str, str]:
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(content_length)
        params = parse_qs(raw.decode("utf-8"), keep_blank_values=True)
        return {key: values[0] if values else "" for key, values in params.items()}

    def read_session_user(self) -> str | None:
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return None
        cookie = SimpleCookie()
        try:
            cookie.load(cookie_header)
        except Exception:
            return None
        morsel = cookie.get(COOKIE_NAME)
        return decode_session(morsel.value if morsel else None)

    def read_automation_user(self) -> str | None:
        header_value = self.headers.get(AUTOMATION_HEADER_NAME, "")
        if AUTOMATION_KEY and header_value and hmac.compare_digest(header_value.strip(), AUTOMATION_KEY):
            return "automation"
        return verify_basic_auth_header(self.headers.get("Authorization"))

    def write_html(self, status: HTTPStatus, body: str) -> None:
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def write_text(self, status: HTTPStatus, body: str) -> None:
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def redirect(self, location: str, cookie_header: str | None = None) -> None:
        self.send_response(HTTPStatus.SEE_OTHER)
        self.send_header("Location", location)
        if cookie_header:
            self.send_header("Set-Cookie", cookie_header)
        self.end_headers()

    def build_session_cookie(self, username: str) -> str:
        expires_at = int(time.time()) + SESSION_TTL
        token = sign_session(username, expires_at)
        return (
            f"{COOKIE_NAME}={token}; Path=/; Max-Age={SESSION_TTL}; "
            "HttpOnly; Secure; SameSite=Lax"
        )

    def build_logout_cookie(self) -> str:
        return (
            f"{COOKIE_NAME}=; Path=/; Max-Age=0; "
            "HttpOnly; Secure; SameSite=Lax"
        )

    def write_auth_check_unauthorized(self) -> None:
        next_path = sanitize_next_path(self.headers.get("X-Original-URI"))
        encoded_next = quote(next_path, safe="")
        self.send_response(HTTPStatus.UNAUTHORIZED)
        self.send_header("X-Auth-Redirect", f"/login?next={encoded_next}")
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", "12")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query, keep_blank_values=True)
        session_user = self.read_session_user()

        if path == "/health":
            self.write_text(HTTPStatus.OK, "ok")
            return

        if path == "/auth/check":
            auth_user = session_user or self.read_automation_user()
            if auth_user:
                self.send_response(HTTPStatus.OK)
                self.send_header("X-Auth-User", auth_user)
                self.end_headers()
            else:
                self.write_auth_check_unauthorized()
                self.wfile.write(b"unauthorized")
            return

        if path == "/login":
            next_path = sanitize_next_path(query.get("next", ["/"])[0])
            if session_user:
                self.redirect(next_path)
                return
            page = build_login_page(
                next_path=next_path,
                error=query.get("error", [None])[0],
                logged_out=query.get("logged_out", ["0"])[0] == "1",
            )
            self.write_html(HTTPStatus.OK, page)
            return

        if path == "/auth/logout":
            self.redirect("/login?logged_out=1", cookie_header=self.build_logout_cookie())
            return

        self.write_text(HTTPStatus.NOT_FOUND, "not found")

    def do_HEAD(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query, keep_blank_values=True)
        session_user = self.read_session_user()

        if path == "/health":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", "2")
            self.end_headers()
            return

        if path == "/auth/check":
            auth_user = session_user or self.read_automation_user()
            if auth_user:
                self.send_response(HTTPStatus.OK)
                self.send_header("X-Auth-User", auth_user)
                self.end_headers()
            else:
                self.write_auth_check_unauthorized()
            return

        if path == "/login":
            next_path = sanitize_next_path(query.get("next", ["/"])[0])
            if session_user:
                self.redirect(next_path)
                return
            page = build_login_page(
                next_path=next_path,
                error=query.get("error", [None])[0],
                logged_out=query.get("logged_out", ["0"])[0] == "1",
            )
            encoded = page.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            return

        if path == "/auth/logout":
            self.redirect("/login?logged_out=1", cookie_header=self.build_logout_cookie())
            return

        self.send_response(HTTPStatus.NOT_FOUND)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", "9")
        self.end_headers()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/auth/login":
            self.write_text(HTTPStatus.NOT_FOUND, "not found")
            return

        try:
            form = self.read_form()
            username = form.get("username", "").strip()
            password = form.get("password", "")
            next_path = sanitize_next_path(form.get("next", "/"))
            if not verify_credentials(username, password):
                self.redirect(f"/login?error=invalid&next={quote(next_path, safe='/?:=&')}")
                return
            self.redirect(next_path, cookie_header=self.build_session_cookie(username))
        except Exception:
            self.redirect("/login?error=server")


def main() -> None:
    server = ThreadingHTTPServer((BIND, PORT), AuthHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
