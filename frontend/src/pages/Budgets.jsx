import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createBudget, deleteBudget, getBudgets, updateBudget } from '../api'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'groceries','transport','restaurants','entertainment',
  'utilities','transfer','salary','shopping','health','education','other',
]
const CATEGORY_ICONS = {
  groceries:'🛒', transport:'🚌', restaurants:'🍽️', entertainment:'🎬',
  utilities:'💡', transfer:'↔️', salary:'💼', shopping:'🛍️',
  health:'🏥', education:'📚', other:'💰',
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ className }) { return <div className={`skeleton ${className}`} /> }

// ─── Add Budget Modal ─────────────────────────────────────────────────────────
function AddBudgetModal({ existing, onClose, onSaved }) {
  const usedCats = new Set(existing.map(b => b.category))
  const available = CATEGORIES.filter(c => !usedCats.has(c))

  const [category, setCategory] = useState(available[0] ?? CATEGORIES[0])
  const [limit,    setLimit]    = useState('')
  const [currency, setCurrency] = useState('PEN')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = parseFloat(limit)
    if (!val || val <= 0) return setError('Enter a valid amount')
    setSaving(true)
    setError('')
    try {
      const b = await createBudget({ category, monthly_limit: val, currency })
      onSaved(b)
      toast.success(`Budget set for ${category}`)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create budget')
    } finally {
      setSaving(false)
    }
  }

  if (available.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 text-center shadow-elevated">
          <p className="text-sm text-slate-400 mb-4">All categories have budgets set.</p>
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-elevated animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">Set Monthly Budget</h2>
          <button onClick={onClose} className="btn-ghost !p-1.5"><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input capitalize">
              {available.map(c => (
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Monthly Limit</label>
              <input
                type="number" min="0" step="0.01" placeholder="e.g. 500"
                value={limit} onChange={e => setLimit(e.target.value)}
                className="input nums"
              />
            </div>
            <div className="w-24">
              <label className="label">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Budget Card ──────────────────────────────────────────────────────────────
function BudgetCard({ budget, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [limit,   setLimit]   = useState(budget.monthly_limit)
  const [saving,  setSaving]  = useState(false)

  const pct      = Math.min((budget.monthly_limit > 0 ? 0 : 0), 100) // 0 spent shown in card
  const isOver   = pct >= 100
  const isWarn   = pct >= 75
  const barColor = isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-brand-500'
  const ringColor = isOver ? 'border-rose-500/20' : isWarn ? 'border-amber-500/20' : 'border-slate-800'

  const handleSave = async () => {
    const val = parseFloat(limit)
    if (!val || val <= 0) return
    setSaving(true)
    try {
      const updated = await updateBudget(budget.id, { monthly_limit: val })
      onUpdated(updated)
      toast.success('Budget updated')
      setEditing(false)
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remove budget for "${budget.category}"?`)) return
    try {
      await deleteBudget(budget.id)
      onDeleted(budget.id)
      toast.success('Budget removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  return (
    <div className={`card p-4 border ${ringColor} hover:border-slate-700 transition-colors group`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CATEGORY_ICONS[budget.category]}</span>
          <span className="text-sm font-semibold text-slate-200 capitalize">{budget.category}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(!editing)}
            className="btn-ghost !p-1.5 text-slate-500 hover:text-slate-300"
          >
            <PencilIcon />
          </button>
          <button
            onClick={handleDelete}
            className="btn-ghost !p-1.5 text-rose-600 hover:text-rose-400 hover:bg-rose-500/10"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Limit display / edit */}
      {editing ? (
        <div className="flex gap-2 mb-3">
          <input
            type="number" min="0" step="0.01"
            value={limit} onChange={e => setLimit(e.target.value)}
            className="input !py-1.5 !text-xs nums flex-1"
          />
          <button onClick={handleSave} disabled={saving} className="btn-primary !py-1.5 !px-3 !text-xs">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setLimit(budget.monthly_limit) }} className="btn-ghost !py-1.5 !px-2 !text-xs">
            ✕
          </button>
        </div>
      ) : (
        <p className="text-2xl font-bold nums text-slate-100 mb-3">
          {budget.currency === 'USD' ? '$' : 'S/'}{budget.monthly_limit.toFixed(0)}
          <span className="text-xs font-normal text-slate-500 ml-1.5">/ month</span>
        </p>
      )}

      {/* Progress bar (static — shows 0% when no status data) */}
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-600 mt-1.5 nums">{budget.currency} limit</p>
    </div>
  )
}

// ─── Budget Card with Status ──────────────────────────────────────────────────
function BudgetCardWithStatus({ budget, status, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [limit,   setLimit]   = useState(budget.monthly_limit)
  const [saving,  setSaving]  = useState(false)

  const pct      = status?.percentage ?? 0
  const spent    = status?.spent ?? 0
  const isOver   = pct >= 100
  const isWarn   = pct >= 75

  const barColor  = isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
  const pctColor  = isOver ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'
  const cardBorder = isOver ? 'border-rose-500/20 hover:border-rose-500/30' : isWarn ? 'border-amber-500/15 hover:border-amber-500/25' : 'border-slate-800 hover:border-slate-700'

  const handleSave = async () => {
    const val = parseFloat(limit)
    if (!val || val <= 0) return
    setSaving(true)
    try {
      const updated = await updateBudget(budget.id, { monthly_limit: val })
      onUpdated(updated)
      toast.success('Budget updated')
      setEditing(false)
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remove budget for "${budget.category}"?`)) return
    try {
      await deleteBudget(budget.id)
      onDeleted(budget.id)
      toast.success('Budget removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  return (
    <div className={`card p-4 border ${cardBorder} transition-colors group`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CATEGORY_ICONS[budget.category]}</span>
          <div>
            <p className="text-sm font-semibold text-slate-200 capitalize leading-tight">{budget.category}</p>
            <p className={`text-xs font-semibold nums ${pctColor}`}>{Math.round(pct)}% used</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(!editing)} className="btn-ghost !p-1.5 text-slate-500 hover:text-slate-300">
            <PencilIcon />
          </button>
          <button onClick={handleDelete} className="btn-ghost !p-1.5 text-rose-600 hover:text-rose-400 hover:bg-rose-500/10">
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Amount row */}
      {editing ? (
        <div className="flex gap-2 mt-2">
          <input
            type="number" min="0" step="0.01"
            value={limit} onChange={e => setLimit(e.target.value)}
            className="input !py-1 !text-xs nums flex-1"
          />
          <button onClick={handleSave} disabled={saving} className="btn-primary !py-1 !px-2.5 !text-xs">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setLimit(budget.monthly_limit) }} className="btn-ghost !py-1 !px-2 !text-xs">
            ✕
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-xs nums text-slate-500">
            {budget.currency === 'USD' ? '$' : 'S/'}{spent.toFixed(0)} spent
          </span>
          <span className="text-xs nums text-slate-400 font-medium">
            of {budget.currency === 'USD' ? '$' : 'S/'}{budget.monthly_limit.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Budgets() {
  const [budgets,  setBudgets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    getBudgets()
      .then(data => setBudgets(data ?? []))
      .catch(() => toast.error('Failed to load budgets'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (b) => setBudgets(p => [...p, b])
  const handleUpdated = (b) => setBudgets(p => p.map(x => x.id === b.id ? b : x))
  const handleDeleted = (id) => setBudgets(p => p.filter(x => x.id !== id))

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Budgets</h1>
          {!loading && (
            <p className="text-xs text-slate-500 mt-0.5">
              {budgets.length} of {CATEGORIES.length} categories budgeted
            </p>
          )}
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon /> Set Budget
        </button>
      </div>

      {/* ── Info note ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 bg-brand-500/5 border border-brand-500/15 rounded-xl px-4 py-3">
        <span className="text-brand-400 mt-0.5 shrink-0">ℹ</span>
        <p className="text-xs text-slate-400 leading-relaxed">
          Budget limits are in the currency you choose (PEN or USD). Spending is converted to USD for comparison on the Dashboard using the configured exchange rate.
        </p>
      </div>

      {/* ── Budget Cards ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sk className="w-7 h-7 rounded" />
                <Sk className="h-4 w-20" />
              </div>
              <Sk className="h-7 w-24 mb-3" />
              <Sk className="h-1.5 w-full rounded-full" />
              <Sk className="h-3 w-24 mt-1.5" />
            </div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-2xl mb-3">📊</p>
          <p className="text-sm font-medium text-slate-400 mb-1">No budgets set yet</p>
          <p className="text-xs text-slate-600 mb-4">Set monthly spending limits per category to track your progress.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <PlusIcon /> Set your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => (
            <BudgetCard
              key={b.id}
              budget={b}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* ── Add Budget Modal ─────────────────────────────────────────── */}
      {showModal && (
        <AddBudgetModal
          existing={budgets}
          onClose={() => setShowModal(false)}
          onSaved={handleCreated}
        />
      )}
    </div>
  )
}
