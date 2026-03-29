import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createSupplier, updateSupplier } from '@/lib/api'
import type { Supplier } from '@/lib/api'
import { formatBusinessNumber, formatPhoneNumber } from '@/lib/formatters'

interface SupplierDialogProps {
  open: boolean
  supplier?: Supplier | null
  onClose: () => void
  onSaved: () => void
}

export function SupplierDialog({ open, supplier, onClose, onSaved }: SupplierDialogProps) {
  const isNew = !supplier
  const [form, setForm] = useState<Partial<Supplier>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      isNew
        ? { is_active: true }
        : {
            ...supplier,
            business_no: formatBusinessNumber(supplier?.business_no),
            phone1: formatPhoneNumber(supplier?.phone1),
            mobile: formatPhoneNumber(supplier?.mobile),
          },
    )
  }, [open, supplier, isNew])

  function set<K extends keyof Supplier>(key: K, value: Supplier[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      toast.warning('상호를 입력해주세요')
      return
    }
    setIsSaving(true)
    try {
      const payload = {
        ...form,
        business_no: formatBusinessNumber(form.business_no),
        phone1: formatPhoneNumber(form.phone1),
        mobile: formatPhoneNumber(form.mobile),
      }
      if (isNew) {
        await createSupplier(payload)
        toast.success('공급처가 등록되었습니다')
      } else {
        await updateSupplier(supplier!.Id, payload)
        toast.success('공급처가 수정되었습니다')
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? '공급처 등록' : '공급처 수정'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">상호 *</Label>
              <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="공급처명" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">대표자</Label>
              <Input value={form.ceo_name ?? ''} onChange={(e) => set('ceo_name', e.target.value)} placeholder="홍길동" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">사업자번호</Label>
              <Input value={form.business_no ?? ''} onChange={(e) => set('business_no', formatBusinessNumber(e.target.value))} placeholder="000-00-00000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">전화</Label>
              <Input value={form.phone1 ?? ''} onChange={(e) => set('phone1', formatPhoneNumber(e.target.value))} placeholder="02-0000-0000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">핸드폰</Label>
              <Input value={form.mobile ?? ''} onChange={(e) => set('mobile', formatPhoneNumber(e.target.value))} placeholder="010-0000-0000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">이메일</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="info@example.com" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">주소</Label>
            <Input value={form.address1 ?? ''} onChange={(e) => set('address1', e.target.value)} placeholder="서울시 ..." className="mt-1" />
          </div>

          <Separator />

          {/* 입금 계좌 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">은행명</Label>
              <Input value={form.bank_name ?? ''} onChange={(e) => set('bank_name', e.target.value)} placeholder="국민은행" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">계좌번호</Label>
              <Input value={form.bank_account ?? ''} onChange={(e) => set('bank_account', e.target.value)} placeholder="000-000-000000" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">메모</Label>
            <Input value={form.memo ?? ''} onChange={(e) => set('memo', e.target.value)} placeholder="기타 사항" className="mt-1" />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => set('is_active', e.target.checked)} className="accent-[#7d9675] w-4 h-4" />
            활성 공급처
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>취소</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#7d9675] hover:bg-[#6a8462] text-white">
              {isSaving ? '저장 중...' : isNew ? '등록' : '수정'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
