import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n/LanguageContext.jsx'
import { LANGUAGES } from '../i18n/languages.js'
import '../css/lang.css'

// Globe-icon popover listing each language by its native name. Keyboard
// accessible: Enter/Space/Esc, arrow keys to move, click-outside to dismiss.
export default function LanguageMenu() {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const itemRefs = useRef([])

  const currentIndex = Math.max(
    0,
    LANGUAGES.findIndex((l) => l.code === lang),
  )

  function openMenu() {
    setActive(currentIndex)
    setOpen(true)
  }

  function choose(code) {
    setLang(code)
    setOpen(false)
  }

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Move focus to the active item while open.
  useEffect(() => {
    if (open) itemRefs.current[active]?.focus()
  }, [open, active])

  function onMenuKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      rootRef.current?.querySelector('.lang-btn')?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % LANGUAGES.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(LANGUAGES.length - 1)
    }
  }

  return (
    <div className="lang-menu" ref={rootRef}>
      <button
        type="button"
        className="lang-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language"
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <GlobeIcon />
      </button>

      {open && (
        <ul className="lang-list" role="menu" onKeyDown={onMenuKeyDown}>
          {LANGUAGES.map((l, i) => (
            <li key={l.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l.code === lang}
                tabIndex={i === active ? 0 : -1}
                ref={(el) => (itemRefs.current[i] = el)}
                className={`lang-item${l.code === lang ? ' lang-item-on' : ''}`}
                onClick={() => choose(l.code)}
              >
                <span className="lang-check">{l.code === lang ? '✓' : ''}</span>
                <span>{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
    </svg>
  )
}
