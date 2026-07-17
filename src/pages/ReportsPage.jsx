import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import * as dataApi from '../services/data.js'
import {
  computeMetrics,
  equityCurve,
  maxDrawdown,
  profitFactor,
  expectancy,
  streaks,
  sideBreakdown,
  monthlyPnl,
  bestWorstTrade,
  tickerBreakdown,
  feesImpact,
  realizedPnl,
} from '../utils/metrics.js'
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatRatio,
} from '../utils/format.js'
import PlaybookSelector from '../components/reports/PlaybookSelector.jsx'
import MetricCard from '../components/reports/MetricCard.jsx'
import HoldingPeriodChart from '../components/reports/HoldingPeriodChart.jsx'
import ConcentrationChart from '../components/reports/ConcentrationChart.jsx'
import EquityCurveChart from '../components/reports/EquityCurveChart.jsx'
import MonthlyPnlChart from '../components/reports/MonthlyPnlChart.jsx'
import SideBreakdown from '../components/reports/SideBreakdown.jsx'
import TickerTable from '../components/reports/TickerTable.jsx'
import '../css/reports.css'

export default function ReportsPage() {
  const { trades: pagedTrades, playbooks } = useData()
  const { t } = useLang()
  const [playbookId, setPlaybookId] = useState(null)
  const [tagFilter, setTagFilter] = useState('') // '' = all tags

  // Aggregates run over the FULL trade history (the Journal pages at 200, but
  // metrics must not be window-dependent). Dataset is small, so limit=0 is
  // fine; the paged window covers the gap while this loads.
  const [allTrades, setAllTrades] = useState(null)
  useEffect(() => {
    let cancelled = false
    dataApi
      .fetchTrades({ limit: 0 })
      .then((res) => {
        if (!cancelled) setAllTrades(res.trades)
      })
      .catch(() => {
        /* fall back to the paged window */
      })
    return () => {
      cancelled = true
    }
  }, [])
  const trades = allTrades ?? pagedTrades

  // Only playbooks the user actually has trades for can be reviewed.
  const reviewable = useMemo(() => {
    const ids = new Set(trades.map((t) => t.playbookId).filter(Boolean))
    return playbooks.filter((p) => ids.has(p.id))
  }, [trades, playbooks])

  // Tag slice (TL-FEAT-006/007): labels actually used in this user's trades.
  // The slice applies BEFORE every metric — classic and realized alike — and
  // combines with the playbook selector (AND).
  const tagOptions = useMemo(() => {
    const labels = new Set(trades.flatMap((t) => t.tags || []))
    return [...labels].sort((a, b) => a.localeCompare(b))
  }, [trades])

  const sliced = useMemo(
    () =>
      tagFilter
        ? trades.filter((t) => (t.tags || []).includes(tagFilter))
        : trades,
    [trades, tagFilter],
  )

  const m = useMemo(
    () => computeMetrics(sliced, { playbookId }),
    [sliced, playbookId],
  )

  // Realized-only analytics (TL-FEAT-007): closed trades, scoped to the same
  // playbook selection as the classic metrics. Tag slicing is deliberately
  // absent until TL-FEAT-006 lands (no stub UI).
  const r2 = useMemo(() => {
    const scoped = playbookId
      ? sliced.filter((t) => t.playbookId === playbookId)
      : sliced
    const curve = equityCurve(scoped)
    return {
      curve,
      maxDd: maxDrawdown(curve),
      pf: profitFactor(scoped),
      exp: expectancy(scoped),
      st: streaks(scoped),
      sides: sideBreakdown(scoped),
      months: monthlyPnl(scoped),
      bw: bestWorstTrade(scoped),
      tickers: tickerBreakdown(scoped),
      fees: feesImpact(scoped),
    }
  }, [sliced, playbookId])

  const pnlTone = m.totalPnl > 0 ? 'pos' : m.totalPnl < 0 ? 'neg' : 'neutral'
  const toneOf = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'neutral')
  const bestPnl = r2.bw ? realizedPnl(r2.bw.best) : null
  const worstPnl = r2.bw ? realizedPnl(r2.bw.worst) : null

  if (trades.length === 0) {
    return (
      <section className="page">
        <h1 className="page-title">{t('reports.title')}</h1>
        <div className="rp-empty">{t('reports.empty')}</div>
      </section>
    )
  }

  return (
    <section className="page">
      <h1 className="page-title">{t('reports.title')}</h1>
      <p className="page-subtitle">{t('reports.subtitle')}</p>

      <PlaybookSelector
        value={playbookId}
        onChange={setPlaybookId}
        playbooks={reviewable}
      />

      {tagOptions.length > 0 && (
        <label className="rp-tag-slice">
          <span>{t('reports.tagSliceLabel')}</span>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {tagOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="rp-metrics">
        <MetricCard
          label={t('reports.winRate')}
          value={m.closedCount ? formatPercent(m.winRate) : '—'}
          sub={t('reports.winRateSub', { w: m.winCount, l: m.lossCount, c: m.closedCount })}
        />
        <MetricCard
          label={t('reports.ratio')}
          value={formatRatio(m.avgWinLossRatio)}
          sub={t('reports.ratioSub', {
            win: formatCurrency(m.avgWin),
            loss: formatCurrency(m.avgLoss),
          })}
        />
        <MetricCard
          label={t('reports.totalPnl')}
          value={formatCurrency(m.totalPnl)}
          tone={pnlTone}
          sub={t('reports.totalPnlSub')}
        />
        <MetricCard
          label={t('reports.trades')}
          value={m.totalCount}
          sub={t('reports.tradesSub', { closed: m.closedCount, open: m.openCount })}
        />
      </div>

      <p className="rp-realized-note">{t('reports.realizedNote')}</p>

      <div className="rp-metrics">
        <MetricCard
          label={t('reports.profitFactor')}
          value={
            r2.pf == null
              ? '—'
              : r2.pf.noLosses
                ? '—'
                : r2.pf.value.toFixed(2)
          }
          title={r2.pf?.noLosses ? t('reports.noLossTooltip') : undefined}
          sub={
            r2.pf?.noLosses
              ? t('reports.noLossTooltip')
              : t('reports.profitFactorSub')
          }
        />
        <MetricCard
          label={t('reports.expectancy')}
          value={r2.exp == null ? '—' : formatCurrency(r2.exp)}
          tone={r2.exp == null ? 'neutral' : toneOf(r2.exp)}
          sub={t('reports.expectancySub')}
        />
        <MetricCard
          label={t('reports.maxDrawdown')}
          value={r2.curve.length === 0 ? '—' : formatCurrency(-r2.maxDd)}
          tone={r2.maxDd > 0 ? 'neg' : 'neutral'}
          sub={t('reports.maxDrawdownSub')}
        />
        <MetricCard
          label={t('reports.streaks')}
          value={
            r2.curve.length === 0
              ? '—'
              : t('reports.streaksValue', {
                  w: r2.st.maxWins,
                  l: r2.st.maxLosses,
                })
          }
          sub={t('reports.streaksSub')}
        />
        <MetricCard
          label={t('reports.bestTrade')}
          value={r2.bw == null ? '—' : formatCurrency(bestPnl)}
          tone={r2.bw == null ? 'neutral' : toneOf(bestPnl)}
          sub={
            r2.bw == null
              ? t('reports.closedEmpty')
              : `${r2.bw.best.ticker} · ${formatDate(r2.bw.best.closeDate)}`
          }
        />
        <MetricCard
          label={t('reports.worstTrade')}
          value={r2.bw == null ? '—' : formatCurrency(worstPnl)}
          tone={r2.bw == null ? 'neutral' : toneOf(worstPnl)}
          sub={
            r2.bw == null
              ? t('reports.closedEmpty')
              : `${r2.bw.worst.ticker} · ${formatDate(r2.bw.worst.closeDate)}`
          }
        />
        <MetricCard
          label={t('reports.feesTitle')}
          value={formatCurrency(r2.fees.totalFees)}
          sub={
            r2.fees.ratio == null
              ? t('reports.feesNoGross')
              : t('reports.feesRatioSub', {
                  pct: formatPercent(r2.fees.ratio),
                })
          }
        />
      </div>

      <EquityCurveChart curve={r2.curve} />

      <div className="rp-charts">
        <MonthlyPnlChart months={r2.months} />
        <SideBreakdown sides={r2.sides} />
      </div>

      <div className="rp-charts">
        <TickerTable rows={r2.tickers} />
      </div>

      <div className="rp-charts">
        <HoldingPeriodChart buckets={m.holdingBuckets} />
        <ConcentrationChart concentration={m.concentration} />
      </div>
    </section>
  )
}
