from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class StatRow(BaseModel):
    entityId: str | None = None
    date: date | None = None
    hour: int | None = None
    impCnt: int = 0
    clkCnt: int = 0
    salesAmt: int = 0
    ctr: float = 0.0
    cpc: float = 0.0
    avgRnk: float | None = None
    ccnt: int = 0
    convAmt: int = 0
    roas: float = 0.0

    @property
    def summary(self) -> str:
        return (
            f"노출 {self.impCnt:,} / 클릭 {self.clkCnt:,} / "
            f"광고비 {self.salesAmt:,}원 / 전환 {self.ccnt}건 / "
            f"ROAS {self.roas:.0f}%"
        )
