import { useLang } from '../../i18n/LanguageContext.jsx'

// Segmented control: Overall vs. one playbook. `value` is null for Overall.
export default function PlaybookSelector({ value, onChange, playbooks }) {
  const { t, tField } = useLang()
  return (
    <div className="rp-selector">
      <button
        type="button"
        className={`rp-seg${value === null ? ' rp-seg-on' : ''}`}
        onClick={() => onChange(null)}
      >
        {t('reports.overall')}
      </button>
      {playbooks.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`rp-seg${value === p.id ? ' rp-seg-on' : ''}`}
          onClick={() => onChange(p.id)}
        >
          {tField(p, 'name')}
        </button>
      ))}
    </div>
  )
}
