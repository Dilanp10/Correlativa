import { useState } from 'react'
import Button from '@/shared/components/Button'
import type { ClassSchedule } from '@/shared/types'
import type { ScheduleInput } from '@/features/agenda/hooks/useClassSchedule'
import {
  WEEKDAYS,
  formatTime,
  timeToMinutes,
  minutesToTime,
  timeRangesOverlap,
  timeStepOptions,
} from '@/features/agenda/lib/agenda'

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
  existingSlots: ClassSchedule[]
  subjectName: (id: string) => string | null
  onSubmit: (inputs: ScheduleInput[]) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const DURATIONS = [
  { label: '1h', mins: 60 },
  { label: '1h30', mins: 90 },
  { label: '2h', mins: 120 },
  { label: '3h', mins: 180 },
  { label: '4h', mins: 240 },
]

export default function ScheduleForm({
  editing,
  subjects,
  existingSlots,
  subjectName,
  onSubmit,
  onDelete,
  onClose,
}: Props) {
  const isEditing = editing !== null

  const [subjectId, setSubjectId] = useState(editing?.subject_id ?? '')
  const [days, setDays] = useState<DaySelection[]>(
    editing
      ? [{ weekday: editing.weekday, start: formatTime(editing.start_time), end: formatTime(editing.end_time) }]
      : []
  )
  // Días en los que el usuario eligió "Otro" (fin manual).
  const [manualDays, setManualDays] = useState<number[]>([])

  function toggleDay(weekday: number) {
    setDays(prev => {
      const existing = prev.find(d => d.weekday === weekday)
      if (isEditing) {
        const carry = prev[0] ?? { start: '08:00', end: '10:00' }
        return [{ weekday, start: carry.start, end: carry.end }]
      }
      if (existing) return prev.filter(d => d.weekday !== weekday)
      return [...prev, { weekday, start: '08:00', end: '10:00' }].sort((a, b) => a.weekday - b.weekday)
    })
  }

  // Cambiar el inicio preserva la duración del bloque.
  function setStart(weekday: number, newStart: string) {
    setDays(prev =>
      prev.map(d => {
        if (d.weekday !== weekday) return d
        const dur = timeToMinutes(d.end) - timeToMinutes(d.start)
        return { ...d, start: newStart, end: minutesToTime(timeToMinutes(newStart) + Math.max(dur, 30)) }
      })
    )
  }

  function setDuration(weekday: number, mins: number) {
    setManualDays(prev => prev.filter(w => w !== weekday))
    setDays(prev =>
      prev.map(d => (d.weekday === weekday ? { ...d, end: minutesToTime(timeToMinutes(d.start) + mins) } : d))
    )
  }

  function setEndManual(weekday: number, value: string) {
    setDays(prev => prev.map(d => (d.weekday === weekday ? { ...d, end: value } : d)))
  }

  // ¿La duración coincide con algún chip predefinido?
  function matchesPreset(day: DaySelection): boolean {
    const dur = timeToMinutes(day.end) - timeToMinutes(day.start)
    return DURATIONS.some(d => d.mins === dur)
  }

  // Mostrar el campo manual si eligió "Otro" o si la duración no es estándar.
  function showManual(day: DaySelection): boolean {
    return manualDays.includes(day.weekday) || !matchesPreset(day)
  }

  // Choque con otro bloque ya existente del mismo día (excluyendo el que se edita).
  function conflictFor(day: DaySelection): string | null {
    const clash = existingSlots.find(
      s =>
        s.id !== editing?.id &&
        s.weekday === day.weekday &&
        timeRangesOverlap(day.start, day.end, formatTime(s.start_time), formatTime(s.end_time))
    )
    if (!clash) return null
    return subjectName(clash.subject_id) ?? 'otra materia'
  }

  const dayLabel = (wd: number) => WEEKDAYS.find(d => d.value === wd)?.full ?? ''
  const startOptions = (current: string) => timeStepOptions(current)

  const anyConflict = days.some(d => conflictFor(d) !== null)
  const allValid = days.length > 0 && days.every(d => d.end > d.start)
  const canSubmit = subjectId.length > 0 && allValid && !anyConflict

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
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Horario</label>
          {days.map(d => {
            const conflict = conflictFor(d)
            return (
              <div
                key={d.weekday}
                className={`rounded-xl border px-3 py-3 ${
                  conflict ? 'border-red-500/50 bg-red-500/5' : 'border-muted/40 bg-bg-elevated'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-text-primary">{dayLabel(d.weekday)}</p>
                  <p className="text-xs text-text-secondary">
                    {d.start} – <span className="text-text-primary font-medium">{d.end}</span>
                  </p>
                </div>

                {/* Inicio */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-text-secondary w-12 shrink-0">Empieza</span>
                  <select
                    value={d.start}
                    onChange={e => setStart(d.weekday, e.target.value)}
                    className="flex-1 bg-bg-surface border border-muted rounded-lg px-2.5 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                  >
                    {startOptions(d.start).map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duración */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-text-secondary w-12 shrink-0">Dura</span>
                  {DURATIONS.map(dur => {
                    const isActive = !showManual(d) && timeToMinutes(d.end) - timeToMinutes(d.start) === dur.mins
                    return (
                      <button
                        key={dur.mins}
                        onClick={() => setDuration(d.weekday, dur.mins)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                          isActive
                            ? 'bg-accent text-white border-accent'
                            : 'bg-bg-surface text-text-secondary border-muted/50 hover:text-text-primary'
                        }`}
                      >
                        {dur.label}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setManualDays(prev => (prev.includes(d.weekday) ? prev : [...prev, d.weekday]))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      showManual(d)
                        ? 'bg-accent text-white border-accent'
                        : 'bg-bg-surface text-text-secondary border-muted/50 hover:text-text-primary'
                    }`}
                  >
                    Otro
                  </button>
                </div>

                {/* Fin manual */}
                {showManual(d) && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-text-secondary w-12 shrink-0">Termina</span>
                    <input
                      type="time"
                      value={d.end}
                      onChange={e => setEndManual(d.weekday, e.target.value)}
                      className="flex-1 bg-bg-surface border border-muted rounded-lg px-2.5 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                {d.end <= d.start && (
                  <p className="text-xs text-red-400 mt-2">
                    La hora de fin debe ser posterior a la de inicio.
                  </p>
                )}

                {conflict && (
                  <p className="text-xs text-red-400 mt-2">
                    Se superpone con {conflict} ese día. Cambiá el horario.
                  </p>
                )}
              </div>
            )
          })}
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
