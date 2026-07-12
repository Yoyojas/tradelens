// Client for the local read-only IB Gateway bridge (backend/). Configure the
// base URL with VITE_IBKR_API; defaults to the Flask dev port. This is the only
// place the front end talks to the broker backend.

export const IBKR_BASE =
  import.meta.env.VITE_IBKR_API || 'http://127.0.0.1:5001'

async function get(path) {
  let res
  try {
    res = await fetch(`${IBKR_BASE}${path}`)
  } catch {
    // Network-level failure = backend not running.
    const err = new Error('backend_unreachable')
    err.code = 'backend_unreachable'
    throw err
  }
  let body = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`)
    err.code = 'request_failed'
    throw err
  }
  return body
}

export const getStatus = () => get('/api/ibkr/status')
export const getAccount = () => get('/api/ibkr/account')
export const getPositions = () => get('/api/ibkr/positions')
export const getExecutions = () => get('/api/ibkr/executions')
