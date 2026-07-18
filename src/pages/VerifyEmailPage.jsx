import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import LanguageMenu from '../components/LanguageMenu.jsx'
import '../css/auth.css'
import '../css/verify.css'

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

// Full-screen OTP step. Registration and any login with an unverified email
// land here (ProtectedRoute redirects); the app is unreachable until the code
// is confirmed. A code is requested automatically on arrival.
export default function VerifyEmailPage() {
  const {
    currentUser,
    ready,
    emailVerified,
    requestVerifyCode,
    confirmVerifyCode,
    logout,
  } = useAuth()
  const { t, lang } = useLang()

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('') // i18n key
  const [notice, setNotice] = useState('') // i18n key
  const [busy, setBusy] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const inputsRef = useRef([])
  const requested = useRef(false)

  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  async function sendCode() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    const res = await requestVerifyCode(lang) // email arrives in the UI language
    setBusy(false)
    if (res.ok || res.code === 'resend_cooldown') {
      // Cooldown means a code was already sent moments ago — same message,
      // and the local countdown starts either way.
      setCooldownUntil(Date.now() + RESEND_SECONDS * 1000)
      setNotice('auth.codeSent')
    } else {
      setError(res.error)
    }
  }

  // Request a code on arrival (once; a StrictMode double-mount just hits the
  // backend cooldown, which the handler above treats as "sent").
  useEffect(() => {
    if (currentUser && !emailVerified && !requested.current) {
      requested.current = true
      sendCode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, emailVerified])

  // Full code -> submit without a button press. The ref stops the effect from
  // re-submitting the same code on unrelated re-renders.
  const code = digits.join('')
  const submittedCode = useRef('')
  useEffect(() => {
    if (code.length !== CODE_LENGTH || submittedCode.current === code) return
    submittedCode.current = code
    ;(async () => {
      setBusy(true)
      setError('')
      const res = await confirmVerifyCode(code)
      setBusy(false)
      if (!res.ok) {
        // Wrong/expired code: explain, clear, start over.
        submittedCode.current = ''
        setError(res.error)
        setNotice('')
        setDigits(Array(CODE_LENGTH).fill(''))
        inputsRef.current[0]?.focus()
      }
      // Success flips emailVerified and the redirect below takes over.
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  if (ready && !currentUser) return <Navigate to="/login" replace />
  if (ready && emailVerified) return <Navigate to="/library" replace />
  if (!ready) return <div className="auth-loading">{t('common.loading')}</div>

  // Write `value` into the boxes starting at `index` (typing, autofill, paste).
  function fillFrom(index, value) {
    const incoming = value.replace(/\D/g, '')
    setError('')
    setDigits((prev) => {
      const next = [...prev]
      if (!incoming) {
        next[index] = ''
        return next
      }
      for (let i = 0; i < incoming.length && index + i < CODE_LENGTH; i += 1) {
        next[index + i] = incoming[i]
      }
      return next
    })
    if (incoming) {
      const target = Math.min(index + incoming.length, CODE_LENGTH - 1)
      inputsRef.current[target]?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      setError('')
      setDigits((prev) => {
        const next = [...prev]
        if (next[index]) {
          next[index] = ''
        } else if (index > 0) {
          next[index - 1] = ''
          inputsRef.current[index - 1]?.focus()
        }
        return next
      })
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    fillFrom(0, e.clipboardData.getData('text'))
  }

  function handleLogout() {
    logout()
  }

  return (
    <div className="auth-page">
      {/* TL-FEAT-011: language entry on logged-out screens */}
      <div className="auth-lang">
        <LanguageMenu />
      </div>
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">◈</span> {t('common.appName')}
        </div>
        <h1 className="auth-title">{t('auth.verifyTitle')}</h1>
        <p className="auth-subtitle">
          {t('auth.verifyIntro', { email: currentUser.email })}
        </p>

        {notice && !error && <div className="verify-notice">{t(notice)}</div>}
        {error && <div className="auth-error-banner">{t(error)}</div>}

        <div className="otp-row">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el
              }}
              className="otp-box"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={CODE_LENGTH} /* room for autofill; fillFrom splits it */
              value={digit}
              disabled={busy}
              autoFocus={i === 0}
              aria-label={t('auth.otpDigitAria', { n: i + 1 })}
              onChange={(e) => fillFrom(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        <button
          type="button"
          className="verify-resend"
          disabled={busy || cooldown > 0}
          onClick={sendCode}
        >
          {cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resend')}
        </button>

        <div className="auth-switch">
          <button type="button" className="verify-logout" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
