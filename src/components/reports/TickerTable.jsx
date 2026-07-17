import { formatCurrency, formatPercent } from '../../utils/format.js'
import { useLang } from '../../i18n/LanguageContext.jsx'

// Per-ticker performance over closed trades, sorted by net P&L descending.
export default function TickerTable({ rows }) {
  const { t } = useLang()

  return (
    <div className="rp-chart-card">
      <h3 className="rp-chart-title">{t('reports.tickerTitle')}</h3>
      <p className="rp-chart-sub">{t('reports.tickerSub')}</p>
      {rows.length === 0 ? (
        <div className="rp-chart-empty">{t('reports.closedEmpty')}</div>
      ) : (
        <div className="rp-table-scroll">
          <table className="rp-table">
            <thead>
              <tr>
                <th>{t('journal.colTicker')}</th>
                <th className="rp-num">{t('reports.colTrades')}</th>
                <th className="rp-num">{t('reports.winRate')}</th>
                <th className="rp-num">{t('reports.colNet')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker}>
                  <td className="tl-ticker">{r.ticker}</td>
                  <td className="rp-num">{r.count}</td>
                  <td className="rp-num">
                    {r.winRate == null ? '—' : formatPercent(r.winRate)}
                  </td>
                  <td
                    className={`rp-num ${
                      r.netPnl > 0 ? 'metric-pos' : r.netPnl < 0 ? 'metric-neg' : ''
                    }`}
                  >
                    {formatCurrency(r.netPnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
