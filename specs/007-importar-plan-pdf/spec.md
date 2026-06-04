# Feature Specification: Importar Plan de Estudios desde PDF

**Feature Branch**: `007-importar-plan-pdf`
**Created**: 2026-06-03
**Status**: Draft
**Input**: El estudiante sube el PDF oficial de su plan de estudios y la app lo procesa para cargar automáticamente todas las materias con sus datos (año, cuatrimestre, correlativas).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cargar materias desde el PDF (Priority: P1)

Como estudiante que acaba de elegir su carrera, quiero subir el PDF oficial
de mi plan de estudios para que la app cargue todas mis materias
automáticamente, sin tener que escribirlas una por una.

**Why this priority**: Es el corazón de la feature y el MVP. Sin el
procesamiento del PDF el resto no tiene sentido. Una vez que esto funciona, el
estudiante tiene su árbol de correlativas completo en segundos en lugar de
tardar 20-30 minutos cargando a mano.

**Independent Test**: Se puede probar subiendo el PDF del plan de estudios,
confirmando las materias detectadas, y verificando que aparecen en el árbol de
correlativas.

**Acceptance Scenarios**:

1. **Given** un usuario con carrera activa y sin materias cargadas, **When**
   sube el PDF de su plan de estudios y confirma, **Then** las materias
   aparecen en su árbol de correlativas con los datos correctos (nombre, año,
   cuatrimestre, correlativas).
2. **Given** un usuario que subió un PDF válido, **When** el procesamiento
   termina, **Then** ve una lista con todas las materias detectadas antes de
   confirmar (no se carga nada sin su aprobación explícita).
3. **Given** un usuario que sube un PDF que no puede ser procesado
   correctamente, **When** el sistema falla, **Then** ve un mensaje claro
   explicando qué pasó y puede intentarlo de nuevo o cargar las materias a
   mano.

---

### User Story 2 - Banner en Dashboard invitando a subir el PDF (Priority: P2)

Como estudiante con carrera activa pero sin materias cargadas, quiero ver un
aviso en la pantalla principal que me invite a subir mi plan de estudios, para
no perder esa funcionalidad aunque haya saltado el onboarding.

**Why this priority**: Asegura que el usuario descubra la feature incluso si
no la usó al registrarse. Depende de que el procesamiento (P1) ya exista.

**Independent Test**: Se puede probar entrando al Dashboard con un usuario sin
materias cargadas y verificando que el banner aparece; luego cargar materias y
verificar que el banner desaparece definitivamente.

**Acceptance Scenarios**:

1. **Given** un usuario con carrera activa y sin materias cargadas, **When**
   entra al Dashboard, **Then** ve un banner/card invitándolo a subir su plan
   de estudios.
2. **Given** un usuario que cargó sus materias (por PDF o manualmente), **When**
   entra al Dashboard, **Then** el banner NO aparece (ni ahora ni en futuras
   sesiones).
3. **Given** un usuario que ve el banner, **When** toca "Subir plan de
   estudios", **Then** navega directamente a la pantalla de carga del PDF.
4. **Given** un usuario que ve el banner y lo descarta sin subir nada, **When**
   vuelve al Dashboard en una sesión futura sin materias, **Then** el banner
   vuelve a aparecer (no se descarta para siempre; solo desaparece al tener
   materias cargadas).

---

### User Story 3 - Oferta al completar el onboarding (Priority: P3)

Como estudiante que acaba de elegir su carrera por primera vez, quiero que la
app me ofrezca subir mi plan de estudios justo después del setup inicial, para
arrancar con todas mis materias desde el primer momento.

**Why this priority**: Reduce la fricción de onboarding; el PDF está disponible
en ese momento. Pero es un refinamiento sobre el banner (P2), que ya cubre el
caso de usuarios que se saltean este paso.

**Independent Test**: Se puede probar creando una cuenta nueva, completando la
selección de carrera, y verificando que aparece la opción de subir el PDF antes
de entrar al Dashboard.

**Acceptance Scenarios**:

1. **Given** un usuario que acaba de completar la selección de carrera, **When**
   termina ese paso, **Then** ve una pantalla/modal ofreciéndole subir el PDF
   con un botón "Subir ahora" y uno "Hacerlo más tarde".
2. **Given** un usuario que elige "Hacerlo más tarde", **When** pasa al
   Dashboard, **Then** ve el banner (P2) como recordatorio.
3. **Given** un usuario que ya tiene materias cargadas y elige cambiar de
   carrera, **When** completa el cambio, **Then** NO se vuelve a ofrecer el
   PDF si la nueva carrera ya tiene materias (evitar confusión).

---

### Edge Cases

- **PDF ilegible o protegido con contraseña**: el sistema informa que no puede
  procesarlo y sugiere subir otro.
- **PDF que no es un plan de estudios**: el sistema detecta que no encontró
  materias y lo comunica claramente, sin cargar nada.
