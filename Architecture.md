# Architecture.md — Correlativa
## Arquitectura Técnica · v1.0

---

## 1. Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│                                                             │
│   React + Vite + TypeScript                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │  auth/   │  │ career/  │  │subjects/ │  │  tree/   │  │
│   │ feature  │  │ feature  │  │ feature  │  │ feature  │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│        │              │              │              │        │
│   ┌────┴──────────────┴──────────────┴──────────────┴────┐  │
│   │                  shared/                              │  │
│   │   components · hooks · lib/supabase · types           │  │
│   └────────────────────────┬──────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────┘
                             │ Supabase JS Client (HTTPS)
┌────────────────────────────┼────────────────────────────────┐
│                       SUPABASE                              │
│                            │                                │
│   ┌─────────────┐  ┌───────┴──────┐  ┌──────────────────┐  │
│   │  Auth       │  │  PostgREST   │  │   Realtime       │  │
│   │  (JWT)      │  │  (REST API)  │  │   (WebSocket)    │  │
│   └─────────────┘  └───────┬──────┘  └──────────────────┘  │
│                            │                                │
│   ┌────────────────────────┴───────────────────────────┐    │
│   │              PostgreSQL                             │    │
│   │   users · universities · careers · subjects        │    │
│   │   subject_correlatives · user_subjects             │    │
│   └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

### Frontend

| Tecnología | Versión target | Rol |
|---|---|---|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool + dev server |
| TypeScript | 5.x | Tipado estático |
| TailwindCSS | 3.x | Estilos utilitarios |
| Framer Motion | 11.x | Animaciones |
| Zustand | 4.x | Estado global |
| React Router | 6.x | Routing del lado cliente |
| Supabase JS | 2.x | Cliente de Supabase |

### Backend / BaaS

| Servicio | Uso |
|---|---|
| Supabase Auth | Autenticación (JWT, sesiones) |
| Supabase PostgREST | API REST automática sobre PostgreSQL |
| Supabase Realtime | Suscripciones en tiempo real (opcional en v1) |
| PostgreSQL 15 | Base de datos relacional |

### Hosting

| Servicio | Qué hostea |
|---|---|
| Vercel | Frontend (React build) |
| Supabase Cloud | DB + Auth + API (free tier) |

---

## 3. Arquitectura de Carpetas

```
src/
├── features/
│   ├── auth/
│   │   ├── components/        # LoginForm, RegisterForm
│   │   ├── hooks/             # useAuth, useSession
│   │   ├── store/             # authStore (Zustand)
│   │   └── types/             # AuthUser, LoginPayload, etc.
│   │
│   ├── career/
│   │   ├── components/        # CareerSelector, UniversitySearch
│   │   ├── hooks/             # useCareer, useUniversities
│   │   ├── store/             # careerStore
│   │   └── types/             # Career, University
│   │
│   ├── subjects/
│   │   ├── components/        # SubjectCard, SubjectStatusModal
│   │   ├── hooks/             # useSubjects, useUserSubjects
│   │   ├── store/             # subjectsStore
│   │   └── types/             # Subject, UserSubject, SubjectStatus
│   │
│   └── tree/
│       ├── components/        # TreeCanvas, TreeNode, TreeEdge
│       ├── hooks/             # useTreeLayout, useTreeInteraction
│       ├── store/             # treeStore
│       └── types/             # TreeNode, TreeEdge, TreeLayout
│
├── shared/
│   ├── components/            # Button, Modal, Input, Badge, Skeleton
│   ├── hooks/                 # useDebounce, useLocalStorage
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts      # createClient() — instancia única
│   │       ├── auth.ts        # helpers de auth
│   │       └── types.ts       # Database types (generados por Supabase CLI)
│   ├── types/                 # tipos globales compartidos
│   └── constants/             # rutas, config de la app
│
├── pages/                     # Componentes de página (thin wrappers)
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── OnboardingPage.tsx
│   ├── DashboardPage.tsx
│   ├── TreePage.tsx
│   └── ProfilePage.tsx
│
├── App.tsx                    # Router principal
└── main.tsx                   # Entry point
```

**Reglas de importación:**
- `features/X` → puede importar de `shared/` y nada más
- `features/X` → no importa de `features/Y`
- `shared/` → no importa de `features/`
- `pages/` → puede importar de `features/` y `shared/`

---

## 4. Flujo de Datos

### 4.1 Auth Flow

