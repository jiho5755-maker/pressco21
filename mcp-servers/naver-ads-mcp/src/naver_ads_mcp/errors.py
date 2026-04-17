from __future__ import annotations

from typing import Any


class NaverApiError(Exception):
    def __init__(
        self,
        code: str,
        http_status: int,
        message_ko: str,
        *,
        retry_after_sec: int | None = None,
        upstream: dict[str, Any] | None = None,
        hint: str | None = None,
    ) -> None:
        self.code = code
        self.http_status = http_status
        self.message_ko = message_ko
        self.retry_after_sec = retry_after_sec
        self.upstream = upstream or {}
        self.hint = hint
        super().__init__(message_ko)

    def to_dict(self) -> dict[str, Any]:
        err: dict[str, Any] = {
            "code": self.code,
            "http_status": self.http_status,
            "message_ko": self.message_ko,
        }
        if self.retry_after_sec is not None:
            err["retry_after_sec"] = self.retry_after_sec
        if self.upstream:
            err["upstream"] = self.upstream
        if self.hint:
            err["hint"] = self.hint
        return {"ok": False, "error": err}


class AuthNotConfiguredError(NaverApiError):
    def __init__(self, service: str) -> None:
        super().__init__(
            code=f"{service.upper()}_NOT_CONFIGURED",
            http_status=0,
            message_ko=f"{service} API 인증 정보가 설정되지 않았습니다. .env 파일을 확인하세요.",
            hint=".env.example을 참고하여 환경변수를 설정하세요.",
        )


class WriteDisabledError(NaverApiError):
    def __init__(self) -> None:
        super().__init__(
            code="WRITE_DISABLED",
            http_status=0,
            message_ko="쓰기 작업이 비활성화되어 있습니다. MCP_WRITE_ENABLED=true로 설정하세요.",
            hint="안전을 위해 기본값은 읽기 전용입니다.",
        )


ERROR_MAP: dict[int, tuple[str, str]] = {
    400: ("BAD_REQUEST", "잘못된 요청입니다. 파라미터를 확인하세요."),
    401: ("UNAUTHORIZED", "인증에 실패했습니다. API 키와 서명을 확인하세요."),
    403: ("FORBIDDEN", "접근 권한이 없습니다. 네이버 광고 계정 권한을 확인하세요."),
    404: ("NOT_FOUND", "리소스를 찾을 수 없습니다. ID가 올바른지 확인하세요."),
    409: ("CONFLICT", "리소스 상태 충돌입니다. 최신 상태를 다시 조회해보세요."),
    429: ("TOO_MANY_REQUESTS", "요청 한도를 초과했습니다."),
}


def make_api_error(
    service: str, status: int, body: dict[str, Any] | None = None, retry_after: int | None = None
) -> NaverApiError:
    prefix = "NAVER_SA" if service == "searchad" else "NAVER_COMMERCE"
    code_suffix, default_msg = ERROR_MAP.get(status, ("SERVER_ERROR", "서버 오류가 발생했습니다."))
    return NaverApiError(
        code=f"{prefix}_{code_suffix}",
        http_status=status,
        message_ko=default_msg,
        retry_after_sec=retry_after,
        upstream={"raw": body} if body else None,
        hint="도구 호출 간격을 늘리거나 bulk 도구를 사용해주세요." if status == 429 else None,
    )
