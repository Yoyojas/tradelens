import { useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'
import { validateTrade } from '../../utils/validation.js'

const BLANK = {
  ticker: '',
  side: 'long',
  quantity: '',
  entryPrice: '',
  exitPrice: '',
  openDate: '',
  closeDate: '',
  fees: '',
  notes: '',
  playbookId: '',
}

// Manual trade-entry form with client-side validation (validation.js).
// The playbook dropdown lists only the user's adopted playbooks.
export default function TradeForm() {
  const { adoptedPlaybooks, addTrade } = useData()
  const { t, tField } = useLang()
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [savedTicker, setSavedTicker] = useState(null)
  const [submitError, setSubmitError] = useState(false)
  const [saving, setSaving] = useState(false)

  // validation.js returns i18n keys; translate for display.
  const err = (field) => (errors[field] ? t(errors[field]) : undefined)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    setSavedTicker(null)
    setSubmitError(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    const { valid, errors: errs } = validateTrade(form)
    if (!valid) {
      setErrors(errs)
      return
    }
    setSaving(true)
    setSubmitError(false)
    try {
      const trade = await addTrade(form)
      setForm(BLANK)
      setErrors({})
      setSavedTicker(trade.ticker)
    } catch {
      setSubmitError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="tf-form" onSubmit={handleSubmit} noValidate>
      <h2 className="tf-title">{t('journal.recordTrade')}</h2>

      <div className="tf-grid">
        <Field label={t('journal.ticker')} error={err('ticker')}>
          <input
            className="tf-input"
            value={form.ticker}
            placeholder="AAPL"
            onChange={(e) => update('ticker', e.target.value.toUpperCase())}
          />
        </Field>

        <Field label={t('journal.side')} error={err('side')}>
          <select
            className="tf-input"
            value={form.side}
            onChange={(e) => update('side', e.target.value)}
          >
            <option value="long">{t('journal.long')}</option>
            <option value="short">{t('journal.short')}</option>
          </select>
        </Field>

        <Field label={t('journal.quantity')} error={err('quantity')}>
          <input
            className="tf-input"
            type="number"
            min="0"
            step="any"
            value={form.quantity}
            placeholder="100"
            onChange={(e) => update('quantity', e.target.value)}
          />
        </Field>

        <Field label={t('journal.playbookOptional')} error={err('playbookId')}>
          <select
            className="tf-input"
            value={form.playbookId}
            onChange={(e) => update('playbookId', e.target.value)}
          >
            <option value="">{t('journal.noneOption')}</option>
            {adoptedPlaybooks.map((p) => (
              <option key={p.id} value={p.id}>
                {tField(p, 'name')}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('journal.entryPrice')} error={err('entryPrice')}>
          <input
            className="tf-input"
            type="number"
            min="0"
            step="any"
            value={form.entryPrice}
            placeholder="180.50"
            onChange={(e) => update('entryPrice', e.target.value)}
          />
        </Field>

        <Field label={t('journal.exitPriceOptional')} error={err('exitPrice')}>
          <input
            className="tf-input"
            type="number"
            min="0"
            step="any"
            value={form.exitPrice}
            placeholder={t('journal.exitPlaceholder')}
            onChange={(e) => update('exitPrice', e.target.value)}
          />
        </Field>

        <Field label={t('journal.openDate')} error={err('openDate')}>
          <input
            className="tf-input"
            type="date"
            value={form.openDate}
            onChange={(e) => update('openDate', e.target.value)}
          />
        </Field>

        <Field label={t('journal.closeDateOptional')} error={err('closeDate')}>
          <input
            className="tf-input"
            type="date"
            value={form.closeDate}
            onChange={(e) => update('closeDate', e.target.value)}
          />
        </Field>

        <Field label={t('journal.feesOptional')} error={err('fees')}>
          <input
            className="tf-input"
            type="number"
            min="0"
            step="any"
            value={form.fees}
            placeholder="0.00"
            onChange={(e) => update('fees', e.target.value)}
          />
        </Field>
      </div>

      <Field label={t('journal.notesOptional')} error={err('notes')}>
        <textarea
          className="tf-input tf-textarea"
          rows={2}
          value={form.notes}
          placeholder={t('journal.notesPlaceholder')}
          onChange={(e) => update('notes', e.target.value)}
        />
      </Field>

      <p className="tf-hint">{t('journal.formHint')}</p>

      <div className="tf-actions">
        {savedTicker && (
          <span className="tf-saved">{t('journal.saved', { ticker: savedTicker })}</span>
        )}
        {submitError && (
          <span className="tf-error">{t('common.requestFailed')}</span>
        )}
        <button type="submit" className="tf-submit" disabled={saving}>
          {t('journal.addTrade')}
        </button>
      </div>
    </form>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="tf-field">
      <span className="tf-label">{label}</span>
      {children}
      {error && <span className="tf-error">{error}</span>}
    </label>
  )
}
