// Performance math derived from seeded trades. Pure functions so the dashboard
// numbers reconcile exactly against the seed data and can be unit-tested later.

// A trade counts as "closed" only when it has both an exit price and a close date.
export function isClosed(trade) {
  return trade.exitPrice != null && trade.closeDate != null
}

// Realized P&L for a closed trade, net of fees. Returns null for open trades.
//   long:  (exit - entry) * qty - fees
//   short: (entry - exit) * qty - fees
export function realizedPnl(trade) {
  if (!isClosed(trade)) return null
  const gross =
    trade.side === 'short'
      ? (trade.entryPrice - trade.exitPrice) * trade.quantity
      : (trade.exitPrice - trade.entryPrice) * trade.quantity
  return gross - (trade.fees || 0)
}

// Capital committed at entry — used for position concentration.
export function costBasis(trade) {
  return trade.entryPrice * trade.quantity
}

// Whole-day holding period. Open trades return null.
export function holdingDays(trade) {
  if (!trade.closeDate || !trade.openDate) return null
  const open = new Date(`${trade.openDate}T00:00:00`)
  const close = new Date(`${trade.closeDate}T00:00:00`)
  const ms = close - open
  if (Number.isNaN(ms)) return null
  return Math.round(ms / 86400000)
}

// Holding-period histogram buckets (days).
export const HOLDING_BUCKETS = [
  { label: '0–1d', min: 0, max: 1 },
  { label: '2–5d', min: 2, max: 5 },
  { label: '6–20d', min: 6, max: 20 },
  { label: '21d+', min: 21, max: Infinity },
]

// Compute the full metric set for a set of trades, optionally scoped to one
// playbook. Win-rate / ratio / holding stats use closed trades only;
// concentration uses all positions (open + closed) by ticker cost basis.
export function computeMetrics(trades, { playbookId = null } = {}) {
  const scoped = playbookId
    ? trades.filter((t) => t.playbookId === playbookId)
    : trades

  const closed = scoped.filter(isClosed)
  const open = scoped.filter((t) => !isClosed(t))

  const pnls = closed.map(realizedPnl)
  // Breakeven (PnL === 0) counts as neither a win nor a loss.
  const wins = pnls.filter((p) => p > 0)
  const losses = pnls.filter((p) => p < 0)

  const sum = (arr) => arr.reduce((a, b) => a + b, 0)
  const avgWin = wins.length ? sum(wins) / wins.length : 0
  const avgLossAbs = losses.length ? Math.abs(sum(losses) / losses.length) : 0

  const winRate = closed.length ? wins.length / closed.length : null
  const avgWinLossRatio = avgLossAbs ? avgWin / avgLossAbs : null

  // Holding-period distribution
  const holdingBuckets = HOLDING_BUCKETS.map((b) => ({ label: b.label, count: 0 }))
  for (const t of closed) {
    const d = holdingDays(t)
    if (d == null) continue
    const idx = HOLDING_BUCKETS.findIndex((b) => d >= b.min && d <= b.max)
    if (idx >= 0) holdingBuckets[idx].count += 1
  }

  // Position concentration by ticker
  const byTicker = new Map()
  for (const t of scoped) {
    byTicker.set(t.ticker, (byTicker.get(t.ticker) || 0) + costBasis(t))
  }
  const totalBasis = sum([...byTicker.values()])
  const concentration = [...byTicker.entries()]
    .map(([ticker, basis]) => ({
      ticker,
      costBasis: basis,
      pct: totalBasis ? basis / totalBasis : 0,
    }))
    .sort((a, b) => b.costBasis - a.costBasis)

  return {
    totalCount: scoped.length,
    closedCount: closed.length,
    openCount: open.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate,
    avgWin,
    avgLoss: avgLossAbs,
    avgWinLossRatio,
    totalPnl: sum(pnls),
    holdingBuckets,
    concentration,
  }
}

/* ── Realized-only analytics (TL-FEAT-007) ─────────────────────────────
   Every function below considers CLOSED trades only (exitPrice AND closeDate
   present). Open positions never enter these numbers: without a market-data
   source there is no valuation, and floating P&L is deliberately NOT
   estimated (user decision 2026-07-12, D-017). P&L is always net of fees
   via realizedPnl. Pure functions — unit-testable without React. */

