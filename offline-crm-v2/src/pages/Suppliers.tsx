import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSuppliers, deleteSupplier } from '@/lib/api'
import type { Supplier } from '@/lib/api'
import { SupplierDialog } from '@/components/SupplierDialog'
import { formatBusinessNumber, formatPhoneNumber } from '@/lib/formatters'

const PAGE_SIZE = 25

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

export function Suppliers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Supplier | null>(null)
  const debouncedSearch = useDebounce(search, 400)

  useEffect(() => setPage(1), [debouncedSearch])

  const params: Record<string, string | number> = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort: 'name',
  }
  if (debouncedSearch.trim()) {
    const safe = debouncedSearch.replace(/[~(),\\]/g, '').trim().slice(0, 100)
    params.where = `(name,like,%${safe}%)~or(ceo_name,like,%${safe}%)~or(business_no,like,%${safe}%)`
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => getSuppliers(params),
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  })

  const suppliers = data?.list ?? []
  const totalRows = data?.pageInfo?.totalRows ?? 0
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const hasActiveFilters = search.trim().length > 0

  function openCreate() {
    setSelected(null)
    setDialogOpen(true)
  }

  function openEdit(s: Supplier) {
    setSelected(s)
    setDialogOpen(true)
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`"${s.name}" 공급처를 삭제하시겠습니까?`)) return
    try {
      await deleteSupplier(s.Id)
      toast.success('공급처가 삭제되었습니다')
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    } catch {
      toast.error('삭제하지 못했습니다. 잠시 후 다시 시도해주세요')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">공급처 관리</h2>
          <p className="mt-1 text-sm text-muted-foreground">총 {totalRows.toLocaleString()}곳</p>
        </div>
        <Button onClick={openCreate} className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1">
          <Plus className="h-4 w-4" />
          공급처 등록
        </Button>
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">조회 조건</p>
              <p className="text-xs text-muted-foreground">
                상호, 대표자, 사업자번호로 공급처를 찾고 연락처와 정산 정보를 빠르게 확인하세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#f4f7f1] px-3 py-1 font-medium text-[#4f6748]">
                현재 {totalRows.toLocaleString()}곳
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                페이지 {page} / {Math.max(totalPages, 1)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,360px)_auto]">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">공급처 검색</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="상호, 대표자, 사업자번호 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-end">
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
                  초기화
                </Button>
              ) : (
                <span className="rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground">
                  전체 공급처 보기
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {isLoading && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-muted-foreground">불러오는 중...</div>
        )}
        {isError && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-red-500">데이터를 불러오지 못했습니다.</div>
        )}
        {!isLoading && !isError && suppliers.length === 0 && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-muted-foreground">
            등록된 공급처가 없습니다. 새 공급처를 만들어보세요.
          </div>
        )}
        {!isLoading && !isError && suppliers.map((s) => (
          <div key={s.Id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-foreground">{s.name ?? '-'}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{s.ceo_name ?? '대표자 없음'}</span>
                  <span>·</span>
                  <span>{formatBusinessNumber(s.business_no) || '사업자번호 없음'}</span>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {formatPhoneNumber(s.phone1 ?? s.mobile) || '-'}
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-[#f8faf7] p-3 text-[11px]">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">이메일</span>
                  <span className="text-right text-foreground">{s.email ?? '-'}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">은행/계좌</span>
                  <span className="text-right text-foreground">
                    {s.bank_name && s.bank_account ? `${s.bank_name} ${s.bank_account}` : '-'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">주소</span>
                  <span className="text-right text-foreground">{s.address1 ?? '-'}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" className="h-8 rounded-lg bg-gray-50 text-xs" onClick={() => openEdit(s)}>
                수정
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg bg-gray-50 text-xs text-red-500 hover:text-red-600"
                onClick={() => handleDelete(s)}
              >
                삭제
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border bg-white md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상호</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">대표자</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">사업자번호</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">전화</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">이메일</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">은행/계좌</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">불러오는 중...</td></tr>
            )}
            {isError && (
              <tr><td colSpan={7} className="text-center py-12 text-red-500">데이터를 불러오지 못했습니다.</td></tr>
            )}
            {!isLoading && !isError && suppliers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  등록된 공급처가 없습니다. 새 공급처를 만들어보세요.
                </td>
              </tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.Id} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.ceo_name ?? '-'}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{formatBusinessNumber(s.business_no) || '-'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatPhoneNumber(s.phone1 ?? s.mobile) || '-'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{s.email ?? '-'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {s.bank_name && s.bank_account ? `${s.bank_name} ${s.bank_account}` : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(s)}>수정</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={() => handleDelete(s)}>삭제</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
            {Math.min(page * PAGE_SIZE, totalRows).toLocaleString()} / {totalRows.toLocaleString()}곳
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
              이전
            </Button>
            <span className="min-w-[60px] px-1 text-center text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
              다음
            </Button>
          </div>
        </div>
      )}

      <SupplierDialog
        open={dialogOpen}
        supplier={selected}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false)
          void qc.invalidateQueries({ queryKey: ['suppliers'] })
        }}
      />
    </div>
  )
}
