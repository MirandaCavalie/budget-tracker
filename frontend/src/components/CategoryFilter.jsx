const CATEGORIES = [
  'all', 'groceries', 'transport', 'restaurants', 'entertainment',
  'utilities', 'transfer', 'salary', 'shopping', 'health', 'education', 'other',
]

export default function CategoryFilter({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c.charAt(0).toUpperCase() + c.slice(1)}
        </option>
      ))}
    </select>
  )
}
