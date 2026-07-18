import { useLang } from '../i18n/LanguageContext.jsx'
import { LANGUAGES } from '../i18n/languages.js'

// Card-footer language selector for logged-out screens (TL-FEAT-011 rework,
// user-picked pattern after the corner globe proved too subtle): a plain
// select under the auth card showing each language's NATIVE name, like the
// footer on Google's sign-in page. Selection still goes through setLang, so
// localStorage persistence semantics are unchanged.
export default function AuthLangSelect() {
  const { lang, setLang } = useLang()
  return (
    <div className="auth-footer">
      <select
        className="auth-lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
