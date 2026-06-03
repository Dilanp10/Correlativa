# Agenda-Spec.md — Correlativa
## Feature: Agenda Inteligente (Fase 2 — Iteración 1)

---

## 1. Objetivo

Darle al estudiante un lugar único donde ve **lo que se le viene** (exámenes, entregas, recordatorios) y **cuándo cursa** cada materia, todo conectado con el árbol de correlativas que ya existe.

No es un calendario genérico: la agenda **prioriza por urgencia** y **vincula cada evento a una materia**, de modo que el progreso académico y la planificación viven en el mismo lugar.

### No-objetivos (quedan fuera de esta iteración)
- Notificaciones push / por email.
- Sincronización con Google Calendar.
- Repetición compleja de eventos (más allá del horario semanal fijo).
- IA generativa que arme el plan de estudio solo.

---

## 2. Alcance

| Incluye | Detalle |
|---|---|
| Exámenes | Finales y parciales, con materia asociada y cuenta regresiva. |
| Entregas / TPs | Trabajos prácticos y deadlines, con materia asociada. |
| Recordatorios | Notas sueltas de estudio (ej: "repasar unidad 3"). |
| Horario de cursada | Qué días y horas se cursa cada materia (semanal recurrente). |
| Priorización por urgencia | Orden y color según días restantes. |
| Vínculo con materias | Cada evento opcionalmente apunta a una materia; se ve también en el detalle de esa materia en el árbol. |
| Marcar como hecho | Eventos completados se archivan visualmente. |

---

## 3. Modelo de datos

Dos tablas nuevas. Reusan el patrón de `user_subjects` (RLS por dueño, FK a `auth.users`).

### 3.1 `agenda_events` — eventos puntuales con fecha

```sql
CREATE TYPE agenda_event_type AS ENUM ('examen', 'entrega', 'recordatorio');

CREATE TABLE agenda_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid REFERENCES subjects(id) ON DELETE SET NULL,  -- opcional: evento sin materia es válido
  type        agenda_event_type NOT NULL,
  title       text NOT NULL,
  notes       text,
  due_at      timestamptz NOT NULL,           -- fecha (y hora opcional) del evento
  all_day     boolean NOT NULL DEFAULT true,  -- true = solo importa el día, no la hora
  completed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agenda_events_user_due ON agenda_events(user_id, due_at);
```

**Notas de diseño:**
- `subject_id` es opcional y usa `ON DELETE SET NULL`: si se borra/cambia una materia, el evento sobrevive sin vínculo.
- `all_day` permite cargar un recordatorio "para el martes" sin obligar a poner hora; la UI muestra/oculta la hora según este flag.
- `completed` archiva visualmente en lugar de borrar (el usuario puede querer ver su historial).

### 3.2 `class_schedule` — horario semanal recurrente

```sql
CREATE TABLE class_schedule (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,  -- el horario sí depende de la materia
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),         -- 1=lunes ... 7=domingo (ISO)
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_range CHECK (end_time > start_time)
);

CREATE INDEX idx_class_schedule_user ON class_schedule(user_id);
```

### 3.3 Trigger updated_at

```sql
CREATE TRIGGER agenda_events_updated_at
  BEFORE UPDATE ON agenda_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

(`update_updated_at()` ya existe en la base, creado para `users`/`user_subjects`.)

---

## 4. Row Level Security

Mismo criterio que `user_subjects`: cada usuario opera solo sus propias filas.

```sql
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agenda_events_select_own" ON agenda_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "agenda_events_insert_own" ON agenda_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "agenda_events_update_own" ON agenda_events FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "agenda_events_delete_own" ON agenda_events FOR DELETE USING (user_id = auth.uid());

