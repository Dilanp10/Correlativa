# Streaks-UX-Spec.md — Correlativa
## Paso 4 (SDD) — Especificación de Experiencia: Rachas

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Streaks-Architecture.md` (aprobado).

---

## 1. Mood y principios

- **Discreto pero visible.** La racha es un *acompañamiento*, no la estrella. No debe robarle pantalla a la `LevelCard` ni al progreso académico.
- **Mobile-first.** Tap target generoso aunque el chip sea chico (al menos 32×32 reales).
- **Coherencia visual:** mismos tokens que el resto. 🔥 vive en la paleta de "warning" (amarillo/naranja) sin colores nuevos.

---

## 2. Pantalla principal y ubicación

Vive en el **Dashboard**, en la **fila del header**, alineado a la derecha del título de la carrera.

```
┌────────────────────────────────────────────────────────┐
│  UNCA                                       [🔥 5]     │
│  Ingeniería en Informática                             │
│                                                        │
│  ┌──────────── LevelCard ─────────────┐               │
│  │ ✦ TU NIVEL                          │               │
│  │ Nivel 7                  320/500 XP │               │
│  ...                                                   │
```

Por qué ahí:
- Se ve apenas se entra a la app (motivación inmediata).
- No le quita protagonismo a la `LevelCard`.
- En mobile, no agrega una fila extra: aprovecha el espacio en blanco del header.

En otras pantallas (Árbol, Agenda, Perfil) **no aparece** en esta iteración: el lugar canónico es Dashboard. (Considerable mejora futura.)

---

## 3. Anatomía del StreakChip

```
┌───────────┐
│ 🔥 5      │
└───────────┘
```

- Forma de **pill** (rounded-full).
- Padding: `px-3 py-1.5`.
- Fondo: `bg-bg-surface` con borde sutil `border-warning/30`.
- Tipografía: número en bold tamaño `text-sm` color `text-text-primary`. 🔥 emoji al frente.
- Si la racha es `0`, el chip se **atenúa**: `opacity-60` y borde gris (`border-muted/40`).

Estados:
| Estado | Render |
|---|---|
| Cargando | Skeleton: pill `bg-muted/30 animate-pulse` con el ancho aproximado. |
| Racha = 0 | `🔥 0` atenuado, sin texto extra (no agrego copy para mantener limpio). |
| Racha ≥ 1 | `🔥 N` con `días` opcional según ancho — ver §3.1. |

### 3.1 Texto del chip
- Hasta 1 día: `🔥 1` (cortito).
- 2+ días: `🔥 N`.
- *No incluyo la palabra "días"* en el chip para mantenerlo corto en mobile. El número con la llama es universalmente legible.

### 3.2 Tooltip / aria-label
- Hover (desktop) y `aria-label` (siempre): `"Racha actual de N días"` (o `"Sin racha activa"` cuando es 0).

---

## 4. Flujos de usuario

### Flujo principal: extender la racha
1. Usuario entra al Dashboard. Ve `🔥 5` en el header.
2. Va al Árbol, aprueba una materia (o completa un evento en la Agenda).
3. La acción dispara `emitActivity()` → `recordActivity()` → la racha se actualiza.
4. Al volver al Dashboard ve `🔥 6` (si era el primer act del día).

### Flujo de gracia (congelador)
1. Usuario tenía `🔥 10` con última actividad **anteayer** y nunca usó el congelador este mes.
2. Entra hoy, hace una acción.
3. La racha **sigue intacta** y sube a `🔥 11`. El congelador queda consumido (sin aviso visible: el PRD pidió simple).
4. Si fallara otro día este mes sin haber hecho nada, vuelve a `🔥 0`.

### Flujo de racha rota
1. Usuario tenía `🔥 10`. Faltó 3 días seguidos.
2. Al entrar al Dashboard ve `🔥 0` (atenuado).
3. Si hace una acción hoy, el chip pasa a `🔥 1`.

---

## 5. Estados de UI

| Estado | Dashboard |
|---|---|
| Cargando | Skeleton del chip + skeletons existentes. |
| Sin racha | Chip atenuado `🔥 0`. |
| Racha activa | Chip prendido `🔥 N`. |
| Recién extendida | El número cambia con una micro-animación: fade + bump (scale 1 → 1.15 → 1) breve (~200ms) cuando el valor sube. |

La micro-animación es **lo único "festivo"** de esta iteración. Sin overlays, sin confeti, sin alertas (PRD pidió simple).

---

## 6. Edge cases de UX

### E1 — Primera vez del usuario
`lastActiveDate = NULL` → chip muestra `🔥 0` atenuado.
Cuando hace la primera acción → `🔥 1` (con micro-animación).

### E2 — Mismo día, varias acciones
La racha no sube dos veces en el mismo día. El chip queda en `N`. Comportamiento correcto y silencioso.

### E3 — Última actividad fue ayer, todavía no hizo nada hoy
La racha **se muestra intacta** (la lógica considera que ayer y hoy están en ventana). Si hoy no hace nada, mañana ya verá `0` (o si todavía tiene congelador este mes, una vez más, intacta).

> Decisión deliberada: **no mostramos un indicador de "en riesgo"** ("¡marcá algo hoy o la perdés!") porque el PRD pidió la versión simple. Es un buen candidato para una iteración futura.

### E4 — Congelador usado este mes
Si la última actividad fue anteayer y el congelador ya se gastó, la racha es 0. El chip muestra `🔥 0` sin distinguir si fue por "ya gasté el congelador" — coherente con la decisión de no mostrar info del congelador.

### E5 — Cambio de zona horaria
Si el usuario viaja, "hoy" cambia y la lógica puede tener saltos raros (caso aceptado en Architecture D5). Sin tratamiento especial.

### E6 — Storage no cargado
Mientras el streak store no esté `loaded`, el chip muestra skeleton. No calculamos contra estado vacío.

---

## 7. Copy
- **Tooltip / aria-label (N ≥ 1):** `Racha actual de {N} días`
- **Tooltip / aria-label (N = 0):** `Sin racha activa`

No se necesita más copy en pantalla en esta iteración.

---

## 8. Accesibilidad y mobile
- El chip es un `<div>` con `role="status"` y `aria-live="polite"` para que un lector de pantalla anuncie cambios.
- Contraste del 🔥 + número cumple WCAG AA sobre `bg-bg-surface`.
- Aunque visualmente sea chico, la zona táctil cubre al menos 32×32 px (con padding).

---

## 9. Decisiones cerradas (de pasos previos)
- Solo racha actual (sin mejor histórico, sin heatmap).
- Sin notificaciones push.
- Sin indicador visible de congelador o "en riesgo".

---

## 10. Punto a confirmar antes de cerrar UX-Spec
La **micro-animación al subir** (fade + bump) es lo único "festivo" que metí. ¿Te parece bien, o preferís cambio silencioso sin animación?

Mi recomendación: **dejar la micro-animación** — es discreta, da feedback inmediato de que la acción del usuario produjo algo, y no roba pantalla.
