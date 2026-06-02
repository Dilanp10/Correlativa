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
