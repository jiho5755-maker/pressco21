from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CampaignPeriod(BaseModel):
    startDt: str | None = None
    endDt: str | None = None


class Campaign(BaseModel):
    nccCampaignId: str
    customerId: int | None = None
    name: str
    campaignTp: str | None = None
    deliveryMethod: Literal["STANDARD", "ACCELERATED"] | None = None
    dailyBudget: int = 0
    useDailyBudget: bool = False
    period: CampaignPeriod | None = None
    status: str | None = None
    statusReason: str | None = None
    regTm: datetime | None = None
    editTm: datetime | None = None


class CampaignCreate(BaseModel):
    name: str
    campaignTp: str = "WEB_SITE"
    customerId: int | None = None
    dailyBudget: int = 0
    useDailyBudget: bool = False
    deliveryMethod: str = "STANDARD"


class CampaignUpdate(BaseModel):
    name: str | None = None
    dailyBudget: int | None = None
    useDailyBudget: bool | None = None
    userStatus: str | None = None
    deliveryMethod: str | None = None
