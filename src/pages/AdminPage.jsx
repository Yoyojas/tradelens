import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import RiskBadge from '../components/library/RiskBadge.jsx'
import PlaybookEditor from '../components/admin/PlaybookEditor.jsx'
import '../css/admin.css'

// Minimal admin: curate the playbook library (create / edit / delete).
// User management and activity monitoring are out of scope this milestone.
export default function AdminPage() {
  const { currentUser } = useAuth()
  const { playbooks, createPlaybook, updatePlaybook, deletePlaybook } = useData()
  const { t, tVocab, tField } = useLang()

  const [editing, setEditing] = useState(null) // playbook | 'new' | null
  const [toDelete, setToDelete] = useState(null)
  const [requestError, setRequestError] = useState(false)

  // Guard: only admins. Other users are bounced to the library.
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/library" replace />
  }

  async function handleSave(data) {
    try {
      if (editing === 'new') await createPlaybook(data)
      else await updatePlaybook(editing.id, data)
      setEditing(null)
      setRequestError(false)
    } catch {
      // Keep the editor open so nothing typed is lost.
      setRequestError(true)
    }
  }

  async function confirmDelete() {
    try {
      await deletePlaybook(toDelete.id)
      setRequestError(false)
    } catch {
      setRequestError(true)
    }
    setToDelete(null)
  }

  return (
    <section className="page">
      <div className="adm-header">
        <div>
          <h1 className="page-title">{t('admin.title')}</h1>
          <p className="page-subtitle">{t('admin.subtitle')}</p>
        </div>
        <button type="button" className="adm-btn-primary" onClick={() => setEditing('new')}>
          {t('admin.newPlaybook')}
        </button>
      </div>

      {requestError && (
        <div className="adm-request-error">{t('common.requestFailed')}</div>
      )}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>{t('admin.colName')}</th>
              <th>{t('admin.colCategory')}</th>
              <th>{t('admin.colMarket')}</th>
              <th>{t('admin.colRisk')}</th>
              <th>{t('admin.colTags')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {playbooks.map((p) => (
              <tr key={p.id}>
                <td className="adm-name">{tField(p, 'name')}</td>
                <td>{tVocab('category', p.category)}</td>
                <td className="adm-muted">{tVocab('market', p.market)}</td>
                <td><RiskBadge level={p.riskLevel} /></td>
                <td className="adm-muted">
                  {p.tags.length ? p.tags.map((tag) => tVocab('tag', tag)).join(', ') : '—'}
                </td>
                <td className="adm-actions">
                  <button type="button" className="adm-btn-link" onClick={() => setEditing(p)}>
                    {t('admin.edit')}
                  </button>
                  <button type="button" className="adm-btn-link adm-danger" onClick={() => setToDelete(p)}>
                    {t('admin.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {playbooks.length === 0 && (
          <div className="adm-empty">{t('admin.empty')}</div>
        )}
      </div>

      {editing && (
        <PlaybookEditor
          playbook={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {toDelete && (
        <Modal onClose={() => setToDelete(null)} ariaLabel={t('admin.deleteTitle')}>
          <h2 className="adm-confirm-title">{t('admin.deleteTitle')}</h2>
          <p className="adm-confirm-body">
            {t('admin.deleteBody', { name: toDelete.name })}
          </p>
          <div className="adm-confirm-actions">
            <button type="button" className="adm-btn-secondary" onClick={() => setToDelete(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="adm-btn-danger" onClick={confirmDelete}>
              {t('common.delete')}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
