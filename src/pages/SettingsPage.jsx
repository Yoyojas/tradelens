import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { DATE_LOCALES } from '../i18n/languages.js'
import * as authApi from '../services/auth.js'
import PasswordInput from '../components/PasswordInput.jsx'
import Modal from '../components/Modal.jsx'
import TagManager from '../components/settings/TagManager.jsx'
import TradingPreferences from '../components/settings/TradingPreferences.jsx'
import SyncDevices from '../components/settings/SyncDevices.jsx'
import '../css/settings.css'

// Account settings: change password, device sessions. The danger zone lands
// here with the next batch item.
export default function SettingsPage() {
  const { currentUser } = useAuth()
  const { t } = useLang()

  return (
    <section className="page">
      <h1 className="page-title">{t('settings.title')}</h1>
      <p className="page-subtitle">{t('settings.subtitle')}</p>

      <div className="set-card">
        <h2 className="set-heading">{t('settings.pwTitle')}</h2>
        {currentUser?.hasPassword ? <ChangePasswordForm /> : <OAuthNoPassword />}
      </div>

      <div className="set-card">
        <h2 className="set-heading">{t('settings.prefsTitle')}</h2>
        <TradingPreferences />
      </div>

      <div className="set-card">
        <h2 className="set-heading">{t('settings.tagsTitle')}</h2>
        <TagManager />
      </div>

      <div className="set-card">
        <h2 className="set-heading">{t('settings.devicesTitle')}</h2>
        <DevicesSection />
      </div>

      <div className="set-card">
        <h2 className="set-heading">{t('settings.devTitle')}</h2>
        <SyncDevices />
      </div>

      <div className="set-card set-card-danger">
        <h2 className="set-heading set-heading-danger">
          {t('settings.dangerTitle')}
        </h2>
        <DangerZone />
      </div>
    </section>
  )
}

