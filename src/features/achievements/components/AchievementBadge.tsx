import type { AchievementStatus } from '@/features/achievements/lib/achievements'

interface Props {
  status: AchievementStatus
}

export default function AchievementBadge({ status }: Props) {
  const { achievement, unlocked } = status

  return (
    <div
      className={`rounded-2xl border p-3 flex flex-col items-center text-center gap-1.5 transition-colors ${
        unlocked
          ? 'bg-bg-surface border-accent/40'
          : 'bg-bg-surface/50 border-muted/30'
      }`}
      aria-label={
        unlocked
          ? `Logro conseguido: ${achievement.name}`
          : `Logro bloqueado: ${achievement.hint}`
      }
    >
      <span
        className={`text-3xl leading-none ${unlocked ? '' : 'grayscale opacity-40'}`}
        aria-hidden="true"
      >
        {unlocked ? achievement.icon : '🔒'}
      </span>

      <p
        className={`text-xs font-semibold leading-tight ${
          unlocked ? 'text-text-primary' : 'text-text-secondary'
        }`}
      >
        {achievement.name}
      </p>

      {unlocked ? (
        <p className="text-[10px] text-text-secondary leading-tight">
          {achievement.description}
        </p>
      ) : (
        <p className="text-[10px] text-text-secondary leading-tight">{achievement.hint}</p>
      )}
    </div>
  )
}
