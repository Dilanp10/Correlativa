# Implementation-Plan.md — Correlativa
## Plan de Implementación MVP · v1.0

---

## Regla de oro

**No se empieza una fase hasta que la anterior esté completa y funcionando.**
Cada tarea tiene criterios de "done" concretos y verificables. Si un criterio no se cumple, la tarea no está terminada.

---

## Fase 0 — Setup del Proyecto

### 0.1 Inicializar repo y stack

**Tareas:**
- [ ] `npm create vite@latest correlativa -- --template react-ts`
- [ ] Instalar dependencias: `tailwindcss`, `framer-motion`, `zustand`, `react-router-dom`, `@supabase/supabase-js`, `reactflow`
- [ ] Instalar devDependencies: `eslint`, `prettier`, `vitest`, `@types/node`
- [ ] Configurar TailwindCSS con `tailwind.config.ts` (colores y tokens del UX-Spec)
- [ ] Configurar ESLint + Prettier con reglas base
- [ ] Crear estructura de carpetas según Architecture.md
- [ ] Crear `.env.local` con variables de Supabase (no commitear)
- [ ] Crear `.env.example` con las variables sin valores
- [ ] Setup de `src/shared/lib/supabase/client.ts`
- [ ] Commit inicial: "chore: setup inicial del proyecto"

**Criterios de done:**
- `npm run dev` levanta la app sin errores
- `npm run build` compila sin errores TypeScript
- Tailwind funciona (un `className="text-white"` se aplica)
- El cliente de Supabase se puede importar sin errores

**Dependencias:** ninguna

---

### 0.2 Supabase — Base de datos

**Tareas:**
- [ ] Crear proyecto en Supabase Cloud
- [ ] Copiar URL y anon key al `.env.local`
- [ ] Ejecutar migración inicial (de `Database-Spec.md`) en el SQL Editor de Supabase
- [ ] Ejecutar seed de universidades (incluido en la migración)
- [ ] Ejecutar seed `seeds/unca-informatica.sql`
- [ ] Verificar RLS: desde el Dashboard, confirmar que las políticas están activas
- [ ] Generar tipos TypeScript: `npx supabase gen types typescript --project-id <id> > src/shared/lib/supabase/types.ts`

**Criterios de done:**
- Las 6 tablas existen en Supabase con los constraints correctos
- El trigger `handle_new_user` existe y está activo
- El seed de UNCA Informática tiene 44 materias y las correlativas correctas (verificar en Table Editor)
- El archivo `types.ts` generado contiene los tipos de las 6 tablas
- RLS activo en todas las tablas (verificar en Authentication → Policies)

**Dependencias:** 0.1

---

## Fase 1 — Autenticación

### 1.1 Auth store y cliente

**Tareas:**
- [ ] Crear `src/features/auth/store/authStore.ts` (Zustand) con: `user`, `session`, `isLoading`, `setUser`, `setSession`
- [ ] Crear `src/shared/lib/supabase/auth.ts` con: `signUp`, `signIn`, `signOut`
- [ ] Crear `src/features/auth/hooks/useAuth.ts` que expone el store y las funciones
- [ ] Setup de `onAuthStateChange` en `App.tsx` para sincronizar la sesión al cargar

**Criterios de done:**
- El store se inicializa en `null` y actualiza cuando hay sesión
- `onAuthStateChange` detecta sesiones existentes al recargar la página (persistencia)
- TypeScript sin errores en todos los archivos

**Dependencias:** 0.1, 0.2

---

### 1.2 Pantallas de Login y Registro

**Tareas:**
- [ ] Crear `LoginPage.tsx` con formulario (email + password)
- [ ] Crear `RegisterPage.tsx` con formulario (email + password + nombre)
- [ ] Crear componente `Input` en `shared/components/` con label y manejo de error
- [ ] Crear componente `Button` en `shared/components/` con estado `loading`
- [ ] Integrar `useAuth` en ambas pantallas
- [ ] Mostrar errores de auth bajo el formulario (parseSupabaseError)
- [ ] Link cruzado: "¿Ya tenés cuenta? Iniciá sesión" / "¿No tenés cuenta? Registrate"

**Criterios de done:**
- El usuario puede registrarse con email/password/nombre
- El usuario puede iniciar sesión con email/password
- Los errores se muestran en español ("Email o contraseña incorrectos.")
- Loading state activo mientras se espera respuesta
- Al hacer signUp exitoso, el trigger crea una fila en `users` (verificar en Supabase)

**Dependencias:** 1.1

