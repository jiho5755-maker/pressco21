import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { loadAuthSession } from '@/lib/auth'

export function RequireAuth() {
  const location = useLocation()
  const session = loadAuthSession()

  if (!session) {
    const redirect = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  return <Outlet />
}
