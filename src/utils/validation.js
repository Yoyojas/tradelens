// Client-side validation for the manual trade-entry form.
// Returns { valid, errors } where errors maps field -> an i18n key
// (the form translates each key for display).

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/

function isPositiveNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0
}

function isNonNegativeNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0
}

export function validateTrade(form) {
  const errors = {}

  // Ticker
  if (!form.ticker || !form.ticker.trim()) {
    errors.ticker = 'validation.tickerRequired'
  } else if (!TICKER_RE.test(form.ticker.trim().toUpperCase())) {
    errors.ticker = 'validation.tickerInvalid'
  }

  // Side
  if (form.side !== 'long' && form.side !== 'short') {
    errors.side = 'validation.sideRequired'
  }

  // Quantity
  if (form.quantity === '' || form.quantity == null) {
    errors.quantity = 'validation.quantityRequired'
  } else if (!isPositiveNumber(form.quantity)) {
    errors.quantity = 'validation.quantityPositive'
  }

  // Entry price
  if (form.entryPrice === '' || form.entryPrice == null) {
    errors.entryPrice = 'validation.entryRequired'
  } else if (!isPositiveNumber(form.entryPrice)) {
    errors.entryPrice = 'validation.entryPositive'
  }

  // Open date
  if (!form.openDate) {
    errors.openDate = 'validation.openDateRequired'
  }

  // Fees (optional, but if present must be >= 0)
  if (form.fees !== '' && form.fees != null && !isNonNegativeNumber(form.fees)) {
    errors.fees = 'validation.feesNonNeg'
  }

  // Exit price / close date — a trade is "closed" only when BOTH are present.
  const hasExit = form.exitPrice !== '' && form.exitPrice != null
  const hasClose = !!form.closeDate

  if (hasExit && !isPositiveNumber(form.exitPrice)) {
    errors.exitPrice = 'validation.exitPositive'
  }
  if (hasExit !== hasClose) {
    const key = 'validation.closePair'
    if (!hasExit) errors.exitPrice = key
    if (!hasClose) errors.closeDate = key
  }
  if (hasClose && form.openDate && form.closeDate < form.openDate) {
    errors.closeDate = 'validation.closeBeforeOpen'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
