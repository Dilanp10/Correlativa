# Gamification-PRD.md — Correlativa
## Paso 1 (SDD) — Documento de Producto: Gamificación

> Estado: **borrador, pendiente de aprobación.** No se avanza a Architecture hasta que esté aprobado.

---

## 1. Problema

El estudiante avanza en su carrera pero el progreso se siente **abstracto y lento**: aprobar una materia es un trámite, no un logro. La app ya muestra un porcentaje de avance, pero no genera la sensación de **recompensa** ni de **impulso** que mantiene a la gente enganchada (el efecto Duolingo/Steam).

Falta una capa que convierta el avance académico real en una experiencia **satisfactoria y motivadora**.

---

## 2. Usuarios

El mismo de siempre: estudiante universitario argentino, mobile-first, que usa la app para entender y avanzar su carrera. Busca motivación y sentir que "está avanzando".

---

## 3. Propuesta de valor

Convertir cada acción de progreso (aprobar una materia, completar un examen) en **XP** que hace **subir de nivel**, dando una recompensa visible e inmediata. El nivel se vuelve un símbolo de cuánto avanzaste, más emocional que un simple porcentaje.

> "Aprobé Análisis II y subí a Nivel 7" se siente mejor que "voy 32%".

---

## 4. Decisiones de diseño (alcance de esta iteración)

### 4.1 Núcleo = XP + Niveles
Esta primera iteración construye **solo XP y niveles**, bien hechos y visibles. **Logros/medallas** y **rachas** quedan explícitamente para tandas siguientes (ver §7).

### 4.2 XP derivado del estado (decisión central)
El XP **no se acumula con un contador que suma eventos**. Se **calcula como función del estado actual** del usuario (sus materias y sus eventos completados), igual que ya hacemos con `computeCareerProgress`.

**Por qué:**
- **Idempotente:** nunca se duplica aunque se recargue o se dispare dos veces.
- **Reversible:** si el usuario pasa una materia de "aprobada" a "cursando", el XP baja solo, sin lógica especial.
- **Sin tabla nueva ni ledger:** se deriva de datos que ya existen (`user_subjects`, `agenda_events`).
- **Consistente** con la arquitectura actual del proyecto.

*Trade-off asumido:* no hay "historial de XP ganado" ni animación de "+100 XP" atada a un evento puntual de servidor. Si más adelante se quiere eso, se evalúa un ledger. Para el núcleo, derivar del estado es lo correcto.

### 4.3 Fuentes de XP (propuesta, ajustable)
| Acción (estado) | XP | Razón |
|---|---|---|
| Materia **aprobada** | +100 | Logro principal de la carrera. |
| Materia **promocionada** | +130 | Mejor desempeño → recompensa mayor. |
| Materia **cursando** | +20 | Reconoce que arrancaste, sin "regalar" el logro. |
| Evento de agenda **completado** | +15 | Premia la organización y el seguimiento. |

> Estados `regular`, `final_pendiente`, `libre`, `no_cursada` → 0 XP en el núcleo. Se puede refinar después. El ponderar por año/créditos de la materia queda fuera del núcleo (posible mejora futura).

### 4.4 Niveles
- El total de XP determina el **nivel** mediante una **curva creciente** (cada nivel cuesta más que el anterior). La fórmula exacta se define en Architecture.
- Se muestra: **nivel actual**, **XP actual**, y una **barra de progreso al próximo nivel**.

---

## 5. Features y criterios de aceptación

### F1 — Cálculo de XP y nivel
- **Dado** el estado de materias y eventos del usuario, **cuando** se calcula su gamificación, **entonces** se obtiene XP total, nivel actual, XP dentro del nivel y XP necesaria para el siguiente.
- El cálculo es una **función pura** (testeable, sin llamadas a la base).
- Si el usuario revierte una acción (ej: desmarca una materia aprobada), el XP y el nivel **se recalculan hacia abajo** correctamente.

### F2 — Visualización del nivel
- En el **Dashboard** se muestra una tarjeta con: nivel actual, barra de progreso al próximo nivel, y XP (ej: "320 / 500 XP").
- Mobile-first, coherente con la estética oscura/vibrante existente.
- Mientras los datos cargan, se muestra skeleton (sin pantallas en blanco).

### F3 — Feedback de subida de nivel (overlay festivo)
- **Cuando** una acción del usuario lo hace **cambiar de nivel**, **entonces** se muestra un **overlay festivo** (animación con el número de nivel nuevo, estilo celebración).
- Criterio de aceptación: no aparece en cargas normales (solo cuando el nivel sube respecto al valor previo en la sesión).

### F4 — Coherencia con el resto de la app
- El XP se deriva de los stores ya existentes (subjects, agenda). No se agregan llamadas redundantes a Supabase.
- No rompe ni duplica el cálculo de progreso actual.

---

## 6. Métricas de éxito
- El usuario **entiende** su nivel y qué le falta para el próximo (claridad).
- Subir de nivel se siente **satisfactorio** (feedback F3).
- Cero inconsistencias: el XP mostrado siempre coincide con el estado real (sin duplicados ni desfasajes).

---

## 7. Fuera de scope (esta iteración)
- **Logros / medallas** (próxima tanda).
- **Rachas / streaks** y login diario (próxima tanda; requiere registrar actividad por día).
- **Ranking / comparación social** (requiere diseño de privacidad; no planificado).
- **Recompensas canjeables**, cosméticos, monedas, etc.
- **Historial/ledger de XP** y notificaciones push.

---

## 8. Decisiones cerradas
1. **Valores de XP:** confirmados los de §4.3 (aprobada +100, promocionada +130, cursando +20, evento +15).
2. **Ubicación de la tarjeta de nivel:** **Dashboard**.
3. **Celebración de subida de nivel:** **overlay festivo** (ver F3).
