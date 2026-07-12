import { useLang } from '../../i18n/LanguageContext.jsx'

// Search + filter controls for the library. Fully controlled by LibraryPage.
export default function FilterPanel({
  search,
  onSearch,
  filters,
  onFilterChange,
  options,
  adoptedOnly,
  onAdoptedOnlyChange,
  resultCount,
  onReset,
}) {
  const { t, tVocab } = useLang()
  return (
    <div className="lib-controls">
      <input
        className="lib-search"
        type="search"
        placeholder={t('library.searchPlaceholder')}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      <div className="lib-filters">
        <Select
          label={t('library.category')}
          value={filters.category}
          onChange={(v) => onFilterChange('category', v)}
          options={options.categories.map((c) => ({
            value: c,
            label: tVocab('category', c),
          }))}
        />
        <Select
          label={t('library.market')}
          value={filters.market}
          onChange={(v) => onFilterChange('market', v)}
          options={options.markets.map((m) => ({
            value: m,
            label: tVocab('market', m),
          }))}
        />
        <Select
          label={t('library.risk')}
          value={filters.riskLevel}
          onChange={(v) => onFilterChange('riskLevel', v)}
          options={options.riskLevels.map((r) => ({
            value: r,
            label: t(`risk.${r.toLowerCase()}`),
          }))}
        />

        <label className="lib-toggle">
          <input
            type="checkbox"
            checked={adoptedOnly}
            onChange={(e) => onAdoptedOnlyChange(e.target.checked)}
          />
          {t('library.workspaceOnly')}
        </label>

        <span className="lib-result-count">{t('library.shown', { n: resultCount })}</span>
        <button type="button" className="lib-reset" onClick={onReset}>
          {t('common.reset')}
        </button>
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  const { t } = useLang()
  return (
    <label className="lib-select">
      <span className="lib-select-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('common.all')}</option>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}
