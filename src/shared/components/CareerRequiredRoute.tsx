import { Navigate } from 'react-router-dom'
import { useCareerStore } from '@/features/career/store/careerStore'
import { ROUTES } from '@/shared/constants'

interface Props {
  children: React.ReactNode
}

export default function CareerRequiredRoute({ children }: Props) {
  const activeCareer = useCareerStore(s => s.activeCareer)
  const isLoading = useCareerStore(s => s.isLoading)

  if (isLoading) return null

  if (!activeCareer) return <Navigate to={ROUTES.ONBOARDING} replace />

  return <>{children}</>
}
