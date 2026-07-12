import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AuthForm from '../components/AuthForm.jsx'

export default function RegisterPage() {
  const { currentUser, ready } = useAuth()
  if (ready && currentUser) return <Navigate to="/library" replace />
  return <AuthForm mode="register" />
}
