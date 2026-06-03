# Gamification-Database-Spec.md — Correlativa
## Paso 3 (SDD) — Esquema de Base de Datos: Gamificación

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Gamification-Architecture.md` (aprobado).

---

## 1. Resumen

**No hay cambios de base de datos en esta iteración.**

El XP y el nivel se **derivan del estado existente** (decisión D1 del Architecture). Todos los datos necesarios ya están en tablas que la app carga hoy.

---

## 2. Datos que consume la gamificación (read-only)

| Dato | Tabla existente | Cómo aporta |
|---|---|---|
| Estado de cada materia del usuario | `user_subjects.status` | `promocionada` +130 · `aprobada` +100 · `cursando` +20 |
| Eventos de agenda completados | `agenda_events.completed` | cada evento con `completed = true` → +15 |

Ambas tablas ya tienen sus **RLS** (`*_select_own`) que garantizan que cada usuario solo lee lo suyo. La gamificación no agrega superficie de seguridad nueva.

---

## 3. Por qué no se persiste el XP

- **Idempotencia y reversibilidad:** derivar evita duplicados y maneja "deshacer" gratis (PRD §4.2).
- **Menos superficie:** sin tabla nueva, sin migración, sin RLS adicional, sin riesgo de desincronización entre un contador y el estado real.
- **Costo nulo:** el cálculo es O(materias + eventos), trivial en cliente.

---

## 4. Migraciones

Ninguna. No se ejecuta SQL para esta feature.

---

## 5. Consideración futura (fuera de scope)

Si en una tanda posterior se quiere **historial de XP** (ledger), animaciones de "+100 XP" atadas a un evento puntual, o **logros/rachas** que sí requieren registrar actividad por fecha, ahí se evaluará agregar tablas (ej: `user_achievements`, `activity_log`). No es parte de esta iteración.
