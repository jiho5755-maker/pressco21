import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getCustomer, getTxHistory, getInvoices, updateCustomer } from '@/lib/api'
import { STATUS_COLORS, CUSTOMER_TYPE_LABELS, GRADE_COLORS } from '@/lib/constants'

const TX_PAGE = 50

// 거래내역 전체 로드 (차트용, 최대 1,000건)
function useCustomerTxAll(name: string | undefined) {
  return useQuery({
    queryKey: ['txHistoryAll', name],
    queryFn: () =>
      getTxHistory({
        where: `(customer_name,eq,${name})~and(tx_type,eq,출고)`,
        sort: '-tx_date',
        limit: 1000,
      }),
    enabled: !!name,
    staleTime: 10 * 60 * 1000,
  })
}

// 거래내역 페이지네이션 (히스토리 탭용)
function useCustomerTxPage(name: string | undefined, offset: number) {
  return useQuery({
    queryKey: ['txHistoryPage', name, offset],
    queryFn: () =>
      getTxHistory({
        where: `(customer_name,eq,${name})~and(tx_type,eq,출고)`,
        sort: '-tx_date',
        limit: TX_PAGE,
        offset,
      }),
    enabled: !!name,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  })
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const customerId = Number(id)
  const queryClient = useQueryClient()
  const [txOffset, setTxOffset] = useState(0)
  const [gradeEditMode, setGradeEditMode] = useState(false)
  const [editGrade, setEditGrade] = useState('')
  const [editQual, setEditQual] = useState('')

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
    enabled: !!customerId,
    staleTime: 10 * 60_000,
  })

  const { mutate: saveGrade, isPending: savingGrade } = useMutation({
    mutationFn: () =>
      updateCustomer(customerId, {
        member_grade: editGrade || undefined,
        grade_qualification: editQual,
        is_ambassador: editGrade === 'AMBASSADOR',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setGradeEditMode(false)
    },
  })

  const { data: txAll } = useCustomerTxAll(customer?.name)
  const { data: txPage } = useCustomerTxPage(customer?.name, txOffset)

  const { data: invoiceData } = useQuery({
    queryKey: ['invoices-customer', customer?.name],
    queryFn: () =>
      getInvoices({
        where: `(customer_name,eq,${customer!.name})`,
        sort: '-invoice_date',
        limit: 50,
      }),
    enabled: !!customer?.name,
  })

  // 연도별 매출 집계 (차트용)
  const chartData = (() => {
    const byYear: Record<string, number> = {}
    txAll?.list.forEach((tx) => {
      const year = (tx.tx_date ?? '').slice(0, 4)
      if (year) byYear[year] = (byYear[year] ?? 0) + (tx.amount ?? 0)
    })
    return Object.entries(byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, amount]) => ({ year, amount }))
  })()

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground flex items-center gap-2">
        <span className="animate-spin">⏳</span> 불러오는 중...
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 목록으로
        </Button>
        <p className="mt-4 text-red-500">고객 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const status = customer.customer_status
  const effectiveGrade = customer.is_ambassador ? 'AMBASSADOR' : (customer.member_grade ?? '')
  const outstandingBalance = (customer.outstanding_balance as number | undefined) ?? 0

  return (
    <div className="p-6">
      {/* 뒤로 가기 */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('/customers')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> 목록으로
      </Button>

      {/* 헤더 */}
      <div className="flex items-start gap-6 mb-6 flex-wrap">
        {/* 이름 + 배지 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{customer.name}</h2>
            {status && STATUS_COLORS[status] && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: STATUS_COLORS[status].bg }}
              >
                {STATUS_COLORS[status].label}
              </span>
            )}
            {effectiveGrade && GRADE_COLORS[effectiveGrade] && (
              <span
                className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: GRADE_COLORS[effectiveGrade].bg, color: GRADE_COLORS[effectiveGrade].text }}
              >
                {effectiveGrade === 'AMBASSADOR' && '★'}
                {GRADE_COLORS[effectiveGrade].label}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {CUSTOMER_TYPE_LABELS[customer.customer_type ?? ''] ?? customer.customer_type ?? '유형 미분류'}
          </p>
        </div>

        {/* 요약 stat 카드 */}
        <div className="flex gap-3 flex-wrap">
          {[
            {
              label: '총 거래 건수',
              value: `${(customer.total_order_count ?? 0).toLocaleString()}건`,
              red: false,
            },
            {
              label: '총 매출',
              value: `${(customer.total_order_amount ?? 0).toLocaleString()}원`,
              red: false,
            },
            {
              label: '미수금',
              value: `${outstandingBalance.toLocaleString()}원`,
              red: outstandingBalance > 0,
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border px-4 py-3 text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
              <p className={`text-lg font-bold ${s.red ? 'text-red-600' : ''}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="history">거래내역</TabsTrigger>
          <TabsTrigger value="chart">매출차트</TabsTrigger>
          <TabsTrigger value="invoices">명세표</TabsTrigger>
        </TabsList>

        {/* ─── 기본정보 ─── */}
        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  { label: '전화', value: customer.phone },
                  { label: '모바일', value: (customer as Record<string, unknown>)['mobile'] as string },
                  { label: '이메일', value: customer.email },
                  { label: '사업자번호', value: (customer as Record<string, unknown>)['business_no'] as string },
                  { label: '주소', value: customer.address1 },
                  { label: '주소2', value: (customer as Record<string, unknown>)['address2'] as string },
                  { label: '최초거래일', value: customer.first_order_date?.slice(0, 10) },
                  { label: '최종거래일', value: customer.last_order_date?.slice(0, 10) },
                  { label: '메모', value: (customer as Record<string, unknown>)['memo'] as string },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
                    <dd className="truncate">{value || '-'}</dd>
                  </div>
                ))}
              </dl>

              {/* 등급 관리 */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">회원 등급</h4>
                  {!gradeEditMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditGrade(effectiveGrade)
                        setEditQual((customer.grade_qualification as string) ?? '')
                        setGradeEditMode(true)
                      }}
                    >
                      변경
                    </Button>
                  )}
                </div>

                {gradeEditMode ? (
                  <div className="space-y-3">
                    <Select value={editGrade} onValueChange={setEditGrade}>
                      <SelectTrigger>
                        <SelectValue placeholder="등급 선택 (없으면 비워두세요)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">등급 없음</SelectItem>
                        {Object.entries(GRADE_COLORS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {k === 'AMBASSADOR' ? `★ ${v.label}` : v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="자격 근거 (예: 파트너 계약 완료 2024-01, VIP 기준 충족)"
                      value={editQual}
                      onChange={(e) => setEditQual(e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveGrade()} disabled={savingGrade}>
                        {savingGrade ? '저장 중...' : '저장'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setGradeEditMode(false)}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    {effectiveGrade && GRADE_COLORS[effectiveGrade] ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: GRADE_COLORS[effectiveGrade].bg, color: GRADE_COLORS[effectiveGrade].text }}
                        >
                          {effectiveGrade === 'AMBASSADOR' && '★'}
                          {GRADE_COLORS[effectiveGrade].label}
                        </span>
                        {(customer.grade_qualification as string) && (
                          <span className="text-muted-foreground text-xs">
                            {customer.grade_qualification as string}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">등급 없음</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 거래내역 ─── */}
        <TabsContent value="history">
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래일</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">적요</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">금액</th>
                </tr>
              </thead>
              <tbody>
                {!txPage?.list?.length && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">
                      거래내역이 없습니다.
                    </td>
                  </tr>
                )}
                {txPage?.list?.map((tx) => (
                  <tr key={tx.Id} className="border-b last:border-b-0">
                    <td className="px-4 py-2.5">{tx.tx_date?.slice(0, 10) ?? '-'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {tx.memo || tx.slip_no || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {(tx.amount ?? 0).toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 페이지네이션 */}
          {txPage && txPage.pageInfo.totalRows > TX_PAGE && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-muted-foreground">
                {txOffset + 1}–{Math.min(txOffset + TX_PAGE, txPage.pageInfo.totalRows)} /{' '}
                {txPage.pageInfo.totalRows}건
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={txOffset === 0}
                  onClick={() => setTxOffset((o) => Math.max(0, o - TX_PAGE))}
                >
                  이전
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={txOffset + TX_PAGE >= txPage.pageInfo.totalRows}
                  onClick={() => setTxOffset((o) => o + TX_PAGE)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── 매출차트 ─── */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">연도별 출고 매출</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">차트 데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 10000)}만`}
                      tick={{ fontSize: 11 }}
                      width={55}
                    />
                    <Tooltip
                      formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()}원`, '출고 매출']}
                    />
                    <Bar dataKey="amount" fill="#7d9675" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                * 출고 건 기준 집계. 최대 1,000건까지 표시됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 명세표 ─── */}
        <TabsContent value="invoices">
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">발행번호</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">발행일</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">공급가</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">합계</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">수금</th>
                </tr>
              </thead>
              <tbody>
                {!invoiceData?.list?.length && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      발행된 명세표가 없습니다.
                    </td>
                  </tr>
                )}
                {invoiceData?.list?.map((inv) => (
                  <tr key={inv.Id} className="border-b last:border-b-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {inv.invoice_no ?? '-'}
                    </td>
                    <td className="px-4 py-2.5">{inv.invoice_date?.slice(0, 10) ?? '-'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {(inv.supply_amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {(inv.total_amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium ${
                          inv.status === 'paid'
                            ? 'text-green-600'
                            : inv.status === 'partial'
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {inv.status === 'paid'
                          ? '완납'
                          : inv.status === 'partial'
                          ? '부분수금'
                          : '미수금'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
