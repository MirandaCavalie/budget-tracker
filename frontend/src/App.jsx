import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Login from './pages/Login'

// ─── Icons ────────────────────────────────────────────────────────────────────
function HomeIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function ListIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}
function ChartIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

const NAV = [
  { to: '/',             end: true,  label: 'Dashboard',    Icon: HomeIcon },
  { to: '/transactions', end: false, label: 'Transactions', Icon: ListIcon },
  { to: '/budgets',      end: false, label: 'Budgets',      Icon: ChartIcon },
]

// ─── User Menu ────────────────────────────────────────────────────────────────
function UserMenu() {
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <div className="flex items-center gap-2 ml-auto">
      {user.picture
        ? <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full ring-1 ring-slate-700" />
        : <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">
            {user.name?.[0] ?? user.email?.[0] ?? '?'}
          </div>
      }
      <span className="text-xs text-slate-400 hidden md:block max-w-[120px] truncate">{user.name || user.email}</span>
      <button
        onClick={logout}
        className="btn-ghost !py-1 !px-2 !text-xs text-slate-500 hover:text-slate-300"
      >
        Sign out
      </button>
    </div>
  )
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────
function TopNav() {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8.5L5.5 12L14 4" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-200 hidden sm:block tracking-tight">Budget Tracker</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-0.5">
          {NAV.map(({ to, end, label, Icon }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive ? 'bg-brand-500/10 text-brand-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <UserMenu />
      </div>
    </header>
  )
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/60">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV.map(({ to, end, label, Icon }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-5 py-2 rounded-lg transition-colors duration-150 ${
                isActive ? 'text-brand-400' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-400' : ''}`} />
                <span className="text-[10px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// ─── Protected route wrapper ──────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <>
      <TopNav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-8">
        {children}
      </main>
      <BottomNav />
    </>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <RequireAuth><Dashboard /></RequireAuth>
      } />
      <Route path="/transactions" element={
        <RequireAuth><Transactions /></RequireAuth>
      } />
      <Route path="/budgets" element={
        <RequireAuth><Budgets /></RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '10px',
                fontSize: '13px',
                fontFamily: '"Plus Jakarta Sans", ui-sans-serif, sans-serif',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#052e1c' } },
              error:   { iconTheme: { primary: '#f43f5e', secondary: '#2d0a14' } },
              loading: { iconTheme: { primary: '#06b6d4', secondary: '#083344' } },
            }}
          />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
