# Quickstart: Cómo probar el rediseño

**Branch**: `009-competitive-ui-redesign`

## Para ver los cambios del árbol

1. Abrí la app y entrá con tu cuenta
2. Navegá a **Árbol de correlativas**
3. Verificar:
   - Los nodos `disponible_cursar` (violeta) tienen efecto glassmorphism (sutil blur + glow)
   - Las líneas de correlativas tienen gradiente de color entre el origen y el destino
   - Los paneles de año tienen el color de acento de tu carrera
4. Marcá una materia como "aprobada" → el nodo desbloqueado debería hacer un pulse de 600ms

## Para ver el color de acento por carrera

1. Andá a **Perfil** → **Cambiar carrera**
2. Elegí una carrera diferente (ej: Arquitectura vs Ingeniería)
3. Volvé al árbol → el color de los nodos y paneles debería cambiar

## Para ver el milestone

1. Si tu carrera tiene materias cargadas, calculá cuántas faltan para el 25%
2. Marcá las materias necesarias como aprobadas
3. Deberías ver el modal de celebración "¡25% completada!"

## Para ver el dashboard reordenado

1. Andá al Dashboard
2. El primer elemento visible debería ser "X materias disponibles para cursar"
3. Debería haber un botón "Ver en el árbol" prominente

## Build y tests

```bash
npm run build    # debe pasar sin errores
npx vitest run   # todos los tests deben pasar (incluye tests de milestoneStore y pendingUnlocks)
```
