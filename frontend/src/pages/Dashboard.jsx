import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getBudgetStatus,
  getByCategory,
  getExchangeRate,
  getMonthlyTrend,
  getSummary,
  getTransactions,
  triggerSync,
} from '../api'
import CategoryBarChart from '../components/CategoryBarChart'
import MonthlyTrendChart from '../components/MonthlyTrendChart'

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtUSD = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n ?? 0))

const fmtPEN = (n) =>
  'S/ ' +
  Math.abs(n ?? 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const fmtAmount = (tx) => {
  const sign = tx.amount >= 0 ? '+' : '-'
  const abs = Math.abs(tx.amount)
  return tx.currency === 'USD'
    ? `${sign}$${abs.toFixed(2)}`
    : `${sign}S/${abs.toFixed(2)}`
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const CATEGORY_ICONS = {
  groceries:     '🛒',
  transport:     '🚌',
  restaurants:   '🍽️',
  entertainment: '🎬',
  utilities:     '💡',
  transfer:      '↔️',
  salary:        '💼',
  shopping:      '🛍️',
  health:        '🏥',
  education:     '📚',
  other:         '💰',
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function SyncIcon({ spinning }) {
  return (
    <svg
      className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
      fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}

function ExchangeIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ className }) {
  return <div className={`skeleton ${className}`} />
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, accent, loading }) {
  const accents = {
    income:  'text-emerald-400',
    expense: 'text-rose-400',
    brand:   'text-brand-400',
    default: 'text-slate-100',
  }

  if (loading) {
    return (
      <div className="card p-5">
        <Sk className="h-2.5 w-20 mb-4" />
        <Sk className="h-7 w-24 mb-2" />
        <Sk className="h-2.5 w-28" />
      </div>
    )
  }

  return (
    <div className="card p-5 hover:border-slate-700 transition-colors duration-200">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {label}
      </p>
      <p className={`text-2xl font-bold nums ${accents[accent] ?? accents.default}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-slate-600 mt-1.5">{sub}</p>
      )}
    </div>
  )
}

// ─── Currency Cards ───────────────────────────────────────────────────────────
function CurrencyCards({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="card p-4">
            <Sk className="h-5 w-12 mb-3 rounded-md" />
            <div className="space-y-2">
              <Sk className="h-3 w-full" />
              <Sk className="h-3 w-full" />
              <Sk className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const usd = summary?.usd ?? {}
  const pen = summary?.pen ?? {}

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* USD */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-widest text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
            USD
          </span>
          <span className="text-xs text-slate-600">US Dollar</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Income</span>
            <span className="text-xs nums font-semibold text-emerald-400">
              +${(usd.income ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Expenses</span>
            <span className="text-xs nums font-semibold text-rose-400">
              -${Math.abs(usd.expenses ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-400">Net</span>
            <span className={`text-xs nums font-bold ${(usd.net ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(usd.net ?? 0) >= 0 ? '+' : '-'}${Math.abs(usd.net ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* PEN */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-widest text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
            PEN
          </span>
          <span className="text-xs text-slate-600">Soles</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Income</span>
            <span className="text-xs nums font-semibold text-emerald-400">
              +S/{(pen.income ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Expenses</span>
            <span className="text-xs nums font-semibold text-rose-400">
              -S/{Math.abs(pen.expenses ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-400">Net</span>
            <span className={`text-xs nums font-bold ${(pen.net ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(pen.net ?? 0) >= 0 ? '+' : '-'}S/{Math.abs(pen.net ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Budget Alert Row ─────────────────────────────────────────────────────────
function BudgetAlertRow({ item, fmtAmt }) {
  const pct = item.percentage
  const isOver = pct >= 100
  const isWarn = pct >= 75

  const barColor = isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
  const textColor = isOver ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'
  const borderColor = isOver ? 'border-rose-500/20 bg-rose-500/5' : isWarn ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-800'

  return (
    <div className={`p-3 rounded-lg border ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-200 capitalize">{item.category}</span>
        <span className={`text-xs nums font-bold ${textColor}`}>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-[11px] nums text-slate-500">
        {fmtAmt(item.spent)} <span className="text-slate-700">/</span> {fmtAmt(item.limit)}
      </p>
    </div>
  )
}

// ─── Recent Transaction Row ───────────────────────────────────────────────────
function TxRow({ tx }) {
  const isIncome = tx.amount >= 0
  const dateStr = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors flex items-center justify-center text-sm shrink-0">
        {CATEGORY_ICONS[tx.category] ?? '💰'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate leading-tight">{tx.description}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
          {tx.category} · {tx.bank}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm nums font-semibold ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
          {fmtAmount(tx)}
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">{dateStr}</p>
      </div>
    </div>
  )
}

// ─── Currency helpers ─────────────────────────────────────────────────────────
function useCurrencyPref() {
  const [pref, setPref] = useState(() => localStorage.getItem('preferred_currency') || 'USD')
  const toggle = () => setPref(p => {
    const next = p === 'USD' ? 'PEN' : 'USD'
    localStorage.setItem('preferred_currency', next)
    return next
  })
  return [pref, toggle]
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [currency, toggleCurrency] = useCurrencyPref()

  const [summary,      setSummary]      = useState(null)
  const [byCategory,   setByCategory]   = useState([])
  const [trend,        setTrend]        = useState([])
  const [budgetStatus, setBudgetStatus] = useState([])
  const [recentTxns,   setRecentTxns]   = useState([])
  const [rateInfo,     setRateInfo]     = useState(null)
  const [rateRefreshing, setRateRefreshing] = useState(false)

  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingCharts,  setLoadingCharts]  = useState(true)
  const [loadingBudgets, setLoadingBudgets] = useState(true)
  const [syncing,        setSyncing]        = useState(false)
  const [syncMenuOpen,   setSyncMenuOpen]   = useState(false)
  const [syncResult,     setSyncResult]     = useState(null) // { txns_added, days_back }
  const syncMenuRef = useRef(null)

  // Close sync menu on outside click
  useEffect(() => {
    if (!syncMenuOpen) return
    const handler = (e) => {
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target)) {
        setSyncMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [syncMenuOpen])

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const [s, txns] = await Promise.all([
        getSummary(month, year),
        getTransactions({ month, year }),
      ])
      setSummary(s)
      setRecentTxns((txns ?? []).slice(0, 5))
    } catch {
      toast.error('Failed to load summary')
    } finally {
      setLoadingSummary(false)
    }
  }, [month, year])

  const fetchCharts = useCallback(async () => {
    setLoadingCharts(true)
    try {
      const [cat, tr] = await Promise.all([
        getByCategory(month, year),
        getMonthlyTrend(year),
      ])
      setByCategory(cat ?? [])
      setTrend(tr ?? [])
    } catch {
      toast.error('Failed to load charts')
    } finally {
      setLoadingCharts(false)
    }
  }, [month, year])

  const fetchBudgets = useCallback(async () => {
    setLoadingBudgets(true)
    try {
      setBudgetStatus((await getBudgetStatus(month, year)) ?? [])
    } catch {
      toast.error('Failed to load budgets')
    } finally {
      setLoadingBudgets(false)
    }
  }, [month, year])

  const fetchRateInfo = useCallback(async (showToast = false) => {
    setRateRefreshing(true)
    try {
      const info = await getExchangeRate()
      setRateInfo(info)
      if (showToast) toast.success('Exchange rate refreshed')
    } catch {
      if (showToast) toast.error('Could not refresh exchange rate')
    } finally {
      setRateRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    fetchCharts()
    fetchBudgets()
    fetchRateInfo()
  }, [fetchSummary, fetchCharts, fetchBudgets, fetchRateInfo])

  const handleSync = async (daysBack = 7) => {
    setSyncMenuOpen(false)
    setSyncing(true)
    setSyncResult(null)
    const label = daysBack === 7 ? '7 days' : daysBack === 30 ? '30 days' : daysBack === 90 ? '3 months' : '6 months'
    const tid = toast.loading(`Syncing last ${label}…`)
    try {
      const res = await triggerSync(daysBack)
      const added = res.transactions_added ?? 0
      const msg = added > 0
        ? `Sync complete · ${added} new transaction${added !== 1 ? 's' : ''}`
        : res.message ?? 'Sync complete · no new transactions'
      toast.success(msg, { id: tid })
      setSyncResult({ txns_added: added, days_back: daysBack })
      fetchSummary()
      fetchCharts()
      fetchBudgets()
    } catch {
      toast.error('Sync failed', { id: tid })
    } finally {
      setSyncing(false)
    }
  }

  // Exchange rate for currency conversion
  const penToUsd = rateInfo?.rate ?? summary?.exchange_rate ?? 0.27
  const usdToPen = penToUsd > 0 ? 1 / penToUsd : 3.7

  // Convert a USD-based total to the preferred display currency
  const toDisplay = (usdVal) => currency === 'USD' ? usdVal : usdVal * usdToPen
  const fmtDisplay = (usdVal) => currency === 'USD' ? fmtUSD(usdVal) : fmtPEN(toDisplay(usdVal))

  // Convert a USD-denominated category/budget value to display currency
  const fmtCatDisplay = (usdVal) => currency === 'USD'
    ? `$${usdVal.toFixed(2)}`
    : `S/${(usdVal * usdToPen).toFixed(2)}`

  const totalIncome   = summary?.total_usd?.income   ?? 0
  const totalExpenses = summary?.total_usd?.expenses  ?? 0
  const totalNet      = summary?.total_usd?.net       ?? 0
  const savingsRate   = totalIncome > 0 ? Math.max(0, (totalNet / totalIncome) * 100) : 0
  const alertBudgets  = budgetStatus.filter((b) => b.percentage >= 75)

  const rateDisplay = rateInfo
    ? `1 PEN = $${rateInfo.rate.toFixed(4)} USD`
    : summary?.exchange_rate
      ? `1 PEN = $${summary.exchange_rate.toFixed(4)} USD`
      : '1 PEN = $0.27 USD'
  const rateAge = rateInfo?.age_hours != null
    ? rateInfo.age_hours < 1
      ? 'just now'
      : `${Math.round(rateInfo.age_hours)}h ago`
    : null

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100 leading-tight">
            {FULL_MONTHS[month - 1]} {year}
          </h1>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
            <ExchangeIcon />
            <span>{rateDisplay}</span>
            {rateAge && (
              <>
                <span className="text-slate-700">·</span>
                <span>Updated {rateAge}</span>
              </>
            )}
            <button
              onClick={() => fetchRateInfo(true)}
              disabled={rateRefreshing}
              className="ml-0.5 text-slate-600 hover:text-brand-400 transition-colors disabled:opacity-40"
              title="Refresh exchange rate"
            >
              <SyncIcon spinning={rateRefreshing} />
            </button>
            {summary && (
              <>
                <span className="text-slate-700">·</span>
                <span>{summary.transaction_count} transactions</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(+e.target.value)}
            className="input !py-1.5 !px-2.5 !text-xs w-auto"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="input !py-1.5 !px-2.5 !text-xs w-auto"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

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

          {/* Sync dropdown */}
          <div className="relative" ref={syncMenuRef}>
            <button
              onClick={() => setSyncMenuOpen(o => !o)}
              disabled={syncing}
              className="btn-secondary !py-1.5 !px-3 flex items-center gap-1.5"
            >
              <SyncIcon spinning={syncing} />
              <span className="hidden sm:inline text-xs">{syncing ? 'Syncing…' : 'Sync'}</span>
              {!syncing && (
                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              )}
            </button>

            {syncMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-elevated z-20 py-1 animate-fade-in">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Sync range
                </p>
                {[
                  { label: 'Last 7 days',    days: 7,   fast: true  },
                  { label: 'Last 30 days',   days: 30,  fast: false },
                  { label: 'Last 3 months',  days: 90,  fast: false },
                  { label: 'Last 6 months',  days: 180, fast: false },
                ].map(({ label, days, fast }) => (
                  <button
                    key={days}
                    onClick={() => handleSync(days)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors flex items-center justify-between group"
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${fast ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                      {fast ? 'quick' : `~${days === 30 ? '$0.05' : days === 90 ? '$0.18' : '$0.27'}`}
                    </span>
                  </button>
                ))}
                <div className="border-t border-slate-800 mt-1 px-3 py-2">
                  <p className="text-[10px] text-slate-600">
                    Already-processed emails are skipped — no duplicate charges.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sync Result Banner ──────────────────────────────────────── */}
      {syncResult && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 animate-slide-up">
          <p className="text-xs text-emerald-400">
            {syncResult.txns_added > 0
              ? `✓ Found ${syncResult.txns_added} new transaction${syncResult.txns_added !== 1 ? 's' : ''} from the last ${syncResult.days_back === 7 ? '7 days' : syncResult.days_back === 30 ? '30 days' : syncResult.days_back === 90 ? '3 months' : '6 months'}`
              : `✓ Sync complete — no new transactions in the last ${syncResult.days_back === 7 ? '7 days' : syncResult.days_back === 30 ? '30 days' : syncResult.days_back === 90 ? '3 months' : '6 months'}`
            }
          </p>
          <button onClick={() => setSyncResult(null)} className="text-emerald-600 hover:text-emerald-400 transition-colors text-xs">✕</button>
        </div>
      )}

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Net Balance"
          value={fmtDisplay(totalNet)}
          sub={totalNet >= 0 ? 'Positive cash flow' : 'Spending exceeded income'}
          accent={totalNet >= 0 ? 'income' : 'expense'}
          loading={loadingSummary}
        />
        <SummaryCard
          label="Total Income"
          value={fmtDisplay(totalIncome)}
          sub={`All currencies · ${currency}`}
          accent="income"
          loading={loadingSummary}
        />
        <SummaryCard
          label="Total Expenses"
          value={fmtDisplay(totalExpenses)}
          sub={`All currencies · ${currency}`}
          accent="expense"
          loading={loadingSummary}
        />
        <SummaryCard
          label="Savings Rate"
          value={`${savingsRate.toFixed(1)}%`}
          sub={savingsRate >= 20 ? 'On track' : savingsRate > 0 ? 'Room to improve' : 'No savings'}
          accent="brand"
          loading={loadingSummary}
        />
      </div>

      {/* ── Currency Breakdown ──────────────────────────────────────── */}
      <CurrencyCards summary={summary} loading={loadingSummary} />

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Spending by Category
          </h2>
          {loadingCharts ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <Sk className="h-3 w-20" />
                    <Sk className="h-3 w-12" />
                  </div>
                  <Sk className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <CategoryBarChart data={byCategory} currency={currency} usdToPen={usdToPen} />
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Monthly Expenses · {year}
          </h2>
          {loadingCharts ? (
            <Sk className="h-48 w-full" />
          ) : (
            <MonthlyTrendChart data={trend} currency={currency} usdToPen={usdToPen} />
          )}
        </div>
      </div>

      {/* ── Budget Alerts (only if ≥75%) ────────────────────────────── */}
      {!loadingBudgets && alertBudgets.length > 0 && (
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Budget Alerts
            </h2>
            <Link
              to="/budgets"
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
            >
              All budgets <ArrowRightIcon />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {alertBudgets.map((b) => (
              <BudgetAlertRow key={b.category} item={b} fmtAmt={fmtCatDisplay} />
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Transactions ──────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recent Transactions
          </h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            View all <ArrowRightIcon />
          </Link>
        </div>

        {loadingSummary ? (
          <div className="space-y-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Sk className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1">
                  <Sk className="h-3 w-40 mb-2" />
                  <Sk className="h-2.5 w-24" />
                </div>
                <Sk className="h-3 w-14" />
              </div>
            ))}
          </div>
        ) : recentTxns.length > 0 ? (
          <div className="divide-y divide-slate-800/50">
            {recentTxns.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-600">No transactions this month</p>
            <Link to="/transactions" className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block">
              Add one manually →
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}
