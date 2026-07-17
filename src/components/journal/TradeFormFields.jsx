import { useLang } from '../../i18n/LanguageContext.jsx'
import TagPicker from './TagPicker.jsx'

// Shared between the record form (TradeForm) and the edit modal
// (TradeEditModal): ONE set of fields and one validation path
// (utils/validation.js) so the two flows can never drift apart.

export const TRADE_FORM_BLANK = {
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
  tags: [],
}

// Existing trade -> editable form state (numbers become input strings).
export function tradeToForm(trade) {
  const s = (v) => (v == null ? '' : String(v))
  return {
    ticker: trade.ticker || '',
    side: trade.side || 'long',
    quantity: s(trade.quantity),
    entryPrice: s(trade.entryPrice),
    exitPrice: s(trade.exitPrice),
    openDate: trade.openDate || '',
    closeDate: trade.closeDate || '',
    fees: s(trade.fees),
    notes: trade.notes || '',
    playbookId: trade.playbookId || '',
    tags: Array.isArray(trade.tags) ? [...trade.tags] : [],
  }
}

// Form state -> API payload (camelCase, blanks collapsed to null). Used for
// both POST and PATCH bodies; source/externalId/tags are deliberately absent
// (not editable — the server ignores/locks them anyway).
export function formToPayload(form) {
  return {
    playbookId: form.playbookId || null,
    ticker: form.ticker,
    side: form.side,
    quantity: form.quantity,
    entryPrice: form.entryPrice,
    exitPrice: form.exitPrice === '' ? null : form.exitPrice,
    openDate: form.openDate,
    closeDate: form.closeDate || null,
    fees: form.fees === '' ? null : form.fees,
    notes: form.notes?.trim() || '',
    tags: form.tags || [],
  }
}

export function Field({ label, error, children }) {
  return (
    <label className="tf-field">
      <span className="tf-label">{label}</span>
      {children}
      {error && <span className="tf-error">{error}</span>}
    </label>
  )
}

// The field grid + notes area. `err(field)` returns the translated message
// for a field or undefined; `focusExit` autofocuses the exit-price input
// (the "close position" shortcut opens the editor on the closing fields).
export default function TradeFormFields({
  form,
  update,
  err,
  playbookOptions,
  focusExit = false,
}) {
  const { t, tField } = useLang()

  return (
    <>
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
            {playbookOptions.map((p) => (
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
            autoFocus={focusExit}
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

      <Field label={t('journal.tagsLabel')} error={err('tags')}>
        <TagPicker
          value={form.tags || []}
          onChange={(next) => update('tags', next)}
        />
      </Field>

      <Field label={t('journal.notesOptional')} error={err('notes')}>
        <textarea
          className="tf-input tf-textarea"
          rows={2}
          value={form.notes}
          placeholder={t('journal.notesPlaceholder')}
          onChange={(e) => update('notes', e.target.value)}
        />
      </Field>
    </>
  )
}