ALTER TABLE class_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_schedule_select_own" ON class_schedule FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "class_schedule_insert_own" ON class_schedule FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "class_schedule_update_own" ON class_schedule FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "class_schedule_delete_own" ON class_schedule FOR DELETE USING (user_id = auth.uid());
```

---

## 5. UX / Pantallas

### 5.1 Navegación
- Nueva ruta `/agenda` (constante `ROUTES.AGENDA`), protegida por `ProtectedRoute` + `CareerRequiredRoute`.
- `BottomNav` pasa de 3 a **4 ítems**: Inicio · Árbol · **Agenda** · Perfil. Ícono: calendario.

### 5.2 AgendaPage — vista principal
Header con título "Agenda" + toggle de dos vistas:

**Vista "Próximos" (default):** timeline tipo lista, agrupado por bloques temporales:
- **Hoy**
- **Mañana**
- **Esta semana**
- **Más adelante**
- **Completados** (colapsado al final)

Cada evento es una card que muestra: ícono por tipo (📝 examen, 📤 entrega, 🔔 recordatorio), título, materia vinculada (con su color), y la **cuenta regresiva** ("en 3 días" / "mañana" / "hoy").

**Priorización por urgencia (la "inteligencia"):**
- ≤ 2 días → acento rojo (`text-red-400`) + badge "urgente".
- ≤ 7 días → acento amarillo (`text-warning`).
- Más lejos → normal.
- Orden ascendente por `due_at` dentro de cada bloque.

**Filtros:** chips arriba (Todos / Exámenes / Entregas / Recordatorios).

**Vista "Horario":** grilla semanal (Lun–Dom) con los bloques de `class_schedule`, cada uno con el color de su materia y el rango horario.

### 5.3 Crear / editar evento
- FAB "+" abajo a la derecha → abre `BottomSheet` (ya existe el componente) con el form:
  - Tipo (examen / entrega / recordatorio) — selector.
  - Título (texto).
  - Materia (dropdown opcional con las materias del usuario).
  - Fecha + hora (toggle "todo el día" controla si se pide hora).
  - Notas (textarea opcional).
- Tap en una card existente → mismo sheet en modo edición, con botón **Eliminar** (con confirmación).
- Marcar como completado: checkbox en la card (optimistic UI, igual que materias).

### 5.4 Integración con el árbol
- En `SubjectDetailSheet` (detalle de materia), nueva sección **"Próximos eventos"**: lista los `agenda_events` no completados de esa materia, ordenados por fecha. Si no hay, no se muestra la sección.

### 5.5 Estados de UI
- **Loading:** skeletons (mismo estilo `bg-muted/30` que el resto).
- **Vacío (sin eventos):** ilustración + texto + CTA "Agregá tu primer examen o entrega".
- **Sugerencia inteligente (extra):** si el usuario tiene materias en estado `cursando` sin ningún examen/entrega cargado, un banner suave sugiere cargarlos.

---

## 6. Arquitectura de código (feature-first)

```
src/features/agenda/
├── components/
│   ├── AgendaEventCard.tsx
│   ├── AgendaEventForm.tsx      (contenido del BottomSheet)
│   ├── AgendaTimeline.tsx       (agrupación por bloques)
│   ├── WeeklySchedule.tsx       (grilla del horario)
│   └── ScheduleForm.tsx         (alta de bloque de cursada)
├── hooks/
│   ├── useAgenda.ts             (carga + CRUD de agenda_events)
│   └── useClassSchedule.ts      (carga + CRUD de class_schedule)
├── store/
│   └── agendaStore.ts           (zustand: events, schedule, loading)
└── types/
    └── index.ts                 (AgendaEvent, ClassSchedule, AgendaEventType)
```

- `pages/AgendaPage.tsx` (lazy, igual que las otras páginas).
- Reglas del proyecto: UI nunca llama a Supabase directo (todo vía hooks); optimistic UI con rollback; sin `any`; mobile-first.

---

## 7. Plan de implementación (orden y "done")

1. **DB:** correr migración SQL en Supabase (vos) + tipos TS. *Done:* tablas + RLS creadas, tipos definidos.
2. **Store + hooks:** `agendaStore`, `useAgenda`, `useClassSchedule` con CRUD optimista. *Done:* se puede leer/crear/editar/borrar desde código.
3. **Ruta + BottomNav:** `ROUTES.AGENDA`, 4º ítem, página vacía con loading. *Done:* navego a /agenda y carga.
4. **Timeline "Próximos":** cards + agrupación + urgencia + filtros. *Done:* veo eventos ordenados y coloreados.
5. **Form crear/editar/borrar evento:** BottomSheet + FAB. *Done:* CRUD completo desde la UI.
6. **Horario semanal:** vista grilla + alta de bloques. *Done:* cargo y veo mi cursada semanal.
7. **Integración árbol:** sección "Próximos eventos" en `SubjectDetailSheet`. *Done:* los eventos de una materia aparecen en su detalle.
8. **Pulido + deploy:** estados vacíos, sugerencia, skeletons; push y verificación.

---

## 8. Decisiones abiertas (a confirmar antes de codear)
- ¿`weekday` arranca en lunes (ISO 1–7)? → propuesto: **sí**.
- ¿Los eventos completados se archivan (no se borran)? → propuesto: **sí, se archivan**.
- ¿El horario semanal entra en esta iteración o lo dejamos para una segunda tanda y arrancamos por el timeline? → a definir según cuánto quieras construir de una.
