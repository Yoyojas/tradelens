import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as dataApi from '../services/data.js'
import * as legacy from '../services/api.js'
import { useAuth } from './AuthContext.jsx'
import MigrationPrompt from '../components/MigrationPrompt.jsx'

// Server-backed data layer (Milestone 2 step 2). Trades, adoptions, playbooks
// and tags come from the Flask API, scoped per account by the session cookie.
// Writes are server-first (await the API, then update local state) — no
// optimistic updates: latency is a local round-trip, and it keeps failure
// handling trivial (state never diverges from the server).
const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { currentUser, emailVerified } = useAuth()

  const [playbooks, setPlaybooks] = useState([])
  const [adoptedPlaybookIds, setAdoptedPlaybookIds] = useState([])
  // `trades` is the loaded window (server pages at 200); `tradesTotal` is the
  // account's full count — the Journal shows "load more" while they differ.
  const [trades, setTrades] = useState([])
  const [tradesTotal, setTradesTotal] = useState(0)
  const [tags, setTags] = useState([])
  // {trades, full} when the one-time "upload local data" prompt should show;
  // full=true means the server was empty and every local trade was offered.
  const [migration, setMigration] = useState(null)

  // Data endpoints require a verified session; /verify and /login render
  // outside this gate, so nothing is fetched there.
  const active = !!currentUser && emailVerified
  const userId = currentUser?.id

  // Which account may still apply async state updates. Cleared on logout /
  // account switch so a late-resolving write can't paint user A's data into
  // user B's session.
  const activeUserRef = useRef(null)
  activeUserRef.current = active ? userId : null
  const stillCurrent = (uid) => activeUserRef.current === uid

  useEffect(() => {
    if (!active) {
      setPlaybooks([])
      setAdoptedPlaybookIds([])
      setTrades([])
      setTradesTotal(0)
      setTags([])
      setMigration(null)
      return undefined
    }
    let cancelled = false
    Promise.all([
      dataApi.fetchPlaybooks(),
      dataApi.fetchTrades(),
      dataApi.fetchTags(),
    ])
      .then(async ([pb, tr, tg]) => {
        if (cancelled) return
        setPlaybooks(pb.playbooks)
        setAdoptedPlaybookIds(pb.adoptedIds)
        setTrades(tr.trades)
        setTradesTotal(tr.total)
        setTags(tg.tags)

        if (legacy.isMigrationDone(userId)) return
        const pending = pendingLegacyTrades(userId, tr.trades, tr.total)
        if (pending.length) {
          setMigration({ trades: pending, full: tr.total === 0 })
          return
        }
        // No trades to offer, but device-local adoptions may still exist
        // (e.g. an account that adopted playbooks and never logged a trade).
        // Sync them silently — adoption is an idempotent reference.
        const extra = legacy
          .getLegacyAdoptions(userId)
          .filter((id) => !pb.adoptedIds.includes(id))
        if (extra.length) {
          await Promise.all(
            extra.map((id) => dataApi.adoptPlaybook(id).catch(() => {})),
          )
          const pb2 = await dataApi.fetchPlaybooks().catch(() => null)
          if (pb2 && !cancelled) setAdoptedPlaybookIds(pb2.adoptedIds)
        }
        if (!legacy.getLegacyTrades(userId).length) {
          legacy.markMigrationDone(userId)
        }
      })
      .catch(() => {
        /* backend unreachable: views render empty; nothing to roll back */
      })
    return () => {
      cancelled = true
    }
  }, [active, userId])

  const adoptedPlaybooks = useMemo(
    () => playbooks.filter((p) => adoptedPlaybookIds.includes(p.id)),
    [playbooks, adoptedPlaybookIds],
  )

  // Re-fetch the first page (resets the loaded window to 200 after imports).
  async function refreshTrades() {
    const uid = userId
    const res = await dataApi.fetchTrades()
    if (stillCurrent(uid)) {
      setTrades(res.trades)
      setTradesTotal(res.total)
    }
  }

  async function loadMoreTrades() {
    const uid = userId
    const res = await dataApi.fetchTrades({ offset: trades.length })
    if (stillCurrent(uid)) {
      setTrades((prev) => [...prev, ...res.trades])
      setTradesTotal(res.total)
    }
  }

  // ── Trade actions (server-first) ─────────────────────────────
  async function addTrade(form) {
    const uid = userId
    const trade = await dataApi.createTrade({
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
      source: 'manual',
    })
    if (stillCurrent(uid)) {
      setTrades((prev) => [trade, ...prev])
      setTradesTotal((n) => n + 1)
    }
    return trade
  }

  async function deleteTrade(id) {
    const uid = userId
    await dataApi.deleteTrade(id)
    if (stillCurrent(uid)) {
      setTrades((prev) => prev.filter((t) => t.id !== id))
      setTradesTotal((n) => Math.max(0, n - 1))
    }
  }

  // Bulk import (IBKR /connect). The server dedupes on source+externalId, so
  // re-importing the same fills never duplicates. Returns {added, skipped}.
  async function importTrades(incoming) {
    const payload = incoming.map((t) => ({
      ...t,
      source: t.source || 'broker:ibkr',
      externalId: t.externalId || null,
      playbookId: t.playbookId || null,
    }))
    const res = await dataApi.importTrades(payload, 'broker:ibkr')
    await refreshTrades()
    return { added: res.added, skipped: res.skipped }
  }

  // ── Adoption ─────────────────────────────────────────────────
  async function adoptPlaybook(playbookId) {
    const uid = userId
    const res = await dataApi.adoptPlaybook(playbookId).catch(() => null)
    if (res && stillCurrent(uid)) setAdoptedPlaybookIds(res.adoptedIds)
  }
  async function unadoptPlaybook(playbookId) {
    const uid = userId
    const res = await dataApi.unadoptPlaybook(playbookId).catch(() => null)
    if (res && stillCurrent(uid)) setAdoptedPlaybookIds(res.adoptedIds)
  }
  const isAdopted = (playbookId) => adoptedPlaybookIds.includes(playbookId)

  // ── Admin: library CRUD ──────────────────────────────────────
  async function createPlaybook(data) {
    const uid = userId
    const playbook = await dataApi.createPlaybook(data)
    if (stillCurrent(uid)) setPlaybooks((prev) => [...prev, playbook])
    return playbook
  }
  async function updatePlaybook(id, patch) {
    const uid = userId
    const playbook = await dataApi.updatePlaybook(id, patch)
    if (stillCurrent(uid)) {
      setPlaybooks((prev) => prev.map((p) => (p.id === id ? playbook : p)))
    }
  }
  async function deletePlaybook(id) {
    const uid = userId
    await dataApi.deletePlaybook(id)
    if (!stillCurrent(uid)) return
    setPlaybooks((prev) => prev.filter((p) => p.id !== id))
    setAdoptedPlaybookIds((prev) => prev.filter((pid) => pid !== id))
    // Server cleared playbookId on referencing trades; mirror it.
    setTrades((prev) =>
      prev.map((t) => (t.playbookId === id ? { ...t, playbookId: null } : t)),
    )
  }

  // ── One-time local-data migration ────────────────────────────
  async function migrateUpload() {
    const uid = userId
    // Read adoptions BEFORE any cleanup, then send the trades. If this import
    // call throws, nothing below runs and retrying is safe (server committed
    // nothing... or deduped what it did commit via externalId).
    const adoptions = legacy.getLegacyAdoptions(uid)
    await dataApi.importTrades(migration.trades, 'local-migration')

    // The upload landed: retire the prompt NOW so no retry can re-send
    // manual (non-dedupable) rows, then clean local storage. A partial offer
    // (server already had trades) keeps the local key as a backup of the
    // manual rows that were deliberately not uploaded.
    if (migration.full) legacy.clearLegacyData(uid)
    else legacy.markMigrationDone(uid)
    setMigration(null)

    // Best-effort follow-ups; failures here must never re-open the upload.
    for (const id of adoptions) {
      await dataApi.adoptPlaybook(id).catch(() => {})
    }
    try {
      const pb = await dataApi.fetchPlaybooks()
      if (stillCurrent(uid)) setAdoptedPlaybookIds(pb.adoptedIds)
      await refreshTrades()
    } catch {
      /* data shows up on the next reload */
    }
  }

  // Explicit "not now": never ask again on this device.
  function migrateSkip() {
    legacy.markMigrationDone(userId)
    setMigration(null)
  }

  // Esc / backdrop click: just close for this session — an accidental
  // dismissal must not permanently strand the device's local trades.
  function migrateDismiss() {
    setMigration(null)
  }

  const value = useMemo(
    () => ({
      playbooks,
      tags,
      trades,
      tradesTotal,
      loadMoreTrades,
      adoptedPlaybookIds,
      adoptedPlaybooks,
      addTrade,
      deleteTrade,
      importTrades,
      refreshTrades,
      adoptPlaybook,
      unadoptPlaybook,
      isAdopted,
      createPlaybook,
      updatePlaybook,
      deletePlaybook,
    }),
    [playbooks, tags, trades, tradesTotal, adoptedPlaybookIds, adoptedPlaybooks],
  )

  return (
    <DataContext.Provider value={value}>
      {children}
      {migration && (
        <MigrationPrompt
          count={migration.trades.length}
          onUpload={migrateUpload}
          onSkip={migrateSkip}
          onDismiss={migrateDismiss}
        />
      )}
    </DataContext.Provider>
  )
}

// Which device-local trades still need uploading?
// - Server empty (total 0): everything saved locally (the pre-step-2 store).
// - Server non-empty: only broker imports (externalId set) the server doesn't
//   have — manual local rows can't be distinguished from server seeds, and
//   demo's server account already carries the seed trades. The comparison
//   uses the loaded window; the import endpoint dedupes regardless.
function pendingLegacyTrades(userId, serverTrades, serverTotal) {
  if (legacy.isMigrationDone(userId)) return []
  const local = legacy.getLegacyTrades(userId)
  if (!local.length) return []
  const strip = ({ id, userId: _u, createdAt, ...rest }) => rest
  if (serverTotal === 0) return local.map(strip)
  const seen = new Set(
    serverTrades
      .filter((t) => t.externalId)
      .map((t) => `${t.source}:${t.externalId}`),
  )
  return local
    .filter(
      (t) => t.externalId && !seen.has(`${t.source || 'manual'}:${t.externalId}`),
    )
    .map(strip)
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
