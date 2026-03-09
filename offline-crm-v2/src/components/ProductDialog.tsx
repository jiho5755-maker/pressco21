import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createProduct, updateProduct, getProducts } from '@/lib/api'
import { loadDefaultTaxableSetting } from '@/lib/settings'
import type { Product } from '@/lib/api'

interface ProductDialogProps {
  open: boolean
  product?: Product | null
  onClose: () => void
  onSaved: () => void
}

const SETTINGS_KEY = 'pressco21-crm-settings'

// 설정에서 단가등급 할인율 로드
function loadDiscountRates(): { price2: number; price3: number; price4: number; price5: number } {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      const s = JSON.parse(saved)
      return {
        price2: s.price2_rate ?? 5,
        price3: s.price3_rate ?? 12,
        price4: s.price4_rate ?? 15,
        price5: s.price5_rate ?? 20,
      }
    }
  } catch {}
  return { price2: 5, price3: 12, price4: 15, price5: 20 }
}

// 소매가 기준 할인율 적용 단가 계산
function calcAutoTierPrices(price1: number) {
  const r = loadDiscountRates()
  return {
    price2: Math.round(price1 * (1 - r.price2 / 100)),
    price3: Math.round(price1 * (1 - r.price3 / 100)),
    price4: Math.round(price1 * (1 - r.price4 / 100)),
    price5: Math.round(price1 * (1 - r.price5 / 100)),
  }
}

// 기존 제품에서 카테고리 목록 추출
function useProductCategories(open: boolean) {
  return useQuery({
    queryKey: ['productCategories'],
    queryFn: async () => {
      const result = await getProducts({ limit: 500, sort: 'category' })
      return [...new Set(
        result.list.map((p) => p.category).filter(Boolean) as string[]
      )].sort()
    },
    enabled: open,
    staleTime: 5 * 60_000,
  })
}

const TIER_ROWS = [
  { key: 'price2' as const, label: '강사우대가 (뿌리/INSTRUCTOR)', rateKey: 'price2' as const },
  { key: 'price3' as const, label: '파트너도매가 (꽃밭/PARTNERS)', rateKey: 'price3' as const },
  { key: 'price4' as const, label: 'VIP특가 (정원사/VIP)', rateKey: 'price4' as const },
  { key: 'price5' as const, label: '엠버서더 (별빛/AMBASSADOR)', rateKey: 'price5' as const },
]

