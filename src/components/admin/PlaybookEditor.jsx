import { useState } from 'react'
import Modal from '../Modal.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'

const RISK_LEVELS = ['Low', 'Medium', 'High']

// Create / edit a library playbook. `playbook` null means create.
export default function PlaybookEditor({ playbook, onSave, onClose }) {
  const { t } = useLang()
  const isEdit = !!playbook
  const [form, setForm] = useState({
    name: playbook?.name ?? '',
    category: playbook?.category ?? '',
    market: playbook?.market ?? '',
    riskLevel: playbook?.riskLevel ?? 'Medium',
    summary: playbook?.summary ?? '',
    description: playbook?.description ?? '',
    rules: (playbook?.rules ?? []).join('\n'),
    tags: (playbook?.tags ?? []).join(', '),
    name_zh: playbook?.name_zh ?? '',
    summary_zh: playbook?.summary_zh ?? '',
    description_zh: playbook?.description_zh ?? '',
  })
  const [errors, setErrors] = useState({})

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = t('admin.errName')
    if (!form.category.trim()) next.category = t('admin.errCategory')
    if (!form.market.trim()) next.market = t('admin.errMarket')
    if (!form.summary.trim()) next.summary = t('admin.errSummary')
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    onSave({
      name: form.name.trim(),
      category: form.category.trim(),
      market: form.market.trim(),
      riskLevel: form.riskLevel,
      summary: form.summary.trim(),
      description: form.description.trim(),
      rules: form.rules
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      name_zh: form.name_zh.trim(),
      summary_zh: form.summary_zh.trim(),
      description_zh: form.description_zh.trim(),
    })
  }

  return (
    <Modal onClose={onClose} ariaLabel={isEdit ? t('admin.editTitle') : t('admin.newTitle')}>
      <h2 className="adm-editor-title">{isEdit ? t('admin.editTitle') : t('admin.newTitle')}</h2>
      <form className="adm-editor" onSubmit={handleSubmit} noValidate>
        <div className="adm-editor-grid">
          <Field label={t('admin.name')} error={errors.name}>
            <input className="adm-input" value={form.name} maxLength={120} onChange={(e) => update('name', e.target.value)} />
          </Field>
          <Field label={t('admin.category')} error={errors.category}>
            <input className="adm-input" value={form.category} placeholder="Momentum" onChange={(e) => update('category', e.target.value)} />
          </Field>
          <Field label={t('admin.market')} error={errors.market}>
            <input className="adm-input" value={form.market} placeholder="US Equities" onChange={(e) => update('market', e.target.value)} />
          </Field>
          <Field label={t('admin.riskLevel')}>
            <select className="adm-input" value={form.riskLevel} onChange={(e) => update('riskLevel', e.target.value)}>
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>{t(`risk.${r.toLowerCase()}`)}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t('admin.summary')} error={errors.summary}>
          <input className="adm-input" value={form.summary} onChange={(e) => update('summary', e.target.value)} />
        </Field>

        <Field label={t('admin.description')}>
          <textarea className="adm-input adm-textarea" rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
        </Field>

        <Field label={t('admin.rules')}>
          <textarea className="adm-input adm-textarea" rows={3} value={form.rules} placeholder={'Entry: …\nExit: …\nStop: …'} onChange={(e) => update('rules', e.target.value)} />
        </Field>

        <Field label={t('admin.tags')}>
          <input className="adm-input" value={form.tags} placeholder="breakout, volume" onChange={(e) => update('tags', e.target.value)} />
        </Field>

        <p className="adm-zh-hint">{t('admin.zhHint')}</p>

        <Field label={t('admin.nameZh')}>
          <input className="adm-input" value={form.name_zh} onChange={(e) => update('name_zh', e.target.value)} />
        </Field>

        <Field label={t('admin.summaryZh')}>
          <input className="adm-input" value={form.summary_zh} onChange={(e) => update('summary_zh', e.target.value)} />
        </Field>

        <Field label={t('admin.descriptionZh')}>
          <textarea className="adm-input adm-textarea" rows={3} value={form.description_zh} onChange={(e) => update('description_zh', e.target.value)} />
        </Field>

        <div className="adm-editor-actions">
          <button type="button" className="adm-btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="adm-btn-primary">
            {isEdit ? t('admin.saveChanges') : t('admin.createPlaybook')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="adm-field">
      <span className="adm-label">{label}</span>
      {children}
      {error && <span className="adm-error">{error}</span>}
    </label>
  )
}
