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
