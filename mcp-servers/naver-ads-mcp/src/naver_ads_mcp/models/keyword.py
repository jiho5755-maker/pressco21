from __future__ import annotations

from pydantic import BaseModel


class Keyword(BaseModel):
    nccKeywordId: str
    nccAdgroupId: str
    keyword: str
    bidAmt: int = 0
    useGroupBidAmt: bool = True
    userLock: bool = False
    inspectStatus: str | None = None
    status: str | None = None


class KeywordCreate(BaseModel):
    keyword: str
    bidAmt: int | None = None
    useGroupBidAmt: bool = True


class KeywordBidUpdate(BaseModel):
    nccKeywordId: str
    bidAmt: int


class KeywordStatusUpdate(BaseModel):
    nccKeywordId: str
    userStatus: str
