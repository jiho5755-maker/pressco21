import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { saveCompanyInfo } from '@/lib/print'
import type { CompanyInfo } from '@/lib/print'
import {
  getSettings,
  saveSettingsToServer,
} from '@/lib/api'
import type { CrmSettings } from '@/lib/api'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'

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
  return merged as SettingsData
}

function saveSettingsLocal(data: SettingsData): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
  // print.ts와 호환되도록 CompanyInfo도 동기 저장
  saveCompanyInfo(data)
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
  const [data, setData] = useState<SettingsData>(loadSettings)
  const [serverRowId, setServerRowId] = useState<number | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')

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
      </div>
    </div>
  )
}
