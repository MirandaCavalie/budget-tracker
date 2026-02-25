import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,  // send the httponly session_token cookie
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect if we're already on /login or calling /auth/me
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const getMe = () =>
  axios.get('/auth/me', { withCredentials: true }).then((r) => r.data)

export const logout = () =>
  axios.post('/auth/logout', {}, { withCredentials: true }).then((r) => r.data)

// ── Transactions ──────────────────────────────────────────────────────────────
export const getTransactions = (params = {}) =>
  api.get('/transactions', { params }).then((r) => r.data)

export const getTransaction = (id) =>
  api.get(`/transactions/${id}`).then((r) => r.data)

export const createTransaction = (data) =>
  api.post('/transactions', data).then((r) => r.data)

export const updateTransaction = (id, data) =>
  api.put(`/transactions/${id}`, data).then((r) => r.data)

export const deleteTransaction = (id) =>
  api.delete(`/transactions/${id}`).then((r) => r.data)

// ── Budgets ───────────────────────────────────────────────────────────────────
export const getBudgets = () =>
  api.get('/budgets').then((r) => r.data)

export const createBudget = (data) =>
  api.post('/budgets', data).then((r) => r.data)

export const updateBudget = (id, data) =>
  api.put(`/budgets/${id}`, data).then((r) => r.data)

export const deleteBudget = (id) =>
  api.delete(`/budgets/${id}`).then((r) => r.data)

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getSummary = (month, year) =>
  api.get('/dashboard/summary', { params: { month, year } }).then((r) => r.data)

export const getByCategory = (month, year) =>
  api.get('/dashboard/by-category', { params: { month, year } }).then((r) => r.data)

export const getMonthlyTrend = (year) =>
  api.get('/dashboard/monthly-trend', { params: { year } }).then((r) => r.data)

export const getBudgetStatus = (month, year) =>
  api.get('/dashboard/budget-status', { params: { month, year } }).then((r) => r.data)

export const getExchangeRate = () =>
  api.get('/dashboard/exchange-rate').then((r) => r.data)

// ── Sync ──────────────────────────────────────────────────────────────────────
export const triggerSync = (daysBack = 7) =>
  api.post('/sync', { days_back: daysBack }).then((r) => r.data)
