# Feature Specification: Investigación Competitiva + Rediseño UI/UX v3

**Feature Branch**: `009-competitive-ui-redesign`

**Created**: 2026-06-07

**Status**: Draft

**Input**: Investigación competitiva como diseñador web y programador senior; identificar brechas funcionales en apps similares y proponer una interfaz superior que eleve Correlativa al nivel de Linear, Raycast y Arc Browser manteniendo la identidad oscura/gaming.

---

## Contexto: Hallazgos de Investigación Competitiva

### El panorama actual (por qué existe la oportunidad)

**SIU Guaraní** es el sistema oficial en todas las universidades nacionales argentinas. Los estudiantes lo odian activamente (tendencia en Twitter/X cada inscripción) porque: se cae en momentos críticos, es visualmente anticuado, no visualiza el progreso de carrera, no responde "¿qué puedo cursar ahora?", y no genera ningún sentido de logro.

**Competidores locales:**
- **Plande**: más cercano en concepto a Correlativa. Visualiza correlativas y permite simular escenarios de graduación. Sin móvil nativo, sin autenticación, cobertura limitada a pocas universidades, sin gamificación, sin estudio activo.
- **Muy App (UBA)**: notas + correlativas + opiniones de cátedras. Solo sirve para UBA. Sin árbol visual tipo skill-tree.
- **OrbitUp**: el competidor más peligroso. IA + flashcards + Pomodoro + gamificación + app nativa. Declaró proyección de $10M USD para 2027. Débil en árbol de correlativas y planificación estructural de carrera.
- **Correlativas ITBA**: mapa visual interactivo, pero estático, sin estado de usuario, solo para ITBA.

**Brechas del mercado identificadas:**
1. Nadie responde "¿qué puedo cursar ahora?" de forma visual e inmediata.
2. El árbol de correlativas como skill-tree RPG satisfactorio no existe en ninguna app multi-universidad.
3. El progreso de carrera no se celebra (aprobar una materia no genera feedback positivo).
4. Quizlet destruyó su goodwill con paywalls: hay apetito por alternativas gratuitas.
5. Nadie es mobile-first real en el contexto universitario argentino.
6. Nadie habla español argentino con contexto local (regular, libre, promocionado).

### Inspiraciones de diseño validadas
- **Linear**: dark-first, jerarquía visual densa, velocidad como feature, acento único.
- **Arc Browser**: identidad por espacio/contexto, sidebar, personalidad sin ser ruidoso.
- **Duolingo**: streak genera 3.6x retención, lecciones cortas reducen barrera de activación, pérdida del streak como motivador.
- **Skill trees gaming** (Hades, Final Fantasy X, Path of Exile): nodos con estado legible en <1 segundo, desbloqueado debe sentirse como logro, exploración visual genera curiosidad.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Onboarding que responde la pregunta del millón (Priority: P1)

Un estudiante que acaba de llegar a Correlativa ve en menos de 30 segundos su árbol de correlativas con los nodos que puede cursar ahora resaltados de forma prominente y legible. No tiene que buscar ni hacer scroll — la respuesta a "¿qué puedo cursar?" está visible en la primera pantalla del árbol.

**Why this priority**: Es la promesa central de la app y el primer momento de verdad. Si esto no funciona bien, el estudiante no vuelve.

**Independent Test**: Probarlo con usuarios nuevos que nunca usaron la app: pedir que identifiquen las materias que pueden cursar sin explicación previa. ≥80% deben lograrlo en ≤30 segundos.

**Acceptance Scenarios**:

