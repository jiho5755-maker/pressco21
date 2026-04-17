from __future__ import annotations

from pydantic import BaseModel


class AdGroup(BaseModel):
    nccAdgroupId: str
    nccCampaignId: str
    name: str
    adgroupType: str | None = None
    bidAmt: int = 0
    dailyBudget: int | None = None
    useDailyBudget: bool = False
    targets: list[dict] | None = None  # type: ignore[type-arg]
    keywordPlusWeight: int | None = None
    status: str | None = None


class AdGroupCreate(BaseModel):
    nccCampaignId: str
    name: str
    bidAmt: int = 70
    adgroupType: str | None = None
    dailyBudget: int | None = None
    useDailyBudget: bool = False


class AdGroupUpdate(BaseModel):
    name: str | None = None
    bidAmt: int | None = None
    dailyBudget: int | None = None
    useDailyBudget: bool | None = None
    userStatus: str | None = None
