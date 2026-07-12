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
