import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'
import { formatCurrency, formatPercent } from '../../utils/format.js'
import { isClosed } from '../../utils/metrics.js'
import * as dataApi from '../../services/data.js'

// Watchlist + live-ish quotes (TL-DATA-005, D-020): REST polling every 30s,
// IEX feed badge always visible (never presented as NBBO/consolidated).
// Subscription set = journal open-position tickers ∪ watchlist symbols.
// Market closed -> previous close + a closed badge; dead symbols show an
// unavailable state instead of stale numbers.
const POLL_MS = 30_000

export default function WatchlistCard() {
  const { trades } = useData()
  const { t } = useLang()

  const [items, setItems] = useState([])
  const [quotes, setQuotes] = useState({})
  const [marketOpen, setMarketOpen] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [error, setError] = useState(null) // i18n key
  const [notConfigured, setNotConfigured] = useState(false)
  const timerRef = useRef(null)

  const positionSymbols = useMemo(
    () => [...new Set(trades.filter((tr) => !isClosed(tr)).map((tr) => tr.ticker))],
    [trades],
  )

  const symbols = useMemo(() => {
    const set = new Set(positionSymbols)
    for (const item of items) set.add(item.symbol)
    return [...set]
  }, [positionSymbols, items])

  useEffect(() => {
    let cancelled = false
    dataApi
      .fetchWatchlist()
      .then((res) => {
        if (!cancelled) setItems(res.items)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Quote polling. document.hidden pauses effective refresh (skip fetch).
  useEffect(() => {
    if (!symbols.length) {
      setQuotes({})
      return undefined
    }
    let cancelled = false
    async function poll() {
      if (document.hidden) return
      try {
        const res = await dataApi.fetchQuotes(symbols)
        if (cancelled) return
        setQuotes(res.quotes)
        setMarketOpen(res.marketOpen)
        setNotConfigured(false)
      } catch (e) {
        if (cancelled) return
        if (e.code === 'quotes_not_configured') setNotConfigured(true)
      }
    }
    poll()
    timerRef.current = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timerRef.current)
    }
  }, [symbols])

  // Debounced symbol search through the server proxy.
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return undefined
    }
    const handle = setTimeout(() => {
      dataApi
        .searchSymbols(query)
        .then((res) => setResults(res.results))
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  async function add(symbol) {
    setError(null)
    try {
      const item = await dataApi.addWatchlistItem(symbol)
      setItems((prev) => [...prev, item])
      setQuery('')
      setResults([])
    } catch (e) {
      if (e.code === 'watchlist_full') setError('watch.full')
      else if (e.code === 'watchlist_duplicate') setError('watch.duplicate')
      else setError('common.requestFailed')
    }
  }

  async function remove(item) {
    try {
      await dataApi.deleteWatchlistItem(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch {
      /* row stays */
    }
  }

  async function move(index, delta) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
    try {
      const res = await dataApi.reorderWatchlist(next.map((i) => i.id))
      setItems(res.items)
    } catch {
      /* server order wins on next load */
    }
  }

  return (
    <div className="wl-card">
      <div className="wl-head">
        <h2 className="wl-title">{t('watch.title')}</h2>
        <span className="wl-feed-badge">{t('watch.iexBadge')}</span>
        {marketOpen === false && (
          <span className="wl-closed-badge">{t('watch.closedBadge')}</span>
        )}
      </div>

      {notConfigured && (
        <p className="wl-note">{t('watch.notConfigured')}</p>
      )}

      <div className="wl-search">
        <input
          className="tf-input"
          value={query}
          placeholder={t('watch.searchPlaceholder')}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="wl-results">
            {results.map((r) => (
              <li key={r.symbol}>
                <button
                  type="button"
                  className="wl-result-btn"
                  onClick={() => add(r.symbol)}
                >
                  <span className="wl-sym">{r.symbol}</span>
                  <span className="wl-name">{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="wl-error">{t(error)}</p>}

      {items.length === 0 ? (
        <p className="wl-empty">{t('watch.empty')}</p>
      ) : (
        <ul className="wl-list">
          {items.map((item, index) => {
            const quote = quotes[item.symbol]
            return (
              <li key={item.id} className="wl-row">
                <span className="wl-sym">{item.symbol}</span>
                <QuoteCell quote={quote} marketOpen={marketOpen} t={t} />
                <span className="wl-row-actions">
                  <button
                    type="button"
                    className="wl-mini"
                    aria-label={t('watch.moveUpAria', { symbol: item.symbol })}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="wl-mini"
                    aria-label={t('watch.moveDownAria', { symbol: item.symbol })}
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="wl-mini wl-remove"
                    aria-label={t('watch.removeAria', { symbol: item.symbol })}
                    onClick={() => remove(item)}
                  >
                    ✕
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {positionSymbols.length > 0 && (
        <p className="wl-positions-note">{t('watch.positionsNote')}</p>
      )}
    </div>
  )
}

function QuoteCell({ quote, marketOpen, t }) {
  if (!quote) return <span className="wl-quote wl-muted">…</span>
  if (quote.status !== 'ok') {
    return <span className="wl-quote wl-muted">{t('watch.unavailable')}</span>
  }
  const tone =
    quote.change > 0 ? 'metric-pos' : quote.change < 0 ? 'metric-neg' : ''
  const price = marketOpen === false && quote.prevClose != null
    ? quote.prevClose
    : quote.price
  return (
    <span className="wl-quote">
      <span className="wl-price">{formatCurrency(price)}</span>
      {quote.changePct != null && (
        <span className={`wl-change ${tone}`}>
          {quote.change > 0 ? '+' : ''}
          {formatCurrency(quote.change)} ({formatPercent(quote.changePct)})
        </span>
      )}
    </span>
  )
}