1. **Given** el árbol está cargado, **When** el usuario lo ve por primera vez, **Then** los nodos disponibles para cursar están visualmente prominentes (color accent, sin opacidad reducida), diferenciados de los bloqueados (opacos, icono de candado) y los completados (color success).
2. **Given** el usuario marcó una materia como aprobada, **When** eso desbloquea otras materias, **Then** los nuevos nodos disponibles hacen una animación de "activación" (pulse o glow) que atrae la atención sin ser intrusiva.
3. **Given** el árbol tiene muchos nodos, **When** el usuario lo carga en mobile, **Then** el zoom inicial muestra mínimamente los 6 nodos más relevantes (disponibles o cursando) sin necesidad de hacer zoom manual.

---

### User Story 2 — Árbol de correlativas como skill tree RPG (Priority: P1)

El árbol es el producto. Un estudiante con 3+ cuatrimestres de historia puede explorar su árbol, ver claramente qué aprobó, qué está cursando, qué puede cursar, qué le falta para graduarse, y sentir que su carrera universitaria es un juego que está ganando.

**Why this priority**: Es el diferencial único de Correlativa frente a todos los competidores. Si el árbol es mediocre, la propuesta de valor colapsa.

**Independent Test**: El árbol puede evaluarse de forma aislada mostrándolo a usuarios sin contexto. Deben poder leer el estado de cualquier nodo en menos de 1 segundo y sentir que "quieren tocar" los nodos disponibles.

**Acceptance Scenarios**:

1. **Given** un nodo tiene estado "disponible para cursar", **When** el usuario lo ve, **Then** el nodo tiene el color accent de la carrera, bordes bien definidos, icono ✦, y un texto de etiqueta legible incluso en zoom alejado.
2. **Given** un nodo está bloqueado, **When** el usuario lo toca, **Then** ve exactamente qué correlativas le faltan, cuáles ya tiene y cuáles no, con iconos ✓/✗ y el estado actual de cada una.
3. **Given** el usuario navega el árbol en mobile, **When** hace pinch-zoom, **Then** los nodos mantienen legibilidad y los bordes no se pixelan en ningún nivel de zoom.
4. **Given** el árbol tiene nodos en años 1 a 6, **When** se renderiza, **Then** cada año tiene un panel de fondo visualmente diferenciado y las etiquetas "Año N / 1° / 2° cuatrimestre" son legibles de un vistazo.

---

### User Story 3 — Progreso celebrado como logro (Priority: P2)

Un estudiante marca una materia como "aprobada" y experimenta un momento de celebración: animación de unlock, mensaje motivador, y un vistazo de cuánto avanzó en la carrera. El progreso no es un número frío — es una narrativa de conquista.

**Why this priority**: Quizlet, Anki y el propio SIU Guaraní ignoran completamente la motivación. Un momento de celebración bien diseñado diferencia a Correlativa y genera retención.

**Independent Test**: Marcar una materia como aprobada en una sesión observada. El usuario debe expresar verbalmente alguna emoción positiva o sorpresa ante el feedback.

**Acceptance Scenarios**:

1. **Given** el usuario cambia el estado a "aprobada" o "promocionada", **When** confirma, **Then** hay una animación de celebración en el nodo del árbol (scale + color change) y un toast con mensaje tipo "¡Desbloqueaste X materias nuevas!".
2. **Given** la carrera avanzó un milestone (25%, 50%, 75%, 100%), **When** el sistema lo detecta, **Then** aparece una pantalla/modal de celebración del milestone con el porcentaje y las materias desbloqueadas.
3. **Given** el usuario entra al dashboard después de aprobar materias, **When** el dashboard carga, **Then** muestra las materias que puede cursar ahora como la primera sección, con el número prominente.

---

### User Story 4 — Interfaz visualmente superior a todo lo existente (Priority: P2)

Un usuario que conoce Linear, Raycast o Arc Browser abre Correlativa y siente que está usando un producto de esa categoría: oscuro, rápido, con personalidad, sin cruces ni ruido visual. La interfaz comunica "este producto fue pensado con cariño para mí".

**Why this priority**: En un mercado con SIU Guaraní y tools mediocres, ser el producto más lindo es una ventaja competitiva real. Los estudiantes recomiendan apps que les dan orgullo mostrar.

