import { useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useLang } from '../../i18n/LanguageContext.jsx'

// Settings card: manage the user's own tags (create / rename / delete) and
// show the shared templates read-only. Deleting is a two-step inline confirm
// (first click arms, second click deletes) since it also untags trades.
export default function TagManager() {
  const { tags, createTag, renameTag, deleteTag } = useData()
  const { t } = useLang()

  const own = tags.filter((tag) => !tag.shared)
  const shared = tags.filter((tag) => tag.shared)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [armedId, setArmedId] = useState(null)
  const [error, setError] = useState(null) // i18n key
  const [busy, setBusy] = useState(false)

  function errKey(e) {
    return e?.code === 'tag_exists' ? 'settings.tagExists' : 'common.requestFailed'
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (busy || !draft.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createTag(draft)
      setDraft('')
    } catch (err) {
      setError(errKey(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRename(id) {
    if (busy || !editValue.trim()) return
    setBusy(true)
    setError(null)
    try {
      await renameTag(id, editValue)
      setEditingId(null)
    } catch (err) {
      setError(errKey(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    if (busy) return
    if (armedId !== id) {
      setArmedId(id)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteTag(id)
      setArmedId(null)
    } catch (err) {
      setError(errKey(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tm-manager">
      <p className="set-muted">{t('settings.tagsSub')}</p>

      {own.length === 0 ? (
        <p className="tm-empty">{t('settings.tagsEmpty')}</p>
      ) : (
        <ul className="tm-list">
          {own.map((tag) => (
            <li key={tag.id} className="tm-row">
              {editingId === tag.id ? (
                <>
                  <input
                    className="tf-input tm-edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleRename(tag.id)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="tm-btn"
                    disabled={busy}
                    onClick={() => handleRename(tag.id)}
                  >
                    {t('settings.tagSave')}
                  </button>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => setEditingId(null)}
                  >
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <span className="tm-label">{tag.label}</span>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => {
                      setEditingId(tag.id)
                      setEditValue(tag.label)
                      setArmedId(null)
                    }}
                  >
                    {t('settings.tagRename')}
                  </button>
                  <button
                    type="button"
                    className={`tm-btn ${armedId === tag.id ? 'tm-btn-danger' : ''}`}
                    disabled={busy}
                    onClick={() => handleDelete(tag.id)}
                  >
                    {armedId === tag.id
                      ? t('settings.tagConfirmDelete')
                      : t('common.delete')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="tm-create" onSubmit={handleCreate}>
        <input
          className="tf-input tm-create-input"
          value={draft}
          placeholder={t('settings.tagNew')}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="submit"
          className="tm-btn tm-btn-primary"
          disabled={busy || !draft.trim()}
        >
          {t('settings.tagCreate')}
        </button>
      </form>
      {error && <p className="set-err">{t(error)}</p>}

      {shared.length > 0 && (
        <div className="tm-shared">
          <h3 className="tm-shared-title">{t('settings.tagsShared')}</h3>
          <p className="set-muted">{t('settings.tagsSharedHint')}</p>
          <div className="tm-shared-chips">
            {shared.map((tag) => (
              <span key={tag.id} className="tl-tag-chip">
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
