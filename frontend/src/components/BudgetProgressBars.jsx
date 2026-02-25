export default function BudgetProgressBars({ data }) {
  if (!data?.length) {
    return (
      <p className="text-gray-500 text-sm">No budgets set. Go to the Budgets page to add some.</p>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((b) => {
        const pct = Math.min(b.percentage, 100)
        const color =
          b.percentage >= 90
            ? 'bg-red-500'
            : b.percentage >= 75
            ? 'bg-yellow-400'
            : 'bg-emerald-500'

        return (
          <div key={b.category}>
            <div className="flex justify-between text-sm mb-1">
              <span className="capitalize text-gray-300">{b.category}</span>
              <span className="text-gray-400">
                S/ {b.spent.toFixed(2)} / {b.limit.toFixed(2)} ({b.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
