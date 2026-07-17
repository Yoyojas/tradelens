import { useEffect, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'
import { formatDate } from '../../utils/format.js'
import * as dataApi from '../../services/data.js'

// Broker Connection Center (TL-DATA-004). One unified flow; only IBKR's
// Flex-query adapter is real — other majors are listed honestly as Coming
// Soon (no fake connect buttons). The token is sent to the server once and
// never comes back: state here only ever holds the masked summary.
const CATALOG = [
  { provider: 'ibkr', name: 'Interactive Brokers', type: 'flex_query', available: true },
  { provider: 'schwab', name: 'Charles Schwab', type: 'unsupported' },
  { provider: 'fidelity', name: 'Fidelity', type: 'unsupported' },
  { provider: 'robinhood', name: 'Robinhood', type: 'unsupported' },
  { provider: 'webull', name: 'Webull', type: 'unsupported' },
  { provider: 'etrade', name: 'E*TRADE', type: 'unsupported' },
  { provider: 'tastytrade', name: 'tastytrade', type: 'unsupported' },
]

const ERROR_KEYS = {
  flex_token_expired: 'broker.errTokenExpired',
  flex_query_invalid: 'broker.errQueryInvalid',
  flex_not_ready: 'broker.errNotReady',
  flex_rate_limited: 'broker.errRateLimited',
  flex_unreachable: 'broker.errUnreachable',
  flex_parse_error: 'broker.errQueryInvalid',
  flex_key_missing: 'broker.errServer',
  invalid_payload: 'broker.errInputs',
  conflict: 'common.requestFailed',
}
const errKey = (code) => ERROR_KEYS[code] || 'common.requestFailed'

export default function BrokerCenter({ connections, onChange }) {
  const { t } = useLang()
  const flexConn = connections.find((c) => c.provider === 'ibkr-flex') || null
  const [open, setOpen] = useState(false) // IBKR setup panel toggle

  return (
    <div className="bc-center">
      <h2 className="cn-section-title">{t('broker.title')}</h2>
      <p className="bc-sub">{t('broker.subtitle')}</p>

      <div className="bc-catalog">
        {CATALOG.map((b) => (
          <div key={b.provider} className="bc-card">
            <span className="bc-name">{b.name}</span>
            {b.available ? (
              flexConn ? (
                <span className={`bc-status bc-status-${flexConn.status}`}>
                  {t(`broker.status_${flexConn.status}`)}
                </span>
              ) : (
                <button
                  type="button"
                  className="bc-connect-btn"
                  onClick={() => setOpen((v) => !v)}
                >
                  {t('broker.connect')}
                </button>
              )
            ) : (
              <span className="bc-soon">{t('broker.comingSoon')}</span>
            )}
          </div>
        ))}
      </div>

      {flexConn ? (
        <FlexStatus connection={flexConn} onChange={onChange} t={t} />
      ) : (
        open && <FlexSetup onChange={onChange} t={t} />
      )}
    </div>
  )
}

// ── Setup: guide + inputs + Test Connection + save & first sync ──
function FlexSetup({ onChange, t }) {
  const { refreshTrades } = useData()
  const [guideOpen, setGuideOpen] = useState(false)
  const [token, setToken] = useState('')
  const [queryId, setQueryId] = useState('')
  const [dateFormat, setDateFormat] = useState('yyyyMMdd')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [error, setError] = useState(null)

  const ready = token.trim().length >= 8 && /^\d+$/.test(queryId.trim())

  async function handleTest() {
    if (testing || !ready) return
    setTesting(true)
    setError(null)
    setTestResult(null)
    try {
      const res = await dataApi.testBrokerConnection({
        token: token.trim(),
        queryId: queryId.trim(),
        dateFormat,
      })
      setTestResult(res)
    } catch (e) {
      setError(errKey(e.code))
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    if (saving || !ready) return
    setSaving(true)
    setError(null)
    try {
      const conn = await dataApi.createBrokerConnection({
        token: token.trim(),
        queryId: queryId.trim(),
        dateFormat,
      })
      setToken('') // the plaintext leaves memory as soon as it is stored
      const res = await dataApi.syncBrokerConnection(conn.id)
      setSyncResult(res.run)
      onChange([res.connection])
      await refreshTrades().catch(() => {})
    } catch (e) {
      setError(errKey(e.code))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bc-setup">
      <p className="bc-note">{t('broker.readOnlyNote')}</p>

      <button
        type="button"
        className="bc-guide-toggle"
        onClick={() => setGuideOpen((v) => !v)}
      >
        {guideOpen ? '▾' : '▸'} {t('broker.guideTitle')}
      </button>
      {guideOpen && (
        <ol className="bc-guide">
          <li>{t('broker.guide1')}</li>
          <li>{t('broker.guide2')}</li>
          <li>{t('broker.guide3')}</li>
          <li>{t('broker.guide4')}</li>
          <li>{t('broker.guide5')}</li>
        </ol>
      )}

      <div className="bc-form">
        <label className="bc-field">
          <span>{t('broker.tokenLabel')}</span>
          <input
            className="tf-input"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              setTestResult(null)
            }}
          />
        </label>
        <label className="bc-field">
          <span>{t('broker.queryIdLabel')}</span>
          <input
            className="tf-input"
            value={queryId}
            onChange={(e) => {
              setQueryId(e.target.value)
              setTestResult(null)
            }}
          />
        </label>
        <label className="bc-field">
          <span>{t('broker.dateFormatLabel')}</span>
          <select
            className="tf-input"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
            <option value="yyyyMMdd">yyyyMMdd</option>
            <option value="yyyy-MM-dd">yyyy-MM-dd</option>
          </select>
        </label>
      </div>

      <div className="bc-actions">
        <button
          type="button"
          className="bc-secondary"
          disabled={testing || !ready}
          onClick={handleTest}
        >
          {testing ? t('common.loading') : t('broker.testConnection')}
        </button>
        <button
          type="button"
          className="bc-primary"
          disabled={saving || !ready || !testResult?.ok}
          onClick={handleSave}
        >
          {saving ? t('broker.syncing') : t('broker.saveAndSync')}
        </button>
      </div>

      {testResult?.ok && (
        <div className="cn-banner cn-banner-ok">
          {t('broker.testOk', {
            mask: testResult.tokenMask,
            n: testResult.executions,
          })}
          {!testResult.fieldsOk && ` ${t('broker.testFieldsWarn')}`}
        </div>
      )}
      {syncResult && (
        <div className="cn-banner cn-banner-ok">
          {t('broker.syncDone', {
            added: syncResult.added,
            skipped: syncResult.skipped,
            failed: syncResult.failed,
          })}
        </div>
      )}
      {error && <div className="cn-banner cn-banner-error">{t(error)}</div>}
    </div>
  )
}

// ── Status: last/next sync, sync now, update token, disconnect, history ──
function FlexStatus({ connection, onChange, t }) {
  const { refreshTrades } = useData()
  const [runs, setRuns] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // {kind, text}
  const [tokenOpen, setTokenOpen] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  useEffect(() => {
    let cancelled = false
    dataApi
      .fetchSyncRuns(connection.id)
      .then((res) => {
        if (!cancelled) setRuns(res.runs)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [connection.id, connection.lastSyncAt])

  async function handleSyncNow() {
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await dataApi.syncBrokerConnection(connection.id)
      onChange([res.connection])
      if (res.run.status === 'ok') {
        setMessage({
          kind: 'ok',
          text: t('broker.syncDone', {
            added: res.run.added,
            skipped: res.run.skipped,
            failed: res.run.failed,
          }),
        })
        await refreshTrades().catch(() => {})
      } else {
        setMessage({ kind: 'error', text: t(errKey(res.run.errorCode)) })
      }
    } catch (e) {
      setMessage({ kind: 'error', text: t(errKey(e.code)) })
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateToken() {
    if (busy || newToken.trim().length < 8) return
    setBusy(true)
    setMessage(null)
    try {
      const conn = await dataApi.updateBrokerConnection(connection.id, {
        token: newToken.trim(),
      })
      setNewToken('')
      setTokenOpen(false)
      onChange([conn])
      setMessage({ kind: 'ok', text: t('broker.tokenUpdated') })
    } catch (e) {
      setMessage({ kind: 'error', text: t(errKey(e.code)) })
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (busy) return
    if (!confirmDisconnect) {
      setConfirmDisconnect(true)
      return
    }
    setBusy(true)
    try {
      await dataApi.deleteBrokerConnection(connection.id)
      onChange([])
    } catch (e) {
      setMessage({ kind: 'error', text: t(errKey(e.code)) })
      setBusy(false)
    }
  }

  const alert =
    connection.status === 'expired'
      ? 'broker.alertExpired'
      : connection.status === 'error'
        ? 'broker.alertError'
        : null

  return (
    <div className="bc-setup">
      {alert && <div className="cn-banner cn-banner-error">{t(alert)}</div>}

      <div className="bc-status-grid">
        <div className="bc-stat">
          <span className="bc-stat-label">{t('broker.tokenLabel')}</span>
          <span className="bc-stat-value">{connection.tokenMask}</span>
        </div>
        <div className="bc-stat">
          <span className="bc-stat-label">{t('broker.queryIdLabel')}</span>
          <span className="bc-stat-value">{connection.queryId}</span>
        </div>
        <div className="bc-stat">
          <span className="bc-stat-label">{t('broker.lastSync')}</span>
          <span className="bc-stat-value">
            {connection.lastSyncAt ? formatDate(connection.lastSyncAt) : '—'}
          </span>
        </div>
        <div className="bc-stat">
          <span className="bc-stat-label">{t('broker.nextSync')}</span>
          <span className="bc-stat-value">
            {connection.nextSyncAt ? formatDate(connection.nextSyncAt) : '—'}
          </span>
        </div>
      </div>

      <div className="bc-actions">
        <button
          type="button"
          className="bc-primary"
          disabled={busy}
          onClick={handleSyncNow}
        >
          {busy ? t('broker.syncing') : t('broker.syncNow')}
        </button>
        <button
          type="button"
          className="bc-secondary"
          onClick={() => setTokenOpen((v) => !v)}
        >
          {t('broker.updateToken')}
        </button>
        <button
          type="button"
          className={`bc-secondary ${confirmDisconnect ? 'bc-danger' : ''}`}
          disabled={busy}
          onClick={handleDisconnect}
        >
          {confirmDisconnect ? t('broker.disconnectSure') : t('broker.disconnect')}
        </button>
      </div>

      {tokenOpen && (
        <div className="bc-form">
          <label className="bc-field">
            <span>{t('broker.newTokenLabel')}</span>
            <input
              className="tf-input"
              type="password"
              autoComplete="off"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
            />
          </label>
          <div className="bc-actions">
            <button
              type="button"
              className="bc-primary"
              disabled={busy || newToken.trim().length < 8}
              onClick={handleUpdateToken}
            >
              {t('settings.tagSave')}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`cn-banner ${
            message.kind === 'ok' ? 'cn-banner-ok' : 'cn-banner-error'
          }`}
        >
          {message.text}
        </div>
      )}

      {runs.length > 0 && (
        <div className="bc-history">
          <h3 className="bc-history-title">{t('broker.historyTitle')}</h3>
          <div className="cn-table-wrap">
            <table className="cn-table">
              <thead>
                <tr>
                  <th>{t('broker.colWhen')}</th>
                  <th>{t('broker.colKind')}</th>
                  <th>{t('broker.colResult')}</th>
                  <th className="cn-num">{t('broker.colAdded')}</th>
                  <th className="cn-num">{t('broker.colSkipped')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{formatDate(run.startedAt)}</td>
                    <td>{t(`broker.kind_${run.kind}`)}</td>
                    <td>
                      {run.status === 'ok'
                        ? t('broker.runOk')
                        : run.errorCode
                          ? t(errKey(run.errorCode))
                          : t('broker.runError')}
                    </td>
                    <td className="cn-num">{run.added}</td>
                    <td className="cn-num">{run.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
