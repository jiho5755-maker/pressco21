function getDigits(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '')
}

export function formatBusinessNumber(value?: string | null): string {
  const digits = getDigits(value)
  if (!digits) return ''
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`
}

export function formatPhoneNumber(value?: string | null): string {
  const digits = getDigits(value)
  if (!digits) return ''

  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }

  if (digits.startsWith('0505')) {
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`
    return `${digits.slice(0, 4)}-${digits.slice(4, digits.length - 4)}-${digits.slice(-4)}`
  }

  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }

  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export function normalizeDateInput(value?: string | null): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const digits = getDigits(trimmed)
  if (digits.length !== 8) return trimmed.slice(0, 10)

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

export function formatDisplayDate(value?: string | null): string {
  const normalized = normalizeDateInput(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized
  return normalized || ''
}

export function addDaysToDate(value: string | undefined, days: number): string {
  const normalized = normalizeDateInput(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return ''

  const [year, month, day] = normalized.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return normalized
  date.setDate(date.getDate() + days)

  const nextYear = String(date.getFullYear())
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}
