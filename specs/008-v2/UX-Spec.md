# UX-Spec.md — Correlativa v2

**Fecha:** 2026-06-05
**Estado:** Borrador — pendiente aprobación
**Mobile-first.** Todo se diseña primero para 375×667 (iPhone SE) y escala para tablet/desktop.

---

## 1. Resumen de cambios visibles para el usuario

| Feature | Dónde aparece | Acción del usuario |
|---|---|---|
| Tipo de correlativa | Detalle de materia + preview de import | Tocar correlativa → switch "cursar / rendir" |
| Nuevo estado "disponible para rendir" | Árbol | Solo visualización (badge en el nodo) |
| IA de estudio | Detalle de materia | Botón "🤖 Estudiar con IA" |
| Quiz | Sheet sobre detalle | Ingresar tema → responder → ver resultado |
| Resumen | Sheet sobre detalle | Ingresar tema/texto → ver resultado → guardar |
| Flashcards | Sheet sobre detalle | Ingresar tema/texto → repasar tarjetas |

---

## 2. Feature 1 — Correlativas con tipo

### 2.1 Estados visuales del nodo en el árbol (v2)

| Estado | Color borde | Icono | Significado |
|---|---|---|---|
| `bloqueada` | gris #3A3A4A | 🔒 | No cumplís correlativas para nada |
| `disponible_cursar` | violeta accent | ✦ | Podés inscribirte a cursar |
| `disponible_rendir` | violeta accent + badge cyan "FINAL" | ✦ | Podés ir a rendir el final (sin haber cursado todavía no aplica; aplica cuando ya regularizaste) |
| `cursando` | naranja warning | ◉ | Status actual del usuario |
| `completada` | verde success | ✓ | Aprobada o promocionada |

**Caso combinado:** una materia puede estar `cursando` Y `disponible_rendir` al mismo tiempo si ya regularizó y cumple los `para_rendir`. En ese caso el color base es naranja (cursando) y aparece el badge cyan "FINAL" encima a la derecha.

### 2.2 Leyenda del árbol actualizada

```
🔒 Bloqueada    ✦ Disponible    ◉ Cursando    ✓ Completada    [FINAL] Podés rendir
```

### 2.3 Detalle de materia — sección "Correlativas"

```
┌────────────────────────────────────────┐
│ Correlativas                            │
│                                         │
│ Para cursar:                            │
│  ✓ Análisis Matemático I  [aprobada]   │
│  ⚠ Álgebra I              [cursando]   │
│                                         │
│ Para rendir el final:                   │
│  ✓ Análisis Matemático I  [aprobada]   │
│  ✗ Álgebra I              [cursando]   │
│      ↑ necesitás tenerla aprobada       │
└────────────────────────────────────────┘
```

- Si una materia no tiene correlativas de un tipo, esa sub-sección no se muestra.
- Tocar una correlativa abre el detalle de esa materia (drilldown).

### 2.4 Edición del tipo

**Desde el preview de importación PDF** (extiende lo que ya existe):

Cada correlativa que la IA detectó se muestra con un selector inline:
```
"Análisis I" requiere "Álgebra I"  [● para cursar  ○ para rendir]
```

Default: `para_cursar` (es lo más común). El usuario puede cambiarlo materia por materia, o usar "aplicar a todas las correlativas de esta materia".

**Desde el detalle de materia** (nuevo en v2):

Botón "Editar correlativas" → abre una vista de edición:
- Lista de correlativas con su tipo actual
- Toggle por correlativa
- Agregar/quitar correlativa con buscador de materias

---

## 3. Feature 2 — IA de estudio

### 3.1 Punto de entrada

En `SubjectDetailSheet`, después del bloque de notas y antes de las correlativas:

```
┌────────────────────────────────────────┐
│  🤖 Estudiar con IA                ›   │
│  Quiz, resumen y flashcards             │
└────────────────────────────────────────┘
```

Tap → abre `StudyAISheet` (sheet sobre sheet, mobile-friendly).

### 3.2 StudyAISheet — selector de modo

```
┌────────────────────────────────────────┐
│  ← Estudiar: Análisis Matemático I     │
├────────────────────────────────────────┤
│                                         │
│   ┌──────────┐ ┌──────────┐ ┌────────┐│
│   │ 📝 Quiz  │ │ 📄 Resu- │ │ 🃏 Flash││
│   │          │ │   men    │ │  cards  ││
│   └──────────┘ └──────────┘ └────────┘│
│                                         │
│   Historial reciente:                   │
│   • Resumen "Cinemática" — ayer         │
│   • Set "Integrales" — 10 tarjetas      │
│                                         │
└────────────────────────────────────────┘
```

