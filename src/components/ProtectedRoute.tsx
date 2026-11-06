import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoadingScreen } from './LoadingScreen'

export function ProtectedRoute() {
  const { session, profile, profileError, isLoading, signOut } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (!profile) {
    return (
      <main className="centered-page">
        <section className="auth-card">
          <h1>Профиль недоступен</h1>
          <p className="muted">
            {profileError || 'Профиль пользователя не найден. Обратитесь к администратору.'}
          </p>
          <button type="button" className="button secondary" onClick={() => void signOut()}>
            Выйти
          </button>
        </section>
      </main>
    )
  }

  return <Outlet />
}
