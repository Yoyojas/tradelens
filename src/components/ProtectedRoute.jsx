import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { resolveGate } from '../utils/gate.js'

// Gate for authenticated routes. The decision itself is the pure resolveGate
// (utils/gate.js) — this component only renders the corresponding redirect.
// Order: session restore -> /login -> /verify (unchanged semantics) ->
// /onboarding (TL-FEAT-008) -> the app.
export default function ProtectedRoute() {
  const { currentUser, ready } = useAuth()
  const { t } = useLang()
  const location = useLocation()

  const gate = resolveGate(currentUser, ready)
  if (gate === 'loading') {
    return <div className="auth-loading">{t('common.loading')}</div>
  }
  if (gate === 'login') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (gate === 'verify') {
    return <Navigate to="/verify" replace />
  }
  if (gate === 'onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}