---

### 1.3 Routing con guards

**Tareas:**
- [ ] Configurar React Router en `App.tsx` con las rutas del UX-Spec
- [ ] Crear `ProtectedRoute`: redirige a `/login` si no hay sesión
- [ ] Crear `CareerRequiredRoute`: redirige a `/onboarding` si no hay `active_career_id`
- [ ] Crear `PublicOnlyRoute`: redirige a `/dashboard` si ya hay sesión (para login/register)
- [ ] Aplicar guards a todas las rutas
- [ ] Crear páginas placeholder vacías para `/dashboard`, `/tree`, `/onboarding`, `/profile`

**Criterios de done:**
- Sin sesión: `/tree` redirige a `/login`
- Con sesión pero sin carrera: `/tree` redirige a `/onboarding`
- Con sesión y carrera: `/login` redirige a `/dashboard`
- El botón de cerrar sesión en cualquier pantalla funciona y redirige a `/login`

**Dependencias:** 1.2

---

## Fase 2 — Onboarding y Perfil de Carrera

### 2.1 Selector de universidad y carrera

**Tareas:**
- [ ] Crear `src/features/career/hooks/useUniversities.ts` — fetch de universidades
- [ ] Crear `src/features/career/hooks/useCareer.ts` — fetch y creación de carreras
- [ ] Crear `src/features/career/store/careerStore.ts` — `university`, `activeCareer`
- [ ] Crear componente `SearchInput` en `shared/components/` con debounce
- [ ] Crear `OnboardingPage.tsx` con 3 pasos (datos → universidad → carrera)
- [ ] Paso 1: campos nombre (pre-poblado desde auth metadata), sin reingreso de email/password
- [ ] Paso 2: lista de universidades con búsqueda
- [ ] Paso 3: lista de carreras de la universidad, opción "crear manual"
- [ ] Al confirmar carrera: `updateUserProfile({ active_career_id })` + redirigir a `/tree`

**Criterios de done:**
- El usuario puede completar el onboarding en menos de 2 minutos
- La universidad y carrera se persisten en `users.active_career_id`
- Al recargar, el usuario con carrera ya asignada NO vuelve a ver el onboarding
- La búsqueda de universidades funciona con debounce (no spamea requests)

**Dependencias:** 1.3

---

### 2.2 Creación de carrera manual (básica)

**Tareas:**
- [ ] Subflow en el onboarding: formulario con nombre de carrera + cantidad de años
- [ ] Crear la carrera con `createCustomCareer`
- [ ] Asignar como `active_career_id`
- [ ] Redirigir al árbol (que mostrará empty state)

**Criterios de done:**
- La carrera custom se crea en la DB con `is_custom = true` y `created_by = userId`
- RLS permite que solo el creador la vea

**Dependencias:** 2.1

---

## Fase 3 — Materias y Estado del Usuario

### 3.1 Carga de materias y correlativas

**Tareas:**
- [ ] Crear `src/features/subjects/hooks/useSubjects.ts` — `getSubjectsWithCorrelatives`
- [ ] Crear `src/features/subjects/hooks/useUserSubjects.ts` — `getUserSubjects` y `upsertUserSubject`
- [ ] Crear `src/features/subjects/store/subjectsStore.ts` con: `subjects`, `correlatives`, `userSubjects`, `computedStates`
- [ ] Implementar `computeTreeStates` en el store (función pura del API-Contracts)
- [ ] Implementar `computeCareerProgress`
- [ ] `computedStates` se recalcula automáticamente con Zustand al cambiar `userSubjects`

**Criterios de done:**
- Las 44 materias de UNCA Informática se cargan correctamente
- `computeTreeStates` retorna `disponible` para materias de 1er año (sin correlativas) y `bloqueada` para el resto
- Al aprobar una materia en la DB y recargar, las materias desbloqueadas cambian a `disponible`
- TypeScript sin `any`

**Dependencias:** 2.1

---

### 3.2 Lista de materias

**Tareas:**
- [ ] Crear `SubjectsPage.tsx` (tab de lista)
- [ ] Crear componente `SubjectCard` — muestra nombre, estado, nota
- [ ] Crear componente `Badge` con los 7 estados y sus colores
- [ ] Filtros: Todas | Disponibles | En curso | Aprobadas | Bloqueadas
- [ ] Agrupación por año (default) con headers "1° Año", "2° Año", etc.
- [ ] Skeletons durante la carga

