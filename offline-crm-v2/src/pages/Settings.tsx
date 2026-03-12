import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { saveCompanyInfo } from '@/lib/print'
import type { CompanyInfo } from '@/lib/print'
import {
  getSettings,
  saveSettingsToServer,
} from '@/lib/api'
import type { CrmSettings } from '@/lib/api'
import { resetAllGuides } from '@/lib/appGuide'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import { loadAuthSession } from '@/lib/auth'

// print.ts 인터페이스 확장 (설정 전용 추가 필드)
interface SettingsData extends CompanyInfo {
  bank_name?: string
  bank_account?: string
  bank_holder?: string
  invoice_header?: string
  invoice_footer?: string
  default_taxable?: boolean
  default_payment_method?: string
  // 단가등급 할인율 (소매가 기준, 이 값만큼 할인)
  price2_rate?: number  // 강사우대가 (기본 5%)
  price3_rate?: number  // 파트너도매가 (기본 12%)
  price4_rate?: number  // VIP특가 (기본 15%)
  price5_rate?: number  // 엠버서더 (기본 20%)
  legacy_settlement_operator?: string
  operator_profile_1_label?: string
  operator_profile_1_name?: string
  operator_profile_2_label?: string
  operator_profile_2_name?: string
  active_operator_profile_id?: string
  auto_deposit_bank_name?: string
  auto_deposit_account_number?: string
  auto_deposit_account_holder?: string
  auto_deposit_source?: string
  auto_deposit_exact_match_enabled?: boolean
  auto_deposit_auto_apply_enabled?: boolean
  auto_deposit_last_sync_at?: string
  auto_deposit_note?: string
}

const SETTINGS_KEY = 'pressco21-crm-settings'
const LEGACY_KEY = 'pressco21-crm-v2'

function loadSettings(): SettingsData {
  // 양쪽 키 병합: 어느 쪽에 데이터가 있든 모두 반영 (settings 키 우선)
  let merged: Record<string, unknown> = {}
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) merged = { ...merged, ...JSON.parse(legacy) }
  } catch {}
  try {
    const settings = localStorage.getItem(SETTINGS_KEY)
    if (settings) merged = { ...merged, ...JSON.parse(settings) }
  } catch {}
  const profile1Label = typeof merged.operator_profile_1_label === 'string' && merged.operator_profile_1_label.trim()
    ? merged.operator_profile_1_label
    : '마스터 계정'
  const profile1Name = typeof merged.operator_profile_1_name === 'string' && merged.operator_profile_1_name.trim()
    ? merged.operator_profile_1_name
    : '마스터 계정'
  const profile2Label = typeof merged.operator_profile_2_label === 'string' && merged.operator_profile_2_label.trim()
    ? merged.operator_profile_2_label
    : '직원 계정'
  const profile2Name = typeof merged.operator_profile_2_name === 'string' && merged.operator_profile_2_name.trim()
    ? merged.operator_profile_2_name
    : '직원 계정'
  const activeOperatorProfileId = typeof merged.active_operator_profile_id === 'string' && merged.active_operator_profile_id.trim()
    ? merged.active_operator_profile_id
    : 'operator-1'
  return {
    ...merged,
    operator_profile_1_label: profile1Label,
    operator_profile_1_name: profile1Name,
    operator_profile_2_label: profile2Label,
    operator_profile_2_name: profile2Name,
    active_operator_profile_id: activeOperatorProfileId,
  } as SettingsData
}

function saveSettingsLocal(data: SettingsData): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
  // print.ts와 호환되도록 CompanyInfo도 동기 저장
  saveCompanyInfo(data)
  window.dispatchEvent(new CustomEvent('crm-settings-changed'))
}

