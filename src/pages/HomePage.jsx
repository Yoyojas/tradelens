import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { DATE_LOCALES } from '../i18n/languages.js'
import * as dataApi from '../services/data.js'
import {
  computeMetrics,
  equityCurve,
  maxDrawdown,
  profitFactor,
  expectancy,
  dayWinRate,
  isClosed,
  realizedPnl,
} from '../utils/metrics.js'
import { formatCurrency, formatDate, formatPercent } from '../utils/format.js'
import MetricCard from '../components/reports/MetricCard.jsx'
import EquityCurveChart from '../components/reports/EquityCurveChart.jsx'
import WatchlistCard from '../components/quotes/WatchlistCard.jsx'
import '../css/reports.css' // reused metric-card / chart components
import '../css/quotes.css' // reused WatchlistCard
import '../css/home.css'

// Home dashboard (TL-FEAT-009): "what needs my attention today", not a
// Reports clone. Every card has its own data source and empty state — a
// missing integration NEVER blocks the page, and no card ever shows sample
// data on a real account. All money figures are realized-only (D-017).
export default function HomePage() {
  const { trades: pagedTrades, tradesTotal, playbooks, adoptedPlaybookIds } =
    useData()
  const { t, lang, tField } = useLang()

  // Metrics run over the FULL history (same pattern as Reports).
  const [allTrades, setAllTrades] = useState(null)
  const [connections, setConnections] = useState([])
  const [snapshot, setSnapshot] = useState(null)
  const [runs, setRuns] = useState([])
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    let cancelled = false
    dataApi
      .fetchTrades({ limit: 0 })
      .then((res) => !cancelled && setAllTrades(res.trades))
      .catch(() => {})
    dataApi
      .fetchConnections()
      .then((res) => !cancelled && setConnections(res.connections))
      .catch(() => {})
    dataApi
      .fetchLatestSnapshot()
      .then((res) => !cancelled && setSnapshot(res.snapshot))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const flexConn =
    connections.find((c) => c.provider === 'ibkr-flex') || null

  useEffect(() => {
    if (!flexConn) return undefined
    let cancelled = false
    dataApi
      .fetchSyncRuns(flexConn.id)
      .then((res) => !cancelled && setRuns(res.runs))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [flexConn?.id, flexConn?.lastSyncAt])

  const trades = allTrades ?? pagedTrades

  const m = useMemo(() => computeMetrics(trades), [trades])
  const curve = useMemo(() => equityCurve(trades), [trades])
  const pf = useMemo(() => profitFactor(trades), [trades])
  const exp = useMemo(() => expectancy(trades), [trades])
  const dayRate = useMemo(() => dayWinRate(curve), [curve])
  const maxDd = useMemo(() => maxDrawdown(curve), [curve])

  const openPositions = useMemo(
    () => trades.filter((tr) => !isClosed(tr)),
    [trades],
  )
  const recent = useMemo(
    () =>
      [...trades]
        .sort((a, b) => b.openDate.localeCompare(a.openDate) || b.id - a.id)
        .slice(0, 5),
    [trades],
  )
  const today = new Date().toISOString().slice(0, 10)
  const reviewList = useMemo(
    () =>
      trades.filter(
        (tr) => tr.closeDate === today && !(tr.notes || '').trim(),
      ),
    [trades, today],
  )

  const snapshotStale =
    snapshot &&
    Date.now() - new Date(snapshot.capturedAt).getTime() > 24 * 3600 * 1000

  async function handleSyncNow() {
    if (syncing || !flexConn) return
    setSyncing(true)
    try {
      const res = await dataApi.syncBrokerConnection(flexConn.id)
      setConnections([res.connection])
      const fresh = await dataApi.fetchTrades({ limit: 0 })
      setAllTrades(fresh.trades)
    } catch {
      /* the runs list will show the failure */
    } finally {
      setSyncing(false)
    }
  }

  // ⑪ Needs attention: aggregated alerts, links included.
  const pending = []
  if (flexConn?.status === 'expired') {
    pending.push({ key: 'tokenExpired', text: t('home.pendingTokenExpired'), to: '/connect' })
  }
  if (flexConn?.status === 'error' || runs[0]?.status === 'error') {
    pending.push({ key: 'syncError', text: t('home.pendingSyncError'), to: '/connect' })
  }
  if (runs[0]?.failed > 0) {
    pending.push({
      key: 'importFailures',
      text: t('home.pendingImportFailures', { n: runs[0].failed }),
      to: '/connect',
    })
  }
  if (snapshotStale) {
    pending.push({ key: 'staleSnapshot', text: t('home.pendingStaleSnapshot'), to: '/connect' })
  }

  // ⑨ Getting-started checklist (replaces any score — plain and honest).
  const checklist = [
    { key: 'checkConnect', done: !!flexConn, to: '/connect' },
    { key: 'checkFirstTrade', done: trades.length > 0 || tradesTotal > 0, to: '/journal' },
    {
      key: 'checkFirstReview',
      done: trades.some((tr) => (tr.notes || '').trim()),
      to: '/journal',
    },
  ]

  // ⑩ Playbook usage: adopted + trades opened in the last 30 days.
  const cutoff30 = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10)
  const playbookUsage = useMemo(() => {
    const counts = new Map()
    for (const tr of trades) {
      if (tr.playbookId && tr.openDate >= cutoff30) {
        counts.set(tr.playbookId, (counts.get(tr.playbookId) || 0) + 1)
      }
    }
    return playbooks
      .filter((p) => adoptedPlaybookIds.includes(p.id))
      .map((p) => ({ playbook: p, count: counts.get(p.id) || 0 }))
      .sort((a, b) => b.count - a.count)
  }, [trades, playbooks, adoptedPlaybookIds, cutoff30])

  return (
    <section className="page">
      <h1 className="page-title">{t('home.title')}</h1>

      {/* ① Status bar */}
      <div className="hm-status">
        {flexConn ? (
          <>
            <span className={`hm-chip hm-chip-${flexConn.status}`}>
              {flexConn.status === 'active'
                ? t('home.statusConnected')
                : flexConn.status === 'expired'
                  ? t('home.statusExpired')
                  : t('home.statusError')}
            </span>
            <span className="hm-chip hm-chip-muted">{t('connect.readOnly')}</span>
            {flexConn.lastSyncAt && (
              <span className="hm-chip hm-chip-muted">
                {t('home.lastSync', { date: formatDate(flexConn.lastSyncAt) })}
              </span>
            )}
            {flexConn.nextSyncAt && (
              <span className="hm-chip hm-chip-muted">
                {t('home.nextSync', { date: formatDate(flexConn.nextSyncAt) })}
              </span>
            )}
            <button
              type="button"
              className="hm-sync-btn"
              disabled={syncing}
              onClick={handleSyncNow}
            >
              {syncing ? t('broker.syncing') : t('broker.syncNow')}
            </button>
          </>
        ) : (
          <>
            <span className="hm-chip hm-chip-muted">{t('home.statusNone')}</span>
            <Link className="hm-chip hm-chip-cta" to="/connect">
              {t('home.connectCta')}
            </Link>
          </>
        )}
        {snapshot && (
          <span className="hm-chip hm-chip-muted">
            {t('home.snapshotAt', { date: formatDate(snapshot.capturedAt) })}
            {snapshotStale && ` · ${t('snapshot.staleBadge')}`}
          </span>
        )}
      </div>

      {/* ② Core realized metrics */}
      <p className="rp-realized-note">{t('reports.realizedNote')}</p>
      <div className="rp-metrics">
        <MetricCard
          label={t('reports.totalPnl')}
          value={formatCurrency(m.totalPnl)}
          tone={m.totalPnl > 0 ? 'pos' : m.totalPnl < 0 ? 'neg' : 'neutral'}
        />
        <MetricCard
          label={t('reports.winRate')}
          value={m.closedCount ? formatPercent(m.winRate) : '—'}
        />
        <MetricCard
          label={t('reports.profitFactor')}
          value={pf == null ? '—' : pf.noLosses ? '—' : pf.value.toFixed(2)}
          title={pf?.noLosses ? t('reports.noLossTooltip') : undefined}
        />
        <MetricCard
          label={t('home.dayWinRate')}
          value={dayRate == null ? '—' : formatPercent(dayRate)}
          sub={t('home.dayWinRateSub')}
        />
        <MetricCard
          label={t('home.avgWin')}
          value={m.winCount ? formatCurrency(m.avgWin) : '—'}
          tone={m.winCount ? 'pos' : 'neutral'}
        />
        <MetricCard
          label={t('home.avgLoss')}
          value={m.lossCount ? formatCurrency(-m.avgLoss) : '—'}
          tone={m.lossCount ? 'neg' : 'neutral'}
        />
        <MetricCard
          label={t('reports.expectancy')}
          value={exp == null ? '—' : formatCurrency(exp)}
          tone={exp > 0 ? 'pos' : exp < 0 ? 'neg' : 'neutral'}
        />
        <MetricCard
          label={t('reports.maxDrawdown')}
          value={curve.length === 0 ? '—' : formatCurrency(-maxDd)}
          tone={maxDd > 0 ? 'neg' : 'neutral'}
        />
      </div>

      {/* ③ Realized curve */}
      <EquityCurveChart curve={curve} />

      <div className="hm-grid">
        {/* ④ Recent trades */}
        <div className="hm-card">
          <div className="hm-card-head">
            <h2 className="hm-card-title">{t('home.recentTitle')}</h2>
            <Link className="hm-link" to="/journal">
              {t('home.viewAll')}
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="hm-empty">
              {t('home.recentEmpty')}{' '}
              <Link className="hm-link" to="/journal">
                {t('home.emptyCtaTrade')}
              </Link>
            </p>
          ) : (
            <ul className="hm-list">
              {recent.map((tr) => {
                const pnl = realizedPnl(tr)
                return (
                  <li key={tr.id} className="hm-row">
                    <span className="hm-sym">{tr.ticker}</span>
                    <span className="hm-muted">
                      {t(`journal.${tr.side}`)} · {formatDate(tr.openDate)}
                    </span>
                    <span
                      className={`hm-num ${
                        pnl > 0 ? 'metric-pos' : pnl < 0 ? 'metric-neg' : ''
                      }`}
                    >
                      {pnl == null ? t('journal.open') : formatCurrency(pnl)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ⑤ Open positions: journal layer + snapshot layer */}
        <div className="hm-card">
          <h2 className="hm-card-title">{t('home.positionsTitle')}</h2>
          <p className="hm-layer-label">{t('home.positionsJournalLayer')}</p>
          {openPositions.length === 0 ? (
            <p className="hm-empty">{t('home.positionsEmpty')}</p>
          ) : (
            <ul className="hm-list">
              {openPositions.slice(0, 8).map((tr) => (
                <li key={tr.id} className="hm-row">
                  <span className="hm-sym">{tr.ticker}</span>
                  <span className="hm-muted">
                    {tr.quantity} × {formatCurrency(tr.entryPrice)}
                  </span>
                  <span className="hm-muted">{formatDate(tr.openDate)}</span>
                </li>
              ))}
            </ul>
          )}
          {snapshot && snapshot.positions.length > 0 && (
            <>
              <p className="hm-layer-label">
                {t('home.positionsSnapshotLayer')} ·{' '}
                {formatDate(snapshot.capturedAt)}
                {snapshotStale && ` · ${t('snapshot.staleBadge')}`}
              </p>
              <ul className="hm-list">
                {snapshot.positions.slice(0, 8).map((p) => (
                  <li key={`${p.symbol}-${p.currency}`} className="hm-row">
                    <span className="hm-sym">{p.symbol}</span>
                    <span className="hm-muted">{p.quantity}</span>
                    <span className="hm-muted">
                      {p.avgCost == null ? '—' : formatCurrency(p.avgCost)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ⑥ Month P&L calendar */}
        <MonthCalendar trades={trades} lang={lang} t={t} />

        {/* ⑧ Today's review list */}
        <div className="hm-card">
          <h2 className="hm-card-title">{t('home.reviewTitle')}</h2>
          {reviewList.length === 0 ? (
            <p className="hm-empty">{t('home.reviewEmpty')}</p>
          ) : (
            <ul className="hm-list">
              {reviewList.map((tr) => (
                <li key={tr.id} className="hm-row">
                  <span className="hm-sym">{tr.ticker}</span>
                  <span
                    className={`hm-num ${
                      realizedPnl(tr) > 0
                        ? 'metric-pos'
                        : realizedPnl(tr) < 0
                          ? 'metric-neg'
                          : ''
                    }`}
                  >
                    {formatCurrency(realizedPnl(tr))}
                  </span>
                  <Link className="hm-link" to="/journal">
                    {t('home.reviewCta')}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ⑦ Recent sync results */}
        <div className="hm-card">
          <h2 className="hm-card-title">{t('home.syncResultsTitle')}</h2>
          {runs.length === 0 ? (
            <p className="hm-empty">{t('home.syncResultsEmpty')}</p>
          ) : (
            <ul className="hm-list">
              {runs.slice(0, 3).map((run) => (
                <li key={run.id} className="hm-row">
                  <span className="hm-muted">{formatDate(run.startedAt)}</span>
                  <span
                    className={
                      run.status === 'ok' ? 'metric-pos' : 'metric-neg'
                    }
                  >
                    {run.status === 'ok' ? t('broker.runOk') : t('broker.runError')}
                  </span>
                  <span className="hm-muted">
                    +{run.added} · {t('broker.colSkipped')} {run.skipped}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ⑨ Getting started (no score — plain checklist) */}
        <div className="hm-card">
          <h2 className="hm-card-title">{t('home.checklistTitle')}</h2>
          <ul className="hm-list">
            {checklist.map((item) => (
              <li key={item.key} className="hm-row">
                <span className={item.done ? 'hm-check-done' : 'hm-check-todo'}>
                  {item.done ? '✓' : '○'}
                </span>
                <span className={item.done ? 'hm-muted' : ''}>
                  {t(`home.${item.key}`)}
                </span>
                {!item.done && (
                  <Link className="hm-link" to={item.to}>
                    →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* ⑩ Playbook usage */}
        <div className="hm-card">
          <h2 className="hm-card-title">{t('home.playbookTitle')}</h2>
          {playbookUsage.length === 0 ? (
            <p className="hm-empty">
              {t('home.playbookEmpty')}{' '}
              <Link className="hm-link" to="/library">
                {t('home.playbookCta')}
              </Link>
            </p>
          ) : (
            <>
              <p className="hm-muted hm-sub">{t('home.playbookSub')}</p>
              <ul className="hm-list">
                {playbookUsage.slice(0, 6).map(({ playbook, count }) => (
                  <li key={playbook.id} className="hm-row">
                    <span>{tField(playbook, 'name')}</span>
                    <span className="hm-num">{count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ⑪ Needs attention */}
        <div className="hm-card">
          <h2 className="hm-card-title">{t('home.pendingTitle')}</h2>
          {pending.length === 0 ? (
            <p className="hm-empty">{t('home.pendingEmpty')}</p>
          ) : (
            <ul className="hm-list">
              {pending.map((item) => (
                <li key={item.key} className="hm-row">
                  <span className="hm-warn">!</span>
                  <span>{item.text}</span>
                  <Link className="hm-link" to={item.to}>
                    →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Watchlist card (TL-DATA-005 wiring) */}
      <WatchlistCard />
    </section>
  )
}

// ⑥ Calendar of the current month's daily net realized P&L (by close date).
function MonthCalendar({ trades, lang, t }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  const byDay = useMemo(() => {
    const out = new Map()
    for (const tr of trades) {
      if (isClosed(tr) && tr.closeDate?.startsWith(monthKey)) {
        const day = Number(tr.closeDate.slice(8, 10))
        out.set(day, (out.get(day) || 0) + realizedPnl(tr))
      }
    }
    return out
  }, [trades, monthKey])

  const locale = DATE_LOCALES[lang] || 'en-US'
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  // 2024-01-07 was a Sunday; +i walks Sun..Sat.
  const weekdays = [...Array(7)].map((_, i) =>
    weekdayFmt.format(new Date(Date.UTC(2024, 0, 7 + i, 12))),
  )
  const firstWeekday = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return (
    <div className="hm-card">
      <h2 className="hm-card-title">{t('home.calTitle')}</h2>
      {byDay.size === 0 ? (
        <p className="hm-empty">{t('home.calEmpty')}</p>
      ) : (
        <div className="hm-cal">
          {weekdays.map((w, i) => (
            <span key={`w${i}`} className="hm-cal-head">
              {w}
            </span>
          ))}
          {[...Array(firstWeekday)].map((_, i) => (
            <span key={`pad${i}`} className="hm-cal-pad" />
          ))}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1
            const pnl = byDay.get(day)
            const tone =
              pnl == null ? '' : pnl > 0 ? 'hm-cal-pos' : pnl < 0 ? 'hm-cal-neg' : 'hm-cal-flat'
            return (
              <span
                key={day}
                className={`hm-cal-day ${tone}`}
                title={pnl == null ? undefined : formatCurrency(pnl)}
              >
                {day}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
