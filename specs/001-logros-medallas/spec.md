# Feature Specification: Logros y Medallas

**Feature Branch**: `001-logros-medallas`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Sistema de logros y medallas para Correlativa. El usuario ya tiene XP, niveles y rachas, pero faltan hitos concretos que reconozcan avances específicos de su carrera y su forma de estudiar. Los logros son coleccionables tangibles que marcan momentos importantes y dan motivación adicional. Se desbloquean automáticamente al cumplir hitos, se ven en una galería (desbloqueados a color, bloqueados como silueta con pista), y al conseguir uno aparece una celebración festiva. Se derivan del estado actual sin tablas nuevas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver mi colección de logros (Priority: P1)

Como estudiante, quiero entrar a una pantalla de logros y ver todos los
logros que existen, distinguiendo claramente cuáles ya conseguí y cuáles
todavía no, para entender mi progreso y tener metas a las que apuntar.

**Why this priority**: Es el corazón de la feature y el MVP. Sin la galería
no hay nada visible. Aun sin celebración ni pistas elaboradas, ver "tengo 4
de 15 logros" ya entrega valor motivacional inmediato.

**Independent Test**: Se puede probar entrando a la pantalla de logros con un
usuario que tiene algunas materias aprobadas y sesiones de estudio hechas, y
verificando que los logros correspondientes aparecen como conseguidos y el
resto como bloqueados.

**Acceptance Scenarios**:

1. **Given** un usuario que aprobó su primera materia, **When** abre la
   pantalla de logros, **Then** ve el logro "Primera materia aprobada" como
   conseguido (a color) y los demás logros aún no cumplidos como bloqueados.
2. **Given** un usuario nuevo sin ninguna actividad, **When** abre la pantalla
   de logros, **Then** ve todos los logros en estado bloqueado, cada uno con
   una pista de cómo conseguirlo.
3. **Given** un usuario con varios logros conseguidos, **When** abre la
   pantalla, **Then** ve un contador de progreso total (ej. "6 de 15 logros").

---

### User Story 2 - Celebrar al desbloquear un logro (Priority: P2)

Como estudiante, cuando consigo un logro nuevo por una acción que acabo de
hacer (aprobar una materia, terminar una sesión de estudio perfecta, etc.),
quiero ver una celebración festiva en el momento, para sentir la recompensa
y la satisfacción del avance.

**Why this priority**: Multiplica el impacto motivacional de la galería al
dar feedback inmediato. Depende de que el cálculo de logros (P1) ya exista,
por eso es P2.

**Independent Test**: Se puede probar marcando una materia como aprobada por
primera vez y verificando que aparece una celebración del logro recién
conseguido, en cualquier pantalla donde se haga la acción.

**Acceptance Scenarios**:

1. **Given** un usuario sin el logro "Primera materia aprobada", **When**
   marca su primera materia como aprobada, **Then** aparece una celebración
   festiva anunciando el logro desbloqueado.
2. **Given** una acción que desbloquea varios logros a la vez, **When** se
   cumplen, **Then** las celebraciones se muestran una tras otra sin perderse
   ninguna.
3. **Given** un logro que ya estaba conseguido, **When** el usuario vuelve a
   entrar a la app o repite una acción, **Then** NO se vuelve a celebrar ese
   logro.

---

### User Story 3 - Saber qué me falta para el próximo logro (Priority: P3)

Como estudiante, quiero que cada logro bloqueado me muestre una pista clara
de cómo conseguirlo, para saber qué hacer a continuación y mantenerme
enganchado.

**Why this priority**: Mejora la galería convirtiéndola en una guía de metas,
pero la feature ya es valiosa sin pistas detalladas (P1 las muestra de forma
básica). Es un refinamiento.

