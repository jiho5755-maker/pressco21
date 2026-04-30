import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BadgeCheck, ClipboardCheck, FileText, Landmark, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Receivables } from '@/pages/Receivables'
import { DepositInbox } from '@/pages/DepositInbox'
import { MonthEndReview } from '@/pages/MonthEndReview'
import { loadStoredCrmSettings } from '@/lib/settings'

const SECTIONS = [
  {
    value: 'receivables',
    label: '받을 돈',
    description: '미수, 부분입금, 입금 예정 고객을 확인합니다. 정산 완료 고객은 기본 업무 목록에서 제외합니다.',
  },
  {
    value: 'outgoing',
    label: '예치·환불·지급',
    description: '초과입금 예치금, 환불대기, 기존 장부 줄 돈을 성격별로 구분해 처리합니다.',
  },
  {
    value: 'deposits',
    label: '입금 반영',
    description: '은행 입금 알림을 고객/명세표에 반영하고, 애매한 입금은 수동으로 보정합니다.',
  },
  {
    value: 'rules',
    label: '자동반영 규칙',
    description: '입금자명 매핑, 고객별 자동반영 허용, 쇼핑몰·이자·PG 제외 기준을 관리합니다.',
  },
  {
    value: 'closeout',
    label: '마감 점검',
    description: '월말 또는 기간 마감 전 미처리 입금, 예치금, 환불대기, 세금계산서 예외를 확인합니다.',
  },
] as const

type SettlementSection = typeof SECTIONS[number]['value']

function isSettlementSection(value: string | null): value is SettlementSection {
  return SECTIONS.some((section) => section.value === value)
}

function formatBoolean(value: unknown, enabledLabel: string, disabledLabel: string): string {
  return value === true || value === 'true' || value === 1 || value === '1' ? enabledLabel : disabledLabel
}

