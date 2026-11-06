import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { displayName } from '../lib/tasks'

export function AppLayout() {
  const { session, profile, signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setError(null)
    const signOutError = await signOut()
    if (signOutError) setError(signOutError)
    setIsSigningOut(false)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/objects" className="brand">Объекты и задачи</NavLink>
        <nav className="main-nav" aria-label="Основная навигация">
          <NavLink to="/objects" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Объекты
          </NavLink>
          {profile?.role === 'executor' && (
            <NavLink to="/my-tasks" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Мои задачи
            </NavLink>
          )}
        </nav>
        <div className="session-controls">
          <span className="user-email" title={session?.user.email}>
            {displayName(profile)}
            <small>{profile?.role === 'manager' ? 'Постановщик' : 'Исполнитель'}</small>
          </span>
          <button type="button" className="button secondary" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Выход…' : 'Выйти'}
          </button>
        </div>
      </header>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
