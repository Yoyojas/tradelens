import RiskBadge from './RiskBadge.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'

// One strategy in the grid. Clicking the body opens details; the adopt button
// toggles workspace membership without opening the modal.
export default function PlaybookCard({ playbook, adopted, onAdoptToggle, onOpen }) {
  const { t, tVocab, tField } = useLang()
  return (
    <article
      className="pb-card"
      onClick={() => onOpen(playbook)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(playbook)
        }
      }}
    >
      <header className="pb-card-head">
        <h3 className="pb-card-name">{tField(playbook, 'name')}</h3>
        <RiskBadge level={playbook.riskLevel} />
      </header>

      <div className="pb-card-meta">
        <span className="pb-chip">{tVocab('category', playbook.category)}</span>
        <span className="pb-chip pb-chip-muted">{tVocab('market', playbook.market)}</span>
      </div>

      <p className="pb-card-summary">{tField(playbook, 'summary')}</p>

      <footer className="pb-card-foot">
        <div className="pb-card-tags">
          {playbook.tags.map((tag) => (
            <span key={tag} className="pb-tag">#{tVocab('tag', tag)}</span>
          ))}
        </div>
        <button
          type="button"
          className={`pb-adopt${adopted ? ' pb-adopt-on' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onAdoptToggle(playbook.id)
          }}
        >
          {adopted ? t('library.adopted') : t('library.adopt')}
        </button>
      </footer>
    </article>
  )
}
