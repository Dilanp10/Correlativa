# API-Contracts.md — Correlativa
## Contratos de Datos · v1.0

---

## 1. Tipos TypeScript — Entidades de Base de Datos

Estos tipos reflejan exactamente el esquema de la Database-Spec. En la implementación,
los tipos generados por Supabase CLI (`supabase gen types typescript`) son la fuente
de verdad; estos tipos aquí sirven como referencia de diseño.

```typescript
// ── Enums ────────────────────────────────────────────────────────────────────

export type SubjectStatus =
  | 'no_cursada'
  | 'cursando'
  | 'regular'
  | 'promocionada'
  | 'aprobada'
  | 'final_pendiente'
  | 'libre'

export type TreeNodeState =
  | 'bloqueada'
  | 'disponible'
  | 'cursando'
  | 'completada'

// ── Entidades base (filas de DB) ──────────────────────────────────────────────

export interface University {
  id: string
  name: string
  short_name: string
  country: string
  is_active: boolean
  created_at: string
}

export interface Career {
  id: string
  university_id: string
  name: string
  short_name: string | null
  total_years: number | null
  is_custom: boolean
  created_by: string | null
  is_active: boolean
  created_at: string
}

export interface Subject {
  id: string
  career_id: string
  name: string
  short_name: string | null
  code: string | null
  year: number
  semester: number
  is_elective: boolean
  credits: number | null
  created_at: string
}

export interface SubjectCorrelative {
  subject_id: string
  requires_subject_id: string
  created_at: string
}

export interface UserProfile {
  id: string
  display_name: string
  active_career_id: string | null
  created_at: string
  updated_at: string
}

export interface UserSubject {
  id: string
  user_id: string
  subject_id: string
  status: SubjectStatus
  grade: number | null
  notes: string | null
  updated_at: string
  created_at: string
}

// ── Tipos compuestos (para uso en la app) ────────────────────────────────────

// Materia con sus correlativas (prerequisitos) — viene de una sola query con JOIN
export interface SubjectWithCorrelatives extends Subject {
  requires: string[]  // IDs de las materias que son prerequisito de esta
  unlocks: string[]   // IDs de las materias que esta desbloquea (inverso)
}

// Estado completo de una materia para el árbol
export interface SubjectTreeNode extends SubjectWithCorrelatives {
  treeState: TreeNodeState
  userStatus: SubjectStatus
  grade: number | null
}

// Career con universidad incluida (para mostrar en selector y perfil)
export interface CareerWithUniversity extends Career {
  university: Pick<University, 'id' | 'name' | 'short_name'>
}

// Progreso del usuario en su carrera
export interface CareerProgress {
  total: number
  approved: number         // aprobada + promocionada
  inProgress: number       // cursando
  available: number        // disponible (no cursada, desbloqueada)
  blocked: number          // bloqueada
  percentComplete: number  // (approved / total) * 100
  averageGrade: number | null
}
```

---

## 2. Queries de Supabase

Todas las queries se centralizan en `src/shared/lib/supabase/` o en los hooks de cada feature. **Nunca se llama a Supabase directamente desde un componente.**

### 2.1 Auth

#### Registrar usuario
```typescript
// src/shared/lib/supabase/auth.ts

async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName }
      // display_name se usa en el trigger handle_new_user() para crear el perfil
    }
  })
  return { data, error }
}

// Response exitoso:
// { data: { user: User, session: Session }, error: null }

// Errores posibles:
// error.message === 'User already registered' → email ya en uso
// error.message === 'Password should be at least 6 characters' → contraseña corta
```

#### Login
```typescript
async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

// Response exitoso:
// { data: { user: User, session: Session }, error: null }

// Errores posibles:
// error.message === 'Invalid login credentials' → email/password incorrectos
```

#### Logout
```typescript
async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}
```

#### Escuchar cambios de sesión
```typescript
// Se llama una vez al montar App.tsx
supabase.auth.onAuthStateChange((event, session) => {
  // event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'
  authStore.setSession(session)
  authStore.setUser(session?.user ?? null)
})
```

---

