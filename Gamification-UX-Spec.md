# Gamification-UX-Spec.md — Correlativa
## Paso 4 (SDD) — Especificación de Experiencia: Gamificación

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Gamification-Architecture.md` (aprobado).

---

## 1. Mood y principios

- **RPG sobrio, no infantil.** Le da onda "subiste de nivel" sin caer en estética de jueguito de móvil.
- **Mobile-first.** Toda la UI tiene que verse perfecto en pantalla chica antes que cualquier otra cosa.
- **Coherencia visual:** misma paleta oscura/violeta del resto, sin colores nuevos. La celebración usa el acento existente (`text-accent`) + dorado/amarillo (`text-warning`) como toque festivo.

---

## 2. Flujos de usuario

### Flujo principal: subir de nivel aprobando una materia
1. Usuario está en TreePage o ProfilePage cargando una materia como **aprobada**.
2. El estado se actualiza optimísticamente → XP recomputa → cruza un umbral de nivel.
3. Aparece el **LevelUpOverlay** sobre la pantalla actual.
4. Auto-cierra a los 2.5s, o al tocar afuera/un botón.
5. Si vuelve al Dashboard, ve la **LevelCard** con el nivel nuevo.

### Flujo secundario: chequear progreso de gamificación
1. Usuario entra al Dashboard.
2. Lo primero que ve es la **LevelCard** (encima del card de progreso académico).
3. Lee su nivel actual y cuánto le falta al próximo en la barra.

### Flujo "deshacer"
1. Usuario tenía una materia en *aprobada* y la pasa a *cursando*.
2. XP baja, nivel puede bajar.
3. **NO se muestra ningún overlay.** La LevelCard refleja el nuevo valor en silencio.

---

## 3. Pantallas y componentes

### 3.1 LevelCard (en Dashboard)

**Ubicación:** primer card del Dashboard, **arriba del card de "Progreso de carrera"**. Es el highlight nuevo: lo primero que ve el usuario al entrar.

**Anatomía:**
```
┌─────────────────────────────────────────┐
│ ✦ TU NIVEL                              │
│                                         │
│  Nivel 7                       320 / 500 XP │
│                                         │
│  ████████████░░░░░░░░░  64%             │
│                                         │
│  Faltan 180 XP para Nivel 8             │
└─────────────────────────────────────────┘
```

**Detalle de elementos:**
- Header chico: ✦ (ícono acento) + "TU NIVEL" en mayúsculas tracking-wider, mismo estilo que el resto.
- Nivel grande: `Nivel {N}`, tipografía bold size grande (text-3xl o similar al 4xl del % de progreso).
- A la derecha del nivel: `{xpIntoLevel} / {xpForLevel} XP` chico.
- Barra de progreso animada (Framer Motion `width: progress%`, duración ~0.8s easing).
- Texto chico abajo: "Faltan {N} XP para Nivel {L+1}" en `text-text-secondary`.

**Loading state:**
- Skeleton con la misma altura del card: barra `bg-muted/30 animate-pulse` y un placeholder para el nivel.

**Estado XP = 0 (recién empieza, Nivel 1):**
- Misma estructura. Texto: "Empezá a sumar XP marcando una materia como aprobada".
- Barra al 0%.

---

### 3.2 LevelUpOverlay

**Disparador:** `LevelUpWatcher` detecta que el nivel actual subió respecto al previo.

**Anatomía visual:**
```
   ┌───────────────────────────────────┐
   │                                   │
   │           ¡Subiste de nivel!      │
   │                                   │
   │              ⭐                    │
   │           Nivel 7                 │
   │                                   │
   │         Seguí así.                │
   │                                   │
   │         [  Continuar  ]           │
   │                                   │
   └───────────────────────────────────┘
   (fondo semi-transparente, oscuro, encima de toda la app)
