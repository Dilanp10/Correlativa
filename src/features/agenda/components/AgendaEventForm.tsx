import { useState } from 'react'
import Button from '@/shared/components/Button'
import type { AgendaEvent } from '@/shared/types'
import type { AgendaEventInput } from '@/features/agenda/hooks/useAgenda'
import { AGENDA_TYPES, AGENDA_TYPE_META } from '@/features/agenda/lib/agenda'

interface SubjectOption {
  id: string
  name: string
  /** Si true, no se puede elegir para un evento nuevo (materia ya aprobada/promocionada). */
  approved: boolean
}

interface Props {
  editing: AgendaEvent | null
  subjects: SubjectOption[]
  onSubmit: (input: AgendaEventInput) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toInputs(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

const today = toInputs(new Date().toISOString()).date

export default function AgendaEventForm({ editing, subjects, onSubmit, onDelete, onClose }: Props) {
  const initial = editing ? toInputs(editing.due_at) : { date: today, time: '12:00' }

  const [type, setType] = useState(editing?.type ?? 'examen')
  const [title, setTitle] = useState(editing?.title ?? '')
  const [subjectId, setSubjectId] = useState(editing?.subject_id ?? '')
  const [allDay, setAllDay] = useState(editing?.all_day ?? true)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [subjectError, setSubjectError] = useState<string | null>(null)

  // Guard defensivo: aunque <option disabled> debería bloquear, en algunos
  // navegadores/contextos la selección igual se dispara. Rechazamos manualmente
  // y mostramos un mensaje claro.
  function handleSubjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    const chosen = subjects.find(s => s.id === id)
    if (chosen?.approved) {
      setSubjectError(`${chosen.name} ya está aprobada — no podés crear eventos para ella.`)
      return
    }
    setSubjectError(null)
    setSubjectId(id)
  }

  // Bloquea el submit si quedó seleccionada una aprobada (por las dudas).
  const selectedIsApproved = subjects.find(s => s.id === subjectId)?.approved ?? false
  const canSubmit = title.trim().length > 0 && date.length > 0 && !selectedIsApproved

  function handleSubmit() {
    if (!canSubmit) return
    const timePart = allDay ? '12:00' : time
    const due_at = new Date(`${date}T${timePart}`).toISOString()
    onSubmit({
      type,
      title: title.trim(),
      subject_id: subjectId || null,
      due_at,
      all_day: allDay,
      notes: notes.trim() || null,
    })
  }

  const fieldClass =
    'w-full bg-bg-elevated border border-muted rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="px-5 py-4 space-y-4 pb-8">
      <h3 className="text-lg font-bold text-text-primary">
        {editing ? 'Editar evento' : 'Nuevo evento'}
      </h3>

      {/* Tipo */}
      <div className="flex gap-2">
        {AGENDA_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 px-2 py-2 rounded-xl text-sm font-medium transition-all border ${
              type === t
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-elevated text-text-secondary border-muted/50 hover:text-text-primary'
            }`}
          >
            {AGENDA_TYPE_META[t].icon} {AGENDA_TYPE_META[t].label}
          </button>
        ))}
      </div>

      {/* Título */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Título</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ej: Final de Análisis Matemático"
          className={fieldClass}
        />
      </div>

      {/* Materia (opcional) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Materia (opcional)
        </label>

        <select value={subjectId} onChange={handleSubjectChange} className={fieldClass}>
          <option value="">Sin materia</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id} disabled={s.approved}>
              {s.name}
              {s.approved ? ' — (ya aprobada)' : ''}
            </option>
          ))}
        </select>
        {subjectError && <p className="text-xs text-red-400">{subjectError}</p>}
      </div>

      {/* Fecha + hora */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Fecha</label>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={e => setAllDay(e.target.checked)}
              className="accent-accent"
            />
            Todo el día
          </label>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={`${fieldClass} flex-1`}
          />
          {!allDay && (
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className={`${fieldClass} w-32`}
            />
          )}
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Detalles, temas a estudiar…"
          className={`${fieldClass} resize-none`}
        />
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
          {editing ? 'Guardar cambios' : 'Crear evento'}
        </Button>
        {editing && (
          <button
            onClick={() => {
              onDelete(editing.id)
              onClose()
            }}
            className="px-4 py-3 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
