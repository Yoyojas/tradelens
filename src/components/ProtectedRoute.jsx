import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'

// Gate for authenticated routes. Waits for the session to be restored, then
// either renders the nested routes or bounces to /login (remembering where the
// user was headed so login can send them back). A logged-in but unverified
// account is sent to the /verify OTP step — the app is unreachable until the
// email is confirmed.
export default function ProtectedRoute() {
  const { currentUser, ready, emailVerified } = useAuth()
  const { t } = useLang()
  const location = useLocation()

  if (!ready) {
    return <div className="auth-loading">{t('common.loading')}</div>
  }
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!emailVerified) {
    return <Navigate to="/verify" replace />
  }
  return <Outlet />
}
