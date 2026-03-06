import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getProducts } from '@/lib/api'
import type { Product, Customer } from '@/lib/api'

interface ProductPickerDialogProps {
  open: boolean
  customer?: Customer | null
  onClose: () => void
  onSelect: (product: Product) => void
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

export function ProductPickerDialog({ open, customer, onClose, onSelect }: ProductPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const tier = customer?.price_tier ?? 1

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

  // 검색 + 카테고리 필터 제품 목록
  const { data, isLoading } = useQuery({
    queryKey: ['productPicker', search, selectedCategory],
    queryFn: () => {
      const conditions: string[] = []
      if (search) conditions.push(`(name,like,%${search}%)`)
      if (selectedCategory) conditions.push(`(category,eq,${selectedCategory})`)
      const where =
        conditions.length === 0
          ? undefined
          : conditions.length === 1
          ? conditions[0]
          : conditions.join('~and')
      return getProducts({
        limit: 300,
        sort: 'category',
        ...(where ? { where } : {}),
      })
    },
    enabled: open,
    staleTime: 60 * 1000,
  })

  const products = data?.list ?? []

  function handleSelect(product: Product) {
    onSelect(product)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base">품목 선택</DialogTitle>
        </DialogHeader>

        {/* 검색 + 카테고리 필터 */}
        <div className="px-6 pb-3 space-y-2 flex-none">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              placeholder="품목명으로 검색..."
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.map((p) => {
                const price = getPriceForTier(p, tier)
                return (
                  <button
                    key={p.Id}
                    onClick={() => handleSelect(p)}
                    className="text-left p-3 rounded-lg border hover:border-[#7d9675] hover:bg-[#f5f8f5] transition-colors group"
                  >
                    {p.category && (
                      <p className="text-xs text-muted-foreground mb-0.5 truncate">{p.category}</p>
                    )}
                    <p className="font-medium text-sm leading-tight group-hover:text-[#3d6b4a]">{p.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs font-semibold text-[#3d6b4a]">{price.toLocaleString()}원</p>
                      {p.unit && <p className="text-xs text-muted-foreground">/{p.unit}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 하단 안내 */}
        <div className="px-6 py-3 border-t flex-none">
          <p className="text-xs text-muted-foreground">
            {tier > 1
              ? `${TIER_LABELS[tier] ?? tier}등급 단가 기준 (price${tier}) · ${products.length}개 표시`
              : `소매가 기준 · ${products.length}개 표시`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
