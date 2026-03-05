import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInvoices } from '@/lib/api'
import type { Invoice } from '@/lib/api'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function padMonth(m: number) {
  return String(m).padStart(2, '0')
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}

function fmt(n: number): string {
  if (n >= 10000) return `${Math.round(n / 10000)}만`
  return n.toLocaleString()
}

export function Calendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const ym = `${year}-${padMonth(month)}`
  const ymPrev = month === 1 ? `${year - 1}-12` : `${year}-${padMonth(month - 1)}`
  const ymNext = month === 12 ? `${year + 1}-01` : `${year}-${padMonth(month + 1)}`

  // 이번 달 명세표 전체 (최대 500건)
  const { data, isLoading } = useQuery({
    queryKey: ['calendarInvoices', ym],
    queryFn: () => getInvoices({
      where: `(invoice_date,gte,${ym}-01)~and(invoice_date,lte,${ym}-31)`,
      limit: 500,
      sort: 'invoice_date',
    }),
    staleTime: 5 * 60_000,
  })

  const invoices = data?.list ?? []

  // 날짜별 집계
  const byDate = useMemo(() => {
    const map: Record<string, { count: number; total: number; list: Invoice[] }> = {}
    invoices.forEach((inv) => {
      const d = inv.invoice_date?.slice(0, 10)
      if (!d) return
      if (!map[d]) map[d] = { count: 0, total: 0, list: [] }
      map[d].count++
      map[d].total += inv.total_amount ?? 0
      map[d].list.push(inv)
    })
    return map
  }, [invoices])

  // 이번 달 요약
  const monthTotal = invoices.reduce((s, inv) => s + (inv.total_amount ?? 0), 0)
  const monthCount = invoices.length

  // 선택된 날짜의 명세표
  const selectedInvoices = selectedDate ? (byDate[selectedDate]?.list ?? []) : []

  // 달력 그리드 생성
  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month)
  const todayStr = today.toISOString().slice(0, 10)

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // 7의 배수로 맞춤
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">캘린더</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {year}년 {month}월 — {monthCount}건 / {monthTotal.toLocaleString()}원
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-24 text-center">
            {year}년 {month}월
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); setSelectedDate(null) }}
          >
            오늘
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 달력 */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden">
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 border-b">
                {DAY_LABELS.map((d, i) => (
                  <div
                    key={d}
                    className={`text-center py-2 text-xs font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'}`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* 날짜 셀 */}
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="min-h-[72px] border-b border-r last:border-r-0 bg-gray-50/50" />
                  }
                  const dateStr = `${year}-${padMonth(month)}-${String(day).padStart(2, '0')}`
                  const entry = byDate[dateStr]
                  const isToday = dateStr === todayStr
                  const isSelected = dateStr === selectedDate
                  const dow = (firstDow + day - 1) % 7

                  return (
                    <div
                      key={dateStr}
                      className={`min-h-[72px] border-b border-r last:border-r-0 p-1.5 cursor-pointer transition-colors
                        ${isSelected ? 'bg-[#e8f0e8]' : 'hover:bg-gray-50'}
                        ${entry ? '' : ''}
                      `}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    >
                      <div
                        className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full
                          ${isToday ? 'bg-[#7d9675] text-white' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : ''}
                        `}
                      >
                        {day}
                      </div>
                      {entry && (
                        <div className="space-y-0.5">
                          <div className="text-xs text-[#3d6b4a] font-medium">{entry.count}건</div>
                          <div className="text-xs text-muted-foreground">{fmt(entry.total)}원</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 사이드 패널: 선택 날짜 명세표 or 월간 요약 */}
        <div className="space-y-3">
          {selectedDate ? (
            <>
              <h3 className="text-sm font-semibold">{selectedDate} 명세표</h3>
              {selectedInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">이날 발행된 명세표가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {selectedInvoices.map((inv) => (
                    <div key={inv.Id} className="bg-white rounded-md border p-2.5 text-xs">
                      <div className="font-medium">{inv.customer_name}</div>
                      <div className="text-muted-foreground mt-0.5 flex justify-between">
                        <span className="font-mono">{inv.invoice_no?.slice(-8)}</span>
                        <span className="font-bold text-[#3d6b4a]">{(inv.total_amount ?? 0).toLocaleString()}원</span>
                      </div>
                      {inv.payment_status === 'unpaid' && (
                        <div className="text-red-500 mt-0.5">미수금</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold">{year}년 {month}월 요약</h3>
              <div className="bg-white rounded-md border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">발행 건수</span>
                  <span className="font-medium">{monthCount}건</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 매출</span>
                  <span className="font-bold text-[#3d6b4a]">{monthTotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">거래일 수</span>
                  <span className="font-medium">{Object.keys(byDate).length}일</span>
                </div>
                {monthCount > 0 && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">건당 평균</span>
                    <span className="font-medium">{Math.round(monthTotal / monthCount).toLocaleString()}원</span>
                  </div>
                )}
              </div>

              {/* 이번 달 거래일 TOP5 */}
              {Object.keys(byDate).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">매출 상위 날짜</h4>
                  <div className="space-y-1.5">
                    {Object.entries(byDate)
                      .sort((a, b) => b[1].total - a[1].total)
                      .slice(0, 5)
                      .map(([date, entry]) => (
                        <div
                          key={date}
                          className="flex justify-between text-xs cursor-pointer hover:text-[#3d6b4a]"
                          onClick={() => setSelectedDate(date)}
                        >
                          <span className="text-muted-foreground">{date.slice(5)}</span>
                          <span>{entry.count}건 / {fmt(entry.total)}원</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 이전/다음 달 빠른 이동 */}
      <div className="flex gap-2 mt-4">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={prevMonth}>
          ← {ymPrev}
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground ml-auto" onClick={nextMonth}>
          {ymNext} →
        </Button>
      </div>
    </div>
  )
}
