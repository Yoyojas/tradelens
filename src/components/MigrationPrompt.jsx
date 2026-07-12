import { useState } from 'react'
import Modal from './Modal.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import '../css/migrate.css'

// One-time prompt: trades saved on this device (pre-step-2 localStorage)
// aren't in the account yet — offer to upload them. The explicit "Not now"
// button (onSkip) never asks again; Esc/backdrop (onDismiss) only closes for
// this session, so an accidental click can't strand the local data.
export default function MigrationPrompt({ count, onUpload, onSkip, onDismiss }) {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function handleUpload() {
    if (busy) return
    setBusy(true)
    setError(false)
    try {
      // Success closes the prompt (provider clears it) and the uploaded
      // trades appear in the journal immediately.
      await onUpload()
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  return (
    <Modal onClose={busy ? () => {} : onDismiss} ariaLabel={t('migrate.title')}>
      <div className="mig-body">
        <h2 className="mig-title">{t('migrate.title')}</h2>
        <p className="mig-text">{t('migrate.body', { n: count })}</p>
        {error && <div className="mig-error">{t('common.requestFailed')}</div>}
        <div className="mig-actions">
          <button
            type="button"
            className="mig-btn-secondary"
            disabled={busy}
            onClick={onSkip}
          >
            {t('migrate.skip')}
          </button>
          <button
            type="button"
            className="mig-btn-primary"
            disabled={busy}
            onClick={handleUpload}
          >
            {busy ? t('common.loading') : t('migrate.upload')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
