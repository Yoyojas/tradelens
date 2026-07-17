// Data API client (Milestone 2 step 2): trades, playbooks, tags, admin.
// All requests ride the same session cookie as auth (credentials included via
// the shared call helper). Server errors carry stable codes ({error: ...}).
import { call } from './auth.js'

// ── Trades ─────────────────────────────────────────────────────
// Server pages by default (limit 200); pass {limit: 0} for the full set
// (Reports aggregates client-side). Response: {trades, total}.
export const fetchTrades = (params) => {
  const qs = new URLSearchParams()
  if (params?.limit != null) qs.set('limit', params.limit)
  if (params?.offset != null) qs.set('offset', params.offset)
  const s = qs.toString()
  return call(`/api/trades${s ? `?${s}` : ''}`)
}
export const createTrade = (trade) =>
  call('/api/trades', { method: 'POST', body: trade })
export const updateTrade = (id, patch) =>
  call(`/api/trades/${id}`, { method: 'PATCH', body: patch })
export const deleteTrade = (id) =>
  call(`/api/trades/${id}`, { method: 'DELETE' })
export const importTrades = (trades, source) =>
  call('/api/trades/import', { method: 'POST', body: { trades, source } })
// Flex statement path: send parsed executions; the server pairs (same FIFO
// code as the live IB path), flags existing trades, and imports on commit.
export const importFlex = (executions, commit) =>
  call('/api/trades/import/flex', {
    method: 'POST',
    body: { executions, commit },
  })

// ── Broker connections (TL-DATA-004) ───────────────────────────
// The Flex token travels ONLY in these request bodies (https) — responses
// carry a masked summary and nothing is kept client-side.
export const fetchConnections = () => call('/api/broker/connections')
export const testBrokerConnection = (body) =>
  call('/api/broker/connections/test', { method: 'POST', body })
export const createBrokerConnection = (body) =>
  call('/api/broker/connections', { method: 'POST', body })
export const updateBrokerConnection = (id, body) =>
  call(`/api/broker/connections/${id}`, { method: 'PATCH', body })
export const deleteBrokerConnection = (id) =>
  call(`/api/broker/connections/${id}`, { method: 'DELETE' })
export const syncBrokerConnection = (id) =>
  call(`/api/broker/connections/${id}/sync`, { method: 'POST' })
export const fetchSyncRuns = (id) =>
  call(`/api/broker/connections/${id}/runs`)

// ── Snapshot devices + snapshots (TL-DATA-006) ─────────────────
// The device-token PLAINTEXT appears once in createDevice's response and is
// never sent again; pushes happen from the local agent, not the browser.
export const fetchDevices = () => call('/api/broker/devices')
export const createDevice = (name) =>
  call('/api/broker/devices', { method: 'POST', body: { name } })
export const revokeDevice = (id) =>
  call(`/api/broker/devices/${id}`, { method: 'DELETE' })
export const fetchLatestSnapshot = () => call('/api/broker/snapshots/latest')

// ── Quotes + watchlist (TL-DATA-005) ───────────────────────────
export const fetchQuotes = (symbols) =>
  call(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`)
export const searchSymbols = (q) =>
  call(`/api/symbols/search?q=${encodeURIComponent(q)}`)
export const fetchWatchlist = () => call('/api/watchlist')
export const addWatchlistItem = (symbol) =>
  call('/api/watchlist', { method: 'POST', body: { symbol } })
export const deleteWatchlistItem = (id) =>
  call(`/api/watchlist/${id}`, { method: 'DELETE' })
export const reorderWatchlist = (ids) =>
  call('/api/watchlist/reorder', { method: 'PATCH', body: { ids } })

// ── Onboarding profile (TL-FEAT-008) ───────────────────────────
export const fetchProfile = () => call('/api/profile')
export const updateProfile = (patch) =>
  call('/api/profile', { method: 'PATCH', body: patch })
export const completeOnboarding = () =>
  call('/api/profile/complete', { method: 'POST' })

// ── Playbooks ──────────────────────────────────────────────────
export const fetchPlaybooks = () => call('/api/playbooks') // {playbooks, adoptedIds}
export const adoptPlaybook = (id) =>
  call(`/api/playbooks/${id}/adopt`, { method: 'POST' })
export const unadoptPlaybook = (id) =>
  call(`/api/playbooks/${id}/adopt`, { method: 'DELETE' })
// Admin-only:
export const createPlaybook = (data) =>
  call('/api/playbooks', { method: 'POST', body: data })
export const updatePlaybook = (id, data) =>
  call(`/api/playbooks/${id}`, { method: 'PATCH', body: data })
export const deletePlaybook = (id) =>
  call(`/api/playbooks/${id}`, { method: 'DELETE' })

// ── Tags ───────────────────────────────────────────────────────
// GET returns shared templates + the user's own tags ({shared} flag).
// Create/rename/delete operate on the user's own tags only — the server
// answers 403 for shared tags and 404 for other users' tags.
export const fetchTags = () => call('/api/tags')
export const createTag = (label) =>
  call('/api/tags', { method: 'POST', body: { label } })
export const updateTag = (id, patch) =>
  call(`/api/tags/${id}`, { method: 'PATCH', body: patch })
export const deleteTag = (id) =>
  call(`/api/tags/${id}`, { method: 'DELETE' })
