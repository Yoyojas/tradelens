import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import FilterPanel from '../components/library/FilterPanel.jsx'
import PlaybookCard from '../components/library/PlaybookCard.jsx'
import PlaybookDetailModal from '../components/library/PlaybookDetailModal.jsx'
import '../css/library.css'

const EMPTY_FILTERS = { category: '', market: '', riskLevel: '' }

export default function LibraryPage() {
  const { playbooks, adoptedPlaybookIds, isAdopted, adoptPlaybook, unadoptPlaybook } =
    useData()
  const { t, tVocab, tField } = useLang()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [adoptedOnly, setAdoptedOnly] = useState(false)
  const [selected, setSelected] = useState(null)

  // Distinct filter options derived from the library data.
  const options = useMemo(
    () => ({
      categories: unique(playbooks.map((p) => p.category)),
      markets: unique(playbooks.map((p) => p.market)),
      riskLevels: ['Low', 'Medium', 'High'].filter((r) =>
        playbooks.some((p) => p.riskLevel === r),
      ),
    }),
    [playbooks],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return playbooks.filter((p) => {
      if (filters.category && p.category !== filters.category) return false
      if (filters.market && p.market !== filters.market) return false
      if (filters.riskLevel && p.riskLevel !== filters.riskLevel) return false
      if (adoptedOnly && !adoptedPlaybookIds.includes(p.id)) return false
      if (q) {
        // Include localized name/summary + vocab terms so e.g. "突破动量" / "动量"
        // / "美股" also match in zh mode.
        const localized = [
          tField(p, 'name'),
          tField(p, 'summary'),
          tVocab('category', p.category),
          tVocab('market', p.market),
          ...p.tags.map((tag) => tVocab('tag', tag)),
        ].join(' ')
        const hay = `${p.name} ${p.summary} ${p.tags.join(' ')} ${localized}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [playbooks, filters, search, adoptedOnly, adoptedPlaybookIds, tVocab, tField])

  function handleAdoptToggle(id) {
    if (isAdopted(id)) unadoptPlaybook(id)
    else adoptPlaybook(id)
  }

  function handleFilterChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  function handleReset() {
    setSearch('')
    setFilters(EMPTY_FILTERS)
    setAdoptedOnly(false)
  }

  return (
    <section className="page">
      <div className="lib-header">
        <div>
          <h1 className="page-title">{t('library.title')}</h1>
          <p className="page-subtitle">{t('library.subtitle')}</p>
        </div>
        <div className="lib-adopted-count">
          {t('library.inWorkspace', { n: adoptedPlaybookIds.length })}
        </div>
      </div>

      <FilterPanel
        search={search}
        onSearch={setSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        options={options}
        adoptedOnly={adoptedOnly}
        onAdoptedOnlyChange={setAdoptedOnly}
        resultCount={filtered.length}
        onReset={handleReset}
      />

      {filtered.length === 0 ? (
        <div className="lib-empty">
          {t('library.empty')}{' '}
          <button type="button" className="lib-reset" onClick={handleReset}>
            {t('library.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="pb-grid">
          {filtered.map((p) => (
            <PlaybookCard
              key={p.id}
              playbook={p}
              adopted={isAdopted(p.id)}
              onAdoptToggle={handleAdoptToggle}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}

      {selected && (
        <PlaybookDetailModal
          playbook={selected}
          adopted={isAdopted(selected.id)}
          onAdoptToggle={handleAdoptToggle}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}

function unique(arr) {
  return [...new Set(arr)].sort()
}
