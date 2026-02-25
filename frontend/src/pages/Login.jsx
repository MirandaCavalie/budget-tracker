// Login page — shown to unauthenticated users

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/login`
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo + brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 14.5L9.5 20L24 6" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Budget Tracker</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Personal finance powered by Gmail + Claude AI
          </p>
        </div>

        {/* Sign in card */}
        <div className="card p-6 shadow-elevated">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4
                       bg-white hover:bg-slate-100 text-slate-900
                       font-semibold text-sm rounded-xl
                       transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-brand-500 focus-visible:ring-offset-2
                       focus-visible:ring-offset-slate-900"
          >
            {/* Google G logo */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              Signing in grants read-only access to your Gmail so the app can
              automatically detect bank transaction emails.
            </p>
          </div>
        </div>

        {/* Features list */}
        <ul className="mt-6 space-y-2.5">
          {[
            ['📧', 'Auto-reads bank notification emails'],
            ['🤖', 'Claude AI extracts transactions'],
            ['📊', 'Dashboard with spending insights'],
            ['🔒', 'Read-only Gmail access, your data stays yours'],
          ].map(([icon, text]) => (
            <li key={text} className="flex items-center gap-2.5 text-xs text-slate-500">
              <span>{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
