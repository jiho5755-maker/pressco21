export interface AuthAccount {
  id: string
  username: string
  password: string
  displayName: string
  operatorProfileId: 'operator-1' | 'operator-2'
  roleLabel: string
}

export interface AuthSession {
  accountId: string
  username: string
  displayName: string
  operatorProfileId: 'operator-1' | 'operator-2'
  roleLabel: string
  loggedInAt: string
}

const AUTH_SESSION_KEY = 'pressco21-crm-auth-session'

const AUTH_ACCOUNTS: AuthAccount[] = [
  {
    id: 'master',
    username: 'pressco21',
    password: '/jang040300',
    displayName: '장지호',
    operatorProfileId: 'operator-1',
    roleLabel: '마스터 계정',
  },
  {
    id: 'staff-lee-jaehyeok',
    username: 'jhl9464',
    password: 'dufgufskadk12!!',
    displayName: '이재혁',
    operatorProfileId: 'operator-2',
    roleLabel: '직원 계정',
  },
]

function dispatchAuthChanged() {
  window.dispatchEvent(new CustomEvent('crm-auth-changed'))
}

export function getAuthAccounts() {
  return AUTH_ACCOUNTS.map(({ password, ...rest }) => rest)
}

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.username || !parsed?.operatorProfileId) return null
    return parsed
  } catch {
    return null
  }
}

export function saveAuthSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(AUTH_SESSION_KEY)
  }
  dispatchAuthChanged()
}

export function loginWithCredentials(username: string, password: string): AuthSession | null {
  const normalizedUsername = username.trim()
  const matchedAccount = AUTH_ACCOUNTS.find(
    (account) => account.username === normalizedUsername && account.password === password,
  )
  if (!matchedAccount) return null
  const session: AuthSession = {
    accountId: matchedAccount.id,
    username: matchedAccount.username,
    displayName: matchedAccount.displayName,
    operatorProfileId: matchedAccount.operatorProfileId,
    roleLabel: matchedAccount.roleLabel,
    loggedInAt: new Date().toISOString(),
  }
  saveAuthSession(session)
  return session
}

export function logoutAuthSession() {
  saveAuthSession(null)
}