**Criterios de done:**
- La lista muestra todas las materias de la carrera activa
- Los filtros funcionan correctamente
- Los skeletons aparecen mientras carga y desaparecen cuando hay datos
- La lista se actualiza inmediatamente al cambiar el estado de una materia

**Dependencias:** 3.1

---

### 3.3 Bottom Sheet de detalle y cambio de estado

**Tareas:**
- [ ] Crear componente `BottomSheet` en `shared/components/` (slide desde abajo, Framer Motion)
- [ ] Crear `SubjectDetailSheet` con: nombre, año/cuatrimestre, estado, correlativas, "desbloquea"
- [ ] Crear `SubjectStatusModal` con: selector visual de estado + input de nota
- [ ] Integrar optimistic update + rollback (patrón del API-Contracts)
- [ ] Animación de transición del estado en el nodo después de guardar
- [ ] Mostrar `getNewlyUnlocked` → snackbar con materias desbloqueadas
- [ ] Validación de nota (1–10, numérico)
- [ ] Botón "Cambiar estado" deshabilitado para materias bloqueadas + tooltip

**Criterios de done:**
- Cambiar el estado de una materia persiste en Supabase
- El árbol/lista se actualiza instantáneamente (optimistic)
- Si el request falla, el estado vuelve al anterior (rollback)
- Si se aprueba una materia y desbloquea otras, aparece el snackbar
- La nota solo se solicita para `aprobada` y `promocionada`

**Dependencias:** 3.2

---

## Fase 4 — Árbol de Correlativas

### 4.1 Setup de React Flow y nodos base

**Tareas:**
- [ ] Instalar y configurar `reactflow` (ya en dependencies)
- [ ] Crear `src/features/tree/hooks/useTreeLayout.ts` — transforma `SubjectWithCorrelatives[]` en nodos y edges de React Flow
- [ ] Calcular posiciones: `x = cuatrimestre * COLUMN_WIDTH`, `y = index_en_columna * ROW_HEIGHT`
- [ ] Crear `TreeNode` custom (componente React) con diseño del UX-Spec
- [ ] Crear `TreeEdge` custom con colores por estado
- [ ] Crear `TreeCanvas` que renderiza el `ReactFlow` con pan/zoom habilitado
- [ ] Integrar `computedStates` del store para colorear los nodos

**Criterios de done:**
- El árbol renderiza las 44 materias de UNCA en el layout correcto (columnas por cuatrimestre)
- Los nodos tienen el color correcto según el estado del usuario
- Las conexiones (edges) conectan las materias según `subject_correlatives`
- Pan y zoom funcionan en desktop y mobile (touch)
- No hay lag perceptible con 44 nodos

**Dependencias:** 3.1

---

### 4.2 Interacciones del árbol

**Tareas:**
- [ ] Tap/click en nodo → abre `SubjectDetailSheet` (el mismo de la lista)
- [ ] Toggle "Solo disponibles" → filtra nodos con opacidad (UX-Spec §5.6)
- [ ] Animación de desbloqueo al aprobar una materia (UX-Spec §5.5)
- [ ] Leyenda de colores (colapsable, esquina del árbol)
- [ ] Coachmark de primer uso (localStorage para no mostrarlo dos veces)

**Criterios de done:**
- Tap en nodo abre el detail sheet con los datos correctos
- El filtro "solo disponibles" funciona visualmente
- La animación de desbloqueo se dispara al cambiar estado a aprobada/promocionada
- El coachmark se muestra solo la primera vez

**Dependencias:** 4.1, 3.3

---

## Fase 5 — Dashboard y Perfil

### 5.1 Dashboard

**Tareas:**
- [ ] Crear `DashboardPage.tsx` — pantalla de inicio post-login
- [ ] Mostrar: nombre del usuario, carrera activa, progreso (% + barra)
- [ ] Cards de stats: aprobadas, disponibles, en curso, promedio
- [ ] Botón "Ir al árbol" como CTA principal
- [ ] Skeletons durante la carga

**Criterios de done:**
- Los stats son correctos y coinciden con `computeCareerProgress`
- La pantalla carga en menos de 2 segundos en conexión normal

**Dependencias:** 3.1

---

### 5.2 Perfil

**Tareas:**
- [ ] Crear `ProfilePage.tsx`
- [ ] Mostrar: avatar (inicial del nombre), nombre, universidad, carrera
- [ ] Mostrar stats de progreso (mismo que dashboard pero más detallado)
- [ ] Botón "Cambiar carrera" con modal de confirmación (warning de pérdida de progreso)
- [ ] Al confirmar: limpiar `active_career_id` + redirigir a `/onboarding`
- [ ] Botón "Cerrar sesión"