```
Usuario ingresa credenciales
        │
        ▼
LoginForm (componente)
        │ llama
        ▼
useAuth hook
        │ llama
        ▼
shared/lib/supabase/auth.ts → supabase.auth.signInWithPassword()
        │
        ▼
Supabase retorna { user, session }
        │
        ▼
authStore (Zustand) ← setUser(user), setSession(session)
        │
        ▼
React Router → redirect a /dashboard
```

### 4.2 Flujo de carga de materias

```
TreePage / SubjectsPage monta
        │
        ▼
useSubjects() hook
        │ lee careerStore.activeCareer
        ▼
supabase
  .from('subjects')
  .select('*, subject_correlatives(*)')
  .eq('career_id', careerId)
        │
        ▼
subjectsStore ← setSubjects(data)
        │
        ▼
useUserSubjects() hook
        │ lee authStore.user.id
        ▼
supabase
  .from('user_subjects')
  .select('*')
  .eq('user_id', userId)
        │
        ▼
subjectsStore ← setUserSubjects(data)
        │
        ▼
Componentes leen del store y renderizan
```

### 4.3 Flujo de actualización de estado de materia

```
Usuario cambia estado de materia en UI
        │
        ▼
SubjectStatusModal → onConfirm()
        │
        ▼
useUserSubjects().updateStatus(subjectId, newStatus)
        │
        ├─ Optimistic update → subjectsStore actualiza localmente
        │
        ▼
supabase
  .from('user_subjects')
  .upsert({ user_id, subject_id, status, updated_at })
        │
        ├─ Success → confirma (ya está en store)
        └─ Error → rollback en store, muestra error
```

### 4.4 Cálculo de disponibilidad (client-side)

La lógica de "¿está disponible esta materia?" corre en el cliente, no en la DB.

```typescript
// Pseudo-código de la lógica
function computeSubjectStates(
  subjects: Subject[],
  correlatives: SubjectCorrelative[],
  userSubjects: UserSubject[]
): Record<string, TreeNodeState> {
  const approved = new Set(
    userSubjects
      .filter(us => us.status === 'aprobada' || us.status === 'promocionada')
      .map(us => us.subject_id)
  )

  return subjects.reduce((acc, subject) => {
    const prerequisites = correlatives
      .filter(c => c.subject_id === subject.id)
      .map(c => c.requires_subject_id)

    const userStatus = userSubjects.find(us => us.subject_id === subject.id)?.status

    let treeState: TreeNodeState

    if (userStatus === 'aprobada' || userStatus === 'promocionada') {
      treeState = 'completada'
    } else if (userStatus === 'cursando') {
      treeState = 'cursando'
    } else if (prerequisites.every(pid => approved.has(pid))) {
      treeState = 'disponible'
    } else {
      treeState = 'bloqueada'
    }

    acc[subject.id] = treeState
    return acc
  }, {})
}
```

**Decisión:** La lógica de disponibilidad corre en cliente porque:
- Los datos ya están cargados en el store
- Evita un round-trip a la DB en cada cambio de estado
- La lógica es simple y determinista
- Supabase RLS ya protege los datos en escritura

---

## 5. Estado Global (Zustand Stores)

### authStore
```typescript
interface AuthStore {
  user: User | null
  session: Session | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  signOut: () => Promise<void>
}
```

### careerStore
```typescript
interface CareerStore {
  activeCareer: Career | null
  university: University | null
  setActiveCareer: (career: Career) => void
  setUniversity: (university: University) => void
}
```

### subjectsStore
```typescript
interface SubjectsStore {
  subjects: Subject[]
  correlatives: SubjectCorrelative[]
  userSubjects: UserSubject[]
  isLoading: boolean
  setSubjects: (subjects: Subject[]) => void
  setCorrelatives: (correlatives: SubjectCorrelative[]) => void
  setUserSubjects: (userSubjects: UserSubject[]) => void
  updateUserSubject: (subjectId: string, status: SubjectStatus, grade?: number) => void
  computedStates: Record<string, TreeNodeState>  // derivado, se recalcula al cambiar userSubjects
}
```

---

## 6. Routing

```
/                     → redirect a /dashboard (si autenticado) o /login
/login                → LoginPage (pública)
/register             → RegisterPage (pública)
/onboarding           → OnboardingPage (requiere auth, redirige si carrera ya configurada)
/dashboard            → DashboardPage (requiere auth + carrera)
/tree                 → TreePage (requiere auth + carrera)
/profile              → ProfilePage (requiere auth)
```

