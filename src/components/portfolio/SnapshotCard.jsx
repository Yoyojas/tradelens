import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext.jsx'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { accountTagLabel } from '../../utils/accountTags.js'
import * as dataApi from '../../services/data.js'

// Broker portfolio snapshot (TL-DATA-006). Never pretends to be live: both
// timestamps (captured / received) are always shown, snapshots older than a
// day get a stale badge. Valuation (v1, per DISC-002 §6): USD STK/ETF only —
// other rows are listed but greyed out and excluded from the total; when
// quotes arrive, snapshot time and quote time are annotated side by side.
const STALE_MS = 24 * 60 * 60 * 1000

export default function SnapshotCard() {
  const { t } = useLang()
  const [snapshot, setSnapshot] = useState(undefined) // undefined=loading
  const [quotes, setQuotes] = useState({})

  useEffect(() => {
    let cancelled = false
    dataApi
      .fetchLatestSnapshot()
      .then((res) => {
        if (!cancelled) setSnapshot(res.snapshot)
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const valuable = useMemo(
    () =>
      (snapshot?.positions || []).filter(
        (p) => p.currency === 'USD' && p.secType === 'STK',
      ),
    [snapshot],
  )

  useEffect(() => {
    if (!valuable.length) return
    let cancelled = false
    dataApi
      .fetchQuotes(valuable.map((p) => p.symbol))
      .then((res) => {
        if (!cancelled) setQuotes(res.quotes)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [valuable])

  if (snapshot === undefined) return null
  if (snapshot === null) {
    return (
      <div className="ps-card">
        <h2 className="cn-section-title">{t('snapshot.title')}</h2>
        <p className="ps-empty">{t('snapshot.empty')}</p>
        <p className="ps-hint">{t('snapshot.agentHint')}</p>
      </div>
    )
  }

  const stale =
    Date.now() - new Date(snapshot.capturedAt).getTime() > STALE_MS
  const quoteTime = Object.values(quotes).find((q) => q?.time)?.time

  let total = 0
  let valuedCount = 0
  for (const p of valuable) {
    const quote = quotes[p.symbol]
    if (quote?.status === 'ok') {
      total += quote.price * p.quantity
      valuedCount += 1
    }
  }

  return (
    <div className="ps-card">
      <div className="ps-head">
        <h2 className="cn-section-title">{t('snapshot.title')}</h2>
        {stale && <span className="ps-stale">{t('snapshot.staleBadge')}</span>}
      </div>
      <p className="ps-times">
        {t('snapshot.capturedAt')}: {formatDate(snapshot.capturedAt)} ·{' '}
        {t('snapshot.receivedAt')}: {formatDate(snapshot.receivedAt)}
        {quoteTime && (
          <> · {t('snapshot.quoteTime')}: {formatDate(quoteTime)}</>
        )}
      </p>
      {quoteTime && <p className="ps-mixed">{t('snapshot.mixedNote')}</p>}

      {snapshot.summary.length > 0 && (
        <div className="cn-cards ps-summary">
          {snapshot.summary.map((row) => (
            <div key={row.tag} className="cn-card">
              <span className="cn-card-label">
                {accountTagLabel(row.tag, t)}
              </span>
              <span className="cn-card-value">
                {row.value == null ? '—' : formatCurrency(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {snapshot.positions.length > 0 && (
        <div className="cn-table-wrap ps-table">
          <table className="cn-table">
            <thead>
              <tr>
                <th>{t('connect.colSymbol')}</th>
                <th className="cn-num">{t('connect.colPosition')}</th>
                <th className="cn-num">{t('connect.colAvgCost')}</th>
                <th className="cn-num">{t('snapshot.colLast')}</th>
                <th className="cn-num">{t('snapshot.colValue')}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.positions.map((p) => {
                const quote =
                  p.currency === 'USD' && p.secType === 'STK'
                    ? quotes[p.symbol]
                    : null
                const excluded = !(p.currency === 'USD' && p.secType === 'STK')
                return (
                  <tr
                    key={`${p.symbol}-${p.currency}`}
                    className={excluded ? 'ps-row-excluded' : ''}
                  >
                    <td className="cn-sym">
                      {p.symbol}
                      {excluded && (
                        <span className="ps-excluded-badge">
                          {t('snapshot.excluded')}
                        </span>
                      )}
                    </td>
                    <td className="cn-num">{p.quantity}</td>
                    <td className="cn-num">
                      {p.avgCost == null ? '—' : formatCurrency(p.avgCost)}
                    </td>
                    <td className="cn-num">
                      {quote?.status === 'ok' ? formatCurrency(quote.price) : '—'}
                    </td>
                    <td className="cn-num">
                      {quote?.status === 'ok'
                        ? formatCurrency(quote.price * p.quantity)
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {valuedCount > 0 && (
        <p className="ps-total">
          {t('snapshot.totalLabel')}: <strong>{formatCurrency(total)}</strong>{' '}
          <span className="ps-total-note">{t('snapshot.totalNote')}</span>
        </p>
      )}
    </div>
  )
}
