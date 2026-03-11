const CRM_SETTINGS_KEY = 'pressco21-crm-settings'

export interface WorkOperatorProfile {
  id: string
  label: string
  operatorName: string
}

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

function normalizeStoredString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function loadWorkOperatorProfiles(): WorkOperatorProfile[] {
  const settings = loadStoredCrmSettings()
  const legacyOperator = normalizeStoredString(settings.legacy_settlement_operator)
  const profile1Label = normalizeStoredString(settings.operator_profile_1_label) || '계정 1'
  const profile1Name = normalizeStoredString(settings.operator_profile_1_name) || legacyOperator
  const profile2Label = normalizeStoredString(settings.operator_profile_2_label) || '계정 2'
  const profile2Name = normalizeStoredString(settings.operator_profile_2_name)

  return [
    { id: 'operator-1', label: profile1Label, operatorName: profile1Name },
    { id: 'operator-2', label: profile2Label, operatorName: profile2Name },
  ]
}

export function loadActiveWorkOperatorId(): string {
  const settings = loadStoredCrmSettings()
  const raw = normalizeStoredString(settings.active_operator_profile_id)
  return raw || 'operator-1'
}

export function loadActiveWorkOperatorProfile(): WorkOperatorProfile | null {
  const profiles = loadWorkOperatorProfiles()
  const activeId = loadActiveWorkOperatorId()
  const activeProfile = profiles.find((profile) => profile.id === activeId) ?? profiles[0]
  if (!activeProfile) return null
  if (!activeProfile.label && !activeProfile.operatorName) return null
  return activeProfile
}

export function loadLegacySettlementOperator(): string {
  return loadActiveWorkOperatorProfile()?.operatorName ?? ''
}
