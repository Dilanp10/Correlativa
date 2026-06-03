# Study-Architecture.md — Correlativa
## Paso 2 (SDD) — Arquitectura Técnica: Sesiones de Estudio con IA

> Estado: **borrador, pendiente de aprobación.** No se avanza a Database-Spec hasta que esté aprobado.
> Depende de: `Study-PRD.md` (aprobado).

---

## 1. Vista general

Por primera vez en el proyecto hay **backend propio** (una Supabase Edge Function). Es necesario porque la API key de GitHub Models **no puede vivir en el front** (Vite hace bundle de todo y se filtraría). El resto sigue los mismos patrones que las features anteriores.

```
[Frontend (React)]
  StudyPage  ──► useGenerateQuiz()  ──► supabase.functions.invoke('generate-quiz', {subjectName, topic?})
                                                                       │
                                                                       ▼
[Backend (Supabase Edge Function, Deno)]
  generate-quiz
    1. Valida JWT del usuario (rechaza anónimos).
    2. Construye prompt con subjectName + topic.
    3. Llama a GitHub Models API (gpt-4o-mini).
    4. Valida que la respuesta sea JSON con el shape esperado.
    5. Devuelve { questions: [...] } al cliente.

[Frontend de nuevo]
  StudyPage muestra preguntas → usuario responde → al terminar:
    - insert en user_study_sessions (Supabase, RLS).
    - emitActivity() → racha 🔥.
    - useGamification recomputa XP automáticamente.
```

---

## 2. Diagrama de módulos (frontend)

```
src/features/study/
├── lib/
│   └── quiz.ts                # Tipos (Question, Quiz, etc.) + helpers puros (scoring).
├── api/
│   └── generateQuiz.ts        # Cliente: llama a la Edge Function.
├── store/
│   ├── studyStore.ts          # Estado de la sesión EN CURSO (current question, answers, score).
│   └── sessionsStore.ts       # Historial persistido (user_study_sessions del usuario).
├── hooks/
│   ├── useGenerateQuiz.ts     # loading/error wrapper sobre generateQuiz.
│   └── useStudySessions.ts    # Carga + insert de sesiones completadas.
└── components/
    ├── SubjectPicker.tsx      # Dropdown materia + input tema opcional.
    ├── QuizQuestion.tsx       # Una pregunta (MC o V/F) con feedback inmediato.
    └── QuizSummary.tsx        # Pantalla final con puntaje + CTAs.

src/pages/
└── StudyPage.tsx              # Lazy route, composición de los componentes.
```

```
supabase/functions/
└── generate-quiz/
    └── index.ts               # Edge Function en Deno.
```

---

## 3. Backend: Edge Function `generate-quiz`

### 3.1 Contrato HTTP
- **Método:** `POST`
- **Auth:** Bearer token (Supabase JWT del usuario logueado).
- **Body (JSON):** `{ subjectName: string; topic?: string }`
- **Respuesta 200:** `{ questions: Question[] }` (5 elementos).
- **Errores:**
  - `401` si no hay JWT válido.
  - `429` si GitHub Models devuelve rate limit.
  - `502` si la IA devolvió algo inservible después de 1 reintento.
  - `500` si hubo otro error inesperado.

### 3.2 Secretos
Se configuran en Supabase Dashboard → Edge Functions → Secrets (o via CLI):
- `GITHUB_MODELS_TOKEN` — GitHub Personal Access Token (PAT) con permiso `models:read`.

Yo te paso las instrucciones exactas en el Paso 6 (Implementation-Plan). El token no se commitea a git ni queda en el código.

### 3.3 Modelo elegido
**`gpt-4o-mini`** vía GitHub Models. Razones:
- Rápido (~2-3 seg para 5 preguntas).
- Calidad alta para tareas educativas en español.
- Soporta `response_format: { type: "json_object" }` → forzamos JSON válido del lado del modelo.
- Está en la cuota gratuita de GitHub Models.

Alternativas evaluadas: `Llama-3.1-70B` (más capaz pero más lento), `Phi-3.5` (más rápido pero menos preciso). Si en práctica `gpt-4o-mini` no funciona bien, es 1 línea de código cambiar el modelo.

### 3.4 Estrategia de prompt
- **System prompt** (fijo): define el rol ("sos un profesor universitario que arma quizzes cortos"), exige JSON válido, define el shape exacto de cada tipo de pregunta, instruye a hacer las preguntas en español argentino y a incluir una explicación clara.
- **User prompt** (dinámico): "Generá 5 preguntas sobre `{subjectName}`{si hay topic: ` enfocadas en {topic}`}. Mezclá tipos `mc` y `tf`. Devolveme JSON con el shape definido."
- **`response_format: { type: "json_object" }`** garantiza JSON.