```

**Detalles:**
- **Overlay full-screen** con fondo `bg-black/75` con blur sutil. Por encima de BottomNav y de cualquier BottomSheet abierto.
- **Card centrada**, padding generoso, rounded-3xl, `bg-bg-surface` con borde sutil `border-accent/40`.
- **Ícono grande** en el centro: ⭐ (o un símbolo de nivel) en gradiente accent→warning, animado con un *pulse + bounce* corto.
- **"¡Subiste de nivel!"** en `text-text-primary` font-bold.
- **`Nivel {N}`** en tamaño grande (text-5xl), gradiente accent→warning, con animación de scale-in (0.6 → 1) y opacity 0 → 1, easing spring.
- **"Seguí así."** subtítulo en `text-text-secondary`.
- Botón **"Continuar"** primary (cierra el overlay).

**Comportamiento:**
- **Aparece con animación** (Framer Motion):
  - Backdrop: fade-in 200ms.
  - Card: scale 0.85 → 1, fade-in con spring (damping ~24).
  - Nivel: aparece con leve delay (~150ms) y scale-up grande.
  - *Sin confeti* en esta iteración (lo dejo para una posible mejora; mantengo el scope ajustado).
- **Auto-dismiss** a los **2.5s** o al tocar:
  - El botón "Continuar".
  - El backdrop (afuera del card).
- **No bloquea acciones futuras:** mientras está abierto, las acciones del usuario en la app subyacente no llegan (overlay es modal).

**Cola de subidas múltiples:** si el usuario sube **más de un nivel** en una sola acción (raro pero posible si se cargan varios XP de golpe), se encolan: cierra uno → se abre el siguiente con el próximo nivel. No se muestran todos a la vez.

---

## 4. Estados de UI por pantalla

### Dashboard
| Estado | Qué se ve |
|---|---|
| Cargando | Skeleton de LevelCard + skeletons existentes. |
| XP = 0 | LevelCard con "Nivel 1", barra al 0% y copy onboarding. |
| Normal | LevelCard con datos reales + resto del Dashboard como hoy. |
| Recién subió de nivel | LevelCard actualizada + overlay encima (que se cierra solo). |

### TreePage / AgendaPage
- No cambian visualmente. Si una acción ahí dispara una subida de nivel, el overlay aparece **encima** sin alterar la pantalla subyacente.

---

## 5. Edge cases de UX

### E1 — Primer load (no celebrar)
Al montarse el `LevelUpWatcher` por primera vez (o tras un login), guarda el nivel actual como "previo" **sin disparar** el overlay. Solo celebra cuando hay un cambio *posterior*.

### E2 — Cambio de carrera
Al cambiar de carrera, los `userSubjects` se vacían y luego se cargan los de la nueva carrera. Esto puede hacer subir/bajar el XP. El watcher **re-baselinea** el "nivel previo" después del cambio de carrera para evitar celebraciones fantasma cuando los datos terminan de cargar.

### E3 — Reload con datos iguales
Recargar la página no muestra el overlay (E1 lo cubre: el watcher arranca con el nivel actual como baseline).

### E4 — Bajada de nivel
Si revertir un estado hace bajar el nivel, **no se muestra nada negativo**. La LevelCard refleja el nuevo nivel en silencio. No hay overlay de "bajaste de nivel".

### E5 — Múltiples subidas seguidas
Cubierto en §3.2: cola FIFO de niveles pendientes; uno por vez.

### E6 — Overlay durante navegación
Si el usuario navega mientras el overlay está abierto, el overlay sigue ahí (es global, montado en App). Cerrarlo no bloquea navegación previa.

### E7 — Stores no cargados
Si `subjectsStore.loaded === false` o `agendaStore.loaded === false`, la LevelCard muestra skeleton y el watcher no calcula (no compara contra valores espurios).

---

## 6. Accesibilidad y mobile
- LevelUpOverlay tiene `role="dialog"` y `aria-modal="true"`, con un `aria-labelledby` apuntando al título "¡Subiste de nivel!".
- Cierre por tecla `Esc` además del botón y backdrop.
- Tamaños de tap ≥ 44px en botones.
- La barra de progreso de LevelCard incluye `role="progressbar"` con `aria-valuenow / aria-valuemax`.

---

## 7. Copy (textos)
- **LevelCard header:** "TU NIVEL"
- **LevelCard sub:** "Faltan {n} XP para Nivel {L+1}"
- **LevelCard XP=0:** "Empezá a sumar XP marcando una materia como aprobada."
- **Overlay título:** "¡Subiste de nivel!"
- **Overlay subtítulo:** "Seguí así."
- **Overlay CTA:** "Continuar"

---

## 8. Decisión cerrada (ya aprobada en PRD)
- Ubicación: Dashboard.
- Tipo de celebración: overlay festivo.
- Valores de XP: §4.3 del PRD.
