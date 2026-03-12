import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAuthAccounts, loadAuthSession, loginWithCredentials } from '@/lib/auth'

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const session = loadAuthSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectPath = useMemo(() => {
    const redirect = searchParams.get('redirect')
    if (redirect && redirect.startsWith('/')) return redirect
    return '/'
  }, [searchParams])

  if (session) {
    return <Navigate to={redirectPath} replace />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const nextSession = loginWithCredentials(username, password)
      if (!nextSession) {
        toast.error('아이디 또는 비밀번호가 올바르지 않습니다')
        return
      }
      toast.success(`${nextSession.roleLabel}로 로그인되었습니다`)
      navigate(redirectPath, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  const accountHints = getAuthAccounts()

  return (
    <div className="min-h-screen bg-[#f5f7f2] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h1 className="text-2xl font-bold text-[#1a2e1f]">PRESSCO21 로그인</h1>
          <p className="mt-1 text-sm text-muted-foreground">로그인한 계정명으로 수금/지급 저장 로그가 기록됩니다.</p>
        </div>
        <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="login-username">아이디</Label>
            <Input
              id="login-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">비밀번호</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#7d9675] hover:bg-[#6a8462] text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </Button>
          <div className="rounded-lg border bg-[#f8faf7] px-4 py-3 text-xs text-muted-foreground">
            <div className="font-medium text-[#1a2e1f]">사용 가능 계정</div>
            <div className="mt-2 space-y-1">
              {accountHints.map((account) => (
                <div key={account.id}>
                  {account.roleLabel} · {account.displayName} · {account.username}
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
