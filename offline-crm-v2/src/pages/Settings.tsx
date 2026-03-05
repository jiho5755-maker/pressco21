import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { loadCompanyInfo, saveCompanyInfo } from '@/lib/print'
import type { CompanyInfo } from '@/lib/print'

// print.ts 인터페이스 확장 (설정 전용 추가 필드)
interface SettingsData extends CompanyInfo {
  bank_name?: string
  bank_account?: string
  bank_holder?: string
  invoice_header?: string
  invoice_footer?: string
  default_taxable?: boolean
  default_payment_method?: string
}

const SETTINGS_KEY = 'pressco21-crm-settings'

function loadSettings(): SettingsData {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) return JSON.parse(saved) as SettingsData
  } catch {}
  // 기존 CompanyInfo와 병합
  return loadCompanyInfo()
}

function saveSettings(data: SettingsData): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
  // print.ts와 호환되도록 CompanyInfo도 동기 저장
  saveCompanyInfo(data)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-800">{children}</h3>
      <Separator className="mt-2" />
    </div>
  )
}

function Field({
  label, hint, children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
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

  // 이미지 프리뷰 state
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [stampPreview, setStampPreview] = useState<string>('')

  useEffect(() => {
    setLogoPreview(data.logo_url ?? '/images/company-logo.png')
    setStampPreview(data.stamp_url ?? '/images/company-stamp.jpg')
  }, [])

  function set<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  function handleImageUpload(field: 'logo_url' | 'stamp_url', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setData((prev) => ({ ...prev, [field]: dataUrl }))
      if (field === 'logo_url') setLogoPreview(dataUrl)
      else setStampPreview(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function handleSave() {
    saveSettings(data)
    toast.success('설정이 저장되었습니다')
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">설정</h2>
          <p className="text-sm text-muted-foreground mt-1">거래명세표 및 시스템 환경을 설정합니다</p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-[#7d9675] hover:bg-[#6a8462] text-white"
        >
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
                checked={data.default_taxable ?? true}
                onChange={(e) => set('default_taxable', e.target.checked)}
                className="accent-[#7d9675] w-4 h-4"
              />
              <label htmlFor="default-taxable" className="text-sm">
                새 품목 기본값: 과세 (10%)
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
