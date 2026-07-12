import { useEffect } from 'react'
import { useLang } from '../i18n/LanguageContext.jsx'
import '../css/modal.css'

// Reusable modal: dim backdrop, click-outside / Esc to close, scroll lock.
export default function Modal({ onClose, children, ariaLabel }) {
  const { t } = useLang()
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
