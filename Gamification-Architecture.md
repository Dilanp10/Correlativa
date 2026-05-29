# Gamification-Architecture.md — Correlativa
## Paso 2 (SDD) — Arquitectura Técnica: Gamificación

> Estado: **borrador, pendiente de aprobación.** No se avanza a Database-Spec hasta que esté aprobado.
> Depende de: `Gamification-PRD.md` (aprobado).

---

## 1. Principio rector

El XP **se deriva del estado**, no se acumula. Toda la gamificación es una **función pura** del estado que ya vive en los stores (`subjectsStore.userSubjects` + `agendaStore.events`). No hay tabla nueva, no hay contador persistido.

```
estado (userSubjects, agendaEvents)  ──►  computeGamification()  ──►  { totalXp, level, progreso }  ──►  UI
```

---

## 2. Diagrama de módulos

```
src/features/gamification/
├── lib/
│   └── gamification.ts        # FUNCIONES PURAS: computeXp, computeLevel, computeGamification
│                              # Sin imports de otras features. 100% testeable.
├── components/
│   ├── LevelCard.tsx          # Presentacional: recibe GamificationState por props
│   └── LevelUpOverlay.tsx     # Presentacional: overlay festivo, recibe level + onClose
└── hooks/
    └── useGamification.ts     # Lee subjectsStore + agendaStore y devuelve GamificationState (useMemo)
```

**Composición (quién arma qué):**
- **DashboardPage** (capa de página) → usa `useGamification()` y renderiza `<LevelCard>`.
- **App** (raíz) → monta una vez `<LevelUpWatcher>` (detecta subida de nivel en cualquier pantalla y dispara `<LevelUpOverlay>`).

---

## 3. Flujo de datos

### 3.1 Cálculo (F1)
1. El usuario cambia el estado de una materia (TreePage) o completa un evento (AgendaPage).
2. Eso actualiza `subjectsStore` / `agendaStore` (ya pasa hoy, con optimistic UI).
3. `useGamification()` recomputa vía `useMemo` sobre `userSubjects` + `events`.
4. La UI (LevelCard) refleja el nuevo XP/nivel automáticamente.

> Como deriva del estado: revertir una acción baja el XP solo. Recargar no duplica nada.

### 3.2 Subida de nivel (F3)
- `LevelUpWatcher` (montado en `App`, siempre presente mientras hay sesión):
  - Calcula el nivel actual con `useGamification()`.
  - Guarda el nivel previo en un `useRef`.
  - En el **primer cálculo** solo setea el ref (no celebra).
  - Cuando `nivelActual > nivelPrevio` → muestra `<LevelUpOverlay level={nivelActual} />` y actualiza el ref.
- El overlay se autocierra (timeout ~2.5s) o al tocar.

---

## 4. Contratos internos (tipos)

```ts
// features/gamification/lib/gamification.ts
export interface GamificationState {
  totalXp: number        // XP total derivada del estado
  level: number          // nivel actual (≥ 1)
  xpIntoLevel: number    // XP acumulada dentro del nivel actual
  xpForLevel: number     // XP que cuesta completar el nivel actual (para la barra)
  progress: number       // 0..1 (xpIntoLevel / xpForLevel)
}
```

---

## 5. Decisiones técnicas y por qué

### D1 — Derivar del estado (no ledger)
Ya justificado en el PRD §4.2. Implicancia arquitectónica: **no se toca la base de datos** (ver Paso 3). El "Database-Spec" será corto: confirma que no hay cambios de esquema.

### D2 — Lib pura, separada de la UI
`gamification.ts` no importa nada de otras features ni de stores: recibe `userSubjects` y `events` como argumentos y devuelve `GamificationState`. Esto la hace **testeable con Vitest** sin montar nada.

### D3 — `useGamification()` lee dos stores (cross-cutting)
La gamificación **agrega** progreso de dos features (subjects + agenda). El hook `useGamification()` lee `useSubjectsStore` y `useAgendaStore` y llama a la lib pura.
- *Trade-off:* esto es una lectura cross-feature (la regla del proyecto dice que las features no se importan entre sí). Lo acepto **solo en este hook** porque la gamificación es, por naturaleza, una capa transversal sobre el progreso. La lógica pura queda aislada en `lib`; el acoplamiento se limita a *leer* stores, no a importar componentes/lógica de esas features.
- *Alternativa descartada:* pasar los datos por props desde cada página. Lo descarto porque el `LevelUpWatcher` necesita los datos a nivel App y duplicaríamos el wiring en cada página. **Te marco esto para que lo apruebes** (ver §8).

### D4 — Curva de niveles
- XP para avanzar del nivel `n` al `n+1`:  `xpToAdvance(n) = 100 + (n - 1) * 50`
  - L1→L2: 100 · L2→L3: 150 · L3→L4: 200 … (cada nivel cuesta 50 más).
- XP acumulada para *estar* en el nivel `L`:  `cumulative(L) = 100·(L-1) + 25·(L-1)·(L-2)`
- `computeLevel(totalXp)`: loop incremental sumando `xpToAdvance` hasta pasar `totalXp` (acotado, ~decenas de iteraciones).
- *Calibración:* con ~44 materias de la carrera seed, completar todo cae alrededor de **nivel 13-14**. Curva con sensación de viaje largo pero con subidas frecuentes al principio (la 1ª materia ya sube de nivel). Los números son fáciles de tunear.

### D5 — `LevelUpWatcher` a nivel App
Las subidas de nivel ocurren en TreePage (aprobar materia) y AgendaPage (completar evento), no solo en Dashboard. Por eso el watcher se monta una vez en `App`, dentro del área autenticada, y persiste entre navegaciones (el `useRef` del nivel previo sobrevive a los cambios de ruta porque `App` no se desmonta).

### D6 — Sin llamadas extra a Supabase (F4)
`useGamification()` no hace fetch: reutiliza los datos que `useSubjects` y `useAgenda` ya cargan. Cero round-trips nuevos.

---

## 6. Performance
- `computeGamification` es O(materias + eventos) — decenas de items, trivial.
- Envuelto en `useMemo` con dependencias `[userSubjects, events]`.
- El bundle de gamificación es chico y se puede dejar en el chunk del Dashboard (lazy) salvo el watcher, que es liviano y va con `App`.

---

## 7. Qué NO cambia
- Esquema de base de datos (sin tablas/columnas nuevas).
- Stores existentes (subjects, agenda) — solo se **leen**.
- El cálculo de progreso actual (`computeCareerProgress`) sigue igual; gamificación es una capa aparte.

---

## 8. Punto a aprobar
**D3:** ¿Te parece bien que `useGamification()` lea directamente los stores de subjects y agenda (lectura cross-feature acotada, lib pura aislada), o preferís que mantengamos las features 100% desacopladas pasando los datos por props desde cada página (más verboso y con wiring duplicado para el watcher)?

Mi recomendación: **permitir la lectura en el hook** (D3 como está). Es pragmático y mantiene la lógica pura aislada.
