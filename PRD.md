# PRD — Correlativa
## Product Requirements Document · v1.0

---

## 1. Contexto y Problema

### El problema real

Los estudiantes universitarios argentinos enfrentan una paradoja: pasan años en la facultad sin entender realmente cómo está estructurada su carrera.

Las correlativas son un sistema opaco. Nadie te dice visualmente qué necesitás aprobar para llegar a donde querés. Los planes de estudio son PDFs ilegibles. Los alumnos descubren tarde que no pueden cursar algo porque les falta una correlativa de tercer año que nunca cursaron. Se desmotivan. Abandonan.

**El abandono universitario en Argentina supera el 50% en los primeros dos años.** Una parte importante de eso es desorientación, no falta de capacidad.

### Lo que existe hoy

- **Guaraní / SIU:** sistemas institucionales lentos, feos, no diseñados para el estudiante
- **Hojas de Excel caseras:** no tienen lógica, se desactualizan, no son visuales
- **Grupos de WhatsApp:** fuente de verdad caótica, información no estructurada
- **Nada:** la mayoría improvisa semestre a semestre

### El insight central

Si un estudiante puede **ver** su carrera como un mapa —qué aprobó, qué puede cursar ahora, qué le falta para llegar a materias clave— su relación con la facultad cambia. De perdido a orientado. De ansioso a con agencia.

---

## 2. Usuarios

### Usuario primario: El estudiante universitario argentino activo

**Perfil:**
- 18–30 años, estudiante de universidad pública o privada argentina
- Cursa entre 2 y 6 materias por cuatrimestre
- Tiene smartphone (acceso mobile es crítico)
- Está acostumbrado a apps como Duolingo, Instagram, Steam
- Probablemente frustrado con los sistemas universitarios actuales

**Jobs to be done:**
1. "Quiero saber qué materias puedo cursar este cuatrimestre."
2. "Quiero entender cuánto me falta para terminar la carrera."
3. "Quiero visualizar mi progreso para no perder el hilo."
4. "Quiero planificar qué materias priorizar para llegar más rápido a las que me interesan."

**Lo que NO es el usuario primario (v1):**
- Docentes o bedeles que cargan datos institucionales
- Administradores de universidades
- Estudiantes de posgrado o especializaciones

---

## 3. Propuesta de Valor

**Para estudiantes universitarios argentinos** que están perdidos en su carrera, **Correlativa** es un sistema de gestión de carrera universitaria que **convierte el plan de estudios opaco en un árbol visual interactivo**. A diferencia de los sistemas institucionales como Guaraní, Correlativa está diseñada para el estudiante, no para la burocracia.

### Diferenciadores clave

| Dimensión | Guaraní / SIU | Excel / Manual | **Correlativa** |
|---|---|---|---|
| Visualización | Ninguna | Estática | Árbol interactivo dinámico |
| Estados de materia | Limitados | Manual | Completos + automáticos |
| UX | Pésima | Ninguna | Diseñada como producto |
| Mobile | No | No | Mobile-first |
| Motivación | Ninguna | Ninguna | Progreso visual |
| Acceso | Institucional | Local | Web, multiplataforma |

---

## 4. Features del MVP — Criterios de Aceptación

### Feature 1: Autenticación

**Descripción:** El usuario puede crear una cuenta, iniciar sesión y cerrar sesión.

**Criterios de aceptación:**
- [ ] El usuario puede registrarse con email y contraseña
- [ ] El usuario puede iniciar sesión con email y contraseña
- [ ] El usuario puede cerrar sesión desde cualquier pantalla
- [ ] El usuario autenticado ve su contenido propio (no el de otros)
- [ ] Las rutas protegidas redirigen al login si no hay sesión activa
- [ ] Los errores de auth se muestran de forma clara (email ya registrado, contraseña incorrecta, etc.)
- [ ] El estado de sesión persiste al recargar la página

**Fuera de scope (v1):**
- OAuth con Google (puede agregarse post-MVP)
- Recuperación de contraseña (alta prioridad v1.1)
- Verificación de email

---

### Feature 2: Perfil y selección de carrera

**Descripción:** El usuario configura su perfil básico y elige su carrera universitaria.

**Criterios de aceptación:**
- [ ] El usuario ingresa su nombre al registrarse o en onboarding
- [ ] El usuario puede buscar y seleccionar su universidad de un catálogo pre-cargado
- [ ] El usuario puede buscar y seleccionar su carrera dentro de la universidad elegida
- [ ] Si su carrera no está en el catálogo, puede crearla manualmente
- [ ] El usuario puede cambiar su carrera activa desde el perfil (con confirmación de que perderá el progreso)
- [ ] El perfil muestra: nombre, universidad, carrera activa, porcentaje de avance