// NocoDB ↔ localStorage 필드 매핑 (SettingsData → CrmSettings)
function toServerPayload(data: SettingsData): Partial<CrmSettings> {
  return {
    company: data.company,
    ceo: data.ceo,
    bizno: data.bizno,
    phone: data.phone,
    email: data.email,
    bizType: data.bizType,
    bizItem: data.bizItem,
    address: data.address,
    logo_url: data.logo_url,
    stamp_url: data.stamp_url,
    bank_name: data.bank_name,
    bank_account: data.bank_account,
    bank_holder: data.bank_holder,
    invoice_header: data.invoice_header,
    invoice_footer: data.invoice_footer,
    default_taxable: data.default_taxable,
    price2_rate: data.price2_rate,
    price3_rate: data.price3_rate,
    price4_rate: data.price4_rate,
    price5_rate: data.price5_rate,
    auto_deposit_bank_name: data.auto_deposit_bank_name,
    auto_deposit_account_number: data.auto_deposit_account_number,
    auto_deposit_account_holder: data.auto_deposit_account_holder,
    auto_deposit_source: data.auto_deposit_source,
    auto_deposit_exact_match_enabled: data.auto_deposit_exact_match_enabled,
    auto_deposit_auto_apply_enabled: data.auto_deposit_auto_apply_enabled,
    auto_deposit_last_sync_at: data.auto_deposit_last_sync_at,
    auto_deposit_note: data.auto_deposit_note,
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-800">{children}</h3>
      <Separator className="mt-2" />
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

export function Settings() {
  const navigate = useNavigate()
  const [data, setData] = useState<SettingsData>(loadSettings)
  const [serverRowId, setServerRowId] = useState<number | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const authSession = loadAuthSession()

  // 이미지 프리뷰 state
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [stampPreview, setStampPreview] = useState<string>('')

  // debounce 저장용 ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadDone = useRef(false)

  // 앱 시작 시 NocoDB에서 설정 로드
  useEffect(() => {
    setSyncStatus('loading')
    getSettings().then((server) => {
      if (server) {
        setServerRowId(server.Id ?? null)
        // 서버 데이터로 localStorage + state 갱신 (서버가 source of truth)
        const merged: SettingsData = { ...loadSettings(), ...server }
        // NocoDB 자동 필드 제거
        delete (merged as Record<string, unknown>).Id
        delete (merged as Record<string, unknown>).CreatedAt
        delete (merged as Record<string, unknown>).UpdatedAt
        delete (merged as Record<string, unknown>).nc_order
        saveSettingsLocal(merged)
        setData(merged)
        setLogoPreview(merged.logo_url ?? '/images/company-logo.png')
        setStampPreview(merged.stamp_url ?? '/images/company-stamp.jpg')
        setSyncStatus('saved')
      } else {
        // 서버에 아직 행이 없음 → localStorage 값 유지
        setLogoPreview(data.logo_url ?? '/images/company-logo.png')
        setStampPreview(data.stamp_url ?? '/images/company-stamp.jpg')
        setSyncStatus('idle')
      }
      initialLoadDone.current = true
    }).catch(() => {
      // 네트워크 오류 등 → localStorage fallback
      setLogoPreview(data.logo_url ?? '/images/company-logo.png')
      setStampPreview(data.stamp_url ?? '/images/company-stamp.jpg')
      setSyncStatus('error')
      initialLoadDone.current = true
    })
  }, [])

  // debounce NocoDB 저장 (1초)
  const debounceSave = useCallback((nextData: SettingsData) => {
    if (!initialLoadDone.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      try {
        setSyncStatus('saving')
        const payload = toServerPayload(nextData)
        if (serverRowId) payload.Id = serverRowId
        await saveSettingsToServer(payload)
        // 서버에 처음 저장된 경우 rowId 갱신
        if (!serverRowId) {
          const fresh = await getSettings()
          if (fresh?.Id) setServerRowId(fresh.Id)
        }
        setSyncStatus('saved')
      } catch {
        setSyncStatus('error')
      }
    }, 1000)
  }, [serverRowId])

  function set<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setData((prev) => {
      const next = { ...prev, [key]: value }
      saveSettingsLocal(next)
      debounceSave(next)
      return next
    })
  }

  function handleImageUpload(field: 'logo_url' | 'stamp_url', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setData((prev) => {
        const updated = { ...prev, [field]: dataUrl }
        saveSettingsLocal(updated)
        debounceSave(updated)
        return updated
      })
      if (field === 'logo_url') setLogoPreview(dataUrl)
      else setStampPreview(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // "저장" 버튼: 즉시 flush
  async function handleSave() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    saveSettingsLocal(data)
    try {
      setSyncStatus('saving')
      const payload = toServerPayload(data)
      if (serverRowId) payload.Id = serverRowId
      await saveSettingsToServer(payload)
      if (!serverRowId) {
        const fresh = await getSettings()
        if (fresh?.Id) setServerRowId(fresh.Id)
      }
      setSyncStatus('saved')
      toast.success('설정이 서버에 저장되었습니다')
    } catch {
      setSyncStatus('error')
      toast.error('서버 저장 실패 (로컬에는 저장됨)')
    }
  }

  // 동기화 상태 아이콘
  const SyncIcon = () => {
    switch (syncStatus) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin text-[#7d9675]" />
      case 'saved':
        return <Cloud className="h-4 w-4 text-[#7d9675]" />
      case 'error':
        return <CloudOff className="h-4 w-4 text-red-500" />
      default:
        return <CloudOff className="h-4 w-4 text-muted-foreground" />
    }
  }

  const syncLabel: Record<typeof syncStatus, string> = {
    idle: '오프라인',
    loading: '불러오는 중...',
    saving: '저장 중...',
    saved: '서버 동기화됨',
    error: '서버 연결 실패',
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">설정</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">거래명세표 및 시스템 환경을 설정합니다</p>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <SyncIcon />
              {syncLabel[syncStatus]}
            </span>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={syncStatus === 'saving'}
          className="bg-[#7d9675] hover:bg-[#6a8462] text-white"
        >
          {syncStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          저장
        </Button>
      </div>

      <div className="space-y-8">
        {/* ─── 섹션 1: 공급자 정보 ─── */}
        <section>
          <SectionTitle>공급자 정보</SectionTitle>
          <p className="text-xs text-muted-foreground mb-4">거래명세표 상단에 표시됩니다</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="상호">
              <Input
                value={data.company ?? ''}
                onChange={(e) => set('company', e.target.value)}
                placeholder="회사명"
              />
            </Field>
            <Field label="대표자">
              <Input
                value={data.ceo ?? ''}
                onChange={(e) => set('ceo', e.target.value)}
                placeholder="홍길동"
              />
            </Field>
            <Field label="사업자번호">
              <Input
                value={data.bizno ?? ''}
                onChange={(e) => set('bizno', e.target.value)}
                placeholder="000-00-00000"
              />
            </Field>
            <Field label="전화">
              <Input
                value={data.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="02-0000-0000"
              />
            </Field>
            <Field label="업태">
              <Input
                value={data.bizType ?? ''}
                onChange={(e) => set('bizType', e.target.value)}
                placeholder="도소매"
              />
            </Field>
            <Field label="종목">
              <Input
                value={data.bizItem ?? ''}
                onChange={(e) => set('bizItem', e.target.value)}
                placeholder="꽃 공예 재료"
              />
            </Field>
            <Field label="주소" hint="">
              <Input
                value={data.address ?? ''}
                onChange={(e) => set('address', e.target.value)}
                placeholder="서울시 ..."
              />
            </Field>
            <Field label="이메일">
              <Input
                value={data.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="info@example.com"
              />
            </Field>
          </div>
        </section>

        {/* ─── 섹션 2: 인쇄 설정 ─── */}
        <section>
          <SectionTitle>인쇄 설정</SectionTitle>
          <div className="grid grid-cols-2 gap-6">
            <Field label="로고 이미지" hint="좌상단에 표시됩니다">
              <div className="space-y-2">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="로고 미리보기"
                    className="h-12 object-contain border rounded"
                    onError={() => setLogoPreview('')}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('logo_url', e)}
                  className="text-xs"
                />
              </div>
            </Field>
            <Field label="도장 이미지" hint="우하단에 원형으로 표시됩니다">
              <div className="space-y-2">
                {stampPreview && (
                  <img
                    src={stampPreview}
                    alt="도장 미리보기"
                    className="h-12 w-12 object-cover rounded-full border"
                    onError={() => setStampPreview('')}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('stamp_url', e)}
                  className="text-xs"
                />
              </div>
            </Field>
            <Field label="머릿글">
              <Input
                value={data.invoice_header ?? ''}
                onChange={(e) => set('invoice_header', e.target.value)}
                placeholder="명세표 상단 추가 문구"
              />
            </Field>
            <Field label="꼬릿글">
              <Input
                value={data.invoice_footer ?? ''}
                onChange={(e) => set('invoice_footer', e.target.value)}
                placeholder="명세표 하단 추가 문구"
              />
            </Field>
          </div>
        </section>

        {/* ─── 섹션 3: 입금 계좌 ─── */}
        <section>
          <SectionTitle>입금 계좌</SectionTitle>
          <p className="text-xs text-muted-foreground mb-4">명세표 하단에 자동 표시됩니다</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="은행명">
              <Input
                value={data.bank_name ?? ''}
                onChange={(e) => set('bank_name', e.target.value)}
                placeholder="국민은행"
              />
            </Field>
            <Field label="계좌번호">
              <Input
                value={data.bank_account ?? ''}
                onChange={(e) => set('bank_account', e.target.value)}
                placeholder="000-000-000000"
              />
            </Field>
            <Field label="예금주">
              <Input
                value={data.bank_holder ?? ''}
                onChange={(e) => set('bank_holder', e.target.value)}
                placeholder="홍길동"
              />
            </Field>
          </div>
        </section>

        {/* ─── 섹션 4: 시스템 설정 ─── */}
        <section>
          <SectionTitle>시스템 설정</SectionTitle>
          <div className="space-y-4">
            <Field label="기본 기록명" hint="작업 계정 기록명이 비어 있을 때만 사용하는 하위 호환 기본값입니다.">
              <Input
                value={data.legacy_settlement_operator ?? ''}
                onChange={(e) => set('legacy_settlement_operator', e.target.value)}
                placeholder="예: 공용 담당자"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="작업 계정 1 표시명" hint="로그와 사이드바에 보이는 계정 이름입니다.">
                <Input
                  value={data.operator_profile_1_label ?? ''}
                  onChange={(e) => set('operator_profile_1_label', e.target.value)}
                  placeholder="예: pressco21"
                />
              </Field>
              <Field label="작업 계정 1 기록명" hint="수금/지급 이력에 남길 담당자명입니다.">
                <Input
                  value={data.operator_profile_1_name ?? data.legacy_settlement_operator ?? ''}
                  onChange={(e) => {
                    const nextValue = e.target.value
                    setData((prev) => {
                      const updated = {
                        ...prev,
                        operator_profile_1_name: nextValue,
                        legacy_settlement_operator: prev.operator_profile_1_name === prev.legacy_settlement_operator
                          ? nextValue
                          : prev.legacy_settlement_operator,
                      }
                      saveSettingsLocal(updated)
                      debounceSave(updated)
                      return updated
                    })
                  }}
                  placeholder="예: 장지호"
                />
              </Field>
              <Field label="작업 계정 2 표시명" hint="두 번째 작업 계정을 별도로 구분합니다.">
                <Input
                  value={data.operator_profile_2_label ?? ''}
                  onChange={(e) => set('operator_profile_2_label', e.target.value)}
                  placeholder="예: jang040300"
                />
              </Field>
              <Field label="작업 계정 2 기록명" hint="두 번째 계정의 로그 표시 이름입니다.">
                <Input
                  value={data.operator_profile_2_name ?? ''}
                  onChange={(e) => set('operator_profile_2_name', e.target.value)}
                  placeholder="예: 김담당"
                />
              </Field>
            </div>
            <Field label="현재 작업 계정" hint="이제 작업 로그는 설정 선택값이 아니라 현재 로그인한 계정으로 자동 기록됩니다.">
              <Select
                value={authSession?.operatorProfileId ?? data.active_operator_profile_id ?? 'operator-1'}
                onValueChange={() => {}}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="로그인 계정 기준" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator-1">
                    {(data.operator_profile_1_label ?? '').trim() || '계정 1'}
                    {' · '}
                    {(data.operator_profile_1_name ?? data.legacy_settlement_operator ?? '').trim() || '기록명 미설정'}
                  </SelectItem>
                  <SelectItem value="operator-2">
                    {(data.operator_profile_2_label ?? '').trim() || '계정 2'}
                    {' · '}
                    {(data.operator_profile_2_name ?? '').trim() || '기록명 미설정'}
                  </SelectItem>
                </SelectContent>
              </Select>
              {authSession ? (
                <p className="text-xs text-muted-foreground">
                  현재 로그인: {authSession.displayName} ({authSession.username})
                </p>
              ) : null}
            </Field>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="default-taxable"
                checked={Boolean(data.default_taxable)}
                onChange={(e) => set('default_taxable', e.target.checked)}
                className="accent-[#7d9675] w-4 h-4"
              />
              <label htmlFor="default-taxable" className="text-sm">
                새 품목 기본값: 과세 (10%)
              </label>
            </div>
            <div className="rounded-lg border bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">사용 가이드</p>
              <p className="mt-1 text-xs text-muted-foreground">
                수금 관리, 지급 관리, 고객 관리, 거래원장 화면은 처음 진입 시 화면별 도움말이 뜹니다.
                다시 보고 싶으면 아래 버튼으로 초기화할 수 있습니다.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  resetAllGuides()
                  toast.success('화면별 사용 가이드를 다시 볼 수 있게 초기화했습니다')
                }}
              >
                화면 가이드 다시보기 초기화
              </Button>
            </div>
          </div>
        </section>

        {/* ─── 섹션 5: 단가등급 할인율 ─── */}
        <section>
          <SectionTitle>단가등급 할인율</SectionTitle>
          <p className="text-xs text-muted-foreground mb-4">
            소매가(price1) 대비 할인율. 제품 등록 시 소매가 입력 후 "할인율 자동계산" 버튼으로 적용됩니다.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {([
              { key: 'price2_rate' as const, label: '강사우대가 (뿌리/INSTRUCTOR)', defaultVal: 5 },
              { key: 'price3_rate' as const, label: '파트너도매가 (꽃밭/PARTNERS)', defaultVal: 12 },
              { key: 'price4_rate' as const, label: 'VIP특가 (정원사/VIP)', defaultVal: 15 },
              { key: 'price5_rate' as const, label: '엠버서더 (별빛/AMBASSADOR)', defaultVal: 20 },
            ] as const).map(({ key, label, defaultVal }) => (
              <Field key={key} label={label} hint={`기본값: ${defaultVal}% 할인`}>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={data[key] ?? defaultVal}
                    onChange={(e) =>
                      set(key, Math.min(99, Math.max(0, Number(e.target.value))))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">% 할인</span>
                </div>
              </Field>
            ))}
          </div>
        </section>

        {/* ─── 섹션 6: 자동입금 준비 ─── */}
        <section>
          <SectionTitle>자동입금 준비</SectionTitle>
          <p className="text-xs text-muted-foreground mb-4">
            원장님 농협 계좌 입금 자동화를 붙이기 전, 수집 방식과 자동 반영 기준을 먼저 고정합니다.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="은행명">
                <Input
                  value={data.auto_deposit_bank_name ?? ''}
                  onChange={(e) => set('auto_deposit_bank_name', e.target.value)}
                  placeholder="농협"
                />
              </Field>
              <Field label="계좌번호">
                <Input
                  value={data.auto_deposit_account_number ?? ''}
                  onChange={(e) => set('auto_deposit_account_number', e.target.value)}
                  placeholder="000-0000-0000-00"
                />
              </Field>
              <Field label="예금주">
                <Input
                  value={data.auto_deposit_account_holder ?? ''}
                  onChange={(e) => set('auto_deposit_account_holder', e.target.value)}
                  placeholder="예금주명"
                />
              </Field>
            </div>

            <Field label="입금 수집 방식" hint="현재는 Gmail 보안메일 연동으로도 운영할 수 있고, NH API 승인 후에는 수집원만 바꾸면 됩니다.">
              <Select
                value={data.auto_deposit_source ?? 'manual_csv'}
                onValueChange={(value) => set('auto_deposit_source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="수집 방식을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_csv">수동 파일 업로드</SelectItem>
                  <SelectItem value="review_only">검토 전용 연결</SelectItem>
                  <SelectItem value="email_secure_mail">Gmail 보안메일 연동</SelectItem>
                  <SelectItem value="bank_api">은행 API 연동</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-gray-50 px-4 py-3">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(data.auto_deposit_exact_match_enabled)}
                    onChange={(e) => set('auto_deposit_exact_match_enabled', e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#7d9675]"
                  />
                  <span>
                    <span className="font-medium text-gray-900">정확 금액 자동매칭 사용</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      입금자명, 금액, 남은 받을 돈이 모두 맞는 후보를 우선 제안합니다.
                    </span>
                  </span>
                </label>
              </div>
              <div className="rounded-lg border bg-gray-50 px-4 py-3">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(data.auto_deposit_auto_apply_enabled)}
                    onChange={(e) => set('auto_deposit_auto_apply_enabled', e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#7d9675]"
                  />
                  <span>
                    <span className="font-medium text-gray-900">정확 일치 자동반영 허용</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      완전히 맞는 입금만 자동 처리하고, 나머지는 검토 대기열로 보냅니다.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <Field label="최근 동기화 시각" hint="실수집이 붙으면 마지막 입금 수집 성공 시각이 여기에 기록됩니다.">
              <Input
                value={data.auto_deposit_last_sync_at ?? ''}
                onChange={(e) => set('auto_deposit_last_sync_at', e.target.value)}
                placeholder="예: 2026-03-12 09:30"
              />
            </Field>

            <Field label="운영 메모" hint="은행 접속 방식, 담당자, 검토 규칙 등을 적어두면 인수인계에 유용합니다.">
              <Input
                value={data.auto_deposit_note ?? ''}
                onChange={(e) => set('auto_deposit_note', e.target.value)}
                placeholder="예: 1차는 수동 업로드, 정확 일치만 자동반영"
              />
            </Field>

            <div className="rounded-lg border bg-[#f7faf6] px-4 py-3 text-sm">
              <p className="font-medium text-gray-900">현재 자동입금 운영 기준</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>수집 방식: {(data.auto_deposit_source ?? 'manual_csv') === 'manual_csv'
                  ? '수동 파일 업로드'
                  : (data.auto_deposit_source ?? '') === 'review_only'
                    ? '검토 전용 연결'
                    : (data.auto_deposit_source ?? '') === 'email_secure_mail'
                      ? 'Gmail 보안메일 연동'
                      : '은행 API 연동'}</li>
                <li>자동매칭: {data.auto_deposit_exact_match_enabled ? '사용' : '미사용'}</li>
                <li>자동반영: {data.auto_deposit_auto_apply_enabled ? '정확 일치만 자동반영' : '검토 후 수동 반영'}</li>
                <li>계좌: {[data.auto_deposit_bank_name, data.auto_deposit_account_number, data.auto_deposit_account_holder].filter(Boolean).join(' / ') || '미설정'}</li>
              </ul>
              <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/deposit-inbox')}>
                  입금 수집함 열기
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
