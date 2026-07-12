import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppLayout from './components/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import JournalPage from './pages/JournalPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ConnectPage from './pages/ConnectPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import NotFound from './pages/NotFound.jsx'

export const router = createBrowserRouter([
  // Public (mock auth)
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot', element: <ForgotPasswordPage /> },
  // OTP step: needs a session but must stay reachable while unverified, so it
  // lives outside ProtectedRoute and does its own auth checks.
  { path: '/verify', element: <VerifyEmailPage /> },

  // Protected app shell
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/library" replace /> },
          { path: 'library', element: <LibraryPage /> },
          { path: 'journal', element: <JournalPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'connect', element: <ConnectPage /> },
          { path: 'admin', element: <AdminPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
