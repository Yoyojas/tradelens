// Central language registry. Add a language here (code + native label + dict)
// and it shows up in the language menu automatically.
import en from './en.json'
import zh from './zh.json'
import es from './es.json'
import fr from './fr.json'
import de from './de.json'
import ja from './ja.json'
import ko from './ko.json'

export const LANGUAGES = [
  { code: 'en', label: 'English', dict: en },
  { code: 'zh', label: '简体中文', dict: zh },
  { code: 'es', label: 'Español', dict: es },
  { code: 'fr', label: 'Français', dict: fr },
  { code: 'de', label: 'Deutsch', dict: de },
  { code: 'ja', label: '日本語', dict: ja },
  { code: 'ko', label: '한국어', dict: ko },
]

export const DICTS = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.dict]))
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code)
export const DEFAULT_LANG = 'en'

// First-visit language detection (TL-FEAT-011): walk the browser's language
// list in preference order and return the first whose PRIMARY subtag has a
// dictionary (zh-CN / zh-TW -> zh, en-GB -> en). No match -> DEFAULT_LANG.
// Pure so the mapping is unit-testable; only ever consulted when localStorage
// holds no explicit choice — a manual switch always wins afterwards.
export function detectBrowserLang(candidates) {
  for (const raw of candidates || []) {
    const primary = String(raw).toLowerCase().split('-')[0]
    if (DICTS[primary]) return primary
  }
  return DEFAULT_LANG
}

// Intl locale used for date formatting per app language.
export const DATE_LOCALES = {
  en: 'en-US',
  zh: 'zh-CN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
}