export function ProductDialog({ open, product, onClose, onSaved }: ProductDialogProps) {
  const isNew = !product

  const [form, setForm] = useState<Partial<Product>>({})
  const [isSaving, setIsSaving] = useState(false)

  // 카테고리 combobox 상태
  const [categoryInput, setCategoryInput] = useState('')
  const [showCategoryDrop, setShowCategoryDrop] = useState(false)
  const categoryDropRef = useRef<HTMLDivElement>(null)
  const { data: categories = [] } = useProductCategories(open)
  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(categoryInput.toLowerCase())
  )

  useEffect(() => {
    if (!open) return
    if (isNew) {
      setForm({ is_taxable: loadDefaultTaxableSetting(), is_active: true })
      setCategoryInput('')
    } else {
      setForm({ ...product })
      setCategoryInput(product?.category ?? '')
    }
  }, [open, product, isNew])

  // 카테고리 드롭다운 바깥 클릭 닫기
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (categoryDropRef.current && !categoryDropRef.current.contains(e.target as Node)) {
        setShowCategoryDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // 소매가 변경 → 나머지 단가 자동계산
  function handlePrice1Change(value: number) {
    const auto = calcAutoTierPrices(value)
    setForm((prev) => ({ ...prev, price1: value, ...auto }))
  }

  // 할인율 재계산 버튼
  function handleRecalcPrices() {
    const price1 = form.price1 as number | undefined
    if (!price1) {
      toast.warning('소매가를 먼저 입력해주세요')
      return
    }
    const auto = calcAutoTierPrices(price1)
    setForm((prev) => ({ ...prev, ...auto }))
    const r = loadDiscountRates()
    toast.success(
      `재계산 완료 (강사 ${r.price2}%, 파트너 ${r.price3}%, VIP ${r.price4}%, 엠버서더 ${r.price5}% 할인)`
    )
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      toast.warning('품목명을 입력해주세요')
      return
    }
    setIsSaving(true)
    try {
      if (isNew) {
        await createProduct(form)
        toast.success('제품이 등록되었습니다')
      } else {
        await updateProduct(product!.Id, form)
        toast.success('제품이 수정되었습니다')
      }
      onSaved()
    } catch (e) {
      console.error(e)
      toast.error('저장하지 못했습니다. 잠시 후 다시 시도해주세요')
    } finally {
      setIsSaving(false)
    }
  }

  const rates = loadDiscountRates()

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? '제품 등록' : '제품 수정'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">품목명 *</Label>
              <Input
                value={form.name ?? ''}
                onChange={(e) => set('name', e.target.value)}
                placeholder="품목명"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">품목 코드</Label>
              <Input
                value={form.product_code ?? ''}
                onChange={(e) => set('product_code', e.target.value)}
                placeholder="P-001"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">별칭</Label>
              <Input
                value={form.alias ?? ''}
                onChange={(e) => set('alias', e.target.value)}
                placeholder="약칭 또는 별칭"
                className="mt-1"
              />
            </div>

            {/* 카테고리 combobox */}
            <div className="relative" ref={categoryDropRef}>
              <Label className="text-xs">카테고리</Label>
              <Input
                value={categoryInput}
                onChange={(e) => {
                  setCategoryInput(e.target.value)
                  set('category', e.target.value)
                  setShowCategoryDrop(true)
                }}
                onFocus={() => setShowCategoryDrop(true)}
                placeholder="선택 또는 직접 입력"
                className="mt-1"
              />
              {showCategoryDrop && filteredCategories.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-44 overflow-y-auto">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onMouseDown={() => {
                        setCategoryInput(cat)
                        set('category', cat)
                        setShowCategoryDrop(false)
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">단위</Label>
              <Input
                value={form.unit ?? ''}
                onChange={(e) => set('unit', e.target.value)}
                placeholder="개, g, m 등"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">매입가</Label>
              <Input
                type="number"
                value={form.purchase_price ?? ''}
                onChange={(e) => set('purchase_price', Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {/* 단가등급 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">단가등급 (5등급 체계)</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={handleRecalcPrices}
              >
                <RefreshCw className="h-3 w-3" />
                할인율 자동계산
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              소매가 입력 시 나머지 단가가 자동계산됩니다. 직접 수정도 가능합니다.
            </p>

            <div className="space-y-2">
              {/* price1: 소매가 */}
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">소매가 (씨앗/MEMBER) *</Label>
                <Input
                  type="number"
                  value={form.price1 ?? ''}
                  onChange={(e) => handlePrice1Change(Number(e.target.value))}
                  placeholder="0"
                  className="text-right"
                />
              </div>

              {/* price2~5: 자동계산 표시 */}
              {TIER_ROWS.map(({ key, label, rateKey }) => {
                const rate = rates[rateKey]
                const price1Val = form.price1 as number | undefined
                const expectedAuto = price1Val ? Math.round(price1Val * (1 - rate / 100)) : null
                const currentVal = form[key] as number | undefined
                const isAuto = expectedAuto !== null && currentVal === expectedAuto
                return (
                  <div key={key} className="grid grid-cols-2 gap-2 items-center">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      {isAuto && (
                        <span className="text-xs px-1 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                          자동 {rate}%↓
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      value={currentVal ?? ''}
                      onChange={(e) => set(key, Number(e.target.value) as Product[typeof key])}
                      placeholder="0"
                      className="text-right"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* 옵션 */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.is_taxable)}
                onChange={(e) => set('is_taxable', e.target.checked)}
                className="accent-[#7d9675] w-4 h-4"
              />
              과세 (10%)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) => set('is_active', e.target.checked)}
                className="accent-[#7d9675] w-4 h-4"
              />
              판매 활성
            </label>
          </div>

          {/* 액션 */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>취소</Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#7d9675] hover:bg-[#6a8462] text-white"
            >
              {isSaving ? '저장 중...' : isNew ? '등록' : '수정'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
