# Exercises-Spec.md — Correlativa
## Spec consolidada — Modo "Ejercicios" en Estudiar (refinamiento de Study)

> Estado: **borrador, pendiente de aprobación.** No se codea hasta aprobación.
> Refina la feature existente `study/`. Reusa Edge Function, stores y página.

---

## 1. PRD (Producto)

### 1.1 Problema
El modo Quiz actual (opción múltiple + V/F) es bueno para reconocer conceptos, pero no para **practicar resolución**. En carreras como Informática/Ingeniería, el estudiante necesita **resolver** ejercicios (calcular, deducir) y no solo elegir. Falta un modo donde uno **produzca la respuesta**, no la reconozca.

### 1.2 Propuesta
Un **segundo modo** en la pantalla Estudiar: **"Ejercicios"**. El estudiante elige materia + tema, la IA genera ejercicios para resolver, el estudiante escribe su respuesta, y:
- Si acierta → feedback positivo + (opcional) el procedimiento.
- Si falla → se le muestra **el paso a paso de cómo se resuelve**.

### 1.3 Decisiones cerradas (de las preguntas)
- **Tipo de respuesta:** numérica **o** texto corto — la IA decide según el ejercicio.
- **Evaluación:** la IA entrega la respuesta correcta + paso a paso **al generar** (una sola llamada). La corrección es **local** (sin segunda llamada → gratis y rápido).
- **Ubicación:** modo aparte. En Estudiar, un toggle **"Quiz" | "Ejercicios"**.

### 1.4 El trade-off del texto libre (y cómo se mitiga)
Comparar respuestas de texto localmente es frágil ("derivada" vs "la derivada"). Mitigación:
1. La IA devuelve una **lista de respuestas aceptadas** (`acceptedAnswers`), no una sola.
2. **Normalizamos** antes de comparar: minúsculas, trim, sin acentos, sin signos, sin artículos iniciales ("el/la/los/las/un/una").
3. Para numérico: parseo a número + **tolerancia relativa** (maneja `42` = `42.0`, y decimales con coma o punto).
4. Como el **paso a paso siempre se muestra al fallar**, aun un caso límite mal evaluado deja aprendizaje. Aceptamos esa imperfección a cambio de no gastar una llamada extra de IA.

### 1.5 Criterios de aceptación
- El usuario puede alternar entre Quiz y Ejercicios en Estudiar.
- Genera 5 ejercicios sobre la materia/tema elegidos.
- Cada ejercicio: escribe su respuesta → ve si está bien o mal → ve el procedimiento.
- Completar una sesión de ejercicios suma XP y racha, **igual que el quiz** (no se distingue en gamificación).
- Disclaimer de IA visible.

### 1.6 Fuera de scope
- Corrección con segunda llamada a IA (eventual mejora para respuestas muy abiertas).
- Ejercicios con imagen/gráfico.
- Editor de fórmulas / LaTeX render (el paso a paso va en texto plano; si la IA usa notación, se muestra tal cual).
- Historial separado de ejercicios vs quiz (se cuentan juntos como "sesión de estudio").

---

## 2. Arquitectura

### 2.1 Reutilización
La feature Study ya tiene casi todo. **No** se crean stores ni tablas nuevas:
- `user_study_sessions` ya guarda sesiones (sirve igual para ejercicios).
- `studyStore` maneja el estado de la sesión (se generaliza para soportar ejercicios).
- `useStudySessions`, gamificación y racha **no cambian** (una sesión es una sesión).

### 2.2 Nuevo tipo de contenido
Hoy `Question` es `mc | tf`. Agregamos un modo paralelo: `Exercise`. Para no ensuciar el tipo de quiz, los ejercicios son su **propio tipo** y su **propio endpoint del Edge Function** (o un parámetro `mode`).

```ts
export interface Exercise {
  statement: string          // enunciado del ejercicio
  answerType: 'number' | 'text'
  // Para 'number': valor esperado (+ tolerancia opcional).
  expectedNumber?: number
  tolerance?: number         // tolerancia absoluta; default pequeño
  // Para 'text': lista de respuestas aceptadas (ya pensadas por la IA).
  acceptedAnswers?: string[]
  solution: string           // paso a paso de cómo se resuelve
}

export interface ExerciseSet {
  exercises: Exercise[]      // exactamente 5
}
```

### 2.3 Backend
Dos opciones (se decide en implementación):
- **A) Mismo Edge Function con parámetro `mode: 'quiz' | 'exercises'`** → un solo endpoint, branchea el prompt y el shape de validación. **Recomendado** (menos superficie, un solo deploy).
- B) Edge Function nuevo `generate-exercises`.

Voy con **A**: extiendo `generate-quiz` para aceptar `mode`. Si `mode === 'exercises'`, usa el prompt y validación de ejercicios.

