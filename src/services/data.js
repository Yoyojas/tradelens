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
export const fetchTags = () => call('/api/tags')
