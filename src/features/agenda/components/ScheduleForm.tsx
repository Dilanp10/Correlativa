import { useState } from 'react'
import Button from '@/shared/components/Button'
import type { ClassSchedule } from '@/shared/types'
import type { ScheduleInput } from '@/features/agenda/hooks/useClassSchedule'
import { WEEKDAYS, formatTime } from '@/features/agenda/lib/agenda'

interface SubjectOption {
  id: string
  name: string
}

interface DaySelection {
  weekday: number
  start: string
  end: string
}

interface Props {
  editing: ClassSchedule | null
  subjects: SubjectOption[]
  onSubmit: (inputs: ScheduleInput[]) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const DEFAULT_TIMES = { start: '08:00', end: '10:00' }

export default function ScheduleForm({ editing, subjects, onSubmit, onDelete, onClose }: Props) {
  const [subjectId, setSubjectId] = useState(editing?.subject_id ?? '')
  const [days, setDays] = useState<DaySelection[]>(
    editing
      ? [{ weekday: editing.weekday, start: formatTime(editing.start_time), end: formatTime(editing.end_time) }]
      : []
  )

  // En edición se opera un único bloque → selección de un solo día.
  // Al crear se pueden marcar varios días, cada uno con su propio horario.
  const isEditing = editing !== null

  function toggleDay(weekday: number) {
    setDays(prev => {
      const existing = prev.find(d => d.weekday === weekday)
      if (isEditing) {
        const carry = prev[0] ?? DEFAULT_TIMES
        return [{ weekday, start: carry.start, end: carry.end }]
      }
      if (existing) return prev.filter(d => d.weekday !== weekday)
      return [...prev, { weekday, ...DEFAULT_TIMES }].sort((a, b) => a.weekday - b.weekday)
    })
  }

  function setTime(weekday: number, field: 'start' | 'end', value: string) {
    setDays(prev => prev.map(d => (d.weekday === weekday ? { ...d, [field]: value } : d)))
  }

  const allValid = days.length > 0 && days.every(d => d.end > d.start)
  const canSubmit = subjectId.length > 0 && allValid

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit(
      days.map(d => ({
        subject_id: subjectId,
        weekday: d.weekday,
        start_time: d.start,
        end_time: d.end,
      }))
    )
  }

  const fieldClass =
    'w-full bg-bg-elevated border border-muted rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors'

  const dayLabel = (wd: number) => WEEKDAYS.find(d => d.value === wd)?.full ?? ''

  return (
    <div className="px-5 py-4 space-y-4 pb-8">
      <h3 className="text-lg font-bold text-text-primary">
        {isEditing ? 'Editar bloque' : 'Agregar a tu horario'}
      </h3>

      {/* Materia */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Materia</label>
        <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className={fieldClass}>
          <option value="">Elegí una materia</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Días */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {isEditing ? 'Día' : 'Días que cursás'}
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {WEEKDAYS.map(day => {
            const selected = days.some(d => d.weekday === day.value)
            return (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  selected
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-elevated text-text-secondary border-muted/50 hover:text-text-primary'
                }`}
              >
                {day.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* Horario por cada día seleccionado */}
      {days.length > 0 && (
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Horario {days.length > 1 ? 'de cada día' : ''}
          </label>
          {days.map(d => (
            <div key={d.weekday} className="rounded-xl bg-bg-elevated border border-muted/40 px-3 py-2.5">
              <p className="text-sm font-medium text-text-primary mb-1.5">{dayLabel(d.weekday)}</p>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={d.start}
                  onChange={e => setTime(d.weekday, 'start', e.target.value)}
                  className="flex-1 bg-bg-surface border border-muted rounded-lg px-2.5 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                />
                <span className="text-text-secondary">–</span>
                <input
                  type="time"
                  value={d.end}
                  onChange={e => setTime(d.weekday, 'end', e.target.value)}
                  className="flex-1 bg-bg-surface border border-muted rounded-lg px-2.5 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              {d.end <= d.start && (
                <p className="text-xs text-red-400 mt-1">La hora de fin debe ser posterior a la de inicio.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
          {isEditing ? 'Guardar cambios' : 'Agregar al horario'}
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
