export const DEFAULT_RECEIPT_TYPE = '청구'

export const RECEIPT_TYPE_OPTIONS = [
  { value: '청구', label: '청구' },
  { value: '영수', label: '영수' },
] as const

export const RECEIPT_TYPE_VALUES = RECEIPT_TYPE_OPTIONS.map((option) => option.value)

const RECEIPT_TYPE_SET = new Set<string>(RECEIPT_TYPE_VALUES)
const LEGACY_RECEIPT_TYPE_MAP: Record<string, string> = {
  거래명세표: '청구',
  견적서: '청구',
  '영수(청구)': '청구',
}

export function normalizeReceiptTypeValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (RECEIPT_TYPE_SET.has(trimmed)) return trimmed
  return LEGACY_RECEIPT_TYPE_MAP[trimmed]
}
