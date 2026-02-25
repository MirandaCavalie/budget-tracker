import { useState } from 'react'
import { updateTransaction } from '../api'

function EditModal({ txn, onClose, onSaved }) {
  const [form, setForm] = useState({
    description: txn.description,
    amount: txn.amount,
    category: txn.category,
    date: txn.date,
  })
  const [saving, setSaving] = useState(false)

  const CATEGORIES = [
    'groceries', 'transport', 'restaurants', 'entertainment',
    'utilities', 'transfer', 'salary', 'shopping', 'health', 'education', 'other',
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateTransaction(txn.id, {
        ...form,
        amount: parseFloat(form.amount),
      })
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Edit Transaction</h2>

        <div>
          <label className="text-sm text-gray-400">Description</label>
          <input
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-gray-400">Amount</label>
          <input
            type="number"
            step="0.01"
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-gray-400">Category</label>
          <select
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400">Date</label>
          <input
            type="date"
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TransactionTable({ transactions, onUpdate }) {
  const [editing, setEditing] = useState(null)

  if (!transactions?.length) {
    return <p className="text-gray-500 text-center py-8">No transactions found.</p>
  }

  return (
    <>
      {editing && (
        <EditModal
          txn={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            onUpdate(updated)
            setEditing(null)
          }}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 pr-4">Description</th>
              <th className="pb-2 pr-4">Amount</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4">Bank</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr
                key={txn.id}
                className="border-b border-gray-800/50 hover:bg-gray-900/50 cursor-pointer"
                onClick={() => setEditing(txn)}
              >
                <td className="py-2.5 pr-4 text-gray-400 whitespace-nowrap">{txn.date}</td>
                <td className="py-2.5 pr-4 text-gray-200 max-w-xs truncate">{txn.description}</td>
                <td
                  className={`py-2.5 pr-4 font-mono font-medium ${
                    txn.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {txn.amount >= 0 ? '+' : ''}
                  {txn.currency} {Math.abs(txn.amount).toFixed(2)}
                </td>
                <td className="py-2.5 pr-4">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300 capitalize">
                    {txn.category}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-gray-400">{txn.bank}</td>
                <td className="py-2.5 text-gray-600 text-xs">edit</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
