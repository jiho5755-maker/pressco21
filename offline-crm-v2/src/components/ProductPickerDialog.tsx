import { useState, useEffect, useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Search, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getProducts, sanitizeSearchTerm } from '@/lib/api'
import type { Product, Customer } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'

const PAGE_SIZE = 100

interface ProductPickerDialogProps {
  open: boolean
  customer?: Customer | null
  multiSelect?: boolean
  onClose: () => void
  onSelect: (product: Product) => void
  onMultiSelect?: (products: Product[]) => void
}

// 고객 단가등급에 맞는 단가 반환
function getPriceForTier(product: Product, tier: number): number {
  const key = `price${tier}` as keyof Product
  const price = product[key]
  if (typeof price === 'number') return price
  return product.price1 ?? 0
}

const TIER_LABELS: Record<number, string> = {
  1: '씨앗', 2: '뿌리', 3: '꽃밭', 4: '정원사', 5: '별빛',
}

export function ProductPickerDialog({
  open,
  customer,
  multiSelect = false,
  onClose,
  onSelect,
  onMultiSelect,
}: ProductPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selected, setSelected] = useState<Map<number, Product>>(new Map())
  const tier = customer?.price_tier ?? 1
  const debouncedSearch = useDebounce(search, 250)

  // 다이얼로그 열릴 때 상태 리셋
  useEffect(() => {
    if (open) {
      setSearch('')
      setSelectedCategory('')
      setSelected(new Map())
    }
  }, [open])

  // 카테고리 목록 (캐시 5분)
  const { data: categories = [] } = useQuery({
    queryKey: ['productPickerCategories'],
    queryFn: () =>
      getProducts({ limit: 500, sort: 'category' }).then((r) =>
        [...new Set(r.list.map((p) => p.category).filter(Boolean) as string[])].sort(),
      ),
    enabled: open,
    staleTime: 5 * 60_000,
  })

  // 무한 스크롤 제품 목록 (offset 페이지네이션)
  const buildWhere = useMemo(() => {
    const q = sanitizeSearchTerm(debouncedSearch)
    const searchCond = q ? `(name,like,%${q}%)~or(product_code,like,%${q}%)` : null
    const catCond = selectedCategory ? `(category,eq,${selectedCategory})` : null
    return [searchCond, catCond].filter(Boolean).join('~and') || undefined
  }, [debouncedSearch, selectedCategory])

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['productPickerInfinite', buildWhere],
    queryFn: ({ pageParam }) =>
      getProducts({
        limit: PAGE_SIZE,
        offset: pageParam,
        sort: 'category',
        ...(buildWhere ? { where: buildWhere } : {}),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.pageInfo.isLastPage || lastPage.list.length < PAGE_SIZE) return undefined
      return lastPageParam + PAGE_SIZE
    },
    enabled: open,
    staleTime: 60 * 1000,
  })

  const products = useMemo(
    () => data?.pages.flatMap((p) => p.list) ?? [],
    [data],
  )
  const totalRows = data?.pages[0]?.pageInfo?.totalRows ?? products.length

  function toggleSelect(product: Product) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(product.Id)) {
        next.delete(product.Id)
      } else {
        next.set(product.Id, product)
      }
      return next
    })
  }

  function handleSingleSelect(product: Product) {
    if (multiSelect) {
      toggleSelect(product)
    } else {
      onSelect(product)
      onClose()
    }
  }

  function handleConfirm() {
    if (selected.size === 0) return
    onMultiSelect?.([...selected.values()])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base flex items-center gap-2">
            품목 선택
            {multiSelect && (
              <span className="text-xs font-normal text-muted-foreground">
                (복수 선택 가능 — 클릭으로 선택 후 확인)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 검색 + 카테고리 필터 */}
        <div className="px-6 pb-3 space-y-2 flex-none">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              placeholder="품목명 또는 품목코드로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 카테고리 칩 - 수평 스크롤 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 flex-nowrap">
            <button
              onClick={() => setSelectedCategory('')}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap flex-none transition-colors ${
                selectedCategory === ''
                  ? 'bg-[#7d9675] text-white border-[#7d9675]'
                  : 'bg-white text-muted-foreground border-border hover:border-[#7d9675]'
              }`}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap flex-none transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#7d9675] text-white border-[#7d9675]'
                    : 'bg-white text-muted-foreground border-border hover:border-[#7d9675]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 제품 그리드 - 스크롤 영역 */}
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          {isLoading ? (
            <p className="text-center py-12 text-muted-foreground">불러오는 중...</p>
          ) : products.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">검색 결과가 없습니다.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {products.map((p) => {
                  const price = getPriceForTier(p, tier)
                  const isSelected = selected.has(p.Id)
                  return (
                    <button
                      key={p.Id}
                      onClick={() => handleSingleSelect(p)}
                      className={`text-left p-3 rounded-lg border transition-colors group relative ${
                        isSelected
                          ? 'border-[#7d9675] bg-[#f0f4f0] ring-1 ring-[#7d9675]'
                          : 'hover:border-[#7d9675] hover:bg-[#f5f8f5]'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 bg-[#7d9675] text-white rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <div className="flex items-center gap-1 mb-0.5">
                        {p.category && (
                          <span className="text-xs text-muted-foreground truncate">{p.category}</span>
                        )}
                        {p.product_code && (
                          <span className="bg-gray-100 text-gray-500 px-1 py-0.5 rounded text-[10px] font-mono flex-none">
                            {p.product_code}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm leading-tight group-hover:text-[#3d6b4a]">{p.name}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs font-semibold text-[#3d6b4a]">{price.toLocaleString()}원</p>
                        {p.unit && <p className="text-xs text-muted-foreground">/{p.unit}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* 더 보기 버튼 */}
              {hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-xs"
                  >
                    {isFetchingNextPage ? '불러오는 중...' : `더 보기 (${products.length}/${totalRows})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 하단 안내 + 복수 선택 확인 */}
        <div className="px-6 py-3 border-t flex-none flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {tier > 1
              ? `${TIER_LABELS[tier] ?? tier}등급 단가 기준 (price${tier})`
              : `소매가 기준`}
            {' · '}
            {totalRows > products.length
              ? `전체 ${totalRows.toLocaleString()}개 중 ${products.length}개 표시`
              : `${products.length}개 표시`}
          </p>
          {multiSelect && (
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={() => setSelected(new Map())}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  선택 초기화
                </button>
              )}
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className="bg-[#7d9675] hover:bg-[#6a8462] text-white text-xs h-8"
              >
                {selected.size}개 선택 완료
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