### 2.4 Evaluación local (lib pura)
```ts
function checkExercise(exercise: Exercise, userAnswer: string): boolean
```
- `number`: parsea `userAnswer` (acepta coma o punto decimal), compara con `expectedNumber` ± `tolerance`.
- `text`: normaliza ambos y compara contra `acceptedAnswers`.
- Pura y testeable.

---

## 3. UX

### 3.1 Toggle de modo en `picking`
Arriba del selector de materia, un toggle **"Quiz | Ejercicios"** (mismo estilo que el toggle de Agenda). El resto del picking (materia, tema, generar) es idéntico.

### 3.2 Pantalla de ejercicio (`playing`, modo ejercicios)
```
┌─────────────────────────────────────┐
│ Ejercicio 2 de 5        ●●○○○        │
│                                     │
│ Calculá la derivada de f(x)=3x²+2x  │
│                                     │
│ Tu respuesta:                       │
│ [ ____________________ ]            │
│                                     │
│ [      Verificar       ]            │
└─────────────────────────────────────┘
```
- Input de texto (teclado numérico sugerido si `answerType === 'number'` vía `inputMode`).
- Botón **"Verificar"** (deshabilitado si el input está vacío).

### 3.3 Feedback tras verificar
- **Correcto:** banner verde "¡Bien! 🎯" + (colapsable) "Ver procedimiento".
- **Incorrecto:** banner rojo "No es correcto" + se muestra **el paso a paso completo** (la `solution`) + la respuesta esperada.
- Botón **"Siguiente"** (o "Ver resultado" en el último).

### 3.4 Resumen
Igual que el quiz: `4 / 5`, XP, racha. (Reusa `QuizSummary`, que ya es genérico sobre `SessionResult`.)

### 3.5 Estados
Mismos que el quiz (`picking / generating / playing / summary / error`), compartidos en `studyStore`. Solo cambia qué se renderiza en `playing` según el modo.

---

## 4. Contratos (TS + HTTP)

### 4.1 Request al Edge Function
```ts
{ subjectName: string; topic?: string; mode?: 'quiz' | 'exercises' }
```
`mode` default `'quiz'` (compatibilidad con lo actual).

### 4.2 Response (mode exercises)
```ts
{ exercises: Exercise[] }  // 5 elementos
```

### 4.3 Prompt de ejercicios (system)
Pide 5 ejercicios para **resolver**, cada uno con:
- enunciado claro,
- `answerType` ('number' o 'text') según corresponda,
- si number: `expectedNumber` y opcional `tolerance`,
- si text: `acceptedAnswers` (varias formas válidas, en minúscula),
- `solution`: paso a paso didáctico.

Con `response_format: json_object` + validación + 1 reintento (igual que quiz).

### 4.4 Lib de evaluación
```ts
export function normalizeText(s: string): string   // lower, trim, sin acentos, sin artículos
export function checkExercise(ex: Exercise, answer: string): boolean
export function scoreExercises(exercises: Exercise[], answers: string[], subjectId: string): SessionResult
```

---

## 5. Plan de implementación

1. **Tipos** `Exercise`, `ExerciseSet` en `study/lib/exercise.ts` + helpers (`normalizeText`, `checkExercise`, `scoreExercises`).
2. **Tests** del lib (numérico con tolerancia, texto con acentos/artículos, accepted answers).
3. **Edge Function**: extender `generate-quiz` con `mode`. Prompt + validación de ejercicios. (Lo escribo, vos lo re-deployás.)
4. **Cliente** `generateExercises` (o `generate` con mode) en `api/`.
5. **studyStore**: generalizar para sostener `mode` + `exerciseSet` + respuestas de texto.
6. **Componentes**: `ModeToggle`, `ExerciseCard` (input + verificar + feedback con solución).
7. **StudyPage**: branch por modo en `picking` y `playing`. Reusar `QuizSummary`.
8. **Tests** + build + push. (El front se auto-deploya; el Edge Function lo re-deployás vos.)

### "Done" global
- Toggle Quiz/Ejercicios funciona.
- Generás ejercicios, resolvés, ves correcto/incorrecto + paso a paso.
- Suma XP y racha como una sesión normal.
- Tests verdes, build ok.

---

## 6. Riesgos
| Riesgo | Mitigación |
|---|---|
| Texto libre mal evaluado | `acceptedAnswers` + normalización; paso a paso siempre visible. |
| IA devuelve number como string | Validación de shape lo rechaza → reintento. |
| Decimales coma vs punto | El parser numérico acepta ambos. |
| Confusión Quiz vs Ejercicios | Toggle claro + textos distintos por modo. |

---

## 7. Punto a confirmar
**Backend opción A** (extender `generate-quiz` con `mode`) vs **B** (function nueva). Recomiendo **A**: un solo endpoint, un solo deploy, menos para mantener. ¿OK?