**Guards de ruta:**
- `ProtectedRoute` — redirige a `/login` si no hay sesión
- `CareerRequiredRoute` — redirige a `/onboarding` si no hay carrera activa

---

## 7. Árbol de Correlativas — Decisiones Técnicas

### Renderizado del árbol

**Opción A: Librería de grafos (React Flow / D3)**
- Pros: pan/zoom gratis, layout automático, bien mantenido
- Contras: bundle size, posible over-engineering, menos control visual

**Opción B: Canvas custom con posicionamiento manual**
- Pros: control total, bundle mínimo
- Contras: mucho trabajo, reimplentar pan/zoom, hit testing

**Decisión: React Flow**
- Es la opción más pragmática para v1
- Pan + zoom + nodos custom sin código adicional
- Bundle size aceptable (~50kb gzipped)
- Nodos y edges son componentes React → TailwindCSS funciona dentro
- Permite reemplazar por implementación custom en v2 si hace falta

### Layout del árbol

Los nodos se posicionan por **año y cuatrimestre** de la materia:
- Eje horizontal: cuatrimestre (1er año 1C, 1er año 2C, 2do año 1C, ...)
- Eje vertical: múltiples materias del mismo cuatrimestre apiladas verticalmente
- Las correlativas conectan nodos entre columnas

Esto genera un layout tipo "timeline académico" que es intuitivo para el usuario.

---

## 8. Seguridad

### Row Level Security (RLS) en Supabase

Todas las tablas que contienen datos de usuario tienen RLS activo:

- `user_subjects`: el usuario solo puede leer/escribir sus propias filas (`user_id = auth.uid()`)
- `users`: el usuario solo puede leer/editar su propio perfil
- `subjects`, `careers`, `universities`: lectura pública, escritura solo con service role (datos pre-cargados)
- `subject_correlatives`: lectura pública, sin escritura desde cliente

### Autenticación

- JWT emitido por Supabase Auth
- El cliente Supabase JS maneja refresh automático del token
- El `user_id` en todas las operaciones viene de `auth.uid()` en la DB (no del cliente)
- Nunca se confía en el `user_id` enviado desde el frontend para operaciones críticas

---

## 9. Performance

### Estrategias para v1

| Técnica | Dónde aplica |
|---|---|
| Optimistic UI | Cambio de estado de materia |
| Skeleton screens | Carga inicial de árbol y listas |
| Lazy loading de páginas | React Router + dynamic import |
| Memoización de computed states | `subjectsStore.computedStates` con `useMemo` |
| Índices en DB | `user_subjects(user_id, subject_id)`, `subjects(career_id)` |

### Límites conocidos

- El árbol puede tener degradación visual con carreras de 60+ materias muy conectadas
- Mitigación: filtros de estado en el árbol (mostrar solo disponibles, o por año)

---

## 10. Decisiones Técnicas y Trade-offs

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Supabase como BaaS | Backend propio (Node/Express) | Velocidad de desarrollo, auth y DB gratis, sin infra que mantener en v1 |
| PostgREST (Supabase) en lugar de Edge Functions | Edge Functions para cada query | Overkill en v1; PostgREST + RLS es suficiente y más simple |
| Lógica de disponibilidad en cliente | Vista materializada en DB | Los datos ya están en memoria; evita complejidad en DB para lógica que puede cambiar |
| React Flow para el árbol | D3, canvas custom | Mejor DX, nodos como React components, pan/zoom gratis |
| Zustand sobre Redux/Context | Redux Toolkit, Context API | Menos boilerplate, más simple, suficiente para el scope del MVP |
| Vite sobre CRA / Next.js | Next.js | App 100% client-side en v1; Next.js es overhead innecesario sin SSR/SSG |

---

## 11. Lo que NO se arquitecta en v1

- **Edge Functions / serverless:** no hay lógica de negocio compleja que lo justifique
- **Supabase Realtime:** los cambios de estado son locales al usuario; sin colaboración en tiempo real
- **Cache layer (React Query):** Zustand stores son suficientes; se evalúa en v2 si hay stale data issues
- **PWA / offline mode:** requiere Service Worker + cache estratégico; v2
- **CDN para imágenes / storage:** no hay assets de usuario en v1

---

*Documento pendiente de aprobación. Una vez aprobado, se avanza al Paso 3: Database-Spec.md.*
