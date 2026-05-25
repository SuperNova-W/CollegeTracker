import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Navigation() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? 'text-[#20BEFF]'
        : 'text-slate-600 hover:text-slate-900'
    }`

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="font-bold text-slate-900 text-lg tracking-tight">CollegeTracker</span>
        </Link>

        {user && (
          <nav className="flex items-center gap-6">
            <NavLink to="/" end className={navLinkClass}>Timeline</NavLink>
            <NavLink to="/my-colleges" className={navLinkClass}>My Colleges</NavLink>
            <NavLink to="/explore" className={navLinkClass}>Explore</NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium bg-[#20BEFF] text-white rounded-lg px-4 py-2 hover:bg-[#1AABE8] transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
