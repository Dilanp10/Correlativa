# Streaks-PRD.md — Correlativa
## Paso 1 (SDD) — Documento de Producto: Rachas

> Estado: **borrador, pendiente de aprobación.** No se avanza a Architecture hasta que esté aprobado.

---

## 1. Problema
El estudiante usa la app de forma intermitente: la abre cuando rinde, después se desentiende. Falta un mecanismo simple que **premie la constancia diaria** y le dé un motivo para volver, aunque sea para hacer una sola cosa.

## 2. Usuarios
Mismo de siempre: estudiante universitario argentino, mobile-first. Suma especialmente a los que **no son tan disciplinados** y necesitan un empujón externo para mantener un ritmo.

## 3. Propuesta de valor
Una **racha 🔥** que cuenta los días seguidos que el estudiante hace al menos una acción real en la app. Cuanto más larga, más cuesta perderla → más motivación para no romperla. Mecánica probada (Duolingo, Snapchat) que funciona en lo cotidiano.

> "Llevo 12 días seguidos haciendo algo de la facu" se siente bien y mueve a hacer el día 13.

## 4. Decisiones cerradas (de las preguntas)

### 4.1 Qué cuenta como "actividad"
Una **acción real** del usuario:
- Cambiar el estado de una materia en el árbol (cursando, regular, aprobada, etc.).
- Marcar un evento de agenda como completado.

**Importante (futuro):** cuando exista la feature de "sesión de estudio de X materia" (estilo Duolingo), también va a contar — el diseño tiene que permitir sumar fuentes nuevas sin tocar la lógica de racha. Lo dejo anotado para que Architecture lo contemple.

**No cuenta:** abrir la app sin hacer nada, navegar entre pantallas, ver el árbol.

### 4.2 Gracia
**1 día de gracia por mes calendario** (estilo "congelador"). Si fallás un día, no perdés la racha; pero el congelador queda usado hasta el mes siguiente. Si fallás dos días seguidos (o uno cuando ya usaste el congelador), la racha se reinicia a 0.

### 4.3 Qué se muestra
Solo la **racha actual**: un chip con 🔥 y el número de días. Sin mejor histórico, sin heatmap (para mantener el alcance ajustado en esta primera tanda).

## 5. Features y criterios de aceptación

### F1 — Cálculo de la racha
- **Dado** el último día de actividad y el contador almacenado del usuario, **cuando** se evalúa la racha, **entonces** se devuelve el número correcto aplicando las reglas de §4.
- Si la última acción fue **hoy** → la racha vale (no decrece).
- Si fue **ayer** → la racha sigue intacta hasta el fin del día de hoy (si hoy no hace nada se pierde mañana).
- Si fue **anteayer** y **no se usó el congelador este mes** → todavía está intacta hasta hoy (el congelador la salva si hoy hace una acción).
- Si fue hace más → la racha es **0** a efectos visuales.

### F2 — Incremento por acción
- **Cuando** el usuario hace una acción válida (§4.1) por **primera vez en el día**, **entonces** la racha se actualiza:
  - Si última actividad = hoy → no cambia (ya cuenta).
  - Si última actividad = ayer → racha += 1, congelador intacto.
  - Si última actividad = anteayer y congelador disponible → racha += 1, **se usa el congelador del mes**.
  - En cualquier otro caso → racha = 1 (nueva racha).
- Optimistic UI: el chip se actualiza al instante, persiste en la base.

### F3 — Visualización
- En el **Dashboard**, al lado o cerca de la `LevelCard`, aparece un **chip** con `🔥 {N} días`.
- Si la racha es 0, el chip muestra `🔥 0` con un copy invitador chico debajo (ej. "Marcá una materia y arrancá tu racha").
- Mientras carga, skeleton consistente con el resto.

### F4 — Coherencia técnica
- La acción que dispara la racha **no agrega lentitud perceptible** (optimistic + persistencia en background).
- Si la persistencia falla, se rollbackea en silencio (mismo patrón que el resto, sin toast por ahora — cubierto por hallazgo M3 del QA, fuera de scope).

## 6. Métricas de éxito
- El usuario **entiende** lo que ve (qué es el número, qué significa el 🔥).
- Hacer una acción **siempre** actualiza el chip si corresponde (cero "olvidos").
- Las reglas de gracia funcionan: el usuario que se salteó un día por mes mantiene su racha; el que se saltea dos vuelve a 0.

## 7. Fuera de scope
- **Mejor racha histórica** y **calendario tipo heatmap** (eventual mejora, no ahora).
- **Notificaciones push / email** ("vas a perder tu racha en X horas"). Requiere infra que la app no tiene.
- **Múltiples congeladores** o congeladores comprables/canjeables.
- **Backfill retroactivo** de actividad pasada (las rachas arrancan desde el deploy).

## 8. Notas para los próximos pasos (sin asumir)
Estas son consideraciones técnicas que voy a desarrollar en Architecture / Database-Spec, pero las anoto acá para transparencia:
- Hace falta **persistir** "última fecha de actividad", "racha actual" y "congelador usado este mes". Lo más natural es agregarlos como columnas a la tabla `users` (mismo dueño, mismo RLS). Lo confirmo en el Database-Spec.
- La fecha de "hoy" se calcula en la **zona horaria local** del usuario (no UTC) para que un día sea un día tal como lo vive el estudiante.