3 cards grandes para elegir. Debajo, historial de las últimas 5 actividades (resúmenes y sets de flashcards — los quizzes no se persisten).

### 3.3 Flujo Quiz

**Paso 1 — Setup:**
```
┌────────────────────────────────────────┐
│  ← Quiz                                 │
├────────────────────────────────────────┤
│  Tema                                   │
│  ┌─────────────────────────────────┐   │
│  │ Ej: Integrales por sustitución  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Texto de referencia (opcional)         │
│  ┌─────────────────────────────────┐   │
│  │ Pegá acá un apunte o texto si   │   │
│  │ querés que las preguntas se     │   │
│  │ basen en eso.                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Cantidad de preguntas: [5] [10] [15]   │
│                                         │
│  [   Generar quiz   ]                   │
└────────────────────────────────────────┘
```

**Paso 2 — Loading:**
- Spinner + texto "Generando preguntas con IA... esto tarda unos 10-15 segundos."
- Cancelable con back.

**Paso 3 — Quiz activo:**
```
┌────────────────────────────────────────┐
│  Pregunta 3 de 10                       │
│  ━━━━━━━━░░░░░░░ 30%                    │
├────────────────────────────────────────┤
│                                         │
│  ¿Cuál es la integral de cos(x)?       │
│                                         │
│  ◯ -sin(x) + C                          │
│  ◯ sin(x) + C                           │
│  ◯ -cos(x) + C                          │
│  ◯ tan(x) + C                           │
│                                         │
│  [    Responder    ]                    │
└────────────────────────────────────────┘
```

Al responder: la opción correcta se pone verde, la incorrecta del usuario en rojo. Aparece explicación corta debajo. Botón "Siguiente".

**Paso 4 — Resultado:**
```
┌────────────────────────────────────────┐
│           🎯 8 de 10                    │
│         ¡Muy bien!                      │
├────────────────────────────────────────┤
│  Tema: Integrales                       │
│  Tiempo: 4m 23s                         │
│                                         │
│  [  Revisar respuestas  ]               │
│  [  Hacer otro quiz     ]               │
│  [  Volver               ]              │
└────────────────────────────────────────┘
```

Animación: confetti de Framer Motion si score ≥ 70%, calm si <70%.

### 3.4 Flujo Resumen

**Paso 1 — Setup:**
```
┌────────────────────────────────────────┐
│  ← Resumen                              │
├────────────────────────────────────────┤
│  Tema                                   │
│  [ Ej: Leyes de Newton           ]      │
│                                         │
│  Texto a resumir (recomendado)          │
│  ┌─────────────────────────────────┐   │
│  │ Pegá el contenido que querés    │   │
│  │ que la IA resuma...             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [   Generar resumen   ]                │
└────────────────────────────────────────┘
```

**Paso 2 — Resultado:**
```
┌────────────────────────────────────────┐
│  ← Resumen: Leyes de Newton             │
├────────────────────────────────────────┤
│                                         │
│  📌 Puntos clave                        │
│  • Primera ley: inercia                 │
│  • Segunda ley: F = ma                  │
│  • Tercera ley: acción y reacción       │
│                                         │
│  Contenido                              │
│  Las tres leyes de Newton son los       │
│  fundamentos de la mecánica clásica...  │
│                                         │
│  [   🔄 Regenerar          ]            │
│  [   ← Volver               ]           │
└────────────────────────────────────────┘
```

El resumen se guarda automáticamente al generarse. Aparece después en el detalle de la materia bajo "Mis resúmenes". Si el usuario regenera, se reemplaza el último. Puede borrar resúmenes viejos manualmente.

### 3.5 Flujo Flashcards

**Paso 1 — Setup:**
Idéntico a Resumen, pero con un slider "Cantidad: 5–20".

**Paso 2 — Repaso:**
```
┌────────────────────────────────────────┐
│  Tarjeta 3 de 10                        │
│  ━━━━━━━━░░░░░░░ 30%                    │
├────────────────────────────────────────┤
│                                         │
│                                         │
│      ¿Qué es la primera ley             │
│            de Newton?                   │
│                                         │
│         (tocá para ver)                 │
│                                         │
│                                         │
│  [  📚 Repasar  ]   [  ✓ Aprendida  ]   │
└────────────────────────────────────────┘
```

Tap en la tarjeta → flip animado (Framer Motion, 0.4s) → muestra respuesta.

Después de marcar "Repasar" o "Aprendida" → siguiente tarjeta automáticamente.

