import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getErrorMessage } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setIsSessionLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setProfileError(null)
        setProfileLoadedFor(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id

  useEffect(() => {
    let isMounted = true

    if (!userId) {
      return () => {
        isMounted = false
      }
    }

    void supabase
      .from('profiles')
      .select('id, role, display_name')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (!isMounted) return
        setProfile(error ? null : (data as Profile))
        setProfileError(error ? getErrorMessage(error) : null)
        setProfileLoadedFor(userId)
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  const isLoading = isSessionLoading || Boolean(session && profileLoadedFor !== session.user.id)

  const value = useMemo(
    () => ({
      session,
      profile,
      profileError,
      isLoading,
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error ? 'Не удалось войти. Проверьте email и пароль.' : null
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        return error ? 'Не удалось выйти из аккаунта. Попробуйте ещё раз.' : null
      },
    }),
    [isLoading, profile, profileError, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