### 3.5 Validación defensiva
Aunque pidamos JSON forzado, el parser igual:
1. Hace `JSON.parse` con try/catch.
2. Valida que `questions` exista, sea array, y tenga 5 elementos.
3. Valida cada pregunta: tipo válido, opciones del largo correcto, índices/valores válidos.
4. Si algo falla → 1 reintento (otro llamado al modelo). Si vuelve a fallar → `502`.

---

## 4. Frontend: tipos compartidos

```ts
// features/study/lib/quiz.ts

export type Question =
  | { type: 'mc'; question: string; options: string[]; correctIndex: number; explanation: string }
  | { type: 'tf'; question: string; correctValue: boolean; explanation: string }

export interface Quiz {
  questions: Question[]
}

export interface SessionResult {
  correctCount: number
  totalQuestions: number
  isPerfect: boolean
}
```

`Question` es una **discriminated union** sobre `type`. El front renderiza una UI distinta según `q.type === 'mc'` vs `'tf'`.

---

## 5. Estado de la sesión en curso (`studyStore`)

```
Estados posibles del flujo:
  'picking'   → usuario elige materia / tema
  'generating'→ spinner mientras la IA responde
  'playing'   → mostrando preguntas
  'summary'   → resumen final con CTAs
  'error'     → mensaje de error con retry
```

Manejado en `studyStore` (zustand). Es estado **efímero** (no se persiste). Reset al salir de la página o terminar una sesión.

---

## 6. Persistencia: `user_study_sessions`

Tabla nueva con `(id, user_id, subject_id, completed_at, correct_count, total_questions)`. RLS: own rows. Schema completo va en el Database-Spec.

Carga: `useStudySessions` con el mismo patrón de `useAgenda` (load on first use, strict-mode guard).

Insert: al final de una sesión exitosa, **una sola fila** se inserta. Sin update masivo.

---

## 7. Integración con gamificación (XP) y rachas

### 7.1 Racha
Al insertar una sesión completada, llamamos `emitActivity()` → el `StreakActivityConsumer` ya montado en App actualiza la racha. **Cero cambios** en streaks.

### 7.2 XP — el cambio más sustancial
`useGamification` ya lee subjects + agenda. Le sumamos sesiones como **tercera fuente**:

```ts
// computeXp ahora recibe también las sesiones:
function computeXp(userSubjects, events, sessions): number
```

XP por sesión:
- `+25` por cada sesión con `correct_count > 0`.
- `+10` adicional si `correct_count === total_questions` (perfecta).

Esto significa que `useGamification` ahora también lee `useSessionsStore`. Mismo patrón de cross-feature read que ya tiene con subjects y agenda. **Es la única razón** por la que toco gamificación: agregar una fuente más al cómputo.

### 7.3 Separación con progreso académico (refuerzo del PRD)
`computeCareerProgress` NO cambia. Sigue mirando solo `userSubjects` aprobadas/promocionadas. Las sesiones de estudio solo afectan XP/racha, no el porcentaje de carrera.

---

## 8. UI / Navegación

### 8.1 Quinta tab en `BottomNav`
- Texto: "Estudiar"
- Ícono: 🧠 / libro abierto (decisión fina en UX-Spec).
- Padding reducido en `BottomNav` de `px-4` a `px-2.5` para que entren los 5 items en pantallas chicas. Probado mentalmente: ~320px de ancho de pantalla bien manejable.

### 8.2 Ruta
- `/study` o `/estudiar`. Voy con `/estudiar` por consistencia con español.
- Lazy load igual que las otras páginas.
- Protegida por `ProtectedRoute` + `CareerRequiredRoute`.

---

## 9. Manejo de errores

| Caso | Comportamiento |
|---|---|
| Rate limit GitHub Models (429) | "Alcanzaste el límite gratuito de quizzes por hoy. Probá más tarde." |
| API no responde / timeout | "No pudimos generar el quiz. Reintentá." (botón retry) |
| JSON malformado (después del reintento del backend) | "Algo salió mal generando el quiz. Probá con otro tema o reintentá." |
| Usuario sin sesión (auth) | El cliente no debería llegar acá; si llega, mensaje genérico. |
| Sin internet | Spinner + timeout → mismo mensaje de "no pudimos generar". |
| Insert de sesión falla post-quiz | Mostramos resumen igual, log a consola; el XP no se actualiza esta vez. Aceptable: el usuario vio sus aciertos. |

