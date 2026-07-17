import { formatCurrency, formatPercent } from '../../utils/format.js'
import { useLang } from '../../i18n/LanguageContext.jsx'

// Long vs short over closed trades: count / win rate / net P&L.
// A direction with no closed trades shows "—" for rate and net.
export default function SideBreakdown({ sides }) {
  const { t } = useLang()
  const rows = [
    { key: 'long', label: t('journal.long'), ...sides.long },
    { key: 'short', label: t('journal.short'), ...sides.short },
  ]

  return (
    <div className="rp-chart-card">
      <h3 className="rp-chart-title">{t('reports.longShortTitle')}</h3>
      <p className="rp-chart-sub">{t('reports.longShortSub')}</p>
      <table className="rp-table">
        <thead>
          <tr>
            <th></th>
            <th className="rp-num">{t('reports.colTrades')}</th>
            <th className="rp-num">{t('reports.winRate')}</th>
            <th className="rp-num">{t('reports.colNet')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                <span className={`tl-side tl-side-${r.key}`}>{r.label}</span>
              </td>
              <td className="rp-num">{r.count}</td>
              <td className="rp-num">
                {r.winRate == null ? '—' : formatPercent(r.winRate)}
              </td>
              <td
                className={`rp-num ${
                  r.count === 0 || r.netPnl === 0
                    ? ''
                    : r.netPnl > 0
                      ? 'metric-pos'
                      : 'metric-neg'
                }`}
              >
                {r.count === 0 ? '—' : formatCurrency(r.netPnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