**Independent Test**: Mostrar una captura de pantalla de Correlativa junto a SIU Guaraní y Plande a 10 estudiantes universitarios. ≥7 deben preferir la de Correlativa sin contexto adicional.

**Acceptance Scenarios**:

1. **Given** el usuario abre la app por primera vez, **When** ve el dashboard, **Then** la pantalla tiene una jerarquía visual clara: 1 acción principal destacada, 2-3 métricas secundarias, el árbol como CTA principal.
2. **Given** la app está en tema oscuro (default), **When** el usuario la usa, **Then** el contraste entre fondo, superficie y texto supera WCAG AA (4.5:1) en todos los textos principales.
3. **Given** el usuario navega entre secciones, **When** cambia de pantalla, **Then** hay transiciones suaves (max 250ms) que dan sensación de fluidez sin distraer.
4. **Given** el usuario está en mobile, **When** interactúa con cualquier elemento interactivo, **Then** el área táctil es ≥44×44 puntos CSS (accesibilidad táctil).

---

### User Story 5 — Color de acento personalizable por carrera (Priority: P3)

Cada carrera tiene su color de acento. Un estudiante de Ingeniería ve el árbol en azul; uno de Arquitectura lo ve en naranja. El color no es cosmético: da identidad y pertenencia, como los Spaces de Arc Browser.

**Why this priority**: Diferenciación visual y conexión emocional con la carrera. Feature de bajo esfuerzo técnico con impacto de percepción alto.

**Independent Test**: Mostrar la misma pantalla del árbol con dos colores de acento diferentes a usuarios de distintas carreras. Verificar que perciben la identidad como suya.

**Acceptance Scenarios**:

1. **Given** una carrera tiene un color asignado en el sistema, **When** el usuario entra al árbol, **Then** todos los nodos disponibles y el acento de la UI usan ese color.
2. **Given** el usuario no tiene carrera con color configurado, **When** usa la app, **Then** se usa el color de acento default (violeta actual) sin romperse nada.
3. **Given** el administrador del catálogo asigna un color a una carrera, **When** el usuario la selecciona, **Then** el cambio de color es inmediato sin recargar la app.

---

### Edge Cases

- ¿Qué muestra el árbol si la carrera tiene 0 correlativas cargadas? → estado vacío con CTA para importar plan.
- ¿Qué pasa si el PDF importado generó materias sin año/cuatrimestre? → sección "Sin clasificar" en el árbol con indicador visual de advertencia.
- ¿Qué pasa en dispositivos con pantallas muy pequeñas (<320px)? → el árbol no debe romperse, debe ser funcional aunque más comprimido.
- ¿Qué pasa si el usuario tiene 100+ materias en su árbol? → el renderizado no debe tardar >2 segundos; se permite lazy render de nodos fuera de viewport.
- ¿Qué sucede cuando el color de acento de carrera tiene bajo contraste con el fondo? → el sistema debe tener una lista de colores pre-aprobados con contraste garantizado.

---

## Requirements *(mandatory)*

### Functional Requirements

**Árbol de correlativas:**
- **FR-001**: El árbol DEBE mostrar los nodos con estado visualmente legible en menos de 1 segundo: bloqueada (gris, opaco), disponible_cursar (color accent), disponible_rendir (cyan + badge "FINAL"), cursando (naranja), completada (verde).
- **FR-002**: Al tocar un nodo bloqueado, el usuario DEBE ver exactamente qué correlativas le faltan, con estado de cada una.
- **FR-003**: Al desbloquear una materia (marcar correlativas como aprobadas), el nuevo nodo disponible DEBE animarse con un efecto de activación (pulse de 600ms).
- **FR-004**: El árbol DEBE funcionar con pinch-zoom fluido en mobile sin pérdida de calidad visual en ningún nivel.
- **FR-005**: Los paneles de año y etiquetas de cuatrimestre DEBEN ser legibles sin zoom adicional en una pantalla de 375px de ancho.