---

## 10. Performance y costo

- **Cold start Edge Function:** ~100-500ms en Supabase free tier.
- **GitHub Models:** ~2-5 seg para 5 preguntas con gpt-4o-mini.
- **Tiempo perceptible total:** ~3-6 seg desde "Generar quiz" hasta primera pregunta. Spinner durante todo eso.
- **Costo:** $0 mientras estemos en cuota gratuita. Los límites son por hora y por día, no por mes — si los pasás, esperás.

---

## 11. Decisiones técnicas y por qué (resumen)

| # | Decisión | Razón |
|---|---|---|
| D1 | Backend = Supabase Edge Function | Ya integrado con tu auth; no agrega plataforma nueva. |
| D2 | Modelo = `gpt-4o-mini` | Mejor balance velocidad/calidad/cuota en GitHub Models. |
| D3 | JSON forzado vía `response_format` | Hace el parsing del front mucho más confiable. |
| D4 | Validación + 1 reintento en backend | Defensa contra JSON ocasionalmente roto. |
| D5 | Validación de JWT en Edge Function | Evita que cualquiera del internet queme tu cuota. |
| D6 | Tabla `user_study_sessions` (no contador) | Permite stats por materia y logros futuros. |
| D7 | XP como tercera fuente en `computeXp` | Mantiene el modelo "XP derivado del estado". |
| D8 | `useSessionsStore` leído desde `useGamification` | Mismo patrón cross-feature que ya tenemos. |
| D9 | Padding reducido en BottomNav para 5 items | Mínima fricción; alternativas peores. |

---

## 12. Lo que NO cambia
- Sistema de progreso académico (`computeCareerProgress`).
- Stores existentes (subjects, agenda, career, auth, gamification, streaks) — salvo que `useGamification` agregue una lectura más.
- Tablas existentes.
- Flujo de auth, onboarding, árbol, agenda.

---

## 13. Decisiones cerradas
1. **Modelo:** `gpt-4o-mini` vía GitHub Models.
2. **Auth en Edge Function:** validamos JWT — solo usuarios logueados pueden disparar quizzes.
3. **BottomNav:** se mantienen 5 tabs ajustando padding.

---

## UX Specification

