import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getSuppliers, deleteSupplier } from '@/lib/api'
import type { Supplier } from '@/lib/api'
import { SupplierDialog } from '@/components/SupplierDialog'

export function Suppliers() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Supplier | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => getSuppliers({ limit: 100, sort: 'name' }),
    staleTime: 10 * 60_000,
  })

  const suppliers = data?.list ?? []

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">공급처 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">총 {suppliers.length}곳</p>
        </div>
        <Button onClick={openCreate} className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1">
          <Plus className="h-4 w-4" />
          공급처 등록
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
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
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{s.business_no ?? '-'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{s.phone1 ?? s.mobile ?? '-'}</td>
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
