# Study-PRD.md — Correlativa
## Paso 1 (SDD) — Documento de Producto: Sesiones de Estudio con IA

> Estado: **borrador, pendiente de aprobación.** No se avanza a Architecture hasta que esté aprobado.

---

## 1. Problema
La app hoy es excelente para **organizarse y ver el progreso** (árbol, agenda, nivel, racha), pero no ayuda a **estudiar activamente**. El estudiante tiene que ir afuera (cuaderno, PDFs, ChatGPT a mano) para repasar contenido. Falta una capa que diga: *"Sentate 5 minutos y te tomo Análisis"*.

## 2. Usuarios
Mismo de siempre: estudiante universitario argentino, mobile-first. Especialmente útil para quien quiere **repaso rápido pre-parcial**, **fijar conceptos** entre clases, o aprovechar 5 minutos muertos en el colectivo.

## 3. Propuesta de valor
Una nueva pestaña **"Estudiar"** en la app. El estudiante elige una materia, opcionalmente escribe el tema (ej: *"derivadas"*), aprieta **"Generar quiz"** y la **IA arma un quiz corto en el momento** sobre eso. Responde, ve cómo le fue, suma XP y mantiene la racha.

Es Duolingo aplicado al estudio universitario: bocados cortos, frecuentes, autogenerados, sin tener que cargar contenido a mano.

---

## 4. Decisiones cerradas (de las preguntas)
- **Núcleo:** Quiz tipo Duolingo (preguntas cortas, una atrás de otra, feedback inmediato).
- **Contenido:** generado por **IA (GitHub Models, gratis con cuota)**. Sin contenido manual del usuario en esta tanda.
- **Ubicación:** nueva pestaña en el `BottomNav`.
- **Backend:** **Supabase Edge Functions** (donde vive la API key del modelo, sin exponerla en el front).

---

## 5. Alcance funcional (mi propuesta — confirmar)

### 5.1 Flujo principal
1. Usuario entra a **Estudiar** (5° tab).
2. Elige una **materia** (dropdown de las suyas).
3. *Opcional:* escribe un **tema o foco** (texto libre, ej: *"integrales por sustitución"*). Si lo deja vacío, el quiz cubre la materia en general.
4. Toca **"Generar quiz"** → spinner mientras la IA responde (~2-5 seg).
5. Aparece el **quiz** (5 preguntas). Una por pantalla, opciones, feedback inmediato (verde/rojo + breve explicación).
6. Al terminar: pantalla de **resumen** con puntaje (`4 / 5`) + **XP ganado** + **racha extendida** si correspondía.
7. CTAs: *"Otra sesión"* (vuelve a paso 2) o *"Volver"*.

### 5.2 Tipos de ejercicio
Para mantener el alcance acotado en esta tanda:
- **Opción múltiple** (4 opciones, una correcta) → cubre la mayoría de los casos.
- **Verdadero / Falso** → más rápido, da variedad.

*Sin* preguntas abiertas (requerirían que la IA califique respuestas libres, complejidad mayor).

### 5.3 Tamaño de sesión
**5 preguntas por sesión.** Tiempo total ~3-5 minutos. Mantiene el espíritu Duolingo y respeta los límites de tokens de los modelos gratuitos.

### 5.4 Integración con gamificación y rachas
- **Completar una sesión** = acción válida → emite al `userActivityBus` → extiende la **racha** 🔥.
- **XP por sesión completada:** **+25 XP** (más que un evento de agenda, menos que aprobar una materia).
- Si todas las respuestas fueron correctas: **+10 XP de bonus** (incentivo a hacerlo bien, no solo terminar).

**Importante — separación XP vs progreso de carrera:**
El XP y el nivel son una capa **motivacional / de engagement**, completamente separada del **progreso académico de la carrera** (el `%` del Dashboard). El progreso de carrera **solo** se mueve aprobando materias reales (estados `aprobada` o `promocionada`). Hacer sesiones de estudio te da XP y mantiene la racha, pero **no altera tu porcentaje de carrera ni un poquito** — para eso hay que aprobar la materia de verdad. Esta separación es deliberada y debe mantenerse: las sesiones de estudio no son un atajo al progreso académico.

### 5.5 Persistencia
Necesitamos guardar **cuántas sesiones completó cada usuario** (para que la gamificación pueda sumar XP por ellas; XP sigue derivándose del estado, no de eventos sueltos).

