import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext.jsx'
import { formatDate } from '../../utils/format.js'
import * as dataApi from '../../services/data.js'

// Sync-device tokens for the local snapshot push agent (TL-DATA-006).
// The plaintext token is displayed exactly once, right after creation.
export default function SyncDevices() {
  const { t } = useLang()
  const [devices, setDevices] = useState([])
  const [name, setName] = useState('')
  const [minted, setMinted] = useState(null) // {token, name} shown ONCE
  const [armedId, setArmedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    dataApi
      .fetchDevices()
      .then((res) => {
        if (!cancelled) setDevices(res.devices)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(false)
    try {
      const res = await dataApi.createDevice(name.trim() || undefined)
      setDevices((prev) => [...prev, res.device])
      setMinted({ token: res.token, name: res.device.name })
      setName('')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke(device) {
    if (busy) return
    if (armedId !== device.id) {
      setArmedId(device.id)
      return
    }
    setBusy(true)
    try {
      const updated = await dataApi.revokeDevice(device.id)
      setDevices((prev) => prev.map((d) => (d.id === device.id ? updated : d)))
      setArmedId(null)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sd-devices">
      <p className="set-muted">{t('settings.devSub')}</p>

      {minted && (
        <div className="sd-minted">
          <p className="sd-minted-warn">{t('settings.devTokenOnce')}</p>
          <code className="sd-token">{minted.token}</code>
          <button
            type="button"
            className="tm-btn"
            onClick={() => setMinted(null)}
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {devices.length === 0 ? (
        <p className="tm-empty">{t('settings.devEmpty')}</p>
      ) : (
        <ul className="tm-list">
          {devices.map((device) => (
            <li key={device.id} className="tm-row">
              <span className="tm-label">
                {device.name}{' '}
                <span className="sd-hint">{device.tokenHint}</span>
                {device.revoked && (
                  <span className="sd-revoked">{t('settings.devRevoked')}</span>
                )}
              </span>
              <span className="sd-used">
                {device.lastUsedAt
                  ? t('settings.devLastUsed', {
                      date: formatDate(device.lastUsedAt),
                    })
                  : t('settings.devNeverUsed')}
              </span>
              {!device.revoked && (
                <button
                  type="button"
                  className={`tm-btn ${armedId === device.id ? 'tm-btn-danger' : ''}`}
                  disabled={busy}
                  onClick={() => handleRevoke(device)}
                >
                  {armedId === device.id
                    ? t('settings.devRevokeSure')
                    : t('settings.devRevoke')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="tm-create" onSubmit={handleCreate}>
        <input
          className="tf-input tm-create-input"
          value={name}
          placeholder={t('settings.devName')}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="tm-btn tm-btn-primary" disabled={busy}>
          {t('settings.devCreate')}
        </button>
      </form>
      {error && <p className="set-err">{t('common.requestFailed')}</p>}
      <p className="set-muted sd-agent-hint">{t('settings.devAgentHint')}</p>
    </div>
  )
}
