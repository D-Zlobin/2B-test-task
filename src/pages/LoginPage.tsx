import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoadingScreen } from '../components/LoadingScreen'

export function LoginPage() {
  const { session, isLoading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) return <LoadingScreen />

  const requestedPath = (location.state as { from?: string } | null)?.from
  const destination = requestedPath?.startsWith('/') ? requestedPath : '/objects'

  if (session) return <Navigate to={destination} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const signInError = await signIn(email.trim(), password)
    if (signInError) {
      setError(signInError)
      setIsSubmitting(false)
      return
    }

    navigate(destination, { replace: true })
  }

  return (
    <main className="centered-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Рабочее пространство</p>
        <h1 id="login-title">Объекты и задачи</h1>
        <p className="muted">Войдите с помощью аккаунта, созданного администратором.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Вход…' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  )
}
