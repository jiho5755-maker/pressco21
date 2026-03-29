export const DEFAULT_RECEIPT_TYPE = '거래명세표'

export const RECEIPT_TYPE_OPTIONS = [
  { value: '거래명세표', label: '거래명세표' },
  { value: '견적서', label: '견적서' },
  { value: '영수', label: '영수' },
  { value: '청구', label: '청구' },
  { value: '영수(청구)', label: '영수(청구)' },
] as const

export const RECEIPT_TYPE_VALUES = RECEIPT_TYPE_OPTIONS.map((option) => option.value)

export function isEstimateReceiptType(value?: string | null): boolean {
  return value === '견적서'
}
