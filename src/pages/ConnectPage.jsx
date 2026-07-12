import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { formatCurrency, formatDate } from '../utils/format.js'
import {
  IBKR_BASE,
  getStatus,
  getAccount,
  getPositions,
  getExecutions,
} from '../services/ibkr.js'
import * as dataApi from '../services/data.js'
import { parseFlexReport } from '../services/flex.js'
import flexSampleXml from '../mock/flexSample.xml?raw'
import '../css/connect.css'

// Account tags worth surfacing as headline cards (rest still available raw).
const HIGHLIGHT_TAGS = [
  'NetLiquidation',
  'TotalCashValue',
  'AvailableFunds',
  'BuyingPower',
  'GrossPositionValue',
]

export default function ConnectPage() {
  const { importTrades } = useData()
  const { t } = useLang()

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [account, setAccount] = useState(null)
  const [positions, setPositions] = useState([])
  const [trades, setTrades] = useState([])
  const [backendDown, setBackendDown] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const [importing, setImporting] = useState(false)

  async function refresh() {
    setLoading(true)
    setBackendDown(false)
    setImportMsg(null)
    try {
      const st = await getStatus()
      setStatus(st)
      if (st.connected) {
        // Live data stays in memory only (privacy) — never persisted.
        const [acct, pos, exec] = await Promise.all([
          getAccount().catch(() => null),
          getPositions().catch(() => ({ positions: [] })),
          getExecutions().catch(() => ({ trades: [] })),
        ])
        setAccount(acct)
        setPositions(pos?.positions ?? [])
        setTrades(exec?.trades ?? [])
      } else {
        setAccount(null)
        setPositions([])
        setTrades([])
      }
    } catch (err) {
      if (err.code === 'backend_unreachable') setBackendDown(true)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  // Probe once on mount so the page reflects current state.
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleImport() {
    if (importing) return // double-click would race the server-side dedupe
    setImporting(true)
    try {
      const { added, skipped } = await importTrades(trades)
      setImportMsg(t('connect.imported', { added, skipped }))
    } catch {
      setImportMsg(t('common.requestFailed'))
    } finally {
      setImporting(false)
    }
  }

  const accountCards = buildAccountCards(account)

  return (
    <section className="page">
      <div className="cn-header">
        <div>
          <h1 className="page-title">{t('connect.title')}</h1>
          <p className="page-subtitle">{t('connect.subtitle')}</p>
        </div>
        <button type="button" className="cn-refresh" onClick={refresh} disabled={loading}>
          {loading ? t('connect.loading') : t('connect.refresh')}
        </button>
      </div>

      {backendDown && (
        <div className="cn-banner cn-banner-error">
          {t('connect.backendDown', { url: IBKR_BASE })}
        </div>
      )}

      {status && (
        <div className={`cn-status ${status.connected ? 'cn-ok' : 'cn-off'}`}>
          <span className="cn-dot" />
          <span className="cn-status-text">
            {status.connected ? t('connect.connected') : t('connect.disconnected')}
          </span>
          <span className="cn-status-meta">
            {t('connect.endpoint', { host: status.host, port: status.port })}
          </span>
          {status.connected && <span className="cn-readonly">{t('connect.readOnly')}</span>}
          {status.error && <span className="cn-status-err">{status.error}</span>}
        </div>
      )}

      <p className="cn-privacy">{t('connect.privacyNote')}</p>

      {status?.connected && (
        <>
          {accountCards.length > 0 && (
            <div className="cn-section">
              <h2 className="cn-section-title">{t('connect.accountTitle')}</h2>
              <div className="cn-cards">
                {accountCards.map((c) => (
                  <div key={c.tag} className="cn-card">
                    <span className="cn-card-label">{c.tag}</span>
                    <span className="cn-card-value">{c.display}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cn-section">
            <h2 className="cn-section-title">{t('connect.positionsTitle')}</h2>
            {positions.length === 0 ? (
              <div className="cn-empty">{t('connect.noPositions')}</div>
            ) : (
              <div className="cn-table-wrap">
                <table className="cn-table">
                  <thead>
                    <tr>
                      <th>{t('connect.colSymbol')}</th>
                      <th className="cn-num">{t('connect.colPosition')}</th>
                      <th className="cn-num">{t('connect.colAvgCost')}</th>
                      <th>{t('connect.colCurrency')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr key={`${p.account}-${p.symbol}-${p.currency}`}>
                        <td className="cn-sym">{p.symbol}</td>
                        <td className="cn-num">{p.position}</td>
                        <td className="cn-num">{formatCurrency(p.avgCost)}</td>
                        <td>{p.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="cn-section">
            <div className="cn-exec-head">
              <h2 className="cn-section-title">
                {t('connect.previewTitle', { n: trades.length })}
              </h2>
              {trades.length > 0 && (
                <button
                  type="button"
                  className="cn-import"
                  disabled={importing}
                  onClick={handleImport}
                >
                  {t('connect.import', { n: trades.length })}
                </button>
              )}
            </div>
            {importMsg && <div className="cn-banner cn-banner-ok">{importMsg}</div>}
            {trades.length === 0 ? (
              <div className="cn-empty">{t('connect.noExecutions')}</div>
            ) : (
              <div className="cn-table-wrap">
                <table className="cn-table">
                  <thead>
                    <tr>
                      <th>{t('connect.colSymbol')}</th>
                      <th>{t('connect.colSide')}</th>
                      <th className="cn-num">{t('connect.colQty')}</th>
                      <th className="cn-num">{t('connect.colEntry')}</th>
                      <th className="cn-num">{t('connect.colExit')}</th>
                      <th>{t('connect.colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((tr, i) => (
                      <tr key={tr.externalId || i}>
                        <td className="cn-sym">{tr.ticker}</td>
                        <td>{tr.side}</td>
                        <td className="cn-num">{tr.quantity}</td>
                        <td className="cn-num">{formatCurrency(tr.entryPrice)}</td>
                        <td className="cn-num">
                          {tr.exitPrice == null ? '—' : formatCurrency(tr.exitPrice)}
                        </td>
                        <td>
                          {tr.closeDate
                            ? `${t('connect.statusClosed')} · ${formatDate(tr.closeDate)}`
                            : t('connect.statusOpen')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <FlexUploadSection />
    </section>
  )
}

// Flex statement upload: full trade history, parallel to the live section.
// XML parses in the browser; FIFO pairing runs server-side via
// POST /api/trades/import/flex (same code path as live fills).
function FlexUploadSection() {
  const { refreshTrades } = useData()
  const { t } = useLang()
  const [preview, setPreview] = useState(null) // {trades, skippedNonStock, skippedBad}
  const [error, setError] = useState('') // i18n key
  const [busy, setBusy] = useState(false)
  const [resultMsg, setResultMsg] = useState('')

  async function loadReport(xmlText) {
    if (busy) return
    setBusy(true)
    setError('')
    setResultMsg('')
    setPreview(null)
    try {
      const parsed = parseFlexReport(xmlText)
      if (parsed.error) {
        setError('connect.flexParseError')
        return
      }
      const res = await dataApi.importFlex(parsed.executions, false)
      setPreview({
        trades: res.trades,
        skippedNonStock: parsed.skippedNonStock,
        skippedBad: parsed.skippedBad + (res.skippedRows || 0),
        executions: parsed.executions,
      })
    } catch {
      setError('common.requestFailed')
    } finally {
      setBusy(false)
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // same file can be re-picked
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => loadReport(String(reader.result))
    reader.readAsText(file)
  }

  async function handleImport() {
    if (busy || !preview) return
    setBusy(true)
    setError('')
    try {
      const res = await dataApi.importFlex(preview.executions, true)
      setResultMsg(t('connect.imported', { added: res.added, skipped: res.skipped }))
      // Refresh the journal and re-flag the preview rows as existing.
      await refreshTrades().catch(() => {})
      const re = await dataApi.importFlex(preview.executions, false)
      setPreview((p) => (p ? { ...p, trades: re.trades } : p))
    } catch {
      setError('common.requestFailed')
    } finally {
      setBusy(false)
    }
  }

  const pendingCount = preview
    ? preview.trades.filter((tr) => !tr.exists).length
    : 0

  return (
    <div className="cn-section cn-flex">
      <div className="cn-flex-header">
        <div>
          <h2 className="cn-section-title">{t('connect.flexTitle')}</h2>
          <p className="cn-flex-hint">{t('connect.flexHint')}</p>
        </div>
        <div className="cn-flex-actions">
          <label className="cn-file-btn">
            {t('connect.flexChooseFile')}
            <input
              type="file"
              accept=".xml,text/xml"
              className="cn-file-input"
              disabled={busy}
              onChange={handleFile}
            />
          </label>
          <button
            type="button"
            className="cn-sample-btn"
            disabled={busy}
            onClick={() => loadReport(flexSampleXml)}
          >
            {t('connect.flexUseSample')}
          </button>
        </div>
      </div>

      {error && <div className="cn-banner cn-banner-error">{t(error)}</div>}
      {resultMsg && <div className="cn-banner cn-banner-ok">{resultMsg}</div>}

      {preview && (
        <>
          <div className="cn-preview-head">
            <h3 className="cn-section-title">
              {t('connect.flexPreviewTitle', { n: preview.trades.length })}
            </h3>
            {pendingCount > 0 && (
              <button
                type="button"
                className="cn-import"
                disabled={busy}
                onClick={handleImport}
              >
                {t('connect.flexImport', { n: pendingCount })}
              </button>
            )}
          </div>
          {(preview.skippedNonStock > 0 || preview.skippedBad > 0) && (
            <p className="cn-flex-hint">
              {t('connect.flexSkippedNote', {
                n: preview.skippedNonStock + preview.skippedBad,
              })}
            </p>
          )}
          {preview.trades.length === 0 ? (
            <div className="cn-empty">{t('connect.flexEmpty')}</div>
          ) : (
            <div className="cn-table-wrap">
              <table className="cn-table">
                <thead>
                  <tr>
                    <th>{t('connect.colSymbol')}</th>
                    <th>{t('connect.colSide')}</th>
                    <th className="cn-num">{t('connect.colQty')}</th>
                    <th className="cn-num">{t('connect.colEntry')}</th>
                    <th className="cn-num">{t('connect.colExit')}</th>
                    <th>{t('connect.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.trades.map((tr, i) => (
                    <tr
                      key={tr.externalId || i}
                      className={tr.exists ? 'cn-row-exists' : undefined}
                    >
                      <td className="cn-sym">
                        {tr.ticker}
                        {tr.exists && (
                          <span className="cn-exists-badge">
                            {t('connect.flexExists')}
                          </span>
                        )}
                      </td>
                      <td>{tr.side}</td>
                      <td className="cn-num">{tr.quantity}</td>
                      <td className="cn-num">{formatCurrency(tr.entryPrice)}</td>
                      <td className="cn-num">
                        {tr.exitPrice == null ? '—' : formatCurrency(tr.exitPrice)}
                      </td>
                      <td>
                        {tr.closeDate
                          ? `${t('connect.statusClosed')} · ${formatDate(tr.closeDate)}`
                          : t('connect.statusOpen')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function buildAccountCards(account) {
  if (!account?.summary) return []
  const cards = []
  for (const tag of HIGHLIGHT_TAGS) {
    const row = account.summary.find((r) => r.tag === tag)
    if (!row) continue
    const num = Number(row.value)
    const display = Number.isFinite(num)
      ? `${formatCurrency(num)}${row.currency && row.currency !== 'USD' ? ` ${row.currency}` : ''}`
      : `${row.value} ${row.currency || ''}`.trim()
    cards.push({ tag, display })
  }
  return cards
}
