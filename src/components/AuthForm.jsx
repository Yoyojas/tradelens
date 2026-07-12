import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { errorKey, useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { GOOGLE_LOGIN_URL } from '../services/auth.js'
import PasswordInput from './PasswordInput.jsx'
import '../css/auth.css'

// Shared login / register card. `mode` is "login" or "register".
export default function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/library'

  // A failed Google flow redirects back here with ?error=<code>.
  const [searchParams] = useSearchParams()
  const oauthErrorCode = searchParams.get('error')

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null) // {key, vars}
  const [submitting, setSubmitting] = useState(false)

  const bannerError =
    submitError || (oauthErrorCode ? { key: errorKey(oauthErrorCode) } : null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    setSubmitError(null)
  }

  function validate() {
    const next = {}
    if (isRegister && !form.displayName.trim()) {
      next.displayName = t('auth.errDisplayName')
    }
    if (!form.email.trim()) {
      next.email = t('auth.errEmailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = t('auth.errEmailInvalid')
    }
    if (!form.password) {
      next.password = t('auth.errPasswordRequired')
    } else if (isRegister && form.password.length < 8) {
      next.password = t('auth.errPasswordShort')
    }
    if (isRegister && form.confirm !== form.password) {
      next.confirm = t('auth.errPasswordMismatch')
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate() || submitting) return

    setSubmitting(true)
    const result = isRegister
      ? await register({
          email: form.email,
          displayName: form.displayName,
          password: form.password,
        })
      : await login(form.email, form.password)
    setSubmitting(false)

    if (!result.ok) {
      setSubmitError({ key: result.error, vars: result.vars })
      return
    }
    // New accounts go straight to the full-screen OTP step; the app itself is
    // unreachable until the email is verified (ProtectedRoute enforces it).
    navigate(isRegister ? '/verify' : redirectTo, { replace: true })
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-brand">
          <span className="auth-brand-mark">◈</span> {t('common.appName')}
        </div>
        <h1 className="auth-title">
          {isRegister ? t('auth.createAccount') : t('auth.signIn')}
        </h1>
        <p className="auth-subtitle">
          {isRegister ? t('auth.registerSubtitle') : t('auth.signInSubtitle')}
        </p>

        {isRegister && (
          <Field
            label={t('auth.displayName')}
            value={form.displayName}
            onChange={(v) => update('displayName', v)}
            error={errors.displayName}
            autoFocus
          />
        )}

        <Field
          label={t('auth.email')}
          type="email"
          value={form.email}
          onChange={(v) => update('email', v)}
          error={errors.email}
          autoFocus={!isRegister}
        />

        <PasswordInput
          label={t('auth.password')}
          value={form.password}
          onChange={(v) => update('password', v)}
          error={errors.password}
        />

        {isRegister && (
          <PasswordInput
            label={t('auth.confirmPassword')}
            value={form.confirm}
            onChange={(v) => update('confirm', v)}
            error={errors.confirm}
          />
        )}

        {!isRegister && (
          <div className="auth-forgot">
            <Link to="/forgot">{t('auth.forgotPassword')}</Link>
          </div>
        )}

        {bannerError && (
          <div className="auth-error-banner">
            {t(bannerError.key, bannerError.vars)}
          </div>
        )}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {isRegister ? t('auth.createAccount') : t('auth.signIn')}
        </button>

        <div className="auth-divider" role="separator">
          <span>{t('auth.or')}</span>
        </div>

        <a className="auth-google" href={GOOGLE_LOGIN_URL}>
          <GoogleIcon />
          {t('auth.continueGoogle')}
        </a>

        <div className="auth-switch">
          {isRegister ? (
            <>
              {t('auth.haveAccount')} <Link to="/login">{t('auth.signIn')}</Link>
            </>
          ) : (
            <>
              {t('auth.newHere')} <Link to="/register">{t('auth.createAccount')}</Link>
            </>
          )}
        </div>

        {!isRegister && (
          <div className="auth-demo-hint">
            {t('auth.demoHint')} <code>demo@tradelens.app</code> / <code>demo1234</code>
          </div>
        )}
      </form>
    </div>
  )
}

// Google "G" mark, inline so no external asset is fetched.
function GoogleIcon() {
  return (
    <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  )
}

function Field({ label, type = 'text', value, onChange, error, autoFocus }) {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <input
        className={`auth-input${error ? ' auth-input-error' : ''}`}
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="auth-field-error">{error}</span>}
    </label>
  )
}
