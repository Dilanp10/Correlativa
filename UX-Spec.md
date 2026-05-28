# UX-Spec.md — Correlativa
## Especificación de Experiencia de Usuario · v1.0

---

## 1. Principios de Diseño

Antes de cualquier pantalla, estos principios guían cada decisión de UX:

1. **El árbol es el producto.** Todo lo demás sirve para llegar a él o complementarlo. Si el árbol no funciona bien, nada importa.
2. **El progreso debe verse, sentirse.** Aprobar una materia tiene que generar una reacción visual satisfactoria.
3. **Mobile-first real.** No "que quepa en mobile", sino diseñado para touch desde cero.
4. **Cero pantallas en blanco.** Skeletons en toda carga. El usuario nunca ve un rectángulo vacío.
5. **Español argentino.** "Materia", "cursando", "aprobé", "faltan", "podés cursar". No "asignatura", "in progress", "completed".

---

## 2. Identidad Visual

### Paleta de colores

| Token | Valor | Uso |
|---|---|---|
| `bg-base` | `#0A0A0F` | Fondo principal (casi negro) |
| `bg-surface` | `#111118` | Cards, modales, paneles |
| `bg-elevated` | `#1A1A26` | Hover states, items seleccionados |
| `accent-primary` | `#6C63FF` | Acento principal (violeta eléctrico) |
| `accent-glow` | `#6C63FF33` | Glow/halo del acento |
| `success` | `#22C55E` | Materias aprobadas |
| `warning` | `#F59E0B` | Materias en curso, alertas |
| `muted` | `#3A3A4A` | Materias bloqueadas, textos secundarios |
| `text-primary` | `#F0F0FF` | Texto principal |
| `text-secondary` | `#8080A0` | Texto secundario, labels |

### Estados visuales de nodo en el árbol

