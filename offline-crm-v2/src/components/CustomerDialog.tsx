import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { createCustomer, updateCustomer } from '@/lib/api'
import type { Customer } from '@/lib/api'
import { CUSTOMER_TYPE_LABELS, GRADE_COLORS } from '@/lib/constants'

interface CustomerDialogProps {
  open: boolean
  customer?: Customer | null
  onClose: () => void
  onSaved: () => void
}

const STATUS_OPTIONS = ['ACTIVE', 'DORMANT', 'CHURNED']
const STATUS_LABELS: Record<string, string> = { ACTIVE: '활성', DORMANT: '휴면', CHURNED: '이탈' }

export function CustomerDialog({ open, customer, onClose, onSaved }: CustomerDialogProps) {
  const isNew = !customer
  const [form, setForm] = useState<Partial<Customer>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(isNew ? { customer_status: 'ACTIVE', price_tier: 1 } : { ...customer })
  }, [open, customer, isNew])

  function set<K extends keyof Customer>(key: K, value: Customer[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      toast.warning('거래처명을 입력해주세요')
      return
    }
    setIsSaving(true)
    try {
      if (isNew) {
        await createCustomer(form)
        toast.success('고객이 등록되었습니다')
      } else {
        await updateCustomer(customer!.Id, form)
        toast.success('고객 정보가 수정되었습니다')
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
          <DialogTitle>{isNew ? '새 고객 등록' : '고객 정보 수정'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">거래처명 *</Label>
              <Input
                value={form.name ?? ''}
                onChange={(e) => set('name', e.target.value)}
                placeholder="거래처명"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">전화</Label>
              <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="02-0000-0000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">핸드폰</Label>
              <Input value={form.mobile ?? ''} onChange={(e) => set('mobile', e.target.value)} placeholder="010-0000-0000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">이메일</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="example@email.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">고객 유형</Label>
              <Select value={form.customer_type ?? ''} onValueChange={(v) => set('customer_type', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="유형 선택" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">주소</Label>
            <Input value={form.address1 ?? ''} onChange={(e) => set('address1', e.target.value)} placeholder="주소" className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">고객 상태</Label>
              <Select value={form.customer_status ?? 'ACTIVE'} onValueChange={(v) => set('customer_status', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">단가등급</Label>
              <Select
                value={String(form.price_tier ?? 1)}
                onValueChange={(v) => set('price_tier', Number(v))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1등급 - 씨앗 (소매가)</SelectItem>
                  <SelectItem value="2">2등급 - 뿌리 (인스트럭터)</SelectItem>
                  <SelectItem value="3">3등급 - 꽃밭 (파트너스)</SelectItem>
                  <SelectItem value="4">4등급 - 정원사 (VIP)</SelectItem>
                  <SelectItem value="5">5등급 - 별빛 (엠버서더)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">회원 등급</Label>
              <Select value={form.member_grade ?? ''} onValueChange={(v) => set('member_grade', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="등급 선택" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GRADE_COLORS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* 사업자 정보 */}
          <p className="text-xs text-muted-foreground">전자세금계산서용 (선택)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">사업자번호</Label>
              <Input value={form.biz_no ?? ''} onChange={(e) => set('biz_no', e.target.value)} placeholder="000-00-00000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">대표자</Label>
              <Input value={form.ceo_name ?? ''} onChange={(e) => set('ceo_name', e.target.value)} placeholder="홍길동" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">업태</Label>
              <Input value={form.biz_type ?? ''} onChange={(e) => set('biz_type', e.target.value)} placeholder="도소매" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">종목</Label>
              <Input value={form.biz_item ?? ''} onChange={(e) => set('biz_item', e.target.value)} placeholder="꽃 공예 재료" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">메모</Label>
            <Input value={form.memo ?? ''} onChange={(e) => set('memo', e.target.value)} placeholder="기타 사항" className="mt-1" />
          </div>

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
