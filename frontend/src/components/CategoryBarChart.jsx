// Horizontal bar chart for category spending — pure CSS, no extra deps

const PALETTE = [
  '#06b6d4', // brand cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#818cf8', // indigo
  '#f43f5e', // rose
  '#a78bfa', // violet
  '#34d399', // light green
  '#fb923c', // orange
  '#38bdf8', // sky
  '#e879f9', // fuchsia
  '#4ade80', // green
]

const fmtUSD = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

const fmtPEN = (n) =>
  'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CategoryBarChart({ data, currency = 'USD', usdToPen = 3.7 }) {
  const fmt = (n) => currency === 'USD' ? fmtUSD(n) : fmtPEN(n * usdToPen)
  const convert = (n) => currency === 'USD' ? n : n * usdToPen
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-600">
        No expense data for this period
      </div>
    )
  }

  // Sort descending, show top 8
  const sorted = [...data]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const max = sorted[0]?.total ?? 1

  return (
    <div className="space-y-3">
      {sorted.map((item, i) => {
        const pct = Math.max((item.total / max) * 100, 2)
        const color = PALETTE[i % PALETTE.length]
        return (
          <div key={item.category} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-400 capitalize group-hover:text-slate-200 transition-colors duration-100">
                {item.category}
              </span>
              <span className="text-xs nums font-semibold text-slate-300">
                {fmt(convert(item.total))}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
