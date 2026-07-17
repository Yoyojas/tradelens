import { useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'

// Client-side mirror of the server's label normalization (trim, collapse
// whitespace, clip 40). The server stays the source of truth — unknown
// labels become the user's own tags when the trade is saved.
function normalize(raw) {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 40)
}

// Tag editor for the trade forms: current labels as removable chips, a
// dropdown of the user's visible tags (shared + own), and a free-text input
// that adds any new label. Case-insensitive dedupe against current chips.
export default function TagPicker({ value, onChange }) {
  const { tags } = useData()
  const { t } = useLang()
  const [draft, setDraft] = useState('')

  const lower = value.map((label) => label.toLowerCase())
  const remaining = tags.filter(
    (tag) => !lower.includes(tag.label.toLowerCase()),
  )

  function add(label) {
    const clean = normalize(label)
    if (!clean || lower.includes(clean.toLowerCase())) return
    onChange([...value, clean])
    setDraft('')
  }

  function remove(label) {
    onChange(value.filter((l) => l !== label))
  }

  return (
    <div className="tp-picker">
      <div className="tp-chips">
        {value.length === 0 && (
          <span className="tp-none">{t('journal.tagsNone')}</span>
        )}
        {value.map((label) => (
          <span key={label} className="tp-chip">
            {label}
            <button
              type="button"
              className="tp-chip-x"
              aria-label={t('journal.tagRemoveAria', { label })}
              onClick={() => remove(label)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="tp-add">
        <select
          className="tf-input tp-select"
          value=""
          aria-label={t('journal.tagSelect')}
          onChange={(e) => e.target.value && add(e.target.value)}
        >
          <option value="">{t('journal.tagSelect')}</option>
          {remaining.map((tag) => (
            <option key={tag.id} value={tag.label}>
              {tag.label}
            </option>
          ))}
        </select>
        <input
          className="tf-input tp-input"
          value={draft}
          placeholder={t('journal.tagNewPlaceholder')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
          }}
        />
        <button
          type="button"
          className="tp-add-btn"
          disabled={!normalize(draft)}
          onClick={() => add(draft)}
        >
          {t('journal.tagAdd')}
        </button>
      </div>
    </div>
  )
}
