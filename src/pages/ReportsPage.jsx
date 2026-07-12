import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import * as dataApi from '../services/data.js'
import { computeMetrics } from '../utils/metrics.js'
import { formatCurrency, formatPercent, formatRatio } from '../utils/format.js'
import PlaybookSelector from '../components/reports/PlaybookSelector.jsx'
import MetricCard from '../components/reports/MetricCard.jsx'
import HoldingPeriodChart from '../components/reports/HoldingPeriodChart.jsx'
import ConcentrationChart from '../components/reports/ConcentrationChart.jsx'
import '../css/reports.css'

export default function ReportsPage() {
  const { trades: pagedTrades, playbooks } = useData()
  const { t } = useLang()
  const [playbookId, setPlaybookId] = useState(null)

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

  const m = useMemo(
    () => computeMetrics(trades, { playbookId }),
    [trades, playbookId],
  )

  const pnlTone = m.totalPnl > 0 ? 'pos' : m.totalPnl < 0 ? 'neg' : 'neutral'

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

      <div className="rp-charts">
        <HoldingPeriodChart buckets={m.holdingBuckets} />
        <ConcentrationChart concentration={m.concentration} />
      </div>
    </section>
  )
}
