import { useState } from 'react'
import Button from '@/shared/components/Button'
import type { ClassSchedule } from '@/shared/types'
import type { ScheduleInput } from '@/features/agenda/hooks/useClassSchedule'
import { WEEKDAYS, formatTime } from '@/features/agenda/lib/agenda'

interface SubjectOption {
  id: string
  name: string
}

interface Props {
  editing: ClassSchedule | null
  subjects: SubjectOption[]
  onSubmit: (input: ScheduleInput) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function ScheduleForm({ editing, subjects, onSubmit, onDelete, onClose }: Props) {
  const [subjectId, setSubjectId] = useState(editing?.subject_id ?? '')
  const [weekday, setWeekday] = useState(editing?.weekday ?? 1)
  const [start, setStart] = useState(editing ? formatTime(editing.start_time) : '08:00')
  const [end, setEnd] = useState(editing ? formatTime(editing.end_time) : '10:00')

  const canSubmit = subjectId.length > 0 && start.length > 0 && end.length > 0 && end > start

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({ subject_id: subjectId, weekday, start_time: start, end_time: end })
  }

  const fieldClass =
    'w-full bg-bg-elevated border border-muted rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="px-5 py-4 space-y-4 pb-8">
      <h3 className="text-lg font-bold text-text-primary">
        {editing ? 'Editar bloque' : 'Nuevo bloque de cursada'}
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

      {/* Día */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Día</label>
        <div className="flex gap-1.5 flex-wrap">
          {WEEKDAYS.map(day => (
            <button
              key={day.value}
              onClick={() => setWeekday(day.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                weekday === day.value
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-elevated text-text-secondary border-muted/50 hover:text-text-primary'
              }`}
            >
              {day.short}
            </button>
          ))}
        </div>
      </div>

      {/* Horario */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Horario</label>
        <div className="flex items-center gap-2">
          <input type="time" value={start} onChange={e => setStart(e.target.value)} className={`${fieldClass} flex-1`} />
          <span className="text-text-secondary">–</span>
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} className={`${fieldClass} flex-1`} />
        </div>
        {end <= start && end.length > 0 && (
          <p className="text-xs text-red-400">La hora de fin debe ser posterior a la de inicio.</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
          {editing ? 'Guardar cambios' : 'Agregar al horario'}
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
