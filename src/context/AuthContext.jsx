import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../services/auth.js'

const AuthContext = createContext(null)

// Stable backend error codes -> i18n keys. The UI never shows raw backend text.
const ERROR_KEYS = {
  invalid_credentials: 'auth.errInvalidCredentials',
  email_taken: 'auth.errEmailExists',
  invalid_email: 'auth.errEmailInvalid',
  password_too_short: 'auth.errPasswordShort',
  missing_fields: 'auth.errMissingFields',
  backend_unreachable: 'auth.errBackendDown',
  oauth_failed: 'auth.errGoogleFailed',
  oauth_not_configured: 'auth.errGoogleNotConfigured',
  too_many_login_attempts: 'auth.errTooManyLogins',
  code_invalid: 'auth.errCodeInvalid',
  code_expired: 'auth.errCodeExpired',
  too_many_attempts: 'auth.errTooManyAttempts',
  resend_cooldown: 'auth.errResendCooldown',
  mail_not_configured: 'auth.errMailNotConfigured',
  mail_send_failed: 'auth.errGeneric',
}
export const errorKey = (code) => ERROR_KEYS[code] || 'auth.errGeneric'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [ready, setReady] = useState(false)

  // Restore the session cookie on mount. 401 / backend down -> logged out;
  // ProtectedRoute then redirects to /login.
  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then((user) => {
        if (!cancelled) setCurrentUser(user)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function login(email, password) {
    try {
      const user = await authApi.login(String(email).trim(), password)
      setCurrentUser(user)
      return { ok: true }
    } catch (e) {
      // Rate-limited logins carry retryAfter; surface it as {min} for copy.
      const vars = e.data?.retryAfter
        ? { min: Math.max(1, Math.ceil(e.data.retryAfter / 60)) }
        : undefined
      return { ok: false, error: errorKey(e.code), vars }
    }
  }

  async function register({ email, displayName, password }) {
    try {
      const user = await authApi.register({
        email: String(email).trim(),
        displayName: String(displayName).trim(),
        password,
      })
      setCurrentUser(user)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errorKey(e.code) }
    }
  }

  function logout() {
    // Log out locally right away; the server call just clears the cookie.
    setCurrentUser(null)
    authApi.logout().catch(() => {})
  }

  // ── Email verification (backend one-time codes) ──────────────
  // `lang` comes from the caller (which knows the UI language) and picks the
  // language of the code email.
  async function requestVerifyCode(lang) {
    try {
      await authApi.requestVerifyCode(lang)
      return { ok: true }
    } catch (e) {
      return { ok: false, code: e.code, error: errorKey(e.code) }
    }
  }

  async function confirmVerifyCode(code) {
    try {
      const user = await authApi.confirmVerifyCode(code)
      setCurrentUser(user)
      return { ok: true }
    } catch (e) {
      return { ok: false, code: e.code, error: errorKey(e.code) }
    }
  }

  // Logged-in password change (settings page). Other devices are signed out
  // server-side; this session's cookies are re-minted and survive.
  async function changePassword({ oldPassword, newPassword }) {
    try {
      await authApi.changePassword({ oldPassword, newPassword })
      return { ok: true }
    } catch (e) {
      return { ok: false, code: e.code, error: errorKey(e.code) }
    }
  }

  // Permanent self-service deletion. On success the account is gone —
  // clear local state; the caller redirects to /login.
  async function deleteAccount({ password, confirmEmail }) {
    try {
      await authApi.deleteAccount({ password, confirmEmail })
      setCurrentUser(null)
      return { ok: true }
    } catch (e) {
      return { ok: false, code: e.code, error: errorKey(e.code) }
    }
  }

  const emailVerified = !!currentUser?.emailVerifiedAt

  const value = useMemo(
    () => ({
      currentUser,
      ready,
      emailVerified,
      login,
      register,
      logout,
      requestVerifyCode,
      confirmVerifyCode,
      changePassword,
      deleteAccount,
    }),
    [currentUser, ready, emailVerified],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
