import type { SubjectStatus } from '@/shared/types'
import { STATUS_LABELS } from '@/shared/constants'

const STATUS_COLORS: Record<SubjectStatus, string> = {
  no_cursada: 'bg-muted/50 text-text-secondary',
  cursando: 'bg-accent/20 text-accent',
  regular: 'bg-warning/20 text-warning',
  promocionada: 'bg-success/20 text-success',
  aprobada: 'bg-success/20 text-success',
  final_pendiente: 'bg-orange-500/20 text-orange-400',
  libre: 'bg-red-500/20 text-red-400',
}

interface BadgeProps {
  status: SubjectStatus
  size?: 'sm' | 'md'
}

export default function Badge({ status, size = 'md' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${STATUS_COLORS[status]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
