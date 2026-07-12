import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import LanguageMenu from './LanguageMenu.jsx'
import '../css/layout.css'

// Shell shared by all main views: top nav + routed content outlet.
export default function AppLayout() {
  const { currentUser, logout } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-mark">◈</span>
          <span className="app-brand-name">TradeLens</span>
        </div>
        <nav className="app-nav">
          <NavLink to="/library" className="app-nav-link">{t('nav.library')}</NavLink>
          <NavLink to="/journal" className="app-nav-link">{t('nav.journal')}</NavLink>
          <NavLink to="/reports" className="app-nav-link">{t('nav.reports')}</NavLink>
          <NavLink to="/connect" className="app-nav-link">{t('nav.connect')}</NavLink>
          {currentUser?.role === 'admin' && (
            <NavLink to="/admin" className="app-nav-link">{t('nav.admin')}</NavLink>
          )}
        </nav>
        <div className="app-user">
          <LanguageMenu />
          <NavLink
            to="/settings"
            className="app-user-name"
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
          >
            {currentUser?.displayName}
          </NavLink>
          <button type="button" className="app-logout" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
