from __future__ import annotations

from pydantic import BaseModel


class Ad(BaseModel):
    nccAdId: str
    nccAdgroupId: str
    type: str | None = None
    ad: dict | None = None  # type: ignore[type-arg]
    userLock: bool = False
    inspectStatus: str | None = None
    status: str | None = None


class AdCreate(BaseModel):
    nccAdgroupId: str
    type: str
    ad: dict  # type: ignore[type-arg]


class AdUpdate(BaseModel):
    ad: dict | None = None  # type: ignore[type-arg]
    userStatus: str | None = None
    inspectRequestMsg: str | None = None
