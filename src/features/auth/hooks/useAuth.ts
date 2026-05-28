import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signOut, signUp } from '@/shared/lib/supabase/auth'
import { parseSupabaseError } from '@/shared/lib/supabase/errors'
import { useAuthStore } from '@/features/auth/store/authStore'
import { ROUTES } from '@/shared/constants'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const resetAuth = useAuthStore(s => s.reset)

  async function handleSignUp(email: string, password: string, displayName: string) {
    setIsLoading(true)
    setError(null)
    const { error: err } = await signUp(email, password, displayName)
    setIsLoading(false)
    if (err) {
      setError(parseSupabaseError(err).message)
      return false
    }
    navigate(ROUTES.ONBOARDING)
    return true
  }

  async function handleSignIn(email: string, password: string) {
    setIsLoading(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    setIsLoading(false)
    if (err) {
      setError(parseSupabaseError(err).message)
      return false
    }
    navigate(ROUTES.DASHBOARD)
    return true
  }

  async function handleSignOut() {
    await signOut()
    resetAuth()
    navigate(ROUTES.LOGIN)
  }

  return { handleSignUp, handleSignIn, handleSignOut, isLoading, error, setError }
}
