import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { loadActiveWorkOperatorProfile } from '@/lib/settings'
import type { WorkOperatorProfile } from '@/lib/settings'
import { loadAuthSession, logoutAuthSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'

const menuItems = [
  { path: '/',             label: '대시보드',    icon: '📊' },
  { path: '/customers',    label: '고객 관리',   icon: '👥' },
  { path: '/invoices',     label: '명세표 작성',  icon: '📋' },
  { path: '/products',     label: '제품 관리',   icon: '📦' },
  { path: '/suppliers',    label: '공급처',      icon: '🏭' },
  { path: '/transactions', label: '거래/명세표 조회',   icon: '📈' },
  { path: '/receivables',  label: '수금 관리',   icon: '💰' },
  { path: '/payables',     label: '지급 관리',   icon: '💸' },
  { path: '/deposit-inbox', label: '입금 수집함', icon: '🏦' },
  { path: '/calendar',     label: '캘린더',      icon: '📅' },
  { path: '/settings',     label: '설정',        icon: '⚙️' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const [activeOperator, setActiveOperator] = useState<WorkOperatorProfile | null>(() => loadActiveWorkOperatorProfile())
  const [sessionLabel, setSessionLabel] = useState(() => loadAuthSession()?.username ?? '')

  useEffect(() => {
    const refresh = () => {
      setActiveOperator(loadActiveWorkOperatorProfile())
      setSessionLabel(loadAuthSession()?.username ?? '')
    }
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('crm-settings-changed', refresh)
    window.addEventListener('crm-auth-changed', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('crm-settings-changed', refresh)
      window.removeEventListener('crm-auth-changed', refresh)
    }
  }, [])

  function handleLogout() {
    logoutAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="w-60 min-h-screen flex flex-col"
      style={{ backgroundColor: '#1a2e1f', color: '#e8f0e5' }}
    >
      {/* 로고 */}
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-lg font-bold tracking-tight text-white">PRESSCO21</h1>
        <p className="text-xs mt-0.5" style={{ color: '#7d9675' }}>CRM 관리 시스템</p>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: '#7d9675' } : {}
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* 하단 정보 */}
      <div className="px-6 py-4 border-t border-white/10">
        {activeOperator ? (
          <div className="mb-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[11px] text-white/50">현재 로그인 계정</p>
            <p className="mt-0.5 text-xs font-medium text-white">{activeOperator.operatorName}</p>
            <p className="text-[11px] text-white/50">{activeOperator.label}{sessionLabel ? ` · ${sessionLabel}` : ''}</p>
          </div>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="mb-3 w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
        >
          로그아웃
        </Button>
        <p className="text-xs text-white/40">Offline CRM v2.0</p>
      </div>
    </aside>
  )
}
