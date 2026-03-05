import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createProduct, updateProduct } from '@/lib/api'
import type { Product } from '@/lib/api'

interface ProductDialogProps {
  open: boolean
  product?: Product | null
  onClose: () => void
  onSaved: () => void
}

const TIER_LABELS = [
  { key: 'price1', label: '소매가 (씨앗/MEMBER)', required: true },
  { key: 'price2', label: '강사우대가 (뿌리/INSTRUCTOR)' },
  { key: 'price3', label: '파트너도매가 (꽃밭/PARTNERS)' },
  { key: 'price4', label: 'VIP특가 (정원사/VIP)' },
  { key: 'price5', label: '엠버서더 (별빛/AMBASSADOR)' },
]

export function ProductDialog({ open, product, onClose, onSaved }: ProductDialogProps) {
  const isNew = !product

  const [form, setForm] = useState<Partial<Product>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isNew) {
      setForm({ is_taxable: true, is_active: true })
    } else {
      setForm({ ...product })
    }
  }, [open, product, isNew])

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
            <div>
              <Label className="text-xs">카테고리</Label>
              <Input
                value={form.category ?? ''}
                onChange={(e) => set('category', e.target.value)}
                placeholder="압화, 레진, 캔들 등"
                className="mt-1"
              />
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
            <p className="text-sm font-medium mb-2">단가등급 (ecommerce-business-expert 5등급 체계)</p>
            <div className="space-y-2">
              {TIER_LABELS.map(({ key, label, required }) => (
                <div key={key} className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs text-muted-foreground">{label}{required && ' *'}</Label>
                  <Input
                    type="number"
                    value={(form as Record<string, unknown>)[key] as number ?? ''}
                    onChange={(e) => set(key as keyof Product, Number(e.target.value) as Product[keyof Product])}
                    placeholder="0"
                    className="text-right"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 옵션 */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_taxable ?? true}
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
