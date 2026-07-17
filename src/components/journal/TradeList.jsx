import TradeRow from './TradeRow.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'

// Trade-history table. `playbookNameById` maps id -> display name.
export default function TradeList({ trades, playbookNameById, onEdit, onDelete }) {
  const { t } = useLang()
  if (trades.length === 0) {
    return <div className="tl-empty">{t('journal.empty')}</div>
  }

  return (
    <div className="tl-table-wrap">
      <table className="tl-table">
        <thead>
          <tr>
            <th>{t('journal.colTicker')}</th>
            <th>{t('journal.colSide')}</th>
            <th className="tl-num">{t('journal.colQty')}</th>
            <th className="tl-num">{t('journal.colEntry')}</th>
            <th className="tl-num">{t('journal.colExit')}</th>
            <th>{t('journal.colOpened')}</th>
            <th>{t('journal.colClosed')}</th>
            <th className="tl-num">{t('journal.colHeld')}</th>
            <th>{t('journal.colPlaybook')}</th>
            <th className="tl-num">{t('journal.colPnl')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <TradeRow
              key={t.id}
              trade={t}
              playbookName={playbookNameById[t.playbookId]}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
