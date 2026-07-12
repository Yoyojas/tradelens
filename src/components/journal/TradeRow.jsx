import { isClosed, realizedPnl, holdingDays } from '../../utils/metrics.js'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { useLang } from '../../i18n/LanguageContext.jsx'

// One row in the trade-history table.
export default function TradeRow({ trade, playbookName, onDelete }) {
  const { t } = useLang()
  const closed = isClosed(trade)
  const pnl = realizedPnl(trade)
  const days = holdingDays(trade)
  const pnlClass = pnl == null ? '' : pnl > 0 ? 'tl-pos' : pnl < 0 ? 'tl-neg' : ''

  return (
    <tr>
      <td className="tl-ticker">{trade.ticker}</td>
      <td>
        <span className={`tl-side tl-side-${trade.side}`}>{t(`journal.${trade.side}`)}</span>
      </td>
      <td className="tl-num">{trade.quantity}</td>
      <td className="tl-num">{formatCurrency(trade.entryPrice)}</td>
      <td className="tl-num">
        {closed ? (
          formatCurrency(trade.exitPrice)
        ) : (
          <span className="tl-open-tag">{t('journal.open')}</span>
        )}
      </td>
      <td>{formatDate(trade.openDate)}</td>
      <td>{closed ? formatDate(trade.closeDate) : '—'}</td>
      <td className="tl-num">{days == null ? '—' : t('journal.heldDays', { n: days })}</td>
      <td className="tl-playbook">{playbookName || '—'}</td>
      <td className={`tl-num tl-pnl ${pnlClass}`}>
        {pnl == null ? '—' : formatCurrency(pnl)}
      </td>
      <td>
        <button
          type="button"
          className="tl-delete"
          aria-label={t('journal.deleteAria', { ticker: trade.ticker })}
          onClick={() => onDelete(trade)}
        >
          ✕
        </button>
      </td>
    </tr>
  )
}
