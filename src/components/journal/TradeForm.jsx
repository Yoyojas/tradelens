import { useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'
import { validateTrade } from '../../utils/validation.js'
import TradeFormFields, { TRADE_FORM_BLANK } from './TradeFormFields.jsx'

// Manual trade-entry form. Fields and validation live in TradeFormFields /
// validation.js and are shared with the edit modal (TradeEditModal).
// The playbook dropdown lists only the user's adopted playbooks.
export default function TradeForm() {
  const { adoptedPlaybooks, addTrade } = useData()
  const { t } = useLang()
  const [form, setForm] = useState(TRADE_FORM_BLANK)
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
      setForm(TRADE_FORM_BLANK)
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

      <TradeFormFields
        form={form}
        update={update}
        err={err}
        playbookOptions={adoptedPlaybooks}
      />

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
