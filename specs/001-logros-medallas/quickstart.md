# Quickstart: Logros y Medallas

Cómo probar la feature una vez implementada.

## Requisitos previos

- Estar logueado con una carrera activa y algunas materias cargadas.
- No requiere SQL, secrets ni configuración nueva (es 100% front, derivado del
  estado existente).

## Pruebas manuales

### 1. Ver la galería (User Story 1)
1. Entrá al **Perfil**.
2. Abrí la sección **Logros**.
3. Verificá: los logros que ya cumpliste aparecen a color; el resto, como
   silueta con una pista. Arriba, un contador "X de Y logros".

### 2. Desbloquear + celebración (User Story 2)
1. Andá al **Árbol** y marcá una materia como **aprobada** por primera vez.
2. Verificá: aparece una **celebración festiva** del logro "Primer paso"
   (primera materia aprobada).
3. Completá una **sesión de estudio perfecta** → celebración del logro
   correspondiente.
4. Si una acción cumple **varios** logros a la vez, las celebraciones se
   muestran una tras otra.

### 3. No recelebrar (FR-008)
1. Recargá la app (F5 / reabrir).
2. Verificá: los logros ya conseguidos **no** se vuelven a celebrar.

### 4. Reversibilidad (Edge case)
1. Tomá una materia aprobada que disparó un logro de "primera aprobada".
2. Cambiala a **cursando**.
3. Verificá: en la galería el logro vuelve a bloqueado, **sin** mensaje
   negativo ni celebración.

### 5. Separación con progreso académico (FR-010)
1. Mirá el % de progreso de carrera en el Dashboard antes y después de
   desbloquear logros.
2. Verificá: el % **no cambia** por conseguir logros (solo cambia aprobando
   materias).

## Pruebas automatizadas

```bash
npx vitest run src/features/achievements/lib/achievements.test.ts
```

Cubre: evaluación de cada categoría de logro, umbrales (25/50/75/100%, año
completo, N sesiones, racha, nivel), idempotencia y reversibilidad.

## Checklist de salida

- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx vitest run` todo verde.
- [ ] `npm run build` ok.
- [ ] Galería visible en el Perfil, mobile-first.
- [ ] Celebración al desbloquear; sin recelebrar al recargar.
