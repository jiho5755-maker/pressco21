from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CommerceProduct(BaseModel):
    productNo: int | None = None
    channelProductNo: int | None = None
    name: str = ""
    statusType: str | None = None
    salePrice: int = 0
    stockQuantity: int = 0
    categoryId: str | None = None
    representativeImage: str | None = None
    createdDate: datetime | None = None
    modifiedDate: datetime | None = None


class CommerceOrder(BaseModel):
    productOrderId: str | None = None
    orderId: str | None = None
    productName: str = ""
    quantity: int = 0
    totalPaymentAmount: int = 0
    productOrderStatus: str | None = None
    ordererName: str = ""
    ordererTel: str = ""
