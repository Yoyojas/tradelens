// IBKR Flex statement parsing (browser-side, DOMParser — no dependencies).
// Extracts <Trade> execution nodes into the JSON shape the backend pairing
// endpoint expects. Only STK rows are kept this milestone; other asset
// categories are counted and surfaced in the preview note.

// Flex dateTime formats seen in the wild: "20260302;093105", "2026-03-02;09:31:05",
// or date-only "20260302". Returns an ISO string or null.
function parseFlexDateTime(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const [datePart, timePart] = raw.split(/[;,\s]+/)
  const d = datePart.replaceAll('-', '')
  if (!/^\d{8}$/.test(d)) return null
  const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  const t = (timePart || '').replaceAll(':', '')
  if (/^\d{6}$/.test(t)) {
    return `${date}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`
  }
  return `${date}T00:00:00`
}

// -> { executions, total, skippedNonStock, skippedBad } or { error: true }
export function parseFlexReport(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.querySelector('parsererror')) return { error: true }
  const nodes = [...doc.querySelectorAll('Trade')]
  if (!nodes.length) return { error: true }

  const executions = []
  let skippedNonStock = 0
  let skippedBad = 0
  for (const node of nodes) {
    const attr = (name) => node.getAttribute(name) ?? ''
    const assetCategory = attr('assetCategory')
    if (assetCategory && assetCategory !== 'STK') {
      skippedNonStock += 1
      continue
    }
    const side = attr('buySell').toUpperCase()
    // Flex reports sells with negative quantity; the sign lives in buySell.
    const shares = Math.abs(parseFloat(attr('quantity')))
    const price = parseFloat(attr('tradePrice'))
    const execId = attr('tradeID')
    const symbol = attr('symbol')
    // ibCommission is negative in Flex exports (a cost).
    const commission =
      Math.abs(parseFloat(attr('ibCommission') || attr('commission') || '0')) || 0
    const time = parseFlexDateTime(attr('dateTime') || attr('tradeDate'))
    if (
      !execId ||
      !symbol ||
      !['BUY', 'SELL'].includes(side) ||
      !shares ||
      !Number.isFinite(price) ||
      !time
    ) {
      skippedBad += 1
      continue
    }
    executions.push({
      execId,
      symbol,
      side,
      shares,
      price,
      time,
      commission,
      currency: attr('currency') || 'USD',
    })
  }
  return { executions, total: nodes.length, skippedNonStock, skippedBad }
}
