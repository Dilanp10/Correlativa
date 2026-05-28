import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import { ROUTES } from '@/shared/constants'

interface Props {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) return null

  if (!user) return <Navigate to={ROUTES.LOGIN} replace />

  return <>{children}</>
}
