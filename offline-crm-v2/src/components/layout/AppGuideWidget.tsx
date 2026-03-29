import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Crosshair, LifeBuoy, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { APP_GUIDES, dismissGuide, getGuideForPath, isGuideDismissed } from '@/lib/appGuide'

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

interface GuideBubblePosition {
  top: number
  left: number
  side: 'right' | 'left' | 'bottom'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getGuideBubblePosition(rect: HighlightRect): GuideBubblePosition {
  const bubbleWidth = 296
  const bubbleHeight = 170
  const gap = 14
  const margin = 16
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (viewportWidth - (rect.left + rect.width) >= bubbleWidth + gap + margin) {
    return {
      side: 'right',
      left: rect.left + rect.width + gap,
      top: clamp(rect.top + rect.height / 2 - bubbleHeight / 2, margin, viewportHeight - bubbleHeight - margin),
    }
  }

  if (rect.left >= bubbleWidth + gap + margin) {
    return {
      side: 'left',
      left: rect.left - bubbleWidth - gap,
      top: clamp(rect.top + rect.height / 2 - bubbleHeight / 2, margin, viewportHeight - bubbleHeight - margin),
    }
  }

  return {
    side: 'bottom',
    left: clamp(rect.left + rect.width / 2 - bubbleWidth / 2, margin, viewportWidth - bubbleWidth - margin),
    top: clamp(rect.top + rect.height + gap, margin, viewportHeight - bubbleHeight - margin),
  }
}

function getHighlightRect(selector?: string): HighlightRect | null {
  if (!selector) return null
  const target = document.querySelector(selector)
  if (!(target instanceof HTMLElement)) return null
  const rect = target.getBoundingClientRect()
  return {
    top: Math.max(0, rect.top - 8),
    left: Math.max(0, rect.left - 8),
    width: rect.width + 16,
    height: rect.height + 16,
  }
}

export function AppGuideWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const guide = useMemo(() => getGuideForPath(location.pathname), [location.pathname])
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null)
  const [focusMode, setFocusMode] = useState(false)

  const currentStep = guide?.steps[stepIndex] ?? null
  const showGuideHint = Boolean(guide && !open && !isGuideDismissed(guide.key))

  useEffect(() => {
    setOpen(false)
    setStepIndex(0)
    setFocusMode(false)
    setHighlightRect(null)
  }, [guide?.key])

  useEffect(() => {
    if (!focusMode || !currentStep?.selector) {
      setHighlightRect(null)
      return
    }

    const selector = currentStep.selector
    const target = document.querySelector(selector)
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
    }
    const timer = window.setTimeout(() => {
      setHighlightRect(getHighlightRect(selector))
    }, 120)
    return () => window.clearTimeout(timer)
  }, [currentStep?.selector, focusMode])

  useEffect(() => {
    if (!focusMode || !currentStep?.selector) {
      setHighlightRect(null)
      return
    }

    const selector = currentStep.selector

    function syncHighlight() {
      setHighlightRect(getHighlightRect(selector))
    }

    window.addEventListener('resize', syncHighlight)
    window.addEventListener('scroll', syncHighlight, true)
    return () => {
      window.removeEventListener('resize', syncHighlight)
      window.removeEventListener('scroll', syncHighlight, true)
    }
  }, [currentStep?.selector, focusMode])

  if (!guide) return null

  const otherGuides = APP_GUIDES.filter((item) => item.key !== guide.key)
  const bubblePosition = highlightRect ? getGuideBubblePosition(highlightRect) : null

  return (
    <>
      {focusMode && highlightRect && (
        <>
          <div
            data-guide-id="guide-focus-highlight"
            className="pointer-events-none fixed z-40 rounded-2xl border-2 border-[#7d9675] bg-[#edf6ea]/30 shadow-[0_0_0_3px_rgba(125,150,117,0.15)] transition-all duration-200"
            style={{
              top: highlightRect.top,
              left: highlightRect.left,
              width: highlightRect.width,
              height: highlightRect.height,
            }}
          />

          {bubblePosition && currentStep && (
            <div
              data-guide-id="guide-focus-bubble"
              className="fixed z-50 w-[296px] rounded-2xl border border-[#d8e4d6] bg-white p-4 shadow-2xl"
              style={{
                top: bubblePosition.top,
                left: bubblePosition.left,
              }}
            >
              <span
                className={`absolute h-3 w-3 rotate-45 border border-[#d8e4d6] bg-white ${
                  bubblePosition.side === 'right'
                    ? '-left-1.5 top-10 border-r-0 border-t-0'
                    : bubblePosition.side === 'left'
                      ? '-right-1.5 top-10 border-b-0 border-l-0'
                      : '-top-1.5 left-10 border-b-0 border-r-0'
                }`}
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7d9675]">Guide Focus</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{currentStep.title}</p>
                </div>
                <span className="rounded-full bg-[#edf6ea] px-2 py-1 text-[11px] font-medium text-[#3d6b4a]">
                  {stepIndex + 1}/{guide.steps.length}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{currentStep.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!open && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
                    도움말 열기
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  data-guide-id="guide-focus-close"
                  className="ml-auto text-muted-foreground"
                  onClick={() => {
                    setFocusMode(false)
                    setHighlightRect(null)
                  }}
                >
                  강조 끄기
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="w-full">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/95 px-4 py-3 text-left shadow-lg transition hover:border-[#7d9675]/40 hover:bg-[#f6faf5]"
        >
          {showGuideHint && (
            <>
              <span className="absolute right-3 top-3 inline-flex h-2.5 w-2.5 rounded-full bg-[#7d9675]" />
              <span className="absolute right-3 top-3 inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-[#7d9675]/70" />
            </>
          )}
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf6ea] text-[#3d6b4a]">
              <LifeBuoy className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#1f3323]">화면 도움말</span>
              <span className="block truncate text-[11px] text-[#5d755f]">{guide.title.replace(' 가이드', '')}</span>
            </span>
          </span>
          <span className="text-[11px] font-medium text-[#5d755f]">열기</span>
        </button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setFocusMode(false)
            setHighlightRect(null)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="left-auto right-0 top-0 flex h-screen max-h-screen w-full max-w-[440px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-l p-0 sm:rounded-none"
        >
          <DialogHeader className="border-b px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7d9675]">Help Drawer</p>
                <DialogTitle className="mt-1 flex items-center gap-2 text-lg text-gray-900">
                  <BookOpen className="h-4 w-4 text-[#7d9675]" />
                  {guide.title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6">
                  {guide.summary}
                </DialogDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="rounded-2xl border bg-[#f7faf6] p-4">
              <p className="text-xs font-medium text-[#5d755f]">이 화면에서 많이 하는 일</p>
              <p className="mt-1 text-sm text-gray-700">
                단계는 오른쪽 도움말에서 먼저 읽고, 필요한 순간에만 `화면에서 보기`를 눌러 위치를 확인하는 방식입니다.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {guide.steps.map((step, index) => {
                const isActive = index === stepIndex
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setStepIndex(index)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-[#7d9675]/40 bg-[#f5faf4]'
                        : 'border-gray-200 bg-white hover:border-[#7d9675]/30 hover:bg-[#fafcf9]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isActive ? 'bg-[#7d9675] text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900">{step.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{step.description}</span>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#5d755f]">현재 선택한 단계</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{currentStep?.title}</p>
                </div>
                <span className="rounded-full bg-[#edf6ea] px-2.5 py-1 text-[11px] font-medium text-[#3d6b4a]">
                  {stepIndex + 1} / {guide.steps.length}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentStep?.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {currentStep?.selector ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 bg-[#7d9675] text-white hover:bg-[#6a8462]"
                    onClick={() => {
                      setFocusMode(true)
                      setOpen(false)
                    }}
                  >
                    <Crosshair className="h-4 w-4" />
                    화면에서 보기
                  </Button>
                ) : null}
                {focusMode && (
                  <span className="inline-flex items-center rounded-full bg-[#edf6ea] px-2.5 py-1 text-[11px] text-[#3d6b4a]">
                    화면 옆 말풍선으로 위치 안내 중
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-4">
              <p className="text-xs font-medium text-[#5d755f]">빠른 이동</p>
              <div className="mt-3 space-y-2">
                {otherGuides.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setStepIndex(0)
                      setFocusMode(false)
                      setHighlightRect(null)
                      navigate(item.path)
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-left text-sm text-gray-700 transition hover:border-[#7d9675]/30 hover:bg-[#fafcf9]"
                  >
                    <span>{item.title.replace(' 가이드', '')}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-muted-foreground"
                onClick={() => {
                  dismissGuide(guide.key)
                  setOpen(false)
                  setFocusMode(false)
                  setHighlightRect(null)
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                이 화면은 다시 숨기기
              </Button>
              <p className="text-[11px] text-muted-foreground">
                본문을 막지 않고 필요할 때만 열리는 도움말 방식입니다.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
