# Research: Investigación Competitiva + Rediseño UI/UX

**Feature**: `009-competitive-ui-redesign` | **Date**: 2026-06-07

---

## 1. Competitive Landscape — Decisiones

### Decision: Foco del rediseño en árbol + dashboard + unlock feedback
**Rationale**: El árbol es el único diferencial competitivo irrenunciable que nadie tiene bien implementado. OrbitUp (el competidor más peligroso) es débil exactamente ahí. Dashboard y unlock feedback son el segundo y tercer momento de verdad del producto.
**Alternatives considered**: Rediseñar toda la app de cero → rechazado por riesgo y scope; solo mejorar nodos individuales → insuficiente para el salto cualitativo buscado.

### Decision: Mantener React Flow + mejoras visuales (no reescribir con D3/Cytoscape)
**Rationale**: React Flow ya está integrado y funciona. El problema no es la librería sino el diseño de los nodos, edges y paneles. Cambiar de librería es un mes de trabajo sin beneficio diferencial. Además React Flow tiene soporte de animaciones custom vía Framer Motion.
**Alternatives considered**: D3.js → control total pero 10x más trabajo y sin abstracciones de nodos; Cytoscape.js → más potente para grafos complejos pero sin integración React nativa; vis.js → desactualizado.

### Decision: Color de acento por carrera via CSS custom properties + Zustand
**Rationale**: TailwindCSS no soporta colores dinámicos en runtime directamente. La solución estándar es CSS custom properties (`--color-accent`) inyectadas vía `style` en el root, consumidas en los nodos con `var(--color-accent)`. Zustand mantiene el color activo.
**Alternatives considered**: Tailwind JIT purge → no funciona en runtime; inline styles everywhere → mantenimiento imposible; styled-components → fuera del stack definido.

### Decision: Animación de unlock con Framer Motion `useAnimate` + store de pending unlocks
**Rationale**: React Flow no anima nodos nativamente. La solución es: (1) store de `pendingUnlocks: string[]` en Zustand, (2) `SubjectNode` detecta si su id está en `pendingUnlocks` y corre la animación con `useAnimate`, (3) limpia el id después. No requiere dependencias nuevas.
**Alternatives considered**: CSS animations → no se pueden disparar en respuesta a cambios de estado de forma limpia; react-spring → dependencia nueva no justificada; GSAP → demasiado pesado para este caso.

### Decision: Milestone store en Zustand (no persistido en DB por ahora)
**Rationale**: Los milestones (25/50/75/100%) se calculan derivados del progress que ya existe. Guardar en DB si ya se mostró es un overhead innecesario para v1 del feature. Si el usuario borra la app y la reinstala, ver el milestone de nuevo no es problema. Usar localStorage para "ya mostrado" es suficiente.
**Alternatives considered**: Tabla `milestone_events` en Supabase → overkill para MVP; ignorar si ya se mostró → mala UX (aparece en cada visita); sessionStorage → se pierde al cerrar el tab.

---

## 2. Tree Visual Improvements — Decisiones técnicas

### Decision: Nodos con glassmorphism sutil (backdrop-filter + borde semitransparente)
**Rationale**: La investigación de UI trends 2025 identifica glassmorphism sutil como el patrón premium en dark mode. Aporta profundidad sin ruido. Requiere `backdrop-filter: blur(8px)` + `background: rgba(...)` — compatible con todos los navegadores modernos y React Native via herramientas equivalentes.
**Performance impact**: backdrop-filter tiene impacto en GPU, pero con pocos nodos visibles a la vez (el viewport mobile muestra ~10-15 nodos) el impacto es negligible. Si hay problemas, se puede deshabilitar con `@media (prefers-reduced-motion)`.

### Decision: Edges con gradiente de color fuente→destino
**Rationale**: Las edges de correlativas actualmente son líneas planas grises u verdes. Un gradiente del color del nodo origen al color del nodo destino da información visual de "de dónde viene" la correlativa, como los mejores skill trees de gaming. React Flow soporta SVG custom edges con `<linearGradient>`.
**Alternatives considered**: Flechas con animación CSS → ya existe en edges completadas; color estático según estado destino → menos informativo.

### Decision: Nodos más anchos (180px → 200px) y con más información visible
**Rationale**: Con 160px el texto queda truncado a 2 líneas y el nombre queda ilegible en carreras con materias de nombre largo. 200px permite nombres de hasta 3 líneas y agrega un indicador visual de año/cuatrimestre pequeño dentro del nodo.
**Tradeoff**: Más ancho = más espacio horizontal = árbol más ancho. Aceptable porque el scroll horizontal es esperable en un árbol de 5-6 años.

### Decision: Etiquetas de año sticky / fijas mientras se hace scroll vertical
**Rationale**: En el árbol actual, si el usuario hace scroll hacia abajo pierde de vista en qué año está. Las etiquetas de año sticky (position: sticky en el panel de fondo) solucionan esto. React Flow tiene soporte de nodes con `zIndex` que permite simular este comportamiento.
**Implementation**: Las labels de año se convierten en nodos React Flow con posición fija al tope de cada columna y `zIndex` muy alto, sin depender de CSS sticky (que no aplica dentro del canvas de React Flow).

---

## 3. Dashboard UX Improvements — Decisiones

### Decision: "Para cursar ahora" como primer elemento visual del dashboard
**Rationale**: Todos los competidores estudiados (SIU Guaraní, Plande, DegreeWorks) fallan en responder inmediatamente "¿qué puedo cursar?". El dashboard actual muestra nivel de gamificación y progreso de carrera primero. Mover el conteo de materias disponibles arriba no requiere cambios de lógica, solo reorden de componentes.

### Decision: Mantener el toast de unlock existente + agregar animación en nodo
**Rationale**: El toast ya existe en el código. Lo que falta es la animación en el nodo del árbol cuando ese nodo pasa de `bloqueada` a `disponible_cursar`. Ambas capas son complementarias.

---

## 4. Accesibilidad — Decisiones

### Decision: Audit de contraste con valores hardcodeados actuales
Los colores actuales en `SubjectNode.tsx` (inline styles) deben verificarse:
- `#F0F0FF` sobre `#111118` = ratio ~14:1 ✅ (texto principal)
- `#8080A0` sobre `#111118` = ratio ~4.2:1 ⚠️ justo bajo AA para texto pequeño (10px)
- Color accent `rgba(108,99,255,0.55)` como borde: no requiere contraste (decorativo)
- **Acción**: Subir el color de texto secundario en nodos a `#9090B0` (ratio ~4.8:1 ✅)

### Decision: Áreas táctiles — los nodos ya son 160x~70px (bien por encima de 44px)
No hay problema aquí. La leyenda del árbol sí tiene elementos pequeños que deben revisarse.
