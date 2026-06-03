# Research: Logros y Medallas

Decisiones técnicas para resolver los puntos abiertos del plan. Formato:
Decisión / Razón / Alternativas consideradas.

## D1 — Logros derivados del estado (sin persistencia)

**Decisión**: Un catálogo fijo de logros, cada uno con una función predicado
`isUnlocked(ctx)` que evalúa el estado actual del usuario. El conjunto de
logros conseguidos se recalcula en memoria; no se guarda nada.

**Razón**: Cumple la restricción de "sin tablas nuevas" y el principio de
estado derivado (idempotente, reversible). Mismo enfoque que XP y racha de
display. Cero costo de base.

**Alternativas consideradas**:
- Tabla `user_achievements(user_id, achievement_id, unlocked_at)`: permitiría
  guardar la fecha de desbloqueo y un historial, pero agrega tabla + RLS +
  migración + lógica de inserción. Rechazada por scope (la spec acepta no
  mostrar fecha). Queda como evolución futura si se quiere historial/fecha.

## D2 — Ubicación de la galería: Perfil

**Decisión**: La galería de logros vive como una sección dentro de
`ProfilePage`, accesible desde el perfil (o un sub-acceso "Mis logros").

**Razón**: El `BottomNav` ya tiene 5 tabs (Inicio, Árbol, Agenda, Estudiar,
Perfil); una 6ª apretaría demasiado en mobile. El perfil es el lugar natural
para "colección personal / trofeos", y ya muestra progreso y datos del
usuario.

**Alternativas consideradas**:
- 6ª tab en BottomNav: rechazada por densidad en pantallas chicas.
- Card en el Dashboard: el Dashboard ya tiene LevelCard + progreso + streak;
  agregar la galería completa lo recargaría. (Se puede sumar un mini-resumen
  "X/Y logros" enlazando al perfil como mejora futura, fuera de scope.)

## D3 — Celebración: reusar el patrón LevelUpWatcher/Overlay

**Decisión**: Un `AchievementWatcher` montado en `App.tsx` que compara el
conjunto de logros desbloqueados con un baseline en sesión; cuando aparecen
logros nuevos, los encola (FIFO) y muestra un `AchievementUnlockOverlay`
festivo, uno por uno. Re-baseline al cambiar de carrera.

**Razón**: Es exactamente el problema que ya resolvimos con subidas de nivel.
Reusar el patrón garantiza: baseline silencioso al cargar (no recelebra
logros viejos — FR-008), cola para múltiples desbloqueos simultáneos
(FR-009), y robustez ante cambios de carrera.

**Alternativas consideradas**:
- Celebrar desde cada acción (subjects/agenda/study): obligaría a acoplar esas
  features a logros. Rechazada — el watcher centralizado a nivel App es más
  limpio y ya probado.

## D4 — Fuentes de datos del evaluador

**Decisión**: `useAchievements` arma un contexto de evaluación combinando los
stores ya existentes:
- `subjectsStore`: lista de materias y sus estados, total de materias de la
  carrera (para % y "año completo").
- `sessionsStore`: sesiones de estudio (cantidad, perfectas).
- `streakStore` + `computeDisplayStreak`: racha actual.
- gamificación (`computeGamification`): nivel actual.

**Razón**: Mismo patrón cross-store que `useGamification`. No agrega fetches:
esos stores ya se cargan en las páginas que el usuario visita. La lógica pura
recibe un objeto `AchievementContext` plano (testeable sin React).

**Alternativas consideradas**:
- Recalcular dentro de cada store: dispersaría la lógica. Rechazada; mejor un
  único evaluador puro que recibe un contexto.

## D5 — "Año completo" y correlatividad por año

**Decisión**: Un logro "Aprobaste 1er año" se cumple cuando todas las materias
cuyo `year === 1` están aprobadas/promocionadas. Se generaliza a los años que
tenga la carrera.

**Razón**: Las materias ya tienen el dato de año (usado por el árbol). Permite
logros por año sin estructura nueva.

**Alternativas consideradas**:
- Logro único "carrera completa": se mantiene también (100%), pero los logros
  por año dan hitos intermedios más motivadores.

## D6 — Definición del catálogo (versión inicial)

**Decisión**: ~12-15 logros cubriendo las fuentes:
- Materias: primera aprobada, primera promocionada, 5 aprobadas, 10 aprobadas,
  1er año completo, carrera completa (100%).
- Progreso: 25%, 50%, 75% de la carrera.
- Estudio: primera sesión, 10 sesiones, primer quiz/ejercicio perfecto.
- Racha: racha de 7 días.
- Nivel: llegar a nivel 5 (y/o 10).

**Razón**: Cubre los hitos mencionados en la spec, balanceando logros fáciles
(enganche temprano) y difíciles (retención). El catálogo es data; agregar o
ajustar logros después es trivial y no toca la lógica.

**Alternativas consideradas**:
- Catálogo más grande desde el inicio: se prefiere empezar acotado y crecer.

## D7 — Sin fecha de desbloqueo

**Decisión**: Mostrar solo estado conseguido / no conseguido, sin fecha.

**Razón**: Consecuencia directa de D1 (sin persistencia). Aceptado en la spec
(Assumptions). Si se quisiera fecha, requeriría D1-alternativa (tabla).
