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