// Account deletion: type the password (or, for Google-only accounts, the full
// email) to arm the button, then a second modal warns before the real call.
function DangerZone() {
  const { currentUser, deleteAccount } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const hasPassword = !!currentUser?.hasPassword

  const [confirmValue, setConfirmValue] = useState('')
  const [error, setError] = useState('') // i18n key
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const armed = hasPassword
    ? confirmValue.length > 0
    : confirmValue.trim().toLowerCase() === currentUser?.email

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    setError('')
    const res = await deleteAccount(
      hasPassword
        ? { password: confirmValue }
        : { confirmEmail: confirmValue.trim() },
    )
    setBusy(false)
    if (res.ok) {
      navigate('/login', { replace: true })
      return
    }
    setModalOpen(false)
    if (res.code === 'invalid_credentials') setError('settings.errWrongOld')
    else if (res.code === 'confirm_mismatch') setError('settings.errConfirmMismatch')
    else if (res.code === 'forbidden') setError('settings.deleteForbidden')
    else setError(res.error)
  }

  return (
    <div className="set-form">
      <p className="set-muted">{t('settings.dangerText')}</p>
      {hasPassword ? (
        <PasswordInput
          label={t('settings.deletePwLabel')}
          value={confirmValue}
          onChange={(v) => {
            setConfirmValue(v)
            setError('')
          }}
        />
      ) : (
        <label className="auth-field">
          <span className="auth-label">{t('settings.deleteEmailLabel')}</span>
          <input
            className="auth-input"
            type="email"
            value={confirmValue}
            onChange={(e) => {
              setConfirmValue(e.target.value)
              setError('')
            }}
          />
        </label>
      )}
      {error && <div className="set-err">{t(error)}</div>}
      <button
        type="button"
        className="set-delete-btn"
        disabled={!armed || busy}
        onClick={() => setModalOpen(true)}
      >
        {t('settings.deleteAccount')}
      </button>

      {modalOpen && (
        <Modal
          onClose={busy ? () => {} : () => setModalOpen(false)}
          ariaLabel={t('settings.deleteConfirmTitle')}
        >
          <div className="set-confirm">
            <h2 className="set-heading set-heading-danger">
              {t('settings.deleteConfirmTitle')}
            </h2>
            <p className="set-muted">
              {t('settings.deleteConfirmBody', { email: currentUser?.email })}
            </p>
            <div className="set-confirm-actions">
              <button
                type="button"
                className="set-secondary"
                disabled={busy}
                onClick={() => setModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="set-delete-btn"
                disabled={busy}
                onClick={handleDelete}
              >
                {busy ? t('common.loading') : t('settings.deleteConfirmAction')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Crude-but-honest device label from the stored user-agent digest.
function deviceLabel(userAgent, fallback) {
  const ua = userAgent || ''
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : null
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : null
  if (!browser && !os) return fallback
  return [browser, os].filter(Boolean).join(' · ')
}

function DevicesSection() {
  const { logout } = useAuth()
  const { t, lang } = useLang()
  const [sessions, setSessions] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    authApi
      .fetchSessions()
      .then((res) => {
        if (!cancelled) setSessions(res.sessions)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function revoke(session) {
    if (busy) return
    setBusy(true)
    setError(false)
    try {
      const res = await authApi.revokeSession(session.id)
      if (res.loggedOut) {
        // The user chose to sign out this very device.
        logout()
        return
      }
      setSessions(res.sessions)
      setNotice('')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function revokeOthers() {
    if (busy) return
    setBusy(true)
    setError(false)
    try {
      const res = await authApi.revokeOtherSessions()
      setSessions(res.sessions)
      setNotice('settings.othersSignedOut')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const locale = DATE_LOCALES[lang] || 'en-US'
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString(locale) : '')

  return (
    <div className="set-devices">
      {error && <div className="set-err">{t('common.requestFailed')}</div>}
      {notice && <div className="set-ok">{t(notice)}</div>}
      <ul className="set-device-list">
        {sessions.map((s) => (
          <li key={s.id} className="set-device">
            <div className="set-device-info">
              <span className="set-device-name">
                {deviceLabel(s.userAgent, t('settings.deviceUnknown'))}
                {s.current && (
                  <span className="set-device-current">
                    {t('settings.deviceCurrent')}
                  </span>
                )}
              </span>
              <span className="set-muted set-device-seen">
                {t('settings.deviceSeen', { date: fmt(s.lastSeen) })}
              </span>
            </div>
            <button
              type="button"
              className="set-secondary"
              disabled={busy}
              onClick={() => revoke(s)}
            >
              {t('settings.signOutDevice')}
            </button>
          </li>
        ))}
      </ul>
      {sessions.length > 1 && (
        <button
          type="button"
          className="set-secondary set-danger-text"
          disabled={busy}
          onClick={revokeOthers}
        >
          {t('settings.signOutOthers')}
        </button>
      )}
    </div>
  )
}

function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const { t } = useLang()
  const [form, setForm] = useState({ old: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null) // {kind: 'ok'|'err', key}
  const [busy, setBusy] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    setBanner(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    const next = {}
    if (!form.old) next.old = t('auth.errPasswordRequired')
    if (!form.next) next.next = t('auth.errPasswordRequired')
    else if (form.next.length < 8) next.next = t('auth.errPasswordShort')
    if (form.confirm !== form.next) next.confirm = t('auth.errPasswordMismatch')
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setBusy(true)
    const res = await changePassword({
      oldPassword: form.old,
      newPassword: form.next,
    })
    setBusy(false)
    if (res.ok) {
      setForm({ old: '', next: '', confirm: '' })
      setBanner({ kind: 'ok', key: 'settings.pwSuccess' })
    } else if (res.code === 'invalid_credentials') {
      setBanner({ kind: 'err', key: 'settings.errWrongOld' })
    } else {
      setBanner({ kind: 'err', key: res.error })
    }
  }

  return (
    <form className="set-form" onSubmit={handleSubmit} noValidate>
      <PasswordInput
        label={t('settings.pwCurrent')}
        value={form.old}
        onChange={(v) => update('old', v)}
        error={errors.old}
      />
      <PasswordInput
        label={t('auth.newPassword')}
        value={form.next}
        onChange={(v) => update('next', v)}
        error={errors.next}
      />
      <PasswordInput
        label={t('auth.confirmPassword')}
        value={form.confirm}
        onChange={(v) => update('confirm', v)}
        error={errors.confirm}
      />
      {banner && (
        <div className={banner.kind === 'ok' ? 'set-ok' : 'set-err'}>
          {t(banner.key)}
        </div>
      )}
      <button type="submit" className="set-submit" disabled={busy}>
        {t('settings.pwSubmit')}
      </button>
    </form>
  )
}

// Google-only accounts have no password; setting one goes through the
// password-reset flow (which requires being signed out).
function OAuthNoPassword() {
  const { logout } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()

  function goToReset() {
    logout()
    navigate('/forgot', { replace: true })
  }

  return (
    <div className="set-oauth-note">
      <p className="set-muted">{t('settings.oauthNoPassword')}</p>
      <p className="set-muted">{t('settings.oauthSetupHint')}</p>
      <button type="button" className="set-secondary" onClick={goToReset}>
        {t('settings.goToReset')}
      </button>
    </div>
  )
}
