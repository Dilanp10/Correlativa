import type { AchievementsSummary } from '@/features/achievements/lib/achievements'
import AchievementBadge from '@/features/achievements/components/AchievementBadge'

interface Props {
  summary: AchievementsSummary | null
}

export default function AchievementsGallery({ summary }: Props) {
  // Skeleton mientras carga
  if (!summary) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">
          Logros
        </p>
        <p className="text-xs text-text-secondary">
          {summary.unlockedCount} de {summary.totalCount}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {summary.statuses.map(status => (
          <AchievementBadge key={status.achievement.id} status={status} />
        ))}
      </div>
    </div>
  )
}
