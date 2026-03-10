export interface LegacyTradebookSnapshot {
  legacy_id: string
  book_name: string
  name: string
  business_no: string
  branch_no: string
  corporation_no: string
  ceo_name: string
  business_address: string
  business_type: string
  business_item: string
  zip: string
  address1: string
  address2: string
  phone1: string
  phone2: string
  fax: string
  manager: string
  mobile: string
  email: string
  email2: string
  homepage: string
  trade_type: string
  tree_type: string
  memo: string
  related_account: string
  category_name: string
  sales_manager: string
  report_print: string
  balance: string
  price_tier: string
  sms_opt_in: string
  fax_opt_in: string
  vat_custom: string
  auto_category: string
  carry_over_balance: string
  bank_name: string
  bank_account: string
  bank_owner: string
  rate: string
}

export interface LegacyCustomerListSnapshot {
  serial_no: string
  business_no: string
  customer_group: string
  registered_at: string
  customer_name: string
  company_department: string
  zip: string
  address1: string
  address2: string
  note: string
  reference: string
  phone_company: string
  phone_home: string
  mobile: string
  email: string
}

export interface LegacyCustomerSnapshotPayload {
  generatedAt: string
  tradebookByLegacyId: Record<string, LegacyTradebookSnapshot>
  customerListByName: Record<string, LegacyCustomerListSnapshot[]>
}

export interface LegacySnapshotMatchTarget {
  legacy_id?: string | number
  name?: string
  mobile?: string
  email?: string
  biz_no?: string
  business_no?: string
  memo?: string
}

let legacySnapshotPromise: Promise<LegacyCustomerSnapshotPayload> | null = null

function normalizeLegacyCompareText(value: string | undefined) {
  return (value ?? '')
    .replace(/\s+/g, '')
    .replace(/[()\-.,]/g, '')
    .trim()
    .toLowerCase()
}

function normalizePhoneLike(value: string | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function normalizeBusinessNo(value: string | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function parseInteger(value: string | number | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0
  if (!value) return 0
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

export function deriveLegacyTradebookSnapshot(
  customer: LegacySnapshotMatchTarget | undefined,
  snapshots: LegacyCustomerSnapshotPayload | undefined,
): { snapshot?: LegacyTradebookSnapshot; matchReason?: string } {
  if (!customer || !snapshots) return {}

  const legacyId = customer.legacy_id != null ? String(customer.legacy_id).trim() : ''
  if (legacyId) {
    const snapshot = snapshots.tradebookByLegacyId?.[legacyId]
    if (snapshot) return { snapshot, matchReason: 'legacy_id' }
  }

  // 분리 거래명으로 생성한 CRM 전용 고객은 레거시 장부 baseline을 상속하지 않는다.
  if ((customer.memo ?? '').includes('분리 거래명 별도 고객')) {
    return {}
  }

  const customerMobile = normalizePhoneLike(customer.mobile)
  const customerEmail = normalizeLegacyCompareText(customer.email)
  const customerBizNo = normalizeBusinessNo(customer.biz_no ?? customer.business_no)
  const customerName = normalizeLegacyCompareText(customer.name)

  let fallbackMatch: LegacyTradebookSnapshot | undefined
  let fallbackReason: string | undefined

  for (const snapshot of Object.values(snapshots.tradebookByLegacyId ?? {})) {
    const snapshotMobile = normalizePhoneLike(snapshot.mobile)
    const snapshotEmail = normalizeLegacyCompareText(snapshot.email)
    const snapshotBizNo = normalizeBusinessNo(snapshot.business_no)
    const snapshotName = normalizeLegacyCompareText(snapshot.name)
    const snapshotBookName = normalizeLegacyCompareText(snapshot.book_name)
    const snapshotCeoName = normalizeLegacyCompareText(snapshot.ceo_name)

    if (customerBizNo && snapshotBizNo && customerBizNo === snapshotBizNo) {
      return { snapshot, matchReason: 'business_no' }
    }

    const mobileMatched = customerMobile && snapshotMobile && customerMobile === snapshotMobile
    const emailMatched = customerEmail && snapshotEmail && customerEmail === snapshotEmail

    if (mobileMatched && emailMatched) {
      return { snapshot, matchReason: 'mobile+email' }
    }

    if (!fallbackMatch && mobileMatched) {
      fallbackMatch = snapshot
      fallbackReason = 'mobile'
    }

    if (!fallbackMatch && customerName && (customerName === snapshotName || customerName === snapshotBookName)) {
      fallbackMatch = snapshot
      fallbackReason = 'name'
    }

    if (!fallbackMatch && customerName && snapshotCeoName && customerName.includes(snapshotCeoName)) {
      fallbackMatch = snapshot
      fallbackReason = 'name-ceo'
    }
  }

  return { snapshot: fallbackMatch, matchReason: fallbackReason }
}

export async function getLegacyCustomerSnapshots(): Promise<LegacyCustomerSnapshotPayload> {
  if (!legacySnapshotPromise) {
    legacySnapshotPromise = fetch('/data/legacy-customer-snapshots.json')
      .then((response) => {
        if (!response.ok) throw new Error('레거시 백업 스냅샷을 불러오지 못했습니다.')
        return response.json() as Promise<LegacyCustomerSnapshotPayload>
      })
      .catch((error) => {
        legacySnapshotPromise = null
        throw error
      })
  }
  return legacySnapshotPromise
}

export async function getLegacyBalanceBaseline(customer: LegacySnapshotMatchTarget | undefined): Promise<number> {
  const snapshots = await getLegacyCustomerSnapshots()
  const { snapshot } = deriveLegacyTradebookSnapshot(customer, snapshots)
  return parseInteger(snapshot?.balance)
}

export async function getLegacyReceivableBaseline(customer: LegacySnapshotMatchTarget | undefined): Promise<number> {
  const baseline = await getLegacyBalanceBaseline(customer)
  return Math.abs(baseline)
}

export function getLegacyReceivableBaselineFromSnapshots(
  customer: LegacySnapshotMatchTarget | undefined,
  snapshots: LegacyCustomerSnapshotPayload | undefined,
): number {
  const { snapshot } = deriveLegacyTradebookSnapshot(customer, snapshots)
  return Math.abs(parseInteger(snapshot?.balance))
}
