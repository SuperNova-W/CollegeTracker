import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function Avatar({ account, size = 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm'
  if (account.picture) {
    return <img src={account.picture} alt="" className={`${dim} rounded-full object-cover`} />
  }
  // Deterministic color from email
  const hue = [...(account.email ?? '')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ background: `hsl(${hue},55%,48%)` }}
    >
      {initials(account.name)}
    </div>
  )
}

// ─── three-dot menu ───────────────────────────────────────────────────────────

function AccountMenu({ onForget, onClose }) {
  return (
    <div
      className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-xl shadow-lg w-44 py-1 text-sm"
      onMouseLeave={onClose}
    >
      <button
        onClick={onForget}
        className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors"
      >
        Remove account
      </button>
      <button onClick={onClose} className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 transition-colors">
        Cancel
      </button>
    </div>
  )
}

// ─── account row ──────────────────────────────────────────────────────────────

function AccountRow({ account, onSelect, onForget }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="relative group">
      <button
        onClick={() => onSelect(account)}
        className="w-full flex items-center gap-4 py-3.5 px-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
      >
        {account.picture ? (
          <img src={account.picture} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
        ) : (
          <Avatar account={account} />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{account.name}</p>
          <p className="text-sm text-slate-500 truncate">{account.email}</p>
          <p className="text-sm text-slate-400">Signed out</p>
        </div>
      </button>

      {/* Three-dot menu */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-slate-200 transition-all text-slate-500 font-bold leading-none"
          aria-label="Account options"
        >
          ⋮
        </button>
        {menuOpen && (
          <AccountMenu
            onForget={() => { onForget(account.email); setMenuOpen(false) }}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

// ─── "use another account" row ────────────────────────────────────────────────

function UseAnotherRow({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 py-3.5 px-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
    >
      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
        <span className="text-2xl text-slate-500 leading-none font-light">+</span>
      </div>
      <span className="text-slate-700 font-medium">Use another account</span>
    </button>
  )
}

// ─── dev sign-in form (shown when "Use another account" is clicked) ────────────

function DevSignInForm({ onSignIn, onCancel }) {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    onSignIn({ id: `user-${Date.now()}`, name: name.trim(), email: email.trim(), picture: null })
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        <strong>Dev mode:</strong> Enter any name &amp; email to simulate Google sign-in.
        Real Google OAuth will replace this when AWS Cognito is connected.
      </div>
      <input
        autoFocus
        type="text"
        placeholder="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8FDAF7]"
      />
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8FDAF7]"
      />
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 text-sm font-semibold bg-[#20BEFF] text-white rounded-xl hover:bg-[#1AABE8] transition-colors"
        >
          Sign in
        </button>
      </div>
    </form>
  )
}

// ─── campus background ────────────────────────────────────────────────────────

function CampusBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Simulated aerial campus photograph via layered CSS */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 30% 60%, rgba(34,197,94,0.35) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 70% 30%, rgba(16,185,129,0.25) 0%, transparent 65%),
            radial-gradient(ellipse 40% 30% at 50% 80%, rgba(5,150,105,0.3) 0%, transparent 60%),
            linear-gradient(160deg, #0a3d1f 0%, #1e3a5f 35%, #0f2d1a 60%, #162032 100%)
          `,
        }}
      />
      {/* Building/road shapes (abstract) */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[15%] left-[8%] w-32 h-20 bg-slate-400 rounded-sm rotate-12" />
        <div className="absolute top-[20%] left-[18%] w-20 h-28 bg-slate-500 rounded-sm -rotate-6" />
        <div className="absolute top-[10%] right-[15%] w-40 h-16 bg-slate-400 rounded-sm rotate-3" />
        <div className="absolute top-[35%] right-[10%] w-24 h-24 bg-slate-500 rounded-sm -rotate-12" />
        <div className="absolute bottom-[20%] left-[12%] w-36 h-14 bg-slate-400 rounded-sm rotate-6" />
        <div className="absolute bottom-[30%] right-[20%] w-28 h-20 bg-slate-500 rounded-sm rotate-2" />
        {/* Roads */}
        <div className="absolute top-[45%] left-0 right-0 h-3 bg-slate-600 opacity-60 -rotate-2" />
        <div className="absolute top-0 bottom-0 left-[42%] w-3 bg-slate-600 opacity-60 rotate-1" />
      </div>
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/10" />
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { user, savedAccounts, signInAs, signInWithGoogle, forgetAccount } = useAuth()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleSelectAccount = (account) => signInAs(account)

  const handleNewSignIn = (account) => {
    signInWithGoogle(account)
    setShowForm(false)
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CampusBackground />

      {/* Card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md px-10 py-10">

        {/* Logo */}
        <div className="mb-8 select-none">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🎓</span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase leading-none">The</p>
              <p className="text-xl font-black tracking-tight text-[#1492C2] leading-tight">COLLEGE</p>
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase leading-none">TRACKER</p>
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          {savedAccounts.length > 0 ? 'Pick an account' : 'Sign in'}
        </h1>

        {/* Account list */}
        {savedAccounts.length > 0 && !showForm && (
          <div className="divide-y divide-slate-100 mb-2">
            {savedAccounts.map((account) => (
              <AccountRow
                key={account.email}
                account={account}
                onSelect={handleSelectAccount}
                onForget={forgetAccount}
              />
            ))}
            <UseAnotherRow onClick={() => setShowForm(true)} />
          </div>
        )}

        {/* First-time / use another account */}
        {(savedAccounts.length === 0 || showForm) && (
          <>
            {savedAccounts.length === 0 && (
              <div className="mb-2">
                <UseAnotherRow onClick={() => setShowForm(true)} />
              </div>
            )}
            {showForm && (
              <DevSignInForm
                onSignIn={handleNewSignIn}
                onCancel={() => setShowForm(savedAccounts.length === 0 ? true : false)}
              />
            )}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-3 mt-4 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-semibold hover:border-[#8FDAF7] hover:bg-[#E8F8FF] transition-all shadow-sm"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-[11px] text-slate-300 mt-8 text-center">
          Secure authentication powered by AWS Cognito &amp; Google OAuth
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