**Carreras pre-cargadas mínimas (v1):**
- Al menos 2 carreras completas con materias y correlativas para demostrar la feature
- Ingeniería en Informática (UNCA) — carrera del creador, datos más confiables
- Una carrera de otra universidad (a definir en Database-Spec)

---

### Feature 3: Gestión de materias

**Descripción:** El usuario puede ver todas las materias de su carrera y actualizar su estado en cada una.

**Estados posibles de una materia:**

| Estado | Significado |
|---|---|
| `no_cursada` | No la cursó todavía |
| `cursando` | La está cursando este cuatrimestre |
| `regular` | Cursó y aprobó cursada, pero le falta el final |
| `promocionada` | Aprobó sin final (promoción directa) |
| `aprobada` | Aprobó el final |
| `final_pendiente` | Tiene la regular vencida, debe rendir antes de que expire |
| `libre` | Perdió la regularidad |

**Criterios de aceptación:**
- [ ] El usuario puede ver todas las materias de su carrera organizadas (por año/cuatrimestre o por estado)
- [ ] El usuario puede cambiar el estado de cualquier materia disponible
- [ ] El sistema calcula automáticamente qué materias están "disponibles" según las correlativas aprobadas
- [ ] Una materia bloqueada no puede marcarse como cursando o aprobada (requiere correlativas)
- [ ] El usuario puede agregar una nota a cada materia (nota final obtenida, 1–10)
- [ ] Los cambios de estado se reflejan inmediatamente en el árbol (sincronización en tiempo real de la UI)

**Regla de desbloqueo (v1, simplificada):**
Una materia está disponible para cursar cuando todas sus correlativas directas tienen estado `aprobada` o `promocionada`.

---

### Feature 4: Árbol de correlativas interactivo

**Descripción:** Visualización tipo skill tree / RPG que muestra todas las materias de la carrera como nodos conectados por relaciones de correlatividad.

**Criterios de aceptación:**
- [ ] Cada materia es un nodo visual en el árbol
- [ ] Los nodos están conectados por líneas que representan correlativas (de prerequisito a desbloqueada)
- [ ] Cada nodo tiene un color / estado visual según el estado del usuario en esa materia:
  - Bloqueada: gris, opaca
  - Disponible: color primario, destacada
  - Cursando: acento animado / pulsante
  - Completada (aprobada/promocionada): color de logro, con indicador
- [ ] El usuario puede hacer tap/click en un nodo para ver detalles de la materia
- [ ] El árbol es navegable (pan + zoom en desktop, gestos en mobile)
- [ ] Al aprobar una materia, las materias que desbloquea muestran una animación de desbloqueo
- [ ] El árbol funciona correctamente en mobile (touch, viewport pequeño)
- [ ] El árbol tiene buen rendimiento con hasta 50 materias (sin lag perceptible)

**Comportamiento del árbol:**
- Layout automático basado en año/cuatrimestre o en profundidad del árbol de dependencias
- Las conexiones entre nodos son visuales y claras (no se superponen innecesariamente)
- Modo "qué puedo cursar ahora": resalta solo los nodos disponibles

---

### Feature 5: Progreso de carrera

**Descripción:** Estadísticas y visualización del avance del usuario en su carrera.

**Criterios de aceptación:**
- [ ] Se muestra el porcentaje de materias aprobadas/promocionadas sobre el total
- [ ] Se muestra cuántas materias están disponibles para cursar ahora
- [ ] Se muestra cuántas materias están en curso
- [ ] Se muestra la nota promedio (sobre materias con nota cargada)
- [ ] El progreso se actualiza inmediatamente al cambiar el estado de una materia

---

## 5. Flujo de Usuario — Onboarding

```
Registro
  └─> Ingresa email + contraseña
  └─> Ingresa nombre
  └─> Busca y selecciona universidad
  └─> Busca y selecciona carrera
      └─> Si no está → crea carrera manual (nombre + agrega materias)
  └─> Ve el árbol de su carrera (vacío / todo bloqueado excepto primer año)
  └─> Puede empezar a marcar estados de materias
```

---

## 6. Flujos de Usuario — Uso Cotidiano