### 2.2 Perfil de Usuario

#### Obtener perfil del usuario autenticado
```typescript
// src/features/auth/hooks/useUserProfile.ts

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

// Response: UserProfile | null
// Error si el perfil no existe (edge case: trigger falló al registrarse)
```

#### Actualizar perfil (nombre y carrera activa)
```typescript
async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'active_career_id'>>
) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

### 2.3 Universidades

#### Obtener todas las universidades activas
```typescript
// src/features/career/hooks/useUniversities.ts

async function getUniversities(): Promise<University[]> {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data ?? []
}

// Response: University[]
// Se llama una vez en el onboarding y se cachea en careerStore
```

---

### 2.4 Carreras

#### Obtener carreras de una universidad (pre-cargadas + propias)
```typescript
// src/features/career/hooks/useCareer.ts

async function getCareers(universityId: string, userId: string): Promise<CareerWithUniversity[]> {
  const { data, error } = await supabase
    .from('careers')
    .select(`
      *,
      university:universities(id, name, short_name)
    `)
    .eq('university_id', universityId)
    .eq('is_active', true)
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .order('name')

  if (error) throw error
  return data ?? []
}

// Response: CareerWithUniversity[]
// RLS garantiza que solo se ven las pre-cargadas + las propias del usuario
```

#### Crear carrera custom
```typescript
async function createCustomCareer(
  universityId: string,
  userId: string,
  name: string,
  totalYears: number
): Promise<Career> {
  const { data, error } = await supabase
    .from('careers')
    .insert({
      university_id: universityId,
      name,
      total_years: totalYears,
      is_custom: true,
      created_by: userId
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

### 2.5 Materias y Correlativas

#### Obtener materias de una carrera con sus correlativas
```typescript
// src/features/subjects/hooks/useSubjects.ts
// Query principal — se ejecuta una sola vez por sesión, resultado en store

async function getSubjectsWithCorrelatives(careerId: string): Promise<SubjectWithCorrelatives[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select(`
      *,
      requires:subject_correlatives!subject_correlatives_subject_id_fkey(requires_subject_id),
      unlocked_by:subject_correlatives!subject_correlatives_requires_subject_id_fkey(subject_id)
    `)
    .eq('career_id', careerId)
    .order('year')
    .order('semester')

  if (error) throw error

  return (data ?? []).map(subject => ({
    ...subject,
    requires: subject.requires.map((c: { requires_subject_id: string }) => c.requires_subject_id),
    unlocks: subject.unlocked_by.map((c: { subject_id: string }) => c.subject_id)
  }))
}

// Response: SubjectWithCorrelatives[]
// Incluye tanto los prerequisitos (requires) como lo que cada materia desbloquea (unlocks)
```

#### Crear materia (para carreras custom)
```typescript
async function createSubject(
  careerId: string,
  subject: Pick<Subject, 'name' | 'year' | 'semester' | 'is_elective' | 'credits'>
): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ career_id: careerId, ...subject })
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

### 2.6 Estado del Usuario en Materias

#### Obtener todos los estados del usuario en su carrera
```typescript
// src/features/subjects/hooks/useUserSubjects.ts

async function getUserSubjects(userId: string, careerId: string): Promise<UserSubject[]> {
  const { data, error } = await supabase
    .from('user_subjects')
    .select('*')
    .eq('user_id', userId)
    // Filtramos por materias de la carrera activa haciendo join implícito
    // via la relación subjects → careers
    .in(
      'subject_id',
      // Se pasa el array de IDs de materias de la carrera (ya cargado en el store)
      // para no hacer un join complejo en esta query
      subjectIds
    )

  if (error) throw error
  return data ?? []
}

// Nota: subjectIds viene del subjectsStore, ya cargado previamente.
// Alternativa si se prefiere un solo round-trip:
// usar una RPC function o hacer el join en la query de getSubjectsWithCorrelatives
```

#### Actualizar estado de una materia (upsert)
```typescript
async function upsertUserSubject(
  userId: string,
  subjectId: string,
  status: SubjectStatus,
  grade?: number | null
): Promise<UserSubject> {
  const { data, error } = await supabase
    .from('user_subjects')
    .upsert(
      {
        user_id: userId,
        subject_id: subjectId,
        status,
        grade: grade ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,subject_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

// Se usa upsert para manejar tanto INSERT (primera vez) como UPDATE (cambio de estado)
// onConflict usa el UNIQUE constraint de (user_id, subject_id)
```

---

## 3. Lógica de Negocio del Cliente

### 3.1 Calcular estados del árbol

Esta función es **pura** (sin side effects) y se ejecuta en el cliente cada vez que cambia `userSubjects` en el store.

```typescript
// src/features/tree/hooks/useTreeLayout.ts (o en subjectsStore como computed)

const UNBLOCKING_STATUSES: SubjectStatus[] = ['aprobada', 'promocionada']

function computeTreeStates(
  subjects: SubjectWithCorrelatives[],
  userSubjects: UserSubject[]
): Record<string, TreeNodeState> {
  // Set de materias que "desbloquean" (aprobada o promocionada)
  const unlockedIds = new Set(
    userSubjects
      .filter(us => UNBLOCKING_STATUSES.includes(us.status))
      .map(us => us.subject_id)
  )

  // Mapa rápido: subject_id → userSubject
  const userSubjectMap = new Map(userSubjects.map(us => [us.subject_id, us]))

  const result: Record<string, TreeNodeState> = {}

  for (const subject of subjects) {
    const userSubject = userSubjectMap.get(subject.id)
    const userStatus = userSubject?.status ?? 'no_cursada'

    let treeState: TreeNodeState

    if (UNBLOCKING_STATUSES.includes(userStatus)) {
      treeState = 'completada'
    } else if (userStatus === 'cursando') {
      treeState = 'cursando'
    } else if (subject.requires.every(reqId => unlockedIds.has(reqId))) {
      // Todos los prerequisitos están aprobados/promocionados → disponible
      treeState = 'disponible'
    } else {
      treeState = 'bloqueada'
    }

    result[subject.id] = treeState
  }

  return result
}
```

### 3.2 Calcular progreso de carrera

```typescript
function computeCareerProgress(
  subjects: Subject[],
  userSubjects: UserSubject[],
  treeStates: Record<string, TreeNodeState>
): CareerProgress {
  const total = subjects.length
  const userSubjectMap = new Map(userSubjects.map(us => [us.subject_id, us]))

  const approved = userSubjects.filter(us =>
    UNBLOCKING_STATUSES.includes(us.status)
  ).length

  const inProgress = userSubjects.filter(us => us.status === 'cursando').length

  const available = Object.values(treeStates).filter(s => s === 'disponible').length

  const blocked = Object.values(treeStates).filter(s => s === 'bloqueada').length

  const gradesWithValue = userSubjects.filter(us => us.grade !== null)
  const averageGrade = gradesWithValue.length > 0
    ? gradesWithValue.reduce((sum, us) => sum + (us.grade ?? 0), 0) / gradesWithValue.length
    : null

  return {
    total,
    approved,
    inProgress,
    available,
    blocked,
    percentComplete: total > 0 ? Math.round((approved / total) * 100) : 0,
    averageGrade: averageGrade !== null ? Math.round(averageGrade * 100) / 100 : null
  }
}
```

### 3.3 Detectar materias recién desbloqueadas (para animación)

```typescript
function getNewlyUnlocked(
  prevStates: Record<string, TreeNodeState>,
  nextStates: Record<string, TreeNodeState>
): string[] {
  return Object.keys(nextStates).filter(
    id => prevStates[id] === 'bloqueada' && nextStates[id] === 'disponible'
  )
}

// Se usa en el hook/store al actualizar userSubjects:
// 1. Guardar prevStates antes del update
// 2. Calcular nextStates
// 3. getNewlyUnlocked(prevStates, nextStates) → IDs a animar
```

---

## 4. Manejo de Errores

### 4.1 Clasificación de errores de Supabase

```typescript
// src/shared/lib/supabase/errors.ts

export type AppError =
  | { type: 'auth'; message: string }
  | { type: 'network'; message: string }
  | { type: 'not_found'; message: string }
  | { type: 'forbidden'; message: string }
  | { type: 'unknown'; message: string }

export function parseSupabaseError(error: unknown): AppError {
  if (!error || typeof error !== 'object') {
    return { type: 'unknown', message: 'Error desconocido.' }
  }

  const err = error as { code?: string; message?: string; status?: number }

  // Errores de auth
  if (err.message?.includes('Invalid login credentials')) {
    return { type: 'auth', message: 'Email o contraseña incorrectos.' }
  }
  if (err.message?.includes('User already registered')) {
    return { type: 'auth', message: 'Ya existe una cuenta con ese email.' }
  }
  if (err.message?.includes('Email not confirmed')) {
    return { type: 'auth', message: 'Confirmá tu email antes de iniciar sesión.' }
  }

  // Errores de red
  if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
    return { type: 'network', message: 'Sin conexión. Revisá tu internet.' }
  }

  // Errores de RLS / permisos
  if (err.code === '42501' || err.status === 403) {
    return { type: 'forbidden', message: 'No tenés permiso para hacer esa acción.' }
  }

  // Not found
  if (err.code === 'PGRST116' || err.status === 404) {
    return { type: 'not_found', message: 'No encontramos lo que buscabas.' }
  }

  return { type: 'unknown', message: 'Algo salió mal. Intentá de nuevo.' }
}
```

### 4.2 Patrón de uso en hooks

```typescript
// Patrón estándar para todos los hooks de data fetching

const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<AppError | null>(null)

async function fetchData() {
  setIsLoading(true)
  setError(null)
  try {
    const data = await someSupabaseQuery()
    store.setData(data)
  } catch (err) {
    setError(parseSupabaseError(err))
  } finally {
    setIsLoading(false)
  }
}
```

### 4.3 Patrón optimistic update con rollback

```typescript
// Patrón para upsertUserSubject (cambio de estado de materia)

async function updateSubjectStatus(subjectId: string, newStatus: SubjectStatus, grade?: number) {
  // 1. Snapshot del estado anterior
  const prev = subjectsStore.getUserSubject(subjectId)

  // 2. Optimistic update
  subjectsStore.optimisticUpdate(subjectId, newStatus, grade)

  try {
    // 3. Persistir en DB
    await upsertUserSubject(authStore.user!.id, subjectId, newStatus, grade)
    // 4. Éxito: el store ya tiene el valor correcto
  } catch (err) {
    // 5. Rollback: restaurar estado anterior
    subjectsStore.rollbackUpdate(subjectId, prev)
    throw parseSupabaseError(err)
  }
}
```

---

## 5. Contratos de Respuesta — Resumen

| Query | Parámetros | Response | Error posible |
|---|---|---|---|
| `signUp` | email, password, displayName | `{ user, session }` | Email ya registrado |
| `signIn` | email, password | `{ user, session }` | Credenciales inválidas |
| `signOut` | — | `void` | Raro, ignorar |
| `getUserProfile` | userId | `UserProfile` | Not found (trigger falló) |
| `updateUserProfile` | userId, updates | `UserProfile` | Forbidden (otro user) |
| `getUniversities` | — | `University[]` | Network error |
| `getCareers` | universityId, userId | `CareerWithUniversity[]` | Network error |
| `createCustomCareer` | universityId, userId, name, years | `Career` | Forbidden (RLS) |
| `getSubjectsWithCorrelatives` | careerId | `SubjectWithCorrelatives[]` | Not found |
| `getUserSubjects` | userId, subjectIds | `UserSubject[]` | Forbidden (RLS) |
| `upsertUserSubject` | userId, subjectId, status, grade? | `UserSubject` | Forbidden (RLS) |

---

## 6. Variables de Entorno

```bash
# .env.local (nunca commitear)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

```typescript
// src/shared/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'  // generado por Supabase CLI

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables de entorno de Supabase no configuradas.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

---

*Documento pendiente de aprobación. Una vez aprobado, se avanza al Paso 6: Implementation-Plan.md.*
