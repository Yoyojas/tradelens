import Modal from '../Modal.jsx'
import RiskBadge from './RiskBadge.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'

// Full strategy detail in a modal, including rules and an adopt toggle.
export default function PlaybookDetailModal({ playbook, adopted, onAdoptToggle, onClose }) {
  const { t, tVocab, tField } = useLang()
  const rules = tField(playbook, 'rules')
  return (
    <Modal onClose={onClose} ariaLabel={`${tField(playbook, 'name')} details`}>
      <header className="pb-detail-head">
        <h2 className="pb-detail-name">{tField(playbook, 'name')}</h2>
        <RiskBadge level={playbook.riskLevel} />
      </header>

      <div className="pb-detail-meta">
        <span className="pb-chip">{tVocab('category', playbook.category)}</span>
        <span className="pb-chip pb-chip-muted">{tVocab('market', playbook.market)}</span>
      </div>

      <p className="pb-detail-summary">{tField(playbook, 'summary')}</p>
      <p className="pb-detail-desc">{tField(playbook, 'description')}</p>

      {rules?.length > 0 && (
        <div className="pb-detail-section">
          <h3 className="pb-detail-subtitle">{t('library.rules')}</h3>
          <ul className="pb-detail-rules">
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {playbook.tags?.length > 0 && (
        <div className="pb-detail-tags">
          {playbook.tags.map((tag) => (
            <span key={tag} className="pb-tag">#{tVocab('tag', tag)}</span>
          ))}
        </div>
      )}

      <div className="pb-detail-actions">
        <button
          type="button"
          className={`pb-adopt${adopted ? ' pb-adopt-on' : ''}`}
          onClick={() => onAdoptToggle(playbook.id)}
        >
          {adopted ? t('library.adoptedRemove') : t('library.adoptIntoWorkspace')}
        </button>
      </div>
    </Modal>
  )
}
