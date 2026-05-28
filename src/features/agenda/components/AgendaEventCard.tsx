import type { AgendaEvent } from '@/shared/types'
import { AGENDA_TYPE_META, relativeLabel, formatDueDate, urgencyColor, isUrgent } from '@/features/agenda/lib/agenda'

interface Props {
  event: AgendaEvent
  subjectName: string | null
  onToggle: (id: string) => void
  onClick: (event: AgendaEvent) => void
}

export default function AgendaEventCard({ event, subjectName, onToggle, onClick }: Props) {
  const meta = AGENDA_TYPE_META[event.type]
  const urgent = isUrgent(event)

  return (
    <div
      onClick={() => onClick(event)}
      className={`flex items-start gap-3 rounded-2xl border bg-bg-surface px-4 py-3.5 cursor-pointer transition-colors hover:bg-bg-elevated ${
        urgent ? 'border-red-500/40' : 'border-muted/30'
      } ${event.completed ? 'opacity-60' : ''}`}
    >
      {/* Checkbox completar */}
      <button
        onClick={e => {
          e.stopPropagation()
          onToggle(event.id)
        }}
        aria-label={event.completed ? 'Marcar como pendiente' : 'Marcar como hecho'}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          event.completed
            ? 'bg-success border-success text-white'
            : 'border-muted hover:border-accent'
        }`}
      >
        {event.completed && <span className="text-[10px] leading-none">✓</span>}
      </button>

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{meta.icon}</span>
          <p
            className={`text-sm font-semibold text-text-primary truncate ${
              event.completed ? 'line-through' : ''
            }`}
          >
            {event.title}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs font-medium ${urgencyColor(event)}`}>
            {event.completed ? 'Completado' : relativeLabel(event.due_at)}
          </span>
          <span className="text-xs text-text-secondary">· {formatDueDate(event.due_at, event.all_day)}</span>
        </div>

        {subjectName && (
          <span className="inline-block mt-2 text-xs text-accent bg-accent/10 rounded-lg px-2 py-0.5 truncate max-w-full">
            {subjectName}
          </span>
        )}
      </div>

      {urgent && !event.completed && (
        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 rounded px-1.5 py-0.5 shrink-0">
          URGENTE
        </span>
      )}
    </div>
  )
}