| Estado | Color del nodo | Borde | Texto | Indicador |
|---|---|---|---|---|
| `bloqueada` | `bg-elevated` (#1A1A26) | `muted` (1px) | `text-secondary` | Candado pequeño |
| `disponible` | `bg-surface` | `accent-primary` (2px) | `text-primary` | Punto pulsante |
| `cursando` | `accent-glow` de fondo | `warning` (2px, animado) | `text-primary` | Anillo animado |
| `completada` | `success`/15% de fondo | `success` (2px) | `text-primary` | Check ✓ |

### Tipografía

- **Fuente:** Inter (Google Fonts) — moderna, legible en pantallas pequeñas
- **Escala:** 12 / 14 / 16 / 20 / 24 / 32px
- **Peso:** 400 (body), 500 (labels), 600 (headings), 700 (CTAs)

---

## 3. Flujos de Usuario

### 3.1 Flujo de Registro y Onboarding

```
/register
  ├── Paso 1: Datos básicos
  │     • Email
  │     • Contraseña (con confirm)
  │     • Nombre / apodo
  │     └── CTA: "Crear cuenta" → loading → Paso 2
  │
  ├── Paso 2: Tu universidad
  │     • Search input con debounce (300ms)
  │     • Lista scrollable de universidades pre-cargadas
  │     └── CTA: "Continuar" → Paso 3
  │
  ├── Paso 3: Tu carrera
  │     • Muestra universidad seleccionada (con opción de volver)
  │     • Lista de carreras de esa universidad
  │     • Opción "Mi carrera no está acá" → subflow de carrera manual
  │     └── CTA: "Ir a mi árbol" → animación de transición → /tree
  │
  └── /tree (primer acceso)
        • Árbol cargado con todos los nodos
        • Solo materias de 1er año en estado "disponible", resto "bloqueada"
        • Tooltip/coachmark: "Marcá las materias que ya aprobaste"
```

**Subflow: Carrera Manual**
```
"Mi carrera no está acá"
  ├── Input: Nombre de la carrera
  ├── Input: Cantidad de años (slider 3–7)
  ├── "Podés agregar materias después desde el árbol"
  └── CTA: "Crear carrera" → /tree con árbol vacío + empty state guiado
```

### 3.2 Flujo de Login

```
/login
  ├── Email + Contraseña
  ├── "Olvidé mi contraseña" (disabled en MVP, visible pero con tooltip "Próximamente")
  ├── "¿No tenés cuenta? Registrate" → /register
  └── CTA: "Entrar" → /dashboard o /onboarding (si no tiene carrera)
```

### 3.3 Flujo Principal: Ver el Árbol

```
/tree
  ├── Header
  │     • Logo / nombre de la carrera
  │     • Barra de progreso horizontal (% aprobadas)
  │     • Botón de perfil (avatar)
  │
  ├── Toolbar del árbol
  │     • Toggle: "Ver todo" / "Solo disponibles"
  │     • Leyenda de colores (colapsable)
  │
  ├── Canvas del árbol (ocupa el resto de la pantalla)
  │     • Nodos posicionados por año/cuatrimestre
  │     • Conexiones entre nodos (correlativas)
  │     • Pan con drag / dos dedos
  │     • Zoom con pinch o scroll
  │     • Tap en nodo → Bottom Sheet de detalle
  │
  └── Bottom nav
        • Árbol (activo)
        • Lista de materias
        • Perfil
```

### 3.4 Flujo: Cambiar Estado de una Materia

```
Tap en nodo del árbol (o item de la lista)
  │
  ▼
Bottom Sheet — Detalle de Materia
  ├── Nombre completo de la materia
  ├── Año · Cuatrimestre
  ├── Estado actual (badge de color)
  ├── [Si aprobada] Nota: X.X
  ├── Correlativas: lista de materias que la habilitaron
  ├── Desbloquea: lista de materias que esta materia habilita
  │
  └── Botón "Cambiar estado" → Modal de estado
        ├── Selector de estado (radio buttons visuales)
        │     ○ No cursada
        │     ○ Cursando
        │     ○ Regular
        │     ○ Aprobada ← si se selecciona, muestra input de nota
        │     ○ Promocionada ← si se selecciona, muestra input de nota
        │     ○ Final pendiente
        │     ○ Libre
        ├── [Si aprobada/promocionada] Input: Nota (1–10)
        └── Botones: "Cancelar" / "Guardar"
              │
              ▼ (al guardar)
              Optimistic update en árbol
              Si nueva materia disponible → animación de desbloqueo
              Snackbar: "Estado actualizado ✓"
```

### 3.5 Flujo: Lista de Materias

```
/subjects (o tab en bottom nav)
  ├── Search bar
  ├── Filtros: Todas | Disponibles | En curso | Aprobadas | Bloqueadas
  ├── Lista agrupada por año o por estado (toggle)
  │     └── Item de materia:
  │           • Nombre
  │           • Badge de estado
  │           • [Si aprobada] nota
  └── Tap en item → mismo Bottom Sheet que desde el árbol
```

### 3.6 Flujo: Perfil

```
/profile
  ├── Avatar (inicial del nombre)
  ├── Nombre · Universidad · Carrera
  ├── Stats:
  │     • % completado (barra de progreso)
  │     • X aprobadas / Y total
  │     • X disponibles para cursar ahora
  │     • Promedio: X.X
  ├── Botón "Cambiar carrera" → confirma con modal (advierte que se perderá el progreso)
  └── Botón "Cerrar sesión"
```

---

## 4. Estados de UI por Pantalla

### 4.1 /login y /register

| Estado | UI |
|---|---|
| Idle | Formulario vacío, CTA habilitado |
| Loading | CTA con spinner, campos deshabilitados |
| Error de validación | Mensaje inline bajo el campo con error |
| Error de auth | Banner rojo sobre el formulario ("Email o contraseña incorrectos") |
| Éxito | Fade out + transición a siguiente pantalla |

### 4.2 /onboarding

| Estado | UI |
|---|---|
| Paso 1 (datos) | Formulario, progress indicator "1 de 3" |
| Paso 2 (universidad) | Skeleton mientras carga lista → lista real |
| Búsqueda sin resultado | "No encontramos esa universidad. Podés escribir el nombre igual." |
| Paso 3 (carrera) | Lista filtrada por universidad, con opción de carrera manual |
| Loading entre pasos | Overlay con spinner (no bloquea percepción de progreso) |

### 4.3 /tree

| Estado | UI |
|---|---|
| Cargando | Skeleton del árbol: nodos grises placeholder en layout correcto |
| Árbol cargado (sin materias marcadas) | Todo disponibles en año 1, resto bloqueado. Coachmark visible. |
| Árbol con progreso | Nodos de colores según estado, conexiones con intensidad por estado |
| Sin carrera asignada | Redirect a /onboarding |
| Error de carga | Toast de error + botón "Reintentar" |
| Carrera con 0 materias (custom vacía) | Empty state: "Todavía no cargaste materias. Agregá la primera desde el perfil." |

### 4.4 Bottom Sheet — Detalle de Materia

| Estado | UI |
|---|---|
| Materia bloqueada | Botón "Cambiar estado" deshabilitado, tooltip "Necesitás aprobar las correlativas primero" |
| Materia disponible | Botón habilitado, lista de correlativas cumplidas con check verde |
| Guardando | Botón con spinner, sheet no cierra |
| Error al guardar | Toast de error debajo del botón, estado NO cambia en el árbol |

### 4.5 /profile

| Estado | UI |
|---|---|
| Cargando | Skeleton de avatar + stats |
| Sin materias cargadas | Stats en 0, promedio "—", mensaje motivacional |
| Confirmación "Cambiar carrera" | Modal con warning: "¿Seguro? Perderás todo tu progreso registrado en esta carrera." |
| Cerrando sesión | Spinner breve → redirect a /login |

---

## 5. Comportamiento del Árbol — Especificación Detallada

### 5.1 Layout

- Los nodos se distribuyen en una grilla de **columnas = cuatrimestres** (año 1 1C, año 1 2C, año 2 1C, ..., año 5 2C = 10 columnas)
- Dentro de cada columna, los nodos se apilan verticalmente centrados
- El espaciado entre columnas es fijo (ej: 200px desktop, 160px mobile)
- El alto de cada nodo es fijo (ej: 80px desktop, 64px mobile)

### 5.2 Nodos

Cada nodo muestra:
- **Nombre corto** de la materia (truncado con ellipsis si no entra)
- **Indicador de estado** (icono o color de borde)
- **Nota** (si aprobada/promocionada) — número pequeño en esquina

Tamaño del nodo:
- Desktop: 160px × 80px
- Mobile: 130px × 64px

### 5.3 Conexiones (edges)

- Las conexiones van de la materia prerequisito → materia desbloqueada
- Estilo: línea curva suave (bezier)
- Color según estado del prerequisito:
  - `completada` → verde suave
  - `disponible` → color acento tenue
  - `bloqueada` → gris muy tenue
- Grosor: 1.5px default, 2.5px si la materia destino está seleccionada

### 5.4 Interacciones táctiles

| Gesto | Acción |
|---|---|
| Tap en nodo | Abre Bottom Sheet de detalle |
| Tap fuera de nodo | Cierra Bottom Sheet (si abierto) |
| Drag con 1 dedo | Pan del árbol |
| Pinch | Zoom |
| Double tap | Zoom al 100% (reset) |

### 5.5 Animación de desbloqueo

Cuando el usuario aprueba una materia y esto desbloquea otras:

1. El nodo cambia de color a `completada` (250ms ease-out)
2. Pausa de 200ms
3. Los nodos que se desbloquearon "pulsan" suavemente: escalan de 1 → 1.08 → 1 (300ms)
4. Sus bordes cambian de `muted` a `accent-primary` (400ms)
5. Las conexiones hacia ellos se iluminan gradualmente (500ms)
6. Snackbar: "🔓 X materia(s) desbloqueada(s)"

Si el cambio de estado es a `cursando`:
1. El nodo cambia color a `warning` con un anillo pulsante (animación continua CSS)
2. No hay animación de desbloqueo adicional

### 5.6 Filtro "Solo disponibles"

Al activar este filtro:
- Los nodos `bloqueados` reducen opacidad a 20% y se desactivan al tap
- Los nodos `disponibles` mantienen opacidad completa y tienen un pulso sutil
- Los nodos `cursando` y `completados` mantienen opacidad al 70%
- Las conexiones entre bloqueados se ocultan (opacity 0)

### 5.7 Rendimiento

- Máximo de nodos esperado: 44 (plan UNCA) → React Flow lo maneja sin problema
- Si una carrera custom supera 60 nodos: mostrar un warning de "el árbol puede verse muy denso, considerá filtrar por año"
- No se pagina el árbol: se renderiza completo, React Flow se encarga del viewport culling

---

## 6. Edge Cases de UX

### 6.1 Cambiar estado a "bloqueada" retroactivamente

**Escenario:** El usuario marcó una materia como aprobada, y luego quiere desmarccarla (ej: la cargó por error). Otras materias pueden haberse desbloqueado como resultado.

**Comportamiento:**
- Permitir el cambio sin restricción
- Si hay materias en estado `cursando` o superior que dependen de la materia que se desmarca, mostrar un **warning modal**: "Esta materia es correlativa de [X, Y, Z]. Si la desmarcás, esas materias podrían quedar bloqueadas en el árbol (pero no perderás el progreso que cargaste en ellas)."
- El árbol recalcula estados al instante
- NO se borran automáticamente los estados de materias que quedan "inválidas" — el usuario tiene control total

### 6.2 Carrera pre-cargada con correlativas correctas vs. caso del usuario

**Escenario:** El usuario estudia Informática en UNCA pero su plan es distinto (plan 2006 vs. 2011).

**Comportamiento en v1:**
- Se muestra el plan pre-cargado (2011)
- Al final de la lista de carreras se muestra: "Si tu carrera es similar pero tiene diferencias, podés crear una versión propia."
- No hay edición de carreras pre-cargadas

### 6.3 Carrera custom sin materias

**Escenario:** El usuario creó una carrera manual y no cargó materias.

**UI:** Empty state en el árbol:
- Ícono decorativo
- Texto: "Tu carrera todavía no tiene materias."
- Botón: "Agregar primera materia" (funcionalidad v1 mínima: form básico)

### 6.4 Sin conexión a internet

**Escenario:** El usuario abre la app sin conexión.

**Comportamiento en v1:**
- Si hay datos cacheados en memoria (sesión activa, stores cargados): se muestra el árbol pero en modo lectura — cualquier intento de guardar muestra toast "Sin conexión. Los cambios se guardarán cuando vuelvas a conectarte." (el cambio NO se guarda realmente en v1, se cancela)
- Si no hay datos: pantalla de error con ícono + "Sin conexión a internet."

### 6.5 Sesión expirada

**Escenario:** El JWT del usuario expiró mientras usaba la app.

**Comportamiento:**
- Supabase JS client intenta refresh automático
- Si el refresh falla: toast "Tu sesión expiró" → redirect a /login
- El formulario de login pre-completa el email (guardado en localStorage)

### 6.6 Usuario sin materias cargadas

**Escenario:** Usuario recién registrado que aún no marcó ninguna materia.

**UI del árbol:**
- Las materias de 1er año muestran estado `disponible` (no hay correlativas que las bloqueen)
- El resto muestra `bloqueada`
- Tooltip de primer uso: "Estas son las materias que podés cursar ahora. Tocá una para actualizar tu progreso."

### 6.7 Nota inválida

**Escenario:** El usuario intenta ingresar una nota fuera del rango 1–10.

**Comportamiento:**
- Input controlado: solo acepta números entre 1 y 10
- Si se escribe algo inválido: border rojo + "La nota debe estar entre 1 y 10."
- El botón "Guardar" permanece deshabilitado hasta que la nota es válida

### 6.8 Carrera con muchas materias (>50 nodos)

**Escenario:** Un usuario crea una carrera custom con 60+ materias.

**Comportamiento:**
- El árbol renderiza todo igual
- Se muestra banner informativo: "Con muchas materias el árbol puede verse denso. Usá el filtro para ver solo las disponibles."
- No hay un límite hard en v1

---

## 7. Componentes UI Reutilizables (shared/)

| Componente | Descripción | Props clave |
|---|---|---|
| `Button` | Botón primario/secundario/ghost | `variant`, `loading`, `disabled` |
| `Input` | Input de texto con label y error | `label`, `error`, `type` |
| `Modal` | Overlay con contenido arbitrario | `isOpen`, `onClose`, `title` |
| `BottomSheet` | Panel deslizable desde abajo (mobile) | `isOpen`, `onClose`, `snapPoints` |
| `Badge` | Etiqueta de estado de materia | `status` (usa los 7 estados) |
| `Skeleton` | Placeholder de carga | `width`, `height`, `className` |
| `Toast/Snackbar` | Notificación temporal | `message`, `type`, `duration` |
| `ProgressBar` | Barra de progreso horizontal | `value` (0–100), `color` |
| `SearchInput` | Input con debounce y clear | `onSearch`, `debounce` (default 300ms) |
| `Avatar` | Avatar con inicial del nombre | `name`, `size` |

---

## 8. Navegación y Estructura

### Bottom Navigation (mobile)

```
[  🌳 Árbol  ]  [  📋 Materias  ]  [  👤 Perfil  ]
```

- Siempre visible cuando hay sesión activa y carrera configurada
- El tab activo tiene el ícono con color `accent-primary`
- Durante onboarding: NO se muestra (flujo lineal)

### Header (en todas las pantallas con sesión)

```
[Logo/Nombre carrera]  ·············  [Avatar]
```

- Tap en avatar → va a /profile
- No hay hamburger menu en v1

### Transiciones de pantalla

- Enter/exit: fade + slide sutil (300ms, Framer Motion)
- Modal/Bottom Sheet: slide up desde abajo (250ms spring)
- Animación de desbloqueo en árbol: descrita en §5.5

---

## 9. Onboarding — Detalle por Paso

### Paso 1: Crear cuenta
- Validación inline: email con formato válido, contraseña ≥ 8 caracteres
- El nombre se muestra como: "¿Cómo te llamamos?" (no "Nombre completo")
- Error de email ya registrado: "Ya existe una cuenta con ese email. ¿Querés iniciar sesión?"

### Paso 2: Tu universidad
- Búsqueda con debounce 300ms contra la lista local (no es un query a la DB en cada keystroke)
- Si hay pocas universidades (<10), se muestran todas sin necesidad de buscar
- Placeholder: "Buscá tu universidad..."

### Paso 3: Tu carrera
- Se filtran las carreras de la universidad elegida
- Si hay solo 1 carrera: se pre-selecciona automáticamente
- Opción "Mi carrera no está → crear" siempre visible al final de la lista
- Al seleccionar carrera y confirmar: transición animada hacia el árbol (la app "abre" el árbol como si fuera un mapa que se despliega)

---

## 10. Mensajes de la UI (tono y voz)

El lenguaje de Correlativa es informal, argentino, motivador.

| Situación | Mensaje |
|---|---|
| Bienvenida post-registro | "Bienvenido/a, [nombre]. Esto es tu carrera." |
| Primera vez en el árbol | "Las materias en celeste las podés cursar ahora. ¿Por cuál empezás?" |
| Materia aprobada | "¡Aprobaste [nombre]! [N] materia(s) nueva(s) desbloqueada(s)." |
| Sin materias disponibles (todo bloqueado) | "Necesitás aprobar algunas materias para desbloquear las siguientes." |
| 0% progreso | "¿Arrancar? Marcá las materias que ya aprobaste para ver tu árbol completo." |
| 100% completado | "¡Terminaste la carrera! 🎓" |
| Error genérico | "Algo salió mal. Intentá de nuevo." |
| Sin conexión | "Sin conexión. Revisá tu internet." |
| Sesión expirada | "Tu sesión venció. Volvé a iniciar sesión." |

---

*Documento pendiente de aprobación. Una vez aprobado, se avanza al Paso 5: API-Contracts.md.*
