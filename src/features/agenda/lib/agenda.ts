import type { AgendaEvent, AgendaEventType } from '@/shared/types'

// Metadatos por tipo de evento (label + ícono para la UI)
export const AGENDA_TYPE_META: Record<AgendaEventType, { label: string; icon: string }> = {
  examen: { label: 'Examen', icon: '📝' },
  entrega: { label: 'Entrega', icon: '📤' },
  recordatorio: { label: 'Recordatorio', icon: '🔔' },
}

export const AGENDA_TYPES: AgendaEventType[] = ['examen', 'entrega', 'recordatorio']

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Días calendario entre hoy y la fecha del evento. 0 = hoy, 1 = mañana, -1 = ayer. */
export function daysUntil(iso: string): number {
  const today = startOfDay(new Date()).getTime()
  const due = startOfDay(new Date(iso)).getTime()
  return Math.round((due - today) / 86_400_000)
}

export type AgendaGroup = 'vencido' | 'hoy' | 'manana' | 'semana' | 'despues'

export function groupOf(event: AgendaEvent): AgendaGroup {
  const d = daysUntil(event.due_at)
  if (d < 0) return 'vencido'
  if (d === 0) return 'hoy'
  if (d === 1) return 'manana'
  if (d <= 7) return 'semana'
  return 'despues'
}

export const GROUP_LABELS: Record<AgendaGroup, string> = {
  vencido: 'Vencidos',
  hoy: 'Hoy',
  manana: 'Mañana',
  semana: 'Esta semana',
  despues: 'Más adelante',
}

export const GROUP_ORDER: AgendaGroup[] = ['vencido', 'hoy', 'manana', 'semana', 'despues']

/** Etiqueta relativa para la cuenta regresiva. */
export function relativeLabel(iso: string): string {
  const d = daysUntil(iso)
  if (d < -1) return `Hace ${-d} días`
  if (d === -1) return 'Venció ayer'
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Mañana'
  return `En ${d} días`
}

/** Fecha legible en español argentino, con hora si no es "todo el día". */
export function formatDueDate(iso: string, allDay: boolean): string {
  const date = new Date(iso)
  const datePart = date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  if (allDay) return datePart
  const timePart = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} · ${timePart}`
}

/** Clase Tailwind de color según urgencia. */
export function urgencyColor(event: AgendaEvent): string {
  if (event.completed) return 'text-text-secondary'
  const d = daysUntil(event.due_at)
  if (d <= 2) return 'text-red-400'
  if (d <= 7) return 'text-warning'
  return 'text-text-secondary'
}

/** ¿Mostrar badge de "urgente"? (vencido o ≤2 días, sin completar) */
export function isUrgent(event: AgendaEvent): boolean {
  return !event.completed && daysUntil(event.due_at) <= 2
}

// ── Horario semanal ─────────────────────────────────────────────────────────

export const WEEKDAYS: { value: number; short: string; full: string }[] = [
  { value: 1, short: 'Lun', full: 'Lunes' },
  { value: 2, short: 'Mar', full: 'Martes' },
  { value: 3, short: 'Mié', full: 'Miércoles' },
  { value: 4, short: 'Jue', full: 'Jueves' },
  { value: 5, short: 'Vie', full: 'Viernes' },
  { value: 6, short: 'Sáb', full: 'Sábado' },
  { value: 7, short: 'Dom', full: 'Domingo' },
]

/** Recorta 'HH:MM:SS' (o 'HH:MM') a 'HH:MM'. */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

/** Minutos desde medianoche para un 'HH:MM'. */
export function timeToMinutes(time: string): number {
  const [h, m] = formatTime(time).split(':').map(Number)
  return h * 60 + m
}

/** 'HH:MM' a partir de minutos desde medianoche. */
export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(min, 23 * 60 + 59))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/** ¿Se solapan dos rangos horarios 'HH:MM'? (comparten algún minuto) */
export function timeRangesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && s2 < e1
}

/** Opciones de hora cada 30 min entre 07:00 y 22:30 (más extras puntuales). */
export function timeStepOptions(...extras: string[]): string[] {
  const set = new Set<string>()
  for (let m = 7 * 60; m <= 22 * 60 + 30; m += 30) set.add(minutesToTime(m))
  extras.forEach(e => e && set.add(formatTime(e)))
  return [...set].sort()
}
