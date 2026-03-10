const CRM_SETTINGS_KEY = 'pressco21-crm-settings'

type StoredBoolean = boolean | number | string | null | undefined

function normalizeStoredBoolean(value: StoredBoolean, fallback = false): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'false') return false
  return fallback
}

export function loadStoredCrmSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(CRM_SETTINGS_KEY)
    if (raw) return JSON.parse(raw) as Record<string, unknown>
  } catch {}
  return {}
}

export function loadDefaultTaxableSetting(fallback = false): boolean {
  const settings = loadStoredCrmSettings()
  return normalizeStoredBoolean(settings.default_taxable as StoredBoolean, fallback)
}

export function loadLegacySettlementOperator(): string {
  const settings = loadStoredCrmSettings()
  const raw = settings.legacy_settlement_operator
  return typeof raw === 'string' ? raw.trim() : ''
}