- **Extracción parcial**: si se detectan algunas materias pero otras no se
  pudieron leer, se muestra lo que sí se encontró y se advierte que puede
  haber materias faltantes.
- **Usuario con materias ya cargadas**: si ya tiene materias, el banner no
  aparece. Si intenta subir el PDF de todas formas (desde ajustes), se le
  advierte que ya tiene materias y se le pregunta si quiere reemplazar o
  agregar.
- **Conexión lenta o timeout**: si el procesamiento tarda más de lo esperado,
  el sistema informa que está tardando más de lo normal y permite cancelar.
- **PDF muy grande**: si el archivo supera el tamaño máximo aceptado, se
  informa con un mensaje claro antes de intentar subirlo.
- **Correlativas no reconocidas**: si una materia menciona una correlativa cuyo
  nombre no coincide exactamente con otra materia detectada, se carga igual y
  se marca la correlativa como "pendiente de confirmar".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir al usuario seleccionar y subir un
  archivo PDF desde su dispositivo.
- **FR-002**: El sistema MUST procesar el PDF y extraer las materias con al
  menos: nombre, año, cuatrimestre y correlativas.
- **FR-003**: El sistema MUST mostrar al usuario las materias detectadas antes
  de confirmar la carga; el usuario MUST poder revisar el listado.
- **FR-004**: El sistema MUST permitir al usuario confirmar la carga de todas
  las materias detectadas con una sola acción.
- **FR-005**: Al confirmar, las materias MUST quedar disponibles en el árbol de
  correlativas del usuario.
- **FR-006**: El sistema MUST mostrar un indicador de progreso durante el
  procesamiento del PDF.
- **FR-007**: Si el procesamiento falla total o parcialmente, el sistema MUST
  informar claramente qué ocurrió y ofrecer alternativas (reintentar o cargar
  manualmente).
- **FR-008**: El Dashboard MUST mostrar un banner/card invitando a subir el
  plan de estudios cuando el usuario tiene carrera activa pero sin materias
  cargadas.
- **FR-009**: El banner MUST desaparecer definitivamente una vez que el usuario
  tiene al menos una materia cargada (por PDF o manualmente).
- **FR-010**: Al completar la selección de carrera por primera vez, el sistema
  MUST ofrecer la opción de subir el PDF antes de ingresar al Dashboard.
- **FR-011**: El usuario MUST poder saltear la carga del PDF en cualquier
  momento del flujo (onboarding y banner) sin consecuencias negativas.
- **FR-012**: El sistema MUST rechazar archivos que no sean PDF e informar al
  usuario el formato requerido.
- **FR-013**: Si la extracción es parcial, el sistema MUST advertir que pueden
  faltar materias y sugerir revisar el árbol.

### Key Entities

- **PlanDePDF**: el archivo subido por el usuario. Atributos: nombre del
  archivo, estado del procesamiento (procesando / completado / fallido).
- **MateriaDetectada**: materia extraída del PDF antes de confirmar. Atributos:
  nombre, año, cuatrimestre, lista de nombres de correlativas (como texto,
  antes de resolverse).
- **EstadoCargaPlan**: bandera que indica si el usuario ya procesó un PDF
  o ya tiene materias cargadas. Determina si se muestra el banner.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede pasar de cero materias a tener su carrera
  completa cargada en menos de 2 minutos subiendo el PDF.
- **SC-002**: En el 100% de los casos, ninguna materia se carga sin la
  confirmación explícita del usuario.
- **SC-003**: El banner del Dashboard desaparece permanentemente una vez que el
  usuario tiene materias cargadas, en el 100% de los casos.
- **SC-004**: Si el PDF no puede procesarse, el usuario siempre recibe un
  mensaje de error entendible con una alternativa disponible.
- **SC-005**: La pantalla de revisión de materias detectadas es legible y
  navegable en un celular (mobile-first).
- **SC-006**: El flujo de onboarding con PDF no agrega más de 1 paso extra
  obligatorio al setup inicial (es siempre opcional).

## Assumptions

- **Formato del PDF**: se asume que los planes de estudios universitarios
  argentinos tienen suficiente estructura textual (no son imágenes escaneadas)
  como para extraer texto y datos. PDFs escaneados sin OCR quedan fuera de
  scope.
- **Idioma del PDF**: se asume español (los planes de estudio de universidades
  nacionales argentinas están en español).
- **Carrera ya elegida**: el usuario siempre tiene una carrera activa antes de
  poder usar esta feature; el sistema no infiere la carrera desde el PDF.
- **Tamaño máximo del PDF**: se asume un límite razonable (ej: 10 MB); la gran
  mayoría de los planes de estudio pesan menos de 2 MB.
- **Sin edición materia por materia**: en esta versión el usuario puede
  confirmar o cancelar el lote completo, no editar cada materia individualmente
  antes de confirmar (eso se puede hacer en el árbol después).
- **Una sola carga por carrera**: si el usuario ya cargó materias y sube un PDF
  de vuelta, se le advierte y puede decidir; no es un flujo automático de
  "actualización".
