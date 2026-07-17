import { useMemo, useState } from 'react'
import Modal from '../Modal.jsx'
import TradeFormFields, { tradeToForm, formToPayload } from './TradeFormFields.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'
import { validateTrade } from '../../utils/validation.js'
import { sourceLabelKey } from '../../utils/format.js'

// Edit an existing trade (also the "close position" shortcut: same form,
// focused on the exit fields). Same field set and validation as TradeForm.
// Closing with unsaved changes asks for confirmation; the confirm view swaps
// into the same modal so Esc/backdrop simply return to editing.
export default function TradeEditModal({ trade, focusExit = false, onClose }) {
  const { playbooks, adoptedPlaybooks, updateTrade } = useData()
  const { t } = useLang()

  const initial = useMemo(() => tradeToForm(trade), [trade])
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null) // i18n key
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  // Deep-compare per field: tags is an array, so identity comparison would
  // flag it dirty on every render once touched.
  const dirty = useMemo(
    () =>
      Object.keys(initial).some(
        (k) => JSON.stringify(form[k]) !== JSON.stringify(initial[k]),
      ),
    [form, initial],
  )

  // The trade may reference a playbook the user has since un-adopted; keep it
  // selectable so the prefilled value displays (and survives a save).
  const playbookOptions = useMemo(() => {
    if (
      trade.playbookId &&
      !adoptedPlaybooks.some((p) => p.id === trade.playbookId)
    ) {
      const current = playbooks.find((p) => p.id === trade.playbookId)
      if (current) return [...adoptedPlaybooks, current]
    }
    return adoptedPlaybooks
  }, [adoptedPlaybooks, playbooks, trade.playbookId])

  const err = (field) => (errors[field] ? t(errors[field]) : undefined)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    setSaveError(null)
  }

  // Reopen a closed trade: exitPrice and closeDate must clear as a PAIR
  // (validation and the API both reject a half-cleared close).
  function clearExit() {
    setForm((f) => ({ ...f, exitPrice: '', closeDate: '' }))
    setErrors((e) => ({ ...e, exitPrice: undefined, closeDate: undefined }))
    setSaveError(null)
  }

  function requestClose() {
    if (saving) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
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
    setSaveError(null)
    try {
      await updateTrade(trade.id, formToPayload(form))
      onClose()
    } catch (error) {
      setSaveError(
        error?.code === 'invalid_payload'
          ? 'journal.errEditInvalid'
          : 'common.requestFailed',
      )
    } finally {
      setSaving(false)
    }
  }

  if (confirmDiscard) {
    return (
      <Modal
        onClose={() => setConfirmDiscard(false)}
        ariaLabel={t('journal.unsavedTitle')}
      >
        <h2 className="tl-confirm-title">{t('journal.unsavedTitle')}</h2>
        <p className="tl-confirm-body">{t('journal.unsavedBody')}</p>
        <div className="tl-confirm-actions">
          <button
            type="button"
            className="tl-cancel"
            onClick={() => setConfirmDiscard(false)}
          >
            {t('journal.keepEditing')}
          </button>
          <button type="button" className="tl-confirm-delete" onClick={onClose}>
            {t('journal.discard')}
          </button>
        </div>
      </Modal>
    )
  }

  const isBroker = trade.source && trade.source !== 'manual'
  const srcKey = sourceLabelKey(trade.source)
  const hasExitInput = form.exitPrice !== '' || form.closeDate !== ''

  return (
    <Modal onClose={requestClose} ariaLabel={t('journal.editTitle')}>
      <form className="te-form" onSubmit={handleSubmit} noValidate>
        <h2 className="tl-confirm-title">{t('journal.editTitle')}</h2>

        {isBroker && (
          <p className="te-broker-note">{t('journal.brokerNotice')}</p>
        )}

        <TradeFormFields
          form={form}
          update={update}
          err={err}
          playbookOptions={playbookOptions}
          focusExit={focusExit}
        />

        {/* Provenance (TL-DATA-003), read-only for every trade: localized
            source label (raw string alongside for broker imports), the
            original externalId when one exists (manual trades have none),
            and a line explaining the open::close FIFO pairing reference. */}
        <dl className="te-readonly">
          <div className="te-readonly-item">
            <dt>{t('journal.sourceLabel')}</dt>
            <dd>
              {srcKey ? t(srcKey) : trade.source}
              {isBroker ? ` · ${trade.source}` : ''}
            </dd>
          </div>
          {trade.externalId && (
            <div className="te-readonly-item">
              <dt>{t('journal.externalIdLabel')}</dt>
              <dd>{trade.externalId}</dd>
            </div>
          )}
          {trade.externalId && (
            <p className="te-readonly-note">{t('journal.pairingHint')}</p>
          )}
        </dl>

        <div className="te-actions">
          {hasExitInput && (
            <button type="button" className="te-clear-exit" onClick={clearExit}>
              {t('journal.clearExit')}
            </button>
          )}
          <span className="te-actions-spacer" />
          {saveError && <span className="tf-error">{t(saveError)}</span>}
          <button type="button" className="tl-cancel" onClick={requestClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="tf-submit" disabled={saving}>
            {t('journal.saveChanges')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
