import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { formatDate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'
import TradeForm from '../components/journal/TradeForm.jsx'
import TradeFilters from '../components/journal/TradeFilters.jsx'
import TradeList from '../components/journal/TradeList.jsx'
import TradeEditModal from '../components/journal/TradeEditModal.jsx'
import '../css/journal.css'

const EMPTY_FILTERS = { from: '', to: '', ticker: '', playbookId: '', tag: '' }

export default function JournalPage() {
  const { trades, tradesTotal, loadMoreTrades, playbooks, deleteTrade } =
    useData()
  const { t, tField } = useLang()

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [toDelete, setToDelete] = useState(null)
  // {trade, focusExit}: focusExit=true is the "close position" shortcut —
  // same edit form, cursor on the exit-price field.
  const [editing, setEditing] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)

  async function handleLoadMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      await loadMoreTrades()
    } catch {
      /* button stays; retry-able */
    } finally {
      setLoadingMore(false)
    }
  }

  const playbookNameById = useMemo(
    () => Object.fromEntries(playbooks.map((p) => [p.id, tField(p, 'name')])),
    [playbooks, tField],
  )

  // Playbooks actually referenced by this user's trades — tidy filter dropdown.
  const playbookOptions = useMemo(() => {
    const ids = new Set(trades.map((t) => t.playbookId).filter(Boolean))
    return playbooks.filter((p) => ids.has(p.id))
  }, [trades, playbooks])

  // Tag labels actually used in the loaded window (same pattern as playbooks).
  const tagOptions = useMemo(() => {
    const labels = new Set(trades.flatMap((t) => t.tags || []))
    return [...labels].sort((a, b) => a.localeCompare(b))
  }, [trades])

  const visible = useMemo(() => {
    return trades
      .filter((t) => {
        if (filters.from && t.openDate < filters.from) return false
        if (filters.to && t.openDate > filters.to) return false
        if (filters.ticker && !t.ticker.includes(filters.ticker)) return false
        if (filters.playbookId === '__none__' && t.playbookId) return false
        if (
          filters.playbookId &&
          filters.playbookId !== '__none__' &&
          t.playbookId !== filters.playbookId
        )
          return false
        if (filters.tag === '__none__' && (t.tags || []).length) return false
        if (
          filters.tag &&
          filters.tag !== '__none__' &&
          !(t.tags || []).includes(filters.tag)
        )
          return false
        return true
      })
      .sort((a, b) => b.openDate.localeCompare(a.openDate))
  }, [trades, filters])

  function handleFilterChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  async function confirmDelete() {
    try {
      await deleteTrade(toDelete.id)
    } catch {
      /* server refused/unreachable: row stays (state only changes on success) */
    }
    setToDelete(null)
  }

  return (
    <section className="page">
      <h1 className="page-title">{t('journal.title')}</h1>
      <p className="page-subtitle">{t('journal.subtitle')}</p>

      <TradeForm />

      <div className="tl-section">
        <h2 className="tl-heading">{t('journal.history')}</h2>
        <TradeFilters
          filters={filters}
          onChange={handleFilterChange}
          playbookOptions={playbookOptions}
          tagOptions={tagOptions}
          resultCount={visible.length}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />
        <TradeList
          trades={visible}
          playbookNameById={playbookNameById}
          onEdit={(trade, focusExit) => setEditing({ trade, focusExit })}
          onDelete={setToDelete}
        />
        {trades.length < tradesTotal && (
          <div className="tl-load-more">
            <span className="tl-loaded-count">
              {t('journal.loadedCount', {
                shown: trades.length,
                total: tradesTotal,
              })}
            </span>
            <button
              type="button"
              className="tl-load-more-btn"
              disabled={loadingMore}
              onClick={handleLoadMore}
            >
              {loadingMore ? t('common.loading') : t('journal.loadMore')}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <TradeEditModal
          trade={editing.trade}
          focusExit={editing.focusExit}
          onClose={() => setEditing(null)}
        />
      )}

      {toDelete && (
        <Modal onClose={() => setToDelete(null)} ariaLabel={t('journal.deleteTitle')}>
          <h2 className="tl-confirm-title">{t('journal.deleteTitle')}</h2>
          <p className="tl-confirm-body">
            {t('journal.deleteBody', {
              ticker: toDelete.ticker,
              date: formatDate(toDelete.openDate),
            })}
          </p>
          <div className="tl-confirm-actions">
            <button
              type="button"
              className="tl-cancel"
              onClick={() => setToDelete(null)}
            >
              {t('common.cancel')}
            </button>
            <button type="button" className="tl-confirm-delete" onClick={confirmDelete}>
              {t('common.delete')}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
