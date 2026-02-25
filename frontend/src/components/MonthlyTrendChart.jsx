import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function CustomTooltip({ active, payload, label, currency, usdToPen }) {
  if (!active || !payload?.length) return null
  const val = currency === 'PEN' ? payload[0].value * usdToPen : payload[0].value
  const formatted = currency === 'PEN'
    ? 'S/ ' + val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '$' + val.toFixed(2)
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-elevated">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold nums text-slate-100">{formatted}</p>
    </div>
  )
}

export default function MonthlyTrendChart({ data, currency = 'USD', usdToPen = 3.7 }) {
  const tickPrefix = currency === 'PEN' ? 'S/' : '$'
  const tickConvert = (v) => currency === 'PEN' ? v * usdToPen : v
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-600">
        No trend data for this year
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1e293b"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Plus Jakarta Sans' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Plus Jakarta Sans' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${tickPrefix}${Math.round(tickConvert(v))}`}
          width={42}
        />
        <Tooltip
          content={<CustomTooltip currency={currency} usdToPen={usdToPen} />}
          cursor={{ stroke: '#334155', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="#06b6d4"
          strokeWidth={2}
          fill="url(#trendGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