# Study-UX-Spec.md — Correlativa
## Paso 4 (SDD) — Especificación de Experiencia: Sesiones de Estudio

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Study-Architecture.md` (aprobado).

---

## 1. Mood y principios
- **Foco total.** Una pregunta a la vez, sin distracciones. Cero ruido visual.
- **Feedback inmediato.** Cada respuesta tiene resultado al toque (verde/rojo) + explicación corta.
- **Mobile-first.** Botones grandes, contraste claro, todo navegable con el pulgar.
- **Coherencia con la estética del resto** (dark, acentos vibrantes). Sin colores nuevos.

---

## 2. Navegación

### 2.1 Nueva pestaña en `BottomNav` (quinta)
- Label: **"Estudiar"**.
- Ícono: 🧠 (cerebro), en SVG stroke matching el estilo del resto (líneas, no fill).
- Posición: entre **Agenda** y **Perfil** (`Inicio · Árbol · Agenda · Estudiar · Perfil`).

### 2.2 Ajuste técnico al `BottomNav`
- Padding por ítem: `px-4` → `px-2.5`.
- Label sigue siendo `text-xs`.
- En pantallas muy chicas (≤ 320px) sigue siendo legible; los íconos comunican aunque el label se compacte.

### 2.3 Ruta
- `/estudiar`.

---

## 3. Pantallas (state machine de la sesión)

### 3.1 Estado `picking` — elegir materia y tema

```
┌─────────────────────────────────────┐
│ Estudiar                            │
│ Generá un quiz corto de cualquier   │
│ materia con IA.                     │
│                                     │
│ MATERIA                             │
│ [ Análisis Matemático I       ▾ ]   │
│                                     │
│ TEMA O FOCO (OPCIONAL)              │
│ [ Ej: derivadas, integrales...   ]  │
│                                     │
│ [    Generar quiz       ]           │
│                                     │
│ ⓘ Las respuestas son generadas por  │
│   IA. Verificá con tu material si   │
│   tenés dudas.                      │
└─────────────────────────────────────┘
```

- **Dropdown materia:** lista todas las materias del usuario (sin filtrar por estado — se puede estudiar cualquier materia, incluso aprobadas para repaso).
- **Input tema:** texto libre, opcional. Placeholder con ejemplos.
- **Botón "Generar quiz":** primary. Deshabilitado si no se eligió materia.
- **Disclaimer IA:** chico, color `text-text-secondary`, con ícono ⓘ.
- **Empty state** (sin materias cargadas): tarjeta apuntando al árbol — "Cargá tus materias primero para poder estudiar".

### 3.2 Estado `generating` — spinner

Mientras la Edge Function llama a la IA (~3-6 seg):

```
┌─────────────────────────────────────┐
│                                     │
│            (spinner)                │
│                                     │
│       Armando tu quiz...            │
│       Esto puede tardar unos        │
│       segundos.                     │
│                                     │
└─────────────────────────────────────┘
```

- Spinner centrado, mismo estilo que `PageLoader`.
- Copy honesto sobre la espera.
- Botón "Cancelar" abajo (vuelve a estado `picking` sin completar nada).

### 3.3 Estado `playing` — una pregunta a la vez

```
┌─────────────────────────────────────┐
│ Pregunta 3 de 5         ●●●○○       │
│                                     │
│ ¿Cuál es la derivada de x²?         │
│                                     │
│ [   x                          ]    │
│ [   2x                         ]    │
│ [   x²/2                       ]    │
│ [   2                          ]    │
│                                     │
└─────────────────────────────────────┘
```

**Anatomía MC (opción múltiple):**
- Header: `Pregunta {N} de 5` + indicador visual `●●●○○`.
- Enunciado en grande, font-semibold.
- 4 opciones como botones grandes verticales (full-width), `min-height: 56px` para tap cómodo.

**Anatomía V/F:**
- Header e indicador igual.
- Enunciado igual.
- Dos botones grandes lado a lado: "Verdadero" / "Falso".

### 3.4 Estado de feedback (transición dentro de `playing`)

Cuando el usuario responde, **la opción elegida y la correcta se pintan**:
- **Correcto:** opción elegida en verde (`bg-success/20 border-success`), check ✓ a la derecha.
- **Incorrecto:** opción elegida en rojo, opción correcta también marcada en verde para enseñar.

Debajo de las opciones aparece la **explicación**:
```
✓ ¡Correcto!
La derivada de xⁿ es n·xⁿ⁻¹, por eso x² da 2x.

[   Siguiente   ]
```

o:

```
✗ Incorrecto
La derivada de xⁿ es n·xⁿ⁻¹, por eso x² da 2x.

