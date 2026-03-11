import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, LifeBuoy, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { APP_GUIDES, dismissGuide, getGuideForPath, isGuideDismissed } from '@/lib/appGuide'

export function AppGuideWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const guide = useMemo(() => getGuideForPath(location.pathname), [location.pathname])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!guide) return
    if (isGuideDismissed(guide.key)) return
    const timer = window.setTimeout(() => setOpen(true), 300)
    return () => window.clearTimeout(timer)
  }, [guide])

  if (!guide) return null

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        <div className="rounded-full border bg-white/95 p-1 shadow-lg backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 rounded-full px-4"
            onClick={() => setOpen(true)}
          >
            <LifeBuoy className="h-4 w-4" />
            화면 가이드
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#7d9675]" />
              {guide.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-[#f7faf6] px-4 py-3">
              <p className="text-sm text-gray-700">{guide.summary}</p>
            </div>

            <div className="space-y-3">
              {guide.steps.map((step) => (
                <div key={step.title} className="rounded-lg border bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-700">빠른 이동</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {APP_GUIDES.map((item) => {
                  const path =
                    item.key === 'receivables' ? '/receivables' :
                    item.key === 'payables' ? '/payables' :
                    item.key === 'customers' ? '/customers' :
                    '/transactions'
                  return (
                    <Button
                      key={item.key}
                      type="button"
                      size="sm"
                      variant={item.key === guide.key ? 'default' : 'outline'}
                      className={item.key === guide.key ? 'bg-[#7d9675] text-white hover:bg-[#6a8462]' : ''}
                      onClick={() => {
                        setOpen(false)
                        navigate(path)
                      }}
                    >
                      {item.title.replace(' 가이드', '')}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="gap-2"
                onClick={() => {
                  dismissGuide(guide.key)
                  setOpen(false)
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                이 화면은 다시 숨기기
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
