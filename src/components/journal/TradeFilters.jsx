import { useLang } from '../../i18n/LanguageContext.jsx'

// Trade-history filters: date range (by open date), ticker, playbook, tag.
export default function TradeFilters({
  filters,
  onChange,
  playbookOptions,
  tagOptions,
  resultCount,
  onReset,
}) {
  const { t, tField } = useLang()
  return (
    <div className="tl-filters">
      <label className="tl-filter">
        <span>{t('journal.from')}</span>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => onChange('from', e.target.value)}
        />
      </label>
      <label className="tl-filter">
        <span>{t('journal.to')}</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => onChange('to', e.target.value)}
        />
      </label>
      <label className="tl-filter">
        <span>{t('journal.ticker')}</span>
        <input
          type="search"
          placeholder={t('journal.tickerPlaceholder')}
          value={filters.ticker}
          onChange={(e) => onChange('ticker', e.target.value.toUpperCase())}
        />
      </label>
      <label className="tl-filter">
        <span>{t('journal.playbook')}</span>
        <select
          value={filters.playbookId}
          onChange={(e) => onChange('playbookId', e.target.value)}
        >
          <option value="">{t('common.all')}</option>
          {playbookOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {tField(p, 'name')}
            </option>
          ))}
          <option value="__none__">{t('journal.noPlaybook')}</option>
        </select>
      </label>
      <label className="tl-filter">
        <span>{t('journal.tag')}</span>
        <select
          value={filters.tag}
          onChange={(e) => onChange('tag', e.target.value)}
        >
          <option value="">{t('common.all')}</option>
          {tagOptions.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
          <option value="__none__">{t('journal.noTag')}</option>
        </select>
      </label>

      <span className="tl-result-count">{t('journal.tradesCount', { n: resultCount })}</span>
      <button type="button" className="tl-reset" onClick={onReset}>
        {t('common.reset')}
      </button>
    </div>
  )
}
