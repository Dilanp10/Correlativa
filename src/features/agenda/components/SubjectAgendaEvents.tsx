import { useAgendaStore } from '@/features/agenda/store/agendaStore'
import { AGENDA_TYPE_META, relativeLabel, urgencyColor } from '@/features/agenda/lib/agenda'

interface Props {
  subjectId: string
}

/** Sección "Próximos eventos" para el detalle de una materia en el árbol. */
export default function SubjectAgendaEvents({ subjectId }: Props) {
  const events = useAgendaStore(s => s.events)

  const upcoming = events
    .filter(e => e.subject_id === subjectId && !e.completed)
    .sort((a, b) => a.due_at.localeCompare(b.due_at))

  if (upcoming.length === 0) return null

  return (
    <div>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
        Próximos eventos
      </p>
      <div className="space-y-2">
        {upcoming.map(event => (
          <div
            key={event.id}
            className="flex items-center gap-2.5 rounded-xl bg-bg-elevated border border-muted/40 px-3 py-2"
          >
            <span className="text-sm">{AGENDA_TYPE_META[event.type].icon}</span>
            <span className="text-sm text-text-primary truncate flex-1">{event.title}</span>
            <span className={`text-xs font-medium shrink-0 ${urgencyColor(event)}`}>
              {relativeLabel(event.due_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
