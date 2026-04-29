export interface VatIncludedSplit {
  supplyAmount: number
  taxAmount: number
  totalAmount: number
}

function normalizeAmount(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value ?? '').replace(/,/g, '').replace(/원/g, '').trim())
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.trunc(parsed))
}

export function splitVatIncludedAmount(totalAmount: unknown, taxable = true): VatIncludedSplit {
  const total = normalizeAmount(totalAmount)
  if (!taxable || total <= 0) {
    return { supplyAmount: total, taxAmount: 0, totalAmount: total }
  }

  const taxAmount = Math.round(total / 11)
  return {
    supplyAmount: total - taxAmount,
    taxAmount,
    totalAmount: total,
  }
}

export function getVatIncludedLineTotal(unitPrice: unknown, quantity: unknown): number {
  const price = normalizeAmount(unitPrice)
  const qty = Math.max(0, normalizeAmount(quantity))
  return Math.max(0, price * qty)
}
