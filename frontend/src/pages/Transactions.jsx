import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  createTransaction,
  deleteTransaction,
  getExchangeRate,
  getTransactions,
  updateTransaction,
} from '../api'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'groceries', 'transport', 'restaurants', 'entertainment',
  'utilities', 'transfer', 'salary', 'shopping', 'health', 'education', 'other',
]
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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
function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ className }) { return <div className={`skeleton ${className}`} /> }

// ─── Transaction Modal (Add or Edit) ─────────────────────────────────────────
const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: '',
  currency: 'USD',
  category: 'other',
  bank: 'Manual',
}

function TxModal({ txn, onClose, onSaved }) {
  const isEdit = !!txn
  const [isIncome, setIsIncome] = useState(isEdit ? txn.amount >= 0 : false)
  const [form, setForm] = useState(
    isEdit
      ? { date: txn.date, description: txn.description, amount: Math.abs(txn.amount), currency: txn.currency, category: txn.category, bank: txn.bank }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) return setError('Description is required')
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) return setError('Enter a valid positive amount')
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, amount: isIncome ? amt : -amt }
      const result = isEdit
        ? await updateTransaction(txn.id, payload)
        : await createTransaction(payload)
      onSaved(result, isEdit)
      toast.success(isEdit ? 'Transaction updated' : 'Transaction added')
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-elevated animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="btn-ghost !p-1.5"><XIcon /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Income / Expense toggle */}
          {!isEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsIncome(true)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  isIncome
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-transparent hover:border-slate-700'
                }`}
              >
                + Income
              </button>
              <button
                type="button"
                onClick={() => setIsIncome(false)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  !isIncome
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border border-transparent hover:border-slate-700'
                }`}
              >
                − Expense
              </button>
            </div>
          )}

          {/* Amount + Currency row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Amount</label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                className="input nums"
              />
            </div>
            <div className="w-24">
              <label className="label">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className="input">
                <option value="USD">USD</option>
                <option value="PEN">PEN</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              placeholder={isIncome ? 'e.g. Monthly salary' : 'e.g. Uber ride'}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="input"
            />
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="input capitalize">
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="capitalize">{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>
          </div>

          {/* Date + Source row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input" />
            </div>
            <div className="flex-1">
              <label className="label">Source</label>
              <input
                type="text" placeholder="Cash, BCP, etc."
                value={form.bank}
                onChange={e => set('bank', e.target.value)}
                className="input"
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              type="submit" disabled={saving}
              className={`flex-1 btn-primary ${!isIncome && !isEdit ? 'bg-rose-500 hover:bg-rose-400 focus-visible:ring-rose-500' : ''}`}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : isIncome ? 'Add Income' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ tx, onEdit, onDelete, currency, penToUsd }) {
  const isIncome = tx.amount >= 0
  const dateStr  = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const amtStr   = `${isIncome ? '+' : '-'}${tx.currency === 'USD' ? '$' : 'S/'}${Math.abs(tx.amount).toFixed(2)}`

  // Converted amount in display currency
  const usdToPen = penToUsd > 0 ? 1 / penToUsd : 3.7
  let convertedStr = null
  if (currency === 'USD' && tx.currency === 'PEN') {
    const converted = Math.abs(tx.amount) * penToUsd
    convertedStr = `→ $${converted.toFixed(2)}`
  } else if (currency === 'PEN' && tx.currency === 'USD') {
    const converted = Math.abs(tx.amount) * usdToPen
    convertedStr = `→ S/${converted.toFixed(2)}`
  }

  return (
    <tr
      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors cursor-pointer group"
      onClick={() => onEdit(tx)}
    >
      <td className="py-3 pl-4 pr-3 whitespace-nowrap text-xs text-slate-500 nums">{dateStr}</td>
      <td className="py-3 pr-3 text-sm text-slate-200 max-w-[200px]">
        <div className="truncate">{tx.description}</div>
      </td>
      <td className={`py-3 pr-3 text-sm nums font-semibold text-right whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
        {amtStr}
        {convertedStr && (
          <span className="block text-[10px] font-normal text-slate-600">{convertedStr}</span>
        )}
      </td>
      <td className="py-3 pr-3 hidden sm:table-cell">
        <span className="badge bg-slate-800 text-slate-400 capitalize">
          {CATEGORY_ICONS[tx.category]} {tx.category}
        </span>
      </td>
      <td className="py-3 pr-3 hidden md:table-cell text-xs text-slate-500 truncate max-w-[100px]">
        {tx.bank}
      </td>
      <td className="py-3 pr-3 text-right">
        <button
          onClick={e => { e.stopPropagation(); onDelete(tx.id) }}
          className="opacity-0 group-hover:opacity-100 btn-ghost !p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <TrashIcon />
        </button>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Transactions() {
  const now = new Date()
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [year,     setYear]     = useState(now.getFullYear())
  const [category, setCategory] = useState('all')
  const [search,   setSearch]   = useState('')
  const [txns,     setTxns]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null) // null | 'add' | tx object
  const [currency, setCurrency] = useState(() => localStorage.getItem('preferred_currency') || 'USD')
  const [penToUsd, setPenToUsd] = useState(0.27)

  const toggleCurrency = () => setCurrency(p => {
    const next = p === 'USD' ? 'PEN' : 'USD'
    localStorage.setItem('preferred_currency', next)
    return next
  })

  useEffect(() => {
    getExchangeRate().then(info => setPenToUsd(info.rate)).catch(() => {})
  }, [])

  const fetchTxns = useCallback(async () => {
    setLoading(true)
    try {
      const params = { month, year }
      if (category !== 'all') params.category = category
      setTxns(await getTransactions(params) ?? [])
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [month, year, category])

  useEffect(() => { fetchTxns() }, [fetchTxns])

  const handleSaved = (saved, isEdit) => {
    if (isEdit) setTxns(p => p.map(t => t.id === saved.id ? saved : t))
    else        setTxns(p => [saved, ...p])
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await deleteTransaction(id)
      setTxns(p => p.filter(t => t.id !== id))
      toast.success('Transaction deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  // Client-side search filter
  const filtered = search.trim()
    ? txns.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.bank.toLowerCase().includes(search.toLowerCase())
      )
    : txns

  const totalIncome   = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpenses = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Transactions</h1>
          {!loading && (
            <p className="text-xs text-slate-500 mt-0.5">
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Currency toggle */}
          <button
            onClick={toggleCurrency}
            className="flex items-center gap-0 rounded-lg border border-slate-700 overflow-hidden text-xs font-semibold"
            title="Toggle display currency"
          >
            <span className={`px-2.5 py-1.5 transition-colors ${currency === 'USD' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}>
              USD
            </span>
            <span className="text-slate-700">|</span>
            <span className={`px-2.5 py-1.5 transition-colors ${currency === 'PEN' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}>
              PEN
            </span>
          </button>
          <button onClick={() => setModal('add')} className="btn-primary">
            <PlusIcon /> Add Transaction
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Date + Search row */}
        <div className="flex gap-2 flex-wrap">
          <select value={month} onChange={e => setMonth(+e.target.value)} className="input !py-1.5 !px-2.5 !text-xs w-auto">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} className="input !py-1.5 !px-2.5 !text-xs w-auto">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex-1 min-w-[180px] relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></div>
            <input
              type="text"
              placeholder="Search description or bank…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input !pl-8 !py-1.5 !text-xs"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-150 capitalize ${
                category === cat
                  ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                  : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              {cat === 'all' ? 'All categories' : `${CATEGORY_ICONS[cat]} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="flex gap-4 text-xs text-slate-500 px-1">
          <span>
            Income: <span className="text-emerald-400 font-semibold nums">
              +${totalIncome.toFixed(2)}
            </span>
          </span>
          <span>
            Expenses: <span className="text-rose-400 font-semibold nums">
              -${totalExpenses.toFixed(2)}
            </span>
          </span>
          <span>
            Net: <span className={`font-semibold nums ${totalIncome - totalExpenses >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalIncome - totalExpenses >= 0 ? '+' : '-'}${Math.abs(totalIncome - totalExpenses).toFixed(2)}
            </span>
          </span>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-2">
                <Sk className="h-3 w-12" />
                <Sk className="h-3 flex-1" />
                <Sk className="h-3 w-16" />
                <Sk className="h-5 w-20 rounded-full hidden sm:block" />
                <Sk className="h-3 w-14 hidden md:block" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-600">
              {search ? `No transactions matching "${search}"` : 'No transactions this period'}
            </p>
            {!search && (
              <button onClick={() => setModal('add')} className="text-xs text-brand-400 hover:text-brand-300 mt-1.5">
                Add the first one →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider py-2.5 pl-4 pr-3">Date</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider py-2.5 pr-3">Description</th>
                  <th className="text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider py-2.5 pr-3">Amount</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider py-2.5 pr-3 hidden sm:table-cell">Category</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider py-2.5 pr-3 hidden md:table-cell">Source</th>
                  <th className="py-2.5 pr-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <TxRow key={tx.id} tx={tx} onEdit={setModal} onDelete={handleDelete} currency={currency} penToUsd={penToUsd} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────────────────── */}
      {modal && (
        <TxModal
          txn={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
