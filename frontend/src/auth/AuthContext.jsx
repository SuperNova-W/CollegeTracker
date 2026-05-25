import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const ACCOUNTS_KEY = 'ct_saved_accounts'
const SESSION_KEY  = 'ct_active_account'

function loadSavedAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') }
  catch { return [] }
}

function saveAccount(account) {
  const list = loadSavedAccounts().filter((a) => a.email !== account.email)
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([account, ...list]))
}

// Dev-mode stub — swap this entire file for Amplify Auth when AWS is ready.
export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [savedAccounts, setSaved]     = useState(loadSavedAccounts)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {}
    setLoading(false)
  }, [])

  /** Sign in as a previously-saved account (account picker flow) */
  const signInAs = (account) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(account))
    setUser(account)
  }

  /** Sign in with Google OAuth (dev stub: asks for a name + email) */
  const signInWithGoogle = (mockAccount) => {
    const account = mockAccount ?? {
      id: `dev-${Date.now()}`,
      name: 'Dev User',
      email: 'dev@localhost',
      picture: null,
    }
    saveAccount(account)
    setSaved(loadSavedAccounts())
    signInAs(account)
  }

  const signOut = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const forgetAccount = (email) => {
    const next = loadSavedAccounts().filter((a) => a.email !== email)
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next))
    setSaved(next)
  }

  return (
    <AuthContext.Provider value={{ user, savedAccounts, loading, signInAs, signInWithGoogle, signOut, forgetAccount }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
