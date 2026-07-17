import { isClosed, realizedPnl, holdingDays } from '../../utils/metrics.js'
import { formatCurrency, formatDate, sourceLabelKey } from '../../utils/format.js'
import { useLang } from '../../i18n/LanguageContext.jsx'

// One row in the trade-history table.
export default function TradeRow({ trade, playbookName, onEdit, onDelete }) {
  const { t } = useLang()
  const closed = isClosed(trade)
  const pnl = realizedPnl(trade)
  const days = holdingDays(trade)
  const pnlClass = pnl == null ? '' : pnl > 0 ? 'tl-pos' : pnl < 0 ? 'tl-neg' : ''

  // Source badge (TL-DATA-003): broker imports are labeled (i18n, never the
  // raw source string); manual trades carry no badge to keep the common case
  // quiet. externalId deliberately never shows in the list (edit form only).
  const isBroker = trade.source && trade.source !== 'manual'
  const srcKey = sourceLabelKey(trade.source)

  return (
    <tr>
      <td className="tl-ticker">
        {trade.ticker}
        {isBroker && (
          <span className="tl-source-badge">
            {srcKey ? t(srcKey) : trade.source}
          </span>
        )}
        {trade.tags?.length > 0 && (
          <span className="tl-row-tags">
            {trade.tags.map((label) => (
              <span key={label} className="tl-tag-chip">
                {label}
              </span>
            ))}
          </span>
        )}
      </td>
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
      <td className="tl-row-actions">
        {!closed && (
          <button
            type="button"
            className="tl-close-pos"
            onClick={() => onEdit(trade, true)}
          >
            {t('journal.closePosition')}
          </button>
        )}
        <button
          type="button"
          className="tl-edit"
          aria-label={t('journal.editAria', { ticker: trade.ticker })}
          onClick={() => onEdit(trade, false)}
        >
          ✎
        </button>
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
