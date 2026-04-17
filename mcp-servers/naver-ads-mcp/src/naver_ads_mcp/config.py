from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    naver_sa_api_key: str = ""
    naver_sa_secret_key: str = ""
    naver_sa_customer_id: str = ""

    naver_commerce_client_id: str = ""
    naver_commerce_client_secret: str = ""

    mcp_write_enabled: bool = False

    max_bid_delta_pct: int = Field(default=20, ge=1, le=50)
    max_auto_actions_per_day: int = Field(default=100, ge=1)

    log_level: str = "INFO"

    sa_base_url: str = "https://api.searchad.naver.com"
    commerce_base_url: str = "https://api.commerce.naver.com"
    datalab_base_url: str = "https://openapi.naver.com"

    @property
    def searchad_configured(self) -> bool:
        return bool(
            self.naver_sa_api_key and self.naver_sa_secret_key and self.naver_sa_customer_id
        )

    @property
    def commerce_configured(self) -> bool:
        return bool(self.naver_commerce_client_id and self.naver_commerce_client_secret)


settings = Settings()
