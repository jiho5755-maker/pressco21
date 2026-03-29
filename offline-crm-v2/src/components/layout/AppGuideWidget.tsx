import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, LifeBuoy, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_GUIDES, dismissGuide, getGuideForPath, isGuideDismissed } from '@/lib/appGuide'

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

export function AppGuideWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const guide = useMemo(() => getGuideForPath(location.pathname), [location.pathname])
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null)

  const currentStep = guide?.steps[stepIndex] ?? null
  const isTourMode = Boolean(guide && open)
  const showGuideHint = Boolean(guide && !open && !isGuideDismissed(guide.key))

  useEffect(() => {
    setOpen(false)
    setStepIndex(0)
    setHighlightRect(null)
  }, [guide?.key])

  useEffect(() => {
    if (!isTourMode || !currentStep?.selector) {
      setHighlightRect(null)
      return
    }

    const selector = currentStep.selector
    const target = document.querySelector(selector)
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
    }
  }, [currentStep?.selector, isTourMode])

  useEffect(() => {
    if (!isTourMode || !currentStep?.selector) {
      setHighlightRect(null)
      return
    }

    function syncHighlight() {
      const selector = currentStep?.selector
      if (!selector) {
        setHighlightRect(null)
        return
      }
      const target = document.querySelector(selector)
      if (!(target instanceof HTMLElement)) {
        setHighlightRect(null)
        return
      }
      const rect = target.getBoundingClientRect()
      setHighlightRect({
        top: Math.max(0, rect.top - 8),
        left: Math.max(0, rect.left - 8),
        width: rect.width + 16,
        height: rect.height + 16,
      })
    }

    const timer = window.setTimeout(syncHighlight, 80)
    window.addEventListener('resize', syncHighlight)
    window.addEventListener('scroll', syncHighlight, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', syncHighlight)
      window.removeEventListener('scroll', syncHighlight, true)
    }
  }, [currentStep?.selector, isTourMode])

  if (!guide) return null

  return (
    <>
      {isTourMode && highlightRect && (
        <div
          className="pointer-events-none fixed z-40 rounded-2xl border-2 border-[#7d9675] bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.12)] transition-all duration-200"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      )}

      <div className="relative flex w-full flex-col gap-3">
        <div className={`relative rounded-2xl border p-1 shadow-lg backdrop-blur transition-colors ${
          open ? 'border-[#7d9675]/30 bg-[#f5faf4]' : 'border-white/10 bg-white/95'
        }`}>
          {showGuideHint && (
            <>
              <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-[#7d9675]" />
              <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-[#7d9675]/70" />
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between rounded-xl px-4 text-[#1f3323] hover:bg-transparent"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" />
              <span>{open ? '화면 가이드 열림' : '화면 가이드'}</span>
            </span>
            <span className="text-[11px] text-[#5d755f]">
              {open ? '접기' : '열기'}
            </span>
          </Button>
        </div>

        {open && (
          <div className="w-full rounded-2xl border bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#7d9675]">Guide Tour</p>
                <h3 className="mt-1 flex items-center gap-2 text-base font-semibold text-gray-900">
                  <BookOpen className="h-4 w-4 text-[#7d9675]" />
                  {guide.title}
                </h3>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </div>

            <div className="mt-4 rounded-xl border bg-[#f7faf6] px-4 py-3">
              <p className="text-sm text-gray-700">{guide.summary}</p>
            </div>

            <div className="mt-4 rounded-xl border bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#7d9675]">
                  {stepIndex + 1} / {guide.steps.length}
                </p>
                <div className="flex gap-1">
                  {guide.steps.map((step, index) => (
                    <button
                      key={step.title}
                      type="button"
                      className={`h-2.5 w-2.5 rounded-full ${index === stepIndex ? 'bg-[#7d9675]' : 'bg-gray-200'}`}
                      onClick={() => setStepIndex(index)}
                      aria-label={`${index + 1}단계 이동`}
                    />
                  ))}
                </div>
              </div>

              <p className="mt-3 text-sm font-semibold text-gray-900">{currentStep?.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{currentStep?.description}</p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                  disabled={stepIndex === 0}
                >
                  이전
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#7d9675] text-white hover:bg-[#6a8462]"
                  onClick={() => setStepIndex((prev) => Math.min(guide.steps.length - 1, prev + 1))}
                  disabled={stepIndex === guide.steps.length - 1}
                >
                  다음
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-700">빠른 이동</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {APP_GUIDES.map((item) => {
                  const path =
                    item.key === 'deposit-inbox' ? '/deposit-inbox'
                    : item.key === 'receivables' ? '/receivables'
                    : item.key === 'payables' ? '/payables'
                    : item.key === 'customers' ? '/customers'
                    : '/transactions'
                  return (
                    <Button
                      key={item.key}
                      type="button"
                      size="sm"
                      variant={item.key === guide.key ? 'default' : 'outline'}
                      className={item.key === guide.key ? 'bg-[#7d9675] text-white hover:bg-[#6a8462]' : ''}
                      onClick={() => {
                        setStepIndex(0)
                        navigate(path)
                      }}
                    >
                      {item.title.replace(' 가이드', '')}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
            </div>
          </div>
        )}
      </div>
    </>
  )
}