**Criterios de done:**
- El usuario puede cerrar sesión y volver a iniciar sesión correctamente
- Al cambiar carrera y confirmar, se redirige al onboarding
- Los datos del perfil son los correctos (nombre real, carrera activa)

**Dependencias:** 3.1, 1.3

---

## Fase 6 — Polish y Deploy

### 6.1 Polish de UX

**Tareas:**
- [ ] Revisar que todas las pantallas tienen skeletons (cero pantallas en blanco)
- [ ] Revisar que todos los errores tienen mensajes en español
- [ ] Revisar transiciones entre pantallas (Framer Motion)
- [ ] Probar en mobile (Chrome DevTools + dispositivo real si es posible)
- [ ] Probar flujo completo: registro → onboarding → árbol → marcar materias → ver progreso
- [ ] Revisar accesibilidad básica: labels en inputs, contraste de colores

**Criterios de done:**
- El flujo completo funciona sin errores en Chrome mobile
- No hay pantallas en blanco en ningún estado de carga
- Los mensajes de error son claros y en español

**Dependencias:** todas las fases anteriores

---

### 6.2 Deploy

**Tareas:**
- [ ] Crear proyecto en Vercel conectado al repo de GitHub
- [ ] Configurar variables de entorno en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Configurar dominio personalizado (si hay uno) o usar el `.vercel.app` default
- [ ] Verificar que el build de producción funciona (`npm run build` sin errores)
- [ ] Primer deploy a producción
- [ ] Probar el flujo completo en producción

**Criterios de done:**
- La app es accesible en la URL de Vercel
- El registro y login funcionan en producción
- El árbol carga en producción con los datos reales

**Dependencias:** 6.1

---

## Resumen de Dependencias

```
0.1 Setup → 0.2 Supabase
                 │
                 ▼
           1.1 Auth store → 1.2 Login/Registro → 1.3 Routing
                                                       │
                                                       ▼
                                              2.1 Onboarding → 2.2 Carrera manual
                                                       │
                                                       ▼
                                              3.1 Materias/Store
                                                  │         │
                                                  ▼         ▼
                                             3.2 Lista   4.1 Árbol base
                                                  │         │
                                                  ▼         ▼
                                             3.3 Detail   4.2 Interacciones
                                              Sheet
                                                  │
                                          ┌───────┴───────┐
                                          ▼               ▼
                                     5.1 Dashboard   5.2 Perfil
                                          │
                                          ▼
                                     6.1 Polish → 6.2 Deploy
```

---

## Qué NO tocar hasta v2

| Feature | Por qué |
|---|---|
| OAuth Google | Supabase lo soporta fácil, pero no es necesario para validar el MVP |
| Recuperación de contraseña | Supabase lo tiene built-in, se agrega en v1.1 |
| Notificaciones push | Requiere Service Worker |
| Gamificación (XP, badges, niveles) | El árbol ya gamifica; el sistema de puntos es v2 |
| IA / RAG / Flashcards | Infraestructura separada, fuera del scope |
| Agenda de estudio | Feature diferente, complejidad alta |
| Agregar materias a carrera custom desde el árbol | Se puede agregar post-MVP con un form básico |
| Supabase Realtime (sync en tiempo real) | Los cambios son del mismo usuario, no hay colaboración |
| React Query / TanStack Query | Zustand stores son suficientes para v1 |
| PWA / offline mode | Service Worker + cache strategy, v2 |
| Tests E2E (Playwright/Cypress) | Tests unitarios con Vitest son suficientes para v1 |
| Multi-carrera activa | Una carrera activa por usuario en v1 |

---

## Estimación de Esfuerzo

| Fase | Estimación |
|---|---|
| Fase 0 — Setup | 2–3 horas |
| Fase 1 — Auth | 4–6 horas |
| Fase 2 — Onboarding | 4–5 horas |
| Fase 3 — Materias | 6–8 horas |
| Fase 4 — Árbol | 8–12 horas (el más complejo) |
| Fase 5 — Dashboard y Perfil | 3–4 horas |
| Fase 6 — Polish y Deploy | 3–4 horas |
| **Total estimado** | **30–42 horas** |

La Fase 4 (árbol) es la más incierta porque depende de cuánto customización se necesita sobre React Flow para lograr el diseño del UX-Spec.

---

*Documento pendiente de aprobación. Una vez aprobado, se avanza al Paso 7: Implementación.*