**Independent Test**: Se puede probar abriendo la galería y verificando que
cada logro bloqueado tiene un texto de pista entendible (ej. "Aprobá 5
materias").

**Acceptance Scenarios**:

1. **Given** un logro bloqueado de "Aprobá el primer año", **When** el usuario
   lo mira en la galería, **Then** ve una pista que explica el hito a cumplir.
2. **Given** un logro bloqueado con progreso parcial (ej. 6 de 10 sesiones),
   **When** el usuario lo mira, **Then** ve cuánto le falta de forma
   entendible.

---

### Edge Cases

- **Usuario sin carrera activa**: la pantalla de logros muestra todos los
  logros bloqueados, sin romperse.
- **Logro de "carrera completa" (100%)**: solo se desbloquea cuando todas las
  materias de la carrera están aprobadas/promocionadas.
- **Revertir un estado**: si un usuario marca una materia como aprobada y
  luego la vuelve a "cursando", un logro que dependía de ese hito puede dejar
  de estar conseguido (los logros reflejan el estado real, son reversibles).
  Al revertirse no se muestra ninguna celebración ni mensaje negativo.
- **Datos aún cargando**: mientras la información del usuario no terminó de
  cargar, la galería muestra un estado de carga en vez de logros incorrectos.
- **Carga inicial de sesión**: al abrir la app, los logros ya conseguidos NO
  se celebran de nuevo (la celebración es solo para desbloqueos nuevos
  ocurridos durante el uso).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer un conjunto predefinido de logros, cada
  uno con un nombre, un ícono/medalla, una descripción y una condición de
  desbloqueo basada en hitos de la carrera y del estudio.
- **FR-002**: El sistema MUST determinar automáticamente qué logros están
  conseguidos derivándolos del estado actual del usuario (materias y sus
  estados, sesiones de estudio realizadas, racha actual, nivel de
  gamificación), sin requerir acción explícita del usuario.
- **FR-003**: El cálculo de logros MUST ser idempotente y reversible: el mismo
  estado siempre produce el mismo conjunto de logros conseguidos, y si el
  estado deja de cumplir la condición, el logro deja de estar conseguido.
- **FR-004**: El sistema MUST presentar una galería donde se ven todos los
  logros, con los conseguidos resaltados a color y los no conseguidos como
  silueta/bloqueados.
- **FR-005**: Cada logro bloqueado MUST mostrar una pista entendible de cómo
  conseguirlo.
- **FR-006**: La galería MUST mostrar un indicador de progreso total (cantidad
  de logros conseguidos sobre el total).
- **FR-007**: Cuando el usuario desbloquea uno o más logros durante el uso de
  la app, el sistema MUST mostrar una celebración festiva para cada logro
  nuevo.
- **FR-008**: El sistema MUST evitar celebrar un logro que ya estaba conseguido
  (no recelebrar al recargar la app ni al repetir acciones).
- **FR-009**: Cuando una sola acción desbloquea varios logros, el sistema MUST
  mostrarlos todos sin perder ninguno.
- **FR-010**: Los logros MUST ser una capa de engagement separada del progreso
  académico: conseguir logros no altera el porcentaje de avance de carrera,
  que sigue saliendo solo de materias aprobadas/promocionadas.
- **FR-011**: El sistema MUST funcionar sin agregar tablas nuevas a la base de
  datos; los logros se derivan de los datos ya existentes del usuario.
- **FR-012**: Toda la interfaz de logros MUST estar en español argentino.

### Key Entities

- **Logro (Achievement)**: representa un hito coleccionable. Atributos clave:
  identificador, nombre, descripción, ícono/medalla, pista de cómo obtenerlo,
  y la condición que lo desbloquea (evaluada contra el estado del usuario).
- **Estado de logro del usuario**: para cada logro, si está conseguido o no en
  función del estado actual del usuario. Es un valor derivado, no almacenado.
- **Catálogo de logros**: el conjunto completo de logros definidos en la app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede ver su colección completa de logros en una sola
  pantalla, distinguiendo a simple vista cuáles consiguió y cuáles no.
- **SC-002**: Al cumplir un hito (ej. aprobar la primera materia), el logro
  correspondiente queda marcado como conseguido sin que el usuario tenga que
  hacer ningún paso adicional.
- **SC-003**: En el 100% de los casos, un logro ya conseguido nunca se celebra
  dos veces.
- **SC-004**: Cada logro bloqueado comunica de forma entendible qué hay que
  hacer para conseguirlo (verificable: un usuario que lee la pista sabe el
  próximo paso).
- **SC-005**: Conseguir logros no cambia el porcentaje de progreso de carrera
  (la separación engagement/progreso académico se mantiene).
- **SC-006**: La pantalla de logros se ve y funciona correctamente en pantalla
  de celular (mobile-first).

## Assumptions

- **Sin fecha exacta de desbloqueo**: como los logros se derivan del estado y
  no se persisten, no se guarda ni se muestra la fecha en que se consiguió
  cada uno; solo el estado conseguido / no conseguido. (Si en el futuro se
  quisiera mostrar la fecha, requeriría persistencia, fuera de scope.)
- **Ubicación de la galería**: se asume una pantalla/sección de logros
  accesible desde la navegación principal de la app; la ubicación exacta se
  decide en la fase de planificación.
- **Reutilización de la celebración existente**: se asume que la celebración
  de logros sigue el mismo estilo festivo que la celebración de subida de
  nivel ya existente, para mantener consistencia visual.
- **Catálogo inicial fijo**: el conjunto de logros lo define el equipo; el
  usuario no puede crear ni configurar logros propios en esta versión.
- **Fuentes de datos existentes**: los logros se calculan a partir de las
  materias del usuario, sus sesiones de estudio, su racha y su nivel, todos
  datos ya disponibles en la app.
