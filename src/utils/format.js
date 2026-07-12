// Display formatting helpers.
// Currency stays USD regardless of UI language (instruments are US-priced).
// Date formatting follows the active UI language via setDateLocale().

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const DATE_LOCALES = {
  en: 'en-US',
  zh: 'zh-CN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
}
let dateLocale = 'en-US'
export function setDateLocale(lang) {
  dateLocale = DATE_LOCALES[lang] || 'en-US'
}

export function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return currencyFmt.format(value)
}

// value is a ratio fraction (0.6 -> "60.0%")
export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

export function formatRatio(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return '—'
  if (!Number.isFinite(value)) return '∞'
  return `${value.toFixed(digits)}×`
}

export function formatNumber(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

// "2026-02-01" -> "Feb 1, 2026". Accepts date-only or ISO strings.
export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
