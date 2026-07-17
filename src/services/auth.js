// Auth API client for the Flask backend. The session is an httpOnly cookie set
// by the server, so every request sends credentials. Keep the app and the API
// on the same host (127.0.0.1) — the cookie is host-scoped, and the Google
// OAuth redirect URI is registered on 127.0.0.1.

// Base URL resolution (TL-DEPLOY-001): explicit env override first; on a
// local host default to the local backend on :5001 (Vite dev flow); anywhere
// else — the single-container cloud deployment — use the SAME ORIGIN ('').
const isLocalHost = ['127.0.0.1', 'localhost'].includes(
  window.location.hostname,
)
export const API_BASE =
  import.meta.env.VITE_AUTH_API ||
  import.meta.env.VITE_IBKR_API ||
  (isLocalHost ? 'http://127.0.0.1:5001' : '')

// Where the "Continue with Google" link points (top-level navigation, not fetch,
// so the OAuth redirect chain and cookies work).
export const GOOGLE_LOGIN_URL = `${API_BASE}/api/auth/google`

// Shared by services/data.js too — one fetch wrapper for the whole backend.
export async function call(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Network-level failure = backend not running.
    const err = new Error('backend_unreachable')
    err.code = 'backend_unreachable'
    throw err
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    // Backend errors carry a stable code the UI maps to translated copy;
    // extra body fields (e.g. retryAfter on rate limits) ride along.
    const code = data?.error || 'request_failed'
    const err = new Error(code)
    err.code = code
    err.data = data || {}
    throw err
  }
  return data
}

export const me = () => call('/api/auth/me')
export const login = (email, password) =>
  call('/api/auth/login', { method: 'POST', body: { email, password } })
export const register = ({ email, displayName, password }) =>
  call('/api/auth/register', { method: 'POST', body: { email, displayName, password } })
export const logout = () => call('/api/auth/logout', { method: 'POST' })

// Email verification (logged-in) and password reset (logged-out).
// `lang` localizes the outgoing email; the server whitelists it (fallback en).
export const requestVerifyCode = (lang) =>
  call('/api/auth/verify/request', { method: 'POST', body: { lang } })
export const confirmVerifyCode = (code) =>
  call('/api/auth/verify/confirm', { method: 'POST', body: { code } })
export const forgotPassword = (email, lang) =>
  call('/api/auth/password/forgot', { method: 'POST', body: { email, lang } })
export const resetPassword = ({ email, code, newPassword }) =>
  call('/api/auth/password/reset', {
    method: 'POST',
    body: { email, code, new_password: newPassword },
  })
export const changePassword = ({ oldPassword, newPassword }) =>
  call('/api/auth/password/change', {
    method: 'POST',
    body: { old_password: oldPassword, new_password: newPassword },
  })

// Account deletion (settings danger zone). Confirmation: password for normal
// accounts, the full email for Google-only accounts.
export const deleteAccount = ({ password, confirmEmail }) =>
  call('/api/auth/account', {
    method: 'DELETE',
    body: { password, confirm_email: confirmEmail },
  })

// Device sessions (settings page).
export const fetchSessions = () => call('/api/auth/sessions')
export const revokeSession = (id) =>
  call(`/api/auth/sessions/${id}`, { method: 'DELETE' })
export const revokeOtherSessions = () =>
  call('/api/auth/sessions/revoke_others', { method: 'POST' })
