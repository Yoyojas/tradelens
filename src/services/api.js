// Legacy device-local storage helpers (pre-step-2). Trades and adoptions now
// live on the server (services/data.js); this module only reads what older
// versions of the app persisted in localStorage so it can be migrated into
// the account once, then cleared. No new data is ever written here.

const userKey = (userId, name) => `tl:${userId}:${name}`
const MIGRATED_FLAG = 'migrated' // '1' = uploaded or dismissed; never ask again

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Trades saved on this device for this user (step-1 per-user store).
export function getLegacyTrades(userId) {
  const trades = readJSON(userKey(userId, 'trades'))
  return Array.isArray(trades) ? trades : []
}

// Adoptions from the step-1 per-user profile store.
export function getLegacyAdoptions(userId) {
  const profile = readJSON(userKey(userId, 'profile'))
  return Array.isArray(profile?.adoptedPlaybookIds)
    ? profile.adoptedPlaybookIds
    : []
}

export function isMigrationDone(userId) {
  try {
    return localStorage.getItem(userKey(userId, MIGRATED_FLAG)) === '1'
  } catch {
    return true // storage unavailable -> nothing to migrate anyway
  }
}

export function markMigrationDone(userId) {
  try {
    localStorage.setItem(userKey(userId, MIGRATED_FLAG), '1')
  } catch {
    /* ignore */
  }
}

// Called after a successful upload: the account is now the source of truth.
export function clearLegacyData(userId) {
  try {
    localStorage.removeItem(userKey(userId, 'trades'))
    localStorage.removeItem(userKey(userId, 'profile'))
  } catch {
    /* ignore */
  }
  markMigrationDone(userId)
}