### Flujo A: "¿Qué puedo cursar este cuatrimestre?"
1. Abre la app → ve el árbol
2. Activa filtro "disponibles"
3. Ve los nodos resaltados con materias que puede cursar
4. Hace tap en una → ve descripción y correlativas que la desbloquearon
5. Sale con decisión informada

### Flujo B: "Aprobé un final, quiero actualizarlo"
1. Abre la app
2. Busca la materia (en árbol o en lista)
3. Cambia estado a "aprobada", ingresa nota
4. Ve animación de desbloqueo en las materias que ahora puede cursar
5. Satisfacción garantizada

### Flujo C: "¿Cuánto me falta?"
1. Abre la app → ve el resumen de progreso en home/perfil
2. Ve: X% completado, Y materias disponibles, Z en curso
3. Puede navegar al árbol para entender qué le falta en el mapa completo

---

## 7. Métricas de Éxito (v1)

### Métricas de adopción
- Usuarios registrados en los primeros 30 días post-lanzamiento
- Porcentaje de usuarios que completan el onboarding (llegan al árbol)
- Retención D7 y D30

### Métricas de engagement
- Porcentaje de usuarios con al menos 1 materia marcada con estado
- Número promedio de materias cargadas por usuario activo
- Frecuencia de apertura semanal

### Métricas de calidad
- Tiempo promedio para completar onboarding (target: < 3 minutos)
- Tasa de error en carga de estados

### Métricas de producto (proxy de valor)
- "¿Encontraste la carrera que buscabas?" — tasa de éxito en búsqueda
- Usuarios que crean carrera manual (indica demanda de carreras no pre-cargadas)

---

## 8. Fuera de Scope — v1

Las siguientes features están explícitamente fuera del MVP. No se diseñan, no se arquitectan para ellas (salvo que sea gratis de hacer), y definitivamente no se implementan.

| Feature | Por qué fuera |
|---|---|
| Agenda inteligente | Complejidad alta, no es el core diferencial |
| IA de estudio (RAG, flashcards, quiz) | Requiere infraestructura de IA aparte |
| Gamificación completa (XP, niveles, badges) | El árbol ya gamifica visualmente; el sistema de puntos es v2 |
| Notificaciones push | Requiere backend adicional |
| Modo final de carrera / tesis | Edge case, poca frecuencia |
| Compartir árbol con otros | Social features son v2 |
| Importar datos de Guaraní | Complejidad de integración, APIs institucionales inestables |
| Multi-carrera activa | Un usuario, una carrera activa en v1 |
| OAuth Google | Puede agregarse post-MVP si hay demanda |
| App nativa (iOS/Android) | Web mobile-first primero |
| Modo offline | Supabase realtime requiere conexión; v2 con PWA cache |
| Notas de estudio / materiales | Feature de v2 (Supabase Storage) |

---

## 9. Supuestos y Riesgos

### Supuestos
- Los usuarios están dispuestos a cargar manualmente sus estados de materias (no hay integración con sistemas universitarios)
- Las carreras pre-cargadas tienen datos suficientemente correctos para dar confianza al usuario
- El árbol visual agrega valor suficiente como para justificar el esfuerzo de carga inicial

### Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Datos de carreras incorrectos / desactualizados | Alta | Alto | Permitir edición manual; mostrar disclaimer "revisá con tu facultad" |
| Árbol visualmente complejo e ilegible para carreras con 50+ materias | Media | Alto | Diseñar con filtros y zoom desde el inicio; probar con carreras reales |
| Fricción en carga inicial desmotiva al usuario | Media | Alto | Onboarding guiado, mostrar valor (árbol) antes de pedir carga de datos |
| Correlativas complejas (cursar vs rendir) no modeladas en v1 | Alta | Medio | Comunicar al usuario que es una simplificación; modelar en v2 |

---

## 10. Decisiones de Producto Tomadas

1. **Correlativas simples en v1:** Una sola relación (aprobada → desbloquea). Sin distinción cursar/rendir. Se comunicará al usuario.
2. **Una carrera activa por usuario:** Simplifica el modelo de datos y la UX. Multi-carrera es v2.
3. **Catálogo pre-cargado + manual:** Reduce fricción de onboarding sin cerrar la puerta a carreras no cubiertas.
4. **No hay rol "admin" en v1:** Los datos de carreras pre-cargadas se cargan directo en la DB. Panel admin es v2.
5. **Español argentino en toda la UI:** El producto es para argentinos. No español neutro.

---

*Documento pendiente de aprobación. Una vez aprobado, se avanza al Paso 2: Architecture.md.*