function AutoDepositRulesPanel() {
  const navigate = useNavigate()
  const settings = useMemo(() => loadStoredCrmSettings(), [])
  const source = String(settings.auto_deposit_source ?? 'manual_csv')
  const sourceLabel = source === 'email_secure_mail'
    ? 'Gmail 보안메일 연동'
    : source === 'bank_api'
      ? '은행 API 연동'
      : source === 'review_only'
        ? '검토 전용 연결'
        : '수동 파일 업로드'
  const accountLabel = [
    settings.auto_deposit_bank_name,
    settings.auto_deposit_account_number,
    settings.auto_deposit_account_holder,
  ].filter(Boolean).join(' / ') || '미설정'

  const flowCards = [
    {
      title: '1. 제외 규칙 선필터',
      body: '쇼핑몰 정산, 카드사·PG 정산, 이자, 내부 이체는 고객 입금 후보에 섞기 전에 제외합니다.',
    },
      {
        title: '2. 고객 ID 단일 후보만 자동',
      body: '입금자명과 고객명/별칭이 정규화 후 정확히 같고 특정 고객 1명에만 연결될 때만 자동반영 후보가 됩니다. 동명이인은 수동 반영으로 보냅니다.',
      },
    {
      title: '3. 열린 미수 오래된 순서 차감',
      body: '입금액은 같은 고객의 열린 명세표 미수에 오래된 순서로 반영하고, 남는 금액만 예치금으로 보관합니다.',
    },
    {
      title: '4. 애매하면 수동 반영',
      body: '새 입금자명, 가족·대리입금, 큰 금액, 후보 다수, 거래종료 고객은 운영자가 확인한 뒤 이번만 반영 또는 규칙 저장을 선택합니다.',
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#5a7353]">AUTO DEPOSIT RULES</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">자동반영 규칙</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              모든 고객은 같은 수금·예치 플로우를 쓰되, 자동 실행은 고객 ID가 안전하게 특정되는 규칙에서만 허용합니다.
              은행 보안메일에는 입금자를 고유하게 특정하는 고객 ID가 없으므로 동명이인은 수동 확인이 원칙입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/settings#auto-deposit')}>
              전역 자동입금 설정
            </Button>
            <Button type="button" onClick={() => navigate('/settlements?section=deposits')}>
              입금 반영으로 이동
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">수집 방식</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{sourceLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">은행 입금 알림을 어떤 경로로 가져오는지 확인합니다.</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">자동매칭/자동반영</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatBoolean(settings.auto_deposit_exact_match_enabled, '자동매칭 ON', '자동매칭 OFF')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatBoolean(settings.auto_deposit_auto_apply_enabled, '안전 후보 자동반영', '검토 후 수동 반영')}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">대상 계좌</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{accountLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">계좌 정보는 설정 화면에서 관리합니다.</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {flowCards.map((card) => (
          <div key={card.title} className="rounded-xl border bg-white p-4 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-[#5e8a6e]" />
            <p className="mt-3 text-sm font-semibold text-gray-900">{card.title}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">고객별 자동반영은 고객 상세의 입금자명 별칭/자동입금 설정에서 켭니다.</p>
        <p className="mt-1 text-xs text-amber-800">
          “서상견”처럼 불특정 금액을 자주 선입금하는 고객은 입금자명 별칭을 고객 ID에 연결하고,
          고객 계정 자동반영을 허용하면 정확히 같은 입금자명에 한해 열린 미수부터 차감하고 초과분만 예치금으로 남기는 방식으로 처리합니다.
        </p>
      </div>
    </div>
  )
}

export function SettlementManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedSection = searchParams.get('section')
  const activeSection: SettlementSection = isSettlementSection(requestedSection)
    ? requestedSection
    : 'receivables'
  const activeMeta = SECTIONS.find((section) => section.value === activeSection) ?? SECTIONS[0]

  function handleSectionChange(nextSection: string) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('section', nextSection)
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#5a7353]">CASH & PAYMENT CONTROL</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">수급 지급 관리</h1>
            <p className="mt-2 max-w-4xl text-sm text-muted-foreground">
              받을 돈, 예치·환불·지급, 입금 반영, 자동반영 규칙, 마감 점검을 하나의 흐름으로 관리합니다.
            </p>
          </div>
          <div className="grid gap-2 rounded-xl border bg-[#f8faf6] p-3 text-xs text-[#4f6748] md:grid-cols-3">
            <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> 정산 완료 기본 숨김</div>
            <div className="flex items-center gap-2"><Landmark className="h-4 w-4" /> 애매한 입금 수동 반영</div>
            <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> 운영 write 전 fresh read</div>
          </div>
        </div>

        <Tabs value={activeSection} onValueChange={handleSectionChange} className="mt-5">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            {SECTIONS.map((section) => (
              <TabsTrigger
                key={section.value}
                value={section.value}
                className="rounded-full border bg-white px-4 py-2 data-[state=active]:border-[#7d9675] data-[state=active]:bg-[#7d9675] data-[state=active]:text-white"
              >
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mt-3 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <ClipboardCheck className="mr-2 inline h-4 w-4 text-[#5e8a6e]" />
          {activeMeta.description}
        </div>
      </div>

      {activeSection === 'receivables' && (
        <Receivables
          mode="receivable"
          titleOverride="받을 돈"
          descriptionOverride="미수, 부분입금, 입금 예정 고객을 확인합니다. 정산 완료 고객은 기본 목록에서 제외됩니다."
        />
      )}
      {activeSection === 'outgoing' && (
        <Receivables
          mode="payable"
          titleOverride="예치·환불·지급"
          descriptionOverride="고객이 더 낸 돈, 환불대기, 우리가 보낼 돈을 성격별로 구분해 관리합니다."
        />
      )}
      {activeSection === 'deposits' && (
        <DepositInbox
          titleOverride="입금 반영"
          descriptionOverride="은행 입금 알림을 고객/명세표에 반영하고, 애매한 입금은 수동으로 보정합니다."
        />
      )}
      {activeSection === 'rules' && <AutoDepositRulesPanel />}
      {activeSection === 'closeout' && (
        <MonthEndReview
          titleOverride="마감 점검"
          descriptionOverride="월말 또는 기간 마감 전 미처리 입금, 예치금, 환불대기, 세금계산서 예외를 확인합니다."
        />
      )}
    </div>
  )
}
