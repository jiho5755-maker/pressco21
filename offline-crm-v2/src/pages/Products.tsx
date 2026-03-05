import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getProducts, deleteProduct, sanitizeSearchTerm } from '@/lib/api'
import type { Product } from '@/lib/api'
import { ProductDialog } from '@/components/ProductDialog'

const PAGE_SIZE = 25

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

export function Products() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)

  const debouncedSearch = useDebounce(search, 400)
  useEffect(() => setPage(1), [debouncedSearch])

  const params: Record<string, string | number> = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort: 'name',
  }
  if (debouncedSearch) {
    const safe = sanitizeSearchTerm(debouncedSearch)
    params.where = `(name,like,%${safe}%)~or(product_code,like,%${safe}%)`
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  })

  const totalRows = data?.pageInfo?.totalRows ?? 0
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const products = data?.list ?? []

  function openCreate() {
    setSelected(null)
    setDialogOpen(true)
  }

  function openEdit(p: Product) {
    setSelected(p)
    setDialogOpen(true)
  }

  async function handleDelete(p: Product) {
    if (!confirm(`"${p.name}" 제품을 삭제(비활성화)하시겠습니까?`)) return
    try {
      await deleteProduct(p.Id)
      toast.success('제품이 삭제되었습니다')
      void qc.invalidateQueries({ queryKey: ['products'] })
    } catch {
      toast.error('삭제하지 못했습니다. 잠시 후 다시 시도해주세요')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">제품 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">총 {totalRows.toLocaleString()}개</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1"
        >
          <Plus className="h-4 w-4" />
          제품 등록
        </Button>
      </div>

      {/* 검색 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="품목명 또는 코드 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>초기화</Button>
        )}
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">코드</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">품목명</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">단위</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">소매가(1)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">강사(2)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">파트너(3)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">VIP(4)</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">과세</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">불러오는 중...</td></tr>
            )}
            {isError && (
              <tr><td colSpan={9} className="text-center py-12 text-red-500">데이터를 불러오지 못했습니다.</td></tr>
            )}
            {!isLoading && !isError && products.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground">
                  조건에 맞는 결과가 없습니다. 검색어나 필터를 변경해보세요.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.Id} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                  {p.product_code ?? '-'}
                </td>
                <td className="px-4 py-2.5 font-medium">
                  {p.name}
                  {p.alias && <span className="text-xs text-muted-foreground ml-1">({p.alias})</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.unit ?? '-'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {p.price1 != null ? p.price1.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                  {p.price2 != null ? p.price2.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                  {p.price3 != null ? p.price3.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                  {p.price4 != null ? p.price4.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs ${p.is_taxable ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {p.is_taxable ? '과세' : '면세'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => openEdit(p)}
                    >
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(p)}
                    >
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
            {Math.min(page * PAGE_SIZE, totalRows).toLocaleString()} / {totalRows.toLocaleString()}개
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-1 min-w-[60px] text-center">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        product={selected}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false)
          void qc.invalidateQueries({ queryKey: ['products'] })
        }}
      />
    </div>
  )
}