[   Siguiente   ]
```

El botón **"Siguiente"** aparece (estaba oculto hasta responder). En la última pregunta es **"Ver resultado"**.

### 3.5 Estado `summary` — resultado

```
┌─────────────────────────────────────┐
│                                     │
│             🎯                      │
│        ¡Quiz terminado!             │
│                                     │
│         4 / 5                       │
│      respuestas correctas           │
│                                     │
│        +25 XP                       │
│                                     │
│    🔥 racha actualizada             │
│                                     │
│ [    Otra sesión      ]             │
│ [    Volver           ]             │
└─────────────────────────────────────┘
```

- **Ícono grande** representativo (🎯 normal, ⭐ si fue perfecto).
- **Score grande** centrado.
- **XP ganado:** `+25 XP` (o `+35 XP` si fue perfecto, con copy adicional "¡Quiz perfecto!").
- **Confirmación de racha:** texto breve "🔥 racha actualizada" si la sesión extendió la racha.
- **CTAs:**
  - **"Otra sesión"** (primary) → vuelve a `picking` con la materia preseleccionada.
  - **"Volver"** (ghost) → navega afuera (al Dashboard).

Si fue perfecto: pequeña animación de pulso en el ícono ⭐.

### 3.6 Estado `error` — algo falló

```
┌─────────────────────────────────────┐
│                                     │
│             ⚠️                       │
│        Algo salió mal                │
│                                     │
│   {mensaje específico del error}    │
│                                     │
│ [    Reintentar       ]             │
│ [    Volver           ]             │
└─────────────────────────────────────┘
```

Mensajes según el tipo de error (de Architecture §9):
- **Rate limit (429):** "Alcanzaste el límite gratuito de quizzes por hoy. Probá más tarde."
- **Backend / red:** "No pudimos generar tu quiz. Reintentá en un momento."
- **JSON inválido (502):** "Algo salió mal con la generación. Probá con otro tema o reintentá."

---

## 4. Animaciones (todas con Framer Motion)
- **Transición entre preguntas:** slide horizontal corto (`x: 30 → 0`, `opacity: 0 → 1`, ~200ms).
- **Feedback de opción elegida:** scale `0.95 → 1` con spring suave.
- **Aparición del feedback (explicación):** fade + altura animada.
- **Pulso del ícono ⭐ en summary perfecto:** loop suave (`scale: 1 ↔ 1.08`).

Sin overlays ni interrupciones — todo inline.

---

## 5. Edge cases de UX

### E1 — Cancelar durante la generación
Botón "Cancelar" en el estado `generating`. Vuelve a `picking` con los inputs intactos (materia y tema se conservan).

### E2 — Cerrar la app mid-quiz
El `studyStore` es en memoria. Si el usuario navega a otra tab interna, la sesión sigue al volver. Si **recarga la página**, se pierde el progreso (estado vuelve a `picking`). Aceptado: una sesión es de 3-5 minutos, no vale la pena persistirla.

### E3 — Sin materias cargadas (carrera nueva, custom sin materias)
Estado `picking` muestra empty state con CTA al árbol.

### E4 — Pregunta sin opciones / formato roto
El backend ya valida shape + reintenta. Si llega rota igual al cliente, mostramos el error de §3.6.

### E5 — Doble tap en una opción
Una vez respondida, la pregunta queda **bloqueada** (no permite cambiar). Solo el botón "Siguiente" avanza.

### E6 — Conexión cortada después de generar
Las preguntas ya están en el store. El usuario puede completar el quiz offline. **Pero el insert de la sesión completa va a fallar** (`insertSession` necesita Supabase). Mostramos el summary igual pero **no se contabiliza** XP/racha. Se loggea a consola.

### E7 — Quiz con todas correctas vs todas incorrectas
- Todas correctas → "¡Quiz perfecto!" + bonus de XP.
- Todas incorrectas → "Para la próxima 💪", sin tono punitivo. Igual suma +25 XP (lo importante es el intento).

### E8 — Cambio de materia desde "Otra sesión"
Al volver de summary con "Otra sesión", la materia queda preseleccionada (suposición razonable: querés repasar lo mismo). El tema se limpia.

---

## 6. Accesibilidad y mobile
- Tap targets ≥ 44×44 px en botones de opciones.
- Cada opción es un `<button>` con `aria-pressed` cuando se selecciona.
- En estado feedback: la respuesta correcta tiene `aria-label` extendido ("respuesta correcta").
- Contraste verde/rojo cumple WCAG AA sobre el fondo oscuro.
- Spinner en `generating` tiene `role="status"` y `aria-label="Generando quiz"`.

---

## 7. Copy (textos clave)
| Contexto | Texto |
|---|---|
| Header picking | "Estudiar" |
| Subtítulo picking | "Generá un quiz corto de cualquier materia con IA." |
| Label dropdown | "MATERIA" |
| Label input tema | "TEMA O FOCO (OPCIONAL)" |
| Placeholder tema | "Ej: derivadas, integrales..." |
| Botón generar | "Generar quiz" |
| Disclaimer IA | "Las respuestas son generadas por IA. Verificá con tu material si tenés dudas." |
| Generating | "Armando tu quiz... Esto puede tardar unos segundos." |
| Cancelar | "Cancelar" |
| Indicador progreso | "Pregunta {N} de 5" |
| Botón TF | "Verdadero" / "Falso" |
| Feedback correcto | "¡Correcto!" |
| Feedback incorrecto | "Incorrecto" |
| Botón avanzar (no última) | "Siguiente" |
| Botón avanzar (última) | "Ver resultado" |
| Header summary | "¡Quiz terminado!" |
| Score | "{N} / 5 respuestas correctas" |
| Perfecto | "¡Quiz perfecto!" |
| Racha actualizada | "🔥 racha actualizada" |
| CTA primary summary | "Otra sesión" |
| CTA secundario summary | "Volver" |
| Header error | "Algo salió mal" |
| CTA error | "Reintentar" |

---

## 8. Decisiones cerradas (de pasos previos)
- 5 preguntas por sesión.
- Tipos: opción múltiple + verdadero/falso.
- XP: +25 base, +10 si perfecto.
- BottomNav con 5 tabs ajustando padding.
- Disclaimer IA visible siempre en `picking`.

---

## 9. Decisión cerrada
**Ícono de la pestaña "Estudiar":** 🧠 cerebro, en SVG stroke style coherente con el resto del `BottomNav`.
