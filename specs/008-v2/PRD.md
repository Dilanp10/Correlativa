# PRD — Correlativa v2

**Fecha:** 2026-06-05  
**Estado:** Borrador — pendiente aprobación  
**Autor:** Claude Sonnet 4.6 + Dilan Perea

---

## 1. Contexto y problema

Correlativa v1 resolvió el núcleo: árbol visual de correlativas, gestión de estados de materias e importación de plan de estudios. Los usuarios ya entienden su carrera y saben qué pueden cursar.

v2 suma dos capas de valor:

- **Realismo:** el sistema de correlativas argentino tiene una distinción que v1 ignora: algunas materias requieren tener la anterior *cursada* (regularizada) para poder *cursar*, y otras requieren tenerla *aprobada* (final rendido) para poder *rendir*. Sin esta distinción, el árbol miente.
- **Utilidad activa:** no alcanza con visualizar el progreso, el estudiante necesita herramientas para avanzar. La IA de estudio convierte la app en algo que se usa todos los días, no solo al inicio del cuatrimestre.

---

## 2. Usuarios objetivo

Los mismos de v1: estudiantes universitarios argentinos, especialmente de carreras técnicas (Ingeniería, Arquitectura, Sistemas) con planes de estudio complejos.

**Dolor específico que v2 resuelve:**
- "No sé si puedo cursar esta materia o solo puedo ir a la final."
- "Tengo que estudiar para el parcial pero no sé por dónde empezar."
- "Quiero repasar algo rápido sin abrir el apunte entero."

---

## 3. Features de v2

### Feature 1 — Correlativas con tipo (cursar vs rendir)

**Descripción:** cada correlativa entre materias ahora tiene un tipo:
- `para_cursar`: necesitás tener la materia anterior **regularizada** (cursada y aprobada la cursada) para poder inscribirte a cursar esta.
- `para_rendir`: necesitás tener la materia anterior **aprobada** (final rendido) para poder rendir el final de esta.

**Comportamiento del árbol:**
- Si una materia tiene todas sus correlativas `para_cursar` cumplidas → aparece como **disponible para cursar**.
- Si una materia tiene todas sus correlativas `para_rendir` cumplidas → aparece como **disponible para rendir el final**.
- Si no cumple ninguna → **bloqueada**.
- Se pueden mostrar dos "niveles" de desbloqueo en el nodo.

**Criterios de aceptación:**
- Al importar un plan, el usuario puede especificar el tipo de cada correlativa en el preview editable.
- El tipo se puede editar desde el detalle de cada materia.
- El árbol visual distingue visualmente "disponible para cursar" vs "disponible para rendir".
- Los estados existentes (regular, aprobada, etc.) se mapean correctamente a las nuevas reglas.

---

### Feature 2 — IA de estudio

**Descripción:** desde el detalle de cada materia, el usuario puede acceder a herramientas de estudio potenciadas por IA (Claude API).

**Sub-features:**

#### 2a. Quiz por materia
- El usuario ingresa un tema o sube texto/apuntes.
- La IA genera N preguntas de opción múltiple.
- El usuario responde y recibe feedback inmediato.
- Se guarda el historial de quizzes y el puntaje.
- (Ya existe `generate-quiz` edge function — se integra y expande.)

#### 2b. Resumen de tema
- El usuario ingresa un tema o pega texto.
- La IA genera un resumen conciso en español argentino, con los conceptos clave destacados.
- Se guarda automáticamente para que el usuario lo vuelva a leer cuando quiera desde el detalle de la materia.

#### 2c. Flashcards
- A partir de un texto o tema, la IA genera pares pregunta/respuesta.
- Interfaz de repaso tipo "voltear carta" (Framer Motion).
- El usuario marca cada flashcard como "aprendida" o "repasar".
- Se persisten en Supabase por materia.

**Criterios de aceptación:**
- Acceso desde el detalle de cualquier materia.
- Respuestas en español argentino.
- Estado de carga claro (skeleton / spinner) mientras la IA procesa.
- Manejo de errores graceful (rate limit, timeout).
- No se guarda el contenido del apunte en el servidor (solo el resultado generado).

---

## 4. Fuera de scope en v2

- Gamificación completa (XP, niveles, leaderboards).
- Notificaciones push.
- Modo colaborativo (grupos de estudio).
- OCR de imágenes escaneadas en importación PDF.
- Compartir árbol como imagen/link (queda para v3).
- Simulador de cuatrimestre.
- "¿Qué puedo cursar ahora?" como vista separada (el árbol ya lo muestra con los nuevos estados).

---

## 5. Cambios al modelo de datos

### `subject_correlatives` — nueva columna
```
type: 'para_cursar' | 'para_rendir'   -- default 'para_cursar' (backwards compat)
```

### Nuevas tablas
```
study_notes        -- resúmenes guardados por usuario+materia
flashcard_sets     -- conjuntos de flashcards por usuario+materia
flashcards         -- pares pregunta/respuesta, con estado (aprendida/repasar)
```

Los quizzes NO se persisten: son one-shot (el usuario hace el quiz, ve el resultado y listo).

---

## 6. Cambios al stack

- **GitHub Models** (ya configurado, gratis) — se reutiliza el `GITHUB_MODELS_TOKEN` existente para todas las features de IA de estudio. Modelo: `gpt-4o-mini`. Cuando la app escale al público se evalúa migrar a Claude API / OpenAI pagos.
- **Supabase Storage** — para guardar apuntes/textos que el usuario quiera reutilizar (opcional, fase tardía de v2).

---

## 7. Métricas de éxito

- Al menos el **60% de los usuarios activos** usan la IA de estudio al menos 1 vez por semana.
- El árbol con tipos de correlativas tiene **adopción del 80%** en reimportaciones (usuarios que distinguen cursar/rendir).
- **Retención D7** sube del baseline v1 (medir antes y después).
- **NPS** de la IA de estudio ≥ 7/10 en encuesta in-app.

---

## 8. Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Costos de API Claude escalan rápido | Media | Prompt caching + límite de requests por usuario/día |
| Usuarios no distinguen cursar/rendir | Baja | Tooltip explicativo + default `para_cursar` |
| Calidad del quiz depende del texto del usuario | Alta | Instrucciones claras en la UI + ejemplo de input |
| Migración de correlativas existentes | Media | Default `para_cursar` en todas, el usuario corrige opcionalmente |

---

## 9. Orden de implementación sugerido

1. Migración de base de datos (columna `type` en `subject_correlatives`)
2. Lógica de árbol con los dos tipos de desbloqueo
3. UI de edición de tipo en correlativas
4. Integración Claude API (cliente, prompt caching, manejo de errores)
5. Quiz por materia
6. Resumen de tema
7. Flashcards

---

*Pendiente aprobación antes de continuar con Architecture.md*
