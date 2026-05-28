import { useState } from 'react'
import BottomNav from '@/shared/components/BottomNav'
import BottomSheet from '@/shared/components/BottomSheet'
import { useAgenda } from '@/features/agenda/hooks/useAgenda'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import AgendaEventCard from '@/features/agenda/components/AgendaEventCard'
import AgendaEventForm from '@/features/agenda/components/AgendaEventForm'
import { GROUP_ORDER, GROUP_LABELS, groupOf, AGENDA_TYPES, AGENDA_TYPE_META } from '@/features/agenda/lib/agenda'
import type { AgendaEvent, AgendaEventType } from '@/shared/types'

type Filter = 'all' | AgendaEventType

export default function AgendaPage() {
  const { events, isLoading, loaded, createEvent, updateEvent, toggleComplete, deleteEvent } = useAgenda()
  const { subjects } = useSubjects()

  const [filter, setFilter] = useState<Filter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<AgendaEvent | null>(null)

  const subjectName = (id: string | null) =>
    id ? subjects.find(s => s.id === id)?.name ?? null : null
  const subjectOptions = subjects.map(s => ({ id: s.id, name: s.name }))

  const filtered = events.filter(e => filter === 'all' || e.type === filter)
  const active = filtered.filter(e => !e.completed)
  const completed = filtered.filter(e => e.completed)

  function openNew() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(event: AgendaEvent) {
    setEditing(event)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditing(null)
  }

  const showLoading = isLoading && !loaded
  const showEmpty = loaded && events.length === 0

  return (
    <div className="min-h-screen bg-bg-base flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-text-primary">Agenda</h1>
        <p className="text-sm text-text-secondary mt-0.5">Lo que se te viene, ordenado.</p>
      </div>

      {/* Filtros */}
      <div className="px-5 pb-3 flex gap-2 overflow-x-auto">
        <FilterChip label="Todos" active={filter === 'all'} onClick={() => setFilter('all')} />
        {AGENDA_TYPES.map(t => (
          <FilterChip
            key={t}
            label={`${AGENDA_TYPE_META[t].icon} ${AGENDA_TYPE_META[t].label}`}
            active={filter === t}
            onClick={() => setFilter(t)}
          />
        ))}
      </div>

      {/* Contenido */}
      <div className="px-5 flex-1">
        {showLoading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        )}

        {showEmpty && (
          <div className="flex flex-col items-center justify-center text-center gap-3 pt-20 px-6">
            <p className="text-5xl">🗓️</p>
            <p className="text-text-primary font-semibold">Tu agenda está vacía</p>
            <p className="text-text-secondary text-sm">
              Agregá tu primer examen, entrega o recordatorio con el botón +.
            </p>
          </div>
        )}

        {!showLoading && !showEmpty && (
          <div className="space-y-6">
            {GROUP_ORDER.map(group => {
              const groupEvents = active.filter(e => groupOf(e) === group)
              if (groupEvents.length === 0) return null
              return (
                <section key={group}>
                  <h2
                    className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${
                      group === 'vencido' ? 'text-red-400' : 'text-text-secondary'
                    }`}
                  >
                    {GROUP_LABELS[group]}
                  </h2>
                  <div className="space-y-2">
                    {groupEvents.map(event => (
                      <AgendaEventCard
                        key={event.id}
                        event={event}
                        subjectName={subjectName(event.subject_id)}
                        onToggle={toggleComplete}
                        onClick={openEdit}
                      />
                    ))}
                  </div>
                </section>
              )
            })}

            {completed.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-2.5 text-text-secondary">
                  Completados
                </h2>
                <div className="space-y-2">
                  {completed.map(event => (
                    <AgendaEventCard
                      key={event.id}
                      event={event}
                      subjectName={subjectName(event.subject_id)}
                      onToggle={toggleComplete}
                      onClick={openEdit}
                    />
                  ))}
                </div>
              </section>
            )}

            {active.length === 0 && completed.length === 0 && (
              <p className="text-center text-text-secondary text-sm pt-12">
                No hay eventos de este tipo.
              </p>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openNew}
        aria-label="Nuevo evento"
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-accent text-white text-3xl flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform"
      >
        +
      </button>

      {/* Sheet crear/editar */}
      <BottomSheet isOpen={sheetOpen} onClose={closeSheet}>
        <AgendaEventForm
          key={editing?.id ?? 'new'}
          editing={editing}
          subjects={subjectOptions}
          onSubmit={input => {
            if (editing) updateEvent(editing.id, input)
            else createEvent(input)
            closeSheet()
          }}
          onDelete={deleteEvent}
          onClose={closeSheet}
        />
      </BottomSheet>

      <BottomNav />
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border ${
        active
          ? 'bg-accent text-white border-accent'
          : 'bg-bg-surface text-text-secondary border-muted/50 hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  )
}