Propuesta: tabla nueva `user_study_sessions` con `(user_id, subject_id, completed_at, correct_count, total_questions)`. Razones:
- Permite mostrar stats por materia en el futuro ("estudiaste Análisis 8 veces, promedio 78%").
- Mantiene la coherencia con el patrón "XP derivado del estado".
- Una sola tabla nueva, RLS estándar (own rows).

*Alternativa descartada:* contador `int` en `users`. Más simple pero pierde historial y limita gamificación futura (logros tipo "10 sesiones perfectas").

### 5.6 Inputs a la IA
Lo que el backend manda al modelo:
- Nombre de la materia (ej: *"Análisis Matemático I"*).
- Tema opcional del usuario (ej: *"derivadas"*).
- *(No mandamos información personal del usuario ni contenido propietario.)*

Lo que la IA devuelve (definido por el prompt en el Edge Function):
- Un JSON con 5 preguntas, cada una con tipo (`mc` o `tf`), enunciado, opciones, respuesta correcta y una **explicación breve** que se muestra como feedback.

---

## 6. Features y criterios de aceptación

### F1 — Pantalla "Estudiar"
- 5° tab en el `BottomNav` con ícono de libro/cerebro.
- Permite seleccionar materia, escribir tema, y generar quiz.
- Si no hay materias cargadas, muestra empty state apuntando al árbol.

### F2 — Generación del quiz vía IA
- Edge Function llamada `generate-quiz` que:
  - Recibe `{ subjectName, topic? }`.
  - Llama a GitHub Models con un prompt fijo que pide 5 preguntas en JSON.
  - Valida el JSON antes de devolverlo (defensivo).
  - Devuelve el array de preguntas al cliente.
- Maneja errores: rate limit, modelo no responde, JSON inválido → mensaje claro al usuario con CTA "Reintentar".

### F3 — Pantalla de quiz
- Una pregunta por vez con su tipo (MC o TF).
- Al responder: feedback inmediato (correcto/incorrecto + explicación breve).
- Botón "Siguiente" → avanza.
- Indicador de progreso (`3 / 5`).

### F4 — Pantalla de resumen
- Puntaje (`4 / 5 correctas`).
- XP ganado (+25 / +35 si fue perfecto).
- Mensaje según resultado (ej: *"Buena. Volvé a intentar para fijarlo."* / *"Perfecto. Subiste de nivel."* si correspondió).
- CTAs: nueva sesión / volver.

### F5 — Integración silenciosa con racha y XP
- Al completar la sesión: emite actividad (racha) + incrementa contador (XP).
- Si la sesión hace subir de nivel → el `LevelUpWatcher` ya existente dispara el overlay festivo automáticamente.

### F6 — Aviso de IA
- En la pantalla de generación, un texto chico: *"Las respuestas son generadas por IA. Verificá con tu material si tenés dudas."* Necesario para honestidad y para cubrirnos.

---

## 7. Métricas de éxito
- El usuario **completa una sesión** de punta a punta sin trabarse.
- La IA devuelve preguntas **coherentes** con la materia/tema en al menos el 80% de los casos (calidad subjetiva, evaluable manualmente).
- La latencia de generación es **≤ 8 segundos** en condiciones normales.
- Completar una sesión **siempre** dispara actualización de racha y XP.

---

## 8. Fuera de scope
- Contenido cargado manualmente por el usuario (otra tanda).
- Búsqueda de contenido en internet o scraping (otra tanda).
- Modos no-quiz (flashcards, pomodoro, etc.) — otra tanda.
- Preguntas abiertas con corrección automática.
- Dificultad ajustable, modo examen, ranking, etc.
- Notificaciones push o recordatorios para estudiar.
- Cachear quizzes generados para reusar (optimización futura si se llega al límite de cuota).

---

## 9. Costo y operación
- **GitHub Models** tiene cuota diaria gratuita (rate limit por hora y por día). Para un usuario solo probando es más que suficiente; con muchos usuarios concurrentes puede agotarse y devolver 429.
- En esa situación el backend devuelve error 429 y el frontend muestra: *"Pasaste el límite diario gratuito de quizzes. Probá de nuevo más tarde."*
- **Cero costo** mientras estemos en cuota.

---

## 10. Decisiones cerradas
1. **5 preguntas por sesión.**
2. **Tipos:** opción múltiple + verdadero/falso.
3. **XP:** +25 base, +10 bonus si todas correctas.
4. **Persistencia:** tabla nueva `user_study_sessions` (historial por materia).
5. **BottomNav con 5 ítems:** se mantiene (5 tabs). El detalle de cómo apretar padding/labels se resuelve en UX-Spec.