// Closed trades in the canonical stable order: (closeDate, id) ascending.
// Streaks and every per-trade sequence derive from this ordering.
export function closedByCloseDate(trades) {
  return trades
    .filter(isClosed)
    .slice()
    .sort((a, b) => {
      if (a.closeDate !== b.closeDate) return a.closeDate < b.closeDate ? -1 : 1
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
}

// Realized equity curve: net P&L aggregated per close DAY, then accumulated.
// Returns [{date, pnl, cum}] chronological; the cumulative baseline before
// the first point is 0. No closed trades -> [].
export function equityCurve(trades) {
  const byDay = new Map() // insertion order = chronological (input is sorted)
  for (const t of closedByCloseDate(trades)) {
    byDay.set(t.closeDate, (byDay.get(t.closeDate) || 0) + realizedPnl(t))
  }
  let cum = 0
  return [...byDay.entries()].map(([date, pnl]) => {
    cum += pnl
    return { date, pnl, cum }
  })
}

// Max peak-to-trough drop of the cumulative curve, as a POSITIVE amount.
// The 0 baseline counts as the initial peak; monotonic non-decreasing -> 0.
export function maxDrawdown(curve) {
  let peak = 0
  let maxDd = 0
  for (const point of curve) {
    if (point.cum > peak) peak = point.cum
    if (peak - point.cum > maxDd) maxDd = peak - point.cum
  }
  return maxDd
}

// Profit factor: Σ wins / |Σ losses| over net P&L.
// null = no closed trades (empty state). noLosses=true -> the UI shows "—"
// with a "no losing trades" tooltip. No wins but some losses -> value 0.
export function profitFactor(trades) {
  const pnls = trades.filter(isClosed).map(realizedPnl)
  if (!pnls.length) return null
  const winSum = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0)
  const lossAbs = Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0))
  if (!lossAbs) return { value: null, noLosses: true }
  return { value: winSum / lossAbs, noLosses: false }
}

// Expectancy: average net P&L per closed trade. null when there are none.
export function expectancy(trades) {
  const pnls = trades.filter(isClosed).map(realizedPnl)
  if (!pnls.length) return null
  return pnls.reduce((a, b) => a + b, 0) / pnls.length
}

// Longest consecutive win / loss runs over the stable close order.
// Breakeven (P&L === 0) breaks BOTH runs and counts toward neither.
export function streaks(trades) {
  let wins = 0
  let losses = 0
  let maxWins = 0
  let maxLosses = 0
  for (const t of closedByCloseDate(trades)) {
    const pnl = realizedPnl(t)
    if (pnl > 0) {
      wins += 1
      losses = 0
    } else if (pnl < 0) {
      losses += 1
      wins = 0
    } else {
      wins = 0
      losses = 0
    }
    if (wins > maxWins) maxWins = wins
    if (losses > maxLosses) maxLosses = losses
  }
  return { maxWins, maxLosses }
}

// Long vs short: count / wins / losses / net / win rate per direction.
// A side with no closed trades has count 0 and winRate null ("—" in the UI).
export function sideBreakdown(trades) {
  const closed = trades.filter(isClosed)
  const out = {}
  for (const side of ['long', 'short']) {
    const pnls = closed.filter((t) => t.side === side).map(realizedPnl)
    const wins = pnls.filter((p) => p > 0).length
    out[side] = {
      count: pnls.length,
      wins,
      losses: pnls.filter((p) => p < 0).length,
      netPnl: pnls.reduce((a, b) => a + b, 0),
      winRate: pnls.length ? wins / pnls.length : null,
    }
  }
  return out
}

// Net P&L per closing month. [{month: 'YYYY-MM', pnl}] chronological.
export function monthlyPnl(trades) {
  const byMonth = new Map()
  for (const t of closedByCloseDate(trades)) {
    const month = t.closeDate.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) || 0) + realizedPnl(t))
  }
  return [...byMonth.entries()].map(([month, pnl]) => ({ month, pnl }))
}

// Single best / worst closed trade by net P&L. Ties keep the trade that
// comes first in the stable close order. null when nothing is closed.
export function bestWorstTrade(trades) {
  const closed = closedByCloseDate(trades)
  if (!closed.length) return null
  let best = closed[0]
  let worst = closed[0]
  for (const t of closed) {
    if (realizedPnl(t) > realizedPnl(best)) best = t
    if (realizedPnl(t) < realizedPnl(worst)) worst = t
  }
  return { best, worst }
}

// Per-ticker net / trade count / win rate, sorted by net P&L descending.
export function tickerBreakdown(trades) {
  const map = new Map()
  for (const t of closedByCloseDate(trades)) {
    const row = map.get(t.ticker) || {
      ticker: t.ticker,
      count: 0,
      wins: 0,
      losses: 0,
      netPnl: 0,
    }
    const pnl = realizedPnl(t)
    row.count += 1
    if (pnl > 0) row.wins += 1
    else if (pnl < 0) row.losses += 1
    row.netPnl += pnl
    map.set(t.ticker, row)
  }
  return [...map.values()]
    .map((row) => ({ ...row, winRate: row.count ? row.wins / row.count : null }))
    .sort((a, b) => b.netPnl - a.netPnl)
}

// Share of closing DAYS that ended net-positive (TL-FEAT-009). Input is the
// daily-aggregated equityCurve; a breakeven day counts in the denominator
// but not as a win. No closed trades -> null (empty state).
export function dayWinRate(curve) {
  if (!curve.length) return null
  return curve.filter((point) => point.pnl > 0).length / curve.length
}

// Fees drag: total fees over closed trades and fees as a share of GROSS
// profit (the sum of positive pre-fee P&L — realizedPnl + fees per trade).
// Gross profit 0 -> ratio null ("—" in the UI).
export function feesImpact(trades) {
  const closed = trades.filter(isClosed)
  let totalFees = 0
  let grossProfit = 0
  for (const t of closed) {
    const fees = t.fees || 0
    totalFees += fees
    const gross = realizedPnl(t) + fees
    if (gross > 0) grossProfit += gross
  }
  return {
    totalFees,
    grossProfit,
    ratio: grossProfit ? totalFees / grossProfit : null,
  }
}
