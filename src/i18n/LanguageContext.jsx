import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DICTS, DEFAULT_LANG } from './languages.js'
import { setDateLocale } from '../utils/format.js'

const LS_KEY = 'tradelens.lang'

const LanguageContext = createContext(null)

// Resolve a dotted key path ("library.title") within a nested dict.
function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict)
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    let initial = DEFAULT_LANG
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored && DICTS[stored]) initial = stored
    } catch {
      /* ignore */
    }
    setDateLocale(initial) // align date formatting before first paint
    return initial
  })

  useEffect(() => {
    setDateLocale(lang)
  }, [lang])

  function setLang(next) {
    if (!DICTS[next]) return // ignore unknown codes
    setLangState(next)
    try {
      localStorage.setItem(LS_KEY, next)
    } catch {
      /* ignore */
    }
  }

  // t(key, vars): current lang -> English fallback -> key itself, with {var}
  // interpolation.
  const t = useMemo(() => {
    return (key, vars) => {
      const value = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key
      if (!vars) return value
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
        value,
      )
    }
  }, [lang])

  // tVocab(namespace, value): translate a controlled-vocabulary value (category,
  // market, tag, …) keyed by its English original. Falls back to the original
  // value — not the key — so admin-created values never render blank. The display
  // label is localized while the underlying value stays English for filtering.
  const tVocab = useMemo(() => {
    return (namespace, value) => {
      if (value == null || value === '') return value
      const local = DICTS[lang]?.[namespace]?.[value]
      const fallback = DICTS.en?.[namespace]?.[value]
      return local ?? fallback ?? value
    }
  }, [lang])

  // tField(obj, field): localized data field with English fallback. Returns
  // obj[`${field}_${lang}`] when present and non-empty; otherwise the English
  // obj[field]. Today only `_zh` fields exist (playbook content), so es/fr/de/
  // ja/ko fall back to English — add `name_es` etc. later to extend coverage.
  const tField = useMemo(() => {
    return (obj, field) => {
      if (!obj) return ''
      if (lang !== 'en') {
        const localized = obj[`${field}_${lang}`]
        const empty =
          localized == null ||
          localized === '' ||
          (Array.isArray(localized) && localized.length === 0)
        if (!empty) return localized
      }
      return obj[field]
    }
  }, [lang])

  const value = useMemo(
    () => ({ lang, setLang, t, tVocab, tField }),
    [lang, t, tVocab, tField],
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider')
  return ctx
}
