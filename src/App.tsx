import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { AppLayout } from './components/AppLayout'
import { LoadingScreen } from './components/LoadingScreen'
import { ProtectedRoute } from './components/ProtectedRoute'
import { isSupabaseConfigured } from './lib/supabase'
import { LoginPage } from './pages/LoginPage'

const MyTasksPage = lazy(async () => ({ default: (await import('./pages/MyTasksPage')).MyTasksPage }))
const NotFoundPage = lazy(async () => ({ default: (await import('./pages/NotFoundPage')).NotFoundPage }))
const ObjectPage = lazy(async () => ({ default: (await import('./pages/ObjectPage')).ObjectPage }))
const ObjectsPage = lazy(async () => ({ default: (await import('./pages/ObjectsPage')).ObjectsPage }))
const TaskPage = lazy(async () => ({ default: (await import('./pages/TaskPage')).TaskPage }))

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <main className="centered-page">
        <section className="auth-card">
          <h1>Требуется настройка Supabase</h1>
          <p className="muted">
            Создайте <code>.env</code> по образцу <code>.env.example</code> и укажите
            <code> VITE_SUPABASE_URL</code> и <code> VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </section>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/objects" replace />} />
                <Route path="/objects" element={<ObjectsPage />} />
                <Route path="/objects/:objectId" element={<ObjectPage />} />
                <Route path="/tasks/:taskId" element={<TaskPage />} />
                <Route path="/my-tasks" element={<MyTasksPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
