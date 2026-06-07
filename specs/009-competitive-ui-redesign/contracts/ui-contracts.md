# UI Contracts: Rediseño Árbol + Dashboard

**Feature**: `009-competitive-ui-redesign` | **Date**: 2026-06-07

---

## Contrato 1: SubjectNode visual spec

### Estados visuales (revisados y mejorados)

| Estado | Borde | Fondo | Opacidad | Badge | Ícono |
|--------|-------|-------|----------|-------|-------|
| `bloqueada` | `#3A3A4A` 1.5px | `rgba(17,17,24,0.6)` | 0.45 | — | 🔒 |
| `disponible_cursar` | `var(--accent)` 2px glow | glassmorphism accent | 1.0 | — | ✦ |
| `disponible_rendir` | `#22D3EE` 2px | glassmorphism cyan | 1.0 | "FINAL" cyan | ✦ |
| `cursando` | `rgba(245,158,11,0.8)` 2px | `rgba(245,158,11,0.08)` | 1.0 | — | ◉ |
| `completada` | `rgba(34,197,94,0.7)` 2px | `rgba(34,197,94,0.08)` | 1.0 | — | ✓ |

### Glassmorphism spec (disponible_cursar y disponible_rendir)
```css
backdrop-filter: blur(8px);
background: rgba(var(--accent-rgb), 0.08);
border: 2px solid rgba(var(--accent-rgb), 0.6);
box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.15), inset 0 1px 0 rgba(255,255,255,0.05);
```

### Animación de unlock (isPendingUnlock = true)
```
Keyframes:
  0%   → scale(1), opacity(1)
  30%  → scale(1.08), box-shadow spread 24px (accent glow)
  60%  → scale(0.98)
  100% → scale(1), opacity(1)

Duration: 600ms, ease-out
Trigger: una sola vez, luego clearUnlock(id)
```

### Dimensiones
- Ancho: **180px** (antes 160px)
- Alto: variable (~74px mínimo, wraps a 3 líneas)
- Padding: `12px 14px`
- Border radius: `14px`
- Texto nombre: `12px`, weight 600, max 3 líneas (`-webkit-line-clamp: 3`)
- Texto nota: `10px`, color `#9090B0` (subido de `#8080A0` para pasar AA)

---

## Contrato 2: GradientEdge

### Spec visual
- Tipo: edge SVG custom (React Flow `EdgeProps`)
- Gradiente: color del estado del nodo source → color del estado del nodo target
- Grosor: 2px (completada) / 1.5px (resto)
- Animación: `stroke-dasharray` animado cuando source es `completada` (ya existente)
- Opacidad: 0.7 (completada) / 0.35 (bloqueada o disponible)

### Datos necesarios en edge
```typescript
interface GradientEdgeData {
  sourceState: TreeNodeState
  targetState: TreeNodeState
  accentColor: string  // var(--accent) resuelto
}
```

### Colores de stroke por estado
```typescript
const EDGE_COLOR: Record<TreeNodeState, string> = {
  bloqueada: '#3A3A4A',
  disponible_cursar: 'var(--accent)',
  disponible_rendir: '#22D3EE',
  cursando: '#F59E0B',
  completada: '#22C55E',
}
```

---

## Contrato 3: YearPanelNode mejorado

### Cambios visuales
```css
/* Panel de año */
border-radius: 20px;
border: 1px solid rgba(var(--accent-rgb), 0.12);
background: linear-gradient(
  180deg,
  rgba(var(--accent-rgb), 0.06) 0%,
  rgba(17, 17, 24, 0.4) 15%,
  rgba(17, 17, 24, 0.1) 100%
);

/* Label "AÑO N" */
font-size: 11px;
font-weight: 800;
letter-spacing: 1.5px;
text-transform: uppercase;
color: rgba(var(--accent-rgb), 0.8);   /* antes era #B9B4FF fijo */
```

### Label sticky (simulado)
El nodo de etiqueta de año se posiciona con `zIndex: 10` y siempre está visible en la parte superior de la columna. En el layout, `HEADER_H` aumenta a `48px` para dar más prominencia.

---

## Contrato 4: Dashboard — reorden de secciones

### Orden actual
1. PdfImportBanner (condicional)
2. LevelCard (gamificación)
3. Barra de progreso
4. StatCards (aprobadas, cursando, disponibles)
5. CTA al árbol

### Orden nuevo
1. PdfImportBanner (condicional) — no cambia
2. **[NUEVO] AvailableNowCard** — "Podés cursar X materias ahora" + CTA al árbol
3. Barra de progreso (compacta)
4. StatCards — mismo contenido
5. LevelCard (gamificación) — baja en jerarquía

### AvailableNowCard spec
```
Background: accent/10 con borde accent/25
Contenido:
  - Número grande (2xl bold, color accent): count de disponible_cursar
  - Texto: "materias disponibles para cursar"
  - CTA button: "Ver en el árbol →"
  - Si count === 0: "Aprobá más materias para desbloquear las siguientes"
```

---

## Contrato 5: MilestoneCelebration modal

### Trigger
Se muestra una vez por milestone (25/50/75/100%) mediante `milestoneStore.pendingMilestone`.

### UI spec
```
Overlay: bg-black/70, z-[100]
Modal:
  - Centrado vertical y horizontal
  - Max-width: 320px
  - Background: bg-bg-surface con borde accent
  - Animación entrada: scale(0.8) → scale(1), opacity 0→1, 400ms spring

Contenido:
  - Emoji grande: 🎓 (25%), 🔥 (50%), ⚡ (75%), 🏆 (100%)
  - Título: "¡[N]% completada!" (bold, xl)
  - Subtítulo: frase motivadora por milestone
  - Botón: "¡Seguí así!" → cierra el modal
  
Frases por milestone:
  25%: "Arrancaste con todo. Un cuarto de la carrera en el bolsillo."
  50%: "Llegaste a la mitad. Ya sos veterano/a de la facu."
  75%: "Tres cuartos. La meta está cerca. No pares."
  100%: "¡Lo lograste! Sos Arquitecto/a, Ingeniero/a... lo que hayas estudiado. 🎉"
```

---

## Contrato 6: Paleta de colores de acento por carrera

### Mapeo inicial (hardcodeado en código, sin DB)
```typescript
const CAREER_ACCENT_COLORS: Record<string, string> = {
  // por career.name (lowercase match)
  'arquitectura':            '#F97316', // naranja
  'ingeniería en informática': '#6C63FF', // violeta (default)
  'ingeniería en sistemas':    '#6C63FF',
  'medicina':                '#EC4899', // rosa
  'derecho':                 '#EAB308', // amarillo
  'contador público':        '#10B981', // verde esmeralda
  'psicología':              '#22D3EE', // cyan
  // default para cualquier otra carrera:
  '_default':                '#6C63FF',
}
```

### CSS custom property en runtime
```typescript
// en careerThemeStore.applyTheme()
document.documentElement.style.setProperty('--accent', accentHex)
// Calcular RGB para glassmorphism:
document.documentElement.style.setProperty('--accent-rgb', hexToRgb(accentHex))
```

### Consumo en TailwindCSS
Agregar a `tailwind.config.ts`:
```typescript
colors: {
  accent: 'var(--accent)',  // ya existe pero fijo; hacerlo dinámico
}
```
