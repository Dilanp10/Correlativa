/**
 * Bus minimal de "actividad de usuario": notifica que el usuario hizo una
 * acción válida que cuenta para mecánicas transversales (ej: racha).
 *
 * Vive en shared/lib porque varias features lo usan:
 * - Productores: subjects (cambio de estado), agenda (completar evento), futuro estudio.
 * - Consumidor: streaks (recordActivity).
 *
 * Mantiene a las features productoras desacopladas de la feature streaks.
 */

type ActivityListener = () => void

const listeners = new Set<ActivityListener>()

/** Notifica que el usuario hizo una acción válida para racha. */
export function emitActivity(): void {
  listeners.forEach(cb => cb())
}

/** Suscribe un listener. Devuelve la función para desuscribirse. */
export function onActivity(cb: ActivityListener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
