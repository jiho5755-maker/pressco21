import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const menuItems = [
  { path: '/',           label: '대시보드',    icon: '📊' },
  { path: '/customers',  label: '고객 관리',   icon: '👥' },
  { path: '/invoices',   label: '거래명세표',  icon: '📋' },
  { path: '/products',   label: '제품 관리',   icon: '📦' },
  { path: '/suppliers',  label: '공급처',      icon: '🏭' },
  { path: '/transactions', label: '거래 내역', icon: '📈' },
  { path: '/receivables', label: '미수금',     icon: '💰' },
]

export function Sidebar() {
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
        <p className="text-xs text-white/40">Offline CRM v2.0</p>
      </div>
    </aside>
  )
}