**Dashboard:**
- **FR-006**: El dashboard DEBE mostrar en la primera posición visible "Materias para cursar ahora: N" como acción principal.
- **FR-007**: Al aprobar una materia que desbloquea otras, DEBE aparecer un toast: "¡Desbloqueaste N materia(s) nueva(s)!".
- **FR-008**: Al superar un milestone de carrera (25%, 50%, 75%), DEBE aparecer una pantalla de celebración antes de continuar.

**UI/UX general:**
- **FR-009**: Toda pantalla DEBE respetar contraste WCAG AA (4.5:1) en textos principales.
- **FR-010**: Toda área táctil interactiva DEBE tener mínimo 44×44px CSS.
- **FR-011**: Las transiciones entre pantallas NO DEBEN superar 250ms.
- **FR-012**: El árbol DEBE renderizar en menos de 2 segundos incluso con 100+ materias.
- **FR-013**: La app DEBE funcionar en tema oscuro como default (no opción secundaria).

**Colores de acento por carrera:**
- **FR-014**: El sistema DEBE soportar un color de acento diferente por carrera (de una paleta pre-aprobada con contraste garantizado).
- **FR-015**: El color de acento DEBE aplicarse consistentemente en: nodos del árbol, badges, CTAs principales, y barras de progreso.

### Key Entities

- **CareerTheme**: color de acento asociado a una carrera. Atributos: carrera_id, color_hex (de paleta pre-aprobada), updated_at.
- **MilestoneEvent**: milestone de progreso de carrera alcanzado por el usuario. Atributos: user_id, career_id, milestone_type (25/50/75/100), triggered_at, shown_at.
- **TreeNodeAnimation**: estado de animación pendiente para un nodo recién desbloqueado. Estado efímero en memoria; no persiste en DB.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 80% de usuarios nuevos pueden identificar "qué puedo cursar ahora" en el árbol en menos de 30 segundos sin explicación.
- **SC-002**: El tiempo de renderizado del árbol no supera 2 segundos con carreras de hasta 120 materias.
- **SC-003**: En un test de preferencia visual con 10 estudiantes, ≥7 prefieren la interfaz de Correlativa sobre SIU Guaraní y Plande al ver capturas sin contexto.
- **SC-004**: La retención a 7 días (usuarios que vuelven en la primera semana) mejora en ≥20% respecto al baseline actual.
- **SC-005**: El contraste de texto en modo oscuro cumple WCAG AA (4.5:1) en el 100% de textos con peso ≤400 y tamaño ≤14sp.
- **SC-006**: Las áreas táctiles de todos los elementos interactivos son ≥44×44px CSS (verificado en viewport de 375px).

---

## Assumptions

- El tema oscuro es el default y primario; no se diseña modo claro en esta iteración.
- Los colores de acento por carrera son una paleta cerrada definida por el equipo (no el usuario elige libremente el color, para garantizar contraste).
- Las animaciones de unlock usan Framer Motion (ya disponible en el stack).
- Los milestones de celebración son al 25%, 50%, 75% y 100% de materias aprobadas/completadas.
- La paleta de acento por carrera se define manualmente para las carreras del catálogo; para carreras custom, se usa el color default (violeta).
- El rendimiento del árbol con 100+ materias requiere evaluación; si React Flow no escala, se contempla virtualización de nodos.
- La accesibilidad táctil (44px) aplica a mobile; en desktop los elementos pueden ser más pequeños con hover states claros.
- Esta spec NO incluye el diseño completo de un sistema de diseño desde cero; trabaja sobre la base existente de TailwindCSS + diseño oscuro actual, refinando y elevando.
- OrbitUp es el competidor más peligroso a largo plazo; el árbol de correlativas como diferencial debe ser el foco de esta iteración, no igualar las features de estudio de OrbitUp.
