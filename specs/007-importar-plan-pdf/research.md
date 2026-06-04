# Research: Importar Plan de Estudios desde PDF

Decisiones técnicas resueltas para el plan. Formato: Decisión / Razón /
Alternativas consideradas.

---

## D1 — Estrategia de procesamiento del PDF: Híbrido (unpdf + IA)

**Decisión**: En el Edge Function (Deno):
1. Recibir el PDF como binario (`ArrayBuffer`).
2. Extraer el texto con **`unpdf`** (librería de `unjs`, compatible con Deno/Edge, sin dependencias nativas). Devuelve el texto plano del PDF.
3. Enviar ese texto a **GitHub Models (gpt-4o-mini)** con un prompt estructurado que pide el JSON de materias.
4. Validar el JSON devuelto y devolverlo al cliente.

**Razón**:
- `unpdf` es la única librería de extracción de PDF que funciona bien en entornos Edge/Deno sin dependencias nativas (a diferencia de `pdf-parse` o `pdfjs-dist` completo).
- Enviar texto al modelo (no binario) es más económico en tokens, más rápido y más confiable que vision sobre el PDF.
- La IA es necesaria para estructurar los datos: el texto extraído de un PDF es desordenado y cada universidad formatea su plan distinto. Regex/heurísticas solas fallan ante variaciones menores.
- El modelo ya conoce el dominio (materias, correlativas, cuatrimestres universitarios argentinos).

**Alternativas consideradas**:
- **Solo regex/heurísticas**: demasiado frágil ante distintos formatos de PDF (UNCA vs UBA vs UTN tienen layouts muy distintos). Rechazada.
- **Enviar PDF como binario/base64 a la IA con visión**: gasta más tokens y los modelos de visión son menos precisos con tablas y texto denso que los modelos de texto. Rechazada.
- **API externa (PDF.co, Adobe Extract)**: agrega dependencia externa con costos y setup de otro secret. Rechazada por simplicidad.
- **pdf.js completo**: funciona en Deno pero el bundle es grande (~2 MB) y lento en Edge. Rechazado.

---

## D2 — Flujo de subida: On the fly (sin guardar el PDF)

**Decisión**: El PDF se envía directamente al Edge Function desde el front (como multipart/form-data). El backend lo procesa en memoria y descarta el binario. **No se guarda en Supabase Storage**.

**Razón**:
- Respeta la privacidad del usuario (no almacenamos documentos personales).
- Evita configurar un bucket de Storage con RLS (menos superficie de error).
- Un plan de estudios es un documento público de la universidad; no tiene sentido guardarlo por usuario.
- Ahorra storage (free tier tiene 1 GB, pero es mejor no consumirlo innecesariamente).

**Alternativas consideradas**:
- **Guardar en Storage para reprocesar**: útil si el procesamiento fallara frecuentemente. En esta versión, si falla, el usuario sube de nuevo. Rechazada (complejidad innecesaria en v1).

---

## D3 — Insert de materias: Edge Function con service role

**Decisión**: El Edge Function `parse-study-plan` también hace el **insert masivo** de materias en `subjects` y `subject_correlatives` usando la **service role key** de Supabase (no la anon key). El cliente no inserta directamente.

**Razón**:
- La tabla `subjects` puede tener RLS que restrinja inserts de usuarios anónimos/normales (las materias pre-cargadas las inserta el equipo, no los usuarios).
- Centralizar la escritura en el backend permite validar y sanitizar antes de persistir.
- Evita exponer lógica de inserción masiva en el cliente.
- El service role key ya existe como secret de Supabase (`SUPABASE_SERVICE_ROLE_KEY`), disponible automáticamente en Edge Functions.

**Alternativas consideradas**:
- **Insert desde el front con RLS permisiva**: requeriría abrir permisos en `subjects` para que usuarios inserten; riesgo de datos sucios. Rechazada.
- **Stored procedure (RPC)**: más limpio en teoría, pero agrega una función SQL que no se puede versionar con la misma facilidad. Rechazada por simplicidad.

---

## D4 — Tracking del banner: Derivado del estado (sin tabla nueva)

**Decisión**: El banner desaparece cuando `useSubjectsStore().userSubjects.length > 0`. **Sin columna ni tabla nueva**.

**Razón**:
- La condición "tiene materias cargadas" ya existe en el store de subjects (siempre cargado al entrar a la app). Deriva el estado directamente.
- Mismo principio que el XP, la racha de display, y los logros: todo derivado del estado real, idempotente y reversible.
- Si el usuario carga materias manualmente (no por PDF), el banner también desaparece correctamente.

**Alternativas consideradas**:
- **Columna `plan_pdf_uploaded` en `users`**: permitiría mostrar el banner incluso si el usuario borró todas sus materias. Semánticamente confuso (¿el banner es sobre el PDF o sobre tener materias?). Rechazada.

---

## D5 — Paso en onboarding: Pantalla optional post-carrera

**Decisión**: Después de que el usuario completa la selección de carrera en `OnboardingPage`, se agrega un **paso final opcional** ("¿Querés subir tu plan de estudios?") antes de entrar al Dashboard. Botones: "Subir ahora" y "Lo hago después".

**Razón**:
- El usuario está en contexto (acaba de elegir su carrera) y tiene el PDF disponible.
- Es el momento de menor fricción para onboardear con datos completos.
- "Lo hago después" navega al Dashboard donde el banner (D4) sirve de recordatorio.
- Sin pasos obligatorios nuevos (la spec lo pide en FR-011 y SC-006).

**Alternativas consideradas**:
- **Modal al entrar al Dashboard por primera vez**: más intrusivo, interrumpe la primera experiencia del Dashboard. Rechazada.
- **Solo el banner, sin paso en onboarding**: posible pero se pierde el momento ideal. Rechazada (vale la pena agregar el paso opcional).

---

## D6 — Deduplicación de materias en el insert

**Decisión**: Usar `INSERT ... ON CONFLICT DO NOTHING` sobre `(career_id, name)` para evitar duplicados si el usuario intenta importar dos veces.

**Razón**:
- Idempotente por diseño: importar el mismo PDF dos veces no genera duplicados ni errores.
- Simple de implementar y eficiente para el volumen esperado (50-100 materias).

**Alternativas consideradas**:
- **Verificar antes de insertar**: requiere un round-trip extra al DB. Más lento y más código. Rechazada.
- **Borrar y reinsertar**: destructivo si el usuario ya actualizó estados de materias. Rechazada.

---

## D7 — Tamaño máximo del PDF y límites del Edge Function

**Decisión**: Límite de **5 MB** para el PDF (el cuerpo del Edge Function de Supabase tiene un límite configurable; 5 MB es más que suficiente para cualquier plan de estudios real). El texto extraído que se manda a la IA se trunca a **50.000 caracteres** si es necesario.

**Razón**:
- Los planes de estudios universitarios argentinos raramente superan 1 MB.
- Limitar el texto enviado a la IA protege contra casos extremos (PDFs con contenido extra).
- gpt-4o-mini tiene contexto de 128K tokens; 50K caracteres está bien dentro.