**Paso 3 — Fin del repaso:**
```
┌────────────────────────────────────────┐
│              🎉                          │
│        ¡Terminaste el set!              │
├────────────────────────────────────────┤
│  Aprendidas:  7                         │
│  A repasar:   3                         │
│                                         │
│  [  Repasar las 3 pendientes  ]         │
│  [  Volver                     ]        │
└────────────────────────────────────────┘
```

Las tarjetas marcadas "Repasar" quedan disponibles para una próxima sesión (se filtran por `status = 'repasar'`).

---

## 4. Estados de error y edge cases

### 4.1 IA falla / rate limit

```
⚠️ La IA no pudo procesar tu pedido ahora.
Probá de nuevo en unos minutos.

[  Reintentar  ]
```

Si es rate limit específico: mensaje "Alcanzamos el límite gratuito. Esperá unos minutos."

### 4.2 Tema vacío

Botón "Generar" deshabilitado hasta que el tema tenga ≥ 3 caracteres.

### 4.3 Texto demasiado largo

Si el usuario pega más de ~10.000 caracteres: mensaje inline "Es mucho texto, vamos a usar los primeros 10.000 caracteres". No bloquea.

### 4.4 Sin conexión

Toast: "Necesitás conexión para usar la IA de estudio."

### 4.5 Quiz sin respuesta seleccionada

Botón "Responder" deshabilitado.

### 4.6 Salir del quiz a mitad

Si el usuario toca back o cierra el sheet con el quiz en progreso:
- Modal de confirmación: "¿Salir del quiz? Se pierde tu progreso (los quizzes no se guardan)."
- Botones: "Salir" / "Continuar"

---

## 5. Comportamiento del árbol con tipos (detalles)

### 5.1 Click en nodo

Igual que v1: abre `SubjectDetailSheet`. La diferencia es que el sheet ahora muestra las correlativas separadas por tipo.

### 5.2 Hover/long-press en correlativas faltantes

Tooltip que explica qué falta:
> "Falta aprobar Álgebra I para poder rendir el final"

### 5.3 Animación de desbloqueo

Cuando el usuario marca una materia como `aprobada` y eso desbloquea otra:
- La nueva materia disponible hace un pulse de 1s (Framer Motion scale 1 → 1.05 → 1)
- Toast: "🎉 ¡Desbloqueaste Análisis II!"

---

## 6. Persistencia y sync

Solo persistimos lo que el usuario va a volver a leer/usar. Los quizzes son one-shot (los hace, ve el resultado y listo).

| Acción | Cuándo se guarda |
|---|---|
| Cambiar tipo de correlativa | Inmediato (optimistic UI + UPDATE) |
| Generar resumen | Inmediato al generar (queda disponible para releer) |
| Borrar resumen | Botón explícito en el detalle de materia |
| Generar quiz | **No se persiste.** Vive solo en pantalla. |
| Generar flashcards | Inmediato al generar (es lo que el usuario va a repasar) |
| Marcar flashcard | Optimistic UI + UPDATE inmediato |

---

## 7. Accesibilidad

- Todos los botones tienen `aria-label` cuando son icon-only.
- Las cards de selección de modo (Quiz/Resumen/Flashcards) son `<button>` con label completo.
- El flip de flashcard es accesible: aparte del tap, hay un botón "Voltear" debajo para usuarios con dificultad motora.
- Contraste mínimo AA en todos los textos (verificado contra paleta del tema).

---

## 8. Responsive

- Mobile (≤ 640px): sheets full-height, tarjetas apiladas.
- Tablet (640–1024px): sheets centrados con max-width 600px.
- Desktop (> 1024px): sheets como modales centrados, max-width 700px. El árbol aprovecha el ancho extra.

---

## 9. Tono y copy

- Español argentino, voseo, informal pero claro.
- Mensajes de error con tono empático ("La IA no pudo procesar ahora" en vez de "Error 500").
- Celebraciones cortas y genuinas ("¡Muy bien!", "🎉 ¡Desbloqueaste...").
- Nunca tecnicismos en mensajes al usuario (no decir "JWT", "rate limit", "token").

---

## 10. Microinteracciones obligatorias

| Dónde | Qué |
|---|---|
| Generar contenido con IA | Spinner + texto del paso actual |
| Responder pregunta correcta | Verde con micro-bounce |
| Responder pregunta incorrecta | Rojo con shake sutil |
| Voltear flashcard | Flip 3D Framer Motion |
| Score ≥ 70% en quiz | Confetti |
| Desbloquear materia | Pulse + toast |

---

*Pendiente aprobación antes de continuar con API-Contracts.md*
