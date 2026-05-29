# Agenda — No crear eventos para materias aprobadas
## Mini-spec (refinamiento de la feature Agenda)

> Estado: **borrador, pendiente de aprobación.** No se codea hasta que esté aprobada.

---

## 1. Objetivo
Evitar el caso ilógico de cargar **cualquier tipo de evento** (examen, entrega o recordatorio) vinculado a una materia que ya está **aprobada** o **promocionada**. No tiene sentido y ensucia la agenda.

## 2. Regla
Al **crear** un evento en la agenda, no se puede elegir como materia asociada una que tenga `user_subjects.status ∈ {aprobada, promocionada}`.

Aplica a los **tres tipos** de evento: `examen`, `entrega`, `recordatorio` (decisión cerrada con vos).

## 3. UX

### 3.1 Dónde se aplica
- Solo en el form de **crear/editar evento** de la Agenda (`AgendaEventForm`).
- En el dropdown "Materia (opcional)", las materias **aprobadas o promocionadas** aparecen **deshabilitadas** y con un sufijo `(ya aprobada)` que comunica por qué no se pueden elegir.
- La opción "Sin materia" sigue funcionando igual.

Ejemplo visual:
```
[ Sin materia                                  ]
[ Análisis Matemático I — (ya aprobada)        ]   ← disabled
[ Física I                                     ]
[ Química General — (ya aprobada)              ]   ← disabled
[ Programación I                               ]
```

### 3.2 Por qué deshabilitadas en vez de ocultas
- **Transparencia:** el usuario ve que la materia existe y entiende por qué no se puede elegir, en vez de buscarla y no encontrarla.
- **Reversibilidad:** si la pasa de vuelta a "Cursando" desde el árbol, vuelve a poder elegirla.

### 3.3 Caso "editar un evento existente"
- Si un evento ya estaba vinculado a una materia y *después* la materia se aprobó, el evento **sigue editable** (no rompemos datos viejos).
- En el dropdown, esa materia aparece seleccionada aunque esté deshabilitada (HTML lo permite). El usuario puede dejarla así o cambiar a otra/Sin materia.

## 4. Edge cases
- **Materias no cursadas / cursando / regular / final pendiente / libre** → siguen elegibles (la regla solo bloquea aprobada y promocionada).
- **Sin sesión de materias cargada** → el dropdown queda igual que hoy (no se aplica filtro porque no hay datos).
- **Sin subject elegido** → "Sin materia" siempre disponible.

## 5. Implementación

### Archivos a tocar
- `src/features/agenda/components/AgendaEventForm.tsx` — recibir info de qué materias están aprobadas y deshabilitar opciones.
- `src/pages/AgendaPage.tsx` — pasar al form la lista de materias con su estado actual (a partir de `subjectsStore.userSubjects`).

### Contrato propuesto del prop
Hoy el form recibe `subjects: { id, name }[]`. Lo extendemos:

```ts
interface SubjectOption {
  id: string
  name: string
  approved: boolean   // true si está aprobada o promocionada
}
```

`AgendaPage` arma esta lista cruzando `subjects` con `userSubjects` y se la pasa al form. El form renderiza `<option disabled={s.approved}>` y agrega el sufijo `— (ya aprobada)` cuando corresponde.

### Decisión deliberada
- No agregamos validación adicional en el `onSubmit`: el `disabled` en el `<option>` ya hace que el navegador no permita seleccionarla, y el caso "ya estaba elegida desde antes" es válido (ver 3.3).
- Cero cambios de base de datos.
- No toca `ScheduleForm` (el horario semanal sí tiene sentido para materias en curso, no para aprobadas — pero eso queda como posible refinamiento futuro, fuera de scope).

## 6. Done cuando
- En "Agenda → +", el dropdown de materias muestra deshabilitadas las aprobadas/promocionadas con el sufijo `(ya aprobada)`.
- El form no permite seleccionarlas para un evento nuevo.
- Editar un evento existente que apunta a una materia ya aprobada funciona sin romperse.
- `tsc` y build pasan limpios.

## 7. Fuera de scope
- Reglas equivalentes en el horario semanal (`ScheduleForm`).
- Migrar/archivar eventos existentes vinculados a materias aprobadas.
- Auto-completar eventos cuando se aprueba una materia.
