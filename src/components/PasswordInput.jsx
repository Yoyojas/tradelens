import { useState } from 'react'
import { useLang } from '../i18n/LanguageContext.jsx'
import '../css/auth.css'

// Password field with a show/hide (eye) toggle. Each instance toggles only
// itself. The toggle stays in the Tab order and gets a visible focus ring —
// chosen over tabindex=-1 so keyboard users can reach it too.
export default function PasswordInput({
  label,
  value,
  onChange,
  error,
  autoFocus,
}) {
  const { t } = useLang()
  const [visible, setVisible] = useState(false)

  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <span className="pw-wrap">
        <input
          className={`auth-input pw-input${error ? ' auth-input-error' : ''}`}
          type={visible ? 'text' : 'password'}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="pw-toggle"
          aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
          aria-pressed={visible}
          onClick={(e) => {
            // Inside a <label>: stop the click from re-triggering the input.
            e.preventDefault()
            setVisible((v) => !v)
          }}
        >
          <EyeIcon open={visible} />
        </button>
      </span>
      {error && <span className="auth-field-error">{error}</span>}
    </label>
  )
}

function EyeIcon({ open }) {
  return open ? (
    // Eye open = password currently visible
    <svg className="pw-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    // Eye with slash = hidden
    <svg className="pw-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5C2.8 6.9 2 8.4 2 8.4S5.5 16 12 16c1.1 0 2.1-.2 3-.5M9.9 4.24A9.6 9.6 0 0 1 12 4c6.5 0 10 7.6 10 7.6s-.7 1.4-2 2.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 2)"
      />
      <path
        d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
