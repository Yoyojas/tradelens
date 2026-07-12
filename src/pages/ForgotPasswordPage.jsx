import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { errorKey, useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import * as authApi from '../services/auth.js'
import PasswordInput from '../components/PasswordInput.jsx'
import '../css/auth.css'
import '../css/verify.css'

const RESEND_SECONDS = 60

// Password reset: email -> code + new password -> back to sign-in.
// The backend answers 200 whether or not the email exists (no account
// enumeration), so the copy stays deliberately vague at the email step.
export default function ForgotPasswordPage() {
  const { currentUser, ready } = useAuth()
  const { t, lang } = useLang()

  const [step, setStep] = useState('email') // email | code | done
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('') // i18n key
  const [busy, setBusy] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now())

  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (ready && currentUser) return <Navigate to="/library" replace />

  async function sendCode(e) {
    e?.preventDefault()
    const trimmed = email.trim()
    if (busy || !trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('auth.errEmailInvalid')
      return
    }
    setBusy(true)
    setError('')
    try {
      await authApi.forgotPassword(trimmed, lang) // email in the UI language
      setCooldownUntil(Date.now() + RESEND_SECONDS * 1000)
      setStep('code')
    } catch (err) {
      setError(errorKey(err.code))
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (busy) return
    if (password.length < 8) {
      setError('auth.errPasswordShort')
      return
    }
    if (confirm !== password) {
      setError('auth.errPasswordMismatch')
      return
    }
    setBusy(true)
    setError('')
    try {
      await authApi.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword: password,
      })
      setStep('done')
    } catch (err) {
      setError(errorKey(err.code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">◈</span> {t('common.appName')}
        </div>
        <h1 className="auth-title">{t('auth.resetTitle')}</h1>

        {step === 'email' && (
          <form className="auth-reset-form" onSubmit={sendCode} noValidate>
            <p className="auth-subtitle">{t('auth.resetIntro')}</p>
            <label className="auth-field">
              <span className="auth-label">{t('auth.email')}</span>
              <input
                className="auth-input"
                type="email"
                value={email}
                autoFocus
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
              />
            </label>
            {error && <div className="auth-error-banner">{t(error)}</div>}
            <button type="submit" className="auth-submit" disabled={busy}>
              {t('auth.sendCode')}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form className="auth-reset-form" onSubmit={handleReset} noValidate>
            <p className="auth-subtitle">
              {t('auth.resetCodeIntro', { email: email.trim() })}
            </p>
            <label className="auth-field">
              <span className="auth-label">{t('auth.codeLabel')}</span>
              <input
                className="auth-input verify-code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                autoFocus
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
              />
            </label>
            <PasswordInput
              label={t('auth.newPassword')}
              value={password}
              onChange={(v) => {
                setPassword(v)
                setError('')
              }}
            />
            <PasswordInput
              label={t('auth.confirmPassword')}
              value={confirm}
              onChange={(v) => {
                setConfirm(v)
                setError('')
              }}
            />
            {error && <div className="auth-error-banner">{t(error)}</div>}
            <button
              type="submit"
              className="auth-submit"
              disabled={busy || code.length !== 6}
            >
              {t('auth.resetAction')}
            </button>
            <button
              type="button"
              className="verify-resend"
              disabled={busy || cooldown > 0}
              onClick={sendCode}
            >
              {cooldown > 0
                ? t('auth.resendIn', { s: cooldown })
                : t('auth.resend')}
            </button>
          </form>
        )}

        {step === 'done' && (
          <>
            <div className="verify-notice">{t('auth.resetDone')}</div>
            <div className="auth-switch">
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </div>
          </>
        )}

        {step !== 'done' && (
          <div className="auth-switch">
            <Link to="/login">{t('auth.backToLogin')}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
