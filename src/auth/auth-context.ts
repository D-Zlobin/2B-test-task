import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../types/database'

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  profileError: string | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
