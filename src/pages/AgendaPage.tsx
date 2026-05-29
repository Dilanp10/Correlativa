import { useState } from 'react'
import BottomNav from '@/shared/components/BottomNav'
import BottomSheet from '@/shared/components/BottomSheet'
import { useAgenda } from '@/features/agenda/hooks/useAgenda'
import { useClassSchedule } from '@/features/agenda/hooks/useClassSchedule'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import AgendaEventCard from '@/features/agenda/components/AgendaEventCard'
import AgendaEventForm from '@/features/agenda/components/AgendaEventForm'
import WeeklySchedule from '@/features/agenda/components/WeeklySchedule'
import ScheduleForm from '@/features/agenda/components/ScheduleForm'
import { GROUP_ORDER, GROUP_LABELS, groupOf, AGENDA_TYPES, AGENDA_TYPE_META } from '@/features/agenda/lib/agenda'
import type { AgendaEvent, AgendaEventType, ClassSchedule } from '@/shared/types'

type Filter = 'all' | AgendaEventType
type View = 'proximos' | 'horario'

export default function AgendaPage() {
  const { events, isLoading, loaded, createEvent, updateEvent, toggleComplete, deleteEvent } = useAgenda()
  const schedule = useClassSchedule()
  const { subjects } = useSubjects()

  const [view, setView] = useState<View>('proximos')
  const [filter, setFilter] = useState<Filter>('all')

  const [eventSheetOpen, setEventSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null)

  const [slotSheetOpen, setSlotSheetOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<ClassSchedule | null>(null)

  const subjectName = (id: string | null) =>
    id ? subjects.find(s => s.id === id)?.name ?? null : null
  const subjectOptions = subjects.map(s => ({ id: s.id, name: s.name }))

  const filtered = events.filter(e => filter === 'all' || e.type === filter)
  const active = filtered.filter(e => !e.completed)
  const completed = filtered.filter(e => e.completed)

  function openNewEvent() {
    setEditingEvent(null)
    setEventSheetOpen(true)
  }
  function openEditEvent(event: AgendaEvent) {
    setEditingEvent(event)
    setEventSheetOpen(true)
  }
  function closeEventSheet() {
    setEventSheetOpen(false)
    setEditingEvent(null)
  }

  function openNewSlot() {
    setEditingSlot(null)
    setSlotSheetOpen(true)
  }
  function openEditSlot(slot: ClassSchedule) {
    setEditingSlot(slot)
    setSlotSheetOpen(true)
  }
  function closeSlotSheet() {
    setSlotSheetOpen(false)
    setEditingSlot(null)
  }

  const showLoading = view === 'proximos' ? isLoading && !loaded : schedule.isLoading && !schedule.loaded
  const showEmptyEvents = loaded && events.length === 0
  const showEmptySchedule = schedule.loaded && schedule.slots.length === 0

  return (
    <div className="min-h-screen bg-bg-base flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-text-primary">Agenda</h1>
        <p className="text-sm text-text-secondary mt-0.5">Lo que se te viene, ordenado.</p>
      </div>

      {/* Toggle de vista */}
      <div className="px-5 pb-3">
        <div className="inline-flex rounded-xl bg-bg-surface border border-muted/40 p-1">
          {(['proximos', 'horario'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === v ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {v === 'proximos' ? 'Próximos' : 'Horario'}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros (solo en Próximos) */}
      {view === 'proximos' && (
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
      )}

      {/* Contenido */}
      <div className="px-5 flex-1">
        {showLoading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Vista Próximos ── */}
        {view === 'proximos' && !showLoading && (
          <>
            {showEmptyEvents ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 pt-20 px-6">
                <p className="text-5xl">🗓️</p>
                <p className="text-text-primary font-semibold">Tu agenda está vacía</p>
                <p className="text-text-secondary text-sm">
                  Agregá tu primer examen, entrega o recordatorio con el botón +.
                </p>
              </div>
            ) : (
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
                            onClick={openEditEvent}
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
                          onClick={openEditEvent}
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
          </>
        )}

        {/* ── Vista Horario ── */}
        {view === 'horario' && !showLoading && (
          <>
            {showEmptySchedule ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 pt-20 px-6">
                <p className="text-5xl">📅</p>
                <p className="text-text-primary font-semibold">Sin horario cargado</p>
                <p className="text-text-secondary text-sm">
                  Agregá los días y horas en que cursás cada materia con el botón +.
                </p>
              </div>
            ) : (
              <WeeklySchedule
                slots={schedule.slots}
                subjectName={id => subjectName(id)}
                onSlotClick={openEditSlot}
              />
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={view === 'proximos' ? openNewEvent : openNewSlot}
        aria-label={view === 'proximos' ? 'Nuevo evento' : 'Nuevo bloque'}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-accent text-white text-3xl flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform"
      >
        +
      </button>

      {/* Sheet evento */}
      <BottomSheet isOpen={eventSheetOpen} onClose={closeEventSheet}>
        <AgendaEventForm
          key={editingEvent?.id ?? 'new'}
          editing={editingEvent}
          subjects={subjectOptions}
          onSubmit={input => {
            if (editingEvent) updateEvent(editingEvent.id, input)
            else createEvent(input)
            closeEventSheet()
          }}
          onDelete={deleteEvent}
          onClose={closeEventSheet}
        />
      </BottomSheet>

      {/* Sheet bloque de horario */}
      <BottomSheet isOpen={slotSheetOpen} onClose={closeSlotSheet}>
        <ScheduleForm
          key={editingSlot?.id ?? 'new-slot'}
          editing={editingSlot}
          subjects={subjectOptions}
          onSubmit={inputs => {
            if (editingSlot) schedule.updateSlot(editingSlot.id, inputs[0])
            else inputs.forEach(input => schedule.createSlot(input))
            closeSlotSheet()
          }}
          onDelete={schedule.deleteSlot}
          onClose={closeSlotSheet}
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
