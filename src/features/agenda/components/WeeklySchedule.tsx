import type { ClassSchedule } from '@/shared/types'
import { WEEKDAYS, formatTime } from '@/features/agenda/lib/agenda'

interface Props {
  slots: ClassSchedule[]
  subjectName: (id: string) => string | null
  onSlotClick: (slot: ClassSchedule) => void
}

export default function WeeklySchedule({ slots, subjectName, onSlotClick }: Props) {
  return (
    <div className="space-y-5">
      {WEEKDAYS.map(day => {
        const daySlots = slots.filter(s => s.weekday === day.value)
        if (daySlots.length === 0) return null
        return (
          <section key={day.value}>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2.5 text-text-secondary">
              {day.full}
            </h2>
            <div className="space-y-2">
              {daySlots.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => onSlotClick(slot)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-muted/30 bg-bg-surface px-4 py-3 text-left hover:bg-bg-elevated transition-colors"
                >
                  <div className="w-1 h-9 rounded-full bg-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {subjectName(slot.subject_id) ?? 'Materia'}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
